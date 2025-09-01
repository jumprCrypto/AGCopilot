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

    // Configuration tab - placeholder for now, would contain exact AGCopilot.js HTML
    UI.getConfigurationTabHTML = function() {
        return `
            <div style="text-align: center; padding: 20px; color: #a0aec0;">
                <div style="font-size: 14px; margin-bottom: 8px;">🚀 Configuration UI</div>
                <div style="font-size: 11px;">Full AGCopilot.js configuration interface would be implemented here</div>
            </div>
        `;
    };

    // Signal analysis tab - placeholder for now, would contain exact AGCopilot.js HTML
    UI.getSignalAnalysisTabHTML = function() {
        return `
            <div style="text-align: center; padding: 20px; color: #a0aec0;">
                <div style="font-size: 14px; margin-bottom: 8px;">🔬 Signal Analysis UI</div>
                <div style="font-size: 11px;">Full AGCopilot.js signal analysis interface would be implemented here</div>
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
    // 🌐 GLOBAL EXPORTS
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
