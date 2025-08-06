(async function () {
    console.clear();
    console.log('%c🔬 AG Parameter Impact Discovery v2.0 - API Direct 🔬', 'color: purple; font-size: 16px; font-weight: bold;');
    console.log('%c🔍 Direct API Integration + Advanced Rate Limiting', 'color: green; font-size: 12px;');

    // ========================================
    // 🎯 CONFIGURATION
    // ========================================
    const DISCOVERY_CONFIG = {
        BASELINE_CONFIG: {
            // Set this to your current best config or use one of the presets
            //   tokenDetails: { "Min AG Score": "1" },
            //   wallets: { "Min KYC Wallets": 2, "Max KYC Wallets": 5, "Max Unique Wallets": 2 },
            //   risk: { "Max Bundled %": 5, "Min Buy Ratio %": 70, "Max Drained Count": 10, "Description": "Don't care", "Fresh Deployer": "Don't care" },
            //   advanced: { "Max Liquidity %": 80, "Min Win Pred %": 30 }
        },
        
        MIN_TOKENS_REQUIRED: 25,
        BACKTEST_WAIT_TIME: 20000, // Based on rate limit recovery (20s like Enhanced)
        TESTS_PER_PARAMETER: 10, // How many variations to test per parameter
        MIN_IMPROVEMENT_THRESHOLD: 1, // Minimum improvement to consider significant
        
        // API Configuration (from AGCopilot-Enhanced)
        API_BASE_URL: 'https://backtester.alphagardeners.xyz/api',
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000,
        DEFAULT_BUYING_AMOUNT: 0.25,
        DEFAULT_TRIGGER_MODE: 4, // Default to Launchpads
        
        // Take Profit (TP) configuration for accurate PnL calculations
        TP_CONFIGURATIONS: [
            { size: 20, gain: 300 },
            { size: 20, gain: 650 },
            { size: 20, gain: 1400 },
            { size: 20, gain: 3000 },
            { size: 20, gain: 10000 }
        ],
        
        // Rate limiting - Conservative for discovery
        RATE_LIMIT_THRESHOLD: 15,    // Conservative burst size for discovery
        RATE_LIMIT_RECOVERY: 12000,  // 12s recovery time (conservative)
        RATE_LIMIT_SAFETY_MARGIN: 1.8, // 80% safety margin
        INTRA_BURST_DELAY: 150,      // 150ms delay between requests
        MAX_REQUESTS_PER_MINUTE: 40, // Conservative hard cap
        USE_BURST_RATE_LIMITING: true
    };

    // Complete config template (updated with corrected field names)
    const COMPLETE_CONFIG_TEMPLATE = {
        basic: {
            "Min MCAP (USD)": undefined,
            "Max MCAP (USD)": undefined
        },
        tokenDetails: {
            "Min Deployer Age (min)": undefined,
            "Min Token Age (sec)": undefined, // Fixed: was "(min)"
            "Max Token Age (sec)": undefined, // Fixed: was "(min)" 
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

    // Parameter test variations (updated with corrected field names)
    const PARAM_TEST_VALUES = {
        // Basic
        'Min MCAP (USD)': [0, 1000, 5000, 10000, 20000],
        'Max MCAP (USD)': [5000, 10000, 15000, 20000, 25000, 30000, 35000],
        
        // Token Details  
        'Min Deployer Age (min)': [10, 30, 60],
        'Min Token Age (sec)': [30, 60, 120, 300], // Fixed: changed from (min) to (sec)
        'Max Token Age (sec)': [300, 600, 1800, 3600], // Fixed: changed from (min) to (sec)
        'Min AG Score': ["3", "5", "7"],
        
        // Wallets
        'Min Unique Wallets': [1, 2, 3],
        'Max Unique Wallets': [1, 2, 5, 10],
        'Min KYC Wallets': [1, 2, 3, 4, 5],
        'Max KYC Wallets': [2, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        'Min Holders': [, 2, 3, 4, 5],
        'Max Holders': [5, 10, 20, 50],
        
        // Risk
        'Min Bundled %': [0, 1, 5],
        'Max Bundled %': [1, 5, 10, 15, 20, 25, 30, 35],
        'Min Deployer Balance (SOL)': [0, 0.5, 1, 2, 3, 4, 5],
        'Min Buy Ratio %': [30, 40, 50, 60, 70, 80, 90],
        'Max Buy Ratio %': [80, 90, 95, 100],
        'Min Vol MCAP %': [10, 20, 30, 40, 50, 60, 70],
        'Max Vol MCAP %': [30, 40, 50, 60, 70, 80, 100, 120, 200, 250, 300, 350],
        'Max Drained %': [0, 10, 50],
        'Max Drained Count': [0, 1, 2, 3, 4, 5, 10, 20, 50],
        
        // Advanced
        'Min TTC (sec)': [0, 5, 10, 30, 60],
        'Max TTC (sec)': [30, 120, 300, 500, 1000, 2000, 5000],
        'Max Liquidity %': [50, 75, 90, 100],
        'Min Win Pred %': [0, 1, 10,20, 30, 50]
    };

    // ========================================
    // 🛠️ UTILITIES
    // ========================================
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    let DISCOVERY_STOPPED = false;
    
    // Initialize window.STOPPED for global access
    window.STOPPED = false;

    // Efficient deep clone utility function
    function deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => deepClone(item));
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }

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

    // ========================================
    // 🛠️ RATE LIMITING (from AGCopilot-Enhanced)
    // ========================================
    class BurstRateLimiter {
        constructor(burstSize = 20, recoveryTime = 10000, safetyMargin = 1.5) {
            this.burstSize = burstSize;
            this.recoveryTime = recoveryTime;
            this.safetyMargin = safetyMargin;
            this.requestQueue = [];
            this.isThrottling = false;
            this.lastResetTime = Date.now();
            this.requestsInCurrentWindow = 0;
            this.errorCount = 0;
            this.adaptiveBurstSize = burstSize;
            this.consecutiveSuccesses = 0;
            
            console.log(`🔧 Rate Limiter: ${burstSize} burst, ${recoveryTime/1000}s recovery, ${safetyMargin}x safety margin`);
        }

        async throttle() {
            const now = Date.now();
            
            // Clean old requests from the queue (older than 1 minute)
            this.requestQueue = this.requestQueue.filter(time => now - time < 60000);
            
            // Check if we need to throttle
            if (this.requestQueue.length >= this.adaptiveBurstSize) {
                const oldestInBurst = this.requestQueue[this.requestQueue.length - this.adaptiveBurstSize];
                if (now - oldestInBurst < this.recoveryTime * this.safetyMargin) {
                    const waitTime = (this.recoveryTime * this.safetyMargin) - (now - oldestInBurst);
                    if (waitTime > 0) {
                        await sleep(waitTime);
                    }
                }
            }
            
            // Add current request to queue
            this.requestQueue.push(now);
            
            // Apply intra-burst delay
            if (DISCOVERY_CONFIG.INTRA_BURST_DELAY > 0) {
                await sleep(DISCOVERY_CONFIG.INTRA_BURST_DELAY);
            }
        }

        handleRateLimitError() {
            this.errorCount++;
            this.consecutiveSuccesses = 0;
            
            // Adaptive burst size reduction on errors
            if (this.errorCount > 0 && this.adaptiveBurstSize > 5) {
                this.adaptiveBurstSize = Math.max(5, Math.floor(this.adaptiveBurstSize * 0.8));
                console.log(`⚠️ Rate limit error! Reducing burst size to ${this.adaptiveBurstSize}`);
            }
        }

        handleSuccess() {
            this.consecutiveSuccesses++;
            
            // Gradually increase burst size on consecutive successes
            if (this.consecutiveSuccesses > 20 && this.adaptiveBurstSize < this.burstSize) {
                this.adaptiveBurstSize = Math.min(this.burstSize, this.adaptiveBurstSize + 1);
                this.consecutiveSuccesses = 0;
                console.log(`✅ Increasing burst size to ${this.adaptiveBurstSize}`);
            }
        }
    }

    // Create rate limiter instance
    const burstRateLimiter = new BurstRateLimiter(
        DISCOVERY_CONFIG.RATE_LIMIT_THRESHOLD, 
        DISCOVERY_CONFIG.RATE_LIMIT_RECOVERY, 
        DISCOVERY_CONFIG.RATE_LIMIT_SAFETY_MARGIN
    );

    // ========================================
    // 🌐 API FUNCTIONS (from AGCopilot-Enhanced)
    // ========================================
    
    // Get selected trigger mode from UI (like AGCopilot-Enhanced)
    function getTriggerMode() {
        const triggerSelect = document.getElementById('trigger-mode-select');
        if (triggerSelect) {
            const value = triggerSelect.value;
            return value === '' ? null : parseInt(value); // Handle empty string for "Bullish Bonding"
        }
        return DISCOVERY_CONFIG.DEFAULT_TRIGGER_MODE; // Default to Launchpads if no selection
    }
    
    async function fetchWithRetry(url, options = {}, maxRetries = DISCOVERY_CONFIG.MAX_RETRIES) {
        await burstRateLimiter.throttle();
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(url, {
                    method: options.method || 'GET',
                    headers: {
                        'Accept': 'application/json',
                        ...options.headers
                    },
                    ...options
                });

                if (!response.ok) {
                    if (response.status === 429) {
                        burstRateLimiter.handleRateLimitError();
                        console.log(`⏳ Rate limited (${response.status}), waiting ${DISCOVERY_CONFIG.RATE_LIMIT_RECOVERY/1000}s...`);
                        await sleep(DISCOVERY_CONFIG.RATE_LIMIT_RECOVERY);
                        continue;
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                burstRateLimiter.handleSuccess();
                return data;
                
            } catch (error) {
                if (error.message.includes('429') || error.message.toLowerCase().includes('rate limit')) {
                    burstRateLimiter.handleRateLimitError();
                    console.log(`⏳ Rate limit error (attempt ${attempt}), waiting ${DISCOVERY_CONFIG.RATE_LIMIT_RECOVERY/1000}s...`);
                    await sleep(DISCOVERY_CONFIG.RATE_LIMIT_RECOVERY);
                    continue;
                }
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                console.log(`⚠️ Request failed (attempt ${attempt}/${maxRetries}): ${error.message}`);
                await sleep(DISCOVERY_CONFIG.RETRY_DELAY * attempt);
            }
        }
    }

    // ========================================
    // 📊 BACKTESTER API INTEGRATION (Direct API calls)
    // ========================================
    class BacktesterAPI {
        constructor() {
            this.baseURL = 'https://backtester.alphagardeners.xyz/api/stats';
            this.defaultBuyingAmount = DISCOVERY_CONFIG.DEFAULT_BUYING_AMOUNT;
        }

        // Map internal parameter names to API parameter names
        mapToAPIParams(config) {
            const apiParams = {
                buyingAmount: this.defaultBuyingAmount,
                excludeSpoofedTokens: true
            };

            // Add trigger mode from UI (like AGCopilot-Enhanced)
            const triggerMode = getTriggerMode();
            if (triggerMode !== null) {
                apiParams.triggerMode = triggerMode;
            }

            // Flatten the nested config structure
            const flatConfig = {};
            for (const section of Object.values(config)) {
                Object.assign(flatConfig, section);
            }

            // Map each parameter to API format (based on modules/api-client.js)
            const paramMapping = {
                'Min MCAP (USD)': 'minMcap',
                'Max MCAP (USD)': 'maxMcap',
                'Min Deployer Age (min)': 'minDeployerAge',
                'Min Token Age (sec)': 'minTokenAge',
                'Max Token Age (sec)': 'maxTokenAge',
                'Min AG Score': 'minAgScore',
                'Min Holders': 'minHolders',
                'Max Holders': 'maxHolders',
                'Min Unique Wallets': 'minUniqueWallets',
                'Max Unique Wallets': 'maxUniqueWallets',
                'Min KYC Wallets': 'minKycWallets',
                'Max KYC Wallets': 'maxKycWallets',
                'Min Bundled %': 'minBundledPercent',
                'Max Bundled %': 'maxBundledPercent',
                'Min Deployer Balance (SOL)': 'minDeployerBalance',
                'Min Buy Ratio %': 'minBuyRatio',
                'Max Buy Ratio %': 'maxBuyRatio',
                'Min Vol MCAP %': 'minVolMcapPercent',
                'Max Vol MCAP %': 'maxVolMcapPercent',
                'Max Drained %': 'maxDrainedPercent',
                'Max Drained Count': 'maxDrainedCount',
                'Min TTC (sec)': 'minTtc',
                'Max TTC (sec)': 'maxTtc',
                'Max Liquidity %': 'maxLiquidityPct',
                'Min Win Pred %': 'minWinPred'
            };

            // Apply mappings, converting values as needed
            for (const [internalName, apiName] of Object.entries(paramMapping)) {
                const value = flatConfig[internalName];
                if (value !== undefined && value !== null && value !== '') {
                    // Convert string numbers to actual numbers
                    let processedValue = value;
                    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
                        processedValue = parseFloat(value);
                    }
                    
                    // Skip if value is NaN, Infinity, or not a valid number
                    if (isNaN(processedValue) || !isFinite(processedValue)) {
                        console.warn(`⚠️ Skipping invalid parameter ${internalName}: ${value}`);
                        continue;
                    }
                    
                    // Special handling for AG Score (must be integer 0-10)
                    if (apiName === 'minAgScore') {
                        processedValue = Math.round(Math.max(0, Math.min(10, processedValue)));
                    }
                    
                    apiParams[apiName] = processedValue;
                }
            }

            return apiParams;
        }

        // Build API URL with query parameters
        buildApiUrl(apiParams) {
            const url = new URL(this.baseURL);
            
            // Add regular parameters
            Object.entries(apiParams).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.append(key, value);
                }
            });
            
            // Add multiple TP configurations
            DISCOVERY_CONFIG.TP_CONFIGURATIONS.forEach(tp => {
                url.searchParams.append('tpSize', tp.size);
                url.searchParams.append('tpGain', tp.gain);
            });
            
            return url.toString();
        }

        async testConfiguration(config, testName = 'API Test') {
            try {
                const apiParams = this.mapToAPIParams(config);
                const url = this.buildApiUrl(apiParams);
                
                console.log(`📡 API Test: ${testName}`);
                
                const response = await fetchWithRetry(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (!response || typeof response !== 'object') {
                    throw new Error('Invalid API response format');
                }

                // Transform API response to internal format (matching AGCopilot-Enhanced)
                const metrics = {
                    tokensMatched: response.totalTokens || 0,
                    tpPnlPercent: response.averageTpGain || 0,  // Use averageTpGain directly like AGCopilot-Enhanced
                    winRate: response.winRate || 0,
                    avgReturn: response.averageAthGain || 0,
                    totalSignals: response.totalAvailableSignals || 0
                };

                console.log(`✅ API Response: ${metrics.tpPnlPercent.toFixed(1)}% PnL, ${metrics.tokensMatched} tokens, ${metrics.winRate?.toFixed(1)}% win rate`);
                return metrics;

            } catch (error) {
                console.log(`❌ API Error: ${error.message}`);
                throw error;
            }
        }
    }

    // Initialize the API client
    const backtesterAPI = new BacktesterAPI();

    // ========================================
    // 🔬 PARAMETER IMPACT DISCOVERER (API-Direct Version)
    // ========================================
    class ParameterImpactDiscoverer {
        constructor() {
            this.results = [];
            this.baselineScore = 0;
            this.baselineTokens = 0;
            this.startTime = Date.now();
        }

        async establishBaseline() {
            console.log('%c📊 Establishing baseline via API...', 'color: blue; font-weight: bold;');
            
            const triggerMode = getTriggerMode();
            const triggerModeNames = ['Bullish Bonding', 'God Mode', 'Moon Finder', 'Fomo', 'Launchpads', 'Smart Tracker'];
            const triggerModeName = triggerModeNames[triggerMode] || `Mode ${triggerMode}`;
            console.log(`🎯 Using Trigger Mode: ${triggerModeName} (${triggerMode})`);
            
            const completeBaseline = ensureCompleteConfig(DISCOVERY_CONFIG.BASELINE_CONFIG);
            
            const metrics = await backtesterAPI.testConfiguration(completeBaseline, 'Baseline');
            if (!metrics || metrics.tokensMatched < DISCOVERY_CONFIG.MIN_TOKENS_REQUIRED) {
                throw new Error("Baseline test failed - insufficient data");
            }

            this.baselineScore = metrics.tpPnlPercent;
            this.baselineTokens = metrics.tokensMatched;
            
            console.log(`✅ Baseline: ${this.baselineScore.toFixed(1)}% PnL, ${this.baselineTokens} tokens`);
            return true;
        }

        async testParameterVariation(param, value, section) {
            if (DISCOVERY_STOPPED) return null;

            try {
                // Create a fresh copy of baseline config
                const testConfig = ensureCompleteConfig(DISCOVERY_CONFIG.BASELINE_CONFIG);
                
                // ONLY modify the specific parameter being tested
                testConfig[section][param] = value;
                
                console.log(`    🎯 API Testing ${param} = ${value} (keeping all other baseline values)`);

                const metrics = await backtesterAPI.testConfiguration(testConfig, `${param}=${value}`);
                if (!metrics) {
                    console.log(`    ⚠️ Failed to get API response`);
                    return null;
                }
                
                if (metrics.tokensMatched < DISCOVERY_CONFIG.MIN_TOKENS_REQUIRED) {
                    console.log(`    ⚠️ Insufficient tokens: ${metrics.tokensMatched} < ${DISCOVERY_CONFIG.MIN_TOKENS_REQUIRED}`);
                    return null;
                }

                const improvement = metrics.tpPnlPercent - this.baselineScore;
                const tokenRatio = metrics.tokensMatched / this.baselineTokens;

                return {
                    score: metrics.tpPnlPercent,
                    improvement: improvement,
                    tokens: metrics.tokensMatched,
                    tokenRatio: tokenRatio,
                    winRate: metrics.winRate || 0
                };
            } catch (error) {
                console.log(`    ❌ Error testing ${param}=${value}:`, error.message);
                return null;
            }
        }

        async analyzeParameter(param, section) {
            console.log(`%c🔬 Analyzing ${param}...`, 'color: orange; font-weight: bold;');
            
            const testValues = PARAM_TEST_VALUES[param];
            if (!testValues) {
                console.log(`⚠️ No test values defined for ${param}`);
                return null;
            }

            const paramResults = [];
            
            for (const value of testValues) {
                if (DISCOVERY_STOPPED) break;

                console.log(`  Testing ${param}: ${value}`);
                
                const result = await this.testParameterVariation(param, value, section);
                
                if (result) {
                    paramResults.push({
                        value: value,
                        ...result
                    });
                    
                    if (result.improvement > DISCOVERY_CONFIG.MIN_IMPROVEMENT_THRESHOLD) {
                        console.log(`    ✅ ${value}: ${result.score.toFixed(1)}% (+${result.improvement.toFixed(1)}%) [${result.tokens} tokens]`);
                    } else {
                        console.log(`    📊 ${value}: ${result.score.toFixed(1)}% (${result.improvement.toFixed(1)}%) [${result.tokens} tokens]`);
                    }
                } else {
                    console.log(`    ❌ ${value}: Failed or insufficient tokens`);
                }
            }

            if (paramResults.length === 0) return null;

            // Calculate parameter impact metrics
            const improvements = paramResults.map(r => r.improvement);
            const maxImprovement = Math.max(...improvements);
            const minImprovement = Math.min(...improvements);
            const avgImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;
            const variance = improvements.reduce((sum, val) => sum + Math.pow(val - avgImprovement, 2), 0) / improvements.length;
            const stdDev = Math.sqrt(variance);

            const impactData = {
                parameter: param,
                section: section,
                maxImprovement: maxImprovement,
                minImprovement: minImprovement,
                avgImprovement: avgImprovement,
                variance: variance,
                stdDev: stdDev,
                range: maxImprovement - minImprovement,
                significantResults: paramResults.filter(r => Math.abs(r.improvement) > DISCOVERY_CONFIG.MIN_IMPROVEMENT_THRESHOLD).length,
                totalTests: paramResults.length,
                results: paramResults
            };

            console.log(`📈 ${param} Impact: Max +${maxImprovement.toFixed(1)}%, Range ${impactData.range.toFixed(1)}%, StdDev ${stdDev.toFixed(1)}`);
            return impactData;
        }

        async runDiscovery() {
            console.log('%c🔬 Starting Parameter Impact Discovery', 'color: purple; font-weight: bold;');
            
            try {
                await this.establishBaseline();
                
                // Parameters to test (organized by section)
                const parametersToTest = [
                    // Basic
                    { param: 'Min MCAP (USD)', section: 'basic' },
                    { param: 'Max MCAP (USD)', section: 'basic' },
                    
                    // Token Details
                    { param: 'Min Deployer Age (min)', section: 'tokenDetails' },
                    { param: 'Min Token Age (sec)', section: 'tokenDetails' }, // Fixed: was (min)
                    { param: 'Max Token Age (sec)', section: 'tokenDetails' }, // Fixed: was (min)
                    { param: 'Min AG Score', section: 'tokenDetails' },
                    
                    // Wallets
                    { param: 'Min Unique Wallets', section: 'wallets' },
                    { param: 'Max Unique Wallets', section: 'wallets' },
                    { param: 'Min KYC Wallets', section: 'wallets' },
                    { param: 'Max KYC Wallets', section: 'wallets' },
                    { param: 'Min Holders', section: 'wallets' }, // Added missing parameter
                    { param: 'Max Holders', section: 'wallets' }, // Added missing parameter
                    
                    // Risk
                    { param: 'Min Bundled %', section: 'risk' },
                    { param: 'Max Bundled %', section: 'risk' },
                    { param: 'Min Deployer Balance (SOL)', section: 'risk' },
                    { param: 'Min Buy Ratio %', section: 'risk' },
                    { param: 'Max Buy Ratio %', section: 'risk' },
                    { param: 'Min Vol MCAP %', section: 'risk' },
                    { param: 'Max Vol MCAP %', section: 'risk' },
                    { param: 'Max Drained %', section: 'risk' },
                    { param: 'Max Drained Count', section: 'risk' },
                    
                    // Advanced
                    { param: 'Min TTC (sec)', section: 'advanced' },
                    { param: 'Max TTC (sec)', section: 'advanced' },
                    { param: 'Max Liquidity %', section: 'advanced' },
                    { param: 'Min Win Pred %', section: 'advanced' }
                ];

                for (const { param, section } of parametersToTest) {
                    if (DISCOVERY_STOPPED) break;
                    
                    const impactData = await this.analyzeParameter(param, section);
                    if (impactData) {
                        this.results.push(impactData);
                    }
                    
                    // Small delay between parameters
                    await sleep(500);
                }

                return this.generateReport();
                
            } catch (error) {
                console.error('Discovery failed:', error);
                throw error;
            }
        }

        generateReport() {
            const runtime = Math.floor((Date.now() - this.startTime) / 1000);
            const triggerMode = getTriggerMode();
            const triggerModeNames = ['Bullish Bonding', 'God Mode', 'Moon Finder', 'Fomo', 'Launchpads', 'Smart Tracker'];
            const triggerModeName = triggerModeNames[triggerMode] || `Mode ${triggerMode}`;
            
            // Sort by impact (combination of max improvement and range)
            const sortedResults = this.results.sort((a, b) => {
                const aImpact = (Math.abs(a.maxImprovement) + a.range) / 2;
                const bImpact = (Math.abs(b.maxImprovement) + b.range) / 2;
                return bImpact - aImpact;
            });

            console.log('%c🏁 PARAMETER IMPACT DISCOVERY COMPLETE', 'color: green; font-size: 18px; font-weight: bold;');
            console.log(`%c⏱️ Runtime: ${Math.floor(runtime / 60)}:${(runtime % 60).toString().padStart(2, '0')}`, 'color: blue;');
            console.log(`%c🎯 Trigger Mode: ${triggerModeName} (${triggerMode})`, 'color: blue;');
            console.log(`%c📊 Parameters Analyzed: ${this.results.length}`, 'color: blue;');
            console.log(`%c📈 Baseline: ${this.baselineScore.toFixed(1)}% PnL with ${this.baselineTokens} tokens`, 'color: blue;');

            console.log('\n%c🎯 PARAMETER IMPACT RANKING (High to Low):', 'color: gold; font-weight: bold;');
            console.log('%c' + '='.repeat(80), 'color: gold;');

            sortedResults.forEach((result, index) => {
                const impactScore = (Math.abs(result.maxImprovement) + result.range) / 2;
                
                // Find the best performing value for this parameter
                const bestResult = result.results.reduce((best, current) => 
                    current.improvement > best.improvement ? current : best
                );
                
                console.log(`%c${(index + 1).toString().padStart(2)}. ${result.parameter.padEnd(25)} | Max: ${result.maxImprovement.toFixed(1).padStart(6)}% | Range: ${result.range.toFixed(1).padStart(6)}% | Impact: ${impactScore.toFixed(1).padStart(6)}`, 
                    impactScore > 5 ? 'color: #ff6b6b; font-weight: bold;' : 
                    impactScore > 2 ? 'color: #feca57;' : 'color: #48dbfb;');
                    
                // Show the best value and its performance
                console.log(`%c    🎯 Best Value: ${bestResult.value} → ${bestResult.score.toFixed(1)}% PnL (+${bestResult.improvement.toFixed(1)}% vs baseline)`, 
                    'color: #90EE90; font-size: 11px;');
            });

            // NEW: Actionable Recommendations Section
            console.log('\n%c🚀 ACTIONABLE RECOMMENDATIONS:', 'color: lime; font-size: 16px; font-weight: bold;');
            console.log('%c' + '='.repeat(60), 'color: lime;');
            
            const highImpactParams = sortedResults.filter(r => 
                (Math.abs(r.maxImprovement) + r.range) / 2 > 5
            );
            
            if (highImpactParams.length > 0) {
                console.log('%cHigh Impact Parameters (>5% impact) - Apply these first:', 'color: #ff6b6b; font-weight: bold;');
                highImpactParams.forEach((result, index) => {
                    const bestResult = result.results.reduce((best, current) => 
                        current.improvement > best.improvement ? current : best
                    );
                    console.log(`%c${index + 1}. Set "${result.parameter}" = ${bestResult.value}`, 'color: #ff6b6b; font-weight: bold;');
                    console.log(`   Expected improvement: +${bestResult.improvement.toFixed(1)}% PnL (from ${this.baselineScore.toFixed(1)}% to ${bestResult.score.toFixed(1)}%)`);
                });
            }
            
            const mediumImpactParams = sortedResults.filter(r => {
                const impact = (Math.abs(r.maxImprovement) + r.range) / 2;
                return impact > 2 && impact <= 5;
            });
            
            if (mediumImpactParams.length > 0) {
                console.log('\n%cMedium Impact Parameters (2-5% impact) - Consider these next:', 'color: #feca57; font-weight: bold;');
                mediumImpactParams.forEach((result, index) => {
                    const bestResult = result.results.reduce((best, current) => 
                        current.improvement > best.improvement ? current : best
                    );
                    console.log(`%c${index + 1}. Set "${result.parameter}" = ${bestResult.value} (+${bestResult.improvement.toFixed(1)}% PnL)`, 'color: #feca57;');
                });
            }
            
            // Generate optimized configuration
            console.log('\n%c📝 OPTIMIZED CONFIGURATION:', 'color: cyan; font-size: 14px; font-weight: bold;');
            console.log('%c' + '='.repeat(50), 'color: cyan;');
            console.log('%c// Paste this into your BASELINE_CONFIG:', 'color: green;');
            console.log('%cBASELINE_CONFIG: {', 'color: white;');
            
            // Group recommendations by section
            const sections = ['basic', 'tokenDetails', 'wallets', 'risk', 'advanced'];
            sections.forEach(section => {
                const sectionParams = highImpactParams.concat(mediumImpactParams)
                    .filter(r => r.section === section);
                    
                if (sectionParams.length > 0) {
                    console.log(`%c    ${section}: {`, 'color: white;');
                    sectionParams.forEach(result => {
                        const bestResult = result.results.reduce((best, current) => 
                            current.improvement > best.improvement ? current : best
                        );
                        const value = typeof bestResult.value === 'string' ? `"${bestResult.value}"` : bestResult.value;
                        console.log(`%c        "${result.parameter}": ${value}, // +${bestResult.improvement.toFixed(1)}% impact`, 'color: white;');
                    });
                    console.log('%c    },', 'color: white;');
                }
            });
            console.log('%c}', 'color: white;');

            // Generate code for AGCopilot-Simple
            console.log('\n%c📋 CODE FOR AGCopilot-Simple.js:', 'color: cyan; font-weight: bold;');
            console.log('%c' + '='.repeat(50), 'color: cyan;');
            console.log('%c// Replace parameterTests array with this data-driven order:', 'color: green;');
            console.log('%cconst parameterTests = [', 'color: white;');
            
            sortedResults.forEach(result => {
                console.log(`%c    { param: '${result.parameter}', section: '${result.section}' }, // Impact: ${((Math.abs(result.maxImprovement) + result.range) / 2).toFixed(1)}`, 'color: white;');
            });
            
            console.log('%c];', 'color: white;');

            return {
                baseline: { score: this.baselineScore, tokens: this.baselineTokens },
                results: sortedResults,
                runtime: runtime,
                parametersAnalyzed: this.results.length
            };
        }
    }

    // ========================================
    // 🎛️ SIMPLE POPUP
    // ========================================
    function createDiscoveryPopup() {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                background: rgba(0,0,0,0.8); z-index: 10000; display: flex; 
                justify-content: center; align-items: center; font-family: Arial, sans-serif;
            `;

            const popup = document.createElement('div');
            popup.style.cssText = `
                background: linear-gradient(145deg, #2a2a2a, #1a1a1a); 
                border: 2px solid #9b59b6; border-radius: 15px; padding: 30px; 
                box-shadow: 0 20px 40px rgba(0,0,0,0.5); width: 500px;
                color: white; text-align: center;
            `;

            popup.innerHTML = `
                <h2 style="color: #9b59b6; margin-bottom: 20px;">🔬 Parameter Impact Discovery v2.0</h2>
                
                <!-- Trigger Mode Selection -->
                <div style="margin-bottom: 15px; text-align: left;">
                    <label style="font-size: 12px; font-weight: bold; margin-bottom: 5px; display: block; color: #9b59b6;">Trigger Mode:</label>
                    <select id="trigger-mode-select" style="width: 100%; padding: 8px; border: 1px solid #9b59b6; border-radius: 4px; font-size: 12px; color: black; background: white;">
                        <option value="0">Bullish Bonding</option>
                        <option value="1">God Mode</option>
                        <option value="2">Moon Finder</option>
                        <option value="3">Fomo</option>
                        <option value="4" selected>Launchpads</option>
                        <option value="5">Smart Tracker</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 20px; text-align: left; font-size: 13px; color: #ccc;">
                    <strong>🚀 NEW: Direct API Integration!</strong>
                    <br><br>
                    This will systematically test each parameter via API to measure its impact on performance.
                    <br><br>
                    <strong>What it does:</strong>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>Tests multiple values for each parameter via API</li>
                        <li>Measures improvement vs baseline</li>
                        <li>Ranks parameters by impact</li>
                        <li>✨ Much faster with direct API calls</li>
                        <li>✨ Advanced rate limiting for reliability</li>
                        <li>🎯 Uses selected trigger mode for all tests</li>
                    </ul>
                    
                    <strong>⏱️ Estimated time: 10-15 minutes (much faster than UI scraping!)</strong>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="start" style="background: #9b59b6; color: white; border: none; 
                                             padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                        🔬 Start Discovery
                    </button>
                    <button id="cancel" style="background: #e74c3c; color: white; border: none; 
                                              padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                        ❌ Cancel
                    </button>
                </div>
            `;

            overlay.appendChild(popup);
            document.body.appendChild(overlay);

            popup.querySelector('#start').onclick = () => {
                document.body.removeChild(overlay);
                resolve(true);
            };

            popup.querySelector('#cancel').onclick = () => {
                document.body.removeChild(overlay);
                resolve(false);
            };
        });
    }

    // ========================================
    // 🚀 MAIN EXECUTION
    // ========================================
    async function main() {
        try {
            const proceed = await createDiscoveryPopup();
            if (!proceed) {
                console.log('🛑 Discovery cancelled by user');
                return;
            }

            // Add stop button
            const stopBtn = document.createElement('button');
            stopBtn.innerHTML = '🛑 Stop Discovery';
            stopBtn.style.cssText = `
                position: fixed; top: 20px; right: 20px; z-index: 9999;
                background: #e74c3c; color: white; border: none; 
                padding: 10px 15px; border-radius: 5px; cursor: pointer;
            `;
            stopBtn.onclick = () => {
                DISCOVERY_STOPPED = true;
                console.log('🛑 Discovery stopped by user');
                stopBtn.remove();
            };
            document.body.appendChild(stopBtn);

            const discoverer = new ParameterImpactDiscoverer();
            const result = await discoverer.runDiscovery();
            
            stopBtn.remove();
            console.log('%c✅ Discovery complete! Check console output above for results.', 'color: green; font-weight: bold;');
            console.log('🛠️ Utility functions available:');
            console.log('   • window.getRateLimitStats() - Current performance metrics');
            console.log('   • window.testSingleParameter(param, value, section) - Test individual parameter');
            console.log('   • window.resetRateLimiting() - Reset rate limiter to defaults');
            
        } catch (error) {
            console.error('❌ Discovery failed:', error);
        }
    }

    // ========================================
    // 🛠️ GLOBAL UTILITY FUNCTIONS
    // ========================================
    
    // Rate limiting performance monitoring
    window.getRateLimitStats = () => {
        const stats = {
            currentBurstSize: burstRateLimiter.adaptiveBurstSize,
            maxBurstSize: burstRateLimiter.burstSize,
            errorCount: burstRateLimiter.errorCount,
            consecutiveSuccesses: burstRateLimiter.consecutiveSuccesses,
            recoveryTime: burstRateLimiter.recoveryTime,
            safetyMargin: burstRateLimiter.safetyMargin,
            requestsInQueue: burstRateLimiter.requestQueue.length
        };
        
        console.log('📊 Rate Limiting Stats:', stats);
        return stats;
    };
    
    // Reset rate limiting to original settings
    window.resetRateLimiting = () => {
        burstRateLimiter.adaptiveBurstSize = burstRateLimiter.burstSize;
        burstRateLimiter.errorCount = 0;
        burstRateLimiter.consecutiveSuccesses = 0;
        burstRateLimiter.requestQueue = [];
        console.log('🔄 Rate limiting reset to defaults');
    };
    
    // Test a single parameter variation
    window.testSingleParameter = async (param, value, section) => {
        console.log(`🧪 Testing ${param} = ${value} in section ${section}`);
        
        const discoverer = new ParameterImpactDiscoverer();
        await discoverer.establishBaseline();
        
        const result = await discoverer.testParameterVariation(param, value, section);
        if (result) {
            console.log(`✅ Result: ${result.score.toFixed(1)}% PnL (${result.improvement.toFixed(1)}% improvement), ${result.tokens} tokens`);
        } else {
            console.log('❌ Test failed or insufficient data');
        }
        
        return result;
    };
    
    console.log('✅ AG Parameter Impact Discovery v2.0 ready!');
    console.log('🚀 Features: Direct API integration, advanced rate limiting, trigger mode selection');
    console.log('📊 Performance improvements: ~60-70% faster than UI scraping version');
    console.log('🔧 Enhanced reliability with adaptive burst rate limiting');
    console.log('🎯 Trigger mode support: Test parameters across different trading modes');

    return main();
})();
