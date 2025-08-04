// ========================================
// 🌐 API CLIENT MODULE
// ========================================

// Utility function (copied from utilities module to avoid circular dependency)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ========================================
// 🌐 API FUNCTIONS (from AGSignalExtractor)
// ========================================
export async function fetchWithRetry(url, CONFIG, rateLimiter, maxRetries = null) {
    maxRetries = maxRetries || CONFIG.MAX_RETRIES;
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
export async function getTokenInfo(contractAddress, CONFIG, rateLimiter) {
    const url = `${CONFIG.API_BASE_URL}/swaps?fromDate=2000-01-01&toDate=9999-12-31&search=${contractAddress}&sort=timestamp&direction=desc&page=1&limit=1`;
    const data = await fetchWithRetry(url, CONFIG, rateLimiter);
    
    if (!data.swaps || data.swaps.length === 0) {
        throw new Error('Token not found or no swap data available');
    }
    
    return data.swaps[0];
}

// Get all swaps for a specific token
export async function getAllTokenSwaps(contractAddress, CONFIG, rateLimiter) {
    const url = `${CONFIG.API_BASE_URL}/swaps/by-token/${contractAddress}`;
    const data = await fetchWithRetry(url, CONFIG, rateLimiter);
    
    if (!data.swaps || data.swaps.length === 0) {
        throw new Error('No swap history found for this token');
    }
    
    return data.swaps;
}

// ========================================
// 🔗 BACKTESTER API INTEGRATION (New: Direct API calls instead of UI scraping)
// ========================================
export class BacktesterAPI {
    constructor(CONFIG, getTriggerMode) {
        this.baseUrl = 'https://backtester.alphagardeners.xyz/api/stats';
        this.CONFIG = CONFIG;
        this.getTriggerMode = getTriggerMode;
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
                        console.warn(`⚠️ Skipping invalid numeric parameter ${agCopilotName}: ${value}`);
                        return;
                    }
                    
                    // Special handling for AG Score (must be integer 0-10)
                    if (apiName === 'minAgScore') {
                        const agScore = Math.round(Math.max(0, Math.min(10, numericValue)));
                        apiParams[apiName] = agScore;
                    } else {
                        apiParams[apiName] = numericValue;
                    }
                }
            }
        });
        
        // Add default parameters that are usually present
        const triggerMode = this.getTriggerMode();
        if (triggerMode !== null) {
            apiParams.triggerMode = triggerMode; // Use selected trigger mode (skip if null for Bullish Bonding)
        }
        apiParams.excludeSpoofedTokens = true;
        apiParams.buyingAmount = this.CONFIG.DEFAULT_BUYING_AMOUNT;
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
        const tpParams = this.CONFIG.TP_CONFIGURATIONS
            .map(tp => `tpSize=${tp.size}&tpGain=${tp.gain}`)
            .join('&');
        
        return `${this.baseUrl}?${params.toString()}&${tpParams}`;
    }
    
    // Fetch results from API
    async fetchResults(config, burstRateLimiter, retries = 3) {
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
                    const response = await fetch(url);
                    
                    if (response.status === 429) {
                        // Rate limit detected - inform burst limiter and retry
                        burstRateLimiter.adaptToBurstLimit();
                        const delay = Math.min(5000 * attempt, 15000); // 5s, 10s, 15s max
                        console.log(`⏳ Rate limited (429), waiting ${delay/1000}s before retry ${attempt}/${retries}...`);
                        await sleep(delay);
                        continue;
                    }
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    const data = await response.json();
                    
                    // Validate response structure
                    if (!data || typeof data !== 'object') {
                        throw new Error('Invalid response format');
                    }
                    
                    // Extract metrics from API response
                    const metrics = {
                        tpPnlPercent: data.tpPnlPercent || 0,
                        totalTokens: data.totalTokens || 0,
                        winRate: data.winRate || 0,
                        totalPnl: data.totalPnl || 0,
                        avgPnl: data.avgPnl || 0,
                        maxPnl: data.maxPnl || 0,
                        minPnl: data.minPnl || 0
                    };
                    
                    return {
                        success: true,
                        metrics: metrics,
                        rawData: data
                    };
                    
                } catch (error) {
                    console.warn(`❌ API call attempt ${attempt} failed: ${error.message}`);
                    
                    if (attempt === retries) {
                        return {
                            success: false,
                            error: error.message,
                            source: 'FETCH_ERROR'
                        };
                    }
                    
                    // Wait before retry (not rate limit related)
                    await sleep(1000 * attempt);
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
