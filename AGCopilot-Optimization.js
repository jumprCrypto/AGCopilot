/**
 * AGCopilot-Optimization.js - Optimization Engine Module
 * 
 * Contains all optimization algorithms, parameter testing, and 
 * advanced optimization techniques for the AGCopilot system.
 */

// ========================================
// 🧬 ENHANCED OPTIMIZER CLASS
// ========================================

class EnhancedOptimizer {
    constructor(initialConfig = null) {
        this.initialConfig = initialConfig;
        this.bestConfig = null;
        this.bestScore = -Infinity;
        this.bestMetrics = null;
        this.testCount = 0;
        this.startTime = null;
        this.maxTests = 100;
        this.maxRuntime = 15 * 60 * 1000; // 15 minutes
    }

    // Initialize advanced components (if available)
    initializeAdvancedComponents(LatinHypercubeSampler, SimulatedAnnealing, GeneticOptimizer) {
        this.LatinHypercubeSampler = LatinHypercubeSampler;
        this.SimulatedAnnealing = SimulatedAnnealing;
        this.GeneticOptimizer = GeneticOptimizer;
        this.hasAdvancedComponents = true;
    }

    // Run the main optimization process
    async runOptimization() {
        console.log('🚀 Starting enhanced optimization...');
        this.startTime = Date.now();
        
        try {
            // Phase 1: Initial exploration
            await this.runInitialExploration();
            
            // Phase 2: Focused optimization
            if (this.hasAdvancedComponents) {
                await this.runAdvancedOptimization();
            } else {
                await this.runBasicOptimization();
            }
            
            const runtime = Date.now() - this.startTime;
            
            return {
                success: true,
                bestConfig: this.bestConfig,
                bestScore: this.bestScore,
                bestMetrics: this.bestMetrics,
                testCount: this.testCount,
                runtime: runtime
            };
            
        } catch (error) {
            console.error('❌ Enhanced optimization failed:', error);
            return {
                success: false,
                error: error.message,
                testCount: this.testCount,
                runtime: Date.now() - this.startTime
            };
        }
    }

    // Initial exploration phase
    async runInitialExploration() {
        console.log('🔍 Phase 1: Initial exploration...');
        
        // Test initial config if provided
        if (this.initialConfig) {
            await this.testConfiguration(this.initialConfig, 'Initial Config');
        }
        
        // Test some baseline configurations
        const baselineConfigs = this.generateBaselineConfigs();
        
        for (const config of baselineConfigs) {
            if (this.shouldStop()) break;
            await this.testConfiguration(config, 'Baseline');
        }
    }

    // Advanced optimization phase
    async runAdvancedOptimization() {
        console.log('🧠 Phase 2: Advanced optimization...');
        
        if (this.GeneticOptimizer) {
            const geneticOptimizer = new this.GeneticOptimizer();
            const result = await geneticOptimizer.run(this.bestConfig);
            
            if (result.success && result.bestConfig) {
                await this.testConfiguration(result.bestConfig, 'Genetic Result');
            }
        }
        
        if (this.SimulatedAnnealing) {
            const saOptimizer = new this.SimulatedAnnealing();
            const result = await saOptimizer.run(this.bestConfig);
            
            if (result.success && result.bestConfig) {
                await this.testConfiguration(result.bestConfig, 'SA Result');
            }
        }
    }

    // Basic optimization fallback
    async runBasicOptimization() {
        console.log('🔧 Phase 2: Basic optimization...');
        
        // Simple parameter variation
        if (this.bestConfig) {
            const variations = this.generateParameterVariations(this.bestConfig);
            
            for (const config of variations) {
                if (this.shouldStop()) break;
                await this.testConfiguration(config, 'Variation');
            }
        }
    }

