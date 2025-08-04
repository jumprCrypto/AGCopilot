// Enhanced Optimizer Module - Main optimization class with all advanced features
// Contains the primary optimization algorithm with parameter testing, validation, and advanced phases

export class EnhancedOptimizer {
    constructor(initialConfig = null) {
        this.configCache = new Map(); // Simple cache for modular version
        this.bestConfig = null;
        this.bestScore = -Infinity;
        this.bestMetrics = { totalTokens: 0, tpPnlPercent: 0, winRate: 0 };
        this.testCount = 0;
        this.startTime = Date.now();
        this.history = [];
        
        // Store initial configuration to start from
        this.initialConfig = initialConfig;
        
        // Parameter tracking
        this.parameterTests = [];
        
        // Advanced optimization components (will be injected)
        this.latinSampler = null;
        this.simulatedAnnealing = null;
        this.geneticOptimizer = null;
        
        // Global stop flag
        window.STOPPED = false;
    }
    
    // Initialize advanced components with dependencies
    initializeAdvancedComponents(LatinHypercubeSampler, SimulatedAnnealing, GeneticOptimizer) {
        this.latinSampler = new LatinHypercubeSampler();
        this.simulatedAnnealing = new SimulatedAnnealing(this);
        this.geneticOptimizer = new GeneticOptimizer(this);
    }
    
    // Deep clone utility (simple version for modular use)
    deepClone(obj) {
        if (obj === null || typeof obj !== "object") return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (Array.isArray(obj)) return obj.map(item => this.deepClone(item));
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    }
    
    // Get current best score
    getCurrentBestScore() {
        return this.bestScore;
    }
    
    // Get current best config
    getCurrentBestConfig() {
        return this.bestConfig || this.initialConfig;
    }
    
    // Get section for parameter
    getSection(param) {
        const sectionMap = {
            'Min MCAP (USD)': 'basic', 'Max MCAP (USD)': 'basic',
            'Min Deployer Age (min)': 'tokenDetails', 'Min Token Age (sec)': 'tokenDetails', 
            'Max Token Age (sec)': 'tokenDetails', 'Min AG Score': 'tokenDetails',
            'Min Holders': 'wallets', 'Max Holders': 'wallets', 'Min Unique Wallets': 'wallets',
            'Max Unique Wallets': 'wallets', 'Min KYC Wallets': 'wallets', 'Max KYC Wallets': 'wallets',
            'Min Bundled %': 'risk', 'Max Bundled %': 'risk', 'Min Deployer Balance (SOL)': 'risk',
            'Min Buy Ratio %': 'risk', 'Max Buy Ratio %': 'risk', 'Min Vol MCAP %': 'risk',
            'Max Vol MCAP %': 'risk', 'Max Drained %': 'risk', 'Max Drained Count': 'risk',
            'Min TTC (sec)': 'advanced', 'Max TTC (sec)': 'advanced', 'Min Win Pred %': 'advanced', 
            'Max Liquidity %': 'advanced'
        };
        return sectionMap[param] || 'basic';
    }
    
    // Get progress percentage
    getProgress() {
        const elapsed = Date.now() - this.startTime;
        const maxRuntime = (window.AGCopilot?.CONFIG?.MAX_RUNTIME_MIN || 30) * 60 * 1000;
        return Math.min(100, (elapsed / maxRuntime) * 100);
    }
    
    // Get remaining time (0-1)
    getRemainingTime() {
        const elapsed = Date.now() - this.startTime;
        const maxRuntime = (window.AGCopilot?.CONFIG?.MAX_RUNTIME_MIN || 30) * 60 * 1000;
        return Math.max(0, (maxRuntime - elapsed) / maxRuntime);
    }
    
