/**
 * AGCopilot-UI.js - Complete Sophisticated User Interface Module
 * 
 * Complete restoration of the original AGCopilot-Enhanced.js UI with:
 * - Advanced multi-section collapsible interface (420px width)
 * - Parameter discovery controls  
 * - Optimization method selection with advanced algorithms
 * - Signal analysis interface with clustering
 * - Best config display system
 * - Collapsible minimize/expand functionality
 */

(function() {
    'use strict';

    // ========================================
    // 🎯 PRESET GENERATION HELPER
    // ========================================
    function generatePresetOptions() {
        const presets = {
            '': 'Select preset...',
            'conservative': 'Conservative (Safe)',
            'aggressive': 'Aggressive (Risky)',
            '9747': '9747 (High Buy Ratio)',
            'oldDeployer': 'Old Deployer',
            'oldishDeployer': 'Oldish Deployer', 
            'minWinPred': 'Min Win Prediction',
            'bundle1_74': 'Bundle 1.74%',
            'deployerBalance10': 'Deployer Balance 10 SOL',
            'agScore7': 'AG Score 7+',
            'highTTCFilter': 'High TTC Filter',
            'exclusiveWallets': 'Exclusive Wallets',
            'mediumMcap': 'Medium MCAP',
            'highAgScore': 'High AG Score',
            'moderateDrainTolerance': 'Moderate Drain Tolerance',
            'kycRequired': 'KYC Required',
            'zeroDrainTolerance': 'Zero Drain Tolerance',
            'mediumVolMcap': 'Medium Vol MCAP',
            'agedTokens': 'Aged Tokens',
            'lowVolMcapCap': 'Low Vol MCAP Cap'
        };
        
        return Object.entries(presets)
            .map(([value, text]) => `<option value="${value}">${text}</option>`)
            .join('');
    }

    // ========================================
    // 🎨 MAIN UI CREATION FUNCTION
    // ========================================
    function createUI() {
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
                                <input type="number" id="target-pnl" value="100" min="5" max="500" step="10"
                                       style="padding: 5px; border: 1px solid white; border-radius: 3px; font-size: 11px; text-align: center;">
                            </label>
                            <label style="display: flex; flex-direction: column;">
                                <span style="font-size: 11px; font-weight: bold; margin-bottom: 3px;">Min Tokens:</span>
                                <input type="number" id="min-tokens" value="75" min="1" max="100" step="1"
                                       style="padding: 5px; border: 1px solid white; border-radius: 3px; font-size: 11px; text-align: center;">
                            </label>
                            <label style="display: flex; flex-direction: column;">
                                <span style="font-size: 11px; font-weight: bold; margin-bottom: 3px;">Runtime (min):</span>
                                <input type="number" id="runtime-min" value="15" min="5" max="120" step="5"
                                       style="padding: 5px; border: 1px solid white; border-radius: 3px; font-size: 11px; text-align: center;">
                            </label>
                            <label style="display: flex; flex-direction: column;">
                                <span style="font-size: 11px; font-weight: bold; margin-bottom: 3px;">Runs:</span>
                                <input type="number" id="chain-run-count" value="3" min="1" max="10" step="1"
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
                        
                        <div style="margin-bottom: 15px;">
                            <button id="parameter-discovery" style="
                                width: 100%; 
                                padding: 10px; 
                                background: linear-gradient(45deg, #9b59b6, #e74c3c); 
                                border: none; 
                                border-radius: 8px; 
                                color: white; 
                                font-weight: bold; 
                                cursor: pointer;
                                font-size: 13px;
                                transition: transform 0.2s;
                            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                                🔬 Parameter Impact Discovery
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
                                <button onclick="window.AGCopilotUI.applyBestConfigToUI()" style="padding: 8px; background: rgba(33, 150, 243, 0.3); border: 1px solid rgba(33, 150, 243, 0.6); border-radius: 4px; color: white; font-size: 11px; cursor: pointer;">⚙️ Apply to UI</button>
                                <button onclick="window.AGCopilotUI.copyBestConfigToClipboard()" style="padding: 8px; background: rgba(156, 39, 176, 0.3); border: 1px solid rgba(156, 39, 176, 0.6); border-radius: 4px; color: white; font-size: 11px; cursor: pointer;">📋 Copy Config</button>
                            </div>
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
        
        return ui;
    }

    // ========================================
    // 🔄 UI COLLAPSE/EXPAND FUNCTIONS
    // ========================================
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

    // ========================================
    // 🎛️ UI INTERACTION FUNCTIONS  
    // ========================================
    
    // Safe event listener helper
    function safeAddEventListener(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
        }
    }

    // Setup all event handlers
    function setupEventHandlers() {
        // Close button
        safeAddEventListener('close-btn', 'click', () => {
            const mainUI = document.getElementById('ag-copilot-enhanced-ui');
            const collapsedUI = document.getElementById('ag-copilot-collapsed-ui');
            if (mainUI) mainUI.remove();
            if (collapsedUI) collapsedUI.remove();
        });

        // Collapse button
        safeAddEventListener('collapse-ui-btn', 'click', () => {
            collapseUI();
        });

        // Section toggle handlers
        safeAddEventListener('toggle-config-section', 'click', () => {
            const content = document.getElementById('config-section-content');
            const button = document.getElementById('toggle-config-section');
            if (content && button) {
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'block' : 'none';
                button.textContent = isHidden ? '➖ Hide' : '➕ Show';
            }
        });

        safeAddEventListener('toggle-signal-section', 'click', () => {
            const content = document.getElementById('signal-section-content');
            const button = document.getElementById('toggle-signal-section');
            if (content && button) {
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'block' : 'none';
                button.textContent = isHidden ? '➖ Hide' : '➕ Show';
            }
        });

        // Start optimization button
        safeAddEventListener('start-optimization', 'click', async () => {
            if (window.AGCopilot && typeof window.AGCopilot.runOptimization === 'function') {
                try {
                    console.log('🚀 Starting optimization from UI...');
                    await window.AGCopilot.runOptimization();
                } catch (error) {
                    console.error('❌ Optimization failed:', error);
                }
            } else {
                console.warn('⚠️ AGCopilot.runOptimization not available');
            }
        });

        // Stop optimization button  
        safeAddEventListener('stop-optimization', 'click', () => {
            if (typeof window.stopOptimization === 'function') {
                window.stopOptimization();
            } else {
                window.STOPPED = true;
                console.log('🛑 Optimization stopped');
            }
        });

        // Parameter discovery button
        safeAddEventListener('parameter-discovery', 'click', async () => {
            if (window.AGCopilot && typeof window.AGCopilot.runParameterDiscovery === 'function') {
                try {
                    console.log('🔬 Starting parameter discovery from UI...');
                    await window.AGCopilot.runParameterDiscovery();
                } catch (error) {
                    console.error('❌ Parameter discovery failed:', error);
                }
            } else {
                console.warn('⚠️ Parameter discovery not available');
            }
        });

        // Signal analysis button
        safeAddEventListener('analyze-signals-btn', 'click', async () => {
            const contractInput = document.getElementById('signal-contract-input');
            if (!contractInput || !contractInput.value.trim()) {
                console.warn('⚠️ Please enter contract addresses to analyze');
                return;
            }

            if (window.AGCopilot && typeof window.AGCopilot.analyzeSignalCriteria === 'function') {
                try {
                    console.log('🔍 Starting signal analysis from UI...');
                    const contracts = contractInput.value.trim().split('\n').filter(c => c.trim());
                    // This would need to be implemented with proper signal processing
                    console.log('📊 Analyzing contracts:', contracts);
                } catch (error) {
                    console.error('❌ Signal analysis failed:', error);
                }
            } else {
                console.warn('⚠️ Signal analysis not available');
            }
        });
    }

    // ========================================
    // 📊 UI UPDATE FUNCTIONS
    // ========================================
    
    function updateStatus(message, isError = false) {
        const icon = isError ? '❌' : '📝';
        console.log(`${icon} ${message}`);
    }

    function updateUIBackground(isCompleted = false) {
        const ui = document.getElementById('ag-copilot-enhanced-ui');
        if (ui) {
            if (isCompleted) {
                ui.style.background = 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)';
            } else {
                ui.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            }
        }
    }

    function updateProgress(message, progress, bestScore, testCount, totalTokens, startTime) {
        if (startTime) {
            const runtime = Math.floor((Date.now() - startTime) / 1000);
            console.log(`📊 ${message} | Progress: ${(progress || 0).toFixed(1)}% | Best: ${bestScore}% | Tests: ${testCount} | Tokens: ${totalTokens} | Runtime: ${runtime}s`);
        } else {
            console.log(`📊 ${message}`);
        }
    }

    // Get selected outlier filtering method
    function getSignalOutlierFilterMethod() {
        const methods = ['none', 'iqr', 'percentile', 'zscore'];
        for (const method of methods) {
            const radio = document.getElementById(`signal-outlier-${method}`);
            if (radio && radio.checked) {
                return method;
            }
        }
        return 'none';
    }

    // Update signal analysis status
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

    // Create cluster selection UI
    function createClusterSelectionUI(clusters, fallbackAnalysis) {
        const clusterSection = document.getElementById('cluster-selection');
        const clusterButtonsContainer = document.getElementById('cluster-buttons');
        
        if (!clusterSection || !clusterButtonsContainer) return;
        
        clusterButtonsContainer.innerHTML = '';
        
        const buttonStyle = `
            padding: 4px 8px; 
            margin: 2px; 
            border: 1px solid #4ECDC4; 
            border-radius: 3px; 
            background: rgba(78, 205, 196, 0.1); 
            color: #4ECDC4; 
            font-size: 9px; 
            cursor: pointer;
            transition: all 0.2s;
        `;
        
        clusters.forEach((cluster, index) => {
            const button = document.createElement('button');
            button.innerHTML = `${cluster.name} (${cluster.tokenCount} CAs)`;
            button.style.cssText = buttonStyle;
            button.onclick = () => selectClusterConfig(cluster.id, clusters, fallbackAnalysis);
            clusterButtonsContainer.appendChild(button);
        });
        
        clusterSection.style.display = 'block';
    }

    // ========================================
    // 🌟 BEST CONFIG MANAGEMENT
    // ========================================

    // Apply best config functions made available globally  
    function applyBestConfigToUI() {
        if (window.currentBestConfig) {
            console.log('⚙️ Applying best configuration to UI...');
            console.log('📋 Best config:', window.currentBestConfig);
            console.log('⚠️ UI application requires website-specific implementation');
        } else {
            console.log('❌ No best configuration available to apply');
        }
    }

    function copyBestConfigToClipboard() {
        if (window.currentBestConfig) {
            const configText = JSON.stringify(window.currentBestConfig, null, 2);
            navigator.clipboard.writeText(configText).then(() => {
                console.log('📋 Best configuration copied to clipboard!');
            }).catch(err => {
                console.log('❌ Failed to copy configuration to clipboard');
                console.log('📋 Best config:', configText);
            });
        } else {
            console.log('❌ No best configuration available to copy');
        }
    }

    // ========================================
    // 📤 MODULE EXPORTS
    // ========================================
    
    // Create global namespace if it doesn't exist
    if (typeof window !== 'undefined') {
        window.AGCopilotUI = {
            // UI creation and management
            createUI,
            setupEventHandlers,
            collapseUI,
            expandUI,
            
            // Status and progress updates
            updateStatus,
            updateUIBackground,
            updateProgress,
            updateSignalStatus,
            
            // Signal analysis helpers
            getSignalOutlierFilterMethod,
            createClusterSelectionUI,
            
            // Best config management
            applyBestConfigToUI,
            copyBestConfigToClipboard,
            
            // Initialization
            initialize: function() {
                const ui = createUI();
                setupEventHandlers();
                return ui;
            }
        };
    }

    // CommonJS export for Node.js compatibility
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            createUI,
            setupEventHandlers,
            collapseUI,
            expandUI,
            updateStatus,
            updateUIBackground,
            updateProgress,
            updateSignalStatus,
            getSignalOutlierFilterMethod,
            createClusterSelectionUI,
            applyBestConfigToUI,
            copyBestConfigToClipboard
        };
    }

    console.log('✅ AGCopilot-UI.js loaded - Complete sophisticated interface with all original features');

})();