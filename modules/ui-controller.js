/**
 * @fileoverview UI Controller for AGCopilot - handles form manipulation and data extraction
 * @version 1.0.0
 */

import { sleep, deepClone } from './utils.js';
import { RateLimiter } from './rate-limiter.js';
import { COMPLETE_CONFIG_TEMPLATE } from './config.js';

/**
 * UI Controller for form manipulation and configuration management
 */
export class UIController {
    constructor(options = {}) {
        this.fieldHandlers = new Map();
        this.fieldMappings = new Map();
        this.rateLimiter = new RateLimiter(options.baseDelay || 350);
        this.lastStatusLog = 0;
        this.aggressiveRateLimiting = options.aggressiveRateLimiting || true;
        this.fieldDelay = options.fieldDelay || 500;
        this.sectionDelay = options.sectionDelay || 1000;
    }
    
    /**
     * Log rate limiter status periodically
     */
    logRateLimiterStatus() {
        const now = Date.now();
        if (now - this.lastStatusLog > 30000) { // Log every 30 seconds max
            const status = this.rateLimiter.getStatus();
            if (status.consecutiveErrors > 0 || status.currentDelay > status.baseDelay) {
                console.log(`🚦 Rate Limiter Status: ${status.consecutiveErrors} errors, delay: ${status.currentDelay}ms (base: ${status.baseDelay}ms)`);
                this.lastStatusLog = now;
            }
        }
    }

    /**
     * Get current configuration from UI
     */
    async getCurrentConfig() {
        // Start with complete template to ensure ALL fields are included
        const config = deepClone(COMPLETE_CONFIG_TEMPLATE);

        const getFieldValue = (labelText) => {
            const labels = Array.from(document.querySelectorAll('.sidebar-label'));
            const label = labels.find(el => el.textContent.trim() === labelText);
            if (!label) return undefined;

            let container = label.parentElement;
            while (container && !container.querySelector('input, select, button')) {
                container = container.parentElement;
            }

            const input = container.querySelector('input[type="number"]');
            if (input) {
                return input.value === '' ? undefined : parseFloat(input.value);
            }

            const select = container.querySelector('select');
            if (select) {
                return select.value === '' ? undefined : select.value;
            }

            const button = container.querySelector('button');
            if (button) {
                const text = button.textContent.trim();
                // Only return value if it's not the default "Don't care" state
                return (text === "Don't care" || text === "") ? undefined : text;
            }

            return undefined;
        };

        const getToggleValue = (labelText) => {
            const labels = Array.from(document.querySelectorAll('.sidebar-label'));
            const label = labels.find(el => el.textContent.trim() === labelText);
            if (!label) return undefined;

            let container = label.parentElement;
            while (container && !container.querySelector('button')) {
                container = container.parentElement;
            }

            const button = container.querySelector('button');
            if (button) {
                const text = button.textContent.trim();
                if (text === "Yes") return "Yes";
                if (text === "No") return "No";
                return undefined; // "Don't care" or other states
            }

            return undefined;
        };

        // Extract all field values
        for (const [section, fields] of Object.entries(config)) {
            for (const field of Object.keys(fields)) {
                if (field === "Fresh Deployer") {
                    config[section][field] = getToggleValue(field);
                } else {
                    config[section][field] = getFieldValue(field);
                }
            }
        }

        return config;
    }