    // Test a configuration
    async testConfig(config, testName) {
        if (window.STOPPED || this.getRemainingTime() <= 0) {
            return { success: false, error: 'Stopped or out of time' };
        }
        
        // Check if the test function is available
        if (!window.AGCopilot?.testConfigurationAPI) {
            console.error('❌ testConfigurationAPI not available in window.AGCopilot');
            return { success: false, error: 'testConfigurationAPI not available' };
        }
        
        try {
            // Use global test function (will be injected)
            const result = await window.AGCopilot.testConfigurationAPI(config, testName);
            
            if (result.success) {
                this.testCount++;
                
                // Calculate score based on configuration
                const metrics = result.metrics;
                let currentScore;
                
                if (window.AGCopilot?.CONFIG?.USE_ROBUST_SCORING && window.AGCopilot.calculateRobustScore) {
                    const robustScoring = window.AGCopilot.calculateRobustScore(metrics);
                    currentScore = robustScoring?.score || metrics.tpPnlPercent;
                } else {
                    currentScore = metrics.tpPnlPercent;
                }
                
                // Update best if this is better
                if (currentScore > this.bestScore) {
                    this.bestScore = currentScore;
                    this.bestConfig = this.deepClone(config);
                    this.bestMetrics = metrics;
                    
                    // Update global reference and tracker
                    window.currentBestConfig = this.bestConfig;
                    if (window.optimizationTracker) {
                        // Create a result object with config and score for the tracker
                        const resultWithConfig = {
                            ...result,
                            config: this.deepClone(config),
                            metrics: {
                                ...result.metrics,
                                score: currentScore  // Add the calculated score
                            }
                        };
                        window.optimizationTracker.setCurrentBest(resultWithConfig, testName);
                    }
                    
                    console.log(`🎉 New best! Score: ${currentScore.toFixed(1)}, TP PnL: ${metrics.tpPnlPercent.toFixed(1)}%, Tokens: ${metrics.totalTokens}`);
                }
                
                // Add to history
                this.history.push({
                    config: this.deepClone(config),
                    score: currentScore,
                    metrics,
                    testName,
                    timestamp: Date.now()
                });
            }
            
            return result;
            
        } catch (error) {
            console.error(`❌ Error testing config "${testName}":`, error);
            return { success: false, error: error.message };
        }
    }
    
    // Validate min/max parameter pairs
    validateConfigMinMax(config) {
        const minMaxPairs = [
            ['Min MCAP (USD)', 'Max MCAP (USD)'],
            ['Min Token Age (sec)', 'Max Token Age (sec)'],
            ['Min Holders', 'Max Holders'],
            ['Min Unique Wallets', 'Max Unique Wallets'],
            ['Min KYC Wallets', 'Max KYC Wallets'],
            ['Min Bundled %', 'Max Bundled %'],
            ['Min Buy Ratio %', 'Max Buy Ratio %'],
            ['Min Vol MCAP %', 'Max Vol MCAP %'],
            ['Min TTC (sec)', 'Max TTC (sec)']
        ];
        
        let valid = true;
        for (const [minParam, maxParam] of minMaxPairs) {
            const minValue = this.getParamValue(config, minParam);
            const maxValue = this.getParamValue(config, maxParam);
            
            if (minValue !== undefined && maxValue !== undefined && minValue > maxValue) {
                console.warn(`⚠️ Invalid config: ${minParam} (${minValue}) > ${maxParam} (${maxValue})`);
                valid = false;
            }
        }
        
        return valid;
    }
    
    // Get parameter value from nested config
    getParamValue(config, paramName) {
        for (const section of Object.values(config)) {
            if (section && typeof section === 'object' && section[paramName] !== undefined) {
                return section[paramName];
            }
        }
        return undefined;
    }
    
    // Generate parameter variations
    generateParameterVariations(config, param, section, deepDive = false) {
        const rules = window.AGCopilot?.PARAM_RULES?.[param];
        if (!rules) return [];
        
        const variations = [];
        const currentValue = config[section]?.[param];
        
        if (rules.type === 'string') {
            // For string types (like AG Score), try different values
            for (let i = 1; i <= 10; i++) {
                const val = i.toString();
                if (val !== currentValue) {
                    const newConfig = this.deepClone(config);
                    newConfig[section][param] = val;
                    variations.push({ config: newConfig, name: `${param}=${val}` });
                }
            }
        } else {
            const current = currentValue || (rules.min + rules.max) / 2;
            const range = rules.max - rules.min;
            const step = rules.step || range * 0.1;
            
            const values = [];
            
            if (deepDive) {
                // Fine-grained variations for deep dive
                const fineStep = step / 2;
                for (let multiplier = -3; multiplier <= 3; multiplier++) {
                    const val = Math.max(rules.min, Math.min(rules.max, current + fineStep * multiplier));
                    if (val !== current && !values.includes(val)) {
                        values.push(val);
                    }
                }
            } else {
                // Standard variations
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
                    if (val !== current && !values.includes(val)) {
                        values.push(val);
                    }
                });
            }
            
