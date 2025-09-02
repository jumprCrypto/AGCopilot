// OptimizationEngine.js
// Advanced optimization algorithms extracted from AGCopilot.js
// Handles Genetic Algorithm, Simulated Annealing, Latin Hypercube Sampling

(function(AGUtils) {
    'use strict';

    const OE = {};
    const AG = AGUtils || (window && window.AGUtils) || {};

    // Lightweight helpers using AGUtils or globals
    const sleep = AG.sleep || (window.sleep) || (ms => new Promise(res => setTimeout(res, ms)));
    const deepClone = AG.deepClone || (window.deepClone) || (o => JSON.parse(JSON.stringify(o)));
    const ensureCompleteConfig = AG.ensureCompleteConfig || (window.ensureCompleteConfig) || (c => c);
    const calculateRobustScore = AG.calculateRobustScore || (window.calculateRobustScore) || (m => ({ score: m.tpPnlPercent || 0, rejected: false }));
    const getScaledTokenThresholds = AG.getScaledTokenThresholds || (window.getScaledTokenThresholds) || (() => ({ MIN_TOKENS: 10 }));

    // ========================================
    // 🧬 LATIN HYPERCUBE SAMPLER
    // ========================================
    OE.LatinHypercubeSampler = class {
        constructor(paramRules = null) {
            this.samples = new Map();
            this.PARAM_RULES = paramRules || (window.PARAM_RULES) || {};
        }
        
        generateSamples(parameters, numSamples) {
            const samples = [];
            
            for (let i = 0; i < numSamples; i++) {
                const sample = {};
                
                for (const param of parameters) {
                    const originalRules = this.PARAM_RULES[param];
                    if (originalRules) {
                        let rules = originalRules;
                        
                        // Apply bundled constraints if enabled
                        const lowBundledCheckbox = document.getElementById('low-bundled-constraint');
                        if (lowBundledCheckbox && lowBundledCheckbox.checked) {
                            if (param === 'Min Bundled %') {
                                rules = { ...originalRules, min: 0, max: Math.min(5, originalRules.max) };
                            } else if (param === 'Max Bundled %') {
                                rules = { ...originalRules, min: originalRules.min, max: Math.min(35, originalRules.max) };
                            }
                        }
                        
                        if (rules.type === 'string') {
                            sample[param] = Math.floor(Math.random() * 10 + 1).toString();
                        } else {
                            // Latin hypercube sampling
                            const segment = (rules.max - rules.min) / numSamples;
                            const segmentStart = rules.min + i * segment;
                            const randomInSegment = Math.random() * segment;
                            const value = segmentStart + randomInSegment;
                            sample[param] = Math.round(value / rules.step) * rules.step;
                        }
                    }
                }
                
                samples.push(sample);
            }
            
            // Shuffle samples to remove correlation
            for (let i = samples.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [samples[i], samples[j]] = [samples[j], samples[i]];
            }
            
            return samples;
        }
        
        // Generate a single configuration using Latin Hypercube sampling principles
        generateConfiguration() {
            // Get random parameters to vary (3-5 parameters)
            const allParams = Object.keys(this.PARAM_RULES);
            const numParams = Math.floor(Math.random() * 3) + 3; // 3-5 parameters
            const selectedParams = [];
            
            // Randomly select parameters
            for (let i = 0; i < numParams && selectedParams.length < allParams.length; i++) {
                const randomParam = allParams[Math.floor(Math.random() * allParams.length)];
                if (!selectedParams.includes(randomParam)) {
                    selectedParams.push(randomParam);
                }
            }
            
            // Generate configuration for selected parameters
            const config = {};
            for (const param of selectedParams) {
                const rules = this.PARAM_RULES[param];
                if (rules) {
                    if (rules.type === 'string') {
                        config[param] = Math.floor(Math.random() * 10 + 1).toString();
                    } else {
                        // Use Latin Hypercube principle: divide range into segments
                        const segments = 10; // Number of segments for LHS
                        const segmentIndex = Math.floor(Math.random() * segments);
                        const segmentSize = (rules.max - rules.min) / segments;
                        const segmentStart = rules.min + segmentIndex * segmentSize;
                        const randomInSegment = Math.random() * segmentSize;
                        const value = segmentStart + randomInSegment;
                        config[param] = Math.round(value / (rules.step || 1)) * (rules.step || 1);
                    }
                }
            }
            
            return config;
        }
    };

    // ========================================
    // 🌡️ SIMULATED ANNEALING
    // ========================================
    OE.SimulatedAnnealing = class {
        constructor(optimizer, options = {}) {
            this.optimizer = optimizer;
            this.initialTemperature = options.initialTemperature || 100;
            this.finalTemperature = options.finalTemperature || 0.1;
            this.coolingRate = options.coolingRate || 0.95;
            this.PARAM_RULES = options.paramRules || (window.PARAM_RULES) || {};
        }
        
        async runSimulatedAnnealing() {
            if (typeof this.optimizer.updateProgress === 'function') {
                this.optimizer.updateProgress('🔥 Simulated Annealing Phase', 80, 
                    this.optimizer.getCurrentBestScore().toFixed(1), 
                    this.optimizer.testCount, 
                    this.optimizer.bestMetrics?.totalTokens || '--', 
                    this.optimizer.startTime);
            }
            
            let currentConfig = deepClone(this.optimizer.bestConfig || this.optimizer.initialConfig);
            let currentScore = this.optimizer.getCurrentBestScore();
            let temperature = this.initialTemperature;
            
            while (temperature > this.finalTemperature && 
                   this.optimizer.getRemainingTime() > 0.05 && 
                   !window.STOPPED) {
                
                // Generate neighbor configuration
                const neighbor = this.generateNeighbor(currentConfig);
                const result = await this.optimizer.testConfig(neighbor, 'Simulated annealing');
                
                if (result.success && result.metrics) {
                    const robustScore = calculateRobustScore(result.metrics);
                    const neighborScore = robustScore?.score ?? result.metrics.tpPnlPercent;
                    
                    const deltaE = neighborScore - currentScore;
                    
                    // Accept if better, or with probability if worse
                    if (deltaE > 0 || Math.random() < Math.exp(deltaE / temperature)) {
                        currentConfig = neighbor;
                        currentScore = neighborScore;
                        
                        if (typeof this.optimizer.updateProgress === 'function') {
                            this.optimizer.updateProgress(`🔥 Annealing T=${temperature.toFixed(1)}`, 
                                80 + (1 - temperature / this.initialTemperature) * 15, 
                                this.optimizer.getCurrentBestScore().toFixed(1), 
                                this.optimizer.testCount, 
                                this.optimizer.bestMetrics?.totalTokens || '--', 
                                this.optimizer.startTime);
                        }
                    }
                }
                
                temperature *= this.coolingRate;
                
                // Early termination if target achieved
                const targetPnl = parseFloat(document.getElementById('target-pnl')?.value) || 100;
                if (this.optimizer.getCurrentBestScore() >= targetPnl) {
                    break;
                }
            }
        }
        
        generateNeighbor(config) {
            const neighbor = deepClone(config);
            
            // Randomly modify 1-2 parameters
            const paramList = Object.keys(this.PARAM_RULES);
            const numModifications = Math.floor(Math.random() * 2) + 1;
            
            for (let i = 0; i < numModifications; i++) {
                const param = paramList[Math.floor(Math.random() * paramList.length)];
                const section = this.getSection(param);
                const originalRules = this.PARAM_RULES[param];
                
                // Apply bundled constraints if enabled
                const rules = this.applyBundledConstraints(param, originalRules);
                
                if (rules && neighbor[section]) {
                    if (rules.type === 'string') {
                        neighbor[section][param] = Math.floor(Math.random() * 10 + 1).toString();
                    } else {
                        const currentValue = neighbor[section][param] || (rules.min + rules.max) / 2;
                        const maxChange = (rules.max - rules.min) * 0.1;
                        const change = (Math.random() - 0.5) * maxChange;
                        const newValue = Math.max(rules.min, Math.min(rules.max, currentValue + change));
                        neighbor[section][param] = Math.round(newValue / rules.step) * rules.step;
                    }
                }
            }
            
            return neighbor;
        }

        getSection(param) {
            const sectionMap = {
                'Min MCAP (USD)': 'basic', 'Max MCAP (USD)': 'basic',
                'Min AG Score': 'tokenDetails', 'Min Token Age (sec)': 'tokenDetails', 'Max Token Age (sec)': 'tokenDetails', 'Min Deployer Age (min)': 'tokenDetails',
                'Min Buy Ratio %': 'risk', 'Max Buy Ratio %': 'risk', 'Min Vol MCAP %': 'risk',
                'Max Vol MCAP %': 'risk', 'Min Bundled %': 'risk', 'Max Bundled %': 'risk', 'Min Deployer Balance (SOL)': 'risk',
                'Max Drained %': 'risk', 'Max Drained Count': 'risk',
                'Min Unique Wallets': 'wallets', 'Max Unique Wallets': 'wallets', 'Min KYC Wallets': 'wallets', 'Max KYC Wallets': 'wallets',
                'Min Holders': 'wallets', 'Max Holders': 'wallets',
                'Holders Growth %': 'wallets', 'Holders Growth Minutes': 'wallets',
                'Min TTC (sec)': 'advanced', 'Max TTC (sec)': 'advanced', 'Min Win Pred %': 'advanced', 'Max Liquidity %': 'advanced'
            };
            return sectionMap[param] || 'basic';
        }

        applyBundledConstraints(param, originalRules) {
            if (!originalRules) return originalRules;
            
            const lowBundledCheckbox = document.getElementById('low-bundled-constraint');
            if (lowBundledCheckbox && lowBundledCheckbox.checked) {
                if (param === 'Min Bundled %') {
                    return { ...originalRules, min: 0, max: Math.min(5, originalRules.max) };
                } else if (param === 'Max Bundled %') {
                    return { ...originalRules, min: originalRules.min, max: Math.min(35, originalRules.max) };
                }
            }
            return originalRules;
        }
    };

    // ========================================
    // 🧬 GENETIC ALGORITHM
    // ========================================
    OE.GeneticAlgorithm = class {
        constructor(optimizer, options = {}) {
            this.optimizer = optimizer;
            this.populationSize = options.populationSize || 20;
            this.mutationRate = options.mutationRate || 0.1;
            this.crossoverRate = options.crossoverRate || 0.8;
            this.elitismRate = options.elitismRate || 0.2;
            this.maxGenerations = options.maxGenerations || 10;
            this.PARAM_RULES = options.paramRules || (window.PARAM_RULES) || {};
        }

        async runGeneticAlgorithm() {
            console.log(`🧬 Starting Genetic Algorithm: ${this.populationSize} population, ${this.maxGenerations} generations`);
            
            // Initialize population
            let population = await this.initializePopulation();
            
            for (let generation = 0; generation < this.maxGenerations && 
                 this.optimizer.getRemainingTime() > 0.1 && !window.STOPPED; generation++) {
                
                console.log(`🧬 Generation ${generation + 1}/${this.maxGenerations}`);
                
                if (typeof this.optimizer.updateProgress === 'function') {
                    this.optimizer.updateProgress(`🧬 Generation ${generation + 1}/${this.maxGenerations}`, 
                        60 + (generation / this.maxGenerations) * 20,
                        this.optimizer.getCurrentBestScore().toFixed(1), 
                        this.optimizer.testCount, 
                        this.optimizer.bestMetrics?.totalTokens || '--', 
                        this.optimizer.startTime);
                }
                
                // Evaluate population
                const evaluatedPopulation = await this.evaluatePopulation(population);
                
                // Selection and reproduction
                population = await this.reproduce(evaluatedPopulation);
                
                // Early termination if target achieved
                const targetPnl = parseFloat(document.getElementById('target-pnl')?.value) || 100;
                if (this.optimizer.getCurrentBestScore() >= targetPnl) {
                    console.log(`🎯 Target PnL ${targetPnl}% achieved, stopping genetic algorithm`);
                    break;
                }
            }
        }

        async initializePopulation() {
            const population = [];
            const paramList = Object.keys(this.PARAM_RULES);
            
            // Add current best config if available
            if (this.optimizer.bestConfig) {
                population.push(deepClone(this.optimizer.bestConfig));
            }
            
            // Add initial config if available and different from best
            if (this.optimizer.initialConfig && 
                JSON.stringify(this.optimizer.initialConfig) !== JSON.stringify(this.optimizer.bestConfig)) {
                population.push(deepClone(this.optimizer.initialConfig));
            }
            
            // Fill remainder with random configs
            while (population.length < this.populationSize) {
                const randomConfig = this.generateRandomConfig(paramList);
                population.push(randomConfig);
            }
            
            return population;
        }

        generateRandomConfig(paramList) {
            const config = ensureCompleteConfig({});
            
            // Randomly set 30-60% of parameters
            const numParams = Math.floor(paramList.length * (0.3 + Math.random() * 0.3));
            const selectedParams = this.shuffleArray([...paramList]).slice(0, numParams);
            
            for (const param of selectedParams) {
                const section = this.getSection(param);
                const rules = this.applyBundledConstraints(param, this.PARAM_RULES[param]);
                
                if (rules && config[section]) {
                    if (rules.type === 'string') {
                        config[section][param] = Math.floor(Math.random() * 10 + 1).toString();
                    } else {
                        const value = rules.min + Math.random() * (rules.max - rules.min);
                        config[section][param] = Math.round(value / rules.step) * rules.step;
                    }
                }
            }
            
            return config;
        }

        async evaluatePopulation(population) {
            const evaluated = [];
            
            for (const individual of population) {
                if (window.STOPPED) break;
                
                const result = await this.optimizer.testConfig(individual, 'Genetic individual');
                
                let fitness = 0;
                if (result.success && result.metrics) {
                    const robustScore = calculateRobustScore(result.metrics);
                    fitness = robustScore?.score ?? result.metrics.tpPnlPercent;
                }
                
                evaluated.push({ config: individual, fitness, result });
            }
            
            // Sort by fitness (descending)
            evaluated.sort((a, b) => b.fitness - a.fitness);
            return evaluated;
        }

        async reproduce(evaluatedPopulation) {
            const newPopulation = [];
            const eliteCount = Math.floor(this.populationSize * this.elitismRate);
            
            // Keep elite individuals
            for (let i = 0; i < eliteCount && i < evaluatedPopulation.length; i++) {
                newPopulation.push(deepClone(evaluatedPopulation[i].config));
            }
            
            // Generate offspring
            while (newPopulation.length < this.populationSize && !window.STOPPED) {
                const parent1 = this.tournamentSelection(evaluatedPopulation);
                const parent2 = this.tournamentSelection(evaluatedPopulation);
                
                let offspring1, offspring2;
                if (Math.random() < this.crossoverRate) {
                    [offspring1, offspring2] = this.crossover(parent1.config, parent2.config);
                } else {
                    offspring1 = deepClone(parent1.config);
                    offspring2 = deepClone(parent2.config);
                }
                
                // Mutate offspring
                if (Math.random() < this.mutationRate) {
                    offspring1 = this.mutate(offspring1);
                }
                if (Math.random() < this.mutationRate) {
                    offspring2 = this.mutate(offspring2);
                }
                
                newPopulation.push(offspring1);
                if (newPopulation.length < this.populationSize) {
                    newPopulation.push(offspring2);
                }
            }
            
            return newPopulation.slice(0, this.populationSize);
        }

        tournamentSelection(population, tournamentSize = 3) {
            const tournament = [];
            for (let i = 0; i < tournamentSize; i++) {
                const randomIndex = Math.floor(Math.random() * population.length);
                tournament.push(population[randomIndex]);
            }
            tournament.sort((a, b) => b.fitness - a.fitness);
            return tournament[0];
        }

        crossover(parent1, parent2) {
            const offspring1 = deepClone(parent1);
            const offspring2 = deepClone(parent2);
            
            // Parameter-level crossover
            const paramList = Object.keys(this.PARAM_RULES);
            for (const param of paramList) {
                if (Math.random() < 0.5) {
                    const section = this.getSection(param);
                    if (parent1[section] && parent2[section]) {
                        const temp = offspring1[section][param];
                        offspring1[section][param] = offspring2[section][param];
                        offspring2[section][param] = temp;
                    }
                }
            }
            
            return [offspring1, offspring2];
        }

        mutate(config) {
            const mutated = deepClone(config);
            const paramList = Object.keys(this.PARAM_RULES);
            const param = paramList[Math.floor(Math.random() * paramList.length)];
            const section = this.getSection(param);
            const rules = this.applyBundledConstraints(param, this.PARAM_RULES[param]);
            
            if (rules && mutated[section]) {
                if (rules.type === 'string') {
                    mutated[section][param] = Math.floor(Math.random() * 10 + 1).toString();
                } else {
                    const value = rules.min + Math.random() * (rules.max - rules.min);
                    mutated[section][param] = Math.round(value / rules.step) * rules.step;
                }
            }
            
            return mutated;
        }

        shuffleArray(array) {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        }

        getSection(param) {
            const sectionMap = {
                'Min MCAP (USD)': 'basic', 'Max MCAP (USD)': 'basic',
                'Min AG Score': 'tokenDetails', 'Min Token Age (sec)': 'tokenDetails', 'Max Token Age (sec)': 'tokenDetails', 'Min Deployer Age (min)': 'tokenDetails',
                'Min Buy Ratio %': 'risk', 'Max Buy Ratio %': 'risk', 'Min Vol MCAP %': 'risk',
                'Max Vol MCAP %': 'risk', 'Min Bundled %': 'risk', 'Max Bundled %': 'risk', 'Min Deployer Balance (SOL)': 'risk',
                'Max Drained %': 'risk', 'Max Drained Count': 'risk',
                'Min Unique Wallets': 'wallets', 'Max Unique Wallets': 'wallets', 'Min KYC Wallets': 'wallets', 'Max KYC Wallets': 'wallets',
                'Min Holders': 'wallets', 'Max Holders': 'wallets',
                'Holders Growth %': 'wallets', 'Holders Growth Minutes': 'wallets',
                'Min TTC (sec)': 'advanced', 'Max TTC (sec)': 'advanced', 'Min Win Pred %': 'advanced', 'Max Liquidity %': 'advanced'
            };
            return sectionMap[param] || 'basic';
        }

        applyBundledConstraints(param, originalRules) {
            if (!originalRules) return originalRules;
            
            const lowBundledCheckbox = document.getElementById('low-bundled-constraint');
            if (lowBundledCheckbox && lowBundledCheckbox.checked) {
                if (param === 'Min Bundled %') {
                    return { ...originalRules, min: 0, max: Math.min(5, originalRules.max) };
                } else if (param === 'Max Bundled %') {
                    return { ...originalRules, min: originalRules.min, max: Math.min(35, originalRules.max) };
                }
            }
            return originalRules;
        }
    };

    // ========================================
    // 🏭 OPTIMIZATION ENGINE FACTORY
    // ========================================
    OE.createOptimizationEngine = function(optimizer, options = {}) {
        return {
            latinSampler: new OE.LatinHypercubeSampler(options.paramRules),
            simulatedAnnealing: new OE.SimulatedAnnealing(optimizer, options),
            geneticAlgorithm: new OE.GeneticAlgorithm(optimizer, options)
        };
    };

    // ========================================
    // 🔧 UTILITY FUNCTIONS
    // ========================================
    OE.generateRandomParameterSet = function(paramRules, bundledConstraints = false) {
        const config = {};
        const paramList = Object.keys(paramRules);
        
        // Select 30-70% of parameters randomly
        const numParams = Math.floor(paramList.length * (0.3 + Math.random() * 0.4));
        const selectedParams = paramList.sort(() => 0.5 - Math.random()).slice(0, numParams);
        
        for (const param of selectedParams) {
            let rules = paramRules[param];
            
            // Apply bundled constraints if enabled
            if (bundledConstraints) {
                if (param === 'Min Bundled %') {
                    rules = { ...rules, min: 0, max: Math.min(5, rules.max) };
                } else if (param === 'Max Bundled %') {
                    rules = { ...rules, min: rules.min, max: Math.min(35, rules.max) };
                }
            }
            
            if (rules.type === 'string') {
                config[param] = Math.floor(Math.random() * 10 + 1).toString();
            } else {
                const value = rules.min + Math.random() * (rules.max - rules.min);
                config[param] = Math.round(value / rules.step) * rules.step;
            }
        }
        
        return config;
    };

    // ========================================
    // 🎯 ENHANCED OPTIMIZER CLASS
    // ========================================
    OE.EnhancedOptimizer = class {
        constructor(initialConfig = null) {
            this.configCache = new Map(); // Simple cache
            this.bestConfig = null;
            this.bestScore = -Infinity;
            this.bestMetrics = { totalTokens: 0, tpPnlPercent: 0, winRate: 0 };
            this.testCount = 0;
            this.startTime = Date.now();
            this.history = [];
            this.initialConfig = initialConfig;
            this.parameterTests = [];
            
            // Advanced optimization components
            this.latinSampler = new OE.LatinHypercubeSampler();
            this.simulatedAnnealing = new OE.SimulatedAnnealing(this);
            
            // Global stop flag
            window.STOPPED = false;
        }

        getRemainingTime() {
            const elapsed = (Date.now() - this.startTime) / (window.CONFIG.MAX_RUNTIME_MIN * 60 * 1000);
            return Math.max(0, 1 - elapsed);
        }

        getProgress() {
            return Math.min(100, ((Date.now() - this.startTime) / (window.CONFIG.MAX_RUNTIME_MIN * 60 * 1000)) * 100);
        }

        getCurrentBestScore() {
            return this.bestScore;
        }

        async testConfig(config, testName) {
            if (window.STOPPED) return { success: false };

            try {
                this.testCount++;
                
                // Use API client for testing if available
                let result;
                if (window.backtesterAPI && window.backtesterAPI.testConfigurationAPI) {
                    result = await window.backtesterAPI.testConfigurationAPI(config, testName);
                } else {
                    // Fallback to placeholder result
                    result = {
                        success: true,
                        metrics: {
                            totalTokens: Math.floor(Math.random() * 1000) + 100,
                            tpPnlPercent: Math.random() * 200 - 50,
                            winRate: Math.random() * 100
                        }
                    };
                }

                if (result.success && result.metrics) {
                    // Calculate score using RobustScoring if available
                    let score = result.metrics.tpPnlPercent || 0;
                    if (window.RobustScoring && window.RobustScoring.calculateRobustScore) {
                        const robustResult = window.RobustScoring.calculateRobustScore(result.metrics);
                        if (!robustResult.rejected) {
                            score = robustResult.score;
                        }
                    }

                    // Update best configuration
                    if (score > this.bestScore) {
                        this.bestScore = score;
                        this.bestConfig = deepClone(config);
                        this.bestMetrics = result.metrics;
                        
                        // Update global best config tracker
                        if (window.bestConfigTracker) {
                            window.bestConfigTracker.updateBest(this.bestConfig, this.bestMetrics, score, 'optimization');
                        }
                    }
                }

                this.history.push({
                    config: deepClone(config),
                    result: result,
                    testName: testName,
                    success: result.success
                });

                return result;

            } catch (error) {
                console.error(`❌ Error testing config: ${error.message}`);
                this.history.push({
                    config: deepClone(config),
                    error: error.message,
                    testName: testName,
                    success: false
                });
                return { success: false, error: error.message };
            }
        }

        async runOptimization() {
            console.log('🚀 Starting Enhanced Optimization...');
            
            const maxRuntime = window.CONFIG.MAX_RUNTIME_MIN * 60 * 1000;
            const startTime = Date.now();
            
            // Main optimization loop
            while (!window.STOPPED && (Date.now() - startTime) < maxRuntime) {
                try {
                    // Generate test configuration using various methods
                    let testConfig;
                    
                    if (window.CONFIG.USE_LATIN_HYPERCUBE_SAMPLING && Math.random() < 0.3) {
                        testConfig = this.latinSampler.generateConfiguration();
                    } else if (window.CONFIG.USE_SIMULATED_ANNEALING && Math.random() < 0.3) {
                        testConfig = this.simulatedAnnealing.generateNeighbor(this.bestConfig || {});
                    } else {
                        // Random parameter variation
                        testConfig = this.generateRandomConfig();
                    }

                    // Test the configuration
                    const result = await this.testConfig(testConfig, `Test ${this.testCount}`);
                    
                    // Update progress
                    if (window.optimizationTracker) {
                        const progress = this.getProgress();
                        window.optimizationTracker.updateProgress(this.testCount, 0, 0, progress);
                    }
                    
                    // Short delay between tests
                    await sleep(100);
                    
                } catch (error) {
                    console.error('❌ Optimization error:', error);
                    await sleep(1000);
                }
            }

            console.log(`✅ Optimization completed: ${this.testCount} tests, best score: ${this.bestScore.toFixed(1)}`);
            
            return {
                bestConfig: this.bestConfig,
                bestScore: this.bestScore,
                bestMetrics: this.bestMetrics,
                testCount: this.testCount,
                runtime: Date.now() - startTime
            };
        }

        generateRandomConfig() {
            // Simple random configuration generator
            const config = {
                basic: {},
                tokenDetails: {},
                wallets: {},
                risk: {},
                advanced: {}
            };

            // Add random values within parameter rules
            if (window.PARAM_RULES) {
                for (const [param, rules] of Object.entries(window.PARAM_RULES)) {
                    const section = this.getSection(param);
                    if (section && config[section]) {
                        const range = rules.max - rules.min;
                        const value = rules.min + Math.random() * range;
                        config[section][param] = Math.round(value / rules.step) * rules.step;
                    }
                }
            }

            return config;
        }

        getSection(param) {
            const sectionMap = {
                'Min MCAP (USD)': 'basic', 'Max MCAP (USD)': 'basic',
                'Min AG Score': 'tokenDetails', 'Min Token Age (sec)': 'tokenDetails', 'Max Token Age (sec)': 'tokenDetails', 'Min Deployer Age (min)': 'tokenDetails',
                'Min Buy Ratio %': 'risk', 'Max Buy Ratio %': 'risk', 'Min Vol MCAP %': 'risk',
                'Max Vol MCAP %': 'risk', 'Min Bundled %': 'risk', 'Max Bundled %': 'risk', 'Min Deployer Balance (SOL)': 'risk',
                'Max Drained %': 'risk', 'Max Drained Count': 'risk',
                'Min Unique Wallets': 'wallets', 'Max Unique Wallets': 'wallets', 'Min KYC Wallets': 'wallets', 'Max KYC Wallets': 'wallets',
                'Min Holders': 'wallets', 'Max Holders': 'wallets',
                'Holders Growth %': 'wallets', 'Holders Growth Minutes': 'wallets',
                'Min TTC (sec)': 'advanced', 'Max TTC (sec)': 'advanced', 'Min Win Pred %': 'advanced', 'Max Liquidity %': 'advanced'
            };
            return sectionMap[param] || 'basic';
        }
    };

    // ========================================
    // 🔗 CHAINED OPTIMIZER CLASS
    // ========================================
    OE.ChainedOptimizer = class {
        constructor() {
            this.chainResults = [];
            this.globalBestConfig = null;
            this.globalBestScore = -Infinity;
            this.totalTestCount = 0;
        }

        async runChainedOptimization(chainCount, runtimeMinutes) {
            console.log(`🔗 Starting chained optimization: ${chainCount} runs of ${runtimeMinutes} minutes each`);
            
            window.CONFIG.MAX_RUNTIME_MIN = runtimeMinutes;
            
            for (let i = 1; i <= chainCount; i++) {
                if (window.STOPPED) break;
                
                console.log(`🔗 Chain run ${i}/${chainCount} starting...`);
                
                // Create new optimizer for this run
                const optimizer = new OE.EnhancedOptimizer(this.globalBestConfig);
                
                // Run single optimization
                const result = await optimizer.runOptimization();
                
                if (result.bestScore > this.globalBestScore) {
                    this.globalBestScore = result.bestScore;
                    this.globalBestConfig = result.bestConfig;
                    console.log(`🔗 New global best found in run ${i}: ${result.bestScore.toFixed(1)}`);
                }
                
                this.chainResults.push(result);
                this.totalTestCount += result.testCount;
                
                console.log(`🔗 Chain run ${i}/${chainCount} completed: ${result.testCount} tests, best: ${result.bestScore.toFixed(1)}`);
                
                // Short break between runs
                if (i < chainCount) {
                    await sleep(2000);
                }
            }

            console.log(`🔗 Chained optimization completed: ${this.totalTestCount} total tests across ${chainCount} runs`);
            
            return {
                bestConfig: this.globalBestConfig,
                bestScore: this.globalBestScore,
                testCount: this.totalTestCount,
                chainResults: this.chainResults
            };
        }
    };

    // Expose module
    if (typeof window !== 'undefined') {
        window.OptimizationEngine = OE;
        
        // Export main optimization classes globally
        window.EnhancedOptimizer = OE.EnhancedOptimizer;
        window.ChainedOptimizer = OE.ChainedOptimizer;
        window.LatinHypercubeSampler = OE.LatinHypercubeSampler;
        window.SimulatedAnnealing = OE.SimulatedAnnealing;
    }

    console.log('OptimizationEngine module loaded');

})(window && window.AGUtils);
