(async function () {
    // ========================================
    // 🛡️ Double-initialization Guard
    // ========================================
    if (window.AG_COPILOT_ACTIVE) {
        console.log('[AGCopilot] Instance already active – skipping re‑init');
        return;
    }
    window.AG_COPILOT_ACTIVE = true;
    console.clear();
    console.log('%c🤖 AG Copilot v2.0 🤖', 'color: blue; font-size: 16px; font-weight: bold;');
    console.log('%c🔍 Direct API Optimization + Signal Analysis + Config Generation', 'color: green; font-size: 12px;');

    // ========================================
    // 🎯 CONFIGURATION
    // ========================================
    const CONFIG = {
        // Original AGCopilot Optimization Settings (no API needed)
        MAX_RUNTIME_MIN: 30,
        BACKTEST_WAIT: 20000, // Based on rate limit recovery test (20s)
        MIN_TOKENS: 50,
        TARGET_PNL: 100.0,
        
        // NEW: Chained runs settings
        CHAIN_RUN_COUNT: 3,
        
        // Feature flags (keeping all original features)
        USE_CONFIG_CACHING: true,
        USE_PARAMETER_IMPACT_ANALYSIS: true,
        USE_GENETIC_ALGORITHM: true,
        USE_SIMULATED_ANNEALING: true,
        USE_LATIN_HYPERCUBE_SAMPLING: true,
        USE_MULTIPLE_STARTING_POINTS: true,
        
        // Outlier-resistant scoring system
        USE_ROBUST_SCORING: true,  // Use outlier-resistant metrics instead of raw TP PnL %
        MIN_WIN_RATE: 50.0,        // Win rate for small samples (<500 tokens)
        MIN_WIN_RATE_MEDIUM_SAMPLE: 40.0, // Win rate for medium samples (500-999 tokens)
        MIN_WIN_RATE_LARGE_SAMPLE: 30.0,  // Win rate for large samples (1000+ tokens)
        MEDIUM_SAMPLE_THRESHOLD: 500,     // Token count threshold for medium sample tier
        LARGE_SAMPLE_THRESHOLD: 1000,     // Token count threshold for large sample tier
        RELIABILITY_WEIGHT: 0.3,   // Weight for sample size and consistency (0.0-1.0)
        CONSISTENCY_WEIGHT: 0.4,   // Weight for win rate (0.0-1.0)
        RETURN_WEIGHT: 0.6,        // Weight for raw PnL (0.0-1.0)
        // Note: CONSISTENCY_WEIGHT + RETURN_WEIGHT should = 1.0
        
        // Signal Analysis API Settings (from AGSignalExtractor)
        API_BASE_URL: 'https://backtester.alphagardeners.xyz/api',
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000,
        REQUEST_DELAY: 9360, // For signal analysis API (60% of BACKTEST_WAIT)
        
        // Backtester API Settings
        DEFAULT_BUYING_AMOUNT: 0.25, // Default buying amount for API calls
        
        // Take Profit (TP) configuration for accurate PnL calculations
        TP_CONFIGURATIONS: [
            { size: 20, gain: 300 },
            { size: 20, gain: 650 },
            { size: 20, gain: 1400 },
            { size: 20, gain: 3000 },
            { size: 20, gain: 10000 }
        ],
        
        // Rate limiting - ULTRA CONSERVATIVE MODE for 0-1 rate limit errors per session
        RATE_LIMIT_THRESHOLD: 20,    // Very conservative burst size (reduced from 35)
        RATE_LIMIT_RECOVERY: 10000,  // 10s recovery time (increased from 8.5s)
        RATE_LIMIT_SAFETY_MARGIN: 1.5, // 50% safety margin (increased from 10%)
        INTRA_BURST_DELAY: 100,      // 100ms delay between requests
        MAX_REQUESTS_PER_MINUTE: 50, // Conservative hard cap at 40 req/min (reduced from 60)
        USE_BURST_RATE_LIMITING: true, // Use burst mode for efficiency
        SMART_BURST_SIZE: true,        // Keep smart burst size learning for optimal discovery
        
        // Rate limiting modes
        RATE_LIMIT_MODE: 'normal', // 'normal' or 'slower'
        RATE_LIMIT_MODES: {
            normal: {
                BACKTEST_WAIT: 20000,        // 20s
                RATE_LIMIT_THRESHOLD: 20,    // 20 calls/burst
                RATE_LIMIT_RECOVERY: 10000,  // 10s recovery
                REQUEST_DELAY: 9360,         // 9.36s for signal analysis
                INTRA_BURST_DELAY: 100       // 100ms
            },
            slower: {
                BACKTEST_WAIT: 30000,        // 30s (50% slower)
                RATE_LIMIT_THRESHOLD: 15,    // 15 calls/burst (25% fewer)
                RATE_LIMIT_RECOVERY: 15000,  // 15s recovery (50% slower)
                REQUEST_DELAY: 14000,        // 14s for signal analysis (50% slower)
                INTRA_BURST_DELAY: 150       // 150ms (50% slower)
            }
        }
    };

    // Parameter validation rules (same as original AGCopilot)
    const PARAM_RULES = {
        // Basic
        'Min MCAP (USD)': { min: 0, max: 10000, step: 1000, type: 'integer'},
        'Max MCAP (USD)': { min: 10000, max: 60000, step: 1000, type: 'integer' },

        // Token Details
        'Min Deployer Age (min)': { min: 0, max: 1440, step: 5, type: 'integer' },
        'Min Token Age (sec)': { min: 0, max: 99999, step: 15, type: 'integer' },
        'Max Token Age (sec)': { min: 0, max: 99999, step: 15, type: 'integer' },
        'Min AG Score': { min: 0, max: 10, step: 1, type: 'integer' },

        // Wallets
        'Min Unique Wallets': { min: 0, max: 200, step: 5, type: 'integer' },
        'Max Unique Wallets': { min: 0, max: 200, step: 5, type: 'integer' },
        'Min KYC Wallets': { min: 0, max: 50, step: 1, type: 'integer' },
        'Max KYC Wallets': { min: 0, max: 50, step: 1, type: 'integer' },
        'Min Holders': { min: 0, max: 5000, step: 50, type: 'integer' },
        'Max Holders': { min: 0, max: 5000, step: 50, type: 'integer' },

        // Liquidity
        'Min Liquidity (USD)': { min: 0, max: 500000, step: 1000, type: 'integer' },
        'Max Liquidity (USD)': { min: 0, max: 500000, step: 1000, type: 'integer' },
        'Max Liquidity %': { min: 0, max: 100, step: 1, type: 'integer' },

        // Trading
        'Min Buy Ratio %': { min: 0, max: 100, step: 1, type: 'integer' },
        'Max Buy Ratio %': { min: 0, max: 100, step: 1, type: 'integer' },
        'Min Vol MCAP %': { min: 0, max: 500, step: 5, type: 'integer' },
        'Max Vol MCAP %': { min: 0, max: 500, step: 5, type: 'integer' },

        // Risk
        'Min Bundled %': { min: 0, max: 100, step: 1, type: 'integer' },
        'Max Bundled %': { min: 0, max: 100, step: 1, type: 'integer' },
        'Max Drained %': { min: 0, max: 100, step: 1, type: 'integer' },
        'Min Deployer Balance (SOL)': { min: 0, max: 10000, step: 1, type: 'float' },
        'Fresh Deployer': { type: 'boolean' },
        'Description': { type: 'boolean' },

        // Advanced
        'Min TTC (sec)': { min: 0, max: 200000, step: 30, type: 'integer' },
        'Max TTC (sec)': { min: 0, max: 200000, step: 30, type: 'integer' },
        'Min Win Pred %': { min: 0, max: 100, step: 1, type: 'integer' }
    };

    // ========================================
    // 🔗 Helper Aliases (bridge legacy direct calls → modular utils)
    // ========================================
    const utilsNS = window.AG?.utils;
    if (utilsNS) {
        // Only define if not already present globally
        if (typeof formatTimestamp === 'undefined' && typeof utilsNS.formatTimestamp === 'function') {
            window.formatTimestamp = utilsNS.formatTimestamp;
        }
        if (typeof formatMcap === 'undefined' && typeof utilsNS.formatMcap === 'function') {
            window.formatMcap = utilsNS.formatMcap;
        }
        if (typeof formatPercent === 'undefined' && typeof utilsNS.formatPercent === 'function') {
            window.formatPercent = utilsNS.formatPercent;
        }
        if (typeof deepClone === 'undefined' && typeof utilsNS.deepClone === 'function') {
            window.deepClone = utilsNS.deepClone;
        }
        if (typeof sleep === 'undefined' && typeof utilsNS.sleep === 'function') {
            window.sleep = utilsNS.sleep;
        }
    }

    // ========================================
    // 📊 UI METRICS EXTRACTOR (Enhanced from original AGCopilot)
    // ========================================
    async function extractMetricsFromUI() {
        try {
            const metrics = {};
            const statDivs = Array.from(document.querySelectorAll('div.text-xl.font-bold'));

            for (const div of statDivs) {
                const label = div.parentElement.querySelector('div.text-xs.text-gray-400');
                if (label) {
                    const labelText = label.textContent.trim().toLowerCase();
                    const value = div.textContent.trim();

                    switch (labelText) {
                        case 'tokens matched':
                            const tokenMatch = value.match(/(\d{1,3}(?:,\d{3})*)/);
                            if (tokenMatch) {
                                metrics.totalTokens = parseInt(tokenMatch[1].replace(/,/g, ''));
                            }
                            break;
                        case 'tp pnl %':
                            const tpPnlMatch = value.match(/([+-]?\d+(?:\.\d+)?)%/);
                            if (tpPnlMatch) {
                                metrics.tpPnlPercent = parseFloat(tpPnlMatch[1]);
                            }
                            break;
                        case 'tp pnl (sol)':
                            const tpPnlSolMatch = value.match(/([+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?)/);
                            if (tpPnlSolMatch) {
                                metrics.tpPnlSOL = parseFloat(tpPnlSolMatch[1].replace(/,/g, ''));
                            }
                            break;
                        case 'signal ath pnl %':
                        case 'ath pnl %':
                            const athPnlMatch = value.match(/([+-]?\d+(?:\.\d+)?)%/);
                            if (athPnlMatch) {
                                metrics.athPnlPercent = parseFloat(athPnlMatch[1]);
                            }
                            break;
                        case 'total sol spent':
                            const spentMatch = value.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/);
                            if (spentMatch) {
                                metrics.totalSpent = parseFloat(spentMatch[1].replace(/,/g, ''));
                            }
                            break;
                        case 'win rate (≥2x)':
                            const winRateMatch = value.match(/(\d+(?:\.\d+)?)%/);
                            if (winRateMatch) {
                                metrics.winRate = parseFloat(winRateMatch[1]);
                            }
                            break;
                    }
                }
            }

            // Validate required metrics
            if (metrics.tpPnlPercent === undefined || metrics.totalTokens === undefined) {
                console.warn('⚠️ Missing required metrics in UI extraction');
                return null;
            }

            return metrics;
        } catch (error) {
            console.warn('❌ Failed to extract metrics from UI:', error);
            return null;
        }
    }

    // ========================================
    // 📊 ROBUST SCORING SYSTEM (Outlier-Resistant)
    // ========================================
    function calculateRobustScore(metrics) {
        if (window.AG?.scoring?.calculateRobustScore) {
            return window.AG.scoring.calculateRobustScore(metrics);
        }
        console.warn('[Shim] calculateRobustScore: modular scoring not loaded yet');
        return null;
    }

    // Clean and validate configuration values before API calls
    function cleanConfiguration(config) {
        const cleanedConfig = deepClone(config);
        
        // Recursively clean all values in the configuration
        function cleanValue(obj) {
            if (typeof obj === 'object' && obj !== null) {
                for (const [key, value] of Object.entries(obj)) {
                    if (typeof value === 'object' && value !== null) {
                        cleanValue(value); // Recurse into nested objects
                    } else {
                        // Clean individual values
                        if (value === null || value === undefined || value === '') {
                            delete obj[key]; // Remove empty values
                        } else if (typeof value === 'string') {
                            // Handle string representations of numbers
                            const numValue = parseFloat(value);
                            if (!isNaN(numValue) && isFinite(numValue)) {
                                // Special handling for AG Score
                                if (key === 'Min AG Score') {
                                    const agScore = Math.round(numValue);
                                    obj[key] = Math.max(0, Math.min(10, agScore)); // Clamp to 0-10
                                } else {
                                    obj[key] = numValue; // Convert valid numeric strings to numbers
                                }
                            } else if (value === 'NaN' || value === 'undefined' || value === 'null') {
                                delete obj[key]; // Remove invalid string values
                            }
                        } else if (typeof value === 'number') {
                            // Handle numeric values
                            if (isNaN(value) || !isFinite(value)) {
                                delete obj[key]; // Remove NaN or infinite numbers
                            } else if (key === 'Min AG Score') {
                                const agScore = Math.round(value);
                                obj[key] = Math.max(0, Math.min(10, agScore)); // Clamp AG Score to 0-10
                            }
                        }
                    }
                }
            }
        }
        
        cleanValue(cleanedConfig);
        return cleanedConfig;
    }

    // ========================================
    // 🔌 Backtester API Shim (instantiated early for legacy calls)
    // ========================================
    let backtesterAPI = null;
    function getBacktesterAPI() {
        if (window.AG?.api?.BacktesterAPI) {
            if (!backtesterAPI || !(backtesterAPI instanceof window.AG.api.BacktesterAPI)) {
                backtesterAPI = new window.AG.api.BacktesterAPI();
            }
        } else if (!backtesterAPI) {
            // Lightweight temporary shim to prevent crashes before module loads
            backtesterAPI = {
                async fetchResults() {
                    console.warn('[Shim] BacktesterAPI not yet loaded – returning placeholder result');
                    return { success: false, error: 'BacktesterAPI module not loaded', placeholder: true };
                }
            };
        }
        return backtesterAPI;
    }

    // Test configuration via API call (New: Direct API instead of UI scraping)
    async function testConfigurationAPI(config, testName = 'API Test') {
        try {
            console.log(`🧪 Testing via API: ${testName}`);
            
            // Clean the configuration before testing
            const cleanedConfig = cleanConfiguration(config);
            
            // Use the new API to get results directly
            const result = await getBacktesterAPI().fetchResults(cleanedConfig);
            
            if (!result.success) {
                console.warn(`❌ ${testName} failed: ${result.error}`);
                return result;
            }
            
            const metrics = result.metrics;
            
            // Validate metrics before proceeding
            if (!metrics) {
                console.warn(`❌ ${testName}: No metrics returned from API`);
                return {
                    success: false,
                    error: 'No metrics returned from API'
                };
            }
            
            if (metrics.tpPnlPercent === undefined || metrics.totalTokens === undefined) {
                console.warn(`❌ ${testName}: Invalid metrics structure:`, {
                    tpPnlPercent: metrics.tpPnlPercent,
                    totalTokens: metrics.totalTokens,
                    allKeys: Object.keys(metrics)
                });
                return {
                    success: false,
                    error: `Invalid metrics: missing tpPnlPercent (${metrics.tpPnlPercent}) or totalTokens (${metrics.totalTokens})`
                };
            }
            
            // Calculate robust score for logging
            const robustScoring = calculateRobustScore(metrics);
            if (robustScoring && CONFIG.USE_ROBUST_SCORING) {
                if (robustScoring.rejected) {
                    console.log(`❌ ${testName}: REJECTED - ${robustScoring.rejectionReason} | Raw TP PnL: ${metrics.tpPnlPercent?.toFixed(1)}%`);
                } else {
                    console.log(`✅ ${testName}: ${metrics?.totalTokens || 0} tokens | Robust Score: ${robustScoring.score.toFixed(1)} | Raw TP PnL: ${metrics.tpPnlPercent?.toFixed(1)}% | Win Rate: ${metrics.winRate?.toFixed(1)}%`);
                }
            } else {
                console.log(`✅ ${testName}: ${metrics?.totalTokens || 0} tokens, TP PnL: ${metrics.tpPnlPercent?.toFixed(1)}%, ATH PnL: ${metrics.athPnlPercent?.toFixed(1)}%, Win Rate: ${metrics.winRate?.toFixed(1)}%`);
            }

            return {
                success: true,
                metrics,
                source: 'API'
            };
            
        } catch (error) {
            console.warn(`❌ ${testName} failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
    

    // ========================================
    // � SIGNAL PROCESSING & CONFIG GENERATION (from AGSignalExtractor)
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

    // Outlier filtering functions
    function removeOutliers(values, method = 'none') {
        if (window.AG?.signals?.removeOutliers) {
            return window.AG.signals.removeOutliers(values, method);
        }
        // Minimal fallback (no heavy logic) while modular code loads
        return Array.isArray(values) ? values.filter(v => v !== null && v !== undefined && !isNaN(v)) : values;
    }

    // ========================================
    // 🎯 SIGNAL CLUSTERING FUNCTIONS
    // ========================================
    
    // Get all numeric parameters that are present in the backtester
    function getClusteringParameters() {
        return [
            'signalMcap', 'agScore', 'tokenAge', 'deployerAge', 'deployerBalance',
            'uniqueCount', 'kycCount', 'liquidity', 'liquidityPct', 'buyVolumePct',
            'bundledPct', 'drainedPct', 'volMcapPct', 'winPredPercent', 'ttc'
        ];
    }
    
    // Normalize signal parameters to 0-1 scale for distance calculation
    function normalizeSignals(signals) {
        const parameters = getClusteringParameters();
        const normalizedSignals = [];
        const ranges = {};
        
        // Calculate min/max for each parameter
        parameters.forEach(param => {
            const values = signals.map(s => s[param]).filter(v => v !== null && v !== undefined && !isNaN(v));
            if (values.length > 0) {
                ranges[param] = {
                    min: Math.min(...values),
                    max: Math.max(...values),
                    range: Math.max(...values) - Math.min(...values)
                };
            }
        });
        
        // Normalize each signal
        signals.forEach(signal => {
            const normalized = { ...signal };
            parameters.forEach(param => {
                if (ranges[param] && signal[param] !== null && signal[param] !== undefined && !isNaN(signal[param])) {
                    if (ranges[param].range > 0) {
                        normalized[param] = (signal[param] - ranges[param].min) / ranges[param].range;
                    } else {
                        normalized[param] = 0; // All values are the same
                    }
                } else {
                    normalized[param] = 0; // Missing values default to 0
                }
            });
            normalizedSignals.push(normalized);
        });
        
        return { normalizedSignals, ranges };
    }
    
    // Calculate Euclidean distance between two normalized signals
    function calculateSignalDistance(signal1, signal2) {
        const parameters = getClusteringParameters();
        let sumSquaredDiffs = 0;
        let validParams = 0;
        
        parameters.forEach(param => {
            const val1 = signal1[param];
            const val2 = signal2[param];
            
            if (val1 !== null && val1 !== undefined && !isNaN(val1) &&
                val2 !== null && val2 !== undefined && !isNaN(val2)) {
                sumSquaredDiffs += Math.pow(val1 - val2, 2);
                validParams++;
            }
        });
        
        if (validParams === 0) return Infinity;
        return Math.sqrt(sumSquaredDiffs);
    }
    
    // Find clusters using distance threshold approach
    function findSignalClusters(signals, tokenData, minClusterTokens) {
        if (window.AG?.signals?.findSignalClusters) {
            return window.AG.signals.findSignalClusters(signals, tokenData, minClusterTokens);
        }
        console.warn('[Shim] findSignalClusters fallback – returning empty list until modular signals module loads');
        return [];
    }

    // Analyze all signals to find optimal parameter bounds
    function analyzeSignalCriteria(allTokenData, bufferPercent = 10, outlierMethod = 'none', useClustering = true) {
        if (window.AG?.signals?.analyzeSignalCriteria) {
            return window.AG.signals.analyzeSignalCriteria(allTokenData, bufferPercent, outlierMethod, useClustering);
        }
        console.warn('[Shim] analyzeSignalCriteria fallback – returning minimal placeholder until modular signals module loads');
        return { type: 'standard', analysis: { totalSignals: 0, bufferPercent, outlierMethod }, usedClustering: false };
    }
    
    function generateTightestConfig(analysis) {
        if (window.AG?.signals?.generateTightestConfig) {
            return window.AG.signals.generateTightestConfig(analysis);
        }
        console.warn('[Shim] generateTightestConfig fallback – returning metadata-only config until modular signals module loads');
        return { metadata: { generatedAt: new Date().toISOString(), fallback: true } };
    }
    

    // Format config for display or copying (adapted for flat structure)
    function formatConfigForDisplay(config) {
        if (window.AG?.ui?.formatConfigForDisplay) {
            return window.AG.ui.formatConfigForDisplay(config);
        }
        console.warn('[Shim] formatConfigForDisplay fallback – minimal output until modular UI module loads');
        return JSON.stringify(config, null, 2);
    }

    // ========================================
    // 💾 CONFIG CACHE (keeping original implementation)
    // ========================================
    class ConfigCache {
        constructor(maxSize = 1000) {
            this.cache = new Map();
            this.maxSize = maxSize;
            this.accessOrder = [];
        }

        generateKey(config) {
            // Create a deterministic string representation by sorting all keys recursively (like original AGCopilot)
            const sortedConfig = this.sortObjectRecursively(config);
            return JSON.stringify(sortedConfig);
        }
        
        sortObjectRecursively(obj) {
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }
            
            if (Array.isArray(obj)) {
                return obj.map(item => this.sortObjectRecursively(item));
            }
            
            const sortedKeys = Object.keys(obj).sort();
            const result = {};
            
            for (const key of sortedKeys) {
                result[key] = this.sortObjectRecursively(obj[key]);
            }
            
            return result;
        }

        has(config) {
            return this.cache.has(this.generateKey(config));
        }

        get(config) {
            const key = this.generateKey(config);
            if (this.cache.has(key)) {
                // Update access order for LRU
                const index = this.accessOrder.indexOf(key);
                if (index > -1) {
                    this.accessOrder.splice(index, 1);
                }
                this.accessOrder.push(key);
                return this.cache.get(key);
            }
            return null;
        }

        set(config, result) {
            const key = this.generateKey(config);
            
            // Remove oldest if at capacity
            if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
                const oldest = this.accessOrder.shift();
                this.cache.delete(oldest);
            }
            
            this.cache.set(key, result);
            
            // Update access order
            const index = this.accessOrder.indexOf(key);
            if (index > -1) {
                this.accessOrder.splice(index, 1);
            }
            this.accessOrder.push(key);
        }

        clear() {
            this.cache.clear();
            this.accessOrder = [];
        }

        size() {
            return this.cache.size;
        }
    }

    // ========================================
    // 🧬 Optimizer References (pruned legacy class bodies)
    // ========================================
    const LatinHypercubeSampler = window.AG?.optimizer?.LatinHypercubeSampler;
    const SimulatedAnnealing = window.AG?.optimizer?.SimulatedAnnealing;
    const EnhancedOptimizer = window.AG?.optimizer?.EnhancedOptimizer;
    const ChainedOptimizer = window.AG?.optimizer?.ChainedOptimizer;
    if (!window.AG?.optimizer) {
        console.warn('[AGCopilot][Shim] Optimizer module not yet loaded – optimizer features deferred.');
    }

    // Simple connectivity test (no longer needed)
    async function testConnectivity() {
        // Just test that we can interact with the UI
        try {
            const testConfig = {
                basic: { "Min MCAP (USD)": 5000 }
            };
            
            return {
                success: true,
                message: 'UI interaction ready'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Function to read current field value from the UI
    function getFieldValue(labelText) {
        try {
            // Find the label using the same approach as setFieldValue
            const labels = Array.from(document.querySelectorAll('.sidebar-label'));
            const label = labels.find(el => el.textContent.trim() === labelText);

            if (!label) {
                return undefined;
            }

            let container = label.closest('.form-group') || label.parentElement;

            // Navigate up the DOM tree to find the input container
            if (!container.querySelector('input[type="number"]') && !container.querySelector('select')) {
                container = container.parentElement;
                if (!container.querySelector('input[type="number"]') && !container.querySelector('select')) {
                    container = container.parentElement;
                }
            }

            // Handle number inputs
            const input = container.querySelector('input[type="number"]');
            if (input) {
                const value = input.value.trim();
                if (value === '' || value === null) {
                    return undefined;
                }
                return parseFloat(value);
            }

            // Handle select dropdowns
            const select = container.querySelector('select');
            if (select) {
                const value = select.value;
                if (value === '' || select.selectedIndex === 0) {
                    return undefined;
                }
                return value;
            }

            // Handle toggle buttons
            const button = container.querySelector('button');
            if (button && (labelText === "Description" || labelText === "Fresh Deployer")) {
                const currentValue = button.textContent.trim();
                // Preserve all toggle states including "Don't care"
                if (currentValue === "Don't care") {
                    return null; // null represents "Don't care" state
                }
                if (currentValue === "Yes") {
                    return true;
                }
                if (currentValue === "No") {
                    return false;
                }
                return currentValue; // Fallback for any other text
            }

            return undefined;
        } catch (error) {
            console.warn(`Error reading field ${labelText}:`, error.message);
            return undefined;
        }
    }

    // Function to read current configuration from the UI
    async function getCurrentConfigFromUI() {
        console.log('📖 Reading current configuration from UI...');
        
        const config = {
            basic: {},
            tokenDetails: {},
            wallets: {},
            risk: {},
            advanced: {}
        };

        // Define the section mapping and parameters for each section
        const sections = {
            basic: {
                sectionTitle: 'Basic',
                params: ['Min MCAP (USD)', 'Max MCAP (USD)']
            },
            tokenDetails: {
                sectionTitle: 'Token Details',
                params: ['Min AG Score', 'Min Token Age (sec)', 'Max Token Age (sec)', 'Min Deployer Age (min)']
            },
            wallets: {
                sectionTitle: 'Wallets',
                params: ['Min Unique Wallets', 'Max Unique Wallets', 'Min KYC Wallets', 'Max KYC Wallets', 'Min Holders', 'Max Holders']
            },
            risk: {
                sectionTitle: 'Risk',
                params: ['Min Bundled %', 'Max Bundled %', 'Min Deployer Balance (SOL)', 'Min Buy Ratio %', 'Max Buy Ratio %', 'Min Vol MCAP %', 'Max Vol MCAP %', 'Max Drained %', 'Max Drained Count', 'Description', 'Fresh Deployer']
            },
            advanced: {
                sectionTitle: 'Advanced',
                params: ['Min TTC (sec)', 'Max TTC (sec)', 'Max Liquidity %', 'Min Win Pred %']
            }
        };

        let fieldsRead = 0;
        let fieldsWithValues = 0;

        // Read each section
        for (const [sectionKey, sectionInfo] of Object.entries(sections)) {
            console.log(`📖 Reading section: ${sectionInfo.sectionTitle}`);
            
            // Open the section first
            const sectionOpened = await openSection(sectionInfo.sectionTitle);
            if (!sectionOpened) {
                console.warn(`⚠️ Could not open section: ${sectionInfo.sectionTitle}`);
                continue;
            }
            
            // Wait for section to fully open
            await sleep(300);
            
            // Read each parameter in the section
            for (const param of sectionInfo.params) {
                fieldsRead++;
                const value = getFieldValue(param);
                config[sectionKey][param] = value;
                
                if (value !== undefined) {
                    fieldsWithValues++;
                } 
                
                // Small delay between field reads
                await sleep(50);
            }
            
            // Delay between sections
            await sleep(200);
        }

        // Read date range fields
        const dateRange = getDateRange();
        if (dateRange.fromDate || dateRange.toDate) {
            config.dateRange = {};
            if (dateRange.fromDate) config.dateRange.fromDate = dateRange.fromDate;
            if (dateRange.toDate) config.dateRange.toDate = dateRange.toDate;
        }

        console.log(`📖 Read ${fieldsRead} fields from UI, ${fieldsWithValues} have values set`);
        return config;
    }
    
    // UI interaction functions to apply configs to the backtester form (based on original AGCopilot)
    async function setFieldValue(labelText, value, maxRetries = 2) {
        const shouldClear = (value === undefined || value === null || value === "" || value === "clear");

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Find the label using the original AGCopilot approach
                const labels = Array.from(document.querySelectorAll('.sidebar-label'));
                const label = labels.find(el => el.textContent.trim() === labelText);

                if (!label) {
                    console.warn(`Label not found: ${labelText}`);
                    return false;
                }

                let container = label.closest('.form-group') || label.parentElement;

                // Handle toggle buttons FIRST (Description and Fresh Deployer) before DOM navigation
                if (labelText === "Description" || labelText === "Fresh Deployer") {
                    // Look for toggle button specifically in the label's immediate area
                    let toggleButton = container.querySelector('button');
                    
                    // If not found, try searching in parent containers but only for toggle buttons
                    if (!toggleButton) {
                        let searchContainer = container.parentElement;
                        let searchDepth = 0;
                        while (searchContainer && searchDepth < 3) {
                            toggleButton = searchContainer.querySelector('button');
                            // Ensure we found a toggle button and not a clear button (×)
                            if (toggleButton && toggleButton.textContent.trim() !== '×') {
                                break;
                            }
                            toggleButton = null;
                            searchContainer = searchContainer.parentElement;
                            searchDepth++;
                        }
                    }
                    
                    if (toggleButton && toggleButton.textContent.trim() !== '×') {
                        const targetValue = value || "Don't care";
                        const currentValue = toggleButton.textContent.trim();
                        
                        if (currentValue !== targetValue) {
                            toggleButton.click();
                            await sleep(100);

                            const newValue = toggleButton.textContent.trim();
                            if (newValue !== targetValue && newValue !== currentValue) {
                                toggleButton.click();
                                await sleep(100);
                            }
                        }
                        return true;
                    } else {
                        console.warn(`Toggle button not found for ${labelText}`);
                        return false; // Early return to prevent fallthrough to number input logic
                    }
                }

                // Navigate up the DOM tree to find the input container (only for non-toggle fields)
                if (!container.querySelector('input[type="number"]') && !container.querySelector('select')) {
                    container = container.parentElement;
                    if (!container.querySelector('input[type="number"]') && !container.querySelector('select')) {
                        container = container.parentElement;
                    }
                }

                // Handle number inputs
                const input = container.querySelector('input[type="number"]');
                if (input) {
                    if (shouldClear) {
                        // Look for clear button (×)
                        const relativeContainer = input.closest('.relative');
                        const clearButton = relativeContainer?.querySelector('button');
                        if (clearButton && clearButton.textContent.trim() === '×') {
                            clearButton.click();
                            await sleep(100);
                        } else {
                            // Manual clear
                            input.focus();
                            input.value = '';
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                            input.blur();
                        }
                    } else {
                        let processedValue = value;

                        // Type conversion
                        if (typeof value === 'string' && value.trim() !== '') {
                            const parsed = parseFloat(value);
                            if (!isNaN(parsed)) {
                                processedValue = parsed;
                            }
                        }

                        // Force integer rounding for specific parameters
                        if (labelText.includes('Wallets') || labelText.includes('Count') || labelText.includes('Age') || labelText.includes('Score')) {
                            processedValue = Math.round(processedValue);
                        }

                        if ((typeof processedValue === 'number' && !isNaN(processedValue)) ||
                            (typeof processedValue === 'string' && processedValue.trim() !== '')) {
                            
                            input.focus();
                            
                            // Use React-compatible value setting
                            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                            nativeInputValueSetter.call(input, processedValue);

                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                            input.blur();
                        }
                    }
                    return true;
                }

                // Handle select dropdowns
                const select = container.querySelector('select');
                if (select) {
                    if (shouldClear) {
                        select.selectedIndex = 0;
                    } else {
                        select.value = value;
                    }
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    return true;
                }

                await sleep(200); // Wait before retry
                
            } catch (error) {
                console.warn(`Attempt ${attempt} failed for ${labelText}:`, error.message);
                if (attempt < maxRetries) {
                    await sleep(200);
                }
            }
        }
        return false;
    }

    // Open section helper
    async function openSection(sectionTitle) {
        const allHeaders = Array.from(document.querySelectorAll('button[type="button"]'));
        const sectionHeader = allHeaders.find(header =>
            header.textContent.includes(sectionTitle)
        );

        if (sectionHeader) {
            sectionHeader.click();
            await sleep(200); // Wait for section to open
            return true;
        }
        return false;
    }

    // Apply configuration to the backtester UI (based on original AGCopilot)
    async function applyConfigToUI(config, skipStopCheck = false) {
        if (!config) {
            updateStatus('❌ No configuration to apply', true);
            return false;
        }

        updateStatus('⚙️ Applying configuration to backtester UI...');
        
        const sectionMap = {
            basic: 'Basic',
            tokenDetails: 'Token Details',
            wallets: 'Wallets',
            risk: 'Risk',
            advanced: 'Advanced'
        };

        let successCount = 0;
        let totalFields = 0;

        try {
            // Apply each section of the configuration
            for (const [section, sectionConfig] of Object.entries(config)) {
                // Only check stop flag if we're in optimization mode (not manual apply)
                if (!skipStopCheck && window.STOPPED) {
                    console.log('⏹️ Optimization stopped during config application');
                    return false;
                }
                
                if (sectionConfig && typeof sectionConfig === 'object') {
                    const sectionName = sectionMap[section];
                    
                    // Open the section first
                    if (sectionName) {
                        await openSection(sectionName);
                        await sleep(300); // Wait for section to fully open
                    }

                    // Apply each field in the section
                    for (const [param, value] of Object.entries(sectionConfig)) {
                        if (!skipStopCheck && window.STOPPED) {
                            console.log('⏹️ Optimization stopped during field application');
                            return false;
                        }
                        
                        // Apply ALL fields, including undefined ones (for clearing)
                        totalFields++;
                        const success = await setFieldValue(param, value);
                        if (success) {
                            successCount++;
                        } 
                        
                        // Delay between field updates to avoid issues
                        await sleep(150);
                    }
                    
                    // Delay between sections
                    await sleep(200);
                }
            }

            // Handle date range fields separately (they're not in the standard sections)
            if (config.dateRange) {
                if (config.dateRange.fromDate) {
                    const fromDateElement = document.getElementById('from-date');
                    if (fromDateElement) {
                        fromDateElement.value = config.dateRange.fromDate;
                        totalFields++;
                        successCount++;
                    }
                }
                if (config.dateRange.toDate) {
                    const toDateElement = document.getElementById('to-date');
                    if (toDateElement) {
                        toDateElement.value = config.dateRange.toDate;
                        totalFields++;
                        successCount++;
                    }
                }
            } else {
                // Clear date fields if no dateRange is specified in config
                const fromDateElement = document.getElementById('from-date');
                const toDateElement = document.getElementById('to-date');
                if (fromDateElement) {
                    fromDateElement.value = '';
                    totalFields++;
                    successCount++;
                }
                if (toDateElement) {
                    toDateElement.value = '';
                    totalFields++;
                    successCount++;
                }
            }

            const successRate = totalFields > 0 ? (successCount / totalFields * 100) : 0;
            updateStatus(`⚙️ Applied ${successCount}/${totalFields} fields (${successRate.toFixed(1)}% success rate)`);
            
            if (successRate > 70) {
                updateStatus('✅ Configuration successfully applied to UI!');
                return true;
            } else {
                updateStatus('⚠️ Configuration partially applied - some fields may not have been found', true);
                return false;
            }

        } catch (error) {
            updateStatus(`❌ Error applying configuration: ${error.message}`, true);
            return false;
        }
    }
    
    // Apply preset configuration
    async function applyPreset(presetName) {
        const preset = PRESETS[presetName];
        if (!preset) {
            updateStatus(`❌ Preset '${presetName}' not found`, true);
            return;
        }

        updateStatus(`📦 Applying preset: ${presetName}...`);
        const completePreset = ensureCompleteConfig(preset);
        const success = await applyConfigToUI(completePreset, true); // Skip stop check for manual preset application
        
        if (success) {
            updateStatus(`✅ Preset ${presetName} applied to UI successfully!`);
            // Test it to show the results
            updateStatus('📊 Testing preset configuration...');
            const result = await testConfigurationAPI(preset, `Preset: ${presetName}`);
            if (result.success) {
                updateStatus(`📊 Preset results: ${result.metrics.totalTokens} tokens, ${result.metrics.tpPnlPercent?.toFixed(1)}% TP PnL`);
            }
        } else {
            updateStatus(`❌ Failed to apply preset ${presetName} to UI`, true);
        }
    }

    // Apply configuration from clipboard to UI
    async function applyConfigFromClipboard() {
        try {
            const clipboardText = await navigator.clipboard.readText();
            const config = JSON.parse(clipboardText);
            
            // Validate that it's a proper configuration
            if (config && typeof config === 'object' && (config.basic || config.tokenDetails || config.wallets || config.risk || config.advanced)) {
                updateStatus('📋 Applying configuration from clipboard to UI...');
                const completeConfig = ensureCompleteConfig(config);
                const success = await applyConfigToUI(completeConfig, true); // Skip stop check for manual clipboard application
                
                if (success) {
                    updateStatus('✅ Clipboard configuration applied to UI successfully!');
                    // Test it to show the results
                    updateStatus('📊 Testing clipboard configuration...');
                    const result = await testConfigurationAPI(config, 'Clipboard Config');
                    if (result.success) {
                        updateStatus(`📊 Clipboard config results: ${result.metrics.totalTokens} tokens, ${result.metrics.tpPnlPercent?.toFixed(1)}% TP PnL`);
                    }
                } else {
                    updateStatus('❌ Failed to apply clipboard configuration to UI', true);
                }
            } else {
                updateStatus('❌ Invalid configuration format in clipboard', true);
            }
        } catch (error) {
            updateStatus('❌ Failed to read/parse clipboard configuration', true);
        }
    }

    // ========================================
    // 🎨 UI FUNCTIONS
    // ========================================
    
    // Generate preset dropdown options dynamically from PRESETS object with priority sorting
    function generatePresetOptions() {
        let options = '<option value="">-- Select a Preset --</option>';
        
        // Convert PRESETS object to array with keys and sort by priority
        const sortedPresets = Object.entries(PRESETS).sort(([keyA, configA], [keyB, configB]) => {
            const priorityA = configA.priority || 999; // Default high priority if not set
            const priorityB = configB.priority || 999;
            return priorityA - priorityB;
        });
        
        let currentCategory = null;
        
        // Add sorted presets with category headers
        sortedPresets.forEach(([presetKey, presetConfig]) => {
            // Add category separator if category changed
            if (presetConfig.category && presetConfig.category !== currentCategory) {
                currentCategory = presetConfig.category;
                options += `<optgroup label="── ${currentCategory} ──">`;
            }
            
            const displayName = getPresetDisplayName(presetKey, presetConfig);
            options += `<option value="${presetKey}">${displayName}</option>`;
        });
        
        return options;
    }
    
    function getPresetDisplayName(presetKey, presetConfig) {        
        // Use description if available, otherwise generate from key
        if (presetConfig && presetConfig.description) {
            // Add priority indicator for high priority items
            const priorityIcon = (presetConfig.priority <= 3) ? '🏆 ' : 
                                 (presetConfig.priority <= 5) ? '🔥 ' : 
                                (presetConfig.priority <= 10) ? '⭐ ' : '';
            return `${priorityIcon}${presetConfig.description}`;
        }
        
        // Fallback to original naming logic
        let displayName = presetKey
            .replace(/([A-Z])/g, ' $1') // Add space before capital letters
            .replace(/([0-9]+)/g, ' $1') // Add space before numbers
            .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
            .trim();
            
        return displayName;
    }
    
    // ========================================
    // 🖥️ SPLIT-SCREEN LAYOUT FUNCTIONS
    // ========================================
    
    // Track split-screen state
    let isSplitScreenMode = false;
    const COPILOT_WIDTH = 420; // Width of the AG Copilot panel
    
    function toggleSplitScreen() {
        const ui = document.getElementById('ag-copilot-enhanced-ui');
        const collapsedUI = document.getElementById('ag-copilot-collapsed-ui');
        const body = document.body;
        const html = document.documentElement;
        
        if (!ui) return;
        
        if (!isSplitScreenMode) {
            // Switch to split-screen mode
            enableSplitScreen();
        } else {
            // Switch back to floating mode
            disableSplitScreen();
        }
    }
    
    function enableSplitScreen() {
        const ui = document.getElementById('ag-copilot-enhanced-ui');
        const collapsedUI = document.getElementById('ag-copilot-collapsed-ui');
        const body = document.body;
        const html = document.documentElement;
        
        if (!ui) return;
        
        // Check if screen is wide enough for split-screen (minimum 1200px)
        if (window.innerWidth < 1200) {
            console.log('⚠️ Screen too narrow for split-screen mode (minimum 1200px required)');
            alert('Split-screen mode requires a minimum screen width of 1200px.\nCurrent width: ' + window.innerWidth + 'px');
            return;
        }
        
        // Store original body styles if not already stored
        if (!body.dataset.originalMargin) {
            body.dataset.originalMargin = body.style.marginRight || '0px';
            body.dataset.originalWidth = body.style.width || 'auto';
            body.dataset.originalMaxWidth = body.style.maxWidth || 'none';
            body.dataset.originalOverflowX = body.style.overflowX || 'visible';
        }
        
        // Adjust page layout to make room for AG Copilot
        body.style.marginRight = `${COPILOT_WIDTH}px`; // Extra 40px for padding
        body.style.transition = 'margin-right 0.3s ease';
        body.style.overflowX = 'hidden'; // Prevent horizontal scrollbar
        
        // Position AG Copilot in the right slice
        ui.style.position = 'fixed';
        ui.style.top = '0px';
        ui.style.right = '0px';
        ui.style.width = `${COPILOT_WIDTH}px`;
        ui.style.height = '100vh';
        ui.style.borderRadius = '0px';
        ui.style.maxHeight = '100vh';
        ui.style.border = '1px solid #2d3748';
        ui.style.borderRight = 'none';
        ui.style.transition = 'all 0.3s ease';
        
        // Update collapsed UI position too
        if (collapsedUI) {
            collapsedUI.style.right = '10px';
        }
        
        isSplitScreenMode = true;
        console.log('🖥️ Split-screen mode enabled');
    }
    
    function disableSplitScreen() {
        const ui = document.getElementById('ag-copilot-enhanced-ui');
        const collapsedUI = document.getElementById('ag-copilot-collapsed-ui');
        const body = document.body;
        
        if (!ui) return;
        
        // Restore original body styles
        body.style.marginRight = body.dataset.originalMargin || '0px';
        body.style.width = body.dataset.originalWidth || 'auto';
        body.style.maxWidth = body.dataset.originalMaxWidth || 'none';
        body.style.overflowX = body.dataset.originalOverflowX || 'visible';
        body.style.transition = 'margin-right 0.3s ease';
        
        // Restore AG Copilot to floating mode
        ui.style.position = 'fixed';
        ui.style.top = '20px';
        ui.style.right = '20px';
        ui.style.width = `${COPILOT_WIDTH}px`;
        ui.style.height = 'auto';
        ui.style.borderRadius = '8px';
        ui.style.maxHeight = '90vh';
        ui.style.border = '1px solid #2d3748';
        ui.style.transition = 'all 0.3s ease';
        
        // Update collapsed UI position
        if (collapsedUI) {
            collapsedUI.style.right = '20px';
        }
        
        isSplitScreenMode = false;
        console.log('🖥️ Floating mode restored');
    }
    
    // Clean up split-screen when UI is removed
    function cleanupSplitScreen() {
        if (isSplitScreenMode) {
            disableSplitScreen();
        }
    }
    
    function createUI() {
        // Remove existing UI
        const existingUI = document.getElementById('ag-copilot-enhanced-ui');
        if (existingUI) {
            existingUI.remove();
        }

        const ui = document.createElement('div');
        ui.id = 'ag-copilot-enhanced-ui';
        ui.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 420px;
            background: #1a2332;
            border: 1px solid #2d3748;
            border-radius: 8px;
            padding: 0;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            color: #e2e8f0;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;

        ui.innerHTML = `
            <div id="ui-header" style="
                padding: 16px 20px;
                background: #2d3748;
                border-bottom: 1px solid #4a5568;
                border-radius: 8px 8px 0 0;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="
                            width: 8px;
                            height: 8px;
                            background: #48bb78;
                            border-radius: 50%;
                            animation: pulse 2s infinite;
                        "></div>
                        <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #f7fafc;">
                            🤖 AG Copilot Enhanced
                        </h3>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button id="collapse-ui-btn" style="
                            background: #4a5568;
                            border: 1px solid #718096;
                            border-radius: 4px;
                            color: #e2e8f0;
                            cursor: pointer;
                            padding: 6px 10px;
                            font-size: 11px;
                            font-weight: 500;
                            transition: all 0.2s;
                        " onmouseover="this.style.background='#718096'" 
                           onmouseout="this.style.background='#4a5568'"
                           title="Minimize window">
                            ➖
                        </button>
                        <button id="close-ui-btn" style="
                            background: #e53e3e;
                            border: 1px solid #c53030;
                            border-radius: 4px;
                            color: white;
                            cursor: pointer;
                            padding: 6px 10px;
                            font-size: 11px;
                            font-weight: 500;
                            transition: all 0.2s;
                        " onmouseover="this.style.background='#c53030'" 
                           onmouseout="this.style.background='#e53e3e'"
                           title="Close AG Copilot">
                            ✕
                        </button>
                    </div>
                </div>
            </div>
            
            <div id="ui-content" style="
                flex: 1;
                overflow-y: auto;
                scrollbar-width: thin;
                scrollbar-color: #4a5568 transparent;
            ">
                <style>
                    #ui-content::-webkit-scrollbar {
                        width: 6px;
                    }
                    #ui-content::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    #ui-content::-webkit-scrollbar-thumb {
                        background: #4a5568;
                        border-radius: 3px;
                    }
                    #ui-content::-webkit-scrollbar-thumb:hover {
                        background: #718096;
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                    .tab-button {
                        padding: 12px 20px;
                        background: #2d3748;
                        border: none;
                        border-bottom: 2px solid transparent;
                        color: #a0aec0;
                        font-size: 13px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s;
                        flex: 1;
                    }
                    .tab-button:hover {
                        background: #4a5568;
                        color: #e2e8f0;
                    }
                    .tab-button.active {
                        background: #1a2332;
                        color: #63b3ed;
                        border-bottom-color: #63b3ed;
                    }
                    .tab-content {
                        display: none;
                        padding: 16px 20px;
                    }
                    .tab-content.active {
                        display: block;
                    }
                </style>

                <!-- Tab Navigation -->
                <div style="
                    display: flex;
                    background: #2d3748;
                    border-bottom: 1px solid #4a5568;
                ">
                    <button class="tab-button active" onclick="switchTab('config-tab')" id="config-tab-btn">
                        ⚙️ Configuration
                    </button>
                    <button class="tab-button" onclick="switchTab('signal-tab')" id="signal-tab-btn">
                        🔍 Signal Analysis
                    </button>
                </div>

                <!-- Configuration Tab -->
                <div id="config-tab" class="tab-content active">
                    
                        <!-- Presets and Trigger Mode -->
                        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 8px; margin-bottom: 12px;">
                            <div>
                                <label style="
                                    font-size: 11px;
                                    font-weight: 500;
                                    color: #a0aec0;
                                    display: block;
                                    margin-bottom: 4px;
                                ">Quick Presets</label>
                                <select id="preset-dropdown" style="
                                    width: 100%;
                                    padding: 6px 10px;
                                    background: #2d3748;
                                    border: 1px solid #4a5568;
                                    border-radius: 4px;
                                    color: #e2e8f0;
                                    font-size: 11px;
                                    outline: none;
                                    transition: border-color 0.2s;
                                " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                                    ${generatePresetOptions()}
                                </select>
                            </div>
                            <div>
                                <label style="
                                    font-size: 11px;
                                    font-weight: 500;
                                    color: #a0aec0;
                                    display: block;
                                    margin-bottom: 4px;
                                ">Trigger Mode</label>
                                <select id="trigger-mode-select" style="
                                    width: 100%;
                                    padding: 6px 10px;
                                    background: #2d3748;
                                    border: 1px solid #4a5568;
                                    border-radius: 4px;
                                    color: #e2e8f0;
                                    font-size: 11px;
                                    outline: none;
                                    transition: border-color 0.2s;
                                " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                                    <option value="0">Bullish Bonding</option>
                                    <option value="1">God Mode</option>
                                    <option value="2">Moon Finder</option>
                                    <option value="3">Fomo</option>
                                    <option value="4" selected>Launchpads</option>
                                    <option value="5">Smart Tracker</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- Date Range Selection -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                            <div>
                                <label style="
                                    font-size: 11px;
                                    font-weight: 500;
                                    color: #a0aec0;
                                    display: block;
                                    margin-bottom: 2px;
                                ">From Date (optional)</label>
                                <input type="date" id="from-date" style="
                                    width: 100%;
                                    padding: 4px 8px;
                                    background: #2d3748;
                                    border: 1px solid #4a5568;
                                    border-radius: 4px;
                                    color: #e2e8f0;
                                    font-size: 10px;
                                    outline: none;
                                    transition: border-color 0.2s;
                                " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                            </div>
                            <div>
                                <label style="
                                    font-size: 10px;
                                    font-weight: 500;
                                    color: #a0aec0;
                                    display: block;
                                    margin-bottom: 2px;
                                ">To Date (optional)</label>
                                <input type="date" id="to-date" style="
                                    width: 100%;
                                    padding: 4px 8px;
                                    background: #2d3748;
                                    border: 1px solid #4a5568;
                                    border-radius: 4px;
                                    color: #e2e8f0;
                                    font-size: 10px;
                                    outline: none;
                                    transition: border-color 0.2s;
                                " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                            </div>
                        </div>

                        <!-- Optimization Settings Grid -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 6px; margin-bottom: 10px;">
                            <div>
                                <label style="
                                    font-size: 10px;
                                    font-weight: 500;
                                    color: #a0aec0;
                                    display: block;
                                    margin-bottom: 3px;
                                ">Target PnL %</label>
                                <input type="number" id="target-pnl" value="100" min="5" max="500" step="5" style="
                                    width: 100%;
                                    padding: 5px 6px;
                                    background: #2d3748;
                                    border: 1px solid #4a5568;
                                    border-radius: 4px;
                                    color: #e2e8f0;
                                    font-size: 10px;
                                    text-align: center;
                                    outline: none;
                                    transition: border-color 0.2s;
                                " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                            </div>
                            <div>
                                <label style="
                                    font-size: 10px;
                                    font-weight: 500;
                                    color: #a0aec0;
                                    display: block;
                                    margin-bottom: 3px;
                                ">Min Tokens</label>
                                <input type="number" id="min-tokens" value="75" min="10" max="1000" step="5" style="
                                    width: 100%;
                                    padding: 5px 6px;
                                    background: #2d3748;
                                    border: 1px solid #4a5568;
                                    border-radius: 4px;
                                    color: #e2e8f0;
                                    font-size: 10px;
                                    text-align: center;
                                    outline: none;
                                    transition: border-color 0.2s;
                                " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                            </div>
                            <div>
                                <label style="
                                    font-size: 10px;
                                    font-weight: 500;
                                    color: #a0aec0;
                                    display: block;
                                    margin-bottom: 3px;
                                ">Runtime (min)</label>
                                <input type="number" id="runtime-min" value="15" min="5" max="120" step="5" style="
                                    width: 100%;
                                    padding: 5px 6px;
                                    background: #2d3748;
                                    border: 1px solid #4a5568;
                                    border-radius: 4px;
                                    color: #e2e8f0;
                                    font-size: 10px;
                                    text-align: center;
                                    outline: none;
                                    transition: border-color 0.2s;
                                " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                            </div>
                            <div>
                                <label style="
                                    font-size: 10px;
                                    font-weight: 500;
                                    color: #a0aec0;
                                    display: block;
                                    margin-bottom: 3px;
                                ">Chain Runs</label>
                                <input type="number" id="chain-run-count" value="4" min="1" max="10" step="1" style="
                                    width: 100%;
                                    padding: 5px 6px;
                                    background: #2d3748;
                                    border: 1px solid #4a5568;
                                    border-radius: 4px;
                                    color: #e2e8f0;
                                    font-size: 10px;
                                    text-align: center;
                                    outline: none;
                                    transition: border-color 0.2s;
                                " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                            </div>
                        </div>
                        
                        <!-- Advanced Optimization Features -->
                        <div style="
                            margin-bottom: 4px;
                            padding: 4px;
                            background: #2d3748;
                            border-radius: 6px;
                            border: 1px solid #4a5568;
                        ">
                            <div style="
                                font-size: 10px;
                                font-weight: 600;
                                margin-bottom: 4px;
                                color: #63b3ed;
                                display: flex;
                                align-items: center;
                                gap: 6px;
                            ">
                                🚀 Optimization Methods
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2px 6px;">
                                <label style="
                                    display: flex;
                                    align-items: center;
                                    cursor: pointer;
                                    font-size: 10px;
                                    color: #e2e8f0;
                                    padding: 2px;
                                    border-radius: 3px;
                                    transition: background 0.2s;
                                " onmouseover="this.style.background='#4a5568'" 
                                  onmouseout="this.style.background='transparent'"
                                  title="Uses statistical methods to reduce impact of outlier data points">
                                    <input type="checkbox" id="robust-scoring" checked style="
                                        margin-right: 4px;
                                        transform: scale(0.8);
                                        accent-color: #63b3ed;
                                    ">
                                    <span style="font-weight: 500;">🛡️ Outlier-Resistant</span>
                                </label>
                                
                                <label style="
                                    display: flex;
                                    align-items: center;
                                    cursor: pointer;
                                    font-size: 10px;
                                    color: #e2e8f0;
                                    padding: 2px;
                                    border-radius: 3px;
                                    transition: background 0.2s;
                                " onmouseover="this.style.background='#4a5568'" 
                                  onmouseout="this.style.background='transparent'"
                                  title="Advanced optimization technique that accepts worse solutions occasionally to escape local optima">
                                    <input type="checkbox" id="simulated-annealing" checked style="
                                        margin-right: 4px;
                                        transform: scale(0.8);
                                        accent-color: #63b3ed;
                                    ">
                                    <span style="font-weight: 500;">🔥 Simulated Annealing</span>
                                </label>
                                
                                <label style="
                                    display: flex;
                                    align-items: center;
                                    cursor: pointer;
                                    font-size: 10px;
                                    color: #e2e8f0;
                                    padding: 2px;
                                    border-radius: 3px;
                                    transition: background 0.2s;
                                " onmouseover="this.style.background='#4a5568'" 
                                  onmouseout="this.style.background='transparent'"
                                  title="Tests all available presets as starting points for comprehensive coverage">
                                    <input type="checkbox" id="multiple-starting-points" style="
                                        margin-right: 4px;
                                        transform: scale(0.8);
                                        accent-color: #63b3ed;
                                    ">
                                    <span style="font-weight: 500;">🎯 Multiple Starts</span>
                                </label>
                                
                                <label style="
                                    display: flex;
                                    align-items: center;
                                    cursor: pointer;
                                    font-size: 10px;
                                    color: #e2e8f0;
                                    padding: 2px;
                                    border-radius: 3px;
                                    transition: background 0.2s;
                                " onmouseover="this.style.background='#4a5568'" 
                                  onmouseout="this.style.background='transparent'"
                                  title="Statistical sampling method that ensures even distribution across parameter space">
                                    <input type="checkbox" id="latin-hypercube" checked style="
                                        margin-right: 4px;
                                        transform: scale(0.8);
                                        accent-color: #63b3ed;
                                    ">
                                    <span style="font-weight: 500;">📐 Latin Hypercube</span>
                                </label>
                                
                                <label style="
                                    display: flex;
                                    align-items: center;
                                    cursor: pointer;
                                    font-size: 10px;
                                    color: #e2e8f0;
                                    padding: 2px;
                                    border-radius: 3px;
                                    transition: background 0.2s;
                                " onmouseover="this.style.background='#4a5568'" 
                                  onmouseout="this.style.background='transparent'"
                                  title="Tests related parameters together (e.g., min/max MCAP, wallet counts) for better combinations">
                                    <input type="checkbox" id="correlated-params" checked style="
                                        margin-right: 4px;
                                        transform: scale(0.8);
                                        accent-color: #63b3ed;
                                    ">
                                    <span style="font-weight: 500;">🔗 Correlated Params</span>
                                </label>
                                
                                <label style="
                                    display: flex;
                                    align-items: center;
                                    cursor: pointer;
                                    font-size: 10px;
                                    color: #e2e8f0;
                                    padding: 2px;
                                    border-radius: 3px;
                                    transition: background 0.2s;
                                " onmouseover="this.style.background='#4a5568'" 
                                  onmouseout="this.style.background='transparent'"
                                  title="Fine-grained testing of the most effective parameters with smaller increments">
                                    <input type="checkbox" id="deep-dive" checked style="
                                        margin-right: 4px;
                                        transform: scale(0.8);
                                        accent-color: #63b3ed;
                                    ">
                                    <span style="font-weight: 500;">🔬 Deep Dive</span>
                                </label>
                            </div>
                            
                            <!-- Low Bundled % Constraint -->
                            <div style="
                                margin-top: 4px;
                                padding: 4px;
                                background: rgba(255, 193, 7, 0.1);
                                border: 1px solid rgba(255, 193, 7, 0.3);
                                border-radius: 4px;
                            ">
                                <label style="
                                    display: flex;
                                    align-items: center;
                                    cursor: pointer;
                                    font-size: 10px;
                                    color: #ffc107;
                                    font-weight: 500;
                                " title="Forces Min Bundled % < 5% and Max Bundled % < 35% during optimization">
                                    <input type="checkbox" id="low-bundled-constraint" checked style="
                                        margin-right: 4px;
                                        transform: scale(0.8);
                                        accent-color: #ffc107;
                                    ">
                                    <span>🛡️ Low Bundled % Constraint</span>
                                </label>
                                <div style="
                                    font-size: 8px;
                                    color: #a0aec0;
                                    margin-top: 1px;
                                    margin-left: 16px;
                                    line-height: 1.2;
                                ">
                                    Forces Min Bundled % &lt; 5% and Max Bundled % &lt; 35% during optimization
                                </div>
                            </div>
                        </div>
                </div>

                <!-- Signal Analysis Tab -->
                <div id="signal-tab" class="tab-content">
                    <div style="padding: 20px;">
                        <!-- Contract Input -->
                        <div style="margin-bottom: 12px;">
                            <label style="
                                font-size: 12px;
                                font-weight: 500;
                                color: #a0aec0;
                                display: block;
                                margin-bottom: 6px;
                            ">Contract Addresses</label>
                            <textarea id="signal-contract-input" placeholder="Contract addresses (one per line)..." style="
                                width: 100%;
                                padding: 12px;
                                background: #2d3748;
                                border: 1px solid #4a5568;
                                border-radius: 4px;
                                color: #e2e8f0;
                                font-size: 12px;
                                height: 80px;
                                resize: vertical;
                                outline: none;
                                transition: border-color 0.2s;
                                font-family: 'Monaco', 'Menlo', monospace;
                            " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'"></textarea>
                        </div>
                        
                        <div style="
                            font-size: 11px;
                            color: #718096;
                            text-align: center;
                            margin-bottom: 16px;
                            padding: 8px;
                            background: #2d3748;
                            border-radius: 4px;
                            border: 1px solid #4a5568;
                        ">
                            💡 Analyze successful signals to generate optimal configs
                        </div>
                        
                        <!-- Settings Grid -->
                        <div style="display: grid; grid-template-columns: auto auto 1fr auto; gap: 12px; align-items: end; margin-bottom: 16px;">
                            <div>
                                <label style="
                                    font-size: 11px;
                                    font-weight: 500;
                                    color: #a0aec0;
                                    display: block;
                                    margin-bottom: 4px;
                                ">Signals/Token</label>
                                <input type="number" id="signals-per-token" value="6" min="1" max="999" style="
                                    width: 60px;
                                    padding: 6px 8px;
                                    background: #2d3748;
                                    border: 1px solid #4a5568;
                                    border-radius: 4px;
                                    color: #e2e8f0;
                                    font-size: 11px;
                                    text-align: center;
                                    outline: none;
                                    transition: border-color 0.2s;
                                " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                            </div>
                            <div>
                                <label style="
                                    font-size: 11px;
                                    font-weight: 500;
                                    color: #a0aec0;
                                    display: block;
                                    margin-bottom: 4px;
                                ">Buffer %</label>
                                <input type="number" id="config-buffer" value="10" min="0" max="50" style="
                                    width: 55px;
                                    padding: 6px 8px;
                                    background: #2d3748;
                                    border: 1px solid #4a5568;
                                    border-radius: 4px;
                                    color: #e2e8f0;
                                    font-size: 11px;
                                    text-align: center;
                                    outline: none;
                                    transition: border-color 0.2s;
                                " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                            </div>
                            <div style="display: flex; align-items: center; justify-content: center;">
                                <label style="
                                    display: flex;
                                    align-items: center;
                                    cursor: pointer;
                                    font-size: 11px;
                                    color: #e2e8f0;
                                    font-weight: 500;
                                ">
                                    <input type="checkbox" id="enable-signal-clustering" checked style="
                                        margin-right: 6px;
                                        transform: scale(1.0);
                                        accent-color: #63b3ed;
                                    ">
                                    🎯 Clustering
                                </label>
                            </div>
                            <button id="analyze-signals-btn" style="
                                padding: 8px 16px;
                                background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
                                border: none;
                                border-radius: 4px;
                                color: white;
                                font-weight: 500;
                                cursor: pointer;
                                font-size: 12px;
                                transition: all 0.2s;
                            " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                                🔍 Analyze
                            </button>
                        </div>
                        
                        <!-- Outlier Filtering -->
                        <div style="margin-bottom: 16px;">
                            <label style="
                                font-size: 12px;
                                font-weight: 500;
                                color: #a0aec0;
                                display: block;
                                margin-bottom: 8px;
                            ">Outlier Filter</label>
                            <div style="
                                background: #2d3748;
                                border: 1px solid #4a5568;
                                border-radius: 4px;
                                padding: 8px;
                                display: grid;
                                grid-template-columns: repeat(4, 1fr);
                                gap: 8px;
                            ">
                                <label style="
                                    display: flex;
                                    align-items: center;
                                    cursor: pointer;
                                    font-size: 11px;
                                    color: #e2e8f0;
                                    padding: 4px;
                                    border-radius: 3px;
                                    transition: background 0.2s;
                                " onmouseover="this.style.background='#4a5568'" onmouseout="this.style.background='transparent'">
                                    <input type="radio" name="signal-outlier-filter" id="signal-outlier-none" value="none" style="
                                        margin-right: 4px;
                                        accent-color: #63b3ed;
                                    ">
                                    <span>None</span>
                                </label>
                                <label style="
                                    display: flex;
                                    align-items: center;
                                    cursor: pointer;
                                    font-size: 11px;
                                    color: #e2e8f0;
                                    padding: 4px;
                                    border-radius: 3px;
                                    transition: background 0.2s;
                                " onmouseover="this.style.background='#4a5568'" onmouseout="this.style.background='transparent'">
                                    <input type="radio" name="signal-outlier-filter" id="signal-outlier-iqr" value="iqr" checked style="
                                        margin-right: 4px;
                                        accent-color: #63b3ed;
                                    ">
                                    <span>IQR</span>
                                </label>
                                <label style="
                                    display: flex;
                                    align-items: center;
                                    cursor: pointer;
                                    font-size: 11px;
                                    color: #e2e8f0;
                                    padding: 4px;
                                    border-radius: 3px;
                                    transition: background 0.2s;
                                " onmouseover="this.style.background='#4a5568'" onmouseout="this.style.background='transparent'">
                                    <input type="radio" name="signal-outlier-filter" id="signal-outlier-percentile" value="percentile" style="
                                        margin-right: 4px;
                                        accent-color: #63b3ed;
                                    ">
                                    <span>Percentile</span>
                                </label>
                                <label style="
                                    display: flex;
                                    align-items: center;
                                    cursor: pointer;
                                    font-size: 11px;
                                    color: #e2e8f0;
                                    padding: 4px;
                                    border-radius: 3px;
                                    transition: background 0.2s;
                                " onmouseover="this.style.background='#4a5568'" onmouseout="this.style.background='transparent'">
                                    <input type="radio" name="signal-outlier-filter" id="signal-outlier-zscore" value="zscore" style="
                                        margin-right: 4px;
                                        accent-color: #63b3ed;
                                    ">
                                    <span>Z-Score</span>
                                </label>
                            </div>
                        </div>
                        
                        <!-- Analysis Results -->
                        <div id="signal-analysis-results" style="
                            background: #2d3748;
                            border: 1px solid #4a5568;
                            border-radius: 6px;
                            padding: 12px;
                            font-size: 12px;
                            min-height: 60px;
                            max-height: 150px;
                            overflow-y: auto;
                            display: none;
                            scrollbar-width: thin;
                            scrollbar-color: #4a5568 transparent;
                        ">
                            <div style="color: #a0aec0;">Analysis results will appear here...</div>
                        </div>
                        
                        <!-- Cluster Selection Section -->
                        <div id="cluster-selection" style="margin-top: 16px; display: none;">
                            <div style="
                                font-size: 12px;
                                font-weight: 600;
                                margin-bottom: 8px;
                                color: #63b3ed;
                                display: flex;
                                align-items: center;
                                gap: 6px;
                            ">
                                🎯 Select Config
                            </div>
                            <div id="cluster-buttons" style="margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 6px;">
                                <!-- Cluster buttons will be added dynamically -->
                            </div>
                        </div>
                        
                        <!-- Generated Config Actions -->
                        <div id="generated-config-actions" style="margin-top: 16px; display: none;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
                                <button id="apply-generated-config-btn" style="
                                    padding: 10px 8px;
                                    background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%);
                                    border: none;
                                    border-radius: 4px;
                                    color: white;
                                    font-size: 11px;
                                    cursor: pointer;
                                    font-weight: 500;
                                    transition: all 0.2s;
                                " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                                    ⚙️ Apply
                                </button>
                                <button id="optimize-generated-config-btn" style="
                                    padding: 10px 8px;
                                    background: linear-gradient(135deg, #38b2ac 0%, #319795 100%);
                                    border: none;
                                    border-radius: 4px;
                                    color: white;
                                    font-size: 11px;
                                    cursor: pointer;
                                    font-weight: 500;
                                    transition: all 0.2s;
                                " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                                    🚀 Optimize
                                </button>
                                <button id="copy-config-btn" style="
                                    padding: 10px 8px;
                                    background: linear-gradient(135deg, #9f7aea 0%, #805ad5 100%);
                                    border: none;
                                    border-radius: 4px;
                                    color: white;
                                    font-size: 11px;
                                    cursor: pointer;
                                    font-weight: 500;
                                    transition: all 0.2s;
                                " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                                    📋 Copy
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Permanent Results Section at Bottom -->
                <div style="
                    border-top: 1px solid #2d3748;
                    background: rgba(72, 187, 120, 0.05);
                ">
                    <div id="best-config-display" style="
                        background: rgba(72, 187, 120, 0.1);
                        border: 1px solid rgba(72, 187, 120, 0.3);
                        border-radius: 6px;
                        padding: 16px;
                        margin: 16px 20px;
                        display: block;
                    ">
                        <h5 id="best-config-header" style="
                            margin: 0 0 12px 0;
                            font-size: 13px;
                            font-weight: 600;
                            color: #48bb78;
                            display: flex;
                            align-items: center;
                            gap: 6px;
                        ">⏳ Optimization Configuration</h5>
                        <div id="best-config-stats" style="
                            font-size: 12px;
                            margin-bottom: 12px;
                            color: #e2e8f0;
                        "></div>
                        <div style="margin-bottom: 12px;">
                            <!-- Main Action Buttons -->
                            <div style="margin-bottom: 12px;">
                                <button id="start-optimization" style="
                                    width: 100%;
                                    padding: 12px;
                                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                    border: none;
                                    border-radius: 6px;
                                    color: white;
                                    font-weight: 600;
                                    cursor: pointer;
                                    font-size: 14px;
                                    transition: all 0.2s;
                                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                                " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(0, 0, 0, 0.15)'" 
                                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0, 0, 0, 0.1)'">
                                    🚀 Start Enhanced Optimization
                                </button>
                            </div>
                            
                            <div style="margin-bottom: 12px;">
                                <button id="stop-optimization" style="
                                    width: 100%;
                                    padding: 10px;
                                    background: #e53e3e;
                                    border: 1px solid #c53030;
                                    border-radius: 6px;
                                    color: white;
                                    font-weight: 500;
                                    cursor: pointer;
                                    font-size: 12px;
                                    display: none;
                                    transition: background 0.2s;
                                " onmouseover="this.style.background='#c53030'" onmouseout="this.style.background='#e53e3e'">
                                    ⏹️ Stop Optimization
                                </button>
                            </div>
                            
                            <!-- Secondary Action Buttons Grid -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                                <button id="parameter-discovery" style="
                                    padding: 10px;
                                    background: linear-gradient(135deg, #9f7aea 0%, #805ad5 100%);
                                    border: none;
                                    border-radius: 6px;
                                    color: white;
                                    font-weight: 500;
                                    cursor: pointer;
                                    font-size: 12px;
                                    transition: all 0.2s;
                                " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                                    🔬 Parameter Discovery
                                </button>
                                
                                <button id="toggle-rate-limit-btn" style="
                                    padding: 10px;
                                    background: linear-gradient(135deg, #38b2ac 0%, #319795 100%);
                                    border: none;
                                    border-radius: 6px;
                                    color: white;
                                    font-weight: 500;
                                    cursor: pointer;
                                    font-size: 12px;
                                    transition: all 0.2s;
                                " onmouseover="this.style.transform='translateY(-1px)'" 
                                   onmouseout="this.style.transform='translateY(0)'"
                                   onclick="toggleRateLimitingMode()"
                                   title="Currently using normal rate limiting (20s wait). Click to switch to slower mode.">
                                    ⏱️ Normal
                                </button>
                            </div>   
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(ui);
        
        // Add the switchTab function
        window.switchTab = function(activeTabId) {
            // Remove active class from all tab buttons
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Remove active class from all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Add active class to the clicked button
            const activeButton = document.getElementById(activeTabId + '-btn');
            if (activeButton) {
                activeButton.classList.add('active');
            }
            
            // Add active class to the corresponding content
            const activeContent = document.getElementById(activeTabId);
            if (activeContent) {
                activeContent.classList.add('active');
            }
        };
        
        // Create collapsed state UI with matching theme
        const collapsedUI = document.createElement('div');
        collapsedUI.id = 'ag-copilot-collapsed-ui';
        collapsedUI.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 120px;
            height: 60px;
            background: #1a2332;
            border: 1px solid #2d3748;
            border-radius: 8px;
            padding: 8px;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            color: #e2e8f0;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            cursor: pointer;
            display: none;
            transition: all 0.3s ease;
        `;
        
        collapsedUI.innerHTML = `
            <div style="
                text-align: center;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            ">
                <div style="
                    width: 8px;
                    height: 8px;
                    background: #48bb78;
                    border-radius: 50%;
                    margin-bottom: 4px;
                    animation: pulse 2s infinite;
                "></div>
                <div style="font-size: 14px; margin-bottom: 2px;">🤖</div>
                <div style="font-size: 9px; font-weight: 600; opacity: 0.9;">AG Copilot</div>
                <div style="font-size: 7px; opacity: 0.7; color: #a0aec0;">Click to expand</div>
            </div>
        `;
        
        collapsedUI.addEventListener('click', () => {
            expandUI();
        });
        
        // Add hover effects to collapsed UI
        collapsedUI.addEventListener('mouseenter', () => {
            collapsedUI.style.transform = 'scale(1.05)';
            collapsedUI.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
        });
        
        collapsedUI.addEventListener('mouseleave', () => {
            collapsedUI.style.transform = 'scale(1)';
            collapsedUI.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
        });
        
        document.body.appendChild(collapsedUI);
        
        // Make functions globally available for onclick handlers
        window.applyBestConfigToUI = async function() {
            const tracker = window.bestConfigTracker;
            if (tracker && tracker.config) {
                console.log(`⚙️ Applying best configuration (ID: ${tracker.id.substring(0, 8)}) to UI...`);
                const success = await applyConfigToUI(tracker.config, true); // Skip stop check for manual best config application
                if (success) {
                    console.log(`✅ Best configuration (ID: ${tracker.id.substring(0, 8)}) applied to UI successfully!`);
                } else {
                    console.log('❌ Failed to apply best configuration to UI');
                }
            } else {
                console.log('❌ No best configuration available to apply');
            }
        };
        
        window.copyBestConfigToClipboard = function() {
            const tracker = window.bestConfigTracker;
            if (tracker && tracker.config) {
                const configText = JSON.stringify(tracker.config, null, 2);
                
                // Add metadata comment at the top
                const metadataComment = 
                    `// Best configuration (ID: ${tracker.id.substring(0, 8)})\n` + 
                    `// Score: ${tracker.score.toFixed(1)}% | Source: ${tracker.source}\n` + 
                    `// Generated: ${new Date(tracker.timestamp).toLocaleString()}\n\n`;
                
                navigator.clipboard.writeText(metadataComment + configText).then(() => {
                    console.log(`📋 Best configuration (ID: ${tracker.id.substring(0, 8)}) copied to clipboard!`);
                }).catch(err => {
                    console.log('❌ Failed to copy configuration to clipboard');
                });
            } else {
                console.log('❌ No best configuration available to copy');
            }
        };
        
        // Make toggleRateLimitingMode globally available
        window.toggleRateLimitingMode = toggleRateLimitingMode;
        
        // Make split-screen functions globally available
        window.toggleSplitScreen = toggleSplitScreen;
        window.enableSplitScreen = enableSplitScreen;
        window.disableSplitScreen = disableSplitScreen;
        
        // Make CONFIG globally accessible for debugging/testing
        window.CONFIG = CONFIG;
        
        // Always use split-screen mode (after a short delay to ensure DOM is ready)
        setTimeout(() => {
            console.log('🖥️ Enabling split-screen mode (always-on)');
            enableSplitScreen();
        }, 100);
        
        return ui;
    }

    function updateStatus(message, isError = false) {
        // Only log to console, no UI logging
        const icon = isError ? '❌' : '📝';
        console.log(`${icon} ${message}`);
    }

    function updateBestConfigHeader(state = 'idle') {
        const header = document.getElementById('best-config-header');
        if (!header) return;
        
        switch (state) {
            case 'idle':
                header.textContent = '⏳ Optimization Configuration';
                header.style.color = '#48bb78';
                break;
            case 'running':
                header.textContent = '🔄 Finding Best Configuration...';
                header.style.color = '#60a5fa';
                break;
            case 'completed':
                header.textContent = '🏆 Best Configuration Found';
                header.style.color = '#48bb78';
                break;
        }
    }

    function updateUIBackground(isCompleted = false) {
        const ui = document.getElementById('ag-copilot-enhanced-ui');
        const header = document.getElementById('ui-header');
        const bestConfigDisplay = document.getElementById('best-config-display');
        
        if (ui) {
            if (isCompleted) {
                // Only animate the best config section - keep main UI unchanged
                
                // Add pulsing animation to Best Configuration Found section
                if (bestConfigDisplay) {
                    bestConfigDisplay.style.border = '2px solid #48bb78';
                    bestConfigDisplay.style.borderRadius = '6px';
                    bestConfigDisplay.style.animation = 'successPulse 1.5s ease-in-out infinite';
                    bestConfigDisplay.style.boxShadow = '0 0 15px rgba(72, 187, 120, 0.3)';
                }
                
                // Update best config header to show completion
                updateBestConfigHeader('completed');
                
                // Show the Apply/Copy config buttons
                const resultButtons = document.getElementById('optimization-result-buttons');
                if (resultButtons) {
                    resultButtons.style.display = 'block';
                }
                
                // Add enhanced CSS animation for border-only pulsing
                if (!document.getElementById('success-pulse-animation')) {
                    const style = document.createElement('style');
                    style.id = 'success-pulse-animation';
                    style.textContent = `
                        @keyframes successPulse {
                            0%, 100% { 
                                border-color: #48bb78;
                                box-shadow: 0 0 15px rgba(72, 187, 120, 0.3);
                            }
                            50% { 
                                border-color: #68d391;
                                box-shadow: 0 0 30px rgba(72, 187, 120, 0.6);
                            }
                        }
                    `;
                    document.head.appendChild(style);
                }
                
                // Console celebration
                console.log('🎉 ===== OPTIMIZATION COMPLETED! =====');
                console.log('✅ Check the Best Configuration Found section above!');
                
            } else {
                // Reset best config display animation
                if (bestConfigDisplay) {
                    bestConfigDisplay.style.border = '1px solid #2d3748';
                    bestConfigDisplay.style.animation = 'none';
                    bestConfigDisplay.style.boxShadow = 'none';
                    bestConfigDisplay.style.transform = 'none';
                }
                
                // Reset best config header to idle state
                updateBestConfigHeader('idle');
                
                // Hide the Apply/Copy config buttons
                const resultButtons = document.getElementById('optimization-result-buttons');
                if (resultButtons) {
                    resultButtons.style.display = 'none';
                }
            }
        }
    }

    function updateProgress(message, progress, bestScore, testCount, totalTokens, startTime) {
        // Log progress to console only
        if (startTime) {
            const runtime = Math.floor((Date.now() - startTime) / 1000);
            console.log(`📊 ${message} | Progress: ${(progress || 0).toFixed(1)}% | Best: ${bestScore}% | Tests: ${testCount} | Tokens: ${totalTokens} | Runtime: ${runtime}s`);
        } else {
            console.log(`📊 ${message}`);
        }
    }

    // ========================================
    // 🔍 SIGNAL ANALYSIS FUNCTIONS
    // ========================================
    
    // Get selected outlier filtering method
    function getSignalOutlierFilterMethod() {
        const methods = ['none', 'iqr', 'percentile', 'zscore'];
        for (const method of methods) {
            const radio = document.getElementById(`signal-outlier-${method}`);
            if (radio && radio.checked) {
                return method;
            }
        }
        return 'none'; // Default fallback
    }
    
    // Update signal analysis status
    function updateSignalStatus(message, isError = false) {
        const statusArea = document.getElementById('signal-analysis-results');
        if (statusArea) {
            statusArea.style.display = 'block';
            const timestamp = new Date().toLocaleTimeString();
            const icon = isError ? '❌' : '📝';
            const color = isError ? '#ff6b6b' : '#ffffff';
            
            statusArea.innerHTML += `<div style="color: ${color}; margin: 2px 0;">
                <span style="opacity: 0.7;">${timestamp}</span> ${icon} ${message}
            </div>`;
            statusArea.scrollTop = statusArea.scrollHeight;
        }
    }
    
    // Create cluster selection UI
    function createClusterSelectionUI(clusters, fallbackAnalysis) {
        const clusterSection = document.getElementById('cluster-selection');
        const clusterButtonsContainer = document.getElementById('cluster-buttons');
        
        if (!clusterSection || !clusterButtonsContainer) return;
        
        // Clear existing buttons
        clusterButtonsContainer.innerHTML = '';
        
        // Create button style
        const buttonStyle = `
            padding: 4px 8px; 
            margin: 2px; 
            border: 1px solid #4ECDC4; 
            border-radius: 3px; 
            background: rgba(78, 205, 196, 0.1); 
            color: #4ECDC4; 
            font-size: 9px; 
            cursor: pointer;
            transition: all 0.2s;
        `;
        
        const activeButtonStyle = `
            padding: 4px 8px; 
            margin: 2px; 
            border: 1px solid #FF6B6B; 
            border-radius: 3px; 
            background: rgba(255, 107, 107, 0.2); 
            color: #FF6B6B; 
            font-size: 9px; 
            cursor: pointer;
            font-weight: bold;
        `;
        
        // Add cluster buttons
        clusters.forEach((cluster, index) => {
            const button = document.createElement('button');
            button.innerHTML = `${cluster.name} (${cluster.tokenCount} CAs)`;
            button.style.cssText = index === 0 ? activeButtonStyle : buttonStyle;
            button.onclick = () => selectClusterConfig(cluster.id, clusters, fallbackAnalysis);
            clusterButtonsContainer.appendChild(button);
        });
        
        // Add fallback button
        const fallbackButton = document.createElement('button');
        fallbackButton.innerHTML = `All Signals (${fallbackAnalysis.tokenCount} CAs)`;
        fallbackButton.style.cssText = buttonStyle;
        fallbackButton.onclick = () => selectClusterConfig('fallback', clusters, fallbackAnalysis);
        clusterButtonsContainer.appendChild(fallbackButton);
        
        // Show the cluster selection section
        clusterSection.style.display = 'block';
    }
    
    // Switch to a different cluster config
    function selectClusterConfig(configId, clusters, fallbackAnalysis) {
        let selectedConfig;
        
        if (configId === 'fallback') {
            selectedConfig = generateTightestConfig(fallbackAnalysis);
            window.lastGeneratedConfig = selectedConfig;
        } else {
            selectedConfig = window[`clusterConfig_${configId}`];
            window.lastGeneratedConfig = selectedConfig;
        }
        
        // Update button states
        const buttons = document.querySelectorAll('#cluster-buttons button');
        buttons.forEach(btn => {
            if ((configId === 'fallback' && btn.innerHTML.includes('All Signals')) ||
                (configId !== 'fallback' && btn.innerHTML.includes(configId.replace('cluster_', 'Cluster ')))) {
                btn.style.cssText = `
                    padding: 4px 8px; 
                    margin: 2px; 
                    border: 1px solid #FF6B6B; 
                    border-radius: 3px; 
                    background: rgba(255, 107, 107, 0.2); 
                    color: #FF6B6B; 
                    font-size: 9px; 
                    cursor: pointer;
                    font-weight: bold;
                `;
            } else {
                btn.style.cssText = `
                    padding: 4px 8px; 
                    margin: 2px; 
                    border: 1px solid #4ECDC4; 
                    border-radius: 3px; 
                    background: rgba(78, 205, 196, 0.1); 
                    color: #4ECDC4; 
                    font-size: 9px; 
                    cursor: pointer;
                    transition: all 0.2s;
                `;
            }
        });
        
        // Show config summary
        const configType = configId === 'fallback' ? 'All Signals Config' : `Cluster ${configId.replace('cluster_', '')} Config`;
        updateSignalStatus(`🔄 Switched to: ${configType}`);
        console.log(`\n=== SELECTED: ${configType} ===`);
        console.log(formatConfigForDisplay(selectedConfig));
    }
    
    // Main signal analysis handler
    async function handleSignalAnalysis() {
        try {
            const contractAddresses = document.getElementById('signal-contract-input').value
                .split('\n')
                .map(addr => addr.trim())
                .filter(addr => addr.length > 0);
            
            if (contractAddresses.length === 0) {
                updateSignalStatus('Please enter at least one contract address', true);
                return;
            }
            
            const signalsPerToken = parseInt(document.getElementById('signals-per-token').value) || 3;
            const bufferPercent = parseFloat(document.getElementById('config-buffer').value) || 10;
            const outlierMethod = getSignalOutlierFilterMethod();
            
            // Clear previous results
            document.getElementById('signal-analysis-results').innerHTML = '';
            updateSignalStatus(`Starting analysis of ${contractAddresses.length} tokens...`);
            
            const allTokenData = [];
            const errors = [];
            
            // Process each token
            for (let i = 0; i < contractAddresses.length; i++) {
                const address = contractAddresses[i];
                updateSignalStatus(`Processing token ${i + 1}/${contractAddresses.length}: ${address.substring(0, 8)}...`);
                
                try {
                    // Get token info and swaps
                    const tokenInfo = await getTokenInfo(address);
                    const allSwaps = await getAllTokenSwaps(address);
                    
                    // Limit swaps per token
                    const limitedSwaps = allSwaps.slice(0, signalsPerToken);
                    
                    // Process token data
                    const processed = processTokenData(tokenInfo, limitedSwaps);
                    
                    allTokenData.push({
                        address: address, 
                        processed: processed,
                        swaps: limitedSwaps
                    });
                    
                    updateSignalStatus(`✅ ${processed.tokenName} (${processed.symbol}): ${limitedSwaps.length} signals`);
                    
                } catch (error) {
                    errors.push({ address, error: error.message });
                    updateSignalStatus(`❌ Failed to process ${address.substring(0, 8)}: ${error.message}`, true);
                }
            }
            
            if (allTokenData.length === 0) {
                updateSignalStatus('No valid token data found. Please check contract addresses.', true);
                return;
            }
            
            // Analyze signals and generate config
            updateSignalStatus(`Analyzing ${allTokenData.length} tokens with ${outlierMethod} outlier filtering...`);
            
            // Check if clustering is enabled
            const useClusteringCheckbox = document.getElementById('enable-signal-clustering');
            const useClustering = useClusteringCheckbox ? useClusteringCheckbox.checked : false;
            
            console.log(`🔍 Clustering Debug: checkbox=${!!useClusteringCheckbox}, checked=${useClustering}`);
            
            const analysis = analyzeSignalCriteria(allTokenData, bufferPercent, outlierMethod, useClustering);
            
            if (analysis.type === 'clustered') {
                // Handle clustered analysis
                updateSignalStatus(`🎯 Found ${analysis.clusters.length} signal clusters (${analysis.clusteredSignals}/${analysis.totalSignals} signals)`);
                
                // Set the best (first) cluster as the main config
                const bestCluster = analysis.clusters[0];
                const bestConfig = generateTightestConfig(bestCluster.analysis);
                window.lastGeneratedConfig = bestConfig;
                
                // Display best cluster info
                updateSignalStatus(`🏆 Best Cluster: ${bestCluster.name} with ${bestCluster.signalCount} signals (tightness: ${bestCluster.tightness.toFixed(3)})`);
                
                // Display each cluster
                analysis.clusters.forEach((cluster, index) => {
                    const generatedConfig = generateTightestConfig(cluster.analysis);
                    const formattedConfig = formatConfigForDisplay(generatedConfig);
                    
                    console.log(`\n=== ${cluster.name} (${cluster.signalCount} signals, tightness: ${cluster.tightness.toFixed(3)}) ===`);
                    console.log(formattedConfig);
                    
                    // Store cluster config
                    window[`clusterConfig_${cluster.id}`] = generatedConfig;
                    
                    // Show cluster summary in UI
                    if (index < 3) { // Show first 3 clusters in UI
                        const clusterSummary = `📊 ${cluster.name}: ${cluster.signalCount} signals, MCAP $${generatedConfig['Min MCAP (USD)']} - $${generatedConfig['Max MCAP (USD)']}`;
                        updateSignalStatus(clusterSummary);
                    }
                });
                
                // Also generate and display fallback config
                const fallbackConfig = generateTightestConfig(analysis.fallback);
                window.fallbackConfig = fallbackConfig;
                
                console.log(`\n=== FALLBACK CONFIG (All ${analysis.totalSignals} signals) ===`);
                console.log(formatConfigForDisplay(fallbackConfig));
                
                updateSignalStatus(`📋 Generated ${analysis.clusters.length} cluster configs + 1 fallback - details logged to console`);
                updateSignalStatus(`🎯 Main config set to best cluster: ${bestCluster.name}`);
                updateSignalStatus(`💡 Use Copy button for best cluster config, or check console for all configs`);
                
                // Create cluster selection UI
                createClusterSelectionUI(analysis.clusters, analysis.fallback);
                
            } else {
                // Handle standard analysis
                const generatedConfig = generateTightestConfig(analysis.analysis);
                
                // Format and display the generated config
                const formattedConfig = formatConfigForDisplay(generatedConfig);
                console.log('\n' + formattedConfig);
                updateSignalStatus(`📋 Generated config details logged to console`);
                
                // Store config globally for use by apply buttons
                window.lastGeneratedConfig = generatedConfig;
                
                // Show results
                const summary = generateBatchSummary(allTokenData);
                updateSignalStatus(`✅ Analysis complete! Generated config from ${analysis.analysis.totalSignals} signals`);
                updateSignalStatus(`📊 Average MCAP: $${analysis.analysis.mcap.avg}, Signals/Token: ${summary.avgSignalsPerToken}`);
                updateSignalStatus(`🎯 Config bounds: MCAP $${generatedConfig['Min MCAP (USD)']} - $${generatedConfig['Max MCAP (USD)']}`);
                updateSignalStatus(`📋 Config details available - use Copy button or check console`);
            }
            
            // Show action buttons
            document.getElementById('generated-config-actions').style.display = 'block';
            
        } catch (error) {
            updateSignalStatus(`Analysis failed: ${error.message}`, true);
            console.error('Signal analysis error:', error);
        }
    }

    // ========================================
    // 🔄 UI COLLAPSE/EXPAND FUNCTIONS
    // ========================================
    function collapseUI() {
        const mainUI = document.getElementById('ag-copilot-enhanced-ui');
        const collapsedUI = document.getElementById('ag-copilot-collapsed-ui');
        const body = document.body;
        
        if (mainUI && collapsedUI) {
            // Hide the main panel
            mainUI.style.display = 'none';

            // Restore the page width so we don't leave an empty white strip
            if (body && body.dataset) {
                body.style.marginRight = body.dataset.originalMargin || '0px';
                body.style.width = body.dataset.originalWidth || 'auto';
                body.style.maxWidth = body.dataset.originalMaxWidth || 'none';
                body.style.overflowX = body.dataset.originalOverflowX || 'visible';
            }

            // Mark split-screen mode as off so expandUI reapplies it cleanly
            if (typeof isSplitScreenMode !== 'undefined') {
                isSplitScreenMode = false;
            }

            // Show the compact collapsed launcher
            collapsedUI.style.display = 'flex';
        }
    }
    
    function expandUI() {
        const mainUI = document.getElementById('ag-copilot-enhanced-ui');
        const collapsedUI = document.getElementById('ag-copilot-collapsed-ui');
        if (mainUI && collapsedUI) {
            collapsedUI.style.display = 'none';
            mainUI.style.display = 'block';
            // Re-enable split screen
            setTimeout(() => enableSplitScreen && enableSplitScreen(), 50);
        }
    }

    function setupEventHandlers() {
        // Helper function to safely add event listener
        const safeAddEventListener = (elementId, event, handler) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.addEventListener(event, handler);
            } else {
                console.warn(`⚠️ Element with ID '${elementId}' not found, skipping event listener`);
            }
        };

        // Start optimization button
        safeAddEventListener('start-optimization', 'click', async () => {
            const targetPnl = parseFloat(document.getElementById('target-pnl')?.value) || 100;
            const minTokens = parseInt(document.getElementById('min-tokens')?.value) || 50;
            const runtimeMin = parseInt(document.getElementById('runtime-min')?.value) || 30;
            const chainRunCount = parseInt(document.getElementById('chain-run-count')?.value) || 1;
            const robustScoring = document.getElementById('robust-scoring')?.checked || false;
            const simulatedAnnealing = document.getElementById('simulated-annealing')?.checked || false;
            const multipleStartingPoints = document.getElementById('multiple-starting-points')?.checked || false;
            const latinHypercube = document.getElementById('latin-hypercube')?.checked || false;
            const correlatedParams = document.getElementById('correlated-params')?.checked || false;
            const deepDive = document.getElementById('deep-dive')?.checked || false;
            
            // Reset UI background to original color when starting
            updateUIBackground(false);
            
            // Update config
            CONFIG.TARGET_PNL = targetPnl;
            
            // Apply date-range based token threshold scaling
            const scaledThresholds = getScaledTokenThresholds();
            CONFIG.MIN_TOKENS = Math.max(minTokens, scaledThresholds.MIN_TOKENS); // Use higher of UI value or scaled value
            CONFIG.MAX_RUNTIME_MIN = runtimeMin;
            
            // Log scaling information if date filtering is active
            if (scaledThresholds.scalingInfo.isDateFiltered) {
                console.log(`📅 Date range scaling applied (${scaledThresholds.scalingInfo.days} days, ${scaledThresholds.scalingInfo.scalingFactor.toFixed(2)}x):`);
                console.log(`   📊 Token thresholds: Large=${scaledThresholds.LARGE_SAMPLE_THRESHOLD}, Medium=${scaledThresholds.MEDIUM_SAMPLE_THRESHOLD}, Min=${scaledThresholds.MIN_TOKENS}`);
                console.log(`   🎯 Using minimum tokens: ${CONFIG.MIN_TOKENS} (UI: ${minTokens}, Scaled: ${scaledThresholds.MIN_TOKENS})`);
            }
            CONFIG.USE_ROBUST_SCORING = robustScoring;
            CONFIG.USE_SIMULATED_ANNEALING = simulatedAnnealing;
            CONFIG.USE_MULTIPLE_STARTING_POINTS = multipleStartingPoints;
            CONFIG.USE_LATIN_HYPERCUBE_SAMPLING = latinHypercube;
            CONFIG.USE_CORRELATED_PARAMS = correlatedParams;
            CONFIG.USE_DEEP_DIVE = deepDive;
            CONFIG.CHAIN_RUN_COUNT = chainRunCount;
            
            const features = [];
            if (robustScoring) features.push('outlier-resistant scoring');
            if (simulatedAnnealing) features.push('simulated annealing');
            if (multipleStartingPoints) features.push('multiple starting points');
            if (latinHypercube) features.push('Latin hypercube sampling');
            if (correlatedParams) features.push('correlated parameters');
            if (deepDive) features.push('deep dive analysis');
            
            const featuresStr = features.length > 0 ? ` with ${features.join(', ')}` : '';
            
            // Determine if we should use chained runs (when runs > 1)
            const useChainedRuns = chainRunCount > 1;
            
            if (useChainedRuns) {
                console.log(`🔗 Starting chained optimization: ${chainRunCount} runs of ${runtimeMin} min each, Target ${targetPnl}% PnL, Min ${minTokens} tokens${featuresStr}`);
            } else {
                console.log(`🚀 Starting optimization: Target ${targetPnl}% PnL, Min ${minTokens} tokens, ${runtimeMin} min runtime${featuresStr}`);
            }
            
            // UI state changes
            const startBtn = document.getElementById('start-optimization');
            const stopBtn = document.getElementById('stop-optimization');
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'block';
            
            // Auto-collapse both sections when starting
            console.log('📱 Auto-collapsing sections for cleaner optimization view...');
            
            // Collapse Configuration section if it's open
            const configContent = document.getElementById('config-section-content');
            const configArrow = document.getElementById('config-section-arrow');
            if (configContent && configContent.style.display !== 'none') {
                configContent.style.display = 'none';
                if (configArrow) {
                    configArrow.style.transform = 'rotate(-90deg)';
                    configArrow.textContent = '▶';
                }
            }
            
            // Collapse Signal Analysis section if it's open
            const signalContent = document.getElementById('signal-section-content');
            const signalArrow = document.getElementById('signal-section-arrow');
            if (signalContent && signalContent.style.display !== 'none') {
                signalContent.style.display = 'none';
                if (signalArrow) {
                    signalArrow.style.transform = 'rotate(-90deg)';
                    signalArrow.textContent = '▶';
                }
            }
            
            // Reset stopped flag
            STOPPED = false;
            
            // Start optimization
            try {
                let results;
                
                if (useChainedRuns) {
                    // Use ChainedOptimizer for multiple runs
                    const chainedOptimizer = new ChainedOptimizer();
                    results = await chainedOptimizer.runChainedOptimization(chainRunCount, runtimeMin);
                } else {
                    // Use single EnhancedOptimizer run
                    const optimizer = new EnhancedOptimizer();
                    results = await optimizer.runOptimization();
                }
                
                if (results && results.bestConfig) {
                    if (useChainedRuns) {
                        console.log(`🎉 Chained optimization completed! Best score: ${results.bestScore.toFixed(1)}% across ${chainRunCount} runs (${results.totalTestCount} total tests)`);
                    } else {
                        console.log(`🎉 Optimization completed! Best score: ${results.bestScore.toFixed(1)}% after ${results.testCount} tests`);
                    }
                    
                    // Update tracker with final results
                    const source = useChainedRuns ? `Chained Optimization (${chainRunCount} runs)` : 'Single Optimization';
                    if (window.bestConfigTracker) {
                        window.bestConfigTracker.update(results.bestConfig, results.bestMetrics, results.bestScore, source);
                    }
                    window.currentBestConfig = results.bestConfig; // Keep for backward compatibility
                    
                    // Change background to green for successful completion
                    updateUIBackground(true);
                } else {
                    console.log('❌ Optimization completed but no best configuration found');
                    // Change background to green even if no improvement (completed)
                    updateUIBackground(true);
                }
            } catch (error) {
                console.log(`❌ Optimization failed: ${error.message}`);
                // Keep original background color for failed optimization
            } finally {
                // Stop optimization tracking when complete
                if (window.optimizationTracker) {
                    window.optimizationTracker.stopOptimization();
                }
                
                // Reset UI state safely
                const startBtn = document.getElementById('start-optimization');
                const stopBtn = document.getElementById('stop-optimization');
                if (startBtn) startBtn.style.display = 'block';
                if (stopBtn) stopBtn.style.display = 'none';
            }
        });
        
        // Stop optimization button
        safeAddEventListener('stop-optimization', 'click', () => {
            window.STOPPED = true;
            console.log('⏹️ Optimization stopped by user - STOPPED flag set to:', window.STOPPED);
            
            // Stop optimization tracking immediately when stopped
            if (window.optimizationTracker) {
                window.optimizationTracker.stopOptimization();
            }
            
            // Keep original background when manually stopped
            const startBtn = document.getElementById('start-optimization');
            const stopBtn = document.getElementById('stop-optimization');
            if (startBtn) startBtn.style.display = 'block';
            if (stopBtn) stopBtn.style.display = 'none';
            // Update status to confirm stop action
            updateStatus('⏹️ Optimization stopped by user', false);
        });
        
        // Parameter Impact Discovery button
        safeAddEventListener('parameter-discovery', 'click', async () => {
            const discoveryBtn = document.getElementById('parameter-discovery');
            const startBtn = document.getElementById('start-optimization');
            
            try {
                // Reset stop flag and hide other buttons
                window.STOPPED = false;
                if (discoveryBtn) {
                    discoveryBtn.style.display = 'none';
                    discoveryBtn.disabled = true;
                }
                if (startBtn) {
                    startBtn.style.display = 'none';
                    startBtn.disabled = true;
                }
                
                // Auto-collapse both sections for cleaner discovery view
                console.log('📱 Auto-collapsing sections for parameter discovery...');
                
                // Collapse Configuration section if it's open
                const configContent = document.getElementById('config-section-content');
                const configArrow = document.getElementById('config-section-arrow');
                if (configContent && configContent.style.display !== 'none') {
                    configContent.style.display = 'none';
                    if (configArrow) {
                        configArrow.style.transform = 'rotate(-90deg)';
                        configArrow.textContent = '▶';
                    }
                }
                
                // Collapse Signal Analysis section if it's open
                const signalContent = document.getElementById('signal-section-content');
                const signalArrow = document.getElementById('signal-section-arrow');
                if (signalContent && signalContent.style.display !== 'none') {
                    signalContent.style.display = 'none';
                    if (signalArrow) {
                        signalArrow.style.transform = 'rotate(-90deg)';
                        signalArrow.textContent = '▶';
                    }
                }
                
                updateStatus('🔬 Starting Parameter Impact Discovery...', true);
                
                // Run parameter discovery
                const results = await runParameterImpactDiscovery();
                
                updateStatus(`✅ Parameter Discovery Complete! Found ${results.length} parameter insights. Check console for detailed results.`, false);
                
            } catch (error) {
                console.error('❌ Parameter Discovery Error:', error);
                updateStatus(`❌ Parameter Discovery failed: ${error.message}`, false);
            } finally {
                // Re-enable buttons
                if (discoveryBtn) {
                    discoveryBtn.style.display = 'block';
                    discoveryBtn.disabled = false;
                }
                if (startBtn) {
                    startBtn.style.display = 'block';
                    startBtn.disabled = false;
                }
            }
        });
        
        // Signal Analysis event handlers
        safeAddEventListener('analyze-signals-btn', 'click', async () => {
            await handleSignalAnalysis();
        });
        
        safeAddEventListener('apply-generated-config-btn', 'click', async () => {
            if (window.lastGeneratedConfig) {
                await applyConfigToBacktester(window.lastGeneratedConfig);
                updateStatus('✅ Generated config applied to backtester!');
            }
        });
        
        safeAddEventListener('optimize-generated-config-btn', 'click', async () => {
            if (window.lastGeneratedConfig) {
                await applyConfigToBacktester(window.lastGeneratedConfig);
                updateStatus('⚙️ Generated config applied, starting optimization...');
                // Small delay to let the config apply - with stop check
                if (!window.STOPPED) {
                    await sleep(1000);
                    // Trigger optimization with current settings
                    const startBtn = document.getElementById('start-optimization');
                    if (startBtn) startBtn.click();
                }
            }
        });
        
        safeAddEventListener('copy-config-btn', 'click', async () => {
            if (window.lastGeneratedConfig) {
                const formattedConfig = formatConfigForDisplay(window.lastGeneratedConfig);
                try {
                    await navigator.clipboard.writeText(formattedConfig);
                    updateStatus('📋 Config copied to clipboard!');
                } catch (error) {
                    console.error('Failed to copy to clipboard:', error);
                    // Fallback: log to console
                    console.log('\n🎯 GENERATED CONFIG (clipboard copy failed):\n', formattedConfig);
                    updateStatus('📋 Config logged to console (clipboard failed)');
                }
            }
        });
        
        // Collapse button
        safeAddEventListener('collapse-ui-btn', 'click', () => {
            collapseUI();
        });

        // Close button (red X)
        safeAddEventListener('close-ui-btn', 'click', () => {
            // Ensure any running optimization is stopped before closing
            try {
                if (window.STOPPED === false) {
                    window.STOPPED = true;
                    console.log('⏹️ Optimization stop requested via close button');
                }
                if (window.optimizationTracker && window.optimizationTracker.isRunning) {
                    window.optimizationTracker.stopOptimization();
                    console.log('🧹 Optimization tracker stopped via close button');
                }
            } catch (e) {
                console.warn('Close button stop sequence issue:', e);
            }
            // Clean up split-screen mode if active
            if (typeof cleanupSplitScreen === 'function') {
                cleanupSplitScreen();
            }
            
            // Remove both main and collapsed UI
            const mainUI = document.getElementById('ag-copilot-enhanced-ui');
            const collapsedUI = document.getElementById('ag-copilot-collapsed-ui');
            if (mainUI) mainUI.remove();
            if (collapsedUI) collapsedUI.remove();
            
            console.log('🚫 AG Copilot closed');
        });
    } // end setupEventHandlers

