// UI Module - All UI creation and event handling functionality
// Simplified version that works with the modular AGCopilot

export function generatePresetOptions() {
    const PRESETS = window.AGCopilot?.PRESETS || {
        conservative: { basic: { "Min MCAP (USD)": 10000, "Max MCAP (USD)": 50000 } },
        aggressive: { basic: { "Min MCAP (USD)": 1000, "Max MCAP (USD)": 15000 } }
    };

    let options = '<option value="">Select a preset...</option>';
    for (const [key, preset] of Object.entries(PRESETS)) {
        options += `<option value="${key}">📋 ${key}</option>`;
    }
    return options;
}

export function createUI() {
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
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: 2px solid #fff;
        border-radius: 15px;
        padding: 20px;
        z-index: 10000;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: white;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        max-height: 90vh;
        overflow-y: auto;
    `;

    ui.innerHTML = `
        <div id="ui-header" style="margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <div style="flex: 1; text-align: center;">
                    <h3 style="margin: 0; font-size: 18px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                        🤖 AG Co-Pilot Enhanced
                    </h3>
                </div>
                <button id="collapse-ui-btn" style="
                    background: rgba(255,255,255,0.2); 
                    border: 1px solid rgba(255,255,255,0.4); 
                    border-radius: 6px; 
                    color: white; 
                    cursor: pointer; 
                    padding: 6px 10px; 
                    font-size: 12px;
                    font-weight: bold;
                    transition: all 0.2s;
                    margin-left: 10px;
                " onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
                   onmouseout="this.style.background='rgba(255,255,255,0.2)'"
                   title="Collapse to small box">
                    ➖
                </button>
            </div>
        </div>
        
        <div id="ui-content">
        <!-- Configuration & Optimization Section -->
        <div style="margin-bottom: 20px; border-top: 1px solid rgba(255,255,255,0.3); padding-top: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h4 style="margin: 0; font-size: 14px; opacity: 0.9;">⚙️ Configuration & Optimization</h4>
                <button id="toggle-config-section" style="
                    background: rgba(255,255,255,0.1); 
                    border: 1px solid rgba(255,255,255,0.3); 
                    border-radius: 4px; 
                    color: white; 
                    cursor: pointer; 
                    padding: 4px 8px; 
                    font-size: 10px;
                    transition: background 0.2s;
                " onmouseover="this.style.background='rgba(255,255,255,0.2)'" 
                   onmouseout="this.style.background='rgba(255,255,255,0.1)'">
                    ➖ Hide
                </button>
            </div>
            <div id="config-section-content">
            
            <!-- Presets and Trigger Mode -->
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px; margin-bottom: 10px;">
                <div>
                    <label style="font-size: 12px; font-weight: bold; margin-bottom: 3px; display: block;">Quick Presets:</label>
                    <select id="preset-dropdown" style="width: 100%; padding: 6px; border: none; border-radius: 4px; font-size: 11px; color: black; background: white;">
                        ${generatePresetOptions()}
                    </select>
                </div>
                <div>
                    <label style="font-size: 12px; font-weight: bold; margin-bottom: 3px; display: block;">Trigger Mode:</label>
                    <select id="trigger-mode-select" style="width: 100%; padding: 6px; border: none; border-radius: 4px; font-size: 11px; color: black; background: white;">
                        <option value="0">Bullish Bonding</option>
                        <option value="1">God Mode</option>
                        <option value="2">Moon Finder</option>
                        <option value="3">Fomo</option>
                        <option value="4" selected>Launchpads</option>
                        <option value="5">Smart Tracker</option>
                    </select>
                </div>
            </div>
            
            <!-- Optimization settings in compact grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 10px;">
                <label style="display: flex; flex-direction: column;">
                    <span style="font-size: 11px; font-weight: bold; margin-bottom: 3px;">Target PnL %:</span>
                    <input type="number" id="target-pnl" value="100" min="5" max="50" step="0.5"
                           style="padding: 5px; border: 1px solid white; border-radius: 3px; font-size: 11px; text-align: center;">
                </label>
                <label style="display: flex; flex-direction: column;">
                    <span style="font-size: 11px; font-weight: bold; margin-bottom: 3px;">Min Tokens:</span>
                    <input type="number" id="min-tokens" value="75" min="1" max="100" step="1"
                           style="padding: 5px; border: 1px solid white; border-radius: 3px; font-size: 11px; text-align: center;">
                </label>
                <label style="display: flex; flex-direction: column;">
                    <span style="font-size: 11px; font-weight: bold; margin-bottom: 3px;">Runtime (min):</span>
                    <input type="number" id="runtime-min" value="10" min="5" max="120" step="5"
                           style="padding: 5px; border: 1px solid white; border-radius: 3px; font-size: 11px; text-align: center;">
                </label>
                <label style="display: flex; flex-direction: column;">
                    <span style="font-size: 11px; font-weight: bold; margin-bottom: 3px;">Runs:</span>
                    <input type="number" id="chain-run-count" value="4" min="1" max="10" step="1"
                           style="padding: 5px; border: 1px solid white; border-radius: 3px; font-size: 11px; text-align: center;">
                </label>
            </div>
            
            <!-- Advanced Optimization Features -->
            <div style="margin-bottom: 10px; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 4px;">
                <div style="font-size: 11px; font-weight: bold; margin-bottom: 5px; color: #4ECDC4;">🚀 Optimization Methods:</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 10px;">
                    <label style="display: flex; align-items: center; cursor: pointer;" title="Uses statistical methods to reduce impact of outlier data points">
                        <input type="checkbox" id="robust-scoring" checked style="margin-right: 5px; transform: scale(1.0);">
                        <span style="font-weight: bold;">🛡️ Outlier-Resistant</span>
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer;" title="Advanced optimization technique that accepts worse solutions occasionally to escape local optima">
                        <input type="checkbox" id="simulated-annealing" checked style="margin-right: 5px; transform: scale(1.0);">
                        <span style="font-weight: bold;">🔥 Simulated Annealing</span>
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer;" title="Tests all available presets as starting points for comprehensive coverage">
                        <input type="checkbox" id="multiple-starting-points" style="margin-right: 5px; transform: scale(1.0);">
                        <span style="font-weight: bold;">🎯 Multiple Starts</span>
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer;" title="Statistical sampling method that ensures even distribution across parameter space">
                        <input type="checkbox" id="latin-hypercube" checked style="margin-right: 5px; transform: scale(1.0);">
                        <span style="font-weight: bold;">📐 Latin Hypercube</span>
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer;" title="Tests related parameters together (e.g., min/max MCAP, wallet counts) for better combinations">
                        <input type="checkbox" id="correlated-params" checked style="margin-right: 5px; transform: scale(1.0);">
                        <span style="font-weight: bold;">🔗 Correlated Params</span>
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer;" title="Fine-grained testing of the most effective parameters with smaller increments">
                        <input type="checkbox" id="deep-dive" checked style="margin-right: 5px; transform: scale(1.0);">
                        <span style="font-weight: bold;">🔬 Deep Dive</span>
                    </label>
                </div>
                <div style="font-size: 8px; opacity: 0.7; margin-top: 4px; line-height: 1.2;">
                    💡 Advanced optimization phases for parameter exploration. Hover over options for details.
                </div>
                
                <!-- Low Bundled % Constraint -->
                <div style="margin-top: 8px; padding: 6px; background: rgba(255,215,0,0.15); border: 1px solid rgba(255,215,0,0.3); border-radius: 4px;">
                    <label style="display: flex; align-items: center; cursor: pointer;" title="Forces Min Bundled % < 5% and Max Bundled % < 35% during optimization">
                        <input type="checkbox" id="low-bundled-constraint" checked style="margin-right: 5px; transform: scale(1.0);">
                        <span style="font-weight: bold; font-size: 11px; color: #FFD700;">🛡️ Low Bundled % Constraint</span>
                    </label>
                    <div style="font-size: 8px; opacity: 0.8; margin-top: 2px; line-height: 1.2;">
                        Forces Min Bundled % &lt; 5% and Max Bundled % &lt; 35% during optimization
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Control Buttons -->
        <div style="margin-bottom: 15px;">
            <button id="start-optimization" style="
                width: 100%; 
                padding: 12px; 
                background: linear-gradient(45deg, #FF6B6B, #4ECDC4); 
                border: none; 
                border-radius: 8px; 
                color: white; 
                font-weight: bold; 
                cursor: pointer;
                font-size: 14px;
                transition: transform 0.2s;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                🚀 Start Enhanced Optimization
            </button>
        </div>
        
        <div style="margin-bottom: 15px;">
            <button id="stop-optimization" style="
                width: 100%; 
                padding: 8px; 
                background: rgba(255,255,255,0.2); 
                border: 1px solid rgba(255,255,255,0.3); 
                border-radius: 8px; 
                color: white; 
                font-weight: bold; 
                cursor: pointer;
                font-size: 12px;
                display: none;
            ">
                ⏹️ Stop Optimization
            </button>
        </div>
        
        <!-- Results Section -->
        <div id="best-config-display" style="
            background: rgba(76, 175, 80, 0.2); 
            border: 1px solid rgba(76, 175, 80, 0.4); 
            border-radius: 5px; 
            padding: 10px; 
            margin-bottom: 15px;
            display: none;
        ">
            <h5 style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #4CAF50;">🏆 Best Configuration Found:</h5>
            <div id="best-config-stats" style="font-size: 11px; margin-bottom: 8px;"></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <button onclick="applyBestConfigToUI()" style="padding: 8px; background: rgba(33, 150, 243, 0.3); border: 1px solid rgba(33, 150, 243, 0.6); border-radius: 4px; color: white; font-size: 11px; cursor: pointer;">⚙️ Apply to UI</button>
                <button onclick="copyBestConfigToClipboard()" style="padding: 8px; background: rgba(156, 39, 176, 0.3); border: 1px solid rgba(156, 39, 176, 0.6); border-radius: 4px; color: white; font-size: 11px; cursor: pointer;">📋 Copy Config</button>
            </div>
            </div> <!-- End config-section-content -->
        </div>
        
        <!-- Signal Analysis Section -->
        <div style="margin-bottom: 20px; border-top: 1px solid rgba(255,255,255,0.3); padding-top: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h4 style="margin: 0; font-size: 14px; opacity: 0.9;">🔍 Signal Analysis & Config generation</h4>
                <button id="toggle-signal-section" style="
                    background: rgba(255,255,255,0.1); 
                    border: 1px solid rgba(255,255,255,0.3); 
                    border-radius: 4px; 
                    color: white; 
                    cursor: pointer; 
                    padding: 4px 8px; 
                    font-size: 10px;
                    transition: background 0.2s;
                " onmouseover="this.style.background='rgba(255,255,255,0.2)'" 
                   onmouseout="this.style.background='rgba(255,255,255,0.1)'">
                    ➖ Hide
                </button>
            </div>
            <div id="signal-section-content">
            
            <!-- Contract input more compact -->
            <textarea id="signal-contract-input" placeholder="Contract addresses (one per line)..." 
                   style="width: 100%; padding: 6px; border: none; border-radius: 4px; font-size: 11px; height: 50px; resize: vertical; color: black; margin-bottom: 8px;">
            </textarea>
            <div style="font-size: 9px; opacity: 0.7; margin-bottom: 8px;">
                💡 Analyze successful signals to generate optimal configs
            </div>
            
            <!-- Settings in one compact row -->
            <div style="display: grid; grid-template-columns: auto auto 1fr auto; gap: 8px; align-items: end; margin-bottom: 8px; font-size: 10px;">
                <div>
                    <label style="display: block; margin-bottom: 2px; font-weight: bold;">Signals/Token:</label>
                    <input type="number" id="signals-per-token" value="6" min="1" max="999" 
                           style="width: 50px; padding: 3px; border: 1px solid white; border-radius: 3px; font-size: 10px; text-align: center;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 2px; font-weight: bold;">Buffer %:</label>
                    <input type="number" id="config-buffer" value="10" min="0" max="50" 
                           style="width: 45px; padding: 3px; border: 1px solid white; border-radius: 3px; font-size: 10px; text-align: center;">
                </div>
                <div>
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="checkbox" id="enable-signal-clustering" checked style="margin-right: 4px; transform: scale(0.9);">
                        <span style="font-size: 10px; font-weight: bold;">🎯 Clustering</span>
                    </label>
                </div>
                <button id="analyze-signals-btn" style="
                    padding: 6px 12px; 
                    background: linear-gradient(45deg, #28a745, #20c997); 
                    border: none; 
                    border-radius: 4px; 
                    color: white; 
                    font-weight: bold; 
                    cursor: pointer;
                    font-size: 11px;
                    transition: transform 0.2s;
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    🔍 Analyze
                </button>
            </div>
            
            <!-- Outlier filtering more compact -->
            <div style="margin-bottom: 8px;">
                <label style="display: block; margin-bottom: 3px; font-weight: bold; font-size: 10px;">Outlier Filter:</label>
                <div style="background: rgba(0,0,0,0.2); border-radius: 4px; padding: 4px; display: flex; gap: 5px; flex-wrap: wrap;">
                    <label style="display: flex; align-items: center; cursor: pointer; flex: 1; min-width: 50px;">
                        <input type="radio" name="signal-outlier-filter" id="signal-outlier-none" value="none" style="margin-right: 2px;">
                        <span style="font-size: 9px;">None</span>
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer; flex: 1; min-width: 50px;">
                        <input type="radio" name="signal-outlier-filter" id="signal-outlier-iqr" value="iqr" checked style="margin-right: 2px;">
                        <span style="font-size: 9px;">IQR</span>
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer; flex: 1; min-width: 60px;">
                        <input type="radio" name="signal-outlier-filter" id="signal-outlier-percentile" value="percentile" style="margin-right: 2px;">
                        <span style="font-size: 9px;">Percentile</span>
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer; flex: 1; min-width: 50px;">
                        <input type="radio" name="signal-outlier-filter" id="signal-outlier-zscore" value="zscore" style="margin-right: 2px;">
                        <span style="font-size: 9px;">Z-Score</span>
                    </label>
                </div>
            </div>
            
            <div id="signal-analysis-results" style="
                background: rgba(0,0,0,0.2); 
                border-radius: 5px; 
                padding: 8px; 
                font-size: 11px; 
                min-height: 35px;
                max-height: 100px;
                overflow-y: auto;
                display: none;
            ">
                <div style="opacity: 0.8;">Analysis results will appear here...</div>
            </div>
            
            <!-- Cluster Selection Section -->
            <div id="cluster-selection" style="margin-top: 10px; display: none;">
                <div style="font-size: 11px; font-weight: bold; margin-bottom: 5px; color: #4ECDC4;">
                    🎯 Select Config:
                </div>
                <div id="cluster-buttons" style="margin-bottom: 8px;">
                    <!-- Cluster buttons will be added dynamically -->
                </div>
            </div>
            
            <div id="generated-config-actions" style="margin-top: 10px; display: none;">
                <button id="apply-generated-config-btn" style="
                    width: 30%; 
                    padding: 8px; 
                    background: linear-gradient(45deg, #FF6B6B, #FF8E53); 
                    border: none; 
                    border-radius: 4px; 
                    color: white; 
                    font-size: 10px; 
                    cursor: pointer;
                    font-weight: bold;
                    margin-right: 2%;
                ">
                    ⚙️ Apply
                </button>
                <button id="optimize-generated-config-btn" style="
                    width: 30%; 
                    padding: 8px; 
                    background: linear-gradient(45deg, #4ECDC4, #44A08D); 
                    border: none; 
                    border-radius: 4px; 
                    color: white; 
                    font-size: 10px; 
                    cursor: pointer;
                    font-weight: bold;
                    margin-right: 2%;
                ">
                    🚀 Optimize
                </button>
                <button id="copy-config-btn" style="
                    width: 30%; 
                    padding: 8px; 
                    background: linear-gradient(45deg, #9B59B6, #8E44AD); 
                    border: none; 
                    border-radius: 4px; 
                    color: white; 
                    font-size: 10px; 
                    cursor: pointer;
                    font-weight: bold;
                ">
                    📋 Copy
                </button>
            </div>
            </div> <!-- End signal-section-content -->
        </div>
        
        <!-- Footer -->
        <div style="margin-top: 15px; text-align: center;">
            <button id="close-btn" style="
                padding: 5px 15px; 
                background: rgba(255,255,255,0.2); 
                border: 1px solid rgba(255,255,255,0.3); 
                border-radius: 15px; 
                color: white; 
                font-size: 11px; 
                cursor: pointer;
            ">
                ✕ Close
            </button>
        </div>
        </div> <!-- End ui-content -->
    `;

    document.body.appendChild(ui);
    
    // Create collapsed state UI
    const collapsedUI = document.createElement('div');
    collapsedUI.id = 'ag-copilot-collapsed-ui';
    collapsedUI.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 120px;
        height: 60px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: 2px solid #fff;
        border-radius: 12px;
        padding: 8px;
        z-index: 10000;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: white;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        cursor: pointer;
        display: none;
        transition: all 0.3s ease;
    `;
    
    collapsedUI.innerHTML = `
        <div style="text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: center;">
            <div style="font-size: 16px; margin-bottom: 2px;">🤖</div>
            <div style="font-size: 9px; font-weight: bold; opacity: 0.9;">AG Co-Pilot</div>
            <div style="font-size: 7px; opacity: 0.7;">Click to expand</div>
        </div>
    `;
    
    collapsedUI.addEventListener('click', () => {
        expandUI();
    });
    
    // Add hover effects to collapsed UI
    collapsedUI.addEventListener('mouseenter', () => {
        collapsedUI.style.transform = 'scale(1.05)';
        collapsedUI.style.boxShadow = '0 8px 25px rgba(0,0,0,0.4)';
    });
    
    collapsedUI.addEventListener('mouseleave', () => {
        collapsedUI.style.transform = 'scale(1)';
        collapsedUI.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
    });
    
    document.body.appendChild(collapsedUI);
    
    // Make functions globally available for onclick handlers
    window.applyBestConfigToUI = async function() {
        if (window.currentBestConfig) {
            console.log('⚙️ Applying best configuration to UI...');
            const success = await applyConfigToUI(window.currentBestConfig, true); // Skip stop check for manual best config application
            if (success) {
                console.log('✅ Best configuration applied to UI successfully!');
            } else {
                console.log('❌ Failed to apply best configuration to UI');
            }
        } else {
            console.log('❌ No best configuration available to apply');
        }
    };
    
    window.copyBestConfigToClipboard = function() {
        if (window.currentBestConfig) {
            const configText = JSON.stringify(window.currentBestConfig, null, 2);
            navigator.clipboard.writeText(configText).then(() => {
                console.log('📋 Best configuration copied to clipboard!');
            }).catch(err => {
                console.log('❌ Failed to copy configuration to clipboard');
            });
        } else {
            console.log('❌ No best configuration available to copy');
        }
    };
    
    return ui;
}

export function setupEventHandlers() {
    const safeAddEventListener = (elementId, event, handler) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
            console.log(`✅ Event listener added for ${elementId}`);
        } else {
            console.warn(`⚠️ Element with ID '${elementId}' not found`);
        }
    };

    // Collapse/Expand functionality
    safeAddEventListener('collapse-ui-btn', 'click', () => {
        collapseUI();
    });
    
    // Section toggles
    safeAddEventListener('toggle-config-section', 'click', () => {
        toggleSection('config-section-content', 'toggle-config-section');
    });
    
    safeAddEventListener('toggle-signal-section', 'click', () => {
        toggleSection('signal-section-content', 'toggle-signal-section');
    });

    // Start optimization button
    safeAddEventListener('start-optimization', 'click', async () => {
        console.log('🚀 Starting optimization...');
        
        const startBtn = document.getElementById('start-optimization');
        const stopBtn = document.getElementById('stop-optimization');
        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'block';
        
        // Placeholder for actual optimization
        setTimeout(() => {
            console.log('✅ Optimization completed (placeholder)');
            if (startBtn) startBtn.style.display = 'block';
            if (stopBtn) stopBtn.style.display = 'none';
        }, 3000);
    });
    
    // Stop optimization button
    safeAddEventListener('stop-optimization', 'click', () => {
        console.log('⏹️ Optimization stopped');
        
        const startBtn = document.getElementById('start-optimization');
        const stopBtn = document.getElementById('stop-optimization');
        if (startBtn) startBtn.style.display = 'block';
        if (stopBtn) stopBtn.style.display = 'none';
    });
    
    // Signal analysis button
    safeAddEventListener('analyze-signals-btn', 'click', async () => {
        const contractInput = document.getElementById('signal-contract-input');
        const resultsDiv = document.getElementById('signal-analysis-results');
        
        if (contractInput && resultsDiv) {
            const addresses = contractInput.value.trim();
            if (addresses) {
                resultsDiv.style.display = 'block';
                updateSignalStatus('🔄 Analyzing signals... (placeholder)');
                
                setTimeout(() => {
                    updateSignalStatus('✅ Analysis complete (placeholder functionality)');
                }, 2000);
            } else {
                alert('Please enter at least one contract address');
            }
        }
    });
    
    // Generated config action buttons
    safeAddEventListener('apply-generated-config-btn', 'click', () => {
        console.log('⚙️ Applying generated config (placeholder)');
    });
    
    safeAddEventListener('optimize-generated-config-btn', 'click', () => {
        console.log('🚀 Optimizing generated config (placeholder)');
    });
    
    safeAddEventListener('copy-config-btn', 'click', () => {
        console.log('📋 Copying config to clipboard (placeholder)');
    });
    
    // Close button
    safeAddEventListener('close-btn', 'click', () => {
        const ui = document.getElementById('ag-copilot-enhanced-ui');
        if (ui) ui.remove();
        const collapsedUI = document.getElementById('ag-copilot-collapsed-ui');
        if (collapsedUI) collapsedUI.remove();
    });
    
    // Preset dropdown
    safeAddEventListener('preset-dropdown', 'change', (e) => {
        if (e.target.value) {
            console.log(`📦 Preset selected: ${e.target.value}`);
            e.target.value = ''; // Reset selection
        }
    });
    
    console.log('✅ All event handlers setup completed');
}

// Helper functions for UI functionality
function collapseUI() {
    const mainUI = document.getElementById('ag-copilot-enhanced-ui');
    const collapsedUI = document.getElementById('ag-copilot-collapsed-ui');
    
    if (mainUI && collapsedUI) {
        mainUI.style.display = 'none';
        collapsedUI.style.display = 'block';
    }
}

function expandUI() {
    const mainUI = document.getElementById('ag-copilot-enhanced-ui');
    const collapsedUI = document.getElementById('ag-copilot-collapsed-ui');
    
    if (mainUI && collapsedUI) {
        mainUI.style.display = 'block';
        collapsedUI.style.display = 'none';
    }
}

function toggleSection(contentId, buttonId) {
    const content = document.getElementById(contentId);
    const button = document.getElementById(buttonId);
    
    if (content && button) {
        const isHidden = content.style.display === 'none';
        content.style.display = isHidden ? 'block' : 'none';
        button.textContent = isHidden ? '➖ Hide' : '➕ Show';
    }
}

// Signal analysis helper function
function updateSignalStatus(message, isError = false) {
    const statusArea = document.getElementById('signal-analysis-results');
    if (statusArea) {
        statusArea.style.display = 'block';
        const timestamp = new Date().toLocaleTimeString();
        const icon = isError ? '❌' : '📝';
        const color = isError ? '#ff6b6b' : '#ffffff';
        
        statusArea.innerHTML += `<div style="color: ${color}; margin: 2px 0;">
            <span style="opacity: 0.7;">${timestamp}</span> ${icon} ${message}
        </div>`;
        statusArea.scrollTop = statusArea.scrollHeight;
    }
}

export function updateModuleStatus() {
    console.log('📦 Module status updated');
}

export function updateStatus(message, isError = false) {
    const icon = isError ? '❌' : '📝';
    console.log(`${icon} ${message}`);
}

export function updateUIBackground(isCompleted = false) {
    const ui = document.getElementById('ag-copilot-enhanced-ui');
    if (ui) {
        if (isCompleted) {
            ui.style.background = 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)';
        } else {
            ui.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }
    }
}

export function updateProgress(message, progress, bestScore, testCount, totalTokens, startTime) {
    if (startTime) {
        const runtime = Math.floor((Date.now() - startTime) / 1000);
        console.log(`📊 Progress: ${(progress || 0).toFixed(1)}% | Best: ${bestScore}% | Tests: ${testCount} | Runtime: ${runtime}s`);
    } else {
        console.log(`📊 ${message}`);
    }
}
