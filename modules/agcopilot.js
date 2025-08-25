/**
 * @fileoverview AGCopilot Enhanced - Modular entry point for main optimization tool
 * @version 1.0.0
 */

import { sleep, deepClone } from './utils.js';
import { ENHANCED_CONFIG, COMPLETE_CONFIG_TEMPLATE } from './config.js';
import { BacktesterAPI } from './api.js';
import { UIController } from './ui-controller.js';
import { globalProgressBar, globalNotifier } from './progress.js';
import { 
    ConfigCache, 
    ParameterImpactAnalyzer, 
    GeneticOptimizer, 
    SimulatedAnnealing, 
    AdaptiveStepManager,
    LatinHypercubeSampler,
    OptimizationTracker 
} from './optimization.js';

/**
 * AGCopilot Enhanced main class
 */
export class AGCopilotEnhanced {
    constructor(options = {}) {
        this.config = { ...ENHANCED_CONFIG, ...options };
        this.api = new BacktesterAPI(this.config.API_BASE_URL, {
            maxRetries: this.config.MAX_RETRIES,
            retryDelay: this.config.RETRY_DELAY,
            requestDelay: this.config.REQUEST_DELAY
        });
        this.ui = new UIController({
            aggressiveRateLimiting: true,
            fieldDelay: 500,
            sectionDelay: 1000
        });
        
        // Optimization components
        this.configCache = new ConfigCache();
        this.impactAnalyzer = new ParameterImpactAnalyzer(this);
        this.geneticOptimizer = new GeneticOptimizer(this);
        this.simulatedAnnealing = new SimulatedAnnealing(this);
        this.adaptiveStepManager = new AdaptiveStepManager();
        this.latinSampler = new LatinHypercubeSampler();
        this.tracker = new OptimizationTracker();
        
        // State
        this.bestConfig = null;
        this.bestScore = 0;
        this.bestMetrics = null;
        this.testCount = 0;
        this.startTime = null;
        this.isRunning = false;
    }

    /**
     * Initialize and start the optimization process
     */
    async initialize() {
        console.clear();
        console.log('%c🤖 AG Copilot Enhanced v2.0 🤖', 'color: blue; font-size: 16px; font-weight: bold;');
        console.log('%c🔍 Direct API Optimization + Signal Analysis + Config Generation', 'color: green; font-size: 12px;');

        try {
            // Get current configuration as baseline
            this.bestConfig = await this.ui.getCurrentConfig();
            console.log('📋 Current configuration extracted as baseline');
            
            // Start optimization process
            await this.showWelcomeDialog();
            
        } catch (error) {
            console.error('❌ Initialization error:', error);
            globalNotifier.error(`Initialization failed: ${error.message}`);
            throw error;
        }
        
        return this;
    }

