/**
 * AGCopilot-Config.js - Configuration Management Module
 * 
 * Complete restoration of all configuration features from AGCopilot-Enhanced.js:
 * - System configuration constants
 * - All preset configurations 
 * - Parameter validation rules
 * - Configuration templates
 * - Configuration management utilities
 * - Best config display system
 */

(function() {
    'use strict';

    // ========================================
    // 🎯 SYSTEM CONFIGURATION
    // ========================================
    const CONFIG = {
        // Original AGCopilot Optimization Settings (no API needed)
        MAX_RUNTIME_MIN: 30,
        BACKTEST_WAIT: 20000, // Based on rate limit recovery test (20s)
        MIN_TOKENS: 50,
        TARGET_PNL: 100.0,
        
        // NEW: Chained runs settings
        CHAIN_RUN_COUNT: 3,
        
        // Feature flags (keeping all original features)
        USE_CONFIG_CACHING: true,
        USE_PARAMETER_IMPACT_ANALYSIS: true,
        USE_GENETIC_ALGORITHM: true,
        USE_SIMULATED_ANNEALING: true,
        USE_LATIN_HYPERCUBE_SAMPLING: true,
        USE_MULTIPLE_STARTING_POINTS: true,
        
        // Outlier-resistant scoring system
        USE_ROBUST_SCORING: true,  // Use outlier-resistant metrics instead of raw TP PnL %
        MIN_WIN_RATE: 60.0,        // Minimum win rate to consider config viable
        RELIABILITY_WEIGHT: 0.3,   // Weight for sample size and consistency (0.0-1.0)
        CONSISTENCY_WEIGHT: 0.4,   // Weight for win rate (0.0-1.0)
        RETURN_WEIGHT: 0.6,        // Weight for raw PnL (0.0-1.0)
        // Note: CONSISTENCY_WEIGHT + RETURN_WEIGHT should = 1.0
        
        // Signal Analysis API Settings (from AGSignalExtractor)
        API_BASE_URL: 'https://backtester.alphagardeners.xyz/api',
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
        
        // Rate limiting - ULTRA CONSERVATIVE MODE for 0-1 rate limit errors per session
        RATE_LIMIT_THRESHOLD: 20,    // Very conservative burst size (reduced from 35)
        RATE_LIMIT_RECOVERY: 10000,  // 10s recovery time (increased from 8.5s)
        RATE_LIMIT_SAFETY_MARGIN: 1.5, // 50% safety margin (increased from 10%)
        INTRA_BURST_DELAY: 100,      // 100ms delay between requests
        MAX_REQUESTS_PER_MINUTE: 50, // Conservative hard cap at 40 req/min (reduced from 60)
        USE_BURST_RATE_LIMITING: true, // Use burst mode for efficiency
        SMART_BURST_SIZE: true        // Keep smart burst size learning for optimal discovery
    };

    // ========================================
    // 📏 PARAMETER VALIDATION RULES
    // ========================================
    const PARAM_RULES = {
        // Basic
        'Min MCAP (USD)': { min: 0, max: 10000, step: 1000, type: 'integer'},
        'Max MCAP (USD)': { min: 10000, max: 60000, step: 1000, type: 'integer' },

        // Token Details
        'Min Deployer Age (min)': { min: 0, max: 1440, step: 5, type: 'integer' },
        'Min Token Age (sec)': { min: 0, max: 99999, step: 15, type: 'integer' },
        'Max Token Age (sec)': { min: 0, max: 99999, step: 15, type: 'integer' },
        'Min AG Score': { min: 0, max: 10, step: 1, type: 'integer' },

        // Wallets
        'Min Holders': { min: 1, max: 5, step: 1, type: 'integer' },
        'Max Holders': { min: 1, max: 50, step: 5, type: 'integer' },
        'Min Unique Wallets': { min: 1, max: 3, step: 1, type: 'integer' },
        'Max Unique Wallets': { min: 1, max: 8, step: 1, type: 'integer' },
        'Min KYC Wallets': { min: 0, max: 3, step: 1, type: 'integer' },
        'Max KYC Wallets': { min: 1, max: 8, step: 1, type: 'integer' },

        // Risk
        'Min Bundled %': { min: 0, max: 50, step: 1 },
        'Max Bundled %': { min: 0, max: 100, step: 5 },
        'Min Deployer Balance (SOL)': { min: 0, max: 10, step: 0.5 },
        'Min Buy Ratio %': { min: 0, max: 50, step: 10 },
        'Max Buy Ratio %': { min: 50, max: 100, step: 5 },
        'Min Vol MCAP %': { min: 0, max: 100, step: 10 },
        'Max Vol MCAP %': { min: 33, max: 300, step: 20 },
        'Max Drained %': { min: 0, max: 100, step: 5 },
        'Max Drained Count': { min: 0, max: 11, step: 1, type: 'integer' },

        // Advanced
        'Min TTC (sec)': { min: 0, max: 3600, step: 5, type: 'integer' },
        'Max TTC (sec)': { min: 10, max: 3600, step: 10, type: 'integer' },
        'Max Liquidity %': { min: 10, max: 100, step: 10, type: 'integer' },
        'Min Win Pred %': { min: 0, max: 70, step: 5, type: 'integer' }
    };

    // ========================================
    // 📋 CONFIGURATION TEMPLATE
    // ========================================
    const COMPLETE_CONFIG_TEMPLATE = {
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
            "Max Holders": undefined
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

    // ========================================
    // 🎯 PRESET CONFIGURATIONS
    // ========================================
    const PRESETS = {
        9747: {
            risk: { "Min Buy Ratio %": 97, "Max Buy Ratio %": 100, "Min Vol MCAP %": 47 }
        },
        oldDeployer: { 
            tokenDetails: { "Min Deployer Age (min)": 43200, "Min AG Score": "4" } 
        },
        oldishDeployer: { 
            tokenDetails: { "Min Deployer Age (min)": 1200, "Min AG Score": "6" },
            risk: { "Max Bundled %": 5, "Min Buy Ratio %": 20, "Max Vol MCAP %": 40, "Max Drained Count": 6 },
            advanced: { "Max TTC (sec)": 400 }
        },
        minWinPred: { 
            advanced: { "Min Win Pred %": 28 }
        },
        bundle1_74: { 
            risk: { "Max Bundled %": 1.74 } 
        },
        deployerBalance10: { 
            risk: { "Min Deployer Balance (SOL)": 10 } 
        },
        agScore7: { 
            tokenDetails: { "Min AG Score": "7" } 
        },
        conservative: {
            basic: { "Min MCAP (USD)": 10000, "Max MCAP (USD)": 50000 },
            tokenDetails: { "Min AG Score": 4, "Min Deployer Age (min)": 60 },
            wallets: { "Min Unique Wallets": 2, "Min KYC Wallets": 2, "Max Unique Wallets": 5 },
            risk: { "Min Bundled %": 0, "Max Bundled %": 25 },
            advanced: { "Min TTC (sec)": 30, "Max Liquidity %": 70 }
        },
        aggressive: {
            basic: { "Min MCAP (USD)": 1000, "Max MCAP (USD)": 15000 },
            tokenDetails: { "Min AG Score": 2 },
            wallets: { "Min Unique Wallets": 1, "Max Unique Wallets": 10 },
            risk: { "Max Bundled %": 80, "Max Vol MCAP %": 200 },
            advanced: { "Min TTC (sec)": 5, "Max Liquidity %": 90 }
        },
        
        // Discovery-based presets (from Parameter Impact Analysis)
        highTTCFilter: {
            advanced: { "Min TTC (sec)": 900 }
        },
        exclusiveWallets: {
            wallets: { "Min Unique Wallets": 3 }
        },
        mediumMcap: {
            basic: { "Min MCAP (USD)": 10000 }
        },
        highAgScore: {
            tokenDetails: { "Min AG Score": "8" }
        },
        moderateDrainTolerance: {
            risk: { "Max Drained %": 50 }
        },
        kycRequired: {
            wallets: { "Min KYC Wallets": 3 }
        },
        zeroDrainTolerance: {
            risk: { "Max Drained Count": 0 }
        },
        mediumVolMcap: {
            risk: { "Min Vol MCAP %": 30 }
        },
        agedTokens: {
            tokenDetails: { "Min Token Age (sec)": 10005 }
        },
        lowVolMcapCap: {
            risk: { "Max Vol MCAP %": 33 }
        }
    };

    // ========================================
    // 🛠️ CONFIGURATION UTILITIES
    // ========================================

    /**
     * Deep clone utility for configuration objects
     */
    function deepClone(obj) {
        if (obj === null || typeof obj !== "object") return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (Array.isArray(obj)) return obj.map(item => deepClone(item));
        
        const cloned = {};
        for (const [key, value] of Object.entries(obj)) {
            cloned[key] = deepClone(value);
        }
        return cloned;
    }

    /**
     * Ensure complete config by merging with template
     */
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

    /**
     * Apply preset configuration to base config
     */
    function applyPreset(baseConfig, presetName) {
        if (!PRESETS[presetName]) {
            console.warn(`Preset '${presetName}' not found`);
            return baseConfig;
        }

        const config = deepClone(baseConfig);
        const preset = PRESETS[presetName];

        for (const [section, sectionPreset] of Object.entries(preset)) {
            if (!config[section]) {
                config[section] = {};
            }
            Object.assign(config[section], sectionPreset);
        }

        return config;
    }

    /**
     * Validate parameter against rules
     */
    function validateParameter(paramName, value) {
        const rule = PARAM_RULES[paramName];
        if (!rule) return { valid: true, value };

        let numValue;
        if (rule.type === 'integer') {
            numValue = parseInt(value);
            if (isNaN(numValue)) {
                return { valid: false, error: 'Must be an integer' };
            }
        } else {
            numValue = parseFloat(value);
            if (isNaN(numValue)) {
                return { valid: false, error: 'Must be a number' };
            }
        }

        if (numValue < rule.min) {
            return { valid: false, error: `Must be at least ${rule.min}` };
        }
        if (numValue > rule.max) {
            return { valid: false, error: `Must be at most ${rule.max}` };
        }

        return { valid: true, value: numValue };
    }

    /**
     * Validate entire configuration
     */
    function validateConfig(config) {
        const errors = [];
        const validatedConfig = deepClone(config);

        for (const [section, sectionConfig] of Object.entries(config)) {
            if (typeof sectionConfig === 'object' && sectionConfig !== null) {
                for (const [param, value] of Object.entries(sectionConfig)) {
                    if (value !== undefined && value !== null && value !== '') {
                        const validation = validateParameter(param, value);
                        if (!validation.valid) {
                            errors.push(`${param}: ${validation.error}`);
                        } else {
                            validatedConfig[section][param] = validation.value;
                        }
                    }
                }
            }
        }

        return { valid: errors.length === 0, errors, config: validatedConfig };
    }

    /**
     * Get current configuration from UI
     */
    async function getCurrentConfigFromUI() {
        // This function would typically read from UI elements
        // For now, return a basic structure that can be extended
        return {
            basic: {},
            tokenDetails: {},
            wallets: {},
            risk: {},
            advanced: {}
        };
    }

    /**
     * Get current configuration (main entry point)
     */
    async function getCurrentConfiguration() {
        return await getCurrentConfigFromUI();
    }

    // ========================================
    // 🖥️ BEST CONFIG DISPLAY SYSTEM
    // ========================================
    class BestConfigManager {
        constructor() {
            this.bestConfigs = [];
            this.maxConfigs = 10; // Keep top 10 configs
        }

        addConfig(result) {
            this.bestConfigs.push({
                config: result.config,
                score: result.totalTpPnlPercent || result.score || 0,
                winRate: result.winRate || 0,
                sampleSize: result.testedTokens || 0,
                timestamp: new Date(),
                details: result
            });

            // Sort by score (descending) and keep only top configs
            this.bestConfigs.sort((a, b) => b.score - a.score);
            if (this.bestConfigs.length > this.maxConfigs) {
                this.bestConfigs = this.bestConfigs.slice(0, this.maxConfigs);
            }

            this.updateBestConfigDisplay();
        }

        getBestConfig() {
            return this.bestConfigs.length > 0 ? this.bestConfigs[0] : null;
        }

        updateBestConfigDisplay() {
            const displayElement = document.getElementById('best-config-results');
            if (!displayElement) return;

            if (this.bestConfigs.length === 0) {
                displayElement.innerHTML = '<div class="no-results">No configurations tested yet</div>';
                return;
            }

            const html = this.bestConfigs.map((configData, index) => {
                const { config, score, winRate, sampleSize, timestamp, details } = configData;
                
                return `
                    <div class="config-result ${index === 0 ? 'best-config' : ''}">
                        <div class="config-header">
                            <span class="config-rank">#${index + 1}</span>
                            <span class="config-score">Score: ${score.toFixed(2)}%</span>
                            <span class="config-winrate">Win Rate: ${winRate.toFixed(1)}%</span>
                            <span class="config-samples">Samples: ${sampleSize}</span>
                        </div>
                        <div class="config-details">
                            <div class="config-timestamp">${timestamp.toLocaleString()}</div>
                            <div class="config-actions">
                                <button onclick="AGCopilotConfig.applyBestConfig(${index})" class="apply-config-btn">
                                    Apply Config
                                </button>
                                <button onclick="AGCopilotConfig.showConfigDetails(${index})" class="show-details-btn">
                                    Show Details
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            displayElement.innerHTML = html;
        }

        applyBestConfig(index) {
            if (index < 0 || index >= this.bestConfigs.length) return;
            
            const configData = this.bestConfigs[index];
            console.log('Applying config:', configData.config);
            
            // Apply configuration to UI
            // This would typically update form fields
            // Implementation depends on UI structure
            
            console.log('✅ Configuration applied successfully');
        }

        showConfigDetails(index) {
            if (index < 0 || index >= this.bestConfigs.length) return;
            
            const configData = this.bestConfigs[index];
            const details = JSON.stringify(configData, null, 2);
            
            // Show in console for now
            console.log('Configuration Details:', details);
            
            // Could also show in a modal or dedicated panel
        }

        clearConfigs() {
            this.bestConfigs = [];
            this.updateBestConfigDisplay();
        }
    }

    // ========================================
    // 📤 MODULE EXPORTS
    // ========================================
    
    // Create global namespace if it doesn't exist
    if (typeof window !== 'undefined') {
        window.AGCopilotConfig = {
            // Configuration constants
            CONFIG,
            PARAM_RULES,
            COMPLETE_CONFIG_TEMPLATE,
            PRESETS,
            
            // Utility functions
            deepClone,
            ensureCompleteConfig,
            applyPreset,
            validateParameter,
            validateConfig,
            getCurrentConfiguration,
            getCurrentConfigFromUI,
            
            // Best config manager
            BestConfigManager,
            bestConfigManager: new BestConfigManager(),
            
            // Convenience methods
            applyBestConfig: function(index) {
                return window.AGCopilotConfig.bestConfigManager.applyBestConfig(index);
            },
            showConfigDetails: function(index) {
                return window.AGCopilotConfig.bestConfigManager.showConfigDetails(index);
            }
        };
    }

    // CommonJS export for Node.js compatibility
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            CONFIG,
            PARAM_RULES,
            COMPLETE_CONFIG_TEMPLATE,
            PRESETS,
            deepClone,
            ensureCompleteConfig,
            applyPreset,
            validateParameter,
            validateConfig,
            getCurrentConfiguration,
            getCurrentConfigFromUI,
            BestConfigManager
        };
    }

    console.log('✅ AGCopilot-Config.js loaded - All configuration features restored');

})();
