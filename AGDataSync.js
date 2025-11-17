// AGDataSync.js - Browser-based data sync tool for AGCopilotAPI
// Syncs historical signal data from Alpha Gardeners API to local AGCopilotAPI database

(async function() {
    console.clear();
    console.log('%c📊 AG Data Sync v1.0 📊', 'color: blue; font-size: 16px; font-weight: bold;');
    
    // Check if we're being loaded in the AGCopilot tab
    const isInTab = document.getElementById('data-sync-tab');
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
        DELAY_BETWEEN_TOKENS_MS: 350,
        BATCH_SIZE: 50,
        DELAY_BETWEEN_BATCHES_MS: 5000,
        RATE_LIMIT_BACKOFF_MS: 300000,
    };

    // ========================================
    // 🛠️ UTILITIES & DEPENDENCY MANAGEMENT
    // ========================================
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Wait for AGCopilot to fully load (optional - DataSync can run standalone)
    async function waitForAGCopilot(timeout = 5000) {
        const startTime = Date.now();
        
        console.log('⏳ Checking for AGCopilot core...');
        
        while (Date.now() - startTime < timeout) {
            if (window.burstRateLimiter && window.CONFIG) {
                console.log('✅ AGCopilot core found - will use shared rate limiter');
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('ℹ️ AGCopilot core not found - running in standalone mode');
        return false;
    }

    // ========================================
    // 📊 DATA SYNC CLASS
    // ========================================
    class AGDataSync {
        constructor() {
            this.stats = {
                tokensDiscovered: 0,
                tokensProcessed: 0,
                signalsImported: 0,
                tokensSkipped: 0,
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
            this.uiCallbacks = {
                onLog: null,
                onStatsUpdate: null
            };
        }

        setUICallbacks(callbacks) {
            this.uiCallbacks = { ...this.uiCallbacks, ...callbacks };
        }

        log(message, type = 'info') {
            const prefix = {
                info: '📊',
                success: '✅',
                error: '❌',
                warning: '⚠️',
                progress: '🔄',
            }[type] || 'ℹ️';
            
            const logMessage = `${prefix} ${message}`;
            console.log(logMessage);
            
            // Call UI callback if available
            if (this.uiCallbacks.onLog) {
                this.uiCallbacks.onLog(logMessage, type);
            }
        }

        updateStats() {
            if (this.uiCallbacks.onStatsUpdate) {
                this.uiCallbacks.onStatsUpdate(this.stats, this.rateLimitInfo);
            }
        }

        async delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        async fetchFromAG(endpoint, params = {}) {
            const url = new URL(`${SYNC_CONFIG.AG_API_URL}${endpoint}`);
            Object.entries(params).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    url.searchParams.append(key, value);
                }
            });

            const response = await fetch(url.toString(), {
                credentials: 'include',
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

            if (rateLimitHeaders.limit) {
                this.rateLimitInfo.limit = parseInt(rateLimitHeaders.limit);
                this.rateLimitInfo.remaining = parseInt(rateLimitHeaders.remaining);
                this.rateLimitInfo.reset = parseInt(rateLimitHeaders.reset);
                this.updateStats();

                // Proactive backoff if we're running low on requests
                if (this.rateLimitInfo.remaining <= 5 && this.rateLimitInfo.remaining > 0) {
                    const now = Math.floor(Date.now() / 1000);
                    const secondsUntilReset = this.rateLimitInfo.reset - now;
                    
                    if (secondsUntilReset > 0 && secondsUntilReset < 300) {
                        this.stats.proactiveBackoffs++;
                        const waitTime = (secondsUntilReset + 5) * 1000;
                        this.log(
                            `Rate limit low (${this.rateLimitInfo.remaining}/${this.rateLimitInfo.limit} remaining). ` +
                            `Proactively waiting ${Math.ceil(waitTime / 1000)}s until reset...`,
                            'warning'
                        );
                        await this.delay(waitTime);
                        this.log('Resuming after proactive rate limit wait...', 'info');
                    }
                }
            }

            if (!response.ok) {
                if (response.status === 429) {
                    this.stats.rateLimitHits++;
                    const now = Math.floor(Date.now() / 1000);
                    const resetTime = this.rateLimitInfo.reset || (now + 60);
                    const waitTime = Math.max((resetTime - now + 5) * 1000, SYNC_CONFIG.RATE_LIMIT_BACKOFF_MS);
                    
                    this.log(
                        `Rate limit exceeded (429) - Hit #${this.stats.rateLimitHits}. ` +
                        `Backing off for ${Math.ceil(waitTime / 1000)} seconds...`,
                        'error'
                    );
                    await this.delay(waitTime);
                    this.log('Resuming after rate limit backoff...', 'info');
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

        async discoverTokens(fromDate, toDate) {
            this.log(`Discovering tokens from ${fromDate.toISOString()} to ${toDate.toISOString()}...`, 'progress');
            
            const fromTimestamp = Math.floor(fromDate.getTime() / 1000);
            const toTimestamp = Math.floor(toDate.getTime() / 1000);
            
            let page = 1;
            const pageSize = 5000;
            let hasMore = true;

            while (hasMore && !this.stopped) {
                try {
                    this.log(`Fetching page ${page} (max ${pageSize} results)...`, 'progress');
                    
                    const data = await this.fetchFromAG('/swaps', {
                        fromTimestamp,
                        toTimestamp,
                        page,
                        limit: pageSize,
                        sort: 'timestamp',
                        direction: 'desc'
                    });

                    if (data.swaps && data.swaps.length > 0) {
                        data.swaps.forEach(swap => {
                            if (swap.tokenAddress) {
                                this.uniqueTokens.add(swap.tokenAddress);
                            }
                        });
                        
                        this.stats.tokensDiscovered = this.uniqueTokens.size;
                        this.updateStats();
                        this.log(`Found ${data.swaps.length} swaps on page ${page} (${this.uniqueTokens.size} unique tokens so far)`, 'info');

                        if (data.swaps.length < pageSize) {
                            hasMore = false;
                        } else {
                            page++;
                            await this.delay(SYNC_CONFIG.DELAY_BETWEEN_REQUESTS_MS);
                        }
                    } else {
                        hasMore = false;
                    }
                } catch (error) {
                    this.stats.errors++;
                    this.updateStats();
                    this.log(`Error discovering tokens on page ${page}: ${error.message}`, 'error');
                    hasMore = false;
                }
            }

            this.log(`Token discovery complete: ${this.uniqueTokens.size} unique tokens found`, 'success');
        }

        async syncTokenData(tokenAddress, fromDate, toDate) {
            try {
                const fromTimestamp = Math.floor(fromDate.getTime() / 1000);
                const toTimestamp = Math.floor(toDate.getTime() / 1000);

                this.log(`Fetching swaps for token ${tokenAddress.substring(0, 8)}...`, 'progress');
                
                const data = await this.fetchFromAG('/swaps', {
                    search: tokenAddress,
                    fromTimestamp,
                    toTimestamp,
                    sort: 'timestamp',
                    direction: 'desc',
                    page: 1,
                    limit: 5000
                });

                if (!data.swaps || data.swaps.length === 0) {
                    this.log(`No swaps found for token ${tokenAddress.substring(0, 8)} in date range`, 'warning');
                    this.stats.tokensSkipped++;
                    this.updateStats();
                    return;
                }

                const filteredSwaps = data.swaps.filter(swap => {
                    return swap.timestamp >= fromTimestamp && swap.timestamp <= toTimestamp;
                });

                if (filteredSwaps.length === 0) {
                    this.log(`Token ${tokenAddress.substring(0, 8)}: All ${data.swaps.length} swaps outside date range`, 'warning');
                    this.stats.tokensSkipped++;
                    this.updateStats();
                    return;
                }

                this.log(`Importing ${filteredSwaps.length} swaps for token ${tokenAddress.substring(0, 8)}...`, 'progress');
                
                const result = await this.postToLocalAPI('/api/import/swaps', {
                    tokenAddress,
                    swaps: filteredSwaps
                });

                this.stats.signalsImported += result.imported || filteredSwaps.length;
                this.stats.tokensProcessed++;
                this.updateStats();
                this.log(`Imported ${result.imported || filteredSwaps.length} swaps for ${tokenAddress.substring(0, 8)}`, 'success');

            } catch (error) {
                this.stats.errors++;
                this.updateStats();
                this.log(`Error syncing token ${tokenAddress.substring(0, 8)}: ${error.message}`, 'error');
            }
        }

        async sync(fromDate, toDate) {
            this.stats.startTime = Date.now();
            this.stopped = false;
            this.log('Starting data sync...', 'info');

            try {
                await this.discoverTokens(fromDate, toDate);

                if (this.stopped) {
                    this.log('Sync stopped by user', 'warning');
                    return;
                }

                const tokens = Array.from(this.uniqueTokens);
                this.log(`Syncing data for ${tokens.length} tokens...`, 'info');

                for (let i = 0; i < tokens.length && !this.stopped; i++) {
                    await this.syncTokenData(tokens[i], fromDate, toDate);
                    
                    if ((i + 1) % SYNC_CONFIG.BATCH_SIZE === 0 && i + 1 < tokens.length) {
                        this.stats.currentBatch++;
                        this.log(`Batch ${this.stats.currentBatch} complete (${i + 1}/${tokens.length}). Taking a break...`, 'info');
                        await this.delay(SYNC_CONFIG.DELAY_BETWEEN_BATCHES_MS);
                    } else if (i + 1 < tokens.length) {
                        await this.delay(SYNC_CONFIG.DELAY_BETWEEN_TOKENS_MS);
                    }
                }

                if (this.stopped) {
                    this.log('Sync stopped by user', 'warning');
                } else {
                    const duration = ((Date.now() - this.stats.startTime) / 1000 / 60).toFixed(1);
                    this.log(`Sync complete! Duration: ${duration} minutes`, 'success');
                    this.log(`Summary: ${this.stats.tokensProcessed} tokens processed, ${this.stats.signalsImported} signals imported, ${this.stats.errors} errors`, 'success');
                }

            } catch (error) {
                this.stats.errors++;
                this.updateStats();
                this.log(`Fatal sync error: ${error.message}`, 'error');
            }
        }

        stop() {
            this.stopped = true;
            this.log('Stopping sync...', 'warning');
        }
    }

    // ========================================
    // 🎨 UI FUNCTIONS
    // ========================================
    
    function createDataSyncTabUI() {
        console.log('📊 Creating Data Sync tab UI...');
        
        const container = document.getElementById('data-sync-container');
        if (!container) {
            console.error('❌ Data Sync container not found');
            return false;
        }

        const defaultFromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const defaultToDate = new Date().toISOString().split('T')[0];

        container.innerHTML = `
            <div style="padding: 16px;">
                <div style="
                    background: rgba(66, 153, 225, 0.1);
                    border: 1px solid rgba(66, 153, 225, 0.3);
                    border-radius: 6px;
                    padding: 12px;
                    margin-bottom: 16px;
                ">
                    <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #4299e1;">
                        📊 Sync AG API Data to Local Database
                    </h4>
                    <p style="margin: 0; font-size: 11px; color: #a0aec0; line-height: 1.5;">
                        Fetch historical signal data from Alpha Gardeners API and store it in your local AGCopilotAPI database.
                        This enables offline backtesting and faster optimization.
                    </p>
                </div>

                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 500; color: #e2e8f0;">
                        Date Range
                    </label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>
                            <label style="display: block; margin-bottom: 4px; font-size: 10px; color: #a0aec0;">From Date</label>
                            <input type="date" id="sync-from-date" style="
                                width: 100%;
                                padding: 8px;
                                background: #2d3748;
                                border: 1px solid #4a5568;
                                border-radius: 4px;
                                color: #e2e8f0;
                                font-size: 11px;
                            " value="${defaultFromDate}" />
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 4px; font-size: 10px; color: #a0aec0;">To Date</label>
                            <input type="date" id="sync-to-date" style="
                                width: 100%;
                                padding: 8px;
                                background: #2d3748;
                                border: 1px solid #4a5568;
                                border-radius: 4px;
                                color: #e2e8f0;
                                font-size: 11px;
                            " value="${defaultToDate}" />
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 500; color: #e2e8f0;">
                        Local API URL
                    </label>
                    <input type="text" id="sync-api-url" style="
                        width: 100%;
                        padding: 8px;
                        background: #2d3748;
                        border: 1px solid #4a5568;
                        border-radius: 4px;
                        color: #e2e8f0;
                        font-size: 11px;
                    " value="${SYNC_CONFIG.LOCAL_API_URL}" />
                    <div style="margin-top: 4px; font-size: 10px; color: #718096;">
                        Make sure AGCopilotAPI is running on this URL
                    </div>
                </div>

                <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                    <button id="start-sync-btn" style="
                        flex: 1;
                        padding: 10px;
                        background: rgba(72, 187, 120, 0.2);
                        border: 1px solid rgba(72, 187, 120, 0.4);
                        border-radius: 6px;
                        color: #48bb78;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: 600;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='rgba(72, 187, 120, 0.3)'" 
                       onmouseout="this.style.background='rgba(72, 187, 120, 0.2)'">
                        ▶️ Start Sync
                    </button>
                    <button id="stop-sync-btn" style="
                        flex: 1;
                        padding: 10px;
                        background: rgba(245, 101, 101, 0.2);
                        border: 1px solid rgba(245, 101, 101, 0.4);
                        border-radius: 6px;
                        color: #f56565;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: 600;
                        transition: all 0.2s;
                        opacity: 0.5;
                        cursor: not-allowed;
                    " disabled onmouseover="if (!this.disabled) this.style.background='rgba(245, 101, 101, 0.3)'" 
                       onmouseout="if (!this.disabled) this.style.background='rgba(245, 101, 101, 0.2)'">
                        ⏹️ Stop Sync
                    </button>
                </div>

                <div style="
                    background: rgba(45, 55, 72, 0.5);
                    border: 1px solid #4a5568;
                    border-radius: 6px;
                    padding: 12px;
                    margin-bottom: 16px;
                ">
                    <h5 style="margin: 0 0 8px 0; font-size: 11px; font-weight: 600; color: #e2e8f0;">
                        Sync Statistics
                    </h5>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 10px;">
                        <div>
                            <div style="color: #a0aec0;">Tokens Discovered</div>
                            <div id="stat-tokens-discovered" style="color: #4299e1; font-weight: 600;">0</div>
                        </div>
                        <div>
                            <div style="color: #a0aec0;">Tokens Processed</div>
                            <div id="stat-tokens-processed" style="color: #48bb78; font-weight: 600;">0</div>
                        </div>
                        <div>
                            <div style="color: #a0aec0;">Signals Imported</div>
                            <div id="stat-signals-imported" style="color: #9f7aea; font-weight: 600;">0</div>
                        </div>
                        <div>
                            <div style="color: #a0aec0;">Tokens Skipped</div>
                            <div id="stat-tokens-skipped" style="color: #ed8936; font-weight: 600;">0</div>
                        </div>
                        <div>
                            <div style="color: #a0aec0;">Rate Limit</div>
                            <div id="stat-rate-limit" style="color: #ecc94b; font-weight: 600;">--/--</div>
                        </div>
                        <div>
                            <div style="color: #a0aec0;">Errors</div>
                            <div id="stat-errors" style="color: #f56565; font-weight: 600;">0</div>
                        </div>
                    </div>
                </div>

                <div style="
                    background: #1a202c;
                    border: 1px solid #4a5568;
                    border-radius: 6px;
                    padding: 12px;
                    max-height: 300px;
                    overflow-y: auto;
                ">
                    <h5 style="margin: 0 0 8px 0; font-size: 11px; font-weight: 600; color: #e2e8f0;">
                        Sync Log
                    </h5>
                    <div id="sync-log" style="font-family: 'Courier New', monospace; font-size: 10px; color: #cbd5e0; line-height: 1.6;">
                        <div style="color: #718096;">Waiting to start sync...</div>
                    </div>
                </div>
            </div>
        `;

        console.log('✅ Data Sync UI created successfully');
        return true;
    }

    // ========================================
    // 🎮 EVENT HANDLERS
    // ========================================
    
    let currentSync = null;
    const eventHandlers = {};

    function setupDataSyncEventHandlers() {
        console.log('🎮 Setting up Data Sync event handlers...');

        const safeAddEventListener = (elementId, event, handler) => {
            const element = document.getElementById(elementId);
            if (!element) {
                console.warn(`⚠️  Element ${elementId} not found for event binding`);
                return null;
            }
            element.addEventListener(event, handler);
            return handler;
        };

        // START SYNC BUTTON
        eventHandlers.startSync = safeAddEventListener('start-sync-btn', 'click', async () => {
            const startBtn = document.getElementById('start-sync-btn');
            const stopBtn = document.getElementById('stop-sync-btn');
            const fromDateInput = document.getElementById('sync-from-date');
            const toDateInput = document.getElementById('sync-to-date');

            if (!fromDateInput || !toDateInput) {
                console.error('❌ Date inputs not found');
                return;
            }

            const fromDate = new Date(fromDateInput.value);
            const toDate = new Date(toDateInput.value);

            if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
                alert('Please select valid dates');
                return;
            }

            if (fromDate > toDate) {
                alert('From date must be before To date');
                return;
            }

            // Disable start button, enable stop button
            startBtn.disabled = true;
            startBtn.style.opacity = '0.5';
            startBtn.style.cursor = 'not-allowed';
            stopBtn.disabled = false;
            stopBtn.style.opacity = '1';
            stopBtn.style.cursor = 'pointer';

            // Clear log
            const logDiv = document.getElementById('sync-log');
            if (logDiv) {
                logDiv.innerHTML = '';
            }

            // Create and configure sync instance
            currentSync = new AGDataSync();
            currentSync.setUICallbacks({
                onLog: (message, type) => {
                    if (logDiv) {
                        const logEntry = document.createElement('div');
                        const colors = {
                            info: '#cbd5e0',
                            success: '#48bb78',
                            error: '#f56565',
                            warning: '#ed8936',
                            progress: '#4299e1'
                        };
                        logEntry.style.color = colors[type] || colors.info;
                        logEntry.textContent = message;
                        logDiv.appendChild(logEntry);
                        logDiv.scrollTop = logDiv.scrollHeight;
                    }
                },
                onStatsUpdate: (stats, rateLimitInfo) => {
                    document.getElementById('stat-tokens-discovered').textContent = stats.tokensDiscovered;
                    document.getElementById('stat-tokens-processed').textContent = stats.tokensProcessed;
                    document.getElementById('stat-signals-imported').textContent = stats.signalsImported;
                    document.getElementById('stat-tokens-skipped').textContent = stats.tokensSkipped;
                    document.getElementById('stat-errors').textContent = stats.errors;
                    
                    const rlInfo = rateLimitInfo.remaining !== null
                        ? `${rateLimitInfo.remaining}/${rateLimitInfo.limit}`
                        : '--/--';
                    document.getElementById('stat-rate-limit').textContent = rlInfo;
                }
            });

            // Start sync
            await currentSync.sync(fromDate, toDate);

            // Re-enable start button
            startBtn.disabled = false;
            startBtn.style.opacity = '1';
            startBtn.style.cursor = 'pointer';
            stopBtn.disabled = true;
            stopBtn.style.opacity = '0.5';
            stopBtn.style.cursor = 'not-allowed';
        });

        // STOP SYNC BUTTON
        eventHandlers.stopSync = safeAddEventListener('stop-sync-btn', 'click', () => {
            if (currentSync) {
                currentSync.stop();
                const startBtn = document.getElementById('start-sync-btn');
                const stopBtn = document.getElementById('stop-sync-btn');
                
                if (startBtn) {
                    startBtn.disabled = false;
                    startBtn.style.opacity = '1';
                    startBtn.style.cursor = 'pointer';
                }
                if (stopBtn) {
                    stopBtn.disabled = true;
                    stopBtn.style.opacity = '0.5';
                    stopBtn.style.cursor = 'not-allowed';
                }
            }
        });

        console.log('✅ Data Sync event handlers registered');
        return true;
    }

    function cleanupDataSyncEventHandlers() {
        console.log('🧹 Cleaning up Data Sync event handlers...');
        Object.keys(eventHandlers).forEach(key => {
            delete eventHandlers[key];
        });
    }

    window.addEventListener('beforeunload', cleanupDataSyncEventHandlers);

    // ========================================
    // 🚀 INITIALIZATION
    // ========================================
    
    console.log('🔧 Initializing AG Data Sync...');
    
    async function initializeWithRetry(maxRetries = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`📊 Data Sync initialization attempt ${attempt}/${maxRetries}...`);
                
                // Optional: wait for AGCopilot (we can run standalone too)
                await waitForAGCopilot();
                
                // Check if we're in a tab
                const tabContainer = document.getElementById('data-sync-container');
                
                if (tabContainer) {
                    console.log('📊 Running in AGCopilot tab mode');
                    if (!createDataSyncTabUI()) {
                        throw new Error('Failed to create Data Sync UI');
                    }
                    if (!setupDataSyncEventHandlers()) {
                        throw new Error('Failed to setup event handlers');
                    }
                    console.log('✅ Data Sync tab initialized successfully');
                } else {
                    console.log('📊 Running in standalone mode');
                    console.log('💡 Use: const sync = new AGDataSync(); await sync.sync(fromDate, toDate);');
                }
                
                return true;
                
            } catch (error) {
                console.error(`❌ Initialization attempt ${attempt} failed:`, error);
                if (attempt < maxRetries) {
                    console.log(`⏳ Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.error('❌ Data Sync initialization failed after all retries');
                    const container = document.getElementById('data-sync-container');
                    if (container) {
                        container.innerHTML = `
                            <div style="padding: 20px; text-align: center;">
                                <div style="color: #f56565; font-size: 14px; margin-bottom: 10px;">❌ Failed to load Data Sync</div>
                                <div style="color: #a0aec0; font-size: 12px; margin-bottom: 10px;">${error.message}</div>
                                <button onclick="window.retryLoadDataSync()" style="
                                    padding: 8px 16px;
                                    background: rgba(66, 153, 225, 0.2);
                                    border: 1px solid rgba(66, 153, 225, 0.4);
                                    border-radius: 4px;
                                    color: #4299e1;
                                    cursor: pointer;
                                    font-size: 12px;
                                ">🔄 Retry</button>
                            </div>
                        `;
                    }
                    return false;
                }
            }
        }
    }

    window.retryLoadDataSync = function() {
        console.log('🔄 Retrying Data Sync initialization...');
        const container = document.getElementById('data-sync-container');
        if (container) {
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: #4299e1;">Loading Data Sync...</div>';
        }
        initializeWithRetry();
    };

    // ========================================
    // 🌍 GLOBAL EXPORTS
    // ========================================
    
    window.AGDataSync = {
        // Classes
        AGDataSyncClass: AGDataSync,
        
        // UI Functions
        createDataSyncTabUI,
        setupDataSyncEventHandlers,
        
        // Utilities
        SYNC_CONFIG,
        currentSync,
        
        // Version
        version: '1.0.0'
    };

    console.log('✅ AGDataSync namespace exported:', Object.keys(window.AGDataSync));

    // Start initialization
    initializeWithRetry();
    
})();
