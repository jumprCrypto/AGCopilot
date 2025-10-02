(async function () {
    console.clear();
    console.log('%c🏗️ AG Base Config Builder v1.0 🏗️', 'color: purple; font-size: 16px; font-weight: bold;');
    
    // Check if we're being loaded in the AGCopilot tab
    const isInTab = document.getElementById('base-config-tab');
    if (!isInTab) {
        console.log('%c✨ Can be integrated into the main AGCopilot interface!', 'color: green; font-size: 12px;');
        console.log('💡 Use the "🏗️ Base Config" tab in AGCopilot for integrated experience');
    }

    // ========================================
    // 🎯 BASE CONFIG BUILDER CONFIGURATION
    // ========================================
    const BASE_CONFIG = {
        // Target metrics for base config
        TARGET_MIN_TOKENS_PER_DAY: 70,   // Minimum tokens per day for a "wide" config (~500/week)
        TARGET_MAX_TOKENS_PER_DAY: 110,  // Maximum tokens per day for a "base" config (~750/week)
        TARGET_MIN_WIN_RATE: 15.0,       // Minimum win rate to consider viable
        TARGET_MIN_PNL: 5.0,             // Minimum TP PnL % to be worth optimizing
        TARGET_MIN_TP_PNL_PERCENT: 20.0, // Minimum TP PnL% threshold for quality base configs
        
        // Time-independent parameters to focus on (easily configurable)
        TIME_INDEPENDENT_PARAMS: {
            // Core stability parameters (don't change over time)
             'Min Deployer Age (min)': { 
                section: 'tokenDetails', 
                priority: 1, 
                description: 'AG Score quality threshold' 
            },
            'Min Token Age (sec)': { 
                section: 'tokenDetails', 
                priority: 2, 
                description: 'AG Score quality threshold' 
            }, 
            'Max Token Age (sec)': { 
                section: 'tokenDetails', 
                priority: 3, 
                description: 'AG Score quality threshold' 
            },
            'Min Deployer Balance (SOL)': { 
                section: 'risk', 
                priority: 4, 
                description: 'Deployer financial commitment' 
            },
            'Max Bundled %': { 
                section: 'risk', 
                priority: 5, 
                description: 'Bundle transaction risk max limit' 
            },
            'Min Bundled %': { 
                section: 'risk', 
                priority: 6, 
                description: 'Bundle transaction risk min limit' 
            },
            'Max Drained %': { 
                section: 'risk', 
                priority: 7, 
                description: 'Liquidity drainage protection' 
            },
            'Max Drained Count': { 
                section: 'risk', 
                priority: 8, 
                description: 'Drainage incident limit' 
            },
            'Description': { 
                section: 'risk', 
                priority: 9, 
                description: 'Token description requirement' 
            },
            'Fresh Deployer': { 
                section: 'risk', 
                priority: 10, 
                description: 'New deployer preference' 
            },
            'Min AG Score': { 
                section: 'tokenDetails', 
                priority: 11, 
                description: 'AG Score quality threshold' 
            },
        },
        
        // Parameters to EXCLUDE from base config (time-dependent or MCAP-related)
        EXCLUDED_PARAMS: [
            'Min MCAP (USD)', 'Max MCAP (USD)',           // MCAP varies significantly over time
            'Min Token Age (sec)', 'Max Token Age (sec)', // Age changes constantly  
            'Min Deployer Age (min)',                     // Deployer age increases over time
            'Min TTC (sec)', 'Max TTC (sec)',             // Time to complete is time-dependent
            'Min Liquidity (USD)', 'Max Liquidity (USD)', // Liquidity fluctuates
            'Max Liquidity %',                            // Liquidity percentage changes
            'Min Holders', 'Max Holders',                 // Holder count grows over time
            'Holders Growth %', 'Holders Growth Minutes', // Growth metrics are time-dependent
            'Min Dormant Wallets', 'Max Dormant Wallets' // Dormancy status changes over time
        ],
        
        // Search strategy
        SEARCH_STRATEGY: 'systematic_tightening', // 'systematic_tightening' | 'parameter_discovery' | 'grid_search'
        MAX_RUNTIME_MINUTES: 15,     // Time limit for base config building
        MAX_PARAMETER_TESTS: 200,    // Limit total parameter tests
        EARLY_STOP_THRESHOLD: 0.85,  // Stop if we find config with 85% of target tokens
        
        // Rate limiting
        INTER_TEST_DELAY: 2000,      // 2s between each test for stability
    };

    // ========================================
    // 🛠️ UTILITIES & VALIDATION
    // ========================================
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Check if required AGCopilot functions are available
    function validateDependencies() {
        const required = [
            'burstRateLimiter', 'backtesterAPI', 'getCurrentConfiguration', 
            'ensureCompleteConfig', 'calculateRobustScore', 'getScaledTokenThresholds',
            'PARAM_RULES', 'generateTestValuesFromRules'
        ];
        
        const missing = required.filter(dep => typeof window[dep] === 'undefined');
        if (missing.length > 0) {
            throw new Error(`Missing AGCopilot dependencies: ${missing.join(', ')}. Please run AGCopilot.js first and ensure it has fully loaded.`);
        }
        
        // Additional validation for required objects
        if (!window.PARAM_RULES || Object.keys(window.PARAM_RULES).length === 0) {
            throw new Error('PARAM_RULES is not properly initialized. Please ensure AGCopilot.js has fully loaded.');
        }
        
        if (!window.backtesterAPI || typeof window.backtesterAPI.fetchResults !== 'function') {
            throw new Error('backtesterAPI is not properly initialized. Please ensure AGCopilot.js has fully loaded.');
        }
        
        console.log('✅ All AGCopilot dependencies found and validated');
        return true;
    }

    // Get date range scaling info for token targets
    function getTokenTarget() {
        const scaling = window.getScaledTokenThresholds ? window.getScaledTokenThresholds() : null;
        if (scaling && scaling.scalingInfo) {
            const dailyMinTarget = BASE_CONFIG.TARGET_MIN_TOKENS_PER_DAY * scaling.scalingInfo.days;
            const dailyMaxTarget = BASE_CONFIG.TARGET_MAX_TOKENS_PER_DAY * scaling.scalingInfo.days;
            return {
                minTarget: Math.round(dailyMinTarget),
                maxTarget: Math.round(dailyMaxTarget),
                minPerDay: BASE_CONFIG.TARGET_MIN_TOKENS_PER_DAY,
                maxPerDay: BASE_CONFIG.TARGET_MAX_TOKENS_PER_DAY,
                days: scaling.scalingInfo.days,
                isScaled: true
            };
        }
        
        return {
            minTarget: BASE_CONFIG.TARGET_MIN_TOKENS_PER_DAY * 7,
            maxTarget: BASE_CONFIG.TARGET_MAX_TOKENS_PER_DAY * 7,
            minPerDay: BASE_CONFIG.TARGET_MIN_TOKENS_PER_DAY,
            maxPerDay: BASE_CONFIG.TARGET_MAX_TOKENS_PER_DAY,
            days: 7,
            isScaled: false
        };
    }

    // ========================================
    // 🔍 BASE CONFIG BUILDING STRATEGIES
    // ========================================
    
    // Strategy 1: Systematic Tightening - Start loose, gradually tighten parameters
    async function buildBaseConfigSystematic() {
        console.log('%c🎯 Starting Systematic Tightening Strategy', 'color: blue; font-weight: bold;');
        
        const tokenTarget = getTokenTarget();
        console.log(`🎯 Target Range: ${tokenTarget.minPerDay}-${tokenTarget.maxPerDay} tokens/day (${tokenTarget.minTarget}-${tokenTarget.maxTarget} total over ${tokenTarget.days} days${tokenTarget.isScaled ? ', scaled' : ''})`);
        
        // Start with current UI config as baseline
        const startConfig = await window.getCurrentConfiguration();
        let bestConfig = window.ensureCompleteConfig(startConfig);
        
        // Test baseline
        console.log('📊 Testing baseline configuration...');
        const baselineResult = await window.backtesterAPI.fetchResults(bestConfig);
        
        if (!baselineResult.success) {
            throw new Error(`Baseline test failed: ${baselineResult.error}`);
        }
        
        const baselineTokens = baselineResult.metrics.totalTokens;
        const baselineScore = calculateScore(baselineResult.metrics);
        const baselinePerDay = (baselineTokens / tokenTarget.days).toFixed(1);
        
        console.log(`✅ Baseline: ${baselinePerDay} tokens/day (${baselineTokens} total), Score: ${baselineScore.toFixed(1)}`);
        
        // Check if baseline is already in target range
        const baselineInRange = baselineTokens >= tokenTarget.minTarget && baselineTokens <= tokenTarget.maxTarget;
        const baselinePnl = baselineResult.metrics.tpPnlPercent || 0;
        
        if (baselineInRange) {
            console.log(`✅ Baseline already in target range! But continuing to find the best config...`);
            console.log(`📊 Baseline TP PnL: ${baselinePnl.toFixed(1)}% (target: ${BASE_CONFIG.TARGET_MIN_TP_PNL_PERCENT}%+)`);
        }
        
        // Determine strategy based on baseline position
        const needToTighten = baselineTokens > tokenTarget.maxTarget;
        const needToLoosen = baselineTokens < tokenTarget.minTarget;
        
        console.log(`📋 Strategy: ${needToTighten ? 'Tighten (too many tokens)' : needToLoosen ? 'Loosen (too few tokens)' : 'Already in range'}`);
        
        // Get parameters to optimize, sorted by priority
        const paramsToTest = Object.entries(BASE_CONFIG.TIME_INDEPENDENT_PARAMS)
            .sort(([,a], [,b]) => a.priority - b.priority)
            .map(([param, info]) => ({ param, ...info }));
        
        console.log(`🔧 Testing ${paramsToTest.length} time-independent parameters:`);
        paramsToTest.forEach(p => console.log(`  ${p.priority}. ${p.param} - ${p.description}`));
        
        let testCount = 0;
        let bestTokens = baselineTokens;
        let bestScore = baselineScore;
        const maxTests = BASE_CONFIG.MAX_PARAMETER_TESTS;
        
        // For each parameter, try loosening it to increase token count
        for (const paramInfo of paramsToTest) {
            if (testCount >= maxTests) {
                console.log(`⏰ Reached maximum test limit (${maxTests})`);
                break;
            }
            
            // Log if we're in the target range but continue optimizing
            const inRange = bestTokens >= tokenTarget.minTarget && bestTokens <= tokenTarget.maxTarget;
            if (inRange && testCount % 10 === 0) { // Log every 10th test when in range
                const perDay = (bestTokens / tokenTarget.days).toFixed(1);
                console.log(`📍 Currently in range: ${perDay} tokens/day (${bestTokens} total), Score: ${bestScore.toFixed(1)} - continuing to optimize...`);
            }
            
            console.log(`\n🔬 Testing parameter: ${paramInfo.param}`);
            
            // Generate test values for this parameter (using AGCopilot's existing logic)
            const testValues = window.generateTestValuesFromRules ? 
                window.generateTestValuesFromRules(paramInfo.param) : [];
            
            if (testValues.length === 0) {
                console.log(`⚠️ No test values generated for ${paramInfo.param}`);
                continue;
            }
            
            // Test each value to see if it increases token count while maintaining quality
            for (const testValue of testValues) {
                if (testCount >= maxTests) break;
                
                const testConfig = JSON.parse(JSON.stringify(bestConfig)); // Deep clone
                
                // Apply test value to appropriate section
                if (!testConfig[paramInfo.section]) {
                    testConfig[paramInfo.section] = {};
                }
                testConfig[paramInfo.section][paramInfo.param] = testValue;
                
                try {
                    testCount++;
                    console.log(`  Testing ${paramInfo.param}: ${testValue} (test ${testCount}/${maxTests})`);
                    
                    // Add inter-test delay for stability
                    if (BASE_CONFIG.INTER_TEST_DELAY > 0) {
                        await sleep(BASE_CONFIG.INTER_TEST_DELAY);
                    }
                    
                    const result = await window.backtesterAPI.fetchResults(testConfig);
                    
                    if (!result.success) {
                        console.log(`    ❌ Failed: ${result.error}`);
                        continue;
                    }
                    
                    const tokens = result.metrics.totalTokens;
                    const score = calculateScore(result.metrics);
                    const improvement = tokens - bestTokens;
                    const tokensPerDay = (tokens / tokenTarget.days).toFixed(1);
                    const improvementPerDay = (improvement / tokenTarget.days).toFixed(1);
                    
                    console.log(`    📊 Result: ${tokensPerDay} tokens/day (Δ${improvement > 0 ? '+' : ''}${improvementPerDay}/day), Score: ${score.toFixed(1)}`);
                    
                    // Calculate distances and ranges
                    const currentInRange = bestTokens >= tokenTarget.minTarget && bestTokens <= tokenTarget.maxTarget;
                    const newInRange = tokens >= tokenTarget.minTarget && tokens <= tokenTarget.maxTarget;
                    
                    const currentDistance = currentInRange ? 0 : Math.min(
                        bestTokens < tokenTarget.minTarget ? tokenTarget.minTarget - bestTokens : Infinity,
                        bestTokens > tokenTarget.maxTarget ? bestTokens - tokenTarget.maxTarget : Infinity
                    );
                    
                    const newDistance = newInRange ? 0 : Math.min(
                        tokens < tokenTarget.minTarget ? tokenTarget.minTarget - tokens : Infinity,
                        tokens > tokenTarget.maxTarget ? tokens - tokenTarget.maxTarget : Infinity
                    );
                    
                    // Check TP PnL quality
                    const currentPnl = result.metrics.tpPnlPercent || 0;
                    const meetsPnlThreshold = currentPnl >= BASE_CONFIG.TARGET_MIN_TP_PNL_PERCENT;
                    
                    let shouldAccept = false;
                    let reason = '';
                    
                    // Priority 1: Both in range - pick the one with better score and meets PnL threshold
                    if (currentInRange && newInRange) {
                        if (meetsPnlThreshold && score > bestScore) {
                            shouldAccept = true;
                            reason = 'better score in range';
                        }
                    }
                    // Priority 2: New config gets into range (from outside)
                    else if (!currentInRange && newInRange) {
                        if (meetsPnlThreshold) {
                            shouldAccept = true;
                            reason = 'entered target range';
                        }
                    }
                    // Priority 3: Both outside range - get closer with decent score
                    else if (!currentInRange && !newInRange) {
                        const getsCloser = newDistance < currentDistance;
                        const scoreDrop = bestScore > 0 ? (bestScore - score) / bestScore : 0;
                        if (getsCloser && scoreDrop < 0.15 && meetsPnlThreshold) {
                            shouldAccept = true;
                            reason = 'closer to range';
                        }
                    }
                    
                    if (shouldAccept) {
                        bestConfig = testConfig;
                        bestTokens = tokens;
                        bestScore = score;
                        console.log(`    ✅ New best! ${tokensPerDay} tokens/day (${reason}), Score: ${score.toFixed(1)}, PnL: ${currentPnl.toFixed(1)}%`);
                    } else if (!meetsPnlThreshold) {
                        console.log(`    ⚠️  Rejected: PnL ${currentPnl.toFixed(1)}% < ${BASE_CONFIG.TARGET_MIN_TP_PNL_PERCENT}% threshold`);
                    }
                    
                } catch (error) {
                    console.log(`    ❌ Error: ${error.message}`);
                }
            }
        }
        
        const finalPerDay = (bestTokens / tokenTarget.days).toFixed(1);
        console.log(`\n🏁 Base Config Building Complete!`);
        console.log(`📊 Final: ${finalPerDay} tokens/day (${bestTokens} total, target: ${tokenTarget.minPerDay}-${tokenTarget.maxPerDay}/day), Score: ${bestScore.toFixed(1)}`);
        console.log(`🧪 Total tests: ${testCount}`);
        
        const finalResult = await window.backtesterAPI.fetchResults(bestConfig);
        const inTargetRange = bestTokens >= tokenTarget.minTarget && bestTokens <= tokenTarget.maxTarget;
        
        return {
            config: bestConfig,
            metrics: finalResult.metrics,
            tests: testCount,
            strategy: 'systematic_adjustment',
            targetMet: inTargetRange,
            tokenRange: `${tokenTarget.minTarget}-${tokenTarget.maxTarget}`,
            actualTokens: bestTokens
        };
    }
    
    // Calculate score using AGCopilot's robust scoring if available
    function calculateScore(metrics) {
        if (typeof window.calculateRobustScore === 'function') {
            const robust = window.calculateRobustScore(metrics);
            return robust && !robust.rejected ? robust.score : metrics.tpPnlPercent;
        }
        
        // Fallback scoring
        return metrics.tpPnlPercent || 0;
    }

    // ========================================
    // 🎨 UI FUNCTIONS
    // ========================================
    function createBaseConfigUI() {
        // Remove existing UI
        const existingUI = document.getElementById('base-config-builder-ui');
        if (existingUI) {
            existingUI.remove();
        }

        // Check if we're being loaded in the AGCopilot tab
        const tabContainer = document.getElementById('base-config-tab');
        const isInTab = !!tabContainer;

        const ui = document.createElement('div');
        ui.id = 'base-config-builder-ui';
        
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

        const tokenTarget = getTokenTarget();

        ui.innerHTML = `
            <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 11px;">
                <strong>🎯 Goal:</strong> Find time-independent parameters that give ${tokenTarget.minTarget}-${tokenTarget.maxTarget} tokens (${tokenTarget.days} days)
                <br><strong>� Quality:</strong> TP PnL ≥ ${BASE_CONFIG.TARGET_MIN_TP_PNL_PERCENT}% for viable base configs
                <br><strong>�📋 Strategy:</strong> Test stable parameters like AG Score, KYC Wallets, Bundled %, etc.
            </div>
            
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 12px; color: #63b3ed;">
                    🎯 Tokens Per Day Range:
                </label>
                <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; align-items: center;">
                    <input type="number" id="min-target-tokens" value="${tokenTarget.minPerDay}" min="10" max="200" step="5"
                           style="width: 100%; padding: 6px; background: #2d3748; border: 1px solid #4a5568; border-radius: 4px; color: #e2e8f0; font-size: 11px; text-align: center;">
                    <span style="color: #a0aec0; font-size: 12px; padding: 0 4px;">-</span>
                    <input type="number" id="max-target-tokens" value="${tokenTarget.maxPerDay}" min="20" max="300" step="5"
                           style="width: 100%; padding: 6px; background: #2d3748; border: 1px solid #4a5568; border-radius: 4px; color: #e2e8f0; font-size: 11px; text-align: center;">
                </div>
                <div style="font-size: 9px; color: #a0aec0; margin-top: 2px;">Target tokens per day (will scale to ${tokenTarget.days} days = ${tokenTarget.minTarget}-${tokenTarget.maxTarget} total)</div>
            </div>
            
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 12px; color: #63b3ed;">
                    ⚡ Strategy:
                </label>
                <select id="strategy-select" style="width: 100%; padding: 8px; background: #2d3748; border: 1px solid #4a5568; border-radius: 6px; color: #e2e8f0; font-size: 12px;">
                    <option value="systematic_tightening">Systematic Tightening (Recommended)</option>
                    <option value="parameter_discovery" disabled>Parameter Discovery (Future)</option>
                    <option value="grid_search" disabled>Grid Search (Future)</option>
                </select>
            </div>
            
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 12px; color: #63b3ed;">
                    💹 Min TP PnL % Threshold:
                </label>
                <input type="number" id="min-tp-pnl" value="${BASE_CONFIG.TARGET_MIN_TP_PNL_PERCENT}" min="5" max="50" step="5"
                       style="width: 100%; padding: 8px; background: #2d3748; border: 1px solid #4a5568; border-radius: 6px; color: #e2e8f0; font-size: 12px; text-align: center;">
                <div style="font-size: 9px; color: #a0aec0; margin-top: 2px;">Minimum TP PnL% for quality base configs</div>
            </div>
            
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 12px; color: #63b3ed;">
                    ⏱️ Time Limit (min):
                </label>
                <input type="number" id="time-limit" value="${BASE_CONFIG.MAX_RUNTIME_MINUTES}" min="5" max="60" step="5"
                       style="width: 100%; padding: 8px; background: #2d3748; border: 1px solid #4a5568; border-radius: 6px; color: #e2e8f0; font-size: 12px; text-align: center;">
            </div>
            
            <button id="start-base-config-btn" style="
                width: 100%; 
                padding: 12px; 
                background: linear-gradient(45deg, #8b5cf6, #7c3aed); 
                border: none; 
                border-radius: 8px; 
                color: white; 
                font-weight: 700; 
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s ease;
                box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(139, 92, 246, 0.4)'" 
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(139, 92, 246, 0.3)'">
                🚀 Build Base Config
            </button>
            
            <div id="base-config-status" style="
                background: #2d3748; 
                border: 1px solid #4a5568;
                border-radius: 8px; 
                padding: 12px; 
                font-size: 11px; 
                height: 200px;
                overflow-y: auto;
                color: #e2e8f0;
                margin-top: 16px;
                display: none;
            ">
                <div style="color: #a0aec0;">Ready to build base configuration...</div>
            </div>
            
            <div id="base-config-results" style="display: none; margin-top: 16px;">
                <div style="background: rgba(72, 187, 120, 0.1); border: 1px solid rgba(72, 187, 120, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                    <div id="results-summary" style="font-size: 12px; font-weight: 600; color: #48bb78; margin-bottom: 8px;"></div>
                    <div id="results-metrics" style="font-size: 10px; color: #e2e8f0;"></div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <button id="apply-base-config-btn" style="
                        padding: 8px; 
                        background: rgba(59, 130, 246, 0.2); 
                        border: 1px solid rgba(59, 130, 246, 0.4);
                        border-radius: 6px; 
                        color: #63b3ed; 
                        font-size: 11px; 
                        cursor: pointer;
                        font-weight: 600;
                    ">⚙️ Apply Config</button>
                    
                    <button id="copy-base-config-btn" style="
                        padding: 8px; 
                        background: rgba(139, 92, 246, 0.2); 
                        border: 1px solid rgba(139, 92, 246, 0.4);
                        border-radius: 6px; 
                        color: #a78bfa; 
                        font-size: 11px; 
                        cursor: pointer;
                        font-weight: 600;
                    ">📋 Copy Config</button>
                </div>
            </div>
        `;

        // Smart rendering: tab integration or standalone
        if (isInTab) {
            // Clear the tab and render Base Config Builder full-size
            tabContainer.innerHTML = '';
            tabContainer.appendChild(ui);
            console.log('🏗️ Base Config Builder rendered full-size in AGCopilot tab');
        } else {
            // Fallback to body if no tab container (standalone mode)
            document.body.appendChild(ui);
            console.log('🏗️ Base Config Builder rendered as standalone window');
        }
        
        return ui;
    }

    function updateBaseConfigStatus(message, isError = false) {
        const statusArea = document.getElementById('base-config-status');
        if (statusArea) {
            statusArea.style.display = 'block';
            
            const timestamp = new Date().toLocaleTimeString();
            const icon = isError ? '❌' : '📝';
            const color = isError ? '#ff6b6b' : '#e2e8f0';
            
            statusArea.innerHTML += `<div style="color: ${color}; margin: 2px 0; font-size: 10px;">
                <span style="color: #a0aec0;">${timestamp}</span> ${icon} ${message}
            </div>`;
            statusArea.scrollTop = statusArea.scrollHeight;
        }
    }

    // ========================================
    // 🚀 MAIN EXECUTION
    // ========================================
    
    async function startBaseConfigBuilding() {
        try {
            // Validate dependencies
            validateDependencies();
            
            // Get UI settings (now per-day values)
            const minTargetTokensPerDay = parseInt(document.getElementById('min-target-tokens').value) || BASE_CONFIG.TARGET_MIN_TOKENS_PER_DAY;
            const maxTargetTokensPerDay = parseInt(document.getElementById('max-target-tokens').value) || BASE_CONFIG.TARGET_MAX_TOKENS_PER_DAY;
            const minTpPnl = parseFloat(document.getElementById('min-tp-pnl').value) || BASE_CONFIG.TARGET_MIN_TP_PNL_PERCENT;
            const timeLimit = parseInt(document.getElementById('time-limit').value) || BASE_CONFIG.MAX_RUNTIME_MINUTES;
            
            // Validate inputs
            if (maxTargetTokensPerDay <= minTargetTokensPerDay) {
                throw new Error('Maximum target tokens per day must be greater than minimum');
            }
            if (minTpPnl < 0 || minTpPnl > 100) {
                throw new Error('TP PnL threshold must be between 0% and 100%');
            }
            
            // Update config
            BASE_CONFIG.TARGET_MIN_TOKENS_PER_DAY = minTargetTokensPerDay;
            BASE_CONFIG.TARGET_MAX_TOKENS_PER_DAY = maxTargetTokensPerDay;
            BASE_CONFIG.TARGET_MIN_TP_PNL_PERCENT = minTpPnl;
            BASE_CONFIG.MAX_RUNTIME_MINUTES = timeLimit;
            
            updateBaseConfigStatus('🏗️ Starting base config building...');
            updateBaseConfigStatus(`🎯 Target: ${minTargetTokensPerDay}-${maxTargetTokensPerDay} tokens/day, Time limit: ${timeLimit} minutes`);
            
            // Hide results from previous runs
            document.getElementById('base-config-results').style.display = 'none';
            
            const startTime = Date.now();
            const result = await buildBaseConfigSystematic();
            const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
            
            const tokenTarget = getTokenTarget();
            const resultPerDay = (result.metrics.totalTokens / tokenTarget.days).toFixed(1);
            
            updateBaseConfigStatus(`✅ Base config building complete in ${duration} minutes!`);
            updateBaseConfigStatus(`📊 Result: ${resultPerDay} tokens/day (${result.metrics.totalTokens} total), Score: ${calculateScore(result.metrics).toFixed(1)}`);
            updateBaseConfigStatus(`🧪 Total tests performed: ${result.tests}`);
            
            // Store result for UI buttons
            window.latestBaseConfig = result;
            
            // Show results
            const resultsDiv = document.getElementById('base-config-results');
            const summaryDiv = document.getElementById('results-summary');
            const metricsDiv = document.getElementById('results-metrics');
            
            const targetMet = result.targetMet ? '🎯 Target Range Met!' : '⚠️ Target Range Not Met';
            summaryDiv.textContent = `${targetMet} Base Config Ready`;
            
            const actualPnl = result.metrics.tpPnlPercent || 0;
            const pnlStatus = actualPnl >= minTpPnl ? '✅' : '❌';
            const tokensPerDay = (result.metrics.totalTokens / tokenTarget.days).toFixed(1);
            const inRange = tokensPerDay >= minTargetTokensPerDay && tokensPerDay <= maxTargetTokensPerDay;
            const rangeIcon = inRange ? '🎯' : '⚠️';
            
            metricsDiv.innerHTML = `
                <strong>Tokens/Day:</strong> ${rangeIcon} ${tokensPerDay} (target: ${minTargetTokensPerDay}-${maxTargetTokensPerDay})
                <br><strong>Total:</strong> ${result.metrics.totalTokens} over ${tokenTarget.days} days
                <br><strong>TP PnL:</strong> ${actualPnl.toFixed(1)}% ${pnlStatus} (threshold: ${minTpPnl}%)
                <br><strong>Win Rate:</strong> ${result.metrics.winRate?.toFixed(1) || 'N/A'}%
                <br><strong>Tests:</strong> ${result.tests}, <strong>Duration:</strong> ${duration}m
            `;
            
            resultsDiv.style.display = 'block';
            
        } catch (error) {
            updateBaseConfigStatus(`❌ Error: ${error.message}`, true);
            console.error('Base Config Builder Error:', error);
        }
    }

    // ========================================
    // 🎮 EVENT HANDLERS & INITIALIZATION
    // ========================================
    
    function setupBaseConfigEventHandlers() {
        // Start building button
        document.getElementById('start-base-config-btn').addEventListener('click', startBaseConfigBuilding);
        
        // Apply config button
        document.getElementById('apply-base-config-btn').addEventListener('click', () => {
            if (window.latestBaseConfig && typeof window.applyConfigToUI === 'function') {
                window.applyConfigToUI(window.latestBaseConfig.config);
                updateBaseConfigStatus('✅ Base config applied to backtester UI');
            } else {
                updateBaseConfigStatus('❌ No base config available to apply', true);
            }
        });
        
        // Copy config button
        document.getElementById('copy-base-config-btn').addEventListener('click', async () => {
            if (window.latestBaseConfig) {
                const configText = JSON.stringify(window.latestBaseConfig.config, null, 2);
                try {
                    await navigator.clipboard.writeText(configText);
                    updateBaseConfigStatus('📋 Base config copied to clipboard');
                } catch (error) {
                    updateBaseConfigStatus('❌ Failed to copy to clipboard', true);
                }
            } else {
                updateBaseConfigStatus('❌ No base config available to copy', true);
            }
        });
    }

    // Initialize Base Config Builder with retry mechanism
    console.log('🔧 Initializing Base Config Builder...');
    
    async function initializeWithRetry(maxRetries = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                validateDependencies();
                const ui = createBaseConfigUI();
                setupBaseConfigEventHandlers();
                
                console.log('✅ Base Config Builder initialized successfully!');
                console.log('🎯 Purpose: Build stable, time-independent base configurations');
                console.log('📋 Focus: AG Score, KYC Wallets, Bundled %, Deployer Balance, etc.');
                console.log('🏗️ Goal: Find configs with 70-110 tokens/day for optimization starting points');
                return;
                
            } catch (error) {
                if (attempt < maxRetries) {
                    console.log(`⏳ Attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`);
                    await sleep(delay);
                    delay *= 1.5; // Exponential backoff
                } else {
                    console.error('❌ Base Config Builder initialization failed after all retries:', error);
                    alert(`Base Config Builder Error: ${error.message}\n\nPlease ensure AGCopilot.js is loaded first and has fully initialized.`);
                }
            }
        }
    }
    
    // Start initialization with retry mechanism
    initializeWithRetry();
    
})();