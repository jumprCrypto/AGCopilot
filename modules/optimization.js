/**
 * @fileoverview Optimization algorithms and classes for AGCopilot
 * @version 1.0.0
 */

import { sleep, deepClone, randomInRange, randomIntInRange, clamp } from './utils.js';
import { DEFAULT_PARAMETER_IMPACTS } from './config.js';

/**
 * Config Caching System for optimization performance
 */
export class ConfigCache {
    constructor() {
        this.cache = new Map();
    }
    
    generateKey(config) {
        // Create a deterministic string representation by sorting all keys recursively
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
        return this.cache.get(this.generateKey(config));
    }
    
    set(config, result) {
        this.cache.set(this.generateKey(config), result);
    }
    
    size() {
        return this.cache.size;
    }
    
    clear() {
        this.cache.clear();
    }
}

/**
 * Parameter Impact Analysis for optimization priority
 */
export class ParameterImpactAnalyzer {
    constructor(optimizer) {
        this.optimizer = optimizer;
        this.parameterImpacts = new Map();
    }
    
    async analyzeParameterImpacts() {
        console.log('🔍 Analyzing parameter impacts...');
        
        // Initialize with default impacts if available
        DEFAULT_PARAMETER_IMPACTS.forEach(({ param, impact }) => {
            this.parameterImpacts.set(param, impact);
        });
        
        // TODO: Add dynamic impact analysis based on actual testing
        console.log('📊 Parameter impact analysis complete');
        
        return Array.from(this.parameterImpacts.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
    }
    
    getParameterImpact(param) {
        return this.parameterImpacts.get(param) || 0;
    }
    
    setParameterImpact(param, impact) {
        this.parameterImpacts.set(param, impact);
    }
}

/**
 * Genetic Algorithm Implementation for parameter optimization
 */
export class GeneticOptimizer {
    constructor(optimizer, options = {}) {
        this.optimizer = optimizer;
        this.populationSize = options.populationSize || 20;
        this.generations = options.generations || 10;
        this.mutationRate = options.mutationRate || 0.1;
        this.crossoverRate = options.crossoverRate || 0.7;
        this.eliteSize = options.eliteSize || 2;
    }
    
    async runGeneticAlgorithm() {
        console.log('🧬 Starting Genetic Algorithm optimization...');
        
        // Initialize population
        let population = await this.initializePopulation();
        
        for (let generation = 0; generation < this.generations; generation++) {
            console.log(`🧬 Generation ${generation + 1}/${this.generations}`);
            
            // Evaluate fitness for all individuals
            population = await this.evaluatePopulation(population);
            
            // Sort by fitness (best first)
            population.sort((a, b) => b.fitness - a.fitness);
            
            // Create next generation
            const nextGeneration = [];
            
            // Keep elite individuals
            for (let i = 0; i < this.eliteSize; i++) {
                nextGeneration.push(deepClone(population[i]));
            }
            
            // Generate offspring through crossover and mutation
            while (nextGeneration.length < this.populationSize) {
                const parent1 = this.selectParent(population);
                const parent2 = this.selectParent(population);
                
                let child = this.crossover(parent1, parent2);
                child = this.mutate(child);
                
                nextGeneration.push(child);
            }
            
            population = nextGeneration;
            
            // Check if we should continue
            if (this.optimizer.shouldStop && this.optimizer.shouldStop()) {
                break;
            }
        }
        
        // Return best individual
        const evaluated = await this.evaluatePopulation(population);
        evaluated.sort((a, b) => b.fitness - a.fitness);
        
        console.log('🧬 Genetic Algorithm optimization complete');
        return evaluated[0];
    }
    
    async initializePopulation() {
        const population = [];
        const baseConfig = this.optimizer.bestConfig || {};
        
        for (let i = 0; i < this.populationSize; i++) {
            const individual = {
                config: this.generateRandomConfig(baseConfig),
                fitness: 0
            };
            population.push(individual);
        }
        
        return population;
    }
    
