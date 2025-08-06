/**
 * AGCopilot-API.js - API Client Module
 * 
 * Contains all API client functionality, rate limiting, signal analysis,
 * and backtester API integration for the AGCopilot system.
 */

// ========================================
// 🚦 RATE LIMITING CLASSES
// ========================================

// Advanced burst rate limiter with token bucket algorithm
class BurstRateLimiter {
    constructor(maxRequests = 30, refillInterval = 60000, safetyMargin = 0.8) {
        this.maxTokens = Math.floor(maxRequests * safetyMargin);
        this.tokens = this.maxTokens;
        this.refillInterval = refillInterval;
        this.refillRate = this.maxTokens / (refillInterval / 1000);
        this.lastRefill = Date.now();
        this.requestHistory = [];
        this.rateLimitDetected = false;
        this.backoffMultiplier = 1;
    }

    // Check if request is allowed and consume token
    async canMakeRequest() {
        this.refillTokens();
        
        if (this.tokens >= 1) {
            this.tokens--;
            this.requestHistory.push(Date.now());
            return true;
        }
        
        return false;
    }

    // Refill tokens based on time elapsed
    refillTokens() {
        const now = Date.now();
        const timeSinceRefill = now - this.lastRefill;
        const tokensToAdd = (timeSinceRefill / 1000) * this.refillRate;
        
        this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
        this.lastRefill = now;
    }

    // Wait for next available token
    async waitForToken() {
        while (!(await this.canMakeRequest())) {
            const waitTime = Math.min(1000 * this.backoffMultiplier, 10000);
            console.log(`⏳ Rate limited, waiting ${waitTime}ms...`);
            await sleep(waitTime);
        }
        
        // Reset backoff on successful request
        this.backoffMultiplier = 1;
    }

    // Handle rate limit detection
    handleRateLimit() {
        this.rateLimitDetected = true;
        this.backoffMultiplier = Math.min(this.backoffMultiplier * 2, 8);
        this.tokens = 0; // Force wait
        console.warn('🚫 Rate limit detected, implementing backoff');
    }

    // Get current stats
    getStats() {
        return {
            tokens: this.tokens,
            maxTokens: this.maxTokens,
            rateLimitDetected: this.rateLimitDetected,
            backoffMultiplier: this.backoffMultiplier,
            recentRequests: this.requestHistory.filter(time => Date.now() - time < 60000).length
        };
    }

    // Reset rate limiter
    reset() {
        this.tokens = this.maxTokens;
        this.rateLimitDetected = false;
        this.backoffMultiplier = 1;
        this.requestHistory = [];
    }
}

// ========================================
// 🌐 BACKTESTER API CLIENT
// ========================================

class BacktesterAPI {
    constructor(config, getTriggerModeFunc) {
        this.config = config;
        this.getTriggerMode = getTriggerModeFunc;
        this.baseUrl = 'https://backtester.alphagardeners.xyz/api';
        this.signalAnalysisUrl = 'https://alphagardeners.xyz/api';
    }

