// ========================================
// 🛠️ RATE LIMITING MODULE
// ========================================

// Utility function
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Burst Rate Limiter
export class BurstRateLimiter {
    constructor(burstLimit = 20, recoveryTime = 10000, safetyMargin = 1.5, CONFIG) {
        this.CONFIG = CONFIG;
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
        
        if (this.CONFIG.SMART_BURST_SIZE) {
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
        if (rollingRate >= this.CONFIG.MAX_REQUESTS_PER_MINUTE) {
            // Calculate how long to wait to get back under the limit
            const excessRequests = rollingRate - this.CONFIG.MAX_REQUESTS_PER_MINUTE + 1;
            const waitTime = (excessRequests / this.CONFIG.MAX_REQUESTS_PER_MINUTE) * 60000; // Convert to ms
            console.log(`⏳ Rate limit prevention: ${rollingRate}/${this.CONFIG.MAX_REQUESTS_PER_MINUTE} req/min, waiting ${(waitTime/1000).toFixed(1)}s...`);
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
            maxRequestsPerMinute: this.CONFIG.MAX_REQUESTS_PER_MINUTE,
            recoveryTime: this.recoveryTime,
            intraBurstDelay: this.intraBurstDelay,
            isApproachingLimit: this.getRollingWindowRate() >= this.CONFIG.MAX_REQUESTS_PER_MINUTE * 0.9
        };
    }
}

// Legacy APIRateLimiter for signal analysis (still uses simple delay)
export class APIRateLimiter {
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
