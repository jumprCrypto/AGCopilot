(async function () {
    console.clear();
    console.log('%c🤖 AG Co-Pilot - Advanced Optimizer v2.0 🤖', 'color: blue; font-size: 16px; font-weight: bold;');
    console.log('%c🚀 Features: Config Caching | Parameter Impact Analysis | Genetic Algorithm | Simulated Annealing | Adaptive Steps | Latin Hypercube Sampling', 'color: green; font-size: 12px;');

    // ========================================
    // 🎯 CONFIGURATION
    // ========================================
    // Complete config template for proper initialization
    const COMPLETE_CONFIG_TEMPLATE = {
        basic: {
            "Min MCAP (USD)": undefined,
            "Max MCAP (USD)": undefined
        },
        tokenDetails: {
            "Min Deployer Age (min)": undefined,
            "Max Token Age (min)": undefined,
            "Min AG Score": undefined
        },
        wallets: {
            "Min Unique Wallets": undefined,
            "Min KYC Wallets": undefined,
            "Max KYC Wallets": undefined,
            "Max Unique Wallets": undefined
        },
        risk: {
            "Min Bundled %": undefined,
            "Max Bundled %": undefined,
            "Min Deployer Balance (SOL)": undefined,
            "Min Buy Ratio %": undefined,
            "Max Buy Ratio %": undefined,
            "Min Vol MCAP %": undefined,
            "Max Vol MCAP %": undefined,
            "Max Drained %": undefined,
            "Max Drained Count": undefined,
            "Description": undefined,
            "Fresh Deployer": undefined
        },
        advanced: {
            "Min TTC (sec)": undefined,
            "Max TTC (sec)": undefined,
            "Max Liquidity %": undefined,
            "Min Win Pred %": undefined
        }
    };

    const CONFIG = {
        // Current baseline - easily switchable (using current config as baseline)
        BASELINE: {
            // Will be populated from current UI state or use empty config
            //     basic: {
            //     "Min MCAP (USD)": undefined,
            //     "Max MCAP (USD)": undefined
            // },
            // tokenDetails: {
            //     "Min Deployer Age (min)": undefined,
            //     "Max Token Age (min)": undefined,
            //     "Min AG Score": undefined
            // },
            // wallets: {
            //     "Min Unique Wallets": undefined,
            //     "Min KYC Wallets": undefined,
            //     "Max KYC Wallets": undefined,
            //     "Max Unique Wallets": undefined
            // },
            // risk: {
            //     "Min Bundled %": undefined,
            //     "Max Bundled %": undefined,
            //     "Min Deployer Balance (SOL)": undefined,
            //     "Min Buy Ratio %": undefined,
            //     "Max Buy Ratio %": undefined,
            //     "Min Vol MCAP %": undefined,
            //     "Max Vol MCAP %": undefined,
            //     "Max Drained %": undefined,
            //     "Max Drained Count": undefined,
            //     "Description": undefined,
            //     "Fresh Deployer": undefined
            // },
            // advanced: {
            //     "Min TTC (sec)": undefined,
            //     "Max TTC (sec)": undefined,
            //     "Max Liquidity %": undefined,
            //     "Min Win Pred %": undefined
            // }
        },

        // Alternative baselines for quick switching
        PRESETS: {
            // You can add your presets here
            WIP: {
                basic: { "Min MCAP (USD)": 4999, "Max MCAP (USD)": 29999 },
                tokenDetails: { "Min AG Score": 3 },
                wallets: { "Min Unique Wallets": 3, "Min KYC Wallets": 2, "Max Unique Wallets": 3 },
                risk: { "Min Bundled %": 0.1, "Max Vol MCAP %": 33 },
                advanced: { "Min TTC (sec)": 18, "Max TTC (sec)": 3600, "Max Liquidity %": 65 }
            },
            // This is for Multiple Starting Points optimization
            // From Top Presets
            cabalOrRug: {
                basic: { "Min MCAP (USD)": 4000, "Max MCAP (USD)": 6000 },
                tokenDetails: { "Min Deployer Age (min)": 1, "Max Token Age (min)": 1 },
                wallets: { "Min Unique Wallets": 1, "Max Unique Wallets": 1, "Min KYC Wallets": 1, "Max KYC Wallets": 1 },
                risk: { "Max Drained %": 10, "Min Deployer Balance (SOL)": 10 },
                advanced: { "Max TTC (sec)": 1, "Min Win Pred %": 3 }
            },    
            rolandProduction: {
                basic: { "Min MCAP (USD)": 4000, "Max MCAP (USD)": 6000 },
                tokenDetails: { "Min Deployer Age (min)": 1, "Max Token Age (min)": 1 },
                wallets: { "Min Unique Wallets": 1, "Max Unique Wallets": 1, "Min KYC Wallets": 1, "Max KYC Wallets": 1 },
                risk: { "Max Drained %": 10, "Min Deployer Balance (SOL)": 10 },
                advanced: { "Min Win Pred %": 2 }
            },            
            bonkSuper: {
                basic: { "Min MCAP (USD)": 4000, "Max MCAP (USD)": 5000 },
                tokenDetails: { "Min AG Score": "4", "Min Deployer Age (min)": 1, "Max Token Age (min)": 1 },
                wallets: { "Min Unique Wallets": 1, "Max Unique Wallets": 1, "Min KYC Wallets": 1, "Max KYC Wallets": 1 },
                risk: { "Min Deployer Balance (SOL)": 10 },
                advanced: { "Min Win Pred %": 4 }
            },            
            roland4to6K: {
                basic: { "Min MCAP (USD)": 4000, "Max MCAP (USD)": 6000 },
                tokenDetails: { "Min Deployer Age (min)": 1, "Max Token Age (min)": 1 },
                wallets: { "Min Unique Wallets": 1, "Max Unique Wallets": 1, "Min KYC Wallets": 1, "Max KYC Wallets": 1 },
                risk: { "Max Drained %": 10, "Min Deployer Balance (SOL)": 10 },
                advanced: { "Min Win Pred %": 4 }
            },            
            alpha97: {
                risk: { "Min Buy Ratio %": 97, "Max Buy Ratio %": 100, "Min Vol MCAP %": 47 }
            },            
            boomerBonk: {
                basic: { "Min MCAP (USD)": 4000, "Max MCAP (USD)": 5000 },
                tokenDetails: { "Min AG Score": "4", "Min Deployer Age (min)": 1, "Max Token Age (min)": 1 },
                wallets: { "Min Unique Wallets": 1, "Max Unique Wallets": 1, "Min KYC Wallets": 1, "Max KYC Wallets": 1 },
                risk: { "Min Deployer Balance (SOL)": 10 },
                advanced: { "Min Win Pred %": 2 }
            },            
            boomerBonk1: {
                basic: { "Min MCAP (USD)": 4000, "Max MCAP (USD)": 5000 },
                tokenDetails: { "Min AG Score": "4", "Min Deployer Age (min)": 1, "Max Token Age (min)": 1 },
                wallets: { "Min Unique Wallets": 1, "Min KYC Wallets": 1 },
                risk: { "Max Bundled %": 75, "Min Deployer Balance (SOL)": 7 },
                advanced: { "Min Win Pred %": 4 }
            },
            // More stuff
            oldDeployer: { tokenDetails: { "Min Deployer Age (min)": 43200, "Min AG Score": "4" } },
            PfMainOld: {
                basic: { "Min MCAP (USD)": 4999, "Max MCAP (USD)": 29999 },
                tokenDetails: { "Min AG Score": "3" },
                wallets: { "Min Unique Wallets": 2, "Min KYC Wallets": 2 },
                risk: { "Min Bundled %": 0.1, "Max Vol MCAP %": 33 },
                advanced: { "Min TTC (sec)": 18, "Max TTC (sec)": 3600, "Max Liquidity %": 65 }
            },
            ClaudeR6: {
                basic: { "Min MCAP (USD)": 6000, "Max MCAP (USD)": 25000 },
                tokenDetails: { "Min AG Score": "5", "Max Token Age (min)": 52, "Min Deployer Age (min)": 17 },
                wallets: { "Min Unique Wallets": 0, "Max Unique Wallets": 1, "Min KYC Wallets": 0, "Max KYC Wallets": 2 },
                risk: { "Max Bundled %": 82, "Min Vol MCAP %": 9, "Max Vol MCAP %": 90, "Min Buy Ratio %": 20, "Max Buy Ratio %": 90, "Min Deployer Balance (SOL)": 0.95,"Fresh Deployer": "Yes", "Description": "Yes" },
                advanced: { "Max Liquidity %": 66,  "Max TTC (sec)": 30 }
            },
            Turbo2: {
                basic: { "Max MCAP (USD)": 40000 },
                tokenDetails: { "Min Deployer Age (min)": 10, "Min AG Score": "6", "Max Token Age (min)": 180 },
                //wallets: { "Min Unique Wallets": 1,  "Max Unique Wallets": 6, "Min KYC Wallets": 1, "Max KYC Wallets": 5 },
                risk: { "Min Bundled %": 0.8, "Max Vol MCAP %": 33, "Min Deployer Balance (SOL)": 4.45, "Fresh Deployer": "Yes", "Description": "Yes" },
                advanced: { "Max Liquidity %": 75, "Min Win Pred %": 30 }
            },
			bundle1_74: { risk: { "Max Bundled %": 1.74 } }, 
            deployerBalance10: { risk: { "Min Deployer Balance (SOL)": 10 } },
            agScore7: { tokenDetails: { "Min AG Score": "7" } },
        },

        // Optimization settings
        TARGET_PNL: 350,
        MIN_TOKENS: 25,
        BACKTEST_WAIT: 3000,
        MAX_RUNTIME_MIN: 30,
        MAX_TESTS_PER_PHASE: 8,
        
        // Advanced optimization settings
        USE_CONFIG_CACHING: true,
        USE_PARAMETER_IMPACT_ANALYSIS: true,
        USE_GENETIC_ALGORITHM: true,
        USE_SIMULATED_ANNEALING: true,
        USE_ADAPTIVE_STEP_SIZES: true,
        USE_LATIN_HYPERCUBE_SAMPLING: true,
        USE_MULTIPLE_STARTING_POINTS: true,
        
        // Experimental RUNNERS % optimization
        USE_RUNNERS_OPTIMIZATION: false,
        RUNNERS_TARGET_PERCENTAGE: 30, // Target percentage of 10x+ runners
        RUNNERS_PNL_HYBRID_MODE: true, // After finding best runners %, optimize PnL % for that target
        RUNNERS_PERCENTAGE_TOLERANCE: 2.0, // Allow ±2% variance from target runners % during PnL optimization
        
        // Rate limiting settings to prevent 429 errors
        AGGRESSIVE_RATE_LIMITING: true, // Enable more conservative delays when experiencing errors
        BASE_FIELD_DELAY: 350, // Base delay between field updates (ms)
        SECTION_DELAY: 250, // Delay between processing different sections (ms)
        BATCH_SIZE: 2, // Number of fields to process before taking a break
        
    };

    // ========================================
    // 🛠️ UTILITIES
    // ========================================
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    let STOPPED = false;

    // Efficient deep clone utility function (replaces expensive JSON.parse(JSON.stringify()))
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

    // Parameter validation schema
    const PARAM_RULES = {
        // Basic
        'Min MCAP (USD)': { min: 0, max: 10000, step: 1000 },
        'Max MCAP (USD)': { min: 10000, max: 60000, step: 1000 },

        // Token Details
        'Min Deployer Age (min)': { min: 0, max: 1440, step: 5 },
        'Max Token Age (min)': { min: 5, max: 300, step: 15 },
        'Min AG Score': { min: 1, max: 10, step: 1, type: 'string' },

        // Wallets
        'Min Unique Wallets': { min: 1, max: 3, step: 1 },
        'Max Unique Wallets': { min: 1, max: 8, step: 1 },
        'Min KYC Wallets': { min: 0, max: 3, step: 1 },
        'Max KYC Wallets': { min: 1, max: 8, step: 1 },

        // Risk
        'Min Bundled %': { min: 0, max: 5, step: 1 },  
        'Max Bundled %': { min: 0, max: 100, step: 5 },
        'Min Deployer Balance (SOL)': { min: 0, max: 50, step: 2 },
        'Min Buy Ratio %': { min: 0, max: 100, step: 10 },
        'Max Buy Ratio %': { min: 50, max: 100, step: 5 },
        'Min Vol MCAP %': { min: 0, max: 300, step: 10 },
        'Max Vol MCAP %': { min: 50, max: 300, step: 20 },
        'Max Drained %': { min: 0, max: 100, step: 5 },
        'Max Drained Count': { min: 0, max: 100, step: 5 },

        // Advanced
        'Min TTC (sec)': { min: 0, max: 3600, step: 5 },
        'Max TTC (sec)': { min: 5, max: 3600, step: 10 },
        'Max Liquidity %': { min: 10, max: 100, step: 10 },
        'Min Win Pred %': { min: 0, max: 70, step: 5 }
    };

    // ========================================
    // 🎛️ OPTIMIZED UI INTERACTION LAYER
    // ========================================
    
    // Enhanced rate limiter to prevent 429 errors with exponential backoff
    class RateLimiter {
        constructor(minDelay = 350) { // Increased base delay
            this.minDelay = minDelay;
            this.lastRequest = 0;
            this.consecutiveErrors = 0;
            this.lastErrorTime = 0;
            this.requestQueue = [];
            this.isProcessing = false;
        }
        
        async throttle() {
            const now = Date.now();
            const elapsed = now - this.lastRequest;
            
            // Calculate delay with exponential backoff for errors
            let currentDelay = this.minDelay;
            
            // If we've had recent 429 errors, apply exponential backoff
            if (this.consecutiveErrors > 0 && (now - this.lastErrorTime) < 30000) { // 30 second window
                currentDelay = this.minDelay * Math.pow(2, Math.min(this.consecutiveErrors, 4)); // Cap at 16x
                console.log(`🚦 Rate limiter: ${this.consecutiveErrors} consecutive errors, delay increased to ${currentDelay}ms`);
            }
            
            if (elapsed < currentDelay) {
                await sleep(currentDelay - elapsed);
            }
            
            this.lastRequest = Date.now();
        }
        
        // Method to call when a 429 error occurs
        recordError() {
            this.consecutiveErrors++;
            this.lastErrorTime = Date.now();
            console.log(`⚠️ Rate limit error recorded. Consecutive errors: ${this.consecutiveErrors}`);
        }
        
        // Method to call when a request succeeds
        recordSuccess() {
            if (this.consecutiveErrors > 0) {
                console.log(`✅ Request succeeded, resetting error count from ${this.consecutiveErrors}`);
                this.consecutiveErrors = 0;
            }
        }
        
        // Get current effective delay for logging
        getCurrentDelay() {
            const now = Date.now();
            if (this.consecutiveErrors > 0 && (now - this.lastErrorTime) < 30000) {
                return this.minDelay * Math.pow(2, Math.min(this.consecutiveErrors, 4));
            }
            return this.minDelay;
        }
        
        // Get rate limiter status for monitoring
        getStatus() {
            return {
                baseDelay: this.minDelay,
                currentDelay: this.getCurrentDelay(),
                consecutiveErrors: this.consecutiveErrors,
                lastErrorTime: this.lastErrorTime,
                timeSinceLastError: this.lastErrorTime ? Date.now() - this.lastErrorTime : 0
            };
        }
    }
    
    class UIController {
        constructor() {
            this.fieldHandlers = new Map();
            this.fieldMappings = new Map();
            this.rateLimiter = new RateLimiter(CONFIG.BASE_FIELD_DELAY); // Use configurable delay
            this.lastStatusLog = 0;
        }
        
        // Log rate limiter status periodically (every 30 seconds max)
        logRateLimiterStatus() {
            const now = Date.now();
            if (now - this.lastStatusLog > 30000) { // Log every 30 seconds max
                const status = this.rateLimiter.getStatus();
                if (status.consecutiveErrors > 0 || status.currentDelay > status.baseDelay) {
                    console.log(`🚦 Rate Limiter Status: ${status.consecutiveErrors} errors, delay: ${status.currentDelay}ms (base: ${status.baseDelay}ms)`);
                    this.lastStatusLog = now;
                }
            }
        }

        async getCurrentConfig() {
            // Start with complete template to ensure ALL fields are included
            const config = deepClone(COMPLETE_CONFIG_TEMPLATE);

            const getFieldValue = (labelText) => {
                const labels = Array.from(document.querySelectorAll('.sidebar-label'));
                const label = labels.find(el => el.textContent.trim() === labelText);
                if (!label) return undefined;

                let container = label.parentElement;
                while (container && !container.querySelector('input, select, button')) {
                    container = container.parentElement;
                }

                const input = container.querySelector('input[type="number"]');
                if (input) {
                    return input.value === '' ? undefined : parseFloat(input.value);
                }

                const select = container.querySelector('select');
                if (select) {
                    return select.value === '' ? undefined : select.value;
                }

                const button = container.querySelector('button');
                if (button) {
                    const text = button.textContent.trim();
                    // Only return value if it's not the default "Don't care" state
                    return (text === "Don't care" || text === "") ? undefined : text;
                }

                return undefined;
            };

            const getToggleValue = (labelText) => {
                const labels = Array.from(document.querySelectorAll('.sidebar-label'));
                const label = labels.find(el => el.textContent.trim() === labelText);
                if (!label) return undefined;

                let container = label.closest('.form-group') || label.parentElement;
                const button = container.querySelector('button');
                if (button) {
                    const text = button.textContent.trim();
                    // Only return value if it's not the default "Don't care" state
                    return (text === "Don't care" || text === "") ? undefined : text;
                }
                return undefined;
            };

            // Map ALL fields to config sections (overwrites undefined values from template)
            config.basic["Min MCAP (USD)"] = getFieldValue("Min MCAP (USD)");
            config.basic["Max MCAP (USD)"] = getFieldValue("Max MCAP (USD)");

            config.tokenDetails["Min Deployer Age (min)"] = getFieldValue("Min Deployer Age (min)");
            config.tokenDetails["Max Token Age (min)"] = getFieldValue("Max Token Age (min)");
            config.tokenDetails["Min AG Score"] = getFieldValue("Min AG Score");

            config.risk["Min Vol MCAP %"] = getFieldValue("Min Vol MCAP %");
            config.risk["Max Vol MCAP %"] = getFieldValue("Max Vol MCAP %");
            config.risk["Min Buy Ratio %"] = getFieldValue("Min Buy Ratio %");
            config.risk["Max Buy Ratio %"] = getFieldValue("Max Buy Ratio %");
            config.risk["Min Deployer Balance (SOL)"] = getFieldValue("Min Deployer Balance (SOL)");
            config.risk["Max Bundled %"] = getFieldValue("Max Bundled %");
            config.risk["Min Bundled %"] = getFieldValue("Min Bundled %");
            config.risk["Max Drained %"] = getFieldValue("Max Drained %");
            config.risk["Max Drained Count"] = getFieldValue("Max Drained Count");
            config.risk["Description"] = getToggleValue("Description");
            config.risk["Fresh Deployer"] = getToggleValue("Fresh Deployer");

            config.advanced["Min TTC (sec)"] = getFieldValue("Min TTC (sec)");
            config.advanced["Max TTC (sec)"] = getFieldValue("Max TTC (sec)");
            config.advanced["Max Liquidity %"] = getFieldValue("Max Liquidity %");
            config.advanced["Min Win Pred %"] = getFieldValue("Min Win Pred %");

            config.wallets["Min Unique Wallets"] = getFieldValue("Min Unique Wallets");
            config.wallets["Max Unique Wallets"] = getFieldValue("Max Unique Wallets");
            config.wallets["Min KYC Wallets"] = getFieldValue("Min KYC Wallets");
            config.wallets["Max KYC Wallets"] = getFieldValue("Max KYC Wallets");

            return config;
        }

        // Open section and map React handlers for newly visible fields
        async openSectionAndMapHandlers(sectionTitle) {
            // Open the section
            const allHeaders = Array.from(document.querySelectorAll('button[type="button"]'));
            const sectionHeader = allHeaders.find(header =>
                header.textContent.includes(sectionTitle)
            );

            if (!sectionHeader) {
                return false;
            }

            sectionHeader.click();
            await sleep(150); // Moderate section expansion wait
            
            // Map React handlers for newly visible fields
            this.mapVisibleFieldHandlers();
            
            return true;
        }
        
        // Map React handlers for currently visible fields
        mapVisibleFieldHandlers() {
            const inputs = document.querySelectorAll('input[type="number"]:not([data-mapped])');
            const selects = document.querySelectorAll('select:not([data-mapped])');
            
            [...inputs, ...selects].forEach(field => {
                const label = this.findFieldLabel(field);
                
                // Try multiple patterns for React props
                let handler = null;
                let propsKey = null;
                
                // Look for React Fiber properties (React 16+)
                const fiberKey = Object.keys(field).find(key => 
                    key.startsWith('__reactInternalInstance') || 
                    key.startsWith('__reactFiber') ||
                    key.startsWith('_reactInternalFiber')
                );
                
                if (fiberKey && field[fiberKey]) {
                    const fiberNode = field[fiberKey];
                    // Navigate the fiber tree to find props
                    let current = fiberNode;
                    for (let i = 0; i < 5 && current; i++) {
                        if (current.memoizedProps && current.memoizedProps.onChange) {
                            handler = current.memoizedProps.onChange;
                            propsKey = `${fiberKey}.memoizedProps`;
                            break;
                        }
                        if (current.pendingProps && current.pendingProps.onChange) {
                            handler = current.pendingProps.onChange;
                            propsKey = `${fiberKey}.pendingProps`;
                            break;
                        }
                        current = current.return || current.child || current.sibling;
                    }
                }
                
                // Fallback: Look for direct React props
                if (!handler) {
                    propsKey = Object.keys(field).find(key => 
                        key.includes('reactProps') || 
                        key.includes('__reactProps') ||
                        key.includes('props')
                    );
                    
                    if (propsKey && field[propsKey] && field[propsKey].onChange) {
                        handler = field[propsKey].onChange;
                    }
                }
                
                // Additional fallback: Check for onChange directly on the element
                if (!handler && field.onChange && typeof field.onChange === 'function') {
                    handler = field.onChange;
                    propsKey = 'direct';
                }
                
                if (handler) {
                    this.fieldHandlers.set(label, handler);
                    this.fieldMappings.set(label, field);
                    field.setAttribute('data-mapped', 'true'); // Mark as mapped
                }
            });
        }
        
        // Find the label for a field
        findFieldLabel(element) {
            let container = element.closest('.form-group') || element.parentElement;
            
            for (let i = 0; i < 5; i++) {
                if (!container) break;
                
                const label = container.querySelector('.sidebar-label');
                if (label) {
                    return label.textContent.trim();
                }
                
                container = container.parentElement;
            }
            
            return element.placeholder || 'Unknown';
        }

        // React handler method for optimized field setting with rate limiting and error handling
        async setFieldValueReact(labelText, value, maxRetries = 2) {
            this.logRateLimiterStatus(); // Monitor rate limiter
            
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                await this.rateLimiter.throttle();
                
                const handler = this.fieldHandlers.get(labelText);
                const field = this.fieldMappings.get(labelText);
                
                if (!handler || !field) {
                    return false;
                }
                
                try {
                    // Create a more comprehensive synthetic event
                    const syntheticEvent = {
                        target: {
                            value: String(value),
                            type: field.type || 'text',
                            name: field.name || '',
                            checked: field.type === 'checkbox' ? Boolean(value) : undefined
                        },
                        currentTarget: field,
                        preventDefault: () => {},
                        stopPropagation: () => {},
                        persist: () => {}
                    };
                    
                    // Call the React handler
                    await handler(syntheticEvent);
                    
                    // Record success for rate limiter
                    this.rateLimiter.recordSuccess();
                    
                    // Verify the field was actually updated
                    await sleep(50); // Slightly increased verification wait
                    const currentValue = field.value;
                    const expectedValue = String(value);
                    
                    if (currentValue === expectedValue || Math.abs(parseFloat(currentValue) - parseFloat(expectedValue)) < 0.01) {
                        return true;
                    } else {
                        // Field wasn't updated properly, might be a rate limit issue
                        if (attempt < maxRetries) {
                            console.log(`⚠️ Field "${labelText}" not updated properly (attempt ${attempt + 1}), retrying...`);
                            this.rateLimiter.recordError();
                            continue;
                        }
                        return false;
                    }
                    
                } catch (error) {
                    // Check if it's a rate limit error
                    if (error.message && (error.message.includes('429') || error.message.includes('rate limit'))) {
                        console.log(`🚦 Rate limit detected for field "${labelText}" (attempt ${attempt + 1})`);
                        this.rateLimiter.recordError();
                        if (attempt < maxRetries) {
                            await sleep(1000 * (attempt + 1)); // Progressive delay
                            continue;
                        }
                    }
                    return false;
                }
            }
            return false;
        }

        // React handler method specifically for clearing fields with rate limiting and error handling
        async clearFieldValueReact(labelText, maxRetries = 2) {
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                await this.rateLimiter.throttle();
                
                const handler = this.fieldHandlers.get(labelText);
                const field = this.fieldMappings.get(labelText);
                
                if (!handler || !field) {
                    return false;
                }
                
                try {
                    // Create synthetic event for clearing
                    const syntheticEvent = {
                        target: {
                            value: '', // Empty string to clear
                            type: field.type || 'text',
                            name: field.name || '',
                            checked: false
                        },
                        currentTarget: field,
                        preventDefault: () => {},
                        stopPropagation: () => {},
                        persist: () => {}
                    };
                    
                    // Call the React handler
                    await handler(syntheticEvent);
                    
                    // Record success for rate limiter
                    this.rateLimiter.recordSuccess();
                    
                    // Verify the field was actually cleared
                    await sleep(50); // Slightly increased verification wait
                    const currentValue = field.value;
                    
                    if (currentValue === '' || currentValue === null || currentValue === undefined) {
                        return true;
                    } else {
                        if (attempt < maxRetries) {
                            console.log(`⚠️ Field "${labelText}" not cleared properly (attempt ${attempt + 1}), retrying...`);
                            this.rateLimiter.recordError();
                            continue;
                        }
                        return false;
                    }
                    
                } catch (error) {
                    // Check if it's a rate limit error
                    if (error.message && (error.message.includes('429') || error.message.includes('rate limit'))) {
                        console.log(`🚦 Rate limit detected while clearing field "${labelText}" (attempt ${attempt + 1})`);
                        this.rateLimiter.recordError();
                        if (attempt < maxRetries) {
                            await sleep(1000 * (attempt + 1)); // Progressive delay
                            continue;
                        }
                    }
                    return false;
                }
            }
            return false;
        }

        // Enhanced toggle value setting using React handlers with rate limiting and error handling
        async setToggleValueReact(labelText, value, maxRetries = 2) {
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                await this.rateLimiter.throttle();
                
                const handler = this.fieldHandlers.get(labelText);
                const field = this.fieldMappings.get(labelText);
                
                if (!handler || !field) {
                    return false;
                }
                
                try {
                    // For toggle buttons, we need to check current state and click if different
                    const currentValue = field.textContent?.trim();
                    
                    if (currentValue !== value) {
                        // Simulate a click event for toggle buttons
                        const clickEvent = {
                            type: 'click',
                            target: field,
                            currentTarget: field,
                            preventDefault: () => {},
                            stopPropagation: () => {},
                            persist: () => {}
                        };
                        
                        // Try onClick handler if available
                        if (field.onclick) {
                            field.onclick(clickEvent);
                        } else if (handler) {
                            await handler(clickEvent);
                        } else {
                            // Fallback to direct click
                            field.click();
                        }
                        
                        // Record success for rate limiter
                        this.rateLimiter.recordSuccess();
                        
                        await sleep(60); // Slightly increased toggle verification
                        
                        // Verify the toggle was successful
                        const newValue = field.textContent?.trim();
                        if (newValue === value) {
                            return true;
                        }
                        
                        // If not the target value, try clicking again (some toggles cycle through options)
                        if (newValue !== value && newValue !== currentValue) {
                            field.click();
                            await sleep(60); // Consistent timing for second click
                            const finalValue = field.textContent?.trim();
                            if (finalValue === value) {
                                return true;
                            }
                        }
                        
                        // If still not right and we have retries left
                        if (attempt < maxRetries) {
                            console.log(`⚠️ Toggle "${labelText}" not set properly (attempt ${attempt + 1}), retrying...`);
                            this.rateLimiter.recordError();
                            continue;
                        }
                        return false;
                    }
                    
                    return true;
                    
                } catch (error) {
                    // Check if it's a rate limit error
                    if (error.message && (error.message.includes('429') || error.message.includes('rate limit'))) {
                        console.log(`🚦 Rate limit detected for toggle "${labelText}" (attempt ${attempt + 1})`);
                        this.rateLimiter.recordError();
                        if (attempt < maxRetries) {
                            await sleep(1000 * (attempt + 1)); // Progressive delay
                            continue;
                        }
                    }
                    return false;
                }
            }
            return false;
        }

        // DOM fallback method (legacy support)
        async setFieldValue(labelText, value, sectionName = null, maxRetries = 2) {
            const shouldClear = (value === undefined || value === null || value === "" || value === "clear");

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                const labels = Array.from(document.querySelectorAll('.sidebar-label'));
                const label = labels.find(el => el.textContent.trim() === labelText);

                if (!label) {
                    if (attempt < maxRetries && sectionName) {
                        await this.openSection(sectionName);
                        continue;
                    }
                    return false;
                }

                let container = label.closest('.form-group') || label.parentElement;

                if (!container.querySelector('input[type="number"]') && !container.querySelector('select')) {
                    container = container.parentElement;
                    if (!container.querySelector('input[type="number"]') && !container.querySelector('select')) {
                        container = container.parentElement;
                    }
                }

                const input = container.querySelector('input[type="number"]');
                if (input) {
                    if (shouldClear) {
                        const relativeContainer = input.closest('.relative');
                        const clearButton = relativeContainer?.querySelector('button');
                        if (clearButton && clearButton.textContent.trim() === '×') {
                            clearButton.click();
                            await sleep(100); // Faster clear button wait
                        } else {
                            input.focus();
                            input.value = '';
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                            input.blur();
                        }
                    } else {
                        let processedValue = value;

                        if (typeof value === 'string' && value.trim() !== '') {
                            const parsed = parseFloat(value);
                            if (!isNaN(parsed)) {
                                processedValue = parsed;
                            } else {
                                processedValue = value;
                            }
                        } else if (typeof value === 'number') {
                            processedValue = value;
                        }

                        // Force integer rounding for specific parameters
                        if (labelText.includes('Wallets') || labelText.includes('Count') || labelText.includes('Age')) {
                            processedValue = Math.round(processedValue);
                        }

                        if ((typeof processedValue === 'number' && !isNaN(processedValue)) ||
                            (typeof processedValue === 'string' && processedValue.trim() !== '')) {
                            input.focus();
                            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                            nativeInputValueSetter.call(input, processedValue);

                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                            input.blur();
                        }
                    }
                    return true;
                }

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
            }
            return false;
        }

        async setToggleValue(labelText, value, sectionName = null, maxRetries = 2) {
            if (value === undefined) {
                if (labelText === "Description") {
                    value = "Don't care";
                } else if (labelText === "Fresh Deployer") {
                    value = "Don't care";
                } else {
                    return false;
                }
            }

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                const labels = Array.from(document.querySelectorAll('.sidebar-label'));
                const label = labels.find(el => el.textContent.trim() === labelText);

                if (!label) {
                    if (attempt < maxRetries && sectionName) {
                        await this.openSection(sectionName);
                        await sleep(100); // Faster section retry wait
                        continue;
                    }
                    return false;
                }

                let container = label.closest('.form-group') || label.parentElement;
                const button = container.querySelector('button');

                if (button) {
                    const currentValue = button.textContent.trim();
                    if (currentValue !== value) {
                        button.click();
                        await sleep(100); // Faster toggle wait

                        const newValue = button.textContent.trim();
                        if (newValue !== value && newValue !== currentValue) {
                            button.click();
                            await sleep(100); // Faster second toggle wait
                        }
                    }
                    return true;
                }
            }
            return false;
        }

        async openSection(sectionTitle) {
            const allHeaders = Array.from(document.querySelectorAll('button[type="button"]'));
            const sectionHeader = allHeaders.find(header =>
                header.textContent.includes(sectionTitle)
            );

            if (!sectionHeader) {
                return false;
            }

            sectionHeader.click();
            return true;
        }

        isToggleButton(fieldName) {
            return fieldName === "Description" || fieldName === "Fresh Deployer";
        }

        // Rate-limited clearAllFields method to prevent 429 errors
        async clearAllFields() {
            
            // Group fields by section for efficient clearing
            const sectionMap = {
                'Basic': ['Min MCAP (USD)', 'Max MCAP (USD)'],
                'Token Details': ['Min Deployer Age (min)', 'Max Token Age (min)', 'Min AG Score'],
                'Wallets': ['Min Unique Wallets', 'Max Unique Wallets', 'Min KYC Wallets', 'Max KYC Wallets'],
                'Risk': ['Min Vol MCAP %', 'Max Vol MCAP %', 'Min Buy Ratio %', 'Max Buy Ratio %',
                         'Min Deployer Balance (SOL)', 'Max Bundled %', 'Min Bundled %', 'Max Drained %',
                         'Max Drained Count', 'Description', 'Fresh Deployer'],
                'Advanced': ['Min TTC (sec)', 'Max TTC (sec)', 'Max Liquidity %', 'Min Win Pred %']
            };

            let totalCleared = 0;

            // Process each section with increased delays to prevent rate limiting
            for (const [sectionName, fields] of Object.entries(sectionMap)) {
                
                // Open section and map handlers
                await this.openSectionAndMapHandlers(sectionName);
                
                // Longer delay after opening section to let it fully load
                await sleep(300);

                // Clear fields in smaller batches to reduce load
                const batchSize = CONFIG.BATCH_SIZE; // Use configurable batch size
                for (let i = 0; i < fields.length; i += batchSize) {
                    const batch = fields.slice(i, i + batchSize);
                    
                    for (const field of batch) {
                        let success = false;

                        if (this.isToggleButton(field)) {
                            // Use DOM method first for toggle buttons to reduce complexity
                            success = await this.setToggleValue(field, "Don't care");
                        } else {
                            // Use DOM method for clearing to be more reliable
                            success = await this.setFieldValue(field, undefined);
                        }

                        if (success) {
                            totalCleared++;
                        }
                        
                        // Increased delay between individual fields
                        await sleep(150);
                    }
                    
                    // Additional delay between batches
                    if (i + batchSize < fields.length) {
                        await sleep(200);
                    }
                }
                
                // Delay between sections
                await sleep(400);
            }
            
            return totalCleared;
        }

        // Smart config application with selective clearing - only clears/changes what's needed
        async applyConfig(config, clearFirst = false) {
            this.logRateLimiterStatus(); // Monitor rate limiter at start of config application
                        
            const sectionMap = {
                basic: 'Basic',
                tokenDetails: 'Token Details',
                wallets: 'Wallets',
                risk: 'Risk',
                advanced: 'Advanced'
            };

            // Get current config to compare what needs to change
            const currentConfig = clearFirst ? {} : await this.getCurrentConfig();
            
            let totalSuccess = 0;
            
            // Define all possible fields by section for selective clearing
            const allFieldsBySection = {
                basic: ['Min MCAP (USD)', 'Max MCAP (USD)'],
                tokenDetails: ['Min Deployer Age (min)', 'Max Token Age (min)', 'Min AG Score'],
                wallets: ['Min Unique Wallets', 'Max Unique Wallets', 'Min KYC Wallets', 'Max KYC Wallets'],
                risk: ['Min Vol MCAP %', 'Max Vol MCAP %', 'Min Buy Ratio %', 'Max Buy Ratio %',
                       'Min Deployer Balance (SOL)', 'Max Bundled %', 'Min Bundled %', 'Max Drained %',
                       'Max Drained Count', 'Description', 'Fresh Deployer'],
                advanced: ['Min TTC (sec)', 'Max TTC (sec)', 'Max Liquidity %', 'Min Win Pred %']
            };
            
            // Process each section
            for (const [section, params] of Object.entries(config)) {
                const sectionName = sectionMap[section];
                if (!sectionName) continue;
                
                // Open section and map handlers
                await this.openSectionAndMapHandlers(sectionName);
                
                // Get all fields for this section
                const allFieldsInSection = allFieldsBySection[section] || [];
                const configFieldsInSection = params ? Object.keys(params) : [];
                
                // Step 1: Clear fields that are in the section but NOT in the config (selective clearing)
                if (!clearFirst) {
                    for (const field of allFieldsInSection) {
                        // Check if field is NOT in the new config OR is explicitly undefined in new config
                        const isInNewConfig = configFieldsInSection.includes(field);
                        const newValue = isInNewConfig ? params[field] : undefined;
                        const currentValue = currentConfig[section] && currentConfig[section][field];
                        
                        // Clear if:
                        // 1. Field is not in new config but has a current value
                        // 2. Field is in new config with undefined value but has a current value
                        const shouldClear = (!isInNewConfig && currentValue !== undefined && currentValue !== null && currentValue !== '') ||
                                          (isInNewConfig && newValue === undefined && currentValue !== undefined && currentValue !== null && currentValue !== '');
                        
                        if (shouldClear) {
                            let success = false;
                            
                            if (this.isToggleButton(field)) {
                                success = await this.setToggleValue(field, "Don't care", sectionName);
                            } else {
                                success = await this.setFieldValue(field, undefined, sectionName);
                            }
                            
                            if (success) {
                                totalSuccess++;
                            }
                            await sleep(90); // More conservative between clearing operations
                        }
                    }
                }
                
                // Step 2: Set/update fields that are specified in the config
                if (params && Object.keys(params).length > 0) {
                    for (const [param, value] of Object.entries(params)) {
                        if (value !== undefined && value !== null && value !== '') {
                            // Check if the value is different from current (optimization)
                            const currentValue = !clearFirst && currentConfig[section] && currentConfig[section][param];
                            const needsUpdate = clearFirst || 
                                               currentValue === undefined || 
                                               String(currentValue) !== String(value);
                            
                            if (needsUpdate) {
                                let success = false;

                                if (this.isToggleButton(param)) {
                                    success = await this.setToggleValueReact(param, value);
                                    
                                    // Fallback to DOM method if React handler not available
                                    if (!success) {
                                        success = await this.setToggleValue(param, value, sectionName);
                                    }
                                } else {
                                    // Try React handler first
                                    success = await this.setFieldValueReact(param, value);
                                    
                                    // Fallback to DOM method if React handler not available
                                    if (!success) {
                                        success = await this.setFieldValue(param, value, sectionName);
                                    }
                                }

                                if (success) {
                                    totalSuccess++;
                                }
                                
                                // Adaptive delay based on rate limiter status and configuration
                                const baseDelay = CONFIG.AGGRESSIVE_RATE_LIMITING ? 150 : 100;
                                const adaptiveDelay = CONFIG.AGGRESSIVE_RATE_LIMITING ? 
                                    Math.max(baseDelay, this.rateLimiter.getCurrentDelay() * 0.5) : baseDelay;
                                await sleep(adaptiveDelay);
                            }
                        }
                    }
                }
                
                // Adaptive section delay based on configuration
                const sectionDelay = CONFIG.AGGRESSIVE_RATE_LIMITING ? CONFIG.SECTION_DELAY : 150;
                await sleep(sectionDelay);
            }
            
            
            return totalSuccess;
        }
    }

    // ========================================
    // 📊 METRICS EXTRACTOR
    // ========================================
    async function extractMetrics() {
        try {
            const metrics = {};
            const statDivs = Array.from(document.querySelectorAll('div.text-xl.font-bold'));

            for (const div of statDivs) {
                const label = div.parentElement.querySelector('div.text-xs.text-gray-400');
                if (label) {
                    const labelText = label.textContent.trim().toLowerCase();
                    const value = div.textContent.trim();

                    switch (labelText) {
                        case 'tokens matched':
                            const tokenMatch = value.match(/(\d{1,3}(?:,\d{3})*)/);
                            if (tokenMatch) {
                                metrics.tokensMatched = parseInt(tokenMatch[1].replace(/,/g, ''));
                            }
                            break;
                        case 'tp pnl %':
                            const tpPnlMatch = value.match(/([+-]?\d+(?:\.\d+)?)%/);
                            if (tpPnlMatch) {
                                metrics.tpPnlPercent = parseFloat(tpPnlMatch[1]);
                            }
                            break;
                        case 'tp pnl (sol)':
                            const tpPnlSolMatch = value.match(/([+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?)/);
                            if (tpPnlSolMatch) {
                                metrics.tpPnlSOL = parseFloat(tpPnlSolMatch[1].replace(/,/g, ''));
                            }
                            break;
                        case 'total sol spent':
                            const spentMatch = value.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/);
                            if (spentMatch) {
                                metrics.totalSpent = parseFloat(spentMatch[1].replace(/,/g, ''));
                            }
                            break;
                        case 'win rate (≥2x)':
                            const winRateMatch = value.match(/(\d+(?:\.\d+)?)%/);
                            if (winRateMatch) {
                                metrics.winRate = parseFloat(winRateMatch[1]);
                            }
                            break;
                    }
                }
            }

            // Extract RUNNERS % data for anti-gigamooner optimization
            if (CONFIG.USE_RUNNERS_OPTIMIZATION) {
                const runnersData = await extractRunnersData();
                if (runnersData) {
                    metrics.runnersCount = runnersData.runnersCount;
                    metrics.runnersPercentage = runnersData.runnersPercentage;
                }
            }

            // Validate required metrics
            if (metrics.tpPnlPercent === undefined || metrics.tokensMatched === undefined) {
                return null;
            }

            return metrics;
        } catch (error) {
            return null;
        }
    }

    // ========================================
    // 🎯 RUNNERS DATA EXTRACTOR
    // ========================================
    async function extractRunnersData() {
        try {
            let totalRunnersCount = 0;
            let totalPagesAnalyzed = 0;
            let currentPage = 1;
            let maxPages = 50; // Safety limit
            
            console.log('🎯 Starting comprehensive runners analysis across all pages...');
            
            // First, sort by TP Gain to get highest gainers at the top
            console.log('📊 Sorting table by TP Gain for efficient analysis...');
            await sortByTPGain();
            
            // Wait for sorting to complete
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Track original scroll position
            const originalScrollY = window.scrollY;
            
            while (currentPage <= maxPages) {
                console.log(`📄 Analyzing page ${currentPage}...`);
                
                // Wait for page to load
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Analyze current page
                const pageData = await extractRunnersFromCurrentPage();
                totalRunnersCount += pageData.runnersCount;
                totalPagesAnalyzed++;
                
                console.log(`📊 Page ${currentPage}: ${pageData.runnersCount}/${pageData.tokensOnThisPage} runners`);
                
                // Early termination: If this page has fewer runners than tokens, 
                // and we're sorted by TP Gain, we can stop here since subsequent pages will have even fewer runners
                if (pageData.runnersCount < pageData.tokensOnThisPage && currentPage > 1) {
                    break;
                }
                
                // Check if there's a next page
                const nextButton = Array.from(document.querySelectorAll('button')).find(btn => 
                    btn.textContent.toLowerCase().includes('next')) || 
                    document.querySelector('.next-page, [aria-label*="next" i]');
                const isNextDisabled = nextButton && (nextButton.disabled || nextButton.classList.contains('disabled') || 
                                                    nextButton.style.opacity === '0.4' || nextButton.getAttribute('aria-disabled') === 'true');
                
                // Also check pagination info
                const paginationInfo = Array.from(document.querySelectorAll('.text-gray-400')).find(el => 
                    el.textContent.includes('Page'));
                let isLastPage = false;
                if (paginationInfo) {
                    const match = paginationInfo.textContent.match(/Page (\d+) of (\d+)/);
                    if (match) {
                        const [, current, total] = match;
                        maxPages = Math.min(parseInt(total), 50); // Limit to 50 pages for safety
                        isLastPage = parseInt(current) >= parseInt(total);
                    }
                }
                
                if (!nextButton || isNextDisabled || isLastPage) {
                    break;
                }
                
                // Click next page
                nextButton.click();
                currentPage++;
                
                // Prevent infinite loop
                if (currentPage > maxPages) {
                    break;
                }
            }
            
            // Return to first page
            if (currentPage > 1) {
                console.log('🔄 Returning to first page...');
                // Look for pagination or try refreshing
                const firstPageButton = Array.from(document.querySelectorAll('button')).find(btn => 
                    btn.textContent.toLowerCase().includes('previous'));
                if (firstPageButton) {
                    // Click previous until disabled
                    for (let i = 0; i < currentPage; i++) {
                        const prevBtn = Array.from(document.querySelectorAll('button')).find(btn => 
                            btn.textContent.toLowerCase().includes('previous'));
                        if (prevBtn && !prevBtn.disabled) {
                            prevBtn.click();
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                    }
                }
                
                // Restore scroll position
                window.scrollTo(0, originalScrollY);
            }

            // We can't call extractMetrics() here as it would create an infinite loop
            // Instead, we'll get the tokens matched count from the UI directly
            const tokensMatchedDiv = Array.from(document.querySelectorAll('div.text-xl.font-bold')).find(div => {
                const label = div.parentElement.querySelector('div.text-xs.text-gray-400');
                return label && label.textContent.trim().toLowerCase() === 'tokens matched';
            });
            
            let totalTokensMatched = 0;
            if (tokensMatchedDiv) {
                const tokenMatch = tokensMatchedDiv.textContent.match(/(\d{1,3}(?:,\d{3})*)/);
                if (tokenMatch) {
                    totalTokensMatched = parseInt(tokenMatch[1].replace(/,/g, ''));
                }
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
    }

    // Helper function to extract runners from current page
    async function extractRunnersFromCurrentPage() {
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
                return { runnersCount: 0, totalValidTokens: 0 };
            }
            
            // Get all table rows and extract the TP Gain column cells
            const tableRows = Array.from(document.querySelectorAll('tbody tr'));
            let runnersCount = 0;
            
            // Filter out empty or invalid rows to get actual token count per page
            const validRows = tableRows.filter(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                return cells.length > tpGainColumnIndex && cells[tpGainColumnIndex].textContent.trim() !== '';
            });
            
            const tokensOnThisPage = validRows.length;
            
            for (const row of validRows) {
                const cells = Array.from(row.querySelectorAll('td'));
                if (cells.length <= tpGainColumnIndex) {
                    continue; // Skip rows that don't have enough columns
                }
                
                const tpGainCell = cells[tpGainColumnIndex];
                const textContent = (tpGainCell.textContent || '').trim();
                
                let isRunner = false;
                
                // Check for percentage format: +900%, +1000%, etc. (10x = +900%)
                const percentageMatches = textContent.match(/\+(\d+(?:\.\d+)?)%/gi);
                if (percentageMatches) {
                    for (const match of percentageMatches) {
                        const percentage = parseFloat(match.replace(/\+|%/g, ''));
                        // 10x gain = 900% gain (since 10x = 1000% of original, so gain is 900%)
                        if (percentage >= 900) {
                            isRunner = true;
                            break;
                        }
                    }
                }
                
                // Check for multiplier patterns: 10x, 11x, 120x, 10×, etc.
                if (!isRunner) {
                    const multiplierMatches = textContent.match(/(\d+(?:\.\d+)?)[x×]/gi);
                    if (multiplierMatches) {
                        for (const match of multiplierMatches) {
                            const multiplier = parseFloat(match.replace(/[x×]/gi, ''));
                            if (multiplier >= 10) {
                                isRunner = true;
                                break;
                            }
                        }
                    }
                }
                
                if (isRunner) {
                    runnersCount++;
                }
            }

            console.log(`📊 Page analysis complete: ${runnersCount}/${tokensOnThisPage} runners found`);

            return {
                runnersCount,
                tokensOnThisPage
            };
        } catch (error) {
            console.warn('⚠️ Failed to extract runners from current page:', error);
            return { runnersCount: 0, totalValidTokens: 0 };
        }
    }

    // ========================================
    // 📊 TABLE SORTING HELPER
    // ========================================
    async function sortByTPGain() {
        try {
            // Find the TP Gain column header
            const headers = Array.from(document.querySelectorAll('thead th'));
            let tpGainHeader = null;
            
            for (const header of headers) {
                const headerText = (header.textContent || '').trim().toLowerCase();
                if (headerText.includes('tp gain') || (headerText.includes('tp') && headerText.includes('gain'))) {
                    tpGainHeader = header;
                    break;
                }
            }
            
            if (!tpGainHeader) {
                return;
            }
            
            // Check if header is clickable (has a button or is clickable itself)
            let clickableElement = tpGainHeader.querySelector('button') || 
                                 tpGainHeader.querySelector('[role="button"]') ||
                                 tpGainHeader.querySelector('.cursor-pointer');
            
            if (!clickableElement && (tpGainHeader.style.cursor === 'pointer' || 
                                    tpGainHeader.classList.contains('cursor-pointer') ||
                                    tpGainHeader.onclick ||
                                    tpGainHeader.getAttribute('role') === 'button')) {
                clickableElement = tpGainHeader;
            }
            
            if (clickableElement) {
                clickableElement.click();
                
                // Wait a moment and check if we need to click again for descending order
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Look for sort indicators to see current sort direction
                const sortIndicator = tpGainHeader.querySelector('.sort-desc, [aria-sort="descending"], .fa-sort-down') ||
                                    tpGainHeader.textContent.includes('↓') || 
                                    tpGainHeader.textContent.includes('▼');
                
                if (!sortIndicator) {
                    console.log('📊 Clicking again to ensure descending order (highest gains first)...');
                    clickableElement.click();
                }
                
                console.log('✅ Table sorted by TP Gain (descending)');
            } else {
                console.warn('⚠️ TP Gain header does not appear to be clickable');
            }
        } catch (error) {
            console.warn('⚠️ Failed to sort by TP Gain:', error);
        }
    }

    // ========================================
    // 🎛️ PROGRESS BAR
    // ========================================
    let progressContainer = null;

    function createProgressBar() {
        if (progressContainer) {
            document.body.removeChild(progressContainer);
        }

        progressContainer = document.createElement('div');
        progressContainer.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 9999; 
            background: linear-gradient(145deg, #2a2a2a, #1a1a1a); 
            border: 2px solid #4a9eff; border-radius: 12px; padding: 20px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.5); min-width: 320px;
            color: white; font-family: Arial, sans-serif; font-size: 14px;
        `;

        progressContainer.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
                <div style="color: #4a9eff; font-size: 16px; font-weight: bold; margin-right: 10px;">🤖</div>
                <div style="color: #4a9eff; font-size: 14px; font-weight: bold;">
                    ${CONFIG.USE_RUNNERS_OPTIMIZATION ? 'RUNNERS % → PnL % Hybrid Optimizer' : 'Advanced Optimizer'}
                </div>
                ${CONFIG.USE_RUNNERS_OPTIMIZATION ? 
                    '<div style="background: #e74c3c; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-left: 8px;">EXPERIMENTAL</div>' : ''}
                <button id="stopOptimization" style="
                    background: #e74c3c; color: white; border: none; padding: 4px 8px; 
                    border-radius: 4px; margin-left: auto; cursor: pointer; font-size: 11px;">
                    ⏹️ Stop
                </button>
            </div>
            
            ${CONFIG.USE_RUNNERS_OPTIMIZATION ? 
            '<div style="margin-bottom: 12px; padding: 8px; background: rgba(74, 158, 255, 0.1); border-radius: 6px;">' +
                '<label style="display: flex; align-items: center; cursor: pointer; font-size: 12px; color: #ccc;">' +
                    '<input type="checkbox" id="hybridModeToggle" ' + (CONFIG.RUNNERS_PNL_HYBRID_MODE ? 'checked' : '') + 
                           ' style="margin-right: 8px; accent-color: #4a9eff;">' +
                    '<span style="flex: 1;">Enable Hybrid Mode (RUNNERS % → PnL % optimization)</span>' +
                '</label>' +
                '<div style="font-size: 10px; color: #888; margin-top: 4px; margin-left: 20px;">' +
                    'Phase 1: Find optimal runners %, Phase 2: Maximize PnL % at that runners level' +
                '</div>' +
            '</div>' : ''}
            
            <div id="currentStatus" style="color: #ccc; margin-bottom: 10px; font-size: 12px;">
                Initializing...
            </div>
            
            <div style="background: #333; border-radius: 6px; padding: 2px; margin-bottom: 12px;">
                <div id="progressBar" style="
                    background: linear-gradient(90deg, #4a9eff, #2980b9); 
                    height: 6px; border-radius: 4px; width: 0%; 
                    transition: width 0.3s ease;">
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px;">
                <div style="color: #888;">Best Score:</div>
                <div id="bestScore" style="color: #27ae60; font-weight: bold;">--%</div>
                
                <div style="color: #888;">Tests:</div>
                <div id="testsRun" style="color: #f39c12; font-weight: bold;">0</div>
                
                <div style="color: #888;">Tokens:</div>
                <div id="tokensFound" style="color: #9b59b6; font-weight: bold;">--</div>
                
                <div style="color: #888;">Runtime:</div>
                <div id="runtime" style="color: #e67e22; font-weight: bold;">0:00</div>
            </div>
        `;

        document.body.appendChild(progressContainer);

        // Add stop button functionality
        document.getElementById('stopOptimization').onclick = () => {
            STOPPED = true;
            updateProgress('🛑 Stopping...', 100, '--', 0, '--');
        };

        // Add hybrid mode toggle functionality (only if runners optimization is enabled)
        if (CONFIG.USE_RUNNERS_OPTIMIZATION) {
            const hybridToggle = document.getElementById('hybridModeToggle');
            if (hybridToggle) {
                hybridToggle.onchange = (e) => {
                    CONFIG.RUNNERS_PNL_HYBRID_MODE = e.target.checked;
                    console.log(`🔄 Hybrid Mode ${CONFIG.RUNNERS_PNL_HYBRID_MODE ? 'ENABLED' : 'DISABLED'}: ${CONFIG.RUNNERS_PNL_HYBRID_MODE ? 'Will transition to PnL optimization after finding optimal runners %' : 'Will only optimize runners %'}`);
                    
                    // Update the title to reflect the current mode
                    const titleElements = progressContainer.querySelectorAll('div[style*="color: #4a9eff"]');
                    const titleElement = Array.from(titleElements).find(el => el.textContent.includes('Optimizer'));
                    if (titleElement) {
                        titleElement.textContent = CONFIG.RUNNERS_PNL_HYBRID_MODE ? 'RUNNERS % → PnL % Hybrid Optimizer' : 'RUNNERS % Optimizer';
                    }
                };
            }
        }

        return progressContainer;
    }

    function updateProgress(status, progress, bestScore, tests, tokens, startTime = null) {
        if (!progressContainer) return;

        const progressBar = document.getElementById('progressBar');
        const currentStatus = document.getElementById('currentStatus');
        const bestScoreEl = document.getElementById('bestScore');
        const testsRunEl = document.getElementById('testsRun');
        const tokensFoundEl = document.getElementById('tokensFound');
        const runtimeEl = document.getElementById('runtime');

        if (progressBar) progressBar.style.width = `${Math.min(progress, 100)}%`;
        if (currentStatus) currentStatus.textContent = status;
        if (bestScoreEl) bestScoreEl.textContent = `${bestScore}%`;
        if (testsRunEl) testsRunEl.textContent = tests;
        if (tokensFoundEl) tokensFoundEl.textContent = tokens;

        if (runtimeEl && startTime) {
            const runtimeSeconds = Math.floor((Date.now() - startTime) / 1000);
            const minutes = Math.floor(runtimeSeconds / 60);
            const seconds = runtimeSeconds % 60;
            runtimeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    function removeProgressBar() {
        if (progressContainer) {
            document.body.removeChild(progressContainer);
            progressContainer = null;
        }
    }

    // ========================================
    // 🧠 ADVANCED OPTIMIZATION CLASSES
    // ========================================
    
    // Config Caching System
    class ConfigCache {
        constructor() {
            this.cache = new Map();
        }
        
        generateKey(config) {
            // Create a deterministic string representation by sorting all keys recursively
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
            return this.cache.get(this.generateKey(config));
        }
        
        set(config, result) {
            this.cache.set(this.generateKey(config), result);
        }
        
        size() {
            return this.cache.size;
        }
        
        clear() {
            this.cache.clear();
        }
    }
    
    // Parameter Impact Analysis
    class ParameterImpactAnalyzer {
        constructor(optimizer) {
            this.optimizer = optimizer;
            this.parameterImpacts = new Map();
        }
        
        async analyzeParameterImpacts() {
            updateProgress('🔍 Analyzing parameter impacts...', 20, this.optimizer.getCurrentBestScore().toFixed(1), this.optimizer.testCount, this.optimizer.bestMetrics ? this.optimizer.bestMetrics.tokensMatched : '--', this.optimizer.startTime);
            
            const baselineScore = this.optimizer.getCurrentBestScore();
            const impactResults = [];
            
            for (const paramTest of this.optimizer.parameterTests) {
                if (STOPPED || this.optimizer.getRemainingTime() <= 0.7) break;
                
                const { param, section } = paramTest;
                const variations = this.optimizer.generateVariation(this.optimizer.getCurrentBestConfig(), param, section);
                if (!variations || variations.length === 0) continue;
                
                let maxImpact = 0;
                let testCount = 0;
                
                // Test first 2 variations to measure impact
                for (let i = 0; i < Math.min(2, variations.length); i++) {
                    if (STOPPED || this.optimizer.getRemainingTime() <= 0.7) break;
                    
                    const variation = variations[i];
                    const result = await this.optimizer.testConfig(variation.config, `Impact test: ${variation.name}`);
                    
                    if (result.success && result.metrics) {
                        // Calculate impact based on optimization phase
                        let currentMetric;
                        if (this.optimizer.optimizationPhase === 'RUNNERS') {
                            currentMetric = result.metrics.runnersPercentage || 0;
                        } else {
                            currentMetric = result.metrics.tpPnlPercent;
                        }
                        const impact = Math.abs(currentMetric - baselineScore);
                        maxImpact = Math.max(maxImpact, impact);
                        testCount++;
                    }
                }
                
                if (testCount > 0) {
                    this.parameterImpacts.set(param, maxImpact);
                    impactResults.push({ param, section, impact: maxImpact });
                }
                
                // Restore best config after each test
                await this.optimizer.ui.applyConfig(this.optimizer.getCurrentBestConfig(), true);
            }
            
            // Sort by impact (highest first)
            impactResults.sort((a, b) => b.impact - a.impact);
            
            // Update parameter test order based on measured impact
            this.optimizer.parameterTests = impactResults.map(result => ({
                param: result.param,
                section: result.section,
                impact: result.impact
            }));
            
            console.log('Parameter Impact Analysis:', impactResults);
            return impactResults;
        }
        
        getParameterImpact(param) {
            return this.parameterImpacts.get(param) || 0;
        }
    }
    
    // Genetic Algorithm Implementation
    class GeneticOptimizer {
        constructor(optimizer) {
            this.optimizer = optimizer; // Always set the optimizer reference first
            
            if (CONFIG.USE_RUNNERS_OPTIMIZATION) {
                this.populationSize = 10;
                this.mutationRate = 0.4;
                this.crossoverRate = 0.8;
                this.eliteCount = 3;
            } else {
                this.populationSize = 7;
                this.mutationRate = 0.3;
                this.crossoverRate = 0.7;
                this.eliteCount = 2;
            }
        }
        
        async runGeneticOptimization() {
            updateProgress('🧬 Genetic Algorithm Phase', 50, this.optimizer.getCurrentBestScore().toFixed(1), this.optimizer.testCount, this.optimizer.bestMetrics ? this.optimizer.bestMetrics.tokensMatched : '--', this.optimizer.startTime);
            
            // Initialize population with current best + variations
            let population = await this.initializePopulation();
            
            const generations = Math.min(5, Math.floor(this.optimizer.getRemainingTime() * 20));
            
            for (let generation = 0; generation < generations; generation++) {
                if (STOPPED || this.optimizer.getRemainingTime() <= 0.2) break;
                
                updateProgress(`🧬 Generation ${generation + 1}/${generations}`, 
                    50 + (generation / generations) * 30, 
                    this.optimizer.getCurrentBestScore().toFixed(1), 
                    this.optimizer.testCount, 
                    this.optimizer.bestMetrics ? this.optimizer.bestMetrics.tokensMatched : '--', 
                    this.optimizer.startTime);
                
                // Evaluate population
                const evaluatedPopulation = await this.evaluatePopulation(population);
                
                // Selection, crossover, and mutation
                population = await this.evolvePopulation(evaluatedPopulation);
                
                // Early termination if target achieved (only check for PnL modes)
                if (this.optimizer.optimizationPhase !== 'RUNNERS' && this.optimizer.getCurrentBestScore() >= CONFIG.TARGET_PNL) {
                    break;
                }
            }
        }
        
        async initializePopulation() {
            const population = [];
            
            // Add current best config
            population.push(deepClone(this.optimizer.getCurrentBestConfig()));
            
            // Add variations of best config
            for (let i = 1; i < this.populationSize; i++) {
                const config = deepClone(this.optimizer.getCurrentBestConfig());
                this.mutateConfig(config, 0.5); // Higher mutation rate for initialization
                population.push(config);
            }
            
            return population;
        }
        
        async evaluatePopulation(population) {
            const evaluatedPop = [];
            
            for (const config of population) {
                if (STOPPED || this.optimizer.getRemainingTime() <= 0.2) break;
                
                const result = await this.optimizer.testConfig(config, 'Genetic eval');
                let fitness = -Infinity;
                if (result.success) {
                    // Use appropriate metric based on optimization phase
                    if (this.optimizer.optimizationPhase === 'RUNNERS') {
                        fitness = result.metrics.runnersPercentage || 0;
                    } else {
                        fitness = result.metrics.tpPnlPercent;
                    }
                }
                
                evaluatedPop.push({ config, fitness });
            }
            
            // Sort by fitness (descending)
            evaluatedPop.sort((a, b) => b.fitness - a.fitness);
            return evaluatedPop;
        }
        
        async evolvePopulation(evaluatedPop) {
            const newPopulation = [];
            
            // Elitism: keep best individuals
            for (let i = 0; i < this.eliteCount; i++) {
                if (evaluatedPop[i]) {
                    newPopulation.push(deepClone(evaluatedPop[i].config));
                }
            }
            
            // Generate offspring
            while (newPopulation.length < this.populationSize) {
                const parent1 = this.selectParent(evaluatedPop);
                const parent2 = this.selectParent(evaluatedPop);
                
                let offspring = Math.random() < this.crossoverRate ? 
                    this.crossover(parent1, parent2) : 
                    deepClone(parent1);
                
                if (Math.random() < this.mutationRate) {
                    this.mutateConfig(offspring, 0.2);
                }
                
                newPopulation.push(offspring);
            }
            
            return newPopulation;
        }
        
        selectParent(evaluatedPop) {
            // Tournament selection
            const tournamentSize = 3;
            let best = evaluatedPop[Math.floor(Math.random() * evaluatedPop.length)];
            
            for (let i = 1; i < tournamentSize; i++) {
                const candidate = evaluatedPop[Math.floor(Math.random() * evaluatedPop.length)];
                if (candidate.fitness > best.fitness) {
                    best = candidate;
                }
            }
            
            return best.config;
        }
        
        crossover(parent1, parent2) {
            const offspring = deepClone(parent1);
            
            // Crossover at section level
            const sections = Object.keys(offspring);
            const crossoverPoint = Math.floor(Math.random() * sections.length);
            
            for (let i = crossoverPoint; i < sections.length; i++) {
                const section = sections[i];
                offspring[section] = deepClone(parent2[section]);
            }
            
            return offspring;
        }
        
        mutateConfig(config, mutationRate) {
            for (const [section, params] of Object.entries(config)) {
                for (const [param, value] of Object.entries(params)) {
                    if (Math.random() < mutationRate && value !== undefined) {
                        const rules = PARAM_RULES[param];
                        if (rules) {
                            if (rules.type === 'string') {
                                config[section][param] = Math.floor(Math.random() * 10 + 1).toString();
                            } else {
                                const range = rules.max - rules.min;
                                const noise = (Math.random() - 0.5) * range * 0.2;
                                const newValue = Math.max(rules.min, Math.min(rules.max, value + noise));
                                config[section][param] = Math.round(newValue / rules.step) * rules.step;
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Simulated Annealing
    class SimulatedAnnealing {
        constructor(optimizer) {
            this.optimizer = optimizer;
            this.initialTemperature = 100;
            this.finalTemperature = 1;
            this.coolingRate = 0.95;
        }
        
        async runSimulatedAnnealing() {
            updateProgress('🔥 Simulated Annealing Phase', 80, this.optimizer.getCurrentBestScore().toFixed(1), this.optimizer.testCount, this.optimizer.bestMetrics ? this.optimizer.bestMetrics.tokensMatched : '--', this.optimizer.startTime);
            
            let currentConfig = deepClone(this.optimizer.getCurrentBestConfig());
            let currentScore = this.optimizer.getCurrentBestScore();
            let temperature = this.initialTemperature;
            
            while (temperature > this.finalTemperature && this.optimizer.getRemainingTime() > 0.05 && !STOPPED) {
                // Generate neighbor configuration
                const neighbor = this.generateNeighbor(currentConfig);
                const result = await this.optimizer.testConfig(neighbor, 'Simulated annealing');
                
                if (result.success && result.metrics) {
                    // Use appropriate metric based on optimization phase
                    let neighborScore;
                    if (this.optimizer.optimizationPhase === 'RUNNERS') {
                        neighborScore = result.metrics.runnersPercentage || 0;
                    } else {
                        neighborScore = result.metrics.tpPnlPercent;
                    }
                    const deltaE = neighborScore - currentScore;
                    
                    // Accept if better, or with probability if worse
                    if (deltaE > 0 || Math.random() < Math.exp(deltaE / temperature)) {
                        currentConfig = neighbor;
                        currentScore = neighborScore;
                        
                        updateProgress(`🔥 Annealing T=${temperature.toFixed(1)}`, 
                            80 + (1 - temperature / this.initialTemperature) * 15, 
                            this.optimizer.getCurrentBestScore().toFixed(1), 
                            this.optimizer.testCount, 
                            this.optimizer.bestMetrics ? this.optimizer.bestMetrics.tokensMatched : '--', 
                            this.optimizer.startTime);
                    }
                }
                
                temperature *= this.coolingRate;
                
                // Early termination if target achieved (only check for PnL modes)
                if (this.optimizer.optimizationPhase !== 'RUNNERS' && this.optimizer.getCurrentBestScore() >= CONFIG.TARGET_PNL) {
                    break;
                }
            }
        }
        
        generateNeighbor(config) {
            const neighbor = deepClone(config);
            
            // Randomly modify 1-2 parameters
            const paramList = Object.keys(PARAM_RULES);
            const numModifications = Math.floor(Math.random() * 2) + 1;
            
            for (let i = 0; i < numModifications; i++) {
                const param = paramList[Math.floor(Math.random() * paramList.length)];
                const section = this.optimizer.getSection(param);
                const rules = PARAM_RULES[param];
                
                if (rules) {
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
    
    // Adaptive Step Size Manager
    class AdaptiveStepManager {
        constructor() {
            this.stepSizes = new Map();
            this.successCounts = new Map();
            this.attemptCounts = new Map();
        }
        
        getStepSize(param) {
            const baseStep = PARAM_RULES[param]?.step || 1;
            const customStep = this.stepSizes.get(param);
            
            if (customStep !== undefined) {
                return customStep;
            }
            
            return baseStep;
        }
        
        updateStepSize(param, success) {
            const current = this.stepSizes.get(param) || PARAM_RULES[param]?.step || 1;
            const successCount = this.successCounts.get(param) || 0;
            const attemptCount = this.attemptCounts.get(param) || 0;
            
            if (success) {
                this.successCounts.set(param, successCount + 1);
            }
            this.attemptCounts.set(param, attemptCount + 1);
            
            // Adjust step size based on success rate
            const successRate = this.successCounts.get(param) / this.attemptCounts.get(param);
            const rules = PARAM_RULES[param];
            
            if (rules) {
                if (successRate > 0.3) {
                    // Increase step size if successful
                    const newStep = Math.min(rules.step * 2, (rules.max - rules.min) * 0.1);
                    this.stepSizes.set(param, newStep);
                } else if (successRate < 0.1) {
                    // Decrease step size if unsuccessful
                    const newStep = Math.max(rules.step * 0.5, rules.step);
                    this.stepSizes.set(param, newStep);
                }
            }
        }
    }
    
    // Latin Hypercube Sampling for Enhanced Variation Generation
    class LatinHypercubeSampler {
        constructor() {
            this.samples = new Map();
        }
        
        generateSamples(parameters, numSamples) {
            const samples = [];
            
            for (let i = 0; i < numSamples; i++) {
                const sample = {};
                
                for (const param of parameters) {
                    const rules = PARAM_RULES[param];
                    if (rules) {
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

    // Enhanced Optimizer with all improvements
    class SimpleOptimizer {
        constructor() {
            this.ui = new UIController();
            this.bestConfig = null;
            this.bestScore = 0;
            this.bestMetrics = null;
            this.testCount = 0;
            this.history = [];
            
            // Hybrid optimization state
            this.optimizationPhase = CONFIG.USE_RUNNERS_OPTIMIZATION ? 'RUNNERS' : 'PNL';
            this.targetRunnersPercentage = null; // Set after phase 1 completes
            
            // Separate tracking for different optimization modes
            this.bestRunnersPercentage = 0;  // Best runners % found
            this.bestPnlPercentage = 0;      // Best PnL % found
            this.bestRunnersConfig = null;   // Config that achieved best runners %
            this.bestPnlConfig = null;       // Config that achieved best PnL %
            
            // Advanced optimization components
            this.configCache = new ConfigCache();
            this.impactAnalyzer = new ParameterImpactAnalyzer(this);
            this.geneticOptimizer = new GeneticOptimizer(this);
            this.simulatedAnnealing = new SimulatedAnnealing(this);
            this.adaptiveStepManager = new AdaptiveStepManager();
            this.latinSampler = new LatinHypercubeSampler();

            // Data-driven parameter order (will be updated by impact analysis)
            this.parameterTests = [
                { param: 'Max Unique Wallets', section: 'wallets', impact: 45.5 },
                { param: 'Max KYC Wallets', section: 'wallets', impact: 44.5 },
                { param: 'Min Bundled %', section: 'risk', impact: 44.5 },
                { param: 'Min Unique Wallets', section: 'wallets', impact: 40.5 },
                { param: 'Min KYC Wallets', section: 'wallets', impact: 40.0 },
                { param: 'Min AG Score', section: 'tokenDetails', impact: 38.0 },
                { param: 'Min MCAP (USD)', section: 'basic', impact: 33.0 },
                { param: 'Min Deployer Age (min)', section: 'tokenDetails', impact: 26.0 },
                { param: 'Max Token Age (min)', section: 'tokenDetails', impact: 21.5 },
                { param: 'Max MCAP (USD)', section: 'basic', impact: 15.0 },
            ];
        }

        async establishBaseline() {
            updateProgress('📊 Testing baseline...', 5, '--', 0, '--', this.startTime);

            // Use current UI state as baseline if CONFIG.BASELINE is empty
            let baselineConfig = CONFIG.BASELINE;
            const hasBaselineConfig = Object.keys(baselineConfig).length > 0 && 
                                     Object.values(baselineConfig).some(section => 
                                         Object.keys(section).length > 0);
            
            if (!hasBaselineConfig) {
                updateProgress('📋 Reading current config...', 7, '--', 0, '--', this.startTime);
                baselineConfig = await this.ui.getCurrentConfig();
                updateProgress('✅ Current config captured', 8, '--', 0, '--', this.startTime);
            }

            // Ensure baseline config is complete
            const completeBaseline = ensureCompleteConfig(baselineConfig);

            await this.ui.applyConfig(completeBaseline, true); // Clear first for clean baseline
            updateProgress('⏳ Waiting for results...', 10, '--', 0, '--', this.startTime);
            await sleep(CONFIG.BACKTEST_WAIT);

            const metrics = await extractMetrics();
            if (!metrics) {
                throw new Error("Failed to extract metrics - check if backtest page is loaded");
            }

            if (metrics.tpPnlPercent === undefined) {
                throw new Error("TP PnL % not found - make sure backtest has completed");
            }

            if (metrics.tokensMatched < CONFIG.MIN_TOKENS) {
                throw new Error(`Insufficient tokens matched (${metrics.tokensMatched} < ${CONFIG.MIN_TOKENS}) - try adjusting baseline config`);
            }

            this.bestConfig = completeBaseline;
            this.bestMetrics = metrics;
            
            // Set baseline values for both tracking systems
            this.bestRunnersPercentage = metrics.runnersPercentage || 0;
            this.bestPnlPercentage = metrics.tpPnlPercent;
            this.bestRunnersConfig = deepClone(completeBaseline);
            this.bestPnlConfig = deepClone(completeBaseline);
            
            if (CONFIG.USE_RUNNERS_OPTIMIZATION) {
                // RUNNERS % optimization mode - HIGHER percentage is BETTER
                this.bestScore = this.bestRunnersPercentage;
                console.log(`🎯 Baseline RUNNERS %: ${this.bestScore.toFixed(1)}% (${metrics.runnersCount}/${metrics.tokensMatched} runners)`);
            } else {
                // Traditional PnL % optimization mode
                this.bestScore = this.bestPnlPercentage;
            }
            
            this.bestMetrics = metrics;
            this.testCount = 1;

            updateProgress('✅ Baseline established', 15, this.bestScore.toFixed(1), 1, metrics.tokensMatched, this.startTime);
            return true;
        }

        // Helper method to get the appropriate best score for current optimization phase
        getCurrentBestScore() {
            switch (this.optimizationPhase) {
                case 'RUNNERS':
                    return this.bestRunnersPercentage || 0;
                case 'PNL_HYBRID':
                    return this.bestPnlPercentage || 0;
                default:
                    return this.bestPnlPercentage || 0; // Traditional PnL mode
            }
        }

        // Helper method to get the appropriate best config for current optimization phase
        getCurrentBestConfig() {
            switch (this.optimizationPhase) {
                case 'RUNNERS':
                    return this.bestRunnersConfig || this.bestConfig;
                case 'PNL_HYBRID':
                    return this.bestPnlConfig || this.bestConfig;
                default:
                    return this.bestPnlConfig || this.bestConfig; // Traditional PnL mode
            }
        }

        async testConfig(config, testName) {
            if (STOPPED) return { success: false };

            try {
                // Ensure config is complete before applying
                const completeConfig = ensureCompleteConfig(config);
                
                // Check cache first (if enabled)
                if (CONFIG.USE_CONFIG_CACHING && this.configCache.has(completeConfig)) {
                    const cachedResult = this.configCache.get(completeConfig);
                    console.log(`💾 Cache hit for: ${testName} (cached result: ${cachedResult.success ? 'success' : 'failed'})`);
                    return cachedResult;
                }
                
                await this.ui.applyConfig(completeConfig, true); // Clear first to avoid accumulation
                await sleep(CONFIG.BACKTEST_WAIT);

                const metrics = await extractMetrics();
                if (!metrics) {
                    // Restore best config if test failed
                    await this.ui.applyConfig(this.bestConfig);
                    const result = { success: false };
                    if (CONFIG.USE_CONFIG_CACHING) {
                        this.configCache.set(completeConfig, result);
                        console.log(`💾 Cached failed result (no metrics) for: ${testName}`);
                    }
                    return result;
                }

                if (metrics.tpPnlPercent === undefined || metrics.tokensMatched < CONFIG.MIN_TOKENS) {
                    // Restore best config if insufficient tokens
                    await this.ui.applyConfig(this.bestConfig);
                    const result = { success: false };
                    if (CONFIG.USE_CONFIG_CACHING) {
                        this.configCache.set(completeConfig, result);
                        console.log(`💾 Cached failed result (insufficient tokens: ${metrics.tokensMatched}) for: ${testName}`);
                    }
                    return result;
                }

                // Calculate improvement based on optimization mode and phase
                let improvement, currentScore, optimizationMetric;
                
                if (this.optimizationPhase === 'RUNNERS') {
                    // Phase 1: RUNNERS % optimization mode with selectivity penalty
                    currentScore = metrics.runnersPercentage || 0;
                    improvement = currentScore - this.bestRunnersPercentage; // Use dedicated runners tracking
                    optimizationMetric = 'RUNNERS %';
                    
                    // Apply selectivity penalty for having too many tokens
                    const targetTokenCount = 200; // Target: keep configs under 200 tokens for selectivity
                    const maxTokenCount = 500; // Penalty starts ramping up after this
                    
                    let selectivityPenalty = 0;
                    if (metrics.tokensMatched > targetTokenCount) {
                        // Calculate penalty based on how far over the target we are
                        const excessTokens = metrics.tokensMatched - targetTokenCount;
                        const penaltyRange = maxTokenCount - targetTokenCount;
                        
                        // Exponential penalty: starts small but grows rapidly
                        const penaltyFactor = Math.min(excessTokens / penaltyRange, 2); // Cap at 2x
                        selectivityPenalty = Math.pow(penaltyFactor, 2) * 10; // Penalty up to 40 percentage points
                        
                        console.log(`⚠️ Selectivity penalty: -${selectivityPenalty.toFixed(1)}% for ${metrics.tokensMatched} tokens (target: ${targetTokenCount})`);
                    }
                    
                    // Apply penalty to improvement calculation
                    improvement -= selectivityPenalty;
                    
                    console.log(`🎯 RUNNERS % Mode: ${currentScore.toFixed(1)}% (${metrics.runnersCount}/${metrics.tokensMatched} runners) vs best ${this.bestRunnersPercentage.toFixed(1)}%`);
                    console.log(`📊 Selectivity-adjusted improvement: ${improvement.toFixed(1)}% (penalty: -${selectivityPenalty.toFixed(1)}%)`);
                    
                } else if (this.optimizationPhase === 'PNL_HYBRID') {
                    // Phase 2: PnL % optimization while maintaining target runners %
                    const runnersPercentage = metrics.runnersPercentage || 0;
                    const runnersVariance = Math.abs(runnersPercentage - this.targetRunnersPercentage);
                    
                    // Check if runners % is within acceptable tolerance
                    if (runnersVariance <= CONFIG.RUNNERS_PERCENTAGE_TOLERANCE) {
                        // Within tolerance - optimize for PnL %
                        currentScore = metrics.tpPnlPercent;
                        improvement = currentScore - this.bestPnlPercentage; // Use dedicated PnL tracking
                        optimizationMetric = 'PnL % (Hybrid)';
                        
                        console.log(`🎯 PnL Hybrid Mode: ${currentScore.toFixed(1)}% PnL, ${runnersPercentage.toFixed(1)}% runners (target: ${this.targetRunnersPercentage.toFixed(1)}% ±${CONFIG.RUNNERS_PERCENTAGE_TOLERANCE}%)`);
                    } else {
                        // Outside tolerance - reject this config
                        console.log(`❌ Runners % out of tolerance: ${runnersPercentage.toFixed(1)}% (target: ${this.targetRunnersPercentage.toFixed(1)}% ±${CONFIG.RUNNERS_PERCENTAGE_TOLERANCE}%)`);
                        
                        // Restore best config and return failure
                        await this.ui.applyConfig(this.getCurrentBestConfig());
                        const result = { success: false, outOfTolerance: true };
                        if (CONFIG.USE_CONFIG_CACHING) {
                            this.configCache.set(completeConfig, result);
                            console.log(`💾 Cached out-of-tolerance result for: ${testName}`);
                        }
                        return result;
                    }
                } else {
                    // Traditional PnL % optimization mode
                    currentScore = metrics.tpPnlPercent;
                    improvement = currentScore - this.bestPnlPercentage; // Use dedicated PnL tracking
                    optimizationMetric = 'PnL %';
                }

                this.testCount++;

                updateProgress(`Testing: ${testName}`, this.getProgress(), this.getCurrentBestScore().toFixed(1), this.testCount, this.bestMetrics ? this.bestMetrics.tokensMatched : '--', this.startTime);

                // Dynamic improvement threshold based on optimization mode and phase
                const improvementThreshold = this.optimizationPhase === 'RUNNERS' ? 
                    Math.max(0.1, this.bestRunnersPercentage * 0.01) : // Use dedicated runners tracking
                    (this.optimizationPhase === 'PNL_HYBRID' ? 0.5 : 1); // Moderate threshold for hybrid mode, standard for pure PnL
                    
                const success = improvement > improvementThreshold;
                
                if (success) {
                    // Always update both tracking systems when we have the data
                    if (metrics.runnersPercentage !== undefined) {
                        // Update runners tracking if we have runners data
                        if (this.optimizationPhase === 'RUNNERS' || metrics.runnersPercentage > this.bestRunnersPercentage) {
                            this.bestRunnersPercentage = metrics.runnersPercentage;
                            this.bestRunnersConfig = deepClone(completeConfig);
                        }
                    }
                    
                    if (metrics.tpPnlPercent !== undefined) {
                        // Update PnL tracking if we have PnL data
                        if (this.optimizationPhase !== 'RUNNERS' || metrics.tpPnlPercent > this.bestPnlPercentage) {
                            this.bestPnlPercentage = metrics.tpPnlPercent;
                            this.bestPnlConfig = deepClone(completeConfig);
                        }
                    }
                    
                    // Update primary tracking based on optimization phase
                    if (this.optimizationPhase === 'RUNNERS') {
                        this.bestScore = currentScore; // Keep bestScore in sync for display
                    } else if (this.optimizationPhase === 'PNL_HYBRID') {
                        this.bestScore = currentScore; // Keep bestScore in sync for display
                    } else {
                        // Traditional PnL mode
                        this.bestScore = currentScore; // Keep bestScore in sync for display
                    }
                    
                    // Always update general tracking
                    this.bestConfig = completeConfig;
                    this.bestMetrics = metrics;
                    this.history.push({ testName, score: currentScore, improvement });
                    
                    const displayMetric = this.optimizationPhase === 'RUNNERS' ? 
                        `${currentScore.toFixed(1)}% runners (${metrics.tokensMatched} tokens)` : 
                        (this.optimizationPhase === 'PNL_HYBRID' ? 
                            `${currentScore.toFixed(1)}% PnL (${metrics.runnersPercentage.toFixed(1)}% runners)` :
                            `${currentScore.toFixed(1)}%`);
                    
                    const improvementDisplay = this.optimizationPhase === 'RUNNERS' ? 
                        `+${improvement.toFixed(1)}% (selectivity-adjusted)` :
                        `+${improvement.toFixed(1)}%`;
                    
                    updateProgress(`🏆 New best (${optimizationMetric}): ${testName}`, this.getProgress(), this.bestScore.toFixed(1), this.testCount, metrics.tokensMatched, this.startTime);
                    console.log(`🏆 New best ${optimizationMetric}: ${displayMetric} (improvement: ${improvementDisplay})`);
                } else {
                    // Restore best config if no improvement
                    await this.ui.applyConfig(this.getCurrentBestConfig());
                    updateProgress(`↩️ Restored best config`, this.getProgress(), this.getCurrentBestScore().toFixed(1), this.testCount, this.bestMetrics ? this.bestMetrics.tokensMatched : '--', this.startTime);
                }

                const result = { success: true, metrics, improvement };
                if (CONFIG.USE_CONFIG_CACHING) {
                    this.configCache.set(completeConfig, result);
                    console.log(`💾 Cached result for: ${testName} (success: ${result.success}, ${optimizationMetric}: ${currentScore.toFixed(1)})`);
                }
                return result;
            } catch (error) {
                // Restore best config on error
                await this.ui.applyConfig(this.getCurrentBestConfig());
                const result = { success: false };
                if (CONFIG.USE_CONFIG_CACHING) {
                    this.configCache.set(completeConfig, result);
                    console.log(`💾 Cached failed result for: ${testName}`);
                }
                return result;
            }
        }

        getProgress() {
            // Time-based progress calculation
            const timeProgress = this.getTimeProgress();
            const testProgress = Math.min(15 + (this.testCount * 2), 90);
            return Math.max(timeProgress, testProgress);
        }

        getRemainingTime() {
            // Returns fraction of time remaining (0.0 to 1.0)
            const maxRuntimeMs = CONFIG.MAX_RUNTIME_MIN * 60 * 1000;
            const elapsed = Date.now() - this.startTime;
            const remaining = Math.max(0, maxRuntimeMs - elapsed);
            return remaining / maxRuntimeMs;
        }

        getTimeProgress() {
            // Returns time progress as percentage (0 to 100)
            return Math.min(100, (1 - this.getRemainingTime()) * 100);
        }

        generateVariation(baseConfig, param, section) {
            const rules = PARAM_RULES[param];
            if (!rules) return null;

            const config = deepClone(baseConfig);
            const currentValue = config[section][param];

            // Use adaptive step size if enabled and available
            const adaptiveStep = CONFIG.USE_ADAPTIVE_STEP_SIZES ? 
                this.adaptiveStepManager.getStepSize(param) : 
                (rules.step || 1);
            
            // Generate smart variations
            const variations = [];

            if (rules.type === 'string') {
                // For AG Score
                const current = parseInt(currentValue || '1');
                for (let i = Math.max(1, current - 2); i <= Math.min(10, current + 2); i++) {
                    if (i !== current) variations.push(i.toString());
                }
            } else {
                // For numeric values
                const current = currentValue || (rules.min + rules.max) / 2;
                const range = rules.max - rules.min;

                [
                    Math.max(rules.min, current - adaptiveStep * 2),
                    Math.max(rules.min, current - adaptiveStep),
                    Math.min(rules.max, current + adaptiveStep),
                    Math.min(rules.max, current + adaptiveStep * 2),
                    rules.min,
                    rules.max,
                    Math.floor(rules.min + range * 0.25),
                    Math.floor(rules.min + range * 0.75)
                ].forEach(val => {
                    if (val !== current && !variations.includes(val)) {
                        variations.push(val);
                    }
                });
            }

            return variations.slice(0, 4).map(val => {
                const newConfig = deepClone(config);
                // Force integer rounding for specific parameters
                if (param.includes('Wallets') || param.includes('Count') || param.includes('Age')) {
                    val = Math.round(val);
                }

                newConfig[section][param] = val;
                return { config: newConfig, name: `${param}: ${val}` };
            });
        }

        // Enhanced variation generation using Latin Hypercube Sampling
        generateLatinHypercubeVariations(baseConfig, parameters, numSamples = 6) {
            const samples = this.latinSampler.generateSamples(parameters, numSamples);
            const variations = [];
            
            for (const sample of samples) {
                const config = deepClone(baseConfig);
                let name = 'LHS: ';
                
                for (const [param, value] of Object.entries(sample)) {
                    const section = this.getSection(param);
                    config[section][param] = value;
                    name += `${param}=${value} `;
                }
                
                variations.push({ config, name: name.trim() });
            }
            
            return variations;
        }

        // Generate correlated parameter variations (e.g., Min/Max MCAP together)
        generateCorrelatedVariations(baseConfig) {
            const variations = [];
            
            // MCAP correlation
            const mcapRanges = [
                { min: 1000, max: 15000 },
                { min: 5000, max: 25000 },
                { min: 10000, max: 40000 },
                { min: 3000, max: 20000 }
            ];
            
            for (const range of mcapRanges) {
                const config = deepClone(baseConfig);
                config.basic["Min MCAP (USD)"] = range.min;
                config.basic["Max MCAP (USD)"] = range.max;
                variations.push({ 
                    config, 
                    name: `MCAP Range: ${range.min}-${range.max}` 
                });
            }
            
            // Wallet correlation
            const walletRanges = [
                { minUnique: 1, maxUnique: 3, minKyc: 1, maxKyc: 3 },
                { minUnique: 0, maxUnique: 2, minKyc: 0, maxKyc: 2 },
                { minUnique: 2, maxUnique: 5, minKyc: 2, maxKyc: 5 },
                { minUnique: 1, maxUnique: 4, minKyc: 1, maxKyc: 4 }
            ];
            
            for (const range of walletRanges) {
                const config = deepClone(baseConfig);
                config.wallets["Min Unique Wallets"] = range.minUnique;
                config.wallets["Max Unique Wallets"] = range.maxUnique;
                config.wallets["Min KYC Wallets"] = range.minKyc;
                config.wallets["Max KYC Wallets"] = range.maxKyc;
                variations.push({ 
                    config, 
                    name: `Wallets: U${range.minUnique}-${range.maxUnique} K${range.minKyc}-${range.maxKyc}` 
                });
            }
            
            return variations;
        }

        async runOptimization() {
            this.startTime = Date.now();

            try {
                // Clear cache at the start of optimization
                if (CONFIG.USE_CONFIG_CACHING) {
                    this.configCache.clear();
                    console.log('💾 Cache cleared at start of optimization');
                }

                // 1. Establish baseline
                await this.establishBaseline();

                // 2. Parameter Impact Analysis
                if (this.getRemainingTime() > 0.8 && !STOPPED && CONFIG.USE_PARAMETER_IMPACT_ANALYSIS) {
                    await this.impactAnalyzer.analyzeParameterImpacts();
                }

                // 3. Execute phased optimization strategy
                await this.runParameterPhase();

                // 3.5. Transition to PnL hybrid optimization if runners optimization was used
                if (this.optimizationPhase === 'RUNNERS' && CONFIG.RUNNERS_PNL_HYBRID_MODE && this.getRemainingTime() > 0.3) {
                    await this.transitionToPnLHybridMode();
                }

                // 4. Advanced optimization phases
                if (this.getRemainingTime() > 0.4 && !STOPPED && CONFIG.USE_LATIN_HYPERCUBE_SAMPLING && (this.bestScore < CONFIG.TARGET_PNL)) {
                    await this.runLatinHypercubePhase();
                }

                if (this.getRemainingTime() > 0.3 && !STOPPED && CONFIG.USE_GENETIC_ALGORITHM && (this.bestScore < CONFIG.TARGET_PNL)) {
                    await this.geneticOptimizer.runGeneticOptimization();
                }

                if (this.getRemainingTime() > 0.2 && !STOPPED && (this.bestScore < CONFIG.TARGET_PNL)) {
                    await this.runCorrelatedParameterPhase();
                }

                if (this.getRemainingTime() > 0.1 && !STOPPED && CONFIG.USE_SIMULATED_ANNEALING && (this.bestScore < CONFIG.TARGET_PNL)) {
                    await this.simulatedAnnealing.runSimulatedAnnealing();
                }

                if (this.getRemainingTime() > 0.05 && !STOPPED && CONFIG.USE_MULTIPLE_STARTING_POINTS && (this.bestScore < CONFIG.TARGET_PNL)) {
                    await this.runMultipleStartingPoints();
                }

                const runtime = Math.floor((Date.now() - this.startTime) / 1000);

                return {
                    bestConfig: this.bestConfig,
                    bestScore: this.bestScore,
                    bestMetrics: this.bestMetrics,
                    testCount: this.testCount,
                    runtime: runtime,
                    targetAchieved: this.bestScore >= CONFIG.TARGET_PNL,
                    history: this.history,
                    cacheSize: this.configCache.size(),
                    parameterImpacts: Array.from(this.impactAnalyzer.parameterImpacts.entries())
                };

            } catch (error) {
                throw error;
            }
        }

        async transitionToPnLHybridMode() {
            console.log('🔄 Transitioning from RUNNERS % optimization to PnL % hybrid optimization...');
            updateProgress('🔄 Phase Transition: RUNNERS % → PnL % Hybrid', this.getProgress(), this.getCurrentBestScore().toFixed(1), this.testCount, this.bestMetrics ? this.bestMetrics.tokensMatched : '--', this.startTime);
            
            // Set target runners percentage from current best runners %
            this.targetRunnersPercentage = this.bestRunnersPercentage;
            
            // Change optimization phase to PnL hybrid mode
            this.optimizationPhase = 'PNL_HYBRID';
            
            // Update bestScore to track PnL % for display purposes during hybrid mode
            this.bestScore = this.bestPnlPercentage;
            
            console.log(`🎯 Target runners %: ${this.targetRunnersPercentage.toFixed(1)}% (±${CONFIG.RUNNERS_PERCENTAGE_TOLERANCE}%)`);
            console.log(`📊 Starting PnL % optimization from: ${this.bestPnlPercentage.toFixed(1)}%`);
            
            updateProgress('🎯 PnL % Hybrid Optimization Started', this.getProgress(), this.getCurrentBestScore().toFixed(1), this.testCount, this.bestMetrics ? this.bestMetrics.tokensMatched : '--', this.startTime);
            
            // Run another parameter phase with PnL optimization
            await this.runParameterPhase();
        }

        getSection(param) {
            const sectionMap = {
                'Min MCAP (USD)': 'basic', 'Max MCAP (USD)': 'basic',
                'Min AG Score': 'tokenDetails', 'Max Token Age (min)': 'tokenDetails', 'Min Deployer Age (min)': 'tokenDetails',
                'Min Buy Ratio %': 'risk', 'Max Buy Ratio %': 'risk', 'Min Vol MCAP %': 'risk',
                'Max Vol MCAP %': 'risk', 'Min Bundled %': 'risk', 'Max Bundled %': 'risk', 'Min Deployer Balance (SOL)': 'risk',
                'Max Drained %': 'risk', 'Max Drained Count': 'risk',
                'Min Unique Wallets': 'wallets', 'Max Unique Wallets': 'wallets', 'Min KYC Wallets': 'wallets', 'Max KYC Wallets': 'wallets',
                'Min TTC (sec)': 'advanced', 'Max TTC (sec)': 'advanced', 'Min Win Pred %': 'advanced', 'Max Liquidity %': 'advanced'
            };
            return sectionMap[param] || 'basic';
        }

        async runParameterPhase() {
            updateProgress('🔄 Phase 1: Parameter Testing', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics ? this.bestMetrics.tokensMatched : '--', this.startTime);

            const timePerParam = this.getRemainingTime() * 0.6 / this.parameterTests.length; // 60% of remaining time

            for (const { param, section } of this.parameterTests) {
                if (STOPPED || this.getRemainingTime() <= 0) break;

                const phaseStartTime = Date.now();
                const phaseMaxTime = timePerParam * CONFIG.MAX_RUNTIME_MIN * 60 * 1000;

                updateProgress(`🔄 Testing ${param}...`, this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics ? this.bestMetrics.tokensMatched : '--', this.startTime);

                const variations = this.generateVariation(this.bestConfig, param, section);
                if (!variations) continue;

                for (const variation of variations) {
                    if (STOPPED || this.getRemainingTime() <= 0) break;
                    if (Date.now() - phaseStartTime > phaseMaxTime) break; // Time limit per parameter

                    const result = await this.testConfig(variation.config, variation.name);
                    
                    // Update adaptive step size based on success (if enabled)
                    if (CONFIG.USE_ADAPTIVE_STEP_SIZES) {
                        this.adaptiveStepManager.updateStepSize(param, result.success && result.improvement > 0);
                    }

                    if (!result.success) continue;

                    // Early termination if target achieved 
                    if (this.bestScore >= CONFIG.TARGET_PNL) {
                        updateProgress('🎯 Target achieved early!', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics ? this.bestMetrics.tokensMatched : '--', this.startTime);
                        return;
                    }
                }
            }
        }

        async runLatinHypercubePhase() {
            updateProgress('🎲 Latin Hypercube Sampling', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics ? this.bestMetrics.tokensMatched : '--', this.startTime);

            // Focus on top parameters for LHS
            const topParams = this.parameterTests.slice(0, 6).map(p => p.param);
            const variations = this.generateLatinHypercubeVariations(this.bestConfig, topParams, 8);

            for (const variation of variations) {
                if (STOPPED || this.getRemainingTime() <= 0.3) break;

                const result = await this.testConfig(variation.config, variation.name);
                if (!result.success) continue;

                // Early termination if target achieved
                if (this.bestScore >= CONFIG.TARGET_PNL) {
                    updateProgress('🎯 Target achieved early!', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics.tokensMatched, this.startTime);
                    return;
                }
            }
        }

        async runCorrelatedParameterPhase() {
            updateProgress('🔗 Correlated Parameters', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics ? this.bestMetrics.tokensMatched : '--', this.startTime);

            const correlatedVariations = this.generateCorrelatedVariations(this.bestConfig);

            for (const variation of correlatedVariations) {
                if (STOPPED || this.getRemainingTime() <= 0.1) break;

                const result = await this.testConfig(variation.config, variation.name);
                if (!result.success) continue;

                // Early termination if target achieved
                if (this.bestScore >= CONFIG.TARGET_PNL) {
                    updateProgress('🎯 Target achieved early!', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics ? this.bestMetrics.tokensMatched : '--', this.startTime);
                    return;
                }
            }
        }

        async runMultipleStartingPoints() {
            updateProgress('🚀 Multiple Starting Points', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics ? this.bestMetrics.tokensMatched : '--', this.startTime);

            // Use all presets from CONFIG.PRESETS dynamically
            const startingPoints = Object.values(CONFIG.PRESETS);

            // Always test all presets, regardless of time constraints
            for (const startingPoint of startingPoints) {
                if (STOPPED) break; // Only stop if manually stopped

                const result = await this.testConfig(startingPoint, `Starting point: ${JSON.stringify(startingPoint).slice(0, 50)}...`);
                if (!result.success) continue;

                // Test variations around this starting point (only if we have reasonable time)
                if (this.getRemainingTime() > 0.01) {
                    const variations = this.generateVariation(startingPoint, this.parameterTests[0].param, this.parameterTests[0].section);
                    if (variations) {
                        for (const variation of variations.slice(0, 2)) {
                            if (STOPPED) break;
                            await this.testConfig(variation.config, variation.name);
                        }
                    }
                }

                // Early termination if target achieved
                if (this.bestScore >= CONFIG.TARGET_PNL) {
                    updateProgress('🎯 Target achieved early!', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics ? this.bestMetrics.tokensMatched : '--', this.startTime);
                    return;
                }
            }
        }

        async runDeepDive() {
            updateProgress('🎯 Phase 2: Deep Dive', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics ? this.bestMetrics.tokensMatched : '--', this.startTime);

            // Focus on top 3 parameters for extended testing
            const topParams = this.parameterTests.slice(0, 3);
            const timePerParam = this.getRemainingTime() * 0.7 / topParams.length; // 70% of remaining time

            for (const { param, section } of topParams) {
                if (STOPPED || this.getRemainingTime() <= 0.2) break;

                const phaseStartTime = Date.now();
                const phaseMaxTime = timePerParam * CONFIG.MAX_RUNTIME_MIN * 60 * 1000;

                updateProgress(`🔍 Deep dive: ${param}...`, this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics ? this.bestMetrics.tokensMatched : '--', this.startTime);

                const extendedVariations = this.generateExtendedVariations(this.bestConfig, param, section);
                if (!extendedVariations) continue;

                for (const variation of extendedVariations) {
                    if (STOPPED || this.getRemainingTime() <= 0.2) break;
                    if (Date.now() - phaseStartTime > phaseMaxTime) break;

                    const result = await this.testConfig(variation.config, variation.name);
                    if (!result.success) continue;

                    // Early termination if target achieved
                    if (this.bestScore >= CONFIG.TARGET_PNL) {
                        updateProgress('🎯 Target achieved early!', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics ? this.bestMetrics.tokensMatched : '--', this.startTime);
                        return;
                    }
                }
            }
        }

        async runCombinationPhase() {
            updateProgress('🎯 Phase 3: Combinations', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics.tokensMatched, this.startTime);

            const combinations = [
                { param: 'Max Vol MCAP %', section: 'risk', values: [80, 120, 150] },
                { param: 'Max Buy Ratio %', section: 'risk', values: [85, 95] },
                { param: 'Max KYC Wallets', section: 'wallets', values: [3, 5, 8] }
            ];

            for (const combo of combinations) {
                if (STOPPED || this.getRemainingTime() <= 0.1) break;

                for (const value of combo.values) {
                    if (STOPPED || this.getRemainingTime() <= 0.1) break;

                    const config = deepClone(this.bestConfig);
                    config[combo.section][combo.param] = value;

                    const result = await this.testConfig(config, `Combo: ${combo.param}=${value}`);

                    // Early termination if target achieved
                    if (this.bestScore >= CONFIG.TARGET_PNL) {
                        updateProgress('🎯 Target achieved early!', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics.tokensMatched, this.startTime);
                        return;
                    }
                }
            }
        }

        async runContinuousExploration() {
            updateProgress('🎲 Phase 4: Continuous Exploration', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics.tokensMatched, this.startTime);

            const importantParams = this.parameterTests.slice(0, 5); // Top 5 parameters

            while (this.getRemainingTime() > 0.02 && !STOPPED) { // Keep 2% buffer
                const config = deepClone(this.bestConfig);

                // Modify 1-2 random parameters from top performers
                const modifications = Math.floor(Math.random() * 2) + 1;
                let testName = 'Explore: ';

                for (let j = 0; j < modifications; j++) {
                    const { param, section } = importantParams[Math.floor(Math.random() * importantParams.length)];
                    const rules = PARAM_RULES[param];
                    if (!rules) continue;

                    let value;
                    if (rules.type === 'string') {
                        value = Math.floor(Math.random() * 10 + 1).toString();
                    } else {
                        value = Math.floor(Math.random() * (rules.max - rules.min) + rules.min);
                    }

                    config[section][param] = value;
                    testName += `${param}=${value} `;
                }

                const result = await this.testConfig(config, testName.trim());

                // Early termination if target achieved
                if (this.bestScore >= CONFIG.TARGET_PNL) {
                    updateProgress('🎯 Target achieved early!', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics.tokensMatched, this.startTime);
                    return;
                }
            }
        }

        generateExtendedVariations(baseConfig, param, section) {
            const rules = PARAM_RULES[param];
            if (!rules) return null;

            const config = deepClone(baseConfig);
            const currentValue = config[section][param];

            // Generate more extensive variations than standard generateVariation
            const variations = [];

            if (rules.type === 'string') {
                // For AG Score - test all values
                for (let i = 1; i <= 10; i++) {
                    if (i.toString() !== currentValue) {
                        variations.push(i.toString());
                    }
                }
            } else {
                // For numeric values - create broader range
                const current = currentValue || (rules.min + rules.max) / 2;
                const range = rules.max - rules.min;
                const step = rules.step;

                // Create variations with different step sizes
                for (let multiplier = 1; multiplier <= 5; multiplier++) {
                    [
                        Math.max(rules.min, current - step * multiplier),
                        Math.min(rules.max, current + step * multiplier)
                    ].forEach(val => {
                        if (val !== current && !variations.includes(val)) {
                            variations.push(val);
                        }
                    });
                }

                // Add quartile values
                [
                    rules.min,
                    Math.floor(rules.min + range * 0.25),
                    Math.floor(rules.min + range * 0.5),
                    Math.floor(rules.min + range * 0.75),
                    rules.max
                ].forEach(val => {
                    if (val !== current && !variations.includes(val)) {
                        variations.push(val);
                    }
                });
            }

            return variations.slice(0, 8).map(val => {
                const newConfig = deepClone(config);
                newConfig[section][param] = val;
                return { config: newConfig, name: `${param}: ${val}` };
            });
        }
    }

    // ========================================
    // 🎛️ SIMPLE UI
    // ========================================

    function createSimplePopup() {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.8); z-index: 10000; display: flex; 
            justify-content: center; align-items: center; font-family: Arial, sans-serif;
        `;

        const popup = document.createElement('div');
        popup.style.cssText = `
            background: linear-gradient(145deg, #2a2a2a, #1a1a1a); 
            border: 2px solid #4a9eff; border-radius: 15px; padding: 30px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.5); width: 650px;
            color: white; text-align: center;
        `;

        // Generate baseline preset options dynamically
        const generatePresetOptions = () => {
            let options = '<option value="current">Current (Default)</option>';
            
            // Add all presets from CONFIG.PRESETS
            Object.keys(CONFIG.PRESETS).forEach(presetKey => {
                // Convert camelCase to readable format
                const displayName = presetKey
                    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
                    .trim();
                
                options += `<option value="${presetKey}">${displayName}</option>`;
            });
            
            return options;
        };

        popup.innerHTML = `
            <h2 style="color: #4a9eff; margin-bottom: 20px;">🤖 AG Optimizer</h2>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 10px;">
                    🎯 Target PnL %: 
                    <input type="number" id="targetPnl" value="100" min="100" max="500" 
                           style="width: 80px; padding: 5px; margin-left: 10px; 
                                  background: #333; color: white; border: 1px solid #555; 
                                  border-radius: 4px;">
                </label>
                
                <label style="display: block; margin-bottom: 10px;">
                    ⏱️ Max Runtime (min): 
                    <input type="number" id="maxRuntime" value="30" min="10" max="90" 
                           style="width: 80px; padding: 5px; margin-left: 10px; 
                                  background: #333; color: white; border: 1px solid #555; 
                                  border-radius: 4px;">
                </label>
                
                <label style="display: block; margin-bottom: 10px;">
                    🔢 Min Tokens Required: 
                    <input type="number" id="minTokens" value="70" min="5" max="100" 
                           style="width: 80px; padding: 5px; margin-left: 10px; 
                                  background: #333; color: white; border: 1px solid #555; 
                                  border-radius: 4px;">
                </label>
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 10px;">
                    🎛️ Baseline Preset:
                    <select id="baselinePreset" style="
                        padding: 5px; margin-left: 10px; 
                        background: #333; color: white; border: 1px solid #555; 
                        border-radius: 4px; font-size: 12px;">
                        ${generatePresetOptions()}
                    </select>
                </label>
            </div>

                <div style="margin-bottom: 20px; border-top: 1px solid #444; padding-top: 15px;">
                    <h3 style="color: #4a9eff; margin-bottom: 15px; font-size: 14px; text-align: center;">🔧 Advanced Optimization Features</h3>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; text-align: left; font-size: 12px;">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="configCaching" checked disabled
                                style="margin-right: 8px; transform: scale(1.2);">
                            <div>
                                <div style="color: #4a9eff;">💾 Config Caching</div>
                                <div style="color: #999; font-size: 11px;">Skip duplicate configurations for faster testing</div>
                            </div>
                        </label>
                        
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="parameterImpactAnalysis" checked 
                                style="margin-right: 8px; transform: scale(1.2);">
                            <div>
                                <div style="color: #4a9eff;">📊 Parameter Impact Analysis</div>
                                <div style="color: #999; font-size: 11px;">Measure and rank parameter importance</div>
                            </div>
                        </label>
                        
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="geneticAlgorithm" checked  disabled
                                style="margin-right: 8px; transform: scale(1.2);">
                            <div>
                                <div style="color: #4a9eff;">🧬 Genetic Algorithm</div>
                                <div style="color: #999; font-size: 11px;">Population-based search with crossover & mutation</div>
                            </div>
                        </label>
                        
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="simulatedAnnealing" checked 
                                style="margin-right: 8px; transform: scale(1.2);">
                            <div>
                                <div style="color: #4a9eff;">🔥 Simulated Annealing</div>
                                <div style="color: #999; font-size: 11px;">Escape local optima with temperature cooling</div>
                            </div>
                        </label>
                        
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="adaptiveStepSizes" checked disabled
                                style="margin-right: 8px; transform: scale(1.2);">
                            <div>
                                <div style="color: #4a9eff;">⚙️ Adaptive Step Sizes</div>
                                <div style="color: #999; font-size: 11px;">Adjust step sizes based on success rates</div>
                            </div>
                        </label>

                         <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="multipleStartingPoints" unchecked 
                                style="margin-right: 8px; transform: scale(1.2);">
                            <div>
                                <div style="color: #4a9eff;">🚀 Multiple Starting Points</div>
                                <div style="color: #999; font-size: 11px;">Test different preset configurations</div>
                            </div>
                        </label>

                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="latinHypercubeSampling" checked disabled
                                style="margin-right: 8px; transform: scale(1.2);">
                            <div>
                                <div style="color: #4a9eff;">🎲 Latin Hypercube Sampling</div>
                                <div style="color: #999; font-size: 11px;">Better parameter space coverage</div>
                            </div>
                        </label> 
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <button id="start" style="background: #4a9eff; color: white; border: none; 
                                         padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                    🚀 PnL %
                </button>
                <button id="startRunners" style="background: #e74c3c; color: white; border: none; 
                                               padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                    🎯 Runners % (Experimental)
                </button>
                <button id="cancel" style="background: #666; color: white; border: none; 
                                          padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                    ❌ Cancel
                </button>
            </div>
            
            <div style="margin-top: 15px; padding: 10px; background: rgba(231, 76, 60, 0.1); 
                        border-radius: 5px; border-left: 3px solid #e74c3c; font-size: 11px; color: #ccc;">
                <strong style="color: #e74c3c;">🧪 RUNNERS % Mode:</strong> Optimizes for the percentage of 10x+ performers instead of overall PnL. 
                This experimental mode reduces the influence of "gigamooners" by focusing on consistent runner distribution.
            </div>
        `;

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        popup.querySelector('#start').onclick = () => {
            const preset = popup.querySelector('#baselinePreset').value;
            if (preset !== 'current') {
                CONFIG.BASELINE = { ...CONFIG.BASELINE, ...CONFIG.PRESETS[preset] };
            }

            CONFIG.TARGET_PNL = parseInt(popup.querySelector('#targetPnl').value);
            CONFIG.MAX_RUNTIME_MIN = parseInt(popup.querySelector('#maxRuntime').value);
            CONFIG.MIN_TOKENS = parseInt(popup.querySelector('#minTokens').value)

            // Apply advanced optimization settings
            CONFIG.USE_CONFIG_CACHING = true;
            CONFIG.USE_PARAMETER_IMPACT_ANALYSIS = popup.querySelector('#parameterImpactAnalysis').checked;
            CONFIG.USE_GENETIC_ALGORITHM = true;
            CONFIG.USE_SIMULATED_ANNEALING = popup.querySelector('#simulatedAnnealing').checked;
            CONFIG.USE_ADAPTIVE_STEP_SIZES = true;
            CONFIG.USE_LATIN_HYPERCUBE_SAMPLING = true;
            CONFIG.USE_MULTIPLE_STARTING_POINTS = popup.querySelector('#multipleStartingPoints').checked;
            CONFIG.USE_RUNNERS_OPTIMIZATION = false; // Traditional PnL mode

            document.body.removeChild(overlay);
            resolve(true);
        };

        popup.querySelector('#startRunners').onclick = () => {
            const preset = popup.querySelector('#baselinePreset').value;
            if (preset !== 'current') {
                CONFIG.BASELINE = { ...CONFIG.BASELINE, ...CONFIG.PRESETS[preset] };
            }

            CONFIG.TARGET_PNL = parseInt(popup.querySelector('#targetPnl').value);
            CONFIG.MAX_RUNTIME_MIN = parseInt(popup.querySelector('#maxRuntime').value);
            CONFIG.MIN_TOKENS = parseInt(popup.querySelector('#minTokens').value)

            // Apply advanced optimization settings
            CONFIG.USE_CONFIG_CACHING = true;
            CONFIG.USE_PARAMETER_IMPACT_ANALYSIS = popup.querySelector('#parameterImpactAnalysis').checked;
            CONFIG.USE_GENETIC_ALGORITHM = true;
            CONFIG.USE_SIMULATED_ANNEALING = popup.querySelector('#simulatedAnnealing').checked;
            CONFIG.USE_ADAPTIVE_STEP_SIZES = true;
            CONFIG.USE_LATIN_HYPERCUBE_SAMPLING = true;
            CONFIG.USE_MULTIPLE_STARTING_POINTS = popup.querySelector('#multipleStartingPoints').checked;
            CONFIG.USE_RUNNERS_OPTIMIZATION = true; // Enable RUNNERS % mode
            
            console.log('%c🎯 RUNNERS % Mode Activated!', 'color: #e74c3c; font-weight: bold; font-size: 14px;');
            console.log('%cOptimizing for percentage of 10x+ runners instead of overall PnL', 'color: #e74c3c;');

            document.body.removeChild(overlay);
            resolve(true);
        };

        popup.querySelector('#cancel').onclick = () => {
            document.body.removeChild(overlay);
            resolve(false);
        };
    });
}


    function showResults(result) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                background: rgba(0,0,0,0.8); z-index: 10000; display: flex; 
                justify-content: center; align-items: center; font-family: Arial, sans-serif;
            `;

            const popup = document.createElement('div');
            popup.style.cssText = `
                background: linear-gradient(145deg, #2a2a2a, #1a1a1a); 
                border: 2px solid #27ae60; border-radius: 15px; padding: 30px; 
                box-shadow: 0 20px 40px rgba(0,0,0,0.5); min-width: 600px; max-width: 700px;
                color: white; text-align: center; max-height: 80vh; overflow-y: auto;
            `;

            const targetAchieved = result.targetAchieved;
            const headerColor = targetAchieved ? '#27ae60' : '#f39c12';
            const headerIcon = targetAchieved ? '🎉' : '📊'
            const headerText = targetAchieved ? 'TARGET ACHIEVED!' : 'OPTIMIZATION COMPLETE';

            popup.innerHTML = `
                <h2 style="color: ${headerColor}; margin-bottom: 20px; font-size: 20px;">
                    ${headerIcon} ${headerText}
                </h2>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; font-size: 14px;">
                    <div style="background: rgba(39, 174, 96, 0.1); padding: 12px; border-radius: 8px;">
                        <div style="color: #27ae60; font-weight: bold; font-size: 16px;">
                            ${CONFIG.USE_RUNNERS_OPTIMIZATION ? 
                                `${result.bestScore.toFixed(1)}%` : 
                                `${result.bestScore.toFixed(1)}%`}
                        </div>
                        <div style="color: #ccc; font-size: 11px;">
                            ${CONFIG.USE_RUNNERS_OPTIMIZATION ? 'RUNNERS %' : 'Final TP PnL'}
                        </div>
                    </div>
                    <div style="background: rgba(52, 152, 219, 0.1); padding: 12px; border-radius: 8px;">
                        <div style="color: #3498db; font-weight: bold; font-size: 16px;">${result.testCount}</div>
                        <div style="color: #ccc; font-size: 11px;">Tests Run</div>
                    </div>
                    <div style="background: rgba(155, 89, 182, 0.1); padding: 12px; border-radius: 8px;">
                        <div style="color: #9b59b6; font-weight: bold; font-size: 16px;">${result.bestMetrics.tokensMatched}</div>
                        <div style="color: #ccc; font-size: 11px;">Tokens Matched</div>
                    </div>
                    <div style="background: rgba(230, 126, 34, 0.1); padding: 12px; border-radius: 8px;">
                        <div style="color: #e67e22; font-weight: bold; font-size: 16px;">${Math.floor(result.runtime / 60)}:${(result.runtime % 60).toString().padStart(2, '0')}</div>
                        <div style="color: #ccc; font-size: 11px;">Runtime</div>
                    </div>
                    ${CONFIG.USE_RUNNERS_OPTIMIZATION ? `
                    <div style="background: rgba(231, 76, 60, 0.1); padding: 12px; border-radius: 8px; grid-column: span 2;">
                        <div style="color: #e74c3c; font-weight: bold; font-size: 16px;">
                            ${result.bestMetrics.runnersCount || 0}/${result.bestMetrics.tokensMatched} 
                            (PnL: ${result.bestMetrics.tpPnlPercent ? result.bestMetrics.tpPnlPercent.toFixed(1) : '--'}%)
                        </div>
                        <div style="color: #ccc; font-size: 11px;">10x+ Runners (Traditional PnL for reference)</div>
                    </div>` : ''}
                </div>

                <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; margin-bottom: 20px; max-height: 200px; overflow-y: auto;">
                    <h4 style="margin: 0 0 8px 0; color: #f39c12; font-size: 12px;">⚙️ Best Configuration Preview:</h4>
                    <div style="text-align: left; font-size: 10px; color: #ccc;">
                        ${Object.entries(result.bestConfig).map(([section, params]) => {
                const activeParams = Object.entries(params).filter(([_, value]) => value !== undefined);
                if (activeParams.length === 0) return '';
                return `<strong>${section}:</strong> ${activeParams.map(([key, value]) => `${key}: ${value}`).join(', ')}`;
            }).filter(line => line).join('<br>')}
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button id="applyConfig" style="
                        background: linear-gradient(145deg, #27ae60, #229954); color: white; 
                        border: none; padding: 10px 16px; border-radius: 6px; font-size: 13px; 
                        font-weight: bold; cursor: pointer;">
                        ⚡ Apply Best Config
                    </button>
                    <button id="closeResults" style="
                        background: linear-gradient(145deg, #95a5a6, #7f8c8d); color: white; 
                        border: none; padding: 10px 16px; border-radius: 6px; font-size: 13px; 
                        cursor: pointer;">
                        ✕ Close
                    </button>
                </div>
            `;

            overlay.appendChild(popup);
            document.body.appendChild(overlay);

            popup.querySelector('#applyConfig').onclick = async () => {
                const btn = popup.querySelector('#applyConfig');
                btn.innerHTML = '⏳ Applying...';
                btn.disabled = true;

                try {
                    // Clear config first, then apply the best one
                    const ui = new UIController();
                    await ui.applyConfig(result.bestConfig, true);
                    btn.innerHTML = '✅ Applied!';
                    btn.style.background = 'linear-gradient(145deg, #27ae60, #229954)';
                } catch (error) {
                    btn.innerHTML = '❌ Failed';
                    btn.style.background = 'linear-gradient(145deg, #e74c3c, #c0392b)';
                }
            };

            popup.querySelector('#closeResults').onclick = () => {
                document.body.removeChild(overlay);
                resolve();
            };
        });
    }

    // ========================================
    // 🚀 MAIN EXECUTION
    // ========================================
    async function main() {
        try {
            const proceed = await createSimplePopup();
            if (!proceed) {
                return;
            }

            createProgressBar();
            updateProgress('🚀 Starting optimization...', 0, '--', 0, '--');
            
            // Log rate limiting configuration
            console.log(`🚦 Rate Limiting: Base delay ${CONFIG.BASE_FIELD_DELAY}ms, Aggressive mode ${CONFIG.AGGRESSIVE_RATE_LIMITING ? 'ON' : 'OFF'}, Batch size ${CONFIG.BATCH_SIZE}`);

            const optimizer = new SimpleOptimizer();
            const result = await optimizer.runOptimization();

            updateProgress('🏁 Complete!', 100, result.bestScore.toFixed(1), result.testCount, result.bestMetrics.tokensMatched);

            // Log advanced optimization results
            const optimizationMode = CONFIG.USE_RUNNERS_OPTIMIZATION ? 'RUNNERS %' : 'PnL %';
            console.log(`🚀 ${optimizationMode} Optimization Complete!`);
            console.log(`📈 Final ${optimizationMode}: ${result.bestScore.toFixed(1)}${CONFIG.USE_RUNNERS_OPTIMIZATION ? '%' : '%'}`);
            
            if (CONFIG.USE_RUNNERS_OPTIMIZATION && result.bestMetrics.runnersCount !== undefined) {
                console.log(`🎯 Runners: ${result.bestMetrics.runnersCount}/${result.bestMetrics.tokensMatched} tokens are 10x+ performers`);
                console.log(`📊 Traditional PnL: ${result.bestMetrics.tpPnlPercent ? result.bestMetrics.tpPnlPercent.toFixed(1) : '--'}% (for reference)`);
            }
            
            console.log(`🧪 Total Tests: ${result.testCount}`);
            console.log(`💾 Cache Size: ${result.cacheSize} configurations`);
            console.log(`📊 Parameter Impacts:`, result.parameterImpacts.slice(0, 5));

            setTimeout(async () => {
                removeProgressBar();
                await showResults(result);
            }, 1000);

        } catch (error) {
            removeProgressBar();
            alert(`Optimization failed: ${error.message}`);
        }
    }

    return main();
})();