    /**
     * Apply configuration to UI with smart rate limiting
     */
    async applyConfig(config, clearFirst = false) {
        this.logRateLimiterStatus();
                    
        const sectionMap = {
            basic: 'Basic',
            tokenDetails: 'Token Details',
            wallets: 'Wallets',
            risk: 'Risk',
            advanced: 'Advanced'
        };

        // Get current config to compare what needs to change
        const currentConfig = clearFirst ? {} : await this.getCurrentConfig();
        
        let totalSuccess = 0;
        
        // Define all possible fields by section for selective clearing
        const allFieldsBySection = {
            basic: ['Min MCAP (USD)', 'Max MCAP (USD)'],
            tokenDetails: ['Min Deployer Age (min)', 'Max Token Age (min)', 'Min AG Score'],
            wallets: ['Min Unique Wallets', 'Max Unique Wallets', 'Min KYC Wallets', 'Max KYC Wallets'],
            risk: ['Min Vol MCAP %', 'Max Vol MCAP %', 'Min Buy Ratio %', 'Max Buy Ratio %',
                   'Min Deployer Balance (SOL)', 'Max Bundled %', 'Min Bundled %', 'Max Drained %',
                   'Max Drained Count', 'Description', 'Fresh Deployer'],
            advanced: ['Min TTC (sec)', 'Max TTC (sec)', 'Max Liquidity %', 'Min Win Pred %']
        };
        
        // Process each section
        for (const [section, params] of Object.entries(config)) {
            const sectionName = sectionMap[section];
            if (!sectionName) continue;
            
            // Open section
            await this.openSection(sectionName);
            
            // Clear section if requested
            if (clearFirst) {
                const fieldsToProcess = allFieldsBySection[section] || [];
                console.log(`🧹 Clearing section "${sectionName}" (${fieldsToProcess.length} fields)`);
                
                for (const param of fieldsToProcess) {
                    const cleared = await this.clearField(param);
                    if (cleared) totalSuccess++;
                }
            }
            
            // Apply new values (only for fields that have changed or need to be set)
            for (const [param, newValue] of Object.entries(params)) {
                const currentValue = currentConfig[section] && currentConfig[section][param];
                
                // Skip if value hasn't changed (unless clearing first)
                if (!clearFirst && currentValue === newValue && newValue !== undefined) {
                    continue;
                }
                
                if (newValue !== undefined) {
                    console.log(`🎛️ Setting "${param}" = ${newValue} in ${sectionName}`);
                    const success = await this.setFieldValue(param, newValue);
                    if (success) totalSuccess++;
                }
            }
            
            // Section delay between sections
            const sectionDelay = this.aggressiveRateLimiting ? this.sectionDelay : 150;
            await sleep(sectionDelay);
        }
        
        return totalSuccess;
    }

    /**
     * Open a collapsible section
     */
    async openSection(sectionTitle) {
        const sectionHeaders = Array.from(document.querySelectorAll('h3'));
        const sectionHeader = sectionHeaders.find(h => h.textContent.trim() === sectionTitle);
        
        if (sectionHeader) {
            // Check if section is collapsed (has expand icon)
            const expandIcon = sectionHeader.querySelector('svg[data-icon="expand"]');
            if (expandIcon) {
                sectionHeader.click();
                await sleep(200); // Wait for section to expand
            }
        }
    }

    /**
     * Clear a field value
     */
    async clearField(fieldName) {
        try {
            await this.rateLimiter.throttle();
            
            const labels = Array.from(document.querySelectorAll('.sidebar-label'));
            const label = labels.find(el => el.textContent.trim() === fieldName);
            if (!label) return false;

            let container = label.parentElement;
            while (container && !container.querySelector('input, select, button')) {
                container = container.parentElement;
            }

            // Handle different input types
            const input = container.querySelector('input[type="number"]');
            if (input) {
                input.focus();
                input.select();
                input.value = '';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.blur();
                return true;
            }

            const select = container.querySelector('select');
            if (select) {
                select.value = '';
                select.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            }

            const button = container.querySelector('button');
            if (button && fieldName === 'Fresh Deployer') {
                // Reset toggle to "Don't care" state
                const currentText = button.textContent.trim();
                if (currentText !== "Don't care") {
                    button.click();
                    await sleep(100);
                    // May need multiple clicks to cycle to "Don't care"
                    const newText = button.textContent.trim();
                    if (newText !== "Don't care") {
                        button.click();
                        await sleep(100);
                    }
                }
                return true;
            }

            this.rateLimiter.recordSuccess();
            return false;

        } catch (error) {
            this.rateLimiter.recordError();
            console.warn(`⚠️ Failed to clear field "${fieldName}":`, error.message);
            return false;
        }
    }

