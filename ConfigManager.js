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
        'balanced-performance': {
            name: 'Balanced Performance',
            description: 'Good balance of performance and conservative approach',
            aggressiveness: 'medium',
            config: {
                takeProfits: [25, 50, 100],
                stopLoss: 5,
                dynamicSL: true,
                minTokens: 100,
                maxRuntimeMin: 30,
                targetPnlPercent: 100,
                maxConcurrentRequests: 3,
                enableCaching: true
            }
        },
        'conservative-safe': {
            name: 'Conservative Safe',
            description: 'Lower risk approach with higher confidence thresholds',
            aggressiveness: 'low',
            config: {
                takeProfits: [50, 100],
                stopLoss: 3,
                dynamicSL: false,
                minTokens: 200,
                maxRuntimeMin: 20,
                targetPnlPercent: 75,
                maxConcurrentRequests: 2,
                enableCaching: true
            }
        },
        'aggressive-performance': {
            name: 'Aggressive Performance',
            description: 'Higher risk for potentially better returns',
            aggressiveness: 'high',
            config: {
                takeProfits: [25, 50, 75, 100, 150],
                stopLoss: 7,
                dynamicSL: true,
                minTokens: 50,
                maxRuntimeMin: 45,
                targetPnlPercent: 150,
                maxConcurrentRequests: 5,
                enableCaching: true
            }
        },
        'experimental-ai': {
            name: 'Experimental AI',
            description: 'Latest AI features with enhanced signal detection',
            aggressiveness: 'high',
            config: {
                takeProfits: [25, 50, 100, 200],
                stopLoss: 6,
                dynamicSL: true,
                minTokens: 75,
                maxRuntimeMin: 60,
                targetPnlPercent: 125,
                maxConcurrentRequests: 4,
                enableCaching: true,
                enableAIEnhancements: true,
                minSignalConfidence: 0.7,
                adaptiveThresholdLearning: true,
                anomalyDetection: true
            }
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

    // ========================================
    // 🌐 EXPORTS
    // ========================================

    // Export to global scope
    if (typeof window !== 'undefined') {
        window.ConfigManager = CM;
        
        // Also export individual components for convenience
        window.CONFIG = CM.CONFIG;
        window.PRESETS = CM.PRESETS;
    }

    // Return the module
    return CM;

})(typeof AGUtils !== 'undefined' ? AGUtils : (typeof window !== 'undefined' ? window.AGUtils : null));
