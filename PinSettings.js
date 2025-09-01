// PinSettings.js - extracted Pin Settings feature for AGCopilot
(function(AGUtils){
    // Initialize global pinned settings state
    if (!window.pinnedSettings) {
        window.pinnedSettings = {
            enabled: false,
            settings: {},
            timeout: 10000
        };
    }

    // Show pin settings dialog
    function showPinSettingsDialog(currentConfig, callback) {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'pin-settings-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 20000;
            display: flex;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(4px);
        `;

        // Create dialog
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: #1a2332;
            border: 1px solid #2d3748;
            border-radius: 12px;
            padding: 20px;
            min-width: 500px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            color: #e2e8f0;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        `;

        // Flatten config for easier processing
        const flatConfig = {};
        Object.values(currentConfig).forEach(section => {
            if (typeof section === 'object' && section !== null) {
                Object.assign(flatConfig, section);
            }
        });

        // Filter out undefined/empty values and group by category
        const validSettings = {};
        Object.entries(flatConfig).forEach(([key, value]) => {
            const isButtonToggle = (key === 'Description' || key === 'Fresh Deployer' || key === 'Has Buy Signal');
            if (value !== undefined && value !== '' && key !== 'fromDate' && key !== 'toDate') {
                if (isButtonToggle) {
                    // UI may expose toggles as boolean true or string 'Yes'
                    if (value === true || value === 'Yes') {
                        validSettings[key] = value;
                    }
                } else if (value !== null) {
                    validSettings[key] = value;
                }
            }
        });

        console.log('PinSettings: flatConfig keys=', Object.keys(flatConfig));
        console.log('PinSettings: validSettings=', validSettings);

        const settingCategories = {
            'Basic': ['Min MCAP (USD)', 'Max MCAP (USD)'],
            'Token Details': ['Min AG Score', 'Min Token Age (sec)', 'Max Token Age (sec)', 'Min Deployer Age (min)'],
            'Wallets': ['Min Unique Wallets', 'Max Unique Wallets', 'Min KYC Wallets', 'Max KYC Wallets', 'Min Holders', 'Max Holders', 'Holders Growth %', 'Holders Growth Minutes'],
            'Risk': ['Min Bundled %', 'Max Bundled %', 'Min Deployer Balance (SOL)', 'Min Buy Ratio %', 'Max Buy Ratio %', 'Min Vol MCAP %', 'Max Vol MCAP %', 'Max Drained %', 'Max Drained Count', 'Description', 'Fresh Deployer'],
            'Advanced': ['Min TTC (sec)', 'Max TTC (sec)', 'Max Liquidity %', 'Min Win Pred %', 'Has Buy Signal'],
            'Take Profits': Object.keys(validSettings).filter(k => /TP \d+ % (Gain|Sell)/.test(k))
        };

        let dialogHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #f7fafc; display: flex; align-items: center; gap: 8px;">
                    📌 Pin Settings for Optimization
                </h3>
                <div id="pin-countdown" style="
                    font-size: 14px;
                    font-weight: 600;
                    color: #ffd700;
                    background: rgba(255, 215, 0, 0.1);
                    padding: 6px 12px;
                    border-radius: 20px;
                    border: 1px solid rgba(255, 215, 0, 0.3);
                ">10s</div>
            </div>
            
            <div style="
                background: rgba(59, 130, 246, 0.1);
                border: 1px solid rgba(59, 130, 246, 0.3);
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 16px;
                font-size: 13px;
                line-height: 1.5;
            ">
                💡 <strong>Pin Settings:</strong> Select settings to keep <strong>constant</strong> during optimization. 
                Pinned settings will never change, while unpinned settings will be optimized normally.
            </div>

            <div style="
                font-size: 12px;
                color: #a0aec0;
                margin-bottom: 16px;
                text-align: center;
            ">
                Found ${Object.keys(validSettings).length} configured settings
            </div>
        `;

        Object.entries(settingCategories).forEach(([categoryName, categorySettings]) => {
            const categoryValidSettings = categorySettings.filter(setting => validSettings.hasOwnProperty(setting));
            if (categoryValidSettings.length > 0) {
                dialogHTML += `
                    <div style="margin-bottom: 16px;">
                        <h4 style="
                            margin: 0 0 8px 0;
                            font-size: 13px;
                            font-weight: 600;
                            color: #63b3ed;
                            border-bottom: 1px solid #2d3748;
                            padding-bottom: 4px;
                        ">${categoryName}</h4>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                `;

                categoryValidSettings.forEach(setting => {
                    const value = validSettings[setting];
                    const displayValue = (value === null)
                        ? "Don't care"
                        : (typeof value === 'boolean' 
                            ? (value ? 'Yes' : "Don't care") 
                            : (typeof value === 'number' ? value.toLocaleString() : value));

                    dialogHTML += `
                        <label style="
                            display: flex;
                            align-items: center;
                            cursor: pointer;
                            font-size: 11px;
                            color: #e2e8f0;
                            padding: 6px 8px;
                            border-radius: 4px;
                            transition: background 0.2s;
                            background: rgba(255, 255, 255, 0.02);
                            border: 1px solid rgba(255, 255, 255, 0.1);
                        ">
                            <input type="checkbox" class="pin-setting-checkbox" data-setting="${setting}" style="
                                margin-right: 8px;
                                transform: scale(0.9);
                                accent-color: #ffd700;
                            ">
                            <div>
                                <div style="font-weight: 500; color: #f7fafc;">${setting}</div>
                                <div style="font-size: 10px; color: #a0aec0; margin-top: 2px;">Current: ${displayValue}</div>
                            </div>
                        </label>
                    `;
                });

                dialogHTML += `
                        </div>
                    </div>
                `;
            }
        });

        dialogHTML += `
            <div style="
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 12px;
                margin-top: 20px;
                padding-top: 16px;
                border-top: 1px solid #2d3748;
            ">
                <button id="pin-select-all" style="
                    padding: 10px;
                    background: rgba(99, 179, 237, 0.2);
                    border: 1px solid rgba(99, 179, 237, 0.4);
                    border-radius: 6px;
                    color: #63b3ed;
                    font-size: 12px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                ">
                    ✅ Select All
                </button>
                
                <button id="pin-cancel" style="
                    padding: 10px;
                    background: rgba(237, 100, 166, 0.2);
                    border: 1px solid rgba(237, 100, 166, 0.4);
                    border-radius: 6px;
                    color: #ed64a6;
                    font-size: 12px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                ">
                    ❌ Cancel
                </button>
                
                <button id="pin-ok" style="
                    padding: 10px;
                    background: rgba(72, 187, 120, 0.2);
                    border: 1px solid rgba(72, 187, 120, 0.4);
                    border-radius: 6px;
                    color: #48bb78;
                    font-size: 12px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                ">
                    📌 Pin & Continue
                </button>
            </div>
        `;

        dialog.innerHTML = dialogHTML;
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Countdown timer (guarded)
        let remainingSeconds = 10;
        const countdownElement = dialog.querySelector('#pin-countdown');
        let countdownInterval = null;
        let fallbackTimeout = null;
        if (countdownElement) {
            countdownInterval = setInterval(() => {
                remainingSeconds--;
                if (remainingSeconds > 0) {
                    try { countdownElement.textContent = `${remainingSeconds}s`; } catch (e) {}
                    if (remainingSeconds <= 3) {
                        countdownElement.style.color = '#ff6b6b';
                        countdownElement.style.background = 'rgba(255, 107, 107, 0.1)';
                        countdownElement.style.borderColor = 'rgba(255, 107, 107, 0.3)';
                    }
                } else {
                    clearInterval(countdownInterval);
                    // Timeout - proceed with default optimization (no pins)
                    cleanup();
                    callback({ pinned: false, settings: {} });
                }
            }, 1000);
        } else {
            // If countdown element isn't present for any reason, fallback to a timeout
            console.warn('PinSettings: countdown element not found, using fallback timeout');
            fallbackTimeout = setTimeout(() => {
                cleanup();
                callback({ pinned: false, settings: {} });
            }, remainingSeconds * 1000);
        }

        function cleanup() {
            if (countdownInterval) clearInterval(countdownInterval);
            if (fallbackTimeout) clearTimeout(fallbackTimeout);
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
        }

        function getPinnedSettings() {
            const checkboxes = dialog.querySelectorAll('.pin-setting-checkbox:checked');
            const pinnedSettings = {};
            checkboxes.forEach(checkbox => {
                const setting = checkbox.getAttribute('data-setting');
                pinnedSettings[setting] = validSettings[setting];
            });
            return pinnedSettings;
        }

        // Select All button
        const selectAllBtn = dialog.querySelector('#pin-select-all');
        if (selectAllBtn) {
            selectAllBtn.onclick = () => {
                const checkboxes = dialog.querySelectorAll('.pin-setting-checkbox');
                const allChecked = Array.from(checkboxes).every(cb => cb.checked);
                checkboxes.forEach(cb => cb.checked = !allChecked);
                selectAllBtn.textContent = allChecked ? '✅ Select All' : '❌ Clear All';
            };
        } else {
            console.warn('PinSettings: select-all button not found');
        }

        // Cancel button
        const cancelBtn = dialog.querySelector('#pin-cancel');
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                cleanup();
                callback({ cancelled: true, pinned: false, settings: {} });
            };
        } else {
            console.warn('PinSettings: cancel button not found');
        }

        // OK button
        const okBtn = dialog.querySelector('#pin-ok');
        if (okBtn) {
            okBtn.onclick = () => {
                const pinnedSettings = getPinnedSettings();
                cleanup();
                if (Object.keys(pinnedSettings).length > 0) {
                    callback({ pinned: true, settings: pinnedSettings });
                } else {
                    callback({ pinned: false, settings: {} });
                }
            };
        } else {
            console.warn('PinSettings: ok button not found');
        }

        // ESC key handler
        function handleKeyPress(e) {
            if (e.key === 'Escape') {
                cleanup();
                document.removeEventListener('keydown', handleKeyPress);
                callback({ pinned: false, settings: {} });
            }
        }
        document.addEventListener('keydown', handleKeyPress);

        console.log(`📌 Pin Settings Dialog shown with ${Object.keys(validSettings).length} settings available for pinning`);
    }

    // Apply pinned settings constraint during optimization
    function applyPinnedSettingsConstraint(testConfig, pinnedSettings) {
        if (!pinnedSettings || Object.keys(pinnedSettings).length === 0) {
            return testConfig; // No pinned settings, return config unchanged
        }

    const deepClone = (AGUtils && AGUtils.deepClone) ? AGUtils.deepClone : (window.deepClone || (o=>JSON.parse(JSON.stringify(o))));
    const constrainedConfig = deepClone(testConfig);
        
        // Apply pinned settings to each section
        Object.entries(constrainedConfig).forEach(([sectionKey, sectionData]) => {
            if (typeof sectionData === 'object' && sectionData !== null) {
                Object.entries(pinnedSettings).forEach(([pinnedKey, pinnedValue]) => {
                    if (sectionData.hasOwnProperty(pinnedKey)) {
                        if ((pinnedKey === 'Description' || pinnedKey === 'Fresh Deployer' || pinnedKey === 'Has Buy Signal')) {
                            let normalized = null;
                            if (pinnedValue === true || pinnedValue === 'Yes') normalized = true;
                            sectionData[pinnedKey] = normalized;
                        } else {
                            sectionData[pinnedKey] = pinnedValue;
                        }
                    }
                });
            }
        });

        return constrainedConfig;
    }

    // Update results display to show pinned settings
    function updateResultsWithPinnedSettings(pinnedSettings) {
        if (!pinnedSettings || Object.keys(pinnedSettings).length === 0) return;

        const resultsDiv = document.getElementById('best-config-stats');
        if (resultsDiv) {
            const pinnedCount = Object.keys(pinnedSettings).length;
            const pinnedInfo = document.createElement('div');
            pinnedInfo.style.cssText = `
                margin-top: 8px;
                padding: 8px;
                background: rgba(255, 215, 0, 0.1);
                border: 1px solid rgba(255, 215, 0, 0.3);
                border-radius: 4px;
                font-size: 10px;
                color: #ffd700;
            `;
            
            pinnedInfo.innerHTML = `
                📌 <strong>${pinnedCount} Settings Pinned:</strong><br>
                ${Object.entries(pinnedSettings).map(([key, value]) => 
                    `• ${key}: ${typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}`
                ).join('<br>')}
            `;

            const firstButton = resultsDiv.querySelector('button');
            if (firstButton) {
                resultsDiv.insertBefore(pinnedInfo, firstButton);
            } else {
                resultsDiv.appendChild(pinnedInfo);
            }
        }
    }

    // Expose API
    window.PinSettings = {
        showPinSettingsDialog,
        applyPinnedSettingsConstraint,
        updateResultsWithPinnedSettings
    };

    console.log('PinSettings module loaded and window.PinSettings registered');
})(window.AGUtils || {});