    generateRandomConfig(baseConfig) {
        const config = deepClone(baseConfig);
        const parameterRanges = this.optimizer.getParameterRanges();
        
        // Randomly modify some parameters
        for (const [section, fields] of Object.entries(config)) {
            for (const [param, value] of Object.entries(fields)) {
                if (Math.random() < 0.3 && parameterRanges[param]) { // 30% chance to modify
                    const range = parameterRanges[param];
                    config[section][param] = randomInRange(range.min, range.max);
                    
                    if (param.includes('Wallets') || param.includes('Count') || param.includes('Age')) {
                        config[section][param] = Math.round(config[section][param]);
                    }
                }
            }
        }
        
        return config;
    }
    
    async evaluatePopulation(population) {
        for (const individual of population) {
            if (individual.fitness === 0) {
                try {
                    const result = await this.optimizer.testConfiguration(individual.config);
                    individual.fitness = result.score || 0;
                } catch (error) {
                    individual.fitness = 0;
                }
            }
        }
        return population;
    }
    
    selectParent(population) {
        // Tournament selection
        const tournamentSize = 3;
        const tournament = [];
        
        for (let i = 0; i < tournamentSize; i++) {
            const randomIndex = Math.floor(Math.random() * population.length);
            tournament.push(population[randomIndex]);
        }
        
        tournament.sort((a, b) => b.fitness - a.fitness);
        return tournament[0];
    }
    
    crossover(parent1, parent2) {
        if (Math.random() > this.crossoverRate) {
            return deepClone(parent1);
        }
        
        const child = { config: deepClone(parent1.config), fitness: 0 };
        
        // Single-point crossover for each section
        for (const [section, fields] of Object.entries(parent2.config)) {
            if (Math.random() < 0.5) {
                child.config[section] = deepClone(fields);
            }
        }
        
        return child;
    }
    
    mutate(individual) {
        const config = individual.config;
        const parameterRanges = this.optimizer.getParameterRanges();
        
        for (const [section, fields] of Object.entries(config)) {
            for (const [param, value] of Object.entries(fields)) {
                if (Math.random() < this.mutationRate && parameterRanges[param]) {
                    const range = parameterRanges[param];
                    const mutationStrength = 0.1; // 10% of range
                    const delta = (range.max - range.min) * mutationStrength;
                    
                    let newValue = value + randomInRange(-delta, delta);
                    newValue = clamp(newValue, range.min, range.max);
                    
                    if (param.includes('Wallets') || param.includes('Count') || param.includes('Age')) {
                        newValue = Math.round(newValue);
                    }
                    
                    config[section][param] = newValue;
                }
            }
        }
        
        individual.fitness = 0; // Reset fitness to force re-evaluation
        return individual;
    }
}

/**
 * Simulated Annealing Algorithm for global optimization
 */
export class SimulatedAnnealing {
    constructor(optimizer, options = {}) {
        this.optimizer = optimizer;
        this.initialTemperature = options.initialTemperature || 100;
        this.coolingRate = options.coolingRate || 0.95;
        this.minTemperature = options.minTemperature || 0.1;
        this.maxIterations = options.maxIterations || 100;
    }
    
