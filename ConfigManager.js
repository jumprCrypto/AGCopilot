// ConfigManager.js
// Configuration management module - handles getting/setting configuration values
// Extracted from AGCopilot.js for better modularity

(function(AGUtils) {
    'use strict';

    const CM = {};
    const AG = AGUtils || (window && window.AGUtils) || {};

    // ========================================
    // 🎯 CONFIGURATION MANAGEMENT
    // ========================================

    // Main configuration constants
    CM.CONFIG = {
        // Original AGCopilot Optimization Settings (no API needed)
        MAX_RUNTIME_MIN: 30,
        SIMULATED_ANNEALING_SAMPLES: 1000,
        CORRELATION_THRESHOLD: 0.3,
        LATIN_HYPERCUBE_SAMPLES: 100,
        BATCH_SIZE: 25,
        
        // AI-Enhanced Features
        ENABLE_AI_ENHANCEMENTS: true,
        MIN_SIGNAL_CONFIDENCE: 0.6,
        SIGNAL_LOOKBACK_DAYS: 30,
        ADAPTIVE_THRESHOLD_LEARNING: true,
        ANOMALY_DETECTION: true,
        CONFIDENCE_WEIGHTED_SCORING: true,
        DYNAMIC_PARAMETER_ADJUSTMENT: true,
        
        // Default values for various settings
        SCORING_MODE: 'robust',
        MIN_TOKENS: 10,
        DEFAULT_STOP_LOSS: 5.0,
        DEFAULT_TAKE_PROFIT: 10.0,
        DEFAULT_TRIGGER_MODE: 4,
        
        // Rate limiting configuration  
        RATE_LIMIT_MODE: 'normal', // 'normal' or 'slower'
        RATE_LIMIT_MODES: {
            normal: {
                maxRequestsPerMinute: 8,
                burstLimit: 20,
                recoveryTime: 10000     // 10 seconds
            },
            slower: {
                maxRequestsPerMinute: 3,
                burstLimit: 12,
                recoveryTime: 20000     // 20 seconds
            }
        },
        
        // Token thresholds
        MIN_TOKENS_PER_DAY: 10,
        CHAIN_RUN_COUNT: 5,
        
        // Win rate requirements by sample size  
        MIN_WIN_RATE_SMALL: 35,   // < 500 tokens
        MIN_WIN_RATE_MEDIUM: 30,  // 500-999 tokens
        MIN_WIN_RATE_LARGE: 25,   // 1000+ tokens
        
        // TP configuration list
        TP_CONFIGURATIONS: [
            10, 25, 50, 75, 100, 125, 150, 175, 200, 250, 300, 400, 500, 600, 750, 1000
        ],
        
        // Feature flags for advanced optimization
        SIMULATED_ANNEALING: true,
        LATIN_HYPERCUBE: true,
        CORRELATED_PARAMS: true,
        ENHANCED_OPTIMIZER: true,
        CHAINED_OPTIMIZER: true
    };

    // Complete configuration template for AGCopilot parameters
    CM.COMPLETE_CONFIG_TEMPLATE = {
        basic: {
            "Min MCAP (USD)": undefined,
            "Max MCAP (USD)": undefined
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
            "Holders Growth %": undefined,
            "Holders Growth Minutes": undefined
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
            "Min Win Pred %": undefined,
            "Has Buy Signal": undefined
        },
        // Optional, filled from UI if present
        tpSettings: {},
        takeProfits: []
    };

    // Deep clone utility function
    CM.deepClone = function(obj) {
        if (obj === null || typeof obj !== "object") return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (Array.isArray(obj)) return obj.map(item => CM.deepClone(item));
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = CM.deepClone(obj[key]);
            }
        }
        return cloned;
    };

    // ========================================
    // 🎨 PRESETS CONFIGURATION
    // ========================================

    CM.PRESETS = {
        oldDeployer: { 
            category: "Custom",
            description: "Old Deployer",
            tokenDetails: { "Min Deployer Age (min)": 43200, "Min AG Score": "4" } 
        },
        oldishDeployer: { 
            category: "Custom",
            description: "Old-ish Deployer",
            tokenDetails: { "Min Deployer Age (min)": 4320, "Min AG Score": "4" } 
        },
        agScore7: { 
            category: "Custom",
            description: "Min AG Score 7",
            tokenDetails: { "Min AG Score": "7" } 
        },
        
        // Discovery-based presets (from Parameter Impact Analysis)
        MaxLiqThirty: {
            priority: 1,
            category: "Param Discovery",
            description: "Max Liq % 30",
            advanced: { "Max Liquidity %": 30 }
        },
         minWinPred: { 
            priority: 2,
            category: "Param Discovery",
            description: "Min Win Pred % 55",
            advanced: { "Min Win Pred %": 55 }
        },
        UnqWallet3: {
            priority: 3,
            category: "Param Discovery", 
            description: "3+ Unq",
            wallets: { "Min Unique Wallets": 3 }
        },
        MinMcap20k: {
            priority: 4,
            category: "Param Discovery",
            description: "Min MCAP 20K", 
            basic: { "Min MCAP (USD)": 20000 }
        },
        MinMcap10k: {
            priority: 5,
            category: "Param Discovery",
            description: "Min MCAP 10K", 
            basic: { "Min MCAP (USD)": 10000 }
        }
    };

    // ========================================
    // 🔧 CONFIGURATION UTILITIES
    // ========================================

    // Get current configuration from UI
    CM.getCurrentConfigFromUI = function() {
        const config = {};
        
        // Get basic parameters
        const stopLossInput = document.getElementById('stop-loss');
        const takeProfitInput = document.getElementById('take-profit');
        const minTokensInput = document.getElementById('min-tokens');
        
        if (stopLossInput) config.stopLoss = parseFloat(stopLossInput.value);
        if (takeProfitInput) config.takeProfit = parseFloat(takeProfitInput.value);
        if (minTokensInput) config.minTokens = parseInt(minTokensInput.value);
        
        // Get date range
        const fromDateInput = document.getElementById('from-date');
        const toDateInput = document.getElementById('to-date');
        
        if (fromDateInput && fromDateInput.value) config.fromDate = fromDateInput.value;
        if (toDateInput && toDateInput.value) config.toDate = toDateInput.value;
        
        // Get trigger mode
        const triggerModeSelect = document.getElementById('trigger-mode-select');
        if (triggerModeSelect) {
            const value = triggerModeSelect.value;
            config.triggerMode = value === '' ? null : parseInt(value);
        }
        
        // Get scoring mode
        const scoringModeSelect = document.getElementById('scoring-mode-select');
        if (scoringModeSelect) {
            config.scoringMode = scoringModeSelect.value;
        }
        
        return config;
    };

    // Apply configuration to UI
    CM.applyConfigToUI = function(config) {
        if (!config) return;
        
        // Apply basic parameters
        if (config.stopLoss !== undefined) {
            const stopLossInput = document.getElementById('stop-loss');
            if (stopLossInput) stopLossInput.value = config.stopLoss;
        }
        
        if (config.takeProfit !== undefined) {
            const takeProfitInput = document.getElementById('take-profit');
            if (takeProfitInput) takeProfitInput.value = config.takeProfit;
        }
        
        if (config.minTokens !== undefined) {
            const minTokensInput = document.getElementById('min-tokens');
            if (minTokensInput) minTokensInput.value = config.minTokens;
        }
        
        // Apply date range
        if (config.fromDate) {
            const fromDateInput = document.getElementById('from-date');
            if (fromDateInput) fromDateInput.value = config.fromDate;
        }
        
        if (config.toDate) {
            const toDateInput = document.getElementById('to-date');
            if (toDateInput) toDateInput.value = config.toDate;
        }
        
        // Apply trigger mode
        if (config.triggerMode !== undefined) {
            const triggerModeSelect = document.getElementById('trigger-mode-select');
            if (triggerModeSelect) {
                triggerModeSelect.value = config.triggerMode === null ? '' : config.triggerMode.toString();
            }
        }
        
        // Apply scoring mode
        if (config.scoringMode) {
            const scoringModeSelect = document.getElementById('scoring-mode-select');
            if (scoringModeSelect) {
                scoringModeSelect.value = config.scoringMode;
            }
        }
    };

    // Clean configuration object
    CM.cleanConfiguration = function(config) {
        const cleaned = {};
        
        for (const [key, value] of Object.entries(config)) {
            if (value !== null && value !== undefined && value !== '') {
                if (typeof value === 'number' && !isNaN(value)) {
                    cleaned[key] = value;
                } else if (typeof value === 'string' && value.trim() !== '') {
                    cleaned[key] = value.trim();
                } else if (typeof value === 'boolean') {
                    cleaned[key] = value;
                } else if (Array.isArray(value) && value.length > 0) {
                    cleaned[key] = value;
                } else if (typeof value === 'object') {
                    const cleanedSubObj = CM.cleanConfiguration(value);
                    if (Object.keys(cleanedSubObj).length > 0) {
                        cleaned[key] = cleanedSubObj;
                    }
                }
            }
        }
        
        return cleaned;
    };

    // Get date range from UI
    CM.getDateRange = function() {
        const fromDateInput = document.getElementById('from-date');
        const toDateInput = document.getElementById('to-date');
        
        return {
            fromDate: fromDateInput ? fromDateInput.value : null,
            toDate: toDateInput ? toDateInput.value : null
        };
    };

    // ========================================
    // 🔧 UTILITY FUNCTIONS
    // ========================================

    // Ensure configuration is complete with all required sections
    CM.ensureCompleteConfig = function(config) {
        const completeConfig = CM.deepClone(CM.COMPLETE_CONFIG_TEMPLATE);
        for (const [section, sectionConfig] of Object.entries(config)) {
            if (completeConfig[section]) {
                Object.assign(completeConfig[section], sectionConfig);
            } else {
                completeConfig[section] = sectionConfig;
            }
        }
        return completeConfig;
    };

    // Get selected scoring mode from UI
    CM.getScoringMode = function() {
        const modeSelect = document.getElementById('scoring-mode-select');
        if (modeSelect && modeSelect.value) {
            return modeSelect.value; // 'robust' | 'tp_only' | 'winrate_only'
        }
        return CM.CONFIG.SCORING_MODE || 'robust';
    };

    // Get selected trigger mode from UI
    CM.getTriggerMode = function() {
        const triggerSelect = document.getElementById('trigger-mode-select');
        if (triggerSelect) {
            const value = triggerSelect.value;
            return value === '' ? null : parseInt(value);
        }
        return 4; // Default to Launchpads if no selection
    };

    // Get scaled token thresholds based on date range
    CM.getScaledTokenThresholds = function() {
        const scaling = CM.getDateRangeScaling();
        
        // Get minimum tokens per day from UI, fallback to CONFIG if not available
        const minTokensPerDayFromUI = parseInt(document.getElementById('min-tokens')?.value) || CM.CONFIG.MIN_TOKENS || 10;
        
        // Base thresholds - MIN_TOKENS is now per day, others are for 7-day period
        const BASE_THRESHOLDS = {
            LARGE_SAMPLE_THRESHOLD: 1000,    // 143x days
            MEDIUM_SAMPLE_THRESHOLD: 500,    // 71x days  
            MIN_TOKENS_PER_DAY: minTokensPerDayFromUI  // Minimum tokens per day from UI or config
        };
        
        // Apply scaling
        const scaled = {
            LARGE_SAMPLE_THRESHOLD: Math.round(BASE_THRESHOLDS.LARGE_SAMPLE_THRESHOLD * scaling.scalingFactor),
            MEDIUM_SAMPLE_THRESHOLD: Math.round(BASE_THRESHOLDS.MEDIUM_SAMPLE_THRESHOLD * scaling.scalingFactor),
            MIN_TOKENS: Math.round(BASE_THRESHOLDS.MIN_TOKENS_PER_DAY * scaling.days), // Scale by actual days
            scalingInfo: scaling
        };
        
        // Ensure minimum values
        scaled.LARGE_SAMPLE_THRESHOLD = Math.max(100, scaled.LARGE_SAMPLE_THRESHOLD);
        scaled.MEDIUM_SAMPLE_THRESHOLD = Math.max(50, scaled.MEDIUM_SAMPLE_THRESHOLD);
        scaled.MIN_TOKENS = Math.max(10, scaled.MIN_TOKENS); // At least 10 tokens total
        
        // Ensure logical order: MIN_TOKENS < MEDIUM < LARGE
        if (scaled.MEDIUM_SAMPLE_THRESHOLD >= scaled.LARGE_SAMPLE_THRESHOLD) {
            scaled.MEDIUM_SAMPLE_THRESHOLD = Math.floor(scaled.LARGE_SAMPLE_THRESHOLD * 0.5);
        }
        if (scaled.MIN_TOKENS >= scaled.MEDIUM_SAMPLE_THRESHOLD) {
            // Fix: Ensure MEDIUM is reasonable compared to MIN_TOKENS, don't reduce MIN_TOKENS
            scaled.MEDIUM_SAMPLE_THRESHOLD = Math.max(scaled.MIN_TOKENS + 25, scaled.MEDIUM_SAMPLE_THRESHOLD);
        }
        
        return scaled;
    };

    // Calculate date range scaling factor
    CM.getDateRangeScaling = function() {
        const dateRange = CM.getDateRange();
        
        // Default to 7 days if no date range specified
        if (!dateRange.fromDate || !dateRange.toDate) {
            return {
                days: 7,
                scalingFactor: 1.0,
                isDateFiltered: false
            };
        }
        
        // Calculate actual days between dates
        const fromDate = new Date(dateRange.fromDate);
        const toDate = new Date(dateRange.toDate);
        const timeDiff = Math.abs(toDate.getTime() - fromDate.getTime());
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        // Base scaling on 7-day period
        const scalingFactor = daysDiff / 7;
        
        return {
            days: daysDiff,
            scalingFactor: scalingFactor,
            isDateFiltered: true
        };
    };

    // Format configuration for display/copying
    CM.formatConfigForDisplay = function(config) {
        const lines = [];
        
        // Check if this is a cluster config
        const isClusterConfig = config.metadata && config.metadata.clusterInfo;
        
        if (isClusterConfig) {
            lines.push(`🎯 CLUSTER ${config.metadata.clusterInfo.clusterId} CONFIG`);
            lines.push('═'.repeat(50));
            lines.push(`🔗 ${config.metadata.clusterInfo.clusterName}: ${config.metadata.clusterInfo.description}`);
            lines.push(`🎯 Tightness Score: ${config.metadata.clusterInfo.tightness.toFixed(3)} (lower = tighter)`);
            lines.push(`📏 Distance Threshold: ${config.metadata.clusterInfo.threshold}`);
        } else {
            lines.push('🎯 GENERATED CONFIG');
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
            lines.push(`Deployer Age: ${config['Min Deployer Age (min)']} minutes+`);
        }
        
        return lines.join('\n');
    };

    // Function to read current field value from the UI
    CM.getFieldValue = function(labelText) {
        try {
            if (labelText === 'Holders Growth %' || labelText === 'Holders Growth Minutes') {
                const labels = Array.from(document.querySelectorAll('.sidebar-label'));
                const hgLabel = labels.find(el => el.textContent.trim() === 'Holders Growth Filter');
                if (!hgLabel) {
                    return undefined;
                }
                
                let container = hgLabel.parentElement;
                let gridContainer = null;
                let depth = 0;
                
                while (container && depth < 4) {
                    const gridDiv = container.querySelector('.grid.grid-cols-2');
                    if (gridDiv) {
                        gridContainer = gridDiv;
                        break;
                    }
                    container = container.parentElement;
                    depth++;
                }

                if (!gridContainer) {
                    return undefined;
                }
                
                const inputs = Array.from(gridContainer.querySelectorAll('input[type="number"]'));
                
                if (!inputs || inputs.length < 2) {
                    return undefined;
                }
                
                const idx = (labelText === 'Holders Growth %') ? 0 : 1;
                const input = inputs[idx];
                if (!input) {
                    return undefined;
                }

                const value = input.value.trim();
                if (value === '' || value === null) {
                    return undefined;
                }
                return parseFloat(value);
            }

            // Find the label using the same approach as setFieldValue
            const labels = Array.from(document.querySelectorAll('.sidebar-label'));
            const label = labels.find(el => el.textContent.trim() === labelText);

            if (!label) {
                return undefined;
            }

            let container = label.closest('.form-group') || label.parentElement;

            // Dual-state toggles: check first to avoid navigating away from the button
            if (labelText === 'Description' || labelText === 'Fresh Deployer' || labelText === 'Has Buy Signal') {
                let toggleButton = container.querySelector('button');
                if (!toggleButton) {
                    // Climb up cautiously to find the button
                    let searchContainer = container.parentElement;
                    let depth = 0;
                    while (searchContainer && depth < 3) {
                        toggleButton = searchContainer.querySelector('button');
                        if (toggleButton && toggleButton.textContent.trim() !== '×') {
                            break;
                        }
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
    };

    // Function to set a field value in the UI
    CM.setFieldValue = async function(labelText, value, maxRetries = 2) {
        const shouldClear = (value === undefined || value === null || value === "" || value === "clear");

        // Special handling for Holders Growth Filter composite field
        if (labelText === 'Holders Growth %' || labelText === 'Holders Growth Minutes') {
            try {
                // Find the "Holders Growth Filter" block which contains two numeric inputs
                const labels = Array.from(document.querySelectorAll('.sidebar-label'));
                const hgLabel = labels.find(el => el.textContent.trim() === 'Holders Growth Filter');
                if (!hgLabel) {
                    console.warn('Holders Growth Filter label not found');
                    return false;
                }
                let container = hgLabel.parentElement;
                let gridContainer = null;
                let depth = 0;
                
                while (container && depth < 4) {
                    const gridDiv = container.querySelector('.grid.grid-cols-2');
                    if (gridDiv) {
                        gridContainer = gridDiv;
                        break;
                    }
                    container = container.parentElement;
                    depth++;
                }

                if (!gridContainer) {
                    console.warn('Holders Growth grid container not found');
                    return false;
                }
                
                const inputs = Array.from(gridContainer.querySelectorAll('input[type="number"]'));
                
                if (!inputs || inputs.length < 2) {
                    console.warn('Holders Growth inputs not found, found:', inputs.length);
                    return false;
                }
                
                const idx = (labelText === 'Holders Growth %') ? 0 : 1;
                const input = inputs[idx];
                if (!input) {
                    console.warn('Target Holders Growth input not found at expected index');
                    return false;
                }

                let processedValue = value;
                if (!shouldClear) {
                    if (typeof value === 'string' && value.trim() !== '') {
                        processedValue = parseFloat(value);
                    }
                    
                    if (typeof processedValue === 'number' && !isNaN(processedValue)) {
                        // Already good
                    }
                }

                input.focus();
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeInputValueSetter.call(input, shouldClear ? '' : processedValue);
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.blur();
                
                console.log(`✅ Set ${labelText} to ${shouldClear ? 'cleared' : processedValue}`);
                return true;
            } catch (err) {
                console.warn('Error setting Holders Growth Filter:', err.message);
                return false;
            }
        }

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

                // Handle toggle buttons FIRST (Description and Fresh Deployer) before DOM navigation
                if (labelText === "Description" || labelText === "Fresh Deployer" || labelText === "Has Buy Signal") {
                    // Look for toggle button specifically in the label's immediate area
                    let toggleButton = container.querySelector('button');
                    
                    // If not found, try searching in parent containers but only for toggle buttons
                    if (!toggleButton) {
                        let searchContainer = container.parentElement;
                        let searchDepth = 0;
                        while (searchContainer && searchDepth < 3) {
                            toggleButton = searchContainer.querySelector('button');
                            if (toggleButton && toggleButton.textContent.trim() !== '×') {
                                break;
                            }
                            toggleButton = null;
                            searchContainer = searchContainer.parentElement;
                            searchDepth++;
                        }
                    }
                    
                    if (toggleButton && toggleButton.textContent.trim() !== '×') {
                        // Set a toggle button to "Yes" or "Don't care" based on the value
                        // true => "Yes", anything else => "Don't care"
                        const targetText = (value === true) ? "Yes" : "Don't care";
                        let safety = 0;
                        
                        while (toggleButton.textContent.trim() !== targetText && safety < 3) {
                            toggleButton.click();
                            await window.AGUtils.sleep(50);
                            safety++;
                        }
                        
                        console.log(`✅ Set ${labelText} to ${targetText}`);
                        return true;
                    } else {
                        console.warn(`Toggle button not found for ${labelText}`);
                        return false;
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
                        input.value = '';
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        console.log(`✅ Cleared ${labelText}`);
                    } else {
                        input.value = value;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        console.log(`✅ Set ${labelText} to ${value}`);
                    }
                    return true;
                }

                // Handle select dropdowns
                const select = container.querySelector('select');
                if (select) {
                    if (shouldClear) {
                        select.selectedIndex = 0;
                        console.log(`✅ Cleared ${labelText}`);
                    } else {
                        select.value = value;
                        console.log(`✅ Set ${labelText} to ${value}`);
                    }
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    return true;
                }

                await window.AGUtils.sleep(200); // Wait before retry
                
            } catch (error) {
                console.warn(`Attempt ${attempt} failed for ${labelText}:`, error.message);
                if (attempt < maxRetries) {
                    await window.AGUtils.sleep(200);
                }
            }
        }
        return false;
    };

    // ========================================
    // 🌐 EXPORTS
    // ========================================

    // Export to global scope
    if (typeof window !== 'undefined') {
        window.ConfigManager = CM;
        
        // Also export individual components for convenience
        window.CONFIG = CM.CONFIG;
        window.PRESETS = CM.PRESETS;
        
        // Export all functions
        window.ConfigManager = {
            CONFIG: CM.CONFIG,
            PRESETS: CM.PRESETS,
            COMPLETE_CONFIG_TEMPLATE: CM.COMPLETE_CONFIG_TEMPLATE,
            deepClone: CM.deepClone,
            ensureCompleteConfig: CM.ensureCompleteConfig,
            getCurrentConfigFromUI: CM.getCurrentConfigFromUI,
            applyConfigToUI: CM.applyConfigToUI,
            cleanConfiguration: CM.cleanConfiguration,
            getDateRange: CM.getDateRange,
            getScoringMode: CM.getScoringMode,
            getTriggerMode: CM.getTriggerMode,
            getScaledTokenThresholds: CM.getScaledTokenThresholds,
            getDateRangeScaling: CM.getDateRangeScaling,
            formatConfigForDisplay: CM.formatConfigForDisplay,
            getFieldValue: CM.getFieldValue,
            setFieldValue: CM.setFieldValue
        };
    }

    // Return the module
    return CM;

})(typeof AGUtils !== 'undefined' ? AGUtils : (typeof window !== 'undefined' ? window.AGUtils : null));
