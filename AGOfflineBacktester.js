// ========================================
// 🗄️ AG OFFLINE BACKTESTER
// ========================================
// Uses historical CSV data dump for ultra-fast offline optimization
// No API calls needed - perfect for rapid experimentation
// Data format: heatmap_data_mode4_launchpads.csv (539K+ rows, 3 months of data)

(function() {
    'use strict';
    
    console.log('📊 AGOfflineBacktester v1.0 - Loading...');
    
    // ========================================
    // 📁 CSV DATA LOADER
    // ========================================
    class CSVDataLoader {
        constructor() {
            this.data = null;
            this.headers = null;
            this.isLoaded = false;
            this.totalRows = 0;
            this.uniqueTokens = new Set();
        }
        
        // Load CSV file from user's file system
        async loadFromFile(file) {
            console.log(`📂 Loading CSV file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
            
            const text = await file.text();
            const lines = text.split('\n');
            
            // Parse header
            this.headers = lines[0].split(',').map(h => h.trim());
            console.log(`📋 Found ${this.headers.length} columns:`, this.headers);
            
            // Parse data rows
            this.data = [];
            let parseErrors = 0;
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue; // Skip empty lines
                
                try {
                    const values = this.parseCSVLine(line);
                    if (values.length !== this.headers.length) {
                        parseErrors++;
                        if (parseErrors <= 5) {
                            console.warn(`⚠️ Row ${i}: Column count mismatch (${values.length} vs ${this.headers.length})`);
                        }
                        continue;
                    }
                    
                    const row = {};
                    this.headers.forEach((header, idx) => {
                        row[header] = values[idx];
                    });
                    
                    this.data.push(row);
                    this.uniqueTokens.add(row.tokenAddress);
                } catch (error) {
                    parseErrors++;
                    if (parseErrors <= 5) {
                        console.warn(`⚠️ Error parsing row ${i}:`, error.message);
                    }
                }
            }
            
            this.totalRows = this.data.length;
            this.isLoaded = true;
            
            console.log(`✅ Loaded ${this.totalRows.toLocaleString()} rows from CSV`);
            console.log(`🎯 Unique tokens: ${this.uniqueTokens.size.toLocaleString()}`);
            if (parseErrors > 0) {
                console.warn(`⚠️ Parse errors: ${parseErrors} rows skipped`);
            }
            
            return {
                success: true,
                rows: this.totalRows,
                uniqueTokens: this.uniqueTokens.size,
                parseErrors
            };
        }
        
        // Parse CSV line handling quoted fields
        parseCSVLine(line) {
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            
            // Add last value
            values.push(current.trim());
            
            return values;
        }
        
        // Get statistics about the dataset
        getStats() {
            if (!this.isLoaded) return null;
            
            const stats = {
                totalRows: this.totalRows,
                uniqueTokens: this.uniqueTokens.size,
                columns: this.headers.length,
                columnNames: this.headers
            };
            
            // Calculate target distribution (target=1 means >5x gains)
            // Use single-pass iteration to avoid stack overflow on large datasets
            let hits = 0;
            let misses = 0;
            let minTs = Infinity;
            let maxTs = -Infinity;
            
            for (let i = 0; i < this.data.length; i++) {
                const row = this.data[i];
                
                // Count targets
                const target = parseInt(row.target);
                if (target === 1) hits++;
                else if (target === 0) misses++;
                
                // Track timestamp range (only sample every 100th row for performance)
                if (i % 100 === 0) {
                    const ts = parseInt(row.timestamp);
                    if (!isNaN(ts)) {
                        if (ts < minTs) minTs = ts;
                        if (ts > maxTs) maxTs = ts;
                    }
                }
            }
            
            stats.targetDistribution = {
                hits,
                misses,
                hitRate: ((hits / (hits + misses)) * 100).toFixed(2) + '%',
                label: '>5x Rate' // Clarify this is for >5x gains, not just any hit
            };
            
            // Get timestamp range
            if (minTs !== Infinity && maxTs !== -Infinity) {
                stats.timeRange = {
                    start: new Date(minTs * 1000).toISOString(),
                    end: new Date(maxTs * 1000).toISOString(),
                    daysSpan: ((maxTs - minTs) / 86400).toFixed(1)
                };
            }
            
            return stats;
        }
    }
    
    // ========================================
    // 🔍 OFFLINE BACKTESTER ENGINE
    // ========================================
    class OfflineBacktester {
        constructor(dataLoader) {
            this.dataLoader = dataLoader;
            this.cache = new Map(); // Cache filtered results
        }
        
        // Test a configuration against the historical data
        testConfiguration(config) {
            if (!this.dataLoader.isLoaded) {
                return {
                    success: false,
                    error: 'Data not loaded. Please load CSV file first.'
                };
            }
            
            // Flatten nested config object (AGCopilot uses nested structure)
            const flatConfig = this.flattenConfig(config);
            
            // Debug: Log flattened config on first call
            if (this.cache.size === 0) {
                console.log('🔍 First config test - flattened parameters:', flatConfig);
            }
            
            // Generate cache key from flattened config
            const cacheKey = this.generateConfigKey(flatConfig);
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }
            
            // Filter data based on configuration
            const filtered = this.filterData(flatConfig);
            
            // Debug: Log filtering results
            if (this.cache.size === 0) {
                console.log(`🔍 Filtered ${filtered.length.toLocaleString()} / ${this.dataLoader.totalRows.toLocaleString()} rows`);
            }
            
            // Calculate metrics
            const metrics = this.calculateMetrics(filtered);
            
            // Cache result
            const result = {
                success: true,
                metrics,
                matchedRows: filtered.length,
                totalRows: this.dataLoader.totalRows,
                matchRate: ((filtered.length / this.dataLoader.totalRows) * 100).toFixed(2)
            };
            
            this.cache.set(cacheKey, result);
            
            return result;
        }
        
        // Flatten nested config object to single level
        flattenConfig(config) {
            const flat = {};
            
            // If already flat, return as-is
            if (!this.isNestedConfig(config)) {
                return config;
            }
            
            // Flatten nested structure
            for (const [section, params] of Object.entries(config)) {
                if (typeof params === 'object' && params !== null && !Array.isArray(params)) {
                    Object.assign(flat, params);
                } else {
                    flat[section] = params;
                }
            }
            
            return flat;
        }
        
        // Check if config is nested (has sections)
        isNestedConfig(config) {
            const keys = Object.keys(config);
            const commonSections = ['basic', 'wallets', 'risk', 'advanced', 'token', 'other'];
            return keys.some(key => commonSections.includes(key));
        }
        
        // Filter data based on configuration parameters
        filterData(config) {
            return this.dataLoader.data.filter(row => {
                // Basic filters
                if (config['Min MCAP (USD)'] !== undefined) {
                    const mcap = parseFloat(row.mcap);
                    if (isNaN(mcap) || mcap < config['Min MCAP (USD)']) return false;
                }
                
                if (config['Max MCAP (USD)'] !== undefined) {
                    const mcap = parseFloat(row.mcap);
                    if (isNaN(mcap) || mcap > config['Max MCAP (USD)']) return false;
                }
                
                // AG Score
                if (config['Min AG Score'] !== undefined) {
                    const agScore = parseFloat(row.agScore);
                    if (isNaN(agScore) || agScore < config['Min AG Score']) return false;
                }
                
                // Token Age
                if (config['Min Token Age (sec)'] !== undefined) {
                    const tokenAge = parseFloat(row.tokenAgeInSeconds);
                    if (isNaN(tokenAge) || tokenAge < config['Min Token Age (sec)']) return false;
                }
                
                if (config['Max Token Age (sec)'] !== undefined) {
                    const tokenAge = parseFloat(row.tokenAgeInSeconds);
                    if (isNaN(tokenAge) || tokenAge > config['Max Token Age (sec)']) return false;
                }
                
                // Deployer Age
                if (config['Min Deployer Age (min)'] !== undefined) {
                    const deployerAge = parseFloat(row.deployerAge);
                    if (isNaN(deployerAge) || deployerAge < config['Min Deployer Age (min)']) return false;
                }
                
                // Wallet criteria
                if (config['Min Unique Wallets'] !== undefined) {
                    const uniqueCount = parseFloat(row.uniqueCount);
                    if (isNaN(uniqueCount) || uniqueCount < config['Min Unique Wallets']) return false;
                }
                
                if (config['Max Unique Wallets'] !== undefined) {
                    const uniqueCount = parseFloat(row.uniqueCount);
                    if (isNaN(uniqueCount) || uniqueCount > config['Max Unique Wallets']) return false;
                }
                
                if (config['Min KYC Wallets'] !== undefined) {
                    const kycCount = parseFloat(row.kycCount);
                    if (isNaN(kycCount) || kycCount < config['Min KYC Wallets']) return false;
                }
                
                if (config['Max KYC Wallets'] !== undefined) {
                    const kycCount = parseFloat(row.kycCount);
                    if (isNaN(kycCount) || kycCount > config['Max KYC Wallets']) return false;
                }
                
                if (config['Min Dormant Wallets'] !== undefined) {
                    const dormantCount = parseFloat(row.dormantCount);
                    if (isNaN(dormantCount) || dormantCount < config['Min Dormant Wallets']) return false;
                }
                
                if (config['Max Dormant Wallets'] !== undefined) {
                    const dormantCount = parseFloat(row.dormantCount);
                    if (isNaN(dormantCount) || dormantCount > config['Max Dormant Wallets']) return false;
                }
                
                if (config['Min Holders'] !== undefined) {
                    const holdersCount = parseFloat(row.holdersCount);
                    if (isNaN(holdersCount) || holdersCount < config['Min Holders']) return false;
                }
                
                if (config['Max Holders'] !== undefined) {
                    const holdersCount = parseFloat(row.holdersCount);
                    if (isNaN(holdersCount) || holdersCount > config['Max Holders']) return false;
                }
                
                // Holder growth filter
                if (config['Holders Growth %'] !== undefined) {
                    const holdersDiffPct = parseFloat(row.holdersDiffPct);
                    if (isNaN(holdersDiffPct) || holdersDiffPct < config['Holders Growth %']) return false;
                }
                
                if (config['Holders Growth Minutes'] !== undefined) {
                    const holdersSinceMinutes = parseFloat(row.holdersSinceMinutes);
                    if (isNaN(holdersSinceMinutes) || holdersSinceMinutes > config['Holders Growth Minutes']) return false;
                }
                
                // Risk criteria
                if (config['Min Bundled %'] !== undefined) {
                    const bundledPct = parseFloat(row.bundledPct);
                    if (isNaN(bundledPct) || bundledPct < config['Min Bundled %']) return false;
                }
                
                if (config['Max Bundled %'] !== undefined) {
                    const bundledPct = parseFloat(row.bundledPct);
                    if (isNaN(bundledPct) || bundledPct > config['Max Bundled %']) return false;
                }
                
                if (config['Min Deployer Balance (SOL)'] !== undefined) {
                    const deployerBalance = parseFloat(row.deployerBalance);
                    if (isNaN(deployerBalance) || deployerBalance < config['Min Deployer Balance (SOL)']) return false;
                }
                
                if (config['Min Buy Ratio %'] !== undefined) {
                    const buyVolumePct = parseFloat(row.buyVolumePct);
                    if (isNaN(buyVolumePct) || buyVolumePct < config['Min Buy Ratio %']) return false;
                }
                
                if (config['Max Buy Ratio %'] !== undefined) {
                    const buyVolumePct = parseFloat(row.buyVolumePct);
                    if (isNaN(buyVolumePct) || buyVolumePct > config['Max Buy Ratio %']) return false;
                }
                
                if (config['Min Vol MCAP %'] !== undefined) {
                    const volMcapPct = parseFloat(row.volMcapPct);
                    if (isNaN(volMcapPct) || volMcapPct < config['Min Vol MCAP %']) return false;
                }
                
                if (config['Max Vol MCAP %'] !== undefined) {
                    const volMcapPct = parseFloat(row.volMcapPct);
                    if (isNaN(volMcapPct) || volMcapPct > config['Max Vol MCAP %']) return false;
                }
                
                if (config['Max Drained %'] !== undefined) {
                    const drainedPct = parseFloat(row.drainedPct);
                    if (isNaN(drainedPct) || drainedPct > config['Max Drained %']) return false;
                }
                
                if (config['Max Drained Count'] !== undefined) {
                    const drainedCount = parseFloat(row.drainedCount);
                    if (isNaN(drainedCount) || drainedCount > config['Max Drained Count']) return false;
                }
                
                // Boolean criteria
                if (config['Description'] !== undefined && config['Description'] !== null) {
                    const hasDescription = row.hasDescription === 'true' || row.hasDescription === '1';
                    if (config['Description'] && !hasDescription) return false;
                    if (!config['Description'] && hasDescription) return false;
                }
                
                if (config['Fresh Deployer'] !== undefined && config['Fresh Deployer'] !== null) {
                    const freshDeployer = row.freshDeployer === 'true' || row.freshDeployer === '1';
                    if (config['Fresh Deployer'] && !freshDeployer) return false;
                    if (!config['Fresh Deployer'] && freshDeployer) return false;
                }
                
                // Advanced criteria
                if (config['Min TTC (sec)'] !== undefined) {
                    const ttc = parseFloat(row.ttc);
                    if (isNaN(ttc) || ttc < config['Min TTC (sec)']) return false;
                }
                
                if (config['Max TTC (sec)'] !== undefined) {
                    const ttc = parseFloat(row.ttc);
                    if (isNaN(ttc) || ttc > config['Max TTC (sec)']) return false;
                }
                
                if (config['Max Liquidity %'] !== undefined) {
                    const liquidityPct = parseFloat(row.liquidityPct);
                    if (isNaN(liquidityPct) || liquidityPct > config['Max Liquidity %']) return false;
                }
                
                if (config['Min Win Pred %'] !== undefined) {
                    const winPredPercent = parseFloat(row.winPredPercent);
                    if (isNaN(winPredPercent) || winPredPercent < config['Min Win Pred %']) return false;
                }
                
                if (config['Has Buy Signal'] !== undefined && config['Has Buy Signal'] !== null) {
                    const hasSignal = row.signal === 'true' || row.signal === '1';
                    if (config['Has Buy Signal'] && !hasSignal) return false;
                    if (!config['Has Buy Signal'] && hasSignal) return false;
                }
                
                return true; // Passed all filters
            });
        }
        
        // Calculate performance metrics from filtered data
        calculateMetrics(filteredData) {
            if (filteredData.length === 0) {
                return {
                    totalTokens: 0,
                    tokensHitTp: 0,
                    winRate: 0,
                    realWinRate: 0,
                    tpPnlPercent: 0,
                    avgPnlPerToken: 0
                };
            }
            
            // Use single-pass iteration for efficiency on large datasets
            let tokensHitTp = 0;
            const uniqueTokensSet = new Set();
            
            for (let i = 0; i < filteredData.length; i++) {
                const row = filteredData[i];
                
                // Count targets
                if (parseInt(row.target) === 1) {
                    tokensHitTp++;
                }
                
                // Track unique tokens
                uniqueTokensSet.add(row.tokenAddress);
            }
            
            const totalTokens = filteredData.length;
            
            // Calculate win rate (percentage of tokens that achieved >5x gains)
            // NOTE: target=1 means token hit >5x (not just any TP hit)
            const winRate = (tokensHitTp / totalTokens) * 100;
            
            // For offline data, winRate and realWinRate are the same
            // (we're calculating directly from actual outcomes)
            const realWinRate = winRate;
            
            // PnL estimation based on >5x threshold
            // target=1: >5x gain (500%+ profit)
            // target=0: did not reach 5x (conservative: -100% loss assumption)
            const avgGainPerHit = 500; // 5x gain minimum (actual gains may be higher)
            const avgLossPerMiss = -100; // Total loss
            
            const totalPnl = (tokensHitTp * avgGainPerHit) + ((totalTokens - tokensHitTp) * avgLossPerMiss);
            const tpPnlPercent = totalPnl / totalTokens;
            const avgPnlPerToken = totalPnl / totalTokens;
            
            return {
                totalTokens,
                tokensHitTp,
                winRate: parseFloat(winRate.toFixed(2)),
                realWinRate: parseFloat(realWinRate.toFixed(2)),
                tpPnlPercent: parseFloat(tpPnlPercent.toFixed(2)),
                avgPnlPerToken: parseFloat(avgPnlPerToken.toFixed(2)),
                // Additional metrics
                uniqueTokens: uniqueTokensSet.size,
                avgMcap: this.calculateAverage(filteredData, 'mcap'),
                avgAgScore: this.calculateAverage(filteredData, 'agScore'),
                avgLiquidity: this.calculateAverage(filteredData, 'liquidity')
            };
        }
        
        // Helper: calculate average of a numeric field
        calculateAverage(data, field) {
            if (data.length === 0) return 0;
            
            // Use single-pass iteration to avoid stack overflow
            let sum = 0;
            let count = 0;
            
            for (let i = 0; i < data.length; i++) {
                const value = parseFloat(data[i][field]);
                if (!isNaN(value)) {
                    sum += value;
                    count++;
                }
            }
            
            if (count === 0) return 0;
            return parseFloat((sum / count).toFixed(2));
        }
        
        // Generate cache key from configuration
        generateConfigKey(config) {
            // Config should already be flattened when passed here
            // Sort keys and stringify for consistent caching
            const sortedKeys = Object.keys(config).sort();
            const keyParts = sortedKeys.map(key => `${key}:${config[key]}`);
            return keyParts.join('|');
        }
        
        // Clear cache
        clearCache() {
            this.cache.clear();
            console.log('🗑️ Cache cleared');
        }
        
        // Get cache statistics
        getCacheStats() {
            return {
                size: this.cache.size,
                memoryEstimate: `${(this.cache.size * 0.5).toFixed(2)} KB` // Rough estimate
            };
        }
    }
    
    // ========================================
    // 🎨 UI COMPONENTS
    // ========================================
    function createOfflineBacktesterUI() {
        const container = document.createElement('div');
        container.id = 'offline-backtester-ui';
        container.innerHTML = `
            <div style="margin-bottom: 16px; padding: 12px; background: rgba(66, 153, 225, 0.1); border: 1px solid rgba(66, 153, 225, 0.3); border-radius: 6px;">
                <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #4299e1;">
                    🗄️ Offline Backtesting Mode
                </h4>
                <div style="margin: 0; font-size: 11px; color: #a0aec0; line-height: 1.4;">
                    Use historical CSV data for ultra-fast optimization without API calls.
                    Load the data dump file to begin testing configurations instantly. (target=1 = >5x tokens)
                </div>
            </div>
            
            <div id="offline-status" style="margin-bottom: 12px; padding: 10px; background: rgba(237, 137, 54, 0.1); border: 1px solid rgba(237, 137, 54, 0.3); border-radius: 4px; font-size: 11px; color: #ed8936;">
                ⏳ No data loaded - Click "Load CSV File" to begin
            </div>
            
            <div style="margin-bottom: 12px;">
                <input type="file" id="csv-file-input" accept=".csv" style="display: none;" />
                <button id="load-csv-btn" style="
                    width: 100%;
                    padding: 10px;
                    background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
                    border: none;
                    border-radius: 6px;
                    color: white;
                    font-weight: 500;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s;
                " onmouseover="this.style.transform='translateY(-1px)'" 
                   onmouseout="this.style.transform='translateY(0)'">
                    📂 Load CSV File
                </button>
            </div>
            
            <div id="data-stats" style="display: none; margin-bottom: 12px; padding: 10px; background: rgba(72, 187, 120, 0.1); border: 1px solid rgba(72, 187, 120, 0.3); border-radius: 4px; font-size: 11px;">
                <!-- Stats will be populated here -->
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                <button id="test-current-config-btn" disabled style="
                    padding: 8px;
                    background: #4a5568;
                    border: 1px solid #718096;
                    border-radius: 4px;
                    color: #e2e8f0;
                    font-weight: 500;
                    cursor: not-allowed;
                    font-size: 11px;
                    opacity: 0.5;
                " title="Load CSV data first">
                    🧪 Test Config
                </button>
                
                <button id="clear-cache-btn" disabled style="
                    padding: 8px;
                    background: #4a5568;
                    border: 1px solid #718096;
                    border-radius: 4px;
                    color: #e2e8f0;
                    font-weight: 500;
                    cursor: not-allowed;
                    font-size: 11px;
                    opacity: 0.5;
                " title="Load CSV data first">
                    🗑️ Clear Cache
                </button>
            </div>
            
            <div style="margin-bottom: 12px;">
                <button id="toggle-mode-btn" disabled style="
                    width: 100%;
                    padding: 10px;
                    background: #4a5568;
                    border: 1px solid #718096;
                    border-radius: 4px;
                    color: #e2e8f0;
                    font-weight: 500;
                    cursor: not-allowed;
                    font-size: 11px;
                    opacity: 0.5;
                " title="Load CSV data first">
                    🔄 Switch to Online Mode
                </button>
            </div>
            
            <div style="margin-top: 12px; padding: 8px; background: rgba(160, 174, 192, 0.1); border-radius: 4px; font-size: 10px; color: #a0aec0;">
                💡 <strong>Tip:</strong> Offline mode is perfect for rapid parameter testing without rate limits.
                Results are cached for instant re-testing of the same configuration.
            </div>
        `;
        
        return container;
    }
    
    // ========================================
    // 🎮 INITIALIZATION & INTEGRATION
    // ========================================
    const dataLoader = new CSVDataLoader();
    const backtester = new OfflineBacktester(dataLoader);
    
    // Make globally accessible
    window.offlineBacktester = {
        dataLoader,
        backtester,
        isEnabled: false,
        
        // Enable offline mode (replaces API calls)
        enable() {
            if (!dataLoader.isLoaded) {
                console.warn('⚠️ Cannot enable offline mode - no data loaded');
                return false;
            }
            
            this.isEnabled = true;
            console.log('✅ Offline backtesting mode enabled');
            this.updateModeIndicator();
            return true;
        },
        
        // Disable offline mode (back to API calls)
        disable() {
            this.isEnabled = false;
            console.log('📡 Online mode enabled - using API calls');
            this.updateModeIndicator();
        },
        
        // Toggle between offline and online modes
        toggle() {
            if (this.isEnabled) {
                this.disable();
            } else {
                this.enable();
            }
            return this.isEnabled;
        },
        
        // Update mode indicator in UI
        updateModeIndicator() {
            const indicator = document.getElementById('optimization-mode-indicator');
            const modeStatus = document.getElementById('mode-status');
            
            if (indicator && modeStatus) {
                if (this.isEnabled) {
                    modeStatus.textContent = 'Offline (CSV) ⚡';
                    indicator.style.background = 'rgba(72, 187, 120, 0.1)';
                    indicator.style.borderColor = 'rgba(72, 187, 120, 0.3)';
                    indicator.style.color = '#48bb78';
                    indicator.innerHTML = '🗄️ Mode: <span id="mode-status">Offline (CSV) ⚡</span>';
                } else {
                    modeStatus.textContent = 'Online (API)';
                    indicator.style.background = 'rgba(66, 153, 225, 0.1)';
                    indicator.style.borderColor = 'rgba(66, 153, 225, 0.3)';
                    indicator.style.color = '#4299e1';
                    indicator.innerHTML = '📡 Mode: <span id="mode-status">Online (API)</span>';
                }
            }
        },
        
        // Verify offline mode status
        verifyStatus() {
            console.log('🔍 Offline Backtester Status Check:');
            console.log(`   Data Loaded: ${this.dataLoader.isLoaded ? '✅ YES' : '❌ NO'}`);
            console.log(`   Offline Mode: ${this.isEnabled ? '✅ ENABLED' : '⚠️ DISABLED'}`);
            
            if (this.dataLoader.isLoaded) {
                const stats = this.dataLoader.getStats();
                console.log(`   Dataset: ${stats.totalRows.toLocaleString()} rows, ${stats.uniqueTokens.toLocaleString()} tokens`);
                console.log(`   Hit Rate: ${stats.targetDistribution.hitRate}`);
            }
            
            console.log(`   Cache: ${this.backtester.getCacheStats().size} configs cached`);
            
            if (this.isEnabled) {
                console.log('✅ All API calls will use LOCAL CSV data (no network requests)');
            } else {
                console.log('⚠️ API calls will use LIVE NETWORK requests');
            }
            
            return {
                isLoaded: this.dataLoader.isLoaded,
                isEnabled: this.isEnabled,
                willUseOfflineData: this.isEnabled && this.dataLoader.isLoaded
            };
        }
    };
    
    // Setup event handlers
    function setupOfflineBacktesterHandlers() {
        const loadCsvBtn = document.getElementById('load-csv-btn');
        const csvFileInput = document.getElementById('csv-file-input');
        const testConfigBtn = document.getElementById('test-current-config-btn');
        const clearCacheBtn = document.getElementById('clear-cache-btn');
        const toggleModeBtn = document.getElementById('toggle-mode-btn');
        const statusDiv = document.getElementById('offline-status');
        const dataStatsDiv = document.getElementById('data-stats');
        
        // Load CSV button
        loadCsvBtn?.addEventListener('click', () => {
            csvFileInput?.click();
        });
        
        // File input handler
        csvFileInput?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            statusDiv.innerHTML = '⏳ Loading CSV file... Please wait.';
            statusDiv.style.background = 'rgba(237, 137, 54, 0.1)';
            statusDiv.style.borderColor = 'rgba(237, 137, 54, 0.3)';
            statusDiv.style.color = '#ed8936';
            
            loadCsvBtn.disabled = true;
            loadCsvBtn.innerHTML = '⏳ Loading...';
            
            try {
                const result = await dataLoader.loadFromFile(file);
                
                if (result.success) {
                    // Update status
                    statusDiv.innerHTML = `✅ Data loaded: ${result.rows.toLocaleString()} rows, ${result.uniqueTokens.toLocaleString()} unique tokens`;
                    statusDiv.style.background = 'rgba(72, 187, 120, 0.1)';
                    statusDiv.style.borderColor = 'rgba(72, 187, 120, 0.3)';
                    statusDiv.style.color = '#48bb78';
                    
                    // Show stats
                    const stats = dataLoader.getStats();
                    dataStatsDiv.style.display = 'block';
                    dataStatsDiv.innerHTML = `
                        <div style="font-weight: 600; margin-bottom: 6px;">📊 Dataset Statistics:</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                            <div>Rows: ${stats.totalRows.toLocaleString()}</div>
                            <div>Tokens: ${stats.uniqueTokens.toLocaleString()}</div>
                            <div>Hit Rate: ${stats.targetDistribution.hitRate}</div>
                            <div>Days: ${stats.timeRange?.daysSpan || 'N/A'}</div>
                        </div>
                        <div style="margin-top: 6px; font-size: 10px; opacity: 0.8;">
                            ${stats.timeRange ? `${stats.timeRange.start.split('T')[0]} to ${stats.timeRange.end.split('T')[0]}` : ''}
                        </div>
                    `;
                    
                    // Enable buttons
                    testConfigBtn.disabled = false;
                    testConfigBtn.style.cursor = 'pointer';
                    testConfigBtn.style.opacity = '1';
                    testConfigBtn.style.background = 'linear-gradient(135deg, #9f7aea 0%, #805ad5 100%)';
                    testConfigBtn.title = 'Test current configuration against loaded data';
                    
                    clearCacheBtn.disabled = false;
                    clearCacheBtn.style.cursor = 'pointer';
                    clearCacheBtn.style.opacity = '1';
                    clearCacheBtn.style.background = 'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)';
                    clearCacheBtn.title = 'Clear cached test results';
                    
                    toggleModeBtn.disabled = false;
                    toggleModeBtn.style.cursor = 'pointer';
                    toggleModeBtn.style.opacity = '1';
                    toggleModeBtn.innerHTML = '🔄 Switch to Online Mode';
                    toggleModeBtn.style.background = 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)';
                    toggleModeBtn.title = 'Toggle between offline (CSV) and online (API) modes';
                    
                    loadCsvBtn.innerHTML = '✅ Data Loaded';
                    
                    // Auto-enable offline mode
                    window.offlineBacktester.enable();
                }
            } catch (error) {
                console.error('❌ Error loading CSV:', error);
                statusDiv.innerHTML = `❌ Error: ${error.message}`;
                statusDiv.style.background = 'rgba(245, 101, 101, 0.1)';
                statusDiv.style.borderColor = 'rgba(245, 101, 101, 0.3)';
                statusDiv.style.color = '#f56565';
                
                loadCsvBtn.disabled = false;
                loadCsvBtn.innerHTML = '📂 Load CSV File';
            }
        });
        
        // Test current config button
        testConfigBtn?.addEventListener('click', async () => {
            if (!dataLoader.isLoaded) {
                alert('Please load CSV data first');
                return;
            }
            
            try {
                const config = await window.getCurrentConfigFromUI();
                const result = backtester.testConfiguration(config);
                
                if (result.success) {
                    const metrics = result.metrics;
                    alert(`🧪 Test Results (>5x Threshold):\n\n` +
                          `Matched Rows: ${result.matchedRows.toLocaleString()} (${result.matchRate}%)\n` +
                          `Total Tokens: ${metrics.totalTokens}\n` +
                          `>5x Rate: ${metrics.winRate}%\n` +
                          `Tokens >5x: ${metrics.tokensHitTp}\n` +
                          `TP PnL: ${metrics.tpPnlPercent}%\n` +
                          `Avg PnL/Token: ${metrics.avgPnlPerToken}%\n` +
                          `Cache Size: ${backtester.getCacheStats().size} configs`);
                } else {
                    alert('❌ Test failed: ' + result.error);
                }
            } catch (error) {
                console.error('❌ Test error:', error);
                alert('❌ Error testing config: ' + error.message);
            }
        });
        
        // Clear cache button
        clearCacheBtn?.addEventListener('click', () => {
            backtester.clearCache();
            alert('✅ Cache cleared');
        });
        
        // Toggle mode button
        toggleModeBtn?.addEventListener('click', () => {
            const wasEnabled = window.offlineBacktester.isEnabled;
            window.offlineBacktester.toggle();
            
            // Update button text
            if (window.offlineBacktester.isEnabled) {
                toggleModeBtn.innerHTML = '🔄 Switch to Online Mode';
                toggleModeBtn.style.background = 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)';
                alert('🗄️ Switched to Offline Mode\n\nOptimizations will now use local CSV data (100x faster!)');
            } else {
                toggleModeBtn.innerHTML = '🔄 Switch to Offline Mode';
                toggleModeBtn.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
                alert('📡 Switched to Online Mode\n\nOptimizations will now use live API data.');
            }
        });
        
        // Enable toggle button when data is loaded
        if (dataLoader.isLoaded) {
            toggleModeBtn.disabled = false;
            toggleModeBtn.style.cursor = 'pointer';
            toggleModeBtn.style.opacity = '1';
            toggleModeBtn.innerHTML = '🔄 Switch to Online Mode';
            toggleModeBtn.style.background = 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)';
            toggleModeBtn.title = 'Toggle between offline (CSV) and online (API) modes';
        }
    }
    
    // Inject UI into config tab
    function injectOfflineBacktesterUI() {
        const configTab = document.getElementById('config-tab');
        if (!configTab) {
            console.warn('⚠️ Config tab not found - will retry later');
            return false;
        }
        
        // Check if already injected
        if (document.getElementById('offline-backtester-ui')) {
            console.log('✅ Offline backtester UI already injected');
            return true;
        }
        
        const ui = createOfflineBacktesterUI();
        
        // Insert after the optimization controls
        const optimizationContainer = document.getElementById('optimization-ui-container');
        if (optimizationContainer) {
            optimizationContainer.appendChild(ui);
            console.log('✅ Offline backtester UI injected');
            
            // Setup event handlers
            setupOfflineBacktesterHandlers();
            
            return true;
        }
        
        return false;
    }
    
    // Wait for UI to be ready then inject
    const checkInterval = setInterval(() => {
        if (injectOfflineBacktesterUI()) {
            clearInterval(checkInterval);
        }
    }, 500);
    
    // Timeout after 10 seconds
    setTimeout(() => {
        clearInterval(checkInterval);
    }, 10000);
    
    console.log('✅ AGOfflineBacktester v1.0 - Ready');
    console.log('💡 Usage:');
    console.log('   1. Load CSV file via UI');
    console.log('   2. Enable offline mode: window.offlineBacktester.enable()');
    console.log('   3. Run optimizations as normal - they\'ll use local data!');
    
})();
