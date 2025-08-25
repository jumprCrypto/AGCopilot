/**
 * @fileoverview Core utility functions shared across AGCopilot tools
 * @version 1.0.0
 */

/**
 * Sleep utility for async delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Deep clone an object
 * @param {any} obj - Object to clone
 * @returns {any} Deep cloned object
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === "object") {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

/**
 * Format timestamp to readable date
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted date string
 */
export function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toISOString().replace('T', ' ').split('.')[0];
}

/**
 * Format market cap values
 * @param {number} mcap - Market cap value
 * @returns {string} Formatted market cap string
 */
export function formatMcap(mcap) {
    if (!mcap) return 'N/A';
    if (mcap >= 1e9) return `$${(mcap / 1e9).toFixed(2)}B`;
    if (mcap >= 1e6) return `$${(mcap / 1e6).toFixed(2)}M`;
    if (mcap >= 1e3) return `$${(mcap / 1e3).toFixed(2)}K`;
    return `$${mcap.toFixed(2)}`;
}

/**
 * Format percentage values
 * @param {number} value - Percentage value
 * @returns {string} Formatted percentage string
 */
export function formatPercent(value) {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(2)}%`;
}

/**
 * Format source information
 * @param {string} source - Source string
 * @returns {string} Formatted source string
 */
export function formatSource(source) {
    if (!source) return 'N/A';
    
    // Handle different source formats
    const sourceMap = {
        'photon': 'Photon',
        'jup': 'Jupiter',
        'jupiter': 'Jupiter',
        'raydium': 'Raydium',
        'pump': 'Pump.fun',
        'pump.fun': 'Pump.fun',
        'meteora': 'Meteora',
        'orca': 'Orca'
    };
    
    const normalized = source.toLowerCase().trim();
    return sourceMap[normalized] || source;
}

/**
 * Ensure configuration object has all required fields
 * @param {Object} config - Configuration object to validate
 * @param {Object} template - Complete configuration template
 * @returns {Object} Complete configuration object
 */
export function ensureCompleteConfig(config, template) {
    const completeConfig = deepClone(template);
    
    if (!config) return completeConfig;
    
    // Merge provided config with template
    for (const [section, fields] of Object.entries(config)) {
        if (completeConfig[section]) {
            for (const [field, value] of Object.entries(fields)) {
                if (completeConfig[section].hasOwnProperty(field)) {
                    completeConfig[section][field] = value;
                }
            }
        }
    }
    
    return completeConfig;
}

/**
 * Generate a random number within a range
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random number in range
 */
export function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Generate a random integer within a range
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {number} Random integer in range
 */
export function randomIntInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Parse CSV data into objects
 * @param {string} csvText - CSV text to parse
 * @param {string} delimiter - Field delimiter (default: ',')
 * @returns {Array<Object>} Array of parsed objects
 */
export function parseCSV(csvText, delimiter = ',') {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(delimiter).map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter);
        const obj = {};
        
        headers.forEach((header, index) => {
            obj[header] = values[index] ? values[index].trim() : '';
        });
        
        data.push(obj);
    }
    
    return data;
}

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}