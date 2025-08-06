/**
 * AGCopilot-UI.js - User Interface Module
 * 
 * Contains all UI creation, event handling, and display logic
 * for the AGCopilot optimization system.
 */

// ========================================
// 🎨 UI CREATION FUNCTIONS
// ========================================

// Create the main optimization panel UI
function createUI(namespace) {
    // Remove existing UI if present
    const existingPanel = document.getElementById('ag-copilot-panel');
    if (existingPanel) {
        existingPanel.remove();
    }

    const panel = document.createElement('div');
    panel.id = 'ag-copilot-panel';
    panel.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #1e3c72, #2a5298);
            color: white;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: 'Segoe UI', Arial, sans-serif;
            width: 400px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #ffd700; font-size: 18px; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
                    🤖 AG Copilot v3.0
                </h3>
                <button id="close-panel" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 5px;
                    border-radius: 50%;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">×</button>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #e0e8ff;">
                    🎯 Signal Mode:
                </label>
                <select id="trigger-mode-select" style="
                    width: 100%;
                    padding: 8px;
                    border-radius: 8px;
                    border: 1px solid #4a5568;
                    background: #2d3748;
                    color: white;
                    font-size: 14px;
                ">
                    <option value="">Auto-detect from current page</option>
                    <option value="4">🚀 Launchpads</option>
                    <option value="5">⚡ Fast Track</option>
                    <option value="1">🌱 New Launches</option>
                    <option value="2">📈 Trending</option>
                    <option value="3">🔥 Gainers</option>
                    <option value="6">💎 All-Time Best</option>
                </select>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                <button id="quick-optimize" style="
                    background: linear-gradient(45deg, #4CAF50, #45a049);
                    color: white;
                    border: none;
                    padding: 12px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                ">🚀 Quick Optimize</button>
                
                <button id="deep-optimize" style="
                    background: linear-gradient(45deg, #2196F3, #1976D2);
                    color: white;
                    border: none;
                    padding: 12px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                ">🔬 Deep Optimize</button>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                <button id="genetic-optimize" style="
                    background: linear-gradient(45deg, #9C27B0, #7B1FA2);
                    color: white;
                    border: none;
                    padding: 12px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                ">🧬 Genetic</button>
                
                <button id="manual-scan" style="
                    background: linear-gradient(45deg, #FF9800, #F57C00);
                    color: white;
                    border: none;
                    padding: 12px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                ">🔍 Manual Scan</button>
            </div>

            <div style="margin-bottom: 15px;">
                <button id="show-presets" style="
                    background: linear-gradient(45deg, #795548, #5D4037);
                    color: white;
                    border: none;
                    padding: 10px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    width: 100%;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                ">📋 Load Presets</button>
            </div>

            <div id="status-display" style="
                background: rgba(0,0,0,0.3);
                padding: 10px;
                border-radius: 8px;
                font-size: 12px;
                line-height: 1.4;
                border: 1px solid rgba(255,255,255,0.1);
                min-height: 60px;
                overflow-y: auto;
                max-height: 200px;
            ">
                <div style="color: #4CAF50;">✅ AG Copilot Ready</div>
                <div style="color: #81C784;">🔧 Select optimization type and click to start</div>
            </div>

            <div id="results-summary" style="
                margin-top: 10px;
                padding: 10px;
                background: rgba(0,0,0,0.2);
                border-radius: 8px;
                display: none;
                border: 1px solid rgba(255,255,255,0.1);
            ">
                <div style="font-weight: bold; color: #ffd700; margin-bottom: 5px;">📊 Results Summary</div>
                <div id="summary-content" style="font-size: 12px; line-height: 1.3;"></div>
            </div>
        </div>
    `;

    document.body.appendChild(panel);
    return panel;
}

// Create preset selection modal
function createPresetModal(namespace) {
    const modal = document.createElement('div');
    modal.id = 'preset-modal';
    modal.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(5px);
        ">
            <div style="
                background: linear-gradient(135deg, #1e3c72, #2a5298);
                color: white;
                padding: 30px;
                border-radius: 15px;
                width: 500px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 40px rgba(0,0,0,0.5);
                border: 1px solid rgba(255,255,255,0.1);
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: #ffd700; font-size: 20px;">📋 Configuration Presets</h3>
                    <button id="close-preset-modal" style="
                        background: none;
                        border: none;
                        color: white;
                        font-size: 24px;
                        cursor: pointer;
                        padding: 5px;
                        border-radius: 50%;
                        width: 35px;
                        height: 35px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">×</button>
                </div>
                
                <div id="preset-list" style="
                    display: grid;
                    gap: 15px;
                    max-height: 60vh;
                    overflow-y: auto;
                    padding-right: 10px;
                "></div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    return modal;
}

// ========================================
// 📊 STATUS AND DISPLAY FUNCTIONS
// ========================================

// Update status display with formatted message
function updateStatus(message, type = 'info') {
    const statusDisplay = document.getElementById('status-display');
    if (!statusDisplay) return;

    const colors = {
        info: '#81C784',
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#f44336',
        progress: '#2196F3'
    };

    const icons = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        error: '❌',
        progress: '⏳'
    };

    const timestamp = new Date().toLocaleTimeString();
    const statusEntry = document.createElement('div');
    statusEntry.style.color = colors[type] || colors.info;
    statusEntry.style.marginBottom = '3px';
    statusEntry.innerHTML = `<span style="opacity: 0.7;">[${timestamp}]</span> ${icons[type] || icons.info} ${message}`;

    statusDisplay.appendChild(statusEntry);
    statusDisplay.scrollTop = statusDisplay.scrollHeight;

    // Limit to last 100 entries to prevent memory issues
    const entries = statusDisplay.children;
    if (entries.length > 100) {
        statusDisplay.removeChild(entries[0]);
    }
}

// Clear status display
function clearStatus() {
    const statusDisplay = document.getElementById('status-display');
    if (statusDisplay) {
        statusDisplay.innerHTML = `
            <div style="color: #4CAF50;">✅ AG Copilot Ready</div>
            <div style="color: #81C784;">🔧 Select optimization type and click to start</div>
        `;
    }
}

// Update results summary display
function updateResultsSummary(results) {
    const resultsDiv = document.getElementById('results-summary');
    const summaryContent = document.getElementById('summary-content');
    
    if (!resultsDiv || !summaryContent) return;

    if (!results || Object.keys(results).length === 0) {
        resultsDiv.style.display = 'none';
        return;
    }

    let summaryHTML = '';

    if (results.bestConfig) {
        summaryHTML += `<div style="color: #4CAF50; font-weight: bold;">🏆 Best Configuration Found</div>`;
        summaryHTML += `<div>Score: ${results.bestScore ? results.bestScore.toFixed(2) : 'N/A'}</div>`;
    }

    if (results.totalTests) {
        summaryHTML += `<div>Tests Run: ${results.totalTests}</div>`;
    }

    if (results.duration) {
        summaryHTML += `<div>Duration: ${Math.round(results.duration / 1000)}s</div>`;
    }

    if (results.improvements) {
        summaryHTML += `<div style="color: #81C784;">📈 ${results.improvements} improvements found</div>`;
    }

    summaryContent.innerHTML = summaryHTML;
    resultsDiv.style.display = 'block';
}

// ========================================
// 🎮 EVENT HANDLERS
// ========================================

// Setup all event handlers for the UI
function setupEventHandlers(namespace) {
    // Close panel handler
    const closeButton = document.getElementById('close-panel');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            const panel = document.getElementById('ag-copilot-panel');
            if (panel) panel.remove();
        });
    }

    // Quick optimize handler
    const quickOptimizeButton = document.getElementById('quick-optimize');
    if (quickOptimizeButton) {
        quickOptimizeButton.addEventListener('click', async () => {
            if (namespace.optimization && namespace.optimization.runQuickOptimization) {
                try {
                    updateStatus('Starting Quick Optimization...', 'progress');
                    await namespace.optimization.runQuickOptimization();
                } catch (error) {
                    updateStatus(`Quick optimization failed: ${error.message}`, 'error');
                }
            } else {
                updateStatus('Optimization module not available', 'error');
            }
        });
    }

    // Deep optimize handler
    const deepOptimizeButton = document.getElementById('deep-optimize');
    if (deepOptimizeButton) {
        deepOptimizeButton.addEventListener('click', async () => {
            if (namespace.optimization && namespace.optimization.runDeepOptimization) {
                try {
                    updateStatus('Starting Deep Optimization...', 'progress');
                    await namespace.optimization.runDeepOptimization();
                } catch (error) {
                    updateStatus(`Deep optimization failed: ${error.message}`, 'error');
                }
            } else {
                updateStatus('Optimization module not available', 'error');
            }
        });
    }

    // Genetic optimize handler
    const geneticOptimizeButton = document.getElementById('genetic-optimize');
    if (geneticOptimizeButton) {
        geneticOptimizeButton.addEventListener('click', async () => {
            if (namespace.optimization && namespace.optimization.runGeneticOptimization) {
                try {
                    updateStatus('Starting Genetic Optimization...', 'progress');
                    await namespace.optimization.runGeneticOptimization();
                } catch (error) {
                    updateStatus(`Genetic optimization failed: ${error.message}`, 'error');
                }
            } else {
                updateStatus('Optimization module not available', 'error');
            }
        });
    }

    // Manual scan handler
    const manualScanButton = document.getElementById('manual-scan');
    if (manualScanButton) {
        manualScanButton.addEventListener('click', async () => {
            if (namespace.api && namespace.api.runManualScan) {
                try {
                    updateStatus('Starting Manual Scan...', 'progress');
                    await namespace.api.runManualScan();
                } catch (error) {
                    updateStatus(`Manual scan failed: ${error.message}`, 'error');
                }
            } else {
                updateStatus('API module not available', 'error');
            }
        });
    }

    // Show presets handler
    const showPresetsButton = document.getElementById('show-presets');
    if (showPresetsButton) {
        showPresetsButton.addEventListener('click', () => {
            showPresetModal(namespace);
        });
    }

    // Add hover effects to buttons
    const buttons = document.querySelectorAll('#ag-copilot-panel button');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        });
    });
}

// Show preset selection modal
function showPresetModal(namespace) {
    // Remove existing modal if present
    const existingModal = document.getElementById('preset-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = createPresetModal(namespace);
    const presetList = document.getElementById('preset-list');
    const closeButton = document.getElementById('close-preset-modal');

    // Close modal handler
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            modal.remove();
        });
    }

    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Load presets from config module
    if (namespace.config && namespace.config.PRESETS) {
        const presets = namespace.config.PRESETS;
        
        for (const [presetName, presetConfig] of Object.entries(presets)) {
            const presetButton = document.createElement('button');
            presetButton.style.cssText = `
                background: linear-gradient(45deg, #4CAF50, #45a049);
                color: white;
                border: none;
                padding: 15px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                text-align: left;
                transition: all 0.3s ease;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                width: 100%;
            `;
            
            presetButton.innerHTML = `
                <div style="font-size: 16px; margin-bottom: 5px;">${presetName}</div>
                <div style="font-size: 12px; opacity: 0.8;">${presetConfig.description || 'No description available'}</div>
            `;
            
            presetButton.addEventListener('click', () => {
                loadPreset(presetName, presetConfig, namespace);
                modal.remove();
            });
            
            presetButton.addEventListener('mouseenter', () => {
                presetButton.style.transform = 'translateY(-2px)';
                presetButton.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
            });
            
            presetButton.addEventListener('mouseleave', () => {
                presetButton.style.transform = 'translateY(0)';
                presetButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
            });
            
            presetList.appendChild(presetButton);
        }
    } else {
        presetList.innerHTML = '<div style="text-align: center; opacity: 0.7;">No presets available</div>';
    }
}

// Load a specific preset configuration
function loadPreset(presetName, presetConfig, namespace) {
    try {
        // Update current configuration
        if (namespace.config) {
            namespace.config.current = namespace.utils.deepClone(presetConfig);
        }
        
        updateStatus(`Loaded preset: ${presetName}`, 'success');
        
        // If optimization module is available, apply the configuration
        if (namespace.optimization && namespace.optimization.applyConfiguration) {
            namespace.optimization.applyConfiguration(presetConfig);
        }
        
    } catch (error) {
        updateStatus(`Failed to load preset ${presetName}: ${error.message}`, 'error');
    }
}

// ========================================
// 🔧 MODULE INITIALIZATION
// ========================================
function init(namespace) {
    // Create and setup UI
    const panel = createUI(namespace);
    setupEventHandlers(namespace);
    
    // Store UI functions in namespace
    namespace.ui = {
        createUI,
        createPresetModal,
        updateStatus,
        clearStatus,
        updateResultsSummary,
        setupEventHandlers,
        showPresetModal,
        loadPreset
    };
    
    // Setup global status update function
    window.updateAGStatus = updateStatus;
    
    console.log('✅ UI module initialized');
    return Promise.resolve();
}

// ========================================
// 📤 MODULE EXPORTS
// ========================================
module.exports = {
    createUI,
    createPresetModal,
    updateStatus,
    clearStatus,
    updateResultsSummary,
    setupEventHandlers,
    showPresetModal,
    loadPreset,
    init
};
