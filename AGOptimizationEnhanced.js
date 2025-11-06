// ========================================
// 🚀 AG OPTIMIZATION ENHANCED v1.0
// ========================================
// Supercharged optimization for offline mode
// Leverages unlimited testing capacity for better results

(function() {
    'use strict';
    
    console.log('🚀 AGOptimizationEnhanced v1.0 - Loading...');
    
    // ========================================
    // 🎯 ENHANCED GENETIC ALGORITHM
    // ========================================
    class EnhancedGeneticAlgorithm {
        constructor(options = {}) {
            this.populationSize = options.populationSize || 200; // 10x larger for offline
            this.generations = options.generations || 100; // 5x more generations
            this.elitePercent = options.elitePercent || 0.1; // Top 10% survive
            this.mutationRate = options.mutationRate || 0.15;
            this.crossoverRate = options.crossoverRate || 0.8;
            this.paramRules = options.paramRules || window.PARAM_RULES;
            
            this.population = [];
            this.bestIndividual = null;
            this.bestScore = -Infinity;
            this.generationHistory = [];
        }
        
        /**
         * Initialize random population
         * @param {Object} baseConfig - Starting configuration
         */
        initializePopulation(baseConfig) {
            console.log(`🧬 Initializing population of ${this.populationSize} individuals...`);
            this.population = [];
            this.baseConfigFields = {}; // Store non-optimizable fields
            
            // Separate base config into optimizable and non-optimizable fields
            if (baseConfig) {
                const optimizableParams = new Set(this.getOptimizableParams());
                for (const [key, value] of Object.entries(baseConfig)) {
                    if (!optimizableParams.has(key)) {
                        // Preserve non-optimizable fields (date ranges, boolean settings, etc.)
                        this.baseConfigFields[key] = value;
                    }
                }
            }
            
            // Include base config as one individual
            if (baseConfig) {
                this.population.push({
                    config: this.cloneConfig(baseConfig),
                    score: null,
                    fitness: 0
                });
            }
            
            // Generate random individuals
            const paramsToOptimize = this.getOptimizableParams();
            
            while (this.population.length < this.populationSize) {
                // Start with base config to preserve non-optimizable fields
                const individual = this.cloneConfig(baseConfig || {});
                
                // Randomize optimizable parameters
                for (const param of paramsToOptimize) {
                    if (Math.random() < 0.7) { // 70% chance to set each param
                        individual[param] = this.generateRandomValue(param);
                    }
                }
                
                this.population.push({
                    config: individual,
                    score: null,
                    fitness: 0
                });
            }
            
            console.log(`✅ Generated ${this.population.length} individuals`);
            console.log(`🔒 Preserved ${Object.keys(this.baseConfigFields).length} non-optimizable fields`);
        }
        
        /**
         * Get list of parameters that can be optimized
         */
        getOptimizableParams() {
            const params = [];
            for (const [param, rules] of Object.entries(this.paramRules)) {
                // Skip boolean parameters for now (handle separately)
                if (rules.type !== 'boolean') {
                    params.push(param);
                }
            }
            return params;
        }
        
        /**
         * Generate random value for a parameter
         */
        generateRandomValue(param) {
            const rules = this.paramRules[param];
            if (!rules) return undefined;
            
            const min = rules.min;
            const max = rules.max;
            const step = rules.step || 1;
            
            // Generate random value in steps
            const numSteps = Math.floor((max - min) / step);
            const randomStep = Math.floor(Math.random() * (numSteps + 1));
            return min + (randomStep * step);
        }
        
        /**
         * Evaluate entire population (offline mode: no rate limits!)
         */
        async evaluatePopulation(testFunction, progressCallback = null) {
            console.log(`📊 Evaluating ${this.population.length} individuals...`);
            
            for (let i = 0; i < this.population.length; i++) {
                const individual = this.population[i];
                
                if (individual.score === null) {
                    const result = await testFunction(individual.config);
                    individual.score = result.score || -Infinity;
                    individual.metrics = result.metrics;
                    
                    // Track best
                    if (individual.score > this.bestScore) {
                        this.bestScore = individual.score;
                        this.bestIndividual = individual;
                    }
                }
                
                if (progressCallback && i % 10 === 0) {
                    progressCallback(i + 1, this.population.length, this.bestScore);
                }
            }
            
            // Calculate fitness (normalize scores to 0-1)
            this.calculateFitness();
            
            console.log(`✅ Best score: ${this.bestScore.toFixed(2)}`);
        }
        
        /**
         * Calculate fitness values for selection
         */
        calculateFitness() {
            // Sort by score
            this.population.sort((a, b) => b.score - a.score);
            
            // Assign fitness based on rank (rank-based selection)
            const n = this.population.length;
            for (let i = 0; i < n; i++) {
                // Linear ranking: best gets n, worst gets 1
                this.population[i].fitness = n - i;
            }
        }
        
        /**
         * Selection using tournament selection
         */
        selectParent() {
            const tournamentSize = 5;
            let best = null;
            
            for (let i = 0; i < tournamentSize; i++) {
                const candidate = this.population[Math.floor(Math.random() * this.population.length)];
                if (!best || candidate.fitness > best.fitness) {
                    best = candidate;
                }
            }
            
            return best;
        }
        
        /**
         * Crossover (uniform crossover)
         */
        crossover(parent1, parent2) {
            if (Math.random() > this.crossoverRate) {
                return this.cloneConfig(parent1.config);
            }
            
            // Start with base config fields (date ranges, etc.)
            const child = this.cloneConfig(this.baseConfigFields || {});
            const params = this.getOptimizableParams();
            
            for (const param of params) {
                // 50/50 chance to inherit from each parent
                if (Math.random() < 0.5) {
                    child[param] = parent1.config[param];
                } else {
                    child[param] = parent2.config[param];
                }
            }
            
            return child;
        }
        
        /**
         * Mutation
         */
        mutate(config) {
            const mutated = this.cloneConfig(config);
            const params = this.getOptimizableParams();
            
            for (const param of params) {
                if (Math.random() < this.mutationRate) {
                    // Mutate this parameter
                    const rules = this.paramRules[param];
                    if (!rules) continue;
                    
                    const currentValue = mutated[param];
                    
                    if (currentValue === undefined || currentValue === null) {
                        // No value set, generate random
                        mutated[param] = this.generateRandomValue(param);
                    } else {
                        // Gaussian mutation around current value
                        const range = rules.max - rules.min;
                        const stdDev = range * 0.1; // 10% of range
                        const delta = this.gaussianRandom() * stdDev;
                        
                        let newValue = currentValue + delta;
                        
                        // Clamp to valid range
                        newValue = Math.max(rules.min, Math.min(rules.max, newValue));
                        
                        // Round to step
                        const step = rules.step || 1;
                        newValue = Math.round(newValue / step) * step;
                        
                        mutated[param] = newValue;
                    }
                }
            }
            
            // Ensure base config fields are preserved
            Object.assign(mutated, this.baseConfigFields || {});
            
            return mutated;
        }
        
        /**
         * Generate next generation
         */
        generateNextGeneration() {
            const eliteCount = Math.floor(this.populationSize * this.elitePercent);
            const newPopulation = [];
            
            // Elitism: keep best individuals
            for (let i = 0; i < eliteCount; i++) {
                newPopulation.push({
                    config: this.cloneConfig(this.population[i].config),
                    score: this.population[i].score,
                    fitness: 0
                });
            }
            
            // Generate offspring
            while (newPopulation.length < this.populationSize) {
                const parent1 = this.selectParent();
                const parent2 = this.selectParent();
                
                let offspring = this.crossover(parent1, parent2);
                offspring = this.mutate(offspring);
                
                newPopulation.push({
                    config: offspring,
                    score: null, // Need to evaluate
                    fitness: 0
                });
            }
            
            this.population = newPopulation;
        }
        
        /**
         * Run genetic algorithm
         */
        async run(testFunction, progressCallback = null) {
            console.log(`🧬 Starting Enhanced Genetic Algorithm: ${this.generations} generations`);
            
            for (let gen = 0; gen < this.generations; gen++) {
                console.log(`\n📊 Generation ${gen + 1}/${this.generations}`);
                
                // Evaluate population
                await this.evaluatePopulation(testFunction, (i, total, bestScore) => {
                    if (progressCallback) {
                        const overallProgress = ((gen * this.populationSize + i) / (this.generations * this.populationSize)) * 100;
                        progressCallback(overallProgress, gen + 1, this.generations, bestScore);
                    }
                });
                
                // Track generation stats
                const genStats = {
                    generation: gen + 1,
                    bestScore: this.population[0].score,
                    avgScore: this.population.reduce((sum, ind) => sum + ind.score, 0) / this.population.length,
                    worstScore: this.population[this.population.length - 1].score
                };
                this.generationHistory.push(genStats);
                
                console.log(`   Best: ${genStats.bestScore.toFixed(2)}, Avg: ${genStats.avgScore.toFixed(2)}, Worst: ${genStats.worstScore.toFixed(2)}`);
                
                // Generate next generation (except for last generation)
                if (gen < this.generations - 1) {
                    this.generateNextGeneration();
                }
            }
            
            console.log(`\n✅ Genetic Algorithm Complete!`);
            console.log(`🏆 Best Score: ${this.bestScore.toFixed(2)}`);
            
            return {
                bestConfig: this.bestIndividual.config,
                bestScore: this.bestScore,
                bestMetrics: this.bestIndividual.metrics,
                history: this.generationHistory
            };
        }
        
        /**
         * Gaussian random number generator (Box-Muller transform)
         */
        gaussianRandom() {
            const u1 = Math.random();
            const u2 = Math.random();
            return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        }
        
        /**
         * Clone configuration
         */
        cloneConfig(config) {
            return window.deepClone ? window.deepClone(config) : JSON.parse(JSON.stringify(config));
        }
    }
    
    // ========================================
    // 🎯 MULTI-OBJECTIVE OPTIMIZATION
    // ========================================
    class MultiObjectiveOptimizer {
        constructor(options = {}) {
            this.objectives = options.objectives || ['pnl', 'winRate', 'sharpe'];
            this.weights = options.weights || { pnl: 0.6, winRate: 0.2, sharpe: 0.2 };
            this.useRobustScore = options.useRobustScore !== false; // Default to true
        }
        
        /**
         * Calculate multi-objective score
         * @param {Object} metrics - Test metrics
         * @returns {number} Combined score
         */
        calculateScore(metrics) {
            // RESPECT CONFIG SETTINGS: Use window.calculateRobustScore if available
            if (this.useRobustScore && typeof window.calculateRobustScore === 'function') {
                const robustResult = window.calculateRobustScore(metrics);
                
                if (robustResult) {
                    // Respect rejection (e.g., low win rate configs)
                    if (robustResult.rejected) {
                        return -Infinity;
                    }
                    // Use robust score that respects CONFIG.SCORING_MODE
                    return robustResult.score;
                }
            }
            
            // FALLBACK: Custom multi-objective scoring if calculateRobustScore not available
            const scores = {};
            
            // PnL objective (maximize)
            scores.pnl = metrics.tpPnlPercent || 0;
            
            // Win rate objective (maximize)
            scores.winRate = metrics.realWinRate || metrics.winRate || 0;
            
            // Sharpe-like ratio (risk-adjusted return)
            // Higher PnL with higher win rate = lower risk
            const winRate = scores.winRate / 100;
            if (winRate > 0 && winRate < 1) {
                // Sharpe approximation: return / std deviation
                // Use win rate as proxy for consistency (higher WR = lower volatility)
                const avgReturn = scores.pnl;
                const volatilityProxy = Math.sqrt(winRate * (1 - winRate)) * 200; // Normalize
                scores.sharpe = volatilityProxy > 0 ? avgReturn / volatilityProxy : 0;
            } else {
                scores.sharpe = 0;
            }
            
            // Drawdown objective (minimize) - estimated from loss scenarios
            const lossRate = 1 - winRate;
            const avgLoss = -100; // Typical loss
            const maxDrawdownEstimate = avgLoss * lossRate * 5; // Conservative estimate
            scores.drawdown = Math.abs(maxDrawdownEstimate);
            
            // Combine with weights
            let combinedScore = 0;
            for (const [objective, weight] of Object.entries(this.weights)) {
                if (scores[objective] !== undefined) {
                    // Normalize drawdown (lower is better)
                    if (objective === 'drawdown') {
                        combinedScore -= weight * scores[objective];
                    } else {
                        combinedScore += weight * scores[objective];
                    }
                }
            }
            
            return combinedScore;
        }
        
        /**
         * Get score breakdown for display
         */
        getScoreBreakdown(metrics) {
            // Use calculateRobustScore if available for accurate breakdown
            if (this.useRobustScore && typeof window.calculateRobustScore === 'function') {
                const robustResult = window.calculateRobustScore(metrics);
                
                if (robustResult) {
                    return {
                        score: robustResult.score,
                        method: robustResult.scoringMethod || 'Robust Score',
                        components: robustResult.components,
                        rejected: robustResult.rejected,
                        rejectionReason: robustResult.rejectionReason
                    };
                }
            }
            
            // Fallback breakdown
            const pnl = metrics.tpPnlPercent || 0;
            const winRate = metrics.realWinRate || metrics.winRate || 0;
            const sharpe = this.calculateSharpeRatio(pnl, winRate);
            
            return {
                pnl: { value: pnl.toFixed(2), weight: this.weights.pnl },
                winRate: { value: winRate.toFixed(2), weight: this.weights.winRate },
                sharpe: { value: sharpe.toFixed(2), weight: this.weights.sharpe },
                combined: this.calculateScore(metrics).toFixed(2)
            };
        }
        
        calculateSharpeRatio(pnl, winRate) {
            const winRateDecimal = winRate / 100;
            if (winRateDecimal > 0 && winRateDecimal < 1) {
                const volatilityProxy = Math.sqrt(winRateDecimal * (1 - winRateDecimal)) * 200;
                return volatilityProxy > 0 ? pnl / volatilityProxy : 0;
            }
            return 0;
        }
    }
    
    // ========================================
    // 🎯 ENSEMBLE OPTIMIZATION
    // ========================================
    class EnsembleOptimizer {
        constructor(options = {}) {
            this.dateRanges = options.dateRanges || this.generateDateRanges();
            this.minConsistency = options.minConsistency || 0.7; // 70% of periods must be positive
        }
        
        /**
         * Generate multiple date ranges for testing
         */
        generateDateRanges() {
            // Generate 3-month rolling windows over last 12 months
            const ranges = [];
            const now = new Date();
            
            for (let i = 0; i < 4; i++) {
                const endDate = new Date(now);
                endDate.setMonth(endDate.getMonth() - (i * 3));
                
                const startDate = new Date(endDate);
                startDate.setMonth(startDate.getMonth() - 3);
                
                ranges.push({
                    label: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0]
                });
            }
            
            return ranges;
        }
        
        /**
         * Test configuration across all date ranges
         */
        async testAcrossRanges(config, testFunction) {
            const results = [];
            
            for (const range of this.dateRanges) {
                // Create config with date range
                const configWithRange = {
                    ...config,
                    'Start Date': range.startDate,
                    'End Date': range.endDate
                };
                
                const result = await testFunction(configWithRange);
                results.push({
                    range: range.label,
                    score: result.score,
                    metrics: result.metrics
                });
            }
            
            return results;
        }
        
        /**
         * Calculate consistency score across periods
         */
        calculateConsistency(results) {
            const positivePeriods = results.filter(r => r.score > 0).length;
            const consistencyRate = positivePeriods / results.length;
            
            const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
            const variance = results.reduce((sum, r) => sum + Math.pow(r.score - avgScore, 2), 0) / results.length;
            const stdDev = Math.sqrt(variance);
            
            return {
                consistencyRate,
                avgScore,
                stdDev,
                sharpeRatio: stdDev > 0 ? avgScore / stdDev : 0,
                isConsistent: consistencyRate >= this.minConsistency
            };
        }
    }
    
    // ========================================
    // 🎯 SMART GRID SEARCH
    // ========================================
    class SmartGridSearch {
        constructor(options = {}) {
            this.paramRules = options.paramRules || window.PARAM_RULES;
            this.maxTests = options.maxTests || 10000; // 10k tests for offline
            this.adaptiveResolution = options.adaptiveResolution !== false;
        }
        
        /**
         * Generate smart grid with adaptive resolution
         */
        generateSmartGrid(focusParams) {
            const grid = [];
            
            // Start with coarse grid
            const coarseSteps = 5;
            const combinations = this.generateCombinations(focusParams, coarseSteps);
            
            console.log(`📊 Generated ${combinations.length} grid points`);
            
            return combinations;
        }
        
        /**
         * Generate all combinations for parameters
         */
        generateCombinations(params, steps) {
            if (params.length === 0) return [{}];
            
            const [firstParam, ...restParams] = params;
            const restCombinations = this.generateCombinations(restParams, steps);
            
            const combinations = [];
            const values = this.generateStepValues(firstParam, steps);
            
            for (const value of values) {
                for (const restCombo of restCombinations) {
                    combinations.push({
                        [firstParam]: value,
                        ...restCombo
                    });
                }
            }
            
            return combinations;
        }
        
        /**
         * Generate step values for a parameter
         */
        generateStepValues(param, numSteps) {
            const rules = this.paramRules[param];
            if (!rules) return [];
            
            const min = rules.min;
            const max = rules.max;
            const step = (max - min) / (numSteps - 1);
            
            const values = [];
            for (let i = 0; i < numSteps; i++) {
                values.push(min + (i * step));
            }
            
            return values;
        }
        
        /**
         * Run adaptive grid search
         */
        async run(testFunction, progressCallback = null) {
            console.log(`📊 Starting Smart Grid Search (max ${this.maxTests} tests)`);
            
            // Get most impactful parameters
            const topParams = ['Max Liquidity %', 'Min Win Pred %', 'Min Unique Wallets', 'Min MCAP (USD)'];
            
            const grid = this.generateSmartGrid(topParams);
            const testLimit = Math.min(grid.length, this.maxTests);
            
            let bestConfig = null;
            let bestScore = -Infinity;
            
            for (let i = 0; i < testLimit; i++) {
                const config = grid[i];
                const result = await testFunction(config);
                
                if (result.score > bestScore) {
                    bestScore = result.score;
                    bestConfig = config;
                }
                
                if (progressCallback && i % 50 === 0) {
                    progressCallback(i + 1, testLimit, bestScore);
                }
            }
            
            console.log(`✅ Grid Search Complete! Best: ${bestScore.toFixed(2)}`);
            
            return { bestConfig, bestScore };
        }
    }
    
    // ========================================
    // 🌍 GLOBAL EXPORTS
    // ========================================
    window.AGOptimizationEnhanced = {
        EnhancedGeneticAlgorithm,
        MultiObjectiveOptimizer,
        EnsembleOptimizer,
        SmartGridSearch,
        version: '1.0.0'
    };
    
    console.log('✅ AGOptimizationEnhanced loaded successfully!');
    console.log('📊 Enhanced algorithms available:');
    console.log('   • EnhancedGeneticAlgorithm - 200 population, 100 generations');
    console.log('   • MultiObjectiveOptimizer - PnL + WinRate + Sharpe');
    console.log('   • EnsembleOptimizer - Test across multiple time periods');
    console.log('   • SmartGridSearch - Intelligent grid with 10k+ tests');
    console.log('');
    console.log('⚙️ Configuration Settings:');
    console.log('   ✅ Respects window.calculateRobustScore (CONFIG.SCORING_MODE)');
    console.log('   ✅ Honors MIN_WIN_RATE thresholds');
    console.log('   ✅ Uses TARGET_PNL_PERCENT for target optimization');
    console.log('   ✅ Checks MIN_TOKENS_PER_DAY requirements');
    
})();
