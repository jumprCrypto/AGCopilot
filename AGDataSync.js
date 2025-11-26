// AGDataSync.js - Browser-based data sync tool for AGCopilotAPI
// Can be loaded in AGCopilot's Data Sync tab or run standalone in browser console

(async function () {
    console.clear();
    console.log('%c📊 AG Data Sync v1.0 📊', 'color: purple; font-size: 16px; font-weight: bold;');
    
    // Check if we're being loaded in the AGCopilot tab
    const isInTab = document.getElementById('data-sync-container');
    if (!isInTab) {
        console.log('%c✨ Can be integrated into the main AGCopilot interface!', 'color: green; font-size: 12px;');
        console.log('💡 Use the "📊 Data Sync" tab in AGCopilot for integrated experience');
    }

    // ========================================
    // 🎯 DATA SYNC CONFIGURATION
    // ========================================
    const SYNC_CONFIG = {
        LOCAL_API_URL: 'http://localhost:5000',
        AG_API_URL: 'https://backtester.alphagardeners.xyz/api',
        DELAY_BETWEEN_REQUESTS_MS: 500,
        DELAY_BETWEEN_TOKENS_MS: 350,      // Increased from 250ms to avoid 429s
        BATCH_SIZE: 50,                   
        DELAY_BETWEEN_BATCHES_MS: 5000,
        RATE_LIMIT_BACKOFF_MS: 300000,      // 5 minute backoff on 429 errors
        USE_BATCH_IMPORT: true,            // Use batch import to local API (10-50x faster)
        DISCOVERY_PAGE_SIZE: 5000,        // Larger pages for faster token discovery
    };

    // ========================================
    // 🛠️ UTILITIES & DEPENDENCY MANAGEMENT
    // ========================================
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    class AGDataSync {
        constructor() {
            this.stats = {
                tokensDiscovered: 0,
                tokensProcessed: 0,
                signalsImported: 0,
                signalsSkipped: 0,
                errors: 0,
                rateLimitHits: 0,
                proactiveBackoffs: 0,
                startTime: null,
                currentBatch: 0,
            };
            this.stopped = false;
            this.uniqueTokens = new Set();
            this.rateLimitInfo = {
                limit: null,
                remaining: null,
                reset: null
            };
        }

        log(message, type = 'info') {
            const prefix = {
                info: '📊',
                success: '✅',
                error: '❌',
                warning: '⚠️',
                progress: '🔄',
            }[type] || 'ℹ️';
            console.log(`${prefix} ${message}`);
        }

        async delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        async fetchFromAG(endpoint, params = {}) {
            // Track if we did a proactive backoff (to skip stale rate limit headers after wait)
            let didProactiveBackoff = false;
            
            // Proactive backoff BEFORE making request if we know rate limit is low or exhausted
            if (this.rateLimitInfo.remaining !== null && this.rateLimitInfo.remaining <= 3 && this.rateLimitInfo.reset) {
                const now = Math.floor(Date.now() / 1000);
                const secondsUntilReset = this.rateLimitInfo.reset - now;
                
                // If reset time is in the past, wait a bit longer to be safe
                // AG API reset might not be instant, so add buffer
                if (secondsUntilReset <= 10) {
                    const bufferWait = Math.max(15 - secondsUntilReset, 5); // At least 5s buffer after reset
                    this.stats.proactiveBackoffs++;
                    const waitTime = bufferWait * 1000;
                    
                    if (secondsUntilReset <= 0) {
                        this.log(
                            `⚠️ Rate limit reset was ${-secondsUntilReset}s ago. ` +
                            `Waiting ${bufferWait}s buffer for API to fully reset...`,
                            'warning'
                        );
                    } else {
                        this.log(
                            `⚠️ Rate limit at ${this.rateLimitInfo.remaining}/${this.rateLimitInfo.limit}. ` +
                            `Waiting ${secondsUntilReset + bufferWait}s (reset + buffer)...`,
                            'warning'
                        );
                    }
                    
                    await this.delay(waitTime);
                    this.log('✅ Resuming after rate limit wait...', 'info');
                    didProactiveBackoff = true;
                    this.rateLimitInfo.remaining = this.rateLimitInfo.limit;
                } else if (secondsUntilReset > 0 && secondsUntilReset < 3600) {
                    this.stats.proactiveBackoffs++;
                    const waitTime = (secondsUntilReset + 10) * 1000; // Wait until reset + 10 second buffer
                    this.log(
                        `⚠️  Rate limit at ${this.rateLimitInfo.remaining}/${this.rateLimitInfo.limit}. ` +
                        `Proactively waiting ${Math.ceil(waitTime / 1000)}s before next request...`,
                        'warning'
                    );
                    await this.delay(waitTime);
                    this.log('✅ Resuming after proactive rate limit wait...', 'info');
                    didProactiveBackoff = true;
                    this.rateLimitInfo.remaining = this.rateLimitInfo.limit;
                } else {
                    this.log(`❌ Rate limit reset is ${secondsUntilReset}s away (>1 hour). Skipping proactive backoff!`, 'error');
                }
            }
            
            const url = new URL(`${SYNC_CONFIG.AG_API_URL}${endpoint}`);
            Object.entries(params).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    url.searchParams.append(key, value);
                }
            });

            const response = await fetch(url.toString(), {
                credentials: 'include',  // Include cookies for authentication
                headers: {
                    'Accept': 'application/json',
                }
            });

            // Read rate limit headers
            const rateLimitHeaders = {
                limit: response.headers.get('x-ratelimit-limit'),
                remaining: response.headers.get('x-ratelimit-remaining'),
                reset: response.headers.get('x-ratelimit-reset')
            };

            // Only update rate limit tracking if we didn't just do a proactive backoff
            // (headers after backoff are stale and show pre-reset values)
            if (rateLimitHeaders.limit && !didProactiveBackoff) {
                this.rateLimitInfo.limit = parseInt(rateLimitHeaders.limit);
                this.rateLimitInfo.remaining = parseInt(rateLimitHeaders.remaining);
                this.rateLimitInfo.reset = parseInt(rateLimitHeaders.reset);
            }

            if (!response.ok) {
                // Handle rate limiting with backoff
                if (response.status === 429) {
                    this.stats.rateLimitHits++;
                    const now = Math.floor(Date.now() / 1000);
                    const resetTime = this.rateLimitInfo.reset || (now + 60);
                    const waitTime = Math.max((resetTime - now + 5) * 1000, SYNC_CONFIG.RATE_LIMIT_BACKOFF_MS);
                    
                    this.log(
                        `❌ Rate limit exceeded (429) - Hit #${this.stats.rateLimitHits}. ` +
                        `Backing off for ${Math.ceil(waitTime / 1000)} seconds...`,
                        'error'
                    );
                    await this.delay(waitTime);
                    this.log('Resuming after rate limit backoff...', 'info');
                    // Retry the request after backoff
                    return await this.fetchFromAG(endpoint, params);
                }
                throw new Error(`AG API error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        }

        async postToLocalAPI(endpoint, data) {
            const apiUrl = document.getElementById('sync-api-url')?.value || SYNC_CONFIG.LOCAL_API_URL;
            const response = await fetch(`${apiUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Local API error: ${response.status} - ${errorText}`);
            }

            return await response.json();
        }

        async postBatchToLocalAPI(endpoint, dataArray) {
            const apiUrl = document.getElementById('sync-api-url')?.value || SYNC_CONFIG.LOCAL_API_URL;
            const response = await fetch(`${apiUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataArray),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Local API error: ${response.status} - ${errorText}`);
            }

            return await response.json();
        }

        async discoverTokens(fromDate, toDate) {
            this.log(`Discovering tokens from ${fromDate.toISOString()} to ${toDate.toISOString()}...`, 'progress');
            
            let page = 1;
            const pageSize = SYNC_CONFIG.DISCOVERY_PAGE_SIZE;
            let hasMore = true;
            let totalSwapsProcessed = 0;

            while (hasMore && !this.stopped) {
                try {
                    this.log(`Fetching page ${page}...`, 'progress');
                    
                    const data = await this.fetchFromAG('/swaps', {
                        fromDate: fromDate.toISOString().split('T')[0],
                        toDate: toDate.toISOString().split('T')[0],
                        page: page,
                        limit: pageSize,
                    });

                    if (data.swaps && data.swaps.length > 0) {
                        // Process all swaps at once with Set for O(1) lookups
                        data.swaps.forEach(swap => {
                            if (swap.tokenAddress) {
                                this.uniqueTokens.add(swap.tokenAddress);
                            }
                        });
                        
                        totalSwapsProcessed += data.swaps.length;
                        this.stats.tokensDiscovered = this.uniqueTokens.size;
                        this.log(`Page ${page}: ${data.swaps.length} swaps, ${this.uniqueTokens.size} unique tokens found (${totalSwapsProcessed} swaps processed)`, 'info');

                        hasMore = data.swaps.length === pageSize;
                        page++;
                        
                        await this.delay(SYNC_CONFIG.DELAY_BETWEEN_REQUESTS_MS);
                    } else {
                        hasMore = false;
                    }
                } catch (error) {
                    this.log(`Error fetching page ${page}: ${error.message}`, 'error');
                    this.stats.errors++;
                    hasMore = false;
                }
            }

            this.log(`Token discovery complete! Found ${this.uniqueTokens.size} unique tokens from ${totalSwapsProcessed} swaps`, 'success');
            return Array.from(this.uniqueTokens);
        }

        async syncTokenData(tokenAddress, fromDate, toDate) {
            try {
                // Fetch swaps for this specific token from AG API
                const data = await this.fetchFromAG(`/swaps/by-token/${tokenAddress}`);

                if (!data.swaps || data.swaps.length === 0) {
                    return 0;
                }

                // Filter swaps by date range (API returns all swaps, we filter client-side)
                const fromTimestamp = Math.floor(fromDate.getTime() / 1000);
                const toTimestamp = Math.floor(toDate.getTime() / 1000);
                
                const filteredSwaps = data.swaps.filter(swap => {
                    const swapTime = swap.timestamp;
                    return swapTime >= fromTimestamp && swapTime <= toTimestamp;
                });

                if (filteredSwaps.length === 0) {
                    return 0;
                }

                // Prepare all signals as a batch
                const signalBatch = filteredSwaps.map(swap => ({
                    tokenAddress: tokenAddress,
                    symbol: swap.symbol || 'UNKNOWN',
                    name: swap.token || swap.name || null,
                    timestamp: swap.timestamp,
                    triggerMode: swap.triggerMode || 0,
                    signalMcap: swap.signalMcap,
                    currentMcap: swap.currentMcap,
                    athMcap: swap.athMcap,
                    athTime: swap.athTime,
                    winPredPercent: swap.winPredPercent,
                    criteria: swap.criteria || {},
                    sourceFile: 'AG_API_Sync_Browser',
                }));

                // Use batch import if enabled (10-50x faster)
                if (SYNC_CONFIG.USE_BATCH_IMPORT) {
                    try {
                        // Send entire batch in ONE request to local API
                        const result = await this.postBatchToLocalAPI('/api/signals/import-batch', signalBatch);
                        const imported = result.imported || 0;
                        const skipped = result.skipped || 0;
                        
                        this.stats.signalsImported += imported;
                        this.stats.signalsSkipped += skipped;
                        
                        return imported;
                    } catch (error) {
                        if (error.message.includes('404')) {
                            // Batch endpoint doesn't exist yet, fall back to individual imports
                            this.log(`⚠️ Batch import not available, using individual imports (slower)...`, 'warning');
                        } else {
                            throw error;
                        }
                    }
                }

                // Fallback: Import signals individually (slower)
                let imported = 0;
                let skipped = 0;
                
                for (const signalData of signalBatch) {
                    try {
                        await this.postToLocalAPI('/api/signals/import', signalData);
                        imported++;
                    } catch (error) {
                        if (error.message.includes('409')) {
                            skipped++;
                        } else {
                            this.log(`Error importing signal: ${error.message}`, 'error');
                            this.stats.errors++;
                        }
                    }
                }

                this.stats.signalsImported += imported;
                this.stats.signalsSkipped += skipped;

                return imported;
            } catch (error) {
                this.log(`Error syncing token ${tokenAddress}: ${error.message}`, 'error');
                this.stats.errors++;
                return 0;
            }
        }

        async processTokenBatch(tokens, fromDate, toDate, batchNumber) {
            this.stats.currentBatch = batchNumber;
            const batchStartTime = Date.now();
            this.log(`Processing batch ${batchNumber} (${tokens.length} tokens)...`, 'progress');

            for (let i = 0; i < tokens.length && !this.stopped; i++) {
                const token = tokens[i];
                const tokenStartTime = Date.now();
                this.stats.tokensProcessed++;

                const imported = await this.syncTokenData(token, fromDate, toDate);
                
                const tokenTime = Date.now() - tokenStartTime;
                const avgTimePerToken = (Date.now() - this.stats.startTime) / this.stats.tokensProcessed;
                const remainingTokens = this.stats.tokensDiscovered - this.stats.tokensProcessed;
                const estimatedTimeRemaining = remainingTokens * avgTimePerToken;
                
                const rateLimitStatus = this.rateLimitInfo.remaining !== null 
                    ? ` | RL: ${this.rateLimitInfo.remaining}/${this.rateLimitInfo.limit}`
                    : '';
                
                const etaMinutes = Math.ceil(estimatedTimeRemaining / 60000);
                
                this.log(
                    `[${this.stats.tokensProcessed}/${this.stats.tokensDiscovered}] ` +
                    `Token ${token.slice(0, 8)}... - ${imported} signals (${tokenTime}ms) ` +
                    `| Total: ${this.stats.signalsImported} imported, ${this.stats.signalsSkipped} skipped` +
                    `${rateLimitStatus} | ETA: ${etaMinutes}min`,
                    'info'
                );

                if (i < tokens.length - 1) {
                    await this.delay(SYNC_CONFIG.DELAY_BETWEEN_TOKENS_MS);
                }
            }

            const batchTime = ((Date.now() - batchStartTime) / 1000).toFixed(1);
            this.log(`Batch ${batchNumber} complete in ${batchTime}s. Avg: ${(batchTime / tokens.length).toFixed(2)}s/token`, 'info');

            if (batchNumber > 1 && !this.stopped) {
                this.log(`Pausing before next batch...`, 'info');
                await this.delay(SYNC_CONFIG.DELAY_BETWEEN_BATCHES_MS);
            }
        }

        async sync(fromDate, toDate) {
            this.stats.startTime = new Date();
            this.stopped = false;

            this.log('='.repeat(60), 'info');
            this.log('AG Data Sync Started', 'success');
            this.log(`Date Range: ${fromDate.toISOString()} to ${toDate.toISOString()}`, 'info');
            this.log(`Local API: ${SYNC_CONFIG.LOCAL_API_URL}`, 'info');
            this.log('='.repeat(60), 'info');

            try {
                // Phase 1: Discover all unique tokens
                this.log('Phase 1: Token Discovery', 'progress');
                const tokens = await this.discoverTokens(fromDate, toDate);

                if (tokens.length === 0) {
                    this.log('No tokens found in date range!', 'warning');
                    return this.stats;
                }

                // Phase 2: Process tokens in batches
                this.log('Phase 2: Processing Tokens', 'progress');
                const batches = [];
                for (let i = 0; i < tokens.length; i += SYNC_CONFIG.BATCH_SIZE) {
                    batches.push(tokens.slice(i, i + SYNC_CONFIG.BATCH_SIZE));
                }

                this.log(`Processing ${tokens.length} tokens in ${batches.length} batches...`, 'info');

                for (let i = 0; i < batches.length && !this.stopped; i++) {
                    await this.processTokenBatch(batches[i], fromDate, toDate, i + 1);
                }

                // Final stats
                const duration = new Date() - this.stats.startTime;
                const minutes = Math.floor(duration / 60000);
                const seconds = Math.floor((duration % 60000) / 1000);

                this.log('='.repeat(60), 'info');
                this.log('Sync Complete!', 'success');
                this.log(`Tokens Discovered: ${this.stats.tokensDiscovered}`, 'info');
                this.log(`Tokens Processed: ${this.stats.tokensProcessed}`, 'info');
                this.log(`Signals Imported: ${this.stats.signalsImported}`, 'success');
                this.log(`Signals Skipped (duplicates): ${this.stats.signalsSkipped}`, 'info');
                this.log(`Proactive Backoffs: ${this.stats.proactiveBackoffs}`, 'info');
                this.log(`Rate Limit Hits (429): ${this.stats.rateLimitHits}`, this.stats.rateLimitHits > 0 ? 'error' : 'success');
                this.log(`Errors: ${this.stats.errors}`, this.stats.errors > 0 ? 'warning' : 'info');
                this.log(`Duration: ${minutes}m ${seconds}s`, 'info');
                this.log('='.repeat(60), 'info');

            } catch (error) {
                this.log(`Sync failed: ${error.message}`, 'error');
                console.error(error);
            }

            return this.stats;
        }

        stop() {
            this.stopped = true;
            this.log('Sync stopping... (will finish current token)', 'warning');
        }
    }

    // ========================================
    // 🎨 UI FUNCTIONS
    // ========================================
    
    // Create the Data Sync UI in the tab
    function createDataSyncTabUI() {
        const tabContent = document.getElementById('data-sync-container');
        if (!tabContent) {
            console.warn('⚠️ Data Sync container not found');
            return false;
        }

        tabContent.innerHTML = `
            <!-- Date Range -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                <div>
                    <label style="
                        font-size: 12px;
                        font-weight: 500;
                        color: #a0aec0;
                        display: block;
                        margin-bottom: 8px;
                    ">From Date</label>
                    <input type="date" id="sync-from-date" style="
                        width: 100%;
                        padding: 8px 12px;
                        background: #2d3748;
                        border: 1px solid #4a5568;
                        border-radius: 4px;
                        color: #e2e8f0;
                        font-size: 11px;
                        outline: none;
                        transition: border-color 0.2s;
                        box-sizing: border-box;
                    " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                </div>
                <div>
                    <label style="
                        font-size: 12px;
                        font-weight: 500;
                        color: #a0aec0;
                        display: block;
                        margin-bottom: 8px;
                    ">To Date</label>
                    <input type="date" id="sync-to-date" style="
                        width: 100%;
                        padding: 8px 12px;
                        background: #2d3748;
                        border: 1px solid #4a5568;
                        border-radius: 4px;
                        color: #e2e8f0;
                        font-size: 11px;
                        outline: none;
                        transition: border-color 0.2s;
                        box-sizing: border-box;
                    " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                </div>
            </div>

            <!-- API URL -->
            <div style="margin-bottom: 16px;">
                <label style="
                    font-size: 12px;
                    font-weight: 500;
                    color: #a0aec0;
                    display: block;
                    margin-bottom: 8px;
                ">Local API URL</label>
                <input type="text" id="sync-api-url" value="http://localhost:5000" placeholder="http://localhost:5000" style="
                    width: 100%;
                    padding: 8px 12px;
                    background: #2d3748;
                    border: 1px solid #4a5568;
                    border-radius: 4px;
                    color: #e2e8f0;
                    font-size: 11px;
                    font-family: 'Courier New', monospace;
                    outline: none;
                    transition: border-color 0.2s;
                    box-sizing: border-box;
                " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                <div style="
                    font-size: 10px;
                    color: #718096;
                    margin-top: 6px;
                    font-style: italic;
                ">💡 Make sure your AGCopilotAPI is running</div>
            </div>

            <!-- Action Buttons -->
            <div style="display: flex; gap: 8px; margin-bottom: 20px;">
                <button id="start-sync-btn" style="
                    flex: 1;
                    padding: 10px 16px;
                    background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
                    border: none;
                    border-radius: 4px;
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                    <span>▶️</span>
                    <span>Start Sync</span>
                </button>
                <button id="stop-sync-btn" style="
                    padding: 10px 16px;
                    background: rgba(245, 101, 101, 0.2);
                    border: 1px solid rgba(245, 101, 101, 0.4);
                    border-radius: 4px;
                    color: #fc8181;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.2s;
                " onmouseover="this.style.background='rgba(245, 101, 101, 0.3)'" onmouseout="this.style.background='rgba(245, 101, 101, 0.2)'">
                    ⏹️ Stop
                </button>
            </div>

            <!-- Stats Display -->
            <div id="sync-stats" style="
                background: rgba(45, 55, 72, 0.6);
                border: 1px solid #4a5568;
                border-radius: 6px;
                padding: 16px;
                margin-bottom: 16px;
            ">
                <div style="
                    font-size: 13px;
                    font-weight: 600;
                    color: #e2e8f0;
                    margin-bottom: 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    <span>📈</span>
                    <span>Sync Statistics</span>
                </div>
                <div id="sync-stats-content" style="
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 8px;
                    font-size: 11px;
                ">
                    <div style="color: #a0aec0;">
                        <span style="color: #718096;">Tokens:</span>
                        <span id="stat-tokens" style="color: #e2e8f0; font-weight: 600; margin-left: 4px;">0/0</span>
                    </div>
                    <div style="color: #a0aec0;">
                        <span style="color: #718096;">Signals:</span>
                        <span id="stat-signals" style="color: #48bb78; font-weight: 600; margin-left: 4px;">0</span>
                    </div>
                    <div style="color: #a0aec0;">
                        <span style="color: #718096;">Skipped:</span>
                        <span id="stat-skipped" style="color: #fbd38d; font-weight: 600; margin-left: 4px;">0</span>
                    </div>
                    <div style="color: #a0aec0;">
                        <span style="color: #718096;">Errors:</span>
                        <span id="stat-errors" style="color: #fc8181; font-weight: 600; margin-left: 4px;">0</span>
                    </div>
                    <div style="color: #a0aec0; grid-column: 1 / -1;">
                        <span style="color: #718096;">Rate Limit:</span>
                        <span id="stat-ratelimit" style="color: #63b3ed; font-weight: 600; margin-left: 4px;">--/--</span>
                    </div>
                </div>
            </div>

            <!-- Log Console -->
            <div style="margin-bottom: 16px;">
                <div style="
                    font-size: 13px;
                    font-weight: 600;
                    color: #e2e8f0;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    <span>📝</span>
                    <span>Sync Log</span>
                </div>
                <div id="sync-log" style="
                    background: #1a202c;
                    border: 1px solid #4a5568;
                    border-radius: 4px;
                    padding: 12px;
                    height: 200px;
                    overflow-y: auto;
                    font-family: 'Courier New', monospace;
                    font-size: 10px;
                    color: #a0aec0;
                    line-height: 1.4;
                ">
                    <div style="color: #718096; font-style: italic;">Ready to sync...</div>
                </div>
            </div>
        `;

        // Set default dates (last 7 days)
        const toDate = new Date();
        const fromDate = new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        document.getElementById('sync-from-date').value = fromDate.toISOString().split('T')[0];
        document.getElementById('sync-to-date').value = toDate.toISOString().split('T')[0];

        console.log('✅ Data Sync UI created in tab');
        return true;
    }

    // ========================================
    // 🎮 EVENT HANDLERS
    // ========================================
    
    let currentSync = null;
    
    function setupDataSyncEventHandlers() {
        const startBtn = document.getElementById('start-sync-btn');
        const stopBtn = document.getElementById('stop-sync-btn');
        
        if (!startBtn || !stopBtn) {
            console.error('❌ Data Sync buttons not found');
            return false;
        }

        startBtn.addEventListener('click', async () => {
            const fromDateInput = document.getElementById('sync-from-date');
            const toDateInput = document.getElementById('sync-to-date');
            const apiUrlInput = document.getElementById('sync-api-url');
            
            if (!fromDateInput.value || !toDateInput.value) {
                alert('Please select both from and to dates');
                return;
            }

            const fromDate = new Date(fromDateInput.value + 'T00:00:00Z');
            const toDate = new Date(toDateInput.value + 'T23:59:59Z');

            if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
                alert('Please select valid dates');
                return;
            }

            if (fromDate > toDate) {
                alert('From date must be before to date');
                return;
            }

            // Update SYNC_CONFIG with user's API URL
            if (apiUrlInput && apiUrlInput.value) {
                SYNC_CONFIG.LOCAL_API_URL = apiUrlInput.value.trim();
            }

            // Create new sync instance with UI callbacks
            currentSync = new AGDataSync();
            
            // Override log function to update UI
            currentSync.log = (message, type = 'info') => {
                const prefix = {
                    info: '📊',
                    success: '✅',
                    error: '❌',
                    warning: '⚠️',
                    progress: '🔄',
                }[type] || 'ℹ️';
                
                console.log(`${prefix} ${message}`);
                
                // Update log UI
                const logDiv = document.getElementById('sync-log');
                if (logDiv) {
                    const logEntry = document.createElement('div');
                    logEntry.style.marginBottom = '4px';
                    logEntry.style.color = {
                        error: '#fc8181',
                        warning: '#fbd38d',
                        success: '#48bb78',
                        progress: '#63b3ed',
                        info: '#a0aec0'
                    }[type] || '#a0aec0';
                    logEntry.textContent = `${prefix} ${message}`;
                    logDiv.appendChild(logEntry);
                    logDiv.scrollTop = logDiv.scrollHeight;
                }
                
                // Update stats
                if (currentSync) {
                    updateSyncStats(currentSync.stats, currentSync.rateLimitInfo);
                }
            };

            startBtn.disabled = true;
            startBtn.style.opacity = '0.5';
            
            try {
                await currentSync.sync(fromDate, toDate);
            } catch (error) {
                console.error('Sync error:', error);
            } finally {
                startBtn.disabled = false;
                startBtn.style.opacity = '1';
            }
        });

        stopBtn.addEventListener('click', () => {
            if (currentSync) {
                currentSync.stop();
            }
        });

        console.log('✅ Data Sync event handlers attached');
        return true;
    }
    
    function updateSyncStats(stats, rateLimitInfo) {
        document.getElementById('stat-tokens').textContent = `${stats.tokensProcessed}/${stats.tokensDiscovered}`;
        document.getElementById('stat-signals').textContent = stats.signalsImported;
        document.getElementById('stat-skipped').textContent = stats.signalsSkipped;
        document.getElementById('stat-errors').textContent = stats.errors;
        
        if (rateLimitInfo.remaining !== null && rateLimitInfo.limit !== null) {
            document.getElementById('stat-ratelimit').textContent = `${rateLimitInfo.remaining}/${rateLimitInfo.limit}`;
        }
    }

    // ========================================
    // 🚀 INITIALIZATION
    // ========================================
    
    async function initializeDataSync(maxRetries = 3, delay = 1000) {
        console.log('🔧 Initializing Data Sync...');
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (isInTab) {
                    // Create UI in the tab
                    const uiCreated = createDataSyncTabUI();
                    if (!uiCreated) {
                        throw new Error('Failed to create Data Sync UI in tab');
                    }
                    
                    const success = setupDataSyncEventHandlers();
                    if (success) {
                        console.log('✅ Data Sync initialized successfully in AGCopilot tab!');
                        console.log('🎯 Purpose: Sync historical data from AG API to local AGCopilotAPI');
                        console.log('📋 Features: Token discovery, batch processing, rate limiting');
                        return;
                    } else {
                        throw new Error('Failed to setup event handlers for tab integration');
                    }
                } else {
                    // Standalone mode - export helper functions
                    console.log('✅ Data Sync initialized in standalone mode!');
                    exportStandaloneHelpers();
                    return;
                }
                
            } catch (error) {
                if (attempt < maxRetries) {
                    console.log(`⏳ Attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`);
                    await sleep(delay);
                    delay *= 1.5;
                } else {
                    console.error('❌ Data Sync initialization failed after all retries:', error);
                    
                    // Show error in tab if available
                    const tabContent = document.getElementById('data-sync-tab');
                    if (tabContent) {
                        tabContent.innerHTML = `
                            <div style="
                                text-align: center;
                                padding: 40px 20px;
                                color: #fc8181;
                            ">
                                <div style="font-size: 32px; margin-bottom: 12px;">❌</div>
                                <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">Data Sync Initialization Failed</div>
                                <div style="font-size: 12px; color: #a0aec0;">${error.message}</div>
                            </div>
                        `;
                    }
                }
            }
        }
    }
    
    // Export standalone helper functions for console usage
    function exportStandaloneHelpers() {
        window.syncAGData = {
            // Sync last 24 hours
            last24Hours: async function() {
                const sync = new AGDataSync();
                const toDate = new Date();
                const fromDate = new Date(toDate.getTime() - 24 * 60 * 60 * 1000);
                return await sync.sync(fromDate, toDate);
            },

            // Sync last 7 days
            last7Days: async function() {
                const sync = new AGDataSync();
                const toDate = new Date();
                const fromDate = new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000);
                return await sync.sync(fromDate, toDate);
            },

            // Sync custom date range
            custom: async function(fromDateString, toDateString) {
                const sync = new AGDataSync();
                const fromDate = new Date(fromDateString);
                const toDate = new Date(toDateString);
                return await sync.sync(fromDate, toDate);
            },

            // Stop current sync
            stop: function() {
                if (currentSync) {
                    currentSync.stop();
                }
            }
        };
    }

    // ========================================
    // 📦 NAMESPACE EXPORT
    // ========================================
    
    // Create the AGDataSync namespace object
    window.AGDataSync = {
        // Class
        AGDataSyncClass: AGDataSync,
        
        // UI Functions
        createDataSyncTabUI,
        setupDataSyncEventHandlers,
        updateSyncStats,
        
        // Utilities
        SYNC_CONFIG,
        currentSync,
        
        // Version
        version: '1.0.0'
    };

    // Also make individual functions available for backward compatibility
    window.createDataSyncTabUI = createDataSyncTabUI;
    window.setupDataSyncEventHandlers = setupDataSyncEventHandlers;
    
    // Start initialization
    initializeDataSync();
    
})();