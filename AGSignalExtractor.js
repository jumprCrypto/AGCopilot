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

    // Format timestamp to readable date
    function formatTimestamp(timestamp) {
        if (!timestamp) return 'N/A';
        return new Date(timestamp * 1000).toISOString().replace('T', ' ').split('.')[0];
    }

    // Format market cap values
    function formatMcap(mcap) {
        if (!mcap) return 'N/A';
        if (mcap >= 1000000) return `$${(mcap / 1000000).toFixed(2)}M`;
        if (mcap >= 1000) return `$${(mcap / 1000).toFixed(2)}K`;
        return `$${mcap}`;
    }

    // Format percentage values
    function formatPercent(value) {
        if (value === null || value === undefined) return 'N/A';
        return `${value.toFixed(2)}%`;
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
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log(`✅ Successfully fetched data`);
                return data;
                
            } catch (error) {
                console.log(`❌ Attempt ${attempt} failed: ${error.message}`);
                
                if (attempt === maxRetries) {
                    throw new Error(`Failed to fetch after ${maxRetries} attempts: ${error.message}`);
                }
                
                await sleep(CONFIG.RETRY_DELAY * attempt);
            }
        }
    }

    // Get token info by search (contract address)
    async function getTokenInfo(contractAddress) {
        const url = `${CONFIG.API_BASE_URL}/swaps?search=${contractAddress}&sort=timestamp&direction=desc&page=1&limit=1`;
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

    function generateBatchSummary(allTokenData) {
        const summary = {
            totalTokens: allTokenData.length,
            totalSignals: allTokenData.reduce((sum, token) => sum + token.processed.totalSignals, 0),
            avgSignalsPerToken: 0,
            topPerformers: [],
            avgWinPred: 0,
            athMultipliers: []
        };
        
        if (allTokenData.length > 0) {
            summary.avgSignalsPerToken = (summary.totalSignals / allTokenData.length).toFixed(1);
            
            // Calculate average win prediction across all tokens
            const allWinPreds = allTokenData.map(token => {
                const avgWinPred = token.swaps.reduce((sum, swap) => sum + (swap.winPredPercent || 0), 0) / token.swaps.length;
                return avgWinPred;
            });
            summary.avgWinPred = (allWinPreds.reduce((sum, pred) => sum + pred, 0) / allWinPreds.length).toFixed(2);
            
            // Get top performers by ATH multiplier
            summary.topPerformers = allTokenData
                .map(token => ({
                    name: token.processed.tokenName,
                    symbol: token.processed.symbol,
                    athMultiplier: token.processed.athMultiplierRaw || 0,
                    athMultiplierText: token.processed.athMultiplier,
                    signals: token.processed.totalSignals
                }))
                .sort((a, b) => b.athMultiplier - a.athMultiplier)
                .slice(0, 5);
            
            // Extract ATH multipliers for statistics
            summary.athMultipliers = allTokenData
                .map(token => token.processed.athMultiplierRaw || 0)
                .filter(mult => mult > 0);
        }
        
        return summary;
    }

    function generateCSVOutput(allTokenData) {
        const csvLines = [];
        
        // Custom TSV Header matching your requested format
        csvLines.push([
            'Ticker',
            'CA',
            'MC',
            'Liquidity',
            'Liquidity Percentage',
            'Platform',
            'Wallet Stats',
            'Recent Swap',
            'Buy Ratio',
            'Vol2MC',
            'AG Score',
            'Bundle',
            'Drained%',
            'Deployer Balance',
            'Funding Address',
            'Deployer Age',
            'Description'
        ].join('\t'));
        
        // TSV Data rows with your custom format
        allTokenData.forEach(tokenData => {
            const processed = tokenData.processed;
            
            tokenData.swaps.forEach(swap => {
                // Format market cap - use signal MCAP for the row
                const mcFormatted = swap.signalMcap ? 
                    (swap.signalMcap >= 1000000 ? `$${(swap.signalMcap / 1000000).toFixed(2)}M` :
                     swap.signalMcap >= 1000 ? `$${(swap.signalMcap / 1000).toFixed(2)}K` :
                     `$${swap.signalMcap}`) : '';
                
                // Format liquidity
                const liquidityFormatted = swap.criteria?.liquidity ? 
                    (swap.criteria.liquidity >= 1000000 ? `$${(swap.criteria.liquidity / 1000000).toFixed(2)}M` :
                     swap.criteria.liquidity >= 1000 ? `$${(swap.criteria.liquidity / 1000).toFixed(2)}K` :
                     `$${swap.criteria.liquidity}`) : '';
                
                // Wallet stats (updated format: F: X KYC: Y Unq: Z SM: A)
                const walletStats = `F: ${swap.criteria?.uniqueCount || 0} KYC: ${swap.criteria?.kycCount || 0} Unq: ${swap.criteria?.uniqueCount || 0} SM: ${swap.criteria?.kycCount || 0}`;
                
                // Platform logic based on CA ending
                let platform = 'Unknown';
                if (processed.tokenAddress) {
                    const ca = processed.tokenAddress.toLowerCase();
                    if (ca.endsWith('pump')) {
                        platform = 'Pump';
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
                
                // Deployer age in readable format
                const deployerAge = swap.criteria?.deployerAge ? 
                    (swap.criteria.deployerAge >= 1440 ? `${(swap.criteria.deployerAge / 1440).toFixed(1)}d` :
                     swap.criteria.deployerAge >= 60 ? `${(swap.criteria.deployerAge / 60).toFixed(1)}h` :
                     `${swap.criteria.deployerAge}m`) : '';
                
                const row = [
                    processed.symbol || '',                                    // Ticker
                    processed.tokenAddress || '',                             // CA
                    mcFormatted,                                              // MC
                    liquidityFormatted,                                       // Liquidity
                    swap.criteria?.liquidityPct ? `${swap.criteria.liquidityPct.toFixed(1)}%` : '', // Liquidity Percentage
                    platform,                                                 // Platform (based on CA ending)
                    walletStats,                                              // Wallet Stats
                    recentSwap,                                               // Recent Swap
                    buyRatio,                                                 // Buy Ratio
                    vol2MC,                                                   // Vol2MC
                    swap.criteria?.agScore || '',                             // AG Score
                    bundlePercent,                                            // Bundle
                    drainedPercent,                                           // Drained%
                    swap.criteria?.deployerBalance || '',                     // Deployer Balance
                    '', // Funding Address (not available in current data)
                    deployerAge,                                              // Deployer Age
                    swap.criteria?.hasDescription ? 'Yes' : 'No'             // Description
                ];
                csvLines.push(row.join('\t'));
            });
        });
        
        return csvLines.join('\n');
    }

    // Generate original detailed TSV format (all columns)
    function generateDetailedTSV(allTokenData) {
        const csvLines = [];
        
        // Original detailed TSV Header
        csvLines.push([
            'Token_Name',
            'Symbol', 
            'Contract_Address',
            'Signal_ID',
            'Signal_Timestamp',
            'Signal_Date',
            'Signal_MCAP_USD',
            'Current_MCAP_USD', 
            'ATH_MCAP_USD',
            'ATH_Date',
            'ATL_MCAP_USD',
            'ATL_Date',
            'ATH_Multiplier',
            'Current_vs_ATH_Percent',
            'Trigger_Mode',
            'Win_Prediction_Percent',
            'Time_to_Complete_Seconds',
            'AG_Score',
            'Token_Age_Minutes',
            'Deployer_Age_Minutes',
            'Liquidity_USD',
            'Liquidity_Percent',
            'Unique_Wallets',
            'KYC_Wallets',
            'Bundled_Percent',
            'Buy_Volume_Percent',
            'Volume_vs_MCAP_Percent',
            'Drained_Percent',
            'Drained_Count',
            'Deployer_Balance_SOL',
            'Fresh_Deployer',
            'Has_Description',
            'Has_Socials',
            'Deployer_Funding_Win_Rate'
        ].join('\t'));
        
        // Original detailed TSV data rows
        allTokenData.forEach(tokenData => {
            const processed = tokenData.processed;
            
            tokenData.swaps.forEach(swap => {
                // Calculate ATH multiplier for this specific signal
                const athMultiplier = swap.athMcap && swap.signalMcap ? 
                    (swap.athMcap / swap.signalMcap).toFixed(2) : '';
                
                // Calculate current vs ATH percentage
                const currentVsAth = swap.athMcap && swap.currentMcap ? 
                    (((swap.currentMcap - swap.athMcap) / swap.athMcap) * 100).toFixed(2) : '';
                
                // Format dates for Google Sheets (YYYY-MM-DD HH:MM:SS)
                const signalDate = swap.timestamp ? 
                    new Date(swap.timestamp * 1000).toISOString().replace('T', ' ').slice(0, 19) : '';
                const athDate = swap.athTime ? 
                    new Date(swap.athTime * 1000).toISOString().replace('T', ' ').slice(0, 19) : '';
                const atlDate = swap.atlTime ? 
                    new Date(swap.atlTime * 1000).toISOString().replace('T', ' ').slice(0, 19) : '';
                
                const row = [
                    processed.tokenName.replace(/\t/g, ' '), // Replace tabs with spaces in token names
                    processed.symbol,
                    processed.tokenAddress,
                    swap.id || '',
                    swap.timestamp || '',
                    signalDate,
                    swap.signalMcap || '',
                    swap.currentMcap || '',
                    swap.athMcap || '',
                    athDate,
                    swap.atlMcap || '',
                    atlDate,
                    athMultiplier,
                    currentVsAth,
                    swap.triggerMode || '',
                    swap.winPredPercent || '',
                    swap.criteria?.ttc || '',
                    swap.criteria?.agScore || '',
                    swap.criteria?.tokenAge || '',
                    swap.criteria?.deployerAge || '',
                    swap.criteria?.liquidity || '',
                    swap.criteria?.liquidityPct || '',
                    swap.criteria?.uniqueCount || '',
                    swap.criteria?.kycCount || '',
                    swap.criteria?.bundledPct || '',
                    swap.criteria?.buyVolumePct || '',
                    swap.criteria?.volMcapPct || '',
                    swap.criteria?.drainedPct || '',
                    swap.criteria?.drainedCount || '',
                    swap.criteria?.deployerBalance || '',
                    swap.criteria?.freshDeployer ? 'TRUE' : 'FALSE', // Google Sheets boolean format
                    swap.criteria?.hasDescription ? 'TRUE' : 'FALSE',
                    swap.criteria?.hasSocials ? 'TRUE' : 'FALSE',
                    swap.criteria?.deployerFundingWinRate || ''
                ];
                csvLines.push(row.join('\t'));
            });
        });
        
        return csvLines.join('\n');
    }

    // Generate a summary CSV for overview analysis
    function generateSummaryCSV(allTokenData, errors) {
        const csvLines = [];
        
        // Summary TSV Header
        csvLines.push([
            'Token_Name',
            'Symbol',
            'Contract_Address',
            'Total_Signals',
            'First_Signal_Date',
            'Last_Signal_Date',
            'Current_MCAP_USD',
            'ATH_MCAP_USD',
            'Max_ATH_Multiplier',
            'Average_Win_Prediction',
            'Max_Win_Prediction',
            'Min_Win_Prediction',
            'Trigger_Modes_Used',
            'Status'
        ].join('\t'));
        
        // Summary data for each token
        allTokenData.forEach(tokenData => {
            const processed = tokenData.processed;
            
            // Calculate max ATH multiplier across all signals
            const maxAthMultiplier = Math.max(...tokenData.swaps.map(swap => {
                return swap.athMcap && swap.signalMcap ? (swap.athMcap / swap.signalMcap) : 0;
            })).toFixed(2);
            
            // Calculate average win prediction
            const avgWinPred = tokenData.swaps.length > 0 ? 
                (tokenData.swaps.reduce((sum, swap) => sum + (swap.winPredPercent || 0), 0) / tokenData.swaps.length).toFixed(2) : '';
            
            // Get min/max win predictions
            const winPreds = tokenData.swaps.map(swap => swap.winPredPercent || 0);
            const maxWinPred = Math.max(...winPreds).toFixed(2);
            const minWinPred = Math.min(...winPreds).toFixed(2);
            
            // Format dates
            const firstSignalDate = tokenData.swaps.length > 0 ? 
                new Date(tokenData.swaps[tokenData.swaps.length - 1].timestamp * 1000).toISOString().slice(0, 10) : '';
            const lastSignalDate = tokenData.swaps.length > 0 ? 
                new Date(tokenData.swaps[0].timestamp * 1000).toISOString().slice(0, 10) : '';
            
            const row = [
                processed.tokenName.replace(/\t/g, ' '), // Replace tabs with spaces in token names
                processed.symbol,
                processed.tokenAddress,
                processed.totalSignals,
                firstSignalDate,
                lastSignalDate,
                processed.currentMcapRaw || '',
                processed.athMcapRaw || '',
                maxAthMultiplier,
                avgWinPred,
                maxWinPred,
                minWinPred,
                processed.triggerModes,
                'Success'
            ];
            csvLines.push(row.join('\t'));
        });
        
        // Add error entries
        errors.forEach(error => {
            const shortAddr = error.address;
            const row = [
                '',
                '',
                shortAddr,
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                `Error: ${error.error}`
            ];
            csvLines.push(row.join('\t'));
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
            width: 350px;
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
            <div style="text-align: center; margin-bottom: 20px;">
                <h3 style="margin: 0; font-size: 18px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                    🔍 Signal Extractor
                </h3>
                <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.9;">
                    Optimized for Google Sheets import
                </p>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Contract Addresses:</label>
                <textarea id="contract-input" placeholder="Enter contract addresses (one per line)..." 
                       style="width: 100%; padding: 8px; border: none; border-radius: 5px; font-size: 14px; height: 80px; resize: vertical;">
                </textarea>
                <div style="font-size: 11px; opacity: 0.7; margin-top: 3px;">
                    💡 Enter one contract address per line for batch processing
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold;">Trigger Modes (select multiple):</label>
                <div style="background: rgba(0,0,0,0.2); border-radius: 5px; padding: 10px; max-height: 120px; overflow-y: auto;">
                    <label style="display: flex; align-items: center; margin-bottom: 5px; cursor: pointer;">
                        <input type="checkbox" id="trigger-empty" value="" checked style="margin-right: 8px;">
                        <span style="font-size: 12px;">Bullish Bonding</span>
                    </label>
                    <label style="display: flex; align-items: center; margin-bottom: 5px; cursor: pointer;">
                        <input type="checkbox" id="trigger-1" value="1" checked style="margin-right: 8px;">
                        <span style="font-size: 12px;">God Mode</span>
                    </label>
                    <label style="display: flex; align-items: center; margin-bottom: 5px; cursor: pointer;">
                        <input type="checkbox" id="trigger-3" value="3" checked style="margin-right: 8px;">
                        <span style="font-size: 12px;">Fomo</span>
                    </label>
                    <label style="display: flex; align-items: center; margin-bottom: 5px; cursor: pointer;">
                        <input type="checkbox" id="trigger-4" value="4" checked style="margin-right: 8px;">
                        <span style="font-size: 12px;">Launchpads</span>
                    </label>
                    <label style="display: flex; align-items: center; margin-bottom: 5px; cursor: pointer;">
                        <input type="checkbox" id="trigger-5" value="5" checked style="margin-right: 8px;">
                        <span style="font-size: 12px;">Smart Tracker</span>
                    </label>
                    <label style="display: flex; align-items: center; margin-bottom: 0; cursor: pointer;">
                        <input type="checkbox" id="trigger-6" value="6" checked style="margin-right: 8px;">
                        <span style="font-size: 12px;">Moon Finder</span>
                    </label>
                </div>
                <div style="font-size: 11px; opacity: 0.7; margin-top: 3px;">
                    📊 Only signals matching selected trigger modes will be extracted
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <button id="extract-btn" style="
                    width: 100%; 
                    padding: 12px; 
                    background: linear-gradient(45deg, #FF6B6B, #4ECDC4); 
                    border: none; 
                    border-radius: 8px; 
                    color: white; 
                    font-weight: bold; 
                    cursor: pointer;
                    font-size: 14px;
                    transition: transform 0.2s;
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    🚀 Extract Data
                </button>
            </div>
            
            <div id="status-area" style="
                background: rgba(0,0,0,0.2); 
                border-radius: 5px; 
                padding: 10px; 
                font-size: 12px; 
                min-height: 40px;
                max-height: 120px;
                overflow-y: auto;
            ">
                <div style="opacity: 0.8;">Ready to extract token data...</div>
            </div>
            
            <div id="action-buttons" style="margin-top: 15px; display: none;">
                <button id="copy-detailed-csv-btn" style="
                    width: 45%; 
                    padding: 10px; 
                    background: #28a745; 
                    border: none; 
                    border-radius: 5px; 
                    color: white; 
                    font-size: 12px; 
                    cursor: pointer;
                    margin-right: 4%;
                    font-weight: bold;
                ">
                    📊 Custom Format
                </button>
                <button id="copy-full-detailed-btn" style="
                    width: 45%; 
                    padding: 10px; 
                    background: #6f42c1; 
                    border: none; 
                    border-radius: 5px; 
                    color: white; 
                    font-size: 12px; 
                    cursor: pointer;
                    font-weight: bold;
                ">
                    📈 Full Detail
                </button>
                <div style="font-size: 10px; opacity: 0.8; margin-top: 8px; text-align: center;">
                    💡 Copy and paste tab-separated data into Google Sheets
                </div>
            </div>
            
            <div style="margin-top: 15px; text-align: center;">
                <button id="close-btn" style="
                    padding: 5px 15px; 
                    background: rgba(255,255,255,0.2); 
                    border: 1px solid rgba(255,255,255,0.3); 
                    border-radius: 15px; 
                    color: white; 
                    font-size: 11px; 
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
            
            // Parse and validate contract addresses
            const addresses = contractAddresses
                .split('\n')
                .map(addr => addr.trim())
                .filter(addr => addr.length > 0);
            
            if (addresses.length === 0) {
                throw new Error('Please enter at least one contract address');
            }
            
            // Validate each address
            const invalidAddresses = addresses.filter(addr => addr.length < 32);
            if (invalidAddresses.length > 0) {
                throw new Error(`Invalid contract addresses: ${invalidAddresses.slice(0, 3).join(', ')}${invalidAddresses.length > 3 ? '...' : ''}`);
            }
            
            updateStatus(`Processing ${addresses.length} contract address${addresses.length > 1 ? 'es' : ''}...`);
            
            const allTokenData = [];
            const errors = [];
            
            // Process each contract address
            for (let i = 0; i < addresses.length; i++) {
                const address = addresses[i];
                const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
                
                try {
                    updateStatus(`[${i + 1}/${addresses.length}] Fetching ${shortAddress}...`);
                    
                    const tokenInfo = await getTokenInfo(address);
                    updateStatus(`[${i + 1}/${addresses.length}] Found: ${tokenInfo.token} (${tokenInfo.symbol})`);
                    
                    const swaps = await getAllTokenSwaps(address);
                    updateStatus(`[${i + 1}/${addresses.length}] Retrieved ${swaps.length} total signals for ${tokenInfo.symbol}`);
                    
                    // Filter swaps by selected trigger modes
                    const filteredSwaps = filterSwapsByTriggerMode(swaps, selectedTriggerModes);
                    updateStatus(`[${i + 1}/${addresses.length}] Filtered to ${filteredSwaps.length} signals matching selected trigger modes`);
                    
                    if (filteredSwaps.length === 0) {
                        updateStatus(`[${i + 1}/${addresses.length}] ⚠️ No signals match selected trigger modes for ${tokenInfo.symbol}`, true);
                        continue;
                    }
                    
                    const processedData = processTokenData(tokenInfo, filteredSwaps);
                    
                    allTokenData.push({
                        processed: processedData,
                        swaps: filteredSwaps, // Use filtered swaps
                        contractAddress: address
                    });
                    
                } catch (error) {
                    updateStatus(`[${i + 1}/${addresses.length}] ❌ Error with ${shortAddress}: ${error.message}`, true);
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
            updateStatus(`Successfully processed: ${allTokenData.length}/${addresses.length} tokens`);
            
            if (errors.length > 0) {
                updateStatus(`⚠️ Failed: ${errors.length} tokens had errors`);
            }
            
            // Store data globally for copy functions
            window.extractedData = {
                tokens: allTokenData,
                errors: errors,
                summary: generateBatchSummary(allTokenData)
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
                const csvOutput = generateCSVOutput(window.extractedData.tokens);
                const success = await copyToClipboard(csvOutput);
                updateStatus(success ? '📊 Custom format TSV copied! Paste into Google Sheets' : 'Failed to copy to clipboard', !success);
            }
        });
        
        document.getElementById('copy-full-detailed-btn').addEventListener('click', async () => {
            if (window.extractedData) {
                const detailedOutput = generateDetailedTSV(window.extractedData.tokens);
                const success = await copyToClipboard(detailedOutput);
                updateStatus(success ? '📈 Full detailed TSV copied! Paste into Google Sheets' : 'Failed to copy to clipboard', !success);
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
    console.log('📊 Export formats optimized for Google Sheets: Detailed CSV (all signals) and Summary CSV (overview)');
    console.log('💡 Copy CSV data and paste directly into Google Sheets for instant analysis!');
    
})();
