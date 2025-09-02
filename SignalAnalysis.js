(function (AGUtils) {
    'use strict';

    // SignalAnalysis module extracted from AGCopilot
    const SA = {};
    const AG = AGUtils || (window && window.AGUtils) || {};

    // Lightweight helpers using AGUtils or globals from the host script when available
    const formatTimestamp = (ts) => (AG.formatTimestamp ? AG.formatTimestamp(ts) : (window.formatTimestamp ? window.formatTimestamp(ts) : (ts ? new Date(ts * 1000).toISOString().replace('T', ' ').split('.')[0] : 'N/A')));
    const formatMcap = (m) => (AG.formatMcap ? AG.formatMcap(m) : (window.formatMcap ? window.formatMcap(m) : (m >= 1000000 ? `$${(m/1000000).toFixed(2)}M` : m >= 1000 ? `$${(m/1000).toFixed(2)}K` : `$${m}`)));
    const formatPercent = (v) => (AG.formatPercent ? AG.formatPercent(v) : (window.formatPercent ? window.formatPercent(v) : (v === null || v === undefined ? 'N/A' : `${v.toFixed(2)}%`)));
    const deepClone = (o) => (AG.deepClone ? AG.deepClone(o) : (window.deepClone ? window.deepClone(o) : JSON.parse(JSON.stringify(o))));

    // Remove outliers - copied from original implementation
    function removeOutliers(values, method = 'none') {
        if (!values || values.length === 0) return values;
        if (method === 'none') return values;

        const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
        if (validValues.length < 4) return validValues;

        const sorted = [...validValues].sort((a, b) => a - b);

        switch (method) {
            case 'iqr': {
                const q1Index = Math.floor(sorted.length * 0.25);
                const q3Index = Math.floor(sorted.length * 0.75);
                const q1 = sorted[q1Index];
                const q3 = sorted[q3Index];
                const iqr = q3 - q1;
                const lowerBound = q1 - 1.5 * iqr;
                const upperBound = q3 + 1.5 * iqr;
                return validValues.filter(v => v >= lowerBound && v <= upperBound);
            }
            case 'percentile': {
                const startIndex = Math.floor(sorted.length * 0.1);
                const endIndex = Math.ceil(sorted.length * 0.9);
                const filtered = sorted.slice(startIndex, endIndex);
                return validValues.filter(v => v >= filtered[0] && v <= filtered[filtered.length - 1]);
            }
            case 'zscore': {
                const mean = validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
                const variance = validValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / validValues.length;
                const stdDev = Math.sqrt(variance);
                const threshold = 2.5;
                return validValues.filter(v => Math.abs(v - mean) <= threshold * stdDev);
            }
            default:
                return validValues;
        }
    }

    SA.removeOutliers = removeOutliers;

    SA.getClusteringParameters = function () {
        return [
            'signalMcap', 'agScore', 'tokenAge', 'deployerAge', 'deployerBalance',
            'uniqueCount', 'kycCount', 'liquidity', 'liquidityPct', 'buyVolumePct',
            'bundledPct', 'drainedPct', 'volMcapPct', 'winPredPercent', 'ttc'
        ];
    };

    SA.normalizeSignals = function (signals) {
        const parameters = SA.getClusteringParameters();
        const normalizedSignals = [];
        const ranges = {};

        parameters.forEach(param => {
            const values = signals.map(s => s[param]).filter(v => v !== null && v !== undefined && !isNaN(v));
            if (values.length > 0) {
                ranges[param] = { min: Math.min(...values), max: Math.max(...values), range: Math.max(...values) - Math.min(...values) };
            }
        });

        signals.forEach(signal => {
            const normalized = { ...signal };
            parameters.forEach(param => {
                if (ranges[param] && signal[param] !== null && signal[param] !== undefined && !isNaN(signal[param])) {
                    if (ranges[param].range > 0) normalized[param] = (signal[param] - ranges[param].min) / ranges[param].range;
                    else normalized[param] = 0;
                } else normalized[param] = 0;
            });
            normalizedSignals.push(normalized);
        });

        return { normalizedSignals, ranges };
    };

    SA.calculateSignalDistance = function (signal1, signal2) {
        const parameters = SA.getClusteringParameters();
        let sumSquaredDiffs = 0;
        let validParams = 0;

        parameters.forEach(param => {
            const val1 = signal1[param];
            const val2 = signal2[param];
            if (val1 !== null && val1 !== undefined && !isNaN(val1) && val2 !== null && val2 !== undefined && !isNaN(val2)) {
                sumSquaredDiffs += Math.pow(val1 - val2, 2);
                validParams++;
            }
        });

        if (validParams === 0) return Infinity;
        return Math.sqrt(sumSquaredDiffs);
    };

    SA.findSignalClusters = function (signals, tokenData, minClusterTokens) {
        if (signals.length < 4) return [];
        const signalToToken = new Map();
        let signalIndex = 0;
        tokenData.forEach(token => { token.swaps.forEach(swap => { if (swap.criteria) { signalToToken.set(signalIndex, token.address); signalIndex++; } }); });

        const { normalizedSignals } = SA.normalizeSignals(signals);
        const clusters = [];
        const thresholds = [0.1,0.15,0.2,0.25,0.3,0.4,0.5,0.6,0.8,1.0,1.5,2.0];

        for (const threshold of thresholds) {
            const currentClusters = [];
            const currentUsed = new Set();
            normalizedSignals.forEach((signal, index) => {
                if (currentUsed.has(index)) return;
                const cluster = [index];
                const clusterTokens = new Set([signalToToken.get(index)]);
                currentUsed.add(index);
                normalizedSignals.forEach((otherSignal, otherIndex) => {
                    if (currentUsed.has(otherIndex)) return;
                    const distance = SA.calculateSignalDistance(signal, otherSignal);
                    if (distance <= threshold) {
                        cluster.push(otherIndex);
                        clusterTokens.add(signalToToken.get(otherIndex));
                        currentUsed.add(otherIndex);
                    }
                });
                if (clusterTokens.size >= minClusterTokens) {
                    const avgDistance = cluster.length > 1 ? cluster.reduce((sum, i) => {
                        return sum + cluster.reduce((innerSum, j) => { return i !== j ? innerSum + SA.calculateSignalDistance(normalizedSignals[i], normalizedSignals[j]) : innerSum; }, 0);
                    }, 0) / (cluster.length * (cluster.length - 1)) : 0;
                    currentClusters.push({ indices: cluster, signals: cluster.map(i => signals[i]), tokens: Array.from(clusterTokens), threshold, size: cluster.length, tokenCount: clusterTokens.size, avgDistance });
                }
            });
            if (currentClusters.length > 0) { clusters.push(...currentClusters); break; }
        }

        // Remove overlaps prefer tighter clusters
        const finalClusters = [];
        const globalUsed = new Set();
        clusters.sort((a,b) => a.avgDistance - b.avgDistance || b.tokenCount - a.tokenCount);
        clusters.forEach(cluster => { const hasOverlap = cluster.indices.some(i => globalUsed.has(i)); if (!hasOverlap) { cluster.id = `cluster_${finalClusters.length+1}`; cluster.name = `Cluster ${finalClusters.length+1}`; cluster.size = cluster.signals.length; finalClusters.push(cluster); cluster.indices.forEach(i => globalUsed.add(i)); } });
        return finalClusters;
    };

    // Analyze tokens and signals: supports optional clustering
    SA.analyzeSignalCriteria = function (tokenData, bufferPercent = 10, outlierMethod = 'none', useClustering = true) {
        // tokenData: [{ address, processed, swaps: [...] }, ...]
        const signals = tokenData.flatMap(t => (Array.isArray(t.swaps) ? t.swaps : []).filter(s => s && s.criteria).map(s => {
            return { ...s.criteria, signalMcap: s.signalMcap, athMcap: s.athMcap, tokenAddress: t.address };
        }));

        const totalSignals = signals.length;
        if (totalSignals === 0) return { type: 'standard', analysis: SA.generateAnalysisFromSignals([], bufferPercent, outlierMethod), usedClustering: false, totalSignals: 0 };

        // If clustering requested and enough tokens/signals exist, attempt clustering
        if (useClustering && tokenData.length >= 4 && totalSignals >= 4) {
            const minClusterTokens = Math.max(2, Math.floor(tokenData.length / 4));
            const clusters = SA.findSignalClusters(signals, tokenData, minClusterTokens);
            if (clusters && clusters.length > 0) {
                // Enrich clusters with analysis
                clusters.forEach(cluster => {
                    cluster.analysis = SA.generateAnalysisFromSignals(cluster.signals, bufferPercent, outlierMethod);
                    cluster.signalCount = Array.isArray(cluster.signals) ? cluster.signals.length : 0;
                    cluster.tokenCount = cluster.tokens ? cluster.tokens.length : cluster.tokenCount || 0;
                    cluster.clusterInfo = { clusterId: cluster.id, clusterName: cluster.name, threshold: cluster.threshold, tightness: cluster.avgDistance };
                });

                const fallback = SA.generateAnalysisFromSignals(signals, bufferPercent, outlierMethod);
                // Provide a tokenCount for UI fallback display (unique contract addresses)
                try { fallback.tokenCount = Array.from(new Set(tokenData.map(t => t.address))).length; } catch (e) { fallback.tokenCount = tokenData.length; }
                const clusteredSignals = clusters.reduce((sum, c) => sum + (c.signalCount || 0), 0);
                return { type: 'clustered', clusters, fallback, clusteredSignals, totalSignals, usedClustering: true };
            }
        }

        // Default: standard analysis on all signals
        const analysis = SA.generateAnalysisFromSignals(signals, bufferPercent, outlierMethod);
        return { type: 'standard', analysis, totalSignals, usedClustering: false };
    };

    // Core analysis (generateAnalysisFromSignals) - adapted from original
    SA.generateAnalysisFromSignals = function (signals, bufferPercent = 10, outlierMethod = 'none') {
        const applyBuffer = (value, isMin = true, isPercent = false) => {
            if (value === null || value === undefined) return null;
            const multiplier = isMin ? (1 - bufferPercent / 100) : (1 + bufferPercent / 100);
            let result = value * multiplier;
            if (isPercent) result = Math.max(0, Math.min(100, result)); else if (result < 0) result = 0;
            return Math.round(result * 100) / 100;
        };

        const getValidValues = (field) => {
            const rawValues = signals.map(signal => signal[field]).filter(val => val !== null && val !== undefined && !isNaN(val));
            return removeOutliers(rawValues, outlierMethod);
        };

        const analysis = { totalSignals: signals.length, bufferPercent, outlierMethod };

        // MCAP
        const rawMcaps = signals.map(s => s.signalMcap).filter(m => m && m > 0);
        const mcaps = removeOutliers(rawMcaps, outlierMethod);
        if (mcaps.length === 0) analysis.mcap = { min: 0, max: 20000, avg: 0, count: 0, originalCount: rawMcaps.length, filteredCount: 0, outlierMethod };
        else {
            const rawMin = Math.min(...mcaps); const rawMax = Math.max(...mcaps); const avg = mcaps.reduce((s,m)=>s+m,0)/mcaps.length; const sortedMcaps=[...mcaps].sort((a,b)=>a-b); const tightestMax = sortedMcaps[Math.floor(sortedMcaps.length*0.75)]||rawMax; analysis.mcap = { min: Math.round(applyBuffer(rawMin,true)), max: Math.round(applyBuffer(rawMax,false)), avg: Math.round(avg), count: mcaps.length, originalCount: rawMcaps.length, filteredCount: mcaps.length, outliersRemoved: rawMcaps.length-mcaps.length, tightestMax: Math.round(applyBuffer(tightestMax,false)), outlierMethod };
        }

        // AG Score
        const scores = getValidValues('agScore');
        if (scores.length === 0) analysis.agScore = { min:0, max:10, avg:0, count:0 };
        else { const rawMin=Math.min(...scores); const rawMax=Math.max(...scores); const avg=scores.reduce((s,v)=>s+v,0)/scores.length; analysis.agScore={min:Math.round(applyBuffer(rawMin,true)), max:Math.round(applyBuffer(rawMax,false)), avg:Math.round(avg), count:scores.length}; }

        // tokenAge
        const ages = getValidValues('tokenAge');
        if (ages.length === 0) analysis.tokenAge = { min:0, max:2592000, avg:0, count:0 };
        else { const rawMin=Math.min(...ages); const rawMax=Math.max(...ages); const avg=ages.reduce((s,v)=>s+v,0)/ages.length; analysis.tokenAge={min:Math.round(applyBuffer(rawMin,true)), max:Math.round(applyBuffer(rawMax,false)), avg:Math.round(avg), count:ages.length}; }

        // deployerAge (seconds -> minutes)
        const dages = getValidValues('deployerAge');
        if (dages.length === 0) analysis.deployerAge = { min:0, max:10080, avg:0, count:0 };
        else { const agesInMin = dages.map(a=>a/60); const rawMin=Math.min(...agesInMin); const rawMax=Math.max(...agesInMin); const avg=agesInMin.reduce((s,v)=>s+v,0)/agesInMin.length; analysis.deployerAge={min:Math.round(applyBuffer(rawMin,true)), max:Math.round(applyBuffer(rawMax,false)), avg:Math.round(avg), count:agesInMin.length}; }

        // deployerBalance
        const balances = getValidValues('deployerBalance');
        if (balances.length === 0) analysis.deployerBalance = { min:0, max:1000, avg:0, count:0 };
        else { const rawMin=Math.min(...balances); const rawMax=Math.max(...balances); const avg=balances.reduce((s,v)=>s+v,0)/balances.length; analysis.deployerBalance={min:applyBuffer(rawMin,true), max:applyBuffer(rawMax,false), avg:Math.round(avg*100)/100, count:balances.length}; }

        // uniqueWallets
        const counts = getValidValues('uniqueCount');
        if (counts.length === 0) analysis.uniqueWallets = { min:0, max:1000, avg:0, count:0 };
        else { const rawMin=Math.min(...counts); const rawMax=Math.max(...counts); const avg=counts.reduce((s,v)=>s+v,0)/counts.length; analysis.uniqueWallets={min:Math.round(applyBuffer(rawMin,true)), max:Math.round(applyBuffer(rawMax,false)), avg:Math.round(avg), count:counts.length}; }

        // kycWallets
        const kyc = getValidValues('kycCount');
        if (kyc.length===0) analysis.kycWallets={min:0,max:100,avg:0,count:0}; else { const rawMin=Math.min(...kyc); const rawMax=Math.max(...kyc); const avg=kyc.reduce((s,v)=>s+v,0)/kyc.length; analysis.kycWallets={min:Math.round(applyBuffer(rawMin,true)), max:Math.round(applyBuffer(rawMax,false)), avg:Math.round(avg), count:kyc.length}; }

        // holders
        const holders = getValidValues('holdersCount');
        if (holders.length===0) analysis.holders={min:0,max:1000,avg:0,count:0}; else { const rawMin=Math.min(...holders); const rawMax=Math.max(...holders); const avg=holders.reduce((s,v)=>s+v,0)/holders.length; analysis.holders={min:Math.round(applyBuffer(rawMin,true)), max:Math.round(applyBuffer(rawMax,false)), avg:Math.round(avg), count:holders.length}; }

        // liquidity
        const liquids = getValidValues('liquidity');
        if (liquids.length===0) analysis.liquidity={min:0,max:100000,avg:0,count:0}; else { const rawMin=Math.min(...liquids); const rawMax=Math.max(...liquids); const avg=liquids.reduce((s,v)=>s+v,0)/liquids.length; analysis.liquidity={min:Math.round(applyBuffer(rawMin,true)), max:Math.round(applyBuffer(rawMax,false)), avg:Math.round(avg), count:liquids.length}; }

        // liquidityPct
        const lp = getValidValues('liquidityPct'); if (lp.length===0) analysis.liquidityPct={min:0,max:100,avg:0,count:0}; else { const rawMin=Math.min(...lp); const rawMax=Math.max(...lp); const avg=lp.reduce((s,v)=>s+v,0)/lp.length; analysis.liquidityPct={min:applyBuffer(rawMin,true,true), max:applyBuffer(rawMax,false,true), avg:Math.round(avg*100)/100, count:lp.length}; }

        // buyVolumePct
        const bv = getValidValues('buyVolumePct'); if (bv.length===0) analysis.buyVolumePct={min:0,max:100,avg:0,count:0}; else { const rawMin=Math.min(...bv); const rawMax=Math.max(...bv); const avg=bv.reduce((s,v)=>s+v,0)/bv.length; analysis.buyVolumePct={min:applyBuffer(rawMin,true,true), max:applyBuffer(rawMax,false,true), avg:Math.round(avg*100)/100, count:bv.length}; }

        // bundledPct
        const bp = getValidValues('bundledPct'); if (bp.length===0) analysis.bundledPct={min:0,max:100,avg:0,count:0}; else { const rawMin=Math.min(...bp); const rawMax=Math.max(...bp); const avg=bp.reduce((s,v)=>s+v,0)/bp.length; analysis.bundledPct={min:applyBuffer(rawMin,true,true), max:applyBuffer(rawMax,false,true), avg:Math.round(avg*100)/100, count:bp.length}; }

        // drainedPct
        const dp = getValidValues('drainedPct'); if (dp.length===0) analysis.drainedPct={min:0,max:100,avg:0,count:0}; else { const rawMin=Math.min(...dp); const rawMax=Math.max(...dp); const avg=dp.reduce((s,v)=>s+v,0)/dp.length; analysis.drainedPct={min:applyBuffer(rawMin,true,true), max:applyBuffer(rawMax,false,true), avg:Math.round(avg*100)/100, count:dp.length}; }

        // volMcapPct
        const vp = getValidValues('volMcapPct'); if (vp.length===0) analysis.volMcapPct={min:0,max:300,avg:0,count:0}; else { const rawMin=Math.min(...vp); const rawMax=Math.max(...vp); const avg=vp.reduce((s,v)=>s+v,0)/vp.length; analysis.volMcapPct={min:applyBuffer(rawMin,true), max:applyBuffer(rawMax,false), avg:Math.round(avg*100)/100, count:vp.length}; }

        // winPred
        const wp = getValidValues('winPredPercent'); if (wp.length===0) analysis.winPred={min:0,max:100,avg:0,count:0}; else { const rawMin=Math.min(...wp); const rawMax=Math.max(...wp); const avg=wp.reduce((s,v)=>s+v,0)/wp.length; analysis.winPred={min:applyBuffer(rawMin,true,true), max:applyBuffer(rawMax,false,true), avg:Math.round(avg*100)/100, count:wp.length}; }

        // ttc
        const ttcs = getValidValues('ttc'); if (ttcs.length===0) analysis.ttc={min:0,max:3600,avg:0,count:0}; else { const rawMin=Math.min(...ttcs); const rawMax=Math.max(...ttcs); const avg=ttcs.reduce((s,v)=>s+v,0)/ttcs.length; analysis.ttc={min:Math.round(applyBuffer(rawMin,true)), max:Math.round(applyBuffer(rawMax,false)), avg:Math.round(avg), count:ttcs.length}; }

        // Boolean criteria
        const boolFields = ['freshDeployer','hasDescription','hasSignal'];
        boolFields.forEach(field => {
            const trueCount = signals.filter(s => s[field] === true).length;
            const falseCount = signals.filter(s => s[field] === false).length;
            const nullCount = signals.filter(s => s[field] === null || s[field] === undefined).length;
            analysis[field] = { trueCount, falseCount, nullCount, preferredValue: (trueCount>falseCount? true : falseCount>trueCount? false : null) };
        });

        return analysis;
    };

    SA.generateTightestConfig = function (analysis) {
        const config = { metadata: { generatedAt: new Date().toISOString(), basedOnSignals: analysis.totalSignals, basedOnTokens: analysis.tokenCount || 0, bufferPercent: analysis.bufferPercent, outlierMethod: analysis.outlierMethod, configType: 'Tightest Generated Config' } };
        if (analysis.clusterInfo) { config.metadata.clusterInfo = analysis.clusterInfo; config.metadata.configType = `Cluster ${analysis.clusterInfo.clusterId} Config`; }
        if (analysis.mcap && analysis.mcap.min !== undefined) config['Min MCAP (USD)'] = analysis.mcap.min;
        if (analysis.mcap && analysis.mcap.tightestMax !== undefined) config['Max MCAP (USD)'] = analysis.mcap.tightestMax; else if (analysis.mcap && analysis.mcap.max !== undefined) config['Max MCAP (USD)'] = analysis.mcap.max;
        if (analysis.agScore && analysis.agScore.min !== undefined) config['Min AG Score'] = analysis.agScore.min;
        if (analysis.tokenAge && analysis.tokenAge.max !== undefined && analysis.tokenAge.count > 0) config['Max Token Age (sec)'] = analysis.tokenAge.max;
        if (analysis.tokenAge && analysis.tokenAge.min !== undefined && analysis.tokenAge.count > 0) config['Min Token Age (sec)'] = analysis.tokenAge.min;
        if (analysis.deployerAge && analysis.deployerAge.min !== undefined && analysis.deployerAge.count > 0) config['Min Deployer Age (min)'] = analysis.deployerAge.min;
        if (analysis.uniqueWallets && analysis.uniqueWallets.min !== undefined && analysis.uniqueWallets.count > 0) config['Min Unique Wallets'] = analysis.uniqueWallets.min;
        if (analysis.uniqueWallets && analysis.uniqueWallets.max !== undefined && analysis.uniqueWallets.count > 0) config['Max Unique Wallets'] = analysis.uniqueWallets.max;
        if (analysis.kycWallets && analysis.kycWallets.min !== undefined && analysis.kycWallets.count > 0) config['Min KYC Wallets'] = analysis.kycWallets.min;
        if (analysis.kycWallets && analysis.kycWallets.max !== undefined && analysis.kycWallets.count > 0) config['Max KYC Wallets'] = analysis.kycWallets.max;
        if (analysis.holders && analysis.holders.min !== undefined && analysis.holders.count > 0) config['Min Holders'] = analysis.holders.min;
        if (analysis.holders && analysis.holders.max !== undefined && analysis.holders.count > 0) config['Max Holders'] = analysis.holders.max;
        if (analysis.liquidity && analysis.liquidity.min !== undefined && analysis.liquidity.count > 0) config['Min Liquidity (USD)'] = analysis.liquidity.min;
        if (analysis.liquidity && analysis.liquidity.max !== undefined && analysis.liquidity.count > 0) config['Max Liquidity (USD)'] = analysis.liquidity.max;
        if (analysis.liquidityPct && analysis.liquidityPct.max !== undefined && analysis.liquidityPct.count > 0 && analysis.liquidityPct.max >= 20) config['Max Liquidity %'] = analysis.liquidityPct.max;
        if (analysis.buyVolumePct && analysis.buyVolumePct.min !== undefined && analysis.buyVolumePct.count > 0) config['Min Buy Ratio %'] = analysis.buyVolumePct.min;
        if (analysis.buyVolumePct && analysis.buyVolumePct.max !== undefined && analysis.buyVolumePct.count > 0 && analysis.buyVolumePct.max >= 80) config['Max Buy Ratio %'] = analysis.buyVolumePct.max;
        if (analysis.volMcapPct && analysis.volMcapPct.min !== undefined && analysis.volMcapPct.count > 0) config['Min Vol MCAP %'] = analysis.volMcapPct.min;
        if (analysis.volMcapPct && analysis.volMcapPct.max !== undefined && analysis.volMcapPct.count > 0) config['Max Vol MCAP %'] = analysis.volMcapPct.max;
        if (analysis.bundledPct && analysis.bundledPct.min !== undefined && analysis.bundledPct.count > 0) config['Min Bundled %'] = analysis.bundledPct.min;
        if (analysis.bundledPct && analysis.bundledPct.max !== undefined && analysis.bundledPct.count > 0) config['Max Bundled %'] = analysis.bundledPct.max;
        if (analysis.drainedPct && analysis.drainedPct.max !== undefined && analysis.drainedPct.count > 0) {
            if (analysis.drainedPct.max >= 5) config['Max Drained %'] = analysis.drainedPct.max; else if (analysis.drainedPct.max < 5 && analysis.drainedPct.max >= 0) config['Max Drained %'] = 5;
        }
        if (analysis.deployerBalance && analysis.deployerBalance.min !== undefined && analysis.deployerBalance.count > 0) config['Min Deployer Balance (SOL)'] = analysis.deployerBalance.min;
        if (analysis.freshDeployer && analysis.freshDeployer.preferredValue !== undefined) config['Fresh Deployer'] = analysis.freshDeployer.preferredValue;
        if (analysis.hasDescription && analysis.hasDescription.preferredValue !== undefined) config['Description'] = analysis.hasDescription.preferredValue;
        if (analysis.hasSignal && analysis.hasSignal.preferredValue !== undefined) config['Has Buy Signal'] = analysis.hasSignal.preferredValue;
        if (analysis.winPred && analysis.winPred.min !== undefined && analysis.winPred.count > 0) config['Min Win Pred %'] = analysis.winPred.min;
        if (analysis.ttc && analysis.ttc.min !== undefined && analysis.ttc.count > 0) config['Min TTC (sec)'] = analysis.ttc.min;
        if (analysis.ttc && analysis.ttc.max !== undefined && analysis.ttc.count > 0 && analysis.ttc.max >= 60) config['Max TTC (sec)'] = analysis.ttc.max;
        return config;
    };

    SA.formatConfigForDisplay = function (config) {
        // Simple formatting that matches original function's output
        const lines = [];
        const isClusterConfig = config.metadata && config.metadata.clusterInfo;
        if (isClusterConfig) { lines.push(`🎯 CLUSTER ${config.metadata.clusterInfo.clusterId} CONFIG`); lines.push('═'.repeat(50)); lines.push(`🔗 ${config.metadata.clusterInfo.clusterName}: ${config.metadata.clusterInfo.description}`); lines.push(`🎯 Tightness Score: ${config.metadata.clusterInfo.tightness.toFixed(3)} (lower = tighter)`); lines.push(`📏 Distance Threshold: ${config.metadata.clusterInfo.threshold}`); }
        else { lines.push('🎯 TIGHTEST GENERATED CONFIG'); lines.push('═'.repeat(50)); }
        if (config.metadata) { const tokenText = config.metadata.basedOnTokens !== undefined ? `${config.metadata.basedOnTokens} tokens` : 'undefined tokens'; lines.push(`📊 Based on: ${config.metadata.basedOnSignals} signals from ${tokenText}`); lines.push(`🛡️ Buffer: ${config.metadata.bufferPercent}%`); lines.push(`🎯 Outlier Filter: ${config.metadata.outlierMethod || 'none'}`); lines.push(`⏰ Generated: ${new Date(config.metadata.generatedAt).toLocaleString()}`); }
        lines.push('');
        if (config['Min MCAP (USD)'] !== undefined || config['Max MCAP (USD)'] !== undefined) { const min = config['Min MCAP (USD)'] || 0; const max = config['Max MCAP (USD)'] || 'N/A'; lines.push(`MCAP: $${min} - $${max}`); }
        if (config['Min AG Score'] !== undefined) lines.push(`AG Score: ${config['Min AG Score']} - ${config['Max AG Score'] || 10}`);
        if (config['Min Token Age (sec)'] !== undefined || config['Max Token Age (sec)'] !== undefined) { const min = config['Min Token Age (sec)'] || 0; const max = config['Max Token Age (sec)'] || '∞'; lines.push(`Token Age: ${min} - ${max} seconds`); }
        if (config['Min Deployer Age (min)'] !== undefined) lines.push(`Deployer Age: ${config['Min Deployer Age (min)']} - ∞ minutes`);
        if (config['Min Deployer Balance (SOL)'] !== undefined) lines.push(`Deployer Balance: ${config['Min Deployer Balance (SOL)']} - ∞ SOL`);
        lines.push('');
        lines.push('👥 WALLET CRITERIA:');
        if (config['Min Holders'] !== undefined || config['Max Holders'] !== undefined) { const min = config['Min Holders'] || 0; const max = config['Max Holders'] || '∞'; lines.push(`Holders: ${min} - ${max}`); }
        if (config['Min Unique Wallets'] !== undefined || config['Max Unique Wallets'] !== undefined) { const min = config['Min Unique Wallets'] || 0; const max = config['Max Unique Wallets'] || '∞'; lines.push(`Unique Wallets: ${min} - ${max}`); }
        if (config['Min KYC Wallets'] !== undefined || config['Max KYC Wallets'] !== undefined) { const min = config['Min KYC Wallets'] || 0; const max = config['Max KYC Wallets'] || '∞'; lines.push(`KYC Wallets: ${min} - ${max}`); }
        if (config['Holders Growth %'] !== undefined) lines.push(`Holders Growth %: ${config['Holders Growth %']}%`);
        if (config['Holders Growth Minutes'] !== undefined) lines.push(`Holders Growth Since: ${config['Holders Growth Minutes']} min`);
        lines.push('');
        lines.push('💧 LIQUIDITY CRITERIA:');
        if (config['Min Liquidity (USD)'] !== undefined || config['Max Liquidity (USD)'] !== undefined) { const min = config['Min Liquidity (USD)'] || 0; const max = config['Max Liquidity (USD)'] || '∞'; lines.push(`Liquidity: $${min} - $${max}`); }
        if (config['Max Liquidity %'] !== undefined) lines.push(`Liquidity %: 0% - ${config['Max Liquidity %']}%`);
        lines.push('');
        lines.push('📊 TRADING CRITERIA:');
        if (config['Min Buy Ratio %'] !== undefined || config['Max Buy Ratio %'] !== undefined) { const min = config['Min Buy Ratio %'] || 0; const max = config['Max Buy Ratio %'] || 100; lines.push(`Buy Volume %: ${min}% - ${max}%`); }
        if (config['Min Vol MCAP %'] !== undefined || config['Max Vol MCAP %'] !== undefined) { const min = config['Min Vol MCAP %'] || 0; const max = config['Max Vol MCAP %'] || '∞'; lines.push(`Vol/MCAP %: ${min}% - ${max}%`); }
        lines.push('');
        lines.push('⚠️ RISK CRITERIA:');
        if (config['Min Bundled %'] !== undefined || config['Max Bundled %'] !== undefined) { const min = config['Min Bundled %'] || 0; const max = config['Max Bundled %'] || 100; lines.push(`Bundled %: ${min}% - ${max}%`); }
        if (config['Max Drained %'] !== undefined) lines.push(`Drained %: 0% - ${config['Max Drained %']}%`);
        lines.push('');
        lines.push('🔘 BOOLEAN SETTINGS:');
        const boolToString = (val) => val === null ? "Don't Care" : (val ? 'Required' : 'Forbidden');
        if (config['Fresh Deployer'] !== undefined) lines.push(`Fresh Deployer: ${boolToString(config['Fresh Deployer'])}`);
        if (config['Description'] !== undefined) lines.push(`Has Description: ${boolToString(config['Description'])}`);
        lines.push('');
        lines.push('� ADVANCED CRITERIA:');
        if (config['Min Win Pred %'] !== undefined) lines.push(`Win Prediction: ${config['Min Win Pred %']}% - 100%`);
        if (config['Min TTC (sec)'] !== undefined || config['Max TTC (sec)'] !== undefined) { const min = config['Min TTC (sec)'] || 0; const max = config['Max TTC (sec)'] || '∞'; lines.push(`Time to Complete: ${min} - ${max} seconds`); }
        if (config['Has Buy Signal'] !== undefined) lines.push(`Has Buy Signal: ${boolToString(config['Has Buy Signal'])}`);
        lines.push('');
        lines.push('�📊 CONFIG SUMMARY:');
        const paramCount = Object.keys(config).filter(key => key !== 'metadata').length; lines.push(`Total Parameters Set: ${paramCount}`);
        return lines.join('\n');
    };

    SA.validateConfigAgainstSignals = function (config, originalSignals, configName = 'Config') {
        let matchingSignals = 0; const failReasons = {};
        originalSignals.forEach((signal, index) => {
            const failures = [];
            if (config['Min MCAP (USD)'] !== undefined && signal.signalMcap < config['Min MCAP (USD)']) failures.push(`MCAP ${signal.signalMcap} < Min ${config['Min MCAP (USD)']}`);
            if (config['Max MCAP (USD)'] !== undefined && signal.signalMcap > config['Max MCAP (USD)']) failures.push(`MCAP ${signal.signalMcap} > Max ${config['Max MCAP (USD)']}`);
            if (config['Min AG Score'] !== undefined && signal.agScore < config['Min AG Score']) failures.push(`AG Score ${signal.agScore} < Min ${config['Min AG Score']}`);
            if (config['Min Token Age (sec)'] !== undefined && signal.tokenAge < config['Min Token Age (sec)']) failures.push(`Token Age ${signal.tokenAge} < Min ${config['Min Token Age (sec)']}`);
            if (config['Max Token Age (sec)'] !== undefined && signal.tokenAge > config['Max Token Age (sec)']) failures.push(`Token Age ${signal.tokenAge} > Max ${config['Max Token Age (sec)']}`);
            if (failures.length === 0) matchingSignals++; else failReasons[index] = failures;
        });
        const matchRate = ((matchingSignals / originalSignals.length) * 100).toFixed(1);
        return { matchingSignals, totalSignals: originalSignals.length, matchRate: parseFloat(matchRate), failReasons };
    };

    // UI helpers (use DOM elements from host page)
    SA.getSignalOutlierFilterMethod = function () {
        const methods = ['none','iqr','percentile','zscore'];
        for (const method of methods) { const radio = document.getElementById(`signal-outlier-${method}`); if (radio && radio.checked) return method; }
        return 'none';
    };

    SA.updateSignalStatus = function (message, isError = false) {
        const statusArea = document.getElementById('signal-analysis-results');
        if (statusArea) {
            statusArea.style.display = 'block';
            const timestamp = new Date().toLocaleTimeString();
            const icon = isError ? '❌' : '📝';
            const color = isError ? '#ff6b6b' : '#ffffff';
            statusArea.innerHTML += `<div style="color: ${color}; margin: 2px 0;"><span style="opacity: 0.7;">${timestamp}</span> ${icon} ${message}</div>`;
            statusArea.scrollTop = statusArea.scrollHeight;
        }
    };

    // Ensure an API client is available to fetch token info / swaps.
    function ensureApiClientLocal() {
        // Use existing global helpers first
        if (window.getTokenInfo && window.getAllTokenSwaps) {
            return { getTokenInfo: window.getTokenInfo, getAllTokenSwaps: window.getAllTokenSwaps };
        }

        // If an ApiClient class is available, instantiate one and wrap its methods
        if (window.ApiClient) {
            try {
                if (!window.__signalAnalysisApiClient) {
                    // Prefer CONFIG and burstRateLimiter if available
                    const cfg = window.CONFIG || {};
                    window.__signalAnalysisApiClient = new window.ApiClient(AG, cfg, window.burstRateLimiter);
                }
                const client = window.__signalAnalysisApiClient;
                return {
                    getTokenInfo: (addr) => client.getTokenInfo(addr),
                    getAllTokenSwaps: (addr) => client.getAllTokenSwaps(addr)
                };
            } catch (e) {
                console.warn('SignalAnalysis: failed to create ApiClient instance', e);
            }
        }

        // Final fallback: functions that reject so caller can handle errors
        return {
            getTokenInfo: () => Promise.reject(new Error('getTokenInfo not available')),
            getAllTokenSwaps: () => Promise.reject(new Error('getAllTokenSwaps not available'))
        };
    }

    // createClusterSelectionUI & selectClusterConfig - minimal UI handling
    // Styles chosen to match original UI sizing and spacing
    const buttonStyle = `padding: 4px 8px; 
            margin: 2px; 
            border: 1px solid #4ECDC4; 
            border-radius: 3px; 
            background: rgba(78, 205, 196, 0.1); 
            color: #4ECDC4; 
            font-size: 9px; 
            cursor: pointer;
            transition: all 0.2s;`;
        
        const activeButtonStyle = `padding: 4px 8px; 
            margin: 2px; 
            border: 1px solid #FF6B6B; 
            border-radius: 3px; 
            background: rgba(255, 107, 107, 0.2); 
            color: #FF6B6B; 
            font-size: 9px; 
            cursor: pointer;
            font-weight: bold;`;
    SA.createClusterSelectionUI = function (clusters, fallbackAnalysis) {
        const clusterSection = document.getElementById('cluster-selection');
        const clusterButtonsContainer = document.getElementById('cluster-buttons');
        if (!clusterSection || !clusterButtonsContainer) return;
        clusterButtonsContainer.innerHTML = '';
        clusters.forEach((cluster, index) => {
            const button = document.createElement('button');
            button.innerHTML = `${cluster.name} (${cluster.tokenCount} CAs)`;
            button.style.cssText = index === 0 ? activeButtonStyle : buttonStyle;
            button.onclick = () => SA.selectClusterConfig(cluster.id, clusters, fallbackAnalysis);
            clusterButtonsContainer.appendChild(button);
        });
        const fallbackButton = document.createElement('button');
        fallbackButton.innerHTML = `All Signals (${fallbackAnalysis.tokenCount} CAs)`;
        fallbackButton.style.cssText = buttonStyle;
        fallbackButton.onclick = () => SA.selectClusterConfig('fallback', clusters, fallbackAnalysis);
        clusterButtonsContainer.appendChild(fallbackButton);
        clusterSection.style.display = 'block';
    };

    SA.selectClusterConfig = function (configId, clusters, fallbackAnalysis) {
        let selectedConfig; let selectedCluster = null;
        if (configId === 'fallback') { selectedConfig = SA.generateTightestConfig(fallbackAnalysis); window.lastGeneratedConfig = selectedConfig; }
        else { selectedConfig = window[`clusterConfig_${configId}`]; window.lastGeneratedConfig = selectedConfig; selectedCluster = clusters.find(c => c.id === configId); }
        const buttons = document.querySelectorAll('#cluster-buttons button');
        buttons.forEach(btn => {
            const isActive = (configId === 'fallback' && btn.innerHTML.includes('All Signals')) || (configId !== 'fallback' && btn.innerHTML.includes(configId.replace('cluster_','Cluster ')));
            btn.style.cssText = isActive ? activeButtonStyle : buttonStyle;
        });
        const configType = configId === 'fallback' ? 'All Signals Config' : `Cluster ${configId.replace('cluster_','')}`;
        SA.updateSignalStatus(`🔄 Switched to: ${configType}`);
        if (selectedCluster && selectedCluster.tokens) { console.log(`📋 Contract Addresses in ${selectedCluster.name}:`); selectedCluster.tokens.forEach((a,i)=>console.log(` ${i+1}. ${a}`)); console.log(`📊 Total: ${selectedCluster.tokens.length} contract addresses`); } else if (configId === 'fallback') { const contractAddresses = document.getElementById('signal-contract-input').value.split('\n').map(a=>a.trim()).filter(a=>a.length>0); console.log(`📋 Contract Addresses in All Signals Config:`); contractAddresses.forEach((a,i)=>console.log(` ${i+1}. ${a}`)); console.log(`📊 Total: ${contractAddresses.length} contract addresses`); }
        console.log(SA.formatConfigForDisplay(selectedConfig));
    };

    // Main signal analysis handler
    SA.handleSignalAnalysis = async function () {
        try {
            const contractAddresses = document.getElementById('signal-contract-input').value.split('\n').map(addr => addr.trim()).filter(addr => addr.length>0);
            if (contractAddresses.length === 0) { SA.updateSignalStatus('Please enter at least one contract address', true); return; }
            const signalsPerToken = parseInt(document.getElementById('signals-per-token').value) || 3;
            const bufferInput = document.getElementById('config-buffer');
            const bufferPercent = bufferInput && bufferInput.value !== '' ? parseFloat(bufferInput.value) : 0;
            const outlierMethod = SA.getSignalOutlierFilterMethod();
            document.getElementById('signal-analysis-results').innerHTML = '';
            SA.updateSignalStatus(`Starting analysis of ${contractAddresses.length} tokens...`);

            const burstStats = (window.burstRateLimiter && typeof window.burstRateLimiter.getStats === 'function') ? window.burstRateLimiter.getStats() : { currentBurstSize: 0 };
            SA.updateSignalStatus(`🚦 Using burst rate limiting: ${burstStats.currentBurstSize}/${(window.CONFIG?window.CONFIG.RATE_LIMIT_THRESHOLD:'?')} burst`);

            const allTokenData = []; const errors = [];
            const api = ensureApiClientLocal();
            for (let i=0;i<contractAddresses.length;i++) {
                const address = contractAddresses[i]; SA.updateSignalStatus(`Processing token ${i+1}/${contractAddresses.length}: ${address.substring(0,8)}...`);
                try {
                    const tokenInfo = await api.getTokenInfo(address);
                    const allSwaps = await api.getAllTokenSwaps(address);
                    const limitedSwaps = (Array.isArray(allSwaps) ? allSwaps : []).slice(0, signalsPerToken);
                    const processed = SA.processTokenData(tokenInfo, limitedSwaps);
                    allTokenData.push({ address, processed, swaps: limitedSwaps });
                    SA.updateSignalStatus(`✅ ${processed.tokenName} (${processed.symbol}): ${limitedSwaps.length} signals`);
                } catch (error) {
                    errors.push({ address, error: error.message });
                    SA.updateSignalStatus(`❌ Failed to process ${address.substring(0,8)}: ${error.message}`, true);
                }
            }

            if (allTokenData.length === 0) { SA.updateSignalStatus('No valid token data found. Please check contract addresses.', true); return; }

            SA.updateSignalStatus(`Analyzing ${allTokenData.length} tokens with ${outlierMethod} outlier filtering...`);
            const useClustering = document.getElementById('enable-signal-clustering') ? document.getElementById('enable-signal-clustering').checked : false;
            const analysis = (useClustering && allTokenData.length>=4) ? SA.analyzeSignalCriteria(allTokenData, bufferPercent, outlierMethod, useClustering) : { type: 'standard', analysis: SA.generateAnalysisFromSignals(allTokenData.flatMap(t=>t.swaps.filter(s=>s.criteria).map(s=>({ ...s.criteria, signalMcap: s.signalMcap, athMultiplier: s.athMcap && s.signalMcap ? (s.athMcap / s.signalMcap) : 0 }))), bufferPercent, outlierMethod), usedClustering: false };

            if (analysis.type === 'clustered') {
                SA.updateSignalStatus(`🎯 Found ${analysis.clusters.length} signal clusters (${analysis.clusteredSignals}/${analysis.totalSignals} signals)`);
                const bestCluster = analysis.clusters[0]; const bestConfig = SA.generateTightestConfig(bestCluster.analysis); window.lastGeneratedConfig = bestConfig;
                analysis.clusters.forEach((cluster,index)=>{ const generatedConfig = SA.generateTightestConfig(cluster.analysis); window[`clusterConfig_${cluster.id}`] = generatedConfig; SA.updateSignalStatus(`📊 ${cluster.name}: ${cluster.signalCount} signals`); });
                const fallbackConfig = SA.generateTightestConfig(analysis.fallback); window.fallbackConfig = fallbackConfig;
                SA.createClusterSelectionUI(analysis.clusters, analysis.fallback);
                // Ensure the action buttons (Apply / Optimize / Copy) appear for generated configs
                const actionArea = document.getElementById('generated-config-actions'); if (actionArea) actionArea.style.display = 'block';
                SA.updateSignalStatus(`📋 Generated ${analysis.clusters.length} cluster configs + 1 fallback - details logged to console`);
                console.log('🧾 Fallback generated config:\n', SA.formatConfigForDisplay(fallbackConfig));
            } else {
                const generatedConfig = SA.generateTightestConfig(analysis.analysis);
                console.log('\n' + SA.formatConfigForDisplay(generatedConfig)); window.lastGeneratedConfig = generatedConfig; SA.updateSignalStatus(`✅ Analysis complete! Generated config from ${analysis.analysis.totalSignals} signals`); document.getElementById('generated-config-actions').style.display = 'block';
            }
        } catch (error) { SA.updateSignalStatus(`Analysis failed: ${error.message}`, true); console.error('Signal analysis error:', error); }
    };

    // Minimal processTokenData and generateBatchSummary implementations
    SA.processTokenData = function (tokenInfo, swaps) {
        const result = {
            tokenAddress: tokenInfo.tokenAddress,
            tokenName: tokenInfo.token,
            symbol: tokenInfo.symbol,
            currentMcap: formatMcap(tokenInfo.currentMcap),
            currentMcapRaw: tokenInfo.currentMcap,
            athMcap: formatMcap(tokenInfo.athMcap),
            athMcapRaw: tokenInfo.athMcap,
            athTime: formatTimestamp(tokenInfo.athTime),
            atlMcap: formatMcap(tokenInfo.atlMcap),
            atlMcapRaw: tokenInfo.atlMcap,
            atlTime: formatTimestamp(tokenInfo.atlTime),
            athMultiplier: tokenInfo.athMcap && tokenInfo.signalMcap ? (tokenInfo.athMcap / tokenInfo.signalMcap).toFixed(2) + 'x' : 'N/A',
            athMultiplierRaw: tokenInfo.athMcap && tokenInfo.signalMcap ? (tokenInfo.athMcap / tokenInfo.signalMcap) : 0,
            currentFromAth: tokenInfo.athMcap && tokenInfo.currentMcap ? formatPercent(((tokenInfo.currentMcap - tokenInfo.athMcap) / tokenInfo.athMcap) * 100) : 'N/A',
            totalSignals: swaps.length,
            firstSignalTime: formatTimestamp(swaps[swaps.length-1]?.timestamp),
            lastSignalTime: formatTimestamp(swaps[0]?.timestamp),
            firstSignalMcap: formatMcap(swaps[swaps.length-1]?.signalMcap),
            lastSignalMcap: formatMcap(swaps[0]?.signalMcap),
            avgWinPred: swaps.length>0? formatPercent(swaps.reduce((s,swap)=>s+(swap.winPredPercent||0),0)/swaps.length) : 'N/A',
            maxWinPred: swaps.length>0? formatPercent(Math.max(...swaps.map(s=>s.winPredPercent||0))) : 'N/A',
            minWinPred: swaps.length>0? formatPercent(Math.min(...swaps.map(s=>s.winPredPercent||0))) : 'N/A',
            triggerModes: [...new Set(swaps.map(s=>s.triggerMode))].join(', '),
            latestCriteria: tokenInfo.criteria
        };
        return result;
    };

    SA.generateBatchSummary = function (allTokenData) {
        const summary = { totalTokens: allTokenData.length, totalSignals: allTokenData.reduce((sum,token)=>sum+token.processed.totalSignals,0), avgSignalsPerToken: 0, topPerformers: [], avgWinPred: 0, athMultipliers: [] };
        if (allTokenData.length>0) {
            summary.avgSignalsPerToken = (summary.totalSignals / allTokenData.length).toFixed(1);
            const allWinPreds = allTokenData.map(token => token.swaps.reduce((sum,swap)=>sum+(swap.winPredPercent||0),0)/token.swaps.length);
            summary.avgWinPred = (allWinPreds.reduce((s,v)=>s+v,0)/allWinPreds.length).toFixed(2);
            summary.topPerformers = allTokenData.map(token=>({ name: token.processed.tokenName, symbol: token.processed.symbol, athMultiplier: token.processed.athMultiplierRaw||0, athMultiplierText: token.processed.athMultiplier, signals: token.processed.totalSignals })).sort((a,b)=>b.athMultiplier-a.athMultiplier).slice(0,5);
            summary.athMultipliers = allTokenData.map(token=>token.processed.athMultiplierRaw||0).filter(m=>m>0);
        }
        return summary;
    };

    // Extract runners data for anti-gigamooner optimization
    SA.extractRunnersData = async function() {
        try {
            console.log('🔍 Extracting runners data...');
            let totalRunnersCount = 0;
            let totalTokensMatched = 0;
            let pagesWithSignals = 0;
            
            // First check the current page
            const initialPageData = await this.extractRunnersFromCurrentPage();
            totalRunnersCount += initialPageData.runnersCount;
            totalTokensMatched += initialPageData.tokensOnThisPage;
            
            if (initialPageData.runnersCount > 0 || initialPageData.tokensOnThisPage > 0) {
                pagesWithSignals++;
            }
            
            // Calculate runners percentage based on total tokens matched, not just pages analyzed
            const runnersPercentage = totalTokensMatched > 0 ? (totalRunnersCount / totalTokensMatched) * 100 : 0;
            return {
                runnersCount: totalRunnersCount,
                totalValidTokens: totalTokensMatched,
                runnersPercentage
            };
        } catch (error) {
            console.warn('⚠️ Failed to extract runners data:', error);
            return null;
        }
    };

    // Helper function to extract runners from current page
    SA.extractRunnersFromCurrentPage = async function() {
        try {
            // Find the TP Gain column index by looking at table headers
            const headers = Array.from(document.querySelectorAll('thead th'));
            let tpGainColumnIndex = -1;
            
            for (let i = 0; i < headers.length; i++) {
                const headerText = (headers[i].textContent || '').trim().toLowerCase();
                if (headerText.includes('tp gain') || headerText.includes('tp') && headerText.includes('gain')) {
                    tpGainColumnIndex = i;
                    break;
                }
            }
            
            if (tpGainColumnIndex === -1) {
                console.warn('⚠️ Could not find TP Gain column header. Go to the Signals page');
                return { runnersCount: 0, tokensOnThisPage: 0 };
            }
            
            // Get all table rows and extract the TP Gain column cells
            const tableRows = Array.from(document.querySelectorAll('tbody tr'));
            let runnersCount = 0;
            let tokensOnThisPage = 0;
            
            for (const row of tableRows) {
                const cells = row.querySelectorAll('td');
                if (cells.length > tpGainColumnIndex) {
                    tokensOnThisPage++; // Count valid tokens
                    
                    const tpGainCell = cells[tpGainColumnIndex];
                    const tpGainText = tpGainCell.textContent.trim();
                    
                    // Check if this is a runner (TP gain >= 1000%)
                    let isRunner = false;
                    
                    // Extract TP Gain value - looking for patterns like "1000%" or "10x"
                    if (tpGainText) {
                        // Check for percentage format
                        const percentMatch = tpGainText.match(/([0-9,.]+)%/);
                        if (percentMatch && parseFloat(percentMatch[1].replace(',', '')) >= 1000) {
                            isRunner = true;
                        } else {
                            // Check for multiplier format
                            const multiplierMatch = tpGainText.match(/([0-9,.]+)x/);
                            if (multiplierMatch) {
                                const multiplier = parseFloat(multiplierMatch[1].replace(',', ''));
                                if (multiplier >= 10) {
                                    isRunner = true;
                                }
                            }
                        }
                    }
                    
                    if (isRunner) {
                        runnersCount++;
                    }
                }
            }

            console.log(`📊 Page analysis complete: ${runnersCount}/${tokensOnThisPage} runners found`);

            return {
                runnersCount,
                tokensOnThisPage
            };
        } catch (error) {
            console.warn('⚠️ Failed to extract runners from current page:', error);
            return { runnersCount: 0, tokensOnThisPage: 0 };
        }
    };

    // Expose module
    window.SignalAnalysis = {
        processTokenData: SA.processTokenData,
        generateBatchSummary: SA.generateBatchSummary,
        removeOutliers: SA.removeOutliers,
        getClusteringParameters: SA.getClusteringParameters,
        normalizeSignals: SA.normalizeSignals,
        calculateSignalDistance: SA.calculateSignalDistance,
        findSignalClusters: SA.findSignalClusters,
        analyzeSignalCriteria: SA.analyzeSignalCriteria || function(){ return { type: 'standard', analysis: SA.generateAnalysisFromSignals([]) }; },
        generateFullAnalysis: SA.generateAnalysisFromSignals,
        generateClusterAnalysis: SA.generateAnalysisFromSignals,
        generateAnalysisFromSignals: SA.generateAnalysisFromSignals,
        generateTightestConfig: SA.generateTightestConfig,
        formatConfigForDisplay: SA.formatConfigForDisplay,
        validateConfigAgainstSignals: SA.validateConfigAgainstSignals,
        getSignalOutlierFilterMethod: SA.getSignalOutlierFilterMethod,
        updateSignalStatus: SA.updateSignalStatus,
        createClusterSelectionUI: SA.createClusterSelectionUI,
        selectClusterConfig: SA.selectClusterConfig,
        handleSignalAnalysis: SA.handleSignalAnalysis,
        extractRunnersData: SA.extractRunnersData,
        extractRunnersFromCurrentPage: SA.extractRunnersFromCurrentPage
    };

    console.log('SignalAnalysis module loaded and window.SignalAnalysis registered');
})();
