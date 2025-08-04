// ========================================
// 🖥️ UI TRACKING MODULE
// ========================================

// ========================================
// 🖥️ BEST CONFIG DISPLAY SYSTEM - Updates existing UI section
// ========================================
export class OptimizationTracker {
    constructor() {
        this.currentBest = null;
        this.totalTests = 0;
        this.failedTests = 0;
        this.rateLimitFailures = 0; // Track only actual rate limiting failures
        this.startTime = null;
        this.isRunning = false;
    }

    startOptimization() {
        this.isRunning = true;
        this.startTime = Date.now();
        this.totalTests = 0;
        this.failedTests = 0;
        this.rateLimitFailures = 0;
        this.currentBest = null;
        this.updateBestConfigDisplay();
    }

    stopOptimization() {
        this.isRunning = false;
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

    updateBestConfigDisplay(burstRateLimiter = null) {
        const displayElement = document.getElementById('best-config-display');
        const statsElement = document.getElementById('best-config-stats');
        
        if (!displayElement || !statsElement) return;

        // Show the section
        displayElement.style.display = 'block';

        const runtime = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
        const runtimeMin = Math.floor(runtime / 60);
        const runtimeSec = Math.floor(runtime % 60);
        const testsPerMin = runtime > 0 ? (this.totalTests / (runtime / 60)).toFixed(1) : '0';
        
        // Get burst rate limiter stats
        const burstStats = burstRateLimiter ? burstRateLimiter.getStats() : {
            currentBurstCount: 0,
            burstLimit: 0,
            totalCalls: 0,
            requestsPerMinute: 0,
            rollingWindowRate: 0,
            maxRequestsPerMinute: 0,
            rateLimitHits: 0
        };

        let content = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; font-size: 12px; font-weight: bold;">
                <div>Tests: <span style="color: #4CAF50; font-weight: bold;">${this.totalTests}</span></div>
                <div>Failed: <span style="color: ${this.failedTests > 0 ? '#ff9800' : '#666'};">${this.failedTests}</span></div>
                <div>Runtime: <span style="color: #4CAF50;">${runtimeMin}m ${runtimeSec}s</span></div>
                <div>Rate: <span style="color: #4CAF50;">${testsPerMin}/min</span></div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; font-size: 12px; font-weight: bold; opacity: 0.8; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 4px;">
                <div>🚀 Burst: <span style="color: #4ECDC4;">${burstStats.currentBurstCount}/${burstStats.burstLimit}</span></div>
                <div>📡 Total: <span style="color: #4ECDC4;">${burstStats.totalCalls}</span></div>
                <div>📊 Session: <span style="color: ${burstStats.requestsPerMinute >= burstStats.maxRequestsPerMinute ? '#ff9800' : '#4ECDC4'};">${burstStats.requestsPerMinute}/min</span></div>
                <div>⏱️ Rolling: <span style="color: ${burstStats.rollingWindowRate >= burstStats.maxRequestsPerMinute ? '#ff9800' : '#4ECDC4'};">${burstStats.rollingWindowRate}/min</span></div>
                <div>🎯 Limit: <span style="color: #888;">${burstStats.maxRequestsPerMinute}/min</span></div>
                ${burstStats.rateLimitHits > 0 ? `<div>⚠️ Rate Hits: <span style="color: #ff4444;">${burstStats.rateLimitHits}</span></div>` : '<div>✅ No Rate Hits</div>'}
            </div>
        `;

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
                </div>
            `;

            // Update global reference for the apply buttons
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

// ========================================
// �📊 UI METRICS EXTRACTOR (Enhanced from original AGCopilot)
// ========================================
export async function extractMetricsFromUI() {
    try {
        const metrics = {};
        const statDivs = Array.from(document.querySelectorAll('div.text-xl.font-bold'));

        for (const div of statDivs) {
            const label = div.parentElement.querySelector('div.text-xs.text-gray-400');
            if (label) {
                const labelText = label.textContent.trim();
                const valueText = div.textContent.trim();

                switch (labelText) {
                    case 'Total Tokens':
                        metrics.totalTokens = parseInt(valueText) || 0;
                        break;
                    case 'TP PnL %':
                        // Extract numeric value, handling + prefix and % suffix
                        const pnlMatch = valueText.match(/([+-]?\d+\.?\d*)/);
                        metrics.tpPnlPercent = pnlMatch ? parseFloat(pnlMatch[1]) : 0;
                        break;
                    case 'Win Rate':
                        const winMatch = valueText.match(/(\d+\.?\d*)/);
                        metrics.winRate = winMatch ? parseFloat(winMatch[1]) : 0;
                        break;
                    case 'Total PnL (SOL)':
                        const totalMatch = valueText.match(/([+-]?\d+\.?\d*)/);
                        metrics.totalPnl = totalMatch ? parseFloat(totalMatch[1]) : 0;
                        break;
                    case 'Avg PnL (SOL)':
                        const avgMatch = valueText.match(/([+-]?\d+\.?\d*)/);
                        metrics.avgPnl = avgMatch ? parseFloat(avgMatch[1]) : 0;
                        break;
                    case 'Max PnL (SOL)':
                        const maxMatch = valueText.match(/([+-]?\d+\.?\d*)/);
                        metrics.maxPnl = maxMatch ? parseFloat(maxMatch[1]) : 0;
                        break;
                    case 'Min PnL (SOL)':
                        const minMatch = valueText.match(/([+-]?\d+\.?\d*)/);
                        metrics.minPnl = minMatch ? parseFloat(minMatch[1]) : 0;
                        break;
                }
            }
        }

        // Validate required metrics
        if (metrics.tpPnlPercent === undefined || metrics.totalTokens === undefined) {
            console.warn('⚠️ Missing required metrics in UI extraction');
            return null;
        }

        return metrics;
    } catch (error) {
        console.warn('❌ Failed to extract metrics from UI:', error);
        return null;
    }
}
