(async function () {
    console.clear();
    console.log('%c🤖 AG Co-Pilot Enhanced + Signal Analysis v2.0 🤖', 'color: blue; font-size: 16px; font-weight: bold;');
    console.log('%c🔍 Direct API Optimization + Signal Analysis + Config Generation', 'color: green; font-size: 12px;');

    // ========================================
    // 🎯 CONFIGURATION
    // ========================================
    const CONFIG = {
        // Original AGCopilot Optimization Settings (no API needed)
        MAX_RUNTIME_MIN: 30,
        BACKTEST_WAIT: 20000, // Based on rate limit recovery test (20s)
        MIN_TOKENS: 50,
        TARGET_PNL: 100.0,
        
        // NEW: Chained runs settings
        CHAIN_RUN_COUNT: 3,
        
        // Feature flags (keeping all original features)
        USE_CONFIG_CACHING: true,
        USE_PARAMETER_IMPACT_ANALYSIS: true,
        USE_GENETIC_ALGORITHM: true,
        USE_SIMULATED_ANNEALING: true,
        USE_LATIN_HYPERCUBE_SAMPLING: true,
        USE_MULTIPLE_STARTING_POINTS: true,
        
        // Outlier-resistant scoring system
        USE_ROBUST_SCORING: true,  // Use outlier-resistant metrics instead of raw TP PnL %
        MIN_WIN_RATE: 60.0,        // Minimum win rate to consider config viable
        RELIABILITY_WEIGHT: 0.3,   // Weight for sample size and consistency (0.0-1.0)
        CONSISTENCY_WEIGHT: 0.4,   // Weight for win rate (0.0-1.0)
        RETURN_WEIGHT: 0.6,        // Weight for raw PnL (0.0-1.0)
        // Note: CONSISTENCY_WEIGHT + RETURN_WEIGHT should = 1.0
        
        // Signal Analysis API Settings (from AGSignalExtractor)
        API_BASE_URL: 'https://backtester.alphagardeners.xyz/api',
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000,
        REQUEST_DELAY: 9360, // For signal analysis API (60% of BACKTEST_WAIT)
        
        // Backtester API Settings
        DEFAULT_BUYING_AMOUNT: 0.25, // Default buying amount for API calls
        
        // Take Profit (TP) configuration for accurate PnL calculations
        TP_CONFIGURATIONS: [
            { size: 20, gain: 300 },
            { size: 20, gain: 650 },
            { size: 20, gain: 1400 },
            { size: 20, gain: 3000 },
            { size: 20, gain: 10000 }
        ],
        
        // Rate limiting - ULTRA CONSERVATIVE MODE for 0-1 rate limit errors per session
        RATE_LIMIT_THRESHOLD: 20,    // Very conservative burst size (reduced from 35)
        RATE_LIMIT_RECOVERY: 10000,  // 10s recovery time (increased from 8.5s)
        RATE_LIMIT_SAFETY_MARGIN: 1.5, // 50% safety margin (increased from 10%)
        INTRA_BURST_DELAY: 100,      // 100ms delay between requests
        MAX_REQUESTS_PER_MINUTE: 50, // Conservative hard cap at 40 req/min (reduced from 60)
        USE_BURST_RATE_LIMITING: true, // Use burst mode for efficiency
        SMART_BURST_SIZE: true        // Keep smart burst size learning for optimal discovery
    };

    // Parameter validation rules (same as original AGCopilot)
    const PARAM_RULES = {
        // Basic
        'Min MCAP (USD)': { min: 0, max: 10000, step: 1000, type: 'integer'},
        'Max MCAP (USD)': { min: 10000, max: 60000, step: 1000, type: 'integer' },

        // Token Details
        'Min Deployer Age (min)': { min: 0, max: 1440, step: 5, type: 'integer' },
        'Min Token Age (sec)': { min: 0, max: 99999, step: 15, type: 'integer' },
        'Max Token Age (sec)': { min: 0, max: 99999, step: 15, type: 'integer' },
        'Min AG Score': { min: 0, max: 10, step: 1, type: 'integer' },

        // Wallets
        'Min Holders': { min: 1, max: 5, step: 1, type: 'integer' },
        'Max Holders': { min: 1, max: 50, step: 5, type: 'integer' },
        'Min Unique Wallets': { min: 1, max: 3, step: 1, type: 'integer' },
        'Max Unique Wallets': { min: 1, max: 8, step: 1, type: 'integer' },
        'Min KYC Wallets': { min: 0, max: 3, step: 1, type: 'integer' },
        'Max KYC Wallets': { min: 1, max: 8, step: 1, type: 'integer' },

        // Risk
        'Min Bundled %': { min: 0, max: 50, step: 1 },
        'Max Bundled %': { min: 0, max: 100, step: 5 },
        'Min Deployer Balance (SOL)': { min: 0, max: 10, step: 0.5 },
        'Min Buy Ratio %': { min: 0, max: 50, step: 10 },
        'Max Buy Ratio %': { min: 50, max: 100, step: 5 },
        'Min Vol MCAP %': { min: 0, max: 100, step: 10 },
        'Max Vol MCAP %': { min: 33, max: 300, step: 20 },
        'Max Drained %': { min: 0, max: 100, step: 5 },
        'Max Drained Count': { min: 0, max: 11, step: 1, type: 'integer' },

        // Advanced
        'Min TTC (sec)': { min: 0, max: 3600, step: 5, type: 'integer' },
        'Max TTC (sec)': { min: 10, max: 3600, step: 10, type: 'integer' },
        'Max Liquidity %': { min: 10, max: 100, step: 10, type: 'integer' },
        'Min Win Pred %': { min: 0, max: 70, step: 5, type: 'integer' }
    };

    // Complete config template for backward compatibility (with Description and Fresh Deployer)
    const COMPLETE_CONFIG_TEMPLATE = {
        basic: {
            "Min MCAP (USD)": undefined,
            "Max MCAP (USD)": undefined
        },
        tokenDetails: {
            "Min Deployer Age (min)": undefined,
            "Min Token Age (sec)": undefined,
            "Max Token Age (sec)": undefined,
            "Min AG Score": undefined
        },
        wallets: {
            "Min Unique Wallets": undefined,
            "Min KYC Wallets": undefined,
            "Max KYC Wallets": undefined,
            "Max Unique Wallets": undefined,
            "Min Holders": undefined,
            "Max Holders": undefined
        },
        risk: {
            "Min Bundled %": undefined,
            "Max Bundled %": undefined,
            "Min Deployer Balance (SOL)": undefined,
            "Min Buy Ratio %": undefined,
            "Max Buy Ratio %": undefined,
            "Min Vol MCAP %": undefined,
            "Max Vol MCAP %": undefined,
            "Max Drained %": undefined,
            "Max Drained Count": undefined,
            "Description": undefined,
            "Fresh Deployer": undefined
        },
        advanced: {
            "Min TTC (sec)": undefined,
            "Max TTC (sec)": undefined,
            "Max Liquidity %": undefined,
            "Min Win Pred %": undefined
        }
    };

    // ========================================
    // � PRESET CONFIGURATIONS
    // ========================================
    // Preset configurations (all original presets restored)
    const PRESETS = {
        9747: {
            risk: { "Min Buy Ratio %": 97, "Max Buy Ratio %": 100, "Min Vol MCAP %": 47 }
        },
        oldDeployer: { 
            tokenDetails: { "Min Deployer Age (min)": 43200, "Min AG Score": "4" } 
        },
        oldishDeployer: { 
            tokenDetails: { "Min Deployer Age (min)": 1200, "Min AG Score": "6" },
            risk: { "Max Bundled %": 5, "Min Buy Ratio %": 20, "Max Vol MCAP %": 40, "Max Drained Count": 6 },
            advanced: { "Max TTC (sec)": 400 }
        },
        minWinPred: { 
            advanced: { "Min Win Pred %": 28 }
        },
        bundle1_74: { 
            risk: { "Max Bundled %": 1.74 } 
        },
        deployerBalance10: { 
            risk: { "Min Deployer Balance (SOL)": 10 } 
        },
        agScore7: { 
            tokenDetails: { "Min AG Score": "7" } 
        },
        conservative: {
            basic: { "Min MCAP (USD)": 10000, "Max MCAP (USD)": 50000 },
            tokenDetails: { "Min AG Score": 4, "Min Deployer Age (min)": 60 },
            wallets: { "Min Unique Wallets": 2, "Min KYC Wallets": 2, "Max Unique Wallets": 5 },
            risk: { "Min Bundled %": 0, "Max Bundled %": 25 },
            advanced: { "Min TTC (sec)": 30, "Max Liquidity %": 70 }
        },
        aggressive: {
            basic: { "Min MCAP (USD)": 1000, "Max MCAP (USD)": 15000 },
            tokenDetails: { "Min AG Score": 2 },
            wallets: { "Min Unique Wallets": 1, "Max Unique Wallets": 10 },
            risk: { "Max Bundled %": 80, "Max Vol MCAP %": 200 },
            advanced: { "Min TTC (sec)": 5, "Max Liquidity %": 90 }
        }
    };

    // ========================================
    // �🛠️ UTILITIES
    // ========================================
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    // Initialize window.STOPPED for global access
    window.STOPPED = false;

    // Burst Rate Limiter
    class BurstRateLimiter {
        constructor(burstLimit = CONFIG.RATE_LIMIT_THRESHOLD, recoveryTime = CONFIG.RATE_LIMIT_RECOVERY, safetyMargin = CONFIG.RATE_LIMIT_SAFETY_MARGIN) {
            this.originalBurstLimit = burstLimit;
            this.burstLimit = burstLimit;
            this.baseRecoveryTime = recoveryTime;
            this.recoveryTime = recoveryTime * safetyMargin;
            this.callCount = 0;
            this.burstStartTime = 0;
            this.sessionStartTime = 0; // Track overall session start for rate calculation
            this.lastBurstTime = 0;
            this.lastCallTime = 0;
            this.totalCalls = 0;
            this.rateLimitHits = 0;
            this.successfulBursts = 0;
            this.intraBurstDelay = CONFIG.INTRA_BURST_DELAY || 0;
            
            // Smart burst learning
            this.rateLimitPositions = []; // Track where in bursts we hit rate limits
            this.optimalBurstSize = burstLimit; // Learned optimal size
            this.consecutiveSuccesses = 0;
            
            // Rolling window for accurate rate tracking (last 60 seconds)
            this.recentCalls = []; // Array of timestamps for recent calls
            
            console.log(`🚀 BurstRateLimiter: ${burstLimit} calls/burst, ${(recoveryTime * safetyMargin / 1000).toFixed(1)}s recovery, ${this.intraBurstDelay}ms intra-burst delay`);
            console.log(`🛑 Rate limit: ${CONFIG.MAX_REQUESTS_PER_MINUTE} requests/minute max`);
            console.log(`🎯 Goal: Maximum 1 rate limit error per session`);
        }

        // Adaptive adjustment when we hit unexpected rate limits (ultra-conservative learning)
        adaptToBurstLimit() {
            this.rateLimitHits++;
            this.rateLimitPositions.push(this.callCount); // Record where the 429 occurred
            this.consecutiveSuccesses = 0; // Reset success counter
            
            console.log(`⚠️ Rate limit hit at position ${this.callCount} in burst (hit #${this.rateLimitHits})`);
            
            if (CONFIG.SMART_BURST_SIZE) {
                // Learn the optimal burst size from where rate limits actually occur
                const avgRateLimitPosition = this.rateLimitPositions.reduce((a, b) => a + b, 0) / this.rateLimitPositions.length;
                const safetyBuffer = Math.max(8, Math.floor(avgRateLimitPosition * 0.4)); // Larger safety buffer (40% of avg position)
                this.optimalBurstSize = Math.max(5, Math.floor(avgRateLimitPosition - safetyBuffer));
                
                console.log(`🧠 Learning: Rate limits occur around position ${avgRateLimitPosition.toFixed(1)}, setting optimal burst size to ${this.optimalBurstSize} (buffer: ${safetyBuffer})`);
                this.burstLimit = this.optimalBurstSize;
            } else {
                // Ultra-conservative immediate harsh reduction
                let reductionFactor, minLimit;
                
                if (this.rateLimitHits === 1) {
                    reductionFactor = 0.5; // Immediate 50% reduction on first hit
                    minLimit = 5;
                    console.log(`⚠️ First rate limit hit - immediate harsh reduction (50%)`);
                } else {
                    reductionFactor = 0.3; // 70% reduction on subsequent hits
                    minLimit = 3;
                    console.log(`⚠️ Multiple rate limits - extreme reduction (70%)`);
                }
                
                const newLimit = Math.max(minLimit, Math.floor(this.callCount * reductionFactor));
                this.burstLimit = newLimit;
            }
            
            // Significant recovery time increase to avoid rapid re-triggering
            const recoveryMultiplier = 1.5; // 50% increase each time
            this.recoveryTime = Math.min(30000, this.recoveryTime * recoveryMultiplier); // Cap at 30s
            
            console.log(`📉 Burst limit: ${this.burstLimit}, Recovery: ${(this.recoveryTime/1000).toFixed(1)}s`);
        }

        // Simple success tracking - no adaptive behavior
        adaptToSuccess() {
            this.successfulBursts++;
            this.consecutiveSuccesses++;
            // Just track successful bursts, no adaptive changes to limits or recovery times
        }

        async throttle() {
            const now = Date.now();
            
            // Add respectful delay between ALL requests
            if (this.intraBurstDelay > 0 && this.lastCallTime > 0) {
                const timeSinceLastCall = now - this.lastCallTime;
                if (timeSinceLastCall < this.intraBurstDelay) {
                    await sleep(this.intraBurstDelay - timeSinceLastCall);
                }
            }

            const rollingRate = this.getRollingWindowRate();
            if (rollingRate >= CONFIG.MAX_REQUESTS_PER_MINUTE) {
                // Calculate how long to wait to get back under the limit
                const excessRequests = rollingRate - CONFIG.MAX_REQUESTS_PER_MINUTE + 1;
                const waitTime = (excessRequests / CONFIG.MAX_REQUESTS_PER_MINUTE) * 60000; // Convert to ms
                console.log(`⏳ Rate limit prevention: ${rollingRate}/${CONFIG.MAX_REQUESTS_PER_MINUTE} req/min, waiting ${(waitTime/1000).toFixed(1)}s...`);
                await sleep(waitTime);
            }

            // Reset burst count if enough time has passed since last burst
            if (now - this.lastBurstTime > this.recoveryTime) {
                if (this.callCount > 0) {
                    console.log(`🔄 Burst limit reset (${((now - this.lastBurstTime) / 1000).toFixed(1)}s elapsed)`);
                    this.adaptToSuccess(); // Reward successful completion
                }
                this.callCount = 0;
            }
            
            // If we're at the start of a new burst
            if (this.callCount === 0) {
                this.burstStartTime = now;
                // Set session start time on very first call
                if (this.sessionStartTime === 0) {
                    this.sessionStartTime = now;
                }
            }
            
            // If we've hit the burst limit, wait for recovery with extra safety margin
            if (this.callCount >= this.burstLimit) {
                const timeSinceBurst = now - this.burstStartTime;
                const waitTime = Math.max(0, this.recoveryTime - timeSinceBurst);
                
                if (waitTime > 0) {
                    console.log(`⏳ Burst limit reached (${this.callCount}/${this.burstLimit}), waiting ${(waitTime/1000).toFixed(1)}s...`);
                    console.log(`📊 Current rate: ~${this.getRequestsPerMinute()} requests/minute (rolling: ${this.getRollingWindowRate()})`);
                    await sleep(waitTime);
                }
                
                // Reset for next burst
                this.callCount = 0;
                this.burstStartTime = Date.now();
            }
            
            this.callCount++;
            this.totalCalls++;
            this.lastBurstTime = now;
            this.lastCallTime = now;
            
            // Track this call in rolling window
            this.recentCalls.push(now);
            
            if (this.callCount === 1) {
                console.log(`📡 Starting new burst (${this.totalCalls} total calls, burst limit: ${this.burstLimit})`);
            } else if (this.callCount % 5 === 0 || this.callCount >= this.burstLimit - 2) {
                console.log(`📡 Burst progress: ${this.callCount}/${this.burstLimit} | ${this.getRequestsPerMinute()} req/min | Rolling: ${this.getRollingWindowRate()} req/min`);
            }
        }

        // Get requests per minute using a rolling 60-second window (more accurate for hard cap)
        getRollingWindowRate() {
            const now = Date.now();
            const oneMinuteAgo = now - 60000;
            
            // Clean old calls and count recent ones
            this.recentCalls = this.recentCalls.filter(timestamp => timestamp > oneMinuteAgo);
            
            return this.recentCalls.length;
        }

        getRequestsPerMinute() {
            if (this.totalCalls < 2) return 0;
            
            // Use session start time for overall rate calculation (more accurate for rate limiting)
            const startTime = this.sessionStartTime || this.burstStartTime;
            const elapsedMs = Date.now() - startTime;
            const elapsedMinutes = elapsedMs / 60000;
            
            if (elapsedMinutes <= 0) return 0;
            
            // For very short durations, use a minimum elapsed time to prevent inflated rates
            const minElapsedMinutes = Math.max(elapsedMinutes, 0.1); // At least 6 seconds
            const rate = this.totalCalls / minElapsedMinutes;
            
            // Cap the rate calculation for early session anomalies
            return Math.min(Math.round(rate), 500); // Cap at 500 to prevent crazy early numbers
        }

        getStats() {
            return {
                currentBurstCount: this.callCount,
                burstLimit: this.burstLimit,
                originalBurstLimit: this.originalBurstLimit,
                optimalBurstSize: this.optimalBurstSize || this.burstLimit,
                totalCalls: this.totalCalls,
                rateLimitHits: this.rateLimitHits,
                rateLimitPositions: this.rateLimitPositions,
                successfulBursts: this.successfulBursts,
                consecutiveSuccesses: this.consecutiveSuccesses,
                timeSinceLastCall: Date.now() - this.lastBurstTime,
                requestsPerMinute: this.getRequestsPerMinute(),
                rollingWindowRate: this.getRollingWindowRate(),
                maxRequestsPerMinute: CONFIG.MAX_REQUESTS_PER_MINUTE,
                recoveryTime: this.recoveryTime,
                intraBurstDelay: this.intraBurstDelay,
                isApproachingLimit: this.getRollingWindowRate() >= CONFIG.MAX_REQUESTS_PER_MINUTE * 0.9
            };
        }
    }

    // Legacy APIRateLimiter for signal analysis (still uses simple delay)
    class APIRateLimiter {
        constructor(delay = 500) {
            this.delay = delay;
            this.lastRequest = 0;
        }

        async throttle() {
            const now = Date.now();
            const elapsed = now - this.lastRequest;
            
            if (elapsed < this.delay) {
                await sleep(this.delay - elapsed);
            }
            
            this.lastRequest = Date.now();
        }
    }

    // Create rate limiter instances
    const rateLimiter = new APIRateLimiter(CONFIG.REQUEST_DELAY); // For signal analysis
    const burstRateLimiter = new BurstRateLimiter(
        CONFIG.RATE_LIMIT_THRESHOLD, 
        CONFIG.RATE_LIMIT_RECOVERY, 
        CONFIG.RATE_LIMIT_SAFETY_MARGIN
    ); // For backtester API - Enhanced with adaptive behavior

    // Format functions for signal analysis
    function formatTimestamp(timestamp) {
        if (!timestamp) return 'N/A';
        return new Date(timestamp * 1000).toISOString().replace('T', ' ').split('.')[0];
    }

    function formatMcap(mcap) {
        if (!mcap) return 'N/A';
        if (mcap >= 1000000) return `$${(mcap / 1000000).toFixed(2)}M`;
        if (mcap >= 1000) return `$${(mcap / 1000).toFixed(2)}K`;
        return `$${mcap}`;
    }

    function formatPercent(value) {
        if (value === null || value === undefined) return 'N/A';
        return `${value.toFixed(2)}%`;
    }

    // Efficient deep clone utility function
    function deepClone(obj) {
        if (obj === null || typeof obj !== "object") return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (Array.isArray(obj)) return obj.map(item => deepClone(item));
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }

    // Ensure complete config by merging with template
    function ensureCompleteConfig(config) {
        const completeConfig = deepClone(COMPLETE_CONFIG_TEMPLATE);
        for (const [section, sectionConfig] of Object.entries(config)) {
            if (completeConfig[section]) {
                Object.assign(completeConfig[section], sectionConfig);
            } else {
                completeConfig[section] = sectionConfig;
            }
        }
        return completeConfig;
    }

    // Get selected trigger mode from UI
    function getTriggerMode() {
        const triggerSelect = document.getElementById('trigger-mode-select');
        if (triggerSelect) {
            const value = triggerSelect.value;
            return value === '' ? null : parseInt(value); // Handle empty string for "Bullish Bonding"
        }
        return 4; // Default to Launchpads if no selection
    }

    // ========================================
    // 🖥️ BEST CONFIG DISPLAY SYSTEM - Updates existing UI section
    // ========================================
    class OptimizationTracker {
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

        updateBestConfigDisplay() {
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
            const burstStats = burstRateLimiter.getStats();

            let content = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; font-size: 12px; font-weight: bold;">
                    <div>Tests: <span style="color: #4CAF50; font-weight: bold;">${this.totalTests}</span></div>
                    <div>Failed: <span style="color: ${this.failedTests > 0 ? '#ff9800' : '#666'};">${this.failedTests}</span></div>
                    <div>Runtime: <span style="color: #4CAF50;">${runtimeMin}m ${runtimeSec}s</span></div>
                    <div>Rate: <span style="color: #4CAF50;">${testsPerMin}/min</span></div>
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

    // Global optimization tracker instance
    window.optimizationTracker = new OptimizationTracker();

    // ========================================
    // 🌐 API FUNCTIONS (from AGSignalExtractor)
    // ========================================
    async function fetchWithRetry(url, maxRetries = CONFIG.MAX_RETRIES) {
        await rateLimiter.throttle();
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🌐 Fetching: ${url} (attempt ${attempt})`);
                const response = await fetch(url);
                
                if (!response.ok) {
                    if (response.status === 429) {
                        // Rate limited - use exponential backoff with longer delays
                        const baseDelay = 3000; // 3 seconds base delay for rate limits
                        const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
                        const maxDelay = 30000; // Cap at 30 seconds
                        const delay = Math.min(exponentialDelay, maxDelay);
                        
                        console.log(`⏳ Rate limited (429), waiting ${delay / 1000}s before retry ${attempt}/${maxRetries}...`);
                        throw new Error(`Rate limited (HTTP 429). Waiting ${delay / 1000}s before retry.`);
                    } else {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                }
                
                const data = await response.json();
                console.log(`✅ Successfully fetched data`);
                return data;
                
            } catch (error) {
                console.log(`❌ Attempt ${attempt} failed: ${error.message}`);
                
                if (attempt === maxRetries) {
                    throw new Error(`Failed to fetch after ${maxRetries} attempts: ${error.message}`);
                }
                
                // Determine retry delay based on error type
                let retryDelay;
                if (error.message.includes('Rate limited')) {
                    // For rate limits, use the exponential backoff calculated above
                    const baseDelay = 3000;
                    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
                    retryDelay = Math.min(exponentialDelay, 30000);
                } else {
                    // For other errors, use standard retry delay
                    retryDelay = CONFIG.RETRY_DELAY * attempt;
                }
                
                await sleep(retryDelay);
            }
        }
    }

    // Get token info by search (contract address)
    async function getTokenInfo(contractAddress) {
        const url = `${CONFIG.API_BASE_URL}/swaps?fromDate=2000-01-01&toDate=9999-12-31&search=${contractAddress}&sort=timestamp&direction=desc&page=1&limit=1`;
        const data = await fetchWithRetry(url);
        
        if (!data.swaps || data.swaps.length === 0) {
            throw new Error('Token not found or no swap data available');
        }
        
        return data.swaps[0];
    }

    // Get all swaps for a specific token
    async function getAllTokenSwaps(contractAddress) {
        const url = `${CONFIG.API_BASE_URL}/swaps/by-token/${contractAddress}`;
        const data = await fetchWithRetry(url);
        
        if (!data.swaps || data.swaps.length === 0) {
            throw new Error('No swap history found for this token');
        }
        
        return data.swaps;
    }

    // ========================================
    // � BACKTESTER API INTEGRATION (New: Direct API calls instead of UI scraping)
    // ========================================
    class BacktesterAPI {
        constructor() {
            this.baseUrl = 'https://backtester.alphagardeners.xyz/api/stats';
        }

        // Map AGCopilot parameter names to API parameter names
        mapParametersToAPI(config) {
            const apiParams = {};
            
            // Flatten the config structure first
            const flatConfig = this.flattenConfig(config);
            
            // Parameter mapping from AGCopilot names to API names
            const parameterMap = {
                // Basic parameters
                'Min MCAP (USD)': 'minMcap',
                'Max MCAP (USD)': 'maxMcap',
                
                // Token Details
                'Min Deployer Age (min)': 'minDeployerAge',
                'Min Token Age (sec)': 'minTokenAge',
                'Max Token Age (sec)': 'maxTokenAge', 
                'Min AG Score': 'minAgScore',
                
                // Wallets
                'Min Holders': 'minHolders',
                'Max Holders': 'maxHolders',
                'Min Unique Wallets': 'minUniqueWallets',
                'Max Unique Wallets': 'maxUniqueWallets',
                'Min KYC Wallets': 'minKycWallets',
                'Max KYC Wallets': 'maxKycWallets',
                
                // Risk
                'Min Bundled %': 'minBundledPercent',
                'Max Bundled %': 'maxBundledPercent',
                'Min Deployer Balance (SOL)': 'minDeployerBalance',
                'Min Buy Ratio %': 'minBuyRatio',
                'Max Buy Ratio %': 'maxBuyRatio',
                'Min Vol MCAP %': 'minVolMcapPercent',
                'Max Vol MCAP %': 'maxVolMcapPercent',
                'Max Drained %': 'maxDrainedPercent',
                'Max Drained Count': 'maxDrainedCount',
                
                // Advanced
                'Min TTC (sec)': 'minTtc',
                'Max TTC (sec)': 'maxTtc',
                'Max Liquidity %': 'maxLiquidityPct',
                'Min Win Pred %': 'minWinPred',
                
                // Boolean fields
                'Description': 'needsDescription',
                'Fresh Deployer': 'needsFreshDeployer'
            };
            
            // Map parameters
            Object.entries(parameterMap).forEach(([agCopilotName, apiName]) => {
                const value = flatConfig[agCopilotName];
                if (value !== undefined && value !== null && value !== '') {
                    // Handle boolean conversions
                    if (apiName === 'needsDescription' || apiName === 'needsFreshDeployer') {
                        if (value === true || value === 'Yes') {
                            apiParams[apiName] = true;
                        } else if (value === false || value === 'No') {
                            apiParams[apiName] = false;
                        }
                        // "Don't care" or undefined -> don't include parameter
                    } else {
                        // Handle numeric parameters - validate and convert
                        const numericValue = parseFloat(value);
                        
                        // Skip if value is NaN, Infinity, or not a valid number
                        if (isNaN(numericValue) || !isFinite(numericValue)) {
                            console.log(`⚠️ Skipping invalid ${apiName}: ${value} (NaN or invalid)`);
                            return; // Skip this parameter
                        }
                        
                        // Special handling for AG Score (must be integer 0-10)
                        if (apiName === 'minAgScore') {
                            const agScore = Math.round(numericValue);
                            if (agScore < 0 || agScore > 10) {
                                console.log(`⚠️ AG Score out of range: ${agScore}, clamping to 0-10`);
                                apiParams[apiName] = Math.max(0, Math.min(10, agScore));
                            } else {
                                apiParams[apiName] = agScore;
                            }
                        } else {
                            // For other numeric parameters, use the validated number
                            apiParams[apiName] = numericValue;
                        }
                    }
                }
            });
            
            // Add default parameters that are usually present
            const triggerMode = getTriggerMode();
            if (triggerMode !== null) {
                apiParams.triggerMode = triggerMode; // Use selected trigger mode (skip if null for Bullish Bonding)
            }
            apiParams.excludeSpoofedTokens = true;
            apiParams.buyingAmount = CONFIG.DEFAULT_BUYING_AMOUNT;
            // Note: Multiple TP parameters (tpSize/tpGain) are added directly in buildApiUrl()
            
            return apiParams;
        }
        
        // Flatten nested config structure
        flattenConfig(config) {
            const flat = {};
            
            if (typeof config === 'object' && config !== null) {
                Object.values(config).forEach(section => {
                    if (typeof section === 'object' && section !== null) {
                        Object.assign(flat, section);
                    }
                });
            }
            
            return flat;
        }
        
        // Validate min/max parameter pairs
        validateConfig(apiParams) {
            const validationErrors = [];
            
            const minMaxPairs = [
                ['minMcap', 'maxMcap'],
                ['minAgScore', 'maxAgScore'],
                ['minTokenAge', 'maxTokenAge'],
                ['minTtc', 'maxTtc'],
                ['minLiquidity', 'maxLiquidity'],
                ['minLiquidityPct', 'maxLiquidityPct'],
                ['minUniqueWallets', 'maxUniqueWallets'],
                ['minKycWallets', 'maxKycWallets'],
                ['minHolders', 'maxHolders'],
                ['minBundledPercent', 'maxBundledPercent'],
                ['minBuyRatio', 'maxBuyRatio'],
                ['minVolMcapPercent', 'maxVolMcapPercent'],
                ['minDrainedPercent', 'maxDrainedPercent']
            ];
            
            minMaxPairs.forEach(([minKey, maxKey]) => {
                const minVal = apiParams[minKey];
                const maxVal = apiParams[maxKey];
                
                if (minVal !== undefined && maxVal !== undefined && 
                    !isNaN(minVal) && !isNaN(maxVal) && 
                    parseFloat(minVal) > parseFloat(maxVal)) {
                    validationErrors.push(`${minKey}(${minVal}) > ${maxKey}(${maxVal})`);
                }
            });
            
            return {
                isValid: validationErrors.length === 0,
                errors: validationErrors
            };
        }
        
        // Build API URL from parameters
        buildApiUrl(apiParams) {
            const params = new URLSearchParams();
            
            Object.entries(apiParams).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    // Additional validation before adding to URL
                    if (typeof value === 'number') {
                        // Skip NaN or infinite numbers
                        if (isNaN(value) || !isFinite(value)) {
                            console.log(`⚠️ Skipping invalid numeric parameter ${key}: ${value}`);
                            return;
                        }
                    }
                    
                    // Convert value to string and validate
                    const stringValue = String(value);
                    if (stringValue === 'NaN' || stringValue === 'undefined' || stringValue === 'null') {
                        console.log(`⚠️ Skipping invalid string parameter ${key}: ${stringValue}`);
                        return;
                    }
                    
                    params.append(key, stringValue);
                }
            });
            
            // Add multiple TP (Take Profit) parameters for accurate pnlSolTp calculations
            const tpParams = CONFIG.TP_CONFIGURATIONS
                .map(tp => `tpSize=${tp.size}&tpGain=${tp.gain}`)
                .join('&');
            
            return `${this.baseUrl}?${params.toString()}&${tpParams}`;
        }
        
        // Fetch results from API
        async fetchResults(config, retries = 3) {
            try {
                // Use burst rate limiting for optimal performance
                await burstRateLimiter.throttle();
                
                // Map AGCopilot config to API parameters
                const apiParams = this.mapParametersToAPI(config);
                
                // Validate parameters
                const validation = this.validateConfig(apiParams);
                if (!validation.isValid) {
                    return { 
                        success: true, 
                        error: 'Skipping Invalid configuration: ' + validation.errors.join(', '),
                        validation: validation.errors
                    };
                }
                
                const url = this.buildApiUrl(apiParams);
                
                // Debug logging for problematic parameters
                const problematicParams = [];
                Object.entries(apiParams).forEach(([key, value]) => {
                    if (value === null || value === undefined || String(value) === 'NaN' || !isFinite(Number(value))) {
                        problematicParams.push(`${key}=${value}`);
                    }
                });
                
                if (problematicParams.length > 0) {
                    console.warn(`⚠️ Potential problematic parameters detected: ${problematicParams.join(', ')}`);
                }
                
                console.log(`🔗 API URL: ${url.substring(0, 150)}...${url.includes('tpSize') ? ' (with multiple TPs)' : ''}`);
                
                // Additional validation for AG Score in URL
                if (url.includes('minAgScore=NaN') || url.includes('minAgScore=undefined')) {
                    console.error(`❌ CRITICAL: NaN/undefined AG Score detected in URL! This will cause 500 error.`);
                    return { 
                        success: false, 
                        error: 'Invalid AG Score parameter (NaN/undefined) detected in API URL',
                        source: 'URL_VALIDATION'
                    };
                }
                
                for (let attempt = 1; attempt <= retries; attempt++) {
                    try {
                        const response = await fetch(url, {
                            method: 'GET',
                            credentials: 'include',
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json'
                            }
                        });
                        
                        if (!response.ok) {
                            if (response.status === 429) {
                                // Rate limited - adapt the burst limiter and handle with aggressive backoff
                                console.warn(`⚠️ Rate limit hit (429) on attempt ${attempt}/${retries} - CRITICAL FAILURE`);
                                burstRateLimiter.adaptToBurstLimit();
                                
                                const retryAfter = response.headers.get('Retry-After');
                                let waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.max(20000, CONFIG.RATE_LIMIT_RECOVERY * 2);
                                
                                // Exponential backoff with much longer delays
                                if (attempt > 1) {
                                    waitTime *= Math.pow(2, attempt - 1); // True exponential backoff
                                }
                                
                                // Cap at 2 minutes but ensure it's substantial
                                waitTime = Math.min(120000, Math.max(20000, waitTime));
                                
                                console.warn(`⏳ EXTENDED BACKOFF: Waiting ${(waitTime/1000).toFixed(1)}s before retry...`);
                                console.warn(`📊 Burst limiter adapted: ${burstRateLimiter.burstLimit} calls/burst, ${(burstRateLimiter.recoveryTime/1000).toFixed(1)}s recovery`);
                                console.warn(`🚨 This rate limit indicates our throttling needs further adjustment!`);
                                
                                if (attempt < retries) {
                                    await sleep(waitTime);
                                    continue;
                                } else {
                                    // On final retry failure, return a special result to continue optimization
                                    return {
                                        success: false,
                                        error: 'Rate limit exceeded after all retries - throttling insufficient',
                                        isRateLimit: true,
                                        retryable: true
                                    };
                                }
                            }
                            
                            // Handle 500 errors specifically (often caused by invalid parameters)
                            if (response.status === 500) {
                                console.error(`❌ Server Error (500) - likely invalid parameters`);
                                console.error(`🔍 Full API URL: ${url}`);
                                
                                // Extract and show potentially problematic parameters
                                const urlParams = new URLSearchParams(url.split('?')[1]);
                                const suspiciousParams = [];
                                for (const [key, value] of urlParams.entries()) {
                                    if (value === 'NaN' || value === 'undefined' || value === 'null' || value === '') {
                                        suspiciousParams.push(`${key}=${value}`);
                                    }
                                }
                                
                                if (suspiciousParams.length > 0) {
                                    console.error(`🐛 Suspicious parameters found: ${suspiciousParams.join(', ')}`);
                                }
                                
                                throw new Error(`Server Error (500) - Invalid parameters detected: ${suspiciousParams.join(', ') || 'Unknown cause'}`);
                            }
                            
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }
                        
                        const data = await response.json();
                        
                        // Transform to AGCopilot expected format
                        const transformedMetrics = {
                            totalTokens: data.totalTokens || 0,
                            tpPnlPercent: data.averageTpGain || 0,
                            tpPnlSOL: data.pnlSolTp || 0,
                            athPnlPercent: data.averageAthGain || 0,
                            athPnlSOL: data.pnlSolAth || 0,
                            totalSpent: data.totalSolSpent || 0,
                            winRate: data.winRate || 0,
                            cleanPnL: data.cleanPnL || 0,
                            totalSignals: data.totalAvailableSignals || 0
                        };
                        
                        // Ensure we have valid numbers for required fields
                        if (isNaN(transformedMetrics.tpPnlPercent) || isNaN(transformedMetrics.totalTokens)) {
                            console.error('❌ Invalid metrics - contains NaN values:', transformedMetrics);
                            throw new Error(`Invalid metrics returned: tpPnlPercent=${transformedMetrics.tpPnlPercent}, totalTokens=${transformedMetrics.totalTokens}`);
                        }
                        
                        return {
                            success: true,
                            metrics: transformedMetrics,
                            rawResponse: data,
                            source: 'API'
                        };
                        
                    } catch (error) {
                        console.warn(`❌ API attempt ${attempt} failed: ${error.message}`);
                        
                        if (attempt === retries) {
                            return {
                                success: false,
                                error: error.message,
                                source: 'API'
                            };
                        }
                        
                        // For 429 errors, we already slept above; for other errors, use shorter backoff
                        if (!error.message.includes('429')) {
                            await sleep(1000 * attempt);
                        }
                    }
                }
                
            } catch (error) {
                return {
                    success: false,
                    error: error.message,
                    source: 'API'
                };
            }
        }
    }

    // Initialize the API client
    const backtesterAPI = new BacktesterAPI();

    // ========================================
    // �📊 UI METRICS EXTRACTOR (Enhanced from original AGCopilot)
    // ========================================
    async function extractMetricsFromUI() {
        try {
            const metrics = {};
            const statDivs = Array.from(document.querySelectorAll('div.text-xl.font-bold'));

            for (const div of statDivs) {
                const label = div.parentElement.querySelector('div.text-xs.text-gray-400');
                if (label) {
                    const labelText = label.textContent.trim().toLowerCase();
                    const value = div.textContent.trim();

                    switch (labelText) {
                        case 'tokens matched':
                            const tokenMatch = value.match(/(\d{1,3}(?:,\d{3})*)/);
                            if (tokenMatch) {
                                metrics.totalTokens = parseInt(tokenMatch[1].replace(/,/g, ''));
                            }
                            break;
                        case 'tp pnl %':
                            const tpPnlMatch = value.match(/([+-]?\d+(?:\.\d+)?)%/);
                            if (tpPnlMatch) {
                                metrics.tpPnlPercent = parseFloat(tpPnlMatch[1]);
                            }
                            break;
                        case 'tp pnl (sol)':
                            const tpPnlSolMatch = value.match(/([+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?)/);
                            if (tpPnlSolMatch) {
                                metrics.tpPnlSOL = parseFloat(tpPnlSolMatch[1].replace(/,/g, ''));
                            }
                            break;
                        case 'signal ath pnl %':
                        case 'ath pnl %':
                            const athPnlMatch = value.match(/([+-]?\d+(?:\.\d+)?)%/);
                            if (athPnlMatch) {
                                metrics.athPnlPercent = parseFloat(athPnlMatch[1]);
                            }
                            break;
                        case 'total sol spent':
                            const spentMatch = value.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/);
                            if (spentMatch) {
                                metrics.totalSpent = parseFloat(spentMatch[1].replace(/,/g, ''));
                            }
                            break;
                        case 'win rate (≥2x)':
                            const winRateMatch = value.match(/(\d+(?:\.\d+)?)%/);
                            if (winRateMatch) {
                                metrics.winRate = parseFloat(winRateMatch[1]);
                            }
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

    // ========================================
    // 📊 ROBUST SCORING SYSTEM (Outlier-Resistant)
    // ========================================
    function calculateRobustScore(metrics) {
        if (!metrics) {
            console.warn('⚠️ calculateRobustScore: metrics is null/undefined');
            return null;
        }
        
        if (metrics.tpPnlPercent === undefined || metrics.totalTokens === undefined) {
            console.warn('⚠️ calculateRobustScore: missing required properties', {
                tpPnlPercent: metrics.tpPnlPercent,
                totalTokens: metrics.totalTokens,
                allKeys: Object.keys(metrics)
            });
            return null;
        }

        // If robust scoring is disabled, use raw TP PnL %
        if (!CONFIG.USE_ROBUST_SCORING) {
            return {
                score: metrics.tpPnlPercent,
                components: {
                    rawPnL: metrics.tpPnlPercent,
                    winRate: metrics.winRate || 0,
                    reliabilityFactor: 1.0,
                    finalScore: metrics.tpPnlPercent
                },
                scoringMethod: 'Raw TP PnL %'
            };
        }

        // Use raw TP PnL % without capping
        const rawPnL = metrics.tpPnlPercent;
        
        // Win rate component (0-100%)
        const winRate = metrics.winRate || 0;
        
        // Reliability factor based on sample size (more tokens = more reliable)
        // Uses logarithmic scaling: log(tokens)/log(100) capped at 1.0
        const tokensCount = metrics.totalTokens || 1; // Default to 1 to avoid log(0)
        const reliabilityFactor = Math.min(1.0, Math.log(tokensCount) / Math.log(100));
        
        // Early exit for low win rate configs (likely unreliable)
        if (winRate < CONFIG.MIN_WIN_RATE) {
            return {
                score: -10, // Heavily penalize configs with poor win rates
                components: {
                    rawPnL: metrics.tpPnlPercent,
                    winRate: winRate,
                    reliabilityFactor: reliabilityFactor,
                    finalScore: -10,
                    penalty: 'Low win rate'
                },
                scoringMethod: 'Robust (Penalized for low win rate)'
            };
        }
        
        // Calculate composite score
        // Formula: (Raw_PnL * RETURN_WEIGHT) + (Win_Rate * CONSISTENCY_WEIGHT) * Reliability_Factor
        const returnComponent = rawPnL * CONFIG.RETURN_WEIGHT;
        const consistencyComponent = winRate * CONFIG.CONSISTENCY_WEIGHT;
        const baseScore = returnComponent + consistencyComponent;
        
        // Apply reliability weighting
        const finalScore = baseScore * (1 - CONFIG.RELIABILITY_WEIGHT) + baseScore * reliabilityFactor * CONFIG.RELIABILITY_WEIGHT;
        
        return {
            score: finalScore,
            components: {
                rawPnL: metrics.tpPnlPercent,
                winRate: winRate,
                reliabilityFactor: reliabilityFactor,
                returnComponent: returnComponent,
                consistencyComponent: consistencyComponent,
                baseScore: baseScore,
                finalScore: finalScore
            },
            scoringMethod: 'Robust Multi-Factor (Uncapped)'
        };
    }

    // Clean and validate configuration values before API calls
    function cleanConfiguration(config) {
        const cleanedConfig = deepClone(config);
        
        // Recursively clean all values in the configuration
        function cleanValue(obj) {
            if (typeof obj === 'object' && obj !== null) {
                for (const [key, value] of Object.entries(obj)) {
                    if (typeof value === 'object' && value !== null) {
                        cleanValue(value); // Recurse into nested objects
                    } else {
                        // Clean individual values
                        if (value === null || value === undefined || value === '') {
                            delete obj[key]; // Remove empty values
                        } else if (typeof value === 'string') {
                            // Handle string representations of numbers
                            const numValue = parseFloat(value);
                            if (!isNaN(numValue) && isFinite(numValue)) {
                                // Special handling for AG Score
                                if (key === 'Min AG Score') {
                                    const agScore = Math.round(numValue);
                                    obj[key] = Math.max(0, Math.min(10, agScore)); // Clamp to 0-10
                                } else {
                                    obj[key] = numValue; // Convert valid numeric strings to numbers
                                }
                            } else if (value === 'NaN' || value === 'undefined' || value === 'null') {
                                delete obj[key]; // Remove invalid string values
                            }
                        } else if (typeof value === 'number') {
                            // Handle numeric values
                            if (isNaN(value) || !isFinite(value)) {
                                delete obj[key]; // Remove NaN or infinite numbers
                            } else if (key === 'Min AG Score') {
                                const agScore = Math.round(value);
                                obj[key] = Math.max(0, Math.min(10, agScore)); // Clamp AG Score to 0-10
                            }
                        }
                    }
                }
            }
        }
        
        cleanValue(cleanedConfig);
        return cleanedConfig;
    }

    // Test configuration via API call (New: Direct API instead of UI scraping)
    async function testConfigurationAPI(config, testName = 'API Test') {
        try {
            console.log(`🧪 Testing via API: ${testName}`);
            
            // Clean the configuration before testing
            const cleanedConfig = cleanConfiguration(config);
            
            // Use the new API to get results directly
            const result = await backtesterAPI.fetchResults(cleanedConfig);
            
            if (!result.success) {
                console.warn(`❌ ${testName} failed: ${result.error}`);
                return result;
            }
            
            const metrics = result.metrics;
            
            // Validate metrics before proceeding
            if (!metrics) {
                console.warn(`❌ ${testName}: No metrics returned from API`);
                return {
                    success: false,
                    error: 'No metrics returned from API'
                };
            }
            
            if (metrics.tpPnlPercent === undefined || metrics.totalTokens === undefined) {
                console.warn(`❌ ${testName}: Invalid metrics structure:`, {
                    tpPnlPercent: metrics.tpPnlPercent,
                    totalTokens: metrics.totalTokens,
                    allKeys: Object.keys(metrics)
                });
                return {
                    success: false,
                    error: `Invalid metrics: missing tpPnlPercent (${metrics.tpPnlPercent}) or totalTokens (${metrics.totalTokens})`
                };
            }
            
            // Calculate robust score for logging
            const robustScoring = calculateRobustScore(metrics);
            if (robustScoring && CONFIG.USE_ROBUST_SCORING) {
                console.log(`✅ ${testName}: ${metrics?.totalTokens || 0} tokens | Robust Score: ${robustScoring.score.toFixed(1)} | Raw TP PnL: ${metrics.tpPnlPercent?.toFixed(1)}% | Win Rate: ${metrics.winRate?.toFixed(1)}%`);
            } else {
                console.log(`✅ ${testName}: ${metrics?.totalTokens || 0} tokens, TP PnL: ${metrics.tpPnlPercent?.toFixed(1)}%, ATH PnL: ${metrics.athPnlPercent?.toFixed(1)}%, Win Rate: ${metrics.winRate?.toFixed(1)}%`);
            }

            return {
                success: true,
                metrics,
                source: 'API'
            };
            
        } catch (error) {
            console.warn(`❌ ${testName} failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Test configuration via UI interaction (Legacy: kept as fallback)
    async function testConfigurationUI(config, testName = 'UI Test') {
        try {
            console.log(`🧪 Testing: ${testName}`);
            
            // 1. Apply configuration to UI (this sends the requests automatically)
            const completeConfig = ensureCompleteConfig(config);
            const applySuccess = await applyConfigToUI(completeConfig);
            if (!applySuccess) {
                console.warn(`❌ Failed to apply configuration for ${testName}`);
                return { success: false, error: 'Failed to apply configuration' };
            }

            // 2. Wait for UI to update (same as original AGCopilot) - with stop check
            const waitTime = CONFIG.BACKTEST_WAIT;
            const checkInterval = 500; // Check stop flag every 500ms
            let elapsed = 0;
            
            while (elapsed < waitTime) {
                if (window.STOPPED) {
                    console.log('⏹️ Optimization stopped during UI wait');
                    return { success: false, error: 'Stopped by user' };
                }
                const sleepTime = Math.min(checkInterval, waitTime - elapsed);
                await sleep(sleepTime);
                elapsed += sleepTime;
            }

            // 3. Extract metrics from UI (enhanced to get accurate TP PnL %)
            const metrics = await extractMetricsFromUI();
            if (!metrics) {
                console.warn(`❌ Failed to extract metrics for ${testName}`);
                return { success: false, error: 'Failed to extract metrics' };
            }

            // Calculate robust score for logging (but don't fail if it doesn't work)
            const robustScoring = calculateRobustScore(metrics);
            if (robustScoring && CONFIG.USE_ROBUST_SCORING) {
                console.log(`✅ ${testName}: ${metrics?.totalTokens || 0} tokens | Robust Score: ${robustScoring.score.toFixed(1)} | Raw TP PnL: ${metrics.tpPnlPercent?.toFixed(1)}% | Win Rate: ${metrics.winRate?.toFixed(1)}%`);
            } else {
                console.log(`✅ ${testName}: ${metrics?.totalTokens || 0} tokens, TP PnL: ${metrics.tpPnlPercent?.toFixed(1)}%, ATH PnL: ${metrics.athPnlPercent?.toFixed(1)}%, Win Rate: ${metrics.winRate?.toFixed(1)}%`);
            }

            return {
                success: true,
                metrics,
                source: 'UI'
            };
            
        } catch (error) {
            console.warn(`❌ ${testName} failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ========================================
    // � SIGNAL PROCESSING & CONFIG GENERATION (from AGSignalExtractor)
    // ========================================
    function processTokenData(tokenInfo, swaps) {
        const result = {
            // Basic Token Info
            tokenAddress: tokenInfo.tokenAddress,
            tokenName: tokenInfo.token,
            symbol: tokenInfo.symbol,
            currentMcap: formatMcap(tokenInfo.currentMcap),
            currentMcapRaw: tokenInfo.currentMcap,
            athMcap: formatMcap(tokenInfo.athMcap),
            athMcapRaw: tokenInfo.athMcap,
            athTime: formatTimestamp(tokenInfo.athTime),
            atlMcap: formatMcap(tokenInfo.atlMcap),
            atlMcapRaw: tokenInfo.atlMcap,
            atlTime: formatTimestamp(tokenInfo.atlTime),
            
            // Performance Metrics
            athMultiplier: tokenInfo.athMcap && tokenInfo.signalMcap ? 
                (tokenInfo.athMcap / tokenInfo.signalMcap).toFixed(2) + 'x' : 'N/A',
            athMultiplierRaw: tokenInfo.athMcap && tokenInfo.signalMcap ? 
                (tokenInfo.athMcap / tokenInfo.signalMcap) : 0,
            currentFromAth: tokenInfo.athMcap && tokenInfo.currentMcap ? 
                formatPercent(((tokenInfo.currentMcap - tokenInfo.athMcap) / tokenInfo.athMcap) * 100) : 'N/A',
            
            // Signal Analysis
            totalSignals: swaps.length,
            firstSignalTime: formatTimestamp(swaps[swaps.length - 1]?.timestamp),
            lastSignalTime: formatTimestamp(swaps[0]?.timestamp),
            firstSignalMcap: formatMcap(swaps[swaps.length - 1]?.signalMcap),
            lastSignalMcap: formatMcap(swaps[0]?.signalMcap),
            
            // Win Prediction Analysis
            avgWinPred: swaps.length > 0 ? 
                formatPercent(swaps.reduce((sum, swap) => sum + (swap.winPredPercent || 0), 0) / swaps.length) : 'N/A',
            maxWinPred: swaps.length > 0 ? 
                formatPercent(Math.max(...swaps.map(swap => swap.winPredPercent || 0))) : 'N/A',
            minWinPred: swaps.length > 0 ? 
                formatPercent(Math.min(...swaps.map(swap => swap.winPredPercent || 0))) : 'N/A',
            
            // Trigger Mode Analysis
            triggerModes: [...new Set(swaps.map(swap => swap.triggerMode))].join(', '),
            
            // Latest Criteria (from most recent swap)
            latestCriteria: tokenInfo.criteria
        };
        
        return result;
    }

    function generateBatchSummary(allTokenData) {
        const summary = {
            totalTokens: allTokenData.length,
            totalSignals: allTokenData.reduce((sum, token) => sum + token.processed.totalSignals, 0),
            avgSignalsPerToken: 0,
            topPerformers: [],
            avgWinPred: 0,
            athMultipliers: []
        };
        
        if (allTokenData.length > 0) {
            summary.avgSignalsPerToken = (summary.totalSignals / allTokenData.length).toFixed(1);
            
            // Calculate average win prediction across all tokens
            const allWinPreds = allTokenData.map(token => {
                const avgWinPred = token.swaps.reduce((sum, swap) => sum + (swap.winPredPercent || 0), 0) / token.swaps.length;
                return avgWinPred;
            });
            summary.avgWinPred = (allWinPreds.reduce((sum, pred) => sum + pred, 0) / allWinPreds.length).toFixed(2);
            
            // Get top performers by ATH multiplier
            summary.topPerformers = allTokenData
                .map(token => ({
                    name: token.processed.tokenName,
                    symbol: token.processed.symbol,
                    athMultiplier: token.processed.athMultiplierRaw || 0,
                    athMultiplierText: token.processed.athMultiplier,
                    signals: token.processed.totalSignals
                }))
                .sort((a, b) => b.athMultiplier - a.athMultiplier)
                .slice(0, 5);
            
            // Extract ATH multipliers for statistics
            summary.athMultipliers = allTokenData
                .map(token => token.processed.athMultiplierRaw || 0)
                .filter(mult => mult > 0);
        }
        
        return summary;
    }

    // Outlier filtering functions
    function removeOutliers(values, method = 'none') {
        if (!values || values.length === 0) return values;
        if (method === 'none') return values;
        
        const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
        if (validValues.length < 4) return validValues; // Need at least 4 values for meaningful outlier detection
        
        const sorted = [...validValues].sort((a, b) => a - b);
        
        switch (method) {
            case 'iqr': {
                // Interquartile Range method - removes extreme outliers
                const q1Index = Math.floor(sorted.length * 0.25);
                const q3Index = Math.floor(sorted.length * 0.75);
                const q1 = sorted[q1Index];
                const q3 = sorted[q3Index];
                const iqr = q3 - q1;
                const lowerBound = q1 - 1.5 * iqr;
                const upperBound = q3 + 1.5 * iqr;
                
                return validValues.filter(v => v >= lowerBound && v <= upperBound);
            }
            
            case 'percentile': {
                // Keep middle 80% (remove top and bottom 10%)
                const startIndex = Math.floor(sorted.length * 0.1);
                const endIndex = Math.ceil(sorted.length * 0.9);
                const filtered = sorted.slice(startIndex, endIndex);
                
                return validValues.filter(v => v >= filtered[0] && v <= filtered[filtered.length - 1]);
            }
            
            case 'zscore': {
                // Z-Score method - remove values more than 2.5 standard deviations from mean
                const mean = validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
                const variance = validValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / validValues.length;
                const stdDev = Math.sqrt(variance);
                const threshold = 2.5;
                
                return validValues.filter(v => Math.abs(v - mean) <= threshold * stdDev);
            }
            
            default:
                return validValues;
        }
    }

    // ========================================
    // 🎯 SIGNAL CLUSTERING FUNCTIONS
    // ========================================
    
    // Get all numeric parameters that are present in the backtester
    function getClusteringParameters() {
        return [
            'signalMcap', 'agScore', 'tokenAge', 'deployerAge', 'deployerBalance',
            'uniqueCount', 'kycCount', 'liquidity', 'liquidityPct', 'buyVolumePct',
            'bundledPct', 'drainedPct', 'volMcapPct', 'winPredPercent', 'ttc'
        ];
    }
    
    // Normalize signal parameters to 0-1 scale for distance calculation
    function normalizeSignals(signals) {
        const parameters = getClusteringParameters();
        const normalizedSignals = [];
        const ranges = {};
        
        // Calculate min/max for each parameter
        parameters.forEach(param => {
            const values = signals.map(s => s[param]).filter(v => v !== null && v !== undefined && !isNaN(v));
            if (values.length > 0) {
                ranges[param] = {
                    min: Math.min(...values),
                    max: Math.max(...values),
                    range: Math.max(...values) - Math.min(...values)
                };
            }
        });
        
        // Normalize each signal
        signals.forEach(signal => {
            const normalized = { ...signal };
            parameters.forEach(param => {
                if (ranges[param] && signal[param] !== null && signal[param] !== undefined && !isNaN(signal[param])) {
                    if (ranges[param].range > 0) {
                        normalized[param] = (signal[param] - ranges[param].min) / ranges[param].range;
                    } else {
                        normalized[param] = 0; // All values are the same
                    }
                } else {
                    normalized[param] = 0; // Missing values default to 0
                }
            });
            normalizedSignals.push(normalized);
        });
        
        return { normalizedSignals, ranges };
    }
    
    // Calculate Euclidean distance between two normalized signals
    function calculateSignalDistance(signal1, signal2) {
        const parameters = getClusteringParameters();
        let sumSquaredDiffs = 0;
        let validParams = 0;
        
        parameters.forEach(param => {
            const val1 = signal1[param];
            const val2 = signal2[param];
            
            if (val1 !== null && val1 !== undefined && !isNaN(val1) &&
                val2 !== null && val2 !== undefined && !isNaN(val2)) {
                sumSquaredDiffs += Math.pow(val1 - val2, 2);
                validParams++;
            }
        });
        
        if (validParams === 0) return Infinity;
        return Math.sqrt(sumSquaredDiffs);
    }
    
    // Find clusters using distance threshold approach
    function findSignalClusters(signals, tokenData, minClusterTokens) {
        if (signals.length < 4) return []; // Need at least 4 signals for meaningful clustering
        
        console.log(`🔍 Clustering ${signals.length} signals from ${tokenData.length} tokens, min tokens per cluster: ${minClusterTokens}`);
        
        // Create a mapping from signal to token address
        const signalToToken = new Map();
        let signalIndex = 0;
        tokenData.forEach(token => {
            token.swaps.forEach(swap => {
                if (swap.criteria) {
                    signalToToken.set(signalIndex, token.address);
                    signalIndex++;
                }
            });
        });
        
        const { normalizedSignals } = normalizeSignals(signals);
        const clusters = [];
        const usedSignals = new Set();
        
        // Try different distance thresholds to find good clusters
        const thresholds = [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0, 1.5, 2.0];
        
        for (const threshold of thresholds) {
            const currentClusters = [];
            const currentUsed = new Set();
            
            console.log(`🔍 Trying threshold: ${threshold}`);
            
            normalizedSignals.forEach((signal, index) => {
                if (currentUsed.has(index)) return;
                
                // Start a new cluster with this signal
                const cluster = [index];
                const clusterTokens = new Set([signalToToken.get(index)]);
                currentUsed.add(index);
                
                // Find all signals within threshold distance
                normalizedSignals.forEach((otherSignal, otherIndex) => {
                    if (currentUsed.has(otherIndex)) return;
                    
                    const distance = calculateSignalDistance(signal, otherSignal);
                    if (distance <= threshold) {
                        cluster.push(otherIndex);
                        clusterTokens.add(signalToToken.get(otherIndex));
                        currentUsed.add(otherIndex);
                    }
                });
                
                // Debug: show cluster info
                if (cluster.length >= 2) {
                    console.log(`🔍 Potential cluster: ${cluster.length} signals from ${clusterTokens.size} tokens (need ${minClusterTokens} tokens)`);
                }
                
                // Only keep clusters that meet minimum TOKEN count requirement
                if (clusterTokens.size >= minClusterTokens) {
                    currentClusters.push({
                        indices: cluster,
                        signals: cluster.map(i => signals[i]),
                        tokens: Array.from(clusterTokens),
                        threshold: threshold,
                        size: cluster.length,
                        tokenCount: clusterTokens.size,
                        uniqueTokens: clusterTokens.size,
                        avgDistance: cluster.length > 1 ? 
                            cluster.reduce((sum, i) => {
                                return sum + cluster.reduce((innerSum, j) => {
                                    return i !== j ? innerSum + calculateSignalDistance(normalizedSignals[i], normalizedSignals[j]) : innerSum;
                                }, 0);
                            }, 0) / (cluster.length * (cluster.length - 1)) : 0
                    });
                    console.log(`✅ Found cluster: ${cluster.length} signals from ${clusterTokens.size} tokens at threshold ${threshold}`);
                }
            });
            
            // If we found good clusters at this threshold, add them
            if (currentClusters.length > 0) {
                clusters.push(...currentClusters);
                console.log(`📊 Added ${currentClusters.length} clusters at threshold ${threshold}`);
                // Stop after finding the first good threshold to avoid overlap
                break;
            }
        }
        
        // Remove overlapping clusters (prefer larger, tighter clusters)
        const finalClusters = [];
        const globalUsed = new Set();
        
        // Sort by tightness (lower avgDistance = tighter) then by token diversity
        clusters.sort((a, b) => {
            const tightnessScore = a.avgDistance - b.avgDistance;
            if (Math.abs(tightnessScore) < 0.01) {
                return b.tokenCount - a.tokenCount; // If similar tightness, prefer more tokens
            }
            return tightnessScore; // Prefer tighter clusters
        });
        
        clusters.forEach(cluster => {
            // Check if any signals in this cluster are already used
            const hasOverlap = cluster.indices.some(i => globalUsed.has(i));
            if (!hasOverlap) {
                // Mark all signals in this cluster as used
                cluster.indices.forEach(i => globalUsed.add(i));
                finalClusters.push(cluster);
            }
        });
        
        return finalClusters;
    }

    // Analyze all signals to find optimal parameter bounds
    function analyzeSignalCriteria(allTokenData, bufferPercent = 10, outlierMethod = 'none', useClustering = true) {
        const allSignals = [];
        
        // Collect all signals from all tokens
        allTokenData.forEach(tokenData => {
            tokenData.swaps.forEach(swap => {
                if (swap.criteria) {
                    allSignals.push({
                        ...swap.criteria,
                        signalMcap: swap.signalMcap,
                        athMultiplier: swap.athMcap && swap.signalMcap ? (swap.athMcap / swap.signalMcap) : 0
                    });
                }
            });
        });
        
        if (allSignals.length === 0) {
            throw new Error('No signal criteria found to analyze');
        }
        
        // 🎯 CLUSTERING LOGIC
        if (useClustering && allSignals.length >= 4) {
            // Calculate minimum cluster size based on number of unique tokens (CAs)
            const uniqueTokens = new Set(allTokenData.map(t => t.address)).size;
            const minClusterSize = Math.max(2, Math.min(6, Math.ceil(uniqueTokens * 0.3)));
            console.log(`🔍 Clustering Debug: ${allSignals.length} signals from ${uniqueTokens} tokens, min cluster size: ${minClusterSize} tokens`);
            
            const clusters = findSignalClusters(allSignals, allTokenData, minClusterSize);
            console.log(`🔍 Found ${clusters.length} clusters:`, clusters.map(c => `${c.size} signals from ${c.uniqueTokens} tokens (threshold: ${c.threshold})`));
            
            if (clusters.length > 0) {
                // Generate multiple configurations from clusters
                const clusteredAnalyses = [];
                
                clusters.forEach((cluster, index) => {
                    try {
                        const clusterAnalysis = generateClusterAnalysis(cluster.signals, bufferPercent, outlierMethod);
                        
                        // Add cluster-specific metadata
                        clusterAnalysis.tokenCount = allTokenData.length; // Total tokens analyzed
                        clusterAnalysis.clusterInfo = {
                            clusterId: index + 1,
                            clusterName: `Cluster ${index + 1}`,
                            signalCount: cluster.size,
                            tokenCount: cluster.tokenCount,
                            tightness: cluster.avgDistance,
                            threshold: cluster.threshold,
                            description: `${cluster.size} signals from ${cluster.tokenCount} tokens (avg distance: ${cluster.avgDistance.toFixed(3)})`
                        };
                        
                        clusteredAnalyses.push({
                            id: `cluster_${index + 1}`,
                            name: `Cluster ${index + 1}`,
                            description: `${cluster.size} signals from ${cluster.tokenCount} tokens (avg distance: ${cluster.avgDistance.toFixed(3)})`,
                            signalCount: cluster.size,
                            tokenCount: cluster.tokenCount,
                            tightness: cluster.avgDistance,
                            threshold: cluster.threshold,
                            analysis: clusterAnalysis,
                            signals: cluster.signals
                        });
                    } catch (error) {
                        console.warn(`Failed to analyze cluster ${index + 1}:`, error);
                    }
                });
                
                if (clusteredAnalyses.length > 0) {
                    // Also generate the full analysis as fallback
                    const fullAnalysis = generateFullAnalysis(allSignals, bufferPercent, outlierMethod);
                    fullAnalysis.tokenCount = allTokenData.length;
                    
                    return {
                        type: 'clustered',
                        clusters: clusteredAnalyses,
                        fallback: fullAnalysis,
                        totalSignals: allSignals.length,
                        clusteredSignals: clusteredAnalyses.reduce((sum, c) => sum + c.signalCount, 0),
                        usedClustering: true
                    };
                }
            }
        }
        
        // Fallback to standard analysis (or if clustering disabled/failed)
        const standardAnalysis = generateFullAnalysis(allSignals, bufferPercent, outlierMethod);
        standardAnalysis.tokenCount = allTokenData.length; // Add token count
        return {
            type: 'standard',
            analysis: standardAnalysis,
            usedClustering: false
        };
    }
    
    // Generate full analysis from all signals (original logic)
    function generateFullAnalysis(allSignals, bufferPercent, outlierMethod) {
        return generateAnalysisFromSignals(allSignals, bufferPercent, outlierMethod);
    }
    
    // Generate analysis for a cluster
    function generateClusterAnalysis(clusterSignals, bufferPercent, outlierMethod) {
        return generateAnalysisFromSignals(clusterSignals, bufferPercent, outlierMethod);
    }
    
    // Core analysis logic that works with any signal set
    function generateAnalysisFromSignals(signals, bufferPercent, outlierMethod) {
        
        // Helper function to apply buffer to bounds
        const applyBuffer = (value, isMin = true, isPercent = false) => {
            if (value === null || value === undefined) return null;
            
            const multiplier = isMin ? (1 - bufferPercent / 100) : (1 + bufferPercent / 100);
            let result = value * multiplier;
            
            // Ensure bounds stay within realistic ranges
            if (isPercent) {
                result = Math.max(0, Math.min(100, result));
            } else if (result < 0) {
                result = 0;
            }
            
            return Math.round(result * 100) / 100; // Round to 2 decimal places
        };
        
        // Helper function to get valid values with outlier filtering
        const getValidValues = (field) => {
            const rawValues = signals
                .map(signal => signal[field])
                .filter(val => val !== null && val !== undefined && !isNaN(val));
            
            return removeOutliers(rawValues, outlierMethod);
        };
        
        // Analyze each parameter
        const analysis = {
            totalSignals: signals.length,
            bufferPercent: bufferPercent,
            outlierMethod: outlierMethod,
            
            // MCAP Analysis (expecting low values under 20k)
            mcap: (() => {
                const rawMcaps = signals.map(s => s.signalMcap).filter(m => m && m > 0);
                const mcaps = removeOutliers(rawMcaps, outlierMethod);
                
                if (mcaps.length === 0) return { 
                    min: 0, max: 20000, avg: 0, count: 0, 
                    originalCount: rawMcaps.length, filteredCount: 0, outlierMethod 
                };
                
                const min = Math.min(...mcaps);
                const max = Math.max(...mcaps);
                const avg = mcaps.reduce((sum, m) => sum + m, 0) / mcaps.length;
                
                // Sort MCaps to find a reasonable tightest max (75th percentile)
                const sortedMcaps = [...mcaps].sort((a, b) => a - b);
                const percentile75Index = Math.floor(sortedMcaps.length * 0.75);
                const tightestMax = sortedMcaps[percentile75Index] || max;
                
                return {
                    min: Math.round(min),
                    max: Math.round(applyBuffer(max, false)), // Max with buffer
                    avg: Math.round(avg),
                    count: mcaps.length,
                    originalCount: rawMcaps.length,
                    filteredCount: mcaps.length,
                    outliersRemoved: rawMcaps.length - mcaps.length,
                    tightestMax: Math.round(applyBuffer(tightestMax, false)), // 75th percentile with buffer
                    outlierMethod: outlierMethod
                };
            })(),
            
            // AG Score Analysis
            agScore: (() => {
                const scores = getValidValues('agScore');
                if (scores.length === 0) return { min: 0, max: 100, avg: 0, count: 0 };
                
                const min = Math.min(...scores);
                const max = Math.max(...scores);
                const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
                
                return {
                    min: Math.round(applyBuffer(min, true)),
                    max: Math.round(applyBuffer(max, false)),
                    avg: Math.round(avg),
                    count: scores.length
                };
            })(),
            
            // Token Age Analysis (convert from seconds to minutes)
            tokenAge: (() => {
                const ages = getValidValues('tokenAge');
                if (ages.length === 0) return { min: 0, max: 10080, avg: 0, count: 0 };
                
                // Convert from seconds to minutes (API returns seconds, UI expects minutes)
                const agesInMinutes = ages.map(ageInSeconds => ageInSeconds / 60);
                
                const min = Math.min(...agesInMinutes);
                const max = Math.max(...agesInMinutes);
                const avg = agesInMinutes.reduce((sum, a) => sum + a, 0) / agesInMinutes.length;
                
                return {
                    min: Math.round(applyBuffer(min, true)),
                    max: Math.round(applyBuffer(max, false)),
                    avg: Math.round(avg),
                    count: agesInMinutes.length
                };
            })(),
            
            // Deployer Age Analysis (convert from seconds to minutes)
            deployerAge: (() => {
                const ages = getValidValues('deployerAge');
                if (ages.length === 0) return { min: 0, max: 10080, avg: 0, count: 0 };
                
                // Convert from seconds to minutes (API returns seconds, UI expects minutes)
                const agesInMinutes = ages.map(ageInSeconds => ageInSeconds / 60);
                
                const min = Math.min(...agesInMinutes);
                const max = Math.max(...agesInMinutes);
                const avg = agesInMinutes.reduce((sum, a) => sum + a, 0) / agesInMinutes.length;
                
                return {
                    min: Math.round(applyBuffer(min, true)),
                    max: Math.round(applyBuffer(max, false)),
                    avg: Math.round(avg),
                    count: agesInMinutes.length
                };
            })(),
            
            // Deployer Balance Analysis (should be tight for same team)
            deployerBalance: (() => {
                const balances = getValidValues('deployerBalance');
                if (balances.length === 0) return { min: 0, max: 1000, avg: 0, count: 0 };
                
                const min = Math.min(...balances);
                const max = Math.max(...balances);
                const avg = balances.reduce((sum, b) => sum + b, 0) / balances.length;
                
                return {
                    min: applyBuffer(min, true),
                    max: applyBuffer(max, false),
                    avg: Math.round(avg * 100) / 100,
                    count: balances.length
                };
            })(),
            
            // Wallet Stats Analysis (should be tight)
            uniqueWallets: (() => {
                const counts = getValidValues('uniqueCount');
                if (counts.length === 0) return { min: 0, max: 1000, avg: 0, count: 0 };
                
                const min = Math.min(...counts);
                const max = Math.max(...counts);
                const avg = counts.reduce((sum, c) => sum + c, 0) / counts.length;
                
                return {
                    min: Math.round(applyBuffer(min, true)),
                    max: Math.round(applyBuffer(max, false)),
                    avg: Math.round(avg),
                    count: counts.length
                };
            })(),
            
            // KYC Wallets Analysis
            kycWallets: (() => {
                const counts = getValidValues('kycCount');
                if (counts.length === 0) return { min: 0, max: 100, avg: 0, count: 0 };
                
                const min = Math.min(...counts);
                const max = Math.max(...counts);
                const avg = counts.reduce((sum, c) => sum + c, 0) / counts.length;
                
                return {
                    min: Math.round(applyBuffer(min, true)),
                    max: Math.round(applyBuffer(max, false)),
                    avg: Math.round(avg),
                    count: counts.length
                };
            })(),
            
            // Holders Analysis
            holders: (() => {
                const counts = getValidValues('holdersCount');
                if (counts.length === 0) return { min: 0, max: 1000, avg: 0, count: 0 };
                
                const min = Math.min(...counts);
                const max = Math.max(...counts);
                const avg = counts.reduce((sum, c) => sum + c, 0) / counts.length;
                
                return {
                    min: Math.round(applyBuffer(min, true)),
                    max: Math.round(applyBuffer(max, false)),
                    avg: Math.round(avg),
                    count: counts.length
                };
            })(),
            
            // Liquidity Analysis
            liquidity: (() => {
                const liquids = getValidValues('liquidity');
                if (liquids.length === 0) return { min: 0, max: 100000, avg: 0, count: 0 };
                
                const min = Math.min(...liquids);
                const max = Math.max(...liquids);
                const avg = liquids.reduce((sum, l) => sum + l, 0) / liquids.length;
                
                return {
                    min: Math.round(applyBuffer(min, true)),
                    max: Math.round(applyBuffer(max, false)),
                    avg: Math.round(avg),
                    count: liquids.length
                };
            })(),
            
            // Percentage-based criteria (with 0-100% bounds)
            liquidityPct: (() => {
                const pcts = getValidValues('liquidityPct');
                if (pcts.length === 0) return { min: 0, max: 100, avg: 0, count: 0 };
                
                return {
                    min: applyBuffer(Math.min(...pcts), true, true),
                    max: applyBuffer(Math.max(...pcts), false, true),
                    avg: Math.round((pcts.reduce((sum, p) => sum + p, 0) / pcts.length) * 100) / 100,
                    count: pcts.length
                };
            })(),
            
            buyVolumePct: (() => {
                const pcts = getValidValues('buyVolumePct');
                if (pcts.length === 0) return { min: 0, max: 100, avg: 0, count: 0 };
                
                return {
                    min: applyBuffer(Math.min(...pcts), true, true),
                    max: applyBuffer(Math.max(...pcts), false, true),
                    avg: Math.round((pcts.reduce((sum, p) => sum + p, 0) / pcts.length) * 100) / 100,
                    count: pcts.length
                };
            })(),
            
            bundledPct: (() => {
                const pcts = getValidValues('bundledPct');
                if (pcts.length === 0) return { min: 0, max: 100, avg: 0, count: 0 };
                
                return {
                    min: applyBuffer(Math.min(...pcts), true, true),
                    max: applyBuffer(Math.max(...pcts), false, true),
                    avg: Math.round((pcts.reduce((sum, p) => sum + p, 0) / pcts.length) * 100) / 100,
                    count: pcts.length
                };
            })(),
            
            drainedPct: (() => {
                const pcts = getValidValues('drainedPct');
                if (pcts.length === 0) return { min: 0, max: 100, avg: 0, count: 0 };
                
                const min = Math.min(...pcts);
                const max = Math.max(...pcts);
                
                return {
                    min: applyBuffer(min, true, true),
                    max: applyBuffer(max, false, true),
                    avg: Math.round((pcts.reduce((sum, p) => sum + p, 0) / pcts.length) * 100) / 100,
                    count: pcts.length
                };
            })(),
            
            volMcapPct: (() => {
                const pcts = getValidValues('volMcapPct');
                if (pcts.length === 0) return { min: 0, max: 300, avg: 0, count: 0 };
                
                return {
                    min: applyBuffer(Math.min(...pcts), true),
                    max: applyBuffer(Math.max(...pcts), false),
                    avg: Math.round((pcts.reduce((sum, p) => sum + p, 0) / pcts.length) * 100) / 100,
                    count: pcts.length
                };
            })(),
            
            // Win Prediction Analysis (NEW - handles winPredPercent from criteria)
            winPred: (() => {
                const winPreds = getValidValues('winPredPercent');
                if (winPreds.length === 0) return { min: 0, max: 100, avg: 0, count: 0 };
                
                const min = Math.min(...winPreds);
                const max = Math.max(...winPreds);
                const avg = winPreds.reduce((sum, w) => sum + w, 0) / winPreds.length;
                
                return {
                    min: applyBuffer(min, true, true), // Apply buffer as percentage
                    max: applyBuffer(max, false, true),
                    avg: Math.round(avg * 100) / 100,
                    count: winPreds.length
                };
            })(),
            
            // TTC (Time to Complete) Analysis
            ttc: (() => {
                const ttcs = getValidValues('ttc');
                if (ttcs.length === 0) return { min: 0, max: 3600, avg: 0, count: 0 };
                
                const min = Math.min(...ttcs);
                const max = Math.max(...ttcs);
                const avg = ttcs.reduce((sum, t) => sum + t, 0) / ttcs.length;
                
                return {
                    min: Math.round(applyBuffer(min, true)),
                    max: Math.round(applyBuffer(max, false)),
                    avg: Math.round(avg),
                    count: ttcs.length
                };
            })(),
            
            // Boolean criteria analysis
            freshDeployer: {
                trueCount: signals.filter(s => s.freshDeployer === true).length,
                falseCount: signals.filter(s => s.freshDeployer === false).length,
                nullCount: signals.filter(s => s.freshDeployer === null || s.freshDeployer === undefined).length,
                preferredValue: null // Will be determined based on majority
            },
            
            hasDescription: {
                trueCount: signals.filter(s => s.hasDescription === true).length,
                falseCount: signals.filter(s => s.hasDescription === false).length,
                nullCount: signals.filter(s => s.hasDescription === null || s.hasDescription === undefined).length,
                preferredValue: null
            },
            
            hasSocials: {
                trueCount: signals.filter(s => s.hasSocials === true).length,
                falseCount: signals.filter(s => s.hasSocials === false).length,
                nullCount: signals.filter(s => s.hasSocials === null || s.hasSocials === undefined).length,
                preferredValue: null
            }
        };
        
        // Determine preferred boolean values based on majority
        ['freshDeployer', 'hasDescription', 'hasSocials'].forEach(field => {
            const data = analysis[field];
            if (data.trueCount > data.falseCount) {
                data.preferredValue = true;
            } else if (data.falseCount > data.trueCount) {
                data.preferredValue = false;
            } else {
                data.preferredValue = null; // "Don't Care" for ties
            }
        });
        
        return analysis;
    }

    // Generate the tightest possible configuration from analysis
    function generateTightestConfig(analysis) {
        const config = {
            metadata: {
                generatedAt: new Date().toISOString(),
                basedOnSignals: analysis.totalSignals,
                basedOnTokens: analysis.tokenCount,
                bufferPercent: analysis.bufferPercent,
                outlierMethod: analysis.outlierMethod,
                configType: 'Tightest Generated Config'
            }
        };
        
        // Add cluster information if available
        if (analysis.clusterInfo) {
            config.metadata.clusterInfo = analysis.clusterInfo;
            config.metadata.configType = `Cluster ${analysis.clusterInfo.clusterId} Config`;
        }
        
        // Map analysis results to AGCopilot-Enhanced parameter names
        // Basic Settings
        if (analysis.mcap && analysis.mcap.min !== undefined) {
            config['Min MCAP (USD)'] = analysis.mcap.min;
        }
        if (analysis.mcap && analysis.mcap.tightestMax !== undefined) {
            config['Max MCAP (USD)'] = analysis.mcap.tightestMax;
        } else if (analysis.mcap && analysis.mcap.max !== undefined) {
            config['Max MCAP (USD)'] = analysis.mcap.max;
        }
        
        // AG Score
        if (analysis.agScore && analysis.agScore.min !== undefined) {
            config['Min AG Score'] = analysis.agScore.min;
        }
        
        //
        if (analysis.tokenAge && analysis.tokenAge.max !== undefined && analysis.tokenAge.count > 0) {
            // Only set if max age is reasonable (at least 30 minutes)
            // if (analysis.tokenAge.max >= 180) {
            config['Max Token Age (sec)'] = analysis.tokenAge.max;
            // } else if (analysis.tokenAge.max >= 5) {
            //     config['Max Token Age (sec)'] = 3600; // Set reasonable default (1 hour)
            // }
            // If very young tokens only, don't set this restriction
        }
        if (analysis.tokenAge && analysis.tokenAge.min !== undefined && analysis.tokenAge.count > 0) {
            config['Min Token Age (sec)'] = analysis.tokenAge.min;
        }
        if (analysis.deployerAge && analysis.deployerAge.min !== undefined && analysis.deployerAge.count > 0) {
            config['Min Deployer Age (min)'] = analysis.deployerAge.min;
        }
        
        // Wallet criteria (check for data availability)
        if (analysis.uniqueWallets && analysis.uniqueWallets.min !== undefined && analysis.uniqueWallets.count > 0) {
            config['Min Unique Wallets'] = analysis.uniqueWallets.min;
        }
        if (analysis.uniqueWallets && analysis.uniqueWallets.max !== undefined && analysis.uniqueWallets.count > 0) {
            config['Max Unique Wallets'] = analysis.uniqueWallets.max;
        }
        if (analysis.kycWallets && analysis.kycWallets.min !== undefined && analysis.kycWallets.count > 0) {
            config['Min KYC Wallets'] = analysis.kycWallets.min;
        }
        if (analysis.kycWallets && analysis.kycWallets.max !== undefined && analysis.kycWallets.count > 0) {
            config['Max KYC Wallets'] = analysis.kycWallets.max;
        }
        if (analysis.holders && analysis.holders.min !== undefined && analysis.holders.count > 0) {
            config['Min Holders'] = analysis.holders.min;
        }
        if (analysis.holders && analysis.holders.max !== undefined && analysis.holders.count > 0) {
            config['Max Holders'] = analysis.holders.max;
        }
        
        // Liquidity criteria (check for data availability)
        if (analysis.liquidity && analysis.liquidity.min !== undefined && analysis.liquidity.count > 0) {
            config['Min Liquidity (USD)'] = analysis.liquidity.min;
        }
        if (analysis.liquidity && analysis.liquidity.max !== undefined && analysis.liquidity.count > 0) {
            config['Max Liquidity (USD)'] = analysis.liquidity.max;
        }
        if (analysis.liquidityPct && analysis.liquidityPct.max !== undefined && analysis.liquidityPct.count > 0) {
            // Only set if not too restrictive (at least 20%)
            if (analysis.liquidityPct.max >= 20) {
                config['Max Liquidity %'] = analysis.liquidityPct.max;
            } 
            // else if (analysis.liquidityPct.max >= 5) {
            //     config['Max Liquidity %'] = 50; // Set reasonable default
            // }
        }
        
        // Trading criteria (be more careful with maximums)
        if (analysis.buyVolumePct && analysis.buyVolumePct.min !== undefined && analysis.buyVolumePct.count > 0) {
            config['Min Buy Ratio %'] = analysis.buyVolumePct.min;
        }
        if (analysis.buyVolumePct && analysis.buyVolumePct.max !== undefined && analysis.buyVolumePct.count > 0) {
            // Only set max if it's not too restrictive (at least 80%)
            if (analysis.buyVolumePct.max >= 80) {
                config['Max Buy Ratio %'] = analysis.buyVolumePct.max;
            }
            // Don't set overly restrictive buy ratio maximums
        }
        if (analysis.volMcapPct && analysis.volMcapPct.min !== undefined && analysis.volMcapPct.count > 0) {
            config['Min Vol MCAP %'] = analysis.volMcapPct.min;
        }
        if (analysis.volMcapPct && analysis.volMcapPct.max !== undefined && analysis.volMcapPct.count > 0) {
            config['Max Vol MCAP %'] = analysis.volMcapPct.max;
        }
        
        // Risk criteria (be careful with maximums - don't set if no data or if too restrictive)
        if (analysis.bundledPct && analysis.bundledPct.min !== undefined && analysis.bundledPct.count > 0) {
            config['Min Bundled %'] = analysis.bundledPct.min;
        }
        if (analysis.bundledPct && analysis.bundledPct.max !== undefined && analysis.bundledPct.count > 0) {
            config['Max Bundled %'] = analysis.bundledPct.max;
        }
        
        // Only set Max Drained % if we have actual data AND the max value is reasonable (not too restrictive)
        if (analysis.drainedPct && analysis.drainedPct.max !== undefined && analysis.drainedPct.count > 0) {
            // Don't set if max is too low (would be overly restrictive)
            if (analysis.drainedPct.max >= 5) {
                config['Max Drained %'] = analysis.drainedPct.max;
            }
            // If max is very low (0-5%), consider setting a reasonable limit instead
            else if (analysis.drainedPct.max < 5 && analysis.drainedPct.max >= 0) {
                config['Max Drained %'] = 5; // Set a reasonable default maximum
            }
        }
        
        if (analysis.deployerBalance && analysis.deployerBalance.min !== undefined && analysis.deployerBalance.count > 0) {
            config['Min Deployer Balance (SOL)'] = analysis.deployerBalance.min;
        }
        
        // Boolean criteria
        if (analysis.freshDeployer && analysis.freshDeployer.preferredValue !== undefined) {
            config['Fresh Deployer'] = analysis.freshDeployer.preferredValue;
        }
        if (analysis.hasDescription && analysis.hasDescription.preferredValue !== undefined) {
            config['Description'] = analysis.hasDescription.preferredValue;
        }
        
        // Advanced criteria (check for data availability)
        if (analysis.winPred && analysis.winPred.min !== undefined && analysis.winPred.count > 0) {
            config['Min Win Pred %'] = analysis.winPred.min;
        }
        if (analysis.ttc && analysis.ttc.min !== undefined && analysis.ttc.count > 0) {
            config['Min TTC (sec)'] = analysis.ttc.min;
        }
        if (analysis.ttc && analysis.ttc.max !== undefined && analysis.ttc.count > 0) {
            // Only set max TTC if it's not too restrictive (at least 60 seconds)
            if (analysis.ttc.max >= 60) {
                config['Max TTC (sec)'] = analysis.ttc.max;
            } 
            // else if (analysis.ttc.max >= 10) {
            //     config['Max TTC (sec)'] = 300; // Set reasonable default (5 minutes)
            // }
        }
        
        console.log('Generated config:', config);
        return config;
    }

    // Format config for display or copying (adapted for flat structure)
    function formatConfigForDisplay(config) {
        const lines = [];
        
        // Check if this is a cluster config
        const isClusterConfig = config.metadata && config.metadata.clusterInfo;
        
        if (isClusterConfig) {
            lines.push(`🎯 CLUSTER ${config.metadata.clusterInfo.clusterId} CONFIG`);
            lines.push('═'.repeat(50));
            lines.push(`🔗 ${config.metadata.clusterInfo.clusterName}: ${config.metadata.clusterInfo.description}`);
            lines.push(`🎯 Tightness Score: ${config.metadata.clusterInfo.tightness.toFixed(3)} (lower = tighter)`);
            lines.push(`📏 Distance Threshold: ${config.metadata.clusterInfo.threshold}`);
        } else {
            lines.push('🎯 TIGHTEST GENERATED CONFIG');
            lines.push('═'.repeat(50));
        }
        
        if (config.metadata) {
            const tokenText = config.metadata.basedOnTokens !== undefined ? `${config.metadata.basedOnTokens} tokens` : 'undefined tokens';
            lines.push(`📊 Based on: ${config.metadata.basedOnSignals} signals from ${tokenText}`);
            lines.push(`🛡️ Buffer: ${config.metadata.bufferPercent}%`);
            lines.push(`🎯 Outlier Filter: ${config.metadata.outlierMethod || 'none'}`);
            lines.push(`⏰ Generated: ${new Date(config.metadata.generatedAt).toLocaleString()}`);
        }
        lines.push('');
        
        lines.push('📈 BASIC CRITERIA:');
        if (config['Min MCAP (USD)'] !== undefined || config['Max MCAP (USD)'] !== undefined) {
            const min = config['Min MCAP (USD)'] || 0;
            const max = config['Max MCAP (USD)'] || 'N/A';
            lines.push(`MCAP: $${min} - $${max}`);
        }
        if (config['Min AG Score'] !== undefined) {
            lines.push(`AG Score: ${config['Min AG Score']} - ${config['Max AG Score'] || 100}`);
        }
        if (config['Min Token Age (sec)'] !== undefined || config['Max Token Age (sec)'] !== undefined) {
            const min = config['Min Token Age (sec)'] || 0;
            const max = config['Max Token Age (sec)'] || '∞';
            lines.push(`Token Age: ${min} - ${max} seconds`);
        }
        if (config['Min Deployer Age (min)'] !== undefined) {
            lines.push(`Deployer Age: ${config['Min Deployer Age (min)']} - ∞ minutes`);
        }
        if (config['Min Deployer Balance (SOL)'] !== undefined) {
            lines.push(`Deployer Balance: ${config['Min Deployer Balance (SOL)']} - ∞ SOL`);
        }
        lines.push('');
        
        lines.push('👥 WALLET CRITERIA:');
        if (config['Min Holders'] !== undefined || config['Max Holders'] !== undefined) {
            const min = config['Min Holders'] || 0;
            const max = config['Max Holders'] || '∞';
            lines.push(`Holders: ${min} - ${max}`);
        }
        if (config['Min Unique Wallets'] !== undefined || config['Max Unique Wallets'] !== undefined) {
            const min = config['Min Unique Wallets'] || 0;
            const max = config['Max Unique Wallets'] || '∞';
            lines.push(`Unique Wallets: ${min} - ${max}`);
        }
        if (config['Min KYC Wallets'] !== undefined || config['Max KYC Wallets'] !== undefined) {
            const min = config['Min KYC Wallets'] || 0;
            const max = config['Max KYC Wallets'] || '∞';
            lines.push(`KYC Wallets: ${min} - ${max}`);
        }
        lines.push('');
        
        lines.push('💧 LIQUIDITY CRITERIA:');
        if (config['Min Liquidity (USD)'] !== undefined || config['Max Liquidity (USD)'] !== undefined) {
            const min = config['Min Liquidity (USD)'] || 0;
            const max = config['Max Liquidity (USD)'] || '∞';
            lines.push(`Liquidity: $${min} - $${max}`);
        }
        if (config['Max Liquidity %'] !== undefined) {
            lines.push(`Liquidity %: 0% - ${config['Max Liquidity %']}%`);
        }
        lines.push('');
        
        lines.push('📊 TRADING CRITERIA:');
        if (config['Min Buy Ratio %'] !== undefined || config['Max Buy Ratio %'] !== undefined) {
            const min = config['Min Buy Ratio %'] || 0;
            const max = config['Max Buy Ratio %'] || 100;
            lines.push(`Buy Volume %: ${min}% - ${max}%`);
        }
        if (config['Min Vol MCAP %'] !== undefined || config['Max Vol MCAP %'] !== undefined) {
            const min = config['Min Vol MCAP %'] || 0;
            const max = config['Max Vol MCAP %'] || '∞';
            lines.push(`Vol/MCAP %: ${min}% - ${max}%`);
        }
        lines.push('');
        
        lines.push('⚠️ RISK CRITERIA:');
        if (config['Min Bundled %'] !== undefined || config['Max Bundled %'] !== undefined) {
            const min = config['Min Bundled %'] || 0;
            const max = config['Max Bundled %'] || 100;
            lines.push(`Bundled %: ${min}% - ${max}%`);
        }
        if (config['Max Drained %'] !== undefined) {
            lines.push(`Drained %: 0% - ${config['Max Drained %']}%`);
        }
        lines.push('');
        
        lines.push('🔘 BOOLEAN SETTINGS:');
        const boolToString = (val) => val === null ? "Don't Care" : (val ? "Required" : "Forbidden");
        if (config['Fresh Deployer'] !== undefined) {
            lines.push(`Fresh Deployer: ${boolToString(config['Fresh Deployer'])}`);
        }
        if (config['Description'] !== undefined) {
            lines.push(`Has Description: ${boolToString(config['Description'])}`);
        }
        lines.push('');
        
        lines.push('� ADVANCED CRITERIA:');
        if (config['Min Win Pred %'] !== undefined) {
            lines.push(`Win Prediction: ${config['Min Win Pred %']}% - 100%`);
        }
        if (config['Min TTC (sec)'] !== undefined || config['Max TTC (sec)'] !== undefined) {
            const min = config['Min TTC (sec)'] || 0;
            const max = config['Max TTC (sec)'] || '∞';
            lines.push(`Time to Complete: ${min} - ${max} seconds`);
        }
        lines.push('');
        
        lines.push('�📊 CONFIG SUMMARY:');
        const paramCount = Object.keys(config).filter(key => key !== 'metadata').length;
        lines.push(`Total Parameters Set: ${paramCount}`);
        
        return lines.join('\n');
    }

    // ========================================
    // 💾 CONFIG CACHE (keeping original implementation)
    // ========================================
    class ConfigCache {
        constructor(maxSize = 1000) {
            this.cache = new Map();
            this.maxSize = maxSize;
            this.accessOrder = [];
        }

        generateKey(config) {
            // Create a deterministic string representation by sorting all keys recursively (like original AGCopilot)
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
            const key = this.generateKey(config);
            if (this.cache.has(key)) {
                // Update access order for LRU
                const index = this.accessOrder.indexOf(key);
                if (index > -1) {
                    this.accessOrder.splice(index, 1);
                }
                this.accessOrder.push(key);
                return this.cache.get(key);
            }
            return null;
        }

        set(config, result) {
            const key = this.generateKey(config);
            
            // Remove oldest if at capacity
            if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
                const oldest = this.accessOrder.shift();
                this.cache.delete(oldest);
            }
            
            this.cache.set(key, result);
            
            // Update access order
            const index = this.accessOrder.indexOf(key);
            if (index > -1) {
                this.accessOrder.splice(index, 1);
            }
            this.accessOrder.push(key);
        }

        clear() {
            this.cache.clear();
            this.accessOrder = [];
        }

        size() {
            return this.cache.size;
        }
    }

    // ========================================
    // 🧬 ADVANCED OPTIMIZATION COMPONENTS
    // Latin Hypercube Sampling, Simulated Annealing, and Genetic Algorithms
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
                    const originalRules = PARAM_RULES[param];
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
            updateProgress('🔥 Simulated Annealing Phase', 80, this.optimizer.getCurrentBestScore().toFixed(1), this.optimizer.testCount, this.optimizer.bestMetrics?.totalTokens || '--', this.optimizer.startTime);
            
            let currentConfig = JSON.parse(JSON.stringify(this.optimizer.bestConfig)); // Deep clone
            let currentScore = this.optimizer.getCurrentBestScore();
            let temperature = this.initialTemperature;
            
            while (temperature > this.finalTemperature && this.optimizer.getRemainingTime() > 0.05 && !window.STOPPED) {
                // Generate neighbor configuration
                const neighbor = this.generateNeighbor(currentConfig);
                const result = await this.optimizer.testConfig(neighbor, 'Simulated annealing');
                
                if (result.success && result.metrics) {
                    const neighborScore = CONFIG.USE_ROBUST_SCORING ? 
                        calculateRobustScore(result.metrics)?.score || result.metrics.tpPnlPercent :
                        result.metrics.tpPnlPercent;
                    
                    const deltaE = neighborScore - currentScore;
                    
                    // Accept if better, or with probability if worse
                    if (deltaE > 0 || Math.random() < Math.exp(deltaE / temperature)) {
                        currentConfig = neighbor;
                        currentScore = neighborScore;
                        
                        updateProgress(`🔥 Annealing T=${temperature.toFixed(1)}`, 
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
            const paramList = Object.keys(PARAM_RULES);
            const numModifications = Math.floor(Math.random() * 2) + 1;
            
            for (let i = 0; i < numModifications; i++) {
                const param = paramList[Math.floor(Math.random() * paramList.length)];
                const section = this.optimizer.getSection(param);
                const originalRules = PARAM_RULES[param];
                
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
    }

    // ========================================
    // 🧬 ENHANCED OPTIMIZER CLASS
    // ========================================
    class EnhancedOptimizer {
        constructor(initialConfig = null) {
            this.configCache = new ConfigCache(1000);
            this.bestConfig = null;
            this.bestScore = -Infinity;
            this.bestMetrics = { totalTokens: 0, tpPnlPercent: 0, winRate: 0 }; // Safe defaults instead of null
            this.testCount = 0;
            this.startTime = Date.now();
            this.history = [];
            
            // Store initial configuration to start from
            this.initialConfig = initialConfig;
            
            // Parameter tracking
            this.parameterTests = [];
            
            // Advanced optimization components
            this.latinSampler = new LatinHypercubeSampler();
            this.simulatedAnnealing = new SimulatedAnnealing(this);
            
            // Global stop flag
            window.STOPPED = false;
        }

        getRemainingTime() {
            const elapsed = (Date.now() - this.startTime) / (CONFIG.MAX_RUNTIME_MIN * 60 * 1000);
            return Math.max(0, 1 - elapsed);
        }

        getProgress() {
            return Math.min(100, ((Date.now() - this.startTime) / (CONFIG.MAX_RUNTIME_MIN * 60 * 1000)) * 100);
        }

        getCurrentBestScore() {
            return this.bestScore;
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

        // Update the best configuration display in the UI
        updateBestConfigDisplay() {
            const display = document.getElementById('best-config-display');
            const stats = document.getElementById('best-config-stats');
            
            if (display && stats && this.bestMetrics) {
                display.style.display = 'block';
                
                let scoreDisplay = this.bestScore.toFixed(1);
                let methodDisplay = '';
                
                // Show robust scoring details if available
                if (CONFIG.USE_ROBUST_SCORING && this.bestMetrics.robustScoring) {
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

        // Main test function - uses API call (New: Direct API instead of UI interaction)
        async testConfig(config, testName) {
            if (window.STOPPED) return { success: false };

            try {
                this.testCount++;
                let totalFailures = this.history.filter(h => !h.success).length;
                let rateLimitFailures = this.history.filter(h => !h.success && (
                    h.error?.includes('429') || 
                    h.error?.includes('Rate limit') || 
                    h.error?.includes('rate limit') ||
                    h.reason === 'api_error'
                )).length;
                
                // Update optimization tracker with separate failure counts
                window.optimizationTracker.updateProgress(this.testCount, totalFailures, rateLimitFailures);
                
                // Ensure config is complete before testing
                const completeConfig = ensureCompleteConfig(config);
                
                // Check cache first (if enabled)
                if (CONFIG.USE_CONFIG_CACHING && this.configCache.has(completeConfig)) {
                    const cachedResult = this.configCache.get(completeConfig);
                    console.log(`💾 Cache hit for: ${testName}`);
                    return cachedResult;
                }
                
                // Test via API call (New: much faster and more reliable)
                const result = await testConfigurationAPI(completeConfig, testName);
                
                if (!result.success) {
                    // Determine failure type - distinguish between API errors and threshold rejections
                    const isRateLimitError = result.error?.includes('429') || 
                                           result.error?.includes('Rate limit') || 
                                           result.error?.includes('rate limit') ||
                                           result.source === 'API';
                    
                    // Track failed test with categorization
                    this.history.push({
                        testName,
                        config: completeConfig,
                        success: false,
                        error: result.error,
                        reason: isRateLimitError ? 'api_error' : 'validation_error',
                        testNumber: this.testCount,
                        timestamp: new Date().toISOString()
                    });
                    
                    if (CONFIG.USE_CONFIG_CACHING) {
                        this.configCache.set(completeConfig, result);
                    }
                    return result;
                }

                const metrics = result.metrics;
                
                // Validate metrics
                if (metrics.tpPnlPercent === undefined || (metrics.totalTokens || 0) < CONFIG.MIN_TOKENS) {
                    const failResult = { success: false, reason: 'insufficient_tokens' };
                    
                    // Track failed test
                    this.history.push({
                        testName,
                        config: completeConfig,
                        success: false,
                        reason: 'insufficient_tokens',
                        testNumber: this.testCount,
                        timestamp: new Date().toISOString()
                    });
                    
                    if (CONFIG.USE_CONFIG_CACHING) {
                        this.configCache.set(completeConfig, failResult);
                    }
                    return failResult;
                }

                // Calculate score using robust scoring system (outlier-resistant)
                const robustScoring = calculateRobustScore(metrics);
                if (!robustScoring) {
                    const failResult = { success: false, reason: 'scoring_failed' };
                    
                    // Track failed test
                    this.history.push({
                        testName,
                        config: completeConfig,
                        success: false,
                        reason: 'scoring_failed',
                        testNumber: this.testCount,
                        timestamp: new Date().toISOString()
                    });
                    
                    if (CONFIG.USE_CONFIG_CACHING) {
                        this.configCache.set(completeConfig, failResult);
                    }
                    return failResult;
                }

                let improvement = 0;
                let currentScore = robustScoring.score;
                
                // Store scoring details in metrics for analysis
                metrics.robustScoring = robustScoring;
                metrics.optimizedMetric = CONFIG.USE_ROBUST_SCORING ? 'robustScore' : 'tpPnlPercent';
                metrics.optimizedValue = currentScore;
                
                // PnL optimization mode (default)
                improvement = currentScore - this.bestScore;

                // Update best configuration if improved
                if (improvement > 0) {
                    this.bestConfig = completeConfig;
                    this.bestScore = currentScore;
                    // Ensure metrics has required properties
                    this.bestMetrics = {
                        totalTokens: metrics.totalTokens || 0,
                        tpPnlPercent: metrics.tpPnlPercent || 0,
                        winRate: metrics.winRate || 0,
                        ...metrics // Include all other properties
                    };
                    
                    // Update optimization tracker with current best
                    window.optimizationTracker.setCurrentBest({
                        metrics: { ...metrics, score: currentScore },
                        config: completeConfig
                    }, testName);
                    
                    // Enhanced logging with robust scoring details
                    if (CONFIG.USE_ROBUST_SCORING && metrics.robustScoring) {
                        const rs = metrics.robustScoring;
                        console.log(`🎉 New best! ${testName}:`);
                        console.log(`   📊 Robust Score: ${currentScore.toFixed(1)} (${rs.scoringMethod})`);
                        console.log(`   📈 Raw TP PnL: ${rs.components.rawPnL.toFixed(1)}%`);
                        console.log(`   🎯 Win Rate: ${rs.components.winRate.toFixed(1)}% | Tokens: ${metrics?.totalTokens || 0} | Reliability: ${(rs.components.reliabilityFactor * 100).toFixed(0)}%`);
                    } else {
                        console.log(`🎉 New best! ${testName}: ${currentScore.toFixed(1)}% (${metrics?.totalTokens || 0} tokens)`);
                    }
                    
                    // Update global reference for UI
                    window.currentBestConfig = completeConfig;
                    
                    // Update best config display in UI
                    this.updateBestConfigDisplay();
                    
                    // Add to history
                    this.history.push({
                        testName,
                        config: completeConfig,
                        metrics,
                        success: true,
                        improvement: improvement.toFixed(1),
                        testNumber: this.testCount,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    // Track successful test (even if not improvement)
                    this.history.push({
                        testName,
                        config: completeConfig,
                        metrics,
                        success: true,
                        improvement: 0,
                        testNumber: this.testCount,
                        timestamp: new Date().toISOString()
                    });
                }

                // Cache result
                if (CONFIG.USE_CONFIG_CACHING) {
                    this.configCache.set(completeConfig, result);
                }

                return result;

            } catch (error) {
                console.error(`Error testing config: ${error.message}`);
                return { success: false, error: error.message };
            }
        }

        // Establish baseline from current state
        async establishBaseline() {
            console.log('📊 Establishing baseline configuration...');
            
            let baselineConfig;
            
            // Check if we have an initial configuration from a previous run
            if (this.initialConfig) {
                console.log('🔄 Using previous run\'s best configuration as baseline');
                console.log('🏆 Starting from inherited best config - building on previous progress!');
                baselineConfig = this.initialConfig;
            } else {
                // Check if a preset was selected
                const presetDropdown = document.getElementById('preset-dropdown');
                const hasPresetSelected = presetDropdown && presetDropdown.value && presetDropdown.value !== '';
                
                if (hasPresetSelected) {
                    console.log('📦 Using selected preset as baseline');
                    // Use a simple default configuration when preset is selected
                    baselineConfig = {
                        basic: { "Min MCAP (USD)": 5000, "Max MCAP (USD)": 25000 },
                        tokenDetails: { "Min AG Score": 3, "Max Token Age (sec)": 18000 },
                        wallets: { "Min Unique Wallets": 1, "Max Unique Wallets": 5, "Min KYC Wallets": 1, "Max KYC Wallets": 5 },
                        risk: { "Min Bundled %": 0, "Max Bundled %": 50, "Min Buy Ratio %": 50, "Max Buy Ratio %": 95 },
                        advanced: { "Min TTC (sec)": 10, "Max TTC (sec)": 300, "Max Liquidity %": 80 }
                    };
                    
                    // Apply bundled constraints if enabled
                    if (this.isLowBundledConstraintEnabled()) {
                        console.log('🛡️ Applying low bundled % constraints to baseline');
                        baselineConfig.risk["Max Bundled %"] = 30; // Override only the Max Bundled %
                    }
                } else {
                    console.log('📖 Reading current page settings as baseline');
                    // Read current configuration from the UI
                    baselineConfig = await getCurrentConfigFromUI();
                    
                    // If no meaningful config is found on the page, use default
                    const hasAnyValues = Object.values(baselineConfig).some(section => 
                        Object.values(section).some(value => value !== undefined)
                    );
                    
                    if (!hasAnyValues) {
                        console.log('⚠️ No configuration found on page, using default baseline');
                        baselineConfig = {
                            basic: { "Min MCAP (USD)": 5000, "Max MCAP (USD)": 25000 },
                            tokenDetails: { "Min AG Score": 3, "Max Token Age (sec)": 18000 },
                            wallets: { "Min Unique Wallets": 1, "Max Unique Wallets": 5, "Min KYC Wallets": 1, "Max KYC Wallets": 5 },
                            risk: { "Min Bundled %": 0, "Max Bundled %": 50, "Min Buy Ratio %": 50, "Max Buy Ratio %": 95 },
                            advanced: { "Min TTC (sec)": 10, "Max TTC (sec)": 300, "Max Liquidity %": 80 }
                        };
                        
                        // Apply bundled constraints if enabled
                        if (this.isLowBundledConstraintEnabled()) {
                            console.log('🛡️ Applying low bundled % constraints to fallback baseline');
                            baselineConfig.risk["Max Bundled %"] = 30; // Override only the Max Bundled %
                        }
                    } else {
                        console.log('✅ Using current page settings as baseline configuration');
                    }
                }
            }
            
            const result = await this.testConfig(baselineConfig, 'Baseline');
            
            if (result.success) {
                console.log(`✅ Baseline established: ${this.bestScore.toFixed(1)}% PnL with ${this.bestMetrics?.totalTokens || 0} tokens`);
                // Save the baseline config as the current best config
                window.currentBestConfig = this.bestConfig;
                
                // Ensure optimization tracker shows the baseline as current best
                if (window.optimizationTracker) {
                    window.optimizationTracker.setCurrentBest({
                        metrics: { ...this.bestMetrics, score: this.bestScore },
                        config: this.bestConfig
                    }, this.initialConfig ? 'Inherited Baseline' : 'Baseline');
                }
            } else {
                console.log('❌ Failed to establish baseline - using fallback configuration');
                // Set a fallback baseline if testing failed
                this.bestConfig = baselineConfig;
                this.bestScore = -999; // Very low score to ensure any real result is better
                this.bestMetrics = { totalTokens: 0, tpPnlPercent: -999, winRate: 0 };
                window.currentBestConfig = this.bestConfig;
                
                // Set fallback in optimization tracker too
                if (window.optimizationTracker) {
                    window.optimizationTracker.setCurrentBest({
                        metrics: { ...this.bestMetrics, score: this.bestScore },
                        config: this.bestConfig
                    }, this.initialConfig ? 'Inherited Baseline (Fallback)' : 'Baseline (Fallback)');
                }
            }
            
            updateProgress('✅ Baseline Established', this.getProgress(), this.getCurrentBestScore().toFixed(1), this.testCount, this.bestMetrics?.totalTokens || '--', this.startTime);
        }

        // Helper function to check if low bundled constraint is enabled
        isLowBundledConstraintEnabled() {
            const checkbox = document.getElementById('low-bundled-constraint');
            return checkbox && checkbox.checked;
        }

        // Apply bundled % constraints if enabled
        applyBundledConstraints(param, rules) {
            if (!this.isLowBundledConstraintEnabled()) {
                return rules; // Return original rules if constraint is disabled
            }

            // Apply constraints for bundled % parameters
            if (param === 'Min Bundled %') {
                return {
                    ...rules,
                    min: 0,
                    max: Math.min(5, rules.max), // Force max to be 5% or original max, whichever is lower
                    step: rules.step
                };
            } else if (param === 'Max Bundled %') {
                return {
                    ...rules,
                    min: rules.min,
                    max: Math.min(35, rules.max), // Force max to be 35% or original max, whichever is lower
                    step: rules.step
                };
            }
            
            return rules; // Return original rules for other parameters
        }

        // Validate configuration for min/max conflicts (New: prevents invalid configs)
        validateConfigMinMax(config) {
            const errors = [];
            
            // Define min/max parameter pairs to validate
            const minMaxPairs = [
                ['Min MCAP (USD)', 'Max MCAP (USD)'],
                ['Min Token Age (sec)', 'Max Token Age (sec)'],
                ['Min TTC (sec)', 'Max TTC (sec)'],
                ['Min Unique Wallets', 'Max Unique Wallets'],
                ['Min KYC Wallets', 'Max KYC Wallets'],
                ['Min Holders', 'Max Holders'],
                ['Min Bundled %', 'Max Bundled %'],
                ['Min Buy Ratio %', 'Max Buy Ratio %'],
                ['Min Vol MCAP %', 'Max Vol MCAP %'],
                ['Min Drained %', 'Max Drained %']
            ];
            
            minMaxPairs.forEach(([minParam, maxParam]) => {
                const minVal = this.getParamValue(config, minParam);
                const maxVal = this.getParamValue(config, maxParam);
                
                if (minVal !== undefined && maxVal !== undefined && 
                    !isNaN(minVal) && !isNaN(maxVal) && 
                    parseFloat(minVal) > parseFloat(maxVal)) {
                    errors.push(`${minParam}(${minVal}) > ${maxParam}(${maxVal})`);
                }
            });
            
            return {
                isValid: errors.length === 0,
                errors
            };
        }
        
        // Helper function to get parameter value from nested config
        getParamValue(config, paramName) {
            for (const section of Object.values(config)) {
                if (section && typeof section === 'object' && section[paramName] !== undefined) {
                    return section[paramName];
                }
            }
            return undefined;
        }

        // Generate parameter variations (Enhanced: with validation)
        generateParameterVariations(config, param, section) {
            const originalRules = PARAM_RULES[param];
            if (!originalRules) return [];

            // Apply bundled constraints if enabled
            const rules = this.applyBundledConstraints(param, originalRules);

            // Check if config is valid
            if (!config || !config[section]) {
                console.warn(`⚠️ Invalid config for ${param} in section ${section}`);
                return [];
            }

            const currentValue = config[section]?.[param];
            const variations = [];

            if (rules.type === 'integer') {
                const current = currentValue || Math.floor((rules.min + rules.max) / 2);
                for (let i = rules.min; i <= rules.max; i += rules.step) {
                    if (i !== current) {
                        variations.push(i);
                    }
                }
            } else {
                const current = currentValue || (rules.min + rules.max) / 2;
                const range = rules.max - rules.min;
                const step = rules.step || range * 0.1;

                [
                    Math.max(rules.min, current - step * 2),
                    Math.max(rules.min, current - step),
                    Math.min(rules.max, current + step),
                    Math.min(rules.max, current + step * 2),
                    rules.min,
                    rules.max,
                    Math.floor(rules.min + range * 0.25),
                    Math.floor(rules.min + range * 0.75)
                ].forEach(val => {
                    if (val !== current && !variations.includes(val)) {
                        variations.push(val);
                    }
                });
            }

            return variations.slice(0, 4).map(val => {
                const newConfig = deepClone(config);
                if (param.includes('Wallets') || param.includes('Count') || param.includes('Age') || param.includes('Score')) {
                    val = Math.round(val);
                }
                newConfig[section][param] = val;
                
                // Validate the new configuration for min/max conflicts
                const validation = this.validateConfigMinMax(newConfig);
                if (!validation.isValid) {
                    console.warn(`⚠️ Skipping invalid variation ${param}: ${val} - ${validation.errors.join(', ')}`);
                    return null; // Mark as invalid
                }
                
                return { config: newConfig, name: `${param}: ${val}` };
            }).filter(variation => variation !== null); // Remove invalid variations
        }

        // Main parameter testing phase
        async runParameterPhase() {
            updateProgress('🔄 Phase 1: Parameter Testing', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics?.totalTokens || '--', this.startTime);

            // Check if we have a valid baseline configuration
            if (!this.bestConfig) {
                console.error('❌ Cannot run parameter testing: No baseline configuration established');
                throw new Error('No baseline configuration established');
            }

            const parameters = Object.keys(PARAM_RULES);
            console.log(`🔍 Testing ${parameters.length} parameters:`, parameters.slice(0, 5));
            
            for (const param of parameters) {
                if (window.STOPPED || this.getRemainingTime() <= 0.2) break;

                const section = this.getSection(param);
                const variations = this.generateParameterVariations(this.bestConfig, param, section);
                
                if (!variations || variations.length === 0) {
                    console.log(`⚠️ No variations generated for ${param}`);
                    continue;
                }

                console.log(`🧪 Testing ${variations.length} variations for ${param}`);
                let bestImprovement = 0;
                let testedCount = 0;
                
                for (const variation of variations) {
                    if (window.STOPPED || this.getRemainingTime() <= 0.2) break;

                    const result = await this.testConfig(variation.config, variation.name);
                    testedCount++;
                    
                    if (result.success && result.metrics) {
                        const currentMetric = result.metrics.optimizedValue || result.metrics.tpPnlPercent || result.metrics.athPnlPercent;
                        const improvement = currentMetric - this.bestScore;
                        
                        if (improvement > bestImprovement) {
                            bestImprovement = improvement;
                        }
                        
                        console.log(`  📊 ${variation.name}: ${currentMetric?.toFixed(1)}% (improvement: ${improvement?.toFixed(1)}%)`);
                    } else {
                        console.log(`  ❌ ${variation.name}: Failed`);
                    }
                }

                console.log(`✅ Completed ${param}: tested ${testedCount} variations, best improvement: ${bestImprovement.toFixed(1)}%`);

                // Track parameter effectiveness
                this.parameterTests.push({ param, section, improvement: bestImprovement });

                // Early termination if target achieved
                if (this.bestScore >= CONFIG.TARGET_PNL) {
                    updateProgress('🎯 Target achieved early!', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics?.totalTokens || '--', this.startTime);
                    return;
                }
            }

            // Sort parameters by effectiveness
            this.parameterTests.sort((a, b) => b.improvement - a.improvement);
            console.log('📊 Parameter effectiveness ranking:', this.parameterTests.slice(0, 5));
        }

        // Run full optimization
        async runOptimization() {
            this.startTime = Date.now();
            window.STOPPED = false;

            // Start optimization tracking
            window.optimizationTracker.startOptimization();

            try {
                // Clear cache at start and force fresh start
                this.configCache.clear();
                console.log('💾 Cache cleared at start of optimization');
                
                // Also clear any global cache that might exist
                if (window.globalConfigCache) {
                    window.globalConfigCache.clear();
                    console.log('💾 Global cache also cleared');
                }

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

        // Advanced optimization phases
        async runLatinHypercubePhase() {
            updateProgress('🎲 Latin Hypercube Sampling', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics?.totalTokens || '--', this.startTime);

            // Focus on top parameters for LHS
            const topParams = this.parameterTests.slice(0, 6).map(p => p.param);
            const variations = this.generateLatinHypercubeVariations(this.bestConfig, topParams, 8);

            for (const variation of variations) {
                if (window.STOPPED || this.getRemainingTime() <= 0.3) break;

                const result = await this.testConfig(variation.config, variation.name);
                if (!result.success) continue;

                // Early termination if target achieved
                const targetPnl = parseFloat(document.getElementById('target-pnl')?.value) || 100;
                if (this.bestScore >= targetPnl) {
                    updateProgress('🎯 Target achieved early!', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics?.totalTokens || '--', this.startTime);
                    return;
                }
            }
        }

        async runCorrelatedParameterPhase() {
            updateProgress('🔗 Correlated Parameters', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics?.totalTokens || '--', this.startTime);

            const correlatedVariations = this.generateCorrelatedVariations(this.bestConfig);

            for (const variation of correlatedVariations) {
                if (window.STOPPED || this.getRemainingTime() <= 0.1) break;

                const result = await this.testConfig(variation.config, variation.name);
                if (!result.success) continue;

                // Early termination if target achieved
                const targetPnl = parseFloat(document.getElementById('target-pnl')?.value) || 100;
                if (this.bestScore >= targetPnl) {
                    updateProgress('🎯 Target achieved early!', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics?.totalTokens || '--', this.startTime);
                    return;
                }
            }
        }

        async runMultipleStartingPoints() {
            updateProgress('🚀 Multiple Starting Points', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics?.totalTokens || '--', this.startTime);

            // Use all presets as starting points
            const startingPoints = Object.entries(PRESETS);

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
                    updateProgress('🎯 Target achieved early!', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics?.totalTokens || '--', this.startTime);
                    return;
                }
            }
        }

        async runDeepDive() {
            updateProgress('🔬 Deep Dive Analysis', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics?.totalTokens || '--', this.startTime);

            // Deep dive on top 3 most effective parameters
            const topParams = this.parameterTests.slice(0, 3);
            
            for (const paramTest of topParams) {
                if (window.STOPPED || this.getRemainingTime() <= 0.02) break;

                // Generate more fine-grained variations
                const variations = this.generateParameterVariations(this.bestConfig, paramTest.param, paramTest.section, true);
                
                for (const variation of variations) {
                    if (window.STOPPED) break;
                    await this.testConfig(variation.config, `Deep dive: ${variation.name}`);
                }
            }
        }

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
            const mcapRanges = [
                { min: 1000, max: 15000 },
                { min: 5000, max: 25000 },
                { min: 10000, max: 40000 },
                { min: 3000, max: 20000 }
            ];
            
            for (const range of mcapRanges) {
                const config = JSON.parse(JSON.stringify(baseConfig)); // Deep clone
                config.basic["Min MCAP (USD)"] = range.min;
                config.basic["Max MCAP (USD)"] = range.max;
                variations.push({ 
                    config, 
                    name: `MCAP Range: ${range.min}-${range.max}` 
                });
            }
            
            // Wallet correlation
            const walletRanges = [
                { minUnique: 1, maxUnique: 3, minKyc: 1, maxKyc: 3 },
                { minUnique: 0, maxUnique: 2, minKyc: 0, maxKyc: 2 },
                { minUnique: 2, maxUnique: 5, minKyc: 2, maxKyc: 5 },
                { minUnique: 1, maxUnique: 4, minKyc: 1, maxKyc: 4 }
            ];
            
            for (const range of walletRanges) {
                const config = JSON.parse(JSON.stringify(baseConfig)); // Deep clone
                config.wallets["Min KYC Wallets"] = range.minKyc;
                config.wallets["Max KYC Wallets"] = range.maxKyc;
                config.wallets["Min Unique Wallets"] = range.minUnique;
                config.wallets["Max Unique Wallets"] = range.maxUnique;
                config.wallets["Min Holders"] = range.minHolders;
                config.wallets["Max Holders"] = range.maxHolders;
                variations.push({ 
                    config, 
                    name: `Wallets: U${range.minUnique}-${range.maxUnique} K${range.minKyc}-${range.maxKyc}` 
                });
            }
            
            return variations;
        }
    }

    // ========================================
    // 🔗 CHAINED OPTIMIZER CLASS
    // ========================================
    class ChainedOptimizer {
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

        async runChainedOptimization(runCount = 3, timePerRunMin = 15) {
            this.totalRuns = runCount;
            this.timePerRun = timePerRunMin;
            this.chainStartTime = Date.now();
            
            // Start optimization tracking
            window.optimizationTracker.startOptimization();
            
            console.log(`🔗 Starting chained optimization: ${runCount} runs × ${timePerRunMin} minutes each`);
            updateProgress(`🔗 Chained Optimization: Run 0/${runCount}`, 0, 0, 0, '--', this.chainStartTime);
            
            for (let run = 1; run <= runCount; run++) {
                if (window.STOPPED) {
                    console.log(`⏹️ Chained optimization stopped at run ${run}/${runCount}`);
                    break;
                }

                this.currentRun = run;
                const runStartTime = Date.now();
                
                console.log(`\n🔗 === CHAIN RUN ${run}/${runCount} ===`);
                updateProgress(`🔗 Chain Run ${run}/${runCount} Starting`, 
                    ((run - 1) / runCount) * 100, 
                    this.globalBestScore === -Infinity ? 0 : this.globalBestScore.toFixed(1), 
                    this.totalTestCount, 
                    this.globalBestMetrics?.totalTokens || '--', 
                    this.chainStartTime
                );

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
                    const originalRuntime = CONFIG.MAX_RUNTIME_MIN;
                    CONFIG.MAX_RUNTIME_MIN = timePerRunMin;
                    
                    // Run optimization
                    const runResults = await optimizer.runOptimization();
                    
                    // Restore original runtime setting
                    CONFIG.MAX_RUNTIME_MIN = originalRuntime;
                    
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
                    updateProgress(`🔗 Run ${run}/${runCount} Complete`, 
                        chainProgress, 
                        this.globalBestScore.toFixed(1), 
                        this.totalTestCount, 
                        this.globalBestMetrics?.totalTokens || '--', 
                        this.chainStartTime
                    );
                    
                    // Early termination if target achieved
                    const targetPnl = parseFloat(document.getElementById('target-pnl')?.value) || 100;
                    if (this.globalBestScore >= targetPnl) {
                        console.log(`🎯 Target ${targetPnl}% achieved in run ${run}! Stopping chain early.`);
                        break;
                    }
                    
                    // Brief pause between runs (let UI update)
                    if (run < runCount && !window.STOPPED) {
                        await sleep(1000);
                    }
                    
                } catch (error) {
                    console.error(`❌ Run ${run} failed:`, error);
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
                    console.log(`🚀 Knowledge Accumulation: Started at ${firstRunScore.toFixed(1)}%, ended at ${finalScore.toFixed(1)}% (+${improvement.toFixed(1)}% improvement through chaining)`);
                } else {
                    console.log(`📊 Knowledge Accumulation: Each run started from best known config (${finalScore.toFixed(1)}% maintained)`);
                }
            }
            
            if (sortedRuns.length > 0) {
                console.log(`\n🏆 TOP RESULTS:`);
                sortedRuns.slice(0, 3).forEach((run, index) => {
                    const rank = index + 1;
                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
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
            const display = document.getElementById('best-config-display');
            const stats = document.getElementById('best-config-stats');
            
            if (display && stats && this.globalBestMetrics) {
                display.style.display = 'block';
                
                let scoreDisplay = this.globalBestScore.toFixed(1);
                let methodDisplay = '';
                
                // Show robust scoring details if available
                if (CONFIG.USE_ROBUST_SCORING && this.globalBestMetrics.robustScoring) {
                    const rs = this.globalBestMetrics.robustScoring;
                    scoreDisplay = `${this.globalBestScore.toFixed(1)} (Robust)`;
                    methodDisplay = `<div style="font-size: 10px; opacity: 0.8;">Raw: ${rs.components.rawPnL.toFixed(1)}% | Reliability: ${(rs.components.reliabilityFactor * 100).toFixed(0)}%</div>`;
                }
                
                stats.innerHTML = `
                    <div><strong>🔗 Chain Best:</strong> ${scoreDisplay} | <strong>Tokens:</strong> ${this.globalBestMetrics.totalTokens} | <strong>Win Rate:</strong> ${this.globalBestMetrics.winRate?.toFixed(1)}%</div>
                    ${methodDisplay}
                    <div><strong>Runs:</strong> ${this.currentRun}/${this.totalRuns} | <strong>Total Tests:</strong> ${this.totalTestCount} | <strong>Runtime:</strong> ${Math.floor((Date.now() - this.chainStartTime) / 1000)}s</div>
                `;
            }
        }
    }

    // Simple connectivity test (no longer needed)
    async function testConnectivity() {
        // Just test that we can interact with the UI
        try {
            const testConfig = {
                basic: { "Min MCAP (USD)": 5000 }
            };
            
            return {
                success: true,
                message: 'UI interaction ready'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Function to read current field value from the UI
    function getFieldValue(labelText) {
        try {
            // Find the label using the same approach as setFieldValue
            const labels = Array.from(document.querySelectorAll('.sidebar-label'));
            const label = labels.find(el => el.textContent.trim() === labelText);

            if (!label) {
                return undefined;
            }

            let container = label.closest('.form-group') || label.parentElement;

            // Navigate up the DOM tree to find the input container
            if (!container.querySelector('input[type="number"]') && !container.querySelector('select')) {
                container = container.parentElement;
                if (!container.querySelector('input[type="number"]') && !container.querySelector('select')) {
                    container = container.parentElement;
                }
            }

            // Handle number inputs
            const input = container.querySelector('input[type="number"]');
            if (input) {
                const value = input.value.trim();
                if (value === '' || value === null) {
                    return undefined;
                }
                return parseFloat(value);
            }

            // Handle select dropdowns
            const select = container.querySelector('select');
            if (select) {
                const value = select.value;
                if (value === '' || select.selectedIndex === 0) {
                    return undefined;
                }
                return value;
            }

            // Handle toggle buttons
            const button = container.querySelector('button');
            if (button && (labelText === "Description" || labelText === "Fresh Deployer")) {
                const currentValue = button.textContent.trim();
                // Preserve all toggle states including "Don't care"
                if (currentValue === "Don't care") {
                    return null; // null represents "Don't care" state
                }
                if (currentValue === "Yes") {
                    return true;
                }
                if (currentValue === "No") {
                    return false;
                }
                return currentValue; // Fallback for any other text
            }

            return undefined;
        } catch (error) {
            console.warn(`Error reading field ${labelText}:`, error.message);
            return undefined;
        }
    }

    // Function to read current configuration from the UI
    async function getCurrentConfigFromUI() {
        console.log('📖 Reading current configuration from UI...');
        
        const config = {
            basic: {},
            tokenDetails: {},
            wallets: {},
            risk: {},
            advanced: {}
        };

        // Define the section mapping and parameters for each section
        const sections = {
            basic: {
                sectionTitle: 'Basic',
                params: ['Min MCAP (USD)', 'Max MCAP (USD)']
            },
            tokenDetails: {
                sectionTitle: 'Token Details',
                params: ['Min AG Score', 'Min Token Age (sec)', 'Max Token Age (sec)', 'Min Deployer Age (min)']
            },
            wallets: {
                sectionTitle: 'Wallets',
                params: ['Min Unique Wallets', 'Max Unique Wallets', 'Min KYC Wallets', 'Max KYC Wallets', 'Min Holders', 'Max Holders']
            },
            risk: {
                sectionTitle: 'Risk',
                params: ['Min Bundled %', 'Max Bundled %', 'Min Deployer Balance (SOL)', 'Min Buy Ratio %', 'Max Buy Ratio %', 'Min Vol MCAP %', 'Max Vol MCAP %', 'Max Drained %', 'Max Drained Count', 'Description', 'Fresh Deployer']
            },
            advanced: {
                sectionTitle: 'Advanced',
                params: ['Min TTC (sec)', 'Max TTC (sec)', 'Max Liquidity %', 'Min Win Pred %']
            }
        };

        let fieldsRead = 0;
        let fieldsWithValues = 0;

        // Read each section
        for (const [sectionKey, sectionInfo] of Object.entries(sections)) {
            console.log(`📖 Reading section: ${sectionInfo.sectionTitle}`);
            
            // Open the section first
            const sectionOpened = await openSection(sectionInfo.sectionTitle);
            if (!sectionOpened) {
                console.warn(`⚠️ Could not open section: ${sectionInfo.sectionTitle}`);
                continue;
            }
            
            // Wait for section to fully open
            await sleep(300);
            
            // Read each parameter in the section
            for (const param of sectionInfo.params) {
                fieldsRead++;
                const value = getFieldValue(param);
                config[sectionKey][param] = value;
                
                if (value !== undefined) {
                    fieldsWithValues++;
                } 
                
                // Small delay between field reads
                await sleep(50);
            }
            
            // Delay between sections
            await sleep(200);
        }

        console.log(`📖 Read ${fieldsRead} fields from UI, ${fieldsWithValues} have values set`);
        return config;
    }
    
    // UI interaction functions to apply configs to the backtester form (based on original AGCopilot)
    async function setFieldValue(labelText, value, maxRetries = 2) {
        const shouldClear = (value === undefined || value === null || value === "" || value === "clear");

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Find the label using the original AGCopilot approach
                const labels = Array.from(document.querySelectorAll('.sidebar-label'));
                const label = labels.find(el => el.textContent.trim() === labelText);

                if (!label) {
                    console.warn(`Label not found: ${labelText}`);
                    return false;
                }

                let container = label.closest('.form-group') || label.parentElement;

                // Handle toggle buttons FIRST (Description and Fresh Deployer) before DOM navigation
                if (labelText === "Description" || labelText === "Fresh Deployer") {
                    // Look for toggle button specifically in the label's immediate area
                    let toggleButton = container.querySelector('button');
                    
                    // If not found, try searching in parent containers but only for toggle buttons
                    if (!toggleButton) {
                        let searchContainer = container.parentElement;
                        let searchDepth = 0;
                        while (searchContainer && searchDepth < 3) {
                            toggleButton = searchContainer.querySelector('button');
                            // Ensure we found a toggle button and not a clear button (×)
                            if (toggleButton && toggleButton.textContent.trim() !== '×') {
                                break;
                            }
                            toggleButton = null;
                            searchContainer = searchContainer.parentElement;
                            searchDepth++;
                        }
                    }
                    
                    if (toggleButton && toggleButton.textContent.trim() !== '×') {
                        const targetValue = value || "Don't care";
                        const currentValue = toggleButton.textContent.trim();
                        
                        if (currentValue !== targetValue) {
                            toggleButton.click();
                            await sleep(100);

                            const newValue = toggleButton.textContent.trim();
                            if (newValue !== targetValue && newValue !== currentValue) {
                                toggleButton.click();
                                await sleep(100);
                            }
                        }
                        return true;
                    } else {
                        console.warn(`Toggle button not found for ${labelText}`);
                        return false; // Early return to prevent fallthrough to number input logic
                    }
                }

                // Navigate up the DOM tree to find the input container (only for non-toggle fields)
                if (!container.querySelector('input[type="number"]') && !container.querySelector('select')) {
                    container = container.parentElement;
                    if (!container.querySelector('input[type="number"]') && !container.querySelector('select')) {
                        container = container.parentElement;
                    }
                }

                // Handle number inputs
                const input = container.querySelector('input[type="number"]');
                if (input) {
                    if (shouldClear) {
                        // Look for clear button (×)
                        const relativeContainer = input.closest('.relative');
                        const clearButton = relativeContainer?.querySelector('button');
                        if (clearButton && clearButton.textContent.trim() === '×') {
                            clearButton.click();
                            await sleep(100);
                        } else {
                            // Manual clear
                            input.focus();
                            input.value = '';
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                            input.blur();
                        }
                    } else {
                        let processedValue = value;

                        // Type conversion
                        if (typeof value === 'string' && value.trim() !== '') {
                            const parsed = parseFloat(value);
                            if (!isNaN(parsed)) {
                                processedValue = parsed;
                            }
                        }

                        // Force integer rounding for specific parameters
                        if (labelText.includes('Wallets') || labelText.includes('Count') || labelText.includes('Age') || labelText.includes('Score')) {
                            processedValue = Math.round(processedValue);
                        }

                        if ((typeof processedValue === 'number' && !isNaN(processedValue)) ||
                            (typeof processedValue === 'string' && processedValue.trim() !== '')) {
                            
                            input.focus();
                            
                            // Use React-compatible value setting
                            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                            nativeInputValueSetter.call(input, processedValue);

                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                            input.blur();
                        }
                    }
                    return true;
                }

                // Handle select dropdowns
                const select = container.querySelector('select');
                if (select) {
                    if (shouldClear) {
                        select.selectedIndex = 0;
                    } else {
                        select.value = value;
                    }
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    return true;
                }

                await sleep(200); // Wait before retry
                
            } catch (error) {
                console.warn(`Attempt ${attempt} failed for ${labelText}:`, error.message);
                if (attempt < maxRetries) {
                    await sleep(200);
                }
            }
        }
        return false;
    }

    // Open section helper
    async function openSection(sectionTitle) {
        const allHeaders = Array.from(document.querySelectorAll('button[type="button"]'));
        const sectionHeader = allHeaders.find(header =>
            header.textContent.includes(sectionTitle)
        );

        if (sectionHeader) {
            sectionHeader.click();
            await sleep(200); // Wait for section to open
            return true;
        }
        return false;
    }

    // Apply configuration to the backtester UI (based on original AGCopilot)
    async function applyConfigToUI(config, skipStopCheck = false) {
        if (!config) {
            updateStatus('❌ No configuration to apply', true);
            return false;
        }

        updateStatus('⚙️ Applying configuration to backtester UI...');
        
        const sectionMap = {
            basic: 'Basic',
            tokenDetails: 'Token Details',
            wallets: 'Wallets',
            risk: 'Risk',
            advanced: 'Advanced'
        };

        let successCount = 0;
        let totalFields = 0;

        try {
            // Apply each section of the configuration
            for (const [section, sectionConfig] of Object.entries(config)) {
                // Only check stop flag if we're in optimization mode (not manual apply)
                if (!skipStopCheck && window.STOPPED) {
                    console.log('⏹️ Optimization stopped during config application');
                    return false;
                }
                
                if (sectionConfig && typeof sectionConfig === 'object') {
                    const sectionName = sectionMap[section];
                    
                    // Open the section first
                    if (sectionName) {
                        await openSection(sectionName);
                        await sleep(300); // Wait for section to fully open
                    }

                    // Apply each field in the section
                    for (const [param, value] of Object.entries(sectionConfig)) {
                        if (window.STOPPED) {
                            console.log('⏹️ Optimization stopped during field application');
                            return false;
                        }
                        
                        // Apply ALL fields, including undefined ones (for clearing)
                        totalFields++;
                        const success = await setFieldValue(param, value);
                        if (success) {
                            successCount++;
                        } 
                        
                        // Delay between field updates to avoid issues
                        await sleep(150);
                    }
                    
                    // Delay between sections
                    await sleep(200);
                }
            }

            const successRate = totalFields > 0 ? (successCount / totalFields * 100) : 0;
            updateStatus(`⚙️ Applied ${successCount}/${totalFields} fields (${successRate.toFixed(1)}% success rate)`);
            
            if (successRate > 70) {
                updateStatus('✅ Configuration successfully applied to UI!');
                return true;
            } else {
                updateStatus('⚠️ Configuration partially applied - some fields may not have been found', true);
                return false;
            }

        } catch (error) {
            updateStatus(`❌ Error applying configuration: ${error.message}`, true);
            return false;
        }
    }
    
    // Apply preset configuration
    async function applyPreset(presetName) {
        const preset = PRESETS[presetName];
        if (!preset) {
            updateStatus(`❌ Preset '${presetName}' not found`, true);
            return;
        }

        updateStatus(`📦 Applying preset: ${presetName}...`);
        const completePreset = ensureCompleteConfig(preset);
        const success = await applyConfigToUI(completePreset, true); // Skip stop check for manual preset application
        
        if (success) {
            updateStatus(`✅ Preset ${presetName} applied to UI successfully!`);
            // Test it to show the results
            updateStatus('📊 Testing preset configuration...');
            const result = await testConfigurationAPI(preset, `Preset: ${presetName}`);
            if (result.success) {
                updateStatus(`📊 Preset results: ${result.metrics.totalTokens} tokens, ${result.metrics.tpPnlPercent?.toFixed(1)}% TP PnL`);
            }
        } else {
            updateStatus(`❌ Failed to apply preset ${presetName} to UI`, true);
        }
    }

    // Apply configuration from clipboard to UI
    async function applyConfigFromClipboard() {
        try {
            const clipboardText = await navigator.clipboard.readText();
            const config = JSON.parse(clipboardText);
            
            // Validate that it's a proper configuration
            if (config && typeof config === 'object' && (config.basic || config.tokenDetails || config.wallets || config.risk || config.advanced)) {
                updateStatus('📋 Applying configuration from clipboard to UI...');
                const completeConfig = ensureCompleteConfig(config);
                const success = await applyConfigToUI(completeConfig, true); // Skip stop check for manual clipboard application
                
                if (success) {
                    updateStatus('✅ Clipboard configuration applied to UI successfully!');
                    // Test it to show the results
                    updateStatus('📊 Testing clipboard configuration...');
                    const result = await testConfigurationAPI(config, 'Clipboard Config');
                    if (result.success) {
                        updateStatus(`📊 Clipboard config results: ${result.metrics.totalTokens} tokens, ${result.metrics.tpPnlPercent?.toFixed(1)}% TP PnL`);
                    }
                } else {
                    updateStatus('❌ Failed to apply clipboard configuration to UI', true);
                }
            } else {
                updateStatus('❌ Invalid configuration format in clipboard', true);
            }
        } catch (error) {
            updateStatus('❌ Failed to read/parse clipboard configuration', true);
        }
    }

    // ========================================
    // 🎨 UI FUNCTIONS
    // ========================================
    
    // Generate preset dropdown options dynamically from PRESETS object
    function generatePresetOptions() {
        let options = '<option value="">-- Select a Preset --</option>';
        
        // Add all presets from PRESETS object
        Object.keys(PRESETS).forEach(presetKey => {
            // Create display names with emojis for better UX
            const displayName = getPresetDisplayName(presetKey);
            options += `<option value="${presetKey}">${displayName}</option>`;
        });
        
        return options;
    }
    
    function getPresetDisplayName(presetKey) {
        let displayName = presetKey
            .replace(/([A-Z])/g, ' $1') // Add space before capital letters
            .replace(/([0-9]+)/g, ' $1') // Add space before numbers
            .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
            .trim();
            
        // Add a default emoji for unmapped presets
        return `${displayName}`;
    }
    
    function createUI() {
        // Remove existing UI
        const existingUI = document.getElementById('ag-copilot-enhanced-ui');
        if (existingUI) {
            existingUI.remove();
        }

        const ui = document.createElement('div');
        ui.id = 'ag-copilot-enhanced-ui';
        ui.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 420px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: 2px solid #fff;
            border-radius: 15px;
            padding: 20px;
            z-index: 10000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: white;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            max-height: 90vh;
            overflow-y: auto;
        `;

        ui.innerHTML = `
            <div id="ui-header" style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <div style="flex: 1; text-align: center;">
                        <h3 style="margin: 0; font-size: 18px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                            🤖 AG Co-Pilot Enhanced
                        </h3>
                    </div>
                    <button id="collapse-ui-btn" style="
                        background: rgba(255,255,255,0.2); 
                        border: 1px solid rgba(255,255,255,0.4); 
                        border-radius: 6px; 
                        color: white; 
                        cursor: pointer; 
                        padding: 6px 10px; 
                        font-size: 12px;
                        font-weight: bold;
                        transition: all 0.2s;
                        margin-left: 10px;
                    " onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
                       onmouseout="this.style.background='rgba(255,255,255,0.2)'"
                       title="Collapse to small box">
                        ➖
                    </button>
                </div>
            </div>
            
            <div id="ui-content">
            <!-- Configuration & Optimization Section -->
            <div style="margin-bottom: 20px; border-top: 1px solid rgba(255,255,255,0.3); padding-top: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h4 style="margin: 0; font-size: 14px; opacity: 0.9;">⚙️ Configuration & Optimization</h4>
                    <button id="toggle-config-section" style="
                        background: rgba(255,255,255,0.1); 
                        border: 1px solid rgba(255,255,255,0.3); 
                        border-radius: 4px; 
                        color: white; 
                        cursor: pointer; 
                        padding: 4px 8px; 
                        font-size: 10px;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='rgba(255,255,255,0.2)'" 
                       onmouseout="this.style.background='rgba(255,255,255,0.1)'">
                        ➖ Hide
                    </button>
                </div>
                <div id="config-section-content">
                
                <!-- Presets and Trigger Mode -->
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px; margin-bottom: 10px;">
                    <div>
                        <label style="font-size: 12px; font-weight: bold; margin-bottom: 3px; display: block;">Quick Presets:</label>
                        <select id="preset-dropdown" style="width: 100%; padding: 6px; border: none; border-radius: 4px; font-size: 11px; color: black; background: white;">
                            ${generatePresetOptions()}
                        </select>
                    </div>
                    <div>
                        <label style="font-size: 12px; font-weight: bold; margin-bottom: 3px; display: block;">Trigger Mode:</label>
                        <select id="trigger-mode-select" style="width: 100%; padding: 6px; border: none; border-radius: 4px; font-size: 11px; color: black; background: white;">
                            <option value="0">Bullish Bonding</option>
                            <option value="1">God Mode</option>
                            <option value="2">Moon Finder</option>
                            <option value="3">Fomo</option>
                            <option value="4" selected>Launchpads</option>
                            <option value="5">Smart Tracker</option>
                        </select>
                    </div>
                </div>
                
                <!-- Optimization settings in compact grid -->
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 10px;">
                    <label style="display: flex; flex-direction: column;">
                        <span style="font-size: 11px; font-weight: bold; margin-bottom: 3px;">Target PnL %:</span>
                        <input type="number" id="target-pnl" value="100" min="5" max="50" step="0.5"
                               style="padding: 5px; border: 1px solid white; border-radius: 3px; font-size: 11px; text-align: center;">
                    </label>
                    <label style="display: flex; flex-direction: column;">
                        <span style="font-size: 11px; font-weight: bold; margin-bottom: 3px;">Min Tokens:</span>
                        <input type="number" id="min-tokens" value="75" min="1" max="100" step="1"
                               style="padding: 5px; border: 1px solid white; border-radius: 3px; font-size: 11px; text-align: center;">
                    </label>
                    <label style="display: flex; flex-direction: column;">
                        <span style="font-size: 11px; font-weight: bold; margin-bottom: 3px;">Runtime (min):</span>
                        <input type="number" id="runtime-min" value="15" min="5" max="120" step="5"
                               style="padding: 5px; border: 1px solid white; border-radius: 3px; font-size: 11px; text-align: center;">
                    </label>
                    <label style="display: flex; flex-direction: column;">
                        <span style="font-size: 11px; font-weight: bold; margin-bottom: 3px;">Runs:</span>
                        <input type="number" id="chain-run-count" value="50" min="1" max="100" step="1"
                               style="padding: 5px; border: 1px solid white; border-radius: 3px; font-size: 11px; text-align: center;">
                    </label>
                </div>
                
                <!-- Advanced Optimization Features -->
                <div style="margin-bottom: 10px; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 4px;">
                    <div style="font-size: 11px; font-weight: bold; margin-bottom: 5px; color: #4ECDC4;">🚀 Optimization Methods:</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 10px;">
                        <label style="display: flex; align-items: center; cursor: pointer;" title="Uses statistical methods to reduce impact of outlier data points">
                            <input type="checkbox" id="robust-scoring" checked style="margin-right: 5px; transform: scale(1.0);">
                            <span style="font-weight: bold;">🛡️ Outlier-Resistant</span>
                        </label>
                        <label style="display: flex; align-items: center; cursor: pointer;" title="Advanced optimization technique that accepts worse solutions occasionally to escape local optima">
                            <input type="checkbox" id="simulated-annealing" checked style="margin-right: 5px; transform: scale(1.0);">
                            <span style="font-weight: bold;">🔥 Simulated Annealing</span>
                        </label>
                        <label style="display: flex; align-items: center; cursor: pointer;" title="Tests all available presets as starting points for comprehensive coverage">
                            <input type="checkbox" id="multiple-starting-points" style="margin-right: 5px; transform: scale(1.0);">
                            <span style="font-weight: bold;">🎯 Multiple Starts</span>
                        </label>
                        <label style="display: flex; align-items: center; cursor: pointer;" title="Statistical sampling method that ensures even distribution across parameter space">
                            <input type="checkbox" id="latin-hypercube" checked style="margin-right: 5px; transform: scale(1.0);">
                            <span style="font-weight: bold;">📐 Latin Hypercube</span>
                        </label>
                        <label style="display: flex; align-items: center; cursor: pointer;" title="Tests related parameters together (e.g., min/max MCAP, wallet counts) for better combinations">
                            <input type="checkbox" id="correlated-params" checked style="margin-right: 5px; transform: scale(1.0);">
                            <span style="font-weight: bold;">🔗 Correlated Params</span>
                        </label>
                        <label style="display: flex; align-items: center; cursor: pointer;" title="Fine-grained testing of the most effective parameters with smaller increments">
                            <input type="checkbox" id="deep-dive" checked style="margin-right: 5px; transform: scale(1.0);">
                            <span style="font-weight: bold;">🔬 Deep Dive</span>
                        </label>
                    </div>
                    <div style="font-size: 8px; opacity: 0.7; margin-top: 4px; line-height: 1.2;">
                        💡 Advanced optimization phases for parameter exploration. Hover over options for details.
                    </div>
                    
                    <!-- Low Bundled % Constraint -->
                    <div style="margin-top: 8px; padding: 6px; background: rgba(255,215,0,0.15); border: 1px solid rgba(255,215,0,0.3); border-radius: 4px;">
                        <label style="display: flex; align-items: center; cursor: pointer;" title="Forces Min Bundled % < 5% and Max Bundled % < 35% during optimization">
                            <input type="checkbox" id="low-bundled-constraint" checked style="margin-right: 5px; transform: scale(1.0);">
                            <span style="font-weight: bold; font-size: 11px; color: #FFD700;">🛡️ Low Bundled % Constraint</span>
                        </label>
                        <div style="font-size: 8px; opacity: 0.8; margin-top: 2px; line-height: 1.2;">
                            Forces Min Bundled % &lt; 5% and Max Bundled % &lt; 35% during optimization
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Control Buttons -->
            <div style="margin-bottom: 15px;">
                <button id="start-optimization" style="
                    width: 100%; 
                    padding: 12px; 
                    background: linear-gradient(45deg, #FF6B6B, #4ECDC4); 
                    border: none; 
                    border-radius: 8px; 
                    color: white; 
                    font-weight: bold; 
                    cursor: pointer;
                    font-size: 14px;
                    transition: transform 0.2s;
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    🚀 Start Enhanced Optimization
                </button>
            </div>
            
            <div style="margin-bottom: 15px;">
                <button id="stop-optimization" style="
                    width: 100%; 
                    padding: 8px; 
                    background: rgba(255,255,255,0.2); 
                    border: 1px solid rgba(255,255,255,0.3); 
                    border-radius: 8px; 
                    color: white; 
                    font-weight: bold; 
                    cursor: pointer;
                    font-size: 12px;
                    display: none;
                ">
                    ⏹️ Stop Optimization
                </button>
            </div>
            
            <!-- Results Section -->
            <div id="best-config-display" style="
                background: rgba(76, 175, 80, 0.2); 
                border: 1px solid rgba(76, 175, 80, 0.4); 
                border-radius: 5px; 
                padding: 10px; 
                margin-bottom: 15px;
                display: none;
            ">
                <h5 style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #4CAF50;">🏆 Best Configuration Found:</h5>
                <div id="best-config-stats" style="font-size: 11px; margin-bottom: 8px;"></div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <button onclick="applyBestConfigToUI()" style="padding: 8px; background: rgba(33, 150, 243, 0.3); border: 1px solid rgba(33, 150, 243, 0.6); border-radius: 4px; color: white; font-size: 11px; cursor: pointer;">⚙️ Apply to UI</button>
                    <button onclick="copyBestConfigToClipboard()" style="padding: 8px; background: rgba(156, 39, 176, 0.3); border: 1px solid rgba(156, 39, 176, 0.6); border-radius: 4px; color: white; font-size: 11px; cursor: pointer;">📋 Copy Config</button>
                </div>
                </div> <!-- End config-section-content -->
            </div>
            
            <!-- Signal Analysis Section -->
            <div style="margin-bottom: 20px; border-top: 1px solid rgba(255,255,255,0.3); padding-top: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h4 style="margin: 0; font-size: 14px; opacity: 0.9;">🔍 Signal Analysis & Config generation</h4>
                    <button id="toggle-signal-section" style="
                        background: rgba(255,255,255,0.1); 
                        border: 1px solid rgba(255,255,255,0.3); 
                        border-radius: 4px; 
                        color: white; 
                        cursor: pointer; 
                        padding: 4px 8px; 
                        font-size: 10px;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='rgba(255,255,255,0.2)'" 
                       onmouseout="this.style.background='rgba(255,255,255,0.1)'">
                        ➖ Hide
                    </button>
                </div>
                <div id="signal-section-content">
                
                <!-- Contract input more compact -->
                <textarea id="signal-contract-input" placeholder="Contract addresses (one per line)..." 
                       style="width: 100%; padding: 6px; border: none; border-radius: 4px; font-size: 11px; height: 50px; resize: vertical; color: black; margin-bottom: 8px;">
                </textarea>
                <div style="font-size: 9px; opacity: 0.7; margin-bottom: 8px;">
                    💡 Analyze successful signals to generate optimal configs
                </div>
                
                <!-- Settings in one compact row -->
                <div style="display: grid; grid-template-columns: auto auto 1fr auto; gap: 8px; align-items: end; margin-bottom: 8px; font-size: 10px;">
                    <div>
                        <label style="display: block; margin-bottom: 2px; font-weight: bold;">Signals/Token:</label>
                        <input type="number" id="signals-per-token" value="6" min="1" max="999" 
                               style="width: 50px; padding: 3px; border: 1px solid white; border-radius: 3px; font-size: 10px; text-align: center;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 2px; font-weight: bold;">Buffer %:</label>
                        <input type="number" id="config-buffer" value="10" min="0" max="50" 
                               style="width: 45px; padding: 3px; border: 1px solid white; border-radius: 3px; font-size: 10px; text-align: center;">
                    </div>
                    <div>
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="enable-signal-clustering" checked style="margin-right: 4px; transform: scale(0.9);">
                            <span style="font-size: 10px; font-weight: bold;">🎯 Clustering</span>
                        </label>
                    </div>
                    <button id="analyze-signals-btn" style="
                        padding: 6px 12px; 
                        background: linear-gradient(45deg, #28a745, #20c997); 
                        border: none; 
                        border-radius: 4px; 
                        color: white; 
                        font-weight: bold; 
                        cursor: pointer;
                        font-size: 11px;
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        🔍 Analyze
                    </button>
                </div>
                
                <!-- Outlier filtering more compact -->
                <div style="margin-bottom: 8px;">
                    <label style="display: block; margin-bottom: 3px; font-weight: bold; font-size: 10px;">Outlier Filter:</label>
                    <div style="background: rgba(0,0,0,0.2); border-radius: 4px; padding: 4px; display: flex; gap: 5px; flex-wrap: wrap;">
                        <label style="display: flex; align-items: center; cursor: pointer; flex: 1; min-width: 50px;">
                            <input type="radio" name="signal-outlier-filter" id="signal-outlier-none" value="none" style="margin-right: 2px;">
                            <span style="font-size: 9px;">None</span>
                        </label>
                        <label style="display: flex; align-items: center; cursor: pointer; flex: 1; min-width: 50px;">
                            <input type="radio" name="signal-outlier-filter" id="signal-outlier-iqr" value="iqr" checked style="margin-right: 2px;">
                            <span style="font-size: 9px;">IQR</span>
                        </label>
                        <label style="display: flex; align-items: center; cursor: pointer; flex: 1; min-width: 60px;">
                            <input type="radio" name="signal-outlier-filter" id="signal-outlier-percentile" value="percentile" style="margin-right: 2px;">
                            <span style="font-size: 9px;">Percentile</span>
                        </label>
                        <label style="display: flex; align-items: center; cursor: pointer; flex: 1; min-width: 50px;">
                            <input type="radio" name="signal-outlier-filter" id="signal-outlier-zscore" value="zscore" style="margin-right: 2px;">
                            <span style="font-size: 9px;">Z-Score</span>
                        </label>
                    </div>
                </div>
                
                <div id="signal-analysis-results" style="
                    background: rgba(0,0,0,0.2); 
                    border-radius: 5px; 
                    padding: 8px; 
                    font-size: 11px; 
                    min-height: 35px;
                    max-height: 100px;
                    overflow-y: auto;
                    display: none;
                ">
                    <div style="opacity: 0.8;">Analysis results will appear here...</div>
                </div>
                
                <!-- Cluster Selection Section -->
                <div id="cluster-selection" style="margin-top: 10px; display: none;">
                    <div style="font-size: 11px; font-weight: bold; margin-bottom: 5px; color: #4ECDC4;">
                        🎯 Select Config:
                    </div>
                    <div id="cluster-buttons" style="margin-bottom: 8px;">
                        <!-- Cluster buttons will be added dynamically -->
                    </div>
                </div>
                
                <div id="generated-config-actions" style="margin-top: 10px; display: none;">
                    <button id="apply-generated-config-btn" style="
                        width: 30%; 
                        padding: 8px; 
                        background: linear-gradient(45deg, #FF6B6B, #FF8E53); 
                        border: none; 
                        border-radius: 4px; 
                        color: white; 
                        font-size: 10px; 
                        cursor: pointer;
                        font-weight: bold;
                        margin-right: 2%;
                    ">
                        ⚙️ Apply
                    </button>
                    <button id="optimize-generated-config-btn" style="
                        width: 30%; 
                        padding: 8px; 
                        background: linear-gradient(45deg, #4ECDC4, #44A08D); 
                        border: none; 
                        border-radius: 4px; 
                        color: white; 
                        font-size: 10px; 
                        cursor: pointer;
                        font-weight: bold;
                        margin-right: 2%;
                    ">
                        🚀 Optimize
                    </button>
                    <button id="copy-config-btn" style="
                        width: 30%; 
                        padding: 8px; 
                        background: linear-gradient(45deg, #9B59B6, #8E44AD); 
                        border: none; 
                        border-radius: 4px; 
                        color: white; 
                        font-size: 10px; 
                        cursor: pointer;
                        font-weight: bold;
                    ">
                        📋 Copy
                    </button>
                </div>
                </div> <!-- End signal-section-content -->
            </div>
            
            <!-- Footer -->
            <div style="margin-top: 15px; text-align: center;">
                <button id="close-btn" style="
                    padding: 5px 15px; 
                    background: rgba(255,255,255,0.2); 
                    border: 1px solid rgba(255,255,255,0.3); 
                    border-radius: 15px; 
                    color: white; 
                    font-size: 11px; 
                    cursor: pointer;
                ">
                    ✕ Close
                </button>
            </div>
            </div> <!-- End ui-content -->
        `;

        document.body.appendChild(ui);
        
        // Create collapsed state UI
        const collapsedUI = document.createElement('div');
        collapsedUI.id = 'ag-copilot-collapsed-ui';
        collapsedUI.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 120px;
            height: 60px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: 2px solid #fff;
            border-radius: 12px;
            padding: 8px;
            z-index: 10000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: white;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            cursor: pointer;
            display: none;
            transition: all 0.3s ease;
        `;
        
        collapsedUI.innerHTML = `
            <div style="text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: center;">
                <div style="font-size: 16px; margin-bottom: 2px;">🤖</div>
                <div style="font-size: 9px; font-weight: bold; opacity: 0.9;">AG Co-Pilot</div>
                <div style="font-size: 7px; opacity: 0.7;">Click to expand</div>
            </div>
        `;
        
        collapsedUI.addEventListener('click', () => {
            expandUI();
        });
        
        // Add hover effects to collapsed UI
        collapsedUI.addEventListener('mouseenter', () => {
            collapsedUI.style.transform = 'scale(1.05)';
            collapsedUI.style.boxShadow = '0 8px 25px rgba(0,0,0,0.4)';
        });
        
        collapsedUI.addEventListener('mouseleave', () => {
            collapsedUI.style.transform = 'scale(1)';
            collapsedUI.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
        });
        
        document.body.appendChild(collapsedUI);
        
        // Make functions globally available for onclick handlers
        window.applyBestConfigToUI = async function() {
            if (window.currentBestConfig) {
                console.log('⚙️ Applying best configuration to UI...');
                const success = await applyConfigToUI(window.currentBestConfig, true); // Skip stop check for manual best config application
                if (success) {
                    console.log('✅ Best configuration applied to UI successfully!');
                } else {
                    console.log('❌ Failed to apply best configuration to UI');
                }
            } else {
                console.log('❌ No best configuration available to apply');
            }
        };
        
        window.copyBestConfigToClipboard = function() {
            if (window.currentBestConfig) {
                const configText = JSON.stringify(window.currentBestConfig, null, 2);
                navigator.clipboard.writeText(configText).then(() => {
                    console.log('📋 Best configuration copied to clipboard!');
                }).catch(err => {
                    console.log('❌ Failed to copy configuration to clipboard');
                });
            } else {
                console.log('❌ No best configuration available to copy');
            }
        };
        
        return ui;
    }

    function updateStatus(message, isError = false) {
        // Only log to console, no UI logging
        const icon = isError ? '❌' : '📝';
        console.log(`${icon} ${message}`);
    }

    function updateUIBackground(isCompleted = false) {
        const ui = document.getElementById('ag-copilot-enhanced-ui');
        if (ui) {
            if (isCompleted) {
                // Green gradient for completed optimization
                ui.style.background = 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)';
            } else {
                // Original blue gradient for active/starting optimization
                ui.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            }
        }
    }

    function updateProgress(message, progress, bestScore, testCount, totalTokens, startTime) {
        // Log progress to console only
        if (startTime) {
            const runtime = Math.floor((Date.now() - startTime) / 1000);
            console.log(`📊 ${message} | Progress: ${(progress || 0).toFixed(1)}% | Best: ${bestScore}% | Tests: ${testCount} | Tokens: ${totalTokens} | Runtime: ${runtime}s`);
        } else {
            console.log(`📊 ${message}`);
        }
    }

    // ========================================
    // 🔍 SIGNAL ANALYSIS FUNCTIONS
    // ========================================
    
    // Get selected outlier filtering method
    function getSignalOutlierFilterMethod() {
        const methods = ['none', 'iqr', 'percentile', 'zscore'];
        for (const method of methods) {
            const radio = document.getElementById(`signal-outlier-${method}`);
            if (radio && radio.checked) {
                return method;
            }
        }
        return 'none'; // Default fallback
    }
    
    // Update signal analysis status
    function updateSignalStatus(message, isError = false) {
        const statusArea = document.getElementById('signal-analysis-results');
        if (statusArea) {
            statusArea.style.display = 'block';
            const timestamp = new Date().toLocaleTimeString();
            const icon = isError ? '❌' : '📝';
            const color = isError ? '#ff6b6b' : '#ffffff';
            
            statusArea.innerHTML += `<div style="color: ${color}; margin: 2px 0;">
                <span style="opacity: 0.7;">${timestamp}</span> ${icon} ${message}
            </div>`;
            statusArea.scrollTop = statusArea.scrollHeight;
        }
    }
    
    // Create cluster selection UI
    function createClusterSelectionUI(clusters, fallbackAnalysis) {
        const clusterSection = document.getElementById('cluster-selection');
        const clusterButtonsContainer = document.getElementById('cluster-buttons');
        
        if (!clusterSection || !clusterButtonsContainer) return;
        
        // Clear existing buttons
        clusterButtonsContainer.innerHTML = '';
        
        // Create button style
        const buttonStyle = `
            padding: 4px 8px; 
            margin: 2px; 
            border: 1px solid #4ECDC4; 
            border-radius: 3px; 
            background: rgba(78, 205, 196, 0.1); 
            color: #4ECDC4; 
            font-size: 9px; 
            cursor: pointer;
            transition: all 0.2s;
        `;
        
        const activeButtonStyle = `
            padding: 4px 8px; 
            margin: 2px; 
            border: 1px solid #FF6B6B; 
            border-radius: 3px; 
            background: rgba(255, 107, 107, 0.2); 
            color: #FF6B6B; 
            font-size: 9px; 
            cursor: pointer;
            font-weight: bold;
        `;
        
        // Add cluster buttons
        clusters.forEach((cluster, index) => {
            const button = document.createElement('button');
            button.innerHTML = `${cluster.name} (${cluster.tokenCount} CAs)`;
            button.style.cssText = index === 0 ? activeButtonStyle : buttonStyle;
            button.onclick = () => selectClusterConfig(cluster.id, clusters, fallbackAnalysis);
            clusterButtonsContainer.appendChild(button);
        });
        
        // Add fallback button
        const fallbackButton = document.createElement('button');
        fallbackButton.innerHTML = `All Signals (${fallbackAnalysis.tokenCount} CAs)`;
        fallbackButton.style.cssText = buttonStyle;
        fallbackButton.onclick = () => selectClusterConfig('fallback', clusters, fallbackAnalysis);
        clusterButtonsContainer.appendChild(fallbackButton);
        
        // Show the cluster selection section
        clusterSection.style.display = 'block';
    }
    
    // Switch to a different cluster config
    function selectClusterConfig(configId, clusters, fallbackAnalysis) {
        let selectedConfig;
        
        if (configId === 'fallback') {
            selectedConfig = generateTightestConfig(fallbackAnalysis);
            window.lastGeneratedConfig = selectedConfig;
        } else {
            selectedConfig = window[`clusterConfig_${configId}`];
            window.lastGeneratedConfig = selectedConfig;
        }
        
        // Update button states
        const buttons = document.querySelectorAll('#cluster-buttons button');
        buttons.forEach(btn => {
            if ((configId === 'fallback' && btn.innerHTML.includes('All Signals')) ||
                (configId !== 'fallback' && btn.innerHTML.includes(configId.replace('cluster_', 'Cluster ')))) {
                btn.style.cssText = `
                    padding: 4px 8px; 
                    margin: 2px; 
                    border: 1px solid #FF6B6B; 
                    border-radius: 3px; 
                    background: rgba(255, 107, 107, 0.2); 
                    color: #FF6B6B; 
                    font-size: 9px; 
                    cursor: pointer;
                    font-weight: bold;
                `;
            } else {
                btn.style.cssText = `
                    padding: 4px 8px; 
                    margin: 2px; 
                    border: 1px solid #4ECDC4; 
                    border-radius: 3px; 
                    background: rgba(78, 205, 196, 0.1); 
                    color: #4ECDC4; 
                    font-size: 9px; 
                    cursor: pointer;
                    transition: all 0.2s;
                `;
            }
        });
        
        // Show config summary
        const configType = configId === 'fallback' ? 'All Signals Config' : `Cluster ${configId.replace('cluster_', '')} Config`;
        updateSignalStatus(`🔄 Switched to: ${configType}`);
        console.log(`\n=== SELECTED: ${configType} ===`);
        console.log(formatConfigForDisplay(selectedConfig));
    }
    
    // Main signal analysis handler
    async function handleSignalAnalysis() {
        try {
            const contractAddresses = document.getElementById('signal-contract-input').value
                .split('\n')
                .map(addr => addr.trim())
                .filter(addr => addr.length > 0);
            
            if (contractAddresses.length === 0) {
                updateSignalStatus('Please enter at least one contract address', true);
                return;
            }
            
            const signalsPerToken = parseInt(document.getElementById('signals-per-token').value) || 3;
            const bufferPercent = parseFloat(document.getElementById('config-buffer').value) || 10;
            const outlierMethod = getSignalOutlierFilterMethod();
            
            // Clear previous results
            document.getElementById('signal-analysis-results').innerHTML = '';
            updateSignalStatus(`Starting analysis of ${contractAddresses.length} tokens...`);
            
            const allTokenData = [];
            const errors = [];
            
            // Process each token
            for (let i = 0; i < contractAddresses.length; i++) {
                const address = contractAddresses[i];
                updateSignalStatus(`Processing token ${i + 1}/${contractAddresses.length}: ${address.substring(0, 8)}...`);
                
                try {
                    // Get token info and swaps
                    const tokenInfo = await getTokenInfo(address);
                    const allSwaps = await getAllTokenSwaps(address);
                    
                    // Limit swaps per token
                    const limitedSwaps = allSwaps.slice(0, signalsPerToken);
                    
                    // Process token data
                    const processed = processTokenData(tokenInfo, limitedSwaps);
                    
                    allTokenData.push({
                        address: address, 
                        processed: processed,
                        swaps: limitedSwaps
                    });
                    
                    updateSignalStatus(`✅ ${processed.tokenName} (${processed.symbol}): ${limitedSwaps.length} signals`);
                    
                } catch (error) {
                    errors.push({ address, error: error.message });
                    updateSignalStatus(`❌ Failed to process ${address.substring(0, 8)}: ${error.message}`, true);
                }
            }
            
            if (allTokenData.length === 0) {
                updateSignalStatus('No valid token data found. Please check contract addresses.', true);
                return;
            }
            
            // Analyze signals and generate config
            updateSignalStatus(`Analyzing ${allTokenData.length} tokens with ${outlierMethod} outlier filtering...`);
            
            // Check if clustering is enabled
            const useClusteringCheckbox = document.getElementById('enable-signal-clustering');
            const useClustering = useClusteringCheckbox ? useClusteringCheckbox.checked : false;
            
            console.log(`🔍 Clustering Debug: checkbox=${!!useClusteringCheckbox}, checked=${useClustering}`);
            
            const analysis = analyzeSignalCriteria(allTokenData, bufferPercent, outlierMethod, useClustering);
            
            if (analysis.type === 'clustered') {
                // Handle clustered analysis
                updateSignalStatus(`🎯 Found ${analysis.clusters.length} signal clusters (${analysis.clusteredSignals}/${analysis.totalSignals} signals)`);
                
                // Set the best (first) cluster as the main config
                const bestCluster = analysis.clusters[0];
                const bestConfig = generateTightestConfig(bestCluster.analysis);
                window.lastGeneratedConfig = bestConfig;
                
                // Display best cluster info
                updateSignalStatus(`🏆 Best Cluster: ${bestCluster.name} with ${bestCluster.signalCount} signals (tightness: ${bestCluster.tightness.toFixed(3)})`);
                
                // Display each cluster
                analysis.clusters.forEach((cluster, index) => {
                    const generatedConfig = generateTightestConfig(cluster.analysis);
                    const formattedConfig = formatConfigForDisplay(generatedConfig);
                    
                    console.log(`\n=== ${cluster.name} (${cluster.signalCount} signals, tightness: ${cluster.tightness.toFixed(3)}) ===`);
                    console.log(formattedConfig);
                    
                    // Store cluster config
                    window[`clusterConfig_${cluster.id}`] = generatedConfig;
                    
                    // Show cluster summary in UI
                    if (index < 3) { // Show first 3 clusters in UI
                        const clusterSummary = `📊 ${cluster.name}: ${cluster.signalCount} signals, MCAP $${generatedConfig['Min MCAP (USD)']} - $${generatedConfig['Max MCAP (USD)']}`;
                        updateSignalStatus(clusterSummary);
                    }
                });
                
                // Also generate and display fallback config
                const fallbackConfig = generateTightestConfig(analysis.fallback);
                window.fallbackConfig = fallbackConfig;
                
                console.log(`\n=== FALLBACK CONFIG (All ${analysis.totalSignals} signals) ===`);
                console.log(formatConfigForDisplay(fallbackConfig));
                
                updateSignalStatus(`📋 Generated ${analysis.clusters.length} cluster configs + 1 fallback - details logged to console`);
                updateSignalStatus(`🎯 Main config set to best cluster: ${bestCluster.name}`);
                updateSignalStatus(`💡 Use Copy button for best cluster config, or check console for all configs`);
                
                // Create cluster selection UI
                createClusterSelectionUI(analysis.clusters, analysis.fallback);
                
            } else {
                // Handle standard analysis
                const generatedConfig = generateTightestConfig(analysis.analysis);
                
                // Format and display the generated config
                const formattedConfig = formatConfigForDisplay(generatedConfig);
                console.log('\n' + formattedConfig);
                updateSignalStatus(`📋 Generated config details logged to console`);
                
                // Store config globally for use by apply buttons
                window.lastGeneratedConfig = generatedConfig;
                
                // Show results
                const summary = generateBatchSummary(allTokenData);
                updateSignalStatus(`✅ Analysis complete! Generated config from ${analysis.analysis.totalSignals} signals`);
                updateSignalStatus(`📊 Average MCAP: $${analysis.analysis.mcap.avg}, Signals/Token: ${summary.avgSignalsPerToken}`);
                updateSignalStatus(`🎯 Config bounds: MCAP $${generatedConfig['Min MCAP (USD)']} - $${generatedConfig['Max MCAP (USD)']}`);
                updateSignalStatus(`📋 Config details available - use Copy button or check console`);
            }
            
            // Show action buttons
            document.getElementById('generated-config-actions').style.display = 'block';
            
        } catch (error) {
            updateSignalStatus(`Analysis failed: ${error.message}`, true);
            console.error('Signal analysis error:', error);
        }
    }

    // ========================================
    // 🔄 UI COLLAPSE/EXPAND FUNCTIONS
    // ========================================
    function collapseUI() {
        const mainUI = document.getElementById('ag-copilot-enhanced-ui');
        const collapsedUI = document.getElementById('ag-copilot-collapsed-ui');
        
        if (mainUI && collapsedUI) {
            mainUI.style.display = 'none';
            collapsedUI.style.display = 'block';
        }
    }
    
    function expandUI() {
        const mainUI = document.getElementById('ag-copilot-enhanced-ui');
        const collapsedUI = document.getElementById('ag-copilot-collapsed-ui');
        
        if (mainUI && collapsedUI) {
            collapsedUI.style.display = 'none';
            mainUI.style.display = 'block';
        }
    }

    // ========================================
    // 🎮 EVENT HANDLERS
    // ========================================
    function setupEventHandlers() {
        // Helper function to safely add event listener
        const safeAddEventListener = (elementId, event, handler) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.addEventListener(event, handler);
            } else {
                console.warn(`⚠️ Element with ID '${elementId}' not found, skipping event listener`);
            }
        };

        // Auto-apply preset when selected
        safeAddEventListener('preset-dropdown', 'change', async () => {
            const selectedPreset = document.getElementById('preset-dropdown').value;
            if (selectedPreset) {
                console.log(`📦 Applying preset: ${selectedPreset}...`);
                await applyPreset(selectedPreset);
                // Reset dropdown after applying
                document.getElementById('preset-dropdown').value = '';
            }
        });

        // Chain run count handler
        safeAddEventListener('chain-run-count', 'change', (e) => {
            CONFIG.CHAIN_RUN_COUNT = parseInt(e.target.value) || 3;
        });

        // Start optimization button
        safeAddEventListener('start-optimization', 'click', async () => {
            const targetPnl = parseFloat(document.getElementById('target-pnl')?.value) || 100;
            const minTokens = parseInt(document.getElementById('min-tokens')?.value) || 50;
            const runtimeMin = parseInt(document.getElementById('runtime-min')?.value) || 30;
            const chainRunCount = parseInt(document.getElementById('chain-run-count')?.value) || 1;
            const robustScoring = document.getElementById('robust-scoring')?.checked || false;
            const simulatedAnnealing = document.getElementById('simulated-annealing')?.checked || false;
            const multipleStartingPoints = document.getElementById('multiple-starting-points')?.checked || false;
            const latinHypercube = document.getElementById('latin-hypercube')?.checked || false;
            const correlatedParams = document.getElementById('correlated-params')?.checked || false;
            const deepDive = document.getElementById('deep-dive')?.checked || false;
            
            // Reset UI background to original color when starting
            updateUIBackground(false);
            
            // Update config
            CONFIG.TARGET_PNL = targetPnl;
            CONFIG.MIN_TOKENS = minTokens;
            CONFIG.MAX_RUNTIME_MIN = runtimeMin;
            CONFIG.USE_ROBUST_SCORING = robustScoring;
            CONFIG.USE_SIMULATED_ANNEALING = simulatedAnnealing;
            CONFIG.USE_MULTIPLE_STARTING_POINTS = multipleStartingPoints;
            CONFIG.USE_LATIN_HYPERCUBE_SAMPLING = latinHypercube;
            CONFIG.USE_CORRELATED_PARAMS = correlatedParams;
            CONFIG.USE_DEEP_DIVE = deepDive;
            CONFIG.CHAIN_RUN_COUNT = chainRunCount;
            
            const features = [];
            if (robustScoring) features.push('outlier-resistant scoring');
            if (simulatedAnnealing) features.push('simulated annealing');
            if (multipleStartingPoints) features.push('multiple starting points');
            if (latinHypercube) features.push('Latin hypercube sampling');
            if (correlatedParams) features.push('correlated parameters');
            if (deepDive) features.push('deep dive analysis');
            
            const featuresStr = features.length > 0 ? ` with ${features.join(', ')}` : '';
            
            // Determine if we should use chained runs (when runs > 1)
            const useChainedRuns = chainRunCount > 1;
            
            if (useChainedRuns) {
                console.log(`🔗 Starting chained optimization: ${chainRunCount} runs of ${runtimeMin} min each, Target ${targetPnl}% PnL, Min ${minTokens} tokens${featuresStr}`);
            } else {
                console.log(`🚀 Starting optimization: Target ${targetPnl}% PnL, Min ${minTokens} tokens, ${runtimeMin} min runtime${featuresStr}`);
            }
            
            // UI state changes
            const startBtn = document.getElementById('start-optimization');
            const stopBtn = document.getElementById('stop-optimization');
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'block';
            
            // Auto-hide the Configuration & Optimization section when starting
            console.log('📱 Auto-hiding Configuration & Optimization section...');
            const toggleConfigButton = document.getElementById('toggle-config-section');
            if (toggleConfigButton && toggleConfigButton.textContent.includes('Hide')) {
                toggleConfigButton.click();
            }

            const toggleSignalButton = document.getElementById('toggle-signal-section');
            if (toggleSignalButton && toggleSignalButton.textContent.includes('Hide')) {
                toggleSignalButton.click();
            }
            
            // Reset stopped flag
            STOPPED = false;
            
            // Start optimization
            try {
                let results;
                
                if (useChainedRuns) {
                    // Use ChainedOptimizer for multiple runs
                    const chainedOptimizer = new ChainedOptimizer();
                    results = await chainedOptimizer.runChainedOptimization(chainRunCount, runtimeMin);
                } else {
                    // Use single EnhancedOptimizer run
                    const optimizer = new EnhancedOptimizer();
                    results = await optimizer.runOptimization();
                }
                
                if (results && results.bestConfig) {
                    if (useChainedRuns) {
                        console.log(`🎉 Chained optimization completed! Best score: ${results.bestScore.toFixed(1)}% across ${chainRunCount} runs (${results.totalTestCount} total tests)`);
                    } else {
                        console.log(`🎉 Optimization completed! Best score: ${results.bestScore.toFixed(1)}% after ${results.testCount} tests`);
                    }
                    window.currentBestConfig = results.bestConfig;
                    // Change background to green for successful completion
                    updateUIBackground(true);
                } else {
                    console.log('❌ Optimization completed but no best configuration found');
                    // Change background to green even if no improvement (completed)
                    updateUIBackground(true);
                }
            } catch (error) {
                console.log(`❌ Optimization failed: ${error.message}`);
                // Keep original background color for failed optimization
            } finally {
                // Stop optimization tracking when complete
                if (window.optimizationTracker) {
                    window.optimizationTracker.stopOptimization();
                }
                
                // Reset UI state safely
                const startBtn = document.getElementById('start-optimization');
                const stopBtn = document.getElementById('stop-optimization');
                if (startBtn) startBtn.style.display = 'block';
                if (stopBtn) stopBtn.style.display = 'none';
            }
        });
        
        // Stop optimization button
        safeAddEventListener('stop-optimization', 'click', () => {
            window.STOPPED = true;
            console.log('⏹️ Optimization stopped by user - STOPPED flag set to:', window.STOPPED);
            
            // Stop optimization tracking immediately when stopped
            if (window.optimizationTracker) {
                window.optimizationTracker.stopOptimization();
            }
            
            // Keep original background when manually stopped
            const startBtn = document.getElementById('start-optimization');
            const stopBtn = document.getElementById('stop-optimization');
            if (startBtn) startBtn.style.display = 'block';
            if (stopBtn) stopBtn.style.display = 'none';
            // Update status to confirm stop action
            updateStatus('⏹️ Optimization stopped by user', false);
        });
        
        // Signal Analysis event handlers
        safeAddEventListener('analyze-signals-btn', 'click', async () => {
            await handleSignalAnalysis();
        });
        
        safeAddEventListener('apply-generated-config-btn', 'click', async () => {
            if (window.lastGeneratedConfig) {
                await applyConfigToBacktester(window.lastGeneratedConfig);
                updateStatus('✅ Generated config applied to backtester!');
            }
        });
        
        safeAddEventListener('optimize-generated-config-btn', 'click', async () => {
            if (window.lastGeneratedConfig) {
                await applyConfigToBacktester(window.lastGeneratedConfig);
                updateStatus('⚙️ Generated config applied, starting optimization...');
                // Small delay to let the config apply - with stop check
                if (!window.STOPPED) {
                    await sleep(1000);
                    // Trigger optimization with current settings
                    const startBtn = document.getElementById('start-optimization');
                    if (startBtn) startBtn.click();
                }
            }
        });
        
        safeAddEventListener('copy-config-btn', 'click', async () => {
            if (window.lastGeneratedConfig) {
                const formattedConfig = formatConfigForDisplay(window.lastGeneratedConfig);
                try {
                    await navigator.clipboard.writeText(formattedConfig);
                    updateStatus('📋 Config copied to clipboard!');
                } catch (error) {
                    console.error('Failed to copy to clipboard:', error);
                    // Fallback: log to console
                    console.log('\n🎯 GENERATED CONFIG (clipboard copy failed):\n', formattedConfig);
                    updateStatus('📋 Config logged to console (clipboard failed)');
                }
            }
        });
        
        // Close button
        safeAddEventListener('close-btn', 'click', () => {
            const mainUI = document.getElementById('ag-copilot-enhanced-ui');
            const collapsedUI = document.getElementById('ag-copilot-collapsed-ui');
            if (mainUI) mainUI.remove();
            if (collapsedUI) collapsedUI.remove();
        });

        // Collapse button
        safeAddEventListener('collapse-ui-btn', 'click', () => {
            collapseUI();
        });

        // Section toggle handlers
        safeAddEventListener('toggle-config-section', 'click', () => {
            const content = document.getElementById('config-section-content');
            const button = document.getElementById('toggle-config-section');
            if (content && button) {
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'block' : 'none';
                button.textContent = isHidden ? '➖ Hide' : '➕ Show';
            }
        });

        safeAddEventListener('toggle-signal-section', 'click', () => {
            const content = document.getElementById('signal-section-content');
            const button = document.getElementById('toggle-signal-section');
            if (content && button) {
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'block' : 'none';
                button.textContent = isHidden ? '➖ Hide' : '➕ Show';
            }
        });
    }

// Apply generated config to backtester UI using correct field mappings
    async function applyConfigToBacktester(config) {
        console.log('applyConfigToBacktester received config:', config);
        let appliedFields = 0;
        let totalFields = 0;
        const results = [];        
        
        // Helper function to track field setting (without section opening)
        const trackField = async (fieldName, value) => {
            totalFields++;
            try {
                const success = await setFieldValue(fieldName, value);
                if (success) {
                    appliedFields++;
                    results.push(`✅ ${fieldName}: ${value}`);
                    return true;
                } else {
                    results.push(`❌ ${fieldName}: ${value} (field not found)`);
                    return false;
                }
            } catch (error) {
                results.push(`❌ ${fieldName}: ${value} (error: ${error.message})`);
                return false;
            }
        };
        
        // Helper function to open section and apply fields
        const applyFieldsToSection = async (sectionName, fieldsToApply) => {
            try {
                const sectionOpened = await openSection(sectionName);
                if (!sectionOpened) {
                    results.push(`❌ Could not open ${sectionName} section`);
                    return false;
                }
                
                await sleep(200); // Wait for section to open
                
                // Apply all fields for this section
                for (const [fieldName, value] of fieldsToApply) {
                    if (value !== undefined && value !== null) {
                        await trackField(fieldName, value);
                        await sleep(50); // Small delay between field updates
                    }
                }
                
                return true;
            } catch (error) {
                results.push(`❌ Error with ${sectionName} section: ${error.message}`);
                return false;
            }
        };        
    
        const boolToToggleValue = (val) => {
            if (val === null) return "Don't care";
            return val ? "Yes" : "Don't care";
        };
        
        // Basic Section Fields
        await applyFieldsToSection('Basic', [
            ['Min MCAP (USD)', config['Min MCAP (USD)']],
            ['Max MCAP (USD)', config['Max MCAP (USD)']],
            ['Min Liquidity (USD)', config['Min Liquidity (USD)']],
            ['Max Liquidity (USD)', config['Max Liquidity (USD)']]
        ]);
        
        // Token Details Section Fields  
        await applyFieldsToSection('Token Details', [
            ['Min AG Score', config['Min AG Score']],
            ['Min Token Age (sec)', config['Min Token Age (sec)']],
            ['Max Token Age (sec)', config['Max Token Age (sec)']],
            ['Min Deployer Age (min)', config['Min Deployer Age (min)']]
        ]);
        
        // Wallets Section Fields
        await applyFieldsToSection('Wallets', [
            ['Min Unique Wallets', config['Min Unique Wallets']],
            ['Max Unique Wallets', config['Max Unique Wallets']],
            ['Min KYC Wallets', config['Min KYC Wallets']],
            ['Max KYC Wallets', config['Max KYC Wallets']],
            ['Min Holders', config['Min Holders']],
            ['Max Holders', config['Max Holders']],
        ]);
        
        // Risk Section Fields (including booleans)
        const riskFields = [
            ['Min Bundled %', config['Min Bundled %']],
            ['Max Bundled %', config['Max Bundled %']],
            ['Min Deployer Balance (SOL)', config['Min Deployer Balance (SOL)']],
            ['Min Buy Ratio %', config['Min Buy Ratio %']],
            ['Max Buy Ratio %', config['Max Buy Ratio %']],
            ['Min Vol MCAP %', config['Min Vol MCAP %']],
            ['Max Vol MCAP %', config['Max Vol MCAP %']],
            ['Max Drained %', config['Max Drained %']]
        ];
        
        // Add boolean fields if they have values (check for true/false, not just non-null)
        if (config['Fresh Deployer'] !== null && config['Fresh Deployer'] !== undefined) {
            riskFields.push(['Fresh Deployer', boolToToggleValue(config['Fresh Deployer'])]);
        }
        if (config['Description'] !== null && config['Description'] !== undefined) {
            riskFields.push(['Description', boolToToggleValue(config['Description'])]);
        }
        
        await applyFieldsToSection('Risk', riskFields);
        
        // Advanced Section Fields
        await applyFieldsToSection('Advanced', [
            ['Max Liquidity %', config['Max Liquidity %']],
            ['Min TTC (sec)', config['Min TTC (sec)']],
            ['Max TTC (sec)', config['Max TTC (sec)']],
            ['Min Win Pred %', config['Min Win Pred %']]
        ]);
        
        return {
            success: appliedFields > 0,
            appliedFields,
            totalFields,
            successRate: totalFields > 0 ? ((appliedFields / totalFields) * 100).toFixed(1) : 0,
            results
        };
    }

    // ========================================
    // 🎬 INITIALIZATION
    // ========================================
    console.log('🔧 Initializing AG Co-Pilot Enhanced + Signal Analysis...');
    
    // Create and setup UI
    try {
        const ui = createUI();
        console.log('✅ UI created successfully');
        
        setupEventHandlers();
        console.log('✅ Event handlers setup completed');
        
    } catch (error) {
        console.error('❌ Initialization error:', error);
        throw error;
    }
    
    console.log('✅ AG Co-Pilot Enhanced + Signal Analysis ready!');
    console.log('🚀 Features: Direct API optimization, signal analysis, config generation');
    console.log('🔍 NEW: Analyze successful signals from contract addresses to generate optimal configs');
    console.log('⚙️ NEW: Auto-apply generated configs and start optimization in one click');
    console.log('� NEW: Intelligent chained runs - each run starts from previous best configuration!');
    console.log('�🚀 NEW: Enhanced hard cap system with rolling window rate tracking!');
    console.log('📊 Advanced rate limiting optimizations (BALANCED MODE with ENHANCED HARD CAP):');
    console.log('   • Recovery time: 8.5s (balanced)');
    console.log('   • Safety margin: 1.1x (10% safety buffer)');
    console.log('   • Intra-burst delay: 8ms (balanced)');
    console.log('   • Hard cap: 70 requests/minute enforced with rolling window tracking');
    console.log('   • Expected performance: 60-70 requests/minute');
    console.log('   • Enhanced monitoring: both session and 60-second rolling window rates');
    console.log('   • Dynamic throttling: proportional delays based on excess rate');
    console.log('🔗 Chained optimization benefits:');
    console.log('   • Run 1: Discovers baseline configuration');
    console.log('   • Run 2+: Start from best config found so far (no time wasted rediscovering)');
    console.log('   • Knowledge accumulation: Each run builds on previous discoveries');
    console.log('   • Faster convergence: More time spent optimizing, less time on baseline');
    console.log('🛠️ Performance tools:');
    console.log('   • window.getRateLimitStats() - Current performance metrics');
    console.log('   • window.testBurstRateLimit() - Comprehensive test (75 calls)');
    console.log('   • window.resetRateLimiting() - Reset to optimal settings');
    console.log('   • window.optimizeRateLimiting() - Smart optimization');
    console.log('   • window.enableTurboMode() - Maximum speed mode (⚠️ aggressive)');
    
    // ========================================
    // 🛠️ UTILITY FUNCTIONS - Global Access
    // ========================================
    
    // Manual UI controls for debugging/testing
    window.showOptimizationTracker = () => {
        const display = document.getElementById('best-config-display');
        if (display) {
            display.style.display = 'block';
            console.log('🖥️ Optimization tracker shown manually');
        }
    };
    
    window.hideOptimizationTracker = () => {
        const display = document.getElementById('best-config-display');
        if (display) {
            display.style.display = 'none';
            console.log('🖥️ Optimization tracker hidden manually');
        }
    };
    
    // Enhanced rate limiting performance monitoring
    window.getRateLimitStats = () => {
        const stats = burstRateLimiter.getStats();
        console.log('📊 Current Rate Limiting Performance:');
        console.log(`   • Requests per minute: ${stats.requestsPerMinute}`);
        console.log(`   • Current burst: ${stats.currentBurstCount}/${stats.burstLimit}`);
        console.log(`   • Total requests: ${stats.totalCalls}`);
        console.log(`   • Rate limit hits: ${stats.rateLimitHits}`);
        console.log(`   • Successful bursts: ${stats.successfulBursts}`);
        console.log(`   • Recovery time: ${(stats.recoveryTime/1000).toFixed(1)}s`);
        console.log(`   • Intra-burst delay: ${stats.intraBurstDelay}ms`);
        return stats;
    };
    
    // Force rate limit adaptation for testing
    window.forceRateLimitAdaptation = () => {
        console.log('🔧 Forcing rate limit adaptation...');
        burstRateLimiter.adaptToBurstLimit();
        return burstRateLimiter.getStats();
    };
    
    // Smart reset that uses learned optimal burst size
    window.smartResetRateLimiting = () => {
        const stats = burstRateLimiter.getStats();
        console.log('🧠 Smart reset using learned optimal burst size...');
        
        if (stats.rateLimitPositions && stats.rateLimitPositions.length > 0) {
            const avgPosition = stats.rateLimitPositions.reduce((a, b) => a + b, 0) / stats.rateLimitPositions.length;
            const optimalSize = Math.max(20, Math.floor(avgPosition - 3)); // 3-call safety buffer
            
            console.log(`📊 Learned data: Rate limits occurred at positions ${stats.rateLimitPositions.join(', ')}`);
            console.log(`📊 Average position: ${avgPosition.toFixed(1)}, Optimal burst size: ${optimalSize}`);
            
            burstRateLimiter.burstLimit = optimalSize;
            burstRateLimiter.optimalBurstSize = optimalSize;
        } else {
            console.log('📊 No learning data available, using conservative reset');
            burstRateLimiter.burstLimit = Math.min(50, burstRateLimiter.originalBurstLimit);
        }
        
        burstRateLimiter.recoveryTime = CONFIG.RATE_LIMIT_RECOVERY * CONFIG.RATE_LIMIT_SAFETY_MARGIN;
        burstRateLimiter.rateLimitHits = 0;
        burstRateLimiter.successfulBursts = 0;
        burstRateLimiter.consecutiveSuccesses = 0;
        burstRateLimiter.callCount = 0;
        burstRateLimiter.lastBurstTime = 0;
        
        console.log(`✅ Smart reset complete: ${burstRateLimiter.burstLimit} calls/burst, ${(burstRateLimiter.recoveryTime/1000).toFixed(1)}s recovery`);
        return burstRateLimiter.getStats();
    };
    
    // Reset rate limiting to original settings
    window.resetRateLimiting = () => {
        console.log('🔄 Resetting rate limiter to original settings...');
        const oldLimit = burstRateLimiter.burstLimit;
        const oldRecovery = burstRateLimiter.recoveryTime;
        
        burstRateLimiter.burstLimit = burstRateLimiter.originalBurstLimit;
        burstRateLimiter.recoveryTime = CONFIG.RATE_LIMIT_RECOVERY * CONFIG.RATE_LIMIT_SAFETY_MARGIN;
        burstRateLimiter.rateLimitHits = 0;
        burstRateLimiter.successfulBursts = 0;
        burstRateLimiter.consecutiveSuccesses = 0;
        burstRateLimiter.callCount = 0;
        burstRateLimiter.lastBurstTime = 0;
        burstRateLimiter.rateLimitPositions = []; // Clear learning data
        
        console.log(`✅ Rate limiter reset:`);
        console.log(`   • Burst limit: ${oldLimit} → ${burstRateLimiter.burstLimit}`);
        console.log(`   • Recovery time: ${(oldRecovery/1000).toFixed(1)}s → ${(burstRateLimiter.recoveryTime/1000).toFixed(1)}s`);
        console.log(`   • Learning data cleared`);
        
        return burstRateLimiter.getStats();
    };
    
    // Smart rate limit optimization based on recent performance
    window.optimizeRateLimiting = () => {
        const stats = burstRateLimiter.getStats();
        console.log('🔧 Optimizing rate limiting based on performance...');
        
        if (stats.rateLimitHits === 0 && stats.successfulBursts > 2) {
            // No rate limits hit recently, we can be more aggressive
            console.log('✅ No recent rate limits - enabling aggressive mode');
            burstRateLimiter.burstLimit = Math.min(burstRateLimiter.originalBurstLimit, burstRateLimiter.burstLimit + 10);
            burstRateLimiter.recoveryTime = Math.max(8000, burstRateLimiter.recoveryTime * 0.85);
            burstRateLimiter.intraBurstDelay = Math.max(5, burstRateLimiter.intraBurstDelay * 0.7);
        } else if (stats.rateLimitHits > 2) {
            // Multiple rate limit hits, be more conservative
            console.log('⚠️ Multiple rate limits detected - enabling conservative mode');
            burstRateLimiter.recoveryTime = Math.min(25000, burstRateLimiter.recoveryTime * 1.15);
            burstRateLimiter.intraBurstDelay = Math.min(50, burstRateLimiter.intraBurstDelay * 1.3);
        }
        
        console.log('🎯 Optimization complete:', burstRateLimiter.getStats());
        return burstRateLimiter.getStats();
    };
    
    // Turbo mode: Maximum speed settings (use at your own risk)
    window.enableTurboMode = () => {
        console.log('🚀 Enabling TURBO MODE - Maximum speed settings!');
        console.log('⚠️ Warning: This pushes limits and may cause more 429s');
        
        const oldSettings = {
            burstLimit: burstRateLimiter.burstLimit,
            recoveryTime: burstRateLimiter.recoveryTime,
            intraBurstDelay: burstRateLimiter.intraBurstDelay
        };
        
        // Turbo settings
        burstRateLimiter.burstLimit = burstRateLimiter.originalBurstLimit; // Full burst
        burstRateLimiter.recoveryTime = 8000; // 8 second recovery
        burstRateLimiter.intraBurstDelay = 5; // 5ms between calls
        burstRateLimiter.rateLimitHits = 0; // Reset hits
        burstRateLimiter.successfulBursts = 0; // Reset success count
        
        console.log('🔥 TURBO MODE ENABLED:');
        console.log(`   • Burst limit: ${oldSettings.burstLimit} → ${burstRateLimiter.burstLimit}`);
        console.log(`   • Recovery time: ${(oldSettings.recoveryTime/1000).toFixed(1)}s → ${(burstRateLimiter.recoveryTime/1000).toFixed(1)}s`);
        console.log(`   • Intra-burst delay: ${oldSettings.intraBurstDelay}ms → ${burstRateLimiter.intraBurstDelay}ms`);
        console.log('📊 Expected: 200-400 requests/minute (if API allows)');
        
        return burstRateLimiter.getStats();
    };
    
    // Test the API with current UI config (enhanced with performance monitoring)
    window.testCurrentConfig = async () => {
        console.log('🧪 Testing current UI configuration...');
        const startTime = Date.now();
        const initialStats = burstRateLimiter.getStats();
        
        try {
            // Extract current config from UI
            const currentConfig = await extractCurrentConfig();
            const result = await testConfigurationAPI(currentConfig, 'Manual Test');
            
            const duration = Date.now() - startTime;
            const finalStats = burstRateLimiter.getStats();
            
            console.log('✅ Test completed in', (duration/1000).toFixed(1), 'seconds');
            console.log('📊 Performance impact:');
            console.log(`   • Requests made: ${finalStats.totalCalls - initialStats.totalCalls}`);
            console.log(`   • Current rate: ${finalStats.requestsPerMinute} req/min`);
            
            if (result.success) {
                console.log('✅ Test successful:', result.metrics);
                
                // Update tracker with test result
                if (window.optimizationTracker) {
                    window.optimizationTracker.setCurrentBest({
                        metrics: result.metrics,
                        config: currentConfig
                    }, 'Manual Test');
                }
                
                return result;
            } else {
                console.log('❌ Test failed:', result.error);
                return result;
            }
        } catch (error) {
            console.log('❌ Test error:', error.message);
            return { success: false, error: error.message };
        }
    };
    
    // Test burst rate limiting performance (enhanced for better demonstration)
    window.testBurstRateLimit = async () => {
        console.log('🚀 Testing Enhanced Burst Rate Limiting Performance...');
        console.log('📊 This will test multiple bursts to demonstrate the speed improvement');
        
        const simpleConfig = { basic: { "Min MCAP (USD)": 5000, "Max MCAP (USD)": 15000 } };
        const initialStats = burstRateLimiter.getStats();
        
        console.log(`📊 Initial burst limiter: ${initialStats.burstLimit} calls/burst, ${(initialStats.recoveryTime/1000).toFixed(1)}s recovery`);
        console.log(`📊 Expected performance: ~${Math.round((initialStats.burstLimit / (initialStats.recoveryTime/1000 + initialStats.burstLimit * 0.1)) * 60)} requests/minute\n`);
        
        let totalSuccessCount = 0;
        let totalFailureCount = 0;
        const overallStartTime = Date.now();
        
        // Test 3 full bursts to demonstrate the pattern
        const burstCount = 3;
        const callsPerBurst = Math.min(25, initialStats.burstLimit); // Test 25 calls per burst or burst limit, whichever is smaller
        
        for (let burstNum = 1; burstNum <= burstCount; burstNum++) {
            console.log(`\n🔥 === BURST ${burstNum}/${burstCount} === (${callsPerBurst} calls)`);
            const burstStartTime = Date.now();
            let burstSuccess = 0;
            let burstFailure = 0;
            
            for (let i = 1; i <= callsPerBurst; i++) {
                const callStartTime = Date.now();
                const result = await testConfigurationAPI(simpleConfig, `Burst ${burstNum}-${i}`);
                const callDuration = Date.now() - callStartTime;
                
                if (result.success) {
                    burstSuccess++;
                    totalSuccessCount++;
                    if (i % 10 === 0 || i === callsPerBurst) {
                        console.log(`   ✅ Call ${i}/${callsPerBurst}: ${callDuration}ms (${result.metrics.totalTokens} tokens, ${result.metrics.tpPnlPercent?.toFixed(1)}% PnL)`);
                    }
                } else {
                    burstFailure++;
                    totalFailureCount++;
                    console.log(`   ❌ Call ${i}/${callsPerBurst}: ${callDuration}ms - ${result.error}`);
                    
                    // If it's a rate limit, show adaptation
                    if (result.isRateLimit) {
                        const adaptedStats = burstRateLimiter.getStats();
                        console.log(`   📉 Rate limiter adapted: ${adaptedStats.burstLimit} calls/burst, ${(adaptedStats.recoveryTime/1000).toFixed(1)}s recovery`);
                    }
                }
                
                // Show progress every 10 calls
                if (i % 10 === 0) {
                    const currentStats = burstRateLimiter.getStats();
                    const elapsedBurstTime = Date.now() - burstStartTime;
                    const currentRate = Math.round((i / (elapsedBurstTime/1000)) * 60);
                    console.log(`   📊 Progress: ${i}/${callsPerBurst} | Burst: ${currentStats.currentBurstCount}/${currentStats.burstLimit} | Rate: ${currentRate} req/min`);
                }
            }
            
            const burstDuration = Date.now() - burstStartTime;
            const burstRate = Math.round((callsPerBurst / (burstDuration/1000)) * 60);
            console.log(`\n   🎯 Burst ${burstNum} Results:`);
            console.log(`      • Duration: ${(burstDuration/1000).toFixed(1)}s`);
            console.log(`      • Success: ${burstSuccess}/${callsPerBurst} (${(burstSuccess/callsPerBurst*100).toFixed(1)}%)`);
            console.log(`      • Rate: ${burstRate} requests/minute`);
            
            // If not the last burst, show recovery time
            if (burstNum < burstCount) {
                const stats = burstRateLimiter.getStats();
                if (stats.currentBurstCount >= stats.burstLimit) {
                    console.log(`   ⏳ Waiting for recovery (${(stats.recoveryTime/1000).toFixed(1)}s)...`);
                }
            }
        }
        
        const totalDuration = Date.now() - overallStartTime;
        const totalCalls = burstCount * callsPerBurst;
        const overallRate = Math.round((totalCalls / (totalDuration/1000)) * 60);
        const finalStats = burstRateLimiter.getStats();
        
        console.log(`\n🎉 === OVERALL BURST TEST RESULTS ===`);
        console.log(`📊 Test Summary:`);
        console.log(`   • Total time: ${(totalDuration/1000).toFixed(1)}s`);
        console.log(`   • Total calls: ${totalCalls} (${burstCount} bursts × ${callsPerBurst} calls)`);
        console.log(`   • Success rate: ${totalSuccessCount}/${totalCalls} (${(totalSuccessCount/totalCalls*100).toFixed(1)}%)`);
        console.log(`   • Overall rate: ${overallRate} requests/minute`);
        console.log(`   • Average per call: ${(totalDuration/totalCalls).toFixed(0)}ms`);
        
        console.log(`\n📈 Rate Limiter Performance:`);
        console.log(`   • Current burst capacity: ${finalStats.burstLimit}/${finalStats.originalBurstLimit} calls/burst`);
        console.log(`   • Recovery time: ${(finalStats.recoveryTime/1000).toFixed(1)}s`);
        console.log(`   • Rate limit hits: ${finalStats.rateLimitHits}`);
        console.log(`   • Successful bursts: ${finalStats.successfulBursts}`);
        console.log(`   • Intra-burst delay: ${finalStats.intraBurstDelay}ms`);
        
        console.log(`\n💡 Performance Analysis:`);
        if (overallRate > 150) {
            console.log(`🎉 EXCELLENT! Achieving ${overallRate} req/min - This is ~${Math.round(overallRate/26)}x faster than the original 26 req/min!`);
        } else if (overallRate > 100) {
            console.log(`✅ GREAT! Achieving ${overallRate} req/min - This is ~${Math.round(overallRate/26)}x faster than the original 26 req/min!`);
        } else if (overallRate > 60) {
            console.log(`👍 GOOD! Achieving ${overallRate} req/min - This is ~${Math.round(overallRate/26)}x faster than the original 26 req/min!`);
        } else {
            console.log(`⚠️ Rate could be improved. Current: ${overallRate} req/min vs target >100 req/min`);
            console.log(`   Consider checking for 429 errors or network latency issues.`);
        }
        
        // Provide optimization recommendations
        if (finalStats.rateLimitHits > 0) {
            console.log(`\n🔧 Optimization Recommendations:`);
            console.log(`   • Rate limit hits detected (${finalStats.rateLimitHits})`);
            console.log(`   • Burst limit was adapted from ${finalStats.originalBurstLimit} to ${finalStats.burstLimit}`);
            console.log(`   • Consider running window.resetRateLimiting() to reset to optimal settings`);
        } else {
            console.log(`\n✅ No rate limiting issues detected - system is performing optimally!`);
        }
        
        return {
            totalDuration,
            totalCalls,
            overallRate,
            successRate: (totalSuccessCount/totalCalls*100).toFixed(1),
            burstStats: finalStats,
            improvementFactor: Math.round(overallRate/26)
        };
    };
    
    // Quick rate limit check
    window.checkRateLimit = async () => {
        console.log('⏱️ Checking rate limiting with simple config...');
        const simpleConfig = {
            basic: { "Min MCAP (USD)": 1000, "Max MCAP (USD)": 20000 }
        };
        
        const start = Date.now();
        const result = await testConfigurationAPI(simpleConfig, 'Rate Limit Test');
        const duration = Date.now() - start;
        
        console.log(`⏱️ API call took ${duration}ms. Success: ${result.success}`);
        if (!result.success && result.error.includes('429')) {
            console.log('⚠️ Rate limited! Burst limiter may need adjustment');
        }
        
        return { duration, success: result.success, rateLimited: result.error?.includes('429') };
    };
    
    // Test connectivity
    console.log('Testing UI connectivity...');
    try {
        const connectivityTest = await testConnectivity();
        if (connectivityTest.success) {
            console.log(`✅ UI interaction ready! ${connectivityTest.message}`);
        } else {
            console.log(`❌ UI connectivity test failed: ${connectivityTest.error}`);
        }
    } catch (error) {
        console.log(`❌ UI connectivity test failed: ${error.message}`);
    }
    
})();
