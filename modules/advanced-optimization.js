// Advanced Optimization Module - Genetic Algorithm, Simulated Annealing, Latin Hypercube Sampling
// Contains all advanced optimization algorithms and techniques

export class LatinHypercubeSampler {
    generateSamples(parameters, numSamples = 10) {
        if (parameters.length === 0) return [];
        
        const samples = [];
        const intervals = Array.from({ length: numSamples }, (_, i) => i / numSamples);
        
        for (let i = 0; i < numSamples; i++) {
            const sample = {};
            
            for (const param of parameters) {
                const rules = window.AGCopilot?.PARAM_RULES?.[param];
                if (!rules) continue;
                
                // Shuffle intervals for this parameter
                const shuffledIntervals = [...intervals].sort(() => Math.random() - 0.5);
                const interval = shuffledIntervals[i % shuffledIntervals.length];
                
                if (rules.type === 'string') {
                    sample[param] = Math.floor(Math.random() * 10 + 1).toString();
                } else {
                    const range = rules.max - rules.min;
                    const value = rules.min + interval * range;
                    const step = rules.step || range * 0.01;
                    sample[param] = Math.round(value / step) * step;
                    
                    // Clamp to valid range
                    sample[param] = Math.max(rules.min, Math.min(rules.max, sample[param]));
                }
            }
            
            samples.push(sample);
        }
        
        return samples;
    }
}

export class GeneticOptimizer {
    constructor(optimizer) {
        this.optimizer = optimizer;
        this.populationSize = 8;
        this.mutationRate = 0.3;
        this.crossoverRate = 0.7;
        this.eliteCount = 2;
    }
    
    async runGeneticOptimization() {
        console.log('🧬 Starting Genetic Algorithm Phase...');
        
        // Initialize population with current best + variations
        let population = await this.initializePopulation();
        
        const generations = Math.min(4, Math.floor(this.optimizer.getRemainingTime() * 15));
        
        for (let generation = 0; generation < generations; generation++) {
            if (window.STOPPED || this.optimizer.getRemainingTime() <= 0.2) break;
            
            console.log(`🧬 Generation ${generation + 1}/${generations}`);
            
            // Evaluate population
            const evaluatedPopulation = await this.evaluatePopulation(population);
            
            // Selection, crossover, and mutation
            population = await this.evolvePopulation(evaluatedPopulation);
            
            // Early termination if target achieved
            const targetPnl = parseFloat(document.getElementById('target-pnl')?.value) || 100;
            if (this.optimizer.getCurrentBestScore() >= targetPnl) {
                break;
            }
        }
    }
    
    async initializePopulation() {
        const population = [];
        
        // Add current best config
        population.push(this.optimizer.deepClone(this.optimizer.getCurrentBestConfig()));
        
        // Add variations of best config
        for (let i = 1; i < this.populationSize; i++) {
            const config = this.optimizer.deepClone(this.optimizer.getCurrentBestConfig());
            this.mutateConfig(config, 0.5); // Higher mutation rate for initialization
            population.push(config);
        }
        
        return population;
    }
    
    async evaluatePopulation(population) {
        const evaluatedPop = [];
        
        for (const config of population) {
            if (window.STOPPED || this.optimizer.getRemainingTime() <= 0.2) break;
            
            const result = await this.optimizer.testConfig(config, 'Genetic eval');
            let fitness = -Infinity;
            if (result.success) {
                fitness = result.metrics.tpPnlPercent;
            }
            
            evaluatedPop.push({ config, fitness });
        }
        
        // Sort by fitness (descending)
        evaluatedPop.sort((a, b) => b.fitness - a.fitness);
        return evaluatedPop;
    }
    
    async evolvePopulation(evaluatedPop) {
        const newPopulation = [];
        
        // Elitism: keep best individuals
        for (let i = 0; i < this.eliteCount && i < evaluatedPop.length; i++) {
            if (evaluatedPop[i]) {
                newPopulation.push(this.optimizer.deepClone(evaluatedPop[i].config));
            }
        }
        
        // Generate offspring
        while (newPopulation.length < this.populationSize) {
            const parent1 = this.selectParent(evaluatedPop);
            const parent2 = this.selectParent(evaluatedPop);
            
            let offspring = Math.random() < this.crossoverRate ? 
                this.crossover(parent1, parent2) : 
                this.optimizer.deepClone(parent1);
            
            if (Math.random() < this.mutationRate) {
                this.mutateConfig(offspring, 0.2);
            }
            
            newPopulation.push(offspring);
        }
        
        return newPopulation;
    }
    
