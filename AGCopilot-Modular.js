// ========================================
// 🤖 AG Co-Pilot Enhanced + Signal Analysis v2.0 - MODULAR VERSION
// ========================================
// Dynamic module loading from GitHub for better maintainability

(async function () {
    console.clear();
    console.log('%c🤖 AG Co-Pilot Enhanced + Signal Analysis v2.0 (Modular) 🤖', 'color: blue; font-size: 16px; font-weight: bold;');
    console.log('%c🔗 Dynamic Module Loading + Direct API Optimization + Signal Analysis', 'color: green; font-size: 12px;');

    // ========================================
    // 🔄 MODULE LOADING
    // ========================================
    
    // GitHub repository base URL for modules
    const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/jumprCrypto/AGCopilot/main/modules';
    
    // Simple module loader (embedded for bootstrapping)
    async function loadModule(moduleName) {
        const url = `${GITHUB_BASE_URL}/${moduleName}.js`;
        console.log(`📦 Loading ${moduleName}...`);
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const code = await response.text();
            
            // Create module scope with all necessary globals
            const moduleScope = { 
                exports: {},
                console,
                window,
                document,
                fetch,
                setTimeout,
                setInterval,
                clearTimeout,
                clearInterval,
                Date,
                Math,
                JSON,
                Promise
            };
            
            // Transform ES6 exports to CommonJS style
            let transformedCode = code;
            
            // First, comment out all import statements
            transformedCode = transformedCode.replace(/import\s+.*?from\s+['"][^'"]*['"];?\s*/g, '// $&');
            
            // Simple regex-based transformation for exports
            const exportMatches = [];
            
            // Find all export patterns and collect them
            transformedCode = transformedCode.replace(/export\s+(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, (match, type, name) => {
                exportMatches.push(name);
                return `${type} ${name}`;
            });
            
            transformedCode = transformedCode.replace(/export\s+function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, (match, name) => {
                exportMatches.push(name);
                return `function ${name}`;
            });
            
            // Handle export async function
            transformedCode = transformedCode.replace(/export\s+async\s+function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, (match, name) => {
                exportMatches.push(name);
                return `async function ${name}`;
            });
            
            transformedCode = transformedCode.replace(/export\s+class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, (match, name) => {
                exportMatches.push(name);
                return `class ${name}`;
            });
            
            // Handle export { ... } syntax
            transformedCode = transformedCode.replace(/export\s*{\s*([^}]+)\s*};?\s*/g, (match, exportList) => {
                const names = exportList.split(',').map(exp => exp.trim().split(' as ')[0].trim());
                exportMatches.push(...names);
                return '// ' + match; // Comment out the export line
            });
            
            // Handle any remaining standalone export statements
            transformedCode = transformedCode.replace(/export\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, (match, name) => {
                exportMatches.push(name);
                return name;
            });
            
            // Remove any remaining export keywords as final cleanup
            transformedCode = transformedCode.replace(/export\s+/g, '');
            
            // Add exports at the end
            if (exportMatches.length > 0) {
                const exportStatements = exportMatches.map(name => `exports.${name} = ${name};`).join('\n');
                transformedCode += '\n\n// Auto-generated exports\n' + exportStatements;
            }
            
            // Execute module with proper error handling
            try {
                const moduleFunction = new Function(
                    'exports', 'console', 'window', 'document', 'fetch', 'setTimeout', 'setInterval', 
                    'clearTimeout', 'clearInterval', 'Date', 'Math', 'JSON', 'Promise',
                    transformedCode + '\nreturn exports;'
                );
                
                const exports = moduleFunction(
                    moduleScope.exports, moduleScope.console, moduleScope.window, moduleScope.document,
                    moduleScope.fetch, moduleScope.setTimeout, moduleScope.setInterval,
                    moduleScope.clearTimeout, moduleScope.clearInterval, moduleScope.Date,
                    moduleScope.Math, moduleScope.JSON, moduleScope.Promise
                );
                
                console.log(`✅ Loaded ${moduleName} with exports:`, Object.keys(exports));
                return exports;
                
            } catch (execError) {
                console.error(`❌ Execution error in ${moduleName}:`, execError);
                console.log('Transformed code:', transformedCode.substring(0, 500) + '...');
                throw execError;
            }
            
        } catch (error) {
            console.error(`❌ Failed to load ${moduleName}:`, error);
            throw error;
        }
    }

    // Load all required modules
    console.log('🚀 Loading AG Copilot modules...');
    
    try {
        // Load core modules first (required)
        const [
            configModule,
            utilitiesModule,
            rateLimiterModule,
            apiClientModule,
            scoringModule,
            uiTrackerModule
        ] = await Promise.all([
            loadModule('config'),
            loadModule('utilities'),
            loadModule('rate-limiter'),
            loadModule('api-client'),
            loadModule('scoring'),
            loadModule('ui-tracker')
        ]);

        // Load optimization modules (optional)
        let advancedOptimizationModule = null;
        let enhancedOptimizerModule = null;
        let chainedOptimizerModule = null;
        
        try {
            [advancedOptimizationModule, enhancedOptimizerModule, chainedOptimizerModule] = await Promise.all([
                loadModule('advanced-optimization'),
                loadModule('enhanced-optimizer'),
                loadModule('chained-optimizer')
            ]);
            console.log('✅ Advanced optimization modules loaded!');
        } catch (error) {
            console.warn('⚠️ Advanced optimization modules not available:', error.message);
        }

        // Load UI module (optional)
        let uiModule = null;
        try {
            uiModule = await loadModule('ui');
            console.log('✅ UI module loaded!');
        } catch (error) {
            console.warn('⚠️ UI module not available:', error.message);
            console.log('🔧 This is expected if the ui.js module hasn\'t been pushed to GitHub yet.');
            console.log('📋 To test the UI locally, use AGCopilot-Local-Test.js instead.');
        }

        console.log('✅ All modules loaded successfully!');

        // ========================================
        // 🎯 EXTRACT MODULE EXPORTS
        // ========================================
        
        // Configuration
        const { CONFIG, PARAM_RULES, COMPLETE_CONFIG_TEMPLATE, PRESETS } = configModule;
        
        // Utilities
        const { 
            deepClone, 
            ensureCompleteConfig, 
            getTriggerMode, 
            cleanConfiguration,
            formatTimestamp,
            formatMcap,
            formatPercent,
            removeOutliers
        } = utilitiesModule;
        
        // Rate Limiting
        const { BurstRateLimiter, APIRateLimiter, sleep } = rateLimiterModule;
        
        // API Client
        const { BacktesterAPI, fetchWithRetry, getTokenInfo, getAllTokenSwaps } = apiClientModule;
        
        // Scoring
        const { calculateRobustScore } = scoringModule;
        
        // UI Tracking
        const { OptimizationTracker, extractMetricsFromUI } = uiTrackerModule;
        
        // Advanced Optimization (optional)
        let LatinHypercubeSampler = null;
        let GeneticOptimizer = null;
        let SimulatedAnnealing = null;
        if (advancedOptimizationModule) {
            ({ LatinHypercubeSampler, GeneticOptimizer, SimulatedAnnealing } = advancedOptimizationModule);
        }
        
        // Enhanced Optimizer (optional)
        let EnhancedOptimizer = null;
        if (enhancedOptimizerModule) {
            ({ EnhancedOptimizer } = enhancedOptimizerModule);
        }
        
        // Chained Optimizer (optional)
        let ChainedOptimizer = null;
        if (chainedOptimizerModule) {
            ({ ChainedOptimizer } = chainedOptimizerModule);
        }
        
        // UI Components (optional)
        let createUI = null;
        let setupEventHandlers = null;
        let updateModuleStatus = null;
        if (uiModule) {
            ({ createUI, setupEventHandlers, updateModuleStatus } = uiModule);
        }

        // ========================================
        // 🛠️ INITIALIZE CORE COMPONENTS
        // ========================================
        
        // Initialize window.STOPPED for global access
        window.STOPPED = false;

        // Create rate limiter instances
        const rateLimiter = new APIRateLimiter(CONFIG.REQUEST_DELAY); // For signal analysis
        const burstRateLimiter = new BurstRateLimiter(
            CONFIG.RATE_LIMIT_THRESHOLD, 
            CONFIG.RATE_LIMIT_RECOVERY, 
            CONFIG.RATE_LIMIT_SAFETY_MARGIN,
            CONFIG
        ); // For backtester API - Enhanced with adaptive behavior

        // Initialize the API client
        const backtesterAPI = new BacktesterAPI(CONFIG, getTriggerMode);

        // Global optimization tracker instance
        window.optimizationTracker = new OptimizationTracker();

        // ========================================
        // 📊 CORE FUNCTIONS
        // ========================================

        // ========================================
        // 🌐 SIGNAL ANALYSIS API FUNCTIONS (using module functions)
        // ========================================

        // Note: getTokenInfo and getAllTokenSwaps are imported from apiClientModule

        // ========================================
        // 🔄 SIGNAL PROCESSING & CONFIG GENERATION
        // ========================================

        // Process token data and swaps into structured format
        function processTokenData(tokenInfo, swaps) {
            return {
                // Basic Info
                contractAddress: tokenInfo.address || 'N/A',
                name: tokenInfo.name || 'Unknown',
                symbol: tokenInfo.symbol || 'N/A',
                
                // Market Data
                signalMcap: tokenInfo.signalMcap || 0,
                signalPrice: tokenInfo.signalPrice || 0,
                currentMcap: tokenInfo.currentMcap || 0,
                currentPrice: tokenInfo.currentPrice || 0,
                athMcap: tokenInfo.athMcap || 0,
                athPrice: tokenInfo.athPrice || 0,
                
                // Performance Metrics
                athMultiplier: tokenInfo.athMcap && tokenInfo.signalMcap ? 
                    (tokenInfo.athMcap / tokenInfo.signalMcap).toFixed(2) + 'x' : 'N/A',
                athMultiplierRaw: tokenInfo.athMcap && tokenInfo.signalMcap ? 
                    (tokenInfo.athMcap / tokenInfo.signalMcap) : 0,
                currentMultiplier: tokenInfo.currentMcap && tokenInfo.signalMcap ? 
                    (tokenInfo.currentMcap / tokenInfo.signalMcap).toFixed(2) + 'x' : 'N/A',
                
                // Signal Analysis
                totalSignals: swaps.length,
                
                // AG Copilot Parameters (from signal data)
                minMcap: tokenInfo.signalMcap || 0,
                maxMcap: Math.max(tokenInfo.signalMcap || 0, tokenInfo.currentMcap || 0, tokenInfo.athMcap || 0),
                deployerAge: tokenInfo.deployerAge || 0,
                tokenAge: tokenInfo.tokenAge || 0,
                agScore: tokenInfo.agScore || 0,
                holders: tokenInfo.holders || 0,
                uniqueWallets: tokenInfo.uniqueWallets || 0,
                kycWallets: tokenInfo.kycWallets || 0,
                bundledPercent: tokenInfo.bundledPercent || 0,
                deployerBalance: tokenInfo.deployerBalance || 0,
                buyRatio: tokenInfo.buyRatio || 50,
                volMcapRatio: tokenInfo.volMcapRatio || 0,
                drainedPercent: tokenInfo.drainedPercent || 0,
                drainedCount: tokenInfo.drainedCount || 0,
                ttc: tokenInfo.ttc || 0,
                liquidity: tokenInfo.liquidity || 0,
                winPred: tokenInfo.winPred || 0
            };
        }

        // Generate batch summary from multiple token analyses
        function generateBatchSummary(allTokenData) {
            if (!allTokenData || allTokenData.length === 0) {
                return {
                    totalTokens: 0,
                    avgMultiplier: 0,
                    successRate: 0,
                    topPerformers: [],
                    avgSignalMcap: 0,
                    avgAthMcap: 0
                };
            }

            const successfulTokens = allTokenData.filter(token => token.athMultiplierRaw > 1);
            
            return {
                totalTokens: allTokenData.length,
                successfulTokens: successfulTokens.length,
                successRate: (successfulTokens.length / allTokenData.length * 100).toFixed(1) + '%',
                avgMultiplier: (allTokenData.reduce((sum, token) => sum + (token.athMultiplierRaw || 0), 0) / allTokenData.length).toFixed(2) + 'x',
                topPerformers: allTokenData
                    .sort((a, b) => (b.athMultiplierRaw || 0) - (a.athMultiplierRaw || 0))
                    .slice(0, 5)
                    .map(token => ({
                        name: token.name,
                        symbol: token.symbol,
                        multiplier: token.athMultiplier
                    })),
                avgSignalMcap: Math.round(allTokenData.reduce((sum, token) => sum + (token.signalMcap || 0), 0) / allTokenData.length),
                avgAthMcap: Math.round(allTokenData.reduce((sum, token) => sum + (token.athMcap || 0), 0) / allTokenData.length)
            };
        }

        // Analyze signals to find optimal parameter bounds
        function analyzeSignalCriteria(allTokenData, bufferPercent = 10, outlierMethod = 'none', useClustering = true) {
            if (!allTokenData || allTokenData.length === 0) {
                console.warn('⚠️ No token data provided for analysis');
                return null;
            }

            console.log(`🔍 Analyzing ${allTokenData.length} signals with ${bufferPercent}% buffer, outlier method: ${outlierMethod}, clustering: ${useClustering}`);

            // Filter for successful tokens (those that achieved >1x multiplier)
            const successfulTokens = allTokenData.filter(token => token.athMultiplierRaw > 1);
            
            if (successfulTokens.length === 0) {
                console.warn('⚠️ No successful tokens found (none achieved >1x multiplier)');
                return generateFullAnalysis(allTokenData, bufferPercent, outlierMethod);
            }

            console.log(`✅ Found ${successfulTokens.length} successful tokens out of ${allTokenData.length}`);

            if (useClustering && successfulTokens.length >= 10) {
                return findSignalClusters(successfulTokens, allTokenData, 5);
            } else {
                return generateFullAnalysis(successfulTokens, bufferPercent, outlierMethod);
            }
        }

        // Generate analysis from signals (core logic)
        function generateAnalysisFromSignals(signals, bufferPercent, outlierMethod) {
            const getClusteringParameters = () => [
                'minMcap', 'agScore', 'deployerAge', 'tokenAge', 'holders', 
                'uniqueWallets', 'kycWallets', 'bundledPercent', 'deployerBalance',
                'buyRatio', 'volMcapRatio', 'drainedPercent', 'drainedCount', 
                'ttc', 'liquidity', 'winPred'
            ];

            const analysis = {
                tokenCount: signals.length,
                successRate: signals.length > 0 ? '100%' : '0%', // All provided signals are "successful"
                avgMultiplier: signals.length > 0 ? 
                    (signals.reduce((sum, s) => sum + (s.athMultiplierRaw || 0), 0) / signals.length).toFixed(2) + 'x' : '0x',
                parameters: {}
            };

            // Analyze each parameter
            const parameters = getClusteringParameters();
            for (const param of parameters) {
                const values = signals.map(s => s[param]).filter(v => v !== undefined && v !== null && !isNaN(v));
                
                if (values.length === 0) continue;

                // Remove outliers if requested
                const cleanedValues = removeOutliers(values, outlierMethod);
                
                if (cleanedValues.length === 0) continue;

                const min = Math.min(...cleanedValues);
                const max = Math.max(...cleanedValues);
                const avg = cleanedValues.reduce((sum, val) => sum + val, 0) / cleanedValues.length;
                
                // Apply buffer
                const buffer = (max - min) * (bufferPercent / 100);
                const bufferedMin = Math.max(0, min - buffer);
                const bufferedMax = max + buffer;

                analysis.parameters[param] = {
                    original: { min, max, avg: avg.toFixed(2) },
                    buffered: { 
                        min: bufferedMin, 
                        max: bufferedMax, 
                        avg: avg.toFixed(2) 
                    },
                    sampleSize: cleanedValues.length,
                    outlierMethod
                };
            }

            return analysis;
        }

        // Generate full analysis (no clustering)
        function generateFullAnalysis(allSignals, bufferPercent, outlierMethod) {
            return {
                type: 'full',
                analysis: generateAnalysisFromSignals(allSignals, bufferPercent, outlierMethod),
                clusters: null
            };
        }

        // Find signal clusters (simplified version)
        function findSignalClusters(signals, tokenData, minClusterTokens) {
            // For simplicity in modular version, just return full analysis
            // Full clustering implementation would require more complex logic
            console.log('🔍 Clustering analysis simplified in modular version');
            return generateFullAnalysis(signals, 10, 'none');
        }

        // Generate tightest possible configuration from analysis
        function generateTightestConfig(analysis) {
            if (!analysis || !analysis.analysis || !analysis.analysis.parameters) {
                console.warn('⚠️ Invalid analysis data provided');
                return null;
            }

            const params = analysis.analysis.parameters;
            const config = deepClone(COMPLETE_CONFIG_TEMPLATE);

            // Map analysis parameters to config sections
            const paramMapping = {
                'minMcap': { section: 'basic', name: 'Min MCAP (USD)' },
                'agScore': { section: 'tokenDetails', name: 'Min AG Score' },
                'deployerAge': { section: 'tokenDetails', name: 'Min Deployer Age (min)' },
                'tokenAge': { section: 'tokenDetails', name: 'Min Token Age (sec)' },
                'holders': { section: 'wallets', name: 'Min Holders' },
                'uniqueWallets': { section: 'wallets', name: 'Min Unique Wallets' },
                'kycWallets': { section: 'wallets', name: 'Min KYC Wallets' },
                'bundledPercent': { section: 'risk', name: 'Max Bundled %' },
                'deployerBalance': { section: 'risk', name: 'Min Deployer Balance (SOL)' },
                'buyRatio': { section: 'risk', name: 'Min Buy Ratio %' },
                'volMcapRatio': { section: 'risk', name: 'Max Vol MCAP %' },
                'drainedPercent': { section: 'risk', name: 'Max Drained %' },
                'drainedCount': { section: 'risk', name: 'Max Drained Count' },
                'ttc': { section: 'advanced', name: 'Min TTC (sec)' },
                'liquidity': { section: 'advanced', name: 'Max Liquidity %' },
                'winPred': { section: 'advanced', name: 'Min Win Pred %' }
            };

            // Apply parameter bounds to config
            for (const [paramKey, mapping] of Object.entries(paramMapping)) {
                if (params[paramKey] && params[paramKey].buffered) {
                    const value = params[paramKey].buffered.min;
                    if (!isNaN(value) && value >= 0) {
                        config[mapping.section][mapping.name] = Math.round(value * 100) / 100;
                    }
                }
            }

            // Set reasonable max values
            if (params['minMcap'] && params['minMcap'].buffered && params['minMcap'].buffered.max) {
                config.basic['Max MCAP (USD)'] = Math.round(params['minMcap'].buffered.max);
            }

            return config;
        }

        // ========================================
        // 🚀 MAIN OPTIMIZATION FUNCTIONS
        // ========================================

        // Run full optimization with advanced techniques
        async function runOptimization(initialConfig = null, options = {}) {
            console.log('🚀 Starting full optimization...');
            
            if (!EnhancedOptimizer) {
                console.warn('⚠️ Enhanced optimizer not available, using basic optimization');
                return await basicOptimization(initialConfig);
            }

            const optimizer = new EnhancedOptimizer(initialConfig);
            
            // Initialize advanced components if available
            if (LatinHypercubeSampler && SimulatedAnnealing && GeneticOptimizer) {
                optimizer.initializeAdvancedComponents(LatinHypercubeSampler, SimulatedAnnealing, GeneticOptimizer);
                console.log('✅ Advanced optimization components initialized');
            } else {
                console.log('⚠️ Some advanced optimization components not available');
            }

            try {
                // Start the optimization
                const result = await optimizer.runOptimization();
                
                if (result && result.bestConfig) {
                    console.log(`✅ Optimization completed! Best score: ${result.bestScore?.toFixed(1) || 'N/A'}`);
                    
                    // Update global tracking
                    if (window.optimizationTracker && result.bestConfig && result.bestMetrics) {
                        window.optimizationTracker.updateBestConfig(
                            result.bestConfig, 
                            result.bestMetrics, 
                            result.bestScore || 0
                        );
                    }
                    
                    return {
                        success: true,
                        bestConfig: result.bestConfig,
                        bestScore: result.bestScore,
                        bestMetrics: result.bestMetrics,
                        testCount: result.testCount,
                        runtime: result.runtime,
                        type: 'enhanced'
                    };
                } else {
                    console.warn('⚠️ Optimization returned invalid result');
                    return await basicOptimization(initialConfig);
                }
                
            } catch (error) {
                console.error('❌ Enhanced optimization failed:', error);
                console.log('🔄 Falling back to basic optimization...');
                return await basicOptimization(initialConfig);
            }
        }

        // Basic optimization fallback
        async function basicOptimization(initialConfig = null) {
            console.log('🔧 Running basic optimization...');
            
            try {
                // Use initial config or create a reasonable default
                let config = initialConfig;
                if (!config) {
                    config = deepClone(COMPLETE_CONFIG_TEMPLATE);
                    // Set some reasonable defaults for testing
                    config.basic["Min MCAP (USD)"] = 10000;
                    config.basic["Max MCAP (USD)"] = 50000;
                    config.tokenDetails["Min AG Score"] = 3;
                    config.wallets["Min Unique Wallets"] = 1;
                    config.wallets["Max Unique Wallets"] = 8;
                    config.risk["Max Bundled %"] = 50;
                    config.advanced["Max Liquidity %"] = 100;
                }
                
                const result = await testConfigurationAPI(config, 'Basic Optimization Test');
                
                if (result.success) {
                    console.log('✅ Basic optimization completed');
                    
                    // Update global tracking
                    if (window.optimizationTracker && result.metrics) {
                        const score = calculateRobustScore(result.metrics, CONFIG);
                        window.optimizationTracker.updateBestConfig(
                            config, 
                            result.metrics, 
                            score?.score || result.metrics.tpPnlPercent || 0
                        );
                    }
                    
                    return { 
                        success: true, 
                        bestConfig: config, 
                        bestMetrics: result.metrics,
                        bestScore: result.metrics.tpPnlPercent || 0,
                        testCount: 1,
                        runtime: 1,
                        type: 'basic'
                    };
                } else {
                    console.warn('❌ Basic optimization failed:', result.error);
                    return { 
                        success: false, 
                        error: result.error,
                        type: 'basic'
                    };
                }
            } catch (error) {
                console.error('❌ Basic optimization error:', error);
                return { 
                    success: false, 
                    error: error.message,
                    type: 'basic'
                };
            }
        }

        // Chained optimization runs
        async function chainedOptimization(runs = CONFIG.CHAIN_RUN_COUNT, initialConfig = null) {
            console.log(`🔗 Starting chained optimization (${runs} runs)...`);
            
            if (ChainedOptimizer && EnhancedOptimizer) {
                console.log('✅ Using advanced ChainedOptimizer class');
                const chainedOptimizer = new ChainedOptimizer();
                return await chainedOptimizer.runChainedOptimization(runs, CONFIG.MAX_RUNTIME_MIN / runs, EnhancedOptimizer);
            }
            
            // Fallback to simple implementation
            console.log('⚠️ Using fallback chained optimization');
            let bestOverallConfig = null;
            let bestOverallScore = -Infinity;
            let bestOverallMetrics = null;
            const results = [];

            for (let i = 0; i < runs; i++) {
                if (window.STOPPED) {
                    console.log('🛑 Chained optimization stopped by user');
                    break;
                }

                console.log(`\n🔗 === CHAIN RUN ${i + 1}/${runs} ===`);
                
                const runConfig = i === 0 ? initialConfig : bestOverallConfig; // Use best config from previous run
                const result = await runOptimization(runConfig, { chainRun: i + 1 });
                
                if (result.success) {
                    results.push(result);
                    
                    const score = calculateRobustScore(result.bestMetrics, CONFIG);
                    if (score && score.score > bestOverallScore) {
                        bestOverallScore = score.score;
                        bestOverallConfig = result.bestConfig;
                        bestOverallMetrics = result.bestMetrics;
                        console.log(`🏆 New best score: ${score.score.toFixed(1)}`);
                    }
                } else {
                    console.warn(`❌ Chain run ${i + 1} failed:`, result.error);
                }
            }

            console.log(`\n🎉 Chained optimization completed! ${results.length}/${runs} successful runs`);
            
            if (bestOverallConfig) {
                console.log(`🏆 Best overall score: ${bestOverallScore.toFixed(1)}`);
                console.log('📋 Best configuration:', bestOverallConfig);
                
                // Update global tracker
                if (window.optimizationTracker) {
                    window.optimizationTracker.updateBestConfig(bestOverallConfig, bestOverallMetrics, bestOverallScore);
                }
            }

            return {
                success: results.length > 0,
                bestConfig: bestOverallConfig,
                bestMetrics: bestOverallMetrics,
                bestScore: bestOverallScore,
                results,
                totalRuns: runs,
                successfulRuns: results.length
            };
        }

        // Test configuration via API call (New: Direct API instead of UI scraping)
        async function testConfigurationAPI(config, testName = 'API Test') {
            try {
                console.log(`🧪 Testing via API: ${testName}`);
                
                // Clean the configuration before testing
                const cleanedConfig = cleanConfiguration(config);
                
                // Use the new API to get results directly
                const result = await backtesterAPI.fetchResults(cleanedConfig, burstRateLimiter);
                
                if (!result.success) {
                    if (result.error && result.error.includes('Rate limited')) {
                        window.optimizationTracker.rateLimitFailures++;
                    }
                    return {
                        success: false,
                        error: result.error || 'Unknown API error'
                    };
                }
                
                const metrics = result.metrics;
                
                // Validate metrics before proceeding
                if (!metrics) {
                    return {
                        success: false,
                        error: 'No metrics returned from API'
                    };
                }
                
                if (metrics.tpPnlPercent === undefined || metrics.totalTokens === undefined) {
                    return {
                        success: false,
                        error: `Missing required metrics: tpPnlPercent=${metrics.tpPnlPercent}, totalTokens=${metrics.totalTokens}`
                    };
                }
                
                // Calculate robust score for logging
                const robustScoring = calculateRobustScore(metrics, CONFIG);
                if (robustScoring && CONFIG.USE_ROBUST_SCORING) {
                    console.log(`📊 ${testName}: Score=${robustScoring.score.toFixed(1)}, TP PnL=${metrics.tpPnlPercent.toFixed(1)}%, Tokens=${metrics.totalTokens}, Win Rate=${(metrics.winRate || 0).toFixed(1)}%`);
                } else {
                    console.log(`📊 ${testName}: TP PnL=${metrics.tpPnlPercent.toFixed(1)}%, Tokens=${metrics.totalTokens}, Win Rate=${(metrics.winRate || 0).toFixed(1)}%`);
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

        // Test configuration via UI interaction (Legacy: kept as fallback)
        async function testConfigurationUI(config, testName = 'UI Test') {
            try {
                console.log(`🧪 Testing: ${testName}`);
                
                // For modular version, we'll use a simplified approach
                // since applyConfigToUI is complex and website-specific
                console.log('⚠️ UI testing not fully implemented in modular version');
                console.log('🔄 Falling back to API testing...');
                
                // Fall back to API testing
                return await testConfigurationAPI(config, testName + ' (API Fallback)');
                
            } catch (error) {
                console.warn(`❌ ${testName} failed: ${error.message}`);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        // ========================================
        // 🚀 EXPOSE GLOBAL API
        // ========================================
        
        // Expose main functions to global scope for console access
        window.AGCopilot = {
            // Core functions
            testConfigurationAPI,
            testConfigurationUI,
            
            // Main optimization functions
            runOptimization,
            basicOptimization,
            chainedOptimization,
            
            // Quick test function for verification
            quickTest: async () => {
                console.log('🧪 Running quick system test...');
                try {
                    const testConfig = {
                        basic: { "Min MCAP (USD)": 15000, "Max MCAP (USD)": 35000 },
                        tokenDetails: { "Min AG Score": 4 },
                        wallets: { "Min Unique Wallets": 2, "Max Unique Wallets": 6 },
                        risk: { "Max Bundled %": 30 },
                        advanced: { "Max Liquidity %": 80 }
                    };
                    
                    const result = await testConfigurationAPI(testConfig, 'Quick Test');
                    if (result.success) {
                        console.log('✅ Quick test passed!');
                        console.log(`📊 Result: ${result.metrics.tpPnlPercent?.toFixed(1)}% PnL, ${result.metrics.totalTokens} tokens`);
                        return { success: true, result };
                    } else {
                        console.warn('❌ Quick test failed:', result.error);
                        return { success: false, error: result.error };
                    }
                } catch (error) {
                    console.error('❌ Quick test error:', error);
                    return { success: false, error: error.message };
                }
            },
            
            // Signal analysis functions
            getTokenInfo,
            getAllTokenSwaps,
            processTokenData,
            generateBatchSummary,
            analyzeSignalCriteria,
            generateTightestConfig,
            
            // Modules and utilities
            CONFIG,
            PARAM_RULES,
            PRESETS,
            calculateRobustScore: (metrics) => calculateRobustScore(metrics, CONFIG),
            optimizationTracker: window.optimizationTracker,
            
            // Rate limiting
            burstRateLimiter,
            rateLimiter,
            
            // API client
            backtesterAPI,
            fetchWithRetry,
            
            // Utilities
            deepClone,
            ensureCompleteConfig: (config) => ensureCompleteConfig(config, COMPLETE_CONFIG_TEMPLATE),
            getTriggerMode,
            cleanConfiguration,
            
            // Signal analysis utilities
            formatTimestamp,
            formatMcap,
            formatPercent,
            removeOutliers,
            
            // Advanced optimization classes (if available)
            ...(LatinHypercubeSampler && { LatinHypercubeSampler }),
            ...(GeneticOptimizer && { GeneticOptimizer }),
            ...(SimulatedAnnealing && { SimulatedAnnealing }),
            ...(EnhancedOptimizer && { EnhancedOptimizer }),
            ...(ChainedOptimizer && { ChainedOptimizer }),
            
            // Module reloading
            reloadModules: async () => {
                console.log('🔄 Reloading modules...');
                // Simple page refresh for now - could be enhanced to reload specific modules
                location.reload();
            }
        };

        console.log('🎉 AG Copilot Enhanced (Modular Version) loaded successfully!');
        console.log('💡 Access via: window.AGCopilot');
        console.log('📚 Available methods:', Object.keys(window.AGCopilot).sort().join(', '));
        console.log('\n🚀 Quick Start Examples:');
        console.log('🧪 Quick test: await window.AGCopilot.quickTest()');
        console.log('💡 Test config: await window.AGCopilot.testConfigurationAPI({basic: {"Min MCAP (USD)": 15000, "Max MCAP (USD)": 35000}})');
        console.log('🔬 Run optimization: await window.AGCopilot.runOptimization()');
        console.log('🔗 Chained optimization: await window.AGCopilot.chainedOptimization(3)');
        console.log('📊 Analyze signals: await window.AGCopilot.analyzeSignalCriteria(tokenData)');
        console.log('🎯 Generate config: window.AGCopilot.generateTightestConfig(analysis)');
        console.log('\n📈 Module Status:');
        console.log(`✅ Core modules: ${configModule ? '✓' : '✗'} Config, ${utilitiesModule ? '✓' : '✗'} Utilities, ${apiClientModule ? '✓' : '✗'} API`);
        console.log(`✅ Optimization: ${EnhancedOptimizer ? '✓' : '✗'} Enhanced, ${ChainedOptimizer ? '✓' : '✗'} Chained, ${LatinHypercubeSampler ? '✓' : '✗'} Advanced`);
        console.log(`✅ UI: ${createUI ? '✓' : '✗'} Interface, ${window.optimizationTracker ? '✓' : '✗'} Tracker`);
        
        // Auto-start optimization tracker display
        window.optimizationTracker.updateBestConfigDisplay(burstRateLimiter);
        
        // ========================================
        // 🌐 GLOBAL UTILITY FUNCTIONS
        // ========================================
        
        // Global stop function
        window.STOPPED = false;
        window.stopOptimization = () => {
            console.log('🛑 Stopping optimization...');
            window.STOPPED = true;
        };
        
        // Show/hide optimization tracker
        window.showOptimizationTracker = () => {
            const element = document.getElementById('ag-optimization-tracker');
            if (element) element.style.display = 'block';
        };
        
        window.hideOptimizationTracker = () => {
            const element = document.getElementById('ag-optimization-tracker');
            if (element) element.style.display = 'none';
        };
        
        // Get rate limit stats
        window.getRateLimitStats = () => {
            return {
                burst: burstRateLimiter.getStats(),
                optimization: window.optimizationTracker.getStats()
            };
        };
        
        // Quick config application helpers
        window.applyBestConfigToUI = async function() {
            const bestConfig = window.optimizationTracker.getCurrentBest()?.config;
            if (bestConfig) {
                console.log('📋 Best config:', bestConfig);
                console.log('⚠️ UI application not implemented in modular version');
                console.log('💡 Copy the config above and apply manually');
                return bestConfig;
            } else {
                console.warn('❌ No best config available yet');
                return null;
            }
        };
        
        window.copyBestConfigToClipboard = function() {
            const bestConfig = window.optimizationTracker.getCurrentBest()?.config;
            if (bestConfig) {
                const configText = JSON.stringify(bestConfig, null, 2);
                navigator.clipboard.writeText(configText).then(() => {
                    console.log('✅ Best config copied to clipboard!');
                }).catch(err => {
                    console.error('❌ Failed to copy to clipboard:', err);
                    console.log('📋 Best config:', configText);
                });
                return bestConfig;
            } else {
                console.warn('❌ No best config available yet');
                return null;
            }
        };
        
        // ========================================
        // 🖥️ UI INITIALIZATION
        // ========================================
        
        if (createUI && setupEventHandlers && updateModuleStatus) {
            console.log('🖥️ Creating user interface...');
            
            // Create and setup UI
            try {
                createUI();
                console.log('✅ UI created successfully');
                
                setupEventHandlers();
                console.log('✅ Event handlers setup completed');
                
                // Update module status in UI
                updateModuleStatus();
                console.log('✅ Module status updated');
                
            } catch (uiError) {
                console.warn('⚠️ UI creation failed:', uiError);
                console.log('📱 Continuing in console-only mode...');
            }
        } else {
            console.log('⚠️ UI module not available - running in console-only mode');
            console.log('💡 Access functionality via: window.AGCopilot');
            console.log('🔧 To test the full UI, try:');
            console.log('   1. Use AGCopilot-Local-Test.js for immediate testing');
            console.log('   2. Or wait for ui.js module to be available on GitHub');
            
            // Create a simple status indicator
            try {
                const statusDiv = document.createElement('div');
                statusDiv.id = 'ag-copilot-status';
                statusDiv.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 10px 15px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border: 2px solid #fff;
                    border-radius: 8px;
                    color: white;
                    font-family: 'Segoe UI', sans-serif;
                    font-size: 12px;
                    font-weight: bold;
                    z-index: 10000;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                    cursor: pointer;
                `;
                statusDiv.innerHTML = `
                    🤖 AG Copilot Loaded<br>
                    <span style="font-size: 10px; opacity: 0.8;">Console-only mode</span>
                `;
                statusDiv.title = 'AG Copilot is loaded in console-only mode. Access via window.AGCopilot';
                statusDiv.addEventListener('click', () => {
                    console.log('🤖 AG Copilot Status:');
                    console.log('📊 Available methods:', Object.keys(window.AGCopilot));
                    console.log('💡 Try: await window.AGCopilot.testConfigurationAPI({basic: {"Min MCAP (USD)": 15000, "Max MCAP (USD)": 35000}})');
                });
                document.body.appendChild(statusDiv);
                
                // Auto-remove after 10 seconds
                setTimeout(() => {
                    if (statusDiv.parentNode) {
                        statusDiv.remove();
                    }
                }, 10000);
                
            } catch (statusError) {
                console.warn('⚠️ Could not create status indicator:', statusError);
            }
        }
        
        // ========================================
        // 📊 PROGRESS TRACKING
        // ========================================
        
        // Progress update function for optimization tracking
        function updateProgress(message, progress, bestScore, testCount, totalTokens, startTime) {
            // Log progress to console
            if (startTime) {
                const runtime = Math.floor((Date.now() - startTime) / 1000);
                console.log(`📊 ${message} | Progress: ${(progress || 0).toFixed(1)}% | Best: ${bestScore}% | Tests: ${testCount} | Tokens: ${totalTokens} | Runtime: ${runtime}s`);
            } else {
                console.log(`📊 ${message}`);
            }
            
            // Update global optimization tracker if available
            if (window.optimizationTracker) {
                window.optimizationTracker.updateProgress(testCount || 0, 0, 0, message);
            }
        }
        
        // Make updateProgress available globally for modules
        window.updateProgress = updateProgress;
        
    } catch (error) {
        console.error('❌ Failed to initialize AG Copilot:', error);
        console.log('🔄 Falling back to essential functionality...');
        
        // ========================================
        // 🆘 FALLBACK MODE - Essential functionality inline
        // ========================================
        try {
            // Basic CONFIG
            const CONFIG = {
                BACKTEST_WAIT: 20000,
                USE_ROBUST_SCORING: true,
                MIN_WIN_RATE: 40.0,
                RELIABILITY_WEIGHT: 0.3,
                CONSISTENCY_WEIGHT: 0.4,
                RETURN_WEIGHT: 0.6,
                DEFAULT_BUYING_AMOUNT: 0.25,
                TP_CONFIGURATIONS: [
                    { size: 20, gain: 300 },
                    { size: 20, gain: 650 },
                    { size: 20, gain: 1400 },
                    { size: 20, gain: 3000 },
                    { size: 20, gain: 10000 }
                ]
            };

            // Essential utilities
            const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            window.STOPPED = false;

            function getTriggerMode() {
                const triggerSelect = document.getElementById('trigger-mode-select');
                return triggerSelect ? parseInt(triggerSelect.value) || 4 : 4;
            }

            function calculateRobustScore(metrics) {
                if (!metrics || metrics.tpPnlPercent === undefined) return null;
                if (!CONFIG.USE_ROBUST_SCORING) return { score: metrics.tpPnlPercent };
                
                const rawPnL = metrics.tpPnlPercent;
                const winRate = metrics.winRate || 0;
                const reliabilityFactor = Math.min(1.0, Math.log(metrics.totalTokens || 1) / Math.log(100));
                
                if (winRate < CONFIG.MIN_WIN_RATE) return { score: -10 };
                
                const returnComponent = rawPnL * CONFIG.RETURN_WEIGHT;
                const consistencyComponent = winRate * CONFIG.CONSISTENCY_WEIGHT;
                const baseScore = returnComponent + consistencyComponent;
                const finalScore = baseScore * (1 - CONFIG.RELIABILITY_WEIGHT) + baseScore * reliabilityFactor * CONFIG.RELIABILITY_WEIGHT;
                
                return { score: finalScore };
            }

            // Simple API client
            async function testConfiguration(config, testName = 'Test') {
                try {
                    const params = new URLSearchParams();
                    
                    if (config.basic) {
                        if (config.basic['Min MCAP (USD)']) params.append('minMcap', config.basic['Min MCAP (USD)']);
                        if (config.basic['Max MCAP (USD)']) params.append('maxMcap', config.basic['Max MCAP (USD)']);
                    }
                    
                    const triggerMode = getTriggerMode();
                    if (triggerMode !== null) params.append('triggerMode', triggerMode);
                    params.append('excludeSpoofedTokens', 'true');
                    params.append('buyingAmount', CONFIG.DEFAULT_BUYING_AMOUNT);
                    
                    const tpParams = CONFIG.TP_CONFIGURATIONS
                        .map(tp => `tpSize=${tp.size}&tpGain=${tp.gain}`)
                        .join('&');
                    
                    const url = `https://backtester.alphagardeners.xyz/api/stats?${params.toString()}&${tpParams}`;
                    
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    
                    const data = await response.json();
                    const metrics = {
                        tpPnlPercent: data.tpPnlPercent || 0,
                        totalTokens: data.totalTokens || 0,
                        winRate: data.winRate || 0
                    };
                    
                    const scoring = calculateRobustScore(metrics);
                    console.log(`📊 ${testName}: Score=${scoring?.score?.toFixed(1) || 'N/A'}, TP PnL=${metrics.tpPnlPercent.toFixed(1)}%, Tokens=${metrics.totalTokens}`);
                    
                    return { success: true, metrics };
                } catch (error) {
                    console.warn(`❌ ${testName} failed: ${error.message}`);
                    return { success: false, error: error.message };
                }
            }

            // Expose fallback API
            window.AGCopilot = {
                testConfiguration,
                CONFIG,
                calculateRobustScore,
                version: 'fallback',
                mode: 'Essential functionality only'
            };

            console.log('🆘 AG Copilot Enhanced loaded in fallback mode');
            console.log('💡 Access via: window.AGCopilot');
            console.log('📚 Available methods:', Object.keys(window.AGCopilot));
            
        } catch (fallbackError) {
            console.error('❌ Even fallback mode failed:', fallbackError);
        }
    }

})();