    // Fetch results from backtester API
    async fetchResults(config, rateLimiter) {
        try {
            await rateLimiter.waitForToken();
            
            const params = this.buildQueryParams(config);
            const url = `${this.baseUrl}/stats?${params}`;
            
            const response = await fetch(url);
            
            if (response.status === 429) {
                rateLimiter.handleRateLimit();
                return {
                    success: false,
                    error: 'Rate limited by API'
                };
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            return {
                success: true,
                metrics: {
                    tpPnlPercent: data.tpPnlPercent || 0,
                    totalTokens: data.totalTokens || 0,
                    winRate: data.winRate || 0,
                    avgMultiplier: data.avgMultiplier || 0,
                    maxMultiplier: data.maxMultiplier || 0,
                    avgHoldTime: data.avgHoldTime || 0,
                    successfulTrades: data.successfulTrades || 0,
                    totalTrades: data.totalTrades || 0
                }
            };
            
        } catch (error) {
            console.error('❌ Backtester API error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Build query parameters from configuration
    buildQueryParams(config) {
        const params = new URLSearchParams();
        
        // Basic parameters
        if (config.basic) {
            if (config.basic['Min MCAP (USD)']) {
                params.append('minMcap', config.basic['Min MCAP (USD)']);
            }
            if (config.basic['Max MCAP (USD)']) {
                params.append('maxMcap', config.basic['Max MCAP (USD)']);
            }
        }
        
        // Token details
        if (config.tokenDetails) {
            if (config.tokenDetails['Min AG Score']) {
                params.append('minAGScore', config.tokenDetails['Min AG Score']);
            }
            if (config.tokenDetails['Min Deployer Age (min)']) {
                params.append('minDeployerAge', config.tokenDetails['Min Deployer Age (min)']);
            }
            if (config.tokenDetails['Min Token Age (sec)']) {
                params.append('minTokenAge', config.tokenDetails['Min Token Age (sec)']);
            }
        }
        
        // Wallet parameters
        if (config.wallets) {
            if (config.wallets['Min Holders']) {
                params.append('minHolders', config.wallets['Min Holders']);
            }
            if (config.wallets['Min Unique Wallets']) {
                params.append('minUniqueWallets', config.wallets['Min Unique Wallets']);
            }
            if (config.wallets['Max Unique Wallets']) {
                params.append('maxUniqueWallets', config.wallets['Max Unique Wallets']);
            }
            if (config.wallets['Min KYC Wallets']) {
                params.append('minKYCWallets', config.wallets['Min KYC Wallets']);
            }
        }
        
        // Risk parameters
        if (config.risk) {
            if (config.risk['Max Bundled %']) {
                params.append('maxBundledPercent', config.risk['Max Bundled %']);
            }
            if (config.risk['Min Deployer Balance (SOL)']) {
                params.append('minDeployerBalance', config.risk['Min Deployer Balance (SOL)']);
            }
            if (config.risk['Min Buy Ratio %']) {
                params.append('minBuyRatio', config.risk['Min Buy Ratio %']);
            }
            if (config.risk['Max Vol MCAP %']) {
                params.append('maxVolMcapRatio', config.risk['Max Vol MCAP %']);
            }
            if (config.risk['Max Drained %']) {
                params.append('maxDrainedPercent', config.risk['Max Drained %']);
            }
            if (config.risk['Max Drained Count']) {
                params.append('maxDrainedCount', config.risk['Max Drained Count']);
            }
        }
        
        // Advanced parameters
        if (config.advanced) {
            if (config.advanced['Min TTC (sec)']) {
                params.append('minTTC', config.advanced['Min TTC (sec)']);
            }
            if (config.advanced['Max Liquidity %']) {
                params.append('maxLiquidity', config.advanced['Max Liquidity %']);
            }
            if (config.advanced['Min Win Pred %']) {
                params.append('minWinPred', config.advanced['Min Win Pred %']);
            }
        }
        
        // Trigger mode
        const triggerMode = this.getTriggerMode();
        if (triggerMode !== null) {
            params.append('triggerMode', triggerMode);
        }
        
        // Default parameters
        params.append('excludeSpoofedTokens', 'true');
        params.append('buyingAmount', this.config.DEFAULT_BUYING_AMOUNT || 0.25);
        
        // Take profit configurations
        if (this.config.TP_CONFIGURATIONS) {
            this.config.TP_CONFIGURATIONS.forEach(tp => {
                params.append('tpSize', tp.size);
                params.append('tpGain', tp.gain);
            });
        }
        
        return params.toString();
    }
}

// ========================================
// 🔍 SIGNAL ANALYSIS FUNCTIONS
// ========================================

// Get token information from signal analysis API
async function getTokenInfo(contractAddress) {
    try {
        const response = await fetch(`https://alphagardeners.xyz/api/token/${contractAddress}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        return {
            address: data.address,
            name: data.name,
            symbol: data.symbol,
            signalMcap: data.signalMcap,
            signalPrice: data.signalPrice,
            currentMcap: data.currentMcap,
            currentPrice: data.currentPrice,
            athMcap: data.athMcap,
            athPrice: data.athPrice,
            deployerAge: data.deployerAge,
            tokenAge: data.tokenAge,
            agScore: data.agScore,
            holders: data.holders,
            uniqueWallets: data.uniqueWallets,
            kycWallets: data.kycWallets,
            bundledPercent: data.bundledPercent,
            deployerBalance: data.deployerBalance,
            buyRatio: data.buyRatio,
            volMcapRatio: data.volMcapRatio,
            drainedPercent: data.drainedPercent,
            drainedCount: data.drainedCount,
            ttc: data.ttc,
            liquidity: data.liquidity,
            winPred: data.winPred
        };
        
    } catch (error) {
        console.error('❌ Failed to get token info:', error);
        return null;
    }
}

// Get all token swaps from signal analysis API
async function getAllTokenSwaps(contractAddress) {
    try {
        const response = await fetch(`https://alphagardeners.xyz/api/token/${contractAddress}/swaps`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.swaps || [];
        
    } catch (error) {
        console.error('❌ Failed to get token swaps:', error);
        return [];
    }
}

// ========================================
// 🔄 UTILITY FUNCTIONS
// ========================================

// Sleep utility function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch with retry logic
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            
            if (response.status === 429) {
                const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
                console.warn(`⏳ Rate limited, waiting ${waitTime}ms (attempt ${attempt}/${maxRetries})`);
                await sleep(waitTime);
                continue;
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
            
        } catch (error) {
            lastError = error;
            
            if (attempt < maxRetries) {
                const waitTime = Math.pow(2, attempt) * 1000;
                console.warn(`❌ Request failed (attempt ${attempt}/${maxRetries}), retrying in ${waitTime}ms:`, error.message);
                await sleep(waitTime);
            }
        }
    }
    
    throw lastError;
}

// ========================================
// 📊 SCORING FUNCTIONS
// ========================================

// Calculate robust score for optimization results
function calculateRobustScore(metrics, config) {
    if (!metrics || metrics.tpPnlPercent === undefined) {
        return null;
    }
    
    // If robust scoring is disabled, just return the raw PnL
    if (!config.USE_ROBUST_SCORING) {
        return {
            score: metrics.tpPnlPercent,
            components: {
                rawPnL: metrics.tpPnlPercent,
                reliability: 1,
                consistency: 1
            }
        };
    }
    
    const rawPnL = metrics.tpPnlPercent;
    const winRate = metrics.winRate || 0;
    const totalTokens = metrics.totalTokens || 0;
    
    // Reliability factor based on sample size
    const reliabilityFactor = Math.min(1.0, Math.log(totalTokens + 1) / Math.log(100));
    
    // Penalize configurations with very low win rates
    if (winRate < config.MIN_WIN_RATE) {
        return {
            score: -10,
            components: {
                rawPnL: rawPnL,
                reliability: reliabilityFactor,
                consistency: winRate,
                penalty: `Win rate ${winRate.toFixed(1)}% below minimum ${config.MIN_WIN_RATE}%`
            }
        };
    }
    
    // Calculate weighted score components
    const returnComponent = rawPnL * config.RETURN_WEIGHT;
    const consistencyComponent = winRate * config.CONSISTENCY_WEIGHT;
    const baseScore = returnComponent + consistencyComponent;
    
    // Apply reliability weighting
    const finalScore = baseScore * (1 - config.RELIABILITY_WEIGHT) + 
                      baseScore * reliabilityFactor * config.RELIABILITY_WEIGHT;
    
    return {
        score: finalScore,
        components: {
            rawPnL: rawPnL,
            returnComponent: returnComponent,
            consistencyComponent: consistencyComponent,
            reliability: reliabilityFactor,
            baseScore: baseScore,
            finalScore: finalScore
        }
    };
}

// ========================================
// 🔍 MANUAL SCAN FUNCTIONS
// ========================================

// Run manual scan of current signals
async function runManualScan(triggerMode = null) {
    try {
        console.log('🔍 Starting manual signal scan...');
        
        const mode = triggerMode || 4; // Default to Launchpads
        const modeNames = {
            1: 'New Launches',
            2: 'Trending', 
            3: 'Gainers',
            4: 'Launchpads',
            5: 'Fast Track',
            6: 'All-Time Best'
        };
        
        console.log(`📡 Scanning ${modeNames[mode] || 'Unknown'} signals...`);
        
        // This would typically fetch current signals from the API
        // For now, return a placeholder response
        const mockResults = {
            success: true,
            signalCount: 15,
            mode: modeNames[mode],
            timestamp: new Date().toISOString(),
            signals: [
                {
                    contractAddress: '0x123...abc',
                    name: 'Example Token',
                    symbol: 'EXAMPLE',
                    mcap: 25000,
                    agScore: 7
                }
            ]
        };
        
        console.log(`✅ Scan complete: Found ${mockResults.signalCount} signals`);
        return mockResults;
        
    } catch (error) {
        console.error('❌ Manual scan failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ========================================
// 🔧 MODULE INITIALIZATION
// ========================================
function init(namespace) {
    // Store API functions in namespace
    namespace.api = {
        BurstRateLimiter,
        BacktesterAPI,
        fetchWithRetry,
        getTokenInfo,
        getAllTokenSwaps,
        calculateRobustScore,
        runManualScan,
        sleep
    };
    
    console.log('✅ API module initialized');
    return Promise.resolve();
}

// ========================================
// 📤 MODULE EXPORTS
// ========================================
module.exports = {
    BurstRateLimiter,
    BacktesterAPI,
    fetchWithRetry,
    getTokenInfo,
    getAllTokenSwaps,
    calculateRobustScore,
    runManualScan,
    sleep,
    init
};
