/**
 * @fileoverview Progress tracking and UI feedback utilities
 * @version 1.0.0
 */

import { UI_CONFIG } from './config.js';

/**
 * Progress bar management for long-running operations
 */
export class ProgressBar {
    constructor(containerId = null) {
        this.container = null;
        this.progressBar = null;
        this.statusText = null;
        this.containerId = containerId;
    }
    
    /**
     * Create and display progress bar
     */
    create() {
        if (this.container) {
            this.remove(); // Remove existing if present
        }
        
        this.container = document.createElement('div');
        this.container.id = this.containerId || 'agcopilot-progress-container';
        this.container.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 350px;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            border: 2px solid #4CAF50;
            border-radius: 10px;
            padding: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: ${UI_CONFIG.MODAL_Z_INDEX};
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: white;
        `;
        
        // Title
        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
            text-align: center;
        `;
        title.textContent = '🤖 AG Copilot Optimization';
        
        // Status text
        this.statusText = document.createElement('div');
        this.statusText.style.cssText = `
            font-size: 12px;
            margin-bottom: 8px;
            min-height: 16px;
        `;
        this.statusText.textContent = 'Initializing...';
        
        // Progress bar background
        const progressBg = document.createElement('div');
        progressBg.style.cssText = `
            width: 100%;
            height: ${UI_CONFIG.PROGRESS_BAR_HEIGHT};
            background-color: ${UI_CONFIG.PROGRESS_BAR_COLORS.background};
            border-radius: 2px;
            margin-bottom: 8px;
            overflow: hidden;
        `;
        
        // Progress bar fill
        this.progressBar = document.createElement('div');
        this.progressBar.style.cssText = `
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, #4CAF50, #45a049);
            transition: width 0.3s ease;
            border-radius: 2px;
        `;
        
        progressBg.appendChild(this.progressBar);
        
        // Stats container
        const statsContainer = document.createElement('div');
        statsContainer.style.cssText = `
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            opacity: 0.8;
        `;
        
        this.bestScoreSpan = document.createElement('span');
        this.testsSpan = document.createElement('span');
        this.tokensSpan = document.createElement('span');
        this.timeSpan = document.createElement('span');
        
        statsContainer.appendChild(this.bestScoreSpan);
        statsContainer.appendChild(this.testsSpan);
        statsContainer.appendChild(this.tokensSpan);
        statsContainer.appendChild(this.timeSpan);
        
        // Assemble components
        this.container.appendChild(title);
        this.container.appendChild(this.statusText);
        this.container.appendChild(progressBg);
        this.container.appendChild(statsContainer);
        
        document.body.appendChild(this.container);
        
        console.log('📊 Progress bar created');
    }
    
    /**
     * Update progress bar with current status
     */
    update(status, progress, bestScore, tests, tokens, startTime = null) {
        if (!this.container) {
            console.warn('Progress bar not initialized');
            return;
        }
        
        // Update status text
        this.statusText.textContent = status;
        
        // Update progress bar
        this.progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
        
        // Update stats
        if (this.bestScoreSpan) {
            this.bestScoreSpan.textContent = `Best: ${bestScore ? bestScore.toFixed(1) : '0.0'}%`;
        }
        
        if (this.testsSpan) {
            this.testsSpan.textContent = `Tests: ${tests || 0}`;
        }
        
        if (this.tokensSpan) {
            this.tokensSpan.textContent = `Tokens: ${tokens || 0}`;
        }
        
        if (this.timeSpan && startTime) {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            this.timeSpan.textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    /**
     * Remove progress bar from DOM
     */
    remove() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
            this.container = null;
            this.progressBar = null;
            this.statusText = null;
            console.log('📊 Progress bar removed');
        }
    }
    
    /**
     * Update just the status text (lightweight update)
     */
    updateStatus(status) {
        if (this.statusText) {
            this.statusText.textContent = status;
        }
    }
    
    /**
     * Update just the progress percentage
     */
    updateProgress(progress) {
        if (this.progressBar) {
            this.progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
        }
    }
}

/**
 * Status notification system
 */
export class StatusNotifier {
    constructor() {
        this.container = null;
        this.notifications = new Map();
    }
    
    /**
     * Show a temporary status message
     */
    show(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        const id = Date.now().toString();
        
        // Style based on type
        const colors = {
            success: { bg: '#4CAF50', border: '#45a049' },
            error: { bg: '#f44336', border: '#d32f2f' },
            warning: { bg: '#ff9800', border: '#f57c00' },
            info: { bg: '#2196F3', border: '#1976D2' }
        };
        
        const color = colors[type] || colors.info;
        
        notification.style.cssText = `
            position: fixed;
            top: 70px;
            right: 10px;
            background: ${color.bg};
            border: 2px solid ${color.border};
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            z-index: ${UI_CONFIG.MODAL_Z_INDEX + 1};
            max-width: 300px;
            word-wrap: break-word;
            animation: slideIn 0.3s ease-out;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        this.notifications.set(id, notification);
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.remove(id);
            }, duration);
        }
        
        return id;
    }
    
    /**
     * Remove a specific notification
     */
    remove(id) {
        const notification = this.notifications.get(id);
        if (notification && notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.notifications.delete(id);
            }, 300);
        }
    }
    
    /**
     * Clear all notifications
     */
    clear() {
        this.notifications.forEach((notification, id) => {
            this.remove(id);
        });
    }
    
    /**
     * Show success message
     */
    success(message, duration = 3000) {
        return this.show(message, 'success', duration);
    }
    
    /**
     * Show error message
     */
    error(message, duration = 5000) {
        return this.show(message, 'error', duration);
    }
    
    /**
     * Show warning message
     */
    warning(message, duration = 4000) {
        return this.show(message, 'warning', duration);
    }
    
    /**
     * Show info message
     */
    info(message, duration = 3000) {
        return this.show(message, 'info', duration);
    }
}

/**
 * Simple loading spinner component
 */
export class LoadingSpinner {
    constructor(containerId = null) {
        this.container = null;
        this.containerId = containerId;
    }
    
    /**
     * Show loading spinner
     */
    show(message = 'Loading...') {
        if (this.container) {
            this.hide();
        }
        
        this.container = document.createElement('div');
        this.container.id = this.containerId || 'agcopilot-loading-spinner';
        this.container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            z-index: ${UI_CONFIG.MODAL_Z_INDEX + 2};
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;
        
        // Spinner animation
        const spinner = document.createElement('div');
        spinner.style.cssText = `
            border: 3px solid #f3f3f3;
            border-top: 3px solid #4CAF50;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px auto;
        `;
        
        const messageEl = document.createElement('div');
        messageEl.textContent = message;
        messageEl.style.fontSize = '14px';
        
        this.container.appendChild(spinner);
        this.container.appendChild(messageEl);
        document.body.appendChild(this.container);
        
        // Add CSS animation if not already present
        if (!document.getElementById('spinner-styles')) {
            const style = document.createElement('style');
            style.id = 'spinner-styles';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    /**
     * Hide loading spinner
     */
    hide() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
            this.container = null;
        }
    }
}

// Global instances for easy access
export const globalProgressBar = new ProgressBar('global-agcopilot-progress');
export const globalNotifier = new StatusNotifier();
export const globalSpinner = new LoadingSpinner('global-agcopilot-spinner');