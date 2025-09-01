// OptimizationTracker module - extracted from AGCopilot.js
// Exposes window.OptimizationTracker
(function(AGUtils){
    class OptimizationTracker {
        constructor(AGUtilsArg, config = {}, options = {}) {
            this.AGUtils = AGUtilsArg || AGUtils || (window && window.AGUtils) || {};
            this.config = config || {};
            this.options = options || {};
            this.currentBest = null;
            this.totalTests = 0;
            this.failedTests = 0;
            this.rateLimitFailures = 0; // Track only actual rate limiting failures
            this.startTime = null;
            this.isRunning = false;
            
            // NEW: Run tracking for chained runs and time estimates
            this.currentRun = 0;
            this.totalRuns = 1;
            this.maxRuntimeMs = (this.config.MAX_RUNTIME_MIN || 30) * 60 * 1000; // Will be updated in startOptimization

            // allow injecting a burstRateLimiter instance
            this.burstRateLimiter = options.burstRateLimiter || (window && window.burstRateLimiter) || null;
        }

        _call(cbName, ...args) {
            try {
                if (this.options && typeof this.options[cbName] === 'function') return this.options[cbName](...args);
                if (window && typeof window[cbName] === 'function') return window[cbName](...args);
            } catch (e) {
                console.warn('OptimizationTracker callback error', cbName, e.message);
            }
            return null;
        }

        startOptimization(totalRuns = 1) {
            this.isRunning = true;
            this._call('updateBestConfigHeader', 'running');
            this.startTime = Date.now();
            this.totalTests = 0;
            this.failedTests = 0;
            this.rateLimitFailures = 0;
            this.currentBest = null;
            this.currentRun = 1;
            this.totalRuns = totalRuns;
            this.maxRuntimeMs = (this.config.MAX_RUNTIME_MIN || 30) * 60 * 1000 * totalRuns; // Total runtime for all runs
            this.updateBestConfigDisplay();
        }
        
        // NEW: Set current run for chained runs
        setCurrentRun(runNumber, totalRuns = null) {
            this.currentRun = runNumber;
            if (totalRuns) this.totalRuns = totalRuns;
            this.updateBestConfigDisplay();
        }
        
        // NEW: Calculate time remaining
        getTimeRemaining() {
            if (!this.startTime || !this.isRunning) return null;
            
            const elapsed = Date.now() - this.startTime;
            const remaining = this.maxRuntimeMs - elapsed;
            
            return Math.max(0, remaining);
        }
        
        // NEW: Format time remaining as human readable
        formatTimeRemaining() {
            const remainingMs = this.getTimeRemaining();
            if (remainingMs === null || remainingMs <= 0) return null;
            
            const minutes = Math.floor(remainingMs / 60000);
            const seconds = Math.floor((remainingMs % 60000) / 1000);
            
            if (minutes > 0) {
                return `${minutes}m ${seconds}s`;
            } else {
                return `${seconds}s`;
            }
        }
        
        // NEW: Get estimated completion time
        getEstimatedCompletionTime() {
            const remainingMs = this.getTimeRemaining();
            if (remainingMs === null || remainingMs <= 0) return null;
            
            const completionTime = new Date(Date.now() + remainingMs);
            return completionTime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
            });
        }

        stopOptimization() {
            this.isRunning = false;
            this._call('updateBestConfigHeader', 'idle');
            // Keep display showing final results
        }

        updateProgress(testCount, failedCount, rateLimitFailures = 0, currentBest = null) {
            this.totalTests = testCount;
            this.failedTests = failedCount;
            this.rateLimitFailures = rateLimitFailures;
            if (currentBest) this.currentBest = currentBest;
            
            this.updateBestConfigDisplay();
        }

        setCurrentBest(result, method = 'Unknown') {
            if (result && result.metrics) {
                this.currentBest = {
                    metrics: result.metrics,
                    config: result.config,
                    method: method,
                    timestamp: Date.now()
                };
                this.updateBestConfigDisplay();
            }
        }

        updateBestConfigDisplay() {
            const displayElement = document.getElementById('best-config-display');
            const statsElement = document.getElementById('best-config-stats');
            
            if (!displayElement || !statsElement) return;

            const runtime = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
            const runtimeMin = Math.floor(runtime / 60);
            const runtimeSec = Math.floor(runtime % 60);
            const testsPerMin = runtime > 0 ? (this.totalTests / (runtime / 60)).toFixed(1) : '0';
            
            // Get burst rate limiter stats safely
            const burstStats = (this.burstRateLimiter && typeof this.burstRateLimiter.getStats === 'function') ? this.burstRateLimiter.getStats() : { rateLimitHits: 0 };
            
            // Calculate time remaining
            const timeRemaining = this.formatTimeRemaining();
            const progressPercent = this.maxRuntimeMs > 0 ? 
                Math.min(100, ((Date.now() - (this.startTime || Date.now())) / this.maxRuntimeMs) * 100) : 0;

            let content = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; font-size: 12px; font-weight: bold;">
                    <div>Tests: <span style="color: #4CAF50; font-weight: bold;">${this.totalTests}</span></div>
                    <div>Rejected: <span style="color: ${this.failedTests > 0 ? '#ff9800' : '#666'};">${this.failedTests}</span></div>
                    <div>Runtime: <span style="color: #4CAF50;">${runtimeMin}m ${runtimeSec}s</span></div>
                    <div>Rate: <span style="color: #4CAF50;">${testsPerMin}/min</span></div>
                    <div>📊 Run: <span style="color: #4CAF50; font-weight: bold;">${this.currentRun}/${this.totalRuns}</span></div>
                    ${burstStats.rateLimitHits > 0 ? 
                        `<div>⚠️ Rate Hits: <span style="color: #ff4444;">${burstStats.rateLimitHits}</span></div>` : 
                        '<div>✅ No Rate Hits</div>'
                    }
                </div>
            `;
            
            // Add progress bar for time remaining (only when running and time remaining is available)
            if (timeRemaining && this.isRunning && this.maxRuntimeMs > 0) {
                const progressColor = progressPercent > 80 ? '#ff4444' : progressPercent > 60 ? '#ff9800' : '#4CAF50';
                const completionTime = this.getEstimatedCompletionTime();
                content += `
                    <div style="margin-bottom: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px; font-size: 10px;">
                            <span style="color: #aaa;">Progress:</span>
                            <div style="flex: 1; background: rgba(255,255,255,0.1); border-radius: 10px; height: 6px; overflow: hidden;">
                                <div style="width: ${progressPercent.toFixed(1)}%; height: 100%; background: ${progressColor}; transition: width 0.3s ease;"></div>
                            </div>
                            <span style="color: ${progressColor}; font-weight: bold;">${progressPercent.toFixed(0)}%</span>
                        </div>
                        ${completionTime ? `<div style="font-size: 9px; color: #aaa; margin-top: 2px; text-align: center;">📅 Est. completion: ${completionTime}</div>` : ''}
                    </div>
                `;
            }

            if (this.currentBest && this.currentBest.metrics) {
                const metrics = this.currentBest.metrics;
                
                content += `
                    <div style="border-top: 1px solid rgba(76, 175, 80, 0.3); padding-top: 8px; margin-bottom: 8px; font-weight: bold;">
                        <div style="font-size: 11px; font-weight: bold; color: #4CAF50; margin-bottom: 4px;">🏆 Current Best:</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 10px;">
                            <div>Score: <span style="color: #4CAF50; font-weight: bold;">${metrics.score?.toFixed(1) || 'N/A'}</span></div>
                            <div>Tokens: <span style="color: #fff;">${metrics.totalTokens || 0}</span></div>
                            <div>TP PnL: <span style="color: ${(metrics.tpPnlPercent || 0) >= 0 ? '#4CAF50' : '#f44336'};">${(metrics.tpPnlPercent || 0).toFixed(1)}%</span></div>
                            <div>Win Rate: <span style="color: #fff;">${(metrics.winRate || 0).toFixed(1)}%</span></div>
                        </div>
                        <div style="font-size: 9px; color: #aaa; margin-top: 4px;">Method: ${this.currentBest.method}</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
                            <button onclick="(window.applyBestConfigToUI && window.applyBestConfigToUI())" style="
                                padding: 8px;
                                background: rgba(59, 130, 246, 0.2);
                                border: 1px solid rgba(59, 130, 246, 0.4);
                                border-radius: 4px;
                                color: #63b3ed;
                                font-size: 11px;
                                cursor: pointer;
                                font-weight: 500;
                                transition: all 0.2s;
                            " onmouseover="this.style.background='rgba(59, 130, 246, 0.3)'" 
                               onmouseout="this.style.background='rgba(59, 130, 246, 0.2)'">
                                ⚙️ Apply Best Config
                            </button>
                            <button onclick="(window.copyBestConfigToClipboard && window.copyBestConfigToClipboard())" style="
                                padding: 8px;
                                background: rgba(139, 92, 246, 0.2);
                                border: 1px solid rgba(139, 92, 246, 0.4);
                                border-radius: 4px;
                                color: #a78bfa;
                                font-size: 11px;
                                cursor: pointer;
                                font-weight: 500;
                                transition: all 0.2s;
                            " onmouseover="this.style.background='rgba(139, 92, 246, 0.3)'" 
                               onmouseout="this.style.background='rgba(139, 92, 246, 0.2)'">
                                📋 Copy Best Config
                            </button>
                        </div>
                    </div>
                `;

                // Update global tracker for the apply buttons
                if (this.currentBest.metrics && this.currentBest.config && window.bestConfigTracker) {
                    window.bestConfigTracker.update(this.currentBest.config, this.currentBest.metrics, this.currentBest.metrics.score || 0, 'Tracker Update');
                }
                window.currentBestConfig = this.currentBest.config;
            } else if (this.isRunning) {
                content += `
                    <div style="text-align: center; padding: 8px; font-size: 10px; color: #aaa;">
                        🔍 Searching for optimal configuration...
                    </div>
                `;
            }

            // Add rate limiting warning only for actual rate limit failures
            if (this.rateLimitFailures > this.totalTests * 0.1 && this.totalTests > 10) {
                content += `
                    <div style="margin-top: 8px; margin-bottom: 8px; padding: 6px; background: rgba(255, 152, 0, 0.1); border: 1px solid #ff9800; border-radius: 4px; font-size: 9px; color: #ff9800;">
                        ⚠️ High rate limit failure rate detected (${this.rateLimitFailures}/${this.totalTests}). Burst rate limiter may need adjustment - check console for details.
                    </div>
                `;
            }

            statsElement.innerHTML = content;
        }
    }

    // Register on window
    try {
        window.OptimizationTracker = OptimizationTracker;
        // Useful for module loaders: also export default if module systems are present
        if (typeof module !== 'undefined' && module.exports) module.exports = OptimizationTracker;
    } catch (e) {
        console.warn('Could not register OptimizationTracker on window:', e.message);
    }
})();
