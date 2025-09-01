// AGCopilot-Modular.js
// Modular version of AGCopilot - loads and coordinates all modules
// This is the main entry point for the bookmarklet

(async function() {
    'use strict';

    console.clear();
    console.log('%c🤖 AG Copilot v3.0 - Modular Edition 🤖', 'color: blue; font-size: 16px; font-weight: bold;');
    console.log('%c🔧 Loading modular architecture...', 'color: green; font-size: 12px;');

    // ========================================
    // 🏗️ MODULE LOADER
    // ========================================
    
    const MODULE_BASE_URL = 'https://raw.githubusercontent.com/jumprCrypto/AGCopilot/refs/heads/module/AGCopilot/';
    
    const MODULES = [
        'BurstRateLimiter.js',
        'ApiClient.js', 
        'RobustScoring.js',
        'OptimizationEngine.js',
        'SignalAnalysis.js',
        'UIManager.js',
        'ParameterDiscovery.js',
        'PinSettings.js',
        'OptimizationTracker.js',
        'ConfigManager.js'
    ];

    // Global utilities that modules can depend on
    window.AGUtils = {
        sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
        deepClone: (obj) => {
            if (obj === null || typeof obj !== "object") return obj;
            if (obj instanceof Date) return new Date(obj.getTime());
            if (Array.isArray(obj)) return obj.map(item => window.AGUtils.deepClone(item));
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = window.AGUtils.deepClone(obj[key]);
                }
            }
            return cloned;
        },
        formatTimestamp: (timestamp) => {
            if (!timestamp) return 'N/A';
            return new Date(timestamp * 1000).toISOString().replace('T', ' ').split('.')[0];
        },
        formatMcap: (mcap) => {
            if (!mcap) return 'N/A';
            if (mcap >= 1000000) return `$${(mcap / 1000000).toFixed(2)}M`;
            if (mcap >= 1000) return `$${(mcap / 1000).toFixed(2)}K`;
            return `$${mcap}`;
        },
        formatPercent: (value) => {
            if (value === null || value === undefined) return 'N/A';
            return `${value.toFixed(2)}%`;
        }
    };

    // Module loading with error handling and retries
    async function loadModule(moduleName, retries = 3) {
        const url = MODULE_BASE_URL + moduleName;
        
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`📦 Loading ${moduleName} (attempt ${attempt}/${retries})`);
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const code = await response.text();
                
                // Execute module code
                eval(code);
                
                console.log(`✅ ${moduleName} loaded successfully`);
                return true;
                
            } catch (error) {
                console.warn(`❌ Failed to load ${moduleName} (attempt ${attempt}): ${error.message}`);
                
                if (attempt === retries) {
                    console.error(`💥 Failed to load ${moduleName} after ${retries} attempts`);
                    return false;
                }
                
                // Wait before retry
                await window.AGUtils.sleep(1000 * attempt);
            }
        }
        
        return false;
    }

    // Load all modules
    async function loadAllModules() {
        console.log(`🔄 Loading ${MODULES.length} modules...`);
        
        const loadPromises = MODULES.map(module => loadModule(module));
        const results = await Promise.allSettled(loadPromises);
        
        const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
        const failed = MODULES.length - successful;
        
        console.log(`📊 Module loading complete: ${successful}/${MODULES.length} successful`);
        
        if (failed > 0) {
            console.warn(`⚠️ ${failed} modules failed to load. Some features may be unavailable.`);
        }
        
        return { successful, failed, total: MODULES.length };
    }

    // ========================================
    // 📋 CORE CONFIGURATION
    // ========================================
    
    // Core configuration - kept minimal in main loader
    const CONFIG = {
        MAX_RUNTIME_MIN: 30,
        BACKTEST_WAIT: 20000,
        MIN_TOKENS: 10,
        TARGET_PNL: 100.0,
        CHAIN_RUN_COUNT: 3,
        
        // Feature flags
        USE_CONFIG_CACHING: true,
        USE_PARAMETER_IMPACT_ANALYSIS: true,
        USE_GENETIC_ALGORITHM: true,
        USE_SIMULATED_ANNEALING: true,
        USE_LATIN_HYPERCUBE_SAMPLING: true,
        
        // Scoring configuration
        SCORING_MODE: 'robust',
        MIN_WIN_RATE: 35.0,
        MIN_WIN_RATE_MEDIUM_SAMPLE: 33.0,
        MIN_WIN_RATE_LARGE_SAMPLE: 30.0,
        RELIABILITY_WEIGHT: 0.3,
        CONSISTENCY_WEIGHT: 0.4,
        RETURN_WEIGHT: 0.6,
        
        // API settings
        API_BASE_URL: 'https://backtester.alphagardeners.xyz/api',
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000,
        REQUEST_DELAY: 9360,
        DEFAULT_BUYING_AMOUNT: 0.25,
        
        // Take Profit configuration
        TP_CONFIGURATIONS: [
            { size: 20, gain: 300 },
            { size: 20, gain: 650 },
            { size: 20, gain: 1400 },
            { size: 20, gain: 3000 },
            { size: 20, gain: 10000 }
        ],
        
        // Rate limiting
        RATE_LIMIT_THRESHOLD: 20,
        RATE_LIMIT_RECOVERY: 10000,
        RATE_LIMIT_SAFETY_MARGIN: 1.5,
        INTRA_BURST_DELAY: 100,
        MAX_REQUESTS_PER_MINUTE: 50,
        USE_BURST_RATE_LIMITING: true,
        SMART_BURST_SIZE: true,
        
        RATE_LIMIT_MODE: 'normal',
        RATE_LIMIT_MODES: {
            normal: {
                BACKTEST_WAIT: 20000,
                RATE_LIMIT_THRESHOLD: 20,
                RATE_LIMIT_RECOVERY: 10000,
                REQUEST_DELAY: 9360,
                INTRA_BURST_DELAY: 100
            },
            slower: {
                BACKTEST_WAIT: 30000,
                RATE_LIMIT_THRESHOLD: 15,
                RATE_LIMIT_RECOVERY: 15000,
                REQUEST_DELAY: 14000,
                INTRA_BURST_DELAY: 150
            }
        }
    };

    // Parameter validation rules
    const PARAM_RULES = {
        'Min MCAP (USD)': { min: 0, max: 20000, step: 1000, type: 'integer'},
        'Max MCAP (USD)': { min: 10000, max: 60000, step: 1000, type: 'integer' },
        'Min Deployer Age (min)': { min: 0, max: 10080, step: 5, type: 'integer' },
        'Min Token Age (sec)': { min: 0, max: 86400, step: 15, type: 'integer' },
        'Max Token Age (sec)': { min: 0, max: 259200, step: 15, type: 'integer' },
        'Min AG Score': { min: 0, max: 10, step: 1, type: 'integer' },
        'Min Holders': { min: 1, max: 5, step: 1, type: 'integer' },
        'Max Holders': { min: 1, max: 50, step: 5, type: 'integer' },
        'Holders Growth %': { min: 0, max: 500, step: 10, type: 'integer' },
        'Holders Growth Minutes': { min: 0, max: 1440, step: 10, type: 'integer' },
        'Min Unique Wallets': { min: 1, max: 3, step: 1, type: 'integer' },
        'Max Unique Wallets': { min: 1, max: 8, step: 1, type: 'integer' },
        'Min KYC Wallets': { min: 0, max: 3, step: 1, type: 'integer' },
        'Max KYC Wallets': { min: 1, max: 8, step: 1, type: 'integer' },
        'Min Bundled %': { min: 0, max: 50, step: 1 },
        'Max Bundled %': { min: 0, max: 100, step: 5 },
        'Min Deployer Balance (SOL)': { min: 0, max: 10, step: 0.5 },
        'Min Buy Ratio %': { min: 0, max: 50, step: 10 },
        'Max Buy Ratio %': { min: 50, max: 100, step: 5 },
        'Min Vol MCAP %': { min: 0, max: 100, step: 10 },
        'Max Vol MCAP %': { min: 33, max: 300, step: 20 },
        'Max Drained %': { min: 0, max: 100, step: 5 },
        'Max Drained Count': { min: 0, max: 11, step: 1, type: 'integer' },
        'Min TTC (sec)': { min: 0, max: 259200, step: 5, type: 'integer' },
        'Max TTC (sec)': { min: 10, max: 259200, step: 10, type: 'integer' },
        'Max Liquidity %': { min: 10, max: 100, step: 10, type: 'integer' },
        'Min Win Pred %': { min: 0, max: 70, step: 5, type: 'integer' }
    };

    // ========================================
    // 🚀 INITIALIZATION
    // ========================================
    
    // Initialize global state
    window.CONFIG = CONFIG;
    window.PARAM_RULES = PARAM_RULES;
    window.STOPPED = false;
    
    // Initialize optimization tracking
    window.optimizationTracker = null;
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
    
    // Initialize pin settings
    window.pinnedSettings = {
        enabled: false,
        settings: {},
        timeout: 10000
    };

    try {
        // Load all modules
        const moduleResults = await loadAllModules();
        
        if (moduleResults.successful === 0) {
            throw new Error('No modules loaded successfully. Cannot continue.');
        }

        // Initialize core systems after modules are loaded
        console.log('🔧 Initializing core systems...');

        // Initialize rate limiter
        if (window.BurstRateLimiter) {
            window.burstRateLimiter = new window.BurstRateLimiter(
                CONFIG.RATE_LIMIT_THRESHOLD,
                CONFIG.RATE_LIMIT_RECOVERY,
                CONFIG.RATE_LIMIT_SAFETY_MARGIN,
                {
                    intraBurstDelay: CONFIG.INTRA_BURST_DELAY,
                    maxRequestsPerMinute: CONFIG.MAX_REQUESTS_PER_MINUTE,
                    smartBurstSize: CONFIG.SMART_BURST_SIZE
                },
                window.AGUtils
            );
            console.log('✅ Rate limiter initialized');
        }

        // Initialize API client
        if (window.ApiClient) {
            window.backtesterAPI = new window.ApiClient(window.AGUtils, CONFIG, window.burstRateLimiter);
            console.log('✅ API client initialized');
        }

        // Initialize UI
        if (window.UIManager) {
            const container = window.UIManager.createMainInterface({
                title: '🤖 AG Copilot v3.0 - Modular'
            });
            console.log('✅ UI initialized');
            
            // Create main interface sections
            await createMainInterface();
        }

        // Initialize optimization tracker
        if (window.OptimizationTracker) {
            window.optimizationTracker = new window.OptimizationTracker();
            console.log('✅ Optimization tracker initialized');
        }

        console.log('%c🎉 AG Copilot Modular loaded successfully!', 'color: green; font-size: 14px; font-weight: bold;');
        console.log(`📊 Modules loaded: ${moduleResults.successful}/${moduleResults.total}`);
        
        if (window.UIManager) {
            window.UIManager.showNotification('AG Copilot Modular loaded successfully!', 'success');
        }

    } catch (error) {
        console.error('💥 Failed to initialize AG Copilot:', error);
        alert(`Failed to load AG Copilot: ${error.message}`);
    }

    // ========================================
    // 🎨 MAIN INTERFACE CREATION
    // ========================================
    
    async function createMainInterface() {
        const contentArea = document.getElementById('ag-content-area');
        if (!contentArea) return;

        // Create main sections
        const optimizationSection = createOptimizationSection();
        const signalSection = createSignalAnalysisSection();
        const settingsSection = createSettingsSection();

        contentArea.appendChild(optimizationSection);
        contentArea.appendChild(signalSection);
        contentArea.appendChild(settingsSection);

        // Make responsive
        if (window.UIManager) {
            window.UIManager.makeResponsive();
        }
    }

    function createOptimizationSection() {
        if (!window.UIManager) return document.createElement('div');

        const content = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                ${window.UIManager.createInputField({
                    id: 'target-pnl',
                    label: 'Target PnL %',
                    type: 'number',
                    value: '100',
                    min: '0',
                    step: '0.1'
                }).outerHTML}
                ${window.UIManager.createInputField({
                    id: 'max-runtime',
                    label: 'Max Runtime (min)',
                    type: 'number',
                    value: '30',
                    min: '1',
                    max: '240'
                }).outerHTML}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                ${window.UIManager.createInputField({
                    id: 'chain-runs',
                    label: 'Chained Runs',
                    type: 'number',
                    value: '3',
                    min: '1',
                    max: '50'
                }).outerHTML}
                ${window.UIManager.createSelect({
                    id: 'scoring-mode',
                    label: 'Scoring Mode',
                    options: [
                        { value: 'robust', text: 'Robust Multi-Factor' },
                        { value: 'tp_only', text: 'TP PnL Only' },
                        { value: 'winrate_only', text: 'Win Rate Only' }
                    ],
                    value: 'robust'
                }).outerHTML}
            </div>
            <div style="margin-bottom: 12px;">
                ${window.UIManager.createButton({
                    id: 'start-optimization',
                    text: '🚀 Start Optimization',
                    style: 'primary',
                    onClick: () => console.log('Start optimization clicked')
                }).outerHTML}
            </div>
            <div id="optimization-progress"></div>
            <div id="optimization-stats"></div>
        `;

        return window.UIManager.createFormSection('🔍 Optimization', content);
    }

    function createSignalAnalysisSection() {
        if (!window.UIManager) return document.createElement('div');

        const content = `
            <div style="margin-bottom: 8px;">
                <label style="display: block; margin-bottom: 4px; font-size: 10px; color: #a0aec0;">Contract Addresses (one per line)</label>
                <textarea id="signal-contract-input" style="
                    width: 100%;
                    height: 60px;
                    padding: 6px 8px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 4px;
                    color: #e2e8f0;
                    font-size: 11px;
                    resize: vertical;
                    box-sizing: border-box;
                " placeholder="Enter contract addresses..."></textarea>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                ${window.UIManager.createInputField({
                    id: 'signals-per-token',
                    label: 'Signals per Token',
                    type: 'number',
                    value: '3',
                    min: '1',
                    max: '10'
                }).outerHTML}
                ${window.UIManager.createInputField({
                    id: 'config-buffer',
                    label: 'Buffer %',
                    type: 'number',
                    value: '10',
                    min: '0',
                    max: '50'
                }).outerHTML}
            </div>
            <div style="margin-bottom: 12px;">
                ${window.UIManager.createButton({
                    id: 'analyze-signals',
                    text: '🔬 Analyze Signals',
                    style: 'secondary',
                    onClick: () => {
                        if (window.SignalAnalysis) {
                            window.SignalAnalysis.handleSignalAnalysis();
                        }
                    }
                }).outerHTML}
            </div>
            <div id="signal-analysis-results" style="
                background: rgba(0, 0, 0, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                padding: 8px;
                max-height: 120px;
                overflow-y: auto;
                font-size: 9px;
                display: none;
            "></div>
        `;

        return window.UIManager.createFormSection('🔬 Signal Analysis', content);
    }

    function createSettingsSection() {
        if (!window.UIManager) return document.createElement('div');

        const content = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                <label style="display: flex; align-items: center; font-size: 10px; cursor: pointer;">
                    <input type="checkbox" id="use-caching" checked style="margin-right: 6px;">
                    Config Caching
                </label>
                <label style="display: flex; align-items: center; font-size: 10px; cursor: pointer;">
                    <input type="checkbox" id="parameter-discovery" checked style="margin-right: 6px;">
                    Parameter Discovery
                </label>
                <label style="display: flex; align-items: center; font-size: 10px; cursor: pointer;">
                    <input type="checkbox" id="genetic-algorithm" checked style="margin-right: 6px;">
                    Genetic Algorithm
                </label>
                <label style="display: flex; align-items: center; font-size: 10px; cursor: pointer;">
                    <input type="checkbox" id="simulated-annealing" checked style="margin-right: 6px;">
                    Simulated Annealing
                </label>
            </div>
            <div style="margin-bottom: 12px;">
                ${window.UIManager.createButton({
                    id: 'toggle-rate-limit',
                    text: '⏱️ Normal Rate Limiting',
                    style: 'secondary',
                    size: 'small',
                    onClick: () => console.log('Rate limiting toggled')
                }).outerHTML}
                ${window.UIManager.createButton({
                    id: 'stop-optimization',
                    text: '🛑 Stop',
                    style: 'danger',
                    size: 'small',
                    onClick: () => {
                        window.STOPPED = true;
                        console.log('Optimization stopped');
                    }
                }).outerHTML}
            </div>
        `;

        return window.UIManager.createFormSection('⚙️ Settings', content);
    }

    // ========================================
    // 🔧 HELPER FUNCTIONS
    // ========================================
    
    // Expose key functions globally for backward compatibility
    window.sleep = window.AGUtils.sleep;
    window.deepClone = window.AGUtils.deepClone;

    // Module status check
    window.checkModuleStatus = function() {
        const modules = {
            BurstRateLimiter: !!window.BurstRateLimiter,
            ApiClient: !!window.ApiClient,
            RobustScoring: !!window.RobustScoring,
            OptimizationEngine: !!window.OptimizationEngine,
            SignalAnalysis: !!window.SignalAnalysis,
            UIManager: !!window.UIManager,
            ParameterDiscovery: !!window.ParameterDiscovery,
            PinSettings: !!window.PinSettings,
            OptimizationTracker: !!window.OptimizationTracker,
            ConfigManager: !!window.ConfigManager
        };

        console.table(modules);
        return modules;
    };

})();
