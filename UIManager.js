// UIManager.js
// User Interface management extracted from AGCopilot.js
// Handles UI creation, updates, and interactions with full parity

(function(AGUtils) {
    'use strict';

    const UI = {};
    const AG = AGUtils || (window && window.AGUtils) || {};

    // ========================================
    // 🎨 MAIN UI CREATION (Full AGCopilot Parity)
    // ========================================

    // Create complete UI matching AGCopilot.js exactly
    UI.createUI = function() {
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
            background: #1a2332;
            border: 1px solid #2d3748;
            border-radius: 8px;
            padding: 0;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            color: #e2e8f0;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;

        ui.innerHTML = UI.getMainUIHTML();
        document.body.appendChild(ui);
        
        // Create collapsed UI
        UI.createCollapsedUI();
        
        // Setup tab switching
        UI.setupTabSwitching();
        
        // Setup event handlers
        UI.setupEventHandlers();
        
        return ui;
    };

    // Get main UI HTML content with exact AGCopilot.js structure
    UI.getMainUIHTML = function() {
        return `
            <div id="ui-header" style="
                padding: 16px 20px;
                background: #2d3748;
                border-bottom: 1px solid #4a5568;
                border-radius: 8px 8px 0 0;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="
                            width: 8px;
                            height: 8px;
                            background: #48bb78;
                            border-radius: 50%;
                            animation: pulse 2s infinite;
                        "></div>
                        <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #f7fafc;">
                            🤖 AG Copilot Enhanced
                        </h3>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button id="collapse-ui-btn" style="
                            background: #4a5568;
                            border: 1px solid #718096;
                            border-radius: 4px;
                            color: #e2e8f0;
                            cursor: pointer;
                            padding: 6px 10px;
                            font-size: 11px;
                            font-weight: 500;
                            transition: all 0.2s;
                        " onmouseover="this.style.background='#718096'" 
                           onmouseout="this.style.background='#4a5568'"
                           title="Minimize window">
                            ➖
                        </button>
                        <button id="close-ui-btn" style="
                            background: #e53e3e;
                            border: 1px solid #c53030;
                            border-radius: 4px;
                            color: white;
                            cursor: pointer;
                            padding: 6px 10px;
                            font-size: 11px;
                            font-weight: 500;
                            transition: all 0.2s;
                        " onmouseover="this.style.background='#c53030'" 
                           onmouseout="this.style.background='#e53e3e'"
                           title="Close AG Copilot">
                            ✕
                        </button>
                    </div>
                </div>
            </div>
            
            <div id="ui-content" style="
                flex: 1;
                overflow-y: auto;
                scrollbar-width: thin;
                scrollbar-color: #4a5568 transparent;
            ">
                ${UI.getUIStyles()}

                <!-- Tab Navigation -->
                <div style="
                    display: flex;
                    background: #2d3748;
                    border-bottom: 1px solid #4a5568;
                ">
                    <button class="tab-button active" onclick="window.switchTab('config-tab')" id="config-tab-btn">
                        ⚙️ Configuration
                    </button>
                    <button class="tab-button" onclick="window.switchTab('signal-tab')" id="signal-tab-btn">
                        🔍 Signal Analysis
                    </button>
                </div>

                <!-- Configuration Tab -->
                <div id="config-tab" class="tab-content active">
                    ${UI.getConfigurationTabHTML()}
                </div>

                <!-- Signal Analysis Tab -->
                <div id="signal-tab" class="tab-content">
                    ${UI.getSignalAnalysisTabHTML()}
                </div>

                <!-- Permanent Results Section at Bottom -->
                <div style="
                    border-top: 1px solid #2d3748;
                    background: rgba(72, 187, 120, 0.05);
                ">
                    ${UI.getBestConfigDisplayHTML()}
                </div>
            </div>
        `;
    };

    // Get UI styles exactly matching AGCopilot.js
    UI.getUIStyles = function() {
        return `
            <style>
                #ui-content::-webkit-scrollbar {
                    width: 6px;
                }
                #ui-content::-webkit-scrollbar-track {
                    background: transparent;
                }
                #ui-content::-webkit-scrollbar-thumb {
                    background: #4a5568;
                    border-radius: 3px;
                }
                #ui-content::-webkit-scrollbar-thumb:hover {
                    background: #718096;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .tab-button {
                    padding: 12px 20px;
                    background: #2d3748;
                    border: none;
                    border-bottom: 2px solid transparent;
                    color: #a0aec0;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    flex: 1;
                }
                .tab-button:hover {
                    background: #4a5568;
                    color: #e2e8f0;
                }
                .tab-button.active {
                    background: #1a2332;
                    color: #63b3ed;
                    border-bottom-color: #63b3ed;
                }
                .tab-content {
                    display: none;
                    padding: 16px 20px;
                }
                .tab-content.active {
                    display: block;
                }
            </style>
        `;
    };

    // Configuration tab - complete implementation from AGCopilot.js
    UI.getConfigurationTabHTML = function() {
        return `
            <!-- Presets and Settings Row 1 -->
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 8px; margin-bottom: 8px;">
                <div>
                    <label style="
                        font-size: 11px;
                        font-weight: 500;
                        color: #a0aec0;
                        display: block;
                        margin-bottom: 4px;
                    ">Quick Presets</label>
                    <select id="preset-dropdown" style="
                        width: 100%;
                        padding: 5px 8px;
                        background: #2d3748;
                        border: 1px solid #4a5568;
                        border-radius: 4px;
                        color: #e2e8f0;
                        font-size: 10px;
                        outline: none;
                        transition: border-color 0.2s;
                    " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                        ${UI.generatePresetOptions()}
                    </select>
                </div>
                <div>
                    <label style="
                        font-size: 11px;
                        font-weight: 500;
                        color: #a0aec0;
                        display: block;
                        margin-bottom: 4px;
                    ">Trigger Mode</label>
                    <select id="trigger-mode-select" style="
                        width: 100%;
                        padding: 5px 8px;
                        background: #2d3748;
                        border: 1px solid #4a5568;
                        border-radius: 4px;
                        color: #e2e8f0;
                        font-size: 10px;
                        outline: none;
                        transition: border-color 0.2s;
                    " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                        <option value="0">Bullish Bonding</option>
                        <option value="1">God Mode</option>
                        <option value="2">Moon Finder</option>
                        <option value="3">Fomo</option>
                        <option value="4" selected>Launchpads</option>
                        <option value="5">Smart Tracker</option>
                    </select>
                </div>
            </div>
            
            <!-- Date Range and Target Row 2 -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 6px; margin-bottom: 8px;">
                <div>
                    <label style="
                        font-size: 10px;
                        font-weight: 500;
                        color: #a0aec0;
                        display: block;
                        margin-bottom: 2px;
                    ">From Date</label>
                    <input type="date" id="from-date" style="
                        width: 100%;
                        padding: 3px 4px;
                        background: #2d3748;
                        border: 1px solid #4a5568;
                        border-radius: 4px;
                        color: #e2e8f0;
                        font-size: 9px;
                        outline: none;
                        transition: border-color 0.2s;
                    " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                </div>
                <div>
                    <label style="
                        font-size: 10px;
                        font-weight: 500;
                        color: #a0aec0;
                        display: block;
                        margin-bottom: 2px;
                    ">To Date</label>
                    <input type="date" id="to-date" style="
                        width: 100%;
                        padding: 3px 4px;
                        background: #2d3748;
                        border: 1px solid #4a5568;
                        border-radius: 4px;
                        color: #e2e8f0;
                        font-size: 9px;
                        outline: none;
                        transition: border-color 0.2s;
                    " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                </div>
                <div>
                    <label style="
                        font-size: 10px;
                        font-weight: 500;
                        color: #a0aec0;
                        display: block;
                        margin-bottom: 2px;
                    ">Target PnL %</label>
                    <input type="number" id="target-pnl" value="100" min="5" max="500" step="5" style="
                        width: 100%;
                        padding: 3px 4px;
                        background: #2d3748;
                        border: 1px solid #4a5568;
                        border-radius: 4px;
                        color: #e2e8f0;
                        font-size: 9px;
                        text-align: center;
                        outline: none;
                        transition: border-color 0.2s;
                    " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                </div>
                <div>
                    <label style="
                        font-size: 10px;
                        font-weight: 500;
                        color: #a0aec0;
                        display: block;
                        margin-bottom: 2px;
                    ">Runtime (min)</label>
                    <input type="number" id="runtime-min" value="10" min="5" max="120" step="5" style="
                        width: 100%;
                        padding: 3px 4px;
                        background: #2d3748;
                        border: 1px solid #4a5568;
                        border-radius: 4px;
                        color: #e2e8f0;
                        font-size: 9px;
                        text-align: center;
                        outline: none;
                        transition: border-color 0.2s;
                    " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                </div>
            </div>

            <!-- Optimization Settings Row 3 -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px;">
                <div>
                    <label style="
                        font-size: 10px;
                        font-weight: 500;
                        color: #a0aec0;
                        display: block;
                        margin-bottom: 3px;
                    ">Min Tokens / Day</label>
                    <input type="number" id="min-tokens" value="10" min="5" max="1000" step="5" style="
                        width: 100%;
                        padding: 5px 6px;
                        background: #2d3748;
                        border: 1px solid #4a5568;
                        border-radius: 4px;
                        color: #e2e8f0;
                        font-size: 10px;
                        text-align: center;
                        outline: none;
                        transition: border-color 0.2s;
                    " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                </div>
                <div>
                    <label style="
                        font-size: 10px;
                        font-weight: 500;
                        color: #a0aec0;
                        display: block;
                        margin-bottom: 3px;
                    ">Chain Runs</label>
                    <input type="number" id="chain-run-count" value="5" min="1" max="10" step="1" style="
                        width: 100%;
                        padding: 5px 6px;
                        background: #2d3748;
                        border: 1px solid #4a5568;
                        border-radius: 4px;
                        color: #e2e8f0;
                        font-size: 10px;
                        text-align: center;
                        outline: none;
                        transition: border-color 0.2s;
                    " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                </div>
            </div>

            <!-- Win Rate Configuration -->
            <div style="
                margin-bottom: 10px;
                padding: 8px;
                background: #2d3748;
                border-radius: 6px;
                border: 1px solid #4a5568;
            ">
                <div style="
                    font-size: 11px;
                    font-weight: 600;
                    margin-bottom: 6px;
                    color: #63b3ed;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                ">
                    🎯 Win Rate Thresholds
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
                    <div>
                        <label style="
                            font-size: 9px;
                            font-weight: 500;
                            color: #a0aec0;
                            display: block;
                            margin-bottom: 2px;
                        ">Small Sample (&lt;500)</label>
                        <input type="number" id="min-win-rate-small" value="35" min="0" max="100" step="1" style="
                            width: 100%;
                            padding: 4px 5px;
                            background: #2d3748;
                            border: 1px solid #4a5568;
                            border-radius: 4px;
                            color: #e2e8f0;
                            font-size: 9px;
                            text-align: center;
                            outline: none;
                            transition: border-color 0.2s;
                        " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                    </div>
                    <div>
                        <label style="
                            font-size: 9px;
                            font-weight: 500;
                            color: #a0aec0;
                            display: block;
                            margin-bottom: 2px;
                        ">Medium (500-999)</label>
                        <input type="number" id="min-win-rate-medium" value="30" min="0" max="100" step="1" style="
                            width: 100%;
                            padding: 4px 5px;
                            background: #2d3748;
                            border: 1px solid #4a5568;
                            border-radius: 4px;
                            color: #e2e8f0;
                            font-size: 9px;
                            text-align: center;
                            outline: none;
                            transition: border-color 0.2s;
                        " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                    </div>
                    <div>
                        <label style="
                            font-size: 9px;
                            font-weight: 500;
                            color: #a0aec0;
                            display: block;
                            margin-bottom: 2px;
                        ">Large (1000+)</label>
                        <input type="number" id="min-win-rate-large" value="25" min="0" max="100" step="1" style="
                            width: 100%;
                            padding: 4px 5px;
                            background: #2d3748;
                            border: 1px solid #4a5568;
                            border-radius: 4px;
                            color: #e2e8f0;
                            font-size: 9px;
                            text-align: center;
                            outline: none;
                            transition: border-color 0.2s;
                        " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                    </div>
                </div>
                <div style="
                    font-size: 8px;
                    color: #a0aec0;
                    margin-top: 4px;
                    line-height: 1.3;
                    text-align: center;
                ">
                    Minimum win rates required for configurations based on token count
                </div>
            </div>
            
            <!-- Advanced Optimization Features -->
            <div style="
                margin-bottom: 4px;
                padding: 4px;
                background: #2d3748;
                border-radius: 6px;
                border: 1px solid #4a5568;
            ">
                <div style="
                    font-size: 10px;
                    font-weight: 600;
                    margin-bottom: 4px;
                    color: #63b3ed;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                ">
                    🚀 Optimization Methods
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 2px 6px;">
                    
                    
                    <label style="
                        display: flex;
                        align-items: center;
                        cursor: pointer;
                        font-size: 10px;
                        color: #e2e8f0;
                        padding: 2px;
                        border-radius: 3px;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='#4a5568'" 
                      onmouseout="this.style.background='transparent'"
                      title="Advanced optimization technique that accepts worse solutions occasionally to escape local optima">
                        <input type="checkbox" id="simulated-annealing" checked style="
                            margin-right: 4px;
                            transform: scale(0.8);
                            accent-color: #63b3ed;
                        ">
                        <span style="font-weight: 500;">🔥 Simulated Annealing</span>
                    </label>
                    
                    <label style="
                        display: flex;
                        align-items: center;
                        cursor: pointer;
                        font-size: 10px;
                        color: #e2e8f0;
                        padding: 2px;
                        border-radius: 3px;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='#4a5568'" 
                      onmouseout="this.style.background='transparent'"
                      title="Statistical sampling method that ensures even distribution across parameter space">
                        <input type="checkbox" id="latin-hypercube" checked style="
                            margin-right: 4px;
                            transform: scale(0.8);
                            accent-color: #63b3ed;
                        ">
                        <span style="font-weight: 500;">📐 Latin Hypercube</span>
                    </label>
                    
                    <label style="
                        display: flex;
                        align-items: center;
                        cursor: pointer;
                        font-size: 10px;
                        color: #e2e8f0;
                        padding: 2px;
                        border-radius: 3px;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='#4a5568'" 
                      onmouseout="this.style.background='transparent'"
                      title="Tests related parameters together (e.g., min/max MCAP, wallet counts) for better combinations">
                        <input type="checkbox" id="correlated-params" checked style="
                            margin-right: 4px;
                            transform: scale(0.8);
                            accent-color: #63b3ed;
                        ">
                        <span style="font-weight: 500;">🔗 Correlated Params</span>
                    </label>
                    
                    <label style="
                        display: flex;
                        align-items: center;
                        cursor: pointer;
                        font-size: 10px;
                        color: #e2e8f0;
                        padding: 2px;
                        border-radius: 3px;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='#4a5568'" 
                      onmouseout="this.style.background='transparent'"
                      title="Fine-grained testing of the most effective parameters with smaller increments">
                        <input type="checkbox" id="deep-dive" checked style="
                            margin-right: 4px;
                            transform: scale(0.8);
                            accent-color: #63b3ed;
                        ">
                        <span style="font-weight: 500;">🔬 Deep Dive</span>
                    </label>
                    
                    <!-- Scoring Mode Selector -->
                    <div style="grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 2fr; align-items: center; gap: 8px; margin-top: 4px;">
                        <label style="font-size: 10px; color: #a0aec0; font-weight: 500;">Scoring Mode</label>
                        <select id="scoring-mode-select" style="
                            width: 100%;
                            padding: 4px 6px;
                            background: #2d3748;
                            border: 1px solid #4a5568;
                            border-radius: 4px;
                            color: #e2e8f0;
                            font-size: 10px;
                            outline: none;
                        " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                            <option value="robust" selected>Outlier-Resistant (PnL + Win Rate)</option>
                            <option value="tp_only">TP PnL % Only</option>
                            <option value="winrate_only">Win Rate Only</option>
                        </select>
                    </div>
                </div>
                
                <!-- Low Bundled % Constraint -->
                <div style="
                    margin-top: 4px;
                    padding: 4px;
                    background: rgba(255, 193, 7, 0.1);
                    border: 1px solid rgba(255, 193, 7, 0.3);
                    border-radius: 4px;
                ">
                    <label style="
                        display: flex;
                        align-items: center;
                        cursor: pointer;
                        font-size: 10px;
                        color: #ffc107;
                        font-weight: 500;
                    " title="Forces Min Bundled % < 5% and Max Bundled % < 35% during optimization">
                        <input type="checkbox" id="low-bundled-constraint" checked style="
                            margin-right: 4px;
                            transform: scale(0.8);
                            accent-color: #ffc107;
                        ">
                        <span>🛡️ Low Bundled % Constraint</span>
                    </label>
                    <div style="
                        font-size: 8px;
                        color: #a0aec0;
                        margin-top: 1px;
                        margin-left: 16px;
                        line-height: 1.2;
                    ">
                        Forces Min Bundled % &lt; 5% and Max Bundled % &lt; 35% during optimization
                    </div>
                </div>
            </div>
        `;
    };

    // Signal analysis tab - complete implementation from AGCopilot.js
    UI.getSignalAnalysisTabHTML = function() {
        return `
            <!-- Contract Input -->
            <div style="margin-bottom: 12px;">
                <label style="
                    font-size: 12px;
                    font-weight: 500;
                    color: #a0aec0;
                    display: block;
                    margin-bottom: 6px;
                ">Contract Addresses</label>
                <textarea id="signal-contract-input" placeholder="Contract addresses (one per line)..." style="
                    width: 100%;
                    padding: 12px;
                    background: #2d3748;
                    border: 1px solid #4a5568;
                    border-radius: 4px;
                    color: #e2e8f0;
                    font-size: 12px;
                    height: 80px;
                    resize: vertical;
                    outline: none;
                    transition: border-color 0.2s;
                    font-family: 'Monaco', 'Menlo', monospace;
                " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'"></textarea>
            </div>
            
            <div style="
                font-size: 11px;
                color: #718096;
                text-align: center;
                margin-bottom: 16px;
                padding: 8px;
                background: #2d3748;
                border-radius: 4px;
                border: 1px solid #4a5568;
            ">
                💡 Analyze successful signals to generate optimal configs
            </div>
            
            <!-- Settings Grid -->
            <div style="display: grid; grid-template-columns: auto auto 1fr auto; gap: 12px; align-items: end; margin-bottom: 16px;">
                <div>
                    <label style="
                        font-size: 11px;
                        font-weight: 500;
                        color: #a0aec0;
                        display: block;
                        margin-bottom: 4px;
                    ">Signals/Token</label>
                    <input type="number" id="signals-per-token" value="6" min="1" max="999" style="
                        width: 60px;
                        padding: 6px 8px;
                        background: #2d3748;
                        border: 1px solid #4a5568;
                        border-radius: 4px;
                        color: #e2e8f0;
                        font-size: 11px;
                        text-align: center;
                        outline: none;
                        transition: border-color 0.2s;
                    " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                </div>
                <div>
                    <label style="
                        font-size: 11px;
                        font-weight: 500;
                        color: #a0aec0;
                        display: block;
                        margin-bottom: 4px;
                    ">Buffer %</label>
                    <input type="number" id="config-buffer" value="10" min="0" max="50" style="
                        width: 55px;
                        padding: 6px 8px;
                        background: #2d3748;
                        border: 1px solid #4a5568;
                        border-radius: 4px;
                        color: #e2e8f0;
                        font-size: 11px;
                        text-align: center;
                        outline: none;
                        transition: border-color 0.2s;
                    " onfocus="this.style.borderColor='#63b3ed'" onblur="this.style.borderColor='#4a5568'">
                </div>
                <div style="display: flex; align-items: center; justify-content: center;">
                    <label style="
                        display: flex;
                        align-items: center;
                        cursor: pointer;
                        font-size: 11px;
                        color: #e2e8f0;
                        font-weight: 500;
                    ">
                        <input type="checkbox" id="enable-signal-clustering" checked style="
                            margin-right: 6px;
                            transform: scale(1.0);
                            accent-color: #63b3ed;
                        ">
                        🎯 Clustering
                    </label>
                </div>
                <button id="analyze-signals-btn" style="
                    padding: 8px 16px;
                    background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
                    border: none;
                    border-radius: 4px;
                    color: white;
                    font-weight: 500;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s;
                " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                    🔍 Analyze
                </button>
            </div>
            
            <!-- Outlier Filtering -->
            <div style="margin-bottom: 16px;">
                <label style="
                    font-size: 12px;
                    font-weight: 500;
                    color: #a0aec0;
                    display: block;
                    margin-bottom: 8px;
                ">Outlier Filter</label>
                <div style="
                    background: #2d3748;
                    border: 1px solid #4a5568;
                    border-radius: 4px;
                    padding: 8px;
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 8px;
                ">
                    <label style="
                        display: flex;
                        align-items: center;
                        cursor: pointer;
                        font-size: 11px;
                        color: #e2e8f0;
                        padding: 4px;
                        border-radius: 3px;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='#4a5568'" onmouseout="this.style.background='transparent'">
                        <input type="radio" name="signal-outlier-filter" id="signal-outlier-none" value="none" style="
                            margin-right: 4px;
                            accent-color: #63b3ed;
                        ">
                        <span>None</span>
                    </label>
                    <label style="
                        display: flex;
                        align-items: center;
                        cursor: pointer;
                        font-size: 11px;
                        color: #e2e8f0;
                        padding: 4px;
                        border-radius: 3px;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='#4a5568'" onmouseout="this.style.background='transparent'">
                        <input type="radio" name="signal-outlier-filter" id="signal-outlier-iqr" value="iqr" checked style="
                            margin-right: 4px;
                            accent-color: #63b3ed;
                        ">
                        <span>IQR</span>
                    </label>
                    <label style="
                        display: flex;
                        align-items: center;
                        cursor: pointer;
                        font-size: 11px;
                        color: #e2e8f0;
                        padding: 4px;
                        border-radius: 3px;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='#4a5568'" onmouseout="this.style.background='transparent'">
                        <input type="radio" name="signal-outlier-filter" id="signal-outlier-percentile" value="percentile" style="
                            margin-right: 4px;
                            accent-color: #63b3ed;
                        ">
                        <span>Percentile</span>
                    </label>
                    <label style="
                        display: flex;
                        align-items: center;
                        cursor: pointer;
                        font-size: 11px;
                        color: #e2e8f0;
                        padding: 4px;
                        border-radius: 3px;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='#4a5568'" onmouseout="this.style.background='transparent'">
                        <input type="radio" name="signal-outlier-filter" id="signal-outlier-zscore" value="zscore" style="
                            margin-right: 4px;
                            accent-color: #63b3ed;
                        ">
                        <span>Z-Score</span>
                    </label>
                </div>
            </div>
            
            <!-- Analysis Results -->
            <div id="signal-analysis-results" style="
                background: #2d3748;
                border: 1px solid #4a5568;
                border-radius: 6px;
                padding: 12px;
                font-size: 12px;
                min-height: 60px;
                max-height: 150px;
                overflow-y: auto;
                display: none;
                scrollbar-width: thin;
                scrollbar-color: #4a5568 transparent;
            ">
                <div style="color: #a0aec0;">Analysis results will appear here...</div>
            </div>
            
            <!-- Cluster Selection Section -->
            <div id="cluster-selection" style="margin-top: 16px; display: none;">
                <div style="
                    font-size: 12px;
                    font-weight: 600;
                    margin-bottom: 8px;
                    color: #63b3ed;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                ">
                    🎯 Select Config
                </div>
                <div id="cluster-buttons" style="margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 6px;">
                    <!-- Cluster buttons will be added dynamically -->
                </div>
            </div>
            
            <!-- Generated Config Actions -->
            <div id="generated-config-actions" style="margin-top: 16px; display: none;">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
                    <button id="apply-generated-config-btn" style="
                        padding: 10px 8px;
                        background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%);
                        border: none;
                        border-radius: 4px;
                        color: white;
                        font-size: 11px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: all 0.2s;
                    " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                        ⚙️ Apply
                    </button>
                    <button id="optimize-generated-config-btn" style="
                        padding: 10px 8px;
                        background: linear-gradient(135deg, #38b2ac 0%, #319795 100%);
                        border: none;
                        border-radius: 4px;
                        color: white;
                        font-size: 11px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: all 0.2s;
                    " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                        🚀 Optimize
                    </button>
                    <button id="copy-config-btn" style="
                        padding: 10px 8px;
                        background: linear-gradient(135deg, #9f7aea 0%, #805ad5 100%);
                        border: none;
                        border-radius: 4px;
                        color: white;
                        font-size: 11px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: all 0.2s;
                    " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                        📋 Copy
                    </button>
                </div>
            </div>
        `;
    };

    // Best config display exactly matching AGCopilot.js
    UI.getBestConfigDisplayHTML = function() {
        return `
            <div id="best-config-display" style="
                background: rgba(72, 187, 120, 0.1);
                border: 1px solid rgba(72, 187, 120, 0.3);
                border-radius: 6px;
                padding: 16px;
                margin: 16px 20px;
                display: block;
            ">
                <h5 id="best-config-header" style="
                    margin: 0 0 12px 0;
                    font-size: 13px;
                    font-weight: 600;
                    color: #48bb78;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                ">⏳ Optimization Configuration</h5>
                <div id="best-config-stats" style="
                    font-size: 12px;
                    margin-bottom: 12px;
                    color: #e2e8f0;
                "></div>
                <div style="margin-bottom: 12px;">
                    <!-- Main Action Buttons -->
                    <div style="margin-bottom: 12px;">
                        <button id="start-optimization" style="
                            width: 100%;
                            padding: 12px;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            border: none;
                            border-radius: 6px;
                            color: white;
                            font-weight: 600;
                            cursor: pointer;
                            font-size: 14px;
                            transition: all 0.2s;
                            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                        " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(0, 0, 0, 0.15)'" 
                           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0, 0, 0, 0.1)'">
                            🚀 Start Enhanced Optimization
                        </button>
                    </div>
                    
                    <div style="margin-bottom: 12px;">
                        <button id="stop-optimization" style="
                            width: 100%;
                            padding: 10px;
                            background: #e53e3e;
                            border: 1px solid #c53030;
                            border-radius: 6px;
                            color: white;
                            font-weight: 500;
                            cursor: pointer;
                            font-size: 12px;
                            display: none;
                            transition: background 0.2s;
                        " onmouseover="this.style.background='#c53030'" onmouseout="this.style.background='#e53e3e'">
                            ⏹️ Stop Optimization
                        </button>
                    </div>
                    
                    <!-- Secondary Action Buttons Grid -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                        <button id="parameter-discovery" style="
                            padding: 10px;
                            background: linear-gradient(135deg, #9f7aea 0%, #805ad5 100%);
                            border: none;
                            border-radius: 6px;
                            color: white;
                            font-weight: 500;
                            cursor: pointer;
                            font-size: 12px;
                            transition: all 0.2s;
                        " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                            🔬 Parameter Discovery
                        </button>
                        
                        <button id="toggle-rate-limit-btn" style="
                            padding: 10px;
                            background: linear-gradient(135deg, #38b2ac 0%, #319795 100%);
                            border: none;
                            border-radius: 6px;
                            color: white;
                            font-weight: 500;
                            cursor: pointer;
                            font-size: 12px;
                            transition: all 0.2s;
                        " onmouseover="this.style.transform='translateY(-1px)'" 
                           onmouseout="this.style.transform='translateY(0)'"
                           onclick="window.toggleRateLimitingMode && window.toggleRateLimitingMode()"
                           title="Currently using normal rate limiting (20s wait). Click to switch to slower mode.">
                            ⏱️ Normal
                        </button>
                    </div>   
                </div>
            </div>
        `;
    };

    // Create collapsed UI matching AGCopilot.js
    UI.createCollapsedUI = function() {
        const existingCollapsed = document.getElementById('ag-copilot-collapsed-ui');
        if (existingCollapsed) {
            existingCollapsed.remove();
        }

        const collapsedUI = document.createElement('div');
        collapsedUI.id = 'ag-copilot-collapsed-ui';
        collapsedUI.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 65px;
            height: 60px;
            background: #1a2332;
            border: 1px solid #2d3748;
            border-radius: 8px;
            padding: 8px;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            color: #e2e8f0;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            cursor: pointer;
            display: none;
            transition: all 0.3s ease;
        `;
        
        collapsedUI.innerHTML = `
            <div style="
                text-align: center;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            ">
                <div style="
                    width: 8px;
                    height: 8px;
                    background: #48bb78;
                    border-radius: 50%;
                    margin-bottom: 4px;
                    animation: pulse 2s infinite;
                "></div>
                <div style="font-size: 14px; margin-bottom: 2px;">🤖</div>
                <div style="font-size: 9px; font-weight: 600; opacity: 0.9;">AG Copilot</div>
                <div style="font-size: 7px; opacity: 0.7; color: #a0aec0;">Click to expand</div>
            </div>
        `;
        
        collapsedUI.addEventListener('click', () => {
            UI.expandUI();
        });
        
        document.body.appendChild(collapsedUI);
    };

    // Setup tab switching exactly like AGCopilot.js
    UI.setupTabSwitching = function() {
        window.switchTab = function(activeTabId) {
            // Remove active class from all tab buttons
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Remove active class from all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Add active class to the clicked button
            const activeButton = document.getElementById(activeTabId + '-btn');
            if (activeButton) {
                activeButton.classList.add('active');
            }
            
            // Add active class to the corresponding content
            const activeContent = document.getElementById(activeTabId);
            if (activeContent) {
                activeContent.classList.add('active');
            }
        };
    };

    // Setup event handlers
    UI.setupEventHandlers = function() {
        const collapseBtn = document.getElementById('collapse-ui-btn');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', UI.collapseUI);
        }

        const closeBtn = document.getElementById('close-ui-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', UI.closeUI);
        }

        const stopBtn = document.getElementById('stop-optimization');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                window.STOPPED = true;
                console.log('🛑 Optimization stopped by user');
            });
        }

        // Make UI draggable by header
        const header = document.getElementById('ui-header');
        const ui = document.getElementById('ag-copilot-enhanced-ui');
        if (header && ui) {
            UI.makeDraggable(ui, header);
        }
    };

    // ========================================
    // 🔄 UI STATE MANAGEMENT
    // ========================================

    UI.collapseUI = function() {
        const mainUI = document.getElementById('ag-copilot-enhanced-ui');
        const collapsedUI = document.getElementById('ag-copilot-collapsed-ui');
        
        if (mainUI && collapsedUI) {
            mainUI.style.display = 'none';
            collapsedUI.style.display = 'block';
        }
    };

    UI.expandUI = function() {
        const mainUI = document.getElementById('ag-copilot-enhanced-ui');
        const collapsedUI = document.getElementById('ag-copilot-collapsed-ui');
        
        if (mainUI && collapsedUI) {
            mainUI.style.display = 'flex';
            collapsedUI.style.display = 'none';
        }
    };

    UI.closeUI = function() {
        const mainUI = document.getElementById('ag-copilot-enhanced-ui');
        const collapsedUI = document.getElementById('ag-copilot-collapsed-ui');
        
        if (mainUI) mainUI.remove();
        if (collapsedUI) collapsedUI.remove();
        
        if (window.STOPPED !== undefined) {
            window.STOPPED = true;
        }
        
        console.log('🔌 AG Copilot UI closed');
    };

    UI.makeDraggable = function(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        
        handle.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            const newTop = element.offsetTop - pos2;
            const newLeft = element.offsetLeft - pos1;
            
            const maxTop = window.innerHeight - element.offsetHeight;
            const maxLeft = window.innerWidth - element.offsetWidth;
            
            element.style.top = Math.max(0, Math.min(newTop, maxTop)) + "px";
            element.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + "px";
            element.style.right = 'auto';
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    };

    // ========================================
    // 📊 STATUS & PROGRESS UPDATES
    // ========================================

    UI.updateProgress = function(label, percentage, score, testCount, tokens, startTime) {
        const labelEl = document.getElementById('progress-label');
        const percentageEl = document.getElementById('progress-percentage');
        const fillEl = document.getElementById('progress-fill');

        if (labelEl) labelEl.textContent = label;
        if (percentageEl) percentageEl.textContent = `${Math.round(percentage)}%`;
        if (fillEl) {
            fillEl.style.width = `${percentage}%`;
        }

        const statsContainer = document.getElementById('optimization-stats');
        if (statsContainer && testCount !== undefined) {
            const runtime = startTime ? ((Date.now() - startTime) / 1000 / 60).toFixed(1) : 0;
            statsContainer.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 10px; color: #a0aec0;">
                    <div>Tests: ${testCount}</div>
                    <div>Tokens: ${tokens || 0}</div>
                    <div>Runtime: ${runtime}m</div>
                </div>
            `;
        }
    };

    UI.updateStatus = function(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        const statusArea = document.getElementById('status-messages');
        if (statusArea) {
            const timestamp = new Date().toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
            });

            let color = '#e2e8f0';
            let icon = 'ℹ️';

            switch (type) {
                case 'error':
                    color = '#f56565';
                    icon = '❌';
                    break;
                case 'success':
                    color = '#48bb78';
                    icon = '✅';
                    break;
                case 'warning':
                    color = '#ed8936';
                    icon = '⚠️';
                    break;
                case 'progress':
                    color = '#63b3ed';
                    icon = '🔄';
                    break;
            }

            const messageDiv = document.createElement('div');
            messageDiv.style.cssText = `
                color: ${color};
                margin-bottom: 2px;
                word-wrap: break-word;
            `;
            messageDiv.innerHTML = `<span style="opacity: 0.7;">${timestamp}</span> ${icon} ${message}`;

            statusArea.appendChild(messageDiv);
            statusArea.scrollTop = statusArea.scrollHeight;

            while (statusArea.children.length > 50) {
                statusArea.removeChild(statusArea.firstChild);
            }
        }
    };

    UI.updateBestConfigHeader = function(status = 'idle') {
        const header = document.querySelector('#best-config-header');
        if (!header) return;

        const baseTitle = '⏳ Optimization Configuration';
        let statusIcon = '';
        let statusColor = '#48bb78';

        switch (status) {
            case 'running':
                statusIcon = ' 🚀';
                statusColor = '#63b3ed';
                break;
            case 'completed':
                statusIcon = ' ✅';
                statusColor = '#48bb78';
                break;
            case 'error':
                statusIcon = ' ❌';
                statusColor = '#f56565';
                break;
        }

        header.textContent = baseTitle + statusIcon;
        header.style.color = statusColor;
    };

    UI.showNotification = function(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 500;
            z-index: 10001;
            max-width: 300px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;

        let bgColor, textColor, icon;
        switch (type) {
            case 'success':
                bgColor = '#48bb78';
                textColor = 'white';
                icon = '✅';
                break;
            case 'error':
                bgColor = '#f56565';
                textColor = 'white';
                icon = '❌';
                break;
            case 'warning':
                bgColor = '#ed8936';
                textColor = 'white';
                icon = '⚠️';
                break;
            default:
                bgColor = '#63b3ed';
                textColor = 'white';
                icon = 'ℹ️';
        }

        notification.style.background = bgColor;
        notification.style.color = textColor;
        notification.innerHTML = `${icon} ${message}`;

        document.body.appendChild(notification);

        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });

        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    };

    // ========================================
    // � PRESET GENERATION FUNCTIONS
    // ========================================

    // Generate preset dropdown options (requires PRESETS object from main script)
    UI.generatePresetOptions = function() {
        // Check if PRESETS is available globally from AGCopilot.js
        if (typeof window.PRESETS !== 'undefined') {
            let options = '<option value="">-- Select a Preset --</option>';
            
            // Convert PRESETS object to array with keys and sort by priority
            const sortedPresets = Object.entries(window.PRESETS).sort(([keyA, configA], [keyB, configB]) => {
                const priorityA = configA.priority || 999; // Default high priority if not set
                const priorityB = configB.priority || 999;
                return priorityA - priorityB;
            });
            
            let currentCategory = null;
            
            // Add sorted presets with category headers
            sortedPresets.forEach(([presetKey, presetConfig]) => {
                // Add category separator if category changed
                if (presetConfig.category && presetConfig.category !== currentCategory) {
                    currentCategory = presetConfig.category;
                    options += `<optgroup label="── ${currentCategory} ──">`;
                }
                
                const displayName = UI.getPresetDisplayName(presetKey, presetConfig);
                options += `<option value="${presetKey}">${displayName}</option>`;
            });
            
            return options;
        } else {
            // Fallback if PRESETS not available
            return `
                <option value="">-- Select a Preset --</option>
                <option value="default">🔥 High Performance Config</option>
                <option value="conservative">📊 Conservative Config</option>
                <option value="aggressive">🚀 Aggressive Config</option>
            `;
        }
    };

    UI.getPresetDisplayName = function(presetKey, presetConfig) {        
        // Use description if available, otherwise generate from key
        if (presetConfig && presetConfig.description) {
            // Add priority indicator for high priority items
            const priorityIcon = (presetConfig.priority <= 3) ? '🏆 ' : 
                                 (presetConfig.priority <= 5) ? '🔥 ' : 
                                (presetConfig.priority <= 10) ? '⭐ ' : '';
            return `${priorityIcon}${presetConfig.description}`;
        }
        
        // Fallback to original naming logic
        let displayName = presetKey
            .replace(/([A-Z])/g, ' $1') // Add space before capital letters
            .replace(/([0-9]+)/g, ' $1') // Add space before numbers
            .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
            .trim();
            
        return displayName;
    };

    // ========================================
    // �🌐 GLOBAL EXPORTS
    // ========================================

    if (typeof window !== 'undefined') {
        window.UIManager = UI;
        
        // Backward compatibility functions
        window.updateProgress = UI.updateProgress;
        window.updateStatus = UI.updateStatus;
        window.updateBestConfigHeader = UI.updateBestConfigHeader;
        window.collapseUI = UI.collapseUI;
        window.expandUI = UI.expandUI;
    }

    console.log('✅ UIManager module loaded with AGCopilot parity');

})(window && window.AGUtils);
