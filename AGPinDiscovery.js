(async function () {
    console.clear();
    console.log('%c🔬 AG Parameter Impact Discovery v1.0 🔬', 'color: purple; font-size: 16px; font-weight: bold;');

    // ========================================
    // 🎯 CONFIGURATION
    // ========================================
    const DISCOVERY_CONFIG = {
        BASELINE_CONFIG: {
            // Set this to your current best config or use one of the presets
            //   tokenDetails: { "Min AG Score": "1" },
            //   wallets: { "Min KYC Wallets": 2, "Max KYC Wallets": 5, "Max Unique Wallets": 2 },
            //   risk: { "Max Bundled %": 5, "Min Buy Ratio %": 70, "Max Drained Count": 10, "Description": "Don't care", "Fresh Deployer": "Don't care" },
            //   advanced: { "Max Liquidity %": 80, "Min Win Pred %": 30 }
        },
        
        MIN_TOKENS_REQUIRED: 25,
        BACKTEST_WAIT_TIME: 2500,
        TESTS_PER_PARAMETER: 10, // How many variations to test per parameter
        MIN_IMPROVEMENT_THRESHOLD: 1 // Minimum improvement to consider significant
    };

    // Complete config template
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

    // Parameter test variations
    const PARAM_TEST_VALUES = {
        // Basic
        'Min MCAP (USD)': [5000, 10000, 20000],
        'Max MCAP (USD)': [8000, 15000, 25000, 50000],
        
        // Token Details  
        'Min Deployer Age (min)': [10, 30, 60],
        'Max Token Age (min)': [15, 30, 60, 120],
        'Min AG Score': ["3", "5", "7"],
        
        // Wallets
        'Min Unique Wallets': [1, 2, 3],
        'Max Unique Wallets': [1, 2, 5, 10],
        'Min KYC Wallets': [1, 2, 5],
        'Max KYC Wallets': [2, 5, 10],
        
        // Risk
        'Min Bundled %': [0, 1, 5],
        'Max Bundled %': [1, 5, 20, 50],
        'Min Deployer Balance (SOL)': [0.5, 1, 5, 10],
        'Min Buy Ratio %': [50, 70, 80, 90],
        'Max Buy Ratio %': [80, 90, 95],
        'Min Vol MCAP %': [10, 30, 50, 80],
        'Max Vol MCAP %': [80, 120, 200],
        'Max Drained %': [0, 10, 50],
        'Max Drained Count': [5, 10, 20, 50],
        
        // Advanced
        'Min TTC (sec)': [10, 30, 60],
        'Max TTC (sec)': [30, 120, 300],
        'Max Liquidity %': [50, 75, 90],
        'Min Win Pred %': [20, 30, 50]
    };

    // ========================================
    // 🛠️ UTILITIES
    // ========================================
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    let DISCOVERY_STOPPED = false;

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

    // ========================================
    // 🎛️ UI CONTROLLER (Simplified)
    // ========================================
    class UIController {
        async setFieldValue(labelText, value, sectionName = null) {
            const shouldClear = (value === undefined || value === null || value === "" || value === "clear");

            const labels = Array.from(document.querySelectorAll('.sidebar-label'));
            const label = labels.find(el => el.textContent.trim() === labelText);

            if (!label) {
                if (sectionName) await this.openSection(sectionName);
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

            return false;
        }

        async setToggleValue(labelText, value, sectionName = null) {
            if (value === undefined) {
                if (labelText === "Description") {
                    value = "Don't care";
                } else if (labelText === "Fresh Deployer") {
                    value = "Don't care";
                } else {
                    return false;
                }
            }

            const labels = Array.from(document.querySelectorAll('.sidebar-label'));
            const label = labels.find(el => el.textContent.trim() === labelText);

            if (!label) {
                if (sectionName) await this.openSection(sectionName);
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

            return false;
        }

        async openSection(sectionTitle) {
            const allHeaders = Array.from(document.querySelectorAll('button[type="button"]'));
            const sectionHeader = allHeaders.find(header =>
                header.textContent.includes(sectionTitle)
            );

            if (!sectionHeader) return false;

            sectionHeader.click();
            await sleep(200);
            return true;
        }

        isToggleButton(fieldName) {
            return fieldName === "Description" || fieldName === "Fresh Deployer";
        }

        async applyConfig(config) {
            const sectionMap = {
                basic: 'Basic',
                tokenDetails: 'Token Details', 
                wallets: 'Wallets',
                risk: 'Risk',
                advanced: 'Advanced'
            };

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
                        case 'win rate (≥2x)':
                            const winRateMatch = value.match(/(\d+(?:\.\d+)?)%/);
                            if (winRateMatch) {
                                metrics.winRate = parseFloat(winRateMatch[1]);
                            }
                            break;
                    }
                }
            }
            
            if (metrics.tpPnlPercent === undefined || metrics.tokensMatched === undefined) {
                return null;
            }

            return metrics;
        } catch (error) {
            return null;
        }
    }

    // ========================================
    // 🔬 PARAMETER IMPACT DISCOVERER
    // ========================================
    class ParameterImpactDiscoverer {
        constructor() {
            this.ui = new UIController();
            this.results = [];
            this.baselineScore = 0;
            this.baselineTokens = 0;
            this.startTime = Date.now();
        }

        async establishBaseline() {
            console.log('%c📊 Establishing baseline...', 'color: blue; font-weight: bold;');
            
            const completeBaseline = ensureCompleteConfig(DISCOVERY_CONFIG.BASELINE_CONFIG);
            await this.ui.applyConfig(completeBaseline);
            await sleep(DISCOVERY_CONFIG.BACKTEST_WAIT_TIME);
            
            const metrics = await extractMetrics();
            if (!metrics || metrics.tokensMatched < DISCOVERY_CONFIG.MIN_TOKENS_REQUIRED) {
                throw new Error("Baseline test failed - insufficient data");
            }

            this.baselineScore = metrics.tpPnlPercent;
            this.baselineTokens = metrics.tokensMatched;
            
            console.log(`✅ Baseline: ${this.baselineScore.toFixed(1)}% PnL, ${this.baselineTokens} tokens`);
            return true;
        }

        async testParameterVariation(param, value, section) {
            if (DISCOVERY_STOPPED) return null;

            try {
                // Create a fresh copy of baseline config
                const testConfig = ensureCompleteConfig(DISCOVERY_CONFIG.BASELINE_CONFIG);
                
                // ONLY modify the specific parameter being tested
                testConfig[section][param] = value;
                
                console.log(`    🎯 Setting ${param} = ${value} (keeping all other baseline values)`);

                await this.ui.applyConfig(testConfig);
                await sleep(DISCOVERY_CONFIG.BACKTEST_WAIT_TIME);
                
                const metrics = await extractMetrics();
                if (!metrics) {
                    console.log(`    ⚠️ Failed to extract metrics`);
                    return null;
                }
                
                if (metrics.tokensMatched < DISCOVERY_CONFIG.MIN_TOKENS_REQUIRED) {
                    console.log(`    ⚠️ Insufficient tokens: ${metrics.tokensMatched} < ${DISCOVERY_CONFIG.MIN_TOKENS_REQUIRED}`);
                    return null;
                }

                const improvement = metrics.tpPnlPercent - this.baselineScore;
                const tokenRatio = metrics.tokensMatched / this.baselineTokens;

                return {
                    score: metrics.tpPnlPercent,
                    improvement: improvement,
                    tokens: metrics.tokensMatched,
                    tokenRatio: tokenRatio,
                    winRate: metrics.winRate || 0
                };
            } catch (error) {
                console.log(`    ❌ Error testing ${param}=${value}:`, error.message);
                return null;
            }
        }

        async analyzeParameter(param, section) {
            console.log(`%c🔬 Analyzing ${param}...`, 'color: orange; font-weight: bold;');
            
            const testValues = PARAM_TEST_VALUES[param];
            if (!testValues) {
                console.log(`⚠️ No test values defined for ${param}`);
                return null;
            }

            const paramResults = [];
            
            for (const value of testValues) {
                if (DISCOVERY_STOPPED) break;

                console.log(`  Testing ${param}: ${value}`);
                
                // CRITICAL FIX: Reset to baseline before each test
                console.log(`    🔄 Resetting to baseline...`);
                await this.ui.applyConfig(ensureCompleteConfig(DISCOVERY_CONFIG.BASELINE_CONFIG));
                await sleep(500); // Allow reset to complete
                
                const result = await this.testParameterVariation(param, value, section);
                
                if (result) {
                    paramResults.push({
                        value: value,
                        ...result
                    });
                    
                    if (result.improvement > DISCOVERY_CONFIG.MIN_IMPROVEMENT_THRESHOLD) {
                        console.log(`    ✅ ${value}: ${result.score.toFixed(1)}% (+${result.improvement.toFixed(1)}%) [${result.tokens} tokens]`);
                    } else {
                        console.log(`    📊 ${value}: ${result.score.toFixed(1)}% (${result.improvement.toFixed(1)}%) [${result.tokens} tokens]`);
                    }
                } else {
                    console.log(`    ❌ ${value}: Failed or insufficient tokens`);
                }
            }

            if (paramResults.length === 0) return null;

            // Calculate parameter impact metrics
            const improvements = paramResults.map(r => r.improvement);
            const maxImprovement = Math.max(...improvements);
            const minImprovement = Math.min(...improvements);
            const avgImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;
            const variance = improvements.reduce((sum, val) => sum + Math.pow(val - avgImprovement, 2), 0) / improvements.length;
            const stdDev = Math.sqrt(variance);

            const impactData = {
                parameter: param,
                section: section,
                maxImprovement: maxImprovement,
                minImprovement: minImprovement,
                avgImprovement: avgImprovement,
                variance: variance,
                stdDev: stdDev,
                range: maxImprovement - minImprovement,
                significantResults: paramResults.filter(r => Math.abs(r.improvement) > DISCOVERY_CONFIG.MIN_IMPROVEMENT_THRESHOLD).length,
                totalTests: paramResults.length,
                results: paramResults
            };

            console.log(`📈 ${param} Impact: Max +${maxImprovement.toFixed(1)}%, Range ${impactData.range.toFixed(1)}%, StdDev ${stdDev.toFixed(1)}`);
            return impactData;
        }

        async runDiscovery() {
            console.log('%c🔬 Starting Parameter Impact Discovery', 'color: purple; font-weight: bold;');
            
            try {
                await this.establishBaseline();
                
                // Parameters to test (organized by section)
                const parametersToTest = [
                    // Basic
                    { param: 'Min MCAP (USD)', section: 'basic' },
                    { param: 'Max MCAP (USD)', section: 'basic' },
                    
                    // Token Details
                    { param: 'Min Deployer Age (min)', section: 'tokenDetails' },
                    { param: 'Max Token Age (min)', section: 'tokenDetails' },
                    { param: 'Min AG Score', section: 'tokenDetails' },
                    
                    // Wallets
                    { param: 'Min Unique Wallets', section: 'wallets' },
                    { param: 'Max Unique Wallets', section: 'wallets' },
                    { param: 'Min KYC Wallets', section: 'wallets' },
                    { param: 'Max KYC Wallets', section: 'wallets' },
                    
                    // Risk
                    { param: 'Min Bundled %', section: 'risk' },
                    { param: 'Max Bundled %', section: 'risk' },
                    { param: 'Min Deployer Balance (SOL)', section: 'risk' },
                    { param: 'Min Buy Ratio %', section: 'risk' },
                    { param: 'Max Buy Ratio %', section: 'risk' },
                    { param: 'Min Vol MCAP %', section: 'risk' },
                    { param: 'Max Vol MCAP %', section: 'risk' },
                    { param: 'Max Drained %', section: 'risk' },
                    { param: 'Max Drained Count', section: 'risk' },
                    
                    // Advanced
                    { param: 'Min TTC (sec)', section: 'advanced' },
                    { param: 'Max TTC (sec)', section: 'advanced' },
                    { param: 'Max Liquidity %', section: 'advanced' },
                    { param: 'Min Win Pred %', section: 'advanced' }
                ];

                for (const { param, section } of parametersToTest) {
                    if (DISCOVERY_STOPPED) break;
                    
                    const impactData = await this.analyzeParameter(param, section);
                    if (impactData) {
                        this.results.push(impactData);
                    }
                    
                    // Small delay between parameters
                    await sleep(500);
                }

                return this.generateReport();
                
            } catch (error) {
                console.error('Discovery failed:', error);
                throw error;
            }
        }

        generateReport() {
            const runtime = Math.floor((Date.now() - this.startTime) / 1000);
            
            // Sort by impact (combination of max improvement and range)
            const sortedResults = this.results.sort((a, b) => {
                const aImpact = (Math.abs(a.maxImprovement) + a.range) / 2;
                const bImpact = (Math.abs(b.maxImprovement) + b.range) / 2;
                return bImpact - aImpact;
            });

            console.log('%c🏁 PARAMETER IMPACT DISCOVERY COMPLETE', 'color: green; font-size: 18px; font-weight: bold;');
            console.log(`%c⏱️ Runtime: ${Math.floor(runtime / 60)}:${(runtime % 60).toString().padStart(2, '0')}`, 'color: blue;');
            console.log(`%c📊 Parameters Analyzed: ${this.results.length}`, 'color: blue;');
            console.log(`%c📈 Baseline: ${this.baselineScore.toFixed(1)}% PnL with ${this.baselineTokens} tokens`, 'color: blue;');

            console.log('\n%c🎯 PARAMETER IMPACT RANKING (High to Low):', 'color: gold; font-weight: bold;');
            console.log('%c' + '='.repeat(80), 'color: gold;');

            sortedResults.forEach((result, index) => {
                const impactScore = (Math.abs(result.maxImprovement) + result.range) / 2;
                console.log(`%c${(index + 1).toString().padStart(2)}. ${result.parameter.padEnd(25)} | Max: ${result.maxImprovement.toFixed(1).padStart(6)}% | Range: ${result.range.toFixed(1).padStart(6)}% | Impact: ${impactScore.toFixed(1).padStart(6)}`, 
                    impactScore > 5 ? 'color: #ff6b6b; font-weight: bold;' : 
                    impactScore > 2 ? 'color: #feca57;' : 'color: #48dbfb;');
            });

            // Generate code for AGCopilot-Simple
            console.log('\n%c📋 CODE FOR AGCopilot-Simple.js:', 'color: cyan; font-weight: bold;');
            console.log('%c' + '='.repeat(50), 'color: cyan;');
            console.log('%c// Replace parameterTests array with this data-driven order:', 'color: green;');
            console.log('%cconst parameterTests = [', 'color: white;');
            
            sortedResults.forEach(result => {
                console.log(`%c    { param: '${result.parameter}', section: '${result.section}' }, // Impact: ${((Math.abs(result.maxImprovement) + result.range) / 2).toFixed(1)}`, 'color: white;');
            });
            
            console.log('%c];', 'color: white;');

            return {
                baseline: { score: this.baselineScore, tokens: this.baselineTokens },
                results: sortedResults,
                runtime: runtime,
                parametersAnalyzed: this.results.length
            };
        }
    }

    // ========================================
    // 🎛️ SIMPLE POPUP
    // ========================================
    function createDiscoveryPopup() {
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
                border: 2px solid #9b59b6; border-radius: 15px; padding: 30px; 
                box-shadow: 0 20px 40px rgba(0,0,0,0.5); width: 500px;
                color: white; text-align: center;
            `;

            popup.innerHTML = `
                <h2 style="color: #9b59b6; margin-bottom: 20px;">🔬 Parameter Impact Discovery</h2>
                
                <div style="margin-bottom: 20px; text-align: left; font-size: 13px; color: #ccc;">
                    This will systematically test each parameter to measure its impact on performance.
                    <br><br>
                    <strong>What it does:</strong>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>Tests multiple values for each parameter</li>
                        <li>Measures improvement vs baseline</li>
                        <li>Ranks parameters by impact</li>
                        <li>Generates optimized order for AGCopilot-Simple</li>
                    </ul>
                    
                    <strong>⚠️ This will take 15-30 minutes to complete</strong>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="start" style="background: #9b59b6; color: white; border: none; 
                                             padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                        🔬 Start Discovery
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
                document.body.removeChild(overlay);
                resolve(true);
            };

            popup.querySelector('#cancel').onclick = () => {
                document.body.removeChild(overlay);
                resolve(false);
            };
        });
    }

    // ========================================
    // 🚀 MAIN EXECUTION
    // ========================================
    async function main() {
        try {
            const proceed = await createDiscoveryPopup();
            if (!proceed) {
                console.log('🛑 Discovery cancelled by user');
                return;
            }

            // Add stop button
            const stopBtn = document.createElement('button');
            stopBtn.innerHTML = '🛑 Stop Discovery';
            stopBtn.style.cssText = `
                position: fixed; top: 20px; right: 20px; z-index: 9999;
                background: #e74c3c; color: white; border: none; 
                padding: 10px 15px; border-radius: 5px; cursor: pointer;
            `;
            stopBtn.onclick = () => {
                DISCOVERY_STOPPED = true;
                console.log('🛑 Discovery stopped by user');
                stopBtn.remove();
            };
            document.body.appendChild(stopBtn);

            const discoverer = new ParameterImpactDiscoverer();
            const result = await discoverer.runDiscovery();
            
            stopBtn.remove();
            console.log('%c✅ Discovery complete! Check console output above for results.', 'color: green; font-weight: bold;');
            
        } catch (error) {
            console.error('❌ Discovery failed:', error);
        }
    }

    return main();
})();