    /**
     * Set a field value with retry logic
     */
    async setFieldValue(fieldName, value, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await this.rateLimiter.throttle();
                
                const labels = Array.from(document.querySelectorAll('.sidebar-label'));
                const label = labels.find(el => el.textContent.trim() === fieldName);
                
                if (!label) {
                    console.warn(`⚠️ Field "${fieldName}" not found`);
                    return false;
                }

                let container = label.parentElement;
                while (container && !container.querySelector('input, select, button')) {
                    container = container.parentElement;
                }

                if (!container) {
                    console.warn(`⚠️ No input container found for "${fieldName}"`);
                    return false;
                }

                // Handle different input types
                const input = container.querySelector('input[type="number"]');
                if (input) {
                    input.focus();
                    input.value = value.toString();
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    input.blur();
                    
                    // Verify the value was set
                    await sleep(100);
                    if (parseFloat(input.value) === parseFloat(value)) {
                        this.rateLimiter.recordSuccess();
                        return true;
                    }
                }

                const select = container.querySelector('select');
                if (select) {
                    select.value = value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // Verify the value was set
                    await sleep(100);
                    if (select.value === value) {
                        this.rateLimiter.recordSuccess();
                        return true;
                    }
                }

                const button = container.querySelector('button');
                if (button && fieldName === 'Fresh Deployer') {
                    // Handle toggle button for Fresh Deployer
                    let currentText = button.textContent.trim();
                    let clicksNeeded = 0;
                    
                    // Determine how many clicks needed to reach target value
                    if (value === "Yes" && currentText !== "Yes") {
                        clicksNeeded = currentText === "No" ? 2 : 1;
                    } else if (value === "No" && currentText !== "No") {
                        clicksNeeded = currentText === "Yes" ? 2 : 1;
                    }
                    
                    for (let i = 0; i < clicksNeeded; i++) {
                        button.click();
                        await sleep(150);
                        currentText = button.textContent.trim();
                    }
                    
                    if (currentText === value) {
                        this.rateLimiter.recordSuccess();
                        return true;
                    }
                }

                console.warn(`⚠️ Failed to set "${fieldName}" to "${value}" (attempt ${attempt}/${maxRetries})`);
                
                if (attempt < maxRetries) {
                    await sleep(500 * attempt); // Exponential backoff
                }

            } catch (error) {
                this.rateLimiter.recordError();
                console.warn(`⚠️ Error setting field "${fieldName}" (attempt ${attempt}/${maxRetries}):`, error.message);
                
                if (attempt < maxRetries) {
                    await sleep(1000 * attempt); // Longer wait on error
                }
            }
        }
        
        return false;
    }

    /**
     * Extract current page metrics
     */
    async extractCurrentPageMetrics() {
        try {
            // Look for metrics in common locations
            const metricsElements = document.querySelectorAll('[data-testid*="metric"], .metric, .stat-value');
            const metrics = {};
            
            metricsElements.forEach(element => {
                const text = element.textContent.trim();
                const label = element.getAttribute('aria-label') || 
                            element.previousElementSibling?.textContent?.trim() ||
                            element.parentElement?.querySelector('label')?.textContent?.trim();
                
                if (label && text) {
                    metrics[label] = text;
                }
            });
            
            return metrics;
            
        } catch (error) {
            console.warn('⚠️ Failed to extract metrics:', error.message);
            return {};
        }
    }

    /**
     * Check if a configuration is already applied
     */
    async isConfigurationApplied(targetConfig) {
        const currentConfig = await this.getCurrentConfig();
        
        for (const [section, fields] of Object.entries(targetConfig)) {
            for (const [field, value] of Object.entries(fields)) {
                if (value !== undefined) {
                    const currentValue = currentConfig[section] && currentConfig[section][field];
                    if (currentValue !== value) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }

    /**
     * Get form validation errors
     */
    getValidationErrors() {
        const errors = [];
        const errorElements = document.querySelectorAll('.error, .invalid, [aria-invalid="true"]');
        
        errorElements.forEach(element => {
            const errorText = element.textContent.trim();
            if (errorText) {
                errors.push(errorText);
            }
        });
        
        return errors;
    }

    /**
     * Scroll element into view smoothly
     */
    scrollToElement(element) {
        if (element && element.scrollIntoView) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });
        }
    }

    /**
     * Wait for element to be visible and interactable
     */
    async waitForElement(selector, timeout = 5000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const element = document.querySelector(selector);
            if (element && element.offsetParent !== null) {
                return element;
            }
            await sleep(100);
        }
        
        throw new Error(`Element ${selector} not found or not visible within ${timeout}ms`);
    }

    /**
     * Get rate limiter status
     */
    getRateLimiterStatus() {
        return this.rateLimiter.getStatus();
    }
}