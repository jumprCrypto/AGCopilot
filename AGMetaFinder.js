(async function () {
    console.clear();
    console.log('%c🎯 AG Meta Finder v1.0 🎯', 'color: #f59e0b; font-size: 16px; font-weight: bold;');
    console.log('%c📊 Discover winning config archetypes from top performers', 'color: green; font-size: 12px;');
    
    // Check if we're being loaded in the AGCopilot tab
    const isInTab = document.getElementById('meta-finder-tab');
    if (!isInTab) {
        console.log('%c✨ Can be integrated into the main AGCopilot interface!', 'color: green; font-size: 12px;');
        console.log('💡 Use the "🎯 Meta" tab in AGCopilot for integrated experience');
    }

    // ========================================
    // 🎯 META FINDER CONFIGURATION
    // ========================================
    const META_CONFIG = {
        // API endpoint (local AGCopilotAPI)
        API_BASE_URL: 'http://192.168.50.141:5000',
        
        // Default analysis parameters
        DEFAULT_DAYS: 7,
        DEFAULT_MIN_ATH_MCAP: 100000,       // $100k minimum ATH
        DEFAULT_MIN_ATH_GAIN_PCT: 900,      // 10x = 900% gain
        DEFAULT_NUM_ARCHETYPES: 5,
        DEFAULT_TOP_TOKENS: 100,
        
        // UI refresh
        AUTO_REFRESH_INTERVAL: 0,  // 0 = disabled, or milliseconds
    };

    // ========================================
    // 🛠️ UTILITIES
    // ========================================
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Format large numbers
    function formatNumber(num) {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toFixed(0);
    }

    // Format percentage
    function formatPercent(pct) {
        if (pct >= 10000) return `${(pct / 100).toFixed(0)}x`;
        if (pct >= 1000) return `${(pct / 100).toFixed(1)}x`;
        return `${pct.toFixed(0)}%`;
    }

    // ========================================
    // 📡 API FUNCTIONS
    // ========================================
    
    async function fetchArchetypes(days, minAthMcap, minAthGainPct, numArchetypes) {
        const url = `${META_CONFIG.API_BASE_URL}/api/meta/archetypes?days=${days}&minAthMcap=${minAthMcap}&minAthGainPct=${minAthGainPct}&numArchetypes=${numArchetypes}`;
        
        console.log(`📡 Fetching archetypes from: ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    }

    async function fetchTopPerformers(days, minAthMcap, minAthGainPct, limit = 20) {
        const url = `${META_CONFIG.API_BASE_URL}/api/meta/top-performers?days=${days}&minAthMcap=${minAthMcap}&minAthGainPct=${minAthGainPct}&limit=${limit}`;
        
        console.log(`📡 Fetching top performers from: ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    }

    // ========================================
    // 🎯 TARGETED OPTIMIZATION (Frontend-based)
    // Uses AGCopilot's optimization algorithms with token filtering
    // ========================================
    
    /**
     * Optimize configuration for a specific set of tokens using frontend algorithms.
     * This uses the same Latin Hypercube and Simulated Annealing algorithms as the main optimizer.
     * @param {string[]} tokenAddresses - Array of token addresses to optimize for
     * @param {string} mode - 'quick', 'medium', or 'full'
     * @param {number} days - Number of days for date range
     * @returns {Object} Optimization result with config, performance metrics, and improvement data
     */
    async function optimizeArchetype(tokenAddresses, mode = 'quick', days = 7) {
        console.log(`🎯 Frontend optimization for ${tokenAddresses.length} tokens, mode: ${mode}`);
        
        const startTime = Date.now();
        
        // Determine runtime based on mode
        const maxRuntimeMs = mode === 'full' ? 60000 : mode === 'medium' ? 30000 : 10000;
        const maxIterations = mode === 'full' ? 100 : mode === 'medium' ? 50 : 20;
        
        // Store original stop state
        const originalStopped = window.STOPPED;
        window.STOPPED = false;
        
        try {
            // Set up date range
            const toDate = new Date();
            const fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - days);
            
            // Create base config with token address filtering
            const baseConfig = {
                basic: {},
                tokenDetails: {},
                wallets: {},
                risk: {},
                advanced: {},
                __targetTokens: tokenAddresses // Special flag for targeted optimization
            };
            
            // Test baseline - all tokens with no filters
            console.log('📊 Testing baseline (no filters)...');
            const baselineResult = await testConfigWithTokens(baseConfig, tokenAddresses, fromDate, toDate);
            
            if (!baselineResult.success) {
                throw new Error(`Baseline test failed: ${baselineResult.error || 'Unknown error'}`);
            }
            
            const baselineMetrics = baselineResult.metrics;
            console.log(`📊 Baseline: ${baselineMetrics.totalTokens} tokens, ${baselineMetrics.winRate?.toFixed(1)}% WR, ${baselineMetrics.roiPercent?.toFixed(1)}% ROI`);
            
            // Track best result
            let bestConfig = { ...baseConfig };
            let bestMetrics = baselineMetrics;
            let bestScore = calculateOptimizationScore(baselineMetrics, tokenAddresses.length);
            let iterations = 0;
            let improvementFound = false;
            
            // Get parameters to optimize (subset for faster targeted optimization)
            const paramsToOptimize = [
                // Most impactful parameters for winning tokens
                { name: 'Min MCAP (USD)', section: 'basic', values: [0, 5000, 10000, 15000, 20000] },
                { name: 'Max MCAP (USD)', section: 'basic', values: [30000, 40000, 50000, 60000] },
                { name: 'Min AG Score', section: 'tokenDetails', values: [0, 3, 4, 5, 6, 7] },
                { name: 'Min Unique Wallets', section: 'wallets', values: [1, 2, 3] },
                { name: 'Min KYC Wallets', section: 'wallets', values: [0, 1, 2] },
                { name: 'Min Holders', section: 'wallets', values: [1, 2, 3, 5] },
                { name: 'Max Holders', section: 'wallets', values: [20, 30, 50, 100] },
                { name: 'Max Bundled %', section: 'risk', values: [30, 50, 70, 100] },
                { name: 'Max Liquidity %', section: 'advanced', values: [20, 30, 50, 100] },
            ];
            
            // Phase 1: Quick parameter sweep
            console.log('🔍 Phase 1: Parameter impact testing...');
            for (const param of paramsToOptimize) {
                if (Date.now() - startTime > maxRuntimeMs * 0.5) break; // Reserve time for refinement
                if (window.STOPPED) break;
                
                for (const value of param.values) {
                    if (window.STOPPED) break;
                    iterations++;
                    
                    const testConfig = JSON.parse(JSON.stringify(bestConfig));
                    if (!testConfig[param.section]) testConfig[param.section] = {};
                    testConfig[param.section][param.name] = value;
                    
                    const result = await testConfigWithTokens(testConfig, tokenAddresses, fromDate, toDate);
                    
                    if (result.success && result.metrics) {
                        const score = calculateOptimizationScore(result.metrics, tokenAddresses.length);
                        
                        if (score > bestScore && result.metrics.totalTokens >= Math.min(3, tokenAddresses.length)) {
                            console.log(`✅ Improvement: ${param.name}=${value} → Score ${score.toFixed(1)} (${result.metrics.totalTokens} tokens)`);
                            bestConfig = testConfig;
                            bestMetrics = result.metrics;
                            bestScore = score;
                            improvementFound = true;
                        }
                    }
                }
            }
            
            // Phase 2: Simulated Annealing refinement (if time permits)
            if (!window.STOPPED && Date.now() - startTime < maxRuntimeMs * 0.9 && mode !== 'quick') {
                console.log('🔥 Phase 2: Simulated Annealing refinement...');
                
                let temperature = 100;
                const coolingRate = 0.95;
                const minTemp = 1;
                let currentConfig = JSON.parse(JSON.stringify(bestConfig));
                let currentScore = bestScore;
                
                while (temperature > minTemp && 
                       iterations < maxIterations && 
                       Date.now() - startTime < maxRuntimeMs && 
                       !window.STOPPED) {
                    
                    iterations++;
                    
                    // Generate neighbor by modifying random parameter
                    const neighborConfig = JSON.parse(JSON.stringify(currentConfig));
                    const param = paramsToOptimize[Math.floor(Math.random() * paramsToOptimize.length)];
                    const value = param.values[Math.floor(Math.random() * param.values.length)];
                    
                    if (!neighborConfig[param.section]) neighborConfig[param.section] = {};
                    neighborConfig[param.section][param.name] = value;
                    
                    const result = await testConfigWithTokens(neighborConfig, tokenAddresses, fromDate, toDate);
                    
                    if (result.success && result.metrics && result.metrics.totalTokens >= Math.min(3, tokenAddresses.length)) {
                        const neighborScore = calculateOptimizationScore(result.metrics, tokenAddresses.length);
                        const delta = neighborScore - currentScore;
                        
                        // Accept if better, or with probability based on temperature
                        if (delta > 0 || Math.random() < Math.exp(delta / temperature)) {
                            currentConfig = neighborConfig;
                            currentScore = neighborScore;
                            
                            if (neighborScore > bestScore) {
                                console.log(`🔥 SA improvement: Score ${neighborScore.toFixed(1)} (temp: ${temperature.toFixed(1)})`);
                                bestConfig = neighborConfig;
                                bestMetrics = result.metrics;
                                bestScore = neighborScore;
                                improvementFound = true;
                            }
                        }
                    }
                    
                    temperature *= coolingRate;
                }
            }
            
            const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
            
            // Build result in format expected by UI
            const optimizedConfigFlat = flattenConfig(bestConfig);
            
            // Calculate which archetype tokens are included in the result
            const archetypeTokensIncluded = bestMetrics.matchedTokenAddresses 
                ? tokenAddresses.filter(t => 
                    bestMetrics.matchedTokenAddresses.has(t.toLowerCase()) || 
                    bestMetrics.matchedTokenAddresses.has(t)
                  ).length
                : bestMetrics.totalTokens;
            
            console.log(`✅ Optimization complete: ${iterations} iterations in ${elapsedSeconds}s`);
            console.log(`   Best score: ${bestScore.toFixed(1)}, Tokens: ${bestMetrics.totalTokens}, ROI: ${bestMetrics.roiPercent?.toFixed(1)}%`);
            
            return {
                success: true,
                elapsedSeconds: parseFloat(elapsedSeconds),
                result: {
                    config: optimizedConfigFlat,
                    performance: {
                        totalTokens: bestMetrics.totalTokens,
                        winRate: bestMetrics.winRate?.toFixed(1) || '0',
                        roiPercent: bestMetrics.roiPercent?.toFixed(1) || '0',
                        archetypeTokensIncluded: archetypeTokensIncluded,
                        archetypeTokensTotal: tokenAddresses.length,
                        allArchetypeTokensIncluded: archetypeTokensIncluded === tokenAddresses.length
                    },
                    improvement: improvementFound ? {
                        baseRoi: baselineMetrics.roiPercent?.toFixed(1) || '0',
                        optimizedRoi: bestMetrics.roiPercent?.toFixed(1) || '0',
                        roiGain: ((bestMetrics.roiPercent || 0) - (baselineMetrics.roiPercent || 0)).toFixed(1)
                    } : null,
                    iterations: iterations
                }
            };
            
        } catch (error) {
            console.error('❌ Optimization error:', error);
            throw error;
        } finally {
            // Restore original stop state
            window.STOPPED = originalStopped;
        }
    }
    
    /**
     * Test a configuration with specific token addresses
     */
    async function testConfigWithTokens(config, tokenAddresses, fromDate, toDate) {
        try {
            // Use the global backtesterAPI if available
            if (!window.backtesterAPI) {
                throw new Error('AGCopilot backtesterAPI not available');
            }
            
            // Map config to API parameters
            const apiParams = window.backtesterAPI.mapParametersToAPI(config);
            
            // Add token addresses for filtering
            apiParams.tokenAddresses = tokenAddresses;
            
            // Add date range
            apiParams.fromDate = fromDate.toISOString().split('T')[0];
            apiParams.toDate = toDate.toISOString().split('T')[0];
            
            // Build URL and fetch
            const url = window.backtesterAPI.buildApiUrl(apiParams);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            
            if (!response.ok) {
                return { success: false, error: `API error: ${response.status}` };
            }
            
            const data = await response.json();
            
            // Build matched token addresses set from response if available
            let matchedTokenAddresses = new Set();
            if (data.matchedTokenAddresses) {
                matchedTokenAddresses = new Set(data.matchedTokenAddresses.map(t => t.toLowerCase()));
            }
            
            return {
                success: true,
                metrics: {
                    totalTokens: data.totalTokens || 0,
                    winRate: data.winRate || 0,
                    roiPercent: data.tpPnlPercent || data.roiPercent || data.averageTpGain || 0,
                    matchedTokenAddresses: matchedTokenAddresses
                }
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Calculate optimization score favoring high ROI while keeping archetype tokens
     */
    function calculateOptimizationScore(metrics, targetTokenCount) {
        const roi = metrics.roiPercent || 0;
        const winRate = metrics.winRate || 0;
        const tokenCount = metrics.totalTokens || 0;
        
        // Penalize if we lose too many tokens
        const tokenRetention = tokenCount / Math.max(1, targetTokenCount);
        const retentionPenalty = tokenRetention < 0.5 ? 0.5 : 1;
        
        // Score: weighted combination of ROI and win rate, with token retention
        const score = (roi * 0.6 + winRate * 0.4) * retentionPenalty;
        
        return score;
    }
    
    /**
     * Flatten nested config to flat object for display
     */
    function flattenConfig(config) {
        const flat = {};
        
        // Map section names to API parameter names
        const sectionToApiMap = {
            'Min MCAP (USD)': 'minMcap',
            'Max MCAP (USD)': 'maxMcap',
            'Min AG Score': 'minAgScore',
            'Min Token Age (sec)': 'minTokenAge',
            'Max Token Age (sec)': 'maxTokenAge',
            'Min Holders': 'minHolders',
            'Max Holders': 'maxHolders',
            'Min Unique Wallets': 'minUniqueWallets',
            'Max Unique Wallets': 'maxUniqueWallets',
            'Min KYC Wallets': 'minKycWallets',
            'Max KYC Wallets': 'maxKycWallets',
            'Min Bundled %': 'minBundledPercent',
            'Max Bundled %': 'maxBundledPercent',
            'Max Liquidity %': 'maxLiquidityPct',
        };
        
        for (const [section, values] of Object.entries(config)) {
            if (section.startsWith('__')) continue; // Skip internal flags
            if (typeof values !== 'object' || values === null) continue;
            
            for (const [key, value] of Object.entries(values)) {
                if (value !== undefined && value !== null) {
                    const apiKey = sectionToApiMap[key] || key;
                    flat[apiKey] = value;
                }
            }
        }
        
        return flat;
    }

    // ========================================
    // 🎨 UI FUNCTIONS
    // ========================================
    
    function createMetaFinderUI() {
        // Remove existing UI
        const existingUI = document.getElementById('meta-finder-ui');
        if (existingUI) {
            existingUI.remove();
        }

        // Check if we're being loaded in the AGCopilot tab
        const tabContainer = document.getElementById('meta-finder-tab');
        const isInTab = !!tabContainer;

        const ui = document.createElement('div');
        ui.id = 'meta-finder-ui';
        
        ui.style.cssText = `
            position: static;
            top: auto;
            left: auto;
            width: 100%;
            max-height: none;
            height: auto;
            background: transparent;
            border: none;
            border-radius: 0;
            padding: 16px 20px;
            margin: 0;
            z-index: auto;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            color: #e2e8f0;
            box-shadow: none;
            overflow-y: auto;
        `;

        ui.innerHTML = `
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 12px; color: #63b3ed;">
                    📅 Time Range:
                </label>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
                    <button class="days-btn active" data-days="3" style="
                        padding: 8px 4px;
                        background: rgba(245, 158, 11, 0.2);
                        border: 1px solid rgba(245, 158, 11, 0.4);
                        border-radius: 6px;
                        color: #f59e0b;
                        font-size: 11px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: all 0.2s;
                    ">3D</button>
                    <button class="days-btn" data-days="7" style="
                        padding: 8px 4px;
                        background: rgba(100, 100, 100, 0.2);
                        border: 1px solid rgba(100, 100, 100, 0.4);
                        border-radius: 6px;
                        color: #a0aec0;
                        font-size: 11px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: all 0.2s;
                    ">7D</button>
                    <button class="days-btn" data-days="14" style="
                        padding: 8px 4px;
                        background: rgba(100, 100, 100, 0.2);
                        border: 1px solid rgba(100, 100, 100, 0.4);
                        border-radius: 6px;
                        color: #a0aec0;
                        font-size: 11px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: all 0.2s;
                    ">14D</button>
                    <button class="days-btn" data-days="30" style="
                        padding: 8px 4px;
                        background: rgba(100, 100, 100, 0.2);
                        border: 1px solid rgba(100, 100, 100, 0.4);
                        border-radius: 6px;
                        color: #a0aec0;
                        font-size: 11px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: all 0.2s;
                    ">30D</button>
                </div>
            </div>
            
            <!-- ATH Filters -->
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 12px; color: #63b3ed;">
                    📈 Minimum ATH Market Cap:
                </label>
                <select id="min-ath-mcap" style="width: 100%; padding: 8px; background: #2d3748; border: 1px solid #4a5568; border-radius: 6px; color: #e2e8f0; font-size: 12px;">
                    <option value="50000">$50K</option>
                    <option value="100000" selected>$100K</option>
                    <option value="250000">$250K</option>
                    <option value="500000">$500K</option>
                    <option value="1000000">$1M</option>
                </select>
            </div>
            
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 12px; color: #63b3ed;">
                    🚀 Minimum ATH Gain (from signal):
                </label>
                <select id="min-ath-gain" style="width: 100%; padding: 8px; background: #2d3748; border: 1px solid #4a5568; border-radius: 6px; color: #e2e8f0; font-size: 12px;">
                    <option value="400">5x (400%)</option>
                    <option value="900" selected>10x (900%)</option>
                    <option value="1900">20x (1900%)</option>
                    <option value="4900">50x (4900%)</option>
                    <option value="9900">100x (9900%)</option>
                </select>
            </div>
            
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 12px; color: #63b3ed;">
                    🎯 Number of Archetypes:
                </label>
                <select id="num-archetypes" style="width: 100%; padding: 8px; background: #2d3748; border: 1px solid #4a5568; border-radius: 6px; color: #e2e8f0; font-size: 12px;">
                    <option value="3">3 Archetypes</option>
                    <option value="5" selected>5 Archetypes</option>
                    <option value="7">7 Archetypes</option>
                </select>
                <div style="font-size: 9px; color: #718096; margin-top: 4px;">Each archetype requires at least 3 tokens</div>
            </div>
            
            <!-- Action Buttons -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
                <button id="find-archetypes-btn" style="
                    padding: 12px; 
                    background: linear-gradient(45deg, #f59e0b, #d97706); 
                    border: none; 
                    border-radius: 8px; 
                    color: white; 
                    font-weight: 700; 
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
                " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(245, 158, 11, 0.4)'" 
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(245, 158, 11, 0.3)'">
                    🎯 Find Archetypes
                </button>
                
                <button id="show-top-performers-btn" style="
                    padding: 12px; 
                    background: linear-gradient(45deg, #8b5cf6, #7c3aed); 
                    border: none; 
                    border-radius: 8px; 
                    color: white; 
                    font-weight: 700; 
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
                " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(139, 92, 246, 0.4)'" 
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(139, 92, 246, 0.3)'">
                    📊 Top Performers
                </button>
            </div>
            
            <!-- Results Area -->
            <div id="meta-results" style="
                background: #1a202c;
                border: 1px solid #2d3748;
                border-radius: 8px;
                padding: 12px;
                min-height: 100px;
                font-size: 11px;
            ">
                <div style="text-align: center; color: #a0aec0; padding: 20px;">
                    Click "Find Archetypes" to discover winning config patterns
                </div>
            </div>
        `;

        // Smart rendering: tab integration or standalone
        if (isInTab) {
            tabContainer.innerHTML = '';
            tabContainer.appendChild(ui);
            console.log('🎯 Meta Finder rendered full-size in AGCopilot tab');
        } else {
            document.body.appendChild(ui);
            console.log('🎯 Meta Finder rendered as standalone window');
        }
        
        return ui;
    }

    function renderArchetypeResults(data) {
        const resultsDiv = document.getElementById('meta-results');
        if (!resultsDiv) return;
        
        if (!data.success) {
            resultsDiv.innerHTML = `
                <div style="text-align: center; color: #f56565; padding: 20px;">
                    <div style="font-size: 24px; margin-bottom: 8px;">⚠️</div>
                    <div>${data.message || 'Failed to fetch archetypes'}</div>
                    ${data.suggestion ? `<div style="color: #a0aec0; margin-top: 8px; font-size: 10px;">${data.suggestion}</div>` : ''}
                </div>
            `;
            return;
        }
        
        let html = `
            <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #2d3748;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #48bb78; font-weight: 600;">✅ Found ${data.totalQualifyingTokens} qualifying tokens</span>
                    <span style="color: #a0aec0; font-size: 10px;">${data.dateRange.from} (${data.dateRange.days}d)</span>
                </div>
            </div>
        `;
        
        // Render each archetype
        data.archetypes.forEach((arch, index) => {
            const isExpanded = index === 0; // First one expanded by default
            html += `
                <div class="archetype-card" style="
                    background: rgba(245, 158, 11, 0.05);
                    border: 1px solid rgba(245, 158, 11, 0.2);
                    border-radius: 8px;
                    margin-bottom: 8px;
                    overflow: hidden;
                ">
                    <div class="archetype-header" data-archetype="${index}" style="
                        padding: 10px 12px;
                        cursor: pointer;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: rgba(245, 158, 11, 0.1);
                    ">
                        <div>
                            <span style="font-weight: 600; color: #f59e0b;">#${arch.archetypeId} ${arch.name}</span>
                            <span style="color: #a0aec0; margin-left: 8px;">(${arch.tokenCount} tokens)</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="color: #48bb78; font-weight: 600;">${formatPercent(arch.avgAthGainPct)} avg</span>
                            <span style="color: #a0aec0; transition: transform 0.2s;" class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
                        </div>
                    </div>
                    <div class="archetype-details" data-archetype="${index}" style="
                        padding: ${isExpanded ? '12px' : '0 12px'};
                        max-height: ${isExpanded ? '500px' : '0'};
                        overflow: hidden;
                        transition: all 0.3s ease;
                    ">
                        <div style="color: #a0aec0; font-size: 10px; margin-bottom: 8px;">${arch.description}</div>
                        
                        <!-- Distinctive Features -->
                        <div style="margin-bottom: 10px;">
                            <div style="color: #63b3ed; font-size: 10px; margin-bottom: 4px;">Key Features:</div>
                            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                                ${arch.distinctiveFeatures.map(f => `
                                    <span style="background: rgba(99, 179, 237, 0.1); border: 1px solid rgba(99, 179, 237, 0.3); padding: 2px 6px; border-radius: 4px; font-size: 9px; color: #63b3ed;">${f}</span>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Sample Tokens -->
                        <div style="margin-bottom: 10px;">
                            <div style="color: #63b3ed; font-size: 10px; margin-bottom: 4px;">Top Performers:</div>
                            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                                ${arch.sampleTokens.slice(0, 3).map(t => `
                                    <span style="background: rgba(72, 187, 120, 0.1); border: 1px solid rgba(72, 187, 120, 0.3); padding: 2px 6px; border-radius: 4px; font-size: 9px; color: #48bb78;">
                                        ${t.symbol} (${formatPercent(t.athGainPct)})
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Config Preview -->
                        <div id="config-preview-${index}" style="background: #1a202c; border-radius: 4px; padding: 8px; margin-bottom: 8px;">
                            <div style="color: #63b3ed; font-size: 10px; margin-bottom: 4px;">Config Ranges:</div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 9px; color: #a0aec0;">
                                <div>MCAP: ${formatNumber(arch.config.basic.minMcap)}-${formatNumber(arch.config.basic.maxMcap)}</div>
                                <div>Holders: ${arch.config.wallets.minHolders}-${arch.config.wallets.maxHolders}</div>
                                <div>Unique: ${arch.config.wallets.minUniqueWallets}-${arch.config.wallets.maxUniqueWallets}</div>
                                <div>KYC: ${arch.config.wallets.minKycWallets}-${arch.config.wallets.maxKycWallets || '∞'}</div>
                                <div>AG Score: ${arch.config.tokenDetails.minAgScore}+</div>
                                <div>Bundled: ${arch.config.risk.minBundledPct ?? 0}-${arch.config.risk.maxBundledPct}%</div>
                            </div>
                        </div>
                        
                        <!-- Optimization Section -->
                        <div id="optimize-section-${index}" style="background: rgba(72, 187, 120, 0.05); border: 1px solid rgba(72, 187, 120, 0.2); border-radius: 4px; padding: 8px; margin-bottom: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <span style="color: #48bb78; font-size: 10px; font-weight: 600;">🚀 Optimize Config</span>
                                <select id="optimize-mode-${index}" style="padding: 2px 6px; background: #2d3748; border: 1px solid #4a5568; border-radius: 4px; color: #e2e8f0; font-size: 9px;">
                                    <option value="quick">⚡ Quick (~1s)</option>
                                    <option value="medium" selected>🔍 Medium (~10s)</option>
                                    <option value="full">🚀 Full (~60s)</option>
                                </select>
                            </div>
                            <div style="font-size: 9px; color: #718096; margin-bottom: 6px;">
                                Find tightest filters that include all ${arch.tokenCount} tokens while maximizing ROI
                            </div>
                            <button onclick="window.runArchetypeOptimization(${index})" id="optimize-btn-${index}" style="
                                width: 100%;
                                padding: 6px;
                                background: linear-gradient(45deg, #48bb78, #38a169);
                                border: none;
                                border-radius: 4px;
                                color: white;
                                font-size: 10px;
                                cursor: pointer;
                                font-weight: 600;
                                transition: all 0.2s;
                            ">🎯 Run Optimization</button>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                            <button onclick="window.applyArchetypeConfig(${index})" style="
                                padding: 6px;
                                background: rgba(66, 153, 225, 0.2);
                                border: 1px solid rgba(66, 153, 225, 0.4);
                                border-radius: 4px;
                                color: #63b3ed;
                                font-size: 10px;
                                cursor: pointer;
                                font-weight: 600;
                            ">⚙️ Apply</button>
                            <button onclick="window.copyArchetypeConfig(${index})" style="
                                padding: 6px;
                                background: rgba(139, 92, 246, 0.2);
                                border: 1px solid rgba(139, 92, 246, 0.4);
                                border-radius: 4px;
                                color: #a78bfa;
                                font-size: 10px;
                                cursor: pointer;
                                font-weight: 600;
                            ">📋 Copy</button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        resultsDiv.innerHTML = html;
        
        // Add click handlers for expandable cards
        document.querySelectorAll('.archetype-header').forEach(header => {
            header.addEventListener('click', () => {
                const index = header.dataset.archetype;
                const details = document.querySelector(`.archetype-details[data-archetype="${index}"]`);
                const icon = header.querySelector('.expand-icon');
                
                if (details.style.maxHeight === '0px') {
                    details.style.maxHeight = '500px';
                    details.style.padding = '12px';
                    icon.textContent = '▼';
                } else {
                    details.style.maxHeight = '0px';
                    details.style.padding = '0 12px';
                    icon.textContent = '▶';
                }
            });
        });
    }

    function renderTopPerformers(data) {
        const resultsDiv = document.getElementById('meta-results');
        if (!resultsDiv) return;
        
        if (!data.success || !data.topPerformers || data.topPerformers.length === 0) {
            resultsDiv.innerHTML = `
                <div style="text-align: center; color: #f56565; padding: 20px;">
                    <div style="font-size: 24px; margin-bottom: 8px;">⚠️</div>
                    <div>No qualifying tokens found</div>
                    <div style="color: #a0aec0; margin-top: 8px; font-size: 10px;">Try lowering the ATH requirements</div>
                </div>
            `;
            return;
        }
        
        let html = `
            <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #2d3748;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #8b5cf6; font-weight: 600;">📊 Top ${data.count} Performers</span>
                    <span style="color: #a0aec0; font-size: 10px;">${data.dateRange.from} (${data.dateRange.days}d)</span>
                </div>
            </div>
            
            <div style="max-height: 400px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                    <thead>
                        <tr style="color: #a0aec0; border-bottom: 1px solid #2d3748;">
                            <th style="text-align: left; padding: 6px 4px;">Token</th>
                            <th style="text-align: right; padding: 6px 4px;">ATH Gain</th>
                            <th style="text-align: right; padding: 6px 4px;">ATH MCAP</th>
                            <th style="text-align: center; padding: 6px 4px;">AG</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        data.topPerformers.forEach((token, i) => {
            const rowBg = i % 2 === 0 ? 'rgba(139, 92, 246, 0.05)' : 'transparent';
            html += `
                <tr style="background: ${rowBg}; border-bottom: 1px solid #1a202c;">
                    <td style="padding: 6px 4px;">
                        <div style="font-weight: 600; color: #e2e8f0;">${token.symbol}</div>
                        <div style="font-size: 8px; color: #718096;">${token.signalTime}</div>
                    </td>
                    <td style="text-align: right; padding: 6px 4px; color: #48bb78; font-weight: 600;">
                        ${formatPercent(token.athGainPct)}
                    </td>
                    <td style="text-align: right; padding: 6px 4px; color: #a0aec0;">
                        ${formatNumber(token.athMcap)}
                    </td>
                    <td style="text-align: center; padding: 6px 4px; color: #f59e0b;">
                        ${token.criteria.agScore}
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        resultsDiv.innerHTML = html;
    }

    function showLoading(message = 'Loading...') {
        const resultsDiv = document.getElementById('meta-results');
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 32px; margin-bottom: 12px;">🔄</div>
                    <div style="color: #a0aec0;">${message}</div>
                </div>
            `;
        }
    }

    function showError(message) {
        const resultsDiv = document.getElementById('meta-results');
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <div style="text-align: center; color: #f56565; padding: 20px;">
                    <div style="font-size: 24px; margin-bottom: 8px;">❌</div>
                    <div>${message}</div>
                </div>
            `;
        }
    }

    // ========================================
    // 🎮 EVENT HANDLERS
    // ========================================
    
    let currentArchetypes = null;
    let selectedDays = 3;
    
    function setupEventHandlers() {
        // Days selection buttons
        document.querySelectorAll('.days-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Update selection
                document.querySelectorAll('.days-btn').forEach(b => {
                    b.style.background = 'rgba(100, 100, 100, 0.2)';
                    b.style.borderColor = 'rgba(100, 100, 100, 0.4)';
                    b.style.color = '#a0aec0';
                    b.classList.remove('active');
                });
                
                btn.style.background = 'rgba(245, 158, 11, 0.2)';
                btn.style.borderColor = 'rgba(245, 158, 11, 0.4)';
                btn.style.color = '#f59e0b';
                btn.classList.add('active');
                
                selectedDays = parseInt(btn.dataset.days);
            });
        });
        
        // Find Archetypes button
        document.getElementById('find-archetypes-btn').addEventListener('click', async () => {
            const minAthMcap = parseInt(document.getElementById('min-ath-mcap').value);
            const minAthGain = parseInt(document.getElementById('min-ath-gain').value);
            const numArchetypes = parseInt(document.getElementById('num-archetypes').value);
            
            try {
                showLoading('Discovering archetypes...');
                const data = await fetchArchetypes(selectedDays, minAthMcap, minAthGain, numArchetypes);
                currentArchetypes = data;
                renderArchetypeResults(data);
            } catch (error) {
                console.error('Failed to fetch archetypes:', error);
                showError(`Failed to fetch archetypes: ${error.message}`);
            }
        });
        
        // Top Performers button
        document.getElementById('show-top-performers-btn').addEventListener('click', async () => {
            const minAthMcap = parseInt(document.getElementById('min-ath-mcap').value);
            const minAthGain = parseInt(document.getElementById('min-ath-gain').value);
            
            try {
                showLoading('Fetching top performers...');
                const data = await fetchTopPerformers(selectedDays, minAthMcap, minAthGain, 20);
                renderTopPerformers(data);
            } catch (error) {
                console.error('Failed to fetch top performers:', error);
                showError(`Failed to fetch top performers: ${error.message}`);
            }
        });
    }

    // ========================================
    // 🌍 GLOBAL FUNCTIONS
    // ========================================
    
    // Apply archetype config to backtester UI
    window.applyArchetypeConfig = async function(index) {
        if (!currentArchetypes || !currentArchetypes.archetypes || !currentArchetypes.archetypes[index]) {
            console.error('No archetype data available');
            return;
        }
        
        const arch = currentArchetypes.archetypes[index];
        const config = arch.config;
        
        // Helper to only include non-null values
        const addIfNotNull = (obj, key, value) => {
            if (value !== null && value !== undefined) {
                obj[key] = value;
            }
        };
        
        // Convert to AGCopilot config format, skipping null values
        const agConfig = {
            basic: {},
            tokenDetails: {},
            wallets: {},
            risk: {},
            advanced: {}
        };
        
        // Basic
        addIfNotNull(agConfig.basic, "Min MCAP (USD)", config.basic.minMcap);
        addIfNotNull(agConfig.basic, "Max MCAP (USD)", config.basic.maxMcap);
        
        // Token Details
        addIfNotNull(agConfig.tokenDetails, "Min AG Score", config.tokenDetails.minAgScore != null ? String(config.tokenDetails.minAgScore) : null);
        addIfNotNull(agConfig.tokenDetails, "Max AG Score", config.tokenDetails.maxAgScore != null ? String(config.tokenDetails.maxAgScore) : null);
        addIfNotNull(agConfig.tokenDetails, "Min Deployer Age (min)", config.tokenDetails.minDeployerAge);
        addIfNotNull(agConfig.tokenDetails, "Max Deployer Age (min)", config.tokenDetails.maxDeployerAge);
        addIfNotNull(agConfig.tokenDetails, "Min Token Age (sec)", config.tokenDetails.minTokenAge);
        addIfNotNull(agConfig.tokenDetails, "Max Token Age (sec)", config.tokenDetails.maxTokenAge);
        
        // Wallets
        addIfNotNull(agConfig.wallets, "Min Unique Wallets", config.wallets.minUniqueWallets);
        addIfNotNull(agConfig.wallets, "Max Unique Wallets", config.wallets.maxUniqueWallets);
        addIfNotNull(agConfig.wallets, "Min KYC Wallets", config.wallets.minKycWallets);
        addIfNotNull(agConfig.wallets, "Max KYC Wallets", config.wallets.maxKycWallets);
        addIfNotNull(agConfig.wallets, "Min Holders", config.wallets.minHolders);
        addIfNotNull(agConfig.wallets, "Max Holders", config.wallets.maxHolders);
        addIfNotNull(agConfig.wallets, "Min Top Holders %", config.wallets.minTopHoldersPct);
        addIfNotNull(agConfig.wallets, "Max Top Holders %", config.wallets.maxTopHoldersPct);
        
        // Risk
        addIfNotNull(agConfig.risk, "Min Bundled %", config.risk.minBundledPct);
        addIfNotNull(agConfig.risk, "Max Bundled %", config.risk.maxBundledPct);
        addIfNotNull(agConfig.risk, "Max Deployer Balance (SOL)", config.risk.maxDeployerBalance);
        
        // Advanced
        addIfNotNull(agConfig.advanced, "Min Buy Ratio %", config.advanced.minBuyRatio);
        addIfNotNull(agConfig.advanced, "Min Win Pred %", config.advanced.minWinPredPct);
        
        // Store for meta-finder-actions
        window.latestMetaConfig = agConfig;
        
        // Show action buttons
        const actionsDiv = document.getElementById('meta-finder-actions');
        if (actionsDiv) {
            actionsDiv.style.display = 'grid';
        }
        
        // Apply to UI if function available
        if (typeof window.applyConfigToUI === 'function') {
            await window.applyConfigToUI(agConfig);
            console.log(`✅ Applied archetype #${index + 1}: ${arch.name}`);
            if (typeof window.updateStatus === 'function') {
                window.updateStatus(`✅ Applied: ${arch.name}`);
            }
        } else {
            console.warn('applyConfigToUI not available');
        }
    };
    
    // Copy archetype config to clipboard
    window.copyArchetypeConfig = async function(index) {
        if (!currentArchetypes || !currentArchetypes.archetypes || !currentArchetypes.archetypes[index]) {
            console.error('No archetype data available');
            return;
        }
        
        const arch = currentArchetypes.archetypes[index];
        const configJson = JSON.stringify(arch.config, null, 2);
        
        try {
            await navigator.clipboard.writeText(configJson);
            console.log(`📋 Copied archetype #${index + 1}: ${arch.name}`);
            if (typeof window.updateStatus === 'function') {
                window.updateStatus(`📋 Copied: ${arch.name}`);
            }
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };
    
    // Global apply/copy for action buttons
    window.applyMetaConfig = async function() {
        if (window.latestMetaConfig && typeof window.applyConfigToUI === 'function') {
            await window.applyConfigToUI(window.latestMetaConfig);
            console.log('✅ Applied meta config to UI');
        } else {
            console.warn('No meta config available or applyConfigToUI not found');
        }
    };
    
    window.copyMetaConfig = async function() {
        if (window.latestMetaConfig) {
            try {
                await navigator.clipboard.writeText(JSON.stringify(window.latestMetaConfig, null, 2));
                console.log('📋 Copied meta config to clipboard');
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        } else {
            console.warn('No meta config available');
        }
    };

    // Run optimization for an archetype
    window.runArchetypeOptimization = async function(index) {
        if (!currentArchetypes || !currentArchetypes.archetypes || !currentArchetypes.archetypes[index]) {
            console.error('No archetype data available');
            return;
        }
        
        const arch = currentArchetypes.archetypes[index];
        const modeSelect = document.getElementById(`optimize-mode-${index}`);
        const btn = document.getElementById(`optimize-btn-${index}`);
        const optimizeSection = document.getElementById(`optimize-section-${index}`);
        
        const mode = modeSelect?.value || 'medium';
        
        // Get all token addresses from the archetype
        const tokenAddresses = arch.tokenAddresses || arch.sampleTokens.map(t => t.tokenAddress);
        
        // Update button state
        btn.disabled = true;
        btn.innerHTML = '⏳ Optimizing...';
        btn.style.opacity = '0.7';
        
        // Update the MAIN best config section in AGCopilot
        const bestConfigHeader = document.getElementById('best-config-header');
        const bestConfigStats = document.getElementById('best-config-stats');
        
        if (bestConfigHeader) {
            bestConfigHeader.innerHTML = `🔄 Optimizing Archetype #${index + 1}...`;
            bestConfigHeader.style.color = '#4299e1';
        }
        if (bestConfigStats) {
            bestConfigStats.innerHTML = `
                <div style="text-align: center; padding: 8px;">
                    <div style="font-size: 12px; color: #a0aec0;">Running ${mode} optimization for ${tokenAddresses.length} tokens...</div>
                </div>
            `;
        }
        
        try {
            const result = await optimizeArchetype(tokenAddresses, mode, selectedDays);
            
            if (!result.success) {
                throw new Error(result.error || 'Optimization failed');
            }
            
            const perf = result.result.performance;
            const config = result.result.config;
            const improvement = result.result.improvement;
            
            // Store optimized config for this archetype
            window.optimizedArchetypeConfigs = window.optimizedArchetypeConfigs || {};
            window.optimizedArchetypeConfigs[index] = config;
            
            // Update the MAIN best config section with results
            const roiColor = perf.roiPercent >= 0 ? '#48bb78' : '#f56565';
            const tokenStatusColor = perf.allArchetypeTokensIncluded ? '#48bb78' : '#f59e0b';
            
            if (bestConfigHeader) {
                bestConfigHeader.innerHTML = `🎯 Archetype #${index + 1} Optimized`;
                bestConfigHeader.style.color = '#48bb78';
            }
            
            if (bestConfigStats) {
                bestConfigStats.innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; text-align: center;">
                        <div style="background: rgba(26, 32, 44, 0.5); padding: 8px; border-radius: 4px;">
                            <div style="color: #718096; font-size: 9px; text-transform: uppercase;">Total Tokens</div>
                            <div style="color: #e2e8f0; font-size: 18px; font-weight: 700;">${perf.totalTokens}</div>
                        </div>
                        <div style="background: rgba(26, 32, 44, 0.5); padding: 8px; border-radius: 4px;">
                            <div style="color: #718096; font-size: 9px; text-transform: uppercase;">Win Rate</div>
                            <div style="color: #48bb78; font-size: 18px; font-weight: 700;">${perf.winRate}%</div>
                        </div>
                        <div style="background: rgba(26, 32, 44, 0.5); padding: 8px; border-radius: 4px;">
                            <div style="color: #718096; font-size: 9px; text-transform: uppercase;">ROI</div>
                            <div style="color: ${roiColor}; font-size: 18px; font-weight: 700;">${perf.roiPercent > 0 ? '+' : ''}${perf.roiPercent}%</div>
                        </div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 6px 8px; background: rgba(26, 32, 44, 0.3); border-radius: 4px;">
                        <span style="color: ${tokenStatusColor}; font-size: 11px; font-weight: 600;">
                            ✓ ${perf.archetypeTokensIncluded}/${perf.archetypeTokensTotal} archetype tokens included
                        </span>
                        <span style="color: #718096; font-size: 10px;">${result.elapsedSeconds}s | ${result.result.iterations} iterations</span>
                    </div>
                    
                    ${improvement && improvement.roiGain !== 0 ? `
                        <div style="background: rgba(72, 187, 120, 0.15); border-radius: 4px; padding: 8px; margin-bottom: 12px; font-size: 11px; text-align: center;">
                            <span style="color: #48bb78;">📈 Baseline: ${improvement.baseRoi}% → Optimized: ${improvement.optimizedRoi}%</span>
                            ${improvement.roiGain > 0 ? `<span style="color: #48bb78; font-weight: 600; margin-left: 6px;">(+${improvement.roiGain}%)</span>` : ''}
                        </div>
                    ` : ''}
                    
                    <div style="background: rgba(26, 32, 44, 0.4); border-radius: 4px; padding: 8px; margin-bottom: 12px;">
                        <div style="color: #63b3ed; font-size: 10px; margin-bottom: 6px; font-weight: 600;">Optimized Filter Bounds:</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 10px; color: #a0aec0;">
                            <div>MCAP: ${formatNumber(config.minMcap)} - ${formatNumber(config.maxMcap)}</div>
                            <div>Holders: ${config.minHolders} - ${config.maxHolders}</div>
                            <div>Unique: ${config.minUniqueWallets} - ${config.maxUniqueWallets}</div>
                            <div>KYC: ${config.minKycWallets} - ${config.maxKycWallets || '∞'}</div>
                            <div>AG Score: ${config.minAgScore}+</div>
                            <div>Token Age: ${config.minTokenAge} - ${config.maxTokenAge > 10000 ? '∞' : config.maxTokenAge}s</div>
                        </div>
                    </div>
                `;
            }
            
            // Show the meta finder action buttons
            const metaFinderActions = document.getElementById('meta-finder-actions');
            if (metaFinderActions) {
                metaFinderActions.style.display = 'grid';
            }
            
            // Store config for apply/copy functions
            window.latestMetaConfig = convertToAGCopilotFormat(config);
            
            // Reset button state in archetype card
            btn.disabled = false;
            btn.innerHTML = '✅ Optimized';
            btn.style.opacity = '1';
            btn.style.background = 'linear-gradient(45deg, #48bb78, #38a169)';
            
            console.log(`✅ Optimization complete for archetype #${index + 1}:`, result);
            
        } catch (error) {
            console.error('Optimization failed:', error);
            
            if (bestConfigHeader) {
                bestConfigHeader.innerHTML = `❌ Optimization Failed`;
                bestConfigHeader.style.color = '#f56565';
            }
            if (bestConfigStats) {
                bestConfigStats.innerHTML = `
                    <div style="text-align: center; padding: 12px; color: #f56565;">
                        <div style="font-size: 11px; margin-bottom: 8px;">${error.message}</div>
                        <button onclick="window.runArchetypeOptimization(${index})" style="
                            padding: 8px 16px;
                            background: rgba(245, 101, 101, 0.2);
                            border: 1px solid rgba(245, 101, 101, 0.4);
                            border-radius: 4px;
                            color: #f56565;
                            font-size: 11px;
                            cursor: pointer;
                        ">🔄 Retry</button>
                    </div>
                `;
            }
            
            // Reset button state
            btn.disabled = false;
            btn.innerHTML = '🎯 Run Optimization';
            btn.style.opacity = '1';
        }
    };
    
    // Helper to convert TightBounds to AGCopilot config format
    function convertToAGCopilotFormat(config) {
        const addIfNotNull = (obj, key, value) => {
            if (value !== null && value !== undefined) {
                obj[key] = value;
            }
        };
        
        const agConfig = {
            basic: {},
            tokenDetails: {},
            wallets: {},
            risk: {},
            advanced: {}
        };
        
        addIfNotNull(agConfig.basic, "Min MCAP (USD)", config.minMcap);
        addIfNotNull(agConfig.basic, "Max MCAP (USD)", config.maxMcap);
        addIfNotNull(agConfig.tokenDetails, "Min AG Score", config.minAgScore != null ? String(config.minAgScore) : null);
        addIfNotNull(agConfig.tokenDetails, "Max AG Score", config.maxAgScore != null ? String(config.maxAgScore) : null);
        addIfNotNull(agConfig.tokenDetails, "Min Deployer Age (min)", config.minDeployerAge);
        addIfNotNull(agConfig.tokenDetails, "Max Deployer Age (min)", config.maxDeployerAge);
        addIfNotNull(agConfig.tokenDetails, "Min Token Age (sec)", config.minTokenAge);
        addIfNotNull(agConfig.tokenDetails, "Max Token Age (sec)", config.maxTokenAge);
        addIfNotNull(agConfig.wallets, "Min Unique Wallets", config.minUniqueWallets);
        addIfNotNull(agConfig.wallets, "Max Unique Wallets", config.maxUniqueWallets);
        addIfNotNull(agConfig.wallets, "Min KYC Wallets", config.minKycWallets);
        addIfNotNull(agConfig.wallets, "Max KYC Wallets", config.maxKycWallets);
        addIfNotNull(agConfig.wallets, "Min Holders", config.minHolders);
        addIfNotNull(agConfig.wallets, "Max Holders", config.maxHolders);
        addIfNotNull(agConfig.wallets, "Min Top Holders %", config.minTopHoldersPct);
        addIfNotNull(agConfig.wallets, "Max Top Holders %", config.maxTopHoldersPct);
        addIfNotNull(agConfig.risk, "Max Bundled %", config.maxBundledPct);
        addIfNotNull(agConfig.risk, "Max Deployer Balance (SOL)", config.maxDeployerBalance);
        addIfNotNull(agConfig.advanced, "Min Buy Ratio %", config.minBuyRatio);
        addIfNotNull(agConfig.advanced, "Min Win Pred %", config.minWinPredPct);
        
        return agConfig;
    }
    
    // Reset optimization section to allow re-running
    window.resetArchetypeOptimization = function(index) {
        if (!currentArchetypes || !currentArchetypes.archetypes || !currentArchetypes.archetypes[index]) {
            return;
        }
        
        const arch = currentArchetypes.archetypes[index];
        const optimizeSection = document.getElementById(`optimize-section-${index}`);
        const configPreview = document.getElementById(`config-preview-${index}`);
        
        // Reset config preview to original
        if (configPreview) {
            configPreview.innerHTML = `
                <div style="color: #63b3ed; font-size: 10px; margin-bottom: 4px;">Config Ranges:</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 9px; color: #a0aec0;">
                    <div>MCAP: ${formatNumber(arch.config.basic.minMcap)}-${formatNumber(arch.config.basic.maxMcap)}</div>
                    <div>Holders: ${arch.config.wallets.minHolders}-${arch.config.wallets.maxHolders}</div>
                    <div>Unique: ${arch.config.wallets.minUniqueWallets}-${arch.config.wallets.maxUniqueWallets}</div>
                    <div>KYC: ${arch.config.wallets.minKycWallets}-${arch.config.wallets.maxKycWallets || '∞'}</div>
                    <div>AG Score: ${arch.config.tokenDetails.minAgScore}+</div>
                    <div>Bundled: ${arch.config.risk.minBundledPct ?? 0}-${arch.config.risk.maxBundledPct}%</div>
                </div>
            `;
            configPreview.style.background = '#1a202c';
            configPreview.style.border = 'none';
        }
        
        // Reset optimization section
        if (optimizeSection) {
            optimizeSection.style.background = 'rgba(72, 187, 120, 0.05)';
            optimizeSection.style.border = '1px solid rgba(72, 187, 120, 0.2)';
            optimizeSection.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="color: #48bb78; font-size: 10px; font-weight: 600;">🚀 Optimize Config</span>
                    <select id="optimize-mode-${index}" style="padding: 2px 6px; background: #2d3748; border: 1px solid #4a5568; border-radius: 4px; color: #e2e8f0; font-size: 9px;">
                        <option value="quick">⚡ Quick (~1s)</option>
                        <option value="medium" selected>🔍 Medium (~10s)</option>
                        <option value="full">🚀 Full (~60s)</option>
                    </select>
                </div>
                <div style="font-size: 9px; color: #718096; margin-bottom: 6px;">
                    Find tightest filters that include all ${arch.tokenCount} tokens while maximizing ROI
                </div>
                <button onclick="window.runArchetypeOptimization(${index})" id="optimize-btn-${index}" style="
                    width: 100%;
                    padding: 6px;
                    background: linear-gradient(45deg, #48bb78, #38a169);
                    border: none;
                    border-radius: 4px;
                    color: white;
                    font-size: 10px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.2s;
                ">🎯 Run Optimization</button>
            `;
        }
        
        // Clear stored optimized config
        if (window.optimizedArchetypeConfigs) {
            delete window.optimizedArchetypeConfigs[index];
        }
    };

    // Apply optimized config
    window.applyOptimizedConfig = async function(index) {
        const config = window.optimizedArchetypeConfigs?.[index];
        if (!config) {
            console.error('No optimized config available');
            return;
        }
        
        // Convert TightBounds format to AGCopilot config format
        const addIfNotNull = (obj, key, value) => {
            if (value !== null && value !== undefined) {
                obj[key] = value;
            }
        };
        
        const agConfig = {
            basic: {},
            tokenDetails: {},
            wallets: {},
            risk: {},
            advanced: {}
        };
        
        addIfNotNull(agConfig.basic, "Min MCAP (USD)", config.minMcap);
        addIfNotNull(agConfig.basic, "Max MCAP (USD)", config.maxMcap);
        addIfNotNull(agConfig.tokenDetails, "Min AG Score", config.minAgScore != null ? String(config.minAgScore) : null);
        addIfNotNull(agConfig.tokenDetails, "Max AG Score", config.maxAgScore != null ? String(config.maxAgScore) : null);
        addIfNotNull(agConfig.tokenDetails, "Min Deployer Age (min)", config.minDeployerAge);
        addIfNotNull(agConfig.tokenDetails, "Max Deployer Age (min)", config.maxDeployerAge);
        addIfNotNull(agConfig.tokenDetails, "Min Token Age (sec)", config.minTokenAge);
        addIfNotNull(agConfig.tokenDetails, "Max Token Age (sec)", config.maxTokenAge);
        addIfNotNull(agConfig.wallets, "Min Unique Wallets", config.minUniqueWallets);
        addIfNotNull(agConfig.wallets, "Max Unique Wallets", config.maxUniqueWallets);
        addIfNotNull(agConfig.wallets, "Min KYC Wallets", config.minKycWallets);
        addIfNotNull(agConfig.wallets, "Max KYC Wallets", config.maxKycWallets);
        addIfNotNull(agConfig.wallets, "Min Holders", config.minHolders);
        addIfNotNull(agConfig.wallets, "Max Holders", config.maxHolders);
        addIfNotNull(agConfig.wallets, "Min Top Holders %", config.minTopHoldersPct);
        addIfNotNull(agConfig.wallets, "Max Top Holders %", config.maxTopHoldersPct);
        addIfNotNull(agConfig.risk, "Max Bundled %", config.maxBundledPct);
        addIfNotNull(agConfig.risk, "Max Deployer Balance (SOL)", config.maxDeployerBalance);
        addIfNotNull(agConfig.advanced, "Min Buy Ratio %", config.minBuyRatio);
        addIfNotNull(agConfig.advanced, "Min Win Pred %", config.minWinPredPct);
        
        window.latestMetaConfig = agConfig;
        
        if (typeof window.applyConfigToUI === 'function') {
            await window.applyConfigToUI(agConfig);
            console.log(`✅ Applied optimized config for archetype #${index + 1}`);
            if (typeof window.updateStatus === 'function') {
                window.updateStatus(`✅ Applied optimized config`);
            }
        } else {
            console.warn('applyConfigToUI not available');
        }
    };

    // Copy optimized config
    window.copyOptimizedConfig = async function(index) {
        const config = window.optimizedArchetypeConfigs?.[index];
        if (!config) {
            console.error('No optimized config available');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
            console.log(`📋 Copied optimized config for archetype #${index + 1}`);
            if (typeof window.updateStatus === 'function') {
                window.updateStatus(`📋 Copied optimized config`);
            }
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // ========================================
    // 🚀 INITIALIZATION
    // ========================================
    
    console.log('🔧 Initializing Meta Finder...');
    
    try {
        createMetaFinderUI();
        setupEventHandlers();
        console.log('✅ Meta Finder initialized successfully!');
    } catch (error) {
        console.error('❌ Meta Finder initialization failed:', error);
    }
    
})();