    // Generate baseline configurations for testing
    generateBaselineConfigs() {
        return [
            {
                basic: { "Min MCAP (USD)": 10000, "Max MCAP (USD)": 50000 },
                tokenDetails: { "Min AG Score": 3 },
                wallets: { "Min Unique Wallets": 2, "Max Unique Wallets": 8 },
                risk: { "Max Bundled %": 40 },
                advanced: { "Max Liquidity %": 90 }
            },
            {
                basic: { "Min MCAP (USD)": 20000, "Max MCAP (USD)": 100000 },
                tokenDetails: { "Min AG Score": 5 },
                wallets: { "Min Unique Wallets": 3, "Max Unique Wallets": 12 },
                risk: { "Max Bundled %": 30 },
                advanced: { "Max Liquidity %": 80 }
            },
            {
                basic: { "Min MCAP (USD)": 5000, "Max MCAP (USD)": 25000 },
                tokenDetails: { "Min AG Score": 4 },
                wallets: { "Min Unique Wallets": 1, "Max Unique Wallets": 6 },
                risk: { "Max Bundled %": 50 },
                advanced: { "Max Liquidity %": 95 }
            }
        ];
    }

    // Generate parameter variations
    generateParameterVariations(baseConfig) {
        const variations = [];
        const config = JSON.parse(JSON.stringify(baseConfig));
        
        // Vary MCAP ranges
        if (config.basic) {
            const minMcap = config.basic["Min MCAP (USD)"] || 10000;
            const maxMcap = config.basic["Max MCAP (USD)"] || 50000;
            
            variations.push({
                ...config,
                basic: {
                    ...config.basic,
                    "Min MCAP (USD)": Math.floor(minMcap * 0.8),
                    "Max MCAP (USD)": Math.floor(maxMcap * 1.2)
                }
            });
            
            variations.push({
                ...config,
                basic: {
                    ...config.basic,
                    "Min MCAP (USD)": Math.floor(minMcap * 1.2),
                    "Max MCAP (USD)": Math.floor(maxMcap * 0.8)
                }
            });
        }
        
        // Vary AG Score
        if (config.tokenDetails && config.tokenDetails["Min AG Score"]) {
            const agScore = config.tokenDetails["Min AG Score"];
            
            if (agScore > 1) {
                variations.push({
                    ...config,
                    tokenDetails: {
                        ...config.tokenDetails,
                        "Min AG Score": agScore - 1
                    }
                });
            }
            
            if (agScore < 10) {
                variations.push({
                    ...config,
                    tokenDetails: {
                        ...config.tokenDetails,
                        "Min AG Score": agScore + 1
                    }
                });
            }
        }
        
        return variations.slice(0, 10); // Limit variations
    }

    // Test a configuration
    async testConfiguration(config, testName) {
        if (!window.AGCopilot || !window.AGCopilot.testConfigurationAPI) {
            console.warn('⚠️ Test API not available');
            return false;
        }
        
        try {
            this.testCount++;
            const result = await window.AGCopilot.testConfigurationAPI(config, `${testName} #${this.testCount}`);
            
            if (result.success && result.metrics) {
                const score = window.AGCopilot.calculateRobustScore(result.metrics);
                const finalScore = score?.score || result.metrics.tpPnlPercent || 0;
                
                if (finalScore > this.bestScore) {
                    this.bestScore = finalScore;
                    this.bestConfig = JSON.parse(JSON.stringify(config));
                    this.bestMetrics = result.metrics;
                    
                    console.log(`🏆 New best! Score: ${finalScore.toFixed(1)} (${testName})`);
                    
                    // Update global tracker if available
                    if (window.optimizationTracker) {
                        window.optimizationTracker.updateBestConfig(config, result.metrics, finalScore);
                    }
                }
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.warn(`❌ Test failed (${testName}):`, error.message);
            return false;
        }
    }

    // Check if optimization should stop
    shouldStop() {
        if (window.STOPPED) {
            console.log('🛑 Optimization stopped by user');
            return true;
        }
        
        if (this.testCount >= this.maxTests) {
            console.log(`🔄 Reached maximum tests (${this.maxTests})`);
            return true;
        }
        
        if (Date.now() - this.startTime >= this.maxRuntime) {
            console.log(`⏰ Reached maximum runtime (${this.maxRuntime / 1000}s)`);
            return true;
        }
        
        return false;
    }
}

// ========================================
// 🧬 GENETIC OPTIMIZER CLASS
// ========================================

class GeneticOptimizer {
    constructor(options = {}) {
        this.populationSize = options.populationSize || 20;
        this.generations = options.generations || 10;
        this.mutationRate = options.mutationRate || 0.1;
        this.crossoverRate = options.crossoverRate || 0.8;
        this.elitismRate = options.elitismRate || 0.2;
    }