            values.forEach(val => {
                const newConfig = this.deepClone(config);
                newConfig[section][param] = val;
                if (this.validateConfigMinMax(newConfig)) {
                    variations.push({ config: newConfig, name: `${param}=${val}` });
                }
            });
        }
        
        return variations.slice(0, deepDive ? 12 : 8);
    }
    
    // Main parameter testing phase
    async runParameterPhase() {
        console.log('🔍 Starting parameter testing phase...');
        
        // Test each parameter systematically
        const allParams = Object.keys(window.AGCopilot?.PARAM_RULES || {});
        let parameterImpacts = [];
        
        for (const param of allParams) {
            if (window.STOPPED || this.getRemainingTime() <= 0.4) break;
            
            const section = this.getSection(param);
            const variations = this.generateParameterVariations(this.bestConfig, param, section);
            
            let bestImprovement = 0;
            let testCount = 0;
            
            for (const variation of variations.slice(0, 4)) { // Limit for time
                if (window.STOPPED) break;
                
                const result = await this.testConfig(variation.config, `${param} test`);
                if (result.success) {
                    testCount++;
                    const improvement = result.metrics.tpPnlPercent - this.bestMetrics.tpPnlPercent;
                    if (improvement > bestImprovement) {
                        bestImprovement = improvement;
                    }
                }
            }
            
            if (testCount > 0) {
                parameterImpacts.push({
                    param,
                    section,
                    improvement: bestImprovement,
                    testsRun: testCount
                });
            }
        }
        
        // Sort by impact
        parameterImpacts.sort((a, b) => b.improvement - a.improvement);
        this.parameterTests = parameterImpacts;
        
        console.log('📊 Parameter impact analysis complete:', this.parameterTests.slice(0, 5));
    }
    
    // Latin Hypercube Sampling phase
    async runLatinHypercubePhase() {
        if (!this.latinSampler) return;
        
        console.log('🎲 Starting Latin Hypercube Sampling phase...');
        
        const topParams = this.parameterTests.slice(0, 6).map(p => p.param);
        const variations = this.generateLatinHypercubeVariations(this.bestConfig, topParams, 8);
        
        for (const variation of variations) {
            if (window.STOPPED || this.getRemainingTime() <= 0.3) break;
            
            await this.testConfig(variation.config, variation.name);
        }
    }
    
    // Generate Latin Hypercube variations
    generateLatinHypercubeVariations(baseConfig, parameters, numSamples = 6) {
        if (!this.latinSampler) return [];
        
        const samples = this.latinSampler.generateSamples(parameters, numSamples);
        const variations = [];
        
        for (const sample of samples) {
            const config = this.deepClone(baseConfig);
            let name = 'LHS: ';
            
            for (const [param, value] of Object.entries(sample)) {
                const section = this.getSection(param);
                if (config[section]) {
                    config[section][param] = value;
                    name += `${param}=${value} `;
                }
            }
            
            variations.push({ config, name: name.trim() });
        }
        
        return variations;
    }
    
    // Correlated parameter testing
    async runCorrelatedParameterPhase() {
        console.log('🔗 Starting correlated parameter testing...');
        
        const correlatedVariations = this.generateCorrelatedVariations(this.bestConfig);
        
        for (const variation of correlatedVariations) {
            if (window.STOPPED || this.getRemainingTime() <= 0.1) break;
            
            await this.testConfig(variation.config, variation.name);
        }
    }
    
    // Generate correlated parameter variations
    generateCorrelatedVariations(baseConfig) {
        const variations = [];
        
        // MCAP correlation
        const mcapRanges = [
            { min: 5000, max: 20000 },
            { min: 15000, max: 35000 },
            { min: 25000, max: 50000 }
        ];
        
        mcapRanges.forEach((range, index) => {
            const config = this.deepClone(baseConfig);
            config.basic['Min MCAP (USD)'] = range.min;
            config.basic['Max MCAP (USD)'] = range.max;
            variations.push({ 
                config, 
                name: `MCAP Range ${index + 1}: ${range.min}-${range.max}` 
            });
        });
        
        // Wallet correlation
        const walletRanges = [
            { minUnique: 1, maxUnique: 3, minKYC: 0, maxKYC: 2 },
            { minUnique: 2, maxUnique: 5, minKYC: 1, maxKYC: 4 },
            { minUnique: 3, maxUnique: 7, minKYC: 2, maxKYC: 6 }
        ];
        
        walletRanges.forEach((range, index) => {
            const config = this.deepClone(baseConfig);
            config.wallets['Min Unique Wallets'] = range.minUnique;
            config.wallets['Max Unique Wallets'] = range.maxUnique;
            config.wallets['Min KYC Wallets'] = range.minKYC;
            config.wallets['Max KYC Wallets'] = range.maxKYC;
            variations.push({ 
                config, 
                name: `Wallet Range ${index + 1}` 
            });
        });
        
        return variations;
    }
    
    // Deep dive phase
    async runDeepDive() {
        console.log('🔬 Starting deep dive analysis...');
        
        // Deep dive on top 3 most effective parameters
        const topParams = this.parameterTests.slice(0, 3);
        
        for (const paramTest of topParams) {
            if (window.STOPPED || this.getRemainingTime() <= 0.02) break;
            
            // Generate more fine-grained variations
            const variations = this.generateParameterVariations(this.bestConfig, paramTest.param, paramTest.section, true);
            
            for (const variation of variations) {
                if (window.STOPPED) break;
                await this.testConfig(variation.config, `Deep dive: ${variation.name}`);
            }
        }
    }
    
    // Establish baseline
    async establishBaseline() {
        if (this.initialConfig) {
            console.log('🎯 Using provided initial configuration as baseline...');
            // Ensure the config is complete before testing
            const completeConfig = window.AGCopilot?.ensureCompleteConfig ? 
                window.AGCopilot.ensureCompleteConfig(this.initialConfig) : 
                this.initialConfig;
            await this.testConfig(completeConfig, 'Initial baseline');
        } else {
            console.log('🎯 Establishing baseline from default configuration...');
            // For modular version, we'll use a more permissive default config
            const defaultConfig = {
                basic: { 
                    "Max MCAP (USD)": 50000     // Higher maximum for more tokens
                },
                tokenDetails: {
                    "Min AG Score": 3           // Add reasonable AG Score filter
                },
                wallets: { 
                    "Min Unique Wallets": 1,    // Lower minimum
                    "Max Unique Wallets": 8     // Higher maximum
                },
                risk: { 
                    "Min Bundled %": 0, 
                    "Max Buy Ratio %": 100
                },
                advanced: { 
                    "Max Liquidity %": 100       // Higher maximum
                }
            };
            const completeConfig = window.AGCopilot?.ensureCompleteConfig ? 
                window.AGCopilot.ensureCompleteConfig(defaultConfig) : 
                defaultConfig;
            await this.testConfig(completeConfig, 'Default baseline');
        }
    }
    
    // Main optimization runner
    async runOptimization() {
        this.startTime = Date.now();
        window.STOPPED = false;
        
        // Start optimization tracking
        if (window.optimizationTracker) {
            window.optimizationTracker.startOptimization();
        }
        
        try {
            console.log('🚀 Starting Enhanced Optimization...');
            
            // 1. Establish baseline
            await this.establishBaseline();
            
            // 2. Parameter testing phase
            if (this.getRemainingTime() > 0.6 && !window.STOPPED) {
                await this.runParameterPhase();
            }
            
            // 3. Latin Hypercube Sampling
            if (this.getRemainingTime() > 0.4 && !window.STOPPED && this.parameterTests.length > 0) {
                await this.runLatinHypercubePhase();
            }
            
            // 4. Correlated Parameter testing
            if (this.getRemainingTime() > 0.3 && !window.STOPPED) {
                await this.runCorrelatedParameterPhase();
            }
            
            // 5. Simulated Annealing
            if (this.getRemainingTime() > 0.15 && !window.STOPPED && this.simulatedAnnealing) {
                await this.simulatedAnnealing.runSimulatedAnnealing();
            }
            
            // 6. Genetic Algorithm
            if (this.getRemainingTime() > 0.1 && !window.STOPPED && this.geneticOptimizer) {
                await this.geneticOptimizer.runGeneticOptimization();
            }
            
            // 7. Deep dive
            if (this.getRemainingTime() > 0.05 && !window.STOPPED && this.parameterTests.length > 0) {
                await this.runDeepDive();
            }
            
            const runtime = Math.floor((Date.now() - this.startTime) / 1000);
            
            console.log('✅ Optimization complete!');
            console.log(`🏆 Best Score: ${this.bestScore.toFixed(1)}`);
            console.log(`📊 Tests Run: ${this.testCount}`);
            console.log(`⏱️ Runtime: ${runtime}s`);
            
            return {
                bestConfig: this.bestConfig,
                bestScore: this.bestScore,
                bestMetrics: this.bestMetrics,
                testCount: this.testCount,
                runtime: runtime,
                targetAchieved: this.bestScore >= (parseFloat(document.getElementById('target-pnl')?.value) || 100),
                history: this.history,
                parameterEffectiveness: this.parameterTests.slice(0, 10)
            };
            
        } catch (error) {
            console.error('❌ Optimization error:', error);
            
            // Return a partial result object even on error, so chained optimization can continue
            const runtime = Math.floor((Date.now() - this.startTime) / 1000);
            return {
                bestConfig: this.bestConfig,
                bestScore: this.bestScore,
                bestMetrics: this.bestMetrics,
                testCount: this.testCount,
                runtime: runtime,
                targetAchieved: false,
                history: this.history,
                parameterEffectiveness: this.parameterTests.slice(0, 10),
                error: error.message
            };
        }
    }
}
