/**
 * @fileoverview Signal Extractor - Modular implementation for Google Sheets export
 * @version 1.0.0
 */

import { sleep, formatTimestamp, formatMcap, formatPercent, formatSource } from './utils.js';
import { SIGNAL_EXTRACTOR_CONFIG } from './config.js';
import { SignalAPI } from './api.js';
import { globalNotifier, globalSpinner } from './progress.js';

/**
 * Signal Extractor main class
 */
export class SignalExtractor {
    constructor(options = {}) {
        this.config = { ...SIGNAL_EXTRACTOR_CONFIG, ...options };
        this.api = new SignalAPI(this.config.API_BASE_URL, {
            maxRetries: this.config.MAX_RETRIES,
            retryDelay: this.config.RETRY_DELAY,
            requestDelay: this.config.REQUEST_DELAY
        });
        this.extractedData = null;
        this.ui = null;
    }

    /**
     * Initialize and create UI
     */
    async initialize() {
        console.clear();
        console.log('%c🔍 Signal Extractor - Google Sheets Export Tool v2.0 🔍', 'color: blue; font-size: 16px; font-weight: bold;');
        console.log('%c📊 Extract token data optimized for Google Sheets import', 'color: green; font-size: 12px;');

        this.createUI();
        this.setupEventHandlers();
        
        globalNotifier.success('Signal Extractor ready! Enter contract addresses (one per line) to begin.');
        
        console.log('✅ Signal Extractor initialized successfully!');
        console.log('📋 Enter contract addresses (one per line) and click "Extract Data" for batch analysis');
        console.log('🔧 Use Ctrl+Enter to start extraction from the text area');
        console.log('📊 Export formats optimized for Google Sheets: Custom TSV and Full Detailed TSV');
        
        return this;
    }

