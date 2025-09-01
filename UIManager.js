// UIManager.js
// User Interface management extracted from AGCopilot.js
// Handles UI creation, updates, and interactions

(function(AGUtils) {
    'use strict';

    const UI = {};
    const AG = AGUtils || (window && window.AGUtils) || {};

    // ========================================
    // 🎨 UI CREATION & MANAGEMENT
    // ========================================

    // Create main UI container
    UI.createMainInterface = function(options = {}) {
        const {
            containerId = 'ag-copilot-container',
            position = 'right',
            width = '420px',
            title = '🤖 AG Copilot v3.0'
        } = options;

        // Remove existing container if present
        const existing = document.getElementById(containerId);
        if (existing) existing.remove();

        const container = document.createElement('div');
        container.id = containerId;
        container.style.cssText = `
            position: fixed;
            top: 10px;
            ${position}: 10px;
            width: ${width};
            max-height: 90vh;
            background: linear-gradient(135deg, #1a2332 0%, #2d3748 100%);
            border: 1px solid #4a5568;
            border-radius: 12px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            font-size: 11px;
            color: #e2e8f0;
            z-index: 10000;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(8px);
            overflow: hidden;
            transition: all 0.3s ease;
        `;

        // Add header
        const header = UI.createHeader(title);
        container.appendChild(header);

        // Add main content area
        const content = UI.createContentArea();
        container.appendChild(content);

        document.body.appendChild(container);
        return container;
    };

    // Create header with title and controls
    UI.createHeader = function(title) {
        const header = document.createElement('div');
        header.style.cssText = `
            background: rgba(0, 0, 0, 0.2);
            padding: 12px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
        `;

        header.innerHTML = `
            <div style="font-weight: 600; font-size: 14px; color: #f7fafc;">${title}</div>
            <div style="display: flex; gap: 8px;">
                <button id="minimize-btn" style="
                    background: rgba(99, 179, 237, 0.2);
                    border: 1px solid rgba(99, 179, 237, 0.3);
                    border-radius: 4px;
                    color: #63b3ed;
                    width: 24px;
                    height: 24px;
                    font-size: 12px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                " title="Minimize">−</button>
                <button id="close-btn" style="
                    background: rgba(237, 100, 166, 0.2);
                    border: 1px solid rgba(237, 100, 166, 0.3);
                    border-radius: 4px;
                    color: #ed64a6;
                    width: 24px;
                    height: 24px;
                    font-size: 12px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                " title="Close">×</button>
            </div>
        `;

        // Add drag functionality
        UI.makeDraggable(header.parentElement || document.getElementById('ag-copilot-container'), header);

        return header;
    };

    // Create main content area
    UI.createContentArea = function() {
        const content = document.createElement('div');
        content.id = 'ag-content-area';
        content.style.cssText = `
            padding: 16px;
            max-height: calc(90vh - 60px);
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: rgba(99, 179, 237, 0.5) transparent;
        `;

        // Add scrollbar styling for webkit browsers
        const style = document.createElement('style');
        style.textContent = `
            #ag-content-area::-webkit-scrollbar {
                width: 6px;
            }
            #ag-content-area::-webkit-scrollbar-track {
                background: transparent;
            }
            #ag-content-area::-webkit-scrollbar-thumb {
                background: rgba(99, 179, 237, 0.5);
                border-radius: 3px;
            }
            #ag-content-area::-webkit-scrollbar-thumb:hover {
                background: rgba(99, 179, 237, 0.7);
            }
        `;
        document.head.appendChild(style);

        return content;
    };

    // Make element draggable
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
            
            // Keep within viewport bounds
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
    // 📊 PROGRESS & STATUS DISPLAYS
    // ========================================

    // Create progress bar
    UI.createProgressBar = function(containerId, label = 'Progress') {
        const container = document.getElementById(containerId);
        if (!container) return null;

        const progressContainer = document.createElement('div');
        progressContainer.innerHTML = `
            <div style="margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span id="progress-label" style="font-size: 11px; font-weight: 500;">${label}</span>
                    <span id="progress-percentage" style="font-size: 10px; color: #a0aec0;">0%</span>
                </div>
                <div style="background: rgba(255, 255, 255, 0.1); border-radius: 10px; height: 8px; overflow: hidden;">
                    <div id="progress-fill" style="
                        width: 0%;
                        height: 100%;
                        background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
                        border-radius: 10px;
                        transition: width 0.3s ease;
                    "></div>
                </div>
            </div>
        `;

        container.appendChild(progressContainer);
        return progressContainer;
    };

    // Update progress bar
    UI.updateProgress = function(label, percentage, score, testCount, tokens, startTime) {
        const labelEl = document.getElementById('progress-label');
        const percentageEl = document.getElementById('progress-percentage');
        const fillEl = document.getElementById('progress-fill');

        if (labelEl) labelEl.textContent = label;
        if (percentageEl) percentageEl.textContent = `${Math.round(percentage)}%`;
        if (fillEl) {
            fillEl.style.width = `${Math.min(100, percentage)}%`;
            
            // Color coding based on progress
            if (percentage >= 80) {
                fillEl.style.background = 'linear-gradient(90deg, #48bb78 0%, #38a169 100%)';
            } else if (percentage >= 50) {
                fillEl.style.background = 'linear-gradient(90deg, #ed8936 0%, #dd6b20 100%)';
            } else {
                fillEl.style.background = 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)';
            }
        }

        // Update additional stats if available
        const statsContainer = document.getElementById('optimization-stats');
        if (statsContainer && testCount !== undefined) {
            const runtime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
            const runtimeMin = Math.floor(runtime / 60);
            const runtimeSec = runtime % 60;
            
            statsContainer.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 10px; color: #a0aec0; margin-top: 8px;">
                    <div>Tests: <span style="color: #4CAF50;">${testCount}</span></div>
                    <div>Best: <span style="color: #4CAF50;">${score}%</span></div>
                    <div>Tokens: <span style="color: #fff;">${tokens}</span></div>
                    <div>Time: <span style="color: #fff;">${runtimeMin}:${runtimeSec.toString().padStart(2, '0')}</span></div>
                </div>
            `;
        }
    };

    // Create status message area
    UI.createStatusArea = function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        const statusArea = document.createElement('div');
        statusArea.id = 'status-messages';
        statusArea.style.cssText = `
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            padding: 8px;
            max-height: 120px;
            overflow-y: auto;
            font-family: 'Courier New', monospace;
            font-size: 9px;
            line-height: 1.3;
            margin-top: 8px;
        `;

        container.appendChild(statusArea);
        return statusArea;
    };

    // Update status with message
    UI.updateStatus = function(message, type = 'info') {
        const statusArea = document.getElementById('status-messages');
        if (!statusArea) return;

        const timestamp = new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });

        let color = '#e2e8f0';
        let icon = 'ℹ️';

        switch (type) {
            case 'success':
                color = '#48bb78';
                icon = '✅';
                break;
            case 'error':
                color = '#f56565';
                icon = '❌';
                break;
            case 'warning':
                color = '#ed8936';
                icon = '⚠️';
                break;
            case 'optimization':
                color = '#4facfe';
                icon = '🔍';
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

        // Limit number of messages
        while (statusArea.children.length > 50) {
            statusArea.removeChild(statusArea.firstChild);
        }
    };

    // ========================================
    // 🎛️ FORM CONTROLS
    // ========================================

    // Create form section
    UI.createFormSection = function(title, content) {
        const section = document.createElement('div');
        section.style.cssText = `
            margin-bottom: 16px;
            padding: 12px;
            background: rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
        `;

        section.innerHTML = `
            <h4 style="
                margin: 0 0 12px 0;
                font-size: 12px;
                font-weight: 600;
                color: #4facfe;
                border-bottom: 1px solid rgba(79, 172, 254, 0.3);
                padding-bottom: 4px;
            ">${title}</h4>
            ${content}
        `;

        return section;
    };

    // Create input field
    UI.createInputField = function(options) {
        const {
            id,
            label,
            type = 'text',
            value = '',
            placeholder = '',
            min,
            max,
            step,
            required = false
        } = options;

        const container = document.createElement('div');
        container.style.cssText = 'margin-bottom: 8px;';

        const labelEl = document.createElement('label');
        labelEl.setAttribute('for', id);
        labelEl.style.cssText = `
            display: block;
            margin-bottom: 4px;
            font-size: 10px;
            font-weight: 500;
            color: #a0aec0;
        `;
        labelEl.textContent = label + (required ? ' *' : '');

        const input = document.createElement('input');
        input.id = id;
        input.type = type;
        input.value = value;
        input.placeholder = placeholder;
        if (min !== undefined) input.min = min;
        if (max !== undefined) input.max = max;
        if (step !== undefined) input.step = step;
        if (required) input.required = true;

        input.style.cssText = `
            width: 100%;
            padding: 6px 8px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            color: #e2e8f0;
            font-size: 11px;
            box-sizing: border-box;
            transition: border-color 0.2s;
        `;

        // Add focus styling
        input.addEventListener('focus', () => {
            input.style.borderColor = '#4facfe';
            input.style.outline = 'none';
        });

        input.addEventListener('blur', () => {
            input.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        });

        container.appendChild(labelEl);
        container.appendChild(input);

        return container;
    };

    // Create button
    UI.createButton = function(options) {
        const {
            id,
            text,
            onClick,
            style = 'primary',
            disabled = false,
            size = 'normal'
        } = options;

        const button = document.createElement('button');
        button.id = id;
        button.textContent = text;
        button.disabled = disabled;
        
        if (onClick) {
            button.addEventListener('click', onClick);
        }

        // Base styles
        let baseStyles = `
            padding: ${size === 'small' ? '4px 8px' : '8px 16px'};
            border-radius: 6px;
            font-size: ${size === 'small' ? '10px' : '11px'};
            font-weight: 500;
            cursor: ${disabled ? 'not-allowed' : 'pointer'};
            transition: all 0.2s;
            border: 1px solid;
            opacity: ${disabled ? '0.5' : '1'};
        `;

        // Style variations
        let colorStyles = '';
        switch (style) {
            case 'primary':
                colorStyles = `
                    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                    border-color: #4facfe;
                    color: #ffffff;
                `;
                break;
            case 'secondary':
                colorStyles = `
                    background: rgba(99, 179, 237, 0.2);
                    border-color: rgba(99, 179, 237, 0.4);
                    color: #63b3ed;
                `;
                break;
            case 'danger':
                colorStyles = `
                    background: rgba(237, 100, 166, 0.2);
                    border-color: rgba(237, 100, 166, 0.4);
                    color: #ed64a6;
                `;
                break;
            case 'success':
                colorStyles = `
                    background: rgba(72, 187, 120, 0.2);
                    border-color: rgba(72, 187, 120, 0.4);
                    color: #48bb78;
                `;
                break;
        }

        button.style.cssText = baseStyles + colorStyles;

        // Hover effects (if not disabled)
        if (!disabled) {
            button.addEventListener('mouseenter', () => {
                switch (style) {
                    case 'primary':
                        button.style.background = 'linear-gradient(135deg, #3182ce 0%, #0bc5ea 100%)';
                        break;
                    default:
                        button.style.background = button.style.background.replace('0.2', '0.3');
                }
            });

            button.addEventListener('mouseleave', () => {
                switch (style) {
                    case 'primary':
                        button.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
                        break;
                    default:
                        button.style.background = button.style.background.replace('0.3', '0.2');
                }
            });
        }

        return button;
    };

    // Create select dropdown
    UI.createSelect = function(options) {
        const { id, label, options: selectOptions, value = '', required = false } = options;

        const container = document.createElement('div');
        container.style.cssText = 'margin-bottom: 8px;';

        const labelEl = document.createElement('label');
        labelEl.setAttribute('for', id);
        labelEl.style.cssText = `
            display: block;
            margin-bottom: 4px;
            font-size: 10px;
            font-weight: 500;
            color: #a0aec0;
        `;
        labelEl.textContent = label + (required ? ' *' : '');

        const select = document.createElement('select');
        select.id = id;
        select.style.cssText = `
            width: 100%;
            padding: 6px 8px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            color: #e2e8f0;
            font-size: 11px;
            box-sizing: border-box;
            cursor: pointer;
        `;

        selectOptions.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.text;
            optionEl.selected = option.value === value;
            select.appendChild(optionEl);
        });

        container.appendChild(labelEl);
        container.appendChild(select);

        return container;
    };

    // ========================================
    // 📱 RESPONSIVE & UTILITY
    // ========================================

    // Update header to show current status
    UI.updateBestConfigHeader = function(status = 'idle') {
        const header = document.querySelector('#ag-copilot-container h3, #ag-copilot-container h4');
        if (!header) return;

        const baseTitle = '🤖 AG Copilot v3.0';
        let statusIcon = '';
        let statusColor = '#f7fafc';

        switch (status) {
            case 'running':
                statusIcon = ' 🔄';
                statusColor = '#4facfe';
                break;
            case 'success':
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

    // Show/hide loading overlay
    UI.showLoadingOverlay = function(message = 'Loading...') {
        const container = document.getElementById('ag-copilot-container');
        if (!container) return;

        let overlay = document.getElementById('ag-loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'ag-loading-overlay';
            overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(26, 35, 50, 0.9);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                border-radius: 12px;
            `;
            container.appendChild(overlay);
        }

        overlay.innerHTML = `
            <div style="
                color: #4facfe;
                font-size: 14px;
                font-weight: 500;
                margin-bottom: 16px;
                text-align: center;
            ">${message}</div>
            <div style="
                width: 40px;
                height: 40px;
                border: 3px solid rgba(79, 172, 254, 0.3);
                border-top: 3px solid #4facfe;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            "></div>
        `;

        // Add CSS animation
        if (!document.getElementById('ag-spinner-style')) {
            const style = document.createElement('style');
            style.id = 'ag-spinner-style';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        overlay.style.display = 'flex';
    };

    // Hide loading overlay
    UI.hideLoadingOverlay = function() {
        const overlay = document.getElementById('ag-loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    };

    // Make interface responsive
    UI.makeResponsive = function() {
        const container = document.getElementById('ag-copilot-container');
        if (!container) return;

        function updateLayout() {
            const viewportWidth = window.innerWidth;
            
            if (viewportWidth < 768) {
                // Mobile layout
                container.style.width = 'calc(100vw - 20px)';
                container.style.left = '10px';
                container.style.right = 'auto';
                container.style.top = '10px';
            } else if (viewportWidth < 1024) {
                // Tablet layout
                container.style.width = '380px';
            } else {
                // Desktop layout
                container.style.width = '420px';
            }
        }

        updateLayout();
        window.addEventListener('resize', updateLayout);
    };

    // ========================================
    // 🔧 UTILITY FUNCTIONS
    // ========================================

    // Animate element
    UI.animateElement = function(element, animation, duration = 300) {
        return new Promise(resolve => {
            element.style.transition = `all ${duration}ms ease`;
            
            switch (animation) {
                case 'fadeIn':
                    element.style.opacity = '0';
                    requestAnimationFrame(() => {
                        element.style.opacity = '1';
                    });
                    break;
                case 'fadeOut':
                    element.style.opacity = '0';
                    break;
                case 'slideUp':
                    element.style.transform = 'translateY(20px)';
                    element.style.opacity = '0';
                    requestAnimationFrame(() => {
                        element.style.transform = 'translateY(0)';
                        element.style.opacity = '1';
                    });
                    break;
            }

            setTimeout(resolve, duration);
        });
    };

    // Show notification
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
                bgColor = 'rgba(72, 187, 120, 0.9)';
                textColor = '#ffffff';
                icon = '✅';
                break;
            case 'error':
                bgColor = 'rgba(245, 101, 101, 0.9)';
                textColor = '#ffffff';
                icon = '❌';
                break;
            case 'warning':
                bgColor = 'rgba(237, 137, 54, 0.9)';
                textColor = '#ffffff';
                icon = '⚠️';
                break;
            default:
                bgColor = 'rgba(79, 172, 254, 0.9)';
                textColor = '#ffffff';
                icon = 'ℹ️';
        }

        notification.style.background = bgColor;
        notification.style.color = textColor;
        notification.innerHTML = `${icon} ${message}`;

        document.body.appendChild(notification);

        // Animate in
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });

        // Auto hide
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    };

    // Expose module
    if (typeof window !== 'undefined') {
        window.UIManager = UI;
        
        // Maintain backward compatibility for key functions
        window.updateProgress = UI.updateProgress;
        window.updateStatus = UI.updateStatus;
        window.updateBestConfigHeader = UI.updateBestConfigHeader;
    }

    console.log('UIManager module loaded');

})(window && window.AGUtils);
