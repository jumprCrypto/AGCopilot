/**
 * @fileoverview Rate limiting classes for API request management
 * @version 1.0.0
 */

import { sleep } from './utils.js';

/**
 * Enhanced rate limiter to prevent 429 errors with exponential backoff
 */
export class RateLimiter {
    constructor(minDelay = 350) {
        this.minDelay = minDelay;
        this.lastRequest = 0;
        this.consecutiveErrors = 0;
        this.lastErrorTime = 0;
        this.requestQueue = [];
        this.isProcessing = false;
    }
    
    async throttle() {
        const now = Date.now();
        const elapsed = now - this.lastRequest;
        
        // Calculate delay with exponential backoff for errors
        let currentDelay = this.minDelay;
        
        // If we've had recent 429 errors, apply exponential backoff
        if (this.consecutiveErrors > 0 && (now - this.lastErrorTime) < 30000) { // 30 second window
            currentDelay = this.minDelay * Math.pow(2, Math.min(this.consecutiveErrors, 4)); // Cap at 16x
            console.log(`🚦 Rate limiter: ${this.consecutiveErrors} consecutive errors, delay increased to ${currentDelay}ms`);
        }
        
        if (elapsed < currentDelay) {
            await sleep(currentDelay - elapsed);
        }
        
        this.lastRequest = Date.now();
    }
    
    // Method to call when a 429 error occurs
    recordError() {
        this.consecutiveErrors++;
        this.lastErrorTime = Date.now();
        console.log(`🚦 Rate limiter: Error recorded, consecutive errors: ${this.consecutiveErrors}`);
    }
    
    // Method to call when a request succeeds
    recordSuccess() {
        if (this.consecutiveErrors > 0) {
            console.log(`🚦 Rate limiter: Success after ${this.consecutiveErrors} errors, resetting counter`);
            this.consecutiveErrors = 0;
        }
    }
    
    // Get current effective delay for logging
    getCurrentDelay() {
        const now = Date.now();
        if (this.consecutiveErrors > 0 && (now - this.lastErrorTime) < 30000) {
            return this.minDelay * Math.pow(2, Math.min(this.consecutiveErrors, 4));
        }
        return this.minDelay;
    }
    
    // Get rate limiter status for monitoring
    getStatus() {
        return {
            baseDelay: this.minDelay,
            currentDelay: this.getCurrentDelay(),
            consecutiveErrors: this.consecutiveErrors,
            lastErrorTime: this.lastErrorTime,
            timeSinceLastError: this.lastErrorTime ? Date.now() - this.lastErrorTime : 0
        };
    }
}

/**
 * Burst rate limiter for handling multiple rapid requests
 */
export class BurstRateLimiter {
    constructor(options = {}) {
        this.burstLimit = options.burstLimit || 5;  // Number of requests allowed in burst
        this.burstWindow = options.burstWindow || 10000;  // Time window for burst (ms)
        this.baseDelay = options.baseDelay || 500;  // Base delay between requests
        this.burstDelay = options.burstDelay || 2000;  // Delay after burst is exhausted
        
        this.requestTimes = [];
        this.lastRequest = 0;
        this.burstExhausted = false;
        this.burstResetTime = 0;
    }
    
    async throttle() {
        const now = Date.now();
        
        // Clean old request times outside the burst window
        this.requestTimes = this.requestTimes.filter(time => now - time < this.burstWindow);
        
        // Check if burst is available
        if (this.requestTimes.length >= this.burstLimit) {
            this.burstExhausted = true;
            this.burstResetTime = now + this.burstWindow;
            console.log(`🚦 Burst limit reached (${this.burstLimit} requests in ${this.burstWindow}ms), switching to slower mode`);
        }
        
        // Reset burst if window has passed
        if (this.burstExhausted && now >= this.burstResetTime) {
            this.burstExhausted = false;
            this.requestTimes = [];
            console.log('🚦 Burst limit reset, returning to normal rate');
        }
        
        // Apply appropriate delay
        const elapsed = now - this.lastRequest;
        const requiredDelay = this.burstExhausted ? this.burstDelay : this.baseDelay;
        
        if (elapsed < requiredDelay) {
            await sleep(requiredDelay - elapsed);
        }
        
        // Record this request
        this.lastRequest = Date.now();
        this.requestTimes.push(this.lastRequest);
    }
    
    getStatus() {
        return {
            burstLimit: this.burstLimit,
            currentRequests: this.requestTimes.length,
            burstExhausted: this.burstExhausted,
            nextResetTime: this.burstResetTime,
            currentDelay: this.burstExhausted ? this.burstDelay : this.baseDelay
        };
    }
}

/**
 * Simple API rate limiter for basic request throttling
 */
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
    
    getStatus() {
        return {
            delay: this.delay,
            lastRequest: this.lastRequest,
            timeSinceLastRequest: Date.now() - this.lastRequest
        };
    }
}

/**
 * Adaptive rate limiter that adjusts delay based on response times
 */
export class AdaptiveRateLimiter {
    constructor(options = {}) {
        this.minDelay = options.minDelay || 200;
        this.maxDelay = options.maxDelay || 5000;
        this.targetResponseTime = options.targetResponseTime || 1000;
        this.adjustmentFactor = options.adjustmentFactor || 0.1;
        
        this.currentDelay = this.minDelay;
        this.lastRequest = 0;
        this.responseTimeHistory = [];
        this.maxHistorySize = 10;
    }
    
    async throttle() {
        const now = Date.now();
        const elapsed = now - this.lastRequest;
        
        if (elapsed < this.currentDelay) {
            await sleep(this.currentDelay - elapsed);
        }
        
        this.lastRequest = Date.now();
    }
    
    recordResponseTime(responseTime) {
        this.responseTimeHistory.push(responseTime);
        
        if (this.responseTimeHistory.length > this.maxHistorySize) {
            this.responseTimeHistory.shift();
        }
        
        // Calculate average response time
        const avgResponseTime = this.responseTimeHistory.reduce((sum, time) => sum + time, 0) / this.responseTimeHistory.length;
        
        // Adjust delay based on response time
        if (avgResponseTime > this.targetResponseTime) {
            // Slow responses - increase delay
            this.currentDelay = Math.min(
                this.maxDelay,
                this.currentDelay * (1 + this.adjustmentFactor)
            );
        } else {
            // Fast responses - decrease delay
            this.currentDelay = Math.max(
                this.minDelay,
                this.currentDelay * (1 - this.adjustmentFactor)
            );
        }
        
        console.log(`🚦 Adaptive rate limiter: avg response ${avgResponseTime.toFixed(0)}ms, delay adjusted to ${this.currentDelay.toFixed(0)}ms`);
    }
    
    getStatus() {
        const avgResponseTime = this.responseTimeHistory.length > 0 
            ? this.responseTimeHistory.reduce((sum, time) => sum + time, 0) / this.responseTimeHistory.length 
            : 0;
            
        return {
            currentDelay: this.currentDelay,
            minDelay: this.minDelay,
            maxDelay: this.maxDelay,
            averageResponseTime: avgResponseTime,
            historySize: this.responseTimeHistory.length
        };
    }
}