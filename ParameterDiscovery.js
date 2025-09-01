// ParameterDiscovery.js
// Extracted Parameter Impact Discovery logic for AGCopilot
(function (AGUtils) {
    // Expose as window.ParameterDiscovery for browser console usage
    const PD = {};

    const AG = AGUtils || (window && window.AGUtils) || {};

    function generateTestValuesFromRules(paramName) {
        if (typeof PARAM_RULES === 'undefined') {
            console.warn('ParameterDiscovery: PARAM_RULES not found in global scope');
            return [];
        }

        const rule = PARAM_RULES[paramName];
        if (!rule) {
            console.warn(`⚠️ No rule found for parameter: ${paramName}`);
            return [];
        }
        const { min, max, step, type } = rule;
        const testValues = [];
        testValues.push(min);
        if (max !== min) testValues.push(max);

        const range = max - min;
        const numSteps = Math.floor(range / step);

        if (numSteps <= 1) {
            const finalValues = [...new Set(testValues)];
            if (paramName === 'Min AG Score') return finalValues.map(v => String(v));
            return finalValues;
        }

        if (numSteps <= 5) {
            for (let value = min + step; value < max; value += step) {
                testValues.push(type === 'integer' ? Math.round(value) : value);
            }
        } else {
            const quartile1 = min + (range * 0.25);
            const median = min + (range * 0.5);
            const quartile3 = min + (range * 0.75);
            const roundToStep = (val) => {
                const rounded = Math.round((val - min) / step) * step + min;
                return type === 'integer' ? Math.round(rounded) : rounded;
            };
            testValues.push(roundToStep(quartile1));
            testValues.push(roundToStep(median));
            testValues.push(roundToStep(quartile3));
            if (numSteps > 20) {
                const point1 = min + (range * 0.1);
                const point2 = min + (range * 0.9);
                testValues.push(roundToStep(point1));
                testValues.push(roundToStep(point2));
            }
        }

        const uniqueValues = [...new Set(testValues)].sort((a, b) => a - b);
        const maxValues = 8;
        let finalValues;
        if (uniqueValues.length > maxValues) {
            const result = [uniqueValues[0]];
            const step_size = Math.floor((uniqueValues.length - 2) / (maxValues - 2));
            for (let i = step_size; i < uniqueValues.length - 1; i += step_size) {
                result.push(uniqueValues[i]);
            }
            result.push(uniqueValues[uniqueValues.length - 1]);
            finalValues = result.slice(0, maxValues);
        } else {
            finalValues = uniqueValues;
        }

        if (paramName === 'Min AG Score') finalValues = finalValues.map(v => String(v));
        console.log(`📊 Generated ${finalValues.length} test values for ${paramName}: [${finalValues.join(', ')}]`);
        return finalValues;
    }

    async function runParameterImpactDiscovery() {
        // Prefer helpers from AG (AGUtils) then globals on window
        const getScaledTokenThresholdsFn = (AG && typeof AG.getScaledTokenThresholds === 'function') ? AG.getScaledTokenThresholds : (typeof getScaledTokenThresholds === 'function' ? getScaledTokenThresholds : (window.getScaledTokenThresholds || null));
        const calculateRobustScoreFn = (AG && typeof AG.calculateRobustScore === 'function') ? AG.calculateRobustScore : (typeof calculateRobustScore === 'function' ? calculateRobustScore : (window.calculateRobustScore || null));
        const ensureCompleteConfigFn = (AG && typeof AG.ensureCompleteConfig === 'function') ? AG.ensureCompleteConfig : (typeof ensureCompleteConfig === 'function' ? ensureCompleteConfig : (window.ensureCompleteConfig || null));
        const getCurrentConfigurationFn = (AG && typeof AG.getCurrentConfiguration === 'function') ? AG.getCurrentConfiguration : (typeof getCurrentConfiguration === 'function' ? getCurrentConfiguration : (window.getCurrentConfiguration || null));

        if (!getScaledTokenThresholdsFn || !calculateRobustScoreFn) {
            throw new Error('ParameterDiscovery: Required helpers missing (getScaledTokenThresholds, calculateRobustScore)');
        }

        const scaledThresholds = getScaledTokenThresholdsFn();
        const MIN_TOKENS_REQUIRED = scaledThresholds.MIN_TOKENS;
        const MIN_IMPROVEMENT_THRESHOLD = 1;

        try {
            console.log('%c🔬 Starting Parameter Impact Discovery', 'color: purple; font-size: 16px; font-weight: bold;');
            if (!window.optimizationTracker) window.optimizationTracker = { isRunning: false, startOptimization: () => {}, stopOptimization: () => {}, updateProgress: () => {} };
            if (!window.optimizationTracker.isRunning) window.optimizationTracker.startOptimization && window.optimizationTracker.startOptimization(1);

            const currentConfig = (typeof getCurrentConfigurationFn === 'function') ? getCurrentConfigurationFn() : (window.currentConfig || {});
            const cache = window.globalConfigCache || (window.globalConfigCache = new (window.ConfigCache || (class { constructor(){this.m=new Map()} has(){return false} get(){return null} set(){}}))());

            const fetchWithCacheValidated = async (cfg, label) => {
                const completeCfg = typeof ensureCompleteConfigFn === 'function' ? ensureCompleteConfigFn(cfg) : cfg;
                const apiParams = (typeof backtesterAPI !== 'undefined' && backtesterAPI.mapParametersToAPI) ? backtesterAPI.mapParametersToAPI(completeCfg) : (window.ApiClient && window.ApiClient.mapParametersToAPI ? window.ApiClient.mapParametersToAPI(completeCfg) : {});
                const validation = (typeof backtesterAPI !== 'undefined' && backtesterAPI.validateConfig) ? backtesterAPI.validateConfig(apiParams) : { isValid: true, errors: [] };
                if (!validation.isValid) {
                    console.log(`    ⚠️ Skipping invalid config (${label}): ${validation.errors.join(', ')}`);
                    return { success: false, error: 'invalid_config' };
                }
                if (CONFIG && CONFIG.USE_CONFIG_CACHING && cache.has && cache.has(completeCfg)) {
                    const cached = cache.get(completeCfg);
                    console.log(`    💾 Cache hit: ${label}`);
                    return cached;
                }
                const res = await ((typeof backtesterAPI !== 'undefined' && backtesterAPI.fetchResults) ? backtesterAPI.fetchResults(completeCfg) : (window.ApiClient && typeof window.ApiClient.fetchResults === 'function' ? window.ApiClient.fetchResults(completeCfg) : Promise.reject(new Error('No API fetch available'))));
                if (CONFIG && CONFIG.USE_CONFIG_CACHING && cache.set) cache.set(completeCfg, res);
                return res;
            };

            const baselineResult = await fetchWithCacheValidated(currentConfig, 'Baseline');
            if (!baselineResult.success || !baselineResult.metrics) throw new Error('Failed to establish baseline configuration');
            if (baselineResult.metrics.totalTokens < MIN_TOKENS_REQUIRED) throw new Error(`Baseline has insufficient tokens: ${baselineResult.metrics.totalTokens} < ${MIN_TOKENS_REQUIRED}`);

            const baseRobust = calculateRobustScore(baselineResult.metrics);
            const baselineScore = baseRobust && !baseRobust.rejected ? baseRobust.score : baselineResult.metrics.tpPnlPercent;
            const baselineTokens = baselineResult.metrics.totalTokens;

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
            const parameterResults = [];

            for (const { param, section } of parametersToTest) {
                if (window.STOPPED) break;
                console.log(`%c🔬 Analyzing ${param}...`, 'color: orange; font-weight: bold;');
                const testValues = generateTestValuesFromRules(param);
                if (!testValues || testValues.length === 0) continue;
                const paramResults = [];

                for (const value of testValues) {
                    if (window.STOPPED) break;
                    try {
                        testCount++;
                        console.log(`  Testing ${param}: ${value}`);
                        const testConfig = (typeof ensureCompleteConfigFn === 'function') ? ensureCompleteConfigFn(currentConfig) : JSON.parse(JSON.stringify(currentConfig || {}));
                        if (!testConfig[section]) testConfig[section] = {};
                        testConfig[section][param] = value;
                        const result = await fetchWithCacheValidated(testConfig, `${param}=${value}`);
                        if (!result.success || !result.metrics) { failedCount++; console.log(`    ❌ ${value}: API call failed`); continue; }
                        if (result.metrics.totalTokens < MIN_TOKENS_REQUIRED) { console.log(`    ⚠️ ${value}: Insufficient tokens (${result.metrics.totalTokens})`); continue; }
                        const robust = calculateRobustScore(result.metrics);
                        if (robust && robust.rejected) { console.log(`    ❌ ${value}: Rejected by robust scoring (${robust.rejectionReason})`); continue; }
                        const currentScore = robust ? robust.score : result.metrics.tpPnlPercent;
                        const improvement = currentScore - baselineScore;
                        paramResults.push({ value, score: currentScore, improvement, tokens: result.metrics.totalTokens, winRate: result.metrics.winRate || 0, rawTpPnl: result.metrics.tpPnlPercent || 0 });
                        const logPrefix = improvement > MIN_IMPROVEMENT_THRESHOLD ? '✅' : '📊';
                        console.log(`    ${logPrefix} ${value}: score=${currentScore.toFixed(1)} (raw=${(result.metrics.tpPnlPercent||0).toFixed(1)}%, WR=${(result.metrics.winRate||0).toFixed(1)}%) Δ=${improvement.toFixed(1)} [${result.metrics.totalTokens} tokens]`);
                        window.optimizationTracker.updateProgress && window.optimizationTracker.updateProgress(testCount, failedCount);
                    } catch (error) {
                        failedCount++; console.log(`    ❌ ${value}: ${error.message}`);
                    }
                }

                if (paramResults.length > 0) {
                    const improvements = paramResults.map(r => r.improvement);
                    const maxImprovement = Math.max(...improvements);
                    const range = Math.max(...improvements) - Math.min(...improvements);
                    const bestResult = paramResults.reduce((best, current) => current.improvement > best.improvement ? current : best);
                    parameterResults.push({ parameter: param, section: section, maxImprovement, range, impact: (Math.abs(maxImprovement) + range) / 2, bestValue: bestResult.value, bestScore: bestResult.score, bestImprovement: bestResult.improvement, results: paramResults });
                    console.log(`📈 ${param} Impact: Max +${maxImprovement.toFixed(1)}%, Best Value: ${bestResult.value}`);
                }
            }

            const sortedResults = parameterResults.sort((a,b) => b.impact - a.impact).slice(0, 10);
            console.log('\n%c🏆 TOP 10 PARAMETER IMPACT RANKINGS:', 'color: gold; font-size: 16px; font-weight: bold;');
            console.log('%c' + '='.repeat(60), 'color: gold;');
            sortedResults.forEach((result, index) => {
                console.log(`%c${(index + 1).toString().padStart(2)}. ${result.parameter} = ${result.bestValue} → +${result.bestImprovement.toFixed(1)} improvement`, result.impact > 10 ? 'color: #ff6b6b; font-weight: bold;' : result.impact > 5 ? 'color: #feca57; font-weight: bold;' : 'color: #48dbfb;');
            });

            window.optimizationTracker.stopOptimization && window.optimizationTracker.stopOptimization();
            console.log('\n%c✅ Parameter Impact Discovery Complete!', 'color: green; font-size: 16px; font-weight: bold;');
            console.log(`📊 Tested ${testCount} configurations, ${failedCount} failed`);
            console.log(`📈 Baseline: ${baselineScore.toFixed(1)}% PnL with ${baselineTokens} tokens`);
            return sortedResults;
        } catch (error) {
            window.optimizationTracker.stopOptimization && window.optimizationTracker.stopOptimization();
            console.error('❌ Parameter Impact Discovery failed:', error);
            throw error;
        }
    }

    function generateOptimizedConfigFromDiscovery(discoveryResults, topN = 5) {
        if (!discoveryResults || !discoveryResults.results) return null;
        const config = (typeof COMPLETE_CONFIG_TEMPLATE !== 'undefined') ? JSON.parse(JSON.stringify(COMPLETE_CONFIG_TEMPLATE)) : {};
        const topParameters = discoveryResults.results.slice(0, topN);
        topParameters.forEach(result => {
            if (result.bestValue !== null && result.bestImprovement > 0) {
                const section = result.section;
                if (!config[section]) config[section] = {};
                config[section][result.parameter] = result.bestValue;
                console.log(`🎯 Applied discovered parameter: ${result.parameter} = ${result.bestValue} (+${result.bestImprovement.toFixed(1)})`);
            }
        });
        return config;
    }

    function getDiscoverySummary(discoveryResults) {
        if (!discoveryResults || !discoveryResults.results) return null;
        const topParams = discoveryResults.results.slice(0, 5);
        const totalImprovement = topParams.reduce((sum, p) => sum + Math.max(0, p.bestImprovement), 0);
        return { baselineScore: discoveryResults.baseline, topParameterCount: topParams.length, totalPotentialImprovement: totalImprovement, topParameters: topParams.map(p => ({ name: p.parameter, value: p.bestValue, improvement: p.bestImprovement })) };
    }

    function getParameterSection(paramName) {
        const sectionMap = {
            'Min MCAP (USD)': 'basic', 'Max MCAP (USD)': 'basic',
            'Min AG Score': 'tokenDetails', 'Min Token Age (sec)': 'tokenDetails', 'Max Token Age (sec)': 'tokenDetails', 'Min Deployer Age (min)': 'tokenDetails',
            'Min Buy Ratio %': 'risk', 'Max Buy Ratio %': 'risk', 'Min Vol MCAP %': 'risk',
            'Max Vol MCAP %': 'risk', 'Min Bundled %': 'risk', 'Max Bundled %': 'risk', 'Min Deployer Balance (SOL)': 'risk',
            'Max Drained %': 'risk', 'Max Drained Count': 'risk',
            'Min Unique Wallets': 'wallets', 'Max Unique Wallets': 'wallets', 'Min KYC Wallets': 'wallets', 'Max KYC Wallets': 'wallets',
            'Min Holders': 'wallets', 'Max Holders': 'wallets',
            'Holders Growth %': 'wallets', 'Holders Growth Minutes': 'wallets',
            'Min TTC (sec)': 'advanced', 'Max TTC (sec)': 'advanced', 'Min Win Pred %': 'advanced', 'Max Liquidity %': 'advanced'
        };
        return sectionMap[paramName] || 'basic';
    }

    PD.generateTestValuesFromRules = generateTestValuesFromRules;
    PD.runParameterImpactDiscovery = runParameterImpactDiscovery;
    PD.generateOptimizedConfigFromDiscovery = generateOptimizedConfigFromDiscovery;
    PD.getDiscoverySummary = getDiscoverySummary;
    PD.getParameterSection = getParameterSection;

    window.ParameterDiscovery = PD;
})(window.AGUtils || {});
