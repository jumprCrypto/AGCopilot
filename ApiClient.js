// ApiClient.js
// Extracted API-related functions from AGCopilot.js into a reusable class.
// This file is designed to run in the browser console as part of the bookmarklet flow.

(function () {
    'use strict';

    class ApiClient {
        constructor(AGUtils = {}, CONFIG = {}, burstRateLimiter = null) {
            this.AGUtils = AGUtils || (window && window.AGUtils) || {};
            this.CONFIG = CONFIG || {};
            this.burstRateLimiter = burstRateLimiter || (window && window.burstRateLimiter) || null;
            this.baseUrl = 'https://backtester.alphagardeners.xyz/api/stats';
        }

        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        async fetchWithRetry(url, maxRetries = this.CONFIG.MAX_RETRIES) {
            if (this.burstRateLimiter && typeof this.burstRateLimiter.throttle === 'function') {
                await this.burstRateLimiter.throttle();
            }

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    console.log(`🌐 Fetching: ${url} (attempt ${attempt})`);
                    const response = await fetch(url);

                    if (!response.ok) {
                        if (response.status === 429) {
                            if (this.burstRateLimiter && typeof this.burstRateLimiter.adaptToBurstLimit === 'function') {
                                this.burstRateLimiter.adaptToBurstLimit();
                            }
                            console.log(`⏳ Rate limited (429), burst rate limiter adapted for next requests...`);
                            throw new Error(`Rate limited (HTTP 429). Burst rate limiter handling recovery.`);
                        } else {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }
                    }

                    const data = await response.json();
                    if (this.burstRateLimiter && typeof this.burstRateLimiter.adaptToSuccess === 'function') {
                        this.burstRateLimiter.adaptToSuccess();
                    }
                    console.log(`✅ Successfully fetched data`);
                    return data;

                } catch (error) {
                    console.log(`❌ Attempt ${attempt} failed: ${error.message}`);

                    if (attempt === maxRetries) {
                        throw new Error(`Failed to fetch after ${maxRetries} attempts: ${error.message}`);
                    }

                    if (error.message.includes('Rate limited')) {
                        await this.sleep(1000);
                    } else {
                        const retryDelay = (this.CONFIG.RETRY_DELAY || 1000) * attempt;
                        await this.sleep(retryDelay);
                    }
                }
            }
        }

        async getTokenInfo(contractAddress) {
            const url = `${this.CONFIG.API_BASE_URL || 'https://backtester.alphagardeners.xyz/api'}/swaps?fromDate=2000-01-01&toDate=9999-12-31&search=${contractAddress}&sort=timestamp&direction=desc&page=1&limit=1`;
            const data = await this.fetchWithRetry(url);

            if (!data.swaps || data.swaps.length === 0) {
                throw new Error('Token not found or no swap data available');
            }

            return data.swaps[0];
        }

        async getAllTokenSwaps(contractAddress) {
            const url = `${this.CONFIG.API_BASE_URL || 'https://backtester.alphagardeners.xyz/api'}/swaps/by-token/${contractAddress}`;
            const data = await this.fetchWithRetry(url);

            if (!data.swaps || data.swaps.length === 0) {
                throw new Error('No swap history found for this token');
            }

            return data.swaps;
        }

        // ---- Backtester API mapping and fetching ----
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

        mapParametersToAPI(config) {
            const apiParams = {};
            const flatConfig = this.flattenConfig(config);

            if (config && Array.isArray(config.takeProfits) && config.takeProfits.length > 0) {
                apiParams.__takeProfits = config.takeProfits
                    .filter(tp => tp && !isNaN(Number(tp.size)) && !isNaN(Number(tp.gain)))
                    .map(tp => ({ size: Number(tp.size), gain: Number(tp.gain) }));
            } else if (config && config.tpSettings) {
                const tps = [];
                for (let i = 1; i <= 6; i++) {
                    const g = config.tpSettings[`TP ${i} % Gain`];
                    const s = config.tpSettings[`TP ${i} % Sell`];
                    const gain = g !== undefined ? Number(g) : undefined;
                    const size = s !== undefined ? Number(s) : undefined;
                    if (!isNaN(gain) && !isNaN(size)) {
                        tps.push({ size, gain });
                    }
                }
                if (tps.length > 0) apiParams.__takeProfits = tps;
            }

            const parameterMap = {
                'Min MCAP (USD)': 'minMcap',
                'Max MCAP (USD)': 'maxMcap',
                'Min Deployer Age (min)': 'minDeployerAge',
                'Min Token Age (sec)': 'minTokenAge',
                'Max Token Age (sec)': 'maxTokenAge',
                'Min AG Score': 'minAgScore',
                'Min Holders': 'minHoldersCount',
                'Max Holders': 'maxHoldersCount',
                'Holders Growth %': 'minHoldersDiffPct',
                'Holders Growth Minutes': 'maxHoldersSinceMinutes',
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
                'Min Win Pred %': 'minWinPredPercent',
                'Min Liquidity (USD)': 'minLiquidity',
                'Max Liquidity (USD)': 'maxLiquidity',
                'Description': 'needsDescription',
                'Fresh Deployer': 'needsFreshDeployer',
                'Has Buy Signal': 'needsSignal'
            };

            Object.entries(parameterMap).forEach(([agCopilotName, apiName]) => {
                const value = flatConfig[agCopilotName];
                if (value !== undefined && value !== null && value !== '') {
                    if (apiName === 'needsDescription' || apiName === 'needsFreshDeployer' || apiName === 'needsSignal') {
                        if (value === true || value === 'Yes') {
                            apiParams[apiName] = true;
                        } else if (value === false || value === 'No') {
                            apiParams[apiName] = false;
                        }
                    } else {
                        const numericValue = parseFloat(value);
                        if (isNaN(numericValue) || !isFinite(numericValue)) {
                            console.log(`⚠️ Skipping invalid ${apiName}: ${value} (NaN or invalid)`);
                            return;
                        }

                        if (apiName === 'minAgScore') {
                            const agScore = Math.round(numericValue);
                            apiParams[apiName] = Math.max(0, Math.min(10, agScore));
                        } else {
                            apiParams[apiName] = numericValue;
                        }
                    }
                }
            });

            const triggerMode = (typeof getTriggerMode === 'function') ? getTriggerMode() : null;
            if (triggerMode !== null) apiParams.triggerMode = triggerMode;
            apiParams.excludeSpoofedTokens = true;
            apiParams.buyingAmount = this.CONFIG.DEFAULT_BUYING_AMOUNT;

            const dateRange = (typeof getDateRange === 'function') ? getDateRange() : {};
            if (dateRange.fromDate) apiParams.fromDate = dateRange.fromDate;
            if (dateRange.toDate) apiParams.toDate = dateRange.toDate;

            return apiParams;
        }

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
                ['minHoldersCount', 'maxHoldersCount'],
                ['minBundledPercent', 'maxBundledPercent'],
                ['minBuyRatio', 'maxBuyRatio'],
                ['minVolMcapPercent', 'maxVolMcapPercent'],
                ['minDrainedPercent', 'maxDrainedPercent']
            ];

            minMaxPairs.forEach(([minKey, maxKey]) => {
                const minVal = apiParams[minKey];
                const maxVal = apiParams[maxKey];
                if (minVal !== undefined && maxVal !== undefined && !isNaN(minVal) && !isNaN(maxVal) && parseFloat(minVal) > parseFloat(maxVal)) {
                    validationErrors.push(`${minKey}(${minVal}) > ${maxKey}(${maxVal})`);
                }
            });

            return {
                isValid: validationErrors.length === 0,
                errors: validationErrors
            };
        }

        buildApiUrl(apiParams) {
            const params = new URLSearchParams();
            Object.entries(apiParams).forEach(([key, value]) => {
                if (key.startsWith('__')) return;
                if (value !== undefined && value !== null && value !== '') {
                    if (typeof value === 'number') {
                        if (isNaN(value) || !isFinite(value)) return;
                    } else if (typeof value === 'object') {
                        return;
                    }
                    const stringValue = String(value);
                    if (stringValue === 'NaN' || stringValue === 'undefined' || stringValue === 'null') return;
                    params.append(key, stringValue);
                }
            });

            let tpPairs = [];
            try {
                if (Array.isArray(apiParams.__takeProfits) && apiParams.__takeProfits.length > 0) {
                    tpPairs = apiParams.__takeProfits.map(tp => ({ size: Number(tp.size), gain: Number(tp.gain) }));
                }
                if ((!tpPairs || tpPairs.length === 0) && typeof window !== 'undefined') {
                    const uiConfig = window.agLastUIConfig || null;
                    if (uiConfig && Array.isArray(uiConfig.takeProfits) && uiConfig.takeProfits.length > 0) {
                        tpPairs = uiConfig.takeProfits.map(tp => ({ size: Number(tp.size), gain: Number(tp.gain) }));
                    }
                }
            } catch (e) {}

            if (!tpPairs || tpPairs.length === 0) {
                tpPairs = (this.CONFIG.TP_CONFIGURATIONS || []).map(tp => ({ size: Number(tp.size), gain: Number(tp.gain) }));
            }

            const tpParams = tpPairs.map(tp => `tpSize=${tp.size}&tpGain=${tp.gain}`).join('&');
            const base = `${this.baseUrl}?${params.toString()}`;
            return tpParams ? `${base}&${tpParams}` : base;
        }

        async fetchResults(config, retries = 3) {
            try {
                if (this.burstRateLimiter && typeof this.burstRateLimiter.throttle === 'function') {
                    await this.burstRateLimiter.throttle();
                }

                const apiParams = this.mapParametersToAPI(config);
                const validation = this.validateConfig(apiParams);
                if (!validation.isValid) {
                    return { success: true, error: 'Skipping Invalid configuration: ' + validation.errors.join(', '), validation: validation.errors };
                }

                const url = this.buildApiUrl(apiParams);

                if (apiParams.fromDate || apiParams.toDate) console.log(`📅 Date range: ${apiParams.fromDate || 'No start'} to ${apiParams.toDate || 'No end'}`);

                if (url.includes('minAgScore=NaN') || url.includes('minAgScore=undefined')) {
                    console.error(`❌ CRITICAL: NaN/undefined AG Score detected in URL!`);
                    return { success: false, error: 'Invalid AG Score parameter (NaN/undefined) detected in API URL', source: 'URL_VALIDATION' };
                }

                for (let attempt = 1; attempt <= retries; attempt++) {
                    try {
                        const response = await fetch(url, { method: 'GET', credentials: 'include', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' } });
                        if (!response.ok) {
                            if (response.status === 429) {
                                console.warn(`⚠️ Rate limit hit (429) on attempt ${attempt}/${retries}`);
                                if (this.burstRateLimiter && typeof this.burstRateLimiter.adaptToBurstLimit === 'function') this.burstRateLimiter.adaptToBurstLimit();
                                const retryAfter = response.headers.get('Retry-After');
                                let waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.max(20000, (this.CONFIG.RATE_LIMIT_RECOVERY || 10000) * 2);
                                if (attempt > 1) waitTime *= Math.pow(2, attempt - 1);
                                waitTime = Math.min(120000, Math.max(20000, waitTime));
                                if (attempt < retries) { await this.sleep(waitTime); continue; }
                                else return { success: false, error: 'Rate limit exceeded after all retries - throttling insufficient', isRateLimit: true, retryable: true };
                            }
                            if (response.status === 500) {
                                console.error(`❌ Server Error (500) - likely invalid parameters`);
                                throw new Error(`Server Error (500) - Invalid parameters detected`);
                            }
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }

                        const data = await response.json();
                        const transformedMetrics = {
                            totalTokens: data.totalTokens || 0,
                            tpPnlPercent: data.averageTpGain || 0,
                            tpPnlSOL: data.pnlSolTp || 0,
                            athPnlPercent: data.averageAthGain || 0,
                            athPnlSOL: data.pnlSolAth || 0,
                            totalSpent: data.totalSolSpent || 0,
                            winRate: data.winRate || 0,
                            cleanPnL: data.cleanPnL || 0,
                            totalSignals: data.totalAvailableSignals || 0
                        };

                        if (isNaN(transformedMetrics.tpPnlPercent) || isNaN(transformedMetrics.totalTokens)) {
                            console.error('❌ Invalid metrics - contains NaN values:', transformedMetrics);
                            throw new Error(`Invalid metrics returned`);
                        }

                        return { success: true, metrics: transformedMetrics, rawResponse: data, source: 'API' };

                    } catch (error) {
                        console.warn(`❌ API attempt ${attempt} failed: ${error.message}`);
                        if (attempt === retries) return { success: false, error: error.message, source: 'API' };
                        if (!error.message.includes('429')) await this.sleep(1000 * attempt);
                    }
                }

            } catch (error) {
                return { success: false, error: error.message, source: 'API' };
            }
        }
    }

    // Expose globally for AG Copilot to instantiate
    if (typeof window !== 'undefined') {
        window.ApiClient = ApiClient;
    }

})();
