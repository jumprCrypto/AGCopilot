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
            // For example:
            ai30: {
                tokenDetails: { "Min AG Score": "1" },
                wallets: { "Min KYC Wallets": 2, "Max KYC Wallets": 5, "Max Unique Wallets": 2 },
                risk: { "Max Bundled %": 5, "Min Buy Ratio %": 70, "Max Drained Count": 10, "Description": "Don't care", "Fresh Deployer": "Don't care" },
                advanced: { "Max Liquidity %": 80, "Min Win Pred %": 30 }
            },

            // This is for Multiple Starting Points optimization
            oldDeployer: { tokenDetails: { "Min Deployer Age (min)": 43200, "Min AG Score": "4" } },
            conservative: {
                basic: { "Min MCAP (USD)": 8000, "Max MCAP (USD)": 25000 },
                tokenDetails: { "Min AG Score": "7", "Max Token Age (min)": 30 },
                wallets: { "Min Unique Wallets": 2, "Max Unique Wallets": 4, "Min KYC Wallets": 3, "Max KYC Wallets": 6 },
                risk: { "Min Bundled %": 0.1, "Max Bundled %": 25, "Min Buy Ratio %": 65, "Max Vol MCAP %": 50, "Min Deployer Balance (SOL)": 2.0 },
                advanced: { "Max Liquidity %": 60, "Min Win Pred %": 30 }
            },
            aggressive: {
                basic: { "Min MCAP (USD)": 1000, "Max MCAP (USD)": 15000 },
                tokenDetails: { "Min AG Score": "4", "Max Token Age (min)": 60 },
                wallets: { "Min Unique Wallets": 1, "Max Unique Wallets": 8, "Min KYC Wallets": 0, "Max KYC Wallets": 3 },
                risk: { "Min Bundled %": 0, "Max Bundled %": 80, "Min Buy Ratio %": 40, "Max Vol MCAP %": 150, "Min Deployer Balance (SOL)": 0.5 },
                advanced: { "Max Liquidity %": 90, "Min Win Pred %": 20 }
            },
            balanced: {
                basic: {  "Min MCAP (USD)": 3000, "Max MCAP (USD)": 35000 },
                tokenDetails: { "Min AG Score": "5", "Max Token Age (min)": 45 },
                wallets: { "Min Unique Wallets": 1,  "Max Unique Wallets": 6, "Min KYC Wallets": 1, "Max KYC Wallets": 5 },
                risk: { "Min Bundled %": 0, "Max Bundled %": 50, "Min Buy Ratio %": 55, "Max Vol MCAP %": 100, "Min Deployer Balance (SOL)": 1.0 },
                advanced: { "Max Liquidity %": 75, "Min Win Pred %": 30 }
            },
            microCap: {
                basic: { "Min MCAP (USD)": 200, "Max MCAP (USD)": 5000 },
                tokenDetails: { "Min AG Score": "3", "Max Token Age (min)": 15, "Min Deployer Age (min)": 5 },
                wallets: { "Min Unique Wallets": 0, "Max Unique Wallets": 3, "Min KYC Wallets": 0, "Max KYC Wallets": 2 },
                risk: { "Min Bundled %": 0, "Max Bundled %": 100, "Min Buy Ratio %": 70, "Max Vol MCAP %": 300, "Fresh Deployer": "Yes" },
                advanced: {  "Max Liquidity %": 95,  "Min Win Pred %": 15  }
            },
            bundle1_74: { risk: { "Max Bundled %": 1.74 } }, 
            mcap8KCeiling: { basic: { "Max MCAP (USD)": 8000 } },
            mcap20KFloor: { basic: { "Min MCAP (USD)": 20000 } },
            highBuyRatioFocus: { risk: { "Min Buy Ratio %": 90, "Max Buy Ratio %": 100 } },
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
        USE_MULTIPLE_STARTING_POINTS: true
    };

    // ========================================
    // 🛠️ UTILITIES
    // ========================================
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    let STOPPED = false;

    // Ensure complete config by merging with template
    function ensureCompleteConfig(config) {
        const completeConfig = JSON.parse(JSON.stringify(COMPLETE_CONFIG_TEMPLATE));

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
    // 🎛️ DOM INTERACTION LAYER
    // ========================================
    class UIController {
        async getCurrentConfig() {
            const config = { basic: {}, tokenDetails: {}, wallets: {}, risk: {}, advanced: {} };

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
                    return button.textContent.trim();
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
                    return button.textContent.trim();
                }
                return undefined;
            };

            // Map fields to config sections
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

        async setFieldValue(labelText, value, sectionName = null, maxRetries = 2) {
            const shouldClear = (value === undefined || value === null || value === "" || value === "clear");

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                const labels = Array.from(document.querySelectorAll('.sidebar-label'));
                const label = labels.find(el => el.textContent.trim() === labelText);

                if (!label) {
                    if (attempt < maxRetries && sectionName) {
                        await this.openSection(sectionName);
                        await sleep(250);
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
                            await sleep(200);
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
                        await sleep(200);
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
                        await sleep(200);

                        const newValue = button.textContent.trim();
                        if (newValue !== value && newValue !== currentValue) {
                            button.click();
                            await sleep(200);
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
            await sleep(50);
            return true;
        }

        isToggleButton(fieldName) {
            return fieldName === "Description" || fieldName === "Fresh Deployer";
        }

        async clearAllFields() {
            const allFields = [
                // Basic
                'Min MCAP (USD)', 'Max MCAP (USD)',
                // Token Details
                'Min Deployer Age (min)', 'Max Token Age (min)', 'Min AG Score',
                // Wallets
                'Min Unique Wallets', 'Max Unique Wallets', 'Min KYC Wallets', 'Max KYC Wallets',
                // Risk
                'Min Vol MCAP %', 'Max Vol MCAP %', 'Min Buy Ratio %', 'Max Buy Ratio %',
                'Min Deployer Balance (SOL)', 'Max Bundled %', 'Min Bundled %', 'Max Drained %',
                'Max Drained Count', 'Description', 'Fresh Deployer',
                // Advanced
                'Min TTC (sec)', 'Max TTC (sec)', 'Max Liquidity %', 'Min Win Pred %'
            ];

            for (const field of allFields) {
                if (this.isToggleButton(field)) {
                    await this.setToggleValue(field, "Don't care");
                } else {
                    await this.setFieldValue(field, undefined);
                }
                await sleep(100);
            }
        }

        async applyConfig(config, clearFirst = false) {
            const sectionMap = {
                basic: 'Basic',
                tokenDetails: 'Token Details',
                wallets: 'Wallets',
                risk: 'Risk',
                advanced: 'Advanced'
            };

            if (clearFirst) {
                for (const section in sectionMap) {
                    await this.openSection(sectionMap[section]);
                    await this.clearAllFields();
                }
            }

            let changes = 0;
            for (const [section, params] of Object.entries(config)) {
                for (const [param, value] of Object.entries(params)) {
                    if (value !== undefined) {
                        let success = false;

                        if (this.isToggleButton(param)) {
                            success = await this.setToggleValue(param, value, sectionMap[section]);
                        } else {
                            success = await this.setFieldValue(param, value, sectionMap[section]);
                        }

                        if (success) changes++;
                        await sleep(100);
                    }
                }
            }
            return changes;
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
                <div style="color: #4a9eff; font-size: 14px; font-weight: bold;">Advanced Optimizer</div>
                <button id="stopOptimization" style="
                    background: #e74c3c; color: white; border: none; padding: 4px 8px; 
                    border-radius: 4px; margin-left: auto; cursor: pointer; font-size: 11px;">
                    ⏹️ Stop
                </button>
            </div>
            
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
            updateProgress('🔍 Analyzing parameter impacts...', 20, this.optimizer.bestScore.toFixed(1), this.optimizer.testCount, this.optimizer.bestMetrics.tokensMatched, this.optimizer.startTime);
            
            const baselineScore = this.optimizer.bestScore;
            const impactResults = [];
            
            for (const paramTest of this.optimizer.parameterTests) {
                if (STOPPED || this.optimizer.getRemainingTime() <= 0.7) break;
                
                const { param, section } = paramTest;
                const variations = this.optimizer.generateVariation(this.optimizer.bestConfig, param, section);
                if (!variations || variations.length === 0) continue;
                
                let maxImpact = 0;
                let testCount = 0;
                
                // Test first 2 variations to measure impact
                for (let i = 0; i < Math.min(2, variations.length); i++) {
                    if (STOPPED || this.optimizer.getRemainingTime() <= 0.7) break;
                    
                    const variation = variations[i];
                    const result = await this.optimizer.testConfig(variation.config, `Impact test: ${variation.name}`);
                    
                    if (result.success && result.metrics) {
                        const impact = Math.abs(result.metrics.tpPnlPercent - baselineScore);
                        maxImpact = Math.max(maxImpact, impact);
                        testCount++;
                    }
                }
                
                if (testCount > 0) {
                    this.parameterImpacts.set(param, maxImpact);
                    impactResults.push({ param, section, impact: maxImpact });
                }
                
                // Restore best config after each test
                await this.optimizer.ui.applyConfig(this.optimizer.bestConfig, true);
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
            this.optimizer = optimizer;
            this.populationSize = 7;
            this.mutationRate = 0.3;
            this.crossoverRate = 0.7;
            this.eliteCount = 2;
        }
        
        async runGeneticOptimization() {
            updateProgress('🧬 Genetic Algorithm Phase', 50, this.optimizer.bestScore.toFixed(1), this.optimizer.testCount, this.optimizer.bestMetrics.tokensMatched, this.optimizer.startTime);
            
            // Initialize population with current best + variations
            let population = await this.initializePopulation();
            
            const generations = Math.min(5, Math.floor(this.optimizer.getRemainingTime() * 20));
            
            for (let generation = 0; generation < generations; generation++) {
                if (STOPPED || this.optimizer.getRemainingTime() <= 0.2) break;
                
                updateProgress(`🧬 Generation ${generation + 1}/${generations}`, 
                    50 + (generation / generations) * 30, 
                    this.optimizer.bestScore.toFixed(1), 
                    this.optimizer.testCount, 
                    this.optimizer.bestMetrics.tokensMatched, 
                    this.optimizer.startTime);
                
                // Evaluate population
                const evaluatedPopulation = await this.evaluatePopulation(population);
                
                // Selection, crossover, and mutation
                population = await this.evolvePopulation(evaluatedPopulation);
                
                // Early termination if target achieved
                if (this.optimizer.bestScore >= CONFIG.TARGET_PNL) {
                    break;
                }
            }
        }
        
        async initializePopulation() {
            const population = [];
            
            // Add current best config
            population.push(JSON.parse(JSON.stringify(this.optimizer.bestConfig)));
            
            // Add variations of best config
            for (let i = 1; i < this.populationSize; i++) {
                const config = JSON.parse(JSON.stringify(this.optimizer.bestConfig));
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
                const fitness = result.success ? result.metrics.tpPnlPercent : -Infinity;
                
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
                    newPopulation.push(JSON.parse(JSON.stringify(evaluatedPop[i].config)));
                }
            }
            
            // Generate offspring
            while (newPopulation.length < this.populationSize) {
                const parent1 = this.selectParent(evaluatedPop);
                const parent2 = this.selectParent(evaluatedPop);
                
                let offspring = Math.random() < this.crossoverRate ? 
                    this.crossover(parent1, parent2) : 
                    JSON.parse(JSON.stringify(parent1));
                
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
            const offspring = JSON.parse(JSON.stringify(parent1));
            
            // Crossover at section level
            const sections = Object.keys(offspring);
            const crossoverPoint = Math.floor(Math.random() * sections.length);
            
            for (let i = crossoverPoint; i < sections.length; i++) {
                const section = sections[i];
                offspring[section] = JSON.parse(JSON.stringify(parent2[section]));
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
            updateProgress('🔥 Simulated Annealing Phase', 80, this.optimizer.bestScore.toFixed(1), this.optimizer.testCount, this.optimizer.bestMetrics.tokensMatched, this.optimizer.startTime);
            
            let currentConfig = JSON.parse(JSON.stringify(this.optimizer.bestConfig));
            let currentScore = this.optimizer.bestScore;
            let temperature = this.initialTemperature;
            
            while (temperature > this.finalTemperature && this.optimizer.getRemainingTime() > 0.05 && !STOPPED) {
                // Generate neighbor configuration
                const neighbor = this.generateNeighbor(currentConfig);
                const result = await this.optimizer.testConfig(neighbor, 'Simulated annealing');
                
                if (result.success && result.metrics) {
                    const neighborScore = result.metrics.tpPnlPercent;
                    const deltaE = neighborScore - currentScore;
                    
                    // Accept if better, or with probability if worse
                    if (deltaE > 0 || Math.random() < Math.exp(deltaE / temperature)) {
                        currentConfig = neighbor;
                        currentScore = neighborScore;
                        
                        updateProgress(`🔥 Annealing T=${temperature.toFixed(1)}`, 
                            80 + (1 - temperature / this.initialTemperature) * 15, 
                            this.optimizer.bestScore.toFixed(1), 
                            this.optimizer.testCount, 
                            this.optimizer.bestMetrics.tokensMatched, 
                            this.optimizer.startTime);
                    }
                }
                
                temperature *= this.coolingRate;
                
                // Early termination if target achieved
                if (this.optimizer.bestScore >= CONFIG.TARGET_PNL) {
                    break;
                }
            }
        }
        
        generateNeighbor(config) {
            const neighbor = JSON.parse(JSON.stringify(config));
            
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
            this.bestScore = metrics.tpPnlPercent;
            this.bestMetrics = metrics;
            this.testCount = 1;

            updateProgress('✅ Baseline established', 15, this.bestScore.toFixed(1), 1, metrics.tokensMatched, this.startTime);
            return true;
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
                    await this.ui.applyConfig(this.bestConfig, true);
                    const result = { success: false };
                    if (CONFIG.USE_CONFIG_CACHING) {
                        this.configCache.set(completeConfig, result);
                        console.log(`💾 Cached failed result (no metrics) for: ${testName}`);
                    }
                    return result;
                }

                if (metrics.tpPnlPercent === undefined || metrics.tokensMatched < CONFIG.MIN_TOKENS) {
                    // Restore best config if insufficient tokens
                    await this.ui.applyConfig(this.bestConfig, true);
                    const result = { success: false };
                    if (CONFIG.USE_CONFIG_CACHING) {
                        this.configCache.set(completeConfig, result);
                        console.log(`💾 Cached failed result (insufficient tokens: ${metrics.tokensMatched}) for: ${testName}`);
                    }
                    return result;
                }

                const improvement = metrics.tpPnlPercent - this.bestScore;
                this.testCount++;

                updateProgress(`Testing: ${testName}`, this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics.tokensMatched, this.startTime);

                const improvementThreshold = 1;
                const success = improvement > improvementThreshold;
                
                if (success) {
                    this.bestConfig = completeConfig;
                    this.bestScore = metrics.tpPnlPercent;
                    this.bestMetrics = metrics;
                    this.history.push({ testName, score: metrics.tpPnlPercent, improvement });
                    
                    updateProgress(`🏆 New best: ${testName}`, this.getProgress(), this.bestScore.toFixed(1), this.testCount, metrics.tokensMatched, this.startTime);
                } else {
                    // Restore best config if no improvement
                    await this.ui.applyConfig(this.bestConfig, true);
                    updateProgress(`↩️ Restored best config`, this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics.tokensMatched, this.startTime);
                }

                const result = { success: true, metrics, improvement };
                if (CONFIG.USE_CONFIG_CACHING) {
                    this.configCache.set(completeConfig, result);
                    console.log(`💾 Cached result for: ${testName} (success: ${result.success}, score: ${metrics.tpPnlPercent.toFixed(1)}%)`);
                }
                return result;
            } catch (error) {
                // Restore best config on error
                await this.ui.applyConfig(this.bestConfig, true);
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

            const config = JSON.parse(JSON.stringify(baseConfig));
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
                // For numeric values with adaptive step sizes
                const current = currentValue || (rules.min + rules.max) / 2;
                const range = rules.max - rules.min;

                // Create variations using adaptive step size
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
                const newConfig = JSON.parse(JSON.stringify(config));
                newConfig[section][param] = val;
                return { config: newConfig, name: `${param}: ${val}` };
            });
        }

        // Enhanced variation generation using Latin Hypercube Sampling
        generateLatinHypercubeVariations(baseConfig, parameters, numSamples = 6) {
            const samples = this.latinSampler.generateSamples(parameters, numSamples);
            const variations = [];
            
            for (const sample of samples) {
                const config = JSON.parse(JSON.stringify(baseConfig));
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
                const config = JSON.parse(JSON.stringify(baseConfig));
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
                const config = JSON.parse(JSON.stringify(baseConfig));
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
            updateProgress('🔄 Phase 1: Parameter Testing', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics.tokensMatched, this.startTime);

            const timePerParam = this.getRemainingTime() * 0.6 / this.parameterTests.length; // 60% of remaining time

            for (const { param, section } of this.parameterTests) {
                if (STOPPED || this.getRemainingTime() <= 0) break;

                const phaseStartTime = Date.now();
                const phaseMaxTime = timePerParam * CONFIG.MAX_RUNTIME_MIN * 60 * 1000;

                updateProgress(`🔄 Testing ${param}...`, this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics.tokensMatched, this.startTime);

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
                        updateProgress('🎯 Target achieved early!', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics.tokensMatched, this.startTime);
                        return;
                    }
                }
            }
        }

        async runLatinHypercubePhase() {
            updateProgress('🎲 Latin Hypercube Sampling', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics.tokensMatched, this.startTime);

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
            updateProgress('🔗 Correlated Parameters', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics.tokensMatched, this.startTime);

            const correlatedVariations = this.generateCorrelatedVariations(this.bestConfig);

            for (const variation of correlatedVariations) {
                if (STOPPED || this.getRemainingTime() <= 0.1) break;

                const result = await this.testConfig(variation.config, variation.name);
                if (!result.success) continue;

                // Early termination if target achieved
                if (this.bestScore >= CONFIG.TARGET_PNL) {
                    updateProgress('🎯 Target achieved early!', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics.tokensMatched, this.startTime);
                    return;
                }
            }
        }

        async runMultipleStartingPoints() {
            updateProgress('🚀 Multiple Starting Points', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics.tokensMatched, this.startTime);

            const startingPoints = [
                CONFIG.PRESETS.conservative,
                CONFIG.PRESETS.aggressive,
                CONFIG.PRESETS.balanced,
                CONFIG.PRESETS.microCap,
                CONFIG.PRESETS.oldDeployerBase,
            ];

            for (const startingPoint of startingPoints) {
                if (STOPPED || this.getRemainingTime() <= 0.02) break;

                const result = await this.testConfig(startingPoint, `Starting point: ${JSON.stringify(startingPoint).slice(0, 50)}...`);
                if (!result.success) continue;

                // Test variations around this starting point
                const variations = this.generateVariation(startingPoint, this.parameterTests[0].param, this.parameterTests[0].section);
                if (variations) {
                    for (const variation of variations.slice(0, 2)) {
                        if (STOPPED || this.getRemainingTime() <= 0.02) break;
                        await this.testConfig(variation.config, variation.name);
                    }
                }

                // Early termination if target achieved
                if (this.bestScore >= CONFIG.TARGET_PNL) {
                    updateProgress('🎯 Target achieved early!', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics.tokensMatched, this.startTime);
                    return;
                }
            }
        }

        async runDeepDive() {
            updateProgress('🎯 Phase 2: Deep Dive', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics.tokensMatched, this.startTime);

            // Focus on top 3 parameters for extended testing
            const topParams = this.parameterTests.slice(0, 3);
            const timePerParam = this.getRemainingTime() * 0.7 / topParams.length; // 70% of remaining time

            for (const { param, section } of topParams) {
                if (STOPPED || this.getRemainingTime() <= 0.2) break;

                const phaseStartTime = Date.now();
                const phaseMaxTime = timePerParam * CONFIG.MAX_RUNTIME_MIN * 60 * 1000;

                updateProgress(`🔍 Deep dive: ${param}...`, this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics.tokensMatched, this.startTime);

                const extendedVariations = this.generateExtendedVariations(this.bestConfig, param, section);
                if (!extendedVariations) continue;

                for (const variation of extendedVariations) {
                    if (STOPPED || this.getRemainingTime() <= 0.2) break;
                    if (Date.now() - phaseStartTime > phaseMaxTime) break;

                    const result = await this.testConfig(variation.config, variation.name);
                    if (!result.success) continue;

                    // Early termination if target achieved
                    if (this.bestScore >= CONFIG.TARGET_PNL) {
                        updateProgress('🎯 Target achieved early!', this.getProgress(), this.bestScore.toFixed(1), this.testCount, this.bestMetrics.tokensMatched, this.startTime);
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

                    const config = JSON.parse(JSON.stringify(this.bestConfig));
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
                const config = JSON.parse(JSON.stringify(this.bestConfig));

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

            const config = JSON.parse(JSON.stringify(baseConfig));
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
                const newConfig = JSON.parse(JSON.stringify(config));
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
                    <input type="number" id="targetPnl" value="150" min="100" max="500" 
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
                    <input type="number" id="minTokens" value="50" min="5" max="100" 
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
                            <input type="checkbox" id="multipleStartingPoints" checked 
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
                    🚀 Start Optimization
                </button>
                <button id="cancel" style="background: #e74c3c; color: white; border: none; 
                                          padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                    ❌ Cancel
                </button>
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
                        <div style="color: #27ae60; font-weight: bold; font-size: 16px;">${result.bestScore.toFixed(1)}%</div>
                        <div style="color: #ccc; font-size: 11px;">Final TP PnL</div>
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

            const optimizer = new SimpleOptimizer();
            const result = await optimizer.runOptimization();

            updateProgress('🏁 Complete!', 100, result.bestScore.toFixed(1), result.testCount, result.bestMetrics.tokensMatched);

            // Log advanced optimization results
            console.log('🚀 Advanced Optimization Complete!');
            console.log(`📈 Final Score: ${result.bestScore.toFixed(1)}%`);
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
