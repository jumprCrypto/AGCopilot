(async function () {
    console.clear();
    console.log('%c🔍 Signal Extractor - Google Sheets Export Tool v2.0 🔍', 'color: blue; font-size: 16px; font-weight: bold;');
    console.log('%c📊 Extract token data optimized for Google Sheets import', 'color: green; font-size: 12px;');

    // ========================================
    // 🎯 CONFIGURATION
    // ========================================
    const CONFIG = {
        API_BASE_URL: 'https://backtester.alphagardeners.xyz/api',
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000,
        REQUEST_DELAY: 500, // Delay between API requests to prevent rate limiting
    };

    // ========================================
    // 🛠️ UTILITIES
    // ========================================
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Rate limiter for API requests
    class APIRateLimiter {
        constructor(delay = 500) {
            this.delay = delay;
            this.lastRequest = 0;
        }

        async throttle() {
            const now = Date.now();
            const elapsed = now - this.lastRequest;
            
            if (elapsed < this.delay) {
                await sleep(this.delay - elapsed);
            }
            
            this.lastRequest = Date.now();
        }
    }

    const rateLimiter = new APIRateLimiter(CONFIG.REQUEST_DELAY);

    function formatSource(source) {
        if (!source) return 'Native';
        
        switch (source) {   
            case 1:
                return 'Pumpfun';
            case 2:
                return 'Launchcoin';
            case 3:
                return 'Launchpad';
            default:
                return 'Native';
        }
    }


    // ========================================
    // 🌐 API FUNCTIONS
    // ========================================
    async function fetchWithRetry(url, maxRetries = CONFIG.MAX_RETRIES) {
        await rateLimiter.throttle();
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🌐 Fetching: ${url} (attempt ${attempt})`);
                const response = await fetch(url);
                
                if (!response.ok) {
                    if (response.status === 429) {
                        // Rate limited - use exponential backoff with longer delays
                        const baseDelay = 3000; // 3 seconds base delay for rate limits
                        const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
                        const maxDelay = 30000; // Cap at 30 seconds
                        const delay = Math.min(exponentialDelay, maxDelay);
                        
                        console.log(`⏳ Rate limited (429), waiting ${delay / 1000}s before retry ${attempt}/${maxRetries}...`);
                        throw new Error(`Rate limited (HTTP 429). Waiting ${delay / 1000}s before retry.`);
                    } else {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                }
                
                const data = await response.json();
                console.log(`✅ Successfully fetched data`);
                return data;
                
            } catch (error) {
                console.log(`❌ Attempt ${attempt} failed: ${error.message}`);
                
                if (attempt === maxRetries) {
                    throw new Error(`Failed to fetch after ${maxRetries} attempts: ${error.message}`);
                }
                
                // Determine retry delay based on error type
                let retryDelay;
                if (error.message.includes('Rate limited')) {
                    // For rate limits, use the exponential backoff calculated above
                    const baseDelay = 3000;
                    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
                    retryDelay = Math.min(exponentialDelay, 30000);
                } else {
                    // For other errors, use standard retry delay
                    retryDelay = CONFIG.RETRY_DELAY * attempt;
                }
                
                await sleep(retryDelay);
            }
        }
    }

    // Get token info by search (contract address)
    async function getTokenInfo(contractAddress) {
        const url = `${CONFIG.API_BASE_URL}/swaps?fromDate=2000-01-01&toDate=9999-12-31&search=${contractAddress}&sort=timestamp&direction=desc&page=1&limit=1`;
        const data = await fetchWithRetry(url);
        
        if (!data.swaps || data.swaps.length === 0) {
            throw new Error('Token not found or no swap data available');
        }
        
        return data.swaps[0];
    }

    // Get all swaps for a specific token
    async function getAllTokenSwaps(contractAddress) {
        const url = `${CONFIG.API_BASE_URL}/swaps/by-token/${contractAddress}`;
        const data = await fetchWithRetry(url);
        
        if (!data.swaps || data.swaps.length === 0) {
            throw new Error('No swap history found for this token');
        }
        
        return data.swaps;
    }

    // ========================================
    // 📊 DATA PROCESSING
    // ========================================
    function processTokenData(tokenInfo, swaps) {
        const result = {
            // Basic Token Info
            tokenAddress: tokenInfo.tokenAddress,
            tokenName: tokenInfo.token,
            symbol: tokenInfo.symbol,
            currentMcap: formatMcap(tokenInfo.currentMcap),
            currentMcapRaw: tokenInfo.currentMcap,
            athMcap: formatMcap(tokenInfo.athMcap),
            athMcapRaw: tokenInfo.athMcap,
            athTime: formatTimestamp(tokenInfo.athTime),
            atlMcap: formatMcap(tokenInfo.atlMcap),
            atlMcapRaw: tokenInfo.atlMcap,
            atlTime: formatTimestamp(tokenInfo.atlTime),
            source: formatSource(tokenInfo.source),
            
            // Performance Metrics
            athMultiplier: tokenInfo.athMcap && tokenInfo.signalMcap ? 
                (tokenInfo.athMcap / tokenInfo.signalMcap).toFixed(2) + 'x' : 'N/A',
            athMultiplierRaw: tokenInfo.athMcap && tokenInfo.signalMcap ? 
                (tokenInfo.athMcap / tokenInfo.signalMcap) : 0,
            currentFromAth: tokenInfo.athMcap && tokenInfo.currentMcap ? 
                formatPercent(((tokenInfo.currentMcap - tokenInfo.athMcap) / tokenInfo.athMcap) * 100) : 'N/A',
            
            // Signal Analysis
            totalSignals: swaps.length,
            firstSignalTime: formatTimestamp(swaps[swaps.length - 1]?.timestamp),
            lastSignalTime: formatTimestamp(swaps[0]?.timestamp),
            firstSignalMcap: formatMcap(swaps[swaps.length - 1]?.signalMcap),
            lastSignalMcap: formatMcap(swaps[0]?.signalMcap),
            
            // Win Prediction Analysis
            avgWinPred: swaps.length > 0 ? 
                formatPercent(swaps.reduce((sum, swap) => sum + (swap.winPredPercent || 0), 0) / swaps.length) : 'N/A',
            maxWinPred: swaps.length > 0 ? 
                formatPercent(Math.max(...swaps.map(swap => swap.winPredPercent || 0))) : 'N/A',
            minWinPred: swaps.length > 0 ? 
                formatPercent(Math.min(...swaps.map(swap => swap.winPredPercent || 0))) : 'N/A',
            
            // Trigger Mode Analysis
            triggerModes: [...new Set(swaps.map(swap => swap.triggerMode))].join(', '),
            
            // Latest Criteria (from most recent swap)
            latestCriteria: tokenInfo.criteria
        };
        
        return result;
    }

    function generateCSVOutput(allTokenData, removeHeaders = true) {
        const csvLines = [];
        
        // Custom TSV Header matching your requested format
        if (!removeHeaders) {
            csvLines.push([
                'Ticker',
                'CA',
                'MC',
                'Liquidity',
                'Liquidity Percentage',
                'Platform',
                'Source',
                'Wallet Stats',
                'Recent Swap(s)',
                'Buy Ratio',
                'Vol2MC',
                'AG Score',
                'Holders Count',
                'Top Holder Pct',
                'Bundle',
                'Drained%',
                'Drained Count',
                'TTC',
                'Buyer Label',
                'Deployer Balance',
                'Deployer Balance at Mint',
                'Fresh Deployer',
                'Funding Label',
                'Skip If No KYC/CEX Funding',
                'Funding Address',
                'Deployer Age',
                'Token Age',
                'Description'
            ].join('\t'));
        }
        
        // TSV Data rows with your custom format
        allTokenData.forEach(tokenData => {
            const processed = tokenData.processed;
            
            tokenData.swaps.forEach(swap => {
                // Format market cap - use signal MCAP for the row
                const mcFormatted = swap.signalMcap ? `$${swap.signalMcap}` : '';
                
                // Format liquidity
                const liquidityFormatted = swap.criteria?.liquidity ? `$${swap.criteria.liquidity}` : '';
                
                // Wallet stats (updated format: F: X KYC: Y Unq: Z DM: W)
                const walletStats = `F: ${swap.criteria?.uniqueCount || 0} KYC: ${swap.criteria?.kycCount || 0} Unq: ${swap.criteria?.uniqueCount || 0} SM: ${swap.criteria?.smCount || 0} D: ${swap.criteria?.dormantCount || 0}`;
                
                // Platform logic based on CA ending
                let platform = 'Unknown';
                if (processed.tokenAddress) {
                    const ca = processed.tokenAddress.toLowerCase();
                    if (ca.endsWith('pump')) {
                        platform = 'PumpFun';
                    } else if (ca.endsWith('bonk')) {
                        platform = 'Bonk';
                    }
                }
                
                // Recent swap timestamp formatted
                const recentSwap = swap.timestamp ? 
                    new Date(swap.timestamp * 1000).toISOString().replace('T', ' ').slice(0, 19) : '';
                
                // Buy ratio (buy volume percentage)
                const buyRatio = swap.criteria?.buyVolumePct ? `${swap.criteria.buyVolumePct.toFixed(1)}%` : '';
                
                // Vol2MC (volume vs market cap percentage)
                const vol2MC = swap.criteria?.volMcapPct ? `${swap.criteria.volMcapPct.toFixed(1)}%` : '';
                
                // Bundle percentage
                const bundlePercent = swap.criteria?.bundledPct ? `${swap.criteria.bundledPct.toFixed(1)}%` : '';
                
                // Drained percentage
                const drainedPercent = swap.criteria?.drainedPct ? `${swap.criteria.drainedPct.toFixed(1)}%` : '';
                
                // Deployer age
                const deployerAge = swap.criteria?.deployerAge ? `${swap.criteria.deployerAge}m` : '';
                                
                // Token age
                const tokenAge = swap.criteria?.tokenAge ? `${swap.criteria.tokenAge}s` : '';
                
                const row = [
                    processed.symbol || '',                                    // Ticker
                    processed.tokenAddress || '',                             // CA
                    mcFormatted,                                              // MC
                    liquidityFormatted,                                       // Liquidity
                    swap.criteria?.liquidityPct ? `${swap.criteria.liquidityPct.toFixed(1)}%` : '', // Liquidity Percentage
                    platform,
                    processed.source || '',                                                 // Platform (based on CA ending)
                    walletStats,                                              // Wallet Stats
                    recentSwap,                                               // Recent Swap
                    buyRatio,                                                 // Buy Ratio
                    vol2MC,                                                   // Vol2MC
                    swap.criteria?.agScore || '',                             // AG Score
                    swap.criteria.holdersCount,                                            // Holders Count
                    swap.criteria?.topHoldersPct || '',                       // Top Holder Pct
                    bundlePercent,                                            // Bundle
                    drainedPercent,                                            // Bundle
                    swap.criteria.drainedCount,
                    swap.criteria.ttc,
                    swap.criteria.buyerLabel,
                    swap.criteria?.deployerBalance || '',                     // Deployer Balance
                    swap.criteria?.deployerBalanceAtMint || '',               // Deployer Balance at Mint
                    swap.criteria?.freshDeployer ? 'Yes' : 'No',              // Fresh Deployer
                    swap.criteria?.fundingLabel || '',                        // Funding Label
                    swap.criteria?.skipIfNoKycCexFunding ? 'Yes' : 'No',     // Skip If No KYC/CEX Funding
                    '',                                                       // Funding Address (not available in current data)
                    deployerAge,                                              // Deployer Age
                    tokenAge,                                                 // Token Age
                    swap.criteria?.hasDescription ? 'Yes' : 'No'             // Source
                ];
                csvLines.push(row.join('\t'));
            });
        });
        
        return csvLines.join('\n');
    }

    
    

    // ========================================
    // 📋 CLIPBOARD FUNCTIONS
    // ========================================
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            return false;
        }
    }

    // ========================================
    // 🎨 UI FUNCTIONS
    // ========================================
    function createUI() {
        // Remove existing UI
        const existingUI = document.getElementById('signal-extractor-ui');
        if (existingUI) {
            existingUI.remove();
        }

        const ui = document.createElement('div');
        ui.id = 'signal-extractor-ui';
        ui.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 450px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: 2px solid #fff;
            border-radius: 15px;
            padding: 20px;
            z-index: 10000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: white;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        `;

        ui.innerHTML = `
            <div style="text-align: center; margin-bottom: 15px;">
                <h3 style="margin: 0; font-size: 18px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                    🔍 Signal Extractor
                </h3>
            </div>
            
            <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 12px;">Contract Addresses:</label>
                    <textarea id="contract-input" placeholder="Enter contract addresses (one per line)..." 
                           style="width: 100%; padding: 6px; border: none; border-radius: 5px; font-size: 12px; height: 70px; resize: vertical;">
                    </textarea>
                    <div style="font-size: 10px; opacity: 0.7; margin-top: 2px;">
                        💡 One per line for batch processing
                    </div>
                </div>
                
                <div style="flex: 1;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 12px;">Trigger Modes:</label>
                    <div style="background: rgba(0,0,0,0.2); border-radius: 5px; padding: 6px; height: 70px; overflow-y: auto;">
                        <label style="display: flex; align-items: center; margin-bottom: 2px; cursor: pointer;">
                            <input type="checkbox" id="trigger-empty" value="" checked style="margin-right: 4px;">
                            <span style="font-size: 10px;">Bullish Bonding</span>
                        </label>
                        <label style="display: flex; align-items: center; margin-bottom: 2px; cursor: pointer;">
                            <input type="checkbox" id="trigger-1" value="1" checked style="margin-right: 4px;">
                            <span style="font-size: 10px;">God Mode</span>
                        </label>
                        <label style="display: flex; align-items: center; margin-bottom: 0; cursor: pointer;">
                            <input type="checkbox" id="trigger-6" value="2" checked style="margin-right: 4px;">
                            <span style="font-size: 10px;">Moon Finder</span>
                        </label>
                        <label style="display: flex; align-items: center; margin-bottom: 2px; cursor: pointer;">
                            <input type="checkbox" id="trigger-3" value="3" checked style="margin-right: 4px;">
                            <span style="font-size: 10px;">Fomo</span>
                        </label>
                        <label style="display: flex; align-items: center; margin-bottom: 2px; cursor: pointer;">
                            <input type="checkbox" id="trigger-4" value="4" checked style="margin-right: 4px;">
                            <span style="font-size: 10px;">Launchpads</span>
                        </label>
                        <label style="display: flex; align-items: center; margin-bottom: 2px; cursor: pointer;">
                            <input type="checkbox" id="trigger-5" value="5" checked style="margin-right: 4px;">
                            <span style="font-size: 10px;">Smart Tracker</span>
                        </label>
                    </div>
                    <div style="font-size: 10px; opacity: 0.7; margin-top: 2px;">
                        📊 Select modes to extract
                    </div>
                </div>
            </div>
            
            <div style="display: flex; gap: 15px; margin-bottom: 10px; align-items: center;">
                <label style="display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" id="remove-headers" checked style="margin-right: 6px;">
                    <span style="font-size: 11px; font-weight: bold;">Remove Headers</span>
                </label>
                <div style="flex: 1; display: flex; gap: 8px;">
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 2px; font-size: 10px; font-weight: bold;">Signals/Token:</label>
                        <input type="number" id="signals-per-token" value="3" min="1" max="999" 
                               style="width: 100%; padding: 4px; border: 1px solid white; border-radius: 3px; font-size: 11px; text-align: center;">
                    </div>

                </div>
            </div>
            
            <div style="margin-bottom: 10px;">
            
            <div style="margin-bottom: 10px;">
                <button id="extract-btn" style="
                    width: 100%; 
                    padding: 10px; 
                    background: linear-gradient(45deg, #FF6B6B, #4ECDC4); 
                    border: none; 
                    border-radius: 8px; 
                    color: white; 
                    font-weight: bold; 
                    cursor: pointer;
                    font-size: 13px;
                    transition: transform 0.2s;
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    🚀 Extract Data
                </button>
            </div>
            
            <div id="status-area" style="
                background: rgba(0,0,0,0.2); 
                border-radius: 5px; 
                padding: 8px; 
                font-size: 11px; 
                min-height: 35px;
                max-height: 80px;
                overflow-y: auto;
            ">
                <div style="opacity: 0.8;">Ready to extract token data...</div>
            </div>
            
            <div id="action-buttons" style="margin-top: 10px; display: none;">
                <button id="copy-detailed-csv-btn" style="
                    width: 97%; 
                    padding: 8px; 
                    background: #28a745; 
                    border: none; 
                    border-radius: 4px; 
                    color: white; 
                    font-size: 10px; 
                    cursor: pointer;
                    margin-right: 2%;
                    font-weight: bold;
                ">
                    📊 Copy
                </button>
            </div>
            
            <div style="margin-top: 10px; text-align: center;">
                <button id="close-btn" style="
                    padding: 4px 12px; 
                    background: rgba(255,255,255,0.2); 
                    border: 1px solid rgba(255,255,255,0.3); 
                    border-radius: 12px; 
                    color: white; 
                    font-size: 10px; 
                    cursor: pointer;
                ">
                    ✕ Close
                </button>
            </div>
        `;

        document.body.appendChild(ui);
        return ui;
    }

    function updateStatus(message, isError = false) {
        const statusArea = document.getElementById('status-area');
        if (statusArea) {
            const timestamp = new Date().toLocaleTimeString();
            const icon = isError ? '❌' : '📝';
            const color = isError ? '#ff6b6b' : '#ffffff';
            
            statusArea.innerHTML += `<div style="color: ${color}; margin: 2px 0;">
                <span style="opacity: 0.7;">${timestamp}</span> ${icon} ${message}
            </div>`;
            statusArea.scrollTop = statusArea.scrollHeight;
        }
    }
    
    // ========================================
    // 🚀 MAIN EXTRACTION FUNCTION
    // ========================================
    
    // Get selected trigger modes
    function getSelectedTriggerModes() {
        const selectedModes = [];
        const checkboxes = ['trigger-empty', 'trigger-1', 'trigger-3', 'trigger-4', 'trigger-5', 'trigger-6'];
        
        checkboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox && checkbox.checked) {
                selectedModes.push(checkbox.value);
            }
        });
        
        return selectedModes;
    }
    
    // Filter swaps by selected trigger modes
    function filterSwapsByTriggerMode(swaps, selectedTriggerModes) {
        if (selectedTriggerModes.length === 0) {
            return swaps; // If no modes selected, return all swaps
        }
        
        return swaps.filter(swap => {
            const triggerMode = swap.triggerMode || '';
            return selectedTriggerModes.includes(triggerMode.toString());
        });
    }
    
    async function extractTokenData(contractAddresses) {
        try {
            updateStatus('Starting batch data extraction...');
            
            // Get selected trigger modes
            const selectedTriggerModes = getSelectedTriggerModes();
            updateStatus(`Selected trigger modes: ${selectedTriggerModes.length > 0 ? selectedTriggerModes.map(mode => mode === '' ? 'Bullish Bonding' : `Mode ${mode}`).join(', ') : 'All modes'}`);
            
            // Get signals per token limit
            const signalsPerToken = parseInt(document.getElementById('signals-per-token').value) || 3;
            updateStatus(`Signals per token limit: ${signalsPerToken}`);
            
            // Parse and validate contract addresses
            const rawAddresses = contractAddresses
                .split('\n')
                .map(addr => addr.trim())
                .filter(addr => addr.length > 0);
            
            if (rawAddresses.length === 0) {
                throw new Error('Please enter at least one contract address');
            }
            
            // Remove duplicates while preserving order and tracking duplicates
            const uniqueAddresses = [];
            const seenAddresses = new Set();
            const duplicateCount = {};
            const malformedAddresses = [];
            
            rawAddresses.forEach(addr => {
                // Check for malformed addresses (non-alphanumeric characters)
                if (!/^[a-zA-Z0-9]+$/.test(addr)) {
                    malformedAddresses.push(addr);
                    return; // Skip malformed addresses
                }
                
                const normalizedAddr = addr.toLowerCase();
                if (seenAddresses.has(normalizedAddr)) {
                    duplicateCount[addr] = (duplicateCount[addr] || 1) + 1;
                } else {
                    seenAddresses.add(normalizedAddr);
                    uniqueAddresses.push(addr);
                }
            });
            
            // Report on malformed addresses if any
            if (malformedAddresses.length > 0) {
                updateStatus(`⚠️ Skipped ${malformedAddresses.length} malformed address${malformedAddresses.length > 1 ? 'es' : ''} (contains non-alphanumeric characters)`);
                malformedAddresses.slice(0, 3).forEach(addr => {
                    const shortAddr = addr.length > 20 ? `${addr.slice(0, 10)}...${addr.slice(-6)}` : addr;
                    updateStatus(`  • Invalid: "${shortAddr}"`);
                });
                if (malformedAddresses.length > 3) {
                    updateStatus(`  • ...and ${malformedAddresses.length - 3} more`);
                }
            }
            
            // Report on duplicates if any
            const totalDuplicates = Object.keys(duplicateCount).length;
            if (totalDuplicates > 0) {
                updateStatus(`⚠️ Removed ${rawAddresses.length - uniqueAddresses.length - malformedAddresses.length} duplicate addresses (${totalDuplicates} unique duplicates found)`);
                Object.entries(duplicateCount).forEach(([addr, count]) => {
                    const shortAddr = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
                    updateStatus(`  • ${shortAddr} appeared ${count + 1} times`);
                });
            }
            
            // Validate each unique address
            const invalidAddresses = uniqueAddresses.filter(addr => addr.length < 32);
            if (invalidAddresses.length > 0) {
                throw new Error(`Invalid contract addresses: ${invalidAddresses.slice(0, 3).join(', ')}${invalidAddresses.length > 3 ? '...' : ''}`);
            }
            
            updateStatus(`Processing ${uniqueAddresses.length} unique contract address${uniqueAddresses.length > 1 ? 'es' : ''}...`);
            
            const allTokenData = [];
            const errors = [];
            
            // Process each unique contract address
            for (let i = 0; i < uniqueAddresses.length; i++) {
                const address = uniqueAddresses[i];
                const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
                
                try {
                    updateStatus(`[${i + 1}/${uniqueAddresses.length}] Fetching ${shortAddress}...`);
                    
                    const tokenInfo = await getTokenInfo(address);
                    updateStatus(`[${i + 1}/${uniqueAddresses.length}] Found: ${tokenInfo.token} (${tokenInfo.symbol})`);
                    
                    const swaps = await getAllTokenSwaps(address);
                    updateStatus(`[${i + 1}/${uniqueAddresses.length}] Retrieved ${swaps.length} total signals for ${tokenInfo.symbol}`);
                    
                    // Filter swaps by selected trigger modes
                    const filteredSwaps = filterSwapsByTriggerMode(swaps, selectedTriggerModes);
                    updateStatus(`[${i + 1}/${uniqueAddresses.length}] Filtered to ${filteredSwaps.length} signals matching selected trigger modes`);
                    
                    if (filteredSwaps.length === 0) {
                        updateStatus(`[${i + 1}/${uniqueAddresses.length}] ⚠️ No signals match selected trigger modes for ${tokenInfo.symbol}`, true);
                        continue;
                    }
                    
                    // Apply signals per token limit
                    const signalsPerToken = parseInt(document.getElementById('signals-per-token').value) || 3;
                    const limitedSwaps = filteredSwaps.slice(0, signalsPerToken);
                    
                    if (limitedSwaps.length < filteredSwaps.length) {
                        updateStatus(`[${i + 1}/${uniqueAddresses.length}] Limited to first ${limitedSwaps.length} signals (out of ${filteredSwaps.length} filtered)`);
                    }
                    
                    const processedData = processTokenData(tokenInfo, limitedSwaps);
                    
                    allTokenData.push({
                        processed: processedData,
                        swaps: limitedSwaps, // Use limited swaps instead of filtered swaps
                        contractAddress: address
                    });
                    
                } catch (error) {
                    updateStatus(`[${i + 1}/${uniqueAddresses.length}] ❌ Error with ${shortAddress}: ${error.message}`, true);
                    errors.push({
                        address: address,
                        error: error.message
                    });
                }
            }
            
            if (allTokenData.length === 0) {
                throw new Error('No valid token data could be extracted');
            }
            
            updateStatus(`✅ Batch extraction complete!`);
            updateStatus(`Successfully processed: ${allTokenData.length}/${uniqueAddresses.length} unique tokens`);
            
            if (errors.length > 0) {
                updateStatus(`⚠️ Failed: ${errors.length} tokens had errors`);
            }
            
            if (totalDuplicates > 0) {
                updateStatus(`📊 Data integrity: Each token counted once (${rawAddresses.length - uniqueAddresses.length - malformedAddresses.length} duplicates excluded)`);
            }
            
            if (malformedAddresses.length > 0) {
                updateStatus(`🛡️ Address validation: ${malformedAddresses.length} malformed addresses excluded`);
            }
            
            // Store data globally for copy functions
            window.extractedData = {
                tokens: allTokenData,
                errors: errors
            };
            
            // Show action buttons
            document.getElementById('action-buttons').style.display = 'block';
            
        } catch (error) {
            updateStatus(`Error: ${error.message}`, true);
            console.error('Extraction error:', error);
        }
    }

    // ========================================
    // 🎮 EVENT HANDLERS
    // ========================================
    function setupEventHandlers() {
        document.getElementById('extract-btn').addEventListener('click', async () => {
            const contractAddresses = document.getElementById('contract-input').value.trim();
            if (!contractAddresses) {
                updateStatus('Please enter at least one contract address', true);
                return;
            }
            
            // Clear previous results
            document.getElementById('action-buttons').style.display = 'none';
            document.getElementById('status-area').innerHTML = '';
            
            await extractTokenData(contractAddresses);
        });
        
        document.getElementById('copy-detailed-csv-btn').addEventListener('click', async () => {
            if (window.extractedData) {
                const removeHeaders = document.getElementById('remove-headers').checked;
                const csvOutput = generateCSVOutput(window.extractedData.tokens, removeHeaders);
                const success = await copyToClipboard(csvOutput);
                updateStatus(success ? `📊 Custom format TSV copied${removeHeaders ? ' (no headers)' : ' (with headers)'}! Paste into Google Sheets` : 'Failed to copy to clipboard', !success);
            }
        });
                
        document.getElementById('close-btn').addEventListener('click', () => {
            document.getElementById('signal-extractor-ui').remove();
        });
        
        // Allow Ctrl+Enter to trigger extraction (since Enter is used for new lines)
        document.getElementById('contract-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                document.getElementById('extract-btn').click();
            }
        });
    }

    // ========================================
    // 🎬 INITIALIZATION
    // ========================================
    console.log('🔧 Initializing Signal Extractor...');
    
    // Create and setup UI
    const ui = createUI();
    setupEventHandlers();
    
    updateStatus('Signal Extractor ready! Enter contract addresses (one per line) to begin.');
    
    console.log('✅ Signal Extractor initialized successfully!');
    console.log('📋 Enter contract addresses (one per line) and click "Extract Data" for batch analysis');
    console.log('🔧 Use Ctrl+Enter to start extraction from the text area');
    console.log('📊 Export formats optimized for Google Sheets: Custom TSV and Full Detailed TSV');
    
})();
