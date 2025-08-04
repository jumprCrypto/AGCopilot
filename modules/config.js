// ========================================
// 🎯 CONFIGURATION MODULE
// ========================================

export const CONFIG = {
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
    MIN_WIN_RATE: 40.0,        // Minimum win rate to consider config viable
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

// Parameter validation rules (same as original AGCopilot)
export const PARAM_RULES = {
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

// Complete config template for backward compatibility (with Description and Fresh Deployer)
export const COMPLETE_CONFIG_TEMPLATE = {
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

// Preset configurations (all original presets restored)
export const PRESETS = {
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
    }
};
