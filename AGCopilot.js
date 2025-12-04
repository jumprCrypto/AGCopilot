(async function () {
    // ========================================
    // 🌐 DOM READY CHECK (Browser-specific)
    // ========================================
    // Ensure DOM is fully loaded before accessing elements
    if (document.readyState === 'loading') {
        console.log('⏳ Waiting for DOM to be ready...');
        await new Promise(resolve => {
            document.addEventListener('DOMContentLoaded', resolve, { once: true });
        });
        console.log('✅ DOM ready, initializing AGCopilot...');
    }
    
    console.clear();
    console.log('%c🤖 AG Copilot v2.0 🤖', 'color: blue; font-size: 16px; font-weight: bold;');
    console.log('%c🔍 Direct API Optimization + Signal Analysis + Config Generation', 'color: green; font-size: 12px;');

    // ========================================
    // 🎯 CONFIGURATION
    // ========================================
    const CONFIG = {
        // Original AGCopilot Optimization Settings (no API nQeeded)
        MAX_RUNTIME_MIN: 5, // Optimized for local API (10-20 req/s vs 0.05 remote)
        BACKTEST_WAIT: 20000, // Based on rate limit recovery test (20s)
        MIN_TOKENS: 10, // Minimum tokens per day (scaled by date range)
        TARGET_PNL: 100.0,
        
        // NEW: Chained runs settings
        CHAIN_RUN_COUNT: 8, // More runs with local API's higher throughput
        
        // Feature flags (keeping all original features)
        USE_CONFIG_CACHING: true,
        USE_SIMULATED_ANNEALING: true,
        USE_LATIN_HYPERCUBE_SAMPLING: true,
        
        // Scoring system configuration
        // Scoring mode: 'robust_real' | 'legacy_resistant' | 'tp_only' | 'winrate_only' | 'real_winrate_only'
        SCORING_MODE: 'robust',
        MIN_TOKENS: 10,            // Default minimum tokens per day (user-configurable via UI)
        RELIABILITY_WEIGHT: 0.3,   // Weight for sample size and consistency (0.0-1.0)
        CONSISTENCY_WEIGHT: 0.4,   // Weight for win rate (0.0-1.0)
        RETURN_WEIGHT: 0.6,        // Weight for raw PnL (0.0-1.0)
        // Note: CONSISTENCY_WEIGHT + RETURN_WEIGHT should = 1.0
        
        // Local API URL (always use local AGCopilotAPI)
        API_BASE_URL: 'http://192.168.50.141:5000/api',
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000,
        REQUEST_DELAY: 9360, // For signal analysis API (60% of BACKTEST_WAIT)
        
        // Backtester API Settings
        DEFAULT_BUYING_AMOUNT: 0.25, // Default buying amount for API calls
        
        // Take Profit (TP) configuration for accurate PnL calculations
        TP_CONFIGURATIONS: [
            { size: 20, gain: 300 },
            { size: 20, gain: 650 },    
            { size: 20, gain: 1400 },
            { size: 20, gain: 3000 },
            { size: 20, gain: 10000 }
        ],
        
        // ⚡ BURST RATE LIMITING CONFIGURATION (Local Backtester)
        BURST_SIZE: 50,           // Requests per burst (local backtester can handle more)
        BURST_RATE: 10,           // 10 requests per second for local backtester
        BURST_COOLDOWN_MS: 100,    // Minimal cooldown for local testing

        // Backward compatibility - use burst rate as base rate
        get REQUESTS_PER_SECOND() { return this.BURST_RATE; },
        get BACKTEST_WAIT() { return Math.round(1000 / this.BURST_RATE); },
        get REQUEST_DELAY() { return Math.round(1000 / this.BURST_RATE); }
    };

    // Parameter validation rules (same as original AGCopilot)
    const PARAM_RULES = {
        // Basic
        'Min MCAP (USD)': { min: 0, max: 20000, step: 250, type: 'integer'},
        'Max MCAP (USD)': { min: 10000, max: 60000, step: 250, type: 'integer' },
        'Min Market Depth': { min: 0, max: 100000, step: 5000, type: 'integer' },
        'Max Market Depth': { min: 0, max: 5000000, step: 10000, type: 'integer' },

        // Token Details
        'Min Deployer Age (min)': { min: 0, max: 10080, step: 5, type: 'integer' },
        'Min Token Age (sec)': { min: 0, max: 86400, step: 15, type: 'integer' },
        'Max Token Age (sec)': { min: 0, max: 259200, step: 15, type: 'integer' },
        'Min AG Score': { min: 0, max: 10, step: 1, type: 'integer' },

        // Wallets
        'Min Holders': { min: 1, max: 10, step: 1, type: 'integer' },
        'Max Holders': { min: 1, max: 100, step: 2, type: 'integer' },
        'Min Unique Wallets': { min: 1, max: 3, step: 1, type: 'integer' },
        'Max Unique Wallets': { min: 1, max: 8, step: 1, type: 'integer' },
        'Min KYC Wallets': { min: 0, max: 3, step: 1, type: 'integer' },
        'Max KYC Wallets': { min: 1, max: 8, step: 1, type: 'integer' },
        'Min Dormant Wallets': { min: 0, max: 10, step: 1, type: 'integer' },
        'Max Dormant Wallets': { min: 1, max: 20, step: 1, type: 'integer' },
        'Min Top Holders %': { min: 0, max: 100, step: 1, type: 'integer' },
        'Max Top Holders %': { min: 0, max: 100, step: 1, type: 'integer' },
        'Min Convinced Wallets': { min: 0, max: 10, step: 1, type: 'integer' },

        // Risk
        'Min Bundled %': { min: 0, max: 50, step: 1 },
        'Max Bundled %': { min: 0, max: 100, step: 1 },
        'Min Deployer Balance (SOL)': { min: 0, max: 10, step: 0.05 },
        'Max Deployer Balance (SOL)': { min: 0, max: 100, step: 0.5 },
        'Min Buy Ratio %': { min: 0, max: 50, step: 5 },
        'Max Buy Ratio %': { min: 50, max: 100, step: 1 },
        'Min Vol MCAP %': { min: 0, max: 100, step: 1 },
        'Max Vol MCAP %': { min: 33, max: 300, step: 1 },
        'Max Drained %': { min: 0, max: 100, step: 1 },
        'Max Drained Count': { min: 0, max: 11, step: 1, type: 'integer' },

        // Advanced
        'Min TTC (sec)': { min: 0, max: 86400, step: 10, type: 'integer' },
        'Max TTC (sec)': { min: 0, max: 86400, step: 30, type: 'integer' },
        'Max Liquidity %': { min: 10, max: 100, step: 10, type: 'integer' },
        'Min Win Pred %': { min: 0, max: 70, step: 5, type: 'integer' }
    };
    
    // Make PARAM_RULES globally available for external modules
    window.PARAM_RULES = PARAM_RULES;

    // Complete config template for backward compatibility (with Description and Fresh Deployer)
    const COMPLETE_CONFIG_TEMPLATE = {
        basic: {
            "Min MCAP (USD)": undefined,
            "Max MCAP (USD)": undefined,
            "Min Market Depth": undefined,
            "Max Market Depth": undefined
        },
        tokenDetails: {
            "Min Deployer Age (min)": undefined,
            "Min Token Age (sec)": undefined,
            "Max Token Age (sec)": undefined,
            "Min AG Score": undefined
        },
        wallets: {
            "Min Unique Wallets": undefined,
            "Min KYC Wallets": undefined,
            "Max KYC Wallets": undefined,
            "Max Unique Wallets": undefined,
            "Min Holders": undefined,
            "Max Holders": undefined,
            "Min Dormant Wallets": undefined,
            "Max Dormant Wallets": undefined,
            "Min Top Holders %": undefined,
            "Max Top Holders %": undefined,
            "Min Convinced Wallets": undefined
        },
        risk: {
            "Min Bundled %": undefined,
            "Max Bundled %": undefined,
            "Min Deployer Balance (SOL)": undefined,
            "Max Deployer Balance (SOL)": undefined,
            "Min Buy Ratio %": undefined,
            "Max Buy Ratio %": undefined,
            "Min Vol MCAP %": undefined,
            "Max Vol MCAP %": undefined,
            "Max Drained %": undefined,
            "Max Drained Count": undefined,
            "Description": undefined,
            "Fresh Deployer": undefined,
            "Skip If No KYC/CEX Funding": undefined
        },
        advanced: {
            "Min TTC (sec)": undefined,
            "Max TTC (sec)": undefined,
            "Max Liquidity %": undefined,
            "Min Win Pred %": undefined,
            "Has Buy Signal": undefined
    },
    // Optional, filled from UI if present
    tpSettings: {},
    takeProfits: []
    };

    // Make COMPLETE_CONFIG_TEMPLATE globally available for external scripts
    window.COMPLETE_CONFIG_TEMPLATE = COMPLETE_CONFIG_TEMPLATE;

   

    // ========================================
    // �🛠️ UTILITIES
    // ========================================
    const sleep = async (ms) => {
        const sleepStart = Date.now();
        await new Promise(resolve => setTimeout(resolve, ms));
        const actualElapsed = Date.now() - sleepStart;
        
        // Detect if tab was backgrounded (browser throttles timers)
        if (actualElapsed > ms * 1.5) {
            const drift = actualElapsed - ms;
            console.warn(`⚠️ Timer drift detected: expected ${ms}ms, actual ${actualElapsed}ms (${drift}ms drift)`);
            console.warn('💡 Tab may have been backgrounded. Browser throttles timers in background tabs.');
        }
        
        return actualElapsed;
    };
    
    // Make sleep globally available for external scripts
    window.sleep = sleep;
    
    // Initialize window.STOPPED for global access
    window.STOPPED = false;

    // Smart Rate Limiter - Reads x-ratelimit headers and proactively backs off
    class SimpleRateLimiter {
        constructor() {
            // Use CONFIG values directly - single source of truth
            this.lastCallTime = 0;
            this.totalCalls = 0;
            this.sessionStartTime = Date.now();
            
            // Burst state tracking
            this.burstCount = 0;
            this.lastBurstEndTime = 0;
            
            // Rate limit info from headers
            this.rateLimitInfo = {
                limit: null,        // x-ratelimit-limit
                remaining: null,    // x-ratelimit-remaining
                reset: null         // x-ratelimit-reset (unix timestamp)
            };
            
            // Stats tracking
            this.stats = {
                proactiveBackoffs: 0,
                rateLimitHits: 0
            };
            
            console.log(`🚀 Smart Rate Limiter: ${CONFIG.BURST_SIZE} requests @ ${CONFIG.BURST_RATE} req/s, then ${CONFIG.BURST_COOLDOWN_MS/1000}s cooldown`);
            console.log(`📊 Monitoring x-ratelimit headers for proactive backoff`);
        }

        async throttle() {
            const now = Date.now();
            
            // Proactive backoff if rate limit is low
            if (this.rateLimitInfo.remaining !== null && this.rateLimitInfo.remaining <= 5 && this.rateLimitInfo.remaining > 0) {
                const nowSeconds = Math.floor(now / 1000);
                const secondsUntilReset = this.rateLimitInfo.reset - nowSeconds;
                
                if (secondsUntilReset > 0 && secondsUntilReset < 300) { // Only if reset is within 5 minutes
                    this.stats.proactiveBackoffs++;
                    const waitTime = (secondsUntilReset + 5) * 1000; // Wait until reset + 5 seconds buffer
                    console.warn(
                        `Rate limit low (${this.rateLimitInfo.remaining}/${this.rateLimitInfo.limit} remaining). ` +
                        `Proactively waiting ${Math.ceil(waitTime / 1000)}s until reset...`
                    );
                    await sleep(waitTime);
                    console.log(`✅ Resuming after proactive rate limit wait...`);
                }
            }
            
            // Check if we need to cooldown after completing a burst
            if (this.burstCount >= CONFIG.BURST_SIZE) {
                const timeSinceBurstEnd = now - this.lastBurstEndTime;
                
                if (timeSinceBurstEnd < CONFIG.BURST_COOLDOWN_MS) {
                    const cooldownRemaining = CONFIG.BURST_COOLDOWN_MS - timeSinceBurstEnd;
                    console.log(`❄️ Burst cooldown: waiting ${(cooldownRemaining/1000).toFixed(1)}s (burst complete: ${this.burstCount}/${CONFIG.BURST_SIZE})`);
                    await sleep(cooldownRemaining);
                }
                
                // Reset burst counter after cooldown
                this.burstCount = 0;
                console.log(`🚀 New burst starting (${CONFIG.BURST_SIZE} requests @ ${CONFIG.BURST_RATE} req/s)`);
            }
            
            // Apply burst rate delay
            const burstDelayMs = 1000 / CONFIG.BURST_RATE;
            const timeSinceLastCall = now - this.lastCallTime;
            
            if (timeSinceLastCall < burstDelayMs) {
                const waitTime = burstDelayMs - timeSinceLastCall;
                await sleep(waitTime);
            }
            
            this.lastCallTime = Date.now();
            this.totalCalls++;
            this.burstCount++;
            
            // Mark burst end time when we hit the burst limit
            if (this.burstCount === CONFIG.BURST_SIZE) {
                this.lastBurstEndTime = Date.now();
            }
            
            // Log every 10 requests with rate limit status
            if (this.totalCalls % 10 === 0) {
                const elapsed = (Date.now() - this.sessionStartTime) / 1000;
                const actualRate = (this.totalCalls / elapsed).toFixed(2);
                let logMsg = `📡 ${this.totalCalls} requests | Actual: ${actualRate} req/s | Burst: ${this.burstCount}/${CONFIG.BURST_SIZE}`;
                
                // Add rate limit info if available
                if (this.rateLimitInfo.limit !== null) {
                    logMsg += ` | RL: ${this.rateLimitInfo.remaining}/${this.rateLimitInfo.limit}`;
                }
                
                console.log(logMsg);
            }
        }
        
        // Update rate limit info from response headers (modern approach)
        updateFromHeaders(headers) {
            if (!headers) return;
            
            const limit = headers.get ? headers.get('x-ratelimit-limit') : headers['x-ratelimit-limit'];
            const remaining = headers.get ? headers.get('x-ratelimit-remaining') : headers['x-ratelimit-remaining'];
            const reset = headers.get ? headers.get('x-ratelimit-reset') : headers['x-ratelimit-reset'];
            
            if (limit) {
                this.rateLimitInfo.limit = parseInt(limit);
                this.rateLimitInfo.remaining = parseInt(remaining);
                this.rateLimitInfo.reset = parseInt(reset);
                
                // Log warning if approaching rate limit (but not every time)
                if (this.rateLimitInfo.remaining <= 10 && this.totalCalls % 5 === 0) {
                    console.warn(`⚠️ Rate limit warning: ${this.rateLimitInfo.remaining}/${this.rateLimitInfo.limit} requests remaining`);
                }
            }
        }
        
        // Backward compatibility: Update from old rateLimitData format
        updateFromResponse(rateLimitData) {
            if (!rateLimitData) return;
            
            // If it's the new header format, delegate to updateFromHeaders
            if (rateLimitData.get || rateLimitData['x-ratelimit-limit']) {
                this.updateFromHeaders(rateLimitData);
                return;
            }
            
            // Old format compatibility (maxRequests/requestCount)
            if (rateLimitData.maxRequests) {
                this.rateLimitInfo.limit = rateLimitData.maxRequests;
                this.rateLimitInfo.remaining = rateLimitData.maxRequests - (rateLimitData.requestCount || 0);
            }
        }

        getStats() {
            const elapsed = (Date.now() - this.sessionStartTime) / 1000;
            const actualRate = elapsed > 0 ? (this.totalCalls / elapsed) : 0;
            
            const stats = {
                totalCalls: this.totalCalls,
                proactiveBackoffs: this.stats.proactiveBackoffs,
                rateLimitHits: this.stats.rateLimitHits,
                actualRate: actualRate,
                burstMode: {
                    currentBurst: `${this.burstCount}/${CONFIG.BURST_SIZE}`,
                    burstRate: `${CONFIG.BURST_RATE} req/s`,
                    cooldown: `${CONFIG.BURST_COOLDOWN_MS/1000}s`
                },
                timeSinceLastCall: Date.now() - this.lastCallTime
            };
            
            // Add rate limit info from headers if available
            if (this.rateLimitInfo.limit !== null) {
                stats.rateLimit = {
                    remaining: this.rateLimitInfo.remaining,
                    limit: this.rateLimitInfo.limit,
                    reset: this.rateLimitInfo.reset,
                    utilization: `${Math.round((1 - this.rateLimitInfo.remaining / this.rateLimitInfo.limit) * 100)}%`
                };
            }
            
            return stats;
        }
    }

    // Create rate limiter instance (no parameters needed - uses CONFIG)
    window.rateLimiter = new SimpleRateLimiter();
    window.burstRateLimiter = window.rateLimiter; // Backward compatibility alias
    
    // Create local references for backward compatibility
    const burstRateLimiter = window.rateLimiter;



    // Efficient deep clone utility function
    function deepClone(obj) {
        if (obj === null || typeof obj !== "object") return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (Array.isArray(obj)) return obj.map(item => deepClone(item));
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }

    // Make deepClone globally available for external scripts
    window.deepClone = deepClone;

    // ========================================
    // 🎨 FORMATTING UTILITIES
    // ========================================
    
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

    // Make formatting functions globally available for external scripts
    window.formatTimestamp = formatTimestamp;
    window.formatMcap = formatMcap;
    window.formatPercent = formatPercent;

    // Ensure complete config by merging with template
    function ensureCompleteConfig(config) {
        const completeConfig = deepClone(COMPLETE_CONFIG_TEMPLATE);
        for (const [section, sectionConfig] of Object.entries(config)) {
            if (completeConfig[section]) {
                Object.assign(completeConfig[section], sectionConfig);
            } else {
                completeConfig[section] = sectionConfig;
            }
        }
        return completeConfig;
    }

    // Make ensureCompleteConfig globally available for external scripts
    window.ensureCompleteConfig = ensureCompleteConfig;

    // Get selected trigger mode from UI dropdown
    function getTriggerMode() {
        const triggerSelect = document.getElementById('trigger-mode-select');
        if (triggerSelect) {
            const value = triggerSelect.value;
            return value === '' ? null : parseInt(value, 10); // Handle empty string for "Bullish Bonding"
        }
        return 4; // Default to Launchpads if no selection
    }

    const WEEKDAY_FULL_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const SECTION_LABEL_MAP = {
        'Start Date': 'Calculation Settings',
        'End Date': 'Calculation Settings',
        'Buying Amount (SOL)': 'Calculation Settings',
        'Entry Grace %': 'Calculation Settings',
        'Sources': 'Basic',
        'Weekdays': 'Time',
        'Start Hour': 'Time',
        'Start Minute': 'Time',
        'End Hour': 'Time',
        'End Minute': 'Time'
    };

    let cachedWeekdays = null;
    let cachedSources = null;

    function invalidateSelectionCache(options = {}) {
        const { weekdays = true, sources = true } = options;

        if (weekdays) {
            cachedWeekdays = null;
            try { window.agCachedWeekdays = null; } catch (_) {}
        }

        if (sources) {
            cachedSources = null;
            try { window.agCachedSources = null; } catch (_) {}
        }
    }

    function forceExpandBacktesterSection(sectionTitle) {
        if (!sectionTitle) return false;

        const headerButtons = Array.from(document.querySelectorAll('button[type="button"]'));
        const header = headerButtons.find(btn => btn.textContent && btn.textContent.includes(sectionTitle));
        if (!header) {
            return false;
        }

        const isExpanded = header.getAttribute('aria-expanded');
        if (isExpanded === 'true') {
            return true;
        }

        header.click();
        void header.offsetHeight; // force reflow
        return true;
    }

    function findBacktesterInput(labelText, selector = 'input') {
        const resolveLabel = () => {
            const labels = Array.from(document.querySelectorAll('.sidebar-label'));
            return labels.find(el => el.textContent.trim() === labelText);
        };

        let match = resolveLabel();
        if (!match) {
            forceExpandBacktesterSection(SECTION_LABEL_MAP[labelText]);
            match = resolveLabel();
        }

        if (!match) return null;

        const directSibling = match.nextElementSibling;
        if (directSibling && directSibling.matches(selector)) {
            return directSibling;
        }

        if (directSibling) {
            const nested = directSibling.querySelector(selector);
            if (nested) return nested;
        }

        let container = match.parentElement;
        let depth = 0;
        while (container && depth < 4) {
            const candidate = container.querySelector(selector);
            if (candidate) return candidate;
            container = container.parentElement;
            depth++;
        }

        return null;
    }

    // Get selected sources from backtester UI
    function getSelectedSources(options = {}) {
        const { forceRefresh = false } = options;
        if (!Array.isArray(cachedSources) && typeof window !== 'undefined' && Array.isArray(window.agCachedSources)) {
            cachedSources = [...window.agCachedSources];
        }

        if (!forceRefresh && Array.isArray(cachedSources)) {
            return [...cachedSources];
        }

        const sourceValueMap = {
            pumpfun: '1',
            launchcoin: '2',
            launchpad: '3',
            native: '4'
        };

        const resolveLabel = () => Array.from(document.querySelectorAll('.sidebar-label'))
            .find(el => el.textContent.trim() === 'Sources');

        let label = resolveLabel();
        if (!label && (forceRefresh || !Array.isArray(cachedSources))) {
            forceExpandBacktesterSection('Basic');
            label = resolveLabel();
        }

        const detectedSources = [];

        if (label) {
            const container = label.nextElementSibling || label.parentElement;
            const buttons = container ? Array.from(container.querySelectorAll('button')) : [];

            buttons.forEach(button => {
                const descriptor = (button.getAttribute('title') || button.textContent || '').trim().toLowerCase();
                const matchKey = Object.keys(sourceValueMap).find(key => descriptor.includes(key));
                if (!matchKey) return;

                const isActive = button.getAttribute('aria-pressed') === 'true' ||
                    button.getAttribute('data-selected') === 'true' ||
                    button.dataset?.selected === 'true' ||
                    button.classList.contains('bg-blue-500') ||
                    button.classList.contains('bg-blue-600') ||
                    button.classList.contains('bg-blue-700') ||
                    (button.classList.contains('text-white') && !button.classList.contains('text-gray-300'));

                if (isActive) {
                    detectedSources.push(sourceValueMap[matchKey]);
                }
            });

            const unique = Array.from(new Set(detectedSources));
            cachedSources = unique;
            try { window.agCachedSources = [...unique]; } catch (_) {}
            return [...unique];
        }

        if (!Array.isArray(cachedSources)) {
            cachedSources = [];
            try { window.agCachedSources = []; } catch (_) {}
        }
        return [...cachedSources];
    }

    function getSelectedWeekdays(options = {}) {
        const { forceRefresh = false } = options;
        if (!Array.isArray(cachedWeekdays) && typeof window !== 'undefined' && Array.isArray(window.agCachedWeekdays)) {
            cachedWeekdays = [...window.agCachedWeekdays];
        }

        if (!forceRefresh && Array.isArray(cachedWeekdays)) {
            return [...cachedWeekdays];
        }

        const resolveLabel = () => Array.from(document.querySelectorAll('.sidebar-label'))
            .find(el => el.textContent.trim() === 'Weekdays');

        let label = resolveLabel();
        if (!label && (forceRefresh || !Array.isArray(cachedWeekdays))) {
            forceExpandBacktesterSection('Time');
            label = resolveLabel();
        }

        if (!label) {
            if (!Array.isArray(cachedWeekdays)) {
                cachedWeekdays = [...WEEKDAY_FULL_NAMES];
                try { window.agCachedWeekdays = [...cachedWeekdays]; } catch (_) {}
            }
            return [...cachedWeekdays];
        }

        const container = label.parentElement || label.nextElementSibling;
        const buttons = container ? Array.from(container.querySelectorAll('button')) : [];
        if (buttons.length === 0) {
            if (!Array.isArray(cachedWeekdays)) {
                cachedWeekdays = [...WEEKDAY_FULL_NAMES];
                try { window.agCachedWeekdays = [...cachedWeekdays]; } catch (_) {}
            }
            return [...cachedWeekdays];
        }

        const selected = buttons
            .map(btn => {
                const title = btn.getAttribute('title') || btn.textContent.trim();
                if (!title) return null;
                const normalized = WEEKDAY_FULL_NAMES.find(day => day.toLowerCase().startsWith(title.toLowerCase()));
                if (!normalized) return null;

                // AG Backtester uses: selected = bg-[#85D028] + text-black, unselected = bg-gray-700 + text-gray-300
                const isSelected = btn.classList.contains('text-black') && !btn.classList.contains('bg-gray-700');

                return isSelected ? normalized : null;
            })
            .filter(Boolean);

        if (selected.length === 0) {
            // Fall back to treating all weekdays as selected if no active buttons detected
            cachedWeekdays = [...WEEKDAY_FULL_NAMES];
            try { window.agCachedWeekdays = [...cachedWeekdays]; } catch (_) {}
            return [...cachedWeekdays];
        }

        const seen = new Set();
        const ordered = [];
        WEEKDAY_FULL_NAMES.forEach(day => {
            if (selected.some(sel => sel.toLowerCase() === day.toLowerCase()) && !seen.has(day)) {
                seen.add(day);
                ordered.push(day);
            }
        });
        cachedWeekdays = ordered;
        try { window.agCachedWeekdays = [...ordered]; } catch (_) {}
        return [...ordered];
    }

    function setSelectedWeekdays(weekdays) {
        cachedWeekdays = Array.isArray(weekdays) ? [...weekdays] : null;
        try { window.agCachedWeekdays = Array.isArray(weekdays) ? [...weekdays] : null; } catch (_) {}
    }

    // Get time parameters from UI
    function getTimeParameters() {
        // Find the Time section select elements
        const findTimeSelect = (labelText) => {
            const labels = Array.from(document.querySelectorAll('.sidebar-label'));
            const label = labels.find(el => el.textContent.trim() === labelText);
            if (!label) return null;
            
            // The select should be the next sibling or within the parent's next element
            const container = label.parentElement?.nextElementSibling || label.nextElementSibling;
            return container ? container.querySelector('select') : null;
        };
        
        // Ensure Time section is expanded
        forceExpandBacktesterSection('Time');
        
        const startHourSelect = findTimeSelect('Start Hour');
        const startMinuteSelect = findTimeSelect('Start Minute');
        const endHourSelect = findTimeSelect('End Hour');
        const endMinuteSelect = findTimeSelect('End Minute');
        
        return {
            startHour: startHourSelect?.value || null,
            startMinute: startMinuteSelect?.value || null,
            endHour: endHourSelect?.value || null,
            endMinute: endMinuteSelect?.value || null
        };
    }

    // Set time parameters in UI
    function setTimeParameters(timeParams) {
        const findTimeSelect = (labelText) => {
            const labels = Array.from(document.querySelectorAll('.sidebar-label'));
            const label = labels.find(el => el.textContent.trim() === labelText);
            if (!label) return null;
            
            const container = label.parentElement?.nextElementSibling || label.nextElementSibling;
            return container ? container.querySelector('select') : null;
        };
        
        // Ensure Time section is expanded
        forceExpandBacktesterSection('Time');
        
        if (timeParams.startHour !== undefined && timeParams.startHour !== null) {
            const select = findTimeSelect('Start Hour');
            if (select) select.value = String(timeParams.startHour);
        }
        
        if (timeParams.startMinute !== undefined && timeParams.startMinute !== null) {
            const select = findTimeSelect('Start Minute');
            if (select) select.value = String(timeParams.startMinute);
        }
        
        if (timeParams.endHour !== undefined && timeParams.endHour !== null) {
            const select = findTimeSelect('End Hour');
            if (select) select.value = String(timeParams.endHour);
        }
        
        if (timeParams.endMinute !== undefined && timeParams.endMinute !== null) {
            const select = findTimeSelect('End Minute');
            if (select) select.value = String(timeParams.endMinute);
        }
    }

    // Get scoring mode from UI or config
    function getScoringMode() {
        const modeSelect = document.getElementById('scoring-mode-select');
        if (modeSelect && modeSelect.value) {
            return modeSelect.value; // 'robust_real' | 'legacy_resistant' | 'tp_only' | 'winrate_only' | 'real_winrate_only'
        }
        return CONFIG.SCORING_MODE || 'robust';
    }

    // Get date range from UI
    function getDateRange() {
        const fromDateInput = findBacktesterInput('Start Date', 'input[type="date"]');
        const toDateInput = findBacktesterInput('End Date', 'input[type="date"]');
        const fromDate = fromDateInput ? fromDateInput.value : null;
        const toDate = toDateInput ? toDateInput.value : null;
        
        // Return null for empty strings to avoid adding empty parameters
        return {
            fromDate: fromDate && fromDate.trim() ? fromDate : null,
            toDate: toDate && toDate.trim() ? toDate : null
        };
    }

    // Get buying amount from UI
    function getBuyingAmount() {
        const buyingAmountInput = findBacktesterInput('Buying Amount (SOL)', 'input[type="number"]');
        if (buyingAmountInput && buyingAmountInput.value) {
            const value = parseFloat(buyingAmountInput.value);
            if (!isNaN(value) && value > 0) {
                return value;
            }
        }
        // Fallback to default if not found or invalid
        return CONFIG.DEFAULT_BUYING_AMOUNT;
    }    // Calculate date range duration in days and scaling factor for token thresholds
    function getDateRangeScaling() {
        const dateRange = getDateRange();
        const DEFAULT_DAYS = 7; // Base scaling factor for 7-day period
        
        if (!dateRange.fromDate || !dateRange.toDate) {
            // No date range specified, use default scaling (1x)
            return {
                days: DEFAULT_DAYS,
                scalingFactor: 1,
                isDateFiltered: false
            };
        }
        
        try {
            const fromDate = new Date(dateRange.fromDate);
            const toDate = new Date(dateRange.toDate);
            
            // Calculate difference in days
            const timeDiff = toDate.getTime() - fromDate.getTime();
            const daysDiff = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24))); // At least 1 day
            
            // Calculate scaling factor (linear scaling based on days)
            const scalingFactor = daysDiff / DEFAULT_DAYS;
            
            return {
                days: daysDiff,
                scalingFactor: scalingFactor,
                isDateFiltered: true
            };
        } catch (error) {
            console.warn('Error calculating date range scaling:', error);
            return {
                days: DEFAULT_DAYS,
                scalingFactor: 1,
                isDateFiltered: false
            };
        }
    }

    // Get scaled token thresholds based on date range
    // Simplified: Only MIN_TOKENS matters now (per-day * days)
    function getScaledTokenThresholds() {
        const scaling = getDateRangeScaling();
        
        // Get minimum tokens per day from UI, fallback to CONFIG if not available
        const minTokensPerDayFromUI = parseInt(document.getElementById('min-tokens')?.value) || CONFIG.MIN_TOKENS || 10;
        
        // Calculate minimum tokens based on date range
        const minTokens = Math.max(10, Math.round(minTokensPerDayFromUI * scaling.days));
        
        console.log(`📊 Token Threshold - Min/Day: ${minTokensPerDayFromUI}, Days: ${scaling.days}, Required: ${minTokens} tokens`);
        
        return {
            MIN_TOKENS: minTokens,
            minTokensPerDay: minTokensPerDayFromUI,
            scalingInfo: scaling
        };
    }

    // Alias for parameter discovery compatibility
    async function getCurrentConfiguration() {
        return await getCurrentConfigFromUI();
    }

    // ========================================
    // 📌 PIN SETTINGS FEATURE
    // ========================================
    
    // Global pin settings state
    window.pinnedSettings = {
        enabled: false,
        settings: {},
        timeout: 10000 // 10 seconds
    };

    // Show pin settings dialog
    function showPinSettingsDialog(currentConfig, callback) {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'pin-settings-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 20000;
            display: flex;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(4px);
        `;

        // Create dialog
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: #1a2332;
            border: 1px solid #2d3748;
            border-radius: 12px;
            padding: 20px;
            min-width: 500px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            color: #e2e8f0;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        `;

        // Flatten config for easier processing (skip arrays like weekdays)
        const flatConfig = {};
        Object.entries(currentConfig).forEach(([sectionName, section]) => {
            if (typeof section === 'object' && section !== null && !Array.isArray(section)) {
                Object.assign(flatConfig, section);
            }
        });

        // Filter out undefined/empty values and group by category
        const takeProfitSettingPattern = /^TP \d+ % (Gain|Sell)$/;
        const validSettings = {};
        Object.entries(flatConfig).forEach(([key, value]) => {
            const isButtonToggle = (key === 'Description' || key === 'Fresh Deployer' || key === 'Skip If No KYC/CEX Funding' || key === 'Has Buy Signal');
            const isTakeProfitSetting = takeProfitSettingPattern.test(key);
            
            if (!isTakeProfitSetting && value !== undefined && value !== '' && key !== 'fromDate' && key !== 'toDate') {
                // For toggle buttons (Description/Fresh Deployer/Skip If No KYC/CEX Funding), only include if they're set to "Yes" (true)
                if (isButtonToggle) {
                    if (value === true) {
                        validSettings[key] = value;
                    }
                } else if (value !== null) {
                    validSettings[key] = value;
                }
            }
        });
        // Group settings by category for better organization
        const settingCategories = {
            'Basic': ['Min MCAP (USD)', 'Max MCAP (USD)', 'Min Market Depth', 'Max Market Depth'],
            'Token Details': ['Min AG Score', 'Min Token Age (sec)', 'Max Token Age (sec)', 'Min Deployer Age (min)'],
            'Wallets': ['Min Unique Wallets', 'Max Unique Wallets', 'Min KYC Wallets', 'Max KYC Wallets', 'Min Dormant Wallets', 'Max Dormant Wallets', 'Min Holders', 'Max Holders', 'Min Top Holders %', 'Max Top Holders %', 'Min Convinced Wallets'],
            'Risk': ['Min Bundled %', 'Max Bundled %', 'Min Deployer Balance (SOL)', 'Max Deployer Balance (SOL)', 'Min Buy Ratio %', 'Max Buy Ratio %', 'Min Vol MCAP %', 'Max Vol MCAP %', 'Max Drained %', 'Max Drained Count', 'Description', 'Fresh Deployer', 'Skip If No KYC/CEX Funding'],
            'Advanced': [/* 'Min TTC (sec)', 'Max TTC (sec)', */ 'Max Liquidity %', 'Min Win Pred %', 'Has Buy Signal'],
            'Time': ['Start Hour', 'Start Minute', 'End Hour', 'End Minute']
        };

        let dialogHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #f7fafc; display: flex; align-items: center; gap: 8px;">
                    📌 Pin Settings for Optimization
                </h3>
                <div id="pin-countdown" style="
                    font-size: 14px;
                    font-weight: 600;
                    color: #ffd700;
                    background: rgba(255, 215, 0, 0.1);
                    padding: 6px 12px;
                    border-radius: 20px;
                    border: 1px solid rgba(255, 215, 0, 0.3);
                ">10s</div>
            </div>
            
            <div style="
                background: rgba(59, 130, 246, 0.1);
                border: 1px solid rgba(59, 130, 246, 0.3);
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 16px;
                font-size: 13px;
                line-height: 1.5;
            ">
                💡 <strong>Pin Settings:</strong> Select settings to keep <strong>constant</strong> during optimization. 
                Pinned settings will never change, while unpinned settings will be optimized normally.
            </div>

            <div style="
                font-size: 12px;
                color: #a0aec0;
                margin-bottom: 16px;
                text-align: center;
            ">
                Found ${Object.keys(validSettings).length} configured settings
            </div>
        `;

        // Add checkboxes organized by category
        Object.entries(settingCategories).forEach(([categoryName, categorySettings]) => {
            const categoryValidSettings = categorySettings.filter(setting => validSettings.hasOwnProperty(setting));
            
            if (categoryValidSettings.length > 0) {
                dialogHTML += `
                    <div style="margin-bottom: 16px;">
                        <h4 style="
                            margin: 0 0 8px 0;
                            font-size: 13px;
                            font-weight: 600;
                            color: #63b3ed;
                            border-bottom: 1px solid #2d3748;
                            padding-bottom: 4px;
                        ">${categoryName}</h4>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                `;

                categoryValidSettings.forEach(setting => {
                    const value = validSettings[setting];
                    const displayValue = (value === null)
                        ? "Don't care"
                        : (typeof value === 'boolean' 
                            ? (value ? 'Yes' : "Don't care") 
                            : (typeof value === 'number' ? value.toLocaleString() : value));

                    dialogHTML += `
                        <label style="
                            display: flex;
                            align-items: center;
                            cursor: pointer;
                            font-size: 11px;
                            color: #e2e8f0;
                            padding: 6px 8px;
                            border-radius: 4px;
                            transition: background 0.2s;
                            background: rgba(255, 255, 255, 0.02);
                            border: 1px solid rgba(255, 255, 255, 0.1);
                        " onmouseover="this.style.background='rgba(255, 255, 255, 0.05)'" 
                          onmouseout="this.style.background='rgba(255, 255, 255, 0.02)'">
                            <input type="checkbox" class="pin-setting-checkbox" data-setting="${setting}" style="
                                margin-right: 8px;
                                transform: scale(0.9);
                                accent-color: #ffd700;
                            ">
                            <div>
                                <div style="font-weight: 500; color: #f7fafc;">${setting}</div>
                                <div style="font-size: 10px; color: #a0aec0; margin-top: 2px;">Current: ${displayValue}</div>
                            </div>
                        </label>
                    `;
                });

                dialogHTML += `
                        </div>
                    </div>
                `;
            }
        });

        // Add action buttons
        dialogHTML += `
            <div style="
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 12px;
                margin-top: 20px;
                padding-top: 16px;
                border-top: 1px solid #2d3748;
            ">
                <button id="pin-select-all" style="
                    padding: 10px;
                    background: rgba(99, 179, 237, 0.2);
                    border: 1px solid rgba(99, 179, 237, 0.4);
                    border-radius: 6px;
                    color: #63b3ed;
                    font-size: 12px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                " onmouseover="this.style.background='rgba(99, 179, 237, 0.3)'" 
                   onmouseout="this.style.background='rgba(99, 179, 237, 0.2)'">
                    ✅ Select All
                </button>
                
                <button id="pin-cancel" style="
                    padding: 10px;
                    background: rgba(237, 100, 166, 0.2);
                    border: 1px solid rgba(237, 100, 166, 0.4);
                    border-radius: 6px;
                    color: #ed64a6;
                    font-size: 12px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                " onmouseover="this.style.background='rgba(237, 100, 166, 0.3)'" 
                   onmouseout="this.style.background='rgba(237, 100, 166, 0.2)'">
                    ❌ Cancel
                </button>
                
                <button id="pin-ok" style="
                    padding: 10px;
                    background: rgba(72, 187, 120, 0.2);
                    border: 1px solid rgba(72, 187, 120, 0.4);
                    border-radius: 6px;
                    color: #48bb78;
                    font-size: 12px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                " onmouseover="this.style.background='rgba(72, 187, 120, 0.3)'" 
                   onmouseout="this.style.background='rgba(72, 187, 120, 0.2)'">
                    📌 Pin & Continue
                </button>
            </div>
        `;

        dialog.innerHTML = dialogHTML;
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Countdown timer
        let remainingSeconds = 10;
        const countdownElement = dialog.querySelector('#pin-countdown');
        const countdownInterval = setInterval(() => {
            remainingSeconds--;
            if (remainingSeconds > 0) {
                countdownElement.textContent = `${remainingSeconds}s`;
                if (remainingSeconds <= 3) {
                    countdownElement.style.color = '#ff6b6b';
                    countdownElement.style.background = 'rgba(255, 107, 107, 0.1)';
                    countdownElement.style.borderColor = 'rgba(255, 107, 107, 0.3)';
                }
            } else {
                clearInterval(countdownInterval);
                // Timeout - proceed with default optimization (no pins)
                cleanup();
                callback({ pinned: false, settings: {} });
            }
        }, 1000);

        // Event handlers
        function cleanup() {
            clearInterval(countdownInterval);
            document.body.removeChild(overlay);
        }

        function getPinnedSettings() {
            const checkboxes = dialog.querySelectorAll('.pin-setting-checkbox:checked');
            const pinnedSettings = {};
            checkboxes.forEach(checkbox => {
                const setting = checkbox.getAttribute('data-setting');
                pinnedSettings[setting] = validSettings[setting];
            });
            return pinnedSettings;
        }

        // Select All button
        dialog.querySelector('#pin-select-all').onclick = () => {
            const checkboxes = dialog.querySelectorAll('.pin-setting-checkbox');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !allChecked);
            
            // Update button text
            const selectAllBtn = dialog.querySelector('#pin-select-all');
            selectAllBtn.textContent = allChecked ? '✅ Select All' : '❌ Clear All';
        };

        // Cancel button
        dialog.querySelector('#pin-cancel').onclick = () => {
            cleanup();
            callback({ cancelled: true, pinned: false, settings: {} });
        };

        // OK button
        dialog.querySelector('#pin-ok').onclick = () => {
            const pinnedSettings = getPinnedSettings();
            cleanup();
            if (Object.keys(pinnedSettings).length > 0) {
                callback({ pinned: true, settings: pinnedSettings });
            } else {
                callback({ pinned: false, settings: {} });
            }
        };

        // ESC key handler
        function handleKeyPress(e) {
            if (e.key === 'Escape') {
                cleanup();
                document.removeEventListener('keydown', handleKeyPress);
                callback({ pinned: false, settings: {} });
            }
        }
        document.addEventListener('keydown', handleKeyPress);

        console.log(`📌 Pin Settings Dialog shown with ${Object.keys(validSettings).length} settings available for pinning`);
    }

    // Apply pinned settings constraint during optimization
    function applyPinnedSettingsConstraint(testConfig, pinnedSettings) {
        if (!pinnedSettings || Object.keys(pinnedSettings).length === 0) {
            return testConfig; // No pinned settings, return config unchanged
        }

        const constrainedConfig = deepClone(testConfig);
        
        // Apply pinned settings to each section
        Object.entries(constrainedConfig).forEach(([sectionKey, sectionData]) => {
            if (typeof sectionData === 'object' && sectionData !== null) {
                Object.entries(pinnedSettings).forEach(([pinnedKey, pinnedValue]) => {
                    if (sectionData.hasOwnProperty(pinnedKey)) {
                        if ((pinnedKey === 'Description' || pinnedKey === 'Fresh Deployer' || pinnedKey === 'Skip If No KYC/CEX Funding' || pinnedKey === 'Has Buy Signal')) {
                            let normalized = null;
                            if (pinnedValue === true || pinnedValue === 'Yes') normalized = true;
                            sectionData[pinnedKey] = normalized;
                        } else {
                            sectionData[pinnedKey] = pinnedValue;
                        }
                    }
                });
            }
        });

        return constrainedConfig;
    }

    // Update results display to show pinned settings
    function updateResultsWithPinnedSettings(pinnedSettings) {
        if (!pinnedSettings || Object.keys(pinnedSettings).length === 0) return;

        const resultsDiv = document.getElementById('best-config-stats');
        if (resultsDiv) {
            // Add pinned settings info to results
            const pinnedCount = Object.keys(pinnedSettings).length;
            const pinnedInfo = document.createElement('div');
            pinnedInfo.style.cssText = `
                margin-top: 8px;
                padding: 8px;
                background: rgba(255, 215, 0, 0.1);
                border: 1px solid rgba(255, 215, 0, 0.3);
                border-radius: 4px;
                font-size: 10px;
                color: #ffd700;
            `;
            
            pinnedInfo.innerHTML = `
                📌 <strong>${pinnedCount} Settings Pinned:</strong><br>
                ${Object.entries(pinnedSettings).map(([key, value]) => 
                    `• ${key}: ${typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}`
                ).join('<br>')}
            `;

            // Insert after existing stats but before buttons
            const firstButton = resultsDiv.querySelector('button');
            if (firstButton) {
                resultsDiv.insertBefore(pinnedInfo, firstButton);
            } else {
                resultsDiv.appendChild(pinnedInfo);
            }
        }
    }

    // ========================================
    // 🖥️ BEST CONFIG DISPLAY SYSTEM - Updates existing UI section
    // ========================================
    class OptimizationTracker {
        constructor() {
            this.currentBest = null;
            this.totalTests = 0;
            this.failedTests = 0;
            this.rateLimitFailures = 0; // Track only actual rate limiting failures
            this.startTime = null;
            this.isRunning = false;
            
            // NEW: Run tracking for chained runs and time estimates
            this.currentRun = 0;
            this.totalRuns = 1;
            this.maxRuntimeMs = CONFIG.MAX_RUNTIME_MIN * 60 * 1000; // Will be updated in startOptimization
            
            // 🌐 BROWSER: Session persistence key
            this.persistKey = 'agcopilot_session';
            
            // 🌐 BROWSER: Try to restore from localStorage
            this.restoreSession();
        }
        
        // 🌐 BROWSER: Save session state to localStorage
        saveSession() {
            try {
                const state = {
                    currentBest: this.currentBest,
                    totalTests: this.totalTests,
                    failedTests: this.failedTests,
                    rateLimitFailures: this.rateLimitFailures,
                    startTime: this.startTime,
                    isRunning: this.isRunning,
                    currentRun: this.currentRun,
                    totalRuns: this.totalRuns,
                    maxRuntimeMs: this.maxRuntimeMs,
                    timestamp: Date.now()
                };
                
                localStorage.setItem(this.persistKey, JSON.stringify(state));
            } catch (error) {
                if (error.name === 'QuotaExceededError') {
                    console.warn('⚠️ localStorage quota exceeded. Session persistence disabled.');
                } else {
                    console.warn('⚠️ Could not save session:', error.message);
                }
            }
        }
        
        // 🌐 BROWSER: Restore session state from localStorage
        restoreSession() {
            try {
                const stored = localStorage.getItem(this.persistKey);
                if (stored) {
                    const state = JSON.parse(stored);
                    
                    // Only restore if session is recent (within last hour)
                    const ageMs = Date.now() - (state.timestamp || 0);
                    if (ageMs < 3600000) { // 1 hour
                        this.currentBest = state.currentBest;
                        this.totalTests = state.totalTests || 0;
                        this.failedTests = state.failedTests || 0;
                        this.rateLimitFailures = state.rateLimitFailures || 0;
                        // Don't restore isRunning - optimization should be manually restarted
                        this.currentRun = state.currentRun || 0;
                        this.totalRuns = state.totalRuns || 1;
                        this.maxRuntimeMs = state.maxRuntimeMs || CONFIG.MAX_RUNTIME_MIN * 60 * 1000;
                        
                        if (this.currentBest) {
                            console.log(`💾 Session restored: ${this.totalTests} tests, best score: ${this.currentBest.metrics?.tpPnlPercent?.toFixed(1) || 'N/A'}%`);
                            this.updateBestConfigDisplay();
                        }
                    } else {
                        console.log('💾 Session data expired (>1hr), starting fresh');
                        localStorage.removeItem(this.persistKey);
                    }
                }
            } catch (error) {
                console.warn('⚠️ Could not restore session:', error.message);
            }
        }
        
        // 🌐 BROWSER: Clear session data
        clearSession() {
            try {
                localStorage.removeItem(this.persistKey);
                console.log('💾 Session data cleared');
            } catch (error) {
                console.warn('⚠️ Could not clear session:', error.message);
            }
        }

        startOptimization(totalRuns = 1) {
            this.isRunning = true;
            updateBestConfigHeader('running');  // Update header to show optimization is running
            this.startTime = Date.now();
            this.totalTests = 0;
            this.failedTests = 0;
            this.rateLimitFailures = 0;
            this.currentBest = null;
            this.currentRun = 1;
            this.totalRuns = totalRuns;
            this.maxRuntimeMs = CONFIG.MAX_RUNTIME_MIN * 60 * 1000 * totalRuns; // Total runtime for all runs
            this.saveSession(); // 🌐 BROWSER: Persist state
            this.updateBestConfigDisplay();
        }
        
        // NEW: Set current run for chained runs
        setCurrentRun(runNumber, totalRuns = null) {
            this.currentRun = runNumber;
            if (totalRuns) this.totalRuns = totalRuns;
            this.saveSession(); // 🌐 BROWSER: Persist state
            this.updateBestConfigDisplay();
        }
        
        // NEW: Calculate time remaining
        getTimeRemaining() {
            if (!this.startTime || !this.isRunning) return null;
            
            const elapsed = Date.now() - this.startTime;
            const remaining = this.maxRuntimeMs - elapsed;
            
            return Math.max(0, remaining);
        }
        
        // NEW: Format time remaining as human readable
        formatTimeRemaining() {
            const remainingMs = this.getTimeRemaining();
            if (remainingMs === null || remainingMs <= 0) return null;
            
            const minutes = Math.floor(remainingMs / 60000);
            const seconds = Math.floor((remainingMs % 60000) / 1000);
            
            if (minutes > 0) {
                return `${minutes}m ${seconds}s`;
            } else {
                return `${seconds}s`;
            }
        }
        
        // NEW: Get estimated completion time
        getEstimatedCompletionTime() {
            const remainingMs = this.getTimeRemaining();
            if (remainingMs === null || remainingMs <= 0) return null;
            
            const completionTime = new Date(Date.now() + remainingMs);
            return completionTime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
            });
        }

        stopOptimization() {
            this.isRunning = false;
            updateBestConfigHeader('idle');  // Reset header when optimization is manually stopped
            this.saveSession(); // 🌐 BROWSER: Persist state
            // Keep display showing final results
        }

        updateProgress(testCount, failedCount, rateLimitFailures = 0, currentBest = null) {
            this.totalTests = testCount;
            this.failedTests = failedCount;
            this.rateLimitFailures = rateLimitFailures;
            if (currentBest) {
                console.log('📊 Tracker: Updating currentBest', currentBest);
                this.currentBest = currentBest;
            }
            
            // 🌐 BROWSER: Throttle saves to avoid excessive localStorage writes
            if (!this._saveTimeout) {
                this._saveTimeout = setTimeout(() => {
                    this.saveSession();
                    this._saveTimeout = null;
                }, 5000); // Save at most every 5 seconds
            }
            
            this.updateBestConfigDisplay();
        }

        setCurrentBest(result, method = 'Unknown') {
            if (result && result.metrics) {
                this.currentBest = {
                    metrics: result.metrics,
                    config: result.config,
                    method: method,
                    timestamp: Date.now()
                };
                this.saveSession(); // 🌐 BROWSER: Persist state immediately on best update
                this.updateBestConfigDisplay();
            }
        }

        updateBestConfigDisplay() {
            const displayElement = document.getElementById('best-config-display');
            const statsElement = document.getElementById('best-config-stats');
            
            if (!displayElement || !statsElement) return;
            
            console.log('🖼️ Display: Rendering with currentBest=', this.currentBest ? 'exists' : 'null', 
                       'hasMetrics=', this.currentBest?.metrics ? 'yes' : 'no',
                       'isRunning=', this.isRunning,
                       'condition check=', (this.currentBest && this.currentBest.metrics) ? 'PASS' : 'FAIL');

            const runtime = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
            const runtimeMin = Math.floor(runtime / 60);
            const runtimeSec = Math.floor(runtime % 60);
            const testsPerMin = runtime > 0 ? (this.totalTests / (runtime / 60)).toFixed(1) : '0';
            
            // Get burst rate limiter stats
            const burstStats = burstRateLimiter.getStats();
            
            // Get server rate limit status if available
            const serverRateLimit = burstRateLimiter.serverRateLimit;
            const hasServerRateLimit = serverRateLimit && serverRateLimit.maxRequests !== null;
            
            // 🚀 OPTIMIZATION: Get cache performance metrics
            const cache = window.globalConfigCache;
            const cacheMetrics = cache ? cache.getMetrics() : null;
            const cacheEnabled = CONFIG.USE_CONFIG_CACHING && cache;
            
            // Calculate time remaining
            const timeRemaining = this.formatTimeRemaining();
            const progressPercent = this.maxRuntimeMs > 0 ? 
                Math.min(100, ((Date.now() - (this.startTime || Date.now())) / this.maxRuntimeMs) * 100) : 0;

            let content = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; font-size: 12px; font-weight: bold;">
                    <div>Tests: <span style="color: #4CAF50; font-weight: bold;">${this.totalTests}</span></div>
                    <div>Rejected: <span style="color: ${this.failedTests > 0 ? '#ff9800' : '#666'};">${this.failedTests}</span></div>
                    <div>Runtime: <span style="color: #4CAF50;">${runtimeMin}m ${runtimeSec}s</span></div>
                    <div>Rate: <span style="color: #4CAF50;">${testsPerMin}/min</span></div>
                    <div>📊 Run: <span style="color: #4CAF50; font-weight: bold;">${this.currentRun}/${this.totalRuns}</span></div>
                    ${burstStats.rateLimitHits > 0 ? 
                        `<div>⚠️ Rate Hits: <span style="color: #ff4444;">${burstStats.rateLimitHits}</span></div>` : 
                        '<div>✅ No Rate Hits</div>'
                    }
                    ${cacheEnabled && cacheMetrics && cacheMetrics.totalRequests > 0 ? 
                        `<div>💾 Cache: <span style="color: #4CAF50;">${cacheMetrics.hitRatePercent}</span></div>` :
                        (cacheEnabled ? 
                            '<div>💾 Cache: <span style="color: #ffa500;">Ready</span></div>' :
                            '<div>💾 Cache: <span style="color: #ff4444;">Off</span></div>'
                        )
                    }
                    ${cacheEnabled && cacheMetrics && cacheMetrics.apiCallsSaved > 0 ? 
                        `<div>🚀 Saved: <span style="color: #4CAF50;">${cacheMetrics.apiCallsSaved} API calls</span></div>` :
                        ''
                    }
                </div>
            `;
            
            // Add server rate limit status if available
            if (hasServerRateLimit) {
                const utilizationColor = serverRateLimit.utilizationPercent > 80 ? '#ff4444' : 
                                        serverRateLimit.utilizationPercent > 60 ? '#ff9800' : '#4CAF50';
                const remaining = serverRateLimit.maxRequests - serverRateLimit.currentCount;
                
                content += `
                    <div style="
                        margin-bottom: 8px; 
                        padding: 8px; 
                        background: rgba(59, 130, 246, 0.1); 
                        border: 1px solid rgba(59, 130, 246, 0.3); 
                        border-radius: 6px; 
                        font-size: 11px;
                    ">
                        <div style="font-weight: bold; margin-bottom: 4px; color: #63b3ed;">🌐 Server Rate Limit</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 10px;">
                            <div><span style="color: #aaa;">Used:</span> <span style="color: ${utilizationColor}; font-weight: bold;">${serverRateLimit.currentCount}/${serverRateLimit.maxRequests}</span></div>
                            <div><span style="color: #aaa;">Remaining:</span> <span style="color: ${remaining > 10 ? '#4CAF50' : '#ff9800'}; font-weight: bold;">${remaining}</span></div>
                            <div style="grid-column: 1 / -1;">
                                <span style="color: #aaa;">Utilization:</span> 
                                <span style="color: ${utilizationColor}; font-weight: bold;">${serverRateLimit.utilizationPercent}%</span>
                                ${serverRateLimit.delaySeconds > 0 ? 
                                    `<span style="color: #ff9800; margin-left: 8px;">⏳ ${serverRateLimit.delaySeconds}s delay</span>` : 
                                    ''
                                }
                            </div>
                        </div>
                        <div style="
                            margin-top: 4px; 
                            background: rgba(255,255,255,0.1); 
                            border-radius: 10px; 
                            height: 4px; 
                            overflow: hidden;
                        ">
                            <div style="
                                width: ${serverRateLimit.utilizationPercent}%; 
                                height: 100%; 
                                background: ${utilizationColor}; 
                                transition: width 0.3s ease;
                            "></div>
                        </div>
                    </div>
                `;
            }
            
            // Add progress bar for time remaining (only when running and time remaining is available)
            if (timeRemaining && this.isRunning && this.maxRuntimeMs > 0) {
                const progressColor = progressPercent > 80 ? '#ff4444' : progressPercent > 60 ? '#ff9800' : '#4CAF50';
                const completionTime = this.getEstimatedCompletionTime();
                content += `
                    <div style="margin-bottom: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px; font-size: 10px;">
                            <span style="color: #aaa;">Progress:</span>
                            <div style="flex: 1; background: rgba(255,255,255,0.1); border-radius: 10px; height: 6px; overflow: hidden;">
                                <div style="width: ${progressPercent.toFixed(1)}%; height: 100%; background: ${progressColor}; transition: width 0.3s ease;"></div>
                            </div>
                            <span style="color: ${progressColor}; font-weight: bold;">${progressPercent.toFixed(0)}%</span>
                        </div>
                        ${completionTime ? `<div style="font-size: 9px; color: #aaa; margin-top: 2px; text-align: center;">📅 Est. completion: ${completionTime}</div>` : ''}
                    </div>
                `;
            }

            if (this.currentBest && this.currentBest.metrics) {
                console.log('✅ Displaying Current Best section');
                const metrics = this.currentBest.metrics;
                
                content += `
                    <div style="border-top: 1px solid rgba(76, 175, 80, 0.3); padding-top: 8px; margin-bottom: 8px;">
                        <div style="font-size: 12px; font-weight: bold; color: #4CAF50; margin-bottom: 6px;">🏆 Current Best</div>
                        <div style="font-size: 11px; margin-bottom: 4px;">
                            <span style="color: #aaa;">Score:</span> <span style="color: #4CAF50; font-weight: bold;">${metrics.score?.toFixed(1) || 'N/A'}</span>
                            <span style="color: #666; margin: 0 6px;">|</span>
                            <span style="color: #aaa;">Method:</span> <span style="color: #63b3ed;">${this.currentBest.method}</span>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 10px; margin-bottom: 8px;">
                            <div><span style="color: #aaa;">Tokens:</span> <span style="color: #fff; font-weight: bold;">${metrics.totalTokens || 0}</span></div>
                            <div><span style="color: #aaa;">TP PnL:</span> <span style="color: ${(metrics.tpPnlPercent || 0) >= 0 ? '#4CAF50' : '#f44336'}; font-weight: bold;">${(metrics.tpPnlPercent || 0).toFixed(1)}%</span></div>
                            <div><span style="color: #aaa;">Win Rate (2x):</span> <span style="color: #fff;">${(metrics.winRate || 0).toFixed(1)}%</span></div>
                            <div><span style="color: #aaa;">Real WR (TP):</span> <span style="color: #4CAF50; font-weight: bold;">${(metrics.realWinRate || 0).toFixed(1)}%</span></div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            <button onclick="applyBestConfigToUI()" style="
                                padding: 10px;
                                background: rgba(59, 130, 246, 0.2);
                                border: 1px solid rgba(59, 130, 246, 0.4);
                                border-radius: 6px;
                                color: #63b3ed;
                                font-size: 11px;
                                cursor: pointer;
                                font-weight: 600;
                                transition: all 0.2s;
                            " onmouseover="this.style.background='rgba(59, 130, 246, 0.3)'" 
                               onmouseout="this.style.background='rgba(59, 130, 246, 0.2)'">
                                ⚙️ Apply to UI
                            </button>
                            <button onclick="copyBestConfigToClipboard()" style="
                                padding: 10px;
                                background: rgba(139, 92, 246, 0.2);
                                border: 1px solid rgba(139, 92, 246, 0.4);
                                border-radius: 6px;
                                color: #a78bfa;
                                font-size: 11px;
                                cursor: pointer;
                                font-weight: 600;
                                transition: all 0.2s;
                            " onmouseover="this.style.background='rgba(139, 92, 246, 0.3)'" 
                               onmouseout="this.style.background='rgba(139, 92, 246, 0.2)'">
                                📋 Copy JSON
                            </button>
                        </div>
                    </div>
                `;

                // Update global tracker for the apply buttons
                if (this.currentBest.metrics && this.currentBest.config && window.bestConfigTracker) {
                    // Validate that config has actual data before storing
                    const hasData = Object.keys(this.currentBest.config).some(section => {
                        const sectionData = this.currentBest.config[section];
                        if (Array.isArray(sectionData)) return sectionData.length > 0;
                        if (typeof sectionData === 'object' && sectionData !== null) {
                            return Object.keys(sectionData).some(k => sectionData[k] !== undefined && sectionData[k] !== null);
                        }
                        return sectionData !== undefined && sectionData !== null;
                    });
                    
                    if (hasData) {
                        window.bestConfigTracker.update(this.currentBest.config, this.currentBest.metrics, this.currentBest.metrics.score || 0, this.currentBest.method || 'Unknown');
                        window.currentBestConfig = this.currentBest.config;
                    } else {
                        console.warn('⚠️ Skipping tracker update - config appears to be empty');
                    }
                }
            } else if (this.isRunning) {
                console.log('⏳ Displaying "Searching..." message (isRunning=true, no currentBest)');
                content += `
                    <div style="text-align: center; padding: 8px; font-size: 10px; color: #aaa;">
                        🔍 Searching for optimal configuration...
                    </div>
                `;
            }

            // Add rate limiting warning only for actual rate limit failures
            if (this.rateLimitFailures > this.totalTests * 0.1 && this.totalTests > 10) {
                content += `
                    <div style="margin-top: 8px; margin-bottom: 8px; padding: 6px; background: rgba(255, 152, 0, 0.1); border: 1px solid #ff9800; border-radius: 4px; font-size: 9px; color: #ff9800;">
                        ⚠️ High rate limit failure rate detected (${this.rateLimitFailures}/${this.totalTests}). Burst rate limiter may need adjustment - check console for details.
                    </div>
                `;
            }

            statsElement.innerHTML = content;
        }
    }

    // Global optimization tracker instance
    window.optimizationTracker = new OptimizationTracker();

    if (!window.bestConfigTracker) {
        window.bestConfigTracker = {
            update: function(config, metrics, score, source) {
                this.config = config;
                this.metrics = metrics;
                this.score = score;
                this.source = source;
                this.id = Date.now();
            },
            getConfig: function() { return this.config; },
            getDebugInfo: function() { return { config: this.config, metrics: this.metrics, score: this.score, source: this.source }; }
        };
    }

    // ========================================
    // 🌐 API FUNCTIONS - Now in AGSignalAnalysis.js
    // ========================================
    async function fetchWithRetry(url, maxRetries = CONFIG.MAX_RETRIES) {
        await burstRateLimiter.throttle(); // Use the same burst rate limiter as the main optimization
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🌐 Fetching: ${url} (attempt ${attempt})`);
                const response = await fetch(url);
                
                if (!response.ok) {
                    if (response.status === 429) {
                        // Rate limited - let burst rate limiter handle it
                        burstRateLimiter.adaptToBurstLimit();
                        console.log(`⏳ Rate limited (429), burst rate limiter adapted for next requests...`);
                        throw new Error(`Rate limited (HTTP 429). Burst rate limiter handling recovery.`);
                    } else if (response.status === 404) {
                        // Not found - this is likely a legitimate "token not found" case
                        throw new Error(`Token not found in database (HTTP 404) - may be too new, unlisted, or incorrect address`);
                    } else if (response.status === 502) {
                        // Bad Gateway - server temporarily unavailable
                        throw new Error(`Server temporarily unavailable (HTTP 502 Bad Gateway) - will retry after delay`);
                    } else if (response.status === 500) {
                        // Server error - might be temporary
                        throw new Error(`Server error (HTTP 500) - API may be experiencing issues`);
                    } else {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                }
                
                const data = await response.json();
                burstRateLimiter.adaptToSuccess(); // Report success to burst rate limiter
                console.log(`✅ Successfully fetched data`);
                return data;
                
            } catch (error) {
                console.log(`❌ Attempt ${attempt} failed: ${error.message}`);
                
                if (attempt === maxRetries) {
                    throw new Error(`Failed to fetch after ${maxRetries} attempts: ${error.message}`);
                }
                
                // For rate limits, let the burst rate limiter handle delays
                if (error.message.includes('Rate limited')) {
                    // BurstRateLimiter will handle the next throttle() call appropriately
                    // Add a small additional delay for rate limit errors
                    await sleep(1000);
                } else if (error.message.includes('Server temporarily unavailable (HTTP 502')) {
                    // For 502 Bad Gateway errors, wait 5 minutes before retrying
                    const waitTime = 5 * 60 * 1000; // 5 minutes in milliseconds
                    console.log(`⏳ Server unavailable (502). Waiting 5 minutes before retry... (${new Date().toLocaleTimeString()})`);
                    await sleep(waitTime);
                    console.log(`🔄 Resuming after 5-minute wait (${new Date().toLocaleTimeString()})`);
                } else {
                    // For other errors, use standard retry delay
                    const retryDelay = CONFIG.RETRY_DELAY * attempt;
                    await sleep(retryDelay);
                }
            }
        }
    }

    // Get token info by search (contract address) - Enhanced with better error handling
    async function getTokenInfo(contractAddress) {
        // Try multiple search approaches for better token discovery
        const searchUrls = [
            // Primary search - recent data with broader limit
            `${CONFIG.API_BASE_URL}/swaps?search=${contractAddress}&sort=timestamp&direction=desc&page=1&limit=5`,
            // Fallback search - all time with broader date range  
            `${CONFIG.API_BASE_URL}/swaps?fromDate=2000-01-01&toDate=9999-12-31&search=${contractAddress}&sort=timestamp&direction=desc&page=1&limit=5`,
            // Alternative search without date filters
            `${CONFIG.API_BASE_URL}/swaps?search=${contractAddress}&limit=5`
        ];
        
        console.log(`🔍 Searching for token: ${contractAddress.substring(0, 8)}...${contractAddress.substring(-4)}`);
        
        for (let i = 0; i < searchUrls.length; i++) {
            try {
                const url = searchUrls[i];
                console.log(`  📡 Attempt ${i + 1}: ${url.split('?')[1] || 'no params'}`);
                
                const data = await fetchWithRetry(url);
                
                if (data.swaps && data.swaps.length > 0) {
                    console.log(`  ✅ Found ${data.swaps.length} results with search approach ${i + 1}`);
                    return data.swaps[0]; // Return the most recent swap
                } else {
                    console.log(`  ⚠️ No results with search approach ${i + 1}`);
                }
            } catch (error) {
                console.log(`  ❌ Search approach ${i + 1} failed: ${error.message}`);
            }
        }
        
        throw new Error(`Token not found in any search approach. Token may be too new, unlisted, or CA incorrect.`);
    }

    // Get all swaps for a specific token - Enhanced with better error handling and debugging
    async function getAllTokenSwaps(contractAddress) {
        console.log(`🔄 Fetching swap history for: ${contractAddress.substring(0, 8)}...${contractAddress.substring(-4)}`);
        
        try {
            const url = `${CONFIG.API_BASE_URL}/swaps/by-token/${contractAddress}`;
            console.log(`  📡 API call: ${url}`);
            
            const data = await fetchWithRetry(url);
            
            if (!data.swaps || data.swaps.length === 0) {
                console.log(`  ⚠️ No swap history found - token might have no signals or be very new`);
                throw new Error('No swap history found - token may have no signals or be very recent');
            }
            
            console.log(`  ✅ Found ${data.swaps.length} signals for token`);
            
            // Log signal overview for debugging
            if (data.swaps.length > 0) {
                const firstSignal = data.swaps[data.swaps.length - 1]; // Oldest
                const lastSignal = data.swaps[0]; // Most recent
                console.log(`  📊 Signal range: ${new Date(firstSignal.timestamp * 1000).toLocaleDateString()} to ${new Date(lastSignal.timestamp * 1000).toLocaleDateString()}`);
                console.log(`  🎯 Trigger modes: ${[...new Set(data.swaps.map(s => s.triggerMode || 'Unknown'))].join(', ')}`);
            }
            
            return data.swaps;
            
        } catch (error) {
            console.log(`  ❌ Failed to fetch swap history: ${error.message}`);
            throw error;
        }
    }

    // ========================================
    // � BACKTESTER API INTEGRATION (New: Direct API calls instead of UI scraping)
    // ========================================
    class BacktesterAPI {
        constructor() {
        }

        // Map AGCopilot parameter names to API parameter names
        mapParametersToAPI(config) {
            const apiParams = {};
            
            // Flatten the config structure first
            const flatConfig = this.flattenConfig(config);
            // Attach TP settings for downstream use
            if (config && Array.isArray(config.takeProfits) && config.takeProfits.length > 0) {
                apiParams.__takeProfits = config.takeProfits
                    .filter(tp => tp && !isNaN(Number(tp.size)) && !isNaN(Number(tp.gain)))
                    .map(tp => ({ size: Number(tp.size), gain: Number(tp.gain) }));
            } else if (config && config.tpSettings) {
                // Build from labeled tpSettings if present
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
            
            // Parameter mapping from AGCopilot names to API names
            const parameterMap = {
                // Basic parameters
                'Min MCAP (USD)': 'minMcap',
                'Max MCAP (USD)': 'maxMcap',
                'Min Market Depth': 'minMarketDepth',
                'Max Market Depth': 'maxMarketDepth',
                
                // Token Details
                'Min Deployer Age (min)': 'minDeployerAge',
                'Min Token Age (sec)': 'minTokenAge',
                'Max Token Age (sec)': 'maxTokenAge', 
                'Min AG Score': 'minAgScore',
                
                // Wallets
                'Min Holders': 'minHoldersCount',
                'Max Holders': 'maxHoldersCount',
                'Min Unique Wallets': 'minUniqueWallets',
                'Max Unique Wallets': 'maxUniqueWallets',
                'Min KYC Wallets': 'minKycWallets',
                'Max KYC Wallets': 'maxKycWallets',
                'Min Dormant Wallets': 'minDormantWallets',
                'Max Dormant Wallets': 'maxDormantWallets',
                // Top Holders (from backtester UI - may not be in AGCopilot UI yet)
                'Min Top Holders %': 'minTopHoldersPct',
                'Max Top Holders %': 'maxTopHoldersPct',
                // Convinced Wallets (new parameter)
                'Min Convinced Wallets': 'minConvincedWallets',
                // Smart Money Wallets (from backtester UI - may not be in AGCopilot UI yet)
                'Min SM Wallets': 'minSmWallets',
                
                // Risk
                'Min Bundled %': 'minBundledPercent',
                'Max Bundled %': 'maxBundledPercent',
                'Min Deployer Balance (SOL)': 'minDeployerBalance',
                'Max Deployer Balance (SOL)': 'maxDeployerBalance',
                'Min Buy Ratio %': 'minBuyRatio',
                'Max Buy Ratio %': 'maxBuyRatio',
                'Min Vol MCAP %': 'minVolMcapPercent',
                'Max Vol MCAP %': 'maxVolMcapPercent',
                'Max Drained %': 'maxDrainedPercent',
                'Max Drained Count': 'maxDrainedCount',
                
                // Advanced
                'Min TTC (sec)': 'minTtc',
                'Max TTC (sec)': 'maxTtc',
                'Max Liquidity %': 'maxLiquidityPct',
                'Min Win Pred %': 'minWinPredPercent',
                
                // Liquidity parameters
                'Min Liquidity (USD)': 'minLiquidity',
                'Max Liquidity (USD)': 'maxLiquidity',
                
                // Time parameters
                'Start Hour': 'startHour',
                'Start Minute': 'startMinute',
                'End Hour': 'endHour',
                'End Minute': 'endMinute',
                
                // Boolean fields
                'Description': 'needsDescription',
                'Fresh Deployer': 'needsFreshDeployer',
                'Skip If No KYC/CEX Funding': 'skipIfNoKycCexFunding',
                'Has Buy Signal': 'needsSignal'
            };
            
            // Map parameters - INCLUDE ALL, use empty string for unset values
            // CRITICAL: API expects STRING values for all parameters (except triggerMode and tpSettings which are handled separately)
            Object.entries(parameterMap).forEach(([agCopilotName, apiName]) => {
                const value = flatConfig[agCopilotName];
                
                // Handle boolean conversions (these can be omitted if not set)
                if (apiName === 'needsDescription' || apiName === 'needsFreshDeployer' || apiName === 'skipIfNoKycCexFunding' || apiName === 'needsSignal') {
                    if (value === true || value === 'Yes') {
                        apiParams[apiName] = true;
                    } else if (value === false || value === 'No') {
                        apiParams[apiName] = false;
                    }
                    // "Don't care" or undefined -> don't include parameter
                } else if (value !== undefined && value !== null && value !== '') {
                    // Validate numeric parameters but STORE AS STRING (API requirement)
                    const numericValue = parseFloat(value);
                    
                    // Skip if value is NaN, Infinity, or not a valid number
                    if (isNaN(numericValue) || !isFinite(numericValue)) {
                        console.log(`⚠️ Skipping invalid ${apiName}: ${value} (NaN or invalid)`);
                        return; // Skip this parameter
                    }
                    
                    // Special handling for AG Score (must be integer 0-10)
                    if (apiName === 'minAgScore') {
                        const agScore = Math.round(numericValue);
                        if (agScore < 0 || agScore > 10) {
                            console.log(`⚠️ AG Score out of range: ${agScore}, clamping to 0-10`);
                            apiParams[apiName] = String(Math.max(0, Math.min(10, agScore)));
                        } else {
                            apiParams[apiName] = String(agScore);
                        }
                    } else {
                        // CRITICAL: Store as STRING (API expects string values in /prepare body)
                        apiParams[apiName] = String(numericValue);
                    }
                }
            });
            
            // Add default parameters that are usually present
            const triggerMode = getTriggerMode();
            if (triggerMode !== null) {
                apiParams.triggerMode = triggerMode; // Use selected trigger mode (skip if null for Bullish Bonding)
            }
            
            // Add selected sources from UI
            const configSources = Array.isArray(config?.sources) ? config.sources : null;
            const selectedSources = Array.isArray(configSources)
                ? configSources
                : getSelectedSources();
            if (selectedSources.length > 0) {
                // API expects multiple sources parameters like: sources=1&sources=2&sources=3
                apiParams.sources = selectedSources;
            }
                     
            // Get buying amount: priority order: config > UI > default
            let buyingAmount = CONFIG.DEFAULT_BUYING_AMOUNT;
            if (config?.buyingAmount !== undefined && !isNaN(config.buyingAmount)) {
                buyingAmount = config.buyingAmount;
            } else {
                buyingAmount = getBuyingAmount();
            }
            // CRITICAL: Store as string for API compatibility
            apiParams.buyingAmount = String(buyingAmount);
            console.log(`💰 Using buying amount: ${buyingAmount} SOL`);
            
            // CRITICAL: Always include these three required fields (empty string if not set)
            // The API requires these fields to be present in the /prepare body
            const dateRange = getDateRange();
            apiParams.fromDate = dateRange.fromDate || '';
            apiParams.toDate = dateRange.toDate || '';
            
            if (dateRange.fromDate) {
                console.log(`📅 Including fromDate parameter: ${dateRange.fromDate}`);
            }
            if (dateRange.toDate) {
                console.log(`📅 Including toDate parameter: ${dateRange.toDate}`);
            }

            const configWeekdays = Array.isArray(config?.weekdays) ? config.weekdays : null;
            const selectedWeekdays = Array.isArray(configWeekdays)
                ? configWeekdays
                : getSelectedWeekdays();

            if (Array.isArray(selectedWeekdays) && selectedWeekdays.length > 0) {
                const normalizedWeekdays = [];
                const seen = new Set();
                WEEKDAY_FULL_NAMES.forEach(value => {
                    const match = selectedWeekdays.find(day => String(day).trim().toLowerCase() === value.toLowerCase());
                    if (match && !seen.has(value)) {
                        normalizedWeekdays.push(value);
                        seen.add(value);
                    }
                });
                if (normalizedWeekdays.length > 0) {
                    apiParams.weekdays = normalizedWeekdays;
                }
            }
            
            return apiParams;
        }        
        
        // Flatten nested config structure
        flattenConfig(config) {
            const flat = {};
            
            if (typeof config === 'object' && config !== null) {
                Object.values(config).forEach(section => {
                    if (Array.isArray(section)) {
                        return;
                    }
                    if (typeof section === 'object' && section !== null) {
                        Object.assign(flat, section);
                    }
                });
            }
            
            return flat;
        }
        
        // Validate min/max parameter pairs
        validateConfig(apiParams) {
            const validationErrors = [];
            
            const minMaxPairs = [
                ['minMcap', 'maxMcap'],
                ['minMarketDepth', 'maxMarketDepth'],
                ['minAgScore', 'maxAgScore'],
                ['minTokenAge', 'maxTokenAge'],
                ['minTtc', 'maxTtc'],
                ['minLiquidity', 'maxLiquidity'],
                ['minLiquidityPct', 'maxLiquidityPct'],
                ['minUniqueWallets', 'maxUniqueWallets'],
                ['minKycWallets', 'maxKycWallets'],
                ['minHoldersCount', 'maxHoldersCount'],  // Updated parameter name
                ['minTopHoldersPct', 'maxTopHoldersPct'],
                ['minBundledPercent', 'maxBundledPercent'],
                ['minDeployerBalance', 'maxDeployerBalance'],
                ['minBuyRatio', 'maxBuyRatio'],
                ['minVolMcapPercent', 'maxVolMcapPercent'],
                ['minDrainedPercent', 'maxDrainedPercent']
            ];
            
            minMaxPairs.forEach(([minKey, maxKey]) => {
                const minVal = apiParams[minKey];
                const maxVal = apiParams[maxKey];
                
                if (minVal !== undefined && maxVal !== undefined && 
                    !isNaN(minVal) && !isNaN(maxVal) && 
                    parseFloat(minVal) > parseFloat(maxVal)) {
                    validationErrors.push(`${minKey}(${minVal}) > ${maxKey}(${maxVal})`);
                }
            });
            
            return {
                isValid: validationErrors.length === 0,
                errors: validationErrors
            };
        }
        
        // Build API URL from parameters
        buildApiUrl(apiParams) {
            const params = new URLSearchParams();
            
            Object.entries(apiParams).forEach(([key, value]) => {
                // Skip internal or complex params
                if (key.startsWith('__')) return;
                
                // Handle sources array specially - API expects multiple sources parameters
                if (key === 'sources' && Array.isArray(value)) {
                    value.forEach(source => {
                        if (source !== undefined && source !== null && source !== '') {
                            params.append('sources', source);
                        }
                    });
                    return;
                }

                if (key === 'weekdays' && Array.isArray(value)) {
                    value.forEach(day => {
                        if (day !== undefined && day !== null && day !== '') {
                            params.append('weekdays', day);
                        }
                    });
                    return;
                }
                
                // Handle tokenAddresses array (for targeted/archetype optimization)
                if (key === 'tokenAddresses' && Array.isArray(value)) {
                    value.forEach(addr => {
                        if (addr !== undefined && addr !== null && addr !== '') {
                            params.append('tokenAddresses', addr);
                        }
                    });
                    return;
                }
                
                if (value !== undefined && value !== null && value !== '') {
                    // Additional validation before adding to URL
                    if (typeof value === 'number') {
                        // Skip NaN or infinite numbers
                        if (isNaN(value) || !isFinite(value)) {
                            console.log(`⚠️ Skipping invalid numeric parameter ${key}: ${value}`);
                            return;
                        }
                    } else if (typeof value === 'object') {
                        // Skip non-primitive values (except sources array handled above)
                        return;
                    }
                    
                    // Convert value to string and validate
                    const stringValue = String(value);
                    if (stringValue === 'NaN' || stringValue === 'undefined' || stringValue === 'null') {
                        console.log(`⚠️ Skipping invalid string parameter ${key}: ${stringValue}`);
                        return;
                    }
                    
                    params.append(key, stringValue);
                }
            });
            
            // Add multiple TP (Take Profit) parameters using UI/backtester values when available
            let tpPairs = [];
            try {
                // Priority 1: TP pairs explicitly passed via apiParams (__takeProfits is internal only)
                if (Array.isArray(apiParams.__takeProfits) && apiParams.__takeProfits.length > 0) {
                    tpPairs = apiParams.__takeProfits
                        .filter(tp => tp && !isNaN(Number(tp.size)) && !isNaN(Number(tp.gain)))
                        .map(tp => ({ size: Number(tp.size), gain: Number(tp.gain) }));
                }
                // Priority 2: Last UI config cache
                if ((!tpPairs || tpPairs.length === 0) && typeof window !== 'undefined') {
                    const uiConfig = window.agLastUIConfig || null;
                    if (uiConfig && Array.isArray(uiConfig.takeProfits) && uiConfig.takeProfits.length > 0) {
                        tpPairs = uiConfig.takeProfits
                        .filter(tp => tp && !isNaN(Number(tp.size)) && !isNaN(Number(tp.gain)))
                        .map(tp => ({ size: Number(tp.size), gain: Number(tp.gain) }));
                    }
                }
            } catch (e) {
                // ignore and fallback
            }

            if (!tpPairs || tpPairs.length === 0) {
                // Fallback to defaults from CONFIG
                tpPairs = (CONFIG.TP_CONFIGURATIONS || [])
                    .filter(tp => tp && !isNaN(Number(tp.size)) && !isNaN(Number(tp.gain)))
                    .map(tp => ({ size: Number(tp.size), gain: Number(tp.gain) }));
            }

            // Add TP settings as a single JSON parameter
            // Format: tpSettings=[{"sizePct":20,"targetGainPct":300},...]
            const tpSettingsArray = tpPairs.map(tp => ({
                sizePct: Number(tp.size),
                targetGainPct: Number(tp.gain)
            }));
            
            params.append('tpSettings', JSON.stringify(tpSettingsArray));
            
            console.log(`🎯 Built URL with ${tpPairs.length} TP pairs:`, tpSettingsArray);
            
            // Build the stats endpoint URL
            // API_BASE_URL already includes /api, so we append /stats
            const baseUrl = CONFIG.API_BASE_URL;
            const statsEndpoint = baseUrl.endsWith('/api') ? `${baseUrl}/stats` : baseUrl;
            return `${statsEndpoint}?${params.toString()}`;
        }
        
        // Fetch results from API using direct /stats call
        async fetchResults(config, retries = 3) {
            try {
                // Map AGCopilot config to API parameters FIRST for cache key generation
                const apiParams = this.mapParametersToAPI(config);
                
                // Validate parameters
                const validation = this.validateConfig(apiParams);
                if (!validation.isValid) {
                    return { 
                        success: true, 
                        error: 'Skipping Invalid configuration: ' + validation.errors.join(', '),
                        validation: validation.errors
                    };
                }
                
                // 🚀 OPTIMIZATION: Check cache BEFORE rate limiting to avoid consuming rate limit tokens on cache hits
                const cache = window.globalConfigCache;
                if (CONFIG.USE_CONFIG_CACHING && cache && cache.has(config)) {
                    const cached = cache.get(config);
                    cache.recordHit(); // Record the cache hit for metrics
                    console.log(`    💾 Cache hit (bypassed rate limiting): API call saved | ${cache.getPerformanceSummary()}`);
                    return cached;
                }
                
                // Cache miss - record it
                if (CONFIG.USE_CONFIG_CACHING && cache) {
                    cache.recordMiss();
                }
                
                // Log date range information if present
                if (apiParams.fromDate || apiParams.toDate) {
                    console.log(`📅 Date range: ${apiParams.fromDate || 'No start'} to ${apiParams.toDate || 'No end'}`);
                }
                
                // Additional validation for AG Score
                if (apiParams.minAgScore !== undefined && (apiParams.minAgScore === 'NaN' || apiParams.minAgScore === 'undefined')) {
                    console.error(`❌ CRITICAL: NaN/undefined AG Score detected! This will cause 500 error.`);
                    return { 
                        success: false, 
                        error: 'Invalid AG Score parameter (NaN/undefined)',
                        source: 'VALIDATION'
                    };
                }
                
                for (let attempt = 1; attempt <= retries; attempt++) {
                    try {
                        // Apply rate limiting before API call
                        await burstRateLimiter.throttle();
                        
                        const url = this.buildApiUrl(apiParams);
                        
                        console.log(`📊 Full stats URL: ${url}`);
                        
                        const response = await fetch(url, {
                            method: 'GET',
                            mode: 'cors',
                            credentials: 'include',
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json'
                            }
                        });
                        
                        // Read rate limit headers from response
                        burstRateLimiter.updateFromHeaders(response.headers);
                        
                        if (!response.ok) {
                            if (response.status === 429) {
                                // Rate limited - adapt the burst limiter and handle with aggressive backoff
                                console.warn(`⚠️ Rate limit hit (429) on attempt ${attempt}/${retries} - CRITICAL FAILURE`);
                                burstRateLimiter.adaptToBurstLimit();
                                
                                const retryAfter = response.headers.get('Retry-After');
                                let waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.max(20000, CONFIG.RATE_LIMIT_RECOVERY * 2);
                                
                                // Exponential backoff with much longer delays
                                if (attempt > 1) {
                                    waitTime *= Math.pow(2, attempt - 1);
                                }
                                
                                // Cap at 2 minutes but ensure it's substantial
                                waitTime = Math.min(120000, Math.max(20000, waitTime));
                                
                                console.warn(`⏳ EXTENDED BACKOFF: Waiting ${(waitTime/1000).toFixed(1)}s before retry...`);
                                console.warn(`📊 Burst limiter adapted: ${burstRateLimiter.burstLimit} calls/burst, ${(burstRateLimiter.recoveryTime/1000).toFixed(1)}s recovery`);
                                console.warn(`🚨 This rate limit indicates our throttling needs further adjustment!`);
                                
                                if (attempt < retries) {
                                    await sleep(waitTime);
                                    continue;
                                } else {
                                    return {
                                        success: false,
                                        error: 'Rate limit exceeded after all retries',
                                        isRateLimit: true,
                                        retryable: true
                                    };
                                }
                            }
                            
                            // Handle 502 errors
                            if (response.status === 502) {
                                console.warn(`⚠️ Server Error (502) - Bad Gateway`);
                                console.warn(`🔍 Stats URL: ${url}`);
                                
                                const waitTime = 5 * 60 * 1000; // 5 minutes
                                console.warn(`⏳ Waiting 5 minutes before retry due to 502 Bad Gateway...`);
                                
                                if (attempt < retries) {
                                    await sleep(waitTime);
                                    console.warn(`🔄 Retrying after 5-minute wait (attempt ${attempt + 1}/${retries})`);
                                    continue;
                                } else {
                                    return {
                                        success: false,
                                        error: 'Server temporarily unavailable (502) after all retries',
                                        isServerError: true,
                                        retryable: true
                                    };
                                }
                            }
                            
                            // Handle 500 errors
                            if (response.status === 500) {
                                console.error(`❌ Server Error (500) - likely invalid parameters`);
                                console.error(`🔍 Stats URL: ${url}`);
                                throw new Error(`Server Error (500) - Invalid parameters or server issue`);
                            }
                            
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }
                        
                        const data = await response.json();
                        
                        // Extract and update rate limit information if present
                        if (data.rateLimit && burstRateLimiter) {
                            burstRateLimiter.updateFromResponse(data.rateLimit);
                        }
                        
                        // Debug: Log raw API response to understand structure
                        console.log('🔍 Raw API response keys:', Object.keys(data));
                        console.log('🔍 Raw API response:', data);
                        
                        // Transform to AGCopilot expected format
                        const transformedMetrics = {
                            totalTokens: data.totalTokens || 0,
                            tpPnlPercent: data.averageTpGain || 0,
                            tpPnlSOL: data.pnlSolTp || 0,
                            athPnlPercent: data.averageAthGain || 0,
                            athPnlSOL: data.pnlSolAth || 0,
                            totalSpent: data.totalSolSpent || 0,
                            winRate: data.winRate || 0, // Legacy win rate from API
                            tokensHitTp: data.tokensHitTp || 0,
                            realWinRate: data.tokensHitTp && data.totalTokens ? (data.tokensHitTp / data.totalTokens * 100) : 0,
                            cleanPnL: data.cleanPnL || 0,
                            totalSignals: data.totalAvailableSignals || 0,
                            // Include matched token addresses for required tokens checking
                            matchedTokenAddresses: data.matchedTokenAddresses || []
                        };
                        
                        // Ensure valid numbers
                        if (isNaN(transformedMetrics.tpPnlPercent) || isNaN(transformedMetrics.totalTokens)) {
                            console.error('❌ Invalid metrics - contains NaN values:', transformedMetrics);
                            console.error('❌ Raw data:', data);
                            throw new Error(`Invalid metrics: tpPnlPercent=${transformedMetrics.tpPnlPercent}, totalTokens=${transformedMetrics.totalTokens}`);
                        }
                        
                        console.log('✅ Transformed metrics:', transformedMetrics);
                        
                        const result = {
                            success: true,
                            metrics: transformedMetrics,
                            rawResponse: data,
                            source: 'API'
                        };
                        
                        // 🚀 Cache the result
                        if (CONFIG.USE_CONFIG_CACHING && cache) {
                            cache.set(config, result);
                            console.log(`    🎯 API call completed & cached | ${cache.getPerformanceSummary()}`);
                        }
                        
                        return result;
                        
                    } catch (error) {
                        // Enhanced CORS and network error handling
                        if (error.name === 'TypeError' && error.message.includes('fetch')) {
                            console.error('❌ Network or CORS error:', error.message);
                            console.error('📋 Troubleshooting:');
                            console.error('   1. Ensure on backtester.alphagardeners.xyz');
                            console.error('   2. Check logged in to backtester');
                            console.error('   3. Verify cookies allowed');
                            console.error('   4. Disable browser extensions');
                            console.error('   5. Try refreshing and reloading');
                            
                            if (attempt === retries) {
                                return {
                                    success: false,
                                    error: `Network/CORS error: ${error.message}`,
                                    isCorsError: true,
                                    source: 'API'
                                };
                            }
                        } else {
                            console.warn(`❌ API attempt ${attempt} failed: ${error.message}`);
                        }
                        
                        if (attempt === retries) {
                            return {
                                success: false,
                                error: error.message,
                                source: 'API'
                            };
                        }
                        
                        // Backoff for non-429 errors
                        if (!error.message.includes('429')) {
                            await sleep(1000 * attempt);
                        }
                    }
                }
                
            } catch (error) {
                return {
                    success: false,
                    error: error.message,
                    source: 'API'
                };
            }
        }

        // Batch fetch results for multiple configurations (uses batch endpoint if available)
        async fetchResultsBatch(configs, batchSize = 10) {
            const API_URL = CONFIG.API_BASE_URL;
            const isBatchSupported = API_URL.includes('localhost') || API_URL.includes('127.0.0.1');
            
            if (!isBatchSupported || batchSize === 1) {
                // Fall back to sequential processing for non-local APIs
                console.log('📊 Processing configs sequentially (batch not supported)');
                const results = [];
                for (const config of configs) {
                    const result = await this.fetchResults(config);
                    results.push(result);
                }
                return results;
            }
            
            console.log(`🚀 Batch processing ${configs.length} configs (batch size: ${batchSize})`);
            
            // Split into batches
            const batches = [];
            for (let i = 0; i < configs.length; i += batchSize) {
                batches.push(configs.slice(i, i + batchSize));
            }
            
            const allResults = [];
            
            for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
                const batch = batches[batchIdx];
                
                // Map configs to batch API format
                const batchRequests = batch.map((config, idx) => {
                    const apiParams = this.mapParametersToAPI(config);
                    const tpSettings = apiParams.__takeProfits || [];
                    delete apiParams.__takeProfits;
                    
                    return {
                        requestId: `${batchIdx}_${idx}`,
                        ...Object.fromEntries(
                            Object.entries(apiParams)
                                .filter(([k]) => k !== 'tpSettings' && k !== 'triggerMode')
                                .map(([k, v]) => {
                                    // Convert to appropriate types for C# backend
                                    if (k.includes('Date')) return [k, v];
                                    if (typeof v === 'boolean') return [k, v];
                                    if (v === null || v === undefined || v === '') return [k, null];
                                    // Parse numeric strings
                                    const numVal = Number(v);
                                    return [k, isNaN(numVal) ? v : numVal];
                                })
                        ),
                        triggerMode: apiParams.triggerMode ? Number(apiParams.triggerMode) : null,
                        tpSettings: tpSettings.length > 0 ? tpSettings.map(tp => ({
                            sizePct: Number(tp.size),
                            targetGainPct: Number(tp.gain)
                        })) : null,
                        buyingAmount: 0.25
                    };
                });
                
                try {
                    await burstRateLimiter.throttle();
                    
                    const response = await fetch(`${API_URL}/batch-stats`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(batchRequests),
                        credentials: 'include'
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Batch API returned ${response.status}`);
                    }
                    
                    const data = await response.json();
                    
                    // Map results back to our format
                    const batchResults = data.results.map((r, idx) => {
                        if (!r.success) {
                            return {
                                success: false,
                                error: r.error || 'Unknown error',
                                totalTokens: 0,
                                tokensHitTp: 0,
                                winRate: 0,
                                averageTpGain: 0,
                                tpPnlPercent: 0,
                                cleanPnL: 0
                            };
                        }
                        
                        return {
                            success: true,
                            totalTokens: r.totalTokens || 0,
                            tokensHitTp: r.tokensHitTp || 0,
                            winRate: r.winRate || 0,
                            averageTpGain: r.averageTpGain || 0,
                            tpPnlPercent: r.averageTpGain || 0,
                            cleanPnL: r.cleanPnL || 0,
                            config: batch[idx]
                        };
                    });
                    
                    allResults.push(...batchResults);
                    
                    console.log(`✅ Batch ${batchIdx + 1}/${batches.length} completed: ${batchResults.length} results`);
                    
                } catch (error) {
                    console.error(`❌ Batch ${batchIdx + 1} failed:`, error);
                    // Add error results for this batch
                    allResults.push(...batch.map(config => ({
                        success: false,
                        error: error.message,
                        totalTokens: 0,
                        tokensHitTp: 0,
                        winRate: 0,
                        averageTpGain: 0,
                        tpPnlPercent: 0,
                        cleanPnL: 0,
                        config
                    })));
                }
            }
            
            console.log(`🎯 Batch processing complete: ${allResults.length} total results`);
            return allResults;
        }
    }

    // Initialize the API client
    const backtesterAPI = new BacktesterAPI();
    
    // Make backtesterAPI globally available for external modules
    window.backtesterAPI = backtesterAPI;

    // ========================================
    // 🔬 PARAMETER IMPACT DISCOVERY (Integrated from AGPinDiscovery)  
    // ========================================
    
    // Generate test values dynamically from PARAM_RULES
    function generateTestValuesFromRules(paramName) {
        const rule = PARAM_RULES[paramName];
        if (!rule) {
            console.warn(`⚠️ No rule found for parameter: ${paramName}`);
            return [];
        }
        
        const { min, max, step, type } = rule;
        const testValues = [];
        
        // Always include min and max values
        testValues.push(min);
        if (max !== min) {
            testValues.push(max);
        }
        
        // Generate intermediate values based on the range and step
        const range = max - min;
        const numSteps = Math.floor(range / step);
        
        if (numSteps <= 1) {
            // Small range - just use min and max
            const finalValues = [...new Set(testValues)]; // Remove duplicates
            
            // Special handling for AG Score - convert numbers to strings
            if (paramName === 'Min AG Score') {
                return finalValues.map(v => String(v));
            }
            
            return finalValues;
        }
        
        // For larger ranges, generate strategic test points
        if (numSteps <= 5) {
            // Small number of steps - test all values
            for (let value = min + step; value < max; value += step) {
                testValues.push(type === 'integer' ? Math.round(value) : value);
            }
        } else {
            // Larger ranges - use strategic sampling
            const samplingDensity = 0.1; // 10% intervals for comprehensive testing
            
            // Generate percentile points
            const percentiles = [];
            for (let pct = samplingDensity; pct < 1; pct += samplingDensity) {
                percentiles.push(min + (range * pct));
            }
            
            // Round to nearest step
            const roundToStep = (val) => {
                const rounded = Math.round((val - min) / step) * step + min;
                return type === 'integer' ? Math.round(rounded) : rounded;
            };
            
            percentiles.forEach(val => testValues.push(roundToStep(val)));
        }
        
        // Remove duplicates and sort
        const uniqueValues = [...new Set(testValues)].sort((a, b) => a - b);
        
        // Limit to maximum values for local backtester
        const maxValues = 100; // Test up to 100 values for comprehensive optimization
        let finalValues;
        if (uniqueValues.length > maxValues) {
            // Keep min, max, and evenly spaced intermediate values
            const result = [uniqueValues[0]]; // min
            const step_size = Math.floor((uniqueValues.length - 2) / (maxValues - 2));
            for (let i = step_size; i < uniqueValues.length - 1; i += step_size) {
                result.push(uniqueValues[i]);
            }
            result.push(uniqueValues[uniqueValues.length - 1]); // max
            finalValues = result.slice(0, maxValues);
        } else {
            finalValues = uniqueValues;
        }
        
        // Special handling for AG Score - convert numbers to strings
        if (paramName === 'Min AG Score') {
            finalValues = finalValues.map(v => String(v));
        }
        
        console.log(`📊 Generated ${finalValues.length} test values for ${paramName}: [${finalValues.join(', ')}]`);
        return finalValues;
    }
    
    async function runParameterImpactDiscovery() {
        // Scale token requirement by date range
        const scaledThresholds = getScaledTokenThresholds();
        const MIN_TOKENS_REQUIRED = scaledThresholds.MIN_TOKENS;
        const MIN_IMPROVEMENT_THRESHOLD = 1;
        
        try {
            console.log('%c🔬 Starting Parameter Impact Discovery', 'color: purple; font-size: 16px; font-weight: bold;');
            
            // Send cookie to AGCopilotAPI for auto-import service
            try {
                const apiUrl = document.getElementById('sync-api-url')?.value || 'http://localhost:5000';
                const cookie = document.cookie;
                if (cookie) {
                    const encodedCookie = encodeURIComponent(cookie);
                    await fetch(`${apiUrl}/api/cleanup/set-cookie?cookie=${encodedCookie}`, { method: 'POST' });
                    console.log('🔑 Cookie sent to AGCopilotAPI for auto-import');
                }
            } catch (e) {
                // Silently ignore - AGCopilotAPI may not be running
            }
            // Only initialize tracker if not already running (avoid resetting chained runs)
            if (!window.optimizationTracker.isRunning) {
                window.optimizationTracker.startOptimization(1); // Single run for parameter discovery
            }
            
            // Step 1: Establish baseline with current UI configuration
            console.log('%c📊 Establishing baseline...', 'color: blue; font-weight: bold;');
            const currentConfig = getCurrentConfiguration();
            // Reuse global config cache
            const cache = window.globalConfigCache || (window.globalConfigCache = new ConfigCache(1000));

            // Helper to fetch with validation (cache now handled in BacktesterAPI.fetchResults)
            const fetchWithCacheValidated = async (cfg, label) => {
                const completeCfg = ensureCompleteConfig(cfg);
                // Validate min/max pairs via API param mapping
                const apiParams = backtesterAPI.mapParametersToAPI(completeCfg);
                const validation = backtesterAPI.validateConfig(apiParams);
                if (!validation.isValid) {
                    console.log(`    ⚠️ Skipping invalid config (${label}): ${validation.errors.join(', ')}`);
                    return { success: false, error: 'invalid_config' };
                }
                
                // Cache checking and setting now handled in BacktesterAPI.fetchResults for better rate limit optimization
                const res = await backtesterAPI.fetchResults(completeCfg);
                return res;
            };

            const baselineResult = await fetchWithCacheValidated(currentConfig, 'Baseline');
            
            if (!baselineResult.success || !baselineResult.metrics) {
                throw new Error('Failed to establish baseline configuration');
            }
            
            if (baselineResult.metrics.totalTokens < MIN_TOKENS_REQUIRED) {
                throw new Error(`Baseline has insufficient tokens: ${baselineResult.metrics.totalTokens} < ${MIN_TOKENS_REQUIRED}`);
            }
            
            // Use robust scoring for baseline
            const baseRobust = calculateRobustScore(baselineResult.metrics);
            const baselineScore = baseRobust && !baseRobust.rejected ? baseRobust.score : baselineResult.metrics.tpPnlPercent;
            const baselineTokens = baselineResult.metrics.totalTokens;
            
            const triggerMode = getTriggerMode();
            const triggerModeNames = ['Bullish Bonding', 'God Mode', 'Moon Finder', 'Fomo', 'Launchpads', 'Smart Tracker'];
            const triggerModeName = triggerModeNames[triggerMode] || `Mode ${triggerMode}`;
            
            const selectedSources = getSelectedSources();
            const sourceNames = { '1': 'Pumpfun', '2': 'Launchcoin', '3': 'Launchpad', '4': 'Native' };
            const sourceLabels = selectedSources.map(s => sourceNames[s] || `Source ${s}`).join(', ');
            
            console.log(`🎯 Trigger Mode: ${triggerModeName} (${triggerMode})`);
            console.log(`📡 Sources Filter: ${sourceLabels.length > 0 ? sourceLabels : 'All sources'} (${selectedSources.join(', ')})`);
            console.log(`✅ Baseline: ${baselineScore.toFixed(1)}% PnL, ${baselineTokens} tokens`);
            
            // Step 2: Test parameters systematically  
            const parameterResults = [];
            const parametersToTest = [
                // High-impact parameters first
                { param: 'Min MCAP (USD)', section: 'basic' },
                { param: 'Min KYC Wallets', section: 'wallets' },
                { param: 'Min Unique Wallets', section: 'wallets' },
                { param: 'Min AG Score', section: 'tokenDetails' },
                { param: 'Min Buy Ratio %', section: 'risk' },
                { param: 'Max Bundled %', section: 'risk' },
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
            
            for (const { param, section } of parametersToTest) {
                if (window.STOPPED) break;
                
                console.log(`%c🔬 Analyzing ${param}...`, 'color: orange; font-weight: bold;');
                
                // Generate test values dynamically from PARAM_RULES
                const testValues = generateTestValuesFromRules(param);
                if (!testValues || testValues.length === 0) {
                    console.log(`⚠️ No test values could be generated for ${param}`);
                    continue;
                }
                
                const paramResults = [];
                
                for (const value of testValues) {
                    if (window.STOPPED) break;
                    
                    try {
                        testCount++;
                        console.log(`  Testing ${param}: ${value}`);
                        
                        // Create test configuration
                        const testConfig = ensureCompleteConfig(currentConfig);
                        testConfig[section][param] = value;
                        // Fetch with cache and validation
                        const result = await fetchWithCacheValidated(testConfig, `${param}=${value}`);
                        
                        if (!result.success || !result.metrics) {
                            failedCount++;
                            console.log(`    ❌ ${value}: API call failed`);
                            continue;
                        }
                        
                        if (result.metrics.totalTokens < MIN_TOKENS_REQUIRED) {
                            console.log(`    ⚠️ ${value}: Insufficient tokens (${result.metrics.totalTokens})`);
                            continue;
                        }
                        // Robust scoring for test value
                        const robust = calculateRobustScore(result.metrics);
                        if (robust && robust.rejected) {
                            console.log(`    ❌ ${value}: Rejected by robust scoring (${robust.rejectionReason})`);
                            continue;
                        }
                        const currentScore = robust ? robust.score : result.metrics.tpPnlPercent;
                        const improvement = currentScore - baselineScore;
                        
                        paramResults.push({
                            value: value,
                            score: currentScore,
                            improvement: improvement,
                            tokens: result.metrics.totalTokens,
                            winRate: result.metrics.winRate || 0,
                            rawTpPnl: result.metrics.tpPnlPercent || 0
                        });
                        
                        const logPrefix = improvement > MIN_IMPROVEMENT_THRESHOLD ? '✅' : '📊';
                        console.log(`    ${logPrefix} ${value}: score=${currentScore.toFixed(1)} (raw=${(result.metrics.tpPnlPercent||0).toFixed(1)}%, LWR=${(result.metrics.winRate||0).toFixed(1)}%, RWR=${(result.metrics.realWinRate||0).toFixed(1)}%) Δ=${improvement.toFixed(1)} [${result.metrics.totalTokens} tokens]`);
                        
                        // Update progress
                        window.optimizationTracker.updateProgress(testCount, failedCount);
                        
                    } catch (error) {
                        failedCount++;
                        console.log(`    ❌ ${value}: ${error.message}`);
                    }
                }
                
                if (paramResults.length > 0) {
                    // Calculate parameter impact metrics
                    const improvements = paramResults.map(r => r.improvement);
                    const maxImprovement = Math.max(...improvements);
                    const range = Math.max(...improvements) - Math.min(...improvements);
                    
                    const bestResult = paramResults.reduce((best, current) => 
                        current.improvement > best.improvement ? current : best
                    );
                    
                    parameterResults.push({
                        parameter: param,
                        section: section,
                        maxImprovement: maxImprovement,
                        range: range,
                        impact: (Math.abs(maxImprovement) + range) / 2,
                        bestValue: bestResult.value,
                        bestScore: bestResult.score,
                        bestImprovement: bestResult.improvement,
                        results: paramResults
                    });
                    
                    console.log(`📈 ${param} Impact: Max +${maxImprovement.toFixed(1)}%, Best Value: ${bestResult.value}`);
                }
            }
            
            // Step 3: Generate simplified report with top 10 parameters
            const sortedResults = parameterResults
                .sort((a, b) => b.impact - a.impact)
                .slice(0, 10); // Top 10 only
            
            console.log('\n%c🏆 TOP 10 PARAMETER IMPACT RANKINGS:', 'color: gold; font-size: 16px; font-weight: bold;');
            console.log('%c' + '='.repeat(60), 'color: gold;');
            
            sortedResults.forEach((result, index) => {
                console.log(`%c${(index + 1).toString().padStart(2)}. ${result.parameter} = ${result.bestValue} → +${result.bestImprovement.toFixed(1)} improvement`, 
                    result.impact > 10 ? 'color: #ff6b6b; font-weight: bold;' : 
                    result.impact > 5 ? 'color: #feca57; font-weight: bold;' : 'color: #48dbfb;');
            });
            
            window.optimizationTracker.stopOptimization();
            console.log('\n%c✅ Parameter Impact Discovery Complete!', 'color: green; font-size: 16px; font-weight: bold;');
            console.log(`📊 Tested ${testCount} configurations, ${failedCount} failed`);
            console.log(`📈 Baseline: ${baselineScore.toFixed(1)}% PnL with ${baselineTokens} tokens`);
            
            return sortedResults;
            
        } catch (error) {
            window.optimizationTracker.stopOptimization();
            console.error('❌ Parameter Impact Discovery failed:', error);
            throw error;
        }
    }
    // ========================================
    // 📊 ROBUST SCORING SYSTEM (Outlier-Resistant)
    // ========================================
    function calculateRobustScore(metrics) {
        if (!metrics) {
            console.warn('⚠️ calculateRobustScore: metrics is null/undefined');
            return null;
        }
        
        if (metrics.tpPnlPercent === undefined || metrics.totalTokens === undefined) {
            console.warn('⚠️ calculateRobustScore: missing required properties', {
                tpPnlPercent: metrics.tpPnlPercent,
                totalTokens: metrics.totalTokens,
                allKeys: Object.keys(metrics)
            });
            return null;
        }

    const mode = getScoringMode();

    // Use raw TP PnL % and Win Rate (legacy or real based on mode)
    const rawPnL = metrics.tpPnlPercent;
    const legacyWinRate = metrics.winRate || 0; // Original API win rate
    const realWinRate = metrics.realWinRate || 0; // Calculated from tokensHitTp
    
    // Choose win rate based on scoring mode
    const winRate = (mode === 'robust_real' || mode === 'real_winrate_only') ? realWinRate : legacyWinRate;
        
        // Reliability factor based on sample size (more tokens = more reliable)
        // Uses logarithmic scaling: log(tokens)/log(100) capped at 1.0
        const tokensCount = metrics.totalTokens || 1; // Default to 1 to avoid log(0)
        const reliabilityFactor = Math.min(1.0, Math.log(tokensCount) / Math.log(100));
        
        // Get minimum tokens threshold (based on Min Tokens/Day setting * days)
        const scaledThresholds = getScaledTokenThresholds();
        const minTokensRequired = scaledThresholds.MIN_TOKENS;
        
        // Reject configurations that don't meet minimum token count
        if (tokensCount < minTokensRequired) {
            return {
                score: -Infinity,
                rejected: true,
                rejectionReason: `Only ${tokensCount} tokens, minimum required: ${minTokensRequired}`,
                components: {
                    rawPnL: metrics.tpPnlPercent,
                    winRate: winRate,
                    reliabilityFactor: reliabilityFactor,
                    tokensCount: tokensCount,
                    minTokensRequired: minTokensRequired
                },
                scoringMethod: `REJECTED - Insufficient tokens (${tokensCount} < ${minTokensRequired})`
            };
        }
        
        // Check required tokens constraint from Meta Finder
        let requiredTokensPenalty = 0;
        let requiredTokensIncluded = 0;
        let requiredTokensTotal = 0;
        let requiredTokensInfo = null;
        
        if (window.REQUIRED_TOKENS && window.REQUIRED_TOKENS.addresses && window.REQUIRED_TOKENS.addresses.length > 0) {
            requiredTokensTotal = window.REQUIRED_TOKENS.addresses.length;
            const matchedAddresses = metrics.matchedTokenAddresses || [];
            const matchedSet = new Set(matchedAddresses.map(a => a.toLowerCase()));
            
            // Count how many required tokens are included
            requiredTokensIncluded = window.REQUIRED_TOKENS.addresses.filter(
                addr => matchedSet.has(addr.toLowerCase())
            ).length;
            
            // Calculate penalty: lose 20% of score per missing required token (harsh but not infinite)
            const missingTokens = requiredTokensTotal - requiredTokensIncluded;
            requiredTokensPenalty = missingTokens * 0.20; // 20% penalty per missing token
            
            requiredTokensInfo = {
                name: window.REQUIRED_TOKENS.name,
                required: requiredTokensTotal,
                included: requiredTokensIncluded,
                missing: missingTokens,
                penalty: requiredTokensPenalty
            };
            
            if (missingTokens > 0) {
                console.log(`🔒 Required tokens constraint: ${requiredTokensIncluded}/${requiredTokensTotal} included, ${(requiredTokensPenalty * 100).toFixed(0)}% penalty`);
            }
        }
        
        // Apply scoring weights based on mode
        let returnWeight = CONFIG.RETURN_WEIGHT;
        let consistencyWeight = CONFIG.CONSISTENCY_WEIGHT;
        let reliabilityWeight = CONFIG.RELIABILITY_WEIGHT;
        let scoringMethodDesc = '';
        if (mode === 'tp_only') {
            returnWeight = 1.0; consistencyWeight = 0.0; reliabilityWeight = 0.0;
            scoringMethodDesc = 'TP PnL % Only';
        } else if (mode === 'winrate_only') {
            returnWeight = 0.0; consistencyWeight = 1.0; reliabilityWeight = 0.0;
            scoringMethodDesc = 'Win Rate Only (Legacy)';
        } else if (mode === 'real_winrate_only') {
            returnWeight = 0.0; consistencyWeight = 1.0; reliabilityWeight = 0.0;
            scoringMethodDesc = 'Real Win Rate Only';
        } else {
            const winRateType = mode === 'robust_real' ? 'Real' : 'Legacy';
            const scoringType = mode === 'robust_real' ? 'Robust (Real Win Rate)' : 'Legacy Resistant';
            scoringMethodDesc = `${scoringType} Multi-Factor (${winRateType} WR)`;
        }

        // Composite score
        const returnComponent = rawPnL * returnWeight;
        const consistencyComponent = winRate * consistencyWeight;
        const baseScore = returnComponent + consistencyComponent;
        const reliabilityAdjustedScore = baseScore * (1 - reliabilityWeight) + baseScore * reliabilityWeight * reliabilityFactor;
        
        // Apply required tokens penalty (reduces score proportionally to missing tokens)
        const finalScore = reliabilityAdjustedScore * (1 - requiredTokensPenalty);
        
        // Update scoring method description if constraint is active
        if (requiredTokensInfo && requiredTokensInfo.missing > 0) {
            scoringMethodDesc += ` | 🔒 ${requiredTokensInfo.included}/${requiredTokensInfo.required} required tokens (-${(requiredTokensPenalty * 100).toFixed(0)}%)`;
        }
        
        return {
            score: finalScore,
            components: {
                rawPnL: metrics.tpPnlPercent,
                winRate: winRate,
                legacyWinRate: legacyWinRate,
                realWinRate: realWinRate,
                tokensHitTp: metrics.tokensHitTp,
                reliabilityFactor: reliabilityFactor,
                tokensCount: tokensCount,
                minTokensRequired: minTokensRequired,
                returnComponent: returnComponent,
                consistencyComponent: consistencyComponent,
                baseScore: baseScore,
                reliabilityAdjustedScore: reliabilityAdjustedScore,
                requiredTokensPenalty: requiredTokensPenalty,
                requiredTokensInfo: requiredTokensInfo,
                finalScore: finalScore,
                scoringMode: mode
            },
            scoringMethod: scoringMethodDesc
        };
    }

    // Clean and validate configuration values before API calls
    function cleanConfiguration(config) {
        const cleanedConfig = deepClone(config);
        
        // Recursively clean all values in the configuration
        function cleanValue(obj) {
            if (typeof obj === 'object' && obj !== null) {
                for (const [key, value] of Object.entries(obj)) {
                    if (typeof value === 'object' && value !== null) {
                        cleanValue(value); // Recurse into nested objects
                    } else {
                        // Clean individual values
                        if (value === null || value === undefined || value === '') {
                            delete obj[key]; // Remove empty values
                        } else if (typeof value === 'string') {
                            // Handle string representations of numbers
                            const numValue = parseFloat(value);
                            if (!isNaN(numValue) && isFinite(numValue)) {
                                // Special handling for AG Score
                                if (key === 'Min AG Score') {
                                    const agScore = Math.round(numValue);
                                    obj[key] = Math.max(0, Math.min(10, agScore)); // Clamp to 0-10
                                } else {
                                    obj[key] = numValue; // Convert valid numeric strings to numbers
                                }
                            } else if (value === 'NaN' || value === 'undefined' || value === 'null') {
                                delete obj[key]; // Remove invalid string values
                            }
                        } else if (typeof value === 'number') {
                            // Handle numeric values
                            if (isNaN(value) || !isFinite(value)) {
                                delete obj[key]; // Remove NaN or infinite numbers
                            } else if (key === 'Min AG Score') {
                                const agScore = Math.round(value);
                                obj[key] = Math.max(0, Math.min(10, agScore)); // Clamp AG Score to 0-10
                            }
                        }
                    }
                }
            }
        }
        
        cleanValue(cleanedConfig);
        return cleanedConfig;
    }

    // Make cleanConfiguration globally available for external scripts
    window.cleanConfiguration = cleanConfiguration;

    // Test configuration via API call (New: Direct API instead of UI scraping)
    async function testConfigurationAPI(config, testName = 'API Test') {
        try {
            
            // Clean the configuration before testing
            const cleanedConfig = cleanConfiguration(config);
            
            // Use the API to get results directly
            const result = await backtesterAPI.fetchResults(cleanedConfig);
            
            if (!result.success) {
                console.warn(`❌ ${testName} failed: ${result.error}`);
                return result;
            }
            
            const metrics = result.metrics;
            
            // Validate metrics before proceeding
            if (!metrics) {
                console.warn(`❌ ${testName}: No metrics returned from API`);
                return {
                    success: false,
                    error: 'No metrics returned from API'
                };
            }
            
            if (metrics.tpPnlPercent === undefined || metrics.totalTokens === undefined) {
                console.warn(`❌ ${testName}: Invalid metrics structure:`, {
                    tpPnlPercent: metrics.tpPnlPercent,
                    totalTokens: metrics.totalTokens,
                    allKeys: Object.keys(metrics)
                });
                return {
                    success: false,
                    error: `Invalid metrics: missing tpPnlPercent (${metrics.tpPnlPercent}) or totalTokens (${metrics.totalTokens})`
                };
            }
            
            // Calculate robust score for logging
        const robustScoring = calculateRobustScore(metrics);
        const mode = getScoringMode();
    if (robustScoring && mode !== 'tp_only') {
                if (robustScoring.rejected) {
                    console.log(`❌ ${testName}: REJECTED - ${robustScoring.rejectionReason} | Raw TP PnL: ${metrics.tpPnlPercent?.toFixed(1)}%`);
                } else {
                    console.log(`✅ ${testName}: ${metrics?.totalTokens || 0} tokens | Score(${robustScoring.scoringMethod}): ${robustScoring.score.toFixed(1)} | Raw TP PnL: ${metrics.tpPnlPercent?.toFixed(1)}% | Win Rate: ${metrics.winRate?.toFixed(1)}%`);
                }
            } else {
                console.log(`✅ ${testName}: ${metrics?.totalTokens || 0} tokens, TP PnL: ${metrics.tpPnlPercent?.toFixed(1)}%, ATH PnL: ${metrics.athPnlPercent?.toFixed(1)}%, Win Rate: ${metrics.winRate?.toFixed(1)}%`);
            }

            return {
                success: true,
                metrics,
                source: 'API'
            };
            
        } catch (error) {
            console.warn(`❌ ${testName} failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
    

    // ========================================
    // 🎯 SIGNAL ANALYSIS - CORE FUNCTIONS STILL IN AGCopilot.js
    // ========================================
    // Note: These functions are used internally by AGCopilot for signal analysis
    // Additional UI and workflow functions are in AGSignalAnalysis.js
    
    // Outlier filtering functions
    function removeOutliers(values, method = 'none') {
        if (!values || values.length === 0) return values;
        if (method === 'none') return values;
        
        const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
        if (validValues.length < 4) return validValues; // Need at least 4 values for meaningful outlier detection
        
        const sorted = [...validValues].sort((a, b) => a - b);
        
        switch (method) {
            case 'iqr': {
                // Interquartile Range method - removes extreme outliers
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
                // Keep middle 80% (remove top and bottom 10%)
                const startIndex = Math.floor(sorted.length * 0.1);
                const endIndex = Math.ceil(sorted.length * 0.9);
                const filtered = sorted.slice(startIndex, endIndex);
                
                return validValues.filter(v => v >= filtered[0] && v <= filtered[filtered.length - 1]);
            }
            
            case 'zscore': {
                // Z-Score method - remove values more than 2.5 standard deviations from mean
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

    // Make removeOutliers globally available for external scripts
    window.removeOutliers = removeOutliers;

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
                ranges[param] = {
                    min: Math.min(...values),
                    max: Math.max(...values),
                    range: Math.max(...values) - Math.min(...values)
                };
            }
        });
        
        // Normalize each signal
        signals.forEach(signal => {
            const normalized = { ...signal };
            parameters.forEach(param => {
                if (ranges[param] && signal[param] !== null && signal[param] !== undefined && !isNaN(signal[param])) {
                    if (ranges[param].range > 0) {
                        normalized[param] = (signal[param] - ranges[param].min) / ranges[param].range;
                    } else {
                        normalized[param] = 0; // All values are the same
                    }
                } else {
                    normalized[param] = 0; // Missing values default to 0
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
            
            if (val1 !== null && val1 !== undefined && !isNaN(val1) &&
                val2 !== null && val2 !== undefined && !isNaN(val2)) {
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
                if (swap.criteria) {
                    signalToToken.set(signalIndex, token.address);
                    signalIndex++;
                }
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
            console.log(`📊 Token ${tokenIndex + 1}: ${tokenData.address.substring(0, 8)}...${tokenData.address.substring(-4)} - ${tokenData.swaps.length} swaps`);
            
            tokenData.swaps.forEach((swap, swapIndex) => {
                if (swap.criteria) {
                    const signal = {
                        ...swap.criteria,
                        signalMcap: swap.signalMcap,
                        athMultiplier: swap.athMcap && swap.signalMcap ? (swap.athMcap / swap.signalMcap) : 0,
                        _tokenIndex: tokenIndex,
                        _swapIndex: swapIndex,
                        _tokenAddress: tokenData.address
                    };
                    allSignals.push(signal);
                    console.log(`  Signal ${swapIndex + 1}: MCAP $${swap.signalMcap || 'N/A'}, AG Score: ${swap.criteria.agScore || 'N/A'}`);
                } else {
                    console.log(`  ⚠️ Swap ${swapIndex + 1}: Missing criteria data`);
                }
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
            const uniqueTokens = new Set(allTokenData.map(t => t.address)).size;
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
                                threshold: cluster.threshold
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
    
    // Core analysis logic that works with any signal set
    function generateAnalysisFromSignals(signals, bufferPercent, outlierMethod) {
        
        // Helper function to apply buffer to bounds
        // For INCLUSIVE filtering: min values should be LOWER, max values should be HIGHER
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
            return null;
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
            config.metadata.configType = `Cluster ${analysis.clusterInfo.clusterId} Config`;
        }
        
        // Map analysis results to AGCopilot-Enhanced parameter names
        // Basic Settings
        if (analysis.mcap && analysis.mcap.min !== undefined) {
            config['Min MCAP (USD)'] = analysis.mcap.min;
        }
        if (analysis.mcap && analysis.mcap.tightestMax !== undefined) {
            config['Max MCAP (USD)'] = analysis.mcap.tightestMax;
        } else if (analysis.mcap && analysis.mcap.max !== undefined) {
            config['Max MCAP (USD)'] = analysis.mcap.max;
        }
        
        // AG Score
        if (analysis.agScore && analysis.agScore.min !== undefined) {
            config['Min AG Score'] = analysis.agScore.min;
        }
        
        //
        if (analysis.tokenAge && analysis.tokenAge.max !== undefined && analysis.tokenAge.count > 0) {
            // Only set if max age is reasonable (at least 30 minutes)
            // if (analysis.tokenAge.max >= 180) {
            config['Max Token Age (sec)'] = analysis.tokenAge.max;
            // } else if (analysis.tokenAge.max >= 5) {
            //     config['Max Token Age (sec)'] = 3600; // Set reasonable default (1 hour)
            // }
            // If very young tokens only, don't set this restriction
        }
        if (analysis.tokenAge && analysis.tokenAge.min !== undefined && analysis.tokenAge.count > 0) {
            config['Min Token Age (sec)'] = analysis.tokenAge.min;
        }
        if (analysis.deployerAge && analysis.deployerAge.min !== undefined && analysis.deployerAge.count > 0) {
            config['Min Deployer Age (min)'] = analysis.deployerAge.min;
        }
        
        // Wallet criteria (check for data availability)
        if (analysis.uniqueWallets && analysis.uniqueWallets.min !== undefined && analysis.uniqueWallets.count > 0) {
            config['Min Unique Wallets'] = analysis.uniqueWallets.min;
        }
        if (analysis.uniqueWallets && analysis.uniqueWallets.max !== undefined && analysis.uniqueWallets.count > 0) {
            config['Max Unique Wallets'] = analysis.uniqueWallets.max;
        }
        if (analysis.kycWallets && analysis.kycWallets.min !== undefined && analysis.kycWallets.count > 0) {
            config['Min KYC Wallets'] = analysis.kycWallets.min;
        }
        if (analysis.kycWallets && analysis.kycWallets.max !== undefined && analysis.kycWallets.count > 0) {
            config['Max KYC Wallets'] = analysis.kycWallets.max;
        }
        if (analysis.dormantWallets && analysis.dormantWallets.min !== undefined && analysis.dormantWallets.count > 0) {
            config['Min Dormant Wallets'] = analysis.dormantWallets.min;
        }
        if (analysis.dormantWallets && analysis.dormantWallets.max !== undefined && analysis.dormantWallets.count > 0) {
            config['Max Dormant Wallets'] = analysis.dormantWallets.max;
        }
        if (analysis.holders && analysis.holders.min !== undefined && analysis.holders.count > 0) {
            config['Min Holders'] = analysis.holders.min;
        }
        if (analysis.holders && analysis.holders.max !== undefined && analysis.holders.count > 0) {
            config['Max Holders'] = analysis.holders.max;
        }
        
        // Liquidity criteria (check for data availability)
        if (analysis.liquidity && analysis.liquidity.min !== undefined && analysis.liquidity.count > 0) {
            config['Min Liquidity (USD)'] = analysis.liquidity.min;
        }
        if (analysis.liquidity && analysis.liquidity.max !== undefined && analysis.liquidity.count > 0) {
            config['Max Liquidity (USD)'] = analysis.liquidity.max;
        }
        if (analysis.liquidityPct && analysis.liquidityPct.max !== undefined && analysis.liquidityPct.count > 0) {
            // Only set if not too restrictive (at least 20%)
            if (analysis.liquidityPct.max >= 20) {
                config['Max Liquidity %'] = analysis.liquidityPct.max;
            } 
            // else if (analysis.liquidityPct.max >= 5) {
            //     config['Max Liquidity %'] = 50; // Set reasonable default
            // }
        }
        
        // Trading criteria (be more careful with maximums)
        if (analysis.buyVolumePct && analysis.buyVolumePct.min !== undefined && analysis.buyVolumePct.count > 0) {
            config['Min Buy Ratio %'] = analysis.buyVolumePct.min;
        }
        if (analysis.buyVolumePct && analysis.buyVolumePct.max !== undefined && analysis.buyVolumePct.count > 0) {
            // Only set max if it's not too restrictive (at least 80%)
            if (analysis.buyVolumePct.max >= 80) {
                config['Max Buy Ratio %'] = analysis.buyVolumePct.max;
            }
            // Don't set overly restrictive buy ratio maximums
        }
        if (analysis.volMcapPct && analysis.volMcapPct.min !== undefined && analysis.volMcapPct.count > 0) {
            config['Min Vol MCAP %'] = analysis.volMcapPct.min;
        }
        if (analysis.volMcapPct && analysis.volMcapPct.max !== undefined && analysis.volMcapPct.count > 0) {
            config['Max Vol MCAP %'] = analysis.volMcapPct.max;
        }
        
        // Risk criteria (be careful with maximums - don't set if no data or if too restrictive)
        if (analysis.bundledPct && analysis.bundledPct.min !== undefined && analysis.bundledPct.count > 0) {
            config['Min Bundled %'] = analysis.bundledPct.min;
        }
        if (analysis.bundledPct && analysis.bundledPct.max !== undefined && analysis.bundledPct.count > 0) {
            config['Max Bundled %'] = analysis.bundledPct.max;
        }
        
        // Only set Max Drained % if we have actual data AND the max value is reasonable (not too restrictive)
        if (analysis.drainedPct && analysis.drainedPct.max !== undefined && analysis.drainedPct.count > 0) {
            // Don't set if max is too low (would be overly restrictive)
            if (analysis.drainedPct.max >= 5) {
                config['Max Drained %'] = analysis.drainedPct.max;
            }
            // If max is very low (0-5%), consider setting a reasonable limit instead
            else if (analysis.drainedPct.max < 5 && analysis.drainedPct.max >= 0) {
                config['Max Drained %'] = 5; // Set a reasonable default maximum
            }
        }
        
        if (analysis.deployerBalance && analysis.deployerBalance.min !== undefined && analysis.deployerBalance.count > 0) {
            config['Min Deployer Balance (SOL)'] = analysis.deployerBalance.min;
        }
        
        // Boolean criteria
        if (analysis.freshDeployer && analysis.freshDeployer.preferredValue !== undefined) {
            config['Fresh Deployer'] = analysis.freshDeployer.preferredValue;
        }
        if (analysis.hasDescription && analysis.hasDescription.preferredValue !== undefined) {
            config['Description'] = analysis.hasDescription.preferredValue;
        }
        if (analysis.hasSignal && analysis.hasSignal.preferredValue !== undefined) {
            config['Has Buy Signal'] = analysis.hasSignal.preferredValue;
        }
        if (analysis.skipIfNoKycCexFunding && analysis.skipIfNoKycCexFunding.preferredValue !== undefined) {
            config['Skip If No KYC/CEX Funding'] = analysis.skipIfNoKycCexFunding.preferredValue;
        }
        // Advanced criteria (check for data availability)
        if (analysis.winPred && analysis.winPred.min !== undefined && analysis.winPred.count > 0) {
            config['Min Win Pred %'] = analysis.winPred.min;
        }
        if (analysis.ttc && analysis.ttc.min !== undefined && analysis.ttc.count > 0) {
            config['Min TTC (sec)'] = analysis.ttc.min;
        }
        if (analysis.ttc && analysis.ttc.max !== undefined && analysis.ttc.count > 0) {
            // Only set max TTC if it's not too restrictive (at least 60 seconds)
            if (analysis.ttc.max >= 60) {
                config['Max TTC (sec)'] = analysis.ttc.max;
            } 
            // else if (analysis.ttc.max >= 10) {
            //     config['Max TTC (sec)'] = 300; // Set reasonable default (5 minutes)
            // }
        }
        
        console.log('Generated config:', config);
        return config;
    }

    // Format config for display or copying (adapted for flat structure)
    function formatConfigForDisplay(config) {
        const lines = [];
        
        // Check if this is a cluster config
        const isClusterConfig = config.metadata && config.metadata.clusterInfo;
        
        if (isClusterConfig) {
            lines.push(`🎯 CLUSTER ${config.metadata.clusterInfo.clusterId} CONFIG`);
            lines.push('═'.repeat(50));
            lines.push(`🔗 ${config.metadata.clusterInfo.clusterName}: ${config.metadata.clusterInfo.description}`);
            lines.push(`🎯 Tightness Score: ${(config.metadata.clusterInfo.tightness || 0).toFixed(3)} (lower = tighter)`);
            lines.push(`📏 Distance Threshold: ${config.metadata.clusterInfo.threshold}`);
        } else {
            lines.push('🎯 TIGHTEST GENERATED CONFIG');
            lines.push('═'.repeat(50));
        }
        
        if (config.metadata) {
            const tokenText = config.metadata.basedOnTokens !== undefined ? `${config.metadata.basedOnTokens} tokens` : 'undefined tokens';
            lines.push(`📊 Based on: ${config.metadata.basedOnSignals} signals from ${tokenText}`);
            lines.push(`🛡️ Buffer: ${config.metadata.bufferPercent}%`);
            lines.push(`🎯 Outlier Filter: ${config.metadata.outlierMethod || 'none'}`);
            lines.push(`⏰ Generated: ${new Date(config.metadata.generatedAt).toLocaleString()}`);
        }
        lines.push('');
        
        lines.push('📈 BASIC CRITERIA:');
        if (config['Min MCAP (USD)'] !== undefined || config['Max MCAP (USD)'] !== undefined) {
            const min = config['Min MCAP (USD)'] || 0;
            const max = config['Max MCAP (USD)'] || 'N/A';
            lines.push(`MCAP: $${min} - $${max}`);
        }
        if (config['Min AG Score'] !== undefined) {
            lines.push(`AG Score: ${config['Min AG Score']} - ${config['Max AG Score'] || 10}`);
        }
        if (config['Min Token Age (sec)'] !== undefined || config['Max Token Age (sec)'] !== undefined) {
            const min = config['Min Token Age (sec)'] || 0;
            const max = config['Max Token Age (sec)'] || '∞';
            lines.push(`Token Age: ${min} - ${max} seconds`);
        }
        if (config['Min Deployer Age (min)'] !== undefined) {
            lines.push(`Deployer Age: ${config['Min Deployer Age (min)']} - ∞ minutes`);
        }
        if (config['Min Deployer Balance (SOL)'] !== undefined) {
            lines.push(`Deployer Balance: ${config['Min Deployer Balance (SOL)']} - ∞ SOL`);
        }
        lines.push('');
        
        lines.push('👥 WALLET CRITERIA:');
        if (config['Min Holders'] !== undefined || config['Max Holders'] !== undefined) {
            const min = config['Min Holders'] || 0;
            const max = config['Max Holders'] || '∞';
            lines.push(`Holders: ${min} - ${max}`);
        }
        if (config['Min Unique Wallets'] !== undefined || config['Max Unique Wallets'] !== undefined) {
            const min = config['Min Unique Wallets'] || 0;
            const max = config['Max Unique Wallets'] || '∞';
            lines.push(`Unique Wallets: ${min} - ${max}`);
        }
        if (config['Min KYC Wallets'] !== undefined || config['Max KYC Wallets'] !== undefined) {
            const min = config['Min KYC Wallets'] || 0;
            const max = config['Max KYC Wallets'] || '∞';
            lines.push(`KYC Wallets: ${min} - ${max}`);
        }
        if (config['Min Dormant Wallets'] !== undefined || config['Max Dormant Wallets'] !== undefined) {
            const min = config['Min Dormant Wallets'] || 0;
            const max = config['Max Dormant Wallets'] || '∞';
            lines.push(`Dormant Wallets: ${min} - ${max}`);
        }
        lines.push('');
        
        lines.push('💧 LIQUIDITY CRITERIA:');
        if (config['Min Liquidity (USD)'] !== undefined || config['Max Liquidity (USD)'] !== undefined) {
            const min = config['Min Liquidity (USD)'] || 0;
            const max = config['Max Liquidity (USD)'] || '∞';
            lines.push(`Liquidity: $${min} - $${max}`);
        }
        if (config['Max Liquidity %'] !== undefined) {
            lines.push(`Liquidity %: 0% - ${config['Max Liquidity %']}%`);
        }
        lines.push('');
        
        lines.push('📊 TRADING CRITERIA:');
        if (config['Min Buy Ratio %'] !== undefined || config['Max Buy Ratio %'] !== undefined) {
            const min = config['Min Buy Ratio %'] || 0;
            const max = config['Max Buy Ratio %'] || 100;
            lines.push(`Buy Volume %: ${min}% - ${max}%`);
        }
        if (config['Min Vol MCAP %'] !== undefined || config['Max Vol MCAP %'] !== undefined) {
            const min = config['Min Vol MCAP %'] || 0;
            const max = config['Max Vol MCAP %'] || '∞';
            lines.push(`Vol/MCAP %: ${min}% - ${max}%`);
        }
        lines.push('');
        
        lines.push('⚠️ RISK CRITERIA:');
        if (config['Min Bundled %'] !== undefined || config['Max Bundled %'] !== undefined) {
            const min = config['Min Bundled %'] || 0;
            const max = config['Max Bundled %'] || 100;
            lines.push(`Bundled %: ${min}% - ${max}%`);
        }
        if (config['Max Drained %'] !== undefined) {
            lines.push(`Drained %: 0% - ${config['Max Drained %']}%`);
        }
        lines.push('');
        
        lines.push('🔘 BOOLEAN SETTINGS:');
        const boolToString = (val) => val === null ? "Don't Care" : (val ? "Required" : "Forbidden");
        if (config['Fresh Deployer'] !== undefined) {
            lines.push(`Fresh Deployer: ${boolToString(config['Fresh Deployer'])}`);
        }
        if (config['Description'] !== undefined) {
            lines.push(`Has Description: ${boolToString(config['Description'])}`);
        }
        if (config['Skip If No KYC/CEX Funding'] !== undefined) {
            lines.push(`Skip If No KYC/CEX Funding: ${boolToString(config['Skip If No KYC/CEX Funding'])}`);
        }
        lines.push('');
        
        lines.push('� ADVANCED CRITERIA:');
        if (config['Min Win Pred %'] !== undefined) {
            lines.push(`Win Prediction: ${config['Min Win Pred %']}% - 100%`);
        }
        if (config['Min TTC (sec)'] !== undefined || config['Max TTC (sec)'] !== undefined) {
            const min = config['Min TTC (sec)'] || 0;
            const max = config['Max TTC (sec)'] || '∞';
            lines.push(`Time to Complete: ${min} - ${max} seconds`);
        }
        if (config['Has Buy Signal'] !== undefined) {
            lines.push(`Has Buy Signal: ${boolToString(config['Has Buy Signal'])}`);
        }
        lines.push('');
        
        lines.push('�📊 CONFIG SUMMARY:');
        const paramCount = Object.keys(config).filter(key => key !== 'metadata').length;
        lines.push(`Total Parameters Set: ${paramCount}`);
        
        return lines.join('\n');
    }

    // Make formatConfigForDisplay globally available for external scripts
    window.formatConfigForDisplay = formatConfigForDisplay;

    // ========================================
    // 💾 CONFIG CACHE (with localStorage persistence)
    // ========================================
    class ConfigCache {
        constructor(maxSize = 1000, persistKey = 'agcopilot_cache') {
            this.cache = new Map();
            this.maxSize = maxSize;
            this.accessOrder = [];
            this.persistKey = persistKey;
            
            // 🚀 OPTIMIZATION: Add cache hit tracking
            this.metrics = {
                hits: 0,
                misses: 0,
                apiCallsSaved: 0,
                totalRequests: 0
            };
            
            // 🌐 BROWSER ENHANCEMENT: Load from localStorage on init
            this.loadFromStorage();
        }
        
        // 🌐 BROWSER: Load cache from localStorage
        loadFromStorage() {
            try {
                const stored = localStorage.getItem(this.persistKey);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    
                    // Restore cache entries
                    if (parsed.entries && Array.isArray(parsed.entries)) {
                        // Limit to maxSize entries (in case localStorage has more)
                        const entriesToLoad = parsed.entries.slice(-this.maxSize);
                        this.cache = new Map(entriesToLoad);
                        this.accessOrder = entriesToLoad.map(([key]) => key);
                        
                        console.log(`💾 Loaded ${this.cache.size} cached configs from localStorage`);
                    }
                    
                    // Restore metrics if available
                    if (parsed.metrics) {
                        this.metrics = { ...this.metrics, ...parsed.metrics };
                    }
                }
            } catch (error) {
                console.warn('⚠️ Could not load cache from localStorage:', error.message);
                // Continue with empty cache if loading fails
            }
        }
        
        // 🌐 BROWSER: Save cache to localStorage
        saveToStorage() {
            try {
                const data = {
                    entries: Array.from(this.cache.entries()),
                    metrics: this.metrics,
                    timestamp: Date.now()
                };
                
                localStorage.setItem(this.persistKey, JSON.stringify(data));
            } catch (error) {
                // Likely quota exceeded - silently fail or clear old data
                if (error.name === 'QuotaExceededError') {
                    console.warn('⚠️ localStorage quota exceeded. Cache persistence disabled.');
                    // Try to clear our cache to free space
                    try {
                        localStorage.removeItem(this.persistKey);
                    } catch (e) { /* ignore */ }
                } else {
                    console.warn('⚠️ Could not save cache to localStorage:', error.message);
                }
            }
        }

        generateKey(config) {
            // Create a deterministic string representation by sorting all keys recursively (like original AGCopilot)
            const sortedConfig = this.sortObjectRecursively(config);
            return JSON.stringify(sortedConfig);
        }
        
        sortObjectRecursively(obj) {
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }
            
            if (Array.isArray(obj)) {
                return obj.map(item => this.sortObjectRecursively(item));
            }
            
            const sortedKeys = Object.keys(obj).sort();
            const result = {};
            
            for (const key of sortedKeys) {
                result[key] = this.sortObjectRecursively(obj[key]);
            }
            
            return result;
        }

        has(config) {
            return this.cache.has(this.generateKey(config));
        }

        get(config) {
            const key = this.generateKey(config);
            
            if (this.cache.has(key)) {
                // Update access order for LRU
                const index = this.accessOrder.indexOf(key);
                if (index > -1) {
                    this.accessOrder.splice(index, 1);
                }
                this.accessOrder.push(key);
                return this.cache.get(key);
            }
            return null;
        }
        
        // 🚀 OPTIMIZATION: Record a cache hit (called externally when cache is used)
        recordHit() {
            this.metrics.hits++;
            this.metrics.apiCallsSaved++;
            this.metrics.totalRequests++;
        }
        
        // 🚀 OPTIMIZATION: Record a cache miss (called externally when cache is checked but not found)
        recordMiss() {
            this.metrics.misses++;
            this.metrics.totalRequests++;
        }

        set(config, result) {
            const key = this.generateKey(config);
            
            // Remove oldest if at capacity
            if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
                const oldest = this.accessOrder.shift();
                this.cache.delete(oldest);
            }
            
            this.cache.set(key, result);
            
            // Update access order
            const index = this.accessOrder.indexOf(key);
            if (index > -1) {
                this.accessOrder.splice(index, 1);
            }
            this.accessOrder.push(key);
            
            // 🌐 BROWSER: Persist to localStorage (throttled to avoid excessive writes)
            if (!this._saveTimeout) {
                this._saveTimeout = setTimeout(() => {
                    this.saveToStorage();
                    this._saveTimeout = null;
                }, 2000); // Save at most every 2 seconds
            }
        }

        clear() {
            this.cache.clear();
            this.accessOrder = [];
            // Reset metrics when cache is cleared
            this.metrics = {
                hits: 0,
                misses: 0,
                apiCallsSaved: 0,
                totalRequests: 0
            };
            
            // 🌐 BROWSER: Clear localStorage
            try {
                localStorage.removeItem(this.persistKey);
                console.log('💾 Cache cleared from memory and localStorage');
            } catch (error) {
                console.warn('⚠️ Could not clear localStorage:', error.message);
            }
        }

        size() {
            return this.cache.size;
        }
        
        // 🚀 OPTIMIZATION: Get cache performance metrics
        getMetrics() {
            const hitRate = this.metrics.totalRequests > 0 ? 
                (this.metrics.hits / this.metrics.totalRequests * 100).toFixed(1) : '0.0';
            
            return {
                ...this.metrics,
                hitRate: parseFloat(hitRate),
                hitRatePercent: `${hitRate}%`,
                cacheSize: this.cache.size,
                maxSize: this.maxSize
            };
        }
        
        // 🚀 OPTIMIZATION: Get cache performance summary
        getPerformanceSummary() {
            const metrics = this.getMetrics();
            return `Cache: ${metrics.hits}/${metrics.totalRequests} hits (${metrics.hitRatePercent}) | ${metrics.apiCallsSaved} API calls saved | ${metrics.cacheSize}/${metrics.maxSize} entries`;
        }
    }

    // 🚀 OPTIMIZATION: Initialize global cache for configuration results
    if (!window.globalConfigCache) {
        window.globalConfigCache = new ConfigCache(1000);
        console.log('💾 Global configuration cache initialized (capacity: 1000)');
    } else {
        console.log('💾 Global configuration cache already exists');
    }

    // ========================================
    // 🧬 ADVANCED OPTIMIZATION COMPONENTS
    // Latin Hypercube Sampling and Simulated Annealing
    // ========================================
    
    // Helper function to apply bundled constraints if enabled
    function applyBundledConstraints(param, originalRules) {
        if (!originalRules) return originalRules;
        
        // Check if low bundled constraint is enabled
        const lowBundledCheckbox = document.getElementById('low-bundled-constraint');
        if (!lowBundledCheckbox || !lowBundledCheckbox.checked) {
            return originalRules;
        }
        
        // Apply constraints to bundled parameters
        if (param === 'Min Bundled %') {
            return {
                ...originalRules,
                min: 0,
                max: Math.min(5, originalRules.max)
            };
        } else if (param === 'Max Bundled %') {
            return {
                ...originalRules,
                min: originalRules.min,
                max: Math.min(35, originalRules.max)
            };
        }
        
        return originalRules;
    }
    
    // Make applyBundledConstraints globally available
    window.applyBundledConstraints = applyBundledConstraints;
    
    // Latin Hypercube Sampler for better parameter space exploration
    class LatinHypercubeSampler {
        constructor() {
            this.samples = new Map();
        }
        
        generateSamples(parameters, numSamples) {
            const samples = [];
            
            for (let i = 0; i < numSamples; i++) {
                const sample = {};
                
                for (const param of parameters) {
                    const originalRules = PARAM_RULES[param];
                    if (originalRules) {
                        // Apply bundled constraints if enabled
                        const rules = applyBundledConstraints(param, originalRules);
                        
                        if (rules.type === 'string') {
                            sample[param] = Math.floor(Math.random() * 10 + 1).toString();
                        } else {
                            // Latin hypercube sampling
                            const segment = (rules.max - rules.min) / numSamples;
                            const segmentStart = rules.min + i * segment;
                            const randomInSegment = Math.random() * segment;
                            const value = segmentStart + randomInSegment;
                            sample[param] = Math.round(value / rules.step) * rules.step;
                        }
                    }
                }
                
                samples.push(sample);
            }
            
            // Shuffle samples to remove correlation
            for (let i = samples.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [samples[i], samples[j]] = [samples[j], samples[i]];
            }
            
            return samples;
        }
    }

    // Simulated Annealing Optimizer
    class SimulatedAnnealing {
        constructor(optimizer) {
            this.optimizer = optimizer;
            this.initialTemperature = 100;
            this.finalTemperature = 0.1;
            this.coolingRate = 0.95;
        }
        
        getSection(param) {
            // Determine which section a parameter belongs to
            if (param.includes('MCAP') || param.includes('Market Depth')) return 'basic';
            if (param.includes('Token Age') || param.includes('Deployer Age') || param.includes('AG Score')) return 'tokenDetails';
            if (param.includes('Wallet') || param.includes('Holder') || param.includes('Convinced')) return 'wallets';
            if (param.includes('Bundled') || param.includes('Deployer Balance') || param.includes('Buy Ratio') || 
                param.includes('Vol MCAP') || param.includes('Drained') || param.includes('Description') || 
                param.includes('Fresh Deployer') || param.includes('Skip If')) return 'risk';
            if (param.includes('TTC') || param.includes('Liquidity') || param.includes('Win Pred') || param.includes('Buy Signal')) return 'advanced';
            return 'basic';
        }
        
        async runSimulatedAnnealing() {
            updateProgress('🔥 Simulated Annealing Phase', 80, this.optimizer.getCurrentBestScore().toFixed(1), this.optimizer.testCount, this.optimizer.bestMetrics?.totalTokens || '--', this.optimizer.startTime);
            
            let currentConfig = JSON.parse(JSON.stringify(this.optimizer.bestConfig)); // Deep clone
            let currentScore = this.optimizer.getCurrentBestScore();
            let temperature = this.initialTemperature;
            
            while (temperature > this.finalTemperature && this.optimizer.getRemainingTime() > 0.05 && !window.STOPPED) {
                // Generate neighbor configuration
                const neighbor = this.generateNeighbor(currentConfig);
                const result = await this.optimizer.testConfig(neighbor, 'Simulated annealing');
                
                if (result.success && result.metrics) {
                    const neighborScore = calculateRobustScore(result.metrics)?.score ?? result.metrics.tpPnlPercent;
                    
                    const deltaE = neighborScore - currentScore;
                    
                    // Accept if better, or with probability if worse
                    if (deltaE > 0 || Math.random() < Math.exp(deltaE / temperature)) {
                        currentConfig = neighbor;
                        currentScore = neighborScore;
                        
                        updateProgress(`🔥 Annealing T=${temperature.toFixed(1)}`, 
                            80 + (1 - temperature / this.initialTemperature) * 15, 
                            this.optimizer.getCurrentBestScore().toFixed(1), 
                            this.optimizer.testCount, 
                            this.optimizer.bestMetrics?.totalTokens || '--', 
                            this.optimizer.startTime);
                    }
                }
                
                temperature *= this.coolingRate;
                
                // Early termination if target achieved
                const targetPnl = parseFloat(document.getElementById('target-pnl')?.value) || 100;
                if (this.optimizer.getCurrentBestScore() >= targetPnl) {
                    break;
                }
            }
        }
        
        generateNeighbor(config) {
            const neighbor = JSON.parse(JSON.stringify(config)); // Deep clone
            
            // Randomly modify 1-2 parameters
            const paramList = Object.keys(PARAM_RULES);
            const numModifications = Math.floor(Math.random() * 2) + 1;
            
            for (let i = 0; i < numModifications; i++) {
                const param = paramList[Math.floor(Math.random() * paramList.length)];
                const section = this.getSection(param);
                const originalRules = PARAM_RULES[param];
                
                // Apply bundled constraints if enabled
                const rules = applyBundledConstraints(param, originalRules);
                
                if (rules && neighbor[section]) {
                    if (rules.type === 'string') {
                        neighbor[section][param] = Math.floor(Math.random() * 10 + 1).toString();
                    } else {
                        const currentValue = neighbor[section][param] || (rules.min + rules.max) / 2;
                        const maxChange = (rules.max - rules.min) * 0.1;
                        const change = (Math.random() - 0.5) * maxChange;
                        const newValue = Math.max(rules.min, Math.min(rules.max, currentValue + change));
                        neighbor[section][param] = Math.round(newValue / rules.step) * rules.step;
                    }
                }
            }
            
            return neighbor;
        }
    }
   
    
    // ========================================
    // 📊 UI FIELD READING FUNCTIONS
    // ========================================
    
    // Function to read current field value from the UI
    function getFieldValue(labelText) {
        try {
            // Find the label using the same approach as setFieldValue
            const labels = Array.from(document.querySelectorAll('.sidebar-label'));
            const label = labels.find(el => el.textContent.trim() === labelText);

            if (!label) {
                // Debug: Log available labels if label not found
                if (labelText === 'Min MCAP (USD)') {
                    console.warn(`⚠️ Could not find label: "${labelText}"`);
                    console.warn('Available labels:', labels.slice(0, 10).map(l => l.textContent.trim()));
                }
                return undefined;
            }

            let container = label.closest('.form-group') || label.parentElement;

            // Dual-state toggles: check first to avoid navigating away from the button
            if (labelText === 'Description' || labelText === 'Fresh Deployer' || labelText === 'Skip If No KYC/CEX Funding' || labelText === 'Has Buy Signal') {
                let toggleButton = container.querySelector('button');
                if (!toggleButton) {
                    // Climb up cautiously to find the button
                    let searchContainer = container.parentElement;
                    let depth = 0;
                    while (searchContainer && depth < 3) {
                        toggleButton = searchContainer.querySelector('button');
                        if (toggleButton && toggleButton.textContent.trim() !== '×') break;
                        toggleButton = null;
                        searchContainer = searchContainer.parentElement;
                        depth++;
                    }
                }
                if (toggleButton && toggleButton.textContent.trim() !== '×') {
                    const txt = toggleButton.textContent.trim();
                    return (txt === 'Yes') ? true : null; // Yes or Don't care
                }
                return undefined;
            }

            // Navigate up the DOM tree to find the input container (for non-toggle fields)
            if (!container.querySelector('input[type="number"]') && !container.querySelector('select')) {
                container = container.parentElement;
                if (!container.querySelector('input[type="number"]') && !container.querySelector('select')) {
                    container = container.parentElement;
                }
            }

            // Handle number inputs
            const input = container.querySelector('input[type="number"]');
            if (input) {
                const value = input.value.trim();
                if (value === '' || value === null) {
                    return undefined;
                }
                return parseFloat(value);
            }

            // Handle select dropdowns
            const select = container.querySelector('select');
            if (select) {
                const value = select.value;
                if (value === '' || select.selectedIndex === 0) {
                    return undefined;
                }
                return value;
            }

            return undefined;
        } catch (error) {
            console.warn(`Error reading field ${labelText}:`, error.message);
            return undefined;
        }
    }

    // Function to read current configuration from the UI
    async function getCurrentConfigFromUI() {
        console.log('📖 Reading current configuration from UI...');
        
        // Verify DOM is ready with backtester elements
        const sidebarLabels = document.querySelectorAll('.sidebar-label');
        if (sidebarLabels.length < 5) {
            console.warn('⚠️ Backtester UI may not be fully loaded - only found', sidebarLabels.length, 'sidebar labels');
            console.warn('⚠️ This may result in incomplete configuration reading');
        }
        
        const config = {
            basic: {},
            tokenDetails: {},
            wallets: {},
            risk: {},
            advanced: {},
            time: {},
            tpSettings: {},
            takeProfits: []
        };

        // Define the section mapping and parameters for each section
        const sections = {
            basic: {
                sectionTitle: 'Basic',
                params: ['Min MCAP (USD)', 'Max MCAP (USD)', 'Min Market Depth', 'Max Market Depth']
            },
            tokenDetails: {
                sectionTitle: 'Token Details',
                params: ['Min AG Score', 'Max AG Score', 'Min Token Age (sec)', 'Max Token Age (sec)', 'Min Deployer Age (min)']
            },
            wallets: {
                sectionTitle: 'Wallets',
                params: ['Min Unique Wallets', 'Max Unique Wallets', 'Min KYC Wallets', 'Max KYC Wallets', 'Min Dormant Wallets', 'Max Dormant Wallets', 'Min Holders', 'Max Holders', 'Min Top Holders %', 'Max Top Holders %', 'Min Convinced Wallets']
            },
            risk: {
                sectionTitle: 'Risk',
                params: ['Min Bundled %', 'Max Bundled %', 'Min Deployer Balance (SOL)', 'Max Deployer Balance (SOL)', 'Min Buy Ratio %', 'Max Buy Ratio %', 'Min Vol MCAP %', 'Max Vol MCAP %', 'Max Drained %', 'Max Drained Count', 'Description', 'Fresh Deployer', 'Skip If No KYC/CEX Funding']
            },
            advanced: {
                sectionTitle: 'Advanced',
                params: [/* 'Min TTC (sec)', 'Max TTC (sec)', */ 'Max Liquidity %', 'Min Win Pred %', 'Has Buy Signal']
            },
            time: {
                sectionTitle: 'Time',
                params: ['Start Hour', 'Start Minute', 'End Hour', 'End Minute']
            }
        };

        let fieldsRead = 0;
        let fieldsWithValues = 0;

        // Read each section
        for (const [sectionKey, sectionInfo] of Object.entries(sections)) {
            console.log(`📖 Reading section: ${sectionInfo.sectionTitle}`);
            
            // Open the section first
            const sectionOpened = await openSection(sectionInfo.sectionTitle);
            if (!sectionOpened) {
                console.warn(`⚠️ Could not open section: ${sectionInfo.sectionTitle} - section may not exist in UI`);
                continue;
            }
            
            // Wait for section to fully open
            await sleep(300);
            
            // Read each parameter in the section
            for (const param of sectionInfo.params) {
                fieldsRead++;
                const value = getFieldValue(param);
                config[sectionKey][param] = value;
                
                if (value !== undefined) {
                    fieldsWithValues++;
                    console.log(`  ✓ ${param}: ${value}`);
                } else {
                    console.log(`  - ${param}: (not set)`);
                }
                
                // Small delay between field reads
                await sleep(50);
            }
            
            // Delay between sections
            await sleep(200);
        }

        // Read date range fields
        const dateRange = getDateRange();
        if (dateRange.fromDate || dateRange.toDate) {
            config.dateRange = {};
            if (dateRange.fromDate) config.dateRange.fromDate = dateRange.fromDate;
            if (dateRange.toDate) config.dateRange.toDate = dateRange.toDate;
        }

        // Read buying amount from UI
        const buyingAmount = getBuyingAmount();
        if (buyingAmount !== CONFIG.DEFAULT_BUYING_AMOUNT) {
            // Only store if different from default
            config.buyingAmount = buyingAmount;
        }

        const weekdays = getSelectedWeekdays({ forceRefresh: true });
        if (weekdays.length > 0) {
            config.weekdays = weekdays;
        }

        const sources = getSelectedSources({ forceRefresh: true });
        if (Array.isArray(sources)) {
            config.sources = [...sources];
        }

        // Read Take Profits (TP) if visible in UI
        try {
            // Attempt to read up to 6 TP rows by label convention
            const tpEntries = [];
            for (let i = 1; i <= 6; i++) {
                const gainLabel = `TP ${i} % Gain`;
                const sellLabel = `TP ${i} % Sell`;
                const gainVal = getFieldValue(gainLabel);
                const sellVal = getFieldValue(sellLabel);
                const gain = gainVal !== undefined && gainVal !== null && gainVal !== '' ? Number(gainVal) : undefined;
                const size = sellVal !== undefined && sellVal !== null && sellVal !== '' ? Number(sellVal) : undefined;
                if ((gain !== undefined && !isNaN(gain)) || (size !== undefined && !isNaN(size))) {
                    tpEntries.push({ index: i, gain, size });
                }
            }

            // Normalize to takeProfits array with {gain,size}
            const takeProfits = tpEntries
                .filter(e => (e.gain !== undefined && !isNaN(e.gain)) && (e.size !== undefined && !isNaN(e.size)))
                .map(e => ({ gain: e.gain, size: e.size }));

            // Store raw tpSettings too (keyed by labels) for pin dialog compatibility
            tpEntries.forEach(e => {
                if (e.gain !== undefined && !isNaN(e.gain)) config.tpSettings[`TP ${e.index} % Gain`] = e.gain;
                if (e.size !== undefined && !isNaN(e.size)) config.tpSettings[`TP ${e.index} % Sell`] = e.size;
            });

            if (takeProfits.length > 0) {
                config.takeProfits = takeProfits;
            }
        } catch (e) {
            console.warn('TP read failed:', e.message);
        }

    console.log(`📖 Read ${fieldsRead} fields from UI, ${fieldsWithValues} have values set`);
    // Cache last UI config for downstream synchronous access (e.g., building API URL)
    try { window.agLastUIConfig = config; } catch (_) {}
        return config;
    }
    
    // UI interaction functions to apply configs to the backtester form (based on original AGCopilot)
    async function setFieldValue(labelText, value, maxRetries = 2) {
        const shouldClear = (value === undefined || value === null || value === "" || value === "clear");

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Find the label using the original AGCopilot approach
                const labels = Array.from(document.querySelectorAll('.sidebar-label'));
                const label = labels.find(el => el.textContent.trim() === labelText);

                if (!label) {
                    console.warn(`Label not found: ${labelText}`);
                    return false;
                }

                let container = label.closest('.form-group') || label.parentElement;

                // Handle toggle buttons FIRST (Description, Fresh Deployer, and Skip If No KYC/CEX Funding) before DOM navigation
                if (labelText === "Description" || labelText === "Fresh Deployer" || labelText === "Skip If No KYC/CEX Funding" || labelText === "Has Buy Signal") {
                    // Look for toggle button specifically in the label's immediate area
                    let toggleButton = container.querySelector('button');
                    
                    // If not found, try searching in parent containers but only for toggle buttons
                    if (!toggleButton) {
                        let searchContainer = container.parentElement;
                        let searchDepth = 0;
                        while (searchContainer && searchDepth < 3) {
                            toggleButton = searchContainer.querySelector('button');
                            // Ensure we found a toggle button and not a clear button (×)
                            if (toggleButton && toggleButton.textContent.trim() !== '×') {
                                break;
                            }
                            toggleButton = null;
                            searchContainer = searchContainer.parentElement;
                            searchDepth++;
                        }
                    }
                    
                    if (toggleButton && toggleButton.textContent.trim() !== '×') {
                        // Determine target button text based on dual-state: Yes or Don't care
                        let targetText;
                        if (value === true || value === 'Yes') targetText = 'Yes';
                        else targetText = "Don't care";

                        // Click-cycle up to 4 times to reach desired state
                        let safety = 0;
                        while (toggleButton.textContent.trim() !== targetText && safety < 3) {
                            toggleButton.click();
                            await sleep(100);
                            safety++;
                        }
                        return toggleButton.textContent.trim() === targetText;
                    } else {
                        console.warn(`Toggle button not found for ${labelText}`);
                        return false; // Early return to prevent fallthrough to number input logic
                    }
                }

                // Navigate up the DOM tree to find the input container (only for non-toggle fields)
                if (!container.querySelector('input[type="number"]') && !container.querySelector('select')) {
                    container = container.parentElement;
                    if (!container.querySelector('input[type="number"]') && !container.querySelector('select')) {
                        container = container.parentElement;
                    }
                }

                // Handle number inputs
                const input = container.querySelector('input[type="number"]');
                if (input) {
                    if (shouldClear) {
                        // Look for clear button (×)
                        const relativeContainer = input.closest('.relative');
                        const clearButton = relativeContainer?.querySelector('button');
                        if (clearButton && clearButton.textContent.trim() === '×') {
                            clearButton.click();
                            await sleep(100);
                        } else {
                            // Manual clear
                            input.focus();
                            input.value = '';
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                            input.blur();
                        }
                    } else {
                        let processedValue = value;

                        // Type conversion
                        if (typeof value === 'string' && value.trim() !== '') {
                            const parsed = parseFloat(value);
                            if (!isNaN(parsed)) {
                                processedValue = parsed;
                            }
                        }

                        // Force integer rounding for specific parameters
                        if (labelText.includes('Wallets') || labelText.includes('Count') || labelText.includes('Age') || labelText.includes('Score')) {
                            processedValue = Math.round(processedValue);
                        }

                        if ((typeof processedValue === 'number' && !isNaN(processedValue)) ||
                            (typeof processedValue === 'string' && processedValue.trim() !== '')) {
                            
                            input.focus();
                            
                            // Use React-compatible value setting
                            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                            nativeInputValueSetter.call(input, processedValue);

                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                            input.blur();
                        }
                    }
                    return true;
                }

                // Handle select dropdowns
                const select = container.querySelector('select');
                if (select) {
                    if (shouldClear) {
                        select.selectedIndex = 0;
                    } else {
                        select.value = value;
                    }
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    return true;
                }

                await sleep(200); // Wait before retry
                
            } catch (error) {
                console.warn(`Attempt ${attempt} failed for ${labelText}:`, error.message);
                if (attempt < maxRetries) {
                    await sleep(200);
                }
            }
        }
        return false;
    }

    // Open section helper
    async function openSection(sectionTitle) {
        const allHeaders = Array.from(document.querySelectorAll('button[type="button"]'));
        const sectionHeader = allHeaders.find(header =>
            header.textContent.includes(sectionTitle)
        );

        if (sectionHeader) {
            sectionHeader.click();
            await sleep(200); // Wait for section to open
            return true;
        }
        return false;
    }

    // Apply configuration to the backtester UI (based on original AGCopilot)
    async function applyConfigToUI(config, skipStopCheck = false) {
        if (!config) {
            updateStatus('❌ No configuration to apply', true);
            return false;
        }

        updateStatus('⚙️ Applying configuration to backtester UI...');

    invalidateSelectionCache();
        
        const sectionMap = {
            basic: 'Basic',
            tokenDetails: 'Token Details',
            wallets: 'Wallets',
            risk: 'Risk',
            advanced: 'Advanced'
        };

        let successCount = 0;
        let totalFields = 0;

        // Skip sections and parameters that the user controls manually
        const SKIP_SECTIONS = new Set(['tpSettings', 'takeProfits']);
        
        // Check if a parameter should be skipped (user-controlled settings)
        const shouldSkipParam = (param) => {
            return param.startsWith('TP ') ||           // All TP settings
                   param.includes('Date') ||            // Start/End Date
                   param.includes('Hour') ||            // Start/End Hour
                   param.includes('Minute') ||          // Start/End Minute
                   param === 'Buying Amount (SOL)' ||
                   param === 'Entry Grace %';
        };

    try {
            // Apply each section of the configuration
            for (const [section, sectionConfig] of Object.entries(config)) {
                // Only check stop flag if we're in optimization mode (not manual apply)
                if (!skipStopCheck && window.STOPPED) {
                    console.log('⏹️ Optimization stopped during config application');
                    return false;
                }
                
                // Skip user-controlled sections entirely
                if (SKIP_SECTIONS.has(section)) {
                    continue;
                }
                
                if (sectionConfig && typeof sectionConfig === 'object') {
                    const sectionName = sectionMap[section];
                    
                    // Open the section first
                    if (sectionName) {
                        await openSection(sectionName);
                        await sleep(300);
                    }

                    // Apply each field in the section
                    for (const [param, value] of Object.entries(sectionConfig)) {
                        if (!skipStopCheck && window.STOPPED) {
                            console.log('⏹️ Optimization stopped during field application');
                            return false;
                        }
                        
                        // Skip user-controlled parameters
                        if (shouldSkipParam(param)) {
                            continue;
                        }
                        
                        // Apply ALL fields, including undefined ones (for clearing)
                        totalFields++;
                        const success = await setFieldValue(param, value);
                        if (success) {
                            successCount++;
                        } 
                        
                        // Delay between field updates to avoid issues
                        await sleep(150);
                    }
                    
                    // Delay between sections
                    await sleep(200);
                }
            }

            // Date range, TP settings, and weekday filters remain under user control in the backtester UI.

            const successRate = totalFields > 0 ? (successCount / totalFields * 100) : 0;
            updateStatus(`⚙️ Applied ${successCount}/${totalFields} fields (${successRate.toFixed(1)}% success rate)`);
            
            if (successRate > 70) {
                updateStatus('✅ Configuration successfully applied to UI!');
                return true;
            } else {
                updateStatus('⚠️ Configuration partially applied - some fields may not have been found', true);
                return false;
            }

        } catch (error) {
            updateStatus(`❌ Error applying configuration: ${error.message}`, true);
            return false;
        }
    }
    
    // Apply preset configuration
    async function applyPreset(presetName) {
        const preset = PRESETS[presetName];
        if (!preset) {
            updateStatus(`❌ Preset '${presetName}' not found`, true);
            return;
        }

        updateStatus(`📦 Applying preset: ${presetName}...`);
        const completePreset = ensureCompleteConfig(preset);
        const success = await applyConfigToUI(completePreset, true); // Skip stop check for manual preset application
        
        if (success) {
            updateStatus(`✅ Preset ${presetName} applied to UI successfully!`);
            // Test it to show the results
            updateStatus('📊 Testing preset configuration...');
            const result = await testConfigurationAPI(preset, `Preset: ${presetName}`);
            if (result.success) {
                updateStatus(`📊 Preset results: ${result.metrics.totalTokens} tokens, ${result.metrics.tpPnlPercent?.toFixed(1)}% TP PnL`);
            }
        } else {
            updateStatus(`❌ Failed to apply preset ${presetName} to UI`, true);
        }
    }
    // ========================================
    // 🎨 UI FUNCTIONS
    // ========================================
    
    // Functions moved to below comment block
    
    // ========================================
    // 🖥️ SPLIT-SCREEN LAYOUT FUNCTIONS
    // ========================================
    
    // Track split-screen state
    let isSplitScreenMode = false;
    const COPILOT_WIDTH = 420; // Width of the AG Copilot panel
    
    function toggleSplitScreen() {
        const ui = document.getElementById('ag-copilot-enhanced-ui');
        const collapsedUI = document.getElementById('ag-copilot-collapsed-ui');
        const body = document.body;
        const html = document.documentElement;
        
        if (!ui) return;
        
        if (!isSplitScreenMode) {
            // Switch to split-screen mode
            enableSplitScreen();
        } else {
            // Switch back to floating mode
            disableSplitScreen();
        }
    }
    
    function enableSplitScreen() {
        const ui = document.getElementById('ag-copilot-enhanced-ui');
        const collapsedUI = document.getElementById('ag-copilot-collapsed-ui');
        const body = document.body;
        const html = document.documentElement;
        
        if (!ui) return;
        
        // Check if screen is wide enough for split-screen (minimum 1200px)
        if (window.innerWidth < 1200) {
            console.log('⚠️ Screen too narrow for split-screen mode (minimum 1200px required)');
            alert('Split-screen mode requires a minimum screen width of 1200px.\nCurrent width: ' + window.innerWidth + 'px');
            return;
        }
        
        // Store original body styles if not already stored
        if (!body.dataset.originalMargin) {
            body.dataset.originalMargin = body.style.marginRight || '0px';
            body.dataset.originalWidth = body.style.width || 'auto';
            body.dataset.originalMaxWidth = body.style.maxWidth || 'none';
            body.dataset.originalOverflowX = body.style.overflowX || 'visible';
        }
        
        // Adjust page layout to make room for AG Copilot
        body.style.marginRight = `${COPILOT_WIDTH}px`; // Extra 40px for padding
        body.style.transition = 'margin-right 0.3s ease';
        body.style.overflowX = 'hidden'; // Prevent horizontal scrollbar
        
        // Position AG Copilot in the right slice
        ui.style.position = 'fixed';
        ui.style.top = '0px';
        ui.style.right = '0px';
        ui.style.width = `${COPILOT_WIDTH}px`;
        ui.style.height = '100vh';
        ui.style.borderRadius = '0px';
        ui.style.maxHeight = '100vh';
        ui.style.border = '1px solid #2d3748';
        ui.style.borderRight = 'none';
        ui.style.transition = 'all 0.3s ease';
        
        // Update collapsed UI position too
        if (collapsedUI) {
            collapsedUI.style.right = '10px';
        }
        
        isSplitScreenMode = true;
    }
    
    function disableSplitScreen() {
        const ui = document.getElementById('ag-copilot-enhanced-ui');
        const collapsedUI = document.getElementById('ag-copilot-collapsed-ui');
        const body = document.body;
        
        if (!ui) return;
        
        // Restore original body styles
        body.style.marginRight = body.dataset.originalMargin || '0px';
        body.style.width = body.dataset.originalWidth || 'auto';
        body.style.maxWidth = body.dataset.originalMaxWidth || 'none';
        body.style.overflowX = body.dataset.originalOverflowX || 'visible';
        body.style.transition = 'margin-right 0.3s ease';
        
        // Restore AG Copilot to floating mode
        ui.style.position = 'fixed';
        ui.style.top = '20px';
        ui.style.right = '20px';
        ui.style.width = `${COPILOT_WIDTH}px`;
        ui.style.height = 'auto';
        ui.style.borderRadius = '8px';
        ui.style.maxHeight = '90vh';
        ui.style.border = '1px solid #2d3748';
        ui.style.transition = 'all 0.3s ease';
        
        // Update collapsed UI position
        if (collapsedUI) {
            collapsedUI.style.right = '20px';
        }
        
        isSplitScreenMode = false;
        console.log('🖥️ Floating mode restored');
    }
    
    
    // ========================================
    // 🎨 UI FUNCTIONS & LAYOUT MANAGEMENT 
    // ========================================
    
    
    
    // Clean up split-screen when UI is removed
    function cleanupSplitScreen() {
        if (isSplitScreenMode) {
            disableSplitScreen();
        }
    }
    
    function createUI() {
        // Remove existing UI
        const existingUI = document.getElementById('ag-copilot-enhanced-ui');
        if (existingUI) {
            existingUI.remove();
        }

        const ui = document.createElement('div');
        ui.id = 'ag-copilot-enhanced-ui';
        ui.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 420px;
            background: #1a2332;
            border: 1px solid #2d3748;
            border-radius: 8px;
            padding: 0;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            color: #e2e8f0;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;

        ui.innerHTML = `
            <div id="ui-header" style="
                padding: 16px 20px;
                background: #2d3748;
                border-bottom: 1px solid #4a5568;
                border-radius: 8px 8px 0 0;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="
                            width: 8px;
                            height: 8px;
                            background: #48bb78;
                            border-radius: 50%;
                            animation: pulse 2s infinite;
                        "></div>
                        <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #f7fafc;">
                            🤖 AG Copilot Enhanced
                        </h3>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button id="collapse-ui-btn" style="
                            background: #4a5568;
                            border: 1px solid #718096;
                            border-radius: 4px;
                            color: #e2e8f0;
                            cursor: pointer;
                            padding: 6px 10px;
                            font-size: 11px;
                            font-weight: 500;
                            transition: all 0.2s;
                        " onmouseover="this.style.background='#718096'" 
                           onmouseout="this.style.background='#4a5568'"
                           title="Minimize window">
                            ➖
                        </button>
                        <button id="close-ui-btn" style="
                            background: #e53e3e;
                            border: 1px solid #c53030;
                            border-radius: 4px;
                            color: white;
                            cursor: pointer;
                            padding: 6px 10px;
                            font-size: 11px;
                            font-weight: 500;
                            transition: all 0.2s;
                        " onmouseover="this.style.background='#c53030'" 
                           onmouseout="this.style.background='#e53e3e'"
                           title="Close AG Copilot">
                            ✕
                        </button>
                    </div>
                </div>
            </div>
            
            <div id="ui-content" style="
                flex: 1;
                overflow-y: auto;
                scrollbar-width: thin;
                scrollbar-color: #4a5568 transparent;
            ">
                <style>
                    #ui-content::-webkit-scrollbar {
                        width: 6px;
                    }
                    #ui-content::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    #ui-content::-webkit-scrollbar-thumb {
                        background: #4a5568;
                        border-radius: 3px;
                    }
                    #ui-content::-webkit-scrollbar-thumb:hover {
                        background: #718096;
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                    .tab-button {
                        padding: 12px 20px;
                        background: #2d3748;
                        border: none;
                        border-bottom: 2px solid transparent;
                        color: #a0aec0;
                        font-size: 13px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s;
                        flex: 1;
                    }
                    .tab-button:hover {
                        background: #4a5568;
                        color: #e2e8f0;
                    }
                    .tab-button.active {
                        background: #1a2332;
                        color: #63b3ed;
                        border-bottom-color: #63b3ed;
                    }
                    .tab-content {
                        display: none;
                        padding: 16px 20px;
                    }
                    .tab-content.active {
                        display: block;
                    }
                </style>

                <!-- Tab Navigation -->
                <div style="
                    display: flex;
                    background: #2d3748;
                    border-bottom: 1px solid #4a5568;
                ">
                    <button class="tab-button active" onclick="switchTab('config-tab')" id="config-tab-btn">
                        ⚙️ Optim
                    </button>
                    <button class="tab-button" onclick="switchTab('meta-finder-tab')" id="meta-finder-tab-btn">
                        🎯 Meta
                    </button>
                    <button class="tab-button" onclick="switchTab('sessions-tab')" id="sessions-tab-btn">
                        🌍 Sessions
                    </button>
                    <button class="tab-button" onclick="switchTab('data-sync-tab')" id="data-sync-tab-btn">
                        📊 Sync
                    </button>
                </div>

                <!-- Configuration Tab -->
                <div id="config-tab" class="tab-content active">
                    <!-- Optimization UI will be injected here by AGOptimization.js -->
                    <div id="optimization-ui-container" style="padding: 16px;">
                        <div style="
                            text-align: center; 
                            padding: 40px 20px;
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                            align-items: center;
                            min-height: 200px;
                        ">
                            <div style="font-size: 32px; margin-bottom: 12px;">🔄</div>
                            <div style="color: #a0aec0; font-size: 14px; margin-bottom: 8px;">Loading Optimization Controls...</div>
                            <div style="color: #718096; font-size: 11px;">AGOptimization.js module</div>
                        </div>
                    </div>
                </div>

                <!-- Meta Finder Tab -->
                <div id="meta-finder-tab" class="tab-content">
                    <div id="meta-finder-loading" style="
                        text-align: center; 
                        padding: 40px 20px;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        min-height: 200px;
                    ">
                        <div style="font-size: 32px; margin-bottom: 12px;">🔄</div>
                        <div style="color: #a0aec0; font-size: 14px; margin-bottom: 8px;">Loading Meta Finder...</div>
                        <div style="color: #718096; font-size: 11px;">Discovering winning archetypes</div>
                    </div>
                </div>

                <!-- Data Sync Tab -->
                <div id="data-sync-tab" class="tab-content">
                    <div id="data-sync-container">
                        <div style="
                            text-align: center; 
                            padding: 40px 20px;
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                            align-items: center;
                            min-height: 200px;
                        ">
                            <div style="font-size: 32px; margin-bottom: 12px;">📊</div>
                            <div style="color: #a0aec0; font-size: 14px; margin-bottom: 8px;">Loading Data Sync...</div>
                            <div style="color: #718096; font-size: 11px;">Sync AG API data to local database</div>
                        </div>
                    </div>
                </div>

                <!-- Sessions Analysis Tab -->
                <div id="sessions-tab" class="tab-content">
                    <div id="sessions-container">
                        <div style="
                            text-align: center; 
                            padding: 40px 20px;
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                            align-items: center;
                            min-height: 200px;
                        ">
                            <div style="font-size: 32px; margin-bottom: 12px;">🌍</div>
                            <div style="color: #a0aec0; font-size: 14px; margin-bottom: 8px;">Loading Session Analysis...</div>
                            <div style="color: #718096; font-size: 11px;">Analyze trading sessions by time zone</div>
                        </div>
                    </div>
                </div>

                <!-- Permanent Results Section at Bottom -->
                <div style="
                    border-top: 1px solid #2d3748;
                    background: rgba(72, 187, 120, 0.05);
                ">
                    <div id="best-config-display" style="
                        background: rgba(72, 187, 120, 0.1);
                        border: 1px solid rgba(72, 187, 120, 0.3);
                        border-radius: 6px;
                        padding: 16px;
                        margin: 16px 20px;
                        display: block;
                    ">
                        <h5 id="best-config-header" style="
                            margin: 0 0 12px 0;
                            font-size: 13px;
                            font-weight: 600;
                            color: #48bb78;
                            display: flex;
                            align-items: center;
                            gap: 6px;
                        ">⏳ Optimization Configuration</h5>
                        <div id="best-config-stats" style="
                            font-size: 12px;
                            margin-bottom: 12px;
                            color: #e2e8f0;
                        "></div>
                        <div style="margin-bottom: 12px;">
                            <!-- Mode Indicator -->
                            <div id="optimization-mode-indicator" style="
                                padding: 8px 12px;
                                background: rgba(72, 187, 120, 0.1);
                                border: 1px solid rgba(72, 187, 120, 0.3);
                                border-radius: 4px;
                                font-size: 11px;
                                color: #48bb78;
                                text-align: center;
                                margin-bottom: 12px;
                            ">
                                🏠 Mode: <span id="mode-status">Local API (192.168.50.141:5000)</span>
                            </div>
                            
                            <!-- Required Tokens Constraint Indicator -->
                            <div id="required-tokens-indicator" style="
                                display: none;
                                padding: 8px 12px;
                                background: rgba(72, 187, 120, 0.15);
                                border: 1px solid rgba(72, 187, 120, 0.4);
                                border-radius: 4px;
                                font-size: 11px;
                                color: #48bb78;
                                margin-bottom: 12px;
                            ">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span id="required-tokens-text">🔒 Required: None</span>
                                    <button onclick="window.clearRequiredTokens()" style="
                                        padding: 2px 8px;
                                        background: rgba(245, 101, 101, 0.2);
                                        border: 1px solid rgba(245, 101, 101, 0.4);
                                        border-radius: 4px;
                                        color: #f56565;
                                        font-size: 9px;
                                        cursor: pointer;
                                    ">✕ Clear</button>
                                </div>
                            </div>
                            
                            <!-- Main Action Buttons -->
                            <div style="margin-bottom: 12px;">
                                <button id="start-optimization" style="
                                    width: 100%;
                                    padding: 12px;
                                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                    border: none;
                                    border-radius: 6px;
                                    color: white;
                                    font-weight: 600;
                                    cursor: pointer;
                                    font-size: 14px;
                                    transition: all 0.2s;
                                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                                " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(0, 0, 0, 0.15)'" 
                                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0, 0, 0, 0.1)'">
                                    🚀 Start Enhanced Optimization
                                </button>
                            </div>
                            
                            <div style="margin-bottom: 12px;">
                                <button id="stop-optimization" style="
                                    width: 100%;
                                    padding: 10px;
                                    background: #e53e3e;
                                    border: 1px solid #c53030;
                                    border-radius: 6px;
                                    color: white;
                                    font-weight: 500;
                                    cursor: pointer;
                                    font-size: 12px;
                                    display: none;
                                    transition: background 0.2s;
                                " onmouseover="this.style.background='#c53030'" onmouseout="this.style.background='#e53e3e'">
                                    ⏹️ Stop Optimization
                                </button>
                            </div>
                            
                            <!-- Secondary Action Buttons Grid -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px;">
                            </div>
                            
                            <!-- Meta Finder Action Buttons (shown when meta finder results are available) -->
                            <div id="meta-finder-actions" style="display: none; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px;">
                                <button id="apply-meta-config" style="
                                    padding: 10px;
                                    background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
                                    border: none;
                                    border-radius: 6px;
                                    color: white;
                                    font-weight: 500;
                                    cursor: pointer;
                                    font-size: 12px;
                                    transition: all 0.2s;
                                " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'"
                                   onclick="window.applyMetaConfig && window.applyMetaConfig()">
                                    ⚙️ Apply Config
                                </button>
                                
                                <button id="copy-meta-config" style="
                                    padding: 10px;
                                    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                                    border: none;
                                    border-radius: 6px;
                                    color: white;
                                    font-weight: 500;
                                    cursor: pointer;
                                    font-size: 12px;
                                    transition: all 0.2s;
                                " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'"
                                   onclick="window.copyMetaConfig && window.copyMetaConfig()">
                                    📋 Copy Config
                                </button>
                            </div>   
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(ui);
        
        // Add the switchTab function
        window.switchTab = function(activeTabId) {
            // Remove active class from all tab buttons
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Remove active class from all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Add active class to the clicked button
            const activeButton = document.getElementById(activeTabId + '-btn');
            if (activeButton) {
                activeButton.classList.add('active');
            }
            
            // Add active class to the corresponding content
            const activeContent = document.getElementById(activeTabId);
            if (activeContent) {
                activeContent.classList.add('active');
            }
            
            // Auto-load external scripts when tabs are clicked
            if (activeTabId === 'meta-finder-tab') {
                loadMetaFinderInTab();
            } else if (activeTabId === 'config-tab') {
                loadOptimizationInTab();
            } else if (activeTabId === 'data-sync-tab') {
                loadDataSyncInTab();
            } else if (activeTabId === 'sessions-tab') {
                loadSessionsInTab();
            }
        };
        
        // Create collapsed state UI with matching theme
        const collapsedUI = document.createElement('div');
        collapsedUI.id = 'ag-copilot-collapsed-ui';
        collapsedUI.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 65px;
            height: 60px;
            background: #1a2332;
            border: 1px solid #2d3748;
            border-radius: 8px;
            padding: 8px;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            color: #e2e8f0;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            cursor: pointer;
            display: none;
            transition: all 0.3s ease;
        `;
        
        collapsedUI.innerHTML = `
            <div style="
                text-align: center;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            ">
                <div style="
                    width: 8px;
                    height: 8px;
                    background: #48bb78;
                    border-radius: 50%;
                    margin-bottom: 4px;
                    animation: pulse 2s infinite;
                "></div>
                <div style="font-size: 14px; margin-bottom: 2px;">🤖</div>
                <div style="font-size: 9px; font-weight: 600; opacity: 0.9;">AG Copilot</div>
                <div style="font-size: 7px; opacity: 0.7; color: #a0aec0;">Click to expand</div>
            </div>
        `;
        
        collapsedUI.addEventListener('click', () => {
            expandUI();
        });
        
        // Add hover effects to collapsed UI
        collapsedUI.addEventListener('mouseenter', () => {
            collapsedUI.style.transform = 'scale(1.05)';
            collapsedUI.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
        });
        
        collapsedUI.addEventListener('mouseleave', () => {
            collapsedUI.style.transform = 'scale(1)';
            collapsedUI.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
        });
        
        document.body.appendChild(collapsedUI);
        
        // Make functions globally available for onclick handlers
        window.applyBestConfigToUI = async function() {
            const tracker = window.bestConfigTracker;
            const config = tracker?.config || window.currentBestConfig || window.optimizationTracker?.currentBest?.config;
            
            // Validate that config has actual data
            if (config) {
                const hasData = Object.keys(config).some(section => {
                    const sectionData = config[section];
                    if (Array.isArray(sectionData)) return sectionData.length > 0;
                    if (typeof sectionData === 'object' && sectionData !== null) {
                        return Object.keys(sectionData).some(k => sectionData[k] !== undefined && sectionData[k] !== null);
                    }
                    return sectionData !== undefined && sectionData !== null;
                });
                
                if (!hasData) {
                    console.log('❌ Configuration appears to be empty - this may indicate UI reading failed');
                    console.log('💡 Try reloading AGCopilot after the page is fully loaded, or run an optimization first');
                    updateStatus('❌ Configuration is empty - try reloading');
                    return;
                }
            }
            
            if (config) {
                const id = tracker?.id ? String(tracker.id).substring(0, 8) : 'current';
                console.log(`⚙️ Applying best configuration (ID: ${id}) to UI...`);
                const success = await applyConfigToUI(config, true); // Skip stop check for manual best config application
                if (success) {
                    console.log(`✅ Best configuration (ID: ${id}) applied to UI successfully!`);
                    updateStatus('✅ Best configuration applied to UI');
                } else {
                    console.log('❌ Failed to apply best configuration to UI');
                    updateStatus('❌ Failed to apply configuration');
                }
            } else {
                console.log('❌ No best configuration available to apply');
                updateStatus('❌ No configuration available');
            }
        };
        
        window.copyBestConfigToClipboard = function() {
            const tracker = window.bestConfigTracker;
            const config = tracker?.config || window.currentBestConfig || window.optimizationTracker?.currentBest?.config;
            const metrics = tracker?.metrics || window.optimizationTracker?.currentBest?.metrics;
            
            // Validate that config has actual data
            if (config) {
                const hasData = Object.keys(config).some(section => {
                    const sectionData = config[section];
                    if (Array.isArray(sectionData)) return sectionData.length > 0;
                    if (typeof sectionData === 'object' && sectionData !== null) {
                        return Object.keys(sectionData).some(k => sectionData[k] !== undefined && sectionData[k] !== null);
                    }
                    return sectionData !== undefined && sectionData !== null;
                });
                
                if (!hasData) {
                    console.log('❌ Configuration appears to be empty - this may indicate UI reading failed');
                    console.log('💡 Try reloading AGCopilot after the page is fully loaded, or run an optimization first');
                    updateStatus('❌ Configuration is empty - try reloading');
                    return;
                }
            }
            
            if (config) {
                // Get metadata
                const id = tracker?.id ? String(tracker.id).substring(0, 8) : 'current';
                const score = tracker?.score || metrics?.score || 'N/A';
                const source = tracker?.source || window.optimizationTracker?.currentBest?.method || 'Unknown';
                const timestamp = tracker?.id ? new Date(tracker.id).toLocaleString() : new Date().toLocaleString();
                
                // Format config with proper section detection
                let configText;
                const sections = Object.keys(config).filter(k => 
                    ['basic', 'tokenDetails', 'wallets', 'risk', 'advanced', 'time', 'sources', 'weekdays', 'takeProfits', 'tpSettings'].includes(k)
                );
                
                if (sections.length > 0) {
                    // Sectioned config - show which sections have values
                    const sectionList = sections.filter(s => {
                        const sectionData = config[s];
                        if (Array.isArray(sectionData)) return sectionData.length > 0;
                        if (typeof sectionData === 'object' && sectionData !== null) {
                            return Object.keys(sectionData).length > 0;
                        }
                        return false;
                    }).join(', ');
                    
                    configText = JSON.stringify(config, null, 2);
                    
                    // Check for date range info
                    let dateRangeInfo = '';
                    if (config.dateRange && (config.dateRange.fromDate || config.dateRange.toDate)) {
                        const from = config.dateRange.fromDate || 'none';
                        const to = config.dateRange.toDate || 'none';
                        dateRangeInfo = `\n// Date Range: ${from} to ${to}`;
                        
                        // Calculate span if both dates present
                        if (config.dateRange.fromDate && config.dateRange.toDate) {
                            const start = new Date(config.dateRange.fromDate);
                            const end = new Date(config.dateRange.toDate);
                            const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
                            dateRangeInfo += ` (${days} days)`;
                            
                            if (days < 14) {
                                dateRangeInfo += '\n// ⚠️ WARNING: Narrow date range may not match real backtester results!';
                            }
                        }
                    }
                    
                    // Add metadata comment at the top
                    const metadataComment = 
                        `// Best configuration (ID: ${id})\n` + 
                        `// Score: ${typeof score === 'number' ? score.toFixed(1) + '%' : score} | Source: ${source}\n` + 
                        `// Generated: ${timestamp}\n` +
                        `// Sections: ${sectionList}${dateRangeInfo}\n\n`;
                    
                    navigator.clipboard.writeText(metadataComment + configText).then(() => {
                        console.log(`📋 Best configuration (ID: ${id}) copied to clipboard!`);
                        updateStatus('📋 Configuration copied to clipboard');
                    }).catch(err => {
                        console.log('❌ Failed to copy configuration to clipboard:', err);
                        updateStatus('❌ Failed to copy configuration');
                    });
                } else {
                    // Flat config
                    configText = JSON.stringify(config, null, 2);
                    
                    const metadataComment = 
                        `// Best configuration (ID: ${id})\n` + 
                        `// Score: ${typeof score === 'number' ? score.toFixed(1) + '%' : score} | Source: ${source}\n` + 
                        `// Generated: ${timestamp}\n\n`;
                    
                    navigator.clipboard.writeText(metadataComment + configText).then(() => {
                        console.log(`📋 Best configuration (ID: ${id}) copied to clipboard!`);
                        updateStatus('📋 Configuration copied to clipboard');
                    }).catch(err => {
                        console.log('❌ Failed to copy configuration to clipboard:', err);
                        updateStatus('❌ Failed to copy configuration');
                    });
                }
            } else {
                console.log('❌ No best configuration available to copy');
                updateStatus('❌ No configuration available');
            }
        };
        
        // Make split-screen functions globally available
        window.toggleSplitScreen = toggleSplitScreen;
        window.enableSplitScreen = enableSplitScreen;
        window.disableSplitScreen = disableSplitScreen;
        
        // Make UI update functions globally available
        window.updateUIBackground = updateUIBackground;
        window.updateBestConfigHeader = updateBestConfigHeader;
        
        // Make CONFIG globally accessible for debugging/testing
        window.CONFIG = CONFIG;
        
        // Note: Core functions are now exported globally before initialization
        // See GLOBAL EXPORTS FOR EXTERNAL SCRIPTS section
        
        // Always use split-screen mode (after a short delay to ensure DOM is ready)
        setTimeout(() => {
            enableSplitScreen();
        }, 100);
        
        return ui;
    }

    function updateStatus(message, isError = false) {
        // Only log to console, no UI logging
        const icon = isError ? '❌' : '📝';
        console.log(`${icon} ${message}`);
    }

    function updateBestConfigHeader(state = 'idle') {
        const header = document.getElementById('best-config-header');
        if (!header) return;
        
        switch (state) {
            case 'idle':
                header.textContent = '⏳ Optimization Configuration';
                header.style.color = '#48bb78';
                break;
            case 'running':
                header.textContent = '🔄 Finding Best Configuration...';
                header.style.color = '#60a5fa';
                break;
            case 'completed':
                header.textContent = '🏆 Best Configuration Found';
                header.style.color = '#48bb78';
                break;
        }
    }

    function updateUIBackground(isCompleted = false) {
        const ui = document.getElementById('ag-copilot-enhanced-ui');
        const header = document.getElementById('ui-header');
        const bestConfigDisplay = document.getElementById('best-config-display');
        
        if (ui) {
            if (isCompleted) {
                // Only animate the best config section - keep main UI unchanged
                
                // Add pulsing animation to Best Configuration Found section
                if (bestConfigDisplay) {
                    bestConfigDisplay.style.border = '2px solid #48bb78';
                    bestConfigDisplay.style.borderRadius = '6px';
                    bestConfigDisplay.style.animation = 'successPulse 1.5s ease-in-out infinite';
                    bestConfigDisplay.style.boxShadow = '0 0 15px rgba(72, 187, 120, 0.3)';
                }
                
                // Update best config header to show completion
                updateBestConfigHeader('completed');
                
                // Show the Apply/Copy config buttons
                const resultButtons = document.getElementById('optimization-result-buttons');
                if (resultButtons) {
                    resultButtons.style.display = 'block';
                }
                
                // Add enhanced CSS animation for border-only pulsing
                if (!document.getElementById('success-pulse-animation')) {
                    const style = document.createElement('style');
                    style.id = 'success-pulse-animation';
                    style.textContent = `
                        @keyframes successPulse {
                            0%, 100% { 
                                border-color: #48bb78;
                                box-shadow: 0 0 15px rgba(72, 187, 120, 0.3);
                            }
                            50% { 
                                border-color: #68d391;
                                box-shadow: 0 0 30px rgba(72, 187, 120, 0.6);
                            }
                        }
                    `;
                    document.head.appendChild(style);
                }
                
                // Console celebration
                console.log('🎉 ===== OPTIMIZATION COMPLETED! =====');
                console.log('✅ Check the Best Configuration Found section above!');
                
            } else {
                // Reset best config display animation
                if (bestConfigDisplay) {
                    bestConfigDisplay.style.border = '1px solid #2d3748';
                    bestConfigDisplay.style.animation = 'none';
                    bestConfigDisplay.style.boxShadow = 'none';
                    bestConfigDisplay.style.transform = 'none';
                }
                
                // Reset best config header to idle state
                updateBestConfigHeader('idle');
                
                // Hide the Apply/Copy config buttons
                const resultButtons = document.getElementById('optimization-result-buttons');
                if (resultButtons) {
                    resultButtons.style.display = 'none';
                }
            }
        }
    }

    function updateProgress(message, progress, bestScore, testCount, totalTokens, startTime) {
        // Log progress to console only
        if (startTime) {
            const runtime = Math.floor((Date.now() - startTime) / 1000);
            console.log(`📊 ${message} | Progress: ${(progress || 0).toFixed(1)}% | Best: ${bestScore}% | Tests: ${testCount} | Tokens: ${totalTokens} | Runtime: ${runtime}s`);
        } else {
            console.log(`📊 ${message}`);
        }
    }

    // ========================================
    // 🔍 SIGNAL ANALYSIS TAB (External Script)
    // ========================================
    
    // ========================================
    // 🔄 UI COLLAPSE/EXPAND FUNCTIONS
    // ========================================
    function collapseUI() {
        const mainUI = document.getElementById('ag-copilot-enhanced-ui');
        const collapsedUI = document.getElementById('ag-copilot-collapsed-ui');
        const body = document.body;
        
        if (mainUI && collapsedUI) {
            // Hide the main panel
            mainUI.style.display = 'none';

            // Restore the page width so we don't leave an empty white strip
            if (body && body.dataset) {
                body.style.marginRight = body.dataset.originalMargin || '0px';
                body.style.width = body.dataset.originalWidth || 'auto';
                body.style.maxWidth = body.dataset.originalMaxWidth || 'none';
                body.style.overflowX = body.dataset.originalOverflowX || 'visible';
            }

            // Mark split-screen mode as off so expandUI reapplies it cleanly
            if (typeof isSplitScreenMode !== 'undefined') {
                isSplitScreenMode = false;
            }

            // Show the compact collapsed launcher
            collapsedUI.style.display = 'flex';
        }
    }
    
    function expandUI() {
        const mainUI = document.getElementById('ag-copilot-enhanced-ui');
        const collapsedUI = document.getElementById('ag-copilot-collapsed-ui');
        
        if (mainUI && collapsedUI) {
            collapsedUI.style.display = 'none';
            
            // Restore the original UI display properties
            mainUI.style.display = 'flex';
            mainUI.style.flexDirection = 'column';
            mainUI.style.overflow = 'hidden';
            mainUI.style.maxHeight = '90vh';
            
            // Always enable split-screen mode when expanding
            setTimeout(() => {
                enableSplitScreen();
            }, 100);
        }
    }

    // ========================================
    // 🎯 META FINDER TAB HANDLER  
    // ========================================
    
    // Load tabs with loading state management
    let optimizationLoaded = false;
    let dataSyncLoaded = false;
    let metaFinderLoaded = false;
    let sessionsLoaded = false;

    // ========================================
    // 🌍 SESSIONS ANALYSIS TAB
    // ========================================
    async function loadSessionsInTab() {
        console.log('🔄 loadSessionsInTab called...');
        
        // Don't reload if already loaded
        if (sessionsLoaded) {
            console.log('⏭️ Sessions already loaded, skipping');
            return;
        }
        
        const tabContent = document.getElementById('sessions-container');
        console.log('📦 Found sessions-container:', !!tabContent);
        
        try {
            // Show loading state
            if (tabContent) {
                tabContent.innerHTML = `
                    <div style="
                        text-align: center; 
                        padding: 40px 20px;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        min-height: 200px;
                    ">
                        <div style="font-size: 32px; margin-bottom: 12px;">🔄</div>
                        <div style="color: #a0aec0; font-size: 14px; margin-bottom: 8px;">Loading Session Analysis...</div>
                        <div style="color: #718096; font-size: 11px;">Fetching from GitHub</div>
                    </div>
                `;
            }
            
            // Load AGSessionAnalysis.js from GitHub (using fetch+eval pattern like other modules)
            if (!window.AGSessionAnalysis) {
                const scriptUrl = 'https://raw.githubusercontent.com/jumprCrypto/AGCopilot/refs/heads/main/AGSessionAnalysis.js';
                console.log('📥 Loading AGSessionAnalysis from:', scriptUrl);
                
                const response = await fetch(scriptUrl);
                if (!response.ok) {
                    throw new Error(`Failed to load Session Analysis: HTTP ${response.status}`);
                }
                const scriptContent = await response.text();
                eval(scriptContent);
                
                // Wait a moment for the script to initialize
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Render the Sessions UI using the loaded module
            if (window.AGSessionAnalysis && window.AGSessionAnalysis.renderSessionsUI) {
                await window.AGSessionAnalysis.renderSessionsUI(tabContent);
            } else {
                throw new Error('AGSessionAnalysis module not loaded properly');
            }
            
            sessionsLoaded = true;
            console.log('✅ Sessions loaded successfully in tab!');
            
        } catch (error) {
            console.error('❌ Sessions loading error:', error);
            
            // Show error state in tab
            if (tabContent) {
                tabContent.innerHTML = `
                    <div style="
                        text-align: center; 
                        padding: 40px 20px;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        min-height: 200px;
                    ">
                        <div style="font-size: 32px; margin-bottom: 12px;">❌</div>
                        <div style="color: #ff6b6b; font-size: 16px; font-weight: 600; margin-bottom: 8px;">Failed to Load Sessions</div>
                        <div style="color: #a0aec0; font-size: 12px; margin-bottom: 16px; text-align: center;">${error.message}</div>
                        <button onclick="sessionsLoaded = false; loadSessionsInTab();" style="
                            padding: 8px 16px;
                            background: rgba(66, 153, 225, 0.2);
                            border: 1px solid rgba(66, 153, 225, 0.4);
                            border-radius: 6px;
                            color: #4299e1;
                            cursor: pointer;
                            font-size: 12px;
                            font-weight: 600;
                            transition: all 0.2s;
                        " onmouseover="this.style.background='rgba(66, 153, 225, 0.3)'" 
                           onmouseout="this.style.background='rgba(66, 153, 225, 0.2)'">
                            🔄 Retry Loading
                        </button>
                    </div>
                `;
            }
        }
    }

    async function loadDataSyncInTab() {
        console.log('🔄 loadDataSyncInTab called...');
        
        // Don't reload if already loaded
        if (dataSyncLoaded) {
            console.log('⏭️ Data Sync already loaded, skipping');
            return;
        }
        
        const tabContent = document.getElementById('data-sync-container');
        console.log('📦 Found data-sync-container:', !!tabContent);
        
        try {
            // Show loading state
            if (tabContent) {
                tabContent.innerHTML = `
                    <div style="
                        text-align: center; 
                        padding: 40px 20px;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        min-height: 200px;
                    ">
                        <div style="font-size: 32px; margin-bottom: 12px;">🔄</div>
                        <div style="color: #a0aec0; font-size: 14px; margin-bottom: 8px;">Loading Data Sync...</div>
                        <div style="color: #718096; font-size: 11px;">Fetching from GitHub</div>
                    </div>
                `;
            }
            
            console.log('🌐 Fetching AGDataSync.js from GitHub...');
            
            // Load Data Sync script from GitHub
            const scriptUrl = 'https://raw.githubusercontent.com/jumprCrypto/AGCopilot/refs/heads/main/AGDataSync.js';
            const response = await fetch(scriptUrl);
            
            if (!response.ok) {
                throw new Error(`Failed to load Data Sync: HTTP ${response.status}`);
            }
            
            const scriptContent = await response.text();
            console.log(`📜 Loaded ${scriptContent.length} characters from GitHub`);
            
            // Execute the script - it will automatically detect tab integration
            console.log('⚙️ Executing AGDataSync.js...');
            eval(scriptContent);
            
            dataSyncLoaded = true;
            console.log('✅ Data Sync loaded successfully in tab!');
            
        } catch (error) {
            console.error('❌ Data Sync loading error:', error);
            
            // Show error state in tab
            if (tabContent) {
                tabContent.innerHTML = `
                    <div style="
                        text-align: center; 
                        padding: 40px 20px;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        min-height: 200px;
                    ">
                        <div style="font-size: 32px; margin-bottom: 12px;">❌</div>
                        <div style="color: #ff6b6b; font-size: 16px; font-weight: 600; margin-bottom: 8px;">Failed to Load Data Sync</div>
                        <div style="color: #a0aec0; font-size: 12px; margin-bottom: 16px; text-align: center;">${error.message}</div>
                        <button onclick="window.retryLoadDataSync()" style="
                            padding: 8px 16px;
                            background: rgba(66, 153, 225, 0.2);
                            border: 1px solid rgba(66, 153, 225, 0.4);
                            border-radius: 6px;
                            color: #4299e1;
                            cursor: pointer;
                            font-size: 12px;
                            font-weight: 600;
                            transition: all 0.2s;
                        " onmouseover="this.style.background='rgba(66, 153, 225, 0.3)'" 
                           onmouseout="this.style.background='rgba(66, 153, 225, 0.2)'">
                            🔄 Retry Loading
                        </button>
                    </div>
                `;
            }
        }
    }

    async function loadOptimizationInTab() {
        console.log('🔄 loadOptimizationInTab called...');
        
        // Don't reload if already loaded
        if (optimizationLoaded) {
            console.log('⏭️ Optimization already loaded, skipping');
            return;
        }
        
        const tabContent = document.getElementById('optimization-ui-container');
        console.log('📦 Found optimization-ui-container:', !!tabContent);
        
        try {
            // Show loading state if not already shown
            if (tabContent) {
                tabContent.innerHTML = `
                    <div style="
                        text-align: center; 
                        padding: 40px 20px;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        min-height: 200px;
                    ">
                        <div style="font-size: 32px; margin-bottom: 12px;">🔄</div>
                        <div style="color: #a0aec0; font-size: 14px; margin-bottom: 8px;">Loading Optimization Engine...</div>
                        <div style="color: #718096; font-size: 11px;">Fetching from GitHub</div>
                    </div>
                `;
            }
            
            console.log('🌐 Fetching AGOptimization.js from GitHub...');
            
            // Load Optimization script from GitHub
            const scriptUrl = 'https://raw.githubusercontent.com/jumprCrypto/AGCopilot/refs/heads/main/AGOptimization.js';
            const response = await fetch(scriptUrl);
            
            if (!response.ok) {
                throw new Error(`Failed to load Optimization Engine: HTTP ${response.status}`);
            }
            
            const scriptContent = await response.text();
            console.log(`📜 Loaded ${scriptContent.length} characters from GitHub`);
            
            // Execute the script - it will automatically detect tab integration
            console.log('⚙️ Executing AGOptimization.js...');
            eval(scriptContent);
            
            optimizationLoaded = true;
            console.log('✅ Optimization Engine loaded successfully in tab!');
            
        } catch (error) {
            console.error('❌ Optimization Engine loading error:', error);
            
            // Show error state in tab
            if (tabContent) {
                tabContent.innerHTML = `
                    <div style="
                        text-align: center; 
                        padding: 40px 20px;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        min-height: 200px;
                    ">
                        <div style="font-size: 32px; margin-bottom: 12px;">❌</div>
                        <div style="color: #ff6b6b; font-size: 16px; font-weight: 600; margin-bottom: 8px;">Failed to Load Optimization Engine</div>
                        <div style="color: #a0aec0; font-size: 12px; margin-bottom: 16px; text-align: center;">${error.message}</div>
                        <button onclick="window.retryLoadOptimization()" style="
                            padding: 8px 16px;
                            background: rgba(139, 92, 246, 0.2);
                            border: 1px solid rgba(139, 92, 246, 0.4);
                            border-radius: 6px;
                            color: #a78bfa;
                            cursor: pointer;
                            font-size: 12px;
                            font-weight: 600;
                            transition: all 0.2s;
                        " onmouseover="this.style.background='rgba(139, 92, 246, 0.3)'" 
                           onmouseout="this.style.background='rgba(139, 92, 246, 0.2)'">
                            🔄 Retry Loading
                        </button>
                    </div>
                `;
            }
        }
    }
    
    // Offline backtester removed - now using local backtester API directly
    
    async function loadMetaFinderInTab() {
        // Don't reload if already loaded
        if (metaFinderLoaded) {
            return;
        }
        
        const tabContent = document.getElementById('meta-finder-tab');
        const loadingDiv = document.getElementById('meta-finder-loading');
        
        try {
            // Show loading state if not already shown
            if (loadingDiv) {
                loadingDiv.innerHTML = `
                    <div style="font-size: 32px; margin-bottom: 12px;">🔄</div>
                    <div style="color: #a0aec0; font-size: 14px; margin-bottom: 8px;">Loading Meta Finder...</div>
                    <div style="color: #718096; font-size: 11px;">Fetching from GitHub</div>
                `;
            }
            
            // Load Meta Finder script from GitHub
            const scriptUrl = 'https://raw.githubusercontent.com/jumprCrypto/AGCopilot/refs/heads/main/AGMetaFinder.js';
            const response = await fetch(scriptUrl);
            
            if (!response.ok) {
                throw new Error(`Failed to load Meta Finder: HTTP ${response.status}`);
            }
            
            const scriptContent = await response.text();
            
            // Execute the script - it will automatically detect tab integration
            eval(scriptContent);
            
            metaFinderLoaded = true;
            console.log('✅ Meta Finder loaded successfully in tab!');
            
        } catch (error) {
            console.error('Meta Finder loading error:', error);
            
            // Show error state in tab
            if (tabContent) {
                tabContent.innerHTML = `
                    <div style="
                        text-align: center; 
                        padding: 40px 20px;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        min-height: 200px;
                    ">
                        <div style="font-size: 32px; margin-bottom: 12px;">❌</div>
                        <div style="color: #ff6b6b; font-size: 16px; font-weight: 600; margin-bottom: 8px;">Failed to Load Meta Finder</div>
                        <div style="color: #a0aec0; font-size: 12px; margin-bottom: 16px; text-align: center;">${error.message}</div>
                        <button onclick="window.retryLoadMetaFinder()" style="
                            padding: 8px 16px;
                            background: rgba(139, 92, 246, 0.2);
                            border: 1px solid rgba(139, 92, 246, 0.4);
                            border-radius: 6px;
                            color: #a78bfa;
                            cursor: pointer;
                            font-size: 12px;
                            font-weight: 600;
                            transition: all 0.2s;
                        " onmouseover="this.style.background='rgba(139, 92, 246, 0.3)'" 
                           onmouseout="this.style.background='rgba(139, 92, 246, 0.2)'">
                            🔄 Retry Loading
                        </button>
                    </div>
                `;
            }
        }
    }
    
    // Global retry function for error recovery
    window.retryLoadMetaFinder = function() {
        metaFinderLoaded = false;
        const tabContent = document.getElementById('meta-finder-tab');
        if (tabContent) {
            tabContent.innerHTML = `
                <div id="meta-finder-loading" style="
                    text-align: center; 
                    padding: 40px 20px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    min-height: 200px;
                ">
                    <div style="font-size: 32px; margin-bottom: 12px;">🔄</div>
                    <div style="color: #a0aec0; font-size: 14px; margin-bottom: 8px;">Retrying Meta Finder...</div>
                    <div style="color: #718096; font-size: 11px;">Fetching from GitHub</div>
                </div>
            `;
        }
        loadMetaFinderInTab();
    };

    // Global retry function for Optimization Engine error recovery
    window.retryLoadOptimization = function() {
        optimizationLoaded = false;
        const tabContent = document.getElementById('optimization-tab');
        if (tabContent) {
            tabContent.innerHTML = `
                <div style="
                    text-align: center; 
                    padding: 40px 20px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    min-height: 200px;
                ">
                    <div style="font-size: 32px; margin-bottom: 12px;">🔄</div>
                    <div style="color: #a0aec0; font-size: 14px; margin-bottom: 8px;">Retrying Optimization Engine...</div>
                    <div style="color: #718096; font-size: 11px;">Fetching from GitHub</div>
                </div>
            `;
        }
        loadOptimizationInTab();
    };

    window.retryLoadDataSync = function() {
        dataSyncLoaded = false;
        const tabContent = document.getElementById('data-sync-container');
        if (tabContent) {
            tabContent.innerHTML = `
                <div style="
                    text-align: center; 
                    padding: 40px 20px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    min-height: 200px;
                ">
                    <div style="font-size: 32px; margin-bottom: 12px;">🔄</div>
                    <div style="color: #a0aec0; font-size: 14px; margin-bottom: 8px;">Retrying Data Sync...</div>
                    <div style="color: #718096; font-size: 11px;">Fetching from GitHub</div>
                </div>
            `;
        }
        loadDataSyncInTab();
    };

    // ========================================
    // �🎮 EVENT HANDLERS
    // ========================================
    function setupEventHandlers() {
        // Helper function to safely add event listener
        const safeAddEventListener = (elementId, event, handler) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.addEventListener(event, handler);
            } else {
                console.warn(`⚠️ Element with ID '${elementId}' not found, skipping event listener`);
            }
        };

        // Auto-apply preset when selected (with robust error handling)
        safeAddEventListener('preset-dropdown', 'change', async () => {
            const dropdown = document.getElementById('preset-dropdown');
            if (!dropdown) return;
            const selectedPreset = dropdown.value;
            if (!selectedPreset) return;
            console.log(`📦 Applying preset: ${selectedPreset}...`);
            try {
                await applyPreset(selectedPreset);
                // Only clear AFTER successful application so user can re-select quickly; keep if want persistent selection
                dropdown.value = '';
                console.log(`✅ Preset ${selectedPreset} applied`);
            } catch (err) {
                console.error(`❌ Failed applying preset ${selectedPreset}:`, err);
            }
        });

        // Chain run count handler
        safeAddEventListener('chain-run-count', 'change', (e) => {
            CONFIG.CHAIN_RUN_COUNT = parseInt(e.target.value) || 3;
        });

        // Win rate configuration handlers
        safeAddEventListener('min-win-rate-small', 'change', (e) => {
            CONFIG.MIN_WIN_RATE = parseFloat(e.target.value) || 35;
            console.log(`🎯 Small sample win rate updated: ${CONFIG.MIN_WIN_RATE}%`);
        });

        safeAddEventListener('min-win-rate-medium', 'change', (e) => {
            CONFIG.MIN_WIN_RATE_MEDIUM_SAMPLE = parseFloat(e.target.value) || 33;
            console.log(`🎯 Medium sample win rate updated: ${CONFIG.MIN_WIN_RATE_MEDIUM_SAMPLE}%`);
        });

        safeAddEventListener('min-win-rate-large', 'change', (e) => {
            CONFIG.MIN_WIN_RATE_LARGE_SAMPLE = parseFloat(e.target.value) || 30;
            console.log(`🎯 Large sample win rate updated: ${CONFIG.MIN_WIN_RATE_LARGE_SAMPLE}%`);
        });

        safeAddEventListener('apply-generated-config-btn', 'click', async () => {
            if (window.lastGeneratedConfig) {
                await applyConfigToBacktester(window.lastGeneratedConfig);
                updateStatus('✅ Generated config applied to backtester!');
            }
        });
        
        safeAddEventListener('optimize-generated-config-btn', 'click', async () => {
            if (window.lastGeneratedConfig) {
                await applyConfigToBacktester(window.lastGeneratedConfig);
                updateStatus('⚙️ Generated config applied, starting optimization...');
                // Small delay to let the config apply - with stop check
                if (!window.STOPPED) {
                    await sleep(1000);
                    // Trigger optimization with current settings
                    const startBtn = document.getElementById('start-optimization');
                    if (startBtn) startBtn.click();
                }
            }
        });
        
        safeAddEventListener('copy-config-btn', 'click', async () => {
            if (window.lastGeneratedConfig) {
                const formattedConfig = formatConfigForDisplay(window.lastGeneratedConfig);
                try {
                    await navigator.clipboard.writeText(formattedConfig);
                    updateStatus('📋 Config copied to clipboard!');
                } catch (error) {
                    console.error('Failed to copy to clipboard:', error);
                    // Fallback: log to console
                    console.log('\n🎯 GENERATED CONFIG (clipboard copy failed):\n', formattedConfig);
                    updateStatus('📋 Config logged to console (clipboard failed)');
                }
            }
        });
        
        // Collapse button
        safeAddEventListener('collapse-ui-btn', 'click', () => {
            collapseUI();
        });

        // Close button (red X)
        safeAddEventListener('close-ui-btn', 'click', () => {
            // Ensure any running optimization is stopped before closing
            try {
                if (window.STOPPED === false) {
                    window.STOPPED = true;
                    console.log('⏹️ Optimization stop requested via close button');
                }
                if (window.optimizationTracker && window.optimizationTracker.isRunning) {
                    window.optimizationTracker.stopOptimization();
                    console.log('🧹 Optimization tracker stopped via close button');
                }
            } catch (e) {
                console.warn('Close button stop sequence issue:', e);
            }
            // Clean up split-screen mode if active
            if (typeof cleanupSplitScreen === 'function') {
                cleanupSplitScreen();
            }
            
            // Remove both main and collapsed UI
            const mainUI = document.getElementById('ag-copilot-enhanced-ui');
            const collapsedUI = document.getElementById('ag-copilot-collapsed-ui');
            if (mainUI) mainUI.remove();
            if (collapsedUI) collapsedUI.remove();
            
            console.log('🚫 AG Copilot closed');
        });
    }

    // Apply generated config to backtester UI using correct field mappings
    async function applyConfigToBacktester(config) {
        console.log('applyConfigToBacktester received config:', config);
        let appliedFields = 0;
        let totalFields = 0;
        const results = [];        

        invalidateSelectionCache();
        
        // Helper function to track field setting (without section opening)
        const trackField = async (fieldName, value) => {
            totalFields++;
            try {
                const success = await setFieldValue(fieldName, value);
                if (success) {
                    appliedFields++;
                    results.push(`✅ ${fieldName}: ${value}`);
                    return true;
                } else {
                    results.push(`❌ ${fieldName}: ${value} (field not found)`);
                    return false;
                }
            } catch (error) {
                results.push(`❌ ${fieldName}: ${value} (error: ${error.message})`);
                return false;
            }
        };
        
        // Helper function to open section and apply fields
        const applyFieldsToSection = async (sectionName, fieldsToApply) => {
            try {
                const sectionOpened = await openSection(sectionName);
                if (!sectionOpened) {
                    results.push(`❌ Could not open ${sectionName} section`);
                    return false;
                }
                
                await sleep(200); // Wait for section to open
                
                // Apply all fields for this section
                for (const [fieldName, value] of fieldsToApply) {
                    if (value !== undefined && value !== null) {
                        await trackField(fieldName, value);
                        await sleep(50); // Small delay between field updates
                    }
                }
                
                return true;
            } catch (error) {
                results.push(`❌ Error with ${sectionName} section: ${error.message}`);
                return false;
            }
        };        
    
        const boolToToggleValue = (val) => {
            if (val === null) return "Don't care";
            return val ? "Yes" : "Don't care";
        };
        
        // Basic Section Fields
        await applyFieldsToSection('Basic', [
            ['Min MCAP (USD)', config['Min MCAP (USD)']],
            ['Max MCAP (USD)', config['Max MCAP (USD)']],
            ['Min Liquidity (USD)', config['Min Liquidity (USD)']],
            ['Max Liquidity (USD)', config['Max Liquidity (USD)']]
        ]);
        
        // Token Details Section Fields  
        await applyFieldsToSection('Token Details', [
            ['Min AG Score', config['Min AG Score']],
            ['Min Token Age (sec)', config['Min Token Age (sec)']],
            ['Max Token Age (sec)', config['Max Token Age (sec)']],
            ['Min Deployer Age (min)', config['Min Deployer Age (min)']]
        ]);
        
        // Wallets Section Fields
        await applyFieldsToSection('Wallets', [
            ['Min Unique Wallets', config['Min Unique Wallets']],
            ['Max Unique Wallets', config['Max Unique Wallets']],
            ['Min KYC Wallets', config['Min KYC Wallets']],
            ['Max KYC Wallets', config['Max KYC Wallets']],
            ['Min Holders', config['Min Holders']],
            ['Max Holders', config['Max Holders']]
        ]);
        
        // Risk Section Fields (including booleans)
        const riskFields = [
            ['Min Bundled %', config['Min Bundled %']],
            ['Max Bundled %', config['Max Bundled %']],
            ['Min Deployer Balance (SOL)', config['Min Deployer Balance (SOL)']],
            ['Min Buy Ratio %', config['Min Buy Ratio %']],
            ['Max Buy Ratio %', config['Max Buy Ratio %']],
            ['Min Vol MCAP %', config['Min Vol MCAP %']],
            ['Max Vol MCAP %', config['Max Vol MCAP %']],
            ['Max Drained %', config['Max Drained %']]
        ];
        
        // Add boolean fields if they have values (check for true/false, not just non-null)
        if (config['Fresh Deployer'] !== null && config['Fresh Deployer'] !== undefined) {
            riskFields.push(['Fresh Deployer', boolToToggleValue(config['Fresh Deployer'])]);
        }
        if (config['Description'] !== null && config['Description'] !== undefined) {
            riskFields.push(['Description', boolToToggleValue(config['Description'])]);
        }
        if (config['Skip If No KYC/CEX Funding'] !== null && config['Skip If No KYC/CEX Funding'] !== undefined) {
            riskFields.push(['Skip If No KYC/CEX Funding', boolToToggleValue(config['Skip If No KYC/CEX Funding'])]);
        }
       
        await applyFieldsToSection('Risk', riskFields);

        const advancedFields = [
            ['Max Liquidity %', config['Max Liquidity %']],
            // ['Min TTC (sec)', config['Min TTC (sec)']],
            // ['Max TTC (sec)', config['Max TTC (sec)']],
            ['Min Win Pred %', config['Min Win Pred %']]
            ];

        if (config['Has Buy Signal'] !== null && config['Has Buy Signal'] !== undefined) {
            advancedFields.push(['Has Buy Signal', boolToToggleValue(config['Has Buy Signal'])]);
        }
        // Advanced Section Fields
        await applyFieldsToSection('Advanced', advancedFields);
        
        const appliedResults = {
            success: appliedFields > 0,
            appliedFields,
            totalFields,
            successRate: totalFields > 0 ? ((appliedFields / totalFields) * 100).toFixed(1) : 0,
            results
        };
        
        // Log detailed application results
        console.log(`🔍 Config application results:`, appliedResults);
        results.forEach(result => console.log(result));
        
        return appliedResults;
    }

    // ========================================
    // 🌍 GLOBAL EXPORTS FOR EXTERNAL SCRIPTS
    // ========================================
    // Export functions needed by external modules (Meta Finder, Signal Analysis, etc.)
    // These must be available before external scripts load
    // NOTE: Many utility functions are already exported where they're defined:
    //   - deepClone, formatTimestamp, formatMcap, formatPercent (near top of file)
    //   - removeOutliers (after outlier detection functions)
    //   - formatConfigForDisplay (after config formatting function)
    //   - ensureCompleteConfig (after config template)
    
    window.getCurrentConfiguration = getCurrentConfiguration;
    window.getCurrentConfigFromUI = getCurrentConfigFromUI;
    window.calculateRobustScore = calculateRobustScore;
    window.getScaledTokenThresholds = getScaledTokenThresholds;
    window.generateTestValuesFromRules = generateTestValuesFromRules;
    window.applyConfigToUI = applyConfigToUI;
    window.applyConfigToBacktester = applyConfigToBacktester;
    window.showPinSettingsDialog = showPinSettingsDialog;
    window.updateResultsWithPinnedSettings = updateResultsWithPinnedSettings;
    window.getTriggerMode = getTriggerMode;
    window.getSelectedSources = getSelectedSources;
    window.getTimeParameters = getTimeParameters;
    window.setTimeParameters = setTimeParameters;
    window.updateStatus = updateStatus;
    
    // Tab loader functions (called by switchTab)
    window.loadSessionsInTab = loadSessionsInTab;
    window.loadDataSyncInTab = loadDataSyncInTab;
    window.loadOptimizationInTab = loadOptimizationInTab;
    window.loadMetaFinderInTab = loadMetaFinderInTab;
    
    console.log('✅ Global functions exported for external scripts');


    // ========================================
    // �🎬 INITIALIZATION
    // ========================================
    console.log('🔧 Initializing AG Copilot Enhanced + Signal Analysis...');
    
    // Create and setup UI
    try {
        const ui = createUI();
        console.log('✅ UI created successfully');
        
        setupEventHandlers();
        console.log('✅ Event handlers setup completed');
        
        // Load optimization module immediately since config-tab is the default active tab
        setTimeout(() => {
            loadOptimizationInTab();
        }, 100);
        
        // Make functions globally available for onclick handlers
        window.applyBestConfigToUI = async function() {
            const tracker = window.bestConfigTracker;
            if (tracker && tracker.config) {
                console.log(`⚙️ Applying best configuration (ID: ${String(tracker.id).substring(0, 8)}) to UI...`);
                const success = await applyConfigToUI(tracker.config, true);
                if (success) {
                    console.log('✅ Best configuration applied to backtester UI');
                } else {
                    console.log('❌ Failed to apply best configuration to UI');
                }
            } else {
                console.log('❌ No best configuration available to apply');
            }
        };
        
        window.copyBestConfigToClipboard = function() {
            const tracker = window.bestConfigTracker;
            if (tracker && tracker.config) {
                // Create formatted config with section comments
                const config = tracker.config;
                
                // Build formatted output with section organization
                const sections = {
                    'Basic': ['Min MCAP (USD)', 'Max MCAP (USD)', 'Min Market Depth', 'Max Market Depth'],
                    'Token Details': ['Min AG Score', 'Min Token Age (sec)', 'Max Token Age (sec)', 'Min Deployer Age (min)'],
                    'Wallets': ['Min Unique Wallets', 'Max Unique Wallets', 'Min KYC Wallets', 'Max KYC Wallets', 'Min Dormant Wallets', 'Max Dormant Wallets', 'Min Holders', 'Max Holders', 'Min Top Holders %', 'Max Top Holders %', 'Min Convinced Wallets'],
                    'Risk': ['Min Bundled %', 'Max Bundled %', 'Min Deployer Balance (SOL)', 'Max Deployer Balance (SOL)', 'Min Buy Ratio %', 'Max Buy Ratio %', 'Min Vol MCAP %', 'Max Vol MCAP %', 'Max Drained %', 'Max Drained Count', 'Description', 'Fresh Deployer', 'Skip If No KYC/CEX Funding'],
                    'Advanced': [/* 'Min TTC (sec)', 'Max TTC (sec)', */ 'Max Liquidity %', 'Min Win Pred %', 'Has Buy Signal'],
                    'Time': ['Start Hour', 'Start Minute', 'End Hour', 'End Minute']
                };
                
                // Create organized config with only non-empty sections
                const organizedConfig = {};
                const sectionKeys = {
                    'Basic': 'basic',
                    'Token Details': 'tokenDetails',
                    'Wallets': 'wallets',
                    'Risk': 'risk',
                    'Advanced': 'advanced',
                    'Time': 'time'
                };
                
                // Add sections that have values
                Object.entries(sectionKeys).forEach(([displayName, key]) => {
                    if (config[key] && Object.keys(config[key]).length > 0) {
                        organizedConfig[key] = config[key];
                    }
                });
                
                // Add other properties (sources, weekdays, takeProfits, etc.)
                if (config.sources) organizedConfig.sources = config.sources;
                if (config.weekdays) organizedConfig.weekdays = config.weekdays;
                if (config.takeProfits) organizedConfig.takeProfits = config.takeProfits;
                if (config.tpSettings) organizedConfig.tpSettings = config.tpSettings;
                if (config.dateRange) organizedConfig.dateRange = config.dateRange;
                if (config.buyingAmount) organizedConfig.buyingAmount = config.buyingAmount;
                
                const configText = JSON.stringify(organizedConfig, null, 2);
                
                // Add metadata comment at the top
                const metadataComment = 
                    `// Best configuration (ID: ${String(tracker.id).substring(0, 8)})\n` + 
                    `// Score: ${tracker.score.toFixed(1)}% | Source: ${tracker.source}\n` + 
                    `// Generated: ${new Date(tracker.id).toLocaleString()}\n` +
                    `// Sections: ${Object.keys(organizedConfig).filter(k => !['sources', 'weekdays', 'takeProfits', 'tpSettings', 'dateRange', 'buyingAmount'].includes(k)).join(', ')}\n\n`;
                
                navigator.clipboard.writeText(metadataComment + configText).then(() => {
                    console.log('📋 Best configuration copied to clipboard with metadata and organized sections');
                }).catch(err => {
                    console.error('Failed to copy to clipboard:', err);
                });
            } else {
                console.log('❌ No best configuration available to copy');
            }
        };
        
        // Make other functions globally available
        window.toggleSplitScreen = toggleSplitScreen;
        window.enableSplitScreen = enableSplitScreen;
        window.disableSplitScreen = disableSplitScreen;
        
        // Make CONFIG globally accessible for debugging/testing
        window.CONFIG = CONFIG;
        
        // 🚀 OPTIMIZATION: Add global cache debug function
        window.checkCacheStatus = function() {
            const cache = window.globalConfigCache;
            const cacheEnabled = CONFIG.USE_CONFIG_CACHING && cache;
            const metrics = cache ? cache.getMetrics() : null;
            
            console.log('\n%c💾 CACHE STATUS DEBUG', 'color: #00aaff; font-size: 14px; font-weight: bold;');
            console.log(`Cache object exists: ${cache ? '✅ Yes' : '❌ No'}`);
            console.log(`CONFIG.USE_CONFIG_CACHING: ${CONFIG.USE_CONFIG_CACHING ? '✅ Enabled' : '❌ Disabled'}`);
            console.log(`Cache enabled: ${cacheEnabled ? '✅ Yes' : '❌ No'}`);
            if (metrics) {
                console.log(`Cache metrics:`, metrics);
                console.log(`Performance: ${cache.getPerformanceSummary()}`);
            }
            
            return { cache, cacheEnabled, metrics };
        };
        
        console.log('%c💡 TIP: Run window.checkCacheStatus() in console to debug cache issues', 'color: #ffaa00; font-style: italic;');
        
        // Auto-enable split-screen mode by default (after a short delay to ensure DOM is ready)
        setTimeout(() => {
            if (window.innerWidth >= 1200) {
                console.log('🖥️ Auto-enabling split-screen mode (default behavior)');
                enableSplitScreen();
            } else {
                console.log('🖥️ Screen too narrow for auto-enabling split-screen mode, keeping floating mode');
            }
        }, 100);
        
        // 🚀 CACHE OPTIMIZATION SUMMARY
        console.log('\n%c🚀 CACHE OPTIMIZATION ENABLED', 'color: #00ff88; font-size: 14px; font-weight: bold;');
        console.log('%c✅ Cache hits now bypass rate limiting entirely', 'color: #00ff88; font-weight: bold;');
        console.log('%c✅ Enhanced cache metrics and performance tracking', 'color: #00ff88; font-weight: bold;');
        console.log('%c✅ Real-time cache performance shown in optimization display', 'color: #00ff88; font-weight: bold;');
        console.log('%c📈 Expected performance improvement: Significantly faster optimization with fewer API calls!', 'color: #ffaa00; font-weight: bold;');
        
        return ui;
    } catch (error) {
        console.error('❌ Initialization error:', error);
        throw error;
    }  
})();
