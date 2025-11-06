// ========================================
// 🗄️ AG OFFLINE BACKTESTER v2.0
// ========================================
// Exact API parity offline backtesting using historical CSV data
// Zero API calls - perfect for rapid optimization cycles

(function() {
    'use strict';
    
    console.log('📊 AGOfflineBacktester v2.0 - Loading...');
    
    // ========================================
    // 📁 CSV DATA LOADER
    // ========================================
    class CSVDataLoader {
        constructor() {
            this.data = null;
            this.headers = null;
            this.headerMap = null;
            this.isLoaded = false;
            this.totalRows = 0;
            this.uniqueTokens = new Set();
            this.timestampRange = { min: Infinity, max: -Infinity };
        }
        
        async loadFromFile(file) {
            console.log(`📂 Loading: ${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`);
            const text = await file.text();
            return this.loadFromText(text);
        }
        
        loadFromText(text) {
            const startTime = performance.now();
            const lines = text.split('\n');
            
            if (lines.length < 2) throw new Error('CSV too short');
            
            this.headers = this.parseCSVLine(lines[0]).map(h => h.trim());
            this.headerMap = new Map();
            this.headers.forEach((h, i) => this.headerMap.set(h, i));
            
            this.data = [];
            let parseErrors = 0;
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                try {
                    const values = this.parseCSVLine(line);
                    if (values.length !== this.headers.length) {
                        parseErrors++;
                        continue;
                    }
                    
                    this.data.push(values);
                    
                    const token = values[this.headerMap.get('tokenAddress')];
                    if (token) this.uniqueTokens.add(token);
                    
                    if (this.data.length % 100 === 0) {
                        const ts = parseInt(values[this.headerMap.get('timestamp')]);
                        if (!isNaN(ts)) {
                            this.timestampRange.min = Math.min(this.timestampRange.min, ts);
                            this.timestampRange.max = Math.max(this.timestampRange.max, ts);
                        }
                    }
                } catch (e) {
                    parseErrors++;
                }
            }
            
            this.scanTimestampRange();
            this.totalRows = this.data.length;
            this.isLoaded = true;
            
            const loadTime = (performance.now() - startTime).toFixed(0);
            console.log(`✅ Loaded ${this.totalRows.toLocaleString()} rows in ${loadTime}ms`);
            console.log(`🎯 ${this.uniqueTokens.size.toLocaleString()} unique tokens`);
            if (parseErrors > 0) console.warn(`⚠️ ${parseErrors} parse errors`);
            
            return { success: true, rows: this.totalRows, uniqueTokens: this.uniqueTokens.size, parseErrors };
        }
        
        parseCSVLine(line) {
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
                    else { inQuotes = !inQuotes; }
                } else if (char === ',' && !inQuotes) {
                    values.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current);
            return values;
        }
        
        scanTimestampRange() {
            const idx = this.headerMap.get('timestamp');
            if (idx === undefined) return;
            
            for (let i = 0; i < this.data.length; i++) {
                const ts = parseInt(this.data[i][idx]);
                if (!isNaN(ts)) {
                    this.timestampRange.min = Math.min(this.timestampRange.min, ts);
                    this.timestampRange.max = Math.max(this.timestampRange.max, ts);
                }
            }
        }
        
        getField(row, col) {
            const idx = this.headerMap.get(col);
            return idx !== undefined ? row[idx] : undefined;
        }
        
        getStats() {
            if (!this.isLoaded) return null;
            
            let hits = 0, misses = 0;
            const targetIdx = this.headerMap.get('target');
            
            if (targetIdx !== undefined) {
                for (let i = 0; i < this.data.length; i++) {
                    const target = parseInt(this.data[i][targetIdx]);
                    if (target === 1) hits++;
                    else if (target === 0) misses++;
                }
            }
            
            const stats = {
                totalRows: this.totalRows,
                uniqueTokens: this.uniqueTokens.size,
                columns: this.headers.length,
                targetDistribution: {
                    hits, misses,
                    hitRate: hits + misses > 0 ? ((hits/(hits+misses))*100).toFixed(2) + '%' : 'N/A'
                }
            };
            
            if (this.timestampRange.min !== Infinity) {
                stats.timeRange = {
                    start: new Date(this.timestampRange.min * 1000).toISOString(),
                    end: new Date(this.timestampRange.max * 1000).toISOString(),
                    daysSpan: ((this.timestampRange.max - this.timestampRange.min) / 86400).toFixed(1)
                };
            }
            
            return stats;
        }
    }
    
    // ========================================
    // 🔍 FILTER ENGINE
    // ========================================
    class FilterEngine {
        constructor(dataLoader) {
            this.dataLoader = dataLoader;
            this.parameterMap = {
                'Min MCAP (USD)': { column: 'mcap', type: 'min', dataType: 'number' },
                'Max MCAP (USD)': { column: 'mcap', type: 'max', dataType: 'number' },
                'Min Deployer Age (min)': { column: 'deployerAge', type: 'min', dataType: 'number' },
                'Min Token Age (sec)': { column: 'tokenAgeInSeconds', type: 'min', dataType: 'number', hasAgeConversion: true },
                'Max Token Age (sec)': { column: 'tokenAgeInSeconds', type: 'max', dataType: 'number', hasAgeConversion: true },
                'Min AG Score': { column: 'agScore', type: 'min', dataType: 'number' },
                'Min Holders': { column: 'holdersCount', type: 'min', dataType: 'number' },
                'Max Holders': { column: 'holdersCount', type: 'max', dataType: 'number' },
                'Holders Growth %': { column: 'holdersDiffPct', type: 'min', dataType: 'number' },
                'Holders Growth Minutes': { column: 'holdersSinceMinutes', type: 'max', dataType: 'number' },
                'Min Unique Wallets': { column: 'uniqueCount', type: 'min', dataType: 'number' },
                'Max Unique Wallets': { column: 'uniqueCount', type: 'max', dataType: 'number' },
                'Min KYC Wallets': { column: 'kycCount', type: 'min', dataType: 'number' },
                'Max KYC Wallets': { column: 'kycCount', type: 'max', dataType: 'number' },
                'Min Dormant Wallets': { column: 'dormantCount', type: 'min', dataType: 'number' },
                'Max Dormant Wallets': { column: 'dormantCount', type: 'max', dataType: 'number' },
                'Min SM Wallets': { column: 'smCount', type: 'min', dataType: 'number' },
                'Min Top Holders %': { column: 'topHoldersPct', type: 'min', dataType: 'number' },
                'Max Top Holders %': { column: 'topHoldersPct', type: 'max', dataType: 'number' },
                'Min Bundled %': { column: 'bundledPct', type: 'min', dataType: 'number' },
                'Max Bundled %': { column: 'bundledPct', type: 'max', dataType: 'number' },
                'Min Deployer Balance (SOL)': { column: 'deployerBalance', type: 'min', dataType: 'number' },
                'Min Buy Ratio %': { column: 'buyVolumePct', type: 'min', dataType: 'number' },
                'Max Buy Ratio %': { column: 'buyVolumePct', type: 'max', dataType: 'number' },
                'Min Vol MCAP %': { column: 'volMcapPct', type: 'min', dataType: 'number' },
                'Max Vol MCAP %': { column: 'volMcapPct', type: 'max', dataType: 'number' },
                'Max Drained %': { column: 'drainedPct', type: 'max', dataType: 'number' },
                'Max Drained Count': { column: 'drainedCount', type: 'max', dataType: 'number' },
                'Description': { column: 'hasDescription', type: 'boolean', dataType: 'boolean' },
                'Fresh Deployer': { column: 'freshDeployer', type: 'boolean', dataType: 'boolean' },
                'Skip If No KYC/CEX Funding': { column: 'fundingLabel', type: 'boolean-nonempty', dataType: 'boolean' },
                'Has Buy Signal': { column: 'signal', type: 'boolean', dataType: 'boolean' },
                'Min TTC (sec)': { column: 'ttc', type: 'min', dataType: 'number' },
                'Max TTC (sec)': { column: 'ttc', type: 'max', dataType: 'number' },
                'Max Liquidity %': { column: 'liquidityPct', type: 'max', dataType: 'number' },
                'Min Liquidity (USD)': { column: 'liquidity', type: 'min', dataType: 'number' },
                'Max Liquidity (USD)': { column: 'liquidity', type: 'max', dataType: 'number' },
                'Min Win Pred %': { column: 'winPredPercent', type: 'min', dataType: 'number' }
            };
        }
        
        filter(config, enableDiagnostics = false) {
            if (!this.dataLoader.isLoaded) throw new Error('Data not loaded');
            
            const flat = this.flattenConfig(config);
            const dateRange = this.getDateRange(flat);
            
            if (enableDiagnostics) {
                console.log('📅 Date Range:');
                console.log(`   Start: ${dateRange.startTs ? new Date(dateRange.startTs * 1000).toISOString() : 'none'}`);
                console.log(`   End:   ${dateRange.endTs ? new Date(dateRange.endTs * 1000).toISOString() : 'none'}`);
            }
            
            // Check for date range overlap
            const csvMin = this.dataLoader.timestampRange.min;
            const csvMax = this.dataLoader.timestampRange.max;
            const hasOverlap = (dateRange.startTs === null || dateRange.startTs <= csvMax) &&
                               (dateRange.endTs === null || dateRange.endTs >= csvMin);
            
            if (!hasOverlap) {
                console.warn('⚠️ DATE RANGE MISMATCH:');
                console.warn(`  CSV data: ${new Date(csvMin * 1000).toISOString()} to ${new Date(csvMax * 1000).toISOString()}`);
                console.warn(`  Requested: ${dateRange.startTs ? new Date(dateRange.startTs * 1000).toISOString() : 'no start'} to ${dateRange.endTs ? new Date(dateRange.endTs * 1000).toISOString() : 'no end'}`);
                console.warn('  Result: Zero matches expected (no overlap)');
            }
            
            // Collect active filters
            const activeFilters = [];
            for (const [param, config] of Object.entries(this.parameterMap)) {
                const threshold = flat[param];
                if (threshold !== undefined && threshold !== null) {
                    activeFilters.push({ param, threshold, column: config.column, type: config.type });
                }
            }
            
            if (enableDiagnostics && activeFilters.length > 0) {
                console.log('🔍 Active Filters (' + activeFilters.length + '):');
                activeFilters.forEach(f => {
                    console.log(`   ${f.param}: ${f.type} ${f.threshold} (column: ${f.column})`);
                });
            }
            
            const diagnostics = {
                totalRows: this.dataLoader.data.length,
                dateRange: {
                    requested: {
                        start: dateRange.startTs ? new Date(dateRange.startTs * 1000).toISOString() : 'none',
                        end: dateRange.endTs ? new Date(dateRange.endTs * 1000).toISOString() : 'none'
                    },
                    csvData: {
                        start: new Date(this.dataLoader.timestampRange.min * 1000).toISOString(),
                        end: new Date(this.dataLoader.timestampRange.max * 1000).toISOString()
                    },
                    hasOverlap
                },
                activeFilters: activeFilters.length,
                afterDateFilter: 0,
                afterParameterFilter: 0,
                afterDedup: 0,
                filterRejectReason: {}
            };
            
            const filtered = [];
            
            for (let i = 0; i < this.dataLoader.data.length; i++) {
                const row = this.dataLoader.data[i];
                if (!this.passesDateFilter(row, dateRange)) continue;
                diagnostics.afterDateFilter++;
                
                // Check which filter rejects (for diagnostics)
                if (enableDiagnostics && filtered.length < 10) {
                    for (const [param, config] of Object.entries(this.parameterMap)) {
                        const threshold = flat[param];
                        if (threshold === undefined || threshold === null) continue;
                        
                        const value = this.dataLoader.getField(row, config.column);
                        if (!this.passesFilter(value, threshold, config)) {
                            if (!diagnostics.filterRejectReason[param]) {
                                diagnostics.filterRejectReason[param] = 0;
                            }
                            diagnostics.filterRejectReason[param]++;
                            break; // Stop at first rejection
                        }
                    }
                }
                
                if (!this.passesAllFilters(row, flat)) continue;
                filtered.push(i);
            }
            
            diagnostics.afterParameterFilter = filtered.length;
            const deduplicated = this.deduplicateByToken(filtered);
            diagnostics.afterDedup = deduplicated.length;
            
            if (enableDiagnostics) {
                console.log('🔍 Filter Diagnostics:', diagnostics);
                
                // Show top rejection reasons
                const topReasons = Object.entries(diagnostics.filterRejectReason)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);
                if (topReasons.length > 0) {
                    console.log('🔍 Top Rejection Reasons (first 10 rows):');
                    topReasons.forEach(([param, count]) => {
                        console.log(`   ${param}: ${count} rejections`);
                    });
                }
            }
            
            return deduplicated;
        }
        
        flattenConfig(config) {
            const flat = {};
            const isNested = Object.values(config).some(v => 
                v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).some(k => !k.startsWith('_'))
            );
            
            if (!isNested) return config;
            
            for (const [key, value] of Object.entries(config)) {
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    if (key === 'dateRange') {
                        if (value.fromDate) flat['Start Date'] = value.fromDate;
                        if (value.toDate) flat['End Date'] = value.toDate;
                    } else {
                        Object.assign(flat, value);
                    }
                } else if (!key.startsWith('_')) {
                    flat[key] = value;
                }
            }
            
            // Normalize numeric values (convert strings to numbers for consistency)
            for (const [key, value] of Object.entries(flat)) {
                if (value === null || value === undefined || value === '') continue;
                
                // Check if this is a numeric parameter
                const paramConfig = this.parameterMap[key];
                if (paramConfig && paramConfig.dataType === 'number') {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                        flat[key] = numValue;
                    }
                }
            }
            
            return flat;
        }
        
        getDateRange(flat) {
            let startTs = null, endTs = null;
            
            if (flat['Start Date']) {
                const d = new Date(flat['Start Date']);
                startTs = Math.floor(d.getTime() / 1000);
            }
            
            if (flat['End Date']) {
                const d = new Date(flat['End Date']);
                // Set to end of day (23:59:59 UTC) to match API behavior
                d.setUTCHours(23, 59, 59, 999);
                endTs = Math.floor(d.getTime() / 1000);
            }
            
            if (!startTs && !endTs && typeof window !== 'undefined' && window.getDateRange) {
                try {
                    const ui = window.getDateRange();
                    if (ui.fromDate) {
                        const d = new Date(ui.fromDate);
                        startTs = Math.floor(d.getTime() / 1000);
                    }
                    if (ui.toDate) {
                        const d = new Date(ui.toDate);
                        // Set to end of day (23:59:59 UTC) to match API behavior
                        d.setUTCHours(23, 59, 59, 999);
                        endTs = Math.floor(d.getTime() / 1000);
                    }
                } catch (e) {}
            }
            
            if (!startTs && !endTs) {
                startTs = this.dataLoader.timestampRange.min;
                endTs = this.dataLoader.timestampRange.max;
            }
            
            return { startTs, endTs };
        }
        
        passesDateFilter(row, range) {
            const ts = parseInt(this.dataLoader.getField(row, 'timestamp'));
            if (isNaN(ts)) return false;
            if (range.startTs !== null && ts < range.startTs) return false;
            if (range.endTs !== null && ts > range.endTs) return false;
            return true;
        }
        
        /**
         * Get age value with fallback logic
         * Try tokenAgeInSeconds first, fall back to tokenAge if empty
         * IMPORTANT: Both tokenAgeInSeconds AND tokenAge are in SECONDS (not minutes)
         * 
         * @returns {string|null} The age value in seconds, or null if both are empty
         */
        getTokenAgeInSeconds(row) {
            // First try tokenAgeInSeconds column
            const ageInSeconds = this.dataLoader.getField(row, 'tokenAgeInSeconds');
            
            if (ageInSeconds !== '' && ageInSeconds !== null && ageInSeconds !== undefined) {
                return ageInSeconds;
            }
            
            // Fall back to tokenAge column (ALSO in seconds, not minutes!)
            const tokenAge = this.dataLoader.getField(row, 'tokenAge');
            if (tokenAge !== '' && tokenAge !== null && tokenAge !== undefined) {
                const ageNum = parseFloat(tokenAge);
                if (!isNaN(ageNum)) {
                    return String(ageNum); // Use as-is (already in seconds)
                }
            }
            
            // Both columns are empty
            return null;
        }
        
        passesAllFilters(row, flat, collectStats = false) {
            const stats = collectStats ? {} : null;
            
            for (const [param, config] of Object.entries(this.parameterMap)) {
                const threshold = flat[param];
                if (threshold === undefined || threshold === null) continue;
                
                // Special handling for token age: try tokenAgeInSeconds first, fall back to tokenAge * 60
                const value = config.hasAgeConversion 
                    ? this.getTokenAgeInSeconds(row)
                    : this.dataLoader.getField(row, config.column);
                
                const passes = this.passesFilter(value, threshold, config);
                
                if (collectStats) {
                    if (!stats[param]) stats[param] = { passed: 0, failed: 0, threshold, sampleValue: value };
                    if (passes) stats[param].passed++; else stats[param].failed++;
                }
                
                if (!passes) return collectStats ? { passes: false, stats } : false;
            }
            return collectStats ? { passes: true, stats } : true;
        }
        
        passesFilter(valueStr, threshold, config) {
            // Handle boolean-nonempty type (e.g., Skip If No KYC/CEX Funding)
            // When true, requires the field to have a non-empty value (reject if empty)
            if (config.type === 'boolean-nonempty') {
                // If threshold is false or not set, no filtering needed
                if (threshold === false || threshold === null || threshold === undefined || threshold === '' || 
                    threshold === 'null' || threshold === "Don't care") {
                    return true;
                }
                // If threshold is true, require non-empty value
                if (threshold === true) {
                    // Reject if empty, null, or undefined
                    if (valueStr === '' || valueStr === null || valueStr === undefined) {
                        return false;
                    }
                    // Also reject if the string is just whitespace
                    if (typeof valueStr === 'string' && valueStr.trim() === '') {
                        return false;
                    }
                    return true;  // Pass if has any non-empty value
                }
                return true;
            }
            
            if (config.dataType === 'boolean') return this.passesBooleanFilter(valueStr, threshold);
            
            // For token age filters: null/empty means both tokenAgeInSeconds and tokenAge are empty
            // This is a valid rejection case - API rejects tokens without age data
            if (config.hasAgeConversion) {
                if (valueStr === null || valueStr === '' || valueStr === undefined) {
                    return false;  // Reject tokens with no age data when age filter is active
                }
            }
            
            // List of CRITICAL MIN filters that require valid data (cannot skip with empty values)
            const criticalMinFilters = new Set([
                'uniqueCount',      // Min Unique Wallets - critical for quality
                'kycCount',         // Min KYC Wallets - critical for quality  
                'holdersCount',     // Min Holders - critical for quality
                'mcap',             // MCAP bounds - critical for strategy
                'holdersDiffPct'    // Holders Growth % - API rejects empty values
            ]);
            
            // List of CRITICAL MAX filters that require valid data (cannot skip with empty values)
            const criticalMaxFilters = new Set([
                'volMcapPct'        // FIX #10: Max Vol MCAP % - API rejects empty values
            ]);
            
            // Empty/null handling
            if (valueStr === '' || valueStr === null || valueStr === undefined) {
                // For critical MIN filters: empty means REJECT (missing critical data)
                if (config.type === 'min' && criticalMinFilters.has(config.column)) {
                    return false;  // Reject tokens with missing critical data
                }
                // For critical MAX filters: empty means REJECT (missing critical data)
                if (config.type === 'max' && criticalMaxFilters.has(config.column)) {
                    return false;  // Reject tokens with missing critical data
                }
                // For all other filters: empty means SKIP (no constraint applied)
                return true;
            }
            
            const value = parseFloat(valueStr);
            // Invalid numeric values (NaN from non-numeric strings) should reject
            if (isNaN(value)) return false;
            
            if (config.type === 'min') return value >= threshold;
            if (config.type === 'max') return value <= threshold;
            return true;
        }
        
        passesBooleanFilter(valueStr, threshold) {
            if (threshold === null || threshold === undefined || threshold === '' || 
                threshold === 'null' || threshold === "Don't care") return true;
            
            const value = this.parseBool(valueStr);
            const thresholdBool = this.parseBool(threshold);
            
            if (value === null && thresholdBool === null) return true;
            if (value === null) return false;
            return value === thresholdBool;
        }
        
        parseBool(v) {
            if (v === null || v === undefined || v === '') return null;
            const s = String(v).toLowerCase().trim();
            if (s === 'true' || s === '1' || s === 'yes') return true;
            if (s === 'false' || s === '0' || s === 'no') return false;
            return null;
        }
        
        deduplicateByToken(indices) {
            const map = new Map();
            
            for (const idx of indices) {
                const row = this.dataLoader.data[idx];
                const token = this.dataLoader.getField(row, 'tokenAddress');
                const ts = parseInt(this.dataLoader.getField(row, 'timestamp'));
                
                if (!token || isNaN(ts)) continue;
                
                if (!map.has(token)) {
                    map.set(token, idx);
                } else {
                    const existingIdx = map.get(token);
                    const existingTs = parseInt(this.dataLoader.getField(this.dataLoader.data[existingIdx], 'timestamp'));
                    // Keep EARLIEST timestamp (first appearance)
                    if (ts < existingTs) map.set(token, idx);
                }
            }
            
            return Array.from(map.values());
        }
    }
    
    // ========================================
    // 📊 METRICS CALCULATOR
    // ========================================
    class MetricsCalculator {
        constructor(dataLoader) {
            this.dataLoader = dataLoader;
        }
        
        calculate(indices) {
            if (indices.length === 0) return this.getEmpty();
            
            const targetIdx = this.dataLoader.headerMap.get('target');
            let hits = 0;
            
            for (const idx of indices) {
                const target = parseInt(this.dataLoader.data[idx][targetIdx]);
                if (target === 1) hits++;
            }
            
            const total = indices.length;
            const winRate = (hits / total) * 100;
            const totalPnl = (hits * 400) + ((total - hits) * -100);
            const tpPnlPercent = totalPnl / total;
            
            return {
                totalTokens: total,
                tokensHitTp: hits,
                winRate: parseFloat(winRate.toFixed(2)),
                realWinRate: parseFloat(winRate.toFixed(2)),
                tpPnlPercent: parseFloat(tpPnlPercent.toFixed(2)),
                avgPnlPerToken: parseFloat(tpPnlPercent.toFixed(2)),
                uniqueTokens: total,
                avgMcap: this.calcAvg(indices, 'mcap'),
                avgAgScore: this.calcAvg(indices, 'agScore'),
                avgLiquidity: this.calcAvg(indices, 'liquidity')
            };
        }
        
        getEmpty() {
            return {
                totalTokens: 0, tokensHitTp: 0, winRate: 0, realWinRate: 0,
                tpPnlPercent: 0, avgPnlPerToken: 0, uniqueTokens: 0,
                avgMcap: 0, avgAgScore: 0, avgLiquidity: 0
            };
        }
        
        calcAvg(indices, col) {
            let sum = 0, count = 0;
            for (const idx of indices) {
                const val = parseFloat(this.dataLoader.getField(this.dataLoader.data[idx], col));
                if (!isNaN(val)) { sum += val; count++; }
            }
            return count > 0 ? parseFloat((sum/count).toFixed(2)) : 0;
        }
    }
    
    // ========================================
    // 🎯 MAIN CLASS
    // ========================================
    class OfflineBacktester {
        constructor() {
            this.dataLoader = new CSVDataLoader();
            this.filterEngine = null;
            this.metricsCalculator = null;
            this.cache = new Map();
        }
        
        async loadData(file) {
            const result = await this.dataLoader.loadFromFile(file);
            if (result.success) {
                this.filterEngine = new FilterEngine(this.dataLoader);
                this.metricsCalculator = new MetricsCalculator(this.dataLoader);
            }
            return result;
        }
        
        testConfiguration(config, enableDiagnostics = false) {
            if (!this.dataLoader.isLoaded) {
                return { success: false, error: 'Data not loaded' };
            }
            
            try {
                const key = this.genKey(config);
                if (this.cache.has(key)) return { ...this.cache.get(key), cached: true };
                
                const indices = this.filterEngine.filter(config, enableDiagnostics);
                const metrics = this.metricsCalculator.calculate(indices);
                
                const result = {
                    success: true,
                    metrics,
                    matchedRows: indices.length,
                    totalRows: this.dataLoader.totalRows,
                    matchRate: ((indices.length / this.dataLoader.totalRows) * 100).toFixed(2)
                };
                
                this.cache.set(key, result);
                return result;
            } catch (error) {
                console.error('❌ Offline error:', error);
                return { success: false, error: error.message };
            }
        }
        
        genKey(config) {
            const flat = this.filterEngine.flattenConfig(config);
            const keys = Object.keys(flat).sort();
            return keys.map(k => {
                let v = flat[k];
                if (k === 'Start Date' || k === 'End Date') v = v ? new Date(v).toISOString() : 'null';
                return `${k}:${v}`;
            }).join('|');
        }
        
        clearCache() { this.cache.clear(); }
        getCacheStats() { return { size: this.cache.size }; }
        getStats() { return this.dataLoader.getStats(); }
    }
    
    // ========================================
    // 🎨 INTEGRATION
    // ========================================
    const bt = new OfflineBacktester();
    
    window.offlineBacktester = {
        backtester: bt,
        isEnabled: true, // DEFAULT TO ENABLED - soft force offline mode
        
        enable() {
            if (!bt.dataLoader.isLoaded) {
                console.warn('⚠️ No data loaded - offline mode enabled but will have zero results');
                console.warn('💡 Load CSV data to use offline mode, or use offlineBacktester.forceOnline() to switch');
            }
            this.isEnabled = true;
            
            // Clear AGCopilot's global config cache to prevent returning stale online results
            if (window.globalConfigCache && typeof window.globalConfigCache.clear === 'function') {
                window.globalConfigCache.clear();
                console.log('🗑️ Cleared global config cache (online results)');
            }
            
            // Clear optimization tracker's current best to remove stale online results
            if (window.optimizationTracker && window.optimizationTracker.currentBest) {
                window.optimizationTracker.currentBest = null;
                console.log('🗑️ Cleared optimization tracker (stale display state)');
            }
            
            console.log('✅ Offline mode enabled');
            return true;
        },
        
        disable() {
            this.isEnabled = false;
            console.log('📡 Online mode enabled');
        },
        
        forceOnline() {
            console.log('⚠️ FORCING ONLINE MODE - API rate limits will apply');
            console.log('💡 Use offlineBacktester.enable() to return to offline mode');
            this.isEnabled = false;
            return true;
        },
        
        toggle() {
            return this.isEnabled ? (this.disable(), false) : (this.enable(), true);
        },
        
        getStatus() {
            return {
                isLoaded: bt.dataLoader.isLoaded,
                isEnabled: this.isEnabled,
                willUseOfflineData: this.isEnabled && bt.dataLoader.isLoaded,
                willReturnZeroResults: this.isEnabled && !bt.dataLoader.isLoaded,
                cacheSize: bt.cache.size,
                totalRows: bt.dataLoader.totalRows,
                uniqueTokens: bt.dataLoader.uniqueTokens.size
            };
        }
    };
    
    function createUI() {
        const div = document.createElement('div');
        div.id = 'offline-backtester-ui';
        div.innerHTML = `
            <div style="margin-bottom:16px;padding:12px;background:rgba(66,153,225,0.1);border:1px solid rgba(66,153,225,0.3);border-radius:6px">
                <h4 style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:#4299e1">🗄️ Offline Mode (Default)</h4>
                <div style="margin:0;font-size:11px;color:#a0aec0">Load CSV for fast optimization. Use console to force online mode.</div>
            </div>
            <div id="offline-status" style="margin-bottom:12px;padding:10px;background:rgba(237,137,54,0.1);border:1px solid rgba(237,137,54,0.3);border-radius:4px;font-size:11px;color:#ed8936">⚠️ Offline mode active - Load CSV or type: offlineBacktester.forceOnline()</div>
            <div style="margin-bottom:12px">
                <input type="file" id="csv-file-input" accept=".csv" style="display:none"/>
                <button id="load-csv-btn" style="width:100%;padding:10px;background:linear-gradient(135deg,#4299e1 0%,#3182ce 100%);border:none;border-radius:6px;color:white;font-weight:500;cursor:pointer;font-size:12px">📂 Load CSV Data</button>
            </div>
            <div id="data-stats" style="display:none;margin-bottom:12px;padding:10px;background:rgba(72,187,120,0.1);border:1px solid rgba(72,187,120,0.3);border-radius:4px;font-size:11px"></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
                <button id="test-config-btn" disabled style="padding:8px;background:#4a5568;border:1px solid #718096;border-radius:4px;color:#e2e8f0;font-size:11px;opacity:0.5;cursor:not-allowed">🧪 Test</button>
                <button id="clear-cache-btn" disabled style="padding:8px;background:#4a5568;border:1px solid #718096;border-radius:4px;color:#e2e8f0;font-size:11px;opacity:0.5;cursor:not-allowed">🗑️ Clear</button>
            </div>
            <button id="force-online-btn" style="width:100%;padding:10px;background:linear-gradient(135deg,#f56565 0%,#e53e3e 100%);border:none;border-radius:6px;color:white;font-weight:500;cursor:pointer;font-size:11px;margin-bottom:8px">⚠️ Force Online Mode</button>
            <button id="toggle-mode-btn" disabled style="width:100%;padding:10px;background:#4a5568;border:1px solid #718096;border-radius:4px;color:#e2e8f0;font-size:11px;opacity:0.5;cursor:not-allowed">🔄 Toggle</button>
        `;
        return div;
    }
    
    function setupHandlers() {
        const $ = id => document.getElementById(id);
        const loadBtn = $('load-csv-btn'), fileInput = $('csv-file-input');
        const testBtn = $('test-config-btn'), clearBtn = $('clear-cache-btn'), toggleBtn = $('toggle-mode-btn');
        const forceOnlineBtn = $('force-online-btn');
        const status = $('offline-status'), stats = $('data-stats');
        
        loadBtn?.addEventListener('click', () => fileInput?.click());
        
        // Force Online button handler
        forceOnlineBtn?.addEventListener('click', () => {
            if (confirm('⚠️ WARNING: Switch to ONLINE mode?\n\n' +
                       'This will use the live API with rate limits.\n' +
                       'Optimizations will be much slower.\n\n' +
                       'Use offlineBacktester.enable() in console to return to offline mode.')) {
                window.offlineBacktester.forceOnline();
                status.innerHTML = '⚠️ ONLINE MODE - API rate limits active';
                status.style.background = 'rgba(245,101,101,0.1)';
                status.style.color = '#f56565';
                forceOnlineBtn.innerHTML = '✅ Online Mode Active';
                forceOnlineBtn.style.background = 'linear-gradient(135deg,#48bb78 0%,#38a169 100%)';
            }
        });
        
        fileInput?.addEventListener('change', async e => {
            const file = e.target.files[0];
            if (!file) return;
            
            status.innerHTML = '⏳ Loading...';
            loadBtn.disabled = true;
            loadBtn.innerHTML = '⏳ Loading...';
            
            try {
                const result = await bt.loadData(file);
                
                if (result.success) {
                    status.innerHTML = `✅ Loaded: ${result.rows.toLocaleString()} rows - Offline mode ready`;
                    status.style.background = 'rgba(72,187,120,0.1)';
                    status.style.color = '#48bb78';
                    
                    const s = bt.getStats();
                    stats.style.display = 'block';
                    stats.innerHTML = `
                        <div style="font-weight:600;margin-bottom:6px">📊 Stats:</div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
                            <div>Rows: ${s.totalRows.toLocaleString()}</div>
                            <div>Tokens: ${s.uniqueTokens.toLocaleString()}</div>
                            <div>Hit Rate: ${s.targetDistribution.hitRate}</div>
                            <div>Days: ${s.timeRange?.daysSpan || 'N/A'}</div>
                        </div>
                    `;
                    
                    [testBtn, clearBtn, toggleBtn].forEach(btn => {
                        btn.disabled = false;
                        btn.style.cursor = 'pointer';
                        btn.style.opacity = '1';
                    });
                    
                    testBtn.style.background = 'linear-gradient(135deg,#9f7aea 0%,#805ad5 100%)';
                    clearBtn.style.background = 'linear-gradient(135deg,#f56565 0%,#e53e3e 100%)';
                    toggleBtn.style.background = 'linear-gradient(135deg,#4299e1 0%,#3182ce 100%)';
                    
                    loadBtn.innerHTML = '✅ Loaded';
                    
                    // Re-enable offline mode and reset force online button
                    window.offlineBacktester.enable();
                    forceOnlineBtn.innerHTML = '⚠️ Force Online Mode';
                    forceOnlineBtn.style.background = 'linear-gradient(135deg,#f56565 0%,#e53e3e 100%)';
                }
            } catch (error) {
                status.innerHTML = `❌ Error: ${error.message}`;
                status.style.background = 'rgba(245,101,101,0.1)';
                status.style.color = '#f56565';
                loadBtn.disabled = false;
                loadBtn.innerHTML = '📂 Load CSV Data';
            }
        });
        
        testBtn?.addEventListener('click', async () => {
            try {
                const config = await window.getCurrentConfigFromUI();
                console.log('🧪 Testing config:', config);
                const result = bt.testConfiguration(config, true); // Enable diagnostics
                
                if (result.success) {
                    const m = result.metrics;
                    const msg = `🧪 Test Results:\n\n` +
                        `Matched: ${result.matchedRows}\n` +
                        `Tokens: ${m.totalTokens}\n` +
                        `Win Rate: ${m.winRate}%\n` +
                        `TP PnL: ${m.tpPnlPercent}%\n` +
                        `\nCheck console for detailed diagnostics.`;
                    alert(msg);
                } else {
                    alert('❌ Failed: ' + result.error);
                }
            } catch (error) {
                console.error('Test error:', error);
                alert('❌ Error: ' + error.message);
            }
        });
        
        clearBtn?.addEventListener('click', () => { bt.clearCache(); alert('✅ Cache cleared'); });
        
        toggleBtn?.addEventListener('click', () => {
            window.offlineBacktester.toggle();
            const enabled = window.offlineBacktester.isEnabled;
            toggleBtn.innerHTML = enabled ? '🔄 Go Online' : '🔄 Go Offline';
            alert(enabled ? '🗄️ Offline Mode' : '📡 Online Mode');
        });
    }
    
    function inject() {
        const container = document.getElementById('optimization-ui-container');
        if (container && !document.getElementById('offline-backtester-ui')) {
            container.appendChild(createUI());
            setupHandlers();
            console.log('✅ UI injected');
            return true;
        }
        return false;
    }
    
    const interval = setInterval(() => { if (inject()) clearInterval(interval); }, 500);
    setTimeout(() => clearInterval(interval), 10000);
    
    console.log('✅ AGOfflineBacktester v2.0 Ready');
    console.log('🔒 OFFLINE MODE ENABLED BY DEFAULT');
    console.log('📊 Load CSV data to use offline optimization (60-100x faster)');
    console.log('⚠️ To force online mode: offlineBacktester.forceOnline()');
    console.log('💡 To return to offline: offlineBacktester.enable()');
    
})();