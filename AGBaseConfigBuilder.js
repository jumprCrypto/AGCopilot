(async function () {
    console.clear();
    console.log('%c🏗️ AG Base Config Builder v1.0 🏗️', 'color: purple; font-size: 16px; font-weight: bold;');
    console.log('%c🎯 Build wide, stable base configurations for optimization starting points', 'color: green; font-size: 12px;');

    // ========================================
    // 🎯 BASE CONFIG BUILDER CONFIGURATION
    // ========================================
    const BASE_CONFIG = {
        // Target metrics for base config
        TARGET_MIN_TOKENS_WEEKLY: 500,  // Minimum tokens per week for a "wide" config
        TARGET_MAX_TOKENS_WEEKLY: 750,  // Maximum tokens per week for a "base" config (not too loose)
        TARGET_MIN_WIN_RATE: 15.0,      // Minimum win rate to consider viable
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
        
        // Rate limiting - more conservative for base config building
        USE_SLOWER_RATE_LIMIT: true, // Use slower rate limiting by default
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
            const weeklyMinTarget = BASE_CONFIG.TARGET_MIN_TOKENS_WEEKLY * (scaling.scalingInfo.days / 7);
            const weeklyMaxTarget = BASE_CONFIG.TARGET_MAX_TOKENS_WEEKLY * (scaling.scalingInfo.days / 7);
            return {
                minTarget: Math.round(weeklyMinTarget),
                maxTarget: Math.round(weeklyMaxTarget),
                days: scaling.scalingInfo.days,
                isScaled: true
            };
        }
        
        return {
            minTarget: BASE_CONFIG.TARGET_MIN_TOKENS_WEEKLY,
            maxTarget: BASE_CONFIG.TARGET_MAX_TOKENS_WEEKLY,
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
        console.log(`🎯 Target Range: ${tokenTarget.minTarget}-${tokenTarget.maxTarget} tokens (${tokenTarget.days} days${tokenTarget.isScaled ? ', scaled' : ''})`);
        
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
        
        console.log(`✅ Baseline: ${baselineTokens} tokens, Score: ${baselineScore.toFixed(1)}`);
        
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
                console.log(`📍 Currently in range: ${bestTokens} tokens, Score: ${bestScore.toFixed(1)} - continuing to optimize...`);
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
                    
                    console.log(`    📊 Result: ${tokens} tokens (Δ${improvement > 0 ? '+' : ''}${improvement}), Score: ${score.toFixed(1)}`);
                    
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
                        console.log(`    ✅ New best! ${tokens} tokens (${reason}), Score: ${score.toFixed(1)}, PnL: ${currentPnl.toFixed(1)}%`);
                    } else if (!meetsPnlThreshold) {
                        console.log(`    ⚠️  Rejected: PnL ${currentPnl.toFixed(1)}% < ${BASE_CONFIG.TARGET_MIN_TP_PNL_PERCENT}% threshold`);
                    }
                    
                } catch (error) {
                    console.log(`    ❌ Error: ${error.message}`);
                }
            }
        }
        
        console.log(`\n🏁 Base Config Building Complete!`);
        console.log(`📊 Final: ${bestTokens} tokens (range: ${tokenTarget.minTarget}-${tokenTarget.maxTarget}), Score: ${bestScore.toFixed(1)}`);
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

        // Check if AGCopilot UI exists to position alongside it
        const agcopilotUI = document.getElementById('agcopilot-ui');
        const leftOffset = agcopilotUI ? '420px' : '20px'; // Position next to AGCopilot if present

        const ui = document.createElement('div');
        ui.id = 'base-config-builder-ui';
        ui.style.cssText = `
            position: fixed;
            top: 20px;
            left: ${leftOffset};
            width: 380px;
            max-height: 90vh;
            background: #1e2a3a;
            border: 2px solid #4a5568;
            border-radius: 12px;
            padding: 16px;
            z-index: 10001;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            color: #e2e8f0;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
            overflow-y: auto;
        `;

        const tokenTarget = getTokenTarget();

        ui.innerHTML = `
            <div style="text-align: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #4a5568;">
                <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #f7fafc; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    🏗️ Base Config Builder
                </h3>
                <div style="font-size: 10px; color: #a0aec0; margin-top: 4px;">Build stable foundation configs for optimization</div>
            </div>
            
            <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 11px;">
                <strong>🎯 Goal:</strong> Find time-independent parameters that give ${tokenTarget.minTarget}-${tokenTarget.maxTarget} tokens (${tokenTarget.days} days)
                <br><strong>� Quality:</strong> TP PnL ≥ ${BASE_CONFIG.TARGET_MIN_TP_PNL_PERCENT}% for viable base configs
                <br><strong>�📋 Strategy:</strong> Test stable parameters like AG Score, KYC Wallets, Bundled %, etc.
            </div>
            
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 12px; color: #63b3ed;">
                    🎯 Token Range:
                </label>
                <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; align-items: center;">
                    <input type="number" id="min-target-tokens" value="${tokenTarget.minTarget}" min="100" max="1000" step="50"
                           style="width: 100%; padding: 6px; background: #2d3748; border: 1px solid #4a5568; border-radius: 4px; color: #e2e8f0; font-size: 11px; text-align: center;">
                    <span style="color: #a0aec0; font-size: 12px; padding: 0 4px;">-</span>
                    <input type="number" id="max-target-tokens" value="${tokenTarget.maxTarget}" min="200" max="2000" step="50"
                           style="width: 100%; padding: 6px; background: #2d3748; border: 1px solid #4a5568; border-radius: 4px; color: #e2e8f0; font-size: 11px; text-align: center;">
                </div>
                <div style="font-size: 9px; color: #a0aec0; margin-top: 2px;">Target token range for balanced base config</div>
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
            
            <div style="margin-bottom: 16px;">
                <label style="display: flex; align-items: center; cursor: pointer; font-size: 12px;">
                    <input type="checkbox" id="use-slower-limits" ${BASE_CONFIG.USE_SLOWER_RATE_LIMIT ? 'checked' : ''} 
                           style="margin-right: 8px; accent-color: #8b5cf6;">
                    <span style="color: #e2e8f0;">Use Slower Rate Limiting (Recommended)</span>
                </label>
                <div style="font-size: 9px; color: #a0aec0; margin-left: 20px;">More conservative API usage</div>
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
            
            <div style="margin-top: 16px; padding-top: 12px; border-top: 2px solid #4a5568; text-align: center;">
                <button id="close-base-builder-btn" style="
                    padding: 6px 16px; 
                    background: rgba(237, 100, 166, 0.2); 
                    border: 1px solid rgba(237, 100, 166, 0.4);
                    border-radius: 16px; 
                    color: #ed64a6; 
                    font-size: 10px; 
                    cursor: pointer;
                    font-weight: 600;
                ">✕ Close</button>
            </div>
        `;

        document.body.appendChild(ui);
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
            
            // Get UI settings
            const minTargetTokens = parseInt(document.getElementById('min-target-tokens').value) || BASE_CONFIG.TARGET_MIN_TOKENS_WEEKLY;
            const maxTargetTokens = parseInt(document.getElementById('max-target-tokens').value) || BASE_CONFIG.TARGET_MAX_TOKENS_WEEKLY;
            const minTpPnl = parseFloat(document.getElementById('min-tp-pnl').value) || BASE_CONFIG.TARGET_MIN_TP_PNL_PERCENT;
            const timeLimit = parseInt(document.getElementById('time-limit').value) || BASE_CONFIG.MAX_RUNTIME_MINUTES;
            const useSlowerLimits = document.getElementById('use-slower-limits').checked;
            
            // Validate inputs
            if (maxTargetTokens <= minTargetTokens) {
                throw new Error('Maximum target tokens must be greater than minimum target tokens');
            }
            if (minTpPnl < 0 || minTpPnl > 100) {
                throw new Error('TP PnL threshold must be between 0% and 100%');
            }
            
            // Update config
            BASE_CONFIG.TARGET_MIN_TOKENS_WEEKLY = minTargetTokens;
            BASE_CONFIG.TARGET_MAX_TOKENS_WEEKLY = maxTargetTokens;
            BASE_CONFIG.TARGET_MIN_TP_PNL_PERCENT = minTpPnl;
            BASE_CONFIG.MAX_RUNTIME_MINUTES = timeLimit;
            
            // Switch to slower rate limiting if requested
            if (useSlowerLimits && typeof window.toggleRateLimitingMode === 'function') {
                const currentMode = window.CONFIG ? window.CONFIG.RATE_LIMIT_MODE : 'normal';
                if (currentMode === 'normal') {
                    window.toggleRateLimitingMode();
                    updateBaseConfigStatus('🔄 Switched to slower rate limiting for stability');
                }
            }
            
            updateBaseConfigStatus('🏗️ Starting base config building...');
            updateBaseConfigStatus(`🎯 Target: ${minTargetTokens} tokens, Time limit: ${timeLimit} minutes`);
            
            // Hide results from previous runs
            document.getElementById('base-config-results').style.display = 'none';
            
            const startTime = Date.now();
            const result = await buildBaseConfigSystematic();
            const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
            
            updateBaseConfigStatus(`✅ Base config building complete in ${duration} minutes!`);
            updateBaseConfigStatus(`📊 Result: ${result.metrics.totalTokens} tokens, Score: ${calculateScore(result.metrics).toFixed(1)}`);
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
            
            metricsDiv.innerHTML = `
                <strong>Tokens:</strong> ${result.metrics.totalTokens} (range: ${minTargetTokens}-${maxTargetTokens})
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
        
        // Close button
        document.getElementById('close-base-builder-btn').addEventListener('click', () => {
            document.getElementById('base-config-builder-ui').remove();
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
                console.log('🏗️ Goal: Find configs with 500+ tokens/week for optimization starting points');
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