    /**
     * Show welcome dialog and start optimization
     */
    async showWelcomeDialog() {
        // Create simple dialog for starting optimization
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            border: 2px solid #4CAF50;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            z-index: 10001;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: white;
            text-align: center;
            max-width: 500px;
        `;

        dialog.innerHTML = `
            <h2 style="margin: 0 0 20px 0; color: #4CAF50;">🤖 AGCopilot Enhanced Ready</h2>
            <p style="margin: 0 0 20px 0; line-height: 1.5;">
                Advanced optimization system loaded and ready to optimize your AG configuration.
                Current settings will be used as the baseline for optimization.
            </p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button id="start-optimization" style="
                    padding: 12px 24px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 14px;
                ">🚀 Start Optimization</button>
                <button id="cancel-optimization" style="
                    padding: 12px 24px;
                    background: #f44336;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                ">Cancel</button>
            </div>
        `;

        document.body.appendChild(dialog);

        return new Promise((resolve, reject) => {
            document.getElementById('start-optimization').addEventListener('click', async () => {
                document.body.removeChild(dialog);
                try {
                    await this.runOptimization();
                    resolve(this);
                } catch (error) {
                    reject(error);
                }
            });

            document.getElementById('cancel-optimization').addEventListener('click', () => {
                document.body.removeChild(dialog);
                console.log('🛑 Optimization cancelled by user');
                resolve(this);
            });
        });
    }

    /**
     * Main optimization routine
     */
    async runOptimization() {
        if (this.isRunning) {
            globalNotifier.warning('Optimization is already running');
            return;
        }

        this.isRunning = true;
        this.startTime = Date.now();
        
        try {
            globalProgressBar.create();
            console.log('🚀 Starting optimization process...');
            
            // Phase 1: Establish baseline
            globalProgressBar.updateStatus('📊 Establishing baseline...');
            const baselineResult = await this.testConfiguration(this.bestConfig);
            this.bestScore = baselineResult.score || 0;
            this.bestMetrics = baselineResult.metrics || {};
            this.testCount = 1;
            
            console.log(`📊 Baseline established: ${this.bestScore.toFixed(1)}%`);
            globalProgressBar.update('📊 Baseline established', 10, this.bestScore, this.testCount, this.bestMetrics.tokensMatched || 0, this.startTime);
            
            // Phase 2: Parameter impact analysis
            if (this.config.USE_PARAMETER_IMPACT_ANALYSIS) {
                globalProgressBar.updateStatus('🔍 Analyzing parameter impacts...');
                await this.impactAnalyzer.analyzeParameterImpacts();
                globalProgressBar.update('🔍 Parameter analysis complete', 20, this.bestScore, this.testCount, this.bestMetrics.tokensMatched || 0, this.startTime);
            }
            
            // Phase 3: Genetic Algorithm optimization
            if (this.config.USE_GENETIC_ALGORITHM) {
                globalProgressBar.updateStatus('🧬 Running genetic algorithm...');
                const geneticResult = await this.geneticOptimizer.runGeneticAlgorithm();
                if (geneticResult && geneticResult.fitness > this.bestScore) {
                    this.bestConfig = geneticResult.config;
                    this.bestScore = geneticResult.fitness;
                }
                globalProgressBar.update('🧬 Genetic algorithm complete', 60, this.bestScore, this.testCount, this.bestMetrics.tokensMatched || 0, this.startTime);
            }
            
            // Phase 4: Simulated Annealing
            if (this.config.USE_SIMULATED_ANNEALING) {
                globalProgressBar.updateStatus('🌡️ Running simulated annealing...');
                const annealingResult = await this.simulatedAnnealing.runSimulatedAnnealing();
                if (annealingResult && annealingResult.score > this.bestScore) {
                    this.bestConfig = annealingResult.config;
                    this.bestScore = annealingResult.score;
                }
                globalProgressBar.update('🌡️ Simulated annealing complete', 90, this.bestScore, this.testCount, this.bestMetrics.tokensMatched || 0, this.startTime);
            }
            
            // Phase 5: Apply best configuration
            globalProgressBar.updateStatus('🎯 Applying best configuration...');
            await this.ui.applyConfig(this.bestConfig, true);
            globalProgressBar.update('✅ Optimization complete!', 100, this.bestScore, this.testCount, this.bestMetrics.tokensMatched || 0, this.startTime);
            
            // Show results
            setTimeout(() => {
                globalProgressBar.remove();
                this.showResults();
            }, 2000);
            
        } catch (error) {
            globalProgressBar.remove();
            globalNotifier.error(`Optimization failed: ${error.message}`);
            console.error('❌ Optimization error:', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Test a configuration and return results
     */
    async testConfiguration(config) {
        try {
            this.testCount++;
            
            // Check cache first
            if (this.config.USE_CONFIG_CACHING && this.configCache.has(config)) {
                console.log('💾 Using cached result');
                return this.configCache.get(config);
            }
            
            // Apply configuration to UI
            await this.ui.applyConfig(config);
            await sleep(1000); // Wait for UI to update
            
            // Get stats via API
            const result = await this.api.getStats(config, {
                buyingAmount: this.config.DEFAULT_BUYING_AMOUNT
            });
            
            // Calculate score based on scoring mode
            const score = this.calculateScore(result);
            const formattedResult = {
                score,
                metrics: result,
                config: deepClone(config)
            };
            
            // Cache the result
            if (this.config.USE_CONFIG_CACHING) {
                this.configCache.set(config, formattedResult);
            }
            
            // Track in optimization history
            this.tracker.recordResult(config, result);
            
            return formattedResult;
            
        } catch (error) {
            console.warn(`⚠️ Configuration test failed: ${error.message}`);
            return { score: 0, metrics: {}, config };
        }
    }

    /**
     * Calculate score based on configured scoring mode
     */
    calculateScore(metrics) {
        const mode = this.config.SCORING_MODE;
        
        if (mode === 'tp_only') {
            return metrics.totalPnlPercent || 0;
        }
        
        if (mode === 'winrate_only') {
            return metrics.winRate || 0;
        }
        
        // Robust scoring (default)
        const pnl = metrics.totalPnlPercent || 0;
        const winRate = metrics.winRate || 0;
        const tokenCount = metrics.tokensMatched || 0;
        
        if (tokenCount < 10) return 0; // Insufficient data
        
        // Weight based on token count and consistency
        const reliabilityFactor = Math.min(1, tokenCount / 100);
        const consistencyScore = winRate * this.config.CONSISTENCY_WEIGHT;
        const returnScore = pnl * this.config.RETURN_WEIGHT;
        
        return (consistencyScore + returnScore) * reliabilityFactor;
    }

    /**
     * Show optimization results
     */
    showResults() {
        const runtime = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(runtime / 60);
        const seconds = runtime % 60;
        
        const resultsDialog = document.createElement('div');
        resultsDialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            border: 2px solid #4CAF50;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            z-index: 10001;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: white;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
        `;

        const stats = this.tracker.getStatistics();

        resultsDialog.innerHTML = `
            <h2 style="margin: 0 0 20px 0; color: #4CAF50; text-align: center;">🎉 Optimization Complete!</h2>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                    <h3 style="margin: 0 0 10px 0; color: #81C784;">📈 Best Results</h3>
                    <p style="margin: 5px 0;">Score: <strong>${this.bestScore.toFixed(1)}%</strong></p>
                    <p style="margin: 5px 0;">PnL: <strong>${this.bestMetrics?.totalPnlPercent?.toFixed(1) || '0'}%</strong></p>
                    <p style="margin: 5px 0;">Win Rate: <strong>${this.bestMetrics?.winRate?.toFixed(1) || '0'}%</strong></p>
                    <p style="margin: 5px 0;">Tokens: <strong>${this.bestMetrics?.tokensMatched || 0}</strong></p>
                </div>
                
                <div>
                    <h3 style="margin: 0 0 10px 0; color: #81C784;">📊 Statistics</h3>
                    <p style="margin: 5px 0;">Total Tests: <strong>${stats.totalTests}</strong></p>
                    <p style="margin: 5px 0;">Runtime: <strong>${minutes}:${seconds.toString().padStart(2, '0')}</strong></p>
                    <p style="margin: 5px 0;">Cache Size: <strong>${this.configCache.size()}</strong></p>
                    <p style="margin: 5px 0;">Avg PnL: <strong>${stats.averagePnL.toFixed(1)}%</strong></p>
                </div>
            </div>
            
            <div style="text-align: center;">
                <button id="close-results" style="
                    padding: 12px 24px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 14px;
                ">✅ Close</button>
            </div>
        `;

        document.body.appendChild(resultsDialog);

        document.getElementById('close-results').addEventListener('click', () => {
            document.body.removeChild(resultsDialog);
        });

        // Log detailed results to console
        console.log('🎉 Optimization Results:');
        console.log(`📈 Best Score: ${this.bestScore.toFixed(1)}%`);
        console.log(`🧪 Total Tests: ${stats.totalTests}`);
        console.log(`💾 Cache Size: ${this.configCache.size()}`);
        console.log(`⏱️ Runtime: ${minutes}:${seconds.toString().padStart(2, '0')}`);
        
        globalNotifier.success('Optimization completed successfully!');
    }

    /**
     * Get parameter ranges for optimization
     */
    getParameterRanges() {
        return this.config.PARAMETER_RANGES;
    }

    /**
     * Check if optimization should stop
     */
    shouldStop() {
        if (!this.startTime) return false;
        const elapsed = (Date.now() - this.startTime) / 1000 / 60; // minutes
        return elapsed >= this.config.MAX_RUNTIME_MIN;
    }
}

/**
 * Initialize AGCopilot Enhanced
 */
export async function initialize(options = {}) {
    const copilot = new AGCopilotEnhanced(options);
    return await copilot.initialize();
}

/**
 * Main entry point (for backward compatibility)
 */
export async function main(options = {}) {
    return await initialize(options);
}

// Export default for module loader
export default { initialize, main, AGCopilotEnhanced };