    async runSimulatedAnnealing() {
        console.log('🌡️ Starting Simulated Annealing optimization...');
        
        let currentConfig = deepClone(this.optimizer.bestConfig);
        let currentScore = this.optimizer.bestScore;
        let bestConfig = deepClone(currentConfig);
        let bestScore = currentScore;
        
        let temperature = this.initialTemperature;
        let iteration = 0;
        
        while (temperature > this.minTemperature && iteration < this.maxIterations) {
            // Generate neighbor solution
            const neighborConfig = this.generateNeighbor(currentConfig);
            
            try {
                const result = await this.optimizer.testConfiguration(neighborConfig);
                const neighborScore = result.score || 0;
                
                // Calculate acceptance probability
                const delta = neighborScore - currentScore;
                const acceptanceProbability = delta > 0 ? 1 : Math.exp(delta / temperature);
                
                // Accept or reject the neighbor
                if (Math.random() < acceptanceProbability) {
                    currentConfig = neighborConfig;
                    currentScore = neighborScore;
                    
                    // Update best if this is better
                    if (neighborScore > bestScore) {
                        bestConfig = deepClone(neighborConfig);
                        bestScore = neighborScore;
                        console.log(`🌡️ New best found: ${bestScore.toFixed(1)}% (T=${temperature.toFixed(2)})`);
                    }
                }
                
            } catch (error) {
                console.warn('🌡️ Configuration test failed:', error.message);
            }
            
            // Cool down
            temperature *= this.coolingRate;
            iteration++;
            
            // Check if we should stop
            if (this.optimizer.shouldStop && this.optimizer.shouldStop()) {
                break;
            }
        }
        
        console.log('🌡️ Simulated Annealing optimization complete');
        return { config: bestConfig, score: bestScore };
    }
    
    generateNeighbor(config) {
        const neighborConfig = deepClone(config);
        const parameterRanges = this.optimizer.getParameterRanges();
        
        // Select a random parameter to modify
        const allParams = [];
        for (const [section, fields] of Object.entries(config)) {
            for (const param of Object.keys(fields)) {
                if (parameterRanges[param]) {
                    allParams.push({ section, param });
                }
            }
        }
        
        if (allParams.length === 0) return neighborConfig;
        
        const randomParam = allParams[Math.floor(Math.random() * allParams.length)];
        const { section, param } = randomParam;
        const range = parameterRanges[param];
        
        // Generate small random change
        const currentValue = neighborConfig[section][param];
        const maxChange = (range.max - range.min) * 0.1; // 10% of range
        const change = randomInRange(-maxChange, maxChange);
        
        let newValue = currentValue + change;
        newValue = clamp(newValue, range.min, range.max);
        
        if (param.includes('Wallets') || param.includes('Count') || param.includes('Age')) {
            newValue = Math.round(newValue);
        }
        
        neighborConfig[section][param] = newValue;
        
        return neighborConfig;
    }
}

/**
 * Adaptive Step Size Manager for dynamic optimization
 */
export class AdaptiveStepManager {
    constructor(options = {}) {
        this.initialStepSize = options.initialStepSize || 0.1;
        this.currentStepSize = this.initialStepSize;
        this.stepDecayRate = options.stepDecayRate || 0.95;
        this.stepIncreaseRate = options.stepIncreaseRate || 1.05;
        this.minStepSize = options.minStepSize || 0.01;
        this.maxStepSize = options.maxStepSize || 0.5;
        
        this.recentSuccesses = [];
        this.windowSize = 10;
    }
    
    recordSuccess(improved) {
        this.recentSuccesses.push(improved);
        
        if (this.recentSuccesses.length > this.windowSize) {
            this.recentSuccesses.shift();
        }
        
        this.adaptStepSize();
    }
    
    adaptStepSize() {
        if (this.recentSuccesses.length < this.windowSize) {
            return;
        }
        
        const successRate = this.recentSuccesses.filter(s => s).length / this.recentSuccesses.length;
        
        if (successRate > 0.6) {
            // High success rate, increase step size for faster exploration
            this.currentStepSize = Math.min(this.maxStepSize, this.currentStepSize * this.stepIncreaseRate);
        } else if (successRate < 0.2) {
            // Low success rate, decrease step size for fine-tuning
            this.currentStepSize = Math.max(this.minStepSize, this.currentStepSize * this.stepDecayRate);
        }
    }
    
    getStepSize() {
        return this.currentStepSize;
    }
    
