/**
 * AGCopilot-Optimization.js - Advanced Optimization Module (RESTORED ORIGINAL FEATURES)
 * 
 * Contains all the advanced optimization algorithms from AGCopilot-Enhanced.js:
 * - LatinHypercubeSampler for statistical parameter exploration
 * - SimulatedAnnealing for advanced optimization
 * - Multiple starting points testing
 * - Correlated parameter testing
 * - Deep dive analysis
 * - Parameter impact discovery
 * - Robust scoring system
 */

// ========================================
// 🧬 ADVANCED OPTIMIZATION CLASSES (RESTORED)
// ========================================

// Latin Hypercube Sampler for better parameter space exploration
class LatinHypercubeSampler {
    constructor() {
        this.samples = new Map();
    }
    
    generateSamples(parameters, numSamples) {
        const samples = [];
        
        for (let i = 0; i < numSamples; i++) {
            const sample = {};
            
            for (const param of parameters) {
                const originalRules = (window.AGCopilot?.PARAM_RULES || {})[param];
                if (originalRules) {
                    // Check if this is being called from an optimizer context that has bundled constraints
                    let rules = originalRules;
                    
                    // Apply bundled constraints if the UI checkbox is checked
                    const lowBundledCheckbox = document.getElementById('low-bundled-constraint');
                    if (lowBundledCheckbox && lowBundledCheckbox.checked) {
                        if (param === 'Min Bundled %') {
                            rules = {
                                ...originalRules,
                                min: 0,
                                max: Math.min(5, originalRules.max)
                            };
                        } else if (param === 'Max Bundled %') {
                            rules = {
                                ...originalRules,
                                min: originalRules.min,
                                max: Math.min(35, originalRules.max)
                            };
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
}

// Simulated Annealing Optimizer
class SimulatedAnnealing {
    constructor(optimizer) {
        this.optimizer = optimizer;
        this.initialTemperature = 100;
        this.finalTemperature = 0.1;
        this.coolingRate = 0.95;
    }
    
    async runSimulatedAnnealing() {
        this.updateProgress('🔥 Simulated Annealing Phase', 80, this.optimizer.getCurrentBestScore().toFixed(1), this.optimizer.testCount, this.optimizer.bestMetrics?.totalTokens || '--', this.optimizer.startTime);
        
        let currentConfig = JSON.parse(JSON.stringify(this.optimizer.bestConfig)); // Deep clone
        let currentScore = this.optimizer.getCurrentBestScore();
        let temperature = this.initialTemperature;
        
        while (temperature > this.finalTemperature && this.optimizer.getRemainingTime() > 0.05 && !window.STOPPED) {
            // Generate neighbor configuration
            const neighbor = this.generateNeighbor(currentConfig);
            const result = await this.optimizer.testConfig(neighbor, 'Simulated annealing');
            
            if (result.success && result.metrics) {
                const neighborScore = this.optimizer.calculateScore(result.metrics);
                
                const deltaE = neighborScore - currentScore;
                
                // Accept if better, or with probability if worse
                if (deltaE > 0 || Math.random() < Math.exp(deltaE / temperature)) {
                    currentConfig = neighbor;
                    currentScore = neighborScore;
                    
                    this.updateProgress(`🔥 Annealing T=${temperature.toFixed(1)}`, 
                        80 + (1 - temperature / this.initialTemperature) * 15, 
                        this.optimizer.getCurrentBestScore().toFixed(1), 
                        this.optimizer.testCount, 
                        this.optimizer.bestMetrics?.totalTokens || '--', 
                        this.optimizer.startTime);
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
        const neighbor = JSON.parse(JSON.stringify(config)); // Deep clone
        
        // Randomly modify 1-2 parameters
        const paramList = Object.keys(window.AGCopilot?.PARAM_RULES || {});
        const numModifications = Math.floor(Math.random() * 2) + 1;
        
        for (let i = 0; i < numModifications; i++) {
            const param = paramList[Math.floor(Math.random() * paramList.length)];
            const section = this.optimizer.getSection(param);
            const originalRules = (window.AGCopilot?.PARAM_RULES || {})[param];
            
            // Apply bundled constraints if enabled
            const rules = this.optimizer.applyBundledConstraints(param, originalRules);
            
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

    updateProgress(message, progress, score, tests, tokens, startTime) {
        if (typeof updateProgress === 'function') {
            updateProgress(message, progress, score, tests, tokens, startTime);
        } else {
            console.log(`${message} - Progress: ${progress}% - Score: ${score} - Tests: ${tests}`);
        }
    }
}

// Config Cache for performance optimization
class ConfigCache {
    constructor(maxSize = 1000) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }
    
    has(config) {
        const key = this.generateKey(config);
        return this.cache.has(key);
    }
    
    get(config) {
        const key = this.generateKey(config);
        return this.cache.get(key);
    }
    
    set(config, result) {
        const key = this.generateKey(config);
        
        // Remove oldest entry if at max size
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, result);
    }
    
    generateKey(config) {
        return JSON.stringify(config, Object.keys(config).sort());
    }
    
    clear() {
        this.cache.clear();
    }
    
    size() {
        return this.cache.size;
    }
}

// ========================================
// 🚀 ENHANCED OPTIMIZER CLASS (RESTORED)
// ========================================
class EnhancedOptimizer {
    constructor(initialConfig = null) {
        this.configCache = new ConfigCache(1000);
        this.bestConfig = null;
        this.bestScore = -Infinity;
        this.bestMetrics = { totalTokens: 0, tpPnlPercent: 0, winRate: 0 }; // Safe defaults
        this.testCount = 0;
        this.startTime = Date.now();
        this.history = [];
        
        // Store initial configuration to start from - use template if none provided
        if (initialConfig) {
            this.initialConfig = initialConfig;
        } else if (window.AGCopilot?.COMPLETE_CONFIG_TEMPLATE) {
            this.initialConfig = JSON.parse(JSON.stringify(window.AGCopilot.COMPLETE_CONFIG_TEMPLATE));
            console.log('📋 Using default config template as initial configuration');
        } else {
            this.initialConfig = null;
            console.warn('⚠️ No initial configuration or template available');
        }
        
        // Parameter tracking
        this.parameterTests = [];
        
        // Advanced optimization components
        this.latinSampler = new LatinHypercubeSampler();
        this.simulatedAnnealing = new SimulatedAnnealing(this);
        
        // Global stop flag
        window.STOPPED = false;
    }

    getRemainingTime() {
        const maxRuntime = parseFloat(document.getElementById('runtime-min')?.value) || 15;
        const elapsed = (Date.now() - this.startTime) / (maxRuntime * 60 * 1000);
        return Math.max(0, 1 - elapsed);
    }

    getProgress() {
        const maxRuntime = parseFloat(document.getElementById('runtime-min')?.value) || 15;
        return Math.min(100, ((Date.now() - this.startTime) / (maxRuntime * 60 * 1000)) * 100);
    }

    getCurrentBestScore() {
        return this.bestScore;
    }

    calculateScore(metrics) {
        const useRobustScoring = document.getElementById('robust-scoring')?.checked || false;
        
        if (useRobustScoring && metrics) {
            return this.calculateRobustScore(metrics)?.score || metrics.tpPnlPercent || 0;
        }
        
        return metrics?.tpPnlPercent || 0;
    }

    calculateRobustScore(metrics) {
        if (!metrics || metrics.totalTokens < 10) {
            return null;
        }

        const tokenCount = Math.max(1, metrics.totalTokens || 1);
        const winRate = Math.max(0.01, Math.min(0.99, (metrics.winRate || 0) / 100));
        const rawPnL = metrics.tpPnlPercent || 0;

        // Reliability factor based on sample size and win rate
        const sampleReliability = Math.min(1, tokenCount / 50);
        const winRateReliability = 1 - Math.abs(winRate - 0.5);
        const reliabilityFactor = (sampleReliability * 0.7) + (winRateReliability * 0.3);

        // Apply conservative scaling
        const robustScore = rawPnL * reliabilityFactor;

        return {
            score: robustScore,
            components: {
                rawPnL,
                reliabilityFactor,
                sampleReliability,
                winRateReliability,
                tokenCount
            }
        };
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
            'Min TTC (sec)': 'advanced', 'Max TTC (sec)': 'advanced', 'Min Win Pred %': 'advanced', 'Max Liquidity %': 'advanced'
        };
        return sectionMap[param] || 'basic';
    }

    applyBundledConstraints(param, originalRules) {
        if (!originalRules) return originalRules;
        
        const lowBundledCheckbox = document.getElementById('low-bundled-constraint');
        if (lowBundledCheckbox && lowBundledCheckbox.checked) {
            if (param === 'Min Bundled %') {
                return {
                    ...originalRules,
                    min: 0,
                    max: Math.min(5, originalRules.max)
                };
            } else if (param === 'Max Bundled %') {
                return {
                    ...originalRules,
                    min: originalRules.min,
                    max: Math.min(35, originalRules.max)
                };
            }
        }
        
        return originalRules;
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
            const useRobustScoring = document.getElementById('robust-scoring')?.checked || false;
            if (useRobustScoring && this.bestMetrics.robustScoring) {
                const rs = this.bestMetrics.robustScoring;
                scoreDisplay = `${this.bestScore.toFixed(1)} (Robust)`;
                methodDisplay = `<div style="font-size: 10px; opacity: 0.8;">Raw: ${rs.components.rawPnL.toFixed(1)}% | Reliability: ${(rs.components.reliabilityFactor * 100).toFixed(0)}%</div>`;
            }
            
            stats.innerHTML = `
                <div><strong>Score:</strong> ${scoreDisplay} | <strong>Tokens:</strong> ${this.bestMetrics?.totalTokens || 0} | <strong>Win Rate:</strong> ${this.bestMetrics?.winRate?.toFixed(1) || 0}%</div>
                ${methodDisplay}
                <div><strong>Tests:</strong> ${this.testCount} | <strong>Runtime:</strong> ${Math.floor((Date.now() - this.startTime) / 1000)}s</div>
            `;
        }
    }

    // Main test function - uses API call
    async testConfig(config, testName) {
        if (window.STOPPED) return { success: false };

        try {
            this.testCount++;
            const minTokens = parseFloat(document.getElementById('min-tokens')?.value) || 75;
            
            // Update optimization tracker with failure counts
            let totalFailures = this.history.filter(h => !h.success).length;
            let rateLimitFailures = this.history.filter(h => !h.success && (
                h.error?.includes('429') || 
                h.error?.includes('Rate limit') || 
                h.error?.includes('rate limit') ||
                h.reason === 'api_error'
            )).length;
            
            if (window.optimizationTracker) {
                window.optimizationTracker.updateProgress(this.testCount, totalFailures, rateLimitFailures);
            }
            
            // Ensure config is complete before testing
            const completeConfig = this.ensureCompleteConfig(config);
            
            // Check cache first
            if (this.configCache.has(completeConfig)) {
                const cachedResult = this.configCache.get(completeConfig);
                console.log(`💾 Cache hit for: ${testName}`);
                return cachedResult;
            }
            
            // Test via API call (placeholder - needs actual implementation)
            const result = await this.testConfigurationAPI(completeConfig, testName);
            
            if (!result.success) {
                const isRateLimitError = result.error?.includes('429') || 
                                       result.error?.includes('Rate limit') || 
                                       result.error?.includes('rate limit') ||
                                       result.source === 'API';
                
                this.history.push({
                    testName,
                    config: completeConfig,
                    success: false,
                    error: result.error,
                    reason: isRateLimitError ? 'api_error' : 'validation_error',
                    testNumber: this.testCount,
                    timestamp: new Date().toISOString()
                });
                
                this.configCache.set(completeConfig, result);
                return result;
            }

            const metrics = result.metrics;
            
            // Validate metrics
            if (metrics.tpPnlPercent === undefined || (metrics.totalTokens || 0) < minTokens) {
                const failResult = { success: false, reason: 'insufficient_tokens' };
                
                this.history.push({
                    testName,
                    config: completeConfig,
                    success: false,
                    reason: 'insufficient_tokens',
                    testNumber: this.testCount,
                    timestamp: new Date().toISOString()
                });
                
                this.configCache.set(completeConfig, failResult);
                return failResult;
            }

            // Calculate score
            const score = this.calculateScore(metrics);
            
            // Store metrics with robust scoring details if used
            const useRobustScoring = document.getElementById('robust-scoring')?.checked || false;
            if (useRobustScoring) {
                metrics.robustScoring = this.calculateRobustScore(metrics);
            }
            
            // Update best if this is better
            if (score > this.bestScore) {
                this.bestScore = score;
                this.bestConfig = completeConfig;
                this.bestMetrics = metrics;
                this.updateBestConfigDisplay();
                
                console.log(`🎉 New best: ${score.toFixed(1)}% (${metrics.totalTokens} tokens, ${testName})`);
            }
            
            // Track successful test
            this.history.push({
                testName,
                config: completeConfig,
                success: true,
                score: score,
                metrics: metrics,
                testNumber: this.testCount,
                timestamp: new Date().toISOString()
            });
            
            // Cache the result
            this.configCache.set(completeConfig, result);
            
            return result;
            
        } catch (error) {
            console.error(`❌ Error testing ${testName}:`, error);
            
            this.history.push({
                testName,
                config: config,
                success: false,
                error: error.message,
                reason: 'exception',
                testNumber: this.testCount,
                timestamp: new Date().toISOString()
            });
            
            return { success: false, error: error.message };
        }
    }

    // Placeholder for API testing - needs actual implementation
    async testConfigurationAPI(config, testName) {
        // This would be implemented to call the actual AG API
        console.log('🔧 Testing config via API:', testName);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Return mock result for now
        return {
            success: true,
            metrics: {
                tpPnlPercent: Math.random() * 200 - 50, // Random score between -50 and 150
                totalTokens: Math.floor(Math.random() * 100) + 50,
                winRate: Math.random() * 100
            }
        };
    }

    ensureCompleteConfig(config) {
        // This would ensure the config has all required fields
        return config;
    }

    // ========================================
    // 🎯 MAIN OPTIMIZATION FUNCTION (RESTORED)
    // ========================================
    async runOptimization() {
        try {
            console.log('🚀 Enhanced Optimization Started');
            
            // Clear cache at start
            this.configCache.clear();
            console.log('💾 Cache cleared at start of optimization');
            
            // Get optimization settings from UI
            const useSimulatedAnnealing = document.getElementById('simulated-annealing')?.checked || false;
            const useMultipleStarts = document.getElementById('multiple-starting-points')?.checked || false;
            const useLatinHypercube = document.getElementById('latin-hypercube')?.checked || false;
            const useCorrelatedParams = document.getElementById('correlated-params')?.checked || false;
            const useDeepDive = document.getElementById('deep-dive')?.checked || false;
            const targetPnl = parseFloat(document.getElementById('target-pnl')?.value) || 100;
            
            console.log('🚀 Optimization settings:', {
                useSimulatedAnnealing,
                useMultipleStarts,
                useLatinHypercube,
                useCorrelatedParams,
                useDeepDive,
                targetPnl
            });
            
            // 1. Multiple Starting Points (if enabled)
            if (useMultipleStarts && this.getRemainingTime() > 0.8) {
                await this.runMultipleStartingPoints();
            } else {
                // 1. Establish baseline
                await this.establishBaseline();
            }
            
            // 2. Parameter testing phase
            if (this.getRemainingTime() > 0.6 && !window.STOPPED) {
                await this.runParameterPhase();
            }
            
            // 3. Latin Hypercube Sampling (if enabled and we have time and good parameters)
            if (useLatinHypercube && this.getRemainingTime() > 0.4 && !window.STOPPED && this.parameterTests.length > 0) {
                await this.runLatinHypercubePhase();
            }
            
            // 4. Correlated Parameter testing (if enabled and we have time)
            if (useCorrelatedParams && this.getRemainingTime() > 0.3 && !window.STOPPED) {
                await this.runCorrelatedParameterPhase();
            }
            
            // 5. Simulated Annealing (if enabled and we have time)
            if (useSimulatedAnnealing && this.getRemainingTime() > 0.15 && !window.STOPPED) {
                await this.simulatedAnnealing.runSimulatedAnnealing();
            }
            
            // 6. Deep dive on best parameters (if enabled and final optimization)
            if (useDeepDive && this.getRemainingTime() > 0.05 && !window.STOPPED && this.parameterTests.length > 0) {
                await this.runDeepDive();
            }
            
            const runtime = Math.floor((Date.now() - this.startTime) / 1000);
            
            return {
                bestConfig: this.bestConfig,
                bestScore: this.bestScore,
                bestMetrics: this.bestMetrics,
                testCount: this.testCount,
                runtime: runtime,
                targetAchieved: this.bestScore >= targetPnl,
                history: this.history,
                cacheSize: this.configCache.size(),
                parameterEffectiveness: this.parameterTests.slice(0, 10)
            };
            
        } catch (error) {
            console.error('Optimization error:', error);
            throw error;
        }
    }

    // ========================================
    // 🔬 ADVANCED OPTIMIZATION PHASES (RESTORED)
    // ========================================

    async establishBaseline() {
        this.updateProgress('🎯 Establishing Baseline', 5, '--', 0, '--', this.startTime);
        
        if (this.initialConfig) {
            await this.testConfig(this.initialConfig, 'Initial baseline');
        }
    }

    async runParameterPhase() {
        this.updateProgress('🧪 Parameter Testing Phase', 20, this.bestScore.toFixed(1), this.testCount, this.bestMetrics?.totalTokens || '--', this.startTime);
        
        // Test individual parameters to understand their impact
        const paramList = Object.keys(window.AGCopilot?.PARAM_RULES || {});
        
        for (const param of paramList.slice(0, 10)) { // Test top 10 parameters
            if (window.STOPPED || this.getRemainingTime() <= 0.5) break;
            
            const variations = this.generateParameterVariations(this.bestConfig || this.initialConfig, param, this.getSection(param));
            
            for (const variation of variations) {
                if (window.STOPPED) break;
                const result = await this.testConfig(variation.config, variation.name);
                
                if (result.success) {
                    this.parameterTests.push({
                        param: param,
                        section: this.getSection(param),
                        effectiveness: result.metrics.tpPnlPercent - this.bestScore
                    });
                }
            }
        }
        
        // Sort parameters by effectiveness
        this.parameterTests.sort((a, b) => b.effectiveness - a.effectiveness);
    }

    async runLatinHypercubePhase() {
        this.updateProgress('🎲 Latin Hypercube Sampling', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics?.totalTokens || '--', this.startTime);
        
        // Use best config or fall back to initial config
        const baseConfig = this.bestConfig || this.initialConfig;
        if (!baseConfig) {
            console.log('⚠️ No configuration available, skipping Latin Hypercube phase');
            return;
        }
        
        // Focus on top parameters for LHS
        const topParams = this.parameterTests.slice(0, 6).map(p => p.param);
        const variations = this.generateLatinHypercubeVariations(baseConfig, topParams, 8);
        
        for (const variation of variations) {
            if (window.STOPPED || this.getRemainingTime() <= 0.3) break;
            
            const result = await this.testConfig(variation.config, variation.name);
            if (!result.success) continue;
            
            // Early termination if target achieved
            const targetPnl = parseFloat(document.getElementById('target-pnl')?.value) || 100;
            if (this.bestScore >= targetPnl) {
                this.updateProgress('🎯 Target achieved early!', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics?.totalTokens || '--', this.startTime);
                return;
            }
        }
    }

    async runCorrelatedParameterPhase() {
        this.updateProgress('🔗 Correlated Parameters', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics?.totalTokens || '--', this.startTime);
        
        // Use best config or fall back to initial config
        const baseConfig = this.bestConfig || this.initialConfig;
        if (!baseConfig) {
            console.log('⚠️ No configuration available, skipping correlated parameter phase');
            return;
        }
        
        const correlatedVariations = this.generateCorrelatedVariations(baseConfig);
        
        for (const variation of correlatedVariations) {
            if (window.STOPPED || this.getRemainingTime() <= 0.1) break;
            
            const result = await this.testConfig(variation.config, variation.name);
            if (!result.success) continue;
            
            // Early termination if target achieved
            const targetPnl = parseFloat(document.getElementById('target-pnl')?.value) || 100;
            if (this.bestScore >= targetPnl) {
                this.updateProgress('🎯 Target achieved early!', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics?.totalTokens || '--', this.startTime);
                return;
            }
        }
    }

    async runMultipleStartingPoints() {
        this.updateProgress('🚀 Multiple Starting Points', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics?.totalTokens || '--', this.startTime);
        
        // Use all presets as starting points
        const startingPoints = Object.entries(window.AGCopilot?.PRESETS || {});
        
        for (const [presetName, startingPoint] of startingPoints) {
            if (window.STOPPED) break;
            
            const result = await this.testConfig(startingPoint, `Starting point: ${presetName}`);
            if (!result.success) continue;
            
            // Test variations around this starting point (only if we have reasonable time)
            if (this.getRemainingTime() > 0.01) {
                const topParam = this.parameterTests[0]?.param;
                if (topParam) {
                    const variations = this.generateParameterVariations(startingPoint, topParam, this.getSection(topParam));
                    if (variations) {
                        for (const variation of variations.slice(0, 2)) {
                            if (window.STOPPED) break;
                            await this.testConfig(variation.config, variation.name);
                        }
                    }
                }
            }
            
            // Early termination if target achieved
            const targetPnl = parseFloat(document.getElementById('target-pnl')?.value) || 100;
            if (this.bestScore >= targetPnl) {
                this.updateProgress('🎯 Target achieved early!', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics?.totalTokens || '--', this.startTime);
                return;
            }
        }
    }

    async runDeepDive() {
        this.updateProgress('🔬 Deep Dive Analysis', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics?.totalTokens || '--', this.startTime);
        
        // Use best config or fall back to initial config
        const baseConfig = this.bestConfig || this.initialConfig;
        if (!baseConfig) {
            console.log('⚠️ No configuration available, skipping Deep Dive phase');
            return;
        }
        
        // Deep dive on top 3 most effective parameters
        const topParams = this.parameterTests.slice(0, 3);
        
        for (const paramTest of topParams) {
            if (window.STOPPED || this.getRemainingTime() <= 0.02) break;
            
            // Generate more fine-grained variations
            const variations = this.generateParameterVariations(baseConfig, paramTest.param, paramTest.section, true);
            
            for (const variation of variations) {
                if (window.STOPPED) break;
                await this.testConfig(variation.config, `Deep dive: ${variation.name}`);
            }
        }
    }

    // ========================================
    // 🎲 VARIATION GENERATORS (RESTORED)
    // ========================================

    // Enhanced variation generation using Latin Hypercube Sampling
    generateLatinHypercubeVariations(baseConfig, parameters, numSamples = 6) {
        const samples = this.latinSampler.generateSamples(parameters, numSamples);
        const variations = [];
        
        for (const sample of samples) {
            const config = JSON.parse(JSON.stringify(baseConfig)); // Deep clone
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

    // Generate correlated parameter variations (e.g., Min/Max MCAP together)
    generateCorrelatedVariations(baseConfig) {
        const variations = [];
        
        // MCAP correlation
        variations.push(...this.generateCorrelatedPair(baseConfig, 'Min MCAP (USD)', 'Max MCAP (USD)', 'MCAP range'));
        
        // Bundled % correlation
        variations.push(...this.generateCorrelatedPair(baseConfig, 'Min Bundled %', 'Max Bundled %', 'Bundled range'));
        
        // Wallet count correlation
        variations.push(...this.generateCorrelatedPair(baseConfig, 'Min Unique Wallets', 'Max Unique Wallets', 'Wallet range'));
        
        return variations;
    }

    generateCorrelatedPair(baseConfig, param1, param2, description) {
        if (!baseConfig) {
            console.warn('⚠️ baseConfig is null in generateCorrelatedPair');
            return [];
        }
        
        const variations = [];
        const rules1 = window.AGCopilot?.PARAM_RULES?.[param1];
        const rules2 = window.AGCopilot?.PARAM_RULES?.[param2];
        
        if (!rules1 || !rules2) return variations;
        
        const section1 = this.getSection(param1);
        const section2 = this.getSection(param2);
        
        // Generate 3 correlated variations
        for (let i = 0; i < 3; i++) {
            const config = JSON.parse(JSON.stringify(baseConfig));
            
            const value1 = rules1.min + (rules1.max - rules1.min) * (i / 2);
            const value2 = Math.max(value1, rules2.min + (rules2.max - rules2.min) * ((i + 1) / 2));
            
            if (config[section1]) config[section1][param1] = Math.round(value1 / rules1.step) * rules1.step;
            if (config[section2]) config[section2][param2] = Math.round(value2 / rules2.step) * rules2.step;
            
            variations.push({
                config,
                name: `${description} ${i + 1}: ${param1}=${config[section1]?.[param1]}, ${param2}=${config[section2]?.[param2]}`
            });
        }
        
        return variations;
    }

    generateParameterVariations(baseConfig, param, section, fineTuned = false) {
        const variations = [];
        const rules = window.AGCopilot?.PARAM_RULES?.[param];
        
        if (!rules || !baseConfig?.[section]) return variations;
        
        const currentValue = baseConfig[section][param] || (rules.min + rules.max) / 2;
        const numVariations = fineTuned ? 5 : 3;
        const stepMultiplier = fineTuned ? 0.5 : 1;
        
        for (let i = 0; i < numVariations; i++) {
            const config = JSON.parse(JSON.stringify(baseConfig));
            
            let newValue;
            if (rules.type === 'string') {
                newValue = Math.floor(Math.random() * 10 + 1).toString();
            } else {
                const range = (rules.max - rules.min) * 0.2 * stepMultiplier;
                const offset = (i - Math.floor(numVariations / 2)) * (range / numVariations);
                newValue = Math.max(rules.min, Math.min(rules.max, currentValue + offset));
                newValue = Math.round(newValue / rules.step) * rules.step;
            }
            
            config[section][param] = newValue;
            
            variations.push({
                config,
                name: `${param}=${newValue}${fineTuned ? ' (fine)' : ''}`
            });
        }
        
        return variations;
    }

    updateProgress(message, progress, score, tests, tokens, startTime) {
        if (typeof updateProgress === 'function') {
            updateProgress(message, progress, score, tests, tokens, startTime);
        } else {
            console.log(`${message} - Progress: ${progress}% - Score: ${score} - Tests: ${tests}`);
        }
    }

    // ========================================
    // 🔍 PARAMETER DISCOVERY FUNCTIONS (RESTORED)
    // ========================================

    async runParameterDiscovery() {
        console.log('🔬 Starting Parameter Impact Discovery...');
        
        // This would run comprehensive parameter impact analysis
        // For now, return placeholder results
        return {
            topParameters: this.parameterTests.slice(0, 10),
            recommendations: [
                'Focus on MCAP range optimization',
                'Test bundled percentage limits',
                'Explore wallet count correlations'
            ]
        };
    }
}

// ========================================
// 🎮 OPTIMIZATION CONTROL FUNCTIONS
// ========================================

let globalOptimizer = null;

async function startOptimization() {
    if (globalOptimizer) {
        console.log('⚠️ Optimization already running');
        return;
    }
    
    try {
        // Show stop button, hide start button
        const startBtn = document.getElementById('start-optimization');
        const stopBtn = document.getElementById('stop-optimization');
        
        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'block';
        
        window.STOPPED = false;
        
        // Get initial config from current UI state
        const initialConfig = getCurrentConfig();
        
        // Create optimizer instance
        globalOptimizer = new EnhancedOptimizer(initialConfig);
        
        // Run optimization
        const results = await globalOptimizer.runOptimization();
        
        console.log('🎉 Optimization completed:', results);
        
        // Display results
        if (results.bestConfig) {
            globalOptimizer.updateBestConfigDisplay();
        }
        
    } catch (error) {
        console.error('❌ Optimization failed:', error);
    } finally {
        // Reset UI
        const startBtn = document.getElementById('start-optimization');
        const stopBtn = document.getElementById('stop-optimization');
        
        if (startBtn) startBtn.style.display = 'block';
        if (stopBtn) stopBtn.style.display = 'none';
        
        globalOptimizer = null;
    }
}

function stopOptimization() {
    console.log('⏹️ Stopping optimization...');
    window.STOPPED = true;
    
    // Reset UI immediately
    const startBtn = document.getElementById('start-optimization');
    const stopBtn = document.getElementById('stop-optimization');
    
    if (startBtn) startBtn.style.display = 'block';
    if (stopBtn) stopBtn.style.display = 'none';
    
    globalOptimizer = null;
}

async function runParameterDiscovery() {
    console.log('🔬 Starting Parameter Discovery...');
    
    if (globalOptimizer) {
        const results = await globalOptimizer.runParameterDiscovery();
        console.log('📊 Parameter Discovery Results:', results);
        return results;
    } else {
        console.log('⚠️ No optimizer instance available. Starting discovery...');
        
        // Create temporary optimizer for discovery
        const tempOptimizer = new EnhancedOptimizer(getCurrentConfig());
        const results = await tempOptimizer.runParameterDiscovery();
        console.log('📊 Parameter Discovery Results:', results);
        return results;
    }
}

// Helper function to get current configuration from UI
function getCurrentConfig() {
    // This would extract current config from UI elements
    // For now, return a basic config
    return {
        basic: {
            'Min MCAP (USD)': 10000,
            'Max MCAP (USD)': 5000000
        },
        risk: {
            'Min Bundled %': 0,
            'Max Bundled %': 50
        }
        // ... other sections
    };
}

// ========================================
// 📤 MODULE EXPORTS
// ========================================

// Export optimization functions for use by other modules
if (typeof module !== 'undefined' && module.exports) {
    // Node.js/CommonJS
    module.exports = {
        startOptimization,
        stopOptimization,
        runParameterDiscovery,
        EnhancedOptimizer,
        LatinHypercubeSampler,
        SimulatedAnnealing
    };
} else {
    // Browser environment - attach to window/global namespace
    window.AGCopilotOptimization = {
        startOptimization,
        stopOptimization,
        runParameterDiscovery,
        EnhancedOptimizer,
        LatinHypercubeSampler,
        SimulatedAnnealing
    };
}
