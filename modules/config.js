/**
 * @fileoverview Configuration constants and templates for AGCopilot tools
 * @version 1.0.0
 */

/**
 * Complete configuration template for proper initialization
 */
export const COMPLETE_CONFIG_TEMPLATE = {
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

/**
 * Default configuration for AG Copilot Legacy
 */
export const LEGACY_CONFIG = {
    // Performance settings
    MAX_RUNTIME_MIN: 30,
    BACKTEST_WAIT: 20000,
    MIN_TOKENS: 10,
    TARGET_PNL: 100.0,
    
    // Feature flags
    USE_CONFIG_CACHING: true,
    USE_PARAMETER_IMPACT_ANALYSIS: true,
    USE_GENETIC_ALGORITHM: true,
    USE_SIMULATED_ANNEALING: true,
    USE_LATIN_HYPERCUBE_SAMPLING: true,
    USE_MULTIPLE_STARTING_POINTS: true,
    USE_DEEP_DIVE: true,
    USE_COMBINATION_PHASE: true,
    USE_CONTINUOUS_EXPLORATION: true,
    USE_CORRELATED_PARAMETER_PHASE: true,
    
    // Rate limiting
    AGGRESSIVE_RATE_LIMITING: true,
    PARAMETER_DELAY: 1000,
    SECTION_DELAY: 2000,
    FORM_DELAY: 500,
    
    // Baseline config
    BASELINE: {},
    
    // Results sorting and export
    SORT_BY_TP_GAIN: true,
    EXPORT_OPTIMIZED_CONFIG: true
};

/**
 * Default configuration for AG Copilot Enhanced
 */
export const ENHANCED_CONFIG = {
    // Original AGCopilot Optimization Settings
    MAX_RUNTIME_MIN: 30,
    BACKTEST_WAIT: 20000,
    MIN_TOKENS: 10,
    TARGET_PNL: 100.0,
    
    // Chained runs settings
    CHAIN_RUN_COUNT: 3,
    
    // Feature flags
    USE_CONFIG_CACHING: true,
    USE_PARAMETER_IMPACT_ANALYSIS: true,
    USE_GENETIC_ALGORITHM: true,
    USE_SIMULATED_ANNEALING: true,
    USE_LATIN_HYPERCUBE_SAMPLING: true,
    
    // Outlier-resistant scoring system
    SCORING_MODE: 'robust', // 'robust' | 'tp_only' | 'winrate_only'
    MIN_WIN_RATE: 50.0,
    MIN_WIN_RATE_MEDIUM_SAMPLE: 40.0,
    MIN_WIN_RATE_LARGE_SAMPLE: 30.0,
    MEDIUM_SAMPLE_THRESHOLD: 500,
    LARGE_SAMPLE_THRESHOLD: 1000,
    RELIABILITY_WEIGHT: 0.3,
    CONSISTENCY_WEIGHT: 0.4,
    RETURN_WEIGHT: 0.6,
    
    // Signal Analysis API Settings
    API_BASE_URL: 'https://backtester.alphagardeners.xyz/api',
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    REQUEST_DELAY: 9360,
    
    // Backtester API Settings
    DEFAULT_BUYING_AMOUNT: 0.25,
    
    // Take Profit configurations
    TP_CONFIGURATIONS: [
        { size: 20, gain: 300 },
        { size: 20, gain: 200 },
        { size: 20, gain: 100 },
        { size: 20, gain: 50 },
        { size: 20, gain: 25 }
    ],
    
    // Parameter ranges for optimization
    PARAMETER_RANGES: {
        // Basic
        'Min MCAP (USD)': { min: 10000, max: 10000000, step: 50000 },
        'Max MCAP (USD)': { min: 50000, max: 50000000, step: 100000 },
        
        // Token Details
        'Min Deployer Age (min)': { min: 0, max: 10080, step: 60 },
        'Max Token Age (min)': { min: 5, max: 10080, step: 60 },
        'Min AG Score': { min: 0, max: 100, step: 5 },
        
        // Wallets
        'Min Unique Wallets': { min: 1, max: 500, step: 10 },
        'Max Unique Wallets': { min: 50, max: 2000, step: 50 },
        'Min KYC Wallets': { min: 0, max: 100, step: 5 },
        'Max KYC Wallets': { min: 10, max: 500, step: 20 },
        
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
        'Min TTC (sec)': { min: 0, max: 3600, step: 30 },
        'Max TTC (sec)': { min: 30, max: 7200, step: 60 },
        'Max Liquidity %': { min: 1, max: 100, step: 5 },
        'Min Win Pred %': { min: 0, max: 100, step: 5 }
    }
};

/**
 * Configuration for Signal Extractor
 */
export const SIGNAL_EXTRACTOR_CONFIG = {
    API_BASE_URL: 'https://backtester.alphagardeners.xyz/api',
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    REQUEST_DELAY: 500
};

/**
 * UI Configuration constants
 */
export const UI_CONFIG = {
    // Progress bar settings
    PROGRESS_BAR_HEIGHT: '4px',
    PROGRESS_BAR_COLORS: {
        background: '#333',
        fill: '#4CAF50',
        text: '#fff'
    },
    
    // Modal settings
    MODAL_Z_INDEX: 10000,
    OVERLAY_OPACITY: 0.8,
    
    // Animation durations
    FADE_DURATION: 300,
    SLIDE_DURATION: 250,
    
    // Responsive breakpoints
    MOBILE_BREAKPOINT: 768,
    TABLET_BREAKPOINT: 1024
};

/**
 * API endpoint configurations
 */
export const API_ENDPOINTS = {
    STATS: '/stats',
    TOKEN_INFO: '/token-info',
    TOKEN_SWAPS: '/token-swaps',
    BATCH_ANALYSIS: '/batch-analysis'
};

/**
 * Error messages and user feedback
 */
export const MESSAGES = {
    ERRORS: {
        NETWORK_ERROR: 'Network error occurred. Please check your connection.',
        API_ERROR: 'API request failed. Please try again.',
        VALIDATION_ERROR: 'Invalid configuration. Please check your inputs.',
        TIMEOUT_ERROR: 'Request timed out. Please try again.',
        RATE_LIMIT_ERROR: 'Rate limit exceeded. Please wait and try again.'
    },
    SUCCESS: {
        CONFIG_SAVED: 'Configuration saved successfully.',
        OPTIMIZATION_COMPLETE: 'Optimization completed successfully.',
        DATA_EXPORTED: 'Data exported successfully.'
    },
    INFO: {
        STARTING_OPTIMIZATION: 'Starting optimization...',
        LOADING_DATA: 'Loading data...',
        PROCESSING: 'Processing...'
    }
};

/**
 * Default parameter impact scores for optimization priority
 */
export const DEFAULT_PARAMETER_IMPACTS = [
    { param: 'Max Unique Wallets', section: 'wallets', impact: 45.5 },
    { param: 'Max KYC Wallets', section: 'wallets', impact: 44.5 },
    { param: 'Min Bundled %', section: 'risk', impact: 44.5 },
    { param: 'Min Unique Wallets', section: 'wallets', impact: 40.5 },
    { param: 'Min KYC Wallets', section: 'wallets', impact: 40.0 },
    { param: 'Max Bundled %', section: 'risk', impact: 39.5 },
    { param: 'Min Buy Ratio %', section: 'risk', impact: 38.0 },
    { param: 'Max Buy Ratio %', section: 'risk', impact: 37.5 },
    { param: 'Min Vol MCAP %', section: 'risk', impact: 35.0 },
    { param: 'Max Vol MCAP %', section: 'risk', impact: 34.5 },
    { param: 'Min MCAP (USD)', section: 'basic', impact: 32.0 },
    { param: 'Max MCAP (USD)', section: 'basic', impact: 31.5 },
    { param: 'Max Drained %', section: 'risk', impact: 30.0 },
    { param: 'Max Drained Count', section: 'risk', impact: 29.5 },
    { param: 'Min Deployer Balance (SOL)', section: 'risk', impact: 28.0 },
    { param: 'Min AG Score', section: 'tokenDetails', impact: 25.0 },
    { param: 'Min Deployer Age (min)', section: 'tokenDetails', impact: 22.0 },
    { param: 'Max Token Age (min)', section: 'tokenDetails', impact: 20.0 },
    { param: 'Min TTC (sec)', section: 'advanced', impact: 18.0 },
    { param: 'Max TTC (sec)', section: 'advanced', impact: 17.5 },
    { param: 'Min Win Pred %', section: 'advanced', impact: 15.0 },
    { param: 'Max Liquidity %', section: 'advanced', impact: 12.0 }
];