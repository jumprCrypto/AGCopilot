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

        console.log('🎉 AG Copilot Enhanced loaded successfully!');
        console.log('💡 Access via: window.AGCopilot');
        console.log('📚 Available methods:', Object.keys(window.AGCopilot));
        
        // Auto-start optimization tracker display
        window.optimizationTracker.updateBestConfigDisplay(burstRateLimiter);
        
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
