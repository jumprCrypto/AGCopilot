(async function () {
    console.clear();
    console.log('%c⚙️ AG Optimization Engine v1.0 ⚙️', 'color: orange; font-size: 16px; font-weight: bold;');
    
    // Check if we're being loaded in the AGCopilot tab
    const isInTab = document.getElementById('optimization-tab');
    if (!isInTab) {
        console.log('%c✨ Can be integrated into the main AGCopilot interface!', 'color: green; font-size: 12px;');
        console.log('💡 Use the "⚙️ Optimization" tab in AGCopilot for integrated experience');
    }
   

    // ========================================
    // 🎯 PRESET CONFIGURATIONS
    // ========================================
    const PRESETS = {
        oldDeployer: { 
            category: "Custom",
            description: "Old Deployer",
            tokenDetails: { "Min Deployer Age (min)": 43200, "Min AG Score": "4" } 
        },
        oldishDeployer: { 
            category: "Custom",
            description: "Old-ish Deployer",
            tokenDetails: { "Min Deployer Age (min)": 4320, "Min AG Score": "4" } 
        },
        agScore7: { 
            category: "Custom",
            description: "Min AG Score 7",
            tokenDetails: { "Min AG Score": "7" } 
        },
        
        // Discovery-based presets (from Parameter Impact Analysis)
        MaxLiqThirty: {
            priority: 1,
            category: "Param Discovery",
            description: "Max Liq % 30",
            advanced: { "Max Liquidity %": 30 }
        },
         minWinPred: { 
            priority: 2,
            category: "Param Discovery",
            description: "Min Win Pred % 55",
            advanced: { "Min Win Pred %": 55 }
        },
        UnqWallet3: {
            priority: 3,
            category: "Param Discovery", 
            description: "3+ Unq",
            wallets: { "Min Unique Wallets": 3 }
        },
        MinMcap20k: {
            priority: 4,
            category: "Param Discovery",
            description: "Min MCAP 20K", 
            basic: { "Min MCAP (USD)": 20000 }
        },
        MinMcap10k: {
            priority: 5,
            category: "Param Discovery",
            description: "Min MCAP 10K", 
            basic: { "Min MCAP (USD)": 10000 }
        }
    };

    // ========================================
    // 🛠️ UTILITIES & DEPENDENCY MANAGEMENT
    // ========================================
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Wait for AGCopilot core to fully load
    async function waitForAGCopilot(timeout = 10000) {
        const startTime = Date.now();
        
        console.log('⏳ Waiting for AGCopilot core to load...');
        
        while (Date.now() - startTime < timeout) {
            if (window.burstRateLimiter && 
                window.CONFIG && 
                window.backtesterAPI &&
                typeof window.deepClone === 'function' &&
                typeof window.getCurrentConfiguration === 'function') {
                console.log('✅ AGCopilot core loaded successfully');
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.error('❌ AGCopilot core dependencies not found:');
        console.error('  • burstRateLimiter:', typeof window.burstRateLimiter);
        console.error('  • CONFIG:', typeof window.CONFIG);
        console.error('  • backtesterAPI:', typeof window.backtesterAPI);
        console.error('  • deepClone:', typeof window.deepClone);
        throw new Error('AGCopilot core not loaded within timeout period');
    }

    // ========================================
    // 💾 CONFIG CACHE (with localStorage persistence)
    // ========================================
    class ConfigCache {
        constructor(maxSize = 1000) {
            this.cache = new Map();
            this.maxSize = maxSize;
            this.hits = 0;
            this.misses = 0;
            this.apiCallsSaved = 0;
            
            // Try to load from localStorage
            this.loadFromStorage();
        }
        
        generateKey(config) {
            // Create a deterministic key from the config object
            const flatConfig = this.flattenConfig(config);
            const sortedKeys = Object.keys(flatConfig).sort();
            const keyParts = sortedKeys.map(key => `${key}:${flatConfig[key]}`);
            return keyParts.join('|');
        }
        
        flattenConfig(config) {
            const flat = {};
            
            if (typeof config === 'object' && config !== null) {
                Object.values(config).forEach(section => {
                    if (Array.isArray(section)) {
                        return; // Skip arrays
                    }
                    if (typeof section === 'object' && section !== null) {
                        Object.assign(flat, section);
                    }
                });
            }
            
            return flat;
        }
        
        has(config) {
            const key = this.generateKey(config);
            return this.cache.has(key);
        }
        
        get(config) {
            const key = this.generateKey(config);
            
            if (this.cache.has(key)) {
                // Move to end (LRU)
                const value = this.cache.get(key);
                this.cache.delete(key);
                this.cache.set(key, value);
                
                return value;
            }
            
            return null;
        }
        
        set(config, result) {
            const key = this.generateKey(config);
            
            // Remove oldest if at capacity (LRU eviction)
            if (this.cache.size >= this.maxSize) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }
            
            this.cache.set(key, result);
            
            // Periodically save to storage (every 10 entries)
            if (this.cache.size % 10 === 0) {
                this.saveToStorage();
            }
        }
        
        // Record a cache hit - must be called explicitly after get() returns a value
        recordHit() {
            this.hits++;
            this.apiCallsSaved++;
        }
        
        // Record a cache miss - must be called explicitly when cache check fails
        recordMiss() {
            this.misses++;
        }
        
        clear() {
            this.cache.clear();
            this.hits = 0;
            this.misses = 0;
            this.apiCallsSaved = 0;
            this.clearStorage();
        }
        
        getStats() {
            const totalRequests = this.hits + this.misses;
            const hitRate = totalRequests > 0 ? ((this.hits / totalRequests) * 100).toFixed(1) : 0;
            
            return {
                size: this.cache.size,
                maxSize: this.maxSize,
                hits: this.hits,
                misses: this.misses,
                hitRate: hitRate,
                apiCallsSaved: this.apiCallsSaved,
                totalRequests: totalRequests
            };
        }
        
        getPerformanceSummary() {
            const stats = this.getStats();
            return `Cache: ${stats.hits}/${stats.totalRequests} hits (${stats.hitRate}% hit rate), ${stats.apiCallsSaved} API calls saved`;
        }
        
        saveToStorage() {
            try {
                // Convert Map to Array for JSON serialization
                const cacheArray = Array.from(this.cache.entries());
                const data = {
                    cache: cacheArray,
                    hits: this.hits,
                    misses: this.misses,
                    apiCallsSaved: this.apiCallsSaved,
                    timestamp: Date.now()
                };
                
                localStorage.setItem('agcopilot_config_cache', JSON.stringify(data));
            } catch (error) {
                console.warn('Failed to save cache to localStorage:', error.message);
            }
        }
        
        loadFromStorage() {
            try {
                const stored = localStorage.getItem('agcopilot_config_cache');
                if (stored) {
                    const data = JSON.parse(stored);
                    
                    // Check if cache is not too old (24 hours)
                    const age = Date.now() - data.timestamp;
                    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
                    
                    if (age < maxAge) {
                        this.cache = new Map(data.cache);
                        this.hits = data.hits || 0;
                        this.misses = data.misses || 0;
                        this.apiCallsSaved = data.apiCallsSaved || 0;
                        console.log(`✅ Loaded ${this.cache.size} cached configs from storage`);
                    } else {
                        console.log('⏰ Cache expired, starting fresh');
                        this.clearStorage();
                    }
                }
            } catch (error) {
                console.warn('Failed to load cache from localStorage:', error.message);
            }
        }
        
        clearStorage() {
            try {
                localStorage.removeItem('agcopilot_config_cache');
            } catch (error) {
                console.warn('Failed to clear cache storage:', error.message);
            }
        }
    }

    // ========================================
    // 🧬 ADVANCED OPTIMIZATION COMPONENTS
    // ========================================
    
    // Latin Hypercube Sampler for better parameter space exploration
    class LatinHypercubeSampler {
        constructor(paramRules) {
            this.paramRules = paramRules;
        }
        
        sample(numSamples) {
            const params = Object.keys(this.paramRules);
            const samples = [];
            
            // Generate Latin Hypercube samples
            for (let i = 0; i < numSamples; i++) {
                const sample = {};
                
                params.forEach(param => {
                    const rule = this.paramRules[param];
                    if (!rule) return;
                    
                    const { min, max, step, type } = rule;
                    
                    // Divide parameter range into numSamples intervals
                    const intervalSize = (max - min) / numSamples;
                    const interval = i;
                    const randomOffset = Math.random();
                    
                    // Sample within the interval
                    let value = min + (interval + randomOffset) * intervalSize;
                    
                    // Snap to step
                    if (step) {
                        value = Math.round(value / step) * step;
                    }
                    
                    // Ensure within bounds
                    value = Math.max(min, Math.min(max, value));
                    
                    // Handle integer types
                    if (type === 'integer') {
                        value = Math.round(value);
                    }
                    
                    sample[param] = value;
                });
                
                samples.push(sample);
            }
            
            // Shuffle to randomize parameter order
            this.shuffle(samples);
            
            return samples;
        }
        
        shuffle(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        }
    }

    // Simulated Annealing Optimizer
    class SimulatedAnnealing {
        constructor(initialTemp = 1000, coolingRate = 0.95, minTemp = 1) {
            this.initialTemp = initialTemp;
            this.coolingRate = coolingRate;
            this.minTemp = minTemp;
            this.currentTemp = initialTemp;
        }
        
        shouldAccept(currentScore, neighborScore) {
            // Always accept better solutions
            if (neighborScore > currentScore) {
                return true;
            }
            
            // Accept worse solutions with probability based on temperature
            const delta = neighborScore - currentScore;
            const probability = Math.exp(delta / this.currentTemp);
            
            return Math.random() < probability;
        }
        
        cool() {
            this.currentTemp *= this.coolingRate;
            return this.currentTemp > this.minTemp;
        }
        
        reset() {
            this.currentTemp = this.initialTemp;
        }
        
        getProgress() {
            return 1 - (this.currentTemp / this.initialTemp);
        }
    }

    // ========================================
    // 🎮 OPTIMIZATION TRACKER CLASS
    // ========================================
    class OptimizationTracker {
        constructor() {
            this.isRunning = false;
            this.startTime = null;
            this.bestConfig = null;
            this.bestScore = -Infinity;
            this.bestMetrics = null;
            this.testsCompleted = 0;
            this.currentPhase = '';
        }
        
        start() {
            this.isRunning = true;
            this.startTime = Date.now();
            this.testsCompleted = 0;
            this.currentPhase = 'Initializing';
        }
        
        stop() {
            this.isRunning = false;
            this.currentPhase = 'Stopped';
        }
        
        updateBest(config, score, metrics) {
            if (score > this.bestScore) {
                this.bestScore = score;
                this.bestConfig = window.deepClone ? window.deepClone(config) : JSON.parse(JSON.stringify(config));
                this.bestMetrics = metrics;
                return true;
            }
            return false;
        }
        
        incrementTests() {
            this.testsCompleted++;
        }
        
        setPhase(phase) {
            this.currentPhase = phase;
        }
        
        getElapsedTime() {
            if (!this.startTime) return 0;
            return Date.now() - this.startTime;
        }
        
        getElapsedMinutes() {
            return (this.getElapsedTime() / 1000 / 60).toFixed(1);
        }
        
        getSummary() {
            return {
                isRunning: this.isRunning,
                phase: this.currentPhase,
                tests: this.testsCompleted,
                elapsedMinutes: this.getElapsedMinutes(),
                bestScore: this.bestScore,
                hasBest: this.bestConfig !== null
            };
        }
        
        reset() {
            this.isRunning = false;
            this.startTime = null;
            this.bestConfig = null;
            this.bestScore = -Infinity;
            this.bestMetrics = null;
            this.testsCompleted = 0;
            this.currentPhase = '';
        }
    }

    // ========================================
    // 🧠 ENHANCED OPTIMIZER CLASS
    // ========================================
    class EnhancedOptimizer {
        constructor(initialConfig = null) {
            this.bestConfig = initialConfig || null;
            this.bestScore = initialConfig ? -Infinity : -Infinity;
            this.bestMetrics = null;
            this.testCount = 0;
            this.failedTestCount = 0;
            this.startTime = Date.now();
            this.cacheHits = 0;
            this.totalApiCalls = 0;
            this.parameterEffectiveness = [];
            this.maxRuntime = window.CONFIG?.MAX_RUNTIME_MIN || 30;
            
            // Cached helpers
            this.cache = window.globalConfigCache;
            this.rateLimiter = window.burstRateLimiter;
            this.api = window.backtesterAPI;
        }

        getRemainingTime() {
            const elapsed = (Date.now() - this.startTime) / 60000; // minutes
            return Math.max(0, this.maxRuntime - elapsed);
        }

        getProgress() {
            const elapsed = (Date.now() - this.startTime) / 60000;
            return Math.min(100, (elapsed / this.maxRuntime) * 100);
        }

        getSection(param) {
            const paramMap = {
                'Min MCAP (USD)': 'basic',
                'Max MCAP (USD)': 'basic',
                'Min KYC Wallets': 'wallets',
                'Min Unique Wallets': 'wallets',
                'Holders Growth %': 'wallets',
                'Holders Growth Minutes': 'wallets',
                'Min AG Score': 'tokenDetails',
                'Description': 'risk',
                'Freeze Authority': 'risk',
                'Mint Authority': 'risk',
                'Min Buy Ratio %': 'risk',
                'Max Bundled %': 'risk',
                'Max Drained %': 'risk',
                'Max Drained Count': 'risk',
                'Min Vol MCAP %': 'risk',
                'Max Vol MCAP %': 'risk',
                'Max Liquidity %': 'advanced',
                'Min TTC (sec)': 'advanced',
                'Min Win Pred %': 'advanced',
                'Min Token Age (sec)': 'tokenDetails',
                'Min Deployer Age (min)': 'tokenDetails'
            };
            return paramMap[param] || 'basic';
        }

        updateBestConfigDisplay() {
            const display = document.getElementById('best-config-display');
            const stats = document.getElementById('best-config-stats');
            
            if (!display || !stats) {
                console.warn('⚠️ Best config display elements not found in DOM');
                return;
            }
            
            display.style.display = 'block';
            
            // Always update progress stats, even if no best config yet
            const tracker = window.bestConfigTracker;
            const source = tracker?.source || 'Unknown';
            
            const runtime = Math.floor((Date.now() - this.startTime) / 1000);
            const runtimeMin = Math.floor(runtime / 60);
            const runtimeSec = runtime % 60;
            
            // Use the global optimization tracker's display
            if (window.optimizationTracker) {
                // Build currentBest object only if we have metrics
                const currentBest = this.bestMetrics ? {
                    metrics: {
                        ...this.bestMetrics,
                        score: this.bestScore
                    },
                    config: this.bestConfig,
                    method: source
                } : null;
                
                console.log('📊 EnhancedOpt: Calling tracker.updateProgress with currentBest=', 
                           currentBest ? `Score: ${currentBest.metrics.score.toFixed(1)}` : 'null',
                           'bestMetrics=', this.bestMetrics ? 'exists' : 'null');
                
                window.optimizationTracker.updateProgress(
                    this.testCount, 
                    this.failedTestCount, 
                    0, // rate limit failures tracked separately
                    currentBest
                );
            } else if (this.bestMetrics) {
                // Fallback to inline display if tracker not available AND we have metrics
                let scoreDisplay = this.bestScore.toFixed(1);
                let methodDisplay = '';
                
                // Check if we have robust scoring information
                if (this.bestMetrics.robustScoring) {
                    const rs = this.bestMetrics.robustScoring;
                    scoreDisplay = `${this.bestScore.toFixed(1)} (${rs.scoringMethod})`;
                    methodDisplay = `<div style="font-size: 10px; opacity: 0.8;">Raw: ${rs.components.rawPnL.toFixed(1)}% | Win Rate: ${rs.components.winRate.toFixed(1)}% | Reliability: ${(rs.components.reliabilityFactor * 100).toFixed(0)}%</div>`;
                }
                // Fallback to inline display if tracker not available
                stats.innerHTML = `
                    <div style="margin-bottom: 8px;">
                        <div style="font-size: 12px; font-weight: bold; color: #4CAF50; margin-bottom: 4px;">🏆 Current Best</div>
                        <div style="font-size: 11px; margin-bottom: 4px;">
                            <span style="color: #aaa;">Score:</span> <span style="color: #4CAF50; font-weight: bold;">${scoreDisplay}</span>
                            <span style="color: #666; margin: 0 6px;">|</span>
                            <span style="color: #aaa;">Method:</span> <span style="color: #63b3ed;">${source}</span>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 10px; margin-bottom: 6px;">
                            <div><span style="color: #aaa;">Tokens:</span> <span style="color: #fff; font-weight: bold;">${this.bestMetrics.totalTokens || 0}</span></div>
                            <div><span style="color: #aaa;">Win Rate (2x):</span> <span style="color: #fff;">${this.bestMetrics.winRate?.toFixed(1) || 0}%</span></div>
                            <div><span style="color: #aaa;">Real WR (TP):</span> <span style="color: #4CAF50; font-weight: bold;">${this.bestMetrics.realWinRate?.toFixed(1) || 0}%</span></div>
                            <div><span style="color: #aaa;">TP PnL:</span> <span style="color: ${(this.bestMetrics.tpPnlPercent || 0) >= 0 ? '#4CAF50' : '#f44336'};">${(this.bestMetrics.tpPnlPercent || 0).toFixed(1)}%</span></div>
                        </div>
                        ${methodDisplay}
                        <div style="font-size: 10px; color: #aaa; margin-top: 4px;">
                            Tests: ${this.testCount} (${this.cacheHits} cached, ${this.failedTestCount} failed) | Runtime: ${runtimeMin}m ${runtimeSec}s
                        </div>
                    </div>
                `;
            }
            
            console.log(`📊 Display updated: Score ${this.bestScore.toFixed(1)}%, ${this.testCount} tests, ${runtime}s`);
        }

        async testConfig(config, label = 'Test') {
            if (window.STOPPED) return { success: false, stopped: true };
            
            this.testCount++;
            const completeConfig = window.ensureCompleteConfig(config);
            
            // Check cache first
            if (window.CONFIG.USE_CONFIG_CACHING && this.cache?.has(completeConfig)) {
                this.cacheHits++;
                const cached = this.cache.get(completeConfig);
                this.cache.recordHit(); // Record the cache hit for metrics
                return { success: true, metrics: cached.metrics, fromCache: true };
            }
            
            // Cache miss - will make API call
            if (window.CONFIG.USE_CONFIG_CACHING && this.cache) {
                this.cache.recordMiss();
            }
            
            // API call with validation
            const result = await this.api.fetchResults(completeConfig);
            this.totalApiCalls++;
            
            if (!result.success) {
                this.failedTestCount++;
            }
            
            return result;
        }

        async establishBaseline() {
            console.log('📊 Establishing baseline configuration...');
            const currentConfig = window.getCurrentConfiguration ? window.getCurrentConfiguration() : window.getCurrentConfigFromUI();
            
            const result = await this.testConfig(currentConfig, 'Baseline');
            
            if (!result.success || !result.metrics) {
                throw new Error('Failed to establish baseline');
            }
            
            const scaledThresholds = window.getScaledTokenThresholds();
            if (result.metrics.totalTokens < scaledThresholds.MIN_TOKENS) {
                throw new Error(`Baseline has insufficient tokens: ${result.metrics.totalTokens} < ${scaledThresholds.MIN_TOKENS}`);
            }
            
            const robust = window.calculateRobustScore(result.metrics);
            const score = robust && !robust.rejected ? robust.score : result.metrics.tpPnlPercent;
            
            // Add robust scoring to metrics (like legacy version)
            if (robust) {
                result.metrics.robustScoring = robust;
            }
            
            this.bestConfig = currentConfig;
            this.bestScore = score;
            this.bestMetrics = result.metrics;
            
            // Update global tracker
            if (window.bestConfigTracker) {
                window.bestConfigTracker.update(this.bestConfig, this.bestMetrics, this.bestScore, 'Baseline');
            }
            
            console.log(`✅ Baseline established: ${score.toFixed(1)}% (${result.metrics.totalTokens} tokens)`);
            this.updateBestConfigDisplay();
            
            return { config: currentConfig, score, metrics: result.metrics };
        }

        async runParameterPhase() {
            console.log('🔬 Phase 1: Parameter Impact Testing...');
            const params = window.PARAM_RULES ? Object.keys(window.PARAM_RULES) : [];
            
            for (const param of params) {
                if (window.STOPPED || this.getRemainingTime() <= 0) break;
                
                const testValues = window.generateTestValuesFromRules(param);
                if (!testValues || testValues.length === 0) continue;
                
                for (const value of testValues.slice(0, 3)) {
                    if (window.STOPPED || this.getRemainingTime() <= 0) break;
                    
                    const testConfig = window.deepClone(this.bestConfig);
                    const section = this.getSection(param);
                    
                    // Ensure section exists in config before setting parameter
                    if (!testConfig[section]) {
                        testConfig[section] = {};
                    }
                    
                    testConfig[section][param] = value;
                    
                    const result = await this.testConfig(testConfig, `${param}=${value}`);
                    
                    // Update display every 5 tests to show progress
                    if (this.testCount % 5 === 0) {
                        this.updateBestConfigDisplay();
                    }
                    
                    if (result.success && result.metrics) {
                        const scaledThresholds = window.getScaledTokenThresholds();
                        
                        // Validate minimum token count
                        if (result.metrics.totalTokens < scaledThresholds.MIN_TOKENS) {
                            console.log(`⚠️ Rejecting ${param}=${value}: insufficient tokens (${result.metrics.totalTokens} < ${scaledThresholds.MIN_TOKENS})`);
                            continue;
                        }
                        
                        const robust = window.calculateRobustScore(result.metrics);
                        if (robust && robust.rejected) continue;
                        
                        const score = robust ? robust.score : result.metrics.tpPnlPercent;
                        
                        if (score > this.bestScore) {
                            const improvement = score - this.bestScore;
                            console.log(`✅ New best via ${param}=${value}: ${score.toFixed(1)}% (+${improvement.toFixed(1)}%) [${result.metrics.totalTokens} tokens]`);
                            
                            // Add robust scoring to metrics (like legacy version)
                            if (robust) {
                                result.metrics.robustScoring = robust;
                            }
                            
                            this.bestConfig = testConfig;
                            this.bestScore = score;
                            this.bestMetrics = result.metrics;
                            
                            if (window.bestConfigTracker) {
                                window.bestConfigTracker.update(this.bestConfig, this.bestMetrics, this.bestScore, `Parameter: ${param}`);
                            }
                            
                            this.updateBestConfigDisplay();
                            
                            // Track parameter effectiveness
                            this.parameterEffectiveness.push({
                                param: param,
                                value: value,
                                improvement: improvement,
                                phase: 'Parameter Testing'
                            });
                        }
                    }
                }
            }
        }

        async runOptimization() {
            try {
                console.log('🚀 Starting Enhanced Optimization...');
                
                if (!window.optimizationTracker.isRunning) {
                    window.optimizationTracker.startOptimization(1);
                }
                
                // Phase 1: Establish Baseline (or use provided initial config)
                if (!this.bestConfig) {
                    await this.establishBaseline();
                } else {
                    console.log(`🔄 Starting from provided configuration (Score: ${this.bestScore.toFixed(1)}%)`);
                }
                
                // Phase 2: Parameter Impact Testing
                if (!window.STOPPED && this.getRemainingTime() > 0) {
                    await this.runParameterPhase();
                }
                
                // Phase 3: Latin Hypercube Sampling
                if (!window.STOPPED && this.getRemainingTime() > 0 && window.CONFIG.USE_LATIN_HYPERCUBE_SAMPLING) {
                    await this.runLatinHypercubePhase();
                }
                
                // Phase 4: Simulated Annealing
                if (!window.STOPPED && this.getRemainingTime() > 0 && window.CONFIG.USE_SIMULATED_ANNEALING) {
                    console.log('🔥 Phase 4: Simulated Annealing...');
                    
                    const annealing = new SimulatedAnnealing(1000, 0.95, 1);
                    let currentConfig = window.deepClone(this.bestConfig);
                    let currentScore = this.bestScore;
                    let iterations = 0;
                    const maxIterations = 50;
                    
                    while (!window.STOPPED && this.getRemainingTime() > 0 && annealing.cool() && iterations < maxIterations) {
                        iterations++;
                        
                        // Generate neighbor by modifying random parameter
                        const neighborConfig = window.deepClone(currentConfig);
                        const params = window.PARAM_RULES ? Object.keys(window.PARAM_RULES) : [];
                        const param = params[Math.floor(Math.random() * params.length)];
                        const section = this.getSection(param);
                        
                        if (!neighborConfig[section]) neighborConfig[section] = {};
                        
                        const testValues = window.generateTestValuesFromRules(param);
                        if (testValues && testValues.length > 0) {
                            neighborConfig[section][param] = testValues[Math.floor(Math.random() * testValues.length)];
                            
                            const result = await this.testConfig(neighborConfig, `Annealing-${iterations}`);
                            
                            if (result.success && result.metrics) {
                                const scaledThresholds = window.getScaledTokenThresholds();
                                
                                // Validate minimum token count
                                if (result.metrics.totalTokens < scaledThresholds.MIN_TOKENS) {
                                    continue;
                                }
                                
                                const robust = window.calculateRobustScore(result.metrics);
                                if (robust && robust.rejected) continue;
                                
                                const score = robust ? robust.score : result.metrics.tpPnlPercent;
                                
                                // Accept or reject based on simulated annealing probability
                                if (annealing.shouldAccept(currentScore, score)) {
                                    currentConfig = neighborConfig;
                                    currentScore = score;
                                    
                                    if (score > this.bestScore) {
                                        console.log(`✅ Simulated annealing improved score: ${score.toFixed(1)}% (temp: ${annealing.currentTemp.toFixed(0)})`);
                                        
                                        // Add robust scoring to metrics
                                        if (robust) {
                                            result.metrics.robustScoring = robust;
                                        }
                                        
                                        this.bestConfig = neighborConfig;
                                        this.bestScore = score;
                                        this.bestMetrics = result.metrics;
                                        
                                        if (window.bestConfigTracker) {
                                            window.bestConfigTracker.update(this.bestConfig, this.bestMetrics, this.bestScore, 'Simulated Annealing');
                                        }
                                        
                                        this.updateBestConfigDisplay();
                                    }
                                }
                            }
                        }
                    }
                    
                    console.log(`🔥 Simulated annealing completed ${iterations} iterations`);
                }
                
                // Phase 5: Deep Dive (if enabled)
                if (!window.STOPPED && this.getRemainingTime() > 0 && window.CONFIG.USE_DEEP_DIVE) {
                    await this.runDeepDive();
                }
                
                const runtime = Math.floor((Date.now() - this.startTime) / 1000);
                console.log(`✅ Optimization completed in ${runtime}s`);
                console.log(`📊 Best score: ${this.bestScore.toFixed(1)}% (${this.testCount} tests, ${this.cacheHits} cached)`);
                
                window.optimizationTracker.stopOptimization();
                
                return {
                    bestConfig: this.bestConfig,
                    bestScore: this.bestScore,
                    bestMetrics: this.bestMetrics,
                    testCount: this.testCount,
                    runtime: runtime,
                    cacheHits: this.cacheHits,
                    parameterEffectiveness: this.parameterEffectiveness,
                    targetAchieved: this.bestScore >= (window.CONFIG?.TARGET_PNL || 100)
                };
                
            } catch (error) {
                console.error('❌ Optimization failed:', error);
                window.optimizationTracker.stopOptimization();
                throw error;
            }
        }

        async runLatinHypercubePhase() {
            console.log('🔬 Phase 3: Latin Hypercube Sampling...');
            
            // Get PARAM_RULES from window
            const paramRules = window.PARAM_RULES;
            if (!paramRules) {
                console.warn('⚠️ PARAM_RULES not available, skipping Latin Hypercube phase');
                return;
            }
            
            const sampler = new LatinHypercubeSampler(paramRules);
            const samples = sampler.sample(10);
            
            for (const sample of samples) {
                if (window.STOPPED || this.getRemainingTime() <= 0) break;
                
                // Convert flat sample to nested config structure
                const testConfig = window.deepClone(this.bestConfig);
                
                Object.entries(sample).forEach(([param, value]) => {
                    const section = this.getSection(param);
                    
                    // Ensure section exists
                    if (!testConfig[section]) {
                        testConfig[section] = {};
                    }
                    
                    testConfig[section][param] = value;
                });
                
                const result = await this.testConfig(testConfig, 'LHS');
                
                // Update display every 5 tests to show progress
                if (this.testCount % 5 === 0) {
                    this.updateBestConfigDisplay();
                }
                
                if (result.success && result.metrics) {
                    const robust = window.calculateRobustScore(result.metrics);
                    if (robust && robust.rejected) continue;
                    
                    const score = robust ? robust.score : result.metrics.tpPnlPercent;
                    
                    if (score > this.bestScore) {
                        console.log(`✅ LHS improved score: ${score.toFixed(1)}%`);
                        
                        // Add robust scoring to metrics (like legacy version)
                        if (robust) {
                            result.metrics.robustScoring = robust;
                        }
                        
                        this.bestConfig = sample;
                        this.bestScore = score;
                        this.bestMetrics = result.metrics;
                        
                        if (window.bestConfigTracker) {
                            window.bestConfigTracker.update(this.bestConfig, this.bestMetrics, this.bestScore, 'Latin Hypercube');
                        }
                        
                        this.updateBestConfigDisplay();
                    }
                }
            }
        }

        async runCorrelatedParameterPhase() {
            console.log('🔬 Phase 4: Correlated Parameter Testing...');
            // Implement correlated parameter logic here
            // This would test parameters that are known to work well together
        }

        async runDeepDive() {
            console.log('🔬 Phase 5: Deep Dive Analysis...');
            // Fine-tune the best configuration found so far
            const params = this.parameterEffectiveness.slice(0, 5).map(p => p.param);
            
            for (const param of params) {
                if (window.STOPPED || this.getRemainingTime() <= 0) break;
                
                const section = this.getSection(param);
                
                // Ensure section exists before accessing
                if (!this.bestConfig[section]) {
                    console.warn(`⚠️ Section ${section} not found in bestConfig for param ${param}`);
                    continue;
                }
                
                const currentValue = this.bestConfig[section][param];
                const testValues = window.generateTestValuesFromRules(param);
                
                // Test values near the current best
                const nearbyValues = testValues.filter(v => 
                    Math.abs(v - currentValue) <= currentValue * 0.2
                );
                
                for (const value of nearbyValues.slice(0, 3)) {
                    if (window.STOPPED || this.getRemainingTime() <= 0) break;
                    
                    const testConfig = window.deepClone(this.bestConfig);
                    
                    // Ensure section exists in cloned config
                    if (!testConfig[section]) {
                        testConfig[section] = {};
                    }
                    
                    testConfig[section][param] = value;
                    
                    const result = await this.testConfig(testConfig, `DeepDive-${param}=${value}`);
                    
                    if (result.success && result.metrics) {
                        const robust = window.calculateRobustScore(result.metrics);
                        if (robust && robust.rejected) continue;
                        
                        const score = robust ? robust.score : result.metrics.tpPnlPercent;
                        
                        if (score > this.bestScore) {
                            console.log(`✅ Deep dive improved: ${score.toFixed(1)}%`);
                            
                            // Add robust scoring to metrics (like legacy version)
                            if (robust) {
                                result.metrics.robustScoring = robust;
                            }
                            
                            this.bestConfig = testConfig;
                            this.bestScore = score;
                            this.bestMetrics = result.metrics;
                            
                            if (window.bestConfigTracker) {
                                window.bestConfigTracker.update(this.bestConfig, this.bestMetrics, this.bestScore, 'Deep Dive');
                            }
                            
                            this.updateBestConfigDisplay();
                        }
                    }
                }
            }
        }
    }

    // ========================================
    // 🔗 CHAINED OPTIMIZER CLASS
    // ========================================
    class ChainedOptimizer {
        constructor(initialConfig = null) {
            this.chainResults = [];
            this.globalBestConfig = initialConfig || null;
            this.globalBestScore = initialConfig ? -Infinity : -Infinity;
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
            
            window.optimizationTracker.startOptimization(runCount);
            
            console.log(`🔗 Starting chained optimization: ${runCount} runs × ${timePerRunMin} minutes each`);
            window.updateProgress?.(`🔗 Chained Optimization: Run 0/${runCount}`, 0, 0, 0, '--', this.chainStartTime);
            
            for (let run = 1; run <= runCount; run++) {
                if (window.STOPPED) {
                    console.log(`⏹️ Chained optimization stopped at run ${run}/${runCount}`);
                    break;
                }

                this.currentRun = run;
                const runStartTime = Date.now();
                
                window.optimizationTracker.setCurrentRun(run, runCount);
                
                console.log(`\n🔗 === CHAIN RUN ${run}/${runCount} ===`);
                window.updateProgress?.(`🔗 Chain Run ${run}/${runCount} Starting`, 
                    ((run - 1) / runCount) * 100, 
                    this.globalBestScore === -Infinity ? 0 : this.globalBestScore.toFixed(1), 
                    this.totalTestCount, 
                    this.globalBestMetrics?.totalTokens || '--', 
                    this.chainStartTime
                );

                try {
                    // For run 1: Use base config from constructor if available
                    // For subsequent runs: Use the best config from previous runs
                    const initialConfig = run === 1 ? this.globalBestConfig : this.globalBestConfig;
                    const optimizer = new EnhancedOptimizer(initialConfig);
                    
                    if (initialConfig) {
                        if (run === 1) {
                            console.log(`🎯 Run ${run} starting from base configuration`);
                        } else {
                            console.log(`🔄 Run ${run} starting from previous best config (Score: ${this.globalBestScore.toFixed(1)}%)`);
                            console.log(`🚀 Building on accumulated knowledge from ${run-1} previous run${run > 2 ? 's' : ''}!`);
                        }
                    } else {
                        console.log(`🆕 Run ${run} starting fresh with baseline discovery`);
                    }
                    
                    const originalRuntime = window.CONFIG.MAX_RUNTIME_MIN;
                    window.CONFIG.MAX_RUNTIME_MIN = timePerRunMin;
                    
                    const runResults = await optimizer.runOptimization();
                    
                    window.CONFIG.MAX_RUNTIME_MIN = originalRuntime;
                    
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
                    
                    if (runResults.bestScore > this.globalBestScore) {
                        this.globalBestConfig = runResults.bestConfig;
                        this.globalBestScore = runResults.bestScore;
                        this.globalBestMetrics = runResults.bestMetrics;
                        
                        if (window.bestConfigTracker) {
                            window.bestConfigTracker.update(this.globalBestConfig, this.globalBestMetrics, this.globalBestScore, `Chained Run ${run}`);
                        }
                        window.currentBestConfig = this.globalBestConfig;
                        
                        console.log(`🎉 New global best from Run ${run}! Score: ${this.globalBestScore.toFixed(1)}%`);
                    }
                    
                    const chainProgress = (run / runCount) * 100;
                    console.log(`✅ Run ${run} completed: ${runResults.bestScore.toFixed(1)}% (${runResults.testCount} tests in ${runDuration}s)`);
                    window.updateProgress?.(`🔗 Run ${run}/${runCount} Complete`, 
                        chainProgress, 
                        this.globalBestScore.toFixed(1), 
                        this.totalTestCount, 
                        this.globalBestMetrics?.totalTokens || '--', 
                        this.chainStartTime
                    );
                    
                    const targetPnl = parseFloat(document.getElementById('target-pnl')?.value) || 100;
                    if (this.globalBestScore >= targetPnl) {
                        console.log(`🎯 Target ${targetPnl}% achieved in run ${run}! Stopping chain early.`);
                        break;
                    }
                    
                    if (run < runCount && !window.STOPPED) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
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
            
            const successfulRuns = this.chainResults.filter(r => !r.error);
            const sortedRuns = [...successfulRuns].sort((a, b) => b.score - a.score);
            
            if (successfulRuns.length > 1) {
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
                
                const scoreProgression = successfulRuns.map(r => r.score.toFixed(1));
                console.log(`\n📈 Score progression: [${scoreProgression.join('% → ')}%]`);
                console.log(`🔄 Runs 2+ started from previous best configuration instead of baseline discovery`);
                
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
            
            if (!display || !stats) {
                console.warn('⚠️ Best config display elements not found in DOM');
                return;
            }
            
            // Use this instance's data instead of global tracker
            if (!this.globalBestMetrics) {
                console.warn('⚠️ No global best metrics available yet');
                return;
            }
            
            display.style.display = 'block';
            
            let scoreDisplay = this.globalBestScore.toFixed(1);
            let methodDisplay = '';
            
            // Check if we have robust scoring information
            if (this.globalBestMetrics.robustScoring) {
                const rs = this.globalBestMetrics.robustScoring;
                scoreDisplay = `${this.globalBestScore.toFixed(1)} (${rs.scoringMethod})`;
                methodDisplay = `<div style="font-size: 10px; opacity: 0.8;">Raw: ${rs.components.rawPnL.toFixed(1)}% | Win Rate: ${rs.components.winRate.toFixed(1)}% | Reliability: ${(rs.components.reliabilityFactor * 100).toFixed(0)}%</div>`;
            }
            
            const runtime = Math.floor((Date.now() - this.chainStartTime) / 1000);
            
            stats.innerHTML = `
                <div><strong>🔗 Chain Best:</strong> ${scoreDisplay}</div>
                <div><strong>Tokens:</strong> ${this.globalBestMetrics.totalTokens || 0} | <strong>Win Rate:</strong> ${this.globalBestMetrics.winRate?.toFixed(1) || 0}% | <strong>Real Win Rate:</strong> ${this.globalBestMetrics.realWinRate?.toFixed(1) || 0}%</div>
                ${methodDisplay}
                <div><strong>Runs:</strong> ${this.currentRun}/${this.totalRuns} | <strong>Total Tests:</strong> ${this.totalTestCount} | <strong>Runtime:</strong> ${runtime}s</div>
            `;
            
            console.log(`📊 Chain display updated: Score ${this.globalBestScore.toFixed(1)}%, Run ${this.currentRun}/${this.totalRuns}, ${this.totalTestCount} tests, ${runtime}s`);
        }
    }

    // ========================================
    // 📊 SCORING FUNCTIONS
    // ========================================
    
    // Calculate robust score using AGCopilot's scoring system
    function calculateRobustScore(metrics) {
        // Use AGCopilot's scoring if available
        if (typeof window.calculateRobustScore === 'function') {
            return window.calculateRobustScore(metrics);
        }
        
        // Fallback simple scoring
        const totalTokens = metrics.totalTokens || 0;
        const tpPnlPercent = metrics.tpPnlPercent || 0;
        const winRate = metrics.realWinRate || metrics.winRate || 0;
        
        // Check minimum token threshold
        const scaling = window.getScaledTokenThresholds ? window.getScaledTokenThresholds() : null;
        const minTokens = scaling ? scaling.scaledMinTokens : (window.CONFIG?.MIN_TOKENS || 10);
        
        if (totalTokens < minTokens) {
            return 0; // Insufficient data
        }
        
        // Simple score: PnL% * win rate
        return tpPnlPercent * (winRate / 100);
    }

    // ========================================
    // 🔬 PARAMETER IMPACT DISCOVERY
    // ========================================
    async function runParameterImpactDiscovery() {
        const scaledThresholds = window.getScaledTokenThresholds();
        const MIN_TOKENS_REQUIRED = scaledThresholds.MIN_TOKENS;
        const MIN_IMPROVEMENT_THRESHOLD = 1;
        
        try {
            console.log('%c🔬 Starting Parameter Impact Discovery', 'color: purple; font-size: 16px; font-weight: bold;');
            
            if (!window.optimizationTracker.isRunning) {
                window.optimizationTracker.startOptimization(1);
            }
            
            // Step 1: Establish baseline
            console.log('%c📊 Establishing baseline...', 'color: blue; font-weight: bold;');
            const currentConfig = window.getCurrentConfiguration();
            const cache = window.globalConfigCache || (window.globalConfigCache = new ConfigCache(1000));

            const fetchWithCacheValidated = async (cfg, label) => {
                const completeCfg = window.ensureCompleteConfig(cfg);
                const apiParams = window.backtesterAPI.mapParametersToAPI(completeCfg);
                const validation = window.backtesterAPI.validateConfig(apiParams);
                if (!validation.isValid) {
                    console.log(`    ⚠️ Skipping invalid config (${label}): ${validation.errors.join(', ')}`);
                    return { success: false, error: 'invalid_config' };
                }
                
                const res = await window.backtesterAPI.fetchResults(completeCfg);
                return res;
            };

            const baselineResult = await fetchWithCacheValidated(currentConfig, 'Baseline');
            
            if (!baselineResult.success || !baselineResult.metrics) {
                throw new Error('Failed to establish baseline configuration');
            }
            
            if (baselineResult.metrics.totalTokens < MIN_TOKENS_REQUIRED) {
                throw new Error(`Baseline has insufficient tokens: ${baselineResult.metrics.totalTokens} < ${MIN_TOKENS_REQUIRED}`);
            }
            
            const baseRobust = window.calculateRobustScore(baselineResult.metrics);
            const baselineScore = baseRobust && !baseRobust.rejected ? baseRobust.score : baselineResult.metrics.tpPnlPercent;
            const baselineTokens = baselineResult.metrics.totalTokens;
            
            const triggerMode = window.getTriggerMode();
            const triggerModeNames = ['Bullish Bonding', 'God Mode', 'Moon Finder', 'Fomo', 'Launchpads', 'Smart Tracker'];
            const triggerModeName = triggerModeNames[triggerMode] || `Mode ${triggerMode}`;
            
            const selectedSources = window.getSelectedSources();
            const sourceNames = { '1': 'Pumpfun', '2': 'Launchcoin', '3': 'Launchpad', '4': 'Native' };
            const sourceLabels = selectedSources.map(s => sourceNames[s] || `Source ${s}`).join(', ');
            
            console.log(`🎯 Trigger Mode: ${triggerModeName} (${triggerMode})`);
            console.log(`📡 Sources Filter: ${sourceLabels.length > 0 ? sourceLabels : 'All sources'} (${selectedSources.join(', ')})`);
            console.log(`✅ Baseline: ${baselineScore.toFixed(1)}% PnL, ${baselineTokens} tokens`);
            
            // Step 2: Test parameters
            const parameterResults = [];
            const parametersToTest = [
                { param: 'Min MCAP (USD)', section: 'basic' },
                { param: 'Min KYC Wallets', section: 'wallets' },
                { param: 'Min Unique Wallets', section: 'wallets' },
                { param: 'Min AG Score', section: 'tokenDetails' },
                { param: 'Min Buy Ratio %', section: 'risk' },
                { param: 'Max Bundled %', section: 'risk' },
                { param: 'Holders Growth %', section: 'wallets' },
                { param: 'Holders Growth Minutes', section: 'wallets' },
                { param: 'Min TTC (sec)', section: 'advanced' },
                { param: 'Max Drained %', section: 'risk' },
                { param: 'Min Token Age (sec)', section: 'tokenDetails' },
                { param: 'Max Drained Count', section: 'risk' },
                { param: 'Min Vol MCAP %', section: 'risk' },
                { param: 'Min Deployer Age (min)', section: 'tokenDetails' },
                { param: 'Max Vol MCAP %', section: 'risk' },
                { param: 'Max Liquidity %', section: 'advanced' },
                { param: 'Min Win Pred %', section: 'advanced' }
            ];
            
            let testCount = 0;
            let failedCount = 0;
            
            for (const { param, section } of parametersToTest) {
                if (window.STOPPED) break;
                
                console.log(`%c🔬 Analyzing ${param}...`, 'color: orange; font-weight: bold;');
                
                const testValues = window.generateTestValuesFromRules(param);
                if (!testValues || testValues.length === 0) {
                    console.log(`⚠️ No test values could be generated for ${param}`);
                    continue;
                }
                
                const paramResults = [];
                
                for (const value of testValues) {
                    if (window.STOPPED) break;
                    
                    try {
                        testCount++;
                        console.log(`  Testing ${param}: ${value}`);
                        
                        const testConfig = window.ensureCompleteConfig(currentConfig);
                        testConfig[section][param] = value;
                        const result = await fetchWithCacheValidated(testConfig, `${param}=${value}`);
                        
                        if (!result.success || !result.metrics) {
                            failedCount++;
                            console.log(`    ❌ ${value}: API call failed`);
                            continue;
                        }
                        
                        if (result.metrics.totalTokens < MIN_TOKENS_REQUIRED) {
                            console.log(`    ⚠️ ${value}: Insufficient tokens (${result.metrics.totalTokens})`);
                            continue;
                        }
                        
                        const robust = window.calculateRobustScore(result.metrics);
                        if (robust && robust.rejected) {
                            console.log(`    ❌ ${value}: Rejected by robust scoring (${robust.rejectionReason})`);
                            continue;
                        }
                        const currentScore = robust ? robust.score : result.metrics.tpPnlPercent;
                        const improvement = currentScore - baselineScore;
                        
                        paramResults.push({
                            value: value,
                            score: currentScore,
                            improvement: improvement,
                            tokens: result.metrics.totalTokens,
                            winRate: result.metrics.winRate || 0,
                            rawTpPnl: result.metrics.tpPnlPercent || 0
                        });
                        
                        const logPrefix = improvement > MIN_IMPROVEMENT_THRESHOLD ? '✅' : '📊';
                        console.log(`    ${logPrefix} ${value}: score=${currentScore.toFixed(1)} (raw=${(result.metrics.tpPnlPercent||0).toFixed(1)}%, LWR=${(result.metrics.winRate||0).toFixed(1)}%, RWR=${(result.metrics.realWinRate||0).toFixed(1)}%) Δ=${improvement.toFixed(1)} [${result.metrics.totalTokens} tokens]`);
                        
                        window.optimizationTracker.updateProgress(testCount, failedCount);
                        
                    } catch (error) {
                        failedCount++;
                        console.log(`    ❌ ${value}: ${error.message}`);
                    }
                }
                
                if (paramResults.length > 0) {
                    const improvements = paramResults.map(r => r.improvement);
                    const maxImprovement = Math.max(...improvements);
                    const range = Math.max(...improvements) - Math.min(...improvements);
                    
                    const bestResult = paramResults.reduce((best, current) => 
                        current.improvement > best.improvement ? current : best
                    );
                    
                    parameterResults.push({
                        parameter: param,
                        section: section,
                        maxImprovement: maxImprovement,
                        range: range,
                        impact: (Math.abs(maxImprovement) + range) / 2,
                        bestValue: bestResult.value,
                        bestScore: bestResult.score,
                        bestImprovement: bestResult.improvement,
                        results: paramResults
                    });
                    
                    console.log(`📈 ${param} Impact: Max +${maxImprovement.toFixed(1)}%, Best Value: ${bestResult.value}`);
                }
            }
            
            // Step 3: Generate report
            const sortedResults = parameterResults
                .sort((a, b) => b.impact - a.impact)
                .slice(0, 10);
            
            console.log('\n%c🏆 TOP 10 PARAMETER IMPACT RANKINGS:', 'color: gold; font-size: 16px; font-weight: bold;');
            console.log('%c' + '='.repeat(60), 'color: gold;');
            
            sortedResults.forEach((result, index) => {
                console.log(`%c${(index + 1).toString().padStart(2)}. ${result.parameter} = ${result.bestValue} → +${result.bestImprovement.toFixed(1)} improvement`, 
                    result.impact > 10 ? 'color: #ff6b6b; font-weight: bold;' : 
                    result.impact > 5 ? 'color: #feca57; font-weight: bold;' : 'color: #48dbfb;');
            });
            
            window.optimizationTracker.stopOptimization();
            console.log('\n%c✅ Parameter Impact Discovery Complete!', 'color: green; font-size: 16px; font-weight: bold;');
            console.log(`📊 Tested ${testCount} configurations, ${failedCount} failed`);
            console.log(`📈 Baseline: ${baselineScore.toFixed(1)}% PnL with ${baselineTokens} tokens`);
            
            return sortedResults;
            
        } catch (error) {
            window.optimizationTracker.stopOptimization();
            console.error('❌ Parameter Impact Discovery failed:', error);
            throw error;
        }
    }

    // ========================================
    // 🎨 UI CREATION PLACEHOLDER
    // ========================================
    // TODO: Move UI creation functions here
    function createOptimizationTabUI() {
        console.log('⚙️ Creating Optimization tab UI...');
        return createOptimizationUI();
    }

    // ========================================
    // 🎮 EVENT HANDLERS
    // ========================================
    const eventHandlers = {}; // Track handlers for cleanup
    
    function setupOptimizationEventHandlers() {
        console.log('🎮 Setting up Optimization event handlers...');
        
        // Safe event listener helper
        const safeAddEventListener = (elementId, event, handler) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.addEventListener(event, handler);
                return handler; // Return for cleanup tracking
            }
            return null;
        };
        
        // START OPTIMIZATION BUTTON
        eventHandlers.startOptimization = safeAddEventListener('start-optimization', 'click', async () => {
            const targetPnl = parseFloat(document.getElementById('target-pnl')?.value) || 100;
            const minTokens = parseInt(document.getElementById('min-tokens')?.value) || 50;
            const runtimeMin = parseInt(document.getElementById('runtime-min')?.value) || 30;
            const chainRunCount = parseInt(document.getElementById('chain-run-count')?.value) || 1;
            const simulatedAnnealing = document.getElementById('simulated-annealing')?.checked || false;
            const latinHypercube = document.getElementById('latin-hypercube')?.checked || false;
            const correlatedParams = document.getElementById('correlated-params')?.checked || false;
            const deepDive = document.getElementById('deep-dive')?.checked || false;
            
            // Read win rate configuration
            const minWinRateSmall = parseFloat(document.getElementById('min-win-rate-small')?.value) || 35;
            const minWinRateMedium = parseFloat(document.getElementById('min-win-rate-medium')?.value) || 33;
            const minWinRateLarge = parseFloat(document.getElementById('min-win-rate-large')?.value) || 30;
            
            // Reset UI background
            if (typeof window.updateUIBackground === 'function') {
                window.updateUIBackground(false);
            }
            
            // Update config
            window.CONFIG.TARGET_PNL = targetPnl;
            window.CONFIG.MIN_WIN_RATE = minWinRateSmall;
            window.CONFIG.MIN_WIN_RATE_MEDIUM_SAMPLE = minWinRateMedium;
            window.CONFIG.MIN_WIN_RATE_LARGE_SAMPLE = minWinRateLarge;
            
            const scaledThresholds = window.getScaledTokenThresholds();
            window.CONFIG.MIN_TOKENS = Math.max(minTokens, scaledThresholds.MIN_TOKENS);
            window.CONFIG.MAX_RUNTIME_MIN = runtimeMin;
            
            if (scaledThresholds.scalingInfo.isDateFiltered) {
                console.log(`📅 Date range scaling applied (${scaledThresholds.scalingInfo.days} days, ${scaledThresholds.scalingInfo.scalingFactor.toFixed(2)}x):`);
                console.log(`   📊 Token thresholds: Large=${scaledThresholds.LARGE_SAMPLE_THRESHOLD}, Medium=${scaledThresholds.MEDIUM_SAMPLE_THRESHOLD}, Min=${scaledThresholds.MIN_TOKENS}`);
                console.log(`   🎯 Using minimum tokens: ${window.CONFIG.MIN_TOKENS} (UI: ${minTokens}, Scaled: ${scaledThresholds.MIN_TOKENS})`);
            }
            
            // Read scoring mode directly from dropdown
            const scoringModeSelect = document.getElementById('scoring-mode-select');
            window.CONFIG.SCORING_MODE = scoringModeSelect ? scoringModeSelect.value : 'robust_real';
            window.CONFIG.USE_SIMULATED_ANNEALING = simulatedAnnealing;
            window.CONFIG.USE_LATIN_HYPERCUBE_SAMPLING = latinHypercube;
            window.CONFIG.USE_CORRELATED_PARAMS = correlatedParams;
            window.CONFIG.USE_DEEP_DIVE = deepDive;
            window.CONFIG.CHAIN_RUN_COUNT = chainRunCount;
            
            const features = [];
            const mode = window.CONFIG.SCORING_MODE;
            if (mode === 'robust_real') features.push('robust scoring with real win rate');
            if (mode === 'legacy_resistant') features.push('legacy outlier-resistant scoring');
            if (mode === 'tp_only') features.push('TP PnL scoring');
            if (mode === 'winrate_only') features.push('Win Rate scoring');
            if (mode === 'real_winrate_only') features.push('Real Win Rate scoring');
            if (simulatedAnnealing) features.push('simulated annealing');
            if (latinHypercube) features.push('Latin hypercube sampling');
            if (correlatedParams) features.push('correlated parameters');
            if (deepDive) features.push('deep dive analysis');
            
            const featuresStr = features.length > 0 ? ` with ${features.join(', ')}` : '';
            const useChainedRuns = chainRunCount > 1;
            
            if (useChainedRuns) {
                console.log(`🔗 Starting chained optimization: ${chainRunCount} runs of ${runtimeMin} min each, Target ${targetPnl}% PnL, Min ${minTokens} tokens${featuresStr}`);
            } else {
                console.log(`🚀 Starting optimization: Target ${targetPnl}% PnL, Min ${minTokens} tokens, ${runtimeMin} min runtime${featuresStr}`);
            }
            
            // Read current configuration for use as base config
            let currentConfig = null;
            
            // Pin settings dialog
            try {
                console.log('📌 Reading current backtester configuration for pin settings...');
                currentConfig = await window.getCurrentConfigFromUI();
                
                const pinResult = await new Promise((resolve) => {
                    window.showPinSettingsDialog(currentConfig, resolve);
                });
                
                if (pinResult.cancelled) {
                    console.log('❌ Optimization cancelled by user via Pin Settings dialog');
                    return;
                }
                
                window.pinnedSettings.enabled = pinResult.pinned;
                window.pinnedSettings.settings = pinResult.settings;
                
                if (pinResult.pinned && Object.keys(pinResult.settings).length > 0) {
                    console.log(`📌 ${Object.keys(pinResult.settings).length} settings pinned:`, pinResult.settings);
                    console.log('🔒 These settings will remain constant during optimization');
                } else {
                    console.log('📌 No settings pinned - proceeding with standard optimization');
                }
                
            } catch (error) {
                console.warn('❌ Pin settings dialog error:', error);
                window.pinnedSettings.enabled = false;
                window.pinnedSettings.settings = {};
            }
            
            // UI state changes
            const startBtn = document.getElementById('start-optimization');
            const stopBtn = document.getElementById('stop-optimization');
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'block';
            
            // Auto-collapse sections
            console.log('📱 Auto-collapsing sections for cleaner optimization view...');
            
            const configContent = document.getElementById('config-section-content');
            const configArrow = document.getElementById('config-section-arrow');
            if (configContent && configContent.style.display !== 'none') {
                configContent.style.display = 'none';
                if (configArrow) {
                    configArrow.style.transform = 'rotate(-90deg)';
                    configArrow.textContent = '▶';
                }
            }
            
            const signalContent = document.getElementById('signal-section-content');
            const signalArrow = document.getElementById('signal-section-arrow');
            if (signalContent && signalContent.style.display !== 'none') {
                signalContent.style.display = 'none';
                if (signalArrow) {
                    signalArrow.style.transform = 'rotate(-90deg)';
                    signalArrow.textContent = '▶';
                }
            }
            
            // Reset stopped flag
            window.STOPPED = false;
            
            // Start optimization
            try {
                let results;
                
                if (useChainedRuns) {
                    const chainedOptimizer = new ChainedOptimizer(currentConfig);
                    results = await chainedOptimizer.runChainedOptimization(chainRunCount, runtimeMin);
                } else {
                    const optimizer = new EnhancedOptimizer(currentConfig);
                    results = await optimizer.runOptimization();
                }
                
                if (results && results.bestConfig) {
                    if (useChainedRuns) {
                        console.log(`🎉 Chained optimization completed! Best score: ${results.bestScore || results.globalBestScore}%`);
                    } else {
                        console.log(`🎉 Optimization completed! Best score: ${results.bestScore.toFixed(1)}%`);
                    }
                    
                    const source = useChainedRuns ? `Chained Optimization (${chainRunCount} runs)` : 'Single Optimization';
                    const bestScore = results.globalBestScore || results.bestScore;
                    const bestConfig = results.globalBestConfig || results.bestConfig;
                    const bestMetrics = results.globalBestMetrics || results.bestMetrics;
                    
                    if (window.bestConfigTracker) {
                        window.bestConfigTracker.update(bestConfig, bestMetrics, bestScore, source);
                    }
                    window.currentBestConfig = bestConfig;
                    
                    if (typeof window.updateResultsWithPinnedSettings === 'function') {
                        window.updateResultsWithPinnedSettings(window.pinnedSettings.settings);
                    }
                    
                    if (typeof window.updateUIBackground === 'function') {
                        window.updateUIBackground(true);
                    }
                } else {
                    console.log('❌ Optimization completed but no best configuration found');
                    if (typeof window.updateUIBackground === 'function') {
                        window.updateUIBackground(true);
                    }
                }
            } catch (error) {
                console.log(`❌ Optimization failed: ${error.message}`);
            } finally {
                if (window.optimizationTracker) {
                    window.optimizationTracker.stopOptimization();
                }
                
                const startBtn = document.getElementById('start-optimization');
                const stopBtn = document.getElementById('stop-optimization');
                if (startBtn) startBtn.style.display = 'block';
                if (stopBtn) stopBtn.style.display = 'none';
            }
        });
        
        // STOP OPTIMIZATION BUTTON
        eventHandlers.stopOptimization = safeAddEventListener('stop-optimization', 'click', () => {
            window.STOPPED = true;
            console.log('⏹️ Optimization stopped by user - STOPPED flag set to:', window.STOPPED);
            
            if (window.optimizationTracker) {
                window.optimizationTracker.stopOptimization();
            }
            
            const startBtn = document.getElementById('start-optimization');
            const stopBtn = document.getElementById('stop-optimization');
            if (startBtn) startBtn.style.display = 'block';
            if (stopBtn) stopBtn.style.display = 'none';
            
            if (typeof window.updateStatus === 'function') {
                window.updateStatus('⏹️ Optimization stopped by user', false);
            }
        });
        
        // PARAMETER DISCOVERY BUTTON
        eventHandlers.parameterDiscovery = safeAddEventListener('parameter-discovery', 'click', async () => {
            const discoveryBtn = document.getElementById('parameter-discovery');
            const startBtn = document.getElementById('start-optimization');
            
            try {
                window.STOPPED = false;
                if (discoveryBtn) {
                    discoveryBtn.style.display = 'none';
                    discoveryBtn.disabled = true;
                }
                if (startBtn) {
                    startBtn.style.display = 'none';
                    startBtn.disabled = true;
                }
                
                // Auto-collapse sections
                console.log('📱 Auto-collapsing sections for parameter discovery...');
                
                const configContent = document.getElementById('config-section-content');
                const configArrow = document.getElementById('config-section-arrow');
                if (configContent && configContent.style.display !== 'none') {
                    configContent.style.display = 'none';
                    if (configArrow) {
                        configArrow.style.transform = 'rotate(-90deg)';
                        configArrow.textContent = '▶';
                    }
                }
                
                const signalContent = document.getElementById('signal-section-content');
                const signalArrow = document.getElementById('signal-section-arrow');
                if (signalContent && signalContent.style.display !== 'none') {
                    signalContent.style.display = 'none';
                    if (signalArrow) {
                        signalArrow.style.transform = 'rotate(-90deg)';
                        signalArrow.textContent = '▶';
                    }
                }
                
                if (typeof window.updateStatus === 'function') {
                    window.updateStatus('🔬 Starting Parameter Impact Discovery...', true);
                }
                
                const results = await runParameterImpactDiscovery();
                
                if (typeof window.updateStatus === 'function') {
                    window.updateStatus(`✅ Parameter Discovery Complete! Found ${results.length} parameter insights. Check console for detailed results.`, false);
                }
                
            } catch (error) {
                console.error('❌ Parameter Discovery Error:', error);
                if (typeof window.updateStatus === 'function') {
                    window.updateStatus(`❌ Parameter Discovery failed: ${error.message}`, false);
                }
            } finally {
                if (discoveryBtn) {
                    discoveryBtn.style.display = 'block';
                    discoveryBtn.disabled = false;
                }
                if (startBtn) {
                    startBtn.style.display = 'block';
                    startBtn.disabled = false;
                }
            }
        });
        
        console.log('✅ Optimization event handlers registered:', Object.keys(eventHandlers));
        return true;
    }
    
    // Cleanup function for event handlers
    function cleanupOptimizationEventHandlers() {
        console.log('🧹 Cleaning up optimization event handlers...');
        // Event handlers will be automatically removed when elements are removed from DOM
        Object.keys(eventHandlers).forEach(key => {
            delete eventHandlers[key];
        });
    }
    
    // Register cleanup on page unload
    window.addEventListener('beforeunload', cleanupOptimizationEventHandlers);

    // ========================================
    // 🎨 UI GENERATION
    // ========================================
    
    /**
     * Creates the optimization UI HTML and injects it into the container
     * @returns {boolean} Success status
     */
    function createOptimizationUI() {
        console.log('🎨 Creating Optimization UI...');
        
        const container = document.getElementById('optimization-ui-container');
        if (!container) {
            console.error('❌ Optimization UI container not found');
            return false;
        }
        
        const uiHTML = `
            <!-- Optimization UI Content -->
            <div style="height: 100%; overflow-y: auto;">
                <!-- Presets and Trigger Mode Row -->
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 8px; margin-bottom: 8px;">
                            <div>
                                <label style="
                                    font-size: 11px;
                                    font-weight: 500;
                                    color: #a0aec0;
                                    display: block;
                                    margin-bottom: 4px;
                                ">Quick Presets</label>
                                <select id="preset-dropdown" style="
                                    width: 100%;
                                    padding: 5px 8px;
                                    background: #2d3748;
                                    border: 1px solid #4a5568;
                                    border-radius: 4px;
                                    color: #e2e8f0;
                                    font-size: 10px;
                                    outline: none;
                                    transition: border-color 0.2s;
                                " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                                    ${generatePresetOptions()}
                                </select>
                            </div>
                            <div>
                                <label style="
                                    font-size: 11px;
                                    font-weight: 500;
                                    color: #a0aec0;
                                    display: block;
                                    margin-bottom: 4px;
                                ">Trigger Mode</label>
                                <select id="trigger-mode-select" style="
                                    width: 100%;
                                    padding: 5px 8px;
                                    background: #2d3748;
                                    border: 1px solid #4a5568;
                                    border-radius: 4px;
                                    color: #e2e8f0;
                                    font-size: 10px;
                                    outline: none;
                                    transition: border-color 0.2s;
                                " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                                    <option value="0">Bullish Bonding</option>
                                    <option value="1">God Mode</option>
                                    <option value="2">Moon Finder</option>
                                    <option value="3">Fomo</option>
                                    <option value="4" selected>Launchpads</option>
                                    <option value="5">Smart Tracker</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- Optimization Targets Row -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
                            <div>
                                <label style="
                                    font-size: 10px;
                                    font-weight: 500;
                                    color: #a0aec0;
                                    display: block;
                                    margin-bottom: 2px;
                                ">Target PnL %</label>
                                <input type="number" id="target-pnl" value="100" min="5" max="500" step="5" style="
                                    width: 100%;
                                    padding: 3px 4px;
                                    background: #2d3748;
                                    border: 1px solid #4a5568;
                                    border-radius: 4px;
                                    color: #e2e8f0;
                                    font-size: 9px;
                                    text-align: center;
                                    outline: none;
                                    transition: border-color 0.2s;
                                " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                            </div>
                            <div>
                                <label style="
                                    font-size: 10px;
                                    font-weight: 500;
                                    color: #a0aec0;
                                    display: block;
                                    margin-bottom: 2px;
                                ">Runtime (min)</label>
                                <input type="number" id="runtime-min" value="10" min="5" max="120" step="5" style="
                                    width: 100%;
                                    padding: 3px 4px;
                                    background: #2d3748;
                                    border: 1px solid #4a5568;
                                    border-radius: 4px;
                                    color: #e2e8f0;
                                    font-size: 9px;
                                    text-align: center;
                                    outline: none;
                                    transition: border-color 0.2s;
                                " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                            </div>
                        </div>

                        <!-- Optimization Settings Row 3 -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px;">
                            <div>
                                <label style="
                                    font-size: 10px;
                                    font-weight: 500;
                                    color: #a0aec0;
                                    display: block;
                                    margin-bottom: 3px;
                                ">Min Tokens / Day</label>
                                <input type="number" id="min-tokens" value="10" min="5" max="1000" step="5" style="
                                    width: 100%;
                                    padding: 5px 6px;
                                    background: #2d3748;
                                    border: 1px solid #4a5568;
                                    border-radius: 4px;
                                    color: #e2e8f0;
                                    font-size: 10px;
                                    text-align: center;
                                    outline: none;
                                    transition: border-color 0.2s;
                                " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                            </div>
                            <div>
                                <label style="
                                    font-size: 10px;
                                    font-weight: 500;
                                    color: #a0aec0;
                                    display: block;
                                    margin-bottom: 3px;
                                ">Chain Runs</label>
                                <input type="number" id="chain-run-count" value="5" min="1" max="10" step="1" style="
                                    width: 100%;
                                    padding: 5px 6px;
                                    background: #2d3748;
                                    border: 1px solid #4a5568;
                                    border-radius: 4px;
                                    color: #e2e8f0;
                                    font-size: 10px;
                                    text-align: center;
                                    outline: none;
                                    transition: border-color 0.2s;
                                " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                            </div>
                        </div>

                        <!-- Win Rate Configuration -->
                        <div style="
                            margin-bottom: 10px;
                            padding: 8px;
                            background: #2d3748;
                            border-radius: 6px;
                            border: 1px solid #4a5568;
                        ">
                            <div style="
                                font-size: 11px;
                                font-weight: 600;
                                margin-bottom: 6px;
                                color: #63b3ed;
                                display: flex;
                                align-items: center;
                                gap: 6px;
                            ">
                                🎯 Win Rate Thresholds
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
                                <div>
                                    <label style="
                                        font-size: 9px;
                                        font-weight: 500;
                                        color: #a0aec0;
                                        display: block;
                                        margin-bottom: 2px;
                                    ">Small Sample (&lt;500)</label>
                                    <input type="number" id="min-win-rate-small" value="35" min="0" max="100" step="1" style="
                                        width: 100%;
                                        padding: 4px 5px;
                                        background: #2d3748;
                                        border: 1px solid #4a5568;
                                        border-radius: 4px;
                                        color: #e2e8f0;
                                        font-size: 9px;
                                        text-align: center;
                                        outline: none;
                                        transition: border-color 0.2s;
                                    " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                                </div>
                                <div>
                                    <label style="
                                        font-size: 9px;
                                        font-weight: 500;
                                        color: #a0aec0;
                                        display: block;
                                        margin-bottom: 2px;
                                    ">Medium (500-999)</label>
                                    <input type="number" id="min-win-rate-medium" value="30" min="0" max="100" step="1" style="
                                        width: 100%;
                                        padding: 4px 5px;
                                        background: #2d3748;
                                        border: 1px solid #4a5568;
                                        border-radius: 4px;
                                        color: #e2e8f0;
                                        font-size: 9px;
                                        text-align: center;
                                        outline: none;
                                        transition: border-color 0.2s;
                                    " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                                </div>
                                <div>
                                    <label style="
                                        font-size: 9px;
                                        font-weight: 500;
                                        color: #a0aec0;
                                        display: block;
                                        margin-bottom: 2px;
                                    ">Large (1000+)</label>
                                    <input type="number" id="min-win-rate-large" value="25" min="0" max="100" step="1" style="
                                        width: 100%;
                                        padding: 4px 5px;
                                        background: #2d3748;
                                        border: 1px solid #4a5568;
                                        border-radius: 4px;
                                        color: #e2e8f0;
                                        font-size: 9px;
                                        text-align: center;
                                        outline: none;
                                        transition: border-color 0.2s;
                                    " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                                </div>
                            </div>
                            <div style="
                                font-size: 8px;
                                color: #a0aec0;
                                margin-top: 4px;
                                line-height: 1.3;
                                text-align: center;
                            ">
                                Minimum win rates required for configurations based on token count
                            </div>
                        </div>
                        
                        <!-- Advanced Optimization Features -->
                        <div style="
                            margin-bottom: 4px;
                            padding: 4px;
                            background: #2d3748;
                            border-radius: 6px;
                            border: 1px solid #4a5568;
                        ">
                            <div style="
                                font-size: 10px;
                                font-weight: 600;
                                margin-bottom: 4px;
                                color: #63b3ed;
                                display: flex;
                                align-items: center;
                                gap: 6px;
                            ">
                                🚀 Optimization Methods
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 2px 6px;">
                                
                                
                                <label style="
                                    display: flex;
                                    align-items: center;
                                    cursor: pointer;
                                    font-size: 10px;
                                    color: #e2e8f0;
                                    padding: 2px;
                                    border-radius: 3px;
                                    transition: background 0.2s;
                                " onmouseover="this.style.background='#4a5568'" 
                                  onmouseout="this.style.background='transparent'"
                                  title="Advanced optimization technique that accepts worse solutions occasionally to escape local optima">
                                    <input type="checkbox" id="simulated-annealing" checked style="
                                        margin-right: 4px;
                                        transform: scale(0.8);
                                        accent-color: #63b3ed;
                                    ">
                                    <span style="font-weight: 500;">🔥 Simulated Annealing</span>
                                </label>
                                
                                <label style="
                                    display: flex;
                                    align-items: center;
                                    cursor: pointer;
                                    font-size: 10px;
                                    color: #e2e8f0;
                                    padding: 2px;
                                    border-radius: 3px;
                                    transition: background 0.2s;
                                " onmouseover="this.style.background='#4a5568'" 
                                  onmouseout="this.style.background='transparent'"
                                  title="Statistical sampling method that ensures even distribution across parameter space">
                                    <input type="checkbox" id="latin-hypercube" checked style="
                                        margin-right: 4px;
                                        transform: scale(0.8);
                                        accent-color: #63b3ed;
                                    ">
                                    <span style="font-weight: 500;">📐 Latin Hypercube</span>
                                </label>
                                
                                <label style="
                                    display: flex;
                                    align-items: center;
                                    cursor: pointer;
                                    font-size: 10px;
                                    color: #e2e8f0;
                                    padding: 2px;
                                    border-radius: 3px;
                                    transition: background 0.2s;
                                " onmouseover="this.style.background='#4a5568'" 
                                  onmouseout="this.style.background='transparent'"
                                  title="Tests related parameters together (e.g., min/max MCAP, wallet counts) for better combinations">
                                    <input type="checkbox" id="correlated-params" checked style="
                                        margin-right: 4px;
                                        transform: scale(0.8);
                                        accent-color: #63b3ed;
                                    ">
                                    <span style="font-weight: 500;">🔗 Correlated Params</span>
                                </label>
                                
                                <label style="
                                    display: flex;
                                    align-items: center;
                                    cursor: pointer;
                                    font-size: 10px;
                                    color: #e2e8f0;
                                    padding: 2px;
                                    border-radius: 3px;
                                    transition: background 0.2s;
                                " onmouseover="this.style.background='#4a5568'" 
                                  onmouseout="this.style.background='transparent'"
                                  title="Fine-grained testing of the most effective parameters with smaller increments">
                                    <input type="checkbox" id="deep-dive" checked style="
                                        margin-right: 4px;
                                        transform: scale(0.8);
                                        accent-color: #63b3ed;
                                    ">
                                    <span style="font-weight: 500;">🔬 Deep Dive</span>
                                </label>
                                
                                <!-- Scoring Mode Selector -->
                                <div style="grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 2fr; align-items: center; gap: 8px; margin-top: 4px;">
                                    <label style="font-size: 10px; color: #a0aec0; font-weight: 500;">Scoring Mode</label>
                                    <select id="scoring-mode-select" style="
                                        width: 100%;
                                        padding: 4px 6px;
                                        background: #2d3748;
                                        border: 1px solid #4a5568;
                                        border-radius: 4px;
                                        color: #e2e8f0;
                                        font-size: 10px;
                                        outline: none;
                                    " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                                        <option value="robust_real" selected>Robust Scoring (PnL + Real Win Rate)</option>
                                        <option value="legacy_resistant">Legacy Resistant (PnL + API Win Rate)</option>
                                        <option value="tp_only">TP PnL % Only</option>
                                        <option value="winrate_only">Win Rate Only</option>
                                        <option value="real_winrate_only">Real Win Rate Only</option>
                                    </select>
                                </div>
                            </div>
                            
                            <!-- Low Bundled % Constraint -->
                            <div style="
                                margin-top: 4px;
                                padding: 4px;
                                background: rgba(255, 193, 7, 0.1);
                                border: 1px solid rgba(255, 193, 7, 0.3);
                                border-radius: 4px;
                            ">
                                <label style="
                                    display: flex;
                                    align-items: center;
                                    cursor: pointer;
                                    font-size: 10px;
                                    color: #ffc107;
                                    font-weight: 500;
                                " title="Forces Min Bundled % < 5% and Max Bundled % < 35% during optimization">
                                    <input type="checkbox" id="low-bundled-constraint" checked style="
                                        margin-right: 4px;
                                        transform: scale(0.8);
                                        accent-color: #ffc107;
                                    ">
                                    <span>🛡️ Low Bundled % Constraint</span>
                                </label>
                                <div style="
                                    font-size: 8px;
                                    color: #a0aec0;
                                    margin-top: 1px;
                                    margin-left: 16px;
                                    line-height: 1.2;
                                ">
                                    Forces Min Bundled % &lt; 5% and Max Bundled % &lt; 35% during optimization
                                </div>
                            </div>
                        </div>
                </div>
            </div>
        </div>
        `;
        
        container.innerHTML = uiHTML;
        console.log('✅ Optimization UI injected successfully');
        return true;
    }

    // Generate preset dropdown options dynamically from PRESETS object with priority sorting
    function generatePresetOptions() {
        let options = '<option value="">-- Select a Preset --</option>';
        
        // Convert PRESETS object to array with keys and sort by priority
        const sortedPresets = Object.entries(PRESETS).sort(([keyA, configA], [keyB, configB]) => {
            const priorityA = configA.priority || 999; // Default high priority if not set
            const priorityB = configB.priority || 999;
            return priorityA - priorityB;
        });
        
        let currentCategory = null;
        
        // Add sorted presets with category headers
        sortedPresets.forEach(([presetKey, presetConfig]) => {
            // Add category separator if category changed
            if (presetConfig.category && presetConfig.category !== currentCategory) {
                currentCategory = presetConfig.category;
                options += `<optgroup label="── ${currentCategory} ──">`;
            }
            
            const displayName = getPresetDisplayName(presetKey, presetConfig);
            options += `<option value="${presetKey}">${displayName}</option>`;
        });
        
        return options;
    }
    
    function getPresetDisplayName(presetKey, presetConfig) {        
        // Use description if available, otherwise generate from key
        if (presetConfig && presetConfig.description) {
            // Add priority indicator for high priority items
            const priorityIcon = (presetConfig.priority <= 3) ? '🏆 ' : 
                                 (presetConfig.priority <= 5) ? '🔥 ' : 
                                (presetConfig.priority <= 10) ? '⭐ ' : '';
            return `${priorityIcon}${presetConfig.description}`;
        }
        
        // Fallback to original naming logic
        let displayName = presetKey
            .replace(/([A-Z])/g, ' $1') // Add space before capital letters
            .replace(/([0-9]+)/g, ' $1') // Add space before numbers
            .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
            .trim();
            
        return displayName;
    }

    // ========================================
    // 🚀 INITIALIZATION
    // ========================================
    
    // Initialize Optimization module with retry mechanism
    console.log('🔧 Initializing AG Optimization Engine...');
    
    async function initializeWithRetry(maxRetries = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`📋 Initialization attempt ${attempt}/${maxRetries}...`);
                
                // Wait for AGCopilot core
                await waitForAGCopilot();
                
                // Check if we're in a tab or standalone
                const tabContainer = document.getElementById('optimization-ui-container');
                const isInTab = !!tabContainer;
                
                console.log(`🔍 Checking for optimization-ui-container: ${isInTab}`);
                
                if (isInTab) {
                    console.log('📑 Running in AGCopilot tab mode');
                    const success = createOptimizationTabUI();
                    
                    if (success) {
                        setupOptimizationEventHandlers();
                        console.log('✅ Optimization module initialized successfully in tab!');
                        return;
                    }
                } else {
                    console.log('🎨 Standalone mode not yet implemented');
                    console.log('💡 Use AGCopilot main interface to access Optimization tab');
                    return;
                }
                
            } catch (error) {
                console.error(`❌ Initialization attempt ${attempt} failed:`, error);
                
                if (attempt === maxRetries) {
                    console.error('❌ Failed to initialize after all retries');
                    console.error('🔧 Please reload AGCopilot and try again');
                    
                    // Show error in tab if available
                    const tabContainer = document.getElementById('optimization-ui-container');
                    if (tabContainer) {
                        tabContainer.innerHTML = `
                            <div style="padding: 20px; color: #ff6b6b;">
                                <h3>⚠️ Initialization Failed</h3>
                                <p>${error.message}</p>
                                <button onclick="window.retryLoadOptimization()" style="
                                    margin-top: 12px;
                                    padding: 8px 16px;
                                    background: #4a5568;
                                    border: none;
                                    border-radius: 4px;
                                    color: white;
                                    cursor: pointer;
                                ">🔄 Retry</button>
                            </div>
                        `;
                    }
                    return;
                }
                
                console.log(`⏳ Waiting ${delay}ms before retry...`);
                await sleep(delay);
                delay *= 2; // Exponential backoff
            }
        }
    }
    
    // Global retry function for error recovery
    window.retryLoadOptimization = function() {
        console.log('🔄 Retrying Optimization module initialization...');
        const tabContainer = document.getElementById('optimization-ui-container');
        if (tabContainer) {
            tabContainer.innerHTML = '<div style="padding: 20px; color: #a0aec0;">⏳ Loading Optimization Engine...</div>';
        }
        initializeWithRetry();
    };

    // ========================================
    // 🌍 GLOBAL EXPORTS
    // ========================================
    
    // Create the AGOptimization namespace object
    window.AGOptimization = {
        // Core Classes
        ConfigCache,
        LatinHypercubeSampler,
        SimulatedAnnealing,
        OptimizationTracker,
        EnhancedOptimizer,
        ChainedOptimizer,
        
        // Functions
        calculateRobustScore,
        runParameterImpactDiscovery,
        
        // UI
        createOptimizationTabUI,
        setupOptimizationEventHandlers,
        
        // State
        currentOptimizer: null,
        isRunning: false,
        
        // Version
        version: '1.0.0'
    };

    console.log('✅ AGOptimization namespace exported:', Object.keys(window.AGOptimization));

    // Start initialization
    initializeWithRetry();
    
})();