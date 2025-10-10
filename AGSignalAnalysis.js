(async function () {
    console.clear();
    console.log('%c🔍 AG Signal Analysis v1.0 🔍', 'color: cyan; font-size: 16px; font-weight: bold;');
    
    // Check if we're being loaded in the AGCopilot tab
    const isInTab = document.getElementById('signal-analysis-tab');
    if (!isInTab) {
        console.log('%c✨ Can be integrated into the main AGCopilot interface!', 'color: green; font-size: 12px;');
        console.log('💡 Use the "🔍 Signal Analysis" tab in AGCopilot for integrated experience');
    }

    // ========================================
    // 🎯 SIGNAL ANALYSIS CONFIGURATION
    // ========================================
    const SIGNAL_CONFIG = {
        // API Settings
        API_BASE_URL: 'https://backtester.alphagardeners.xyz/api',
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000,
        REQUEST_DELAY: 2000, // Conservative delay between requests
        
        // Analysis Settings
        DEFAULT_SIGNALS_PER_TOKEN: 3,
        DEFAULT_BUFFER_PERCENT: 10,
        DEFAULT_OUTLIER_METHOD: 'iqr',
        MIN_CLUSTER_SIZE: 3,
        MAX_CLUSTERS: 8,
        
        // Clustering thresholds
        CLUSTERING_THRESHOLDS: [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0, 1.5, 2.0]
    };

    // ========================================
    // 🛠️ UTILITIES & DEPENDENCY MANAGEMENT
    // ========================================
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Wait for AGCopilot to fully load
    async function waitForAGCopilot(timeout = 10000) {
        const startTime = Date.now();
        
        console.log('⏳ Waiting for AGCopilot to load...');
        
        while (Date.now() - startTime < timeout) {
            if (window.burstRateLimiter && 
                window.CONFIG && 
                typeof window.deepClone === 'function' &&
                typeof window.burstRateLimiter.throttle === 'function') {
                console.log('✅ AGCopilot core dependencies detected');
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.error('❌ AGCopilot dependencies not found:');
        console.error('  • burstRateLimiter:', typeof window.burstRateLimiter);
        console.error('  • CONFIG:', typeof window.CONFIG);
        console.error('  • deepClone:', typeof window.deepClone);
        throw new Error('AGCopilot not loaded within timeout period');
    }
    
    // Format utility functions (self-contained, don't depend on AGCopilot)
    function formatTimestamp(timestamp) {
        if (!timestamp) return 'N/A';
        return new Date(timestamp * 1000).toISOString().replace('T', ' ').split('.')[0];
    }

    function formatMcap(mcap) {
        if (!mcap) return 'N/A';
        if (mcap >= 1000000) return `$${(mcap / 1000000).toFixed(2)}M`;
        if (mcap >= 1000) return `$${(mcap / 1000).toFixed(2)}K`;
        return `$${mcap}`;
    }

    function formatPercent(value) {
        if (value === null || value === undefined) return 'N/A';
        return `${value.toFixed(2)}%`;
    }
    
    // deepClone reference (assigned after AGCopilot loads)
    let deepClone;

    // ========================================
    // 🌐 API FUNCTIONS
    // ========================================
    async function fetchWithRetry(url, maxRetries = SIGNAL_CONFIG.MAX_RETRIES) {
        await window.burstRateLimiter.throttle(); // Use the same burst rate limiter as the main optimization
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🌐 API Request (attempt ${attempt}): ${url.substring(0, 80)}...`);
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    }
                });
                
                if (!response.ok) {
                    if (response.status === 429) {
                        console.warn(`⚠️ Rate limit hit (429). Attempt ${attempt}/${maxRetries}. Waiting longer...`);
                        await sleep(SIGNAL_CONFIG.RETRY_DELAY * attempt * 2);
                        continue;
                    }
                    
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log(`✅ API Response successful (attempt ${attempt})`);
                return data;
                
            } catch (error) {
                console.warn(`❌ API Request failed (attempt ${attempt}/${maxRetries}): ${error.message}`);
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                const delay = SIGNAL_CONFIG.RETRY_DELAY * attempt;
                console.log(`⏳ Waiting ${delay}ms before retry...`);
                await sleep(delay);
            }
        }
    }

    // Get token info by search (contract address)
    async function getTokenInfo(contractAddress) {
        // Try multiple search approaches for better token discovery
        const searchUrls = [
            `${SIGNAL_CONFIG.API_BASE_URL}/swaps?search=${contractAddress}&sort=timestamp&direction=desc&page=1&limit=5`,
            `${SIGNAL_CONFIG.API_BASE_URL}/swaps?fromDate=2000-01-01&toDate=9999-12-31&search=${contractAddress}&sort=timestamp&direction=desc&page=1&limit=5`,
            `${SIGNAL_CONFIG.API_BASE_URL}/swaps?search=${contractAddress}&limit=5`
        ];
        
        console.log(`🔍 Searching for token: ${contractAddress.substring(0, 8)}...${contractAddress.substring(-4)}`);
        
        for (let i = 0; i < searchUrls.length; i++) {
            try {
                const data = await fetchWithRetry(searchUrls[i]);
                if (data && data.swaps && data.swaps.length > 0) {
                    const tokenInfo = data.swaps[0];
                    console.log(`✅ Token found via search approach ${i + 1}: ${tokenInfo.token} (${tokenInfo.symbol})`);
                    return tokenInfo;
                }
            } catch (error) {
                console.log(`⚠️ Search approach ${i + 1} failed: ${error.message}`);
            }
        }
        
        throw new Error(`Token not found in any search approach. Token may be too new, unlisted, or CA incorrect.`);
    }

    // Get all swaps for a specific token
    async function getAllTokenSwaps(contractAddress) {
        console.log(`🔄 Fetching swap history for: ${contractAddress.substring(0, 8)}...${contractAddress.substring(-4)}`);
        
        try {
            const url = `${SIGNAL_CONFIG.API_BASE_URL}/swaps?search=${contractAddress}&sort=timestamp&direction=desc&limit=50`;
            const data = await fetchWithRetry(url);
            
            if (!data || !data.swaps || data.swaps.length === 0) {
                console.log(`  ⚠️ No swap history found - token might have no signals or be very new`);
                throw new Error('No swap history found - token may have no signals or be very recent');
            }
            
            console.log(`  ✅ Found ${data.swaps.length} signals for token`);
            return data.swaps;
            
        } catch (error) {
            console.error(`  ❌ Failed to get token swaps: ${error.message}`);
            throw error;
        }
    }

    // ========================================
    // 📊 SIGNAL PROCESSING & CONFIG GENERATION
    // ========================================
    function processTokenData(tokenInfo, swaps) {
        const result = {
            tokenAddress: tokenInfo.tokenAddress,
            tokenName: tokenInfo.token,
            symbol: tokenInfo.symbol,
            currentMcap: window.formatMcap(tokenInfo.currentMcap),
            currentMcapRaw: tokenInfo.currentMcap,
            athMcap: window.formatMcap(tokenInfo.athMcap),
            athMcapRaw: tokenInfo.athMcap,
            athTime: window.formatTimestamp(tokenInfo.athTime),
            atlMcap: window.formatMcap(tokenInfo.atlMcap),
            atlMcapRaw: tokenInfo.atlMcap,
            atlTime: window.formatTimestamp(tokenInfo.atlTime),
            signalMcap: window.formatMcap(tokenInfo.signalMcap),
            signalMcapRaw: tokenInfo.signalMcap,
            athMultiplier: tokenInfo.athMcap && tokenInfo.signalMcap ? 
                (tokenInfo.athMcap / tokenInfo.signalMcap).toFixed(2) + 'x' : 'N/A',
            athMultiplierRaw: tokenInfo.athMcap && tokenInfo.signalMcap ? 
                (tokenInfo.athMcap / tokenInfo.signalMcap) : 0,
            currentFromAth: tokenInfo.athMcap && tokenInfo.currentMcap ? 
                window.formatPercent(((tokenInfo.currentMcap - tokenInfo.athMcap) / tokenInfo.athMcap) * 100) : 'N/A',
            totalSignals: swaps.length,
            firstSignalTime: window.formatTimestamp(swaps[swaps.length - 1]?.timestamp),
            lastSignalTime: window.formatTimestamp(swaps[0]?.timestamp),
            firstSignalMcap: window.formatMcap(swaps[swaps.length - 1]?.signalMcap),
            lastSignalMcap: window.formatMcap(swaps[0]?.signalMcap),
            avgWinPred: swaps.length > 0 ? 
                window.formatPercent(swaps.reduce((sum, swap) => sum + (swap.winPredPercent || 0), 0) / swaps.length) : 'N/A',
            maxWinPred: swaps.length > 0 ? 
                window.formatPercent(Math.max(...swaps.map(swap => swap.winPredPercent || 0))) : 'N/A',
            minWinPred: swaps.length > 0 ? 
                window.formatPercent(Math.min(...swaps.map(swap => swap.winPredPercent || 0))) : 'N/A',
            triggerModes: [...new Set(swaps.map(swap => swap.triggerMode))].join(', '),
            latestCriteria: tokenInfo.criteria
        };
        
        return result;
    }

    function generateBatchSummary(allTokenData) {
        const summary = {
            totalTokens: allTokenData.length,
            totalSignals: allTokenData.reduce((sum, token) => sum + token.processed.totalSignals, 0),
            avgSignalsPerToken: 0,
            topPerformers: [],
            avgWinPred: 0,
            athMultipliers: []
        };
        
        if (allTokenData.length > 0) {
            summary.avgSignalsPerToken = (summary.totalSignals / allTokenData.length).toFixed(1);
            
            // Calculate average win prediction
            const allWinPreds = allTokenData
                .flatMap(token => token.swaps.map(swap => swap.winPredPercent || 0))
                .filter(pred => pred > 0);
            
            if (allWinPreds.length > 0) {
                summary.avgWinPred = window.formatPercent(allWinPreds.reduce((sum, pred) => sum + pred, 0) / allWinPreds.length);
            }
            
            // Get ATH multipliers
            summary.athMultipliers = allTokenData
                .map(token => token.processed.athMultiplierRaw)
                .filter(mult => mult > 0)
                .sort((a, b) => b - a);
            
            // Identify top performers (highest ATH multipliers)
            summary.topPerformers = allTokenData
                .filter(token => token.processed.athMultiplierRaw > 1)
                .sort((a, b) => b.processed.athMultiplierRaw - a.processed.athMultiplierRaw)
                .slice(0, 5)
                .map(token => ({
                    symbol: token.processed.symbol,
                    athMultiplier: token.processed.athMultiplier
                }));
        }
        
        return summary;
    }

    // ========================================
    // 🎯 SIGNAL CLUSTERING FUNCTIONS
    // ========================================
    
    // Get all numeric parameters that are present in the backtester
    function getClusteringParameters() {
        return [
            'signalMcap', 'agScore', 'tokenAge', 'deployerAge', 'deployerBalance',
            'uniqueCount', 'kycCount', 'dormantCount', 'liquidity', 'liquidityPct', 'buyVolumePct',
            'bundledPct', 'drainedPct', 'volMcapPct', 'winPredPercent', 'ttc'
        ];
    }
    
    // Normalize signal parameters to 0-1 scale for distance calculation
    function normalizeSignals(signals) {
        const parameters = getClusteringParameters();
        const normalizedSignals = [];
        const ranges = {};
        
        // Calculate min/max for each parameter
        parameters.forEach(param => {
            const values = signals.map(s => s[param]).filter(v => v !== null && v !== undefined && !isNaN(v));
            if (values.length > 0) {
                ranges[param] = { min: Math.min(...values), max: Math.max(...values) };
            }
        });
        
        // Normalize each signal
        signals.forEach(signal => {
            const normalized = {};
            parameters.forEach(param => {
                const value = signal[param];
                if (ranges[param] && value !== null && value !== undefined && !isNaN(value)) {
                    const range = ranges[param].max - ranges[param].min;
                    normalized[param] = range === 0 ? 0 : (value - ranges[param].min) / range;
                }
            });
            normalizedSignals.push(normalized);
        });
        
        return { normalizedSignals, ranges };
    }
    
    // Calculate Euclidean distance between two normalized signals
    function calculateSignalDistance(signal1, signal2) {
        const parameters = getClusteringParameters();
        let sumSquaredDiffs = 0;
        let validParams = 0;
        
        parameters.forEach(param => {
            const val1 = signal1[param];
            const val2 = signal2[param];
            if (val1 !== undefined && val2 !== undefined && !isNaN(val1) && !isNaN(val2)) {
                sumSquaredDiffs += Math.pow(val1 - val2, 2);
                validParams++;
            }
        });
        
        if (validParams === 0) return Infinity;
        return Math.sqrt(sumSquaredDiffs);
    }
    
    // Find clusters using distance threshold approach
    function findSignalClusters(signals, tokenData, minClusterTokens) {
        if (signals.length < 4) return []; // Need at least 4 signals for meaningful clustering
        
        console.log(`🔍 Clustering ${signals.length} signals from ${tokenData.length} tokens, min tokens per cluster: ${minClusterTokens}`);
        
        // Create a mapping from signal to token address
        const signalToToken = new Map();
        let signalIndex = 0;
        tokenData.forEach(token => {
            token.swaps.forEach(swap => {
                signalToToken.set(signalIndex, token.processed.tokenAddress);
                signalIndex++;
            });
        });
        
        const { normalizedSignals } = normalizeSignals(signals);
        const clusters = [];
        const usedSignals = new Set();
        
        // Try different distance thresholds to find good clusters
        const thresholds = SIGNAL_CONFIG.CLUSTERING_THRESHOLDS;
        
        for (const threshold of thresholds) {
            for (let i = 0; i < normalizedSignals.length; i++) {
                if (usedSignals.has(i)) continue;
                
                const cluster = {
                    signals: [i],
                    tokens: new Set([signalToToken.get(i)]),
                    threshold: threshold,
                    avgDistance: 0
                };
                
                // Find similar signals within threshold
                for (let j = i + 1; j < normalizedSignals.length; j++) {
                    if (usedSignals.has(j)) continue;
                    
                    const distance = calculateSignalDistance(normalizedSignals[i], normalizedSignals[j]);
                    if (distance <= threshold) {
                        cluster.signals.push(j);
                        cluster.tokens.add(signalToToken.get(j));
                    }
                }
                
                // Calculate average distance within cluster
                if (cluster.signals.length > 1) {
                    let totalDistance = 0;
                    let pairCount = 0;
                    for (let a = 0; a < cluster.signals.length; a++) {
                        for (let b = a + 1; b < cluster.signals.length; b++) {
                            totalDistance += calculateSignalDistance(
                                normalizedSignals[cluster.signals[a]], 
                                normalizedSignals[cluster.signals[b]]
                            );
                            pairCount++;
                        }
                    }
                    cluster.avgDistance = pairCount > 0 ? totalDistance / pairCount : 0;
                }
                
                // Accept cluster if it meets criteria
                if (cluster.tokens.size >= minClusterTokens && cluster.signals.length >= SIGNAL_CONFIG.MIN_CLUSTER_SIZE) {
                    clusters.push(cluster);
                    cluster.signals.forEach(idx => usedSignals.add(idx));
                    
                    console.log(`✅ Found cluster: ${cluster.signals.length} signals, ${cluster.tokens.size} tokens, threshold: ${threshold}, avgDist: ${cluster.avgDistance.toFixed(3)}`);
                    
                    if (clusters.length >= SIGNAL_CONFIG.MAX_CLUSTERS) break;
                }
            }
            
            if (clusters.length >= SIGNAL_CONFIG.MAX_CLUSTERS) break;
        }
        
        // Remove overlapping clusters (prefer larger, tighter clusters)
        const finalClusters = [];
        const globalUsed = new Set();
        
        // Sort by tightness (lower avgDistance = tighter) then by token diversity
        clusters.sort((a, b) => {
            const tightnessDiff = a.avgDistance - b.avgDistance;
            return tightnessDiff !== 0 ? tightnessDiff : b.tokens.size - a.tokens.size;
        });
        
        clusters.forEach(cluster => {
            const hasOverlap = cluster.signals.some(idx => globalUsed.has(idx));
            if (!hasOverlap) {
                finalClusters.push(cluster);
                cluster.signals.forEach(idx => globalUsed.add(idx));
            }
        });
        
        return finalClusters;
    }

    // Analyze all signals to find optimal parameter bounds
    function analyzeSignalCriteria(allTokenData, bufferPercent = 10, outlierMethod = 'none', useClustering = true) {
        console.log(`\n🔬 === STARTING SIGNAL CRITERIA ANALYSIS ===`);
        console.log(`Input: ${allTokenData.length} tokens, Buffer: ${bufferPercent}%, Outlier method: ${outlierMethod}, Clustering: ${useClustering}`);
        
        const allSignals = [];
        
        // Collect all signals from all tokens with detailed logging
        allTokenData.forEach((tokenData, tokenIndex) => {
            if (!tokenData.swaps || !Array.isArray(tokenData.swaps)) {
                console.warn(`⚠️ Token ${tokenIndex + 1} has no swaps array:`, tokenData.processed?.tokenName || 'Unknown');
                return;
            }
            
            tokenData.swaps.forEach((swap, swapIndex) => {
                if (!swap || typeof swap !== 'object') {
                    console.warn(`⚠️ Invalid swap ${swapIndex + 1} for token ${tokenIndex + 1}:`, swap);
                    return;
                }
                
                // Flatten criteria fields onto the swap object for easier access
                const flattenedSwap = {
                    ...swap,
                    ...(swap.criteria || {}), // Spread criteria fields to top level
                    _tokenAddress: tokenData.processed?.tokenAddress,
                    _tokenName: tokenData.processed?.tokenName
                };
                
                allSignals.push(flattenedSwap);
            });
        });
        
        console.log(`🔢 Total signals collected: ${allSignals.length}`);
        
        if (allSignals.length === 0) {
            updateSignalStatus('No signals found to analyze', true);
            return null;
        }
        
        // Log signal overview
        console.log(`📈 Signal overview:`);
        console.log(`  • Signals per token: ${(allSignals.length / allTokenData.length).toFixed(1)} avg`);
        console.log(`  • Unique tokens: ${new Set(allSignals.map(s => s._tokenAddress)).size}`);
        console.log(`  • AG Scores range: ${Math.min(...allSignals.map(s => s.agScore || 0))} - ${Math.max(...allSignals.map(s => s.agScore || 0))}`);
        console.log(`  • MCAP range: $${Math.min(...allSignals.map(s => s.signalMcap || 0))} - $${Math.max(...allSignals.map(s => s.signalMcap || 0))}`);
        
        
        // 🎯 CLUSTERING LOGIC - Enhanced for better token retention
        if (useClustering && allSignals.length >= 4) {
            const minClusterTokens = Math.max(2, Math.floor(allTokenData.length * 0.25)); // At least 25% of tokens per cluster, minimum 2
            const clusters = findSignalClusters(allSignals, allTokenData, minClusterTokens);
            
            if (clusters.length > 0) {
                console.log(`\n🎯 === CLUSTERING RESULTS ===`);
                console.log(`Found ${clusters.length} clusters meeting criteria (min ${minClusterTokens} tokens each):`);
                
                const clusterAnalyses = clusters.map((cluster, index) => {
                    const clusterSignals = cluster.signals.map(idx => allSignals[idx]);
                    console.log(`\n📊 Cluster ${index + 1}:`);
                    console.log(`  • ${cluster.signals.length} signals from ${cluster.tokens.size} tokens`);
                    console.log(`  • Average distance: ${cluster.avgDistance.toFixed(3)} (threshold: ${cluster.threshold})`);
                    console.log(`  • Token diversity: ${((cluster.tokens.size / allTokenData.length) * 100).toFixed(1)}% of total tokens`);
                    
                    const analysis = generateClusterAnalysis(clusterSignals, bufferPercent, outlierMethod);
                    analysis.clusterInfo = {
                        id: `cluster_${index}`,
                        signalCount: cluster.signals.length,
                        tokenCount: cluster.tokens.size,
                        avgDistance: cluster.avgDistance,
                        threshold: cluster.threshold,
                        tokens: Array.from(cluster.tokens)
                    };
                    
                    return analysis;
                });
                
                // Also generate fallback analysis for comparison
                const fallbackAnalysis = generateFullAnalysis(allSignals, bufferPercent, outlierMethod, allTokenData.length);
                
                return {
                    type: 'clustered',
                    clusters: clusterAnalyses,
                    fallback: fallbackAnalysis,
                    usedClustering: true
                };
            } else {
                console.log(`⚠️ No clusters found meeting criteria (min ${minClusterTokens} tokens per cluster)`);
                console.log(`📊 Falling back to standard analysis using all ${allSignals.length} signals`);
            }
        }
        
        // Fallback to standard analysis (or if clustering disabled/failed)
        console.log(`📊 Using standard analysis for all ${allSignals.length} signals from ${allTokenData.length} tokens`);
        const standardAnalysis = generateFullAnalysis(allSignals, bufferPercent, outlierMethod, allTokenData.length);
        return {
            type: 'standard',
            analysis: standardAnalysis,
            usedClustering: false
        };
    }
    
    // Generate full analysis from all signals (original logic)
    function generateFullAnalysis(allSignals, bufferPercent, outlierMethod, tokenCount = 0) {
        const analysis = generateAnalysisFromSignals(allSignals, bufferPercent, outlierMethod);
        analysis.tokenCount = tokenCount; // Add token count to the analysis
        return analysis;
    }

    // ========================================
    // 🎨 UI FUNCTIONS
    // ========================================
    
    // Get selected outlier filtering method
    function getSignalOutlierFilterMethod() {
        const methods = ['none', 'iqr', 'percentile', 'zscore'];
        for (const method of methods) {
            const radio = document.getElementById(`signal-outlier-${method}`);
            if (radio && radio.checked) {
                return method;
            }
        }
        return SIGNAL_CONFIG.DEFAULT_OUTLIER_METHOD;
    }
    
    // Update signal analysis status
    function updateSignalStatus(message, isError = false) {
        const statusArea = document.getElementById('signal-analysis-results');
        if (statusArea) {
            statusArea.style.display = 'block';
            const timestamp = new Date().toLocaleTimeString();
            const icon = isError ? '❌' : '📝';
            const color = isError ? '#ff6b6b' : '#ffffff';
            
            statusArea.innerHTML += `<div style="color: ${color}; margin: 2px 0;">
                <span style="opacity: 0.7;">${timestamp}</span> ${icon} ${message}
            </div>`;
            statusArea.scrollTop = statusArea.scrollHeight;
        }
        
        // Also log to console for debugging
        const logMethod = isError ? 'warn' : 'log';
        console[logMethod](`Signal Analysis: ${message}`);
    }
    
    // Create cluster selection UI
    function createClusterSelectionUI(clusters, fallbackAnalysis) {
        const clusterSection = document.getElementById('cluster-selection');
        const clusterButtonsContainer = document.getElementById('cluster-buttons');
        
        if (!clusterSection || !clusterButtonsContainer) return;
        
        // Clear existing buttons
        clusterButtonsContainer.innerHTML = '';
        
        // Create button style
        const buttonStyle = `
            padding: 4px 8px; 
            margin: 2px; 
            border: 1px solid #4ECDC4; 
            border-radius: 3px; 
            background: rgba(78, 205, 196, 0.1); 
            color: #4ECDC4; 
            font-size: 9px; 
            cursor: pointer;
            transition: all 0.2s;
        `;
        
        const activeButtonStyle = `
            padding: 4px 8px; 
            margin: 2px; 
            border: 1px solid #FF6B6B; 
            border-radius: 3px; 
            background: rgba(255, 107, 107, 0.2); 
            color: #FF6B6B; 
            font-size: 9px; 
            cursor: pointer;
            font-weight: bold;
        `;
        
        // Add cluster buttons
        clusters.forEach((cluster, index) => {
            const button = document.createElement('button');
            button.innerHTML = `${cluster.name} (${cluster.tokenCount} CAs)`;
            button.style.cssText = index === 0 ? activeButtonStyle : buttonStyle;
            button.onclick = () => selectClusterConfig(cluster.id, clusters, fallbackAnalysis);
            clusterButtonsContainer.appendChild(button);
        });

        // Add fallback button (only if fallback analysis is available)
        if (fallbackAnalysis) {
            const fallbackButton = document.createElement('button');
            fallbackButton.innerHTML = `All Signals (${fallbackAnalysis.tokenCount || 0} CAs)`;
            fallbackButton.style.cssText = buttonStyle;
            fallbackButton.onclick = () => selectClusterConfig('fallback', clusters, fallbackAnalysis);
            clusterButtonsContainer.appendChild(fallbackButton);
        }
        
        // Show the cluster selection section
        clusterSection.style.display = 'block';
    }
    
    // Switch to a different cluster config
    function selectClusterConfig(configId, clusters, fallbackAnalysis) {
        let selectedConfig;
        let selectedCluster = null;

        if (configId === 'fallback') {
            if (fallbackAnalysis) {
                selectedConfig = generateTightestConfig(fallbackAnalysis);
                window.lastGeneratedConfig = selectedConfig;
            } else {
                console.error('❌ Fallback analysis not available');
                updateSignalStatus('❌ Fallback analysis not available', true);
                return;
            }
        } else {
            selectedConfig = window[`clusterConfig_${configId}`];
            window.lastGeneratedConfig = selectedConfig;

            // Find the selected cluster to get the contract addresses
            selectedCluster = clusters.find(cluster => cluster.id === configId);
        }

        // Update button states
        const buttons = document.querySelectorAll('#cluster-buttons button');
        buttons.forEach(btn => {
            if ((configId === 'fallback' && btn.innerHTML.includes('All Signals')) ||
                (configId !== 'fallback' && btn.innerHTML.includes(configId.replace('cluster_', 'Cluster ')))) {
                btn.style.cssText = `
                    padding: 4px 8px; 
                    margin: 2px; 
                    border: 1px solid #FF6B6B; 
                    border-radius: 3px; 
                    background: rgba(255, 107, 107, 0.2); 
                    color: #FF6B6B; 
                    font-size: 9px; 
                    cursor: pointer;
                    font-weight: bold;
                `;
            } else {
                btn.style.cssText = `
                    padding: 4px 8px; 
                    margin: 2px; 
                    border: 1px solid #4ECDC4; 
                    border-radius: 3px; 
                    background: rgba(78, 205, 196, 0.1); 
                    color: #4ECDC4; 
                    font-size: 9px; 
                    cursor: pointer;
                    transition: all 0.2s;
                `;
            }
        });

        // Show config summary
        const configType = configId === 'fallback' ? 'All Signals Config' : `Cluster ${configId.replace('cluster_', '')} Config`;
        updateSignalStatus(`🔄 Switched to: ${configType}`);
        console.log(`\n=== SELECTED: ${configType} ===`);

        // Log contract addresses for the selected cluster
        if (selectedCluster && selectedCluster.tokens) {
            console.log(`📋 Contract Addresses in ${selectedCluster.name}:`);
            selectedCluster.tokens.forEach((address, index) => {
                console.log(`   ${index + 1}. ${address}`);
            });
            console.log(`📊 Total: ${selectedCluster.tokens.length} contract addresses`);
        } else if (configId === 'fallback') {
            // For fallback, show all contract addresses from the original input
            const contractAddresses = document.getElementById('signal-contract-input').value
                .split('\n')
                .map(addr => addr.trim())
                .filter(addr => addr.length > 0);
            console.log(`📋 Contract Addresses in All Signals Config:`);
            contractAddresses.forEach((address, index) => {
                console.log(`   ${index + 1}. ${address}`);
            });
            console.log(`📊 Total: ${contractAddresses.length} contract addresses`);
        }

        if (selectedConfig) {
            console.log(formatConfigForDisplay(selectedConfig));
        } else {
            console.warn('⚠️ No configuration found for selected cluster');
        }
    }

    // ========================================
    // 🚀 MAIN SIGNAL ANALYSIS HANDLER
    // ========================================
    
    // Main signal analysis handler
    async function handleSignalAnalysis() {
        try {
            const contractAddresses = document.getElementById('signal-contract-input').value
                .split('\n')
                .map(addr => addr.trim())
                .filter(addr => addr.length > 0);
            
            if (contractAddresses.length === 0) {
                updateSignalStatus('Please enter at least one contract address', true);
                return;
            }
            
            const signalsPerToken = parseInt(document.getElementById('signals-per-token').value) || SIGNAL_CONFIG.DEFAULT_SIGNALS_PER_TOKEN;
            const bufferInput = document.getElementById('config-buffer');
            const bufferPercent = bufferInput && bufferInput.value !== '' ? parseFloat(bufferInput.value) : SIGNAL_CONFIG.DEFAULT_BUFFER_PERCENT;
            const outlierMethod = getSignalOutlierFilterMethod();
            const clusteringCheckbox = document.getElementById('enable-signal-clustering');
            const useClustering = clusteringCheckbox ? clusteringCheckbox.checked : false;
            const actionsContainer = document.getElementById('generated-config-actions');
            if (actionsContainer) {
                actionsContainer.style.display = 'none';
            }
            
            // Clear previous results
            document.getElementById('signal-analysis-results').innerHTML = '';
            updateSignalStatus(`Starting analysis of ${contractAddresses.length} contract addresses...`);
            
            // Validate contract addresses
            const validAddresses = [];
            const invalidAddresses = [];
            
            contractAddresses.forEach((addr, index) => {
                if (addr.length >= 32 && /^[A-Za-z0-9]+$/.test(addr)) {
                    validAddresses.push(addr);
                } else {
                    invalidAddresses.push({addr, reason: addr.length < 32 ? 'too short' : 'invalid characters'});
                }
            });
            
            if (invalidAddresses.length > 0) {
                updateSignalStatus(`⚠️ Skipping ${invalidAddresses.length} invalid addresses:`, true);
                invalidAddresses.forEach(({addr, reason}) => {
                    updateSignalStatus(`  • ${addr.substring(0, 12)}... (${reason})`, true);
                });
            }
            
            if (validAddresses.length === 0) {
                updateSignalStatus('No valid contract addresses found. Please check format.', true);
                return;
            }
            
            updateSignalStatus(`📝 Processing ${validAddresses.length} valid addresses (${signalsPerToken} signals each)...`);
            
            // Show rate limiter info
            const burstStats = window.burstRateLimiter.getStats();
            updateSignalStatus(`🚦 Using burst rate limiting: ${burstStats.currentBurstSize}/${window.CONFIG.RATE_LIMIT_THRESHOLD} burst, ${window.CONFIG.INTRA_BURST_DELAY}ms delays`);
            
            const allTokenData = [];
            const errors = [];
            
            // Process each token
            for (let i = 0; i < validAddresses.length; i++) {
                const address = validAddresses[i];
                const shortAddr = `${address.substring(0, 6)}...${address.substring(-4)}`;
                updateSignalStatus(`[${i + 1}/${validAddresses.length}] Processing ${shortAddr}...`);
                
                try {
                    // Get token info and swaps with detailed logging
                    console.log(`\n🔍 === Processing Token ${i + 1}/${validAddresses.length}: ${shortAddr} ===`);
                    
                    const tokenInfo = await getTokenInfo(address);
                    console.log(`✅ Token info found: ${tokenInfo.token} (${tokenInfo.symbol})`);
                    
                    const allSwaps = await getAllTokenSwaps(address);
                    console.log(`✅ Found ${allSwaps.length} total swaps`);
                    
                    // Limit swaps per token
                    const limitedSwaps = allSwaps.slice(0, signalsPerToken);
                    console.log(`📊 Using ${limitedSwaps.length} signals (limited from ${allSwaps.length})`);
                    
                    // Process token data
                    const processed = processTokenData(tokenInfo, limitedSwaps);
                    
                    // Validate processed data
                    if (!processed.tokenName || !processed.symbol) {
                        console.warn(`⚠️ Incomplete token data for ${shortAddr}:`, {
                            tokenName: processed.tokenName,
                            symbol: processed.symbol
                        });
                        updateSignalStatus(`⚠️ Incomplete data for ${shortAddr} (${processed.tokenName || 'Unknown'})`, true);
                        errors.push(`${shortAddr}: Incomplete token data`);
                        continue;
                    }
                    
                    // Store token data
                    allTokenData.push({
                        processed: processed,
                        swaps: limitedSwaps,
                        tokenInfo: tokenInfo
                    });
                    
                    updateSignalStatus(`✅ [${i + 1}/${validAddresses.length}] ${processed.symbol} - ${limitedSwaps.length} signals`);
                    
                } catch (error) {
                    console.error(`❌ Token processing failed for ${shortAddr}:`, error);
                    updateSignalStatus(`❌ [${i + 1}/${validAddresses.length}] Failed: ${shortAddr} - ${error.message}`, true);
                    errors.push(`${shortAddr}: ${error.message}`);
                }
            }
            
            // Process results
            if (allTokenData.length === 0) {
                updateSignalStatus('❌ No tokens processed successfully. Check contract addresses and try again.', true);
                return;
            }
            
            updateSignalStatus(`📊 Successfully processed ${allTokenData.length}/${validAddresses.length} tokens`);
            if (errors.length > 0) {
                updateSignalStatus(`⚠️ ${errors.length} errors occurred during processing`, true);
            }
            
            // Generate batch summary
            const summary = generateBatchSummary(allTokenData);
            updateSignalStatus(`📈 Summary: ${summary.totalSignals} total signals, ${summary.avgSignalsPerToken} avg per token`);
            
            // Perform signal analysis with clustering
            console.log(`\n🔬 === STARTING CRITERIA ANALYSIS ===`);
            updateSignalStatus(`🔬 Analyzing signal criteria with ${outlierMethod !== 'none' ? outlierMethod + ' outlier filtering' : 'no outlier filtering'}...`);
            
            const analysisResult = analyzeSignalCriteria(allTokenData, bufferPercent, outlierMethod, useClustering);
            
            if (!analysisResult) {
                updateSignalStatus('❌ Analysis failed - no valid signals found', true);
                return;
            }
            
            // Display results based on analysis type
            if (analysisResult.type === 'clustered') {
                const clusters = analysisResult.clusters || [];
                const fallbackAnalysis = analysisResult.fallbackAnalysis || analysisResult.fallback || null;
                updateSignalStatus(`🎯 Found ${clusters.length} signal clusters${analysisResult.clusteredSignals ? ` (${analysisResult.clusteredSignals}/${analysisResult.totalSignals} signals)` : ''}`);

                if (clusters.length > 0) {
                    const bestCluster = clusters[0];
                    const bestConfig = generateTightestConfig(bestCluster.analysis);
                    window.lastGeneratedConfig = bestConfig;

                    updateSignalStatus(`🏆 Best Cluster: ${bestCluster.name} with ${bestCluster.signalCount} signals (tightness: ${(bestCluster.tightness || 0).toFixed(3)})`);

                    clusters.forEach((cluster, index) => {
                        const generatedConfig = generateTightestConfig(cluster.analysis);
                        const formattedConfig = formatConfigForDisplay(generatedConfig);

                        console.log(`\n=== ${cluster.name} (${cluster.signalCount} signals, tightness: ${(cluster.tightness || 0).toFixed(3)}) ===`);
                        if (cluster.signals) {
                            validateConfigAgainstSignals(generatedConfig, cluster.signals, cluster.name);
                        }
                        console.log(formattedConfig);

                        window[`clusterConfig_${cluster.id}`] = generatedConfig;

                        if (index < 3) {
                            const mcapMin = generatedConfig['Min MCAP (USD)'] || 'N/A';
                            const mcapMax = generatedConfig['Max MCAP (USD)'] || 'N/A';
                            updateSignalStatus(`📊 ${cluster.name}: ${cluster.signalCount} signals, MCAP $${mcapMin} - $${mcapMax}`);
                        }
                    });

                    if (fallbackAnalysis) {
                        const fallbackConfig = generateTightestConfig(fallbackAnalysis);
                        window.fallbackConfig = fallbackConfig;

                        console.log(`\n=== FALLBACK CONFIG (All ${analysisResult.totalSignals || '???'} signals) ===`);
                        const allSignalsArray = [];
                        allTokenData.forEach(tokenData => {
                            tokenData.swaps.forEach(swap => {
                                if (swap) {
                                    // Access fields directly from swap object (not swap.criteria)
                                    allSignalsArray.push({
                                        signalMcap: swap.signalMcap,
                                        agScore: swap.agScore,
                                        tokenAge: swap.tokenAge,
                                        deployerAge: swap.deployerAge,
                                        deployerBalance: swap.deployerBalance,
                                        uniqueCount: swap.uniqueCount,
                                        kycCount: swap.kycCount,
                                        dormantCount: swap.dormantCount,
                                        liquidity: swap.liquidity,
                                        liquidityPct: swap.liquidityPct,
                                        buyVolumePct: swap.buyVolumePct,
                                        bundledPct: swap.bundledPct,
                                        drainedPct: swap.drainedPct,
                                        volMcapPct: swap.volMcapPct,
                                        winPredPercent: swap.winPredPercent,
                                        ttc: swap.ttc,
                                        athMultiplier: swap.athMcap && swap.signalMcap ? (swap.athMcap / swap.signalMcap) : 0
                                    });
                                }
                            });
                        });
                        if (allSignalsArray.length > 0) {
                            validateConfigAgainstSignals(fallbackConfig, allSignalsArray, 'Fallback Config');
                        }
                        console.log(formatConfigForDisplay(fallbackConfig));

                        updateSignalStatus(`📋 Generated ${clusters.length} cluster configs + 1 fallback - details logged to console`);
                        updateSignalStatus(`🎯 Main config set to best cluster: ${bestCluster.name}`);
                        updateSignalStatus('💡 Use Copy button for best cluster config, or check console for all configs');
                    } else {
                        updateSignalStatus(`📋 Generated ${clusters.length} cluster configs - details logged to console`);
                        updateSignalStatus(`🎯 Main config set to best cluster: ${bestCluster.name}`);
                        updateSignalStatus('💡 Use Copy button for best cluster config, or check console for all configs');
                    }

                    createClusterSelectionUI(clusters, fallbackAnalysis);
                    updateSignalStatus('⚠️ Remember to set your Start and End Dates in the Backtester');
                }
            } else {
                const generatedConfig = generateTightestConfig(analysisResult.analysis);
                const formattedConfig = formatConfigForDisplay(generatedConfig);
                console.log('\n' + formattedConfig);
                updateSignalStatus(`📋 Generated config details logged to console`);

                window.lastGeneratedConfig = generatedConfig;

                const summary = generateBatchSummary(allTokenData);
                updateSignalStatus(`✅ Analysis complete! Generated config from ${analysisResult.analysis.totalSignals} signals`);
                updateSignalStatus(`📊 Average MCAP: $${analysisResult.analysis.mcap?.avg || 'N/A'}, Signals/Token: ${summary.avgSignalsPerToken}`);
                updateSignalStatus(`🎯 Config bounds: MCAP $${generatedConfig['Min MCAP (USD)']} - $${generatedConfig['Max MCAP (USD)']}`);
                updateSignalStatus('📋 Config details available - use Copy button or check console');
            }

            if (actionsContainer) {
                actionsContainer.style.display = 'block';
            }
            updateSignalStatus('✅ Signal analysis complete!');
            
        } catch (error) {
            console.error('Signal Analysis Error:', error);
            updateSignalStatus(`❌ Analysis failed: ${error.message}`, true);
            const actionsContainer = document.getElementById('generated-config-actions');
            if (actionsContainer) {
                actionsContainer.style.display = 'none';
            }
        }
    }

    // ========================================
    // 🎮 EVENT HANDLERS & INITIALIZATION
    // ========================================
    
    // 🌐 BROWSER: Store event handlers for cleanup
    const eventHandlers = {
        analyzeSignals: null,
        applyConfig: null,
        copyConfig: null
    };
    
    function setupSignalAnalysisEventHandlers() {
        // Helper function to safely add event listener
        const safeAddEventListener = (elementId, event, handler) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.addEventListener(event, handler);
                return { element, handler };
            }
            return null;
        };

        // Signal analysis button
        eventHandlers.analyzeSignals = safeAddEventListener('analyze-signals-btn', 'click', async () => {
            await handleSignalAnalysis();
        });
        
        if (eventHandlers.analyzeSignals) {
            console.log('✅ Signal analysis event handler attached');
        } else {
            console.warn('⚠️ Signal analysis button not found - may not be in integrated mode');
        }

        // Apply generated config
        eventHandlers.applyConfig = safeAddEventListener('apply-generated-config-btn', 'click', async () => {
            if (window.lastGeneratedConfig && typeof window.applyConfigToBacktester === 'function') {
                await window.applyConfigToBacktester(window.lastGeneratedConfig);
                updateSignalStatus('✅ Generated config applied to backtester!');
            } else {
                updateSignalStatus('❌ No generated config available to apply', true);
            }
        });

        // Copy generated config
        eventHandlers.copyConfig = safeAddEventListener('copy-config-btn', 'click', async () => {
            if (window.lastGeneratedConfig) {
                const formattedConfig = formatConfigForDisplay(window.lastGeneratedConfig);
                try {
                    await navigator.clipboard.writeText(formattedConfig);
                    updateSignalStatus('📋 Config copied to clipboard!');
                } catch (error) {
                    console.error('Failed to copy to clipboard:', error);
                    console.log('\n🎯 GENERATED CONFIG (clipboard copy failed):\n', formattedConfig);
                    updateSignalStatus('📋 Config logged to console (clipboard failed)');
                }
            } else {
                updateSignalStatus('❌ No generated config to copy', true);
            }
        });
        
        return !!eventHandlers.analyzeSignals;
    }
    
    // 🌐 BROWSER: Cleanup function to prevent memory leaks
    function cleanupSignalAnalysisEventHandlers() {
        console.log('🧹 Cleaning up Signal Analysis event listeners...');
        
        // Remove all event listeners
        Object.values(eventHandlers).forEach(handlerInfo => {
            if (handlerInfo && handlerInfo.element && handlerInfo.handler) {
                handlerInfo.element.removeEventListener('click', handlerInfo.handler);
            }
        });
        
        // Clear handlers
        Object.keys(eventHandlers).forEach(key => {
            eventHandlers[key] = null;
        });
        
        console.log('✅ Signal Analysis event listeners cleaned up');
    }
    
    // 🌐 BROWSER: Register cleanup on page unload
    window.addEventListener('beforeunload', cleanupSignalAnalysisEventHandlers);
    
    // Expose cleanup function globally
    window.AGSignalAnalysisCleanup = cleanupSignalAnalysisEventHandlers;

    // Create standalone signal analysis UI (if not in tab)
    function createSignalAnalysisUI() {
        // This would create a standalone UI similar to Base Config Builder
        // Implementation would go here if needed for standalone mode
        console.log('📝 Standalone signal analysis UI creation not implemented yet');
    }

    // Create the Signal Analysis UI in the tab
    function createSignalAnalysisTabUI() {
        const tabContent = document.getElementById('signal-analysis-tab');
        if (!tabContent) {
            console.warn('⚠️ Signal Analysis tab not found');
            return false;
        }

        tabContent.innerHTML = `
            <!-- Contract Input -->
            <div style="margin-bottom: 16px;">
                <label style="
                    font-size: 12px;
                    font-weight: 500;
                    color: #a0aec0;
                    display: block;
                    margin-bottom: 8px;
                ">Contract Addresses (one per line)</label>
                <textarea id="signal-contract-input" placeholder="Enter contract addresses, one per line..." style="
                    width: 100%;
                    height: 80px;
                    padding: 8px 12px;
                    background: #2d3748;
                    border: 1px solid #4a5568;
                    border-radius: 4px;
                    color: #e2e8f0;
                    font-size: 11px;
                    font-family: 'Courier New', monospace;
                    resize: vertical;
                    outline: none;
                    transition: border-color 0.2s;
                    box-sizing: border-box;
                " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'"></textarea>
            </div>

            <!-- Settings Grid -->
            <div style="display: grid; grid-template-columns: auto auto 1fr auto; gap: 12px; align-items: end; margin-bottom: 16px;">
                <div>
                    <label style="
                        font-size: 11px;
                        font-weight: 500;
                        color: #a0aec0;
                        display: block;
                        margin-bottom: 4px;
                    ">Signals/Token</label>
                    <input type="number" id="signals-per-token" value="6" min="1" max="999" style="
                        width: 60px;
                        padding: 6px 8px;
                        background: #2d3748;
                        border: 1px solid #4a5568;
                        border-radius: 4px;
                        color: #e2e8f0;
                        font-size: 11px;
                        text-align: center;
                        outline: none;
                        transition: border-color 0.2s;
                    " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                </div>
                <div>
                    <label style="
                        font-size: 11px;
                        font-weight: 500;
                        color: #a0aec0;
                        display: block;
                        margin-bottom: 4px;
                    ">Buffer %</label>
                    <input type="number" id="config-buffer" value="10" min="0" max="50" style="
                        width: 55px;
                        padding: 6px 8px;
                        background: #2d3748;
                        border: 1px solid #4a5568;
                        border-radius: 4px;
                        color: #e2e8f0;
                        font-size: 11px;
                        text-align: center;
                        outline: none;
                        transition: border-color 0.2s;
                    " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                </div>
                <div style="display: flex; align-items: center; justify-content: center;">
                    <label style="
                        display: flex;
                        align-items: center;
                        cursor: pointer;
                        font-size: 11px;
                        color: #e2e8f0;
                        font-weight: 500;
                    ">
                        <input type="checkbox" id="enable-signal-clustering" checked style="
                            margin-right: 6px;
                            transform: scale(1.0);
                            accent-color: #63b3ed;
                        ">
                        🎯 Clustering
                    </label>
                </div>
                <button id="analyze-signals-btn" style="
                    padding: 8px 16px;
                    background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
                    border: none;
                    border-radius: 4px;
                    color: white;
                    font-weight: 500;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s;
                " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                    🔍 Analyze
                </button>
            </div>
            
            <!-- Outlier Filtering -->
            <div style="margin-bottom: 16px;">
                <label style="
                    font-size: 12px;
                    font-weight: 500;
                    color: #a0aec0;
                    display: block;
                    margin-bottom: 8px;
                ">Outlier Filter</label>
                <div style="
                    background: #2d3748;
                    border: 1px solid #4a5568;
                    border-radius: 4px;
                    padding: 8px;
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 8px;
                ">
                    <label style="
                        display: flex;
                        align-items: center;
                        cursor: pointer;
                        font-size: 11px;
                        color: #e2e8f0;
                        padding: 4px;
                        border-radius: 3px;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='#4a5568'" onmouseout="this.style.background='transparent'">
                        <input type="radio" name="signal-outlier-filter" id="signal-outlier-none" value="none" style="
                            margin-right: 4px;
                            accent-color: #63b3ed;
                        ">
                        <span>None</span>
                    </label>
                    <label style="
                        display: flex;
                        align-items: center;
                        cursor: pointer;
                        font-size: 11px;
                        color: #e2e8f0;
                        padding: 4px;
                        border-radius: 3px;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='#4a5568'" onmouseout="this.style.background='transparent'">
                        <input type="radio" name="signal-outlier-filter" id="signal-outlier-iqr" value="iqr" checked style="
                            margin-right: 4px;
                            accent-color: #63b3ed;
                        ">
                        <span>IQR</span>
                    </label>
                    <label style="
                        display: flex;
                        align-items: center;
                        cursor: pointer;
                        font-size: 11px;
                        color: #e2e8f0;
                        padding: 4px;
                        border-radius: 3px;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='#4a5568'" onmouseout="this.style.background='transparent'">
                        <input type="radio" name="signal-outlier-filter" id="signal-outlier-percentile" value="percentile" style="
                            margin-right: 4px;
                            accent-color: #63b3ed;
                        ">
                        <span>Percentile</span>
                    </label>
                    <label style="
                        display: flex;
                        align-items: center;
                        cursor: pointer;
                        font-size: 11px;
                        color: #e2e8f0;
                        padding: 4px;
                        border-radius: 3px;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='#4a5568'" onmouseout="this.style.background='transparent'">
                        <input type="radio" name="signal-outlier-filter" id="signal-outlier-zscore" value="zscore" style="
                            margin-right: 4px;
                            accent-color: #63b3ed;
                        ">
                        <span>Z-Score</span>
                    </label>
                </div>
            </div>
            
            <!-- Analysis Results -->
            <div id="signal-analysis-results" style="
                background: #2d3748;
                border: 1px solid #4a5568;
                border-radius: 6px;
                padding: 12px;
                font-size: 12px;
                min-height: 60px;
                max-height: 150px;
                overflow-y: auto;
                display: none;
                scrollbar-width: thin;
                scrollbar-color: #4a5568 transparent;
            ">
                <div style="color: #a0aec0;">Analysis results will appear here...</div>
            </div>
            
            <!-- Cluster Selection Section -->
            <div id="cluster-selection" style="margin-top: 16px; display: none;">
                <div style="
                    font-size: 12px;
                    font-weight: 600;
                    margin-bottom: 8px;
                    color: #63b3ed;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                ">
                    🎯 Select Config
                </div>
                <div id="cluster-buttons" style="margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 6px;">
                    <!-- Cluster buttons will be added dynamically -->
                </div>
            </div>
            
            <!-- Generated Config Actions -->
            <div id="generated-config-actions" style="margin-top: 16px; display: none;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <button id="apply-generated-config-btn" style="
                        padding: 10px 8px;
                        background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%);
                        border: none;
                        border-radius: 4px;
                        color: white;
                        font-size: 11px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: all 0.2s;
                    " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                        ⚙️ Apply
                    </button>
                    <button id="copy-config-btn" style="
                        padding: 10px 8px;
                        background: linear-gradient(135deg, #9f7aea 0%, #805ad5 100%);
                        border: none;
                        border-radius: 4px;
                        color: white;
                        font-size: 11px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: all 0.2s;
                    " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                        📋 Copy
                    </button>
                </div>
            </div>
        `;

        console.log('✅ Signal Analysis UI created in tab');
        return true;
    }

    // Initialize Signal Analysis with retry mechanism
    console.log('🔧 Initializing Signal Analysis...');
    
    async function initializeWithRetry(maxRetries = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Wait for AGCopilot to load before initializing
                await waitForAGCopilot();
                
                // Assign AGCopilot's deepClone function
                deepClone = window.deepClone;
                
                console.log('✅ AGCopilot dependencies loaded successfully');
                
                // Check if we're in tab mode or standalone
                if (isInTab) {
                    // Create UI in the tab
                    const uiCreated = createSignalAnalysisTabUI();
                    if (!uiCreated) {
                        throw new Error('Failed to create Signal Analysis UI in tab');
                    }
                    
                    const success = setupSignalAnalysisEventHandlers();
                    if (success) {
                        console.log('✅ Signal Analysis initialized successfully in AGCopilot tab!');
                        console.log('🎯 Purpose: Analyze token signals and generate optimal configurations');
                        console.log('📋 Features: Clustering, outlier filtering, config generation');
                        return;
                    } else {
                        throw new Error('Failed to setup event handlers for tab integration');
                    }
                } else {
                    // Standalone mode
                    createSignalAnalysisUI();
                    setupSignalAnalysisEventHandlers();
                    console.log('✅ Signal Analysis initialized successfully in standalone mode!');
                    return;
                }
                
            } catch (error) {
                if (attempt < maxRetries) {
                    console.log(`⏳ Attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`);
                    await sleep(delay);
                    delay *= 1.5; // Exponential backoff
                } else {
                    console.error('❌ Signal Analysis initialization failed after all retries:', error);
                    alert(`Signal Analysis Error: ${error.message}\n\nPlease ensure AGCopilot.js is loaded first and has fully initialized.`);
                }
            }
        }
    }
    
    // ========================================
    //  SIGNAL PROCESSING & CONFIG GENERATION
    // ========================================
    function processTokenData(tokenInfo, swaps) {
        const result = {
            // Basic token info
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
            // Performance metrics
            signalMcap: formatMcap(tokenInfo.signalMcap),
            signalMcapRaw: tokenInfo.signalMcap,
            athMultiplier: tokenInfo.athMcap && tokenInfo.signalMcap ? 
                (tokenInfo.athMcap / tokenInfo.signalMcap).toFixed(2) + 'x' : 'N/A',
            athMultiplierRaw: tokenInfo.athMcap && tokenInfo.signalMcap ? 
                (tokenInfo.athMcap / tokenInfo.signalMcap) : 0,
            currentFromAth: tokenInfo.athMcap && tokenInfo.currentMcap ? 
                formatPercent(((tokenInfo.currentMcap - tokenInfo.athMcap) / tokenInfo.athMcap) * 100) : 'N/A',
            // Signal statistics
            totalSignals: swaps.length,
            firstSignalTime: formatTimestamp(swaps[swaps.length - 1]?.timestamp),
            lastSignalTime: formatTimestamp(swaps[0]?.timestamp),
            firstSignalMcap: formatMcap(swaps[swaps.length - 1]?.signalMcap),
            lastSignalMcap: formatMcap(swaps[0]?.signalMcap),
            // Analysis metrics
            avgWinPred: swaps.length > 0 ? 
                formatPercent(swaps.reduce((sum, swap) => sum + (swap.winPredPercent || 0), 0) / swaps.length) : 'N/A',
            maxWinPred: swaps.length > 0 ? 
                formatPercent(Math.max(...swaps.map(swap => swap.winPredPercent || 0))) : 'N/A',
            minWinPred: swaps.length > 0 ? 
                formatPercent(Math.min(...swaps.map(swap => swap.winPredPercent || 0))) : 'N/A',
            // Trigger mode information
            triggerModes: [...new Set(swaps.map(swap => swap.triggerMode))].join(', '),
            // Latest criteria (for config generation)
            latestCriteria: tokenInfo.criteria
        };
        
        return result;
    }

    function generateBatchSummary(allTokenData) {
        const summary = {
            totalTokens: allTokenData.length,
            totalSignals: allTokenData.reduce((sum, token) => sum + token.processed.totalSignals, 0),
            avgSignalsPerToken: 0,
            topPerformers: [],
            avgWinPred: 0,
            athMultipliers: []
        };
        
        if (allTokenData.length > 0) {
            summary.avgSignalsPerToken = (summary.totalSignals / allTokenData.length).toFixed(1);
            
            // Get ATH multipliers for analysis
            summary.athMultipliers = allTokenData
                .map(token => token.processed.athMultiplierRaw)
                .filter(mult => mult > 0)
                .sort((a, b) => b - a);
            
            // Calculate average win prediction
            const allWinPreds = [];
            allTokenData.forEach(token => {
                if (token.swaps) {
                    token.swaps.forEach(swap => {
                        if (swap.winPredPercent) {
                            allWinPreds.push(swap.winPredPercent);
                        }
                    });
                }
            });
            
            if (allWinPreds.length > 0) {
                summary.avgWinPred = formatPercent(allWinPreds.reduce((sum, pred) => sum + pred, 0) / allWinPreds.length);
            } else {
                summary.avgWinPred = 'N/A';
            }
        }
        
        return summary;
    }

    // Outlier filtering functions
    function removeOutliers(values, method = 'none') {
        if (!values || values.length === 0) return [];
        if (method === 'none') return values;
        
        const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
        if (validValues.length < 4) return validValues; // Need at least 4 values for meaningful outlier detection
        
        const sorted = [...validValues].sort((a, b) => a - b);
        
        switch (method) {
            case 'iqr':
                const q1Index = Math.floor(sorted.length * 0.25);
                const q3Index = Math.floor(sorted.length * 0.75);
                const q1 = sorted[q1Index];
                const q3 = sorted[q3Index];
                const iqr = q3 - q1;
                const lowerBound = q1 - 1.5 * iqr;
                const upperBound = q3 + 1.5 * iqr;
                return validValues.filter(v => v >= lowerBound && v <= upperBound);
                
            case 'percentile':
                const p5Index = Math.floor(sorted.length * 0.05);
                const p95Index = Math.floor(sorted.length * 0.95);
                const lowerBoundP = sorted[p5Index];
                const upperBoundP = sorted[p95Index];
                return validValues.filter(v => v >= lowerBoundP && v <= upperBoundP);
                
            case 'zscore':
                const mean = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
                const variance = sorted.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / sorted.length;
                const stdDev = Math.sqrt(variance);
                const threshold = 2; // 2 standard deviations
                return validValues.filter(v => Math.abs((v - mean) / stdDev) <= threshold);
                
            default:
                return validValues;
        }
    }

    // ========================================
    // 🎯 SIGNAL CLUSTERING FUNCTIONS
    // ========================================
    
    // Get all numeric parameters that are present in the backtester
    function getClusteringParameters() {
        return [
            'signalMcap', 'agScore', 'tokenAge', 'deployerAge', 'deployerBalance',
            'uniqueCount', 'kycCount', 'dormantCount', 'liquidity', 'liquidityPct', 'buyVolumePct',
            'bundledPct', 'drainedPct', 'volMcapPct', 'winPredPercent', 'ttc'
        ];
    }
    
    // Normalize signal parameters to 0-1 scale for distance calculation
    function normalizeSignals(signals) {
        const parameters = getClusteringParameters();
        const normalizedSignals = [];
        const ranges = {};
        
        // Calculate min/max for each parameter
        parameters.forEach(param => {
            const values = signals.map(s => s[param]).filter(v => v !== null && v !== undefined && !isNaN(v));
            if (values.length > 0) {
                ranges[param] = { min: Math.min(...values), max: Math.max(...values) };
            }
        });
        
        // Normalize each signal
        signals.forEach(signal => {
            const normalized = {};
            parameters.forEach(param => {
                if (ranges[param] && signal[param] !== null && signal[param] !== undefined) {
                    const range = ranges[param].max - ranges[param].min;
                    normalized[param] = range > 0 ? (signal[param] - ranges[param].min) / range : 0;
                } else {
                    normalized[param] = 0;
                }
            });
            normalizedSignals.push(normalized);
        });
        
        return { normalizedSignals, ranges };
    }
    
    // Calculate Euclidean distance between two normalized signals
    function calculateSignalDistance(signal1, signal2) {
        const parameters = getClusteringParameters();
        let sumSquaredDiffs = 0;
        let validParams = 0;
        
        parameters.forEach(param => {
            if (signal1[param] !== undefined && signal2[param] !== undefined) {
                const diff = signal1[param] - signal2[param];
                sumSquaredDiffs += diff * diff;
                validParams++;
            }
        });
        
        if (validParams === 0) return Infinity;
        return Math.sqrt(sumSquaredDiffs);
    }

    // ========================================
    // 📈 CONFIGURATION GENERATION
    // ========================================
    
    // Core analysis logic that works with any signal set
    function generateAnalysisFromSignals(signals, bufferPercent, outlierMethod) {
        const applyBuffer = (value, isMin = true, isPercent = false) => {            
            if (value === null || value === undefined) return null;
            
            const multiplier = isMin ? (1 - bufferPercent / 100) : (1 + bufferPercent / 100);
            let result = value * multiplier;
            
            // Ensure bounds stay within realistic ranges
            if (isPercent) {
                result = Math.max(0, Math.min(100, result));
            } else if (result < 0) {
                result = 0;
            }
            
            return Math.round(result * 100) / 100; // Round to 2 decimal places
        };
        
        // Helper function to get valid values with outlier filtering
        const getValidValues = (field) => {
            const rawValues = signals
                .map(signal => signal[field])
                .filter(val => val !== null && val !== undefined && !isNaN(val));
            
            return removeOutliers(rawValues, outlierMethod);
        };
        
        // Analyze each parameter
        const analysis = {
            totalSignals: signals.length,
            bufferPercent: bufferPercent,
            outlierMethod: outlierMethod,
            
            // MCAP Analysis (expecting low values under 20k)
            mcap: (() => {
                const rawMcaps = signals.map(s => s.signalMcap).filter(m => m && m > 0);
                const mcaps = removeOutliers(rawMcaps, outlierMethod);
                
                if (mcaps.length === 0) return { 
                    min: 0, max: 20000, avg: 0, count: 0, 
                    originalCount: rawMcaps.length, filteredCount: 0, outlierMethod 
                };
                
                const rawMin = Math.min(...mcaps);
                const rawMax = Math.max(...mcaps);
                const avg = mcaps.reduce((sum, m) => sum + m, 0) / mcaps.length;
                
                // Sort MCaps to find a reasonable tightest max (75th percentile)
                const sortedMcaps = [...mcaps].sort((a, b) => a - b);
                const percentile75Index = Math.floor(sortedMcaps.length * 0.75);
                const tightestMax = sortedMcaps[percentile75Index] || rawMax;
                
                // Apply buffer to make ranges INCLUSIVE (min lower, max higher)
                const bufferedMin = Math.round(applyBuffer(rawMin, true)); // Decrease min for inclusivity
                const bufferedMax = Math.round(applyBuffer(rawMax, false)); // Increase max for inclusivity
                const bufferedTightestMax = Math.round(applyBuffer(tightestMax, false)); // Increase 75th percentile
                
                return {
                    min: bufferedMin,
                    max: bufferedMax,
                    avg: Math.round(avg),
                    count: mcaps.length,
                    originalCount: rawMcaps.length,
                    filteredCount: mcaps.length,
                    outliersRemoved: rawMcaps.length - mcaps.length,
                    tightestMax: bufferedTightestMax,
                    outlierMethod: outlierMethod
                };
            })(),
            
            // AG Score Analysis
            agScore: (() => {
                const scores = getValidValues('agScore');
                if (scores.length === 0) return { min: 0, max: 10, avg: 0, count: 0 };
                
                const rawMin = Math.min(...scores);
                const rawMax = Math.max(...scores);
                const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
                
                // Apply buffer to make ranges INCLUSIVE
                const bufferedMin = Math.round(applyBuffer(rawMin, true)); // Decrease min
                const bufferedMax = Math.round(applyBuffer(rawMax, false)); // Increase max
                
                return {
                    min: bufferedMin,
                    max: bufferedMax,
                    avg: Math.round(avg),
                    count: scores.length
                };
            })(),
            
            // Token Age Analysis (keep in seconds - don't convert to minutes)
            tokenAge: (() => {
                const ages = getValidValues('tokenAge');
                if (ages.length === 0) return { min: 0, max: 2592000, avg: 0, count: 0 };
                
                // Keep values in seconds (API returns seconds, UI expects seconds)
                const rawMin = Math.min(...ages);
                const rawMax = Math.max(...ages);
                const avg = ages.reduce((sum, a) => sum + a, 0) / ages.length;
                
                // Apply buffer to make ranges INCLUSIVE
                const bufferedMin = Math.round(applyBuffer(rawMin, true)); // Decrease min
                const bufferedMax = Math.round(applyBuffer(rawMax, false)); // Increase max
                
                return {
                    min: bufferedMin,
                    max: bufferedMax,
                    avg: Math.round(avg),
                    count: ages.length
                };
            })(),
            
            // Deployer Age Analysis (convert from seconds to minutes for Deployer Age field)
            deployerAge: (() => {
                const ages = getValidValues('deployerAge');
                if (ages.length === 0) return { min: 0, max: 10080, avg: 0, count: 0 }; // Default max 7 days in minutes
                
                // Convert from seconds to minutes (API returns seconds, Deployer Age UI expects minutes)
                const agesInMinutes = ages.map(ageInSeconds => ageInSeconds / 60);
                
                const rawMin = Math.min(...agesInMinutes);
                const rawMax = Math.max(...agesInMinutes);
                const avg = agesInMinutes.reduce((sum, a) => sum + a, 0) / agesInMinutes.length;
                
                // Apply buffer to make ranges INCLUSIVE
                const bufferedMin = Math.round(applyBuffer(rawMin, true)); // Decrease min
                const bufferedMax = Math.round(applyBuffer(rawMax, false)); // Increase max
                
                return {
                    min: bufferedMin,
                    max: bufferedMax,
                    avg: Math.round(avg),
                    count: agesInMinutes.length
                };
            })(),
            
            // Deployer Balance Analysis (should be tight for same team)
            deployerBalance: (() => {
                const balances = getValidValues('deployerBalance');
                if (balances.length === 0) return { min: 0, max: 1000, avg: 0, count: 0 };
                
                const rawMin = Math.min(...balances);
                const rawMax = Math.max(...balances);
                const avg = balances.reduce((sum, b) => sum + b, 0) / balances.length;
                
                // Apply buffer to make ranges INCLUSIVE
                const bufferedMin = applyBuffer(rawMin, true); // Decrease min
                const bufferedMax = applyBuffer(rawMax, false); // Increase max
                
                return {
                    min: bufferedMin,
                    max: bufferedMax,
                    avg: Math.round(avg * 100) / 100,
                    count: balances.length
                };
            })(),
            
            // Wallet Stats Analysis (should be tight)
            uniqueWallets: (() => {
                const counts = getValidValues('uniqueCount');
                if (counts.length === 0) return { min: 0, max: 1000, avg: 0, count: 0 };
                
                const rawMin = Math.min(...counts);
                const rawMax = Math.max(...counts);
                const avg = counts.reduce((sum, c) => sum + c, 0) / counts.length;
                
                // Apply buffer to make ranges INCLUSIVE
                const bufferedMin = Math.round(applyBuffer(rawMin, true)); // Decrease min
                const bufferedMax = Math.round(applyBuffer(rawMax, false)); // Increase max
                
                return {
                    min: bufferedMin,
                    max: bufferedMax,
                    avg: Math.round(avg),
                    count: counts.length
                };
            })(),
            
            // KYC Wallets Analysis
            kycWallets: (() => {
                const counts = getValidValues('kycCount');
                if (counts.length === 0) return { min: 0, max: 100, avg: 0, count: 0 };
                
                const rawMin = Math.min(...counts);
                const rawMax = Math.max(...counts);
                const avg = counts.reduce((sum, c) => sum + c, 0) / counts.length;
                
                // Apply buffer to make ranges INCLUSIVE
                const bufferedMin = Math.round(applyBuffer(rawMin, true)); // Decrease min
                const bufferedMax = Math.round(applyBuffer(rawMax, false)); // Increase max
                
                return {
                    min: bufferedMin,
                    max: bufferedMax,
                    avg: Math.round(avg),
                    count: counts.length
                };
            })(),
            
            dormantWallets: (() => {
                const counts = getValidValues('dormantCount');
                if (counts.length === 0) return { min: 0, max: 20, avg: 0, count: 0 };
                
                const rawMin = Math.min(...counts);
                const rawMax = Math.max(...counts);
                const avg = counts.reduce((sum, c) => sum + c, 0) / counts.length;
                
                // Apply buffer to make ranges INCLUSIVE
                const bufferedMin = Math.round(applyBuffer(rawMin, true)); // Decrease min
                const bufferedMax = Math.round(applyBuffer(rawMax, false)); // Increase max
                
                return {
                    min: bufferedMin,
                    max: bufferedMax,
                    avg: Math.round(avg),
                    count: counts.length
                };
            })(),
            
            // Holders Analysis
            holders: (() => {
                const counts = getValidValues('holdersCount');
                if (counts.length === 0) return { min: 0, max: 1000, avg: 0, count: 0 };
                
                const rawMin = Math.min(...counts);
                const rawMax = Math.max(...counts);
                const avg = counts.reduce((sum, c) => sum + c, 0) / counts.length;
                
                // Apply buffer to make ranges INCLUSIVE
                const bufferedMin = Math.round(applyBuffer(rawMin, true)); // Decrease min
                const bufferedMax = Math.round(applyBuffer(rawMax, false)); // Increase max
                
                return {
                    min: bufferedMin,
                    max: bufferedMax,
                    avg: Math.round(avg),
                    count: counts.length
                };
            })(),
            
            // Liquidity Analysis
            liquidity: (() => {
                const liquids = getValidValues('liquidity');
                if (liquids.length === 0) return { min: 0, max: 100000, avg: 0, count: 0 };
                
                const rawMin = Math.min(...liquids);
                const rawMax = Math.max(...liquids);
                const avg = liquids.reduce((sum, l) => sum + l, 0) / liquids.length;
                
                // Apply buffer to make ranges INCLUSIVE
                const bufferedMin = Math.round(applyBuffer(rawMin, true)); // Decrease min
                const bufferedMax = Math.round(applyBuffer(rawMax, false)); // Increase max
                
                return {
                    min: bufferedMin,
                    max: bufferedMax,
                    avg: Math.round(avg),
                    count: liquids.length
                };
            })(),
            
            // Percentage-based criteria (with 0-100% bounds)
            liquidityPct: (() => {
                const pcts = getValidValues('liquidityPct');
                if (pcts.length === 0) return { min: 0, max: 100, avg: 0, count: 0 };
                
                const rawMin = Math.min(...pcts);
                const rawMax = Math.max(...pcts);
                const avg = pcts.reduce((sum, p) => sum + p, 0) / pcts.length;
                
                return {
                    min: applyBuffer(rawMin, true, true), // Decrease min, treat as percentage
                    max: applyBuffer(rawMax, false, true), // Increase max, treat as percentage
                    avg: Math.round(avg * 100) / 100,
                    count: pcts.length
                };
            })(),
            
            buyVolumePct: (() => {
                const pcts = getValidValues('buyVolumePct');
                if (pcts.length === 0) return { min: 0, max: 100, avg: 0, count: 0 };
                
                const rawMin = Math.min(...pcts);
                const rawMax = Math.max(...pcts);
                const avg = pcts.reduce((sum, p) => sum + p, 0) / pcts.length;
                
                return {
                    min: applyBuffer(rawMin, true, true), // Decrease min, treat as percentage
                    max: applyBuffer(rawMax, false, true), // Increase max, treat as percentage
                    avg: Math.round(avg * 100) / 100,
                    count: pcts.length
                };
            })(),
            
            bundledPct: (() => {
                const pcts = getValidValues('bundledPct');
                if (pcts.length === 0) return { min: 0, max: 100, avg: 0, count: 0 };
                
                const rawMin = Math.min(...pcts);
                const rawMax = Math.max(...pcts);
                const avg = pcts.reduce((sum, p) => sum + p, 0) / pcts.length;
                
                return {
                    min: applyBuffer(rawMin, true, true), // Decrease min, treat as percentage
                    max: applyBuffer(rawMax, false, true), // Increase max, treat as percentage
                    avg: Math.round(avg * 100) / 100,
                    count: pcts.length
                };
            })(),
            
            drainedPct: (() => {
                const pcts = getValidValues('drainedPct');
                if (pcts.length === 0) return { min: 0, max: 100, avg: 0, count: 0 };
                
                const rawMin = Math.min(...pcts);
                const rawMax = Math.max(...pcts);
                const avg = pcts.reduce((sum, p) => sum + p, 0) / pcts.length;
                
                return {
                    min: applyBuffer(rawMin, true, true), // Decrease min, treat as percentage
                    max: applyBuffer(rawMax, false, true), // Increase max, treat as percentage
                    avg: Math.round(avg * 100) / 100,
                    count: pcts.length
                };
            })(),
            
            volMcapPct: (() => {
                const pcts = getValidValues('volMcapPct');
                if (pcts.length === 0) return { min: 0, max: 300, avg: 0, count: 0 };
                
                const rawMin = Math.min(...pcts);
                const rawMax = Math.max(...pcts);
                const avg = pcts.reduce((sum, p) => sum + p, 0) / pcts.length;
                
                return {
                    min: applyBuffer(rawMin, true), // Decrease min
                    max: applyBuffer(rawMax, false), // Increase max
                    avg: Math.round(avg * 100) / 100,
                    count: pcts.length
                };
            })(),
            
            // Win Prediction Analysis (NEW - handles winPredPercent from criteria)
            winPred: (() => {
                const winPreds = getValidValues('winPredPercent');
                if (winPreds.length === 0) return { min: 0, max: 100, avg: 0, count: 0 };
                
                const rawMin = Math.min(...winPreds);
                const rawMax = Math.max(...winPreds);
                const avg = winPreds.reduce((sum, w) => sum + w, 0) / winPreds.length;
                
                return {
                    min: applyBuffer(rawMin, true, true), // Apply buffer as percentage, decrease min
                    max: applyBuffer(rawMax, false, true), // Apply buffer as percentage, increase max
                    avg: Math.round(avg * 100) / 100,
                    count: winPreds.length
                };
            })(),
            
            // TTC (Time to Complete) Analysis
            ttc: (() => {
                const ttcs = getValidValues('ttc');
                if (ttcs.length === 0) return { min: 0, max: 86400, avg: 0, count: 0 };
                
                const rawMin = Math.min(...ttcs);
                const rawMax = Math.max(...ttcs);
                const avg = ttcs.reduce((sum, t) => sum + t, 0) / ttcs.length;
                
                return {
                    min: Math.round(applyBuffer(rawMin, true)), // Decrease min
                    max: Math.round(applyBuffer(rawMax, false)), // Increase max
                    avg: Math.round(avg),
                    count: ttcs.length
                };
            })(),
            
            // Boolean criteria analysis
            freshDeployer: {
                trueCount: signals.filter(s => s.freshDeployer === true).length,
                falseCount: signals.filter(s => s.freshDeployer === false).length,
                nullCount: signals.filter(s => s.freshDeployer === null || s.freshDeployer === undefined).length,
                preferredValue: null // Will be determined based on majority
            },
            
            hasDescription: {
                trueCount: signals.filter(s => s.hasDescription === true).length,
                falseCount: signals.filter(s => s.hasDescription === false).length,
                nullCount: signals.filter(s => s.hasDescription === null || s.hasDescription === undefined).length,
                preferredValue: null
            },
            
            hasSignal: {
                trueCount: signals.filter(s => s.hasSignal === true).length,
                falseCount: signals.filter(s => s.hasSignal === false).length,
                nullCount: signals.filter(s => s.hasSignal === null || s.hasSignal === undefined).length,
                preferredValue: null
            },
            
            skipIfNoKycCexFunding: {
                trueCount: signals.filter(s => s.skipIfNoKycCexFunding === true).length,
                falseCount: signals.filter(s => s.skipIfNoKycCexFunding === false).length,
                nullCount: signals.filter(s => s.skipIfNoKycCexFunding === null || s.skipIfNoKycCexFunding === undefined).length,
                preferredValue: null
            }
        };
        
        // Determine preferred boolean values based on majority
        ['freshDeployer', 'hasDescription', 'hasSignal', 'skipIfNoKycCexFunding'].forEach(field => {
            const data = analysis[field];
            if (data.trueCount > data.falseCount) {
                data.preferredValue = true;
            } else if (data.falseCount > data.trueCount) {
                data.preferredValue = false;
            } else {
                data.preferredValue = null; // "Don't Care" for ties
            }
        });
        
        return analysis;
    }
    
    // Generate the tightest possible configuration from analysis
    function generateTightestConfig(analysis) {
        // Safety check for undefined analysis
        if (!analysis) {
            console.error('❌ generateTightestConfig called with undefined analysis');
            return {};
        }

        const config = {
            metadata: {
                generatedAt: new Date().toISOString(),
                basedOnSignals: analysis.totalSignals || 0,
                basedOnTokens: analysis.tokenCount || 0,
                bufferPercent: analysis.bufferPercent || 0,
                outlierMethod: analysis.outlierMethod || 'none',
                configType: 'Tightest Generated Config'
            }
        };
        
        // Add cluster information if available
        if (analysis.clusterInfo) {
            config.metadata.clusterInfo = analysis.clusterInfo;
        }
        
        // Map analysis results to AGCopilot parameter names
        // Basic Settings
        if (analysis.mcap && analysis.mcap.min !== undefined) {
            config['Min MCAP (USD)'] = Math.floor(analysis.mcap.min);
        }
        if (analysis.mcap && analysis.mcap.tightestMax !== undefined) {
            config['Max MCAP (USD)'] = Math.floor(analysis.mcap.tightestMax);
        } else if (analysis.mcap && analysis.mcap.max !== undefined) {
            config['Max MCAP (USD)'] = Math.floor(analysis.mcap.max);
        }
        
        // AG Score
        if (analysis.agScore && analysis.agScore.min !== undefined) {
            config['Min AG Score'] = analysis.agScore.min.toString();
        }
        
        // Token Age
        if (analysis.tokenAge) {
            if (analysis.tokenAge.min !== undefined) {
                config['Min Token Age (sec)'] = Math.round(analysis.tokenAge.min);
            }
            if (analysis.tokenAge.max !== undefined) {
                config['Max Token Age (sec)'] = Math.round(analysis.tokenAge.max);
            }
        }
        
        // Deployer Age (in minutes)
        if (analysis.deployerAge && analysis.deployerAge.min !== undefined) {
            config['Min Deployer Age (min)'] = Math.round(analysis.deployerAge.min);
        }
        
        // Deployer Balance
        if (analysis.deployerBalance && analysis.deployerBalance.min !== undefined) {
            config['Min Deployer Balance (SOL)'] = Math.round(analysis.deployerBalance.min * 100) / 100;
        }
        
        // Wallet counts
        if (analysis.uniqueWallets) {
            if (analysis.uniqueWallets.min !== undefined) {
                config['Min Unique Wallets'] = Math.round(analysis.uniqueWallets.min);
            }
            if (analysis.uniqueWallets.max !== undefined) {
                config['Max Unique Wallets'] = Math.round(analysis.uniqueWallets.max);
            }
        }
        
        if (analysis.kycWallets) {
            if (analysis.kycWallets.min !== undefined) {
                config['Min KYC Wallets'] = Math.round(analysis.kycWallets.min);
            }
            if (analysis.kycWallets.max !== undefined) {
                config['Max KYC Wallets'] = Math.round(analysis.kycWallets.max);
            }
        }
        
        if (analysis.dormantWallets) {
            if (analysis.dormantWallets.min !== undefined) {
                config['Min Dormant Wallets'] = Math.round(analysis.dormantWallets.min);
            }
            if (analysis.dormantWallets.max !== undefined) {
                config['Max Dormant Wallets'] = Math.round(analysis.dormantWallets.max);
            }
        }
        
        if (analysis.holders) {
            if (analysis.holders.min !== undefined) {
                config['Min Holders'] = Math.round(analysis.holders.min);
            }
            if (analysis.holders.max !== undefined) {
                config['Max Holders'] = Math.round(analysis.holders.max);
            }
        }
        
        // Liquidity
        if (analysis.liquidity) {
            if (analysis.liquidity.min !== undefined) {
                config['Min Liquidity (USD)'] = Math.round(analysis.liquidity.min);
            }
            if (analysis.liquidity.max !== undefined) {
                config['Max Liquidity (USD)'] = Math.round(analysis.liquidity.max);
            }
        }
        
        // Percentage parameters
        if (analysis.liquidityPct && analysis.liquidityPct.max !== undefined) {
            config['Max Liquidity %'] = Math.round(analysis.liquidityPct.max);
        }
        
        if (analysis.buyVolumePct && analysis.buyVolumePct.min !== undefined) {
            config['Min Buy Ratio %'] = Math.round(analysis.buyVolumePct.min);
        }
        
        if (analysis.bundledPct) {
            if (analysis.bundledPct.min !== undefined) {
                config['Min Bundled %'] = Math.round(analysis.bundledPct.min);
            }
            if (analysis.bundledPct.max !== undefined) {
                config['Max Bundled %'] = Math.round(analysis.bundledPct.max);
            }
        }
        
        if (analysis.drainedPct && analysis.drainedPct.max !== undefined) {
            config['Max Drained %'] = Math.round(analysis.drainedPct.max);
        }
        
        if (analysis.volMcapPct) {
            if (analysis.volMcapPct.min !== undefined) {
                config['Min Vol MCAP %'] = Math.round(analysis.volMcapPct.min);
            }
            if (analysis.volMcapPct.max !== undefined) {
                config['Max Vol MCAP %'] = Math.round(analysis.volMcapPct.max);
            }
        }
        
        // Win Prediction
        if (analysis.winPred && analysis.winPred.min !== undefined) {
            config['Min Win Pred %'] = Math.round(analysis.winPred.min);
        }
        
        // TTC (Time to Complete)
        if (analysis.ttc) {
            if (analysis.ttc.min !== undefined) {
                config['Min TTC (sec)'] = Math.round(analysis.ttc.min);
            }
            if (analysis.ttc.max !== undefined) {
                config['Max TTC (sec)'] = Math.round(analysis.ttc.max);
            }
        }
        
        // Boolean parameters - set based on majority
        if (analysis.freshDeployer && analysis.freshDeployer.preferredValue !== null) {
            config['Fresh Deployer'] = analysis.freshDeployer.preferredValue;
        }
        
        if (analysis.hasDescription && analysis.hasDescription.preferredValue !== null) {
            config['Description'] = analysis.hasDescription.preferredValue;
        }
        
        if (analysis.hasSignal && analysis.hasSignal.preferredValue !== null) {
            config['Has Buy Signal'] = analysis.hasSignal.preferredValue;
        }
        
        if (analysis.skipIfNoKycCexFunding && analysis.skipIfNoKycCexFunding.preferredValue !== null) {
            config['Skip If No KYC/CEX Funding'] = analysis.skipIfNoKycCexFunding.preferredValue;
        }
        
        return config;
    }

    // Format config for display or copying
    function formatConfigForDisplay(config) {
        if (!config || typeof config !== 'object') {
            return 'Invalid configuration';
        }
        
        const lines = [];
        
        // Add metadata if present
        if (config.metadata) {
            lines.push('=== Configuration Metadata ===');
            Object.entries(config.metadata).forEach(([key, value]) => {
                if (typeof value === 'object') {
                    lines.push(`${key}: ${JSON.stringify(value)}`);
                } else {
                    lines.push(`${key}: ${value}`);
                }
            });
            lines.push('');
        }
        
        lines.push('=== Configuration Parameters ===');
        
        // Group parameters by category
        const categories = {
            'Basic': ['Min MCAP (USD)', 'Max MCAP (USD)'],
            'Token Details': ['Min AG Score', 'Min Token Age (sec)', 'Max Token Age (sec)', 'Min Deployer Age (min)'],
            // Add more categories as needed
        };
        
        Object.entries(categories).forEach(([category, params]) => {
            const categoryParams = params.filter(param => config[param] !== undefined);
            if (categoryParams.length > 0) {
                lines.push(`--- ${category} ---`);
                categoryParams.forEach(param => {
                    lines.push(`${param}: ${config[param]}`);
                });
                lines.push('');
            }
        });
        
        // Add any other parameters not in categories
        Object.entries(config).forEach(([key, value]) => {
            if (key !== 'metadata' && !Object.values(categories).flat().includes(key)) {
                lines.push(`${key}: ${value}`);
            }
        });
        
        return lines.join('\n');
    }

    // Validation function
    function validateConfigAgainstSignals(config, originalSignals, configName = 'Config') {
        if (!config || !originalSignals || originalSignals.length === 0) {
            console.warn(`⚠️ Cannot validate ${configName}: missing config or signals`);
            return false;
        }
        
        console.log(`🔍 Validating ${configName} against ${originalSignals.length} signals...`);
        
        let matchCount = 0;
        let totalChecks = 0;
        
        // Validate key parameters
        const validations = [
            { param: 'Min MCAP (USD)', field: 'signalMcap', operator: '>=' },
            { param: 'Max MCAP (USD)', field: 'signalMcap', operator: '<=' },
            { param: 'Min AG Score', field: 'agScore', operator: '>=' },
            // Add more validations as needed
        ];
        
        validations.forEach(({ param, field, operator }) => {
            if (config[param] !== undefined) {
                const configValue = parseFloat(config[param]);
                const matches = originalSignals.filter(signal => {
                    if (signal[field] === undefined || signal[field] === null) return false;
                    const signalValue = parseFloat(signal[field]);
                    switch (operator) {
                        case '>=': return signalValue >= configValue;
                        case '<=': return signalValue <= configValue;
                        case '==': return signalValue === configValue;
                        default: return false;
                    }
                });
                
                matchCount += matches.length;
                totalChecks += originalSignals.length;
                
                const percentage = ((matches.length / originalSignals.length) * 100).toFixed(1);
                console.log(`  ${param} ${operator} ${configValue}: ${matches.length}/${originalSignals.length} signals match (${percentage}%)`);
            }
        });
        
        const overallMatchRate = totalChecks > 0 ? ((matchCount / totalChecks) * 100).toFixed(1) : 0;
        console.log(`📊 Overall validation: ${overallMatchRate}% of parameter checks passed`);
        
        return overallMatchRate > 80; // Return true if >80% of checks pass
    }

    // Find clusters using distance threshold approach
    function findSignalClusters(signals, tokenData, minClusterTokens) {
        if (signals.length < 4) return []; // Need at least 4 signals for meaningful clustering
        
        console.log(`🔍 Clustering ${signals.length} signals from ${tokenData.length} tokens, min tokens per cluster: ${minClusterTokens}`);
        
        // Create a mapping from signal to token address
        const signalToToken = new Map();
        let signalIndex = 0;
        tokenData.forEach(token => {
            token.swaps.forEach(swap => {
                signalToToken.set(signalIndex, token.processed?.tokenAddress || 'Unknown');
                signalIndex++;
            });
        });
        
        const { normalizedSignals } = normalizeSignals(signals);
        const clusters = [];
        const usedSignals = new Set();
        
        // Try different distance thresholds to find good clusters
        const thresholds = [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0, 1.5, 2.0];
        
        for (const threshold of thresholds) {
            const currentClusters = [];
            const currentUsed = new Set();
            
            console.log(`🔍 Trying threshold: ${threshold}`);
            
            normalizedSignals.forEach((signal, index) => {
                if (currentUsed.has(index)) return;
                
                // Start a new cluster with this signal
                const cluster = [index];
                const clusterTokens = new Set([signalToToken.get(index)]);
                currentUsed.add(index);
                
                // Find all signals within threshold distance
                normalizedSignals.forEach((otherSignal, otherIndex) => {
                    if (currentUsed.has(otherIndex)) return;
                    
                    const distance = calculateSignalDistance(signal, otherSignal);
                    if (distance <= threshold) {
                        cluster.push(otherIndex);
                        clusterTokens.add(signalToToken.get(otherIndex));
                        currentUsed.add(otherIndex);
                    }
                });
                
                // Only keep clusters that meet minimum TOKEN count requirement
                if (clusterTokens.size >= minClusterTokens) {
                    currentClusters.push({
                        indices: cluster,
                        signals: cluster.map(i => signals[i]),
                        tokens: Array.from(clusterTokens),
                        threshold: threshold,
                        size: cluster.length,
                        tokenCount: clusterTokens.size,
                        uniqueTokens: clusterTokens.size,
                        avgDistance: cluster.length > 1 ? 
                            cluster.reduce((sum, i) => {
                                return sum + cluster.reduce((innerSum, j) => {
                                    return i !== j ? innerSum + calculateSignalDistance(normalizedSignals[i], normalizedSignals[j]) : innerSum;
                                }, 0);
                            }, 0) / (cluster.length * (cluster.length - 1)) : 0
                    });
                    console.log(`✅ Found cluster: ${cluster.length} signals from ${clusterTokens.size} tokens at threshold ${threshold}`);
                }
            });
            
            // If we found good clusters at this threshold, add them
            if (currentClusters.length > 0) {
                clusters.push(...currentClusters);
                console.log(`📊 Added ${currentClusters.length} clusters at threshold ${threshold}`);
                // Stop after finding the first good threshold to avoid overlap
                break;
            }
        }
        
        // Remove overlapping clusters (prefer larger, tighter clusters)
        const finalClusters = [];
        const globalUsed = new Set();
        
        // Sort by tightness (lower avgDistance = tighter) then by token diversity
        clusters.sort((a, b) => {
            const tightnessScore = a.avgDistance - b.avgDistance;
            if (Math.abs(tightnessScore) < 0.01) {
                return b.tokenCount - a.tokenCount; // If similar tightness, prefer more tokens
            }
            return tightnessScore; // Prefer tighter clusters
        });
        
        clusters.forEach(cluster => {
            // Check if any signals in this cluster are already used
            const hasOverlap = cluster.indices.some(i => globalUsed.has(i));
            if (!hasOverlap) {
                // Mark all signals in this cluster as used
                cluster.indices.forEach(i => globalUsed.add(i));
                finalClusters.push(cluster);
            }
        });
        
        return finalClusters;
    }

    // Analyze all signals to find optimal parameter bounds
    function analyzeSignalCriteria(allTokenData, bufferPercent = 10, outlierMethod = 'none', useClustering = true) {
        console.log(`\n🔬 === STARTING SIGNAL CRITERIA ANALYSIS ===`);
        console.log(`Input: ${allTokenData.length} tokens, Buffer: ${bufferPercent}%, Outlier method: ${outlierMethod}, Clustering: ${useClustering}`);
        
        const allSignals = [];
        
        // Collect all signals from all tokens with detailed logging
        allTokenData.forEach((tokenData, tokenIndex) => {
            if (!tokenData.swaps || !Array.isArray(tokenData.swaps)) {
                console.warn(`⚠️ Token ${tokenIndex + 1} has no swaps array:`, tokenData.processed?.tokenName || 'Unknown');
                return;
            }
            
            const tokenAddress = tokenData.processed?.tokenAddress || 'Unknown';
            const shortAddr = tokenAddress.length > 8 ? `${tokenAddress.substring(0, 8)}...${tokenAddress.substring(-4)}` : tokenAddress;
            console.log(`📊 Token ${tokenIndex + 1}: ${shortAddr} - ${tokenData.swaps.length} swaps`);
            
            tokenData.swaps.forEach((swap, swapIndex) => {
                if (!swap || typeof swap !== 'object') {
                    console.warn(`⚠️ Invalid swap ${swapIndex + 1} for token ${tokenIndex + 1}:`, swap);
                    return;
                }
                
                // Flatten criteria fields onto the swap object for easier access
                const flattenedSwap = {
                    ...swap,
                    ...(swap.criteria || {}), // Spread criteria fields to top level
                    _tokenAddress: tokenData.processed?.tokenAddress,
                    _tokenName: tokenData.processed?.tokenName
                };
                
                allSignals.push(flattenedSwap);
            });
        });
        
        console.log(`🔢 Total signals collected: ${allSignals.length}`);
        
        if (allSignals.length === 0) {
            console.error('❌ No signal criteria found to analyze');
            throw new Error('No signal criteria found to analyze');
        }
        
        // Log signal overview
        console.log(`📈 Signal overview:`);
        console.log(`  • Signals per token: ${(allSignals.length / allTokenData.length).toFixed(1)} avg`);
        console.log(`  • Unique tokens: ${new Set(allSignals.map(s => s._tokenAddress)).size}`);
        console.log(`  • AG Scores range: ${Math.min(...allSignals.map(s => s.agScore || 0))} - ${Math.max(...allSignals.map(s => s.agScore || 0))}`);
        console.log(`  • MCAP range: $${Math.min(...allSignals.map(s => s.signalMcap || 0))} - $${Math.max(...allSignals.map(s => s.signalMcap || 0))}`);
        
        
        // 🎯 CLUSTERING LOGIC - Enhanced for better token retention
        if (useClustering && allSignals.length >= 4) {
            // Calculate minimum cluster size - more conservative approach
            const uniqueTokens = new Set(allTokenData.map(t => t.processed?.tokenAddress)).size;
            console.log(`🔍 Clustering ${allSignals.length} signals from ${uniqueTokens} unique tokens`);
            
            // More lenient minimum cluster size calculation
            const minClusterSize = Math.max(2, Math.min(4, Math.ceil(uniqueTokens * 0.5))); // Increased from 0.3 to 0.5
            console.log(`📊 Using minimum cluster size: ${minClusterSize} (${Math.round((minClusterSize/uniqueTokens)*100)}% of tokens)`);
            
            const clusters = findSignalClusters(allSignals, allTokenData, minClusterSize);
            console.log(`🔍 Found ${clusters.length} clusters:`, clusters.map(c => `${c.size} signals from ${c.uniqueTokens} tokens (threshold: ${c.threshold})`));
            
            // More lenient clustering - accept clusters even if they don't cover all tokens
            if (clusters.length > 0) {
                // Count total signals in clusters vs total signals
                const clusteredSignals = clusters.reduce((sum, cluster) => sum + cluster.size, 0);
                const clusterCoverage = (clusteredSignals / allSignals.length) * 100;
                
                console.log(`📈 Clustering coverage: ${clusteredSignals}/${allSignals.length} signals (${clusterCoverage.toFixed(1)}%)`);
                
                // Accept clustering if it covers at least 40% of signals (reduced from implicit higher threshold)
                if (clusterCoverage >= 40) {
                    // Generate multiple configurations from clusters
                    const clusteredAnalyses = [];
                    
                    clusters.forEach((cluster, index) => {
                        try {
                            const clusterAnalysis = generateClusterAnalysis(cluster.signals, bufferPercent, outlierMethod);
                            
                            // Add cluster-specific metadata
                            clusterAnalysis.tokenCount = allTokenData.length; // Total tokens analyzed
                            clusterAnalysis.clusterInfo = {
                                clusterId: index + 1,
                                clusterName: `Cluster ${index + 1}`,
                                signalCount: cluster.size,
                                tokenCount: cluster.tokenCount,
                                uniqueTokens: cluster.uniqueTokens,
                                tightness: cluster.avgDistance,
                                threshold: cluster.threshold,
                                coverage: ((cluster.size / allSignals.length) * 100).toFixed(1),
                                description: `${cluster.size} signals from ${cluster.uniqueTokens} tokens (${((cluster.size / allSignals.length) * 100).toFixed(1)}% coverage, avg distance: ${cluster.avgDistance.toFixed(3)})`
                            };
                            
                            clusteredAnalyses.push({
                                id: `cluster_${index + 1}`,
                                name: `Cluster ${index + 1}`,
                                analysis: clusterAnalysis,
                                signals: cluster.signals,
                                signalCount: cluster.size,
                                tokenCount: cluster.tokenCount,
                                uniqueTokens: cluster.uniqueTokens,
                                tightness: cluster.avgDistance,
                                threshold: cluster.threshold,
                                tokens: cluster.tokens
                            });
                        } catch (error) {
                            console.warn(`⚠️ Failed to analyze cluster ${index + 1}:`, error.message);
                        }
                    });
                    
                    if (clusteredAnalyses.length > 0) {
                        console.log(`✅ Successfully generated ${clusteredAnalyses.length} cluster analyses`);
                        return {
                            type: 'clustered',
                            clusters: clusteredAnalyses,
                            totalSignals: allSignals.length,
                            clusteredSignals: clusteredSignals,
                            coverage: clusterCoverage,
                            fallbackAnalysis: generateFullAnalysis(allSignals, bufferPercent, outlierMethod, allTokenData.length)
                        };
                    }
                } else {
                    console.log(`⚠️ Clustering coverage too low (${clusterCoverage.toFixed(1)}% < 40%), falling back to standard analysis`);
                }
            } else {
                console.log(`⚠️ No valid clusters found with minimum size ${minClusterSize}, falling back to standard analysis`);
            }
        }
        
        // Fallback to standard analysis (or if clustering disabled/failed)
        console.log(`📊 Using standard analysis for all ${allSignals.length} signals from ${allTokenData.length} tokens`);
        const standardAnalysis = generateFullAnalysis(allSignals, bufferPercent, outlierMethod, allTokenData.length);
        return {
            type: 'standard',
            analysis: standardAnalysis,
            usedClustering: false
        };
    }
    
    // Generate full analysis from all signals (original logic)
    function generateFullAnalysis(allSignals, bufferPercent, outlierMethod, tokenCount = 0) {
        const analysis = generateAnalysisFromSignals(allSignals, bufferPercent, outlierMethod);
        analysis.tokenCount = tokenCount; // Add token count to the analysis
        return analysis;
    }
    
    // Generate analysis for a cluster
    function generateClusterAnalysis(clusterSignals, bufferPercent, outlierMethod) {
        return generateAnalysisFromSignals(clusterSignals, bufferPercent, outlierMethod);
    }

    // Create the AGSignalAnalysis namespace object
    window.AGSignalAnalysis = {
        // Core functions
        handleSignalAnalysis,
        updateSignalStatus,
        getSignalOutlierFilterMethod,
        createClusterSelectionUI,
        selectClusterConfig,
        
        // UI functions
        createSignalAnalysisTabUI,
        
        // Processing functions
        processTokenData,
        generateBatchSummary,
        removeOutliers,
        
        // Format functions
        formatTimestamp,
        formatMcap,
        formatPercent,
        
        // Clustering functions
        getClusteringParameters,
        normalizeSignals,
        calculateSignalDistance,
        findSignalClusters,
        
        // Analysis functions
        analyzeSignalCriteria,
        generateFullAnalysis,
        generateClusterAnalysis,
        
        // Configuration functions
        generateTightestConfig,
        generateAnalysisFromSignals,
        formatConfigForDisplay,
        validateConfigAgainstSignals,
        
        // Utility functions
        fetchWithRetry,
        getTokenInfo,
        getAllTokenSwaps
    };

    // Also make individual functions available for backward compatibility
    window.handleSignalAnalysis = handleSignalAnalysis;
    window.updateSignalStatus = updateSignalStatus;
    window.getSignalOutlierFilterMethod = getSignalOutlierFilterMethod;
    window.createClusterSelectionUI = createClusterSelectionUI;
    window.selectClusterConfig = selectClusterConfig;
    window.createSignalAnalysisTabUI = createSignalAnalysisTabUI;
    window.processTokenData = processTokenData;
    window.generateBatchSummary = generateBatchSummary;
    window.removeOutliers = removeOutliers;
    window.formatTimestamp = formatTimestamp;
    window.formatMcap = formatMcap;
    window.formatPercent = formatPercent;
    window.getClusteringParameters = getClusteringParameters;
    window.normalizeSignals = normalizeSignals;
    window.calculateSignalDistance = calculateSignalDistance;
    window.generateTightestConfig = generateTightestConfig;
    window.generateAnalysisFromSignals = generateAnalysisFromSignals;
    window.formatConfigForDisplay = formatConfigForDisplay;
    window.validateConfigAgainstSignals = validateConfigAgainstSignals;
    
    // Start initialization with retry mechanism
    initializeWithRetry();
    
})();