    reset() {
        this.currentStepSize = this.initialStepSize;
        this.recentSuccesses = [];
    }
}

/**
 * Latin Hypercube Sampling for parameter space exploration
 */
export class LatinHypercubeSampler {
    constructor(options = {}) {
        this.dimensions = options.dimensions || 10;
        this.samples = options.samples || 20;
    }
    
    generateSamples(parameterRanges, parameterList) {
        const samples = [];
        const numParams = parameterList.length;
        const numSamples = this.samples;
        
        // Generate Latin Hypercube samples
        const intervals = [];
        for (let i = 0; i < numParams; i++) {
            const interval = [];
            for (let j = 0; j < numSamples; j++) {
                interval.push((j + Math.random()) / numSamples);
            }
            // Shuffle the interval
            for (let j = interval.length - 1; j > 0; j--) {
                const k = Math.floor(Math.random() * (j + 1));
                [interval[j], interval[k]] = [interval[k], interval[j]];
            }
            intervals.push(interval);
        }
        
        // Convert to actual parameter values
        for (let i = 0; i < numSamples; i++) {
            const sample = {};
            
            for (let j = 0; j < numParams; j++) {
                const param = parameterList[j];
                const range = parameterRanges[param.param];
                
                if (range) {
                    let value = range.min + intervals[j][i] * (range.max - range.min);
                    
                    if (param.param.includes('Wallets') || param.param.includes('Count') || param.param.includes('Age')) {
                        value = Math.round(value);
                    }
                    
                    if (!sample[param.section]) {
                        sample[param.section] = {};
                    }
                    sample[param.section][param.param] = value;
                }
            }
            
            samples.push(sample);
        }
        
        return samples;
    }
}

/**
 * Multi-objective optimization tracker
 */
export class OptimizationTracker {
    constructor() {
        this.history = [];
        this.bestConfigs = new Map();
        this.objectives = ['pnl', 'winrate', 'tokens', 'consistency'];
    }
    
    recordResult(config, metrics) {
        const result = {
            config: deepClone(config),
            metrics: { ...metrics },
            timestamp: Date.now()
        };
        
        this.history.push(result);
        
        // Track best for each objective
        this.objectives.forEach(objective => {
            const current = this.bestConfigs.get(objective);
            if (!current || this.isBetter(metrics, current.metrics, objective)) {
                this.bestConfigs.set(objective, result);
            }
        });
    }
    
    isBetter(newMetrics, currentMetrics, objective) {
        switch (objective) {
            case 'pnl':
                return (newMetrics.totalPnlPercent || 0) > (currentMetrics.totalPnlPercent || 0);
            case 'winrate':
                return (newMetrics.winRate || 0) > (currentMetrics.winRate || 0);
            case 'tokens':
                return (newMetrics.tokensMatched || 0) > (currentMetrics.tokensMatched || 0);
            case 'consistency':
                return this.calculateConsistency(newMetrics) > this.calculateConsistency(currentMetrics);
            default:
                return false;
        }
    }
    
    calculateConsistency(metrics) {
        // Simple consistency metric based on win rate and token count
        const winRate = metrics.winRate || 0;
        const tokenCount = metrics.tokensMatched || 0;
        
        if (tokenCount < 10) return 0; // Not enough data
        
        // Higher token count with decent win rate = more consistent
        return winRate * Math.log(tokenCount + 1);
    }
    
    getBestConfig(objective = 'pnl') {
        return this.bestConfigs.get(objective);
    }
    
    getHistory() {
        return [...this.history];
    }
    
    getStatistics() {
        if (this.history.length === 0) {
            return { totalTests: 0, averagePnL: 0, bestPnL: 0 };
        }
        
        const pnls = this.history.map(h => h.metrics.totalPnlPercent || 0);
        
        return {
            totalTests: this.history.length,
            averagePnL: pnls.reduce((sum, pnl) => sum + pnl, 0) / pnls.length,
            bestPnL: Math.max(...pnls),
            uniqueConfigs: new Set(this.history.map(h => JSON.stringify(h.config))).size
        };
    }
}