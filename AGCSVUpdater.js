// ========================================
// 📝 AG CSV UPDATER v1.0
// ========================================
// Update CSV files with fresh data from /swaps API
// Batch fetch token data and export to CSV format

(function() {
    'use strict';
    
    console.log('📝 AGCSVUpdater v1.0 - Loading...');
    
    // ========================================
    // 🎯 CONFIGURATION
    // ========================================
    const CONFIG = {
        API_BASE_URL: 'https://backtester.alphagardeners.xyz/api',
        MAX_RETRIES: 3,
        RETRY_DELAY: 2000,
        REQUEST_DELAY: 250, // Conservative delay between requests
        BATCH_SIZE: 50, // Process 50 tokens at a time before pause
        BATCH_PAUSE: 5000, // 5s pause between batches
    };
    
    // ========================================
    // 🛠️ UTILITIES
    // ========================================
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    class APIRateLimiter {
        constructor(delay = 500) {
            this.delay = delay;
            this.lastRequest = 0;
            this.requestCount = 0;
        }
        
        async throttle() {
            const now = Date.now();
            const elapsed = now - this.lastRequest;
            
            if (elapsed < this.delay) {
                await sleep(this.delay - elapsed);
            }
            
            this.lastRequest = Date.now();
            this.requestCount++;
        }
        
        getStats() {
            return {
                totalRequests: this.requestCount,
                avgDelay: this.delay
            };
        }
    }
    
    const rateLimiter = new APIRateLimiter(CONFIG.REQUEST_DELAY);
    
    // ========================================
    // 🌐 API FUNCTIONS
    // ========================================
    async function fetchWithRetry(url, maxRetries = CONFIG.MAX_RETRIES) {
        await rateLimiter.throttle();
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🌐 Fetching (attempt ${attempt}/${maxRetries})`);
                const response = await fetch(url, {
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    if (response.status === 429) {
                        const delay = CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1);
                        console.log(`⏳ Rate limited (429), waiting ${delay / 1000}s...`);
                        await sleep(delay);
                        continue;
                    } else if (response.status === 502) {
                        console.warn(`⚠️ Bad Gateway (502), retrying...`);
                        await sleep(CONFIG.RETRY_DELAY * attempt);
                        continue;
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                return data;
                
            } catch (error) {
                console.log(`❌ Attempt ${attempt} failed: ${error.message}`);
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                await sleep(CONFIG.RETRY_DELAY * attempt);
            }
        }
    }
    
    /**
     * Fetch swaps data with filtering parameters
     * @param {Object} filters - Filter configuration
     * @returns {Promise<Object>} Swaps API response
     */
    async function fetchSwapsWithFilters(filters = {}) {
        const params = buildSwapsParams(filters);
        const url = `${CONFIG.API_BASE_URL}/swaps?${params}`;
        
        console.log(`🔍 Fetching swaps with filters:`, filters);
        return await fetchWithRetry(url);
    }
    
    /**
     * Build URL parameters for /swaps API
     * @param {Object} filters - Filter configuration
     * @returns {URLSearchParams} URL parameters
     */
    function buildSwapsParams(filters) {
        const params = new URLSearchParams();
        
        // Date range (default to wide range if not specified)
        params.append('fromDate', filters.fromDate || '2024-01-01');
        params.append('toDate', filters.toDate || '2025-12-31');
        
        // Pagination
        params.append('page', filters.page || 1);
        params.append('limit', filters.limit || 100);
        
        // Sorting
        params.append('sort', filters.sort || 'timestamp');
        params.append('direction', filters.direction || 'desc');
        
        // Optional filters
        if (filters.triggerMode !== undefined && filters.triggerMode !== null) {
            params.append('triggerMode', filters.triggerMode);
        }
        if (filters.source !== undefined && filters.source !== null) {
            params.append('source', filters.source);
        }
        if (filters.minMcap !== undefined) {
            params.append('minMcap', filters.minMcap);
        }
        if (filters.maxMcap !== undefined) {
            params.append('maxMcap', filters.maxMcap);
        }
        
        // TP Settings (if provided)
        // Can be array of {size, gain} or {sizePct, targetGainPct}
        if (filters.tpSettings && Array.isArray(filters.tpSettings)) {
            for (const tp of filters.tpSettings) {
                const size = tp.size || tp.sizePct || 25;
                const gain = tp.gain || tp.targetGainPct || 300;
                params.append('tpSize', size);
                params.append('tpGain', gain);
            }
        } else {
            // Default TP settings if not specified
            const defaultTPs = [
                { size: 20, gain: 300 },
                { size: 20, gain: 650 },
                { size: 20, gain: 1400 },
                { size: 20, gain: 3000 },
                { size: 20, gain: 10000 }
            ];
            for (const tp of defaultTPs) {
                params.append('tpSize', tp.size);
                params.append('tpGain', tp.gain);
            }
        }
        
        return params;
    }
    
    /**
     * Fetch ALL pages of swaps data (pagination handler)
     * @param {Object} filters - Filter configuration
     * @param {Function} progressCallback - Called after each page: (currentCount, totalCount)
     * @returns {Promise<Array>} All swaps from all pages
     */
    async function fetchAllSwaps(filters = {}, progressCallback = null) {
        const allSwaps = [];
        let page = 1;
        let totalCount = null;
        
        while (true) {
            const response = await fetchSwapsWithFilters({ ...filters, page, limit: 100 });
            
            if (!response.swaps || response.swaps.length === 0) {
                break;
            }
            
            allSwaps.push(...response.swaps);
            
            if (totalCount === null) {
                totalCount = response.totalCount || response.swaps.length;
            }
            
            if (progressCallback) {
                progressCallback(allSwaps.length, totalCount);
            }
            
            console.log(`📄 Page ${page}: ${response.swaps.length} swaps (total: ${allSwaps.length}/${totalCount})`);
            
            // Check if we got all data
            if (allSwaps.length >= totalCount || response.swaps.length < 100) {
                break;
            }
            
            page++;
            
            // Pause between pages to avoid rate limiting
            if (page % 10 === 0) {
                console.log(`⏸️ Pausing 3s after 10 pages...`);
                await sleep(3000);
            }
        }
        
        console.log(`✅ Fetched ${allSwaps.length} total swaps across ${page} pages`);
        return allSwaps;
    }
    
    // ========================================
    // 📊 CSV GENERATION
    // ========================================
    
    /**
     * Get CSV header matching heatmap_data format + TP calculation fields
     */
    function getCSVHeader() {
        return [
            'timestamp',
            'tokenAddress',
            'agScore',
            'athMcapDiffPct',
            'avgSecondsBetweenSwaps',
            'avgTimeBetweenSwaps',
            'avgZscore',
            'bundledPct',
            'buyVolumePct',
            'buyerLabel',
            'channelId',
            'channelType',
            'deployerAge',
            'deployerBalance',
            'deployerBalanceAtMint',
            'deployerFundingWinRate',
            'dormantCount',
            'drainedCount',
            'drainedPct',
            'freshDeployer',
            'fundingLabel',
            'gakePresent',
            'gakeSwap',
            'hasDescription',
            'hasSocials',
            'holdersChange',
            'holdersCount',
            'holdersData',
            'holdersDiffPct',
            'holdersSinceMinutes',
            'isPf',
            'kycCount',
            'liquidity',
            'liquidityPct',
            'marketDepth',
            'mcap',
            'signal',
            'smCount',
            'testWinPredPercent',
            'tokenAge',
            'tokenAgeInSeconds',
            'topHoldersPct',
            'totalRelated',
            'triggerMode',
            'ttc',
            'uniqueCount',
            'uniqueSellerCount',
            'convincedWalletsCount',
            'volMcapPct',
            'winPredPercent',
            'zScore',
            'target',
            // TP calculation fields (NEW)
            'signalMcap',
            'athMcap',
            'athGainPct',
            'tpSettings'
        ];
    }
    
    /**
     * Extract CSV row data from swap object
     * @param {Object} swap - Swap data from API
     * @returns {Array} CSV row values
     */
    function swapToCSVRow(swap) {
        // Helper to safely get value or empty string
        const get = (obj, path, defaultVal = '') => {
            const keys = path.split('.');
            let value = obj;
            for (const key of keys) {
                value = value?.[key];
                if (value === undefined || value === null) return defaultVal;
            }
            return value;
        };
        
        // Helper for boolean values
        const bool = (val) => {
            if (val === true || val === 'true' || val === 1 || val === '1') return 'true';
            if (val === false || val === 'false' || val === 0 || val === '0') return 'false';
            return '';
        };
        
        // Most data is in the criteria object, but timestamp, tokenAddress, triggerMode, winPredPercent are at root
        const c = swap.criteria || {}; // Shorthand for criteria
        
        // Calculate ATH gain % from signal mcap to ATH mcap
        const signalMcap = get(swap, 'signalMcap');
        const athMcap = get(swap, 'athMcap');
        let athGainPct = '';
        if (signalMcap && athMcap && signalMcap > 0) {
            athGainPct = ((athMcap - signalMcap) / signalMcap * 100).toFixed(2);
        }
        
        // Serialize tpSettings as JSON
        const tpSettings = swap.tpSettings ? JSON.stringify(swap.tpSettings) : '';
        
        return [
            get(swap, 'timestamp'),
            get(swap, 'tokenAddress'),
            get(c, 'agScore'),
            get(c, 'athMcapDiffPct'),
            get(c, 'avgSecondsBetweenSwaps'),
            get(c, 'avgTimeBetweenSwaps'),
            get(c, 'avgZscore'),
            get(c, 'bundledPct'),
            get(c, 'buyVolumePct'),
            get(c, 'buyerLabel'),
            get(c, 'channelId'),
            get(c, 'channelType'),
            get(c, 'deployerAge'),
            get(c, 'deployerBalance'),
            get(c, 'deployerBalanceAtMint'),
            get(c, 'deployerFundingWinRate'),
            get(c, 'dormantCount'),
            get(c, 'drainedCount'),
            get(c, 'drainedPct'),
            bool(get(c, 'freshDeployer')),
            get(c, 'fundingLabel'),
            get(c, 'gakePresent'),
            get(c, 'gakeSwap'),
            bool(get(c, 'hasDescription')),
            bool(get(c, 'hasSocials')),
            get(c, 'holdersChange'),
            get(c, 'holdersCount'),
            get(c, 'holdersData'),
            get(c, 'holdersDiffPct'),
            get(c, 'holdersSinceMinutes'),
            bool(get(c, 'isPf')),
            get(c, 'kycCount'),
            get(c, 'liquidity'),
            get(c, 'liquidityPct'),
            get(c, 'marketDepth'),
            get(c, 'mcap'),
            get(c, 'signal'),
            get(c, 'smCount'),
            get(swap, 'testWinPredPercent'),
            get(c, 'tokenAge'),
            get(c, 'tokenAge'), // tokenAgeInSeconds doesn't exist in API - use tokenAge (already in seconds)
            get(c, 'topHoldersPct'),
            get(c, 'totalRelated'),
            get(swap, 'triggerMode'),
            get(c, 'ttc'),
            get(c, 'uniqueCount'),
            get(c, 'uniqueSellerCount'),
            get(c, 'convincedWalletsCount'),
            get(c, 'volMcapPct'),
            get(swap, 'winPredPercent'),
            get(c, 'zScore'),
            get(swap, 'target', '0'), // Default target to 0 (needs manual labeling)
            // TP calculation fields
            signalMcap,
            athMcap,
            athGainPct,
            tpSettings
        ];
    }
    
    /**
     * Escape CSV field (handle commas, quotes, newlines)
     */
    function escapeCSVField(field) {
        if (field === null || field === undefined) return '';
        
        const str = String(field);
        
        // If field contains comma, quote, or newline, wrap in quotes and escape quotes
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        
        return str;
    }
    
    /**
     * Convert swaps array to CSV text
     * @param {Array} swaps - Array of swap objects
     * @param {boolean} includeHeader - Include CSV header row
     * @returns {string} CSV text
     */
    function swapsToCSV(swaps, includeHeader = true) {
        const lines = [];
        
        if (includeHeader) {
            lines.push(getCSVHeader().join(','));
        }
        
        for (const swap of swaps) {
            const row = swapToCSVRow(swap);
            const escapedRow = row.map(escapeCSVField);
            lines.push(escapedRow.join(','));
        }
        
        return lines.join('\n');
    }
    
    // ========================================
    // 📥 DOWNLOAD HELPERS
    // ========================================
    
    /**
     * Download CSV data as file
     * @param {string} csvText - CSV content
     * @param {string} filename - Output filename
     */
    function downloadCSV(csvText, filename = 'swaps_export.csv') {
        const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`💾 Downloaded: ${filename} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
    }
    
    // ========================================
    // 🎯 MAIN EXPORT FUNCTIONS
    // ========================================
    
    /**
     * Export swaps data to CSV with filters
     * @param {Object} options - Export configuration
     * @returns {Promise<Object>} Export results
     */
    async function exportSwapsToCSV(options = {}) {
        const {
            filters = {},
            filename = `swaps_export_${Date.now()}.csv`,
            includeHeader = true,
            autoDownload = true
        } = options;
        
        console.log('📊 Starting CSV export...');
        console.log('🔍 Filters:', filters);
        
        const startTime = Date.now();
        
        // Fetch all swaps with progress tracking
        const swaps = await fetchAllSwaps(filters, (current, total) => {
            const percent = ((current / total) * 100).toFixed(1);
            console.log(`📈 Progress: ${current}/${total} (${percent}%)`);
        });
        
        if (swaps.length === 0) {
            console.warn('⚠️ No swaps found with the given filters');
            return {
                success: false,
                error: 'No swaps found',
                swapCount: 0
            };
        }
        
        // Convert to CSV
        console.log('📝 Converting to CSV format...');
        const csvText = swapsToCSV(swaps, includeHeader);
        
        // Download if requested
        if (autoDownload) {
            downloadCSV(csvText, filename);
        }
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        
        const result = {
            success: true,
            swapCount: swaps.length,
            csvSize: csvText.length,
            csvSizeMB: (csvText.length / 1024 / 1024).toFixed(2),
            filename,
            duration: `${duration}s`,
            rateLimiterStats: rateLimiter.getStats()
        };
        
        console.log('✅ Export complete:', result);
        
        return result;
    }
    
    /**
     * Quick export with common presets
     */
    const quickExports = {

        async lastXDays(days, triggerMode = null) {
            const today = new Date();
            const xDaysAgo = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

            return await exportSwapsToCSV({
                filters: {
                    fromDate: xDaysAgo.toISOString().split('T')[0],
                    toDate: today.toISOString().split('T')[0],
                    triggerMode
                },
                filename: `swaps_last${days}days_${Date.now()}.csv`
            });
        },

        /**
         * Export last 7 days of data
         */
        async last7Days(triggerMode = null) {
            const today = new Date();
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            return await exportSwapsToCSV({
                filters: {
                    fromDate: weekAgo.toISOString().split('T')[0],
                    toDate: today.toISOString().split('T')[0],
                    triggerMode
                },
                filename: `swaps_last7days_${Date.now()}.csv`
            });
        },
        
        /**
         * Export last 30 days of data
         */
        async last30Days(triggerMode = null) {
            const today = new Date();
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            
            return await exportSwapsToCSV({
                filters: {
                    fromDate: monthAgo.toISOString().split('T')[0],
                    toDate: today.toISOString().split('T')[0],
                    triggerMode
                },
                filename: `swaps_last30days_${Date.now()}.csv`
            });
        },
        
        /**
         * Export specific date range
         */
        async dateRange(fromDate, toDate, triggerMode = null) {
            return await exportSwapsToCSV({
                filters: {
                    fromDate,
                    toDate,
                    triggerMode
                },
                filename: `swaps_${fromDate}_to_${toDate}.csv`
            });
        },
        
        /**
         * Export by trigger mode (Launchpads = mode 4)
         */
        async byTriggerMode(triggerMode, fromDate = '2024-01-01', toDate = '2025-12-31') {
            const modeNames = {
                0: 'bonding',
                1: 'graduated',
                2: 'raydium',
                3: 'god_mode',
                4: 'launchpads'
            };
            const modeName = modeNames[triggerMode] || `mode${triggerMode}`;
            
            return await exportSwapsToCSV({
                filters: {
                    fromDate,
                    toDate,
                    triggerMode
                },
                filename: `swaps_${modeName}_${Date.now()}.csv`
            });
        },
        
        /**
         * Export Launchpads only (mode 4)
         */
        async launchpadsOnly(fromDate = '2024-01-01', toDate = '2025-12-31') {
            return await this.byTriggerMode(4, fromDate, toDate);
        }
    };
    
    // ========================================
    // 🌍 GLOBAL API
    // ========================================
    
    window.csvUpdater = {
        // Main export function
        export: exportSwapsToCSV,
        
        // Quick export presets
        quick: quickExports,
        
        // Utility functions
        fetchSwaps: fetchSwapsWithFilters,
        fetchAllSwaps,
        swapsToCSV,
        downloadCSV,
        
        // Configuration
        config: CONFIG,
        rateLimiter,
        
        // Example usage
        examples: {
            basic: `
// Basic export (last 30 days with default TP settings)
await csvUpdater.export();

// Export with date range and custom TP settings
await csvUpdater.export({
    filters: {
        fromDate: '2024-10-01',
        toDate: '2024-10-31',
        triggerMode: 4, // Launchpads
        tpSettings: [
            { size: 20, gain: 300 },
            { size: 20, gain: 650 },
            { size: 20, gain: 1400 },
            { size: 20, gain: 3000 },
            { size: 20, gain: 10000 }
        ]
    },
    filename: 'october_launchpads.csv'
});

// Quick exports (use default TP settings)
await csvUpdater.quick.last7Days();
await csvUpdater.quick.last30Days();
await csvUpdater.quick.launchpadsOnly('2024-01-01', '2024-12-31');
await csvUpdater.quick.dateRange('2024-10-01', '2024-10-31', 4);

// Fetch without downloading
const swaps = await csvUpdater.fetchAllSwaps({
    fromDate: '2024-10-01',
    toDate: '2024-10-31',
    triggerMode: 4
});
console.log('Fetched', swaps.length, 'swaps');

// Convert to CSV manually
const csv = csvUpdater.swapsToCSV(swaps, true);
csvUpdater.downloadCSV(csv, 'my_export.csv');

// IMPORTANT: The CSV now includes:
// - signalMcap: Market cap when signal triggered
// - athMcap: All-time high market cap reached
// - athGainPct: Calculated gain % from signal to ATH
// - tpSettings: JSON array of TP configuration used
// This allows offline backtester to calculate ACCURATE TP PnL!
            `.trim()
        }
    };
    
    console.log('✅ AGCSVUpdater v1.0 Ready');
    console.log('📖 Usage: window.csvUpdater.export() or csvUpdater.quick.last7Days()');
    console.log('📖 Examples: csvUpdater.examples.basic');
    
})();