    // Run genetic algorithm optimization
    async run(seedConfig = null) {
        console.log(`🧬 Starting genetic optimization (Pop: ${this.populationSize}, Gen: ${this.generations})`);
        
        try {
            // Initialize population
            let population = this.initializePopulation(seedConfig);
            let bestIndividual = null;
            let bestScore = -Infinity;
            
            for (let generation = 0; generation < this.generations; generation++) {
                if (window.STOPPED) break;
                
                console.log(`🧬 Generation ${generation + 1}/${this.generations}`);
                
                // Evaluate population
                const evaluatedPop = await this.evaluatePopulation(population);
                
                // Find best individual
                const generationBest = evaluatedPop.reduce((best, ind) => 
                    ind.score > best.score ? ind : best);
                
                if (generationBest.score > bestScore) {
                    bestScore = generationBest.score;
                    bestIndividual = generationBest;
                    console.log(`🏆 New genetic best: ${bestScore.toFixed(1)}`);
                }
                
                // Create next generation
                population = this.createNextGeneration(evaluatedPop);
            }
            
            return {
                success: true,
                bestConfig: bestIndividual?.config,
                bestScore: bestScore,
                generations: this.generations
            };
            
        } catch (error) {
            console.error('❌ Genetic optimization failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Initialize population
    initializePopulation(seedConfig) {
        const population = [];
        
        // Add seed config if provided
        if (seedConfig) {
            population.push(seedConfig);
        }
        
        // Generate random configurations
        while (population.length < this.populationSize) {
            population.push(this.generateRandomConfig());
        }
        
        return population;
    }

    // Generate random configuration
    generateRandomConfig() {
        return {
            basic: {
                "Min MCAP (USD)": Math.floor(Math.random() * 40000) + 5000,
                "Max MCAP (USD)": Math.floor(Math.random() * 200000) + 30000
            },
            tokenDetails: {
                "Min AG Score": Math.floor(Math.random() * 8) + 1
            },
            wallets: {
                "Min Unique Wallets": Math.floor(Math.random() * 5) + 1,
                "Max Unique Wallets": Math.floor(Math.random() * 15) + 5
            },
            risk: {
                "Max Bundled %": Math.floor(Math.random() * 60) + 20
            },
            advanced: {
                "Max Liquidity %": Math.floor(Math.random() * 40) + 60
            }
        };
    }

    // Evaluate population fitness
    async evaluatePopulation(population) {
        const evaluated = [];
        
        for (let i = 0; i < population.length; i++) {
            if (window.STOPPED) break;
            
            const config = population[i];
            let score = -Infinity;
            
            if (window.AGCopilot && window.AGCopilot.testConfigurationAPI) {
                try {
                    const result = await window.AGCopilot.testConfigurationAPI(config, `Genetic ${i + 1}`);
                    if (result.success) {
                        const scoring = window.AGCopilot.calculateRobustScore(result.metrics);
                        score = scoring?.score || result.metrics.tpPnlPercent || 0;
                    }
                } catch (error) {
                    console.warn(`❌ Genetic evaluation failed for individual ${i + 1}`);
                }
            }
            
            evaluated.push({ config, score });
        }
        
        return evaluated.sort((a, b) => b.score - a.score);
    }

    // Create next generation
    createNextGeneration(evaluatedPopulation) {
        const nextGen = [];
        const eliteCount = Math.floor(this.populationSize * this.elitismRate);
        
        // Keep elite individuals
        for (let i = 0; i < eliteCount; i++) {
            nextGen.push(evaluatedPopulation[i].config);
        }
        
        // Create offspring through crossover and mutation
        while (nextGen.length < this.populationSize) {
            const parent1 = this.selectParent(evaluatedPopulation);
            const parent2 = this.selectParent(evaluatedPopulation);
            
            let offspring = this.crossover(parent1.config, parent2.config);
            offspring = this.mutate(offspring);
            
            nextGen.push(offspring);
        }
        
        return nextGen;
    }

    // Tournament selection
    selectParent(population) {
        const tournamentSize = 3;
        const tournament = [];
        
        for (let i = 0; i < tournamentSize; i++) {
            const randomIndex = Math.floor(Math.random() * population.length);
            tournament.push(population[randomIndex]);
        }
        
        return tournament.reduce((best, ind) => ind.score > best.score ? ind : best);
    }

    // Crossover two configurations
    crossover(parent1, parent2) {
        if (Math.random() > this.crossoverRate) {
            return JSON.parse(JSON.stringify(parent1));
        }
        
        const offspring = {};
        
        for (const section in parent1) {
            offspring[section] = {};
            
            for (const param in parent1[section]) {
                // Randomly choose from either parent
                const useParent1 = Math.random() < 0.5;
                offspring[section][param] = useParent1 ? 
                    parent1[section][param] : parent2[section][param];
            }
        }
        
        return offspring;
    }

    // Mutate configuration
    mutate(config) {
        const mutated = JSON.parse(JSON.stringify(config));
        
        for (const section in mutated) {
            for (const param in mutated[section]) {
                if (Math.random() < this.mutationRate) {
                    // Apply random mutation
                    const currentValue = mutated[section][param];
                    const mutationFactor = 0.8 + Math.random() * 0.4; // ±20%
                    mutated[section][param] = Math.floor(currentValue * mutationFactor);
                }
            }
        }
        
        return mutated;
    }
}

// ========================================
// 🌡️ SIMULATED ANNEALING OPTIMIZER
// ========================================

class SimulatedAnnealingOptimizer {
    constructor(options = {}) {
        this.initialTemperature = options.initialTemperature || 100;
        this.coolingRate = options.coolingRate || 0.95;
        this.minTemperature = options.minTemperature || 0.1;
        this.maxIterations = options.maxIterations || 50;
    }

    // Run simulated annealing optimization
    async run(initialConfig = null) {
        console.log('🌡️ Starting simulated annealing optimization');
        
        try {
            let currentConfig = initialConfig || this.generateRandomConfig();
            let currentScore = await this.evaluateConfig(currentConfig);
            
            let bestConfig = JSON.parse(JSON.stringify(currentConfig));
            let bestScore = currentScore;
            
            let temperature = this.initialTemperature;
            let iteration = 0;
            
            while (temperature > this.minTemperature && iteration < this.maxIterations) {
                if (window.STOPPED) break;
                
                // Generate neighbor configuration
                const neighborConfig = this.generateNeighbor(currentConfig);
                const neighborScore = await this.evaluateConfig(neighborConfig);
                
                // Calculate acceptance probability
                const delta = neighborScore - currentScore;
                const acceptanceProbability = delta > 0 ? 1 : Math.exp(delta / temperature);
                
                // Accept or reject the neighbor
                if (Math.random() < acceptanceProbability) {
                    currentConfig = neighborConfig;
                    currentScore = neighborScore;
                    
                    if (neighborScore > bestScore) {
                        bestScore = neighborScore;
                        bestConfig = JSON.parse(JSON.stringify(neighborConfig));
                        console.log(`🌡️ SA new best: ${bestScore.toFixed(1)} (T=${temperature.toFixed(2)})`);
                    }
                }
                
                // Cool down
                temperature *= this.coolingRate;
                iteration++;
            }
            
            return {
                success: true,
                bestConfig: bestConfig,
                bestScore: bestScore,
                iterations: iteration
            };
            
        } catch (error) {
            console.error('❌ Simulated annealing failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Generate neighbor configuration
    generateNeighbor(config) {
        const neighbor = JSON.parse(JSON.stringify(config));
        
        // Randomly modify one parameter
        const sections = Object.keys(neighbor);
        const randomSection = sections[Math.floor(Math.random() * sections.length)];
        const params = Object.keys(neighbor[randomSection]);
        const randomParam = params[Math.floor(Math.random() * params.length)];
        
        const currentValue = neighbor[randomSection][randomParam];
        const variationFactor = 0.7 + Math.random() * 0.6; // ±30%
        neighbor[randomSection][randomParam] = Math.floor(currentValue * variationFactor);
        
        return neighbor;
    }

    // Generate random configuration
    generateRandomConfig() {
        return {
            basic: {
                "Min MCAP (USD)": Math.floor(Math.random() * 40000) + 5000,
                "Max MCAP (USD)": Math.floor(Math.random() * 200000) + 30000
            },
            tokenDetails: {
                "Min AG Score": Math.floor(Math.random() * 8) + 1
            },
            wallets: {
                "Min Unique Wallets": Math.floor(Math.random() * 5) + 1,
                "Max Unique Wallets": Math.floor(Math.random() * 15) + 5
            },
            risk: {
                "Max Bundled %": Math.floor(Math.random() * 60) + 20
            },
            advanced: {
                "Max Liquidity %": Math.floor(Math.random() * 40) + 60
            }
        };
    }

    // Evaluate configuration
    async evaluateConfig(config) {
        if (!window.AGCopilot || !window.AGCopilot.testConfigurationAPI) {
            return -Infinity;
        }
        
        try {
            const result = await window.AGCopilot.testConfigurationAPI(config, 'SA Test');
            if (result.success) {
                const scoring = window.AGCopilot.calculateRobustScore(result.metrics);
                return scoring?.score || result.metrics.tpPnlPercent || 0;
            }
        } catch (error) {
            console.warn('❌ SA evaluation failed');
        }
        
        return -Infinity;
    }
}

// ========================================
// 🔗 CHAINED OPTIMIZER CLASS
// ========================================

class ChainedOptimizer {
    constructor() {
        this.results = [];
    }

    // Run chained optimization
    async runChainedOptimization(runs = 3, timePerRun = 5, OptimizerClass = EnhancedOptimizer) {
        console.log(`🔗 Starting chained optimization: ${runs} runs`);
        
        let bestOverallConfig = null;
        let bestOverallScore = -Infinity;
        let bestOverallMetrics = null;
        
        for (let i = 0; i < runs; i++) {
            if (window.STOPPED) break;
            
            console.log(`\n🔗 Chain Run ${i + 1}/${runs}`);
            
            const optimizer = new OptimizerClass(bestOverallConfig);
            optimizer.maxRuntime = timePerRun * 60 * 1000; // Convert to milliseconds
            
            const result = await optimizer.runOptimization();
            
            if (result.success && result.bestScore > bestOverallScore) {
                bestOverallScore = result.bestScore;
                bestOverallConfig = result.bestConfig;
                bestOverallMetrics = result.bestMetrics;
                console.log(`🏆 New chain best: ${bestOverallScore.toFixed(1)}`);
            }
            
            this.results.push(result);
        }
        
        return {
            success: this.results.some(r => r.success),
            bestConfig: bestOverallConfig,
            bestScore: bestOverallScore,
            bestMetrics: bestOverallMetrics,
            results: this.results,
            totalRuns: runs,
            successfulRuns: this.results.filter(r => r.success).length
        };
    }
}

// ========================================
// 🎯 QUICK OPTIMIZATION FUNCTIONS
// ========================================

// Quick optimization (simplified)
async function runQuickOptimization(initialConfig = null) {
    console.log('⚡ Running quick optimization...');
    
    const optimizer = new EnhancedOptimizer(initialConfig);
    optimizer.maxTests = 10;
    optimizer.maxRuntime = 3 * 60 * 1000; // 3 minutes
    
    return await optimizer.runOptimization();
}

// Deep optimization (comprehensive)
async function runDeepOptimization(initialConfig = null) {
    console.log('🔬 Running deep optimization...');
    
    const optimizer = new EnhancedOptimizer(initialConfig);
    optimizer.maxTests = 200;
    optimizer.maxRuntime = 30 * 60 * 1000; // 30 minutes
    
    return await optimizer.runOptimization();
}

// Genetic optimization
async function runGeneticOptimization(initialConfig = null) {
    console.log('🧬 Running genetic optimization...');
    
    const geneticOptimizer = new GeneticOptimizer({
        populationSize: 15,
        generations: 8,
        mutationRate: 0.15
    });
    
    return await geneticOptimizer.run(initialConfig);
}

// ========================================
// 🔧 MODULE INITIALIZATION
// ========================================
function init(namespace) {
    // Store optimization functions in namespace
    namespace.optimization = {
        EnhancedOptimizer,
        GeneticOptimizer,
        SimulatedAnnealingOptimizer,
        ChainedOptimizer,
        runQuickOptimization,
        runDeepOptimization,
        runGeneticOptimization
    };
    
    console.log('✅ Optimization module initialized');
    return Promise.resolve();
}

// ========================================
// 📤 MODULE EXPORTS
// ========================================
module.exports = {
    EnhancedOptimizer,
    GeneticOptimizer,
    SimulatedAnnealingOptimizer,
    ChainedOptimizer,
    runQuickOptimization,
    runDeepOptimization,
    runGeneticOptimization,
    init
};
