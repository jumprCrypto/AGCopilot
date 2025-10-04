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
        TARGET_MIN_TP_PNL_PERCENT: 20.0, // Minimum TP PnL% threshold for quality base configs
        
        // Time-independent parameters to focus on (easily configurable)
        TIME_INDEPENDENT_PARAMS: {
            // Core stability parameters (don't change over time)
            'Min Deployer Age (min)': { 
                section: 'tokenDetails', 
                priority: 1, 
                description: 'Minimum deployer account age' 
            },
            'Min Token Age (sec)': { 
                section: 'tokenDetails', 
                priority: 2, 
                description: 'Minimum token age threshold' 
            }, 
            'Max Token Age (sec)': { 
                section: 'tokenDetails', 
                priority: 3, 
                description: 'Maximum token age threshold' 
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
        // NOTE: These are excluded because they vary with market conditions and time
        EXCLUDED_PARAMS: [
            'Min MCAP (USD)', 'Max MCAP (USD)',           // MCAP varies significantly over time
            'Min TTC (sec)', 'Max TTC (sec)',             // Time to complete is time-dependent
            'Min Liquidity (USD)', 'Max Liquidity (USD)', // Liquidity fluctuates
            'Max Liquidity %',                            // Liquidity percentage changes
            'Min Holders', 'Max Holders',                 // Holder count grows over time
            'Holders Growth %', 'Holders Growth Minutes', // Growth metrics are time-dependent
            'Min Dormant Wallets', 'Max Dormant Wallets', // Dormancy status changes over time
        ],
        
        // Search strategy
        SEARCH_STRATEGY: 'systematic_tightening', // 'systematic_tightening' | 'parameter_discovery' | 'grid_search'
        MAX_RUNTIME_MINUTES: 15,     // Time limit for base config building
        MAX_PARAMETER_TESTS: 500,    // Limit total parameter tests (increased from 200)
        EARLY_STOP_THRESHOLD: 0.85,  // Stop if we find config with 85% of target tokens
        
        // Testing thoroughness
        VALUES_PER_PARAMETER: 15,    // Number of test values per parameter (increased from 8)
        ENABLE_MULTI_PASS: true,     // Run multiple passes to refine results
        NUM_PASSES: 3,               // Number of refinement passes
        NUM_TOP_PARAMS_REFINE: 5,    // Number of top parameters to refine in multi-pass
        REFINEMENT_STEP_RANGE: 3,    // Test ±N steps around current best value
        ENABLE_COMBINATIONS: true,   // Test promising parameter combinations
        COMBINATION_PAIRS: 5,        // Number of parameter pairs to test together
        COMBINATION_VALUES: 3,       // Number of values per parameter in combinations
        
        // Acceptance thresholds
        MAX_SCORE_DROP_PERCENT: 0.15, // Maximum acceptable score drop (15%) when getting closer to range
        
        // Rate limiting
        INTER_TEST_DELAY: 1500,      // 1.5s between each test for stability (reduced for more tests)
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
    
    // Generate more thorough test values (override AGCopilot's conservative approach)
    function generateThoroughTestValues(paramName) {
        const rule = window.PARAM_RULES[paramName];
        if (!rule) {
            console.warn(`⚠️ No rule found for parameter: ${paramName}`);
            return [];
        }
        
        const { min, max, step, type } = rule;
        const testValues = [];
        const maxValues = BASE_CONFIG.VALUES_PER_PARAMETER;
        
        // Always include boundaries
        testValues.push(min);
        if (max !== min) {
            testValues.push(max);
        }
        
        const range = max - min;
        const numSteps = Math.floor(range / step);
        
        if (numSteps <= maxValues) {
            // Small range - test ALL possible values
            for (let value = min + step; value < max; value += step) {
                testValues.push(type === 'integer' ? Math.round(value) : value);
            }
        } else {
            // Large range - use strategic high-density sampling
            const points = [];
            for (let i = 1; i < maxValues - 1; i++) {
                points.push(min + (range * i / (maxValues - 1)));
            }
            
            // Round to nearest step
            points.forEach(val => {
                const rounded = Math.round((val - min) / step) * step + min;
                testValues.push(type === 'integer' ? Math.round(rounded) : rounded);
            });
        }
        
        // Remove duplicates and sort
        let uniqueValues = [...new Set(testValues)].sort((a, b) => a - b);
        
        // Special handling for AG Score
        if (paramName === 'Min AG Score') {
            uniqueValues = uniqueValues.map(v => String(v));
        }
        
        console.log(`📊 Generated ${uniqueValues.length} thorough test values for ${paramName}: [${uniqueValues.join(', ')}]`);
        return uniqueValues;
    }
    
    // Strategy 1: Systematic Tightening - Start loose, gradually tighten parameters
    async function buildBaseConfigSystematic() {
        console.log('%c🎯 Starting Systematic Tightening Strategy (Thorough Mode)', 'color: blue; font-weight: bold;');
        console.log(`🔧 Testing ${BASE_CONFIG.VALUES_PER_PARAMETER} values per parameter, ${BASE_CONFIG.NUM_PASSES} passes, combinations: ${BASE_CONFIG.ENABLE_COMBINATIONS}`);
        
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
        
        // Get selected parameters from UI checkboxes
        const selectedParams = new Set();
        document.querySelectorAll('.param-checkbox:checked').forEach(checkbox => {
            selectedParams.add(checkbox.dataset.param);
        });
        
        // Get parameters to optimize, filtered by selection and sorted by priority
        const paramsToTest = Object.entries(BASE_CONFIG.TIME_INDEPENDENT_PARAMS)
            .filter(([param]) => selectedParams.has(param))
            .sort(([,a], [,b]) => a.priority - b.priority)
            .map(([param, info]) => ({ param, ...info }));
        
        if (paramsToTest.length === 0) {
            throw new Error('No parameters selected! Please select at least one parameter to test.');
        }
        
        console.log(`🔧 Testing ${paramsToTest.length} selected time-independent parameters:`);
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
            
            // Generate thorough test values (more comprehensive than default)
            const testValues = generateThoroughTestValues(paramInfo.param);
            
            if (testValues.length === 0) {
                console.log(`⚠️ No test values generated for ${paramInfo.param}`);
                continue;
            }
            
            console.log(`  📋 Testing ${testValues.length} values for ${paramInfo.param}`);
            
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
                        if (getsCloser && scoreDrop < BASE_CONFIG.MAX_SCORE_DROP_PERCENT && meetsPnlThreshold) {
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
        
        const pass1PerDay = (bestTokens / tokenTarget.days).toFixed(1);
        console.log(`\n🏁 Pass 1 Complete!`);
        console.log(`📊 Result: ${pass1PerDay} tokens/day (${bestTokens} total), Score: ${bestScore.toFixed(1)}`);
        console.log(`🧪 Tests so far: ${testCount}`);
        
        // Multi-pass refinement: Re-test parameters with finer granularity around best values
        if (BASE_CONFIG.ENABLE_MULTI_PASS && BASE_CONFIG.NUM_PASSES > 1) {
            for (let pass = 2; pass <= BASE_CONFIG.NUM_PASSES && testCount < maxTests; pass++) {
                console.log(`\n%c🔄 Starting Refinement Pass ${pass}/${BASE_CONFIG.NUM_PASSES}`, 'color: orange; font-weight: bold;');
                
                const passStartTokens = bestTokens;
                
                // Re-test top parameters with current best as baseline
                for (const paramInfo of paramsToTest.slice(0, BASE_CONFIG.NUM_TOP_PARAMS_REFINE)) {
                    if (testCount >= maxTests) break;
                    
                    const currentValue = bestConfig[paramInfo.section]?.[paramInfo.param];
                    if (currentValue === undefined || currentValue === null) {
                        console.log(`⚠️ Skipping ${paramInfo.param} - no current value`);
                        continue;
                    }
                    
                    console.log(`\n🔬 Refining ${paramInfo.param} (current: ${currentValue})`);
                    
                    // Generate values around current best
                    const rule = window.PARAM_RULES[paramInfo.param];
                    if (!rule) continue;
                    
                    const refinedValues = [];
                    const currentNum = paramInfo.param === 'Min AG Score' ? parseInt(currentValue) : currentValue;
                    const step = rule.step;
                    const range = BASE_CONFIG.REFINEMENT_STEP_RANGE;
                    
                    // Test values around current best
                    for (let i = -range; i <= range; i++) {
                        const testVal = currentNum + (i * step);
                        if (testVal >= rule.min && testVal <= rule.max) {
                            refinedValues.push(testVal);
                        }
                    }
                    
                    for (const testValue of refinedValues) {
                        if (testCount >= maxTests) break;
                        
                        const testConfig = JSON.parse(JSON.stringify(bestConfig));
                        testConfig[paramInfo.section][paramInfo.param] = 
                            paramInfo.param === 'Min AG Score' ? String(testValue) : testValue;
                        
                        try {
                            testCount++;
                            console.log(`  Refining ${paramInfo.param}: ${testValue} (test ${testCount}/${maxTests})`);
                            
                            if (BASE_CONFIG.INTER_TEST_DELAY > 0) {
                                await sleep(BASE_CONFIG.INTER_TEST_DELAY);
                            }
                            
                            const result = await window.backtesterAPI.fetchResults(testConfig);
                            if (!result.success) continue;
                            
                            const tokens = result.metrics.totalTokens;
                            const score = calculateScore(result.metrics);
                            const pnl = result.metrics.tpPnlPercent || 0;
                            
                            if (pnl >= BASE_CONFIG.TARGET_MIN_TP_PNL_PERCENT && score > bestScore) {
                                bestConfig = testConfig;
                                bestTokens = tokens;
                                bestScore = score;
                                const perDay = (tokens / tokenTarget.days).toFixed(1);
                                console.log(`    ✅ Refinement improved! ${perDay} tokens/day, Score: ${score.toFixed(1)}`);
                            }
                        } catch (error) {
                            console.log(`    ❌ Error: ${error.message}`);
                        }
                    }
                }
                
                const passImprovement = bestTokens - passStartTokens;
                console.log(`📊 Pass ${pass} complete: ${passImprovement > 0 ? '+' : ''}${(passImprovement / tokenTarget.days).toFixed(1)} tokens/day improvement`);
            }
        }
        
        // Parameter combination testing: Try pairs of parameters together
        if (BASE_CONFIG.ENABLE_COMBINATIONS && testCount < maxTests) {
            console.log(`\n%c🔗 Testing Parameter Combinations`, 'color: cyan; font-weight: bold;');
            
            const topParams = paramsToTest.slice(0, Math.min(6, paramsToTest.length));
            const combosToTest = Math.min(BASE_CONFIG.COMBINATION_PAIRS, topParams.length - 1);
            
            for (let i = 0; i < combosToTest && testCount < maxTests; i++) {
                const param1 = topParams[i];
                const param2 = topParams[i + 1];
                
                console.log(`\n🔗 Testing combo: ${param1.param} + ${param2.param}`);
                
                // Test a few strategic combinations
                const numComboValues = BASE_CONFIG.COMBINATION_VALUES;
                const values1 = generateThoroughTestValues(param1.param).slice(0, numComboValues);
                const values2 = generateThoroughTestValues(param2.param).slice(0, numComboValues);
                
                for (const val1 of values1) {
                    for (const val2 of values2) {
                        if (testCount >= maxTests) break;
                        
                        const testConfig = JSON.parse(JSON.stringify(bestConfig));
                        testConfig[param1.section][param1.param] = val1;
                        testConfig[param2.section][param2.param] = val2;
                        
                        try {
                            testCount++;
                            
                            if (BASE_CONFIG.INTER_TEST_DELAY > 0) {
                                await sleep(BASE_CONFIG.INTER_TEST_DELAY);
                            }
                            
                            const result = await window.backtesterAPI.fetchResults(testConfig);
                            if (!result.success) continue;
                            
                            const tokens = result.metrics.totalTokens;
                            const score = calculateScore(result.metrics);
                            const pnl = result.metrics.tpPnlPercent || 0;
                            
                            if (pnl >= BASE_CONFIG.TARGET_MIN_TP_PNL_PERCENT && score > bestScore) {
                                bestConfig = testConfig;
                                bestTokens = tokens;
                                bestScore = score;
                                const perDay = (tokens / tokenTarget.days).toFixed(1);
                                console.log(`    ✅ Combo improved! ${perDay} tokens/day, Score: ${score.toFixed(1)}`);
                            }
                        } catch (error) {
                            // Silent fail for combos
                        }
                    }
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
            strategy: 'systematic_adjustment_thorough',
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
                <br><strong>💎 Quality:</strong> TP PnL ≥ ${BASE_CONFIG.TARGET_MIN_TP_PNL_PERCENT}% for viable base configs
                <br><strong>📋 Strategy:</strong> Thorough multi-pass testing (${BASE_CONFIG.VALUES_PER_PARAMETER} values/param, ${BASE_CONFIG.NUM_PASSES} passes)
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
            
            <div style="margin-bottom: 16px;">
                <label style="display: flex; align-items: center; padding: 8px; background: rgba(245, 101, 101, 0.1); border: 1px solid rgba(245, 101, 101, 0.3); border-radius: 6px; cursor: pointer; font-size: 12px; color: #e2e8f0;">
                    <input type="checkbox" id="clear-cache-checkbox" checked style="margin-right: 8px; cursor: pointer; width: 16px; height: 16px;">
                    <span style="font-weight: 600; color: #63b3ed;">🧹 Clear cache before building</span>
                </label>
                <div style="font-size: 9px; color: #a0aec0; margin-top: 4px; padding-left: 24px;">
                    ✅ Recommended: Ensures fresh API results for accurate parameter testing
                    <br>⚠️ Unchecked: Reuses cached results (faster but may miss changes)
                </div>
            </div>
            
            <div style="margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <label style="font-weight: 600; font-size: 12px; color: #63b3ed;">
                        🔧 Parameters to Test:
                    </label>
                    <div style="display: flex; gap: 8px;">
                        <button id="select-all-params" style="padding: 4px 8px; background: rgba(72, 187, 120, 0.2); border: 1px solid rgba(72, 187, 120, 0.4); border-radius: 4px; color: #48bb78; font-size: 9px; cursor: pointer; font-weight: 600;">✓ All</button>
                        <button id="deselect-all-params" style="padding: 4px 8px; background: rgba(245, 101, 101, 0.2); border: 1px solid rgba(245, 101, 101, 0.4); border-radius: 4px; color: #f56565; font-size: 9px; cursor: pointer; font-weight: 600;">✗ None</button>
                    </div>
                </div>
                <div id="parameter-checkboxes" style="max-height: 200px; overflow-y: auto; background: #2d3748; border: 1px solid #4a5568; border-radius: 6px; padding: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                    ${Object.entries(BASE_CONFIG.TIME_INDEPENDENT_PARAMS)
                        .sort(([,a], [,b]) => a.priority - b.priority)
                        .map(([param, info]) => `
                            <label style="display: flex; align-items: center; padding: 4px; cursor: pointer; font-size: 10px; color: #e2e8f0; border-radius: 4px; transition: background 0.2s;" 
                                   onmouseover="this.style.background='rgba(139, 92, 246, 0.1)'" 
                                   onmouseout="this.style.background='transparent'">
                                <input type="checkbox" 
                                       class="param-checkbox" 
                                       data-param="${param}" 
                                       checked 
                                       style="margin-right: 8px; cursor: pointer; width: 14px; height: 14px;">
                                <span>${param}</span>
                            </label>
                        `).join('')}
                </div>
                <div style="font-size: 9px; color: #a0aec0; margin-top: 4px;">Select which time-independent parameters to optimize</div>
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
        // Update AGCopilot's best-config-display header and stats
        const header = document.getElementById('best-config-header');
        const stats = document.getElementById('best-config-stats');
        
        if (header) {
            const icon = isError ? '❌' : '🏗️';
            header.innerHTML = `${icon} Base Config Builder`;
            header.style.color = isError ? '#f56565' : '#8b5cf6';
        }
        
        if (stats) {
            const timestamp = new Date().toLocaleTimeString();
            const color = isError ? '#f56565' : '#e2e8f0';
            stats.innerHTML += `<div style="color: ${color}; margin: 2px 0; font-size: 11px;">
                <span style="color: #a0aec0;">${timestamp}</span> ${message}
            </div>`;
        }
        
        // Show/hide base config action buttons
        const baseConfigActions = document.getElementById('base-config-actions');
        if (baseConfigActions && window.latestBaseConfig) {
            baseConfigActions.style.display = 'grid';
        }
        
        // Also log to console for detailed tracking
        console.log(`${isError ? '❌' : '📝'} ${message}`);
    }

    // ========================================
    // 🚀 MAIN EXECUTION
    // ========================================
    
    async function startBaseConfigBuilding() {
        try {
            // Validate dependencies
            validateDependencies();
            
            // Clear cache to ensure fresh results for Base Config Builder
            const clearCache = document.getElementById('clear-cache-checkbox')?.checked ?? true;
            if (clearCache && window.globalConfigCache) {
                const previousSize = window.globalConfigCache.cache.size;
                window.globalConfigCache.cache.clear();
                console.log(`🧹 Cleared ${previousSize} cached configurations for fresh Base Config Builder run`);
                updateBaseConfigStatus(`🧹 Cache cleared (${previousSize} entries) - testing with fresh API calls`);
            } else if (!clearCache) {
                console.log(`💾 Cache NOT cleared - may reuse previous results (faster but less accurate)`);
                updateBaseConfigStatus(`💾 Using cached results where available`);
            }
            
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
            
            // Clear previous status and update header
            const header = document.getElementById('best-config-header');
            const stats = document.getElementById('best-config-stats');
            const baseConfigActions = document.getElementById('base-config-actions');
            
            if (header) {
                header.innerHTML = '🏗️ Base Config Builder Running...';
                header.style.color = '#8b5cf6';
            }
            if (stats) stats.innerHTML = '';
            
            // Hide base config action buttons until results are ready
            if (baseConfigActions) {
                baseConfigActions.style.display = 'none';
            }
            
            updateBaseConfigStatus('🏗️ Starting base config building...');
            updateBaseConfigStatus(`🎯 Target: ${minTargetTokensPerDay}-${maxTargetTokensPerDay} tokens/day, Time limit: ${timeLimit} minutes`);
            
            const startTime = Date.now();
            const result = await buildBaseConfigSystematic();
            const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
            
            const tokenTarget = getTokenTarget();
            const resultPerDay = (result.metrics.totalTokens / tokenTarget.days).toFixed(1);
            
            updateBaseConfigStatus(`✅ Base config building complete in ${duration} minutes!`);
            updateBaseConfigStatus(`📊 Result: ${resultPerDay} tokens/day (${result.metrics.totalTokens} total)`);
            updateBaseConfigStatus(`🧪 Total tests performed: ${result.tests}`);
            
            // Store result for UI buttons
            window.latestBaseConfig = result;
            
            // Update best-config-display with results
            const actualPnl = result.metrics.tpPnlPercent || 0;
            const pnlStatus = actualPnl >= minTpPnl ? '✅' : '❌';
            const tokensPerDay = (result.metrics.totalTokens / tokenTarget.days).toFixed(1);
            const inRange = tokensPerDay >= minTargetTokensPerDay && tokensPerDay <= maxTargetTokensPerDay;
            const rangeIcon = inRange ? '🎯' : '⚠️';
            const targetMet = result.targetMet ? '🎯 Target Range Met!' : '⚠️ Target Range Not Met';
            
            if (header) {
                header.innerHTML = `✅ Base Config Complete - ${targetMet}`;
                header.style.color = result.targetMet ? '#48bb78' : '#f6ad55';
            }
            
            if (stats) {
                stats.innerHTML = `
                    <div style="font-size: 12px; margin-bottom: 8px; padding: 8px; background: rgba(139, 92, 246, 0.1); border-radius: 4px;">
                        <strong>Tokens/Day:</strong> ${rangeIcon} ${tokensPerDay}/day (target: ${minTargetTokensPerDay}-${maxTargetTokensPerDay})
                        <br><strong>Total Tokens:</strong> ${result.metrics.totalTokens} over ${tokenTarget.days} days
                        <br><strong>TP PnL:</strong> ${actualPnl.toFixed(1)}% ${pnlStatus} (threshold: ${minTpPnl}%)
                        <br><strong>Win Rate:</strong> ${result.metrics.winRate?.toFixed(1) || 'N/A'}%
                        <br><strong>Score:</strong> ${calculateScore(result.metrics).toFixed(1)}
                        <br><strong>Tests:</strong> ${result.tests} | <strong>Duration:</strong> ${duration} minutes
                    </div>
                `;
            }
            
            // Show base config action buttons
            if (baseConfigActions) {
                baseConfigActions.style.display = 'grid';
            }
            
        } catch (error) {
            updateBaseConfigStatus(`❌ Error: ${error.message}`, true);
            console.error('Base Config Builder Error:', error);
        }
    }

    // ========================================
    // 🎮 EVENT HANDLERS & INITIALIZATION
    // ========================================
    
    function setupBaseConfigEventHandlers() {
        // Select/Deselect all parameters buttons
        document.getElementById('select-all-params').addEventListener('click', () => {
            document.querySelectorAll('.param-checkbox').forEach(cb => cb.checked = true);
        });
        
        document.getElementById('deselect-all-params').addEventListener('click', () => {
            document.querySelectorAll('.param-checkbox').forEach(cb => cb.checked = false);
        });
        
        // Start building button
        document.getElementById('start-base-config-btn').addEventListener('click', startBaseConfigBuilding);
    }
    
    // Export Apply and Copy functions for use by AGCopilot buttons
    window.applyBaseConfig = function() {
        if (window.latestBaseConfig && typeof window.applyConfigToUI === 'function') {
            window.applyConfigToUI(window.latestBaseConfig.config);
            updateBaseConfigStatus('✅ Base config applied to backtester UI');
            console.log('✅ Base config applied to backtester UI');
        } else {
            updateBaseConfigStatus('❌ No base config available to apply', true);
            console.error('❌ No base config available to apply');
        }
    };
    
    window.copyBaseConfig = async function() {
        if (window.latestBaseConfig) {
            const configText = JSON.stringify(window.latestBaseConfig.config, null, 2);
            try {
                await navigator.clipboard.writeText(configText);
                updateBaseConfigStatus('📋 Base config copied to clipboard');
                console.log('📋 Base config copied to clipboard');
            } catch (error) {
                updateBaseConfigStatus('❌ Failed to copy to clipboard', true);
                console.error('❌ Failed to copy to clipboard:', error);
            }
        } else {
            updateBaseConfigStatus('❌ No base config available to copy', true);
            console.error('❌ No base config available to copy');
        }
    };

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