// AGCopilot-Modular.js
// Modular version of AGCopilot - loads and coordinates all modules
// This is the main entry point for the bookmarklet

(async function() {
    'use strict';

    console.clear();
    console.log('%c🤖 AG Copilot v3.0 - Modular Edition 🤖', 'color: blue; font-size: 16px; font-weight: bold;');
    console.log('%c🔧 Loading modular architecture...', 'color: green; font-size: 12px;');

    // ========================================
    // 🏗️ MODULE LOADER
    // ========================================
    
    const MODULE_BASE_URL = 'https://raw.githubusercontent.com/jumprCrypto/AGCopilot/refs/heads/module/';
    
    const MODULES = [
        'BurstRateLimiter.js',
        'ApiClient.js', 
        'RobustScoring.js',
        'OptimizationEngine.js',
        'SignalAnalysis.js',
        'UIManager.js',
        'ParameterDiscovery.js',
        'PinSettings.js',
        'OptimizationTracker.js',
        'ConfigManager.js'
    ];

    // Global utilities that modules can depend on
    window.AGUtils = {
        sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
        deepClone: (obj) => {
            if (obj === null || typeof obj !== "object") return obj;
            if (obj instanceof Date) return new Date(obj.getTime());
            if (Array.isArray(obj)) return obj.map(item => window.AGUtils.deepClone(item));
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = window.AGUtils.deepClone(obj[key]);
                }
            }
            return cloned;
        },
        
        showToast: function(message, type = 'info', duration = 3000) {
            // Create toast element
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 6px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                max-width: 300px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                font-size: 14px;
                transition: all 0.3s ease;
            `;
            
            // Set background color based on type
            const colors = {
                success: '#10b981',
                error: '#ef4444', 
                warning: '#f59e0b',
                info: '#3b82f6'
            };
            toast.style.backgroundColor = colors[type] || colors.info;
            toast.textContent = message;
            
            // Add to page
            document.body.appendChild(toast);
            
            // Remove after duration
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    toast.style.opacity = '0';
                    toast.style.transform = 'translateX(100%)';
                    setTimeout(() => {
                        if (document.body.contains(toast)) {
                            document.body.removeChild(toast);
                        }
                    }, 300);
                }
            }, duration);
        },
        
        ensureCompleteConfig: function(config) {
            const completeConfig = this.deepClone(window.ConfigManager?.COMPLETE_CONFIG_TEMPLATE || {});
            
            for (const [section, sectionConfig] of Object.entries(config)) {
                if (completeConfig[section]) {
                    Object.assign(completeConfig[section], sectionConfig);
                } else {
                    completeConfig[section] = sectionConfig;
                }
            }
            
            return completeConfig;
        },
        
        formatTimestamp: (timestamp) => {
            if (!timestamp) return 'N/A';
            return new Date(timestamp * 1000).toISOString().replace('T', ' ').split('.')[0];
        },
        
        formatMcap: (mcap) => {
            if (!mcap) return 'N/A';
            if (mcap >= 1000000) return `$${(mcap / 1000000).toFixed(2)}M`;
            if (mcap >= 1000) return `$${(mcap / 1000).toFixed(2)}K`;
            return `$${mcap}`;
        },
        formatPercent: (value) => {
            if (value === null || value === undefined) return 'N/A';
            return `${value.toFixed(2)}%`;
        },
        
        openSection: async function(sectionTitle) {
            const allHeaders = Array.from(document.querySelectorAll('button[type="button"]'));
            const sectionHeader = allHeaders.find(header =>
                header.textContent.includes(sectionTitle)
            );
    
            if (sectionHeader) {
                sectionHeader.click();
                await this.sleep(200); // Wait for section to open
                return true;
            }
            return false;
        },
        
        getCurrentConfiguration: async function() {
            return await window.ConfigManager?.getCurrentConfigFromUI?.() || {};
        }
    };

    // Module loading with error handling and retries
    async function loadModule(moduleName, retries = 3) {
        const url = MODULE_BASE_URL + moduleName;
        
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`📦 Loading ${moduleName} (attempt ${attempt}/${retries})`);
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const code = await response.text();
                
                // Execute module code
                eval(code);
                
                console.log(`✅ ${moduleName} loaded successfully`);
                return true;
                
            } catch (error) {
                console.warn(`❌ Failed to load ${moduleName} (attempt ${attempt}): ${error.message}`);
                
                if (attempt === retries) {
                    console.error(`💥 Failed to load ${moduleName} after ${retries} attempts`);
                    return false;
                }
                
                // Wait before retry
                await window.AGUtils.sleep(1000 * attempt);
            }
        }
        
        return false;
    }

    // Load all modules
    async function loadAllModules() {
        console.log(`🔄 Loading ${MODULES.length} modules...`);
        
        const loadPromises = MODULES.map(module => loadModule(module));
        const results = await Promise.allSettled(loadPromises);
        
        const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
        const failed = MODULES.length - successful;
        
        console.log(`📊 Module loading complete: ${successful}/${MODULES.length} successful`);
        
        if (failed > 0) {
            console.warn(`⚠️ ${failed} modules failed to load. Some features may be unavailable.`);
        }
        
        return { successful, failed, total: MODULES.length };
    }

    // ========================================
    // 📋 CORE CONFIGURATION
    // ========================================
    
    // Core configuration - kept minimal in main loader
    const CONFIG = {
        MAX_RUNTIME_MIN: 30,
        BACKTEST_WAIT: 20000,
        MIN_TOKENS: 10,
        TARGET_PNL: 100.0,
        CHAIN_RUN_COUNT: 3,
        
        // Feature flags
        USE_CONFIG_CACHING: true,
        USE_PARAMETER_IMPACT_ANALYSIS: true,
        USE_GENETIC_ALGORITHM: true,
        USE_SIMULATED_ANNEALING: true,
        USE_LATIN_HYPERCUBE_SAMPLING: true,
        
        // Scoring configuration
        SCORING_MODE: 'robust',
        MIN_WIN_RATE: 35.0,
        MIN_WIN_RATE_MEDIUM_SAMPLE: 33.0,
        MIN_WIN_RATE_LARGE_SAMPLE: 30.0,
        RELIABILITY_WEIGHT: 0.3,
        CONSISTENCY_WEIGHT: 0.4,
        RETURN_WEIGHT: 0.6,
        
        // API settings
        API_BASE_URL: 'https://backtester.alphagardeners.xyz/api',
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000,
        REQUEST_DELAY: 9360,
        DEFAULT_BUYING_AMOUNT: 0.25,
        
        // Take Profit configuration
        TP_CONFIGURATIONS: [
            { size: 20, gain: 300 },
            { size: 20, gain: 650 },
            { size: 20, gain: 1400 },
            { size: 20, gain: 3000 },
            { size: 20, gain: 10000 }
        ],
        
        // Rate limiting
        RATE_LIMIT_THRESHOLD: 20,
        RATE_LIMIT_RECOVERY: 10000,
        RATE_LIMIT_SAFETY_MARGIN: 1.5,
        INTRA_BURST_DELAY: 100,
        MAX_REQUESTS_PER_MINUTE: 50,
        USE_BURST_RATE_LIMITING: true,
        SMART_BURST_SIZE: true,
        
        RATE_LIMIT_MODE: 'normal',
        RATE_LIMIT_MODES: {
            normal: {
                BACKTEST_WAIT: 20000,
                RATE_LIMIT_THRESHOLD: 20,
                RATE_LIMIT_RECOVERY: 10000,
                REQUEST_DELAY: 9360,
                INTRA_BURST_DELAY: 100
            },
            slower: {
                BACKTEST_WAIT: 30000,
                RATE_LIMIT_THRESHOLD: 15,
                RATE_LIMIT_RECOVERY: 15000,
                REQUEST_DELAY: 14000,
                INTRA_BURST_DELAY: 150
            }
        }
    };

    // Parameter validation rules
    const PARAM_RULES = {
        'Min MCAP (USD)': { min: 0, max: 20000, step: 1000, type: 'integer'},
        'Max MCAP (USD)': { min: 10000, max: 60000, step: 1000, type: 'integer' },
        'Min Deployer Age (min)': { min: 0, max: 10080, step: 5, type: 'integer' },
        'Min Token Age (sec)': { min: 0, max: 86400, step: 15, type: 'integer' },
        'Max Token Age (sec)': { min: 0, max: 259200, step: 15, type: 'integer' },
        'Min AG Score': { min: 0, max: 10, step: 1, type: 'integer' },
        'Min Holders': { min: 1, max: 5, step: 1, type: 'integer' },
        'Max Holders': { min: 1, max: 50, step: 5, type: 'integer' },
        'Holders Growth %': { min: 0, max: 500, step: 10, type: 'integer' },
        'Holders Growth Minutes': { min: 0, max: 1440, step: 10, type: 'integer' },
        'Min Unique Wallets': { min: 1, max: 3, step: 1, type: 'integer' },
        'Max Unique Wallets': { min: 1, max: 8, step: 1, type: 'integer' },
        'Min KYC Wallets': { min: 0, max: 3, step: 1, type: 'integer' },
        'Max KYC Wallets': { min: 1, max: 8, step: 1, type: 'integer' },
        'Min Bundled %': { min: 0, max: 50, step: 1 },
        'Max Bundled %': { min: 0, max: 100, step: 5 },
        'Min Deployer Balance (SOL)': { min: 0, max: 10, step: 0.5 },
        'Min Buy Ratio %': { min: 0, max: 50, step: 10 },
        'Max Buy Ratio %': { min: 50, max: 100, step: 5 },
        'Min Vol MCAP %': { min: 0, max: 100, step: 10 },
        'Max Vol MCAP %': { min: 33, max: 300, step: 20 },
        'Max Drained %': { min: 0, max: 100, step: 5 },
        'Max Drained Count': { min: 0, max: 11, step: 1, type: 'integer' },
        'Min TTC (sec)': { min: 0, max: 259200, step: 5, type: 'integer' },
        'Max TTC (sec)': { min: 10, max: 259200, step: 10, type: 'integer' },
        'Max Liquidity %': { min: 10, max: 100, step: 10, type: 'integer' },
        'Min Win Pred %': { min: 0, max: 70, step: 5, type: 'integer' }
    };

    // ========================================
    // 🚀 INITIALIZATION
    // ========================================
    
    // Initialize global state
    window.CONFIG = CONFIG;
    window.PARAM_RULES = PARAM_RULES;
    window.STOPPED = false;
    
    // Initialize optimization tracking
    window.optimizationTracker = null;
    window.bestConfigTracker = {
        update: function(config, metrics, score, source) {
            this.config = config;
            this.metrics = metrics;
            this.score = score;
            this.source = source;
            this.id = Date.now();
        },
        updateBest: function(config, metrics, score, source) {
            // Alias for update method to maintain compatibility
            this.update(config, metrics, score, source);
        },
        getConfig: function() { return this.config; },
        getDebugInfo: function() { return { config: this.config, metrics: this.metrics, score: this.score, source: this.source }; }
    };
    
    // Initialize pin settings
    window.pinnedSettings = {
        enabled: false,
        settings: {},
        timeout: 10000
    };

    try {
        // Load all modules
        const moduleResults = await loadAllModules();
        
        if (moduleResults.successful === 0) {
            throw new Error('No modules loaded successfully. Cannot continue.');
        }

        // Initialize core systems after modules are loaded
        console.log('🔧 Initializing core systems...');

        // Initialize CONFIG and PRESETS from ConfigManager
        if (window.ConfigManager) {
            window.CONFIG = window.ConfigManager.CONFIG;
            window.PRESETS = window.ConfigManager.PRESETS;
            console.log('✅ Configuration system initialized');
        } else {
            console.error('❌ ConfigManager not loaded - using fallback CONFIG');
            window.CONFIG = {
                MAX_RUNTIME_MIN: 30,
                MIN_TOKENS: 10,
                SCORING_MODE: 'robust'
            };
            window.PRESETS = {};
        }

        // Initialize rate limiter
        if (window.BurstRateLimiter) {
            // Constructor: (burstLimit, recoveryTime, safetyMargin, options, AGUtilsArg)
            window.burstRateLimiter = new window.BurstRateLimiter(
                window.CONFIG.RATE_LIMIT_THRESHOLD || 20,  // burstLimit
                window.CONFIG.RATE_LIMIT_RECOVERY || 10000, // recoveryTime  
                window.CONFIG.RATE_LIMIT_SAFETY_MARGIN || 1.5, // safetyMargin
                {
                    intraBurstDelay: window.CONFIG.INTRA_BURST_DELAY || 100,
                    maxRequestsPerMinute: window.CONFIG.MAX_REQUESTS_PER_MINUTE || 50,
                    smartBurstSize: window.CONFIG.SMART_BURST_SIZE || true
                },
                window.AGUtils
            );
            console.log('✅ Rate limiter initialized');
        }

        // Initialize API client
        if (window.ApiClient) {
            window.backtesterAPI = new window.ApiClient(window.AGUtils, window.CONFIG, window.burstRateLimiter);
            console.log('✅ API client initialized');
        }

        // Initialize optimization tracker
        if (window.OptimizationTracker) {
            window.optimizationTracker = new window.OptimizationTracker();
            console.log('✅ Optimization tracker initialized');
        }

        // Initialize UI
        if (window.UIManager) {
            const ui = window.UIManager.createUI();
            console.log('✅ UI initialized');
            
            // Set up button event handlers after UI is created
            setupEventHandlers();
            console.log('✅ Event handlers initialized');
        }

        // Expose module functions globally for cross-module compatibility
        setupGlobalFunctions();

        console.log('%c🎉 AG Copilot Modular loaded successfully!', 'color: green; font-size: 14px; font-weight: bold;');
        console.log(`📊 Modules loaded: ${moduleResults.successful}/${moduleResults.total}`);
        
        if (window.UIManager) {
            window.UIManager.showNotification('AG Copilot Modular loaded successfully!', 'success');
        }

    } catch (error) {
        console.error('💥 Failed to initialize AG Copilot:', error);
        alert(`Failed to load AG Copilot: ${error.message}`);
    }

    // ========================================
    // 🎮 EVENT HANDLERS SETUP
    // ========================================
    
    function setupEventHandlers() {
        // Helper function for safe event listener addition
        function safeAddEventListener(elementId, event, handler) {
            const element = document.getElementById(elementId);
            if (element) {
                element.addEventListener(event, handler);
                return true;
            } else {
                console.warn(`⚠️ Element '${elementId}' not found for ${event} event`);
                return false;
            }
        }

        // Start Optimization Button
        safeAddEventListener('start-optimization', 'click', async () => {
            const targetPnl = parseFloat(document.getElementById('target-pnl')?.value) || 100;
            const minTokens = parseInt(document.getElementById('min-tokens')?.value) || 50;
            const runtimeMin = parseInt(document.getElementById('runtime-min')?.value) || 30;
            const chainRunCount = parseInt(document.getElementById('chain-run-count')?.value) || 1;
            const simulatedAnnealing = document.getElementById('simulated-annealing')?.checked || false;
            const latinHypercube = document.getElementById('latin-hypercube')?.checked || false;
            const correlatedParams = document.getElementById('correlated-params')?.checked || false;
            const deepDive = document.getElementById('deep-dive')?.checked || false;

            // Update CONFIG with UI values
            window.CONFIG.TARGET_PNL = targetPnl;
            window.CONFIG.MIN_TOKENS = minTokens;
            window.CONFIG.MAX_RUNTIME_MIN = runtimeMin;
            window.CONFIG.CHAIN_RUN_COUNT = chainRunCount;
            window.CONFIG.USE_SIMULATED_ANNEALING = simulatedAnnealing;
            window.CONFIG.USE_LATIN_HYPERCUBE_SAMPLING = latinHypercube;
            window.CONFIG.USE_CORRELATED_PARAMS = correlatedParams;
            window.CONFIG.USE_DEEP_DIVE = deepDive;

            // Get scoring mode from ConfigManager
            if (window.ConfigManager?.getScoringMode) {
                window.CONFIG.SCORING_MODE = window.ConfigManager.getScoringMode();
            }

            const features = [];
            const mode = window.CONFIG.SCORING_MODE;
            if (mode === 'robust') features.push('outlier-resistant scoring');
            if (mode === 'tp_only') features.push('TP PnL scoring');
            if (mode === 'winrate_only') features.push('Win Rate scoring');
            if (simulatedAnnealing) features.push('simulated annealing');
            if (latinHypercube) features.push('Latin hypercube sampling');
            if (correlatedParams) features.push('correlated parameters');
            if (deepDive) features.push('deep dive analysis');
            
            const featuresStr = features.length > 0 ? ` with ${features.join(', ')}` : '';
            const useChainedRuns = chainRunCount > 1;

            if (useChainedRuns) {
                console.log(`🔗 Starting chained optimization: ${chainRunCount} runs of ${runtimeMin} min each, Target ${targetPnl}% PnL, Min ${minTokens} tokens${featuresStr}`);
            } else {
                console.log(`🚀 Starting optimization: Target ${targetPnl}% PnL, Min ${minTokens} tokens, ${runtimeMin} min runtime${featuresStr}`);
            }

            // 📌 PIN SETTINGS FEATURE: Get current configuration and show pin dialog
            try {
                console.log('📌 Reading current backtester configuration for pin settings...');
                const currentConfig = await (window.ConfigManager?.getCurrentConfigFromUI?.() || window.AGUtils.getCurrentConfiguration());
                    
                // Show pin settings dialog with 10 second timeout
                const pinResult = await new Promise((resolve) => {
                    if (window.PinSettings?.showPinSettingsDialog) {
                        window.PinSettings.showPinSettingsDialog(currentConfig, resolve);
                    } else {
                        // Fallback if PinSettings not loaded
                        resolve({ pinned: false, settings: {} });
                    }
                });
                    
                // Check if user cancelled
                if (pinResult.cancelled) {
                    console.log('❌ Optimization cancelled by user via Pin Settings dialog');
                    return; // Exit the function, stopping optimization
                }
            
                // Store pin settings globally
                window.pinnedSettings.enabled = pinResult.pinned;
                window.pinnedSettings.settings = pinResult.settings;
            
                if (pinResult.pinned && Object.keys(pinResult.settings).length > 0) {
                    console.log(`📌 ${Object.keys(pinResult.settings).length} settings pinned:`, pinResult.settings);
                    console.log('🔒 These settings will remain constant during optimization');
                } else {
                    console.log('📌 No settings pinned - proceeding with standard optimization');
                }
                
            } catch (error) {
                console.warn('❌ Pin settings dialog error:', error);
                // Proceed with no pinned settings
                window.pinnedSettings.enabled = false;
                window.pinnedSettings.settings = {};
            }

            // UI state changes
            const startBtn = document.getElementById('start-optimization');
            const stopBtn = document.getElementById('stop-optimization');
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'block';

            // Reset stopped flag
            window.STOPPED = false;

            // Start optimization tracking
            if (window.optimizationTracker) {
                window.optimizationTracker.startOptimization(useChainedRuns ? chainRunCount : 1);
            }

            // Start the actual optimization
            try {
                let results;
                
                // Use the new OptimizationEngine.startOptimization method
                if (window.OptimizationEngine && window.OptimizationEngine.startOptimization) {
                    results = await window.OptimizationEngine.startOptimization({
                        targetPnl,
                        minTokens,
                        runtimeMin,
                        chainRunCount,
                        simulatedAnnealing,
                        latinHypercube,
                        correlatedParams,
                        deepDive
                    });
                } else {
                    throw new Error('OptimizationEngine not loaded or startOptimization method missing');
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
                    
                    // Update results display to show pinned settings
                    if (window.PinSettings?.updateResultsWithPinnedSettings) {
                        window.PinSettings.updateResultsWithPinnedSettings(window.pinnedSettings.settings);
                    }
                    
                    if (window.AGUtils.showToast) {
                        window.AGUtils.showToast('Optimization completed successfully!', 'success', 3000);
                    }
                } else {
                    console.log('❌ Optimization completed but no best configuration found');
                    if (window.AGUtils.showToast) {
                        window.AGUtils.showToast('Optimization completed with no improvements', 'warning', 3000);
                    }
                }
            } catch (error) {
                console.error(`❌ Optimization failed: ${error.message}`);
                if (window.AGUtils.showToast) {
                    window.AGUtils.showToast(`Optimization failed: ${error.message}`, 'error', 5000);
                }
            } finally {
                // Stop optimization tracking when complete
                if (window.optimizationTracker) {
                    window.optimizationTracker.stopOptimization();
                }
                
                // Reset UI state safely
                if (startBtn) startBtn.style.display = 'block';
                if (stopBtn) stopBtn.style.display = 'none';
            }
        });

        // Stop Optimization Button
        safeAddEventListener('stop-optimization', 'click', () => {
            window.STOPPED = true;
            if (window.optimizationTracker) {
                window.optimizationTracker.stopOptimization();
            }
            console.log('🛑 Optimization stopped by user');
        });

        // Parameter Discovery Button
        safeAddEventListener('parameter-discovery', 'click', async () => {
            if (!window.ParameterDiscovery) {
                console.error('❌ ParameterDiscovery module not loaded');
                return;
            }

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

                console.log('🔍 Starting parameter discovery...');

                // Start parameter discovery
                if (window.ParameterDiscovery.discoverHighImpactParameters) {
                    await window.ParameterDiscovery.discoverHighImpactParameters();
                } else {
                    console.error('❌ Parameter discovery function not found');
                }

            } catch (error) {
                console.error('💥 Parameter discovery failed:', error);
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

        // Signal Analysis Button
        safeAddEventListener('analyze-signals-btn', 'click', async () => {
            if (!window.SignalAnalysis) {
                console.error('❌ SignalAnalysis module not loaded');
                return;
            }

            try {
                console.log('📊 Starting signal analysis...');
                
                if (window.SignalAnalysis.handleSignalAnalysis) {
                    await window.SignalAnalysis.handleSignalAnalysis();
                } else if (window.handleSignalAnalysis) {
                    await window.handleSignalAnalysis();
                } else {
                    console.error('❌ Signal analysis function not found');
                }
            } catch (error) {
                console.error('💥 Signal analysis failed:', error);
            }
        });

        // Preset Selection Handler
        safeAddEventListener('preset-select', 'change', async () => {
            const presetSelect = document.getElementById('preset-select');
            if (!presetSelect || !presetSelect.value) return;

            const presetName = presetSelect.value;
            console.log(`🎨 Applying preset: ${presetName}`);

            if (window.PRESETS && window.PRESETS[presetName]) {
                const preset = window.PRESETS[presetName];
                console.log('Preset configuration:', preset);

                // Apply preset configuration
                if (window.ConfigManager?.applyConfigToUI) {
                    window.ConfigManager.applyConfigToUI(preset.config || {});
                }

                // If it's an AGCopilot preset, apply it to the backtester
                if (window.applyConfigToBacktester && (preset.basic || preset.tokenDetails || preset.wallets)) {
                    await window.applyConfigToBacktester(preset);
                }
            } else {
                console.warn(`⚠️ Preset '${presetName}' not found in PRESETS`);
            }
        });

        // Generated Config Action Buttons
        safeAddEventListener('apply-generated-config-btn', 'click', async () => {
            if (window.lastGeneratedConfig && window.applyConfigToBacktester) {
                await window.applyConfigToBacktester(window.lastGeneratedConfig);
                console.log('✅ Generated config applied to backtester!');
            }
        });

        safeAddEventListener('optimize-generated-config-btn', 'click', async () => {
            if (window.lastGeneratedConfig && window.applyConfigToBacktester) {
                await window.applyConfigToBacktester(window.lastGeneratedConfig);
                console.log('⚙️ Generated config applied, starting optimization...');
                
                // Small delay then trigger optimization
                if (!window.STOPPED) {
                    await window.AGUtils.sleep(1000);
                    const startBtn = document.getElementById('start-optimization');
                    if (startBtn) startBtn.click();
                }
            }
        });

        safeAddEventListener('copy-config-btn', 'click', async () => {
            if (window.lastGeneratedConfig && window.formatConfigForDisplay) {
                const formattedConfig = window.formatConfigForDisplay(window.lastGeneratedConfig);
                try {
                    await navigator.clipboard.writeText(formattedConfig);
                    console.log('📋 Config copied to clipboard!');
                } catch (error) {
                    console.error('Failed to copy to clipboard:', error);
                }
            }
        });

        console.log('🎮 Event handlers setup complete');
    }

    // ========================================
    // 🌐 GLOBAL FUNCTION SETUP
    // ========================================
    
    function setupGlobalFunctions() {
        // Expose signal analysis function globally
        if (window.SignalAnalysis && window.SignalAnalysis.handleSignalAnalysis) {
            window.handleSignalAnalysis = window.SignalAnalysis.handleSignalAnalysis;
        }

        // Expose config formatting if available
        if (window.ConfigManager && window.ConfigManager.formatConfigForDisplay) {
            window.formatConfigForDisplay = window.ConfigManager.formatConfigForDisplay;
        }

        // Apply configuration to backtester interface (enhanced)
        window.applyConfigToBacktester = async function(config, message = "Applied Configuration") {
            console.log('📋 Applying configuration to backtester:', config);
            
            try {
                if (!config) {
                    console.error('No configuration provided');
                    return { success: false, error: 'No configuration provided' };
                }

                // Use ConfigManager if available for enhanced functionality
                if (window.ConfigManager && window.ConfigManager.applyConfigToUI) {
                    console.log('Using ConfigManager.applyConfigToUI for enhanced config application');
                    const success = window.ConfigManager.applyConfigToUI(config);
                    
                    if (success) {
                        const appliedCount = Object.values(config).reduce((count, section) => {
                            return count + (typeof section === 'object' && section !== null ? Object.keys(section).length : 0);
                        }, 0);
                        
                        if (window.AGUtils && window.AGUtils.showToast) {
                            window.AGUtils.showToast(`${message} (${appliedCount} fields)`, 'success', 2000);
                        }
                        console.log('✅ Configuration applied successfully via ConfigManager');
                        return { success: true, appliedFields: appliedCount, method: 'ConfigManager' };
                    } else {
                        console.warn('ConfigManager application failed, falling back to simulation');
                    }
                }

                // Fallback to simulation method (for compatibility)
                console.log('Using fallback config simulation method');
                let appliedCount = 0;
                const sections = ['basic', 'tokenDetails', 'wallets', 'risk', 'advanced'];
                
                for (const section of sections) {
                    if (config[section]) {
                        console.log(`📝 Simulating ${section} configuration:`, config[section]);
                        appliedCount += Object.keys(config[section]).length;
                        
                        // Add small delay to simulate real application
                        await window.AGUtils.sleep(100);
                    }
                }
                
                console.log(`✅ Simulated ${appliedCount} configuration parameters`);
                
                // Update UI status if available
                if (window.UIManager && window.UIManager.showNotification) {
                    window.UIManager.showNotification(`Simulated ${appliedCount} config parameters`, 'success');
                } else if (window.AGUtils && window.AGUtils.showToast) {
                    window.AGUtils.showToast(`${message} (${appliedCount} fields simulated)`, 'success', 2000);
                }
                
                return { success: true, appliedFields: appliedCount, method: 'simulation' };
                
            } catch (error) {
                console.error('❌ Failed to apply configuration:', error);
                
                if (window.UIManager && window.UIManager.showNotification) {
                    window.UIManager.showNotification('Failed to apply configuration', 'error');
                } else if (window.AGUtils && window.AGUtils.showToast) {
                    window.AGUtils.showToast('Error applying configuration', 'error', 3000);
                }
                
                return { success: false, error: error.message };
            }
        };

        // Expose utility functions
        window.getScoringMode = window.ConfigManager?.getScoringMode || function() { return 'robust'; };
        window.getTriggerMode = window.ConfigManager?.getTriggerMode || function() { return 4; };
        window.getScaledTokenThresholds = window.ConfigManager?.getScaledTokenThresholds || function() { 
            return { MIN_TOKENS: 10, MEDIUM_SAMPLE_THRESHOLD: 500, LARGE_SAMPLE_THRESHOLD: 1000 }; 
        };

        // Initialize global stop flag
        window.STOPPED = false;

        // Rate limiting mode toggle function
        window.toggleRateLimitingMode = function() {
            if (window.CONFIG.RATE_LIMIT_MODE === 'normal') {
                window.CONFIG.RATE_LIMIT_MODE = 'slower';
                console.log('🐌 Switched to slower rate limiting mode (30s delays)');
                
                // Update button text if available
                const toggleBtn = document.getElementById('toggle-rate-limit-btn');
                if (toggleBtn) {
                    toggleBtn.textContent = '⏱️ Slower';
                    toggleBtn.title = 'Currently using slower rate limiting (30s wait). Click to switch to normal mode.';
                }
            } else {
                window.CONFIG.RATE_LIMIT_MODE = 'normal';
                console.log('🚀 Switched to normal rate limiting mode (20s delays)');
                
                // Update button text if available
                const toggleBtn = document.getElementById('toggle-rate-limit-btn');
                if (toggleBtn) {
                    toggleBtn.textContent = '⏱️ Normal';
                    toggleBtn.title = 'Currently using normal rate limiting (20s wait). Click to switch to slower mode.';
                }
            }
            
            // Update rate limiter if it exists
            if (window.burstRateLimiter) {
                const newMode = window.CONFIG.RATE_LIMIT_MODES[window.CONFIG.RATE_LIMIT_MODE];
                if (newMode) {
                    window.burstRateLimiter.burstLimit = newMode.RATE_LIMIT_THRESHOLD;
                    window.burstRateLimiter.recoveryTime = newMode.RATE_LIMIT_RECOVERY;
                    console.log(`📊 Rate limiter updated: ${newMode.RATE_LIMIT_THRESHOLD} calls, ${newMode.RATE_LIMIT_RECOVERY}ms recovery`);
                }
            }
        };

        console.log('🌐 Global functions exposed successfully');
    }

    // ========================================
    // 🔧 HELPER FUNCTIONS
    // ========================================
    
    // Expose key functions globally for backward compatibility
    window.sleep = window.AGUtils.sleep;
    window.deepClone = window.AGUtils.deepClone;

    // Module status check
    window.checkModuleStatus = function() {
        const modules = {
            BurstRateLimiter: !!window.BurstRateLimiter,
            ApiClient: !!window.ApiClient,
            RobustScoring: !!window.RobustScoring,
            OptimizationEngine: !!window.OptimizationEngine,
            SignalAnalysis: !!window.SignalAnalysis,
            UIManager: !!window.UIManager,
            ParameterDiscovery: !!window.ParameterDiscovery,
            PinSettings: !!window.PinSettings,
            OptimizationTracker: !!window.OptimizationTracker,
            ConfigManager: !!window.ConfigManager
        };

        console.table(modules);
        return modules;
    };

})();
