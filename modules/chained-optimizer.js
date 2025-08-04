// Chained Optimizer Module - Intelligent multi-run optimization
// Runs multiple optimization cycles, each starting from the previous best configuration

export class ChainedOptimizer {
    constructor() {
        this.chainResults = [];
        this.globalBestConfig = null;
        this.globalBestScore = -Infinity;
        this.globalBestMetrics = null;
        this.totalTestCount = 0;
        this.chainStartTime = Date.now();
        this.currentRun = 0;
        this.totalRuns = 3;
        this.timePerRun = 15;
    }
    
    async runChainedOptimization(runCount = 3, timePerRunMin = 15, EnhancedOptimizer) {
        this.totalRuns = runCount;
        this.timePerRun = timePerRunMin;
        this.chainStartTime = Date.now();
        
        // Start optimization tracking
        if (window.optimizationTracker) {
            window.optimizationTracker.startOptimization();
        }
        
        console.log(`🔗 Starting chained optimization: ${runCount} runs × ${timePerRunMin} minutes each`);
        
        for (let run = 1; run <= runCount; run++) {
            if (window.STOPPED) {
                console.log(`⏹️ Chained optimization stopped at run ${run}/${runCount}`);
                break;
            }
            
            this.currentRun = run;
            const runStartTime = Date.now();
            
            console.log(`\n🔗 === CHAIN RUN ${run}/${runCount} ===`);
            
            try {
                // Create new optimizer for this run
                // For run 1, start fresh (no initial config)
                // For run 2+, start from the best config found so far
                const initialConfig = run === 1 ? null : this.globalBestConfig;
                const optimizer = new EnhancedOptimizer(initialConfig);
                
                if (initialConfig) {
                    console.log(`🔄 Run ${run} starting from previous best config (Score: ${this.globalBestScore.toFixed(1)}%)`);
                    console.log(`🚀 Building on accumulated knowledge from ${run-1} previous run${run > 2 ? 's' : ''}!`);
                } else {
                    console.log(`🆕 Run ${run} starting fresh with baseline discovery`);
                }
                
                // Override the runtime for this individual run
                const originalRuntime = window.AGCopilot?.CONFIG?.MAX_RUNTIME_MIN;
                if (window.AGCopilot?.CONFIG) {
                    window.AGCopilot.CONFIG.MAX_RUNTIME_MIN = timePerRunMin;
                }
                
                // Initialize advanced components if available
                if (window.AGCopilot.LatinHypercubeSampler && window.AGCopilot.SimulatedAnnealing && window.AGCopilot.GeneticOptimizer) {
                    optimizer.initializeAdvancedComponents(
                        window.AGCopilot.LatinHypercubeSampler,
                        window.AGCopilot.SimulatedAnnealing,
                        window.AGCopilot.GeneticOptimizer
                    );
                }
                
                // Run optimization
                const runResults = await optimizer.runOptimization();
                
                // Restore original runtime setting
                if (window.AGCopilot?.CONFIG && originalRuntime !== undefined) {
                    window.AGCopilot.CONFIG.MAX_RUNTIME_MIN = originalRuntime;
                }
                
                // Track this run's results
                const runDuration = Math.floor((Date.now() - runStartTime) / 1000);
                const runResult = {
                    runNumber: run,
                    config: runResults.bestConfig,
                    score: runResults.bestScore,
                    metrics: runResults.bestMetrics,
                    testCount: runResults.testCount,
                    runtime: runDuration,
                    targetAchieved: runResults.targetAchieved,
                    parameterEffectiveness: runResults.parameterEffectiveness?.slice(0, 3) || []
                };
                
                this.chainResults.push(runResult);
                this.totalTestCount += runResults.testCount;
                
                // Update global best if this run found something better
                if (runResults.bestScore > this.globalBestScore) {
                    this.globalBestConfig = runResults.bestConfig;
                    this.globalBestScore = runResults.bestScore;
                    this.globalBestMetrics = runResults.bestMetrics;
                    
                    // Update the global window reference
                    window.currentBestConfig = this.globalBestConfig;
                    
                    console.log(`🎉 New global best from Run ${run}! Score: ${this.globalBestScore.toFixed(1)}%`);
                }
                
                const chainProgress = (run / runCount) * 100;
                console.log(`✅ Run ${run} completed: ${runResults.bestScore.toFixed(1)}% (${runResults.testCount} tests in ${runDuration}s)`);
                
                // Early termination if target achieved
                const targetPnl = parseFloat(document.getElementById('target-pnl')?.value) || 100;
                if (this.globalBestScore >= targetPnl) {
                    console.log(`🎯 Target ${targetPnl}% achieved in run ${run}! Stopping chain early.`);
                    break;
                }
                
                // Brief pause between runs (let UI update)
                if (run < runCount && !window.STOPPED) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
            } catch (error) {
                console.error(`❌ Run ${run} failed:`, error);
                console.error('Stack trace:', error.stack);
                this.chainResults.push({
                    runNumber: run,
                    error: error.message,
                    runtime: Math.floor((Date.now() - runStartTime) / 1000)
                });
            }
        }
        
        const totalDuration = Math.floor((Date.now() - this.chainStartTime) / 1000);
        return this.generateChainSummary(totalDuration);
    }
    
