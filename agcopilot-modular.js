/**
 * @fileoverview AGCopilot Modular Bootstrap - Entry point for loading modular AGCopilot
 * @version 1.0.0
 * 
 * Usage Examples:
 * 
 * // In browser console - load from GitHub:
 * const script = document.createElement('script');
 * script.type = 'module';
 * script.textContent = `
 *   import { loadAGCopilot } from 'https://raw.githubusercontent.com/jumprCrypto/AGCopilot/main/modules/loader.js';
 *   window.agcopilot = await loadAGCopilot('copilot');
 * `;
 * document.head.appendChild(script);
 * 
 * // Alternative one-liner for browser console:
 * import('https://raw.githubusercontent.com/jumprCrypto/AGCopilot/main/agcopilot-modular.js');
 * 
 * // For different tools:
 * // loadAGCopilot('copilot')        - Enhanced AGCopilot
 * // loadAGCopilot('legacy')         - Legacy AGCopilot  
 * // loadAGCopilot('signal-extractor') - Signal Extractor
 */

import { loadAGCopilot } from './modules/loader.js';

/**
 * Automatically load AGCopilot based on URL parameters or user selection
 */
async function autoLoad() {
    console.clear();
    console.log('%c🤖 AGCopilot Modular System v1.0 🤖', 'color: blue; font-size: 18px; font-weight: bold;');
    console.log('%c📦 Modular JavaScript implementation with GitHub loading', 'color: green; font-size: 14px;');
    console.log('');
    
    // Check for URL parameter to determine which tool to load
    const urlParams = new URLSearchParams(window.location.search);
    const tool = urlParams.get('tool') || 'copilot';
    
    console.log('🔧 Available tools:');
    console.log('  • copilot - Enhanced AGCopilot with API integration');
    console.log('  • legacy - Original AGCopilot optimizer'); 
    console.log('  • signal-extractor - Signal extraction for Google Sheets');
    console.log('');
    
    try {
        console.log(`🚀 Loading ${tool}...`);
        const instance = await loadAGCopilot(tool);
        
        // Make available globally for console access
        window.agcopilot = instance;
        window.AGCopilot = {
            instance,
            load: loadAGCopilot,
            version: '1.0.0'
        };
        
        console.log('');
        console.log('✅ AGCopilot loaded successfully!');
        console.log('💡 Access via: window.agcopilot or window.AGCopilot');
        
        return instance;
        
    } catch (error) {
        console.error('❌ Failed to load AGCopilot:', error);
        
        // Show user-friendly error dialog
        showErrorDialog(error, tool);
        
        throw error;
    }
}

/**
 * Show error dialog with helpful information
 */
function showErrorDialog(error, tool) {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #d32f2f 0%, #f44336 100%);
        border: 2px solid #ffcdd2;
        border-radius: 15px;
        padding: 30px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        z-index: 10001;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: white;
        max-width: 500px;
        text-align: center;
    `;

    dialog.innerHTML = `
        <h2 style="margin: 0 0 20px 0; color: #ffcdd2;">❌ Loading Failed</h2>
        <p style="margin: 0 0 15px 0; line-height: 1.5;">
            Failed to load <strong>${tool}</strong>: ${error.message}
        </p>
        <p style="margin: 0 0 20px 0; font-size: 14px; opacity: 0.9;">
            This could be due to network issues, browser restrictions, or module availability.
            Try refreshing the page or check the browser console for details.
        </p>
        <div style="display: flex; gap: 15px; justify-content: center;">
            <button id="retry-load" style="
                padding: 12px 24px;
                background: #fff;
                color: #d32f2f;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                font-size: 14px;
            ">🔄 Retry</button>
            <button id="close-error" style="
                padding: 12px 24px;
                background: rgba(255,255,255,0.2);
                color: white;
                border: 1px solid rgba(255,255,255,0.3);
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
            ">Close</button>
        </div>
    `;

    document.body.appendChild(dialog);

    document.getElementById('retry-load').addEventListener('click', () => {
        document.body.removeChild(dialog);
        autoLoad(); // Retry loading
    });

    document.getElementById('close-error').addEventListener('click', () => {
        document.body.removeChild(dialog);
    });
}

/**
 * Manual tool selector for interactive loading
 */
function showToolSelector() {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        border: 2px solid #4CAF50;
        border-radius: 15px;
        padding: 30px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        z-index: 10001;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: white;
        max-width: 600px;
    `;

    dialog.innerHTML = `
        <h2 style="margin: 0 0 20px 0; color: #4CAF50; text-align: center;">🤖 Select AGCopilot Tool</h2>
        
        <div style="display: grid; gap: 15px; margin-bottom: 25px;">
            <div class="tool-option" data-tool="copilot" style="
                padding: 15px;
                border: 2px solid #4CAF50;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.3s ease;
                background: rgba(76, 175, 80, 0.1);
            ">
                <h3 style="margin: 0 0 8px 0; color: #4CAF50;">🚀 Enhanced AGCopilot</h3>
                <p style="margin: 0; font-size: 14px; opacity: 0.9;">
                    Full-featured optimization with API integration, genetic algorithms, and advanced analytics.
                </p>
            </div>
            
            <div class="tool-option" data-tool="legacy" style="
                padding: 15px;
                border: 2px solid #2196F3;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.3s ease;
                background: rgba(33, 150, 243, 0.1);
            ">
                <h3 style="margin: 0 0 8px 0; color: #2196F3;">🔧 Legacy AGCopilot</h3>
                <p style="margin: 0; font-size: 14px; opacity: 0.9;">
                    Original optimization tool with proven algorithms and UI-based parameter extraction.
                </p>
            </div>
            
            <div class="tool-option" data-tool="signal-extractor" style="
                padding: 15px;
                border: 2px solid #9C27B0;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.3s ease;
                background: rgba(156, 39, 176, 0.1);
            ">
                <h3 style="margin: 0 0 8px 0; color: #9C27B0;">📊 Signal Extractor</h3>
                <p style="margin: 0; font-size: 14px; opacity: 0.9;">
                    Extract and analyze token signals with Google Sheets export functionality.
                </p>
            </div>
        </div>
        
        <div style="text-align: center;">
            <button id="cancel-selection" style="
                padding: 12px 24px;
                background: #f44336;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
            ">Cancel</button>
        </div>
    `;

    document.body.appendChild(dialog);

    // Add hover effects
    const options = dialog.querySelectorAll('.tool-option');
    options.forEach(option => {
        option.addEventListener('mouseenter', () => {
            option.style.transform = 'scale(1.02)';
            option.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
        });
        
        option.addEventListener('mouseleave', () => {
            option.style.transform = 'scale(1)';
            option.style.boxShadow = 'none';
        });
        
        option.addEventListener('click', async () => {
            const tool = option.getAttribute('data-tool');
            document.body.removeChild(dialog);
            
            try {
                const instance = await loadAGCopilot(tool);
                window.agcopilot = instance;
                window.AGCopilot = { instance, load: loadAGCopilot, version: '1.0.0' };
            } catch (error) {
                showErrorDialog(error, tool);
            }
        });
    });

    document.getElementById('cancel-selection').addEventListener('click', () => {
        document.body.removeChild(dialog);
    });
}

// Auto-load on script execution
autoLoad().catch(error => {
    console.error('Auto-load failed:', error);
});

// Expose manual selector globally
window.showAGCopilotSelector = showToolSelector;

// Export for module usage
export { loadAGCopilot, autoLoad, showToolSelector };
export default { load: loadAGCopilot, autoLoad, showToolSelector };