    selectParent(evaluatedPop) {
        // Tournament selection
        const tournamentSize = 3;
        let best = evaluatedPop[Math.floor(Math.random() * evaluatedPop.length)];
        
        for (let i = 1; i < tournamentSize; i++) {
            const candidate = evaluatedPop[Math.floor(Math.random() * evaluatedPop.length)];
            if (candidate.fitness > best.fitness) {
                best = candidate;
            }
        }
        
        return best.config;
    }
    
    crossover(parent1, parent2) {
        const offspring = this.optimizer.deepClone(parent1);
        
        // Crossover at section level
        const sections = Object.keys(offspring);
        const crossoverPoint = Math.floor(Math.random() * sections.length);
        
        for (let i = crossoverPoint; i < sections.length; i++) {
            const section = sections[i];
            offspring[section] = this.optimizer.deepClone(parent2[section]);
        }
        
        return offspring;
    }
    
    mutateConfig(config, mutationRate) {
        for (const [section, params] of Object.entries(config)) {
            for (const [param, value] of Object.entries(params)) {
                if (Math.random() < mutationRate && value !== undefined) {
                    const rules = window.AGCopilot?.PARAM_RULES?.[param];
                    if (rules) {
                        if (rules.type === 'string') {
                            config[section][param] = Math.floor(Math.random() * 10 + 1).toString();
                        } else {
                            const range = rules.max - rules.min;
                            const noise = (Math.random() - 0.5) * range * 0.2;
                            const newValue = Math.max(rules.min, Math.min(rules.max, value + noise));
                            config[section][param] = Math.round(newValue / (rules.step || 1)) * (rules.step || 1);
                        }
                    }
                }
            }
        }
    }
}

export class SimulatedAnnealing {
    constructor(optimizer) {
        this.optimizer = optimizer;
        this.initialTemperature = 100;
        this.finalTemperature = 0.1;
        this.coolingRate = 0.95;
    }
    
    async runSimulatedAnnealing() {
        console.log('🔥 Starting Simulated Annealing Phase...');
        
        let currentConfig = this.optimizer.deepClone(this.optimizer.bestConfig);
        let currentScore = this.optimizer.getCurrentBestScore();
        let temperature = this.initialTemperature;
        
        while (temperature > this.finalTemperature && this.optimizer.getRemainingTime() > 0.05 && !window.STOPPED) {
            // Generate neighbor configuration
            const neighbor = this.generateNeighbor(currentConfig);
            const result = await this.optimizer.testConfig(neighbor, 'Simulated annealing');
            
            if (result.success && result.metrics) {
                const neighborScore = result.metrics.tpPnlPercent;
                
                const deltaE = neighborScore - currentScore;
                
                // Accept if better, or with probability if worse
                if (deltaE > 0 || Math.random() < Math.exp(deltaE / temperature)) {
                    currentConfig = neighbor;
                    currentScore = neighborScore;
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
        const neighbor = this.optimizer.deepClone(config);
        
        // Randomly modify 1-2 parameters
        const paramList = Object.keys(window.AGCopilot?.PARAM_RULES || {});
        const numModifications = Math.floor(Math.random() * 2) + 1;
        
        for (let i = 0; i < numModifications; i++) {
            const param = paramList[Math.floor(Math.random() * paramList.length)];
            const section = this.optimizer.getSection(param);
            const rules = window.AGCopilot?.PARAM_RULES?.[param];
            
            if (rules && neighbor[section]) {
                if (rules.type === 'string') {
                    neighbor[section][param] = Math.floor(Math.random() * 10 + 1).toString();
                } else {
                    const currentValue = neighbor[section][param] || (rules.min + rules.max) / 2;
                    const maxChange = (rules.max - rules.min) * 0.1;
                    const change = (Math.random() - 0.5) * maxChange;
                    const newValue = Math.max(rules.min, Math.min(rules.max, currentValue + change));
                    neighbor[section][param] = Math.round(newValue / (rules.step || 1)) * (rules.step || 1);
                }
            }
        }
        
        return neighbor;
    }
}