    /**
     * Create the UI interface
     */
    createUI() {
        // Remove any existing UI
        const existing = document.getElementById('signal-extractor-ui');
        if (existing) {
            existing.remove();
        }

        const ui = document.createElement('div');
        ui.id = 'signal-extractor-ui';
        ui.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 420px;
            max-height: 90vh;
            overflow-y: auto;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            border: 2px solid #4CAF50;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: white;
        `;

        ui.innerHTML = `
            <div style="text-align: center; margin-bottom: 15px;">
                <h3 style="margin: 0; font-size: 18px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                    🔍 Signal Extractor
                </h3>
            </div>
            
            <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 12px;">Contract Addresses:</label>
                    <textarea id="contract-input" placeholder="Enter contract addresses (one per line)..." 
                           style="width: 100%; padding: 6px; border: none; border-radius: 5px; font-size: 12px; height: 70px; resize: vertical;">
                    </textarea>
                </div>
            </div>
            
            <div style="display: flex; gap: 15px; margin-bottom: 10px; align-items: center;">
                <label style="display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" id="remove-headers" checked style="margin-right: 6px;">
                    <span style="font-size: 11px; font-weight: bold;">Remove Headers</span>
                </label>
                <div style="flex: 1; display: flex; gap: 8px;">
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 2px; font-size: 10px; font-weight: bold;">Signals/Token:</label>
                        <input type="number" id="signals-per-token" value="3" min="1" max="999" 
                               style="width: 100%; padding: 4px; border: none; border-radius: 3px; font-size: 11px;">
                    </div>
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 2px; font-size: 10px; font-weight: bold;">Max Tokens:</label>
                        <input type="number" id="max-tokens" value="50" min="1" max="999" 
                               style="width: 100%; padding: 4px; border: none; border-radius: 3px; font-size: 11px;">
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 11px; font-weight: bold;">Trigger Modes:</label>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <label style="display: flex; align-items: center; cursor: pointer; font-size: 10px;">
                        <input type="checkbox" class="trigger-mode" value="pump" checked style="margin-right: 4px;">
                        <span>Pump.fun</span>
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer; font-size: 10px;">
                        <input type="checkbox" class="trigger-mode" value="photon" checked style="margin-right: 4px;">
                        <span>Photon</span>
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer; font-size: 10px;">
                        <input type="checkbox" class="trigger-mode" value="jup" checked style="margin-right: 4px;">
                        <span>Jupiter</span>
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer; font-size: 10px;">
                        <input type="checkbox" class="trigger-mode" value="raydium" style="margin-right: 4px;">
                        <span>Raydium</span>
                    </label>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <button id="extract-btn" style="flex: 1; padding: 8px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 12px;">
                    🔍 Extract Data
                </button>
                <button id="close-btn" style="padding: 8px 12px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;">
                    ✖
                </button>
            </div>
            
            <div id="action-buttons" style="display: none; gap: 8px; margin-bottom: 10px;">
                <button id="copy-custom-tsv-btn" style="flex: 1; padding: 6px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 10px;">
                    📋 Copy Custom TSV
                </button>
                <button id="copy-detailed-csv-btn" style="flex: 1; padding: 6px; background: #9C27B0; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 10px;">
                    📊 Copy Detailed TSV
                </button>
            </div>
            
            <div id="status-area" style="font-size: 11px; line-height: 1.4; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 5px; max-height: 150px; overflow-y: auto;">
                Signal Extractor ready! Enter contract addresses (one per line) to begin.
            </div>
        `;

        document.body.appendChild(ui);
        this.ui = ui;
    }

    /**
     * Setup event handlers for UI interaction
     */
    setupEventHandlers() {
        document.getElementById('extract-btn').addEventListener('click', async () => {
            const contractAddresses = document.getElementById('contract-input').value.trim();
            if (!contractAddresses) {
                this.updateStatus('Please enter at least one contract address', true);
                return;
            }
            
            // Clear previous results
            document.getElementById('action-buttons').style.display = 'none';
            document.getElementById('status-area').innerHTML = '';
            
            await this.extractTokenData(contractAddresses);
        });
        
        document.getElementById('copy-custom-tsv-btn').addEventListener('click', async () => {
            if (this.extractedData) {
                const removeHeaders = document.getElementById('remove-headers').checked;
                const tsvOutput = this.generateCustomTSV(this.extractedData.results, removeHeaders);
                const success = await this.copyToClipboard(tsvOutput);
                this.updateStatus(success ? `📋 Custom format TSV copied${removeHeaders ? ' (no headers)' : ' (with headers)'}! Paste into Google Sheets` : 'Failed to copy to clipboard', !success);
            }
        });
        
        document.getElementById('copy-detailed-csv-btn').addEventListener('click', async () => {
            if (this.extractedData) {
                const removeHeaders = document.getElementById('remove-headers').checked;
                const csvOutput = this.generateDetailedTSV(this.extractedData.results, removeHeaders);
                const success = await this.copyToClipboard(csvOutput);
                this.updateStatus(success ? `📊 Custom format TSV copied${removeHeaders ? ' (no headers)' : ' (with headers)'}! Paste into Google Sheets` : 'Failed to copy to clipboard', !success);
            }
        });
                
        document.getElementById('close-btn').addEventListener('click', () => {
            document.getElementById('signal-extractor-ui').remove();
        });
        
        // Allow Ctrl+Enter to trigger extraction (since Enter is used for new lines)
        document.getElementById('contract-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                document.getElementById('extract-btn').click();
            }
        });
    }

    /**
     * Extract token data from contract addresses
     */
    async extractTokenData(contractAddresses) {
        const addresses = contractAddresses.split('\n')
            .map(addr => addr.trim())
            .filter(addr => addr.length > 0)
            .slice(0, parseInt(document.getElementById('max-tokens').value) || 50);

        if (addresses.length === 0) {
            this.updateStatus('No valid contract addresses found', true);
            return;
        }

        try {
            globalSpinner.show(`Extracting data for ${addresses.length} tokens...`);
            this.updateStatus(`🔍 Starting extraction for ${addresses.length} contracts...`);
            
            const signalsPerToken = parseInt(document.getElementById('signals-per-token').value) || 3;
            const triggerModes = this.getSelectedTriggerModes();
            
            const result = await this.api.batchAnalyze(addresses, {
                signalsPerToken,
                triggerModes
            });
            
            globalSpinner.hide();
            
            this.extractedData = result;
            this.displayResults(result);
            
        } catch (error) {
            globalSpinner.hide();
            this.updateStatus(`Error: ${error.message}`, true);
            console.error('Extraction error:', error);
        }
    }

    /**
     * Get selected trigger modes
     */
    getSelectedTriggerModes() {
        const checkboxes = document.querySelectorAll('.trigger-mode:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    /**
     * Display extraction results
     */
    displayResults(result) {
        const { results, errors } = result;
        
        let statusHtml = `<div style="margin-bottom: 10px;">`;
        statusHtml += `✅ <strong>Extraction Complete!</strong><br>`;
        statusHtml += `📊 Successfully processed: ${results.length} tokens<br>`;
        
        if (errors.length > 0) {
            statusHtml += `⚠️ Errors: ${errors.length} tokens<br>`;
        }
        
        const totalSignals = results.reduce((sum, token) => sum + token.total_signals, 0);
        const avgSignals = results.length > 0 ? (totalSignals / results.length).toFixed(1) : 0;
        statusHtml += `🎯 Total signals: ${totalSignals} (avg: ${avgSignals} per token)<br>`;
        statusHtml += `</div>`;
        
        // Show summary of top performers
        if (results.length > 0) {
            const topPerformers = results
                .filter(token => token.summary.best_gain > 0)
                .sort((a, b) => b.summary.best_gain - a.summary.best_gain)
                .slice(0, 3);
                
            if (topPerformers.length > 0) {
                statusHtml += `<div style="margin-bottom: 10px;"><strong>🏆 Top Performers:</strong><br>`;
                topPerformers.forEach(token => {
                    statusHtml += `• ${token.symbol}: ${token.summary.best_gain.toFixed(1)}% (${token.summary.total_signals} signals)<br>`;
                });
                statusHtml += `</div>`;
            }
        }
        
        // Show error summary if any
        if (errors.length > 0) {
            statusHtml += `<div style="margin-bottom: 10px;"><strong>❌ Errors:</strong><br>`;
            errors.slice(0, 3).forEach(error => {
                statusHtml += `• ${error.address}: ${error.error}<br>`;
            });
            if (errors.length > 3) {
                statusHtml += `• ... and ${errors.length - 3} more<br>`;
            }
            statusHtml += `</div>`;
        }
        
        statusHtml += `<div style="font-size: 10px; opacity: 0.8;">Ready to copy data! Use the buttons above to copy in different formats.</div>`;
        
        this.updateStatus(statusHtml);
        
        // Show action buttons
        document.getElementById('action-buttons').style.display = 'flex';
    }

    /**
     * Generate custom TSV format optimized for Google Sheets
     */
    generateCustomTSV(tokens, removeHeaders = true) {
        if (!tokens || tokens.length === 0) return '';
        
        const signalsPerToken = parseInt(document.getElementById('signals-per-token').value) || 3;
        let output = '';
        
        // Headers
        if (!removeHeaders) {
            const headers = ['Symbol', 'Contract', 'Created', 'Market Cap'];
            for (let i = 1; i <= signalsPerToken; i++) {
                headers.push(`Signal ${i} Gain%`, `Signal ${i} Source`, `Signal ${i} Date`);
            }
            output += headers.join('\t') + '\n';
        }
        
        // Data rows
        tokens.forEach(token => {
            const row = [
                token.symbol || 'UNK',
                token.contract_address || '',
                formatTimestamp(token.created_at),
                formatMcap(token.market_cap)
            ];
            
            // Add signal data
            for (let i = 0; i < signalsPerToken; i++) {
                const signal = token.top_signals[i];
                if (signal) {
                    row.push(
                        formatPercent(signal.best_gain_percent || 0),
                        formatSource(signal.source || ''),
                        formatTimestamp(signal.created_at)
                    );
                } else {
                    row.push('', '', '');
                }
            }
            
            output += row.join('\t') + '\n';
        });
        
        return output;
    }

    /**
     * Generate detailed TSV with comprehensive data
     */
    generateDetailedTSV(tokens, removeHeaders = true) {
        if (!tokens || tokens.length === 0) return '';
        
        let output = '';
        
        // Headers
        if (!removeHeaders) {
            const headers = [
                'Symbol', 'Name', 'Contract', 'Created', 'Creator', 'Market Cap',
                'Total Signals', 'Best Gain%', 'Avg Gain%', 'Success Rate%',
                'Top Signal Gain%', 'Top Signal Source', 'Top Signal Date'
            ];
            output += headers.join('\t') + '\n';
        }
        
        // Data rows
        tokens.forEach(token => {
            const topSignal = token.top_signals[0] || {};
            const row = [
                token.symbol || 'UNK',
                token.name || 'Unknown',
                token.contract_address || '',
                formatTimestamp(token.created_at),
                token.creator || '',
                formatMcap(token.market_cap),
                token.total_signals.toString(),
                formatPercent(token.summary.best_gain),
                formatPercent(token.summary.avg_gain),
                formatPercent(token.summary.success_rate),
                formatPercent(topSignal.best_gain_percent || 0),
                formatSource(topSignal.source || ''),
                formatTimestamp(topSignal.created_at)
            ];
            
            output += row.join('\t') + '\n';
        });
        
        return output;
    }

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            return false;
        }
    }

    /**
     * Update status area
     */
    updateStatus(message, isError = false) {
        const statusArea = document.getElementById('status-area');
        if (statusArea) {
            if (typeof message === 'string') {
                statusArea.innerHTML = `<div style="color: ${isError ? '#ff6b6b' : 'inherit'}">${message}</div>`;
            } else {
                statusArea.innerHTML = message;
            }
            statusArea.scrollTop = statusArea.scrollHeight;
        }
    }
}

/**
 * Initialize Signal Extractor
 */
export async function initialize(options = {}) {
    const extractor = new SignalExtractor(options);
    return await extractor.initialize();
}

/**
 * Main entry point (for backward compatibility)
 */
export async function main(options = {}) {
    return await initialize(options);
}

// Export default for module loader
export default { initialize, main, SignalExtractor };