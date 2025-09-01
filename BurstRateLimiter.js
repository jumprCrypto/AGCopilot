(function(AGUtils){
    'use strict';

    // BurstRateLimiter module - standalone, does not depend on AGCopilot's local CONFIG.
    // Instantiate with explicit parameters so it can be used from other modules.
    class BurstRateLimiter {
        constructor(burstLimit = 20, recoveryTime = 10000, safetyMargin = 1.5, options = {}, AGUtilsArg = null) {
            this.AGUtils = AGUtilsArg || AGUtils || (window && window.AGUtils) || {};
            this.originalBurstLimit = burstLimit;
            this.burstLimit = burstLimit;
            this.baseRecoveryTime = recoveryTime;
            this.recoveryTime = recoveryTime * (safetyMargin || 1);
            this.callCount = 0;
            this.burstStartTime = 0;
            this.sessionStartTime = 0;
            this.lastBurstTime = 0;
            this.lastCallTime = 0;
            this.totalCalls = 0;
            this.rateLimitHits = 0;
            this.successfulBursts = 0;
            this.intraBurstDelay = (typeof options.intraBurstDelay !== 'undefined') ? options.intraBurstDelay : 0;

            // Smart burst learning
            this.rateLimitPositions = [];
            this.optimalBurstSize = burstLimit;
            this.consecutiveSuccesses = 0;

            // Rolling window for accurate rate tracking (last 60 seconds)
            this.recentCalls = [];

            // Configurable options
            this.maxRequestsPerMinute = options.maxRequestsPerMinute || 60;
            this.smartBurstSize = (typeof options.smartBurstSize !== 'undefined') ? options.smartBurstSize : true;

            try {
                console.log(`🚀 BurstRateLimiter: ${burstLimit} calls/burst, ${(recoveryTime * (safetyMargin||1) / 1000).toFixed(1)}s recovery, ${this.intraBurstDelay}ms intra-burst delay`);
                console.log(`🛑 Rate limit: ${this.maxRequestsPerMinute} requests/minute max`);
            } catch (e) {}
        }

        adaptToBurstLimit() {
            this.rateLimitHits++;
            this.rateLimitPositions.push(this.callCount);
            this.consecutiveSuccesses = 0;

            if (this.smartBurstSize) {
                const avgRateLimitPosition = this.rateLimitPositions.reduce((a, b) => a + b, 0) / this.rateLimitPositions.length;
                const safetyBuffer = Math.max(8, Math.floor(avgRateLimitPosition * 0.4));
                this.optimalBurstSize = Math.max(5, Math.floor(avgRateLimitPosition - safetyBuffer));
                this.burstLimit = this.optimalBurstSize;
            } else {
                let reductionFactor, minLimit;
                if (this.rateLimitHits === 1) {
                    reductionFactor = 0.5;
                    minLimit = 5;
                } else {
                    reductionFactor = 0.3;
                    minLimit = 3;
                }
                const newLimit = Math.max(minLimit, Math.floor(this.callCount * reductionFactor));
                this.burstLimit = newLimit;
            }

            const recoveryMultiplier = 1.5;
            this.recoveryTime = Math.min(30000, this.recoveryTime * recoveryMultiplier);
        }

        adaptToSuccess() {
            this.successfulBursts++;
            this.consecutiveSuccesses++;
        }

        async throttle(sleepFn) {
            const now = Date.now();

            // Use provided sleep function or a minimal fallback
            const sleep = sleepFn || (ms => new Promise(res => setTimeout(res, ms)));

            if (this.intraBurstDelay > 0 && this.lastCallTime > 0) {
                const timeSinceLastCall = now - this.lastCallTime;
                if (timeSinceLastCall < this.intraBurstDelay) {
                    await sleep(this.intraBurstDelay - timeSinceLastCall);
                }
            }

            const rollingRate = this.getRollingWindowRate();
            if (rollingRate >= this.maxRequestsPerMinute) {
                const excessRequests = rollingRate - this.maxRequestsPerMinute + 1;
                const waitTime = (excessRequests / this.maxRequestsPerMinute) * 60000;
                await sleep(waitTime);
            }

            if (now - this.lastBurstTime > this.recoveryTime) {
                if (this.callCount > 0) this.adaptToSuccess();
                this.callCount = 0;
            }

            if (this.callCount === 0) {
                this.burstStartTime = now;
                if (this.sessionStartTime === 0) this.sessionStartTime = now;
            }

            if (this.callCount >= this.burstLimit) {
                const timeSinceBurst = now - this.burstStartTime;
                const waitTime = Math.max(0, this.recoveryTime - timeSinceBurst);
                if (waitTime > 0) await sleep(waitTime);
                this.callCount = 0;
                this.burstStartTime = Date.now();
            }

            this.callCount++;
            this.totalCalls++;
            this.lastBurstTime = now;
            this.lastCallTime = now;
            this.recentCalls.push(now);
        }

        getRollingWindowRate() {
            const now = Date.now();
            const oneMinuteAgo = now - 60000;
            this.recentCalls = this.recentCalls.filter(ts => ts > oneMinuteAgo);
            return this.recentCalls.length;
        }

        getRequestsPerMinute() {
            if (this.totalCalls < 2) return 0;
            const startTime = this.sessionStartTime || this.burstStartTime;
            const elapsedMs = Date.now() - startTime;
            const elapsedMinutes = elapsedMs / 60000;
            if (elapsedMinutes <= 0) return 0;
            const minElapsedMinutes = Math.max(elapsedMinutes, 0.1);
            const rate = this.totalCalls / minElapsedMinutes;
            return Math.min(Math.round(rate), 500);
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
                maxRequestsPerMinute: this.maxRequestsPerMinute,
                recoveryTime: this.recoveryTime,
                intraBurstDelay: this.intraBurstDelay,
                isApproachingLimit: this.getRollingWindowRate() >= this.maxRequestsPerMinute * 0.9
            };
        }
    }

    // Expose on window
    if (typeof window !== 'undefined') {
        window.BurstRateLimiter = BurstRateLimiter;
    }

})();