// Apply generated config to backtester UI using correct field mappings
    async function applyConfigToBacktester(config) {
        console.log('applyConfigToBacktester received config:', config);
        let appliedFields = 0;
        let totalFields = 0;
        const results = [];        
        
        // Helper function to track field setting (without section opening)
        const trackField = async (fieldName, value) => {
            totalFields++;
            try {
                const success = await setFieldValue(fieldName, value);
                if (success) {
                    appliedFields++;
                    results.push(`✅ ${fieldName}: ${value}`);
                    return true;
                } else {
                    results.push(`❌ ${fieldName}: ${value} (field not found)`);
                    return false;
                }
            } catch (error) {
                results.push(`❌ ${fieldName}: ${value} (error: ${error.message})`);
                return false;
            }
        };
        
        // Helper function to open section and apply fields
        const applyFieldsToSection = async (sectionName, fieldsToApply) => {
            try {
                const sectionOpened = await openSection(sectionName);
                if (!sectionOpened) {
                    results.push(`❌ Could not open ${sectionName} section`);
                    return false;
                }
                
                await sleep(200); // Wait for section to open
                
                // Apply all fields for this section
                for (const [fieldName, value] of fieldsToApply) {
                    if (value !== undefined && value !== null) {
                        await trackField(fieldName, value);
                        await sleep(50); // Small delay between field updates
                    }
                }
                
                return true;
            } catch (error) {
                results.push(`❌ Error with ${sectionName} section: ${error.message}`);
                return false;
            }
        };        
    
        const boolToToggleValue = (val) => {
            if (val === null) return "Don't care";
            return val ? "Yes" : "Don't care";
        };
        
        // Basic Section Fields
        await applyFieldsToSection('Basic', [
            ['Min MCAP (USD)', config['Min MCAP (USD)']],
            ['Max MCAP (USD)', config['Max MCAP (USD)']],
            ['Min Liquidity (USD)', config['Min Liquidity (USD)']],
            ['Max Liquidity (USD)', config['Max Liquidity (USD)']]
        ]);
        
        // Token Details Section Fields  
        await applyFieldsToSection('Token Details', [
            ['Min AG Score', config['Min AG Score']],
            ['Min Token Age (sec)', config['Min Token Age (sec)']],
            ['Max Token Age (sec)', config['Max Token Age (sec)']],
            ['Min Deployer Age (min)', config['Min Deployer Age (min)']]
        ]);
        
        // Wallets Section Fields
        await applyFieldsToSection('Wallets', [
            ['Min Unique Wallets', config['Min Unique Wallets']],
            ['Max Unique Wallets', config['Max Unique Wallets']],
            ['Min KYC Wallets', config['Min KYC Wallets']],
            ['Max KYC Wallets', config['Max KYC Wallets']],
            ['Min Holders', config['Min Holders']],
            ['Max Holders', config['Max Holders']],
        ]);
        
        // Risk Section Fields (including booleans)
        const riskFields = [
            ['Min Bundled %', config['Min Bundled %']],
            ['Max Bundled %', config['Max Bundled %']],
            ['Min Deployer Balance (SOL)', config['Min Deployer Balance (SOL)']],
            ['Min Buy Ratio %', config['Min Buy Ratio %']],
            ['Max Buy Ratio %', config['Max Buy Ratio %']],
            ['Min Vol MCAP %', config['Min Vol MCAP %']],
            ['Max Vol MCAP %', config['Max Vol MCAP %']],
            ['Max Drained %', config['Max Drained %']]
        ];
        
        // Add boolean fields if they have values (check for true/false, not just non-null)
        if (config['Fresh Deployer'] !== null && config['Fresh Deployer'] !== undefined) {
            riskFields.push(['Fresh Deployer', boolToToggleValue(config['Fresh Deployer'])]);
        }
        if (config['Description'] !== null && config['Description'] !== undefined) {
            riskFields.push(['Description', boolToToggleValue(config['Description'])]);
        }
        
        await applyFieldsToSection('Risk', riskFields);
        
        // Advanced Section Fields
        await applyFieldsToSection('Advanced', [
            ['Max Liquidity %', config['Max Liquidity %']],
            ['Min TTC (sec)', config['Min TTC (sec)']],
            ['Max TTC (sec)', config['Max TTC (sec)']],
            ['Min Win Pred %', config['Min Win Pred %']]
        ]);
        
        return {
            success: appliedFields > 0,
            appliedFields,
            totalFields,
            successRate: totalFields > 0 ? ((appliedFields / totalFields) * 100).toFixed(1) : 0,
            results
        };
    }

    // ========================================
    // 🎬 INITIALIZATION
    // ========================================
    console.log('🔧 Initializing AG Copilot Enhanced + Signal Analysis...');
    
    // Create and setup UI
    try {
        const ui = createUI();
        console.log('✅ UI created successfully');
        
        setupEventHandlers();
        console.log('✅ Event handlers setup completed');
        
        // Make functions globally available for onclick handlers
        window.applyBestConfigToUI = async function() {
            const tracker = window.bestConfigTracker;
            if (tracker && tracker.config) {
                console.log(`⚙️ Applying best configuration (ID: ${tracker.id.substring(0, 8)}) to UI...`);
                const success = await applyConfigToUI(tracker.config, true);
                if (success) {
                    console.log('✅ Best configuration applied to backtester UI');
                } else {
                    console.log('❌ Failed to apply best configuration to UI');
                }
            } else {
                console.log('❌ No best configuration available to apply');
            }
        };
        
        window.copyBestConfigToClipboard = function() {
            const tracker = window.bestConfigTracker;
            if (tracker && tracker.config) {
                const configText = JSON.stringify(tracker.config, null, 2);
                
                // Add metadata comment at the top
                const metadataComment = 
                    `// Best configuration (ID: ${tracker.id.substring(0, 8)})\n` + 
                    `// Score: ${tracker.score.toFixed(1)}% | Source: ${tracker.source}\n` + 
                    `// Generated: ${new Date(tracker.timestamp).toLocaleString()}\n\n`;
                
                navigator.clipboard.writeText(metadataComment + configText).then(() => {
                    console.log('📋 Best configuration copied to clipboard with metadata');
                }).catch(err => {
                    console.error('Failed to copy to clipboard:', err);
                });
            } else {
                console.log('❌ No best configuration available to copy');
            }
        };
        
        // Make other functions globally available
        window.toggleRateLimitingMode = toggleRateLimitingMode;
        window.toggleSplitScreen = toggleSplitScreen;
        window.enableSplitScreen = enableSplitScreen;
        window.disableSplitScreen = disableSplitScreen;
        
        // Make CONFIG globally accessible for debugging/testing
        window.CONFIG = CONFIG;
        
        // Auto-enable split-screen mode by default (after a short delay to ensure DOM is ready)
        setTimeout(() => {
            if (window.innerWidth >= 1200) {
                console.log('🖥️ Auto-enabling split-screen mode (default behavior)');
                enableSplitScreen();
            } else {
                console.log('🖥️ Screen too narrow for auto-enabling split-screen mode, keeping floating mode');
            }
        }, 100);
        
        return ui;
    } catch (error) {
        console.error('❌ Initialization error:', error);
        throw error;
    }
    
    console.log('✅ AG Copilot Enhanced + Signal Analysis ready!');
    console.log('� Rate Limiting: ' + CONFIG.RATE_LIMIT_MODE.toUpperCase() + ' mode (' + (CONFIG.BACKTEST_WAIT/1000) + 's wait, ' + CONFIG.RATE_LIMIT_THRESHOLD + ' burst)');
    console.log('�🚀 Features: Direct API optimization, signal analysis, config generation');
    console.log('🔍 NEW: Analyze successful signals from contract addresses to generate optimal configs');
    console.log('⚙️ NEW: Auto-apply generated configs and start optimization in one click');
    console.log('� NEW: Intelligent chained runs - each run starts from previous best configuration!');
    console.log('�🚀 NEW: Enhanced hard cap system with rolling window rate tracking!');
    console.log('📊 Advanced rate limiting optimizations (BALANCED MODE with ENHANCED HARD CAP):');
    console.log('   • Recovery time: 8.5s (balanced)');
    console.log('   • Safety margin: 1.1x (10% safety buffer)');
    console.log('   • Intra-burst delay: 8ms (balanced)');
    console.log('   • Hard cap: 70 requests/minute enforced with rolling window tracking');
    console.log('   • Expected performance: 60-70 requests/minute');
    console.log('   • Enhanced monitoring: both session and 60-second rolling window rates');
    console.log('   • Dynamic throttling: proportional delays based on excess rate');
    console.log('🔗 Chained optimization benefits:');
    console.log('   • Run 1: Discovers baseline configuration');
    console.log('   • Run 2+: Start from best config found so far (no time wasted rediscovering)');
    console.log('   • Knowledge accumulation: Each run builds on previous discoveries');
    console.log('   • Faster convergence: More time spent optimizing, less time on baseline');
    console.log('🛠️ Performance tools:');
    console.log('   • window.getRateLimitStats() - Current performance metrics');
    console.log('   • window.testBurstRateLimit() - Comprehensive test (75 calls)');
    console.log('   • window.resetRateLimiting() - Reset to optimal settings');
    console.log('   • window.optimizeRateLimiting() - Smart optimization');
    console.log('   • window.enableTurboMode() - Maximum speed mode (⚠️ aggressive)');
    console.log('🆔 Configuration tracking:');
    console.log('   • window.getConfigTracker() - Show current best config info with ID');
    console.log('   • window.getBestConfig() - Display current best configuration');
    console.log('   • window.bestConfigTracker.getDebugInfo() - Raw tracker debug info');
    
    // ========================================
    // 🛠️ UTILITY FUNCTIONS - Global Access
    // ========================================
    
    // Manual UI controls for debugging/testing
    window.showOptimizationTracker = () => {
        const display = document.getElementById('best-config-display');
        if (display) {
            display.style.display = 'block';
            console.log('🖥️ Optimization tracker shown manually');
        }
    };
    
    window.hideOptimizationTracker = () => {
        const display = document.getElementById('best-config-display');
        if (display) {
            display.style.display = 'none';
            console.log('🖥️ Optimization tracker hidden manually');
        }
    };
    
    // Enhanced rate limiting performance monitoring
    window.getRateLimitStats = () => {
        const stats = burstRateLimiter.getStats();
        console.log('📊 Current Rate Limiting Performance:');
        console.log(`   • Requests per minute: ${stats.requestsPerMinute}`);
        console.log(`   • Current burst: ${stats.currentBurstCount}/${stats.burstLimit}`);
        console.log(`   • Total requests: ${stats.totalCalls}`);
        console.log(`   • Rate limit hits: ${stats.rateLimitHits}`);
        console.log(`   • Successful bursts: ${stats.successfulBursts}`);
        console.log(`   • Recovery time: ${(stats.recoveryTime/1000).toFixed(1)}s`);
        console.log(`   • Intra-burst delay: ${stats.intraBurstDelay}ms`);
        return stats;
    };
    
    // Force rate limit adaptation for testing
    window.forceRateLimitAdaptation = () => {
        console.log('🔧 Forcing rate limit adaptation...');
        burstRateLimiter.adaptToBurstLimit();
        return burstRateLimiter.getStats();
    };
    
    // Smart reset that uses learned optimal burst size
    window.smartResetRateLimiting = () => {
        const stats = burstRateLimiter.getStats();
        console.log('🧠 Smart reset using learned optimal burst size...');
        
        if (stats.rateLimitPositions && stats.rateLimitPositions.length > 0) {
            const avgPosition = stats.rateLimitPositions.reduce((a, b) => a + b, 0) / stats.rateLimitPositions.length;
            const optimalSize = Math.max(20, Math.floor(avgPosition - 3)); // 3-call safety buffer
            
            console.log(`📊 Learned data: Rate limits occurred at positions ${stats.rateLimitPositions.join(', ')}`);
            console.log(`📊 Average position: ${avgPosition.toFixed(1)}, Optimal burst size: ${optimalSize}`);
            
            burstRateLimiter.burstLimit = optimalSize;
            burstRateLimiter.optimalBurstSize = optimalSize;
        } else {
            console.log('📊 No learning data available, using conservative reset');
            burstRateLimiter.burstLimit = Math.min(50, burstRateLimiter.originalBurstLimit);
        }
        
        burstRateLimiter.recoveryTime = CONFIG.RATE_LIMIT_RECOVERY * CONFIG.RATE_LIMIT_SAFETY_MARGIN;
        burstRateLimiter.rateLimitHits = 0;
        burstRateLimiter.successfulBursts = 0;
        burstRateLimiter.consecutiveSuccesses = 0;
        burstRateLimiter.callCount = 0;
        burstRateLimiter.lastBurstTime = 0;
        
        console.log(`✅ Smart reset complete: ${burstRateLimiter.burstLimit} calls/burst, ${(burstRateLimiter.recoveryTime/1000).toFixed(1)}s recovery`);
        return burstRateLimiter.getStats();
    };
    
    // Reset rate limiting to original settings
    window.resetRateLimiting = () => {
        console.log('🔄 Resetting rate limiter to original settings...');
        const oldLimit = burstRateLimiter.burstLimit;
        const oldRecovery = burstRateLimiter.recoveryTime;
        
        burstRateLimiter.burstLimit = burstRateLimiter.originalBurstLimit;
        burstRateLimiter.recoveryTime = CONFIG.RATE_LIMIT_RECOVERY * CONFIG.RATE_LIMIT_SAFETY_MARGIN;
        burstRateLimiter.rateLimitHits = 0;
        burstRateLimiter.successfulBursts = 0;
        burstRateLimiter.consecutiveSuccesses = 0;
        burstRateLimiter.callCount = 0;
        burstRateLimiter.lastBurstTime = 0;
        burstRateLimiter.rateLimitPositions = []; // Clear learning data
        
        console.log(`✅ Rate limiter reset:`);
        console.log(`   • Burst limit: ${oldLimit} → ${burstRateLimiter.burstLimit}`);
        console.log(`   • Recovery time: ${(oldRecovery/1000).toFixed(1)}s → ${(burstRateLimiter.recoveryTime/1000).toFixed(1)}s`);
        console.log(`   • Learning data cleared`);
        
        return burstRateLimiter.getStats();
    };
    
    // Smart rate limit optimization based on recent performance
    window.optimizeRateLimiting = () => {
        const stats = burstRateLimiter.getStats();
        console.log('🔧 Optimizing rate limiting based on performance...');
        
        if (stats.rateLimitHits === 0 && stats.successfulBursts > 2) {
            // No rate limits hit recently, we can be more aggressive
            console.log('✅ No recent rate limits - enabling aggressive mode');
            burstRateLimiter.burstLimit = Math.min(burstRateLimiter.originalBurstLimit, burstRateLimiter.burstLimit + 10);
            burstRateLimiter.recoveryTime = Math.max(8000, burstRateLimiter.recoveryTime * 0.85);
            burstRateLimiter.intraBurstDelay = Math.max(5, burstRateLimiter.intraBurstDelay * 0.7);
        } else if (stats.rateLimitHits > 2) {
            // Multiple rate limit hits, be more conservative
            console.log('⚠️ Multiple rate limits detected - enabling conservative mode');
            burstRateLimiter.recoveryTime = Math.min(25000, burstRateLimiter.recoveryTime * 1.15);
            burstRateLimiter.intraBurstDelay = Math.min(50, burstRateLimiter.intraBurstDelay * 1.3);
        }
        
        console.log('🎯 Optimization complete:', burstRateLimiter.getStats());
        return burstRateLimiter.getStats();
    };
    
    // Turbo mode: Maximum speed settings (use at your own risk)
    window.enableTurboMode = () => {
        console.log('🚀 Enabling TURBO MODE - Maximum speed settings!');
        console.log('⚠️ Warning: This pushes limits and may cause more 429s');
        
        const oldSettings = {
            burstLimit: burstRateLimiter.burstLimit,
            recoveryTime: burstRateLimiter.recoveryTime,
            intraBurstDelay: burstRateLimiter.intraBurstDelay
        };
        
        // Turbo settings
        burstRateLimiter.burstLimit = burstRateLimiter.originalBurstLimit; // Full burst
        burstRateLimiter.recoveryTime = 8000; // 8 second recovery
        burstRateLimiter.intraBurstDelay = 5; // 5ms between calls
        burstRateLimiter.rateLimitHits = 0; // Reset hits
        burstRateLimiter.successfulBursts = 0; // Reset success count
        
        console.log('🔥 TURBO MODE ENABLED:');
        console.log(`   • Burst limit: ${oldSettings.burstLimit} → ${burstRateLimiter.burstLimit}`);
        console.log(`   • Recovery time: ${(oldSettings.recoveryTime/1000).toFixed(1)}s → ${(burstRateLimiter.recoveryTime/1000).toFixed(1)}s`);
        console.log(`   • Intra-burst delay: ${oldSettings.intraBurstDelay}ms → ${burstRateLimiter.intraBurstDelay}ms`);
        console.log('📊 Expected: 200-400 requests/minute (if API allows)');
        
        return burstRateLimiter.getStats();
    };
    
    // Test the API with current UI config (enhanced with performance monitoring)
    window.testCurrentConfig = async () => {
        console.log('🧪 Testing current UI configuration...');
        const startTime = Date.now();
        const initialStats = burstRateLimiter.getStats();
        
        try {
            // Extract current config from UI
            const currentConfig = await extractCurrentConfig();
            const result = await testConfigurationAPI(currentConfig, 'Manual Test');
            
            const duration = Date.now() - startTime;
            const finalStats = burstRateLimiter.getStats();
            
            console.log('✅ Test completed in', (duration/1000).toFixed(1), 'seconds');
            console.log('📊 Performance impact:');
            console.log(`   • Requests made: ${finalStats.totalCalls - initialStats.totalCalls}`);
            console.log(`   • Current rate: ${finalStats.requestsPerMinute} req/min`);
            
            if (result.success) {
                console.log('✅ Test successful:', result.metrics);
                
                // Update tracker with test result
                if (window.optimizationTracker) {
                    window.optimizationTracker.setCurrentBest({
                        metrics: result.metrics,
                        config: currentConfig
                    }, 'Manual Test');
                }
                
                return result;
            } else {
                console.log('❌ Test failed:', result.error);
                return result;
            }
        } catch (error) {
            console.log('❌ Test error:', error.message);
            return { success: false, error: error.message };
        }
    };
    
    // Test burst rate limiting performance (enhanced for better demonstration)
    window.testBurstRateLimit = async () => {
        console.log('🚀 Testing Enhanced Burst Rate Limiting Performance...');
        console.log('📊 This will test multiple bursts to demonstrate the speed improvement');
        
        const simpleConfig = { basic: { "Min MCAP (USD)": 5000, "Max MCAP (USD)": 15000 } };
        const initialStats = burstRateLimiter.getStats();
        
        console.log(`📊 Initial burst limiter: ${initialStats.burstLimit} calls/burst, ${(initialStats.recoveryTime/1000).toFixed(1)}s recovery`);
        console.log(`📊 Expected performance: ~${Math.round((initialStats.burstLimit / (initialStats.recoveryTime/1000 + initialStats.burstLimit * 0.1)) * 60)} requests/minute\n`);
        
        let totalSuccessCount = 0;
        let totalFailureCount = 0;
        const overallStartTime = Date.now();
        
        // Test 3 full bursts to demonstrate the pattern
        const burstCount = 3;
        const callsPerBurst = Math.min(25, initialStats.burstLimit); // Test 25 calls per burst or burst limit, whichever is smaller
        
        for (let burstNum = 1; burstNum <= burstCount; burstNum++) {
            console.log(`\n🔥 === BURST ${burstNum}/${burstCount} === (${callsPerBurst} calls)`);
            const burstStartTime = Date.now();
            let burstSuccess = 0;
            let burstFailure = 0;
            
            for (let i = 1; i <= callsPerBurst; i++) {
                const callStartTime = Date.now();
                const result = await testConfigurationAPI(simpleConfig, `Burst ${burstNum}-${i}`);
                const callDuration = Date.now() - callStartTime;
                
                if (result.success) {
                    burstSuccess++;
                    totalSuccessCount++;
                    if (i % 10 === 0 || i === callsPerBurst) {
                        console.log(`   ✅ Call ${i}/${callsPerBurst}: ${callDuration}ms (${result.metrics.totalTokens} tokens, ${result.metrics.tpPnlPercent?.toFixed(1)}% PnL)`);
                    }
                } else {
                    burstFailure++;
                    totalFailureCount++;
                    console.log(`   ❌ Call ${i}/${callsPerBurst}: ${callDuration}ms - ${result.error}`);
                    
                    // If it's a rate limit, show adaptation
                    if (result.isRateLimit) {
                        const adaptedStats = burstRateLimiter.getStats();
                        console.log(`   📉 Rate limiter adapted: ${adaptedStats.burstLimit} calls/burst, ${(adaptedStats.recoveryTime/1000).toFixed(1)}s recovery`);
                    }
                }
                
                // Show progress every 10 calls
                if (i % 10 === 0) {
                    const currentStats = burstRateLimiter.getStats();
                    const elapsedBurstTime = Date.now() - burstStartTime;
                    const currentRate = Math.round((i / (elapsedBurstTime/1000)) * 60);
                    console.log(`   📊 Progress: ${i}/${callsPerBurst} | Burst: ${currentStats.currentBurstCount}/${currentStats.burstLimit} | Rate: ${currentRate} req/min`);
                }
            }
            
            const burstDuration = Date.now() - burstStartTime;
            const burstRate = Math.round((callsPerBurst / (burstDuration/1000)) * 60);
            console.log(`\n   🎯 Burst ${burstNum} Results:`);
            console.log(`      • Duration: ${(burstDuration/1000).toFixed(1)}s`);
            console.log(`      • Success: ${burstSuccess}/${callsPerBurst} (${(burstSuccess/callsPerBurst*100).toFixed(1)}%)`);
            console.log(`      • Rate: ${burstRate} requests/minute`);
            
            // If not the last burst, show recovery time
            if (burstNum < burstCount) {
                const stats = burstRateLimiter.getStats();
                if (stats.currentBurstCount >= stats.burstLimit) {
                    console.log(`   ⏳ Waiting for recovery (${(stats.recoveryTime/1000).toFixed(1)}s)...`);
                }
            }
        }
        
        const totalDuration = Date.now() - overallStartTime;
        const totalCalls = burstCount * callsPerBurst;
        const overallRate = Math.round((totalCalls / (totalDuration/1000)) * 60);
        const finalStats = burstRateLimiter.getStats();
        
        console.log(`\n🎉 === OVERALL BURST TEST RESULTS ===`);
        console.log(`📊 Test Summary:`);
        console.log(`   • Total time: ${(totalDuration/1000).toFixed(1)}s`);
        console.log(`   • Total calls: ${totalCalls} (${burstCount} bursts × ${callsPerBurst} calls)`);
        console.log(`   • Success rate: ${totalSuccessCount}/${totalCalls} (${(totalSuccessCount/totalCalls*100).toFixed(1)}%)`);
        console.log(`   • Overall rate: ${overallRate} requests/minute`);
        console.log(`   • Average per call: ${(totalDuration/totalCalls).toFixed(0)}ms`);
        
        console.log(`\n📈 Rate Limiter Performance:`);
        console.log(`   • Current burst capacity: ${finalStats.burstLimit}/${finalStats.originalBurstLimit} calls/burst`);
        console.log(`   • Recovery time: ${(finalStats.recoveryTime/1000).toFixed(1)}s`);
        console.log(`   • Rate limit hits: ${finalStats.rateLimitHits}`);
        console.log(`   • Successful bursts: ${finalStats.successfulBursts}`);
        console.log(`   • Intra-burst delay: ${finalStats.intraBurstDelay}ms`);
        
        console.log(`\n💡 Performance Analysis:`);
        if (overallRate > 150) {
            console.log(`🎉 EXCELLENT! Achieving ${overallRate} req/min - This is ~${Math.round(overallRate/26)}x faster than the original 26 req/min!`);
        } else if (overallRate > 100) {
            console.log(`✅ GREAT! Achieving ${overallRate} req/min - This is ~${Math.round(overallRate/26)}x faster than the original 26 req/min!`);
        } else if (overallRate > 60) {
            console.log(`👍 GOOD! Achieving ${overallRate} req/min - This is ~${Math.round(overallRate/26)}x faster than the original 26 req/min!`);
        } else {
            console.log(`⚠️ Rate could be improved. Current: ${overallRate} req/min vs target >100 req/min`);
            console.log(`   Consider checking for 429 errors or network latency issues.`);
        }
        
        // Provide optimization recommendations
        if (finalStats.rateLimitHits > 0) {
            console.log(`\n🔧 Optimization Recommendations:`);
            console.log(`   • Rate limit hits detected (${finalStats.rateLimitHits})`);
            console.log(`   • Burst limit was adapted from ${finalStats.originalBurstLimit} to ${finalStats.burstLimit}`);
            console.log(`   • Consider running window.resetRateLimiting() to reset to optimal settings`);
        } else {
            console.log(`\n✅ No rate limiting issues detected - system is performing optimally!`);
        }
        
        return {
            totalDuration,
            totalCalls,
            overallRate,
            successRate: (totalSuccessCount/totalCalls*100).toFixed(1),
            burstStats: finalStats,
            improvementFactor: Math.round(overallRate/26)
        };
    };
    
    // Quick rate limit check
    window.checkRateLimit = async () => {
        console.log('⏱️ Checking rate limiting with simple config...');
        const simpleConfig = {
            basic: { "Min MCAP (USD)": 1000, "Max MCAP (USD)": 20000 }
        };
        
        const start = Date.now();
        const result = await testConfigurationAPI(simpleConfig, 'Rate Limit Test');
        const duration = Date.now() - start;
        
        console.log(`⏱️ API call took ${duration}ms. Success: ${result.success}`);
        if (!result.success && result.error.includes('429')) {
            console.log('⚠️ Rate limited! Burst limiter may need adjustment');
        }
        
        return { duration, success: result.success, rateLimited: result.error?.includes('429') };
    };
    
    // Configuration Tracker Debug Functions
    window.getConfigTracker = () => {
        console.log('📋 Current Best Configuration Tracker:');
        if (window.bestConfigTracker) {
            const debug = window.bestConfigTracker.getDebugInfo();
            Object.entries(debug).forEach(([key, value]) => {
                console.log(`   • ${key}: ${value}`);
            });
            return debug;
        } else {
            console.log('   ⚠️ bestConfigTracker not initialized');
            return null;
        }
    };
    
    window.getBestConfig = () => {
        if (window.bestConfigTracker) {
            const config = window.bestConfigTracker.getConfig();
            if (config) {
                console.log(`📋 Best Configuration (ID: ${window.bestConfigTracker.id.substring(0, 8)}):`);
                console.log(JSON.stringify(config, null, 2));
            } else {
                console.log('❌ No best configuration available');
            }
            return config;
        } else {
            console.log('⚠️ bestConfigTracker not initialized');
            return null;
        }
    };
    
    // Test connectivity
    console.log('Testing UI connectivity...');
    try {
        const connectivityTest = await testConnectivity();
        if (connectivityTest.success) {
            console.log(`✅ UI interaction ready! ${connectivityTest.message}`);
        } else {
            console.log(`❌ UI connectivity test failed: ${connectivityTest.error}`);
        }
    } catch (error) {
        console.log(`❌ UI connectivity test failed: ${error.message}`);
    }
    
    // Add window resize listener to automatically disable split-screen on narrow screens
    window.addEventListener('resize', () => {
        if (isSplitScreenMode && window.innerWidth < 1200) {
            console.log('⚠️ Screen became too narrow, disabling split-screen mode');
            disableSplitScreen();
        }
    });
    
})();