    generateChainSummary(totalDuration) {
        console.log(`\n🔗 === CHAINED OPTIMIZATION SUMMARY ===`);
        console.log(`📊 Completed ${this.chainResults.length} runs in ${totalDuration}s (${this.totalTestCount} total tests)`);
        
        // Sort runs by score for analysis
        const successfulRuns = this.chainResults.filter(r => !r.error);
        const sortedRuns = [...successfulRuns].sort((a, b) => b.score - a.score);
        
        if (successfulRuns.length > 1) {
            // Show knowledge accumulation benefits
            const firstRunScore = successfulRuns[0].score;
            const finalScore = this.globalBestScore;
            const improvement = finalScore - firstRunScore;
            
            if (improvement > 0) {
                console.log(`📈 Knowledge accumulation benefit: +${improvement.toFixed(1)}% from initial to final best`);
                console.log(`🧠 Each run built on previous discoveries instead of starting from scratch`);
            }
            
            // Show top runs
            console.log(`\n🏆 Top performing runs:`);
            sortedRuns.forEach((run, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
                console.log(`${medal} Run ${run.runNumber}: ${run.score.toFixed(1)}% (${run.metrics.totalTokens} tokens, ${run.testCount} tests)`);
            });
            
            // Show score progression across runs
            const scoreProgression = successfulRuns.map(r => r.score.toFixed(1));
            console.log(`\n📈 Score progression: [${scoreProgression.join('% → ')}%]`);
            console.log(`🔄 Runs 2+ started from previous best configuration instead of baseline discovery`);
            
            // Parameter effectiveness analysis
            const allParams = new Map();
            successfulRuns.forEach(run => {
                run.parameterEffectiveness?.forEach(param => {
                    const existing = allParams.get(param.param) || { totalImprovement: 0, occurrences: 0 };
                    allParams.set(param.param, {
                        totalImprovement: existing.totalImprovement + param.improvement,
                        occurrences: existing.occurrences + 1
                    });
                });
            });
            
            const avgParamEffectiveness = Array.from(allParams.entries())
                .map(([param, data]) => ({
                    param,
                    avgImprovement: data.totalImprovement / data.occurrences,
                    frequency: data.occurrences
                }))
                .sort((a, b) => b.avgImprovement - a.avgImprovement)
                .slice(0, 5);
                
            if (avgParamEffectiveness.length > 0) {
                console.log(`\n🎯 Most effective parameters across all runs:`);
                avgParamEffectiveness.forEach((param, index) => {
                    console.log(`${index + 1}. ${param.param}: +${param.avgImprovement.toFixed(1)}% avg (appeared in ${param.frequency}/${successfulRuns.length} runs)`);
                });
            }
        }
        
        return {
            chainResults: this.chainResults,
            globalBestConfig: this.globalBestConfig,
            globalBestScore: this.globalBestScore,
            globalBestMetrics: this.globalBestMetrics,
            totalTestCount: this.totalTestCount,
            totalRuntime: totalDuration,
            successfulRuns: successfulRuns.length,
            failedRuns: this.chainResults.length - successfulRuns.length,
            targetAchieved: this.globalBestScore >= (parseFloat(document.getElementById('target-pnl')?.value) || 100)
        };
    }
    
    updateBestConfigDisplay() {
        // Update the optimization tracker display
        if (window.optimizationTracker) {
            const display = document.getElementById('best-config-display');
            const stats = document.getElementById('best-config-stats');
            
            if (display && stats && this.globalBestConfig) {
                display.style.display = 'block';
                
                const scoreDisplay = this.globalBestScore !== -Infinity ? 
                    this.globalBestScore.toFixed(1) + '%' : 'N/A';
                
                const methodDisplay = this.chainResults.length > 0 ? 
                    `<div><strong>Chain Progress:</strong> Run ${this.currentRun}/${this.totalRuns}</div>` : '';
                
                stats.innerHTML = `
                    <div><strong>🔗 Chain Best:</strong> ${scoreDisplay} | <strong>Tokens:</strong> ${this.globalBestMetrics?.totalTokens || 0} | <strong>Win Rate:</strong> ${this.globalBestMetrics?.winRate?.toFixed(1) || 0}%</div>
                    ${methodDisplay}
                    <div><strong>Runs:</strong> ${this.currentRun}/${this.totalRuns} | <strong>Total Tests:</strong> ${this.totalTestCount} | <strong>Runtime:</strong> ${Math.floor((Date.now() - this.chainStartTime) / 1000)}s</div>
                `;
            }
        }
    }
}
