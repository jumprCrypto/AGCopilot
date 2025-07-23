(async function () {
    console.clear();
    console.log('%c🤖 AG Co-Pilot - Enhanced UI v1.0 🤖', 'color: blue; font-size: 16px; font-weight: bold;');

    // ========================================
    // 🎯 CONFIGURATION
    // ========================================
    const CONFIG = {
        // Original AGCopilot Optimization Settings (no API needed)
        MAX_RUNTIME_MIN: 30,
        BACKTEST_WAIT: 3000, // Wait for UI to update after applying config
        MIN_TOKENS: 50,
        TARGET_PNL: 100.0,
        
        // Feature flags (keeping all original features)
        USE_CONFIG_CACHING: true,  // Re-enabled after fixing cache key generation
        USE_PARAMETER_IMPACT_ANALYSIS: true,
        USE_GENETIC_ALGORITHM: true,
        USE_SIMULATED_ANNEALING: true,
        USE_LATIN_HYPERCUBE_SAMPLING: true,
        USE_MULTIPLE_STARTING_POINTS: true,
        
        // Outlier-resistant scoring system
        USE_ROBUST_SCORING: true,  // Use outlier-resistant metrics instead of raw TP PnL %
        MIN_WIN_RATE: 40.0,        // Minimum win rate to consider config viable
        RELIABILITY_WEIGHT: 0.3,   // Weight for sample size and consistency (0.0-1.0)
        CONSISTENCY_WEIGHT: 0.4,   // Weight for win rate (0.0-1.0)
        RETURN_WEIGHT: 0.6         // Weight for raw PnL (0.0-1.0)
        // Note: CONSISTENCY_WEIGHT + RETURN_WEIGHT should = 1.0
    };

    // Parameter validation rules (same as original AGCopilot)
    const PARAM_RULES = {
        // Basic
        'Min MCAP (USD)': { min: 0, max: 10000, step: 1000, type: 'integer'},
        'Max MCAP (USD)': { min: 10000, max: 60000, step: 1000, type: 'integer' },

        // Token Details
        'Min Deployer Age (min)': { min: 0, max: 1440, step: 5, type: 'integer' },
        'Max Token Age (min)': { min: 5, max: 99999, step: 15, type: 'integer' },
        'Min AG Score': { min: 1, max: 7, step: 1, type: 'integer' },

        // Wallets
        'Min Unique Wallets': { min: 1, max: 3, step: 1, type: 'integer' },
        'Max Unique Wallets': { min: 1, max: 8, step: 1, type: 'integer' },
        'Min KYC Wallets': { min: 0, max: 3, step: 1, type: 'integer' },
        'Max KYC Wallets': { min: 1, max: 8, step: 1, type: 'integer' },

        // Risk
        'Min Bundled %': { min: 0, max: 50, step: 1 },
        'Max Bundled %': { min: 0, max: 100, step: 5 },
        'Min Deployer Balance (SOL)': { min: 0, max: 10, step: 0.5 },
        'Min Buy Ratio %': { min: 0, max: 50, step: 10 },
        'Max Buy Ratio %': { min: 50, max: 100, step: 5 },
        'Min Vol MCAP %': { min: 0, max: 100, step: 10 },
        'Max Vol MCAP %': { min: 33, max: 300, step: 20 },
        'Max Drained %': { min: 0, max: 100, step: 5 },
        'Max Drained Count': { min: 0, max: 11, step: 1, type: 'integer' },

        // Advanced
        'Min TTC (sec)': { min: 0, max: 3600, step: 5, type: 'integer' },
        'Max TTC (sec)': { min: 10, max: 3600, step: 10, type: 'integer' },
        'Max Liquidity %': { min: 10, max: 100, step: 10, type: 'integer' },
        'Min Win Pred %': { min: 0, max: 70, step: 5, type: 'integer' }
    };

    // Complete config template for backward compatibility (with Description and Fresh Deployer)
    const COMPLETE_CONFIG_TEMPLATE = {
        basic: {
            "Min MCAP (USD)": undefined,
            "Max MCAP (USD)": undefined
        },
        tokenDetails: {
            "Min Deployer Age (min)": undefined,
            "Max Token Age (min)": undefined,
            "Min AG Score": undefined
        },
        wallets: {
            "Min Unique Wallets": undefined,
            "Min KYC Wallets": undefined,
            "Max KYC Wallets": undefined,
            "Max Unique Wallets": undefined
        },
        risk: {
            "Min Bundled %": undefined,
            "Max Bundled %": undefined,
            "Min Deployer Balance (SOL)": undefined,
            "Min Buy Ratio %": undefined,
            "Max Buy Ratio %": undefined,
            "Min Vol MCAP %": undefined,
            "Max Vol MCAP %": undefined,
            "Max Drained %": undefined,
            "Max Drained Count": undefined,
            "Description": undefined,
            "Fresh Deployer": undefined
        },
        advanced: {
            "Min TTC (sec)": undefined,
            "Max TTC (sec)": undefined,
            "Max Liquidity %": undefined,
            "Min Win Pred %": undefined
        }
    };

    // ========================================
    // 🛠️ UTILITIES
    // ========================================
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    let STOPPED = false;

    // Efficient deep clone utility function
    function deepClone(obj) {
        if (obj === null || typeof obj !== "object") return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (Array.isArray(obj)) return obj.map(item => deepClone(item));
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }

    // Ensure complete config by merging with template
    function ensureCompleteConfig(config) {
        const completeConfig = deepClone(COMPLETE_CONFIG_TEMPLATE);
        for (const [section, sectionConfig] of Object.entries(config)) {
            if (completeConfig[section]) {
                Object.assign(completeConfig[section], sectionConfig);
            } else {
                completeConfig[section] = sectionConfig;
            }
        }
        return completeConfig;
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
                                metrics.tokensMatched = parseInt(tokenMatch[1].replace(/,/g, ''));
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
            if (metrics.tpPnlPercent === undefined || metrics.tokensMatched === undefined) {
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
        if (!metrics || metrics.tpPnlPercent === undefined || metrics.tokensMatched === undefined) {
            return null;
        }

        // If robust scoring is disabled, use raw TP PnL %
        if (!CONFIG.USE_ROBUST_SCORING) {
            return {
                score: metrics.tpPnlPercent,
                components: {
                    rawPnL: metrics.tpPnlPercent,
                    winRate: metrics.winRate || 0,
                    reliabilityFactor: 1.0,
                    finalScore: metrics.tpPnlPercent
                },
                scoringMethod: 'Raw TP PnL %'
            };
        }

        // Use raw TP PnL % without capping
        const rawPnL = metrics.tpPnlPercent;
        
        // Win rate component (0-100%)
        const winRate = metrics.winRate || 0;
        
        // Reliability factor based on sample size (more tokens = more reliable)
        // Uses logarithmic scaling: log(tokens)/log(100) capped at 1.0
        const reliabilityFactor = Math.min(1.0, Math.log(metrics.tokensMatched) / Math.log(100));
        
        // Early exit for low win rate configs (likely unreliable)
        if (winRate < CONFIG.MIN_WIN_RATE) {
            return {
                score: -10, // Heavily penalize configs with poor win rates
                components: {
                    rawPnL: metrics.tpPnlPercent,
                    winRate: winRate,
                    reliabilityFactor: reliabilityFactor,
                    finalScore: -10,
                    penalty: 'Low win rate'
                },
                scoringMethod: 'Robust (Penalized for low win rate)'
            };
        }
        
        // Calculate composite score
        // Formula: (Raw_PnL * RETURN_WEIGHT) + (Win_Rate * CONSISTENCY_WEIGHT) * Reliability_Factor
        const returnComponent = rawPnL * CONFIG.RETURN_WEIGHT;
        const consistencyComponent = winRate * CONFIG.CONSISTENCY_WEIGHT;
        const baseScore = returnComponent + consistencyComponent;
        
        // Apply reliability weighting
        const finalScore = baseScore * (1 - CONFIG.RELIABILITY_WEIGHT) + baseScore * reliabilityFactor * CONFIG.RELIABILITY_WEIGHT;
        
        return {
            score: finalScore,
            components: {
                rawPnL: metrics.tpPnlPercent,
                winRate: winRate,
                reliabilityFactor: reliabilityFactor,
                returnComponent: returnComponent,
                consistencyComponent: consistencyComponent,
                baseScore: baseScore,
                finalScore: finalScore
            },
            scoringMethod: 'Robust Multi-Factor (Uncapped)'
        };
    }

    // Test configuration via UI interaction (like original AGCopilot but with enhanced metrics)
    async function testConfigurationUI(config, testName = 'UI Test') {
        try {
            console.log(`🧪 Testing: ${testName}`);
            
            // 1. Apply configuration to UI (this sends the requests automatically)
            const completeConfig = ensureCompleteConfig(config);
            const applySuccess = await applyConfigToUI(completeConfig);
            if (!applySuccess) {
                console.warn(`❌ Failed to apply configuration for ${testName}`);
                return { success: false, error: 'Failed to apply configuration' };
            }

            // 2. Wait for UI to update (same as original AGCopilot)
            await sleep(CONFIG.BACKTEST_WAIT);

            // 3. Extract metrics from UI (enhanced to get accurate TP PnL %)
            const metrics = await extractMetricsFromUI();
            if (!metrics) {
                console.warn(`❌ Failed to extract metrics for ${testName}`);
                return { success: false, error: 'Failed to extract metrics' };
            }

            // Calculate robust score for logging (but don't fail if it doesn't work)
            const robustScoring = calculateRobustScore(metrics);
            if (robustScoring && CONFIG.USE_ROBUST_SCORING) {
                console.log(`✅ ${testName}: ${metrics.tokensMatched} tokens | Robust Score: ${robustScoring.score.toFixed(1)} | Raw TP PnL: ${metrics.tpPnlPercent?.toFixed(1)}% | Win Rate: ${metrics.winRate?.toFixed(1)}%`);
            } else {
                console.log(`✅ ${testName}: ${metrics.tokensMatched} tokens, TP PnL: ${metrics.tpPnlPercent?.toFixed(1)}%, ATH PnL: ${metrics.athPnlPercent?.toFixed(1)}%, Win Rate: ${metrics.winRate?.toFixed(1)}%`);
            }

            return {
                success: true,
                metrics,
                source: 'UI'
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
    // 🧬 ENHANCED OPTIMIZER CLASS
    // ========================================
    class EnhancedOptimizer {
        constructor() {
            this.configCache = new ConfigCache(1000);
            this.bestConfig = null;
            this.bestScore = -Infinity;
            this.bestMetrics = null;
            this.testCount = 0;
            this.startTime = Date.now();
            this.history = [];
            
            // Parameter tracking
            this.parameterTests = [];
        }

        getRemainingTime() {
            const elapsed = (Date.now() - this.startTime) / (CONFIG.MAX_RUNTIME_MIN * 60 * 1000);
            return Math.max(0, 1 - elapsed);
        }

        getProgress() {
            return Math.min(100, ((Date.now() - this.startTime) / (CONFIG.MAX_RUNTIME_MIN * 60 * 1000)) * 100);
        }

        getCurrentBestScore() {
            return this.bestScore;
        }

        getSection(param) {
            const sectionMap = {
                'Min MCAP (USD)': 'basic', 'Max MCAP (USD)': 'basic',
                'Min AG Score': 'tokenDetails', 'Max Token Age (min)': 'tokenDetails', 'Min Deployer Age (min)': 'tokenDetails',
                'Min Buy Ratio %': 'risk', 'Max Buy Ratio %': 'risk', 'Min Vol MCAP %': 'risk',
                'Max Vol MCAP %': 'risk', 'Min Bundled %': 'risk', 'Max Bundled %': 'risk', 'Min Deployer Balance (SOL)': 'risk',
                'Max Drained %': 'risk', 'Max Drained Count': 'risk',
                'Min Unique Wallets': 'wallets', 'Max Unique Wallets': 'wallets', 'Min KYC Wallets': 'wallets', 'Max KYC Wallets': 'wallets',
                'Min TTC (sec)': 'advanced', 'Max TTC (sec)': 'advanced', 'Min Win Pred %': 'advanced', 'Max Liquidity %': 'advanced'
            };
            return sectionMap[param] || 'basic';
        }

        // Update the best configuration display in the UI
        updateBestConfigDisplay() {
            const display = document.getElementById('best-config-display');
            const stats = document.getElementById('best-config-stats');
            
            if (display && stats && this.bestMetrics) {
                display.style.display = 'block';
                
                let scoreDisplay = this.bestScore.toFixed(1);
                let methodDisplay = '';
                
                // Show robust scoring details if available
                if (CONFIG.USE_ROBUST_SCORING && this.bestMetrics.robustScoring) {
                    const rs = this.bestMetrics.robustScoring;
                    scoreDisplay = `${this.bestScore.toFixed(1)} (Robust)`;
                    methodDisplay = `<div style="font-size: 10px; opacity: 0.8;">Raw: ${rs.components.rawPnL.toFixed(1)}% | Reliability: ${(rs.components.reliabilityFactor * 100).toFixed(0)}%</div>`;
                }
                
                stats.innerHTML = `
                    <div><strong>Score:</strong> ${scoreDisplay} | <strong>Tokens:</strong> ${this.bestMetrics.tokensMatched} | <strong>Win Rate:</strong> ${this.bestMetrics.winRate?.toFixed(1)}%</div>
                    ${methodDisplay}
                    <div><strong>Tests:</strong> ${this.testCount} | <strong>Runtime:</strong> ${Math.floor((Date.now() - this.startTime) / 1000)}s</div>
                `;
            }
        }

        // Main test function - uses UI interaction (like original) with enhanced metrics
        async testConfig(config, testName) {
            if (STOPPED) return { success: false };

            try {
                this.testCount++;
                
                // Ensure config is complete before testing
                const completeConfig = ensureCompleteConfig(config);
                
                // Check cache first (if enabled)
                if (CONFIG.USE_CONFIG_CACHING && this.configCache.has(completeConfig)) {
                    const cachedResult = this.configCache.get(completeConfig);
                    console.log(`💾 Cache hit for: ${testName}`);
                    return cachedResult;
                }
                
                // Test via UI interaction (like original AGCopilot)
                const result = await testConfigurationUI(completeConfig, testName);
                
                if (!result.success) {
                    if (CONFIG.USE_CONFIG_CACHING) {
                        this.configCache.set(completeConfig, result);
                    }
                    return result;
                }

                const metrics = result.metrics;
                
                // Validate metrics
                if (metrics.tpPnlPercent === undefined || metrics.tokensMatched < CONFIG.MIN_TOKENS) {
                    const failResult = { success: false, reason: 'insufficient_tokens' };
                    if (CONFIG.USE_CONFIG_CACHING) {
                        this.configCache.set(completeConfig, failResult);
                    }
                    return failResult;
                }

                // Calculate score using robust scoring system (outlier-resistant)
                const robustScoring = calculateRobustScore(metrics);
                if (!robustScoring) {
                    const failResult = { success: false, reason: 'scoring_failed' };
                    if (CONFIG.USE_CONFIG_CACHING) {
                        this.configCache.set(completeConfig, failResult);
                    }
                    return failResult;
                }

                let improvement = 0;
                let currentScore = robustScoring.score;
                
                // Store scoring details in metrics for analysis
                metrics.robustScoring = robustScoring;
                metrics.optimizedMetric = CONFIG.USE_ROBUST_SCORING ? 'robustScore' : 'tpPnlPercent';
                metrics.optimizedValue = currentScore;
                
                // PnL optimization mode (default)
                improvement = currentScore - this.bestScore;

                // Update best configuration if improved
                if (improvement > 0) {
                    this.bestConfig = completeConfig;
                    this.bestScore = currentScore;
                    this.bestMetrics = metrics;
                    
                    // Enhanced logging with robust scoring details
                    if (CONFIG.USE_ROBUST_SCORING && metrics.robustScoring) {
                        const rs = metrics.robustScoring;
                        console.log(`🎉 New best! ${testName}:`);
                        console.log(`   📊 Robust Score: ${currentScore.toFixed(1)} (${rs.scoringMethod})`);
                        console.log(`   📈 Raw TP PnL: ${rs.components.rawPnL.toFixed(1)}%`);
                        console.log(`   🎯 Win Rate: ${rs.components.winRate.toFixed(1)}% | Tokens: ${metrics.tokensMatched} | Reliability: ${(rs.components.reliabilityFactor * 100).toFixed(0)}%`);
                    } else {
                        console.log(`🎉 New best! ${testName}: ${currentScore.toFixed(1)}% (${metrics.tokensMatched} tokens)`);
                    }
                    
                    // Update global reference for UI
                    window.currentBestConfig = completeConfig;
                    
                    // Update best config display in UI
                    this.updateBestConfigDisplay();
                    
                    // Add to history
                    this.history.push({
                        testName,
                        config: completeConfig,
                        metrics,
                        improvement: improvement.toFixed(1),
                        testNumber: this.testCount,
                        timestamp: new Date().toISOString()
                    });
                }

                // Cache result
                if (CONFIG.USE_CONFIG_CACHING) {
                    this.configCache.set(completeConfig, result);
                }

                return result;

            } catch (error) {
                console.error(`Error testing config: ${error.message}`);
                return { success: false, error: error.message };
            }
        }

        // Establish baseline from current state
        async establishBaseline() {
            console.log('📊 Establishing baseline configuration...');
            
            // Check if a preset was selected
            const presetDropdown = document.getElementById('preset-dropdown');
            const hasPresetSelected = presetDropdown && presetDropdown.value && presetDropdown.value !== '';
            
            let baselineConfig;
            
            if (hasPresetSelected) {
                console.log('📦 Using selected preset as baseline');
                // Use a simple default configuration when preset is selected
                baselineConfig = {
                    basic: { "Min MCAP (USD)": 5000, "Max MCAP (USD)": 25000 },
                    tokenDetails: { "Min AG Score": 3, "Max Token Age (min)": 300 },
                    wallets: { "Min Unique Wallets": 1, "Max Unique Wallets": 5, "Min KYC Wallets": 1, "Max KYC Wallets": 5 },
                    risk: { "Min Bundled %": 0, "Max Bundled %": 50, "Min Buy Ratio %": 50, "Max Buy Ratio %": 95 },
                    advanced: { "Min TTC (sec)": 10, "Max TTC (sec)": 300, "Max Liquidity %": 80 }
                };
            } else {
                console.log('📖 Reading current page settings as baseline');
                // Read current configuration from the UI
                baselineConfig = await getCurrentConfigFromUI();
                
                // If no meaningful config is found on the page, use default
                const hasAnyValues = Object.values(baselineConfig).some(section => 
                    Object.values(section).some(value => value !== undefined)
                );
                
                if (!hasAnyValues) {
                    console.log('⚠️ No configuration found on page, using default baseline');
                    baselineConfig = {
                        basic: { "Min MCAP (USD)": 5000, "Max MCAP (USD)": 25000 },
                        tokenDetails: { "Min AG Score": 3, "Max Token Age (min)": 300 },
                        wallets: { "Min Unique Wallets": 1, "Max Unique Wallets": 5, "Min KYC Wallets": 1, "Max KYC Wallets": 5 },
                        risk: { "Min Bundled %": 0, "Max Bundled %": 50, "Min Buy Ratio %": 50, "Max Buy Ratio %": 95 },
                        advanced: { "Min TTC (sec)": 10, "Max TTC (sec)": 300, "Max Liquidity %": 80 }
                    };
                } else {
                    console.log('✅ Using current page settings as baseline configuration');
                }
            }
            
            const result = await this.testConfig(baselineConfig, 'Baseline');
            
            if (result.success) {
                console.log(`✅ Baseline established: ${this.bestScore.toFixed(1)}% PnL with ${this.bestMetrics.tokensMatched} tokens`);
                // Save the baseline config as the current best config
                window.currentBestConfig = this.bestConfig;
            } else {
                console.log('❌ Failed to establish baseline - using fallback configuration');
                // Set a fallback baseline if testing failed
                this.bestConfig = baselineConfig;
                this.bestScore = -999; // Very low score to ensure any real result is better
                this.bestMetrics = { tokensMatched: 0, tpPnlPercent: -999, winRate: 0 };
                window.currentBestConfig = this.bestConfig;
            }
            
            updateProgress('✅ Baseline Established', this.getProgress(), this.getCurrentBestScore().toFixed(1), this.testCount, this.bestMetrics?.tokensMatched || '--', this.startTime);
        }

        // Generate parameter variations (keeping original logic)
        generateParameterVariations(config, param, section) {
            const rules = PARAM_RULES[param];
            if (!rules) return [];

            // Check if config is valid
            if (!config || !config[section]) {
                console.warn(`⚠️ Invalid config for ${param} in section ${section}`);
                return [];
            }

            const currentValue = config[section]?.[param];
            const variations = [];

            if (rules.type === 'integer') {
                const current = currentValue || Math.floor((rules.min + rules.max) / 2);
                for (let i = rules.min; i <= rules.max; i += rules.step) {
                    if (i !== current) {
                        variations.push(i);
                    }
                }
            } else {
                const current = currentValue || (rules.min + rules.max) / 2;
                const range = rules.max - rules.min;
                const step = rules.step || range * 0.1;

                [
                    Math.max(rules.min, current - step * 2),
                    Math.max(rules.min, current - step),
                    Math.min(rules.max, current + step),
                    Math.min(rules.max, current + step * 2),
                    rules.min,
                    rules.max,
                    Math.floor(rules.min + range * 0.25),
                    Math.floor(rules.min + range * 0.75)
                ].forEach(val => {
                    if (val !== current && !variations.includes(val)) {
                        variations.push(val);
                    }
                });
            }

            return variations.slice(0, 4).map(val => {
                const newConfig = deepClone(config);
                if (param.includes('Wallets') || param.includes('Count') || param.includes('Age') || param.includes('Score')) {
                    val = Math.round(val);
                }
                newConfig[section][param] = val;
                return { config: newConfig, name: `${param}: ${val}` };
            });
        }

        // Main parameter testing phase
        async runParameterPhase() {
            updateProgress('🔄 Phase 1: Parameter Testing', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics?.tokensMatched || '--', this.startTime);

            // Check if we have a valid baseline configuration
            if (!this.bestConfig) {
                console.error('❌ Cannot run parameter testing: No baseline configuration established');
                throw new Error('No baseline configuration established');
            }

            const parameters = Object.keys(PARAM_RULES);
            console.log(`🔍 Testing ${parameters.length} parameters:`, parameters.slice(0, 5));
            
            for (const param of parameters) {
                if (STOPPED || this.getRemainingTime() <= 0.2) break;

                const section = this.getSection(param);
                const variations = this.generateParameterVariations(this.bestConfig, param, section);
                
                if (!variations || variations.length === 0) {
                    console.log(`⚠️ No variations generated for ${param}`);
                    continue;
                }

                console.log(`🧪 Testing ${variations.length} variations for ${param}`);
                let bestImprovement = 0;
                let testedCount = 0;
                
                for (const variation of variations) {
                    if (STOPPED || this.getRemainingTime() <= 0.2) break;

                    const result = await this.testConfig(variation.config, variation.name);
                    testedCount++;
                    
                    if (result.success && result.metrics) {
                        const currentMetric = result.metrics.optimizedValue || result.metrics.tpPnlPercent || result.metrics.athPnlPercent;
                        const improvement = currentMetric - this.bestScore;
                        
                        if (improvement > bestImprovement) {
                            bestImprovement = improvement;
                        }
                        
                        console.log(`  📊 ${variation.name}: ${currentMetric?.toFixed(1)}% (improvement: ${improvement?.toFixed(1)}%)`);
                    } else {
                        console.log(`  ❌ ${variation.name}: Failed`);
                    }
                }

                console.log(`✅ Completed ${param}: tested ${testedCount} variations, best improvement: ${bestImprovement.toFixed(1)}%`);

                // Track parameter effectiveness
                this.parameterTests.push({ param, section, improvement: bestImprovement });

                // Early termination if target achieved
                if (this.bestScore >= CONFIG.TARGET_PNL) {
                    updateProgress('🎯 Target achieved early!', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics?.tokensMatched || '--', this.startTime);
                    return;
                }
            }

            // Sort parameters by effectiveness
            this.parameterTests.sort((a, b) => b.improvement - a.improvement);
            console.log('📊 Parameter effectiveness ranking:', this.parameterTests.slice(0, 5));
        }

        // Run full optimization
        async runOptimization() {
            this.startTime = Date.now();

            try {
                // Clear cache at start and force fresh start
                this.configCache.clear();
                console.log('💾 Cache cleared at start of optimization');
                
                // Also clear any global cache that might exist
                if (window.globalConfigCache) {
                    window.globalConfigCache.clear();
                    console.log('💾 Global cache also cleared');
                }

                // 1. Establish baseline
                await this.establishBaseline();

                // 2. Parameter testing phase
                await this.runParameterPhase();

                // 3. Additional optimization phases can be added here
                // (genetic algorithm, simulated annealing, etc.)

                const runtime = Math.floor((Date.now() - this.startTime) / 1000);

                return {
                    bestConfig: this.bestConfig,
                    bestScore: this.bestScore,
                    bestMetrics: this.bestMetrics,
                    testCount: this.testCount,
                    runtime: runtime,
                    targetAchieved: this.bestScore >= CONFIG.TARGET_PNL,
                    history: this.history,
                    cacheSize: this.configCache.size(),
                    parameterEffectiveness: this.parameterTests.slice(0, 10)
                };

            } catch (error) {
                console.error('Optimization error:', error);
                throw error;
            }
        }
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
                if (currentValue === "Don't care") {
                    return undefined;
                }
                return currentValue;
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
                params: ['Min AG Score', 'Max Token Age (min)', 'Min Deployer Age (min)']
            },
            wallets: {
                sectionTitle: 'Wallets',
                params: ['Min Unique Wallets', 'Max Unique Wallets', 'Min KYC Wallets', 'Max KYC Wallets']
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

                // Handle toggle buttons
                const button = container.querySelector('button');
                if (button && (labelText === "Description" || labelText === "Fresh Deployer")) {
                    const targetValue = value || "Don't care";
                    const currentValue = button.textContent.trim();
                    
                    if (currentValue !== targetValue) {
                        button.click();
                        await sleep(100);

                        const newValue = button.textContent.trim();
                        if (newValue !== targetValue && newValue !== currentValue) {
                            button.click();
                            await sleep(100);
                        }
                    }
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
    async function applyConfigToUI(config) {
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
                if (sectionConfig && typeof sectionConfig === 'object') {
                    const sectionName = sectionMap[section];
                    
                    // Open the section first
                    if (sectionName) {
                        await openSection(sectionName);
                        await sleep(300); // Wait for section to fully open
                    }

                    // Apply each field in the section
                    for (const [param, value] of Object.entries(sectionConfig)) {
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
    
    // Preset configurations (all original presets restored)
    const PRESETS = {
        WIP: {
            basic: { "Min MCAP (USD)": 4999, "Max MCAP (USD)": 29999 },
            tokenDetails: { "Min AG Score": 3 },
            wallets: { "Min Unique Wallets": 3, "Min KYC Wallets": 2, "Max Unique Wallets": 3 },
            risk: { "Min Bundled %": 0.1, "Max Vol MCAP %": 33 },
            advanced: { "Min TTC (sec)": 18, "Max TTC (sec)": 3600, "Max Liquidity %": 65 }
        },
        cabalOrRug: {
            basic: { "Min MCAP (USD)": 4000, "Max MCAP (USD)": 6000 },
            tokenDetails: { "Min Deployer Age (min)": 1, "Max Token Age (min)": 1 },
            wallets: { "Min Unique Wallets": 1, "Max Unique Wallets": 1, "Min KYC Wallets": 1, "Max KYC Wallets": 1 },
            risk: { "Max Drained %": 10, "Min Deployer Balance (SOL)": 10 },
            advanced: { "Max TTC (sec)": 1, "Min Win Pred %": 3 }
        },
        rolandProduction: {
            basic: { "Min MCAP (USD)": 4000, "Max MCAP (USD)": 6000 },
            tokenDetails: { "Min Deployer Age (min)": 1, "Max Token Age (min)": 1 },
            wallets: { "Min Unique Wallets": 1, "Max Unique Wallets": 1, "Min KYC Wallets": 1, "Max KYC Wallets": 1 },
            risk: { "Max Drained %": 10, "Min Deployer Balance (SOL)": 10 },
            advanced: { "Min Win Pred %": 2 }
        },
        bonkSuper: {
            basic: { "Min MCAP (USD)": 4000, "Max MCAP (USD)": 5000 },
            tokenDetails: { "Min AG Score": "4", "Min Deployer Age (min)": 1, "Max Token Age (min)": 1 },
            wallets: { "Min Unique Wallets": 1, "Max Unique Wallets": 1, "Min KYC Wallets": 1, "Max KYC Wallets": 1 },
            risk: { "Min Deployer Balance (SOL)": 10 },
            advanced: { "Min Win Pred %": 4 }
        },
        roland4to6K: {
            basic: { "Min MCAP (USD)": 4000, "Max MCAP (USD)": 6000 },
            tokenDetails: { "Min Deployer Age (min)": 1, "Max Token Age (min)": 1 },
            wallets: { "Min Unique Wallets": 1, "Max Unique Wallets": 1, "Min KYC Wallets": 1, "Max KYC Wallets": 1 },
            risk: { "Max Drained %": 10, "Min Deployer Balance (SOL)": 10 },
            advanced: { "Min Win Pred %": 4 }
        },
        alpha97: {
            risk: { "Min Buy Ratio %": 97, "Max Buy Ratio %": 100, "Min Vol MCAP %": 47 }
        },
        boomerBonk: {
            basic: { "Min MCAP (USD)": 4000, "Max MCAP (USD)": 5000 },
            tokenDetails: { "Min AG Score": "4", "Min Deployer Age (min)": 1, "Max Token Age (min)": 1 },
            wallets: { "Min Unique Wallets": 1, "Max Unique Wallets": 1, "Min KYC Wallets": 1, "Max KYC Wallets": 1 },
            risk: { "Min Deployer Balance (SOL)": 10 },
            advanced: { "Min Win Pred %": 2 }
        },
        boomerBonk1: {
            basic: { "Min MCAP (USD)": 4000, "Max MCAP (USD)": 5000 },
            tokenDetails: { "Min AG Score": "4", "Min Deployer Age (min)": 1, "Max Token Age (min)": 1 },
            wallets: { "Min Unique Wallets": 1, "Min KYC Wallets": 1 },
            risk: { "Max Bundled %": 75, "Min Deployer Balance (SOL)": 7 },
            advanced: { "Min Win Pred %": 4 }
        },
        oldDeployer: { 
            tokenDetails: { "Min Deployer Age (min)": 43200, "Min AG Score": "4" } 
        },
        PfMainOld: {
            basic: { "Min MCAP (USD)": 4999, "Max MCAP (USD)": 29999 },
            tokenDetails: { "Min AG Score": "3" },
            wallets: { "Min Unique Wallets": 2, "Min KYC Wallets": 2 },
            risk: { "Min Bundled %": 0.1, "Max Vol MCAP %": 33 },
            advanced: { "Min TTC (sec)": 18, "Max TTC (sec)": 3600, "Max Liquidity %": 65 }
        },
        ClaudeR6: {
            basic: { "Min MCAP (USD)": 6000, "Max MCAP (USD)": 25000 },
            tokenDetails: { "Min AG Score": "5", "Max Token Age (min)": 52, "Min Deployer Age (min)": 17 },
            wallets: { "Min Unique Wallets": 0, "Max Unique Wallets": 1, "Min KYC Wallets": 0, "Max KYC Wallets": 2 },
            risk: { "Max Bundled %": 82, "Min Vol MCAP %": 9, "Max Vol MCAP %": 90, "Min Buy Ratio %": 20, "Max Buy Ratio %": 90, "Min Deployer Balance (SOL)": 0.95, "Fresh Deployer": "Yes", "Description": "Yes" },
            advanced: { "Max Liquidity %": 66, "Max TTC (sec)": 30 }
        },
        Turbo2: {
            basic: { "Max MCAP (USD)": 40000 },
            tokenDetails: { "Min Deployer Age (min)": 10, "Min AG Score": "6", "Max Token Age (min)": 180 },
            risk: { "Min Bundled %": 0.8, "Max Vol MCAP %": 33, "Min Deployer Balance (SOL)": 4.45, "Fresh Deployer": "Yes", "Description": "Yes" },
            advanced: { "Max Liquidity %": 75, "Min Win Pred %": 30 }
        },
        bundle1_74: { 
            risk: { "Max Bundled %": 1.74 } 
        },
        deployerBalance10: { 
            risk: { "Min Deployer Balance (SOL)": 10 } 
        },
        agScore7: { 
            tokenDetails: { "Min AG Score": "7" } 
        },
        conservative: {
            basic: { "Min MCAP (USD)": 10000, "Max MCAP (USD)": 50000 },
            tokenDetails: { "Min AG Score": 4, "Min Deployer Age (min)": 60 },
            wallets: { "Min Unique Wallets": 2, "Min KYC Wallets": 2, "Max Unique Wallets": 5 },
            risk: { "Min Bundled %": 0, "Max Bundled %": 25 },
            advanced: { "Min TTC (sec)": 30, "Max Liquidity %": 70 }
        },
        aggressive: {
            basic: { "Min MCAP (USD)": 1000, "Max MCAP (USD)": 15000 },
            tokenDetails: { "Min AG Score": 2 },
            wallets: { "Min Unique Wallets": 1, "Max Unique Wallets": 10 },
            risk: { "Max Bundled %": 80, "Max Vol MCAP %": 200 },
            advanced: { "Min TTC (sec)": 5, "Max Liquidity %": 90 }
        }
    };

    // Apply preset configuration
    async function applyPreset(presetName) {
        const preset = PRESETS[presetName];
        if (!preset) {
            updateStatus(`❌ Preset '${presetName}' not found`, true);
            return;
        }

        updateStatus(`📦 Applying preset: ${presetName}...`);
        const completePreset = ensureCompleteConfig(preset);
        const success = await applyConfigToUI(completePreset);
        
        if (success) {
            updateStatus(`✅ Preset ${presetName} applied to UI successfully!`);
            // Test it to show the results
            updateStatus('📊 Testing preset configuration...');
            const result = await testConfigurationUI(preset, `Preset: ${presetName}`);
            if (result.success) {
                updateStatus(`📊 Preset results: ${result.metrics.tokensMatched} tokens, ${result.metrics.tpPnlPercent?.toFixed(1)}% TP PnL`);
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
                const success = await applyConfigToUI(completeConfig);
                
                if (success) {
                    updateStatus('✅ Clipboard configuration applied to UI successfully!');
                    // Test it to show the results
                    updateStatus('📊 Testing clipboard configuration...');
                    const result = await testConfigurationUI(config, 'Clipboard Config');
                    if (result.success) {
                        updateStatus(`📊 Clipboard config results: ${result.metrics.tokensMatched} tokens, ${result.metrics.tpPnlPercent?.toFixed(1)}% TP PnL`);
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: 2px solid #fff;
            border-radius: 15px;
            padding: 20px;
            z-index: 10000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: white;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            max-height: 90vh;
            overflow-y: auto;
        `;

        ui.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h3 style="margin: 0; font-size: 18px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                    🤖 AG Co-Pilot Enhanced
                </h3>
                <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.9;">
                    UI-Based Testing + Enhanced Metrics Extraction
                </p>
            </div>
            
            <!-- Configuration Management Section -->
            <div style="margin-bottom: 20px; border-top: 1px solid rgba(255,255,255,0.3); padding-top: 15px;">
                <h4 style="margin: 0 0 10px 0; font-size: 14px; opacity: 0.9;">📋 Configuration Management</h4>
                
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-size: 12px; font-weight: bold;">Quick Presets:</label>
                    <select id="preset-dropdown" style="width: 100%; padding: 8px; border: none; border-radius: 5px; font-size: 12px; margin-bottom: 8px; color: black; background: white;">
                        <option value="">-- Select a Preset --</option>
                        <option value="WIP">📊 WIP (Working Config)</option>
                        <option value="ClaudeR6">🤖 Claude R6</option>
                        <option value="Turbo2">⚡ Turbo2</option>
                        <option value="PfMainOld">📈 PF Main Old</option>
                        <option value="cabalOrRug">🎯 Cabal/Rug Detection</option>
                        <option value="rolandProduction">🏭 Roland Production</option>
                        <option value="bonkSuper">💪 Bonk Super</option>
                        <option value="roland4to6K">📊 Roland 4-6K</option>
                        <option value="boomerBonk">👴 Boomer Bonk</option>
                        <option value="boomerBonk1">👴 Boomer Bonk 1</option>
                        <option value="oldDeployer">⏰ Old Deployer</option>
                        <option value="alpha97">🎯 Alpha 97</option>
                        <option value="bundle1_74">📦 Bundle 1.74</option>
                        <option value="deployerBalance10">💰 Deployer Balance 10</option>
                        <option value="agScore7">⭐ AG Score 7</option>
                        <option value="conservative">🛡️ Conservative (Safe)</option>
                        <option value="aggressive">⚡ Aggressive (High Risk)</option>
                    </select>
                </div>
            </div>
            
            <!-- Optimization Settings Section -->
            <div style="margin-bottom: 20px; border-top: 1px solid rgba(255,255,255,0.3); padding-top: 15px;">
                <h4 style="margin: 0 0 10px 0; font-size: 14px; opacity: 0.9;">⚙️ Optimization Settings</h4>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <label style="display: flex; flex-direction: column;">
                        <span style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">Target PnL %:</span>
                        <input type="number" id="target-pnl" value="100" min="5" max="50" step="0.5"
                               style="padding: 6px; border: 1px solid white; border-radius: 4px; font-size: 12px; text-align: center;">
                    </label>
                    <label style="display: flex; flex-direction: column;">
                        <span style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">Min Tokens:</span>
                        <input type="number" id="min-tokens" value="50" min="1" max="100" step="1"
                               style="padding: 6px; border: 1px solid white; border-radius: 4px; font-size: 12px; text-align: center;">
                    </label>
                    <label style="display: flex; flex-direction: column;">
                        <span style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">Runtime (min):</span>
                        <input type="number" id="runtime-min" value="30" min="5" max="120" step="5"
                               style="padding: 6px; border: 1px solid white; border-radius: 4px; font-size: 12px; text-align: center;">
                    </label>
                </div>
                
                <div style="margin-bottom: 15px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 5px;">
                    <label style="display: flex; align-items: center; cursor: pointer; margin-bottom: 8px;">
                        <input type="checkbox" id="robust-scoring" checked style="margin-right: 8px; transform: scale(1.2);">
                        <span style="font-size: 12px; font-weight: bold;">🛡️ Outlier-Resistant Scoring</span>
                    </label>
                    <div style="font-size: 10px; opacity: 0.8; margin-bottom: 10px; line-height: 1.3;">
                        Combines win rate and sample size for more reliable optimization.
                    </div>
                    
                    <label style="display: flex; align-items: center; cursor: pointer; margin-bottom: 8px;">
                        <input type="checkbox" id="simulated-annealing" checked style="margin-right: 8px; transform: scale(1.2);">
                        <span style="font-size: 12px; font-weight: bold;">🔥 Simulated Annealing</span>
                    </label>
                    <div style="font-size: 10px; opacity: 0.8; margin-bottom: 10px; line-height: 1.3;">
                        Escape local maxima by occasionally accepting worse solutions.
                    </div>
                    
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="checkbox" id="multiple-starting-points" unchecked style="margin-right: 8px; transform: scale(1.2);">
                        <span style="font-size: 12px; font-weight: bold;">🎯 Multiple Starting Points</span>
                    </label>
                    <div style="font-size: 10px; opacity: 0.8; margin-top: 4px; line-height: 1.3;">
                        Start from all presets to find globally optimal solutions.
                    </div>
                </div>
            </div>
            
            <!-- Control Buttons -->
            <div style="margin-bottom: 15px;">
                <button id="start-optimization" style="
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
                    🚀 Start Enhanced Optimization
                </button>
            </div>
            
            <div style="margin-bottom: 15px;">
                <button id="stop-optimization" style="
                    width: 100%; 
                    padding: 8px; 
                    background: rgba(255,255,255,0.2); 
                    border: 1px solid rgba(255,255,255,0.3); 
                    border-radius: 8px; 
                    color: white; 
                    font-weight: bold; 
                    cursor: pointer;
                    font-size: 12px;
                    display: none;
                ">
                    ⏹️ Stop Optimization
                </button>
            </div>
            
            <!-- Results Section -->
            <div id="best-config-display" style="
                background: rgba(76, 175, 80, 0.2); 
                border: 1px solid rgba(76, 175, 80, 0.4); 
                border-radius: 5px; 
                padding: 10px; 
                margin-bottom: 15px;
                display: none;
            ">
                <h5 style="margin: 0 0 8px 0; font-size: 12px; color: #4CAF50;">🏆 Best Configuration Found:</h5>
                <div id="best-config-stats" style="font-size: 11px; margin-bottom: 8px;"></div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <button onclick="applyBestConfigToUI()" style="padding: 8px; background: rgba(33, 150, 243, 0.3); border: 1px solid rgba(33, 150, 243, 0.6); border-radius: 4px; color: white; font-size: 11px; cursor: pointer;">⚙️ Apply to UI</button>
                    <button onclick="copyBestConfigToClipboard()" style="padding: 8px; background: rgba(156, 39, 176, 0.3); border: 1px solid rgba(156, 39, 176, 0.6); border-radius: 4px; color: white; font-size: 11px; cursor: pointer;">📋 Copy Config</button>
                </div>
            </div>
            
            <!-- Footer -->
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
        
        // Make functions globally available for onclick handlers
        window.applyBestConfigToUI = async function() {
            if (window.currentBestConfig) {
                console.log('⚙️ Applying best configuration to UI...');
                const success = await applyConfigToUI(window.currentBestConfig);
                if (success) {
                    console.log('✅ Best configuration applied to UI successfully!');
                } else {
                    console.log('❌ Failed to apply best configuration to UI');
                }
            } else {
                console.log('❌ No best configuration available to apply');
            }
        };
        
        window.copyBestConfigToClipboard = function() {
            if (window.currentBestConfig) {
                const configText = JSON.stringify(window.currentBestConfig, null, 2);
                navigator.clipboard.writeText(configText).then(() => {
                    console.log('📋 Best configuration copied to clipboard!');
                }).catch(err => {
                    console.log('❌ Failed to copy configuration to clipboard');
                });
            } else {
                console.log('❌ No best configuration available to copy');
            }
        };
        
        return ui;
    }

    function updateStatus(message, isError = false) {
        // Only log to console, no UI logging
        const icon = isError ? '❌' : '📝';
        console.log(`${icon} ${message}`);
    }

    function updateUIBackground(isCompleted = false) {
        const ui = document.getElementById('ag-copilot-enhanced-ui');
        if (ui) {
            if (isCompleted) {
                // Green gradient for completed optimization
                ui.style.background = 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)';
            } else {
                // Original blue gradient for active/starting optimization
                ui.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            }
        }
    }

    function updateProgress(message, progress, bestScore, testCount, tokensMatched, startTime) {
        // Log progress to console only
        if (startTime) {
            const runtime = Math.floor((Date.now() - startTime) / 1000);
            console.log(`📊 ${message} | Progress: ${(progress || 0).toFixed(1)}% | Best: ${bestScore}% | Tests: ${testCount} | Tokens: ${tokensMatched} | Runtime: ${runtime}s`);
        } else {
            console.log(`📊 ${message}`);
        }
    }

    // ========================================
    // 🎮 EVENT HANDLERS
    // ========================================
    function setupEventHandlers() {
        // Auto-apply preset when selected
        document.getElementById('preset-dropdown').addEventListener('change', async () => {
            const selectedPreset = document.getElementById('preset-dropdown').value;
            if (selectedPreset) {
                console.log(`📦 Applying preset: ${selectedPreset}...`);
                await applyPreset(selectedPreset);
                // Reset dropdown after applying
                document.getElementById('preset-dropdown').value = '';
            }
        });

        // Start optimization button
        document.getElementById('start-optimization').addEventListener('click', async () => {
            const targetPnl = parseFloat(document.getElementById('target-pnl').value) || 100;
            const minTokens = parseInt(document.getElementById('min-tokens').value) || 50;
            const runtimeMin = parseInt(document.getElementById('runtime-min').value) || 30;
            const robustScoring = document.getElementById('robust-scoring').checked;
            const simulatedAnnealing = document.getElementById('simulated-annealing').checked;
            const multipleStartingPoints = document.getElementById('multiple-starting-points').checked;
            
            // Reset UI background to original color when starting
            updateUIBackground(false);
            
            // Update config
            CONFIG.TARGET_PNL = targetPnl;
            CONFIG.MIN_TOKENS = minTokens;
            CONFIG.MAX_RUNTIME_MIN = runtimeMin;
            CONFIG.USE_ROBUST_SCORING = robustScoring;
            CONFIG.USE_SIMULATED_ANNEALING = simulatedAnnealing;
            CONFIG.USE_MULTIPLE_STARTING_POINTS = multipleStartingPoints;
            
            const features = [];
            if (robustScoring) features.push('outlier-resistant scoring');
            if (simulatedAnnealing) features.push('simulated annealing');
            if (multipleStartingPoints) features.push('multiple starting points');
            
            const featuresStr = features.length > 0 ? ` with ${features.join(', ')}` : '';
            console.log(`🚀 Starting optimization: Target ${targetPnl}% PnL, Min ${minTokens} tokens, ${runtimeMin} min runtime${featuresStr}`);
            
            // UI state
            document.getElementById('start-optimization').style.display = 'none';
            document.getElementById('stop-optimization').style.display = 'block';
            
            // Reset stopped flag
            STOPPED = false;
            
            // Start optimization
            try {
                const optimizer = new EnhancedOptimizer();
                const results = await optimizer.runOptimization();
                
                if (results && results.bestConfig) {
                    console.log(`🎉 Optimization completed! Best score: ${results.bestScore.toFixed(1)}% after ${results.testCount} tests`);
                    window.currentBestConfig = results.bestConfig;
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
                // Reset UI state
                document.getElementById('start-optimization').style.display = 'block';
                document.getElementById('stop-optimization').style.display = 'none';
            }
        });
        
        // Stop optimization button
        document.getElementById('stop-optimization').addEventListener('click', () => {
            STOPPED = true;
            console.log('⏹️ Optimization stopped by user');
            // Keep original background when manually stopped
            document.getElementById('start-optimization').style.display = 'block';
            document.getElementById('stop-optimization').style.display = 'none';
        });
        
        // Close button
        document.getElementById('close-btn').addEventListener('click', () => {
            document.getElementById('ag-copilot-enhanced-ui').remove();
        });
    }

    // ========================================
    // 🎬 INITIALIZATION
    // ========================================
    console.log('🔧 Initializing AG Co-Pilot Enhanced UI...');
    
    // Create and setup UI
    const ui = createUI();
    setupEventHandlers();
    
    console.log('✅ AG Co-Pilot Enhanced ready!');
    console.log('🚀 Features: UI-based testing, accurate TP PnL % extraction, all original optimizations, reliable metrics');
    
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
    
})();
