/**
 * AGCopilot-Utils.js - Utility Module
 * 
 * Contains all utility functions and helper methods used throughout
 * the AGCopilot system.
 */

// ========================================
// 🛠️ CORE UTILITIES
// ========================================

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Efficient deep clone utility function
function deepClone(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (Array.isArray(obj)) return obj.map(item => deepClone(item));
    
    const cloned = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    return cloned;
}

// Ensure complete config by merging with template
function ensureCompleteConfig(config, template) {
    const completeConfig = deepClone(template);
    for (const [section, sectionConfig] of Object.entries(config)) {
        if (completeConfig[section]) {
            Object.assign(completeConfig[section], sectionConfig);
        } else {
            completeConfig[section] = sectionConfig;
        }
    }
    return completeConfig;
}

// Get selected trigger mode from UI
function getTriggerMode() {
    const triggerSelect = document.getElementById('trigger-mode-select');
    if (triggerSelect) {
        const value = triggerSelect.value;
        return value === '' ? null : parseInt(value);
    }
    return 4; // Default to Launchpads if no selection
}

// Clean and validate configuration values before API calls
function cleanConfiguration(config) {
    const cleanedConfig = deepClone(config);
    
    // Recursively clean all values in the configuration
    function cleanValue(obj) {
        if (typeof obj === 'object' && obj !== null) {
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'object' && value !== null) {
                    cleanValue(value); // Recurse into nested objects
                } else {
                    // Clean individual values
                    if (value === null || value === undefined || value === '') {
                        delete obj[key]; // Remove empty values
                    } else if (typeof value === 'string') {
                        // Handle string representations of numbers
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue) && isFinite(numValue)) {
                            // Special handling for AG Score
                            if (key === 'Min AG Score') {
                                const agScore = Math.round(numValue);
                                obj[key] = Math.max(0, Math.min(10, agScore)); // Clamp to 0-10
                            } else {
                                obj[key] = numValue; // Convert valid numeric strings to numbers
                            }
                        } else if (value === 'NaN' || value === 'undefined' || value === 'null') {
                            delete obj[key]; // Remove invalid string values
                        }
                    } else if (typeof value === 'number') {
                        // Handle numeric values
                        if (isNaN(value) || !isFinite(value)) {
                            delete obj[key]; // Remove NaN or infinite numbers
                        } else if (key === 'Min AG Score') {
                            const agScore = Math.round(value);
                            obj[key] = Math.max(0, Math.min(10, agScore)); // Clamp AG Score to 0-10
                        }
                    }
                }
            }
        }
    }
    
    cleanValue(cleanedConfig);
    return cleanedConfig;
}

// ========================================
// 📊 FORMATTING UTILITIES
// ========================================

function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toISOString().replace('T', ' ').split('.')[0];
}

function formatMcap(mcap) {
    if (!mcap) return 'N/A';
    if (mcap >= 1000000) return `$${(mcap / 1000000).toFixed(2)}M`;
    if (mcap >= 1000) return `$${(mcap / 1000).toFixed(2)}K`;
    return `$${mcap}`;
}

function formatPercent(value) {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(2)}%`;
}

function formatNumber(num) {
    if (typeof num !== 'number' || isNaN(num)) return 'N/A';
    return num.toLocaleString();
}

// ========================================
// 📈 DATA PROCESSING UTILITIES
// ========================================

// Remove outliers from data arrays
function removeOutliers(values, method = 'none') {
    if (!values || values.length === 0) return values;
    if (method === 'none') return values;
    
    const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
    if (validValues.length < 4) return validValues; // Need at least 4 values for meaningful outlier detection
    
    const sorted = [...validValues].sort((a, b) => a - b);
    
    switch (method) {
        case 'iqr': {
            // Interquartile Range method - removes extreme outliers
            const q1Index = Math.floor(sorted.length * 0.25);
            const q3Index = Math.floor(sorted.length * 0.75);
            const q1 = sorted[q1Index];
            const q3 = sorted[q3Index];
            const iqr = q3 - q1;
            const lowerBound = q1 - 1.5 * iqr;
            const upperBound = q3 + 1.5 * iqr;
            
            return validValues.filter(v => v >= lowerBound && v <= upperBound);
        }
        
        case 'percentile': {
            // Keep middle 80% (remove top and bottom 10%)
            const startIndex = Math.floor(sorted.length * 0.1);
            const endIndex = Math.ceil(sorted.length * 0.9);
            const filtered = sorted.slice(startIndex, endIndex);
            
            return validValues.filter(v => v >= filtered[0] && v <= filtered[filtered.length - 1]);
        }
        
        case 'zscore': {
            // Z-Score method - remove values more than 2.5 standard deviations from mean
            const mean = validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
            const variance = validValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / validValues.length;
            const stdDev = Math.sqrt(variance);
            const threshold = 2.5;
            
            return validValues.filter(v => Math.abs(v - mean) <= threshold * stdDev);
        }
        
        default:
            return validValues;
    }
}

// Calculate statistics for an array of numbers
function calculateStats(values) {
    if (!values || values.length === 0) {
        return { min: 0, max: 0, avg: 0, median: 0, count: 0 };
    }
    
    const validValues = values.filter(v => typeof v === 'number' && !isNaN(v));
    if (validValues.length === 0) {
        return { min: 0, max: 0, avg: 0, median: 0, count: 0 };
    }
    
    const sorted = [...validValues].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const avg = validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
    const medianIndex = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 
        ? (sorted[medianIndex - 1] + sorted[medianIndex]) / 2
        : sorted[medianIndex];
    
    return { min, max, avg, median, count: validValues.length };
}

// ========================================
// 🔍 VALIDATION UTILITIES
// ========================================

// Validate parameter value against rules
function validateParameter(paramName, value, rules) {
    if (!rules[paramName]) {
        return { valid: true, error: null };
    }
    
    const rule = rules[paramName];
    
    // Check if value is within allowed range
    if (typeof value === 'number') {
        if (value < rule.min) {
            return { valid: false, error: `Value ${value} is below minimum ${rule.min}` };
        }
        if (value > rule.max) {
            return { valid: false, error: `Value ${value} is above maximum ${rule.max}` };
        }
    }
    
    return { valid: true, error: null };
}

// Validate entire configuration
function validateConfiguration(config, rules) {
    const errors = [];
    
    for (const [section, sectionConfig] of Object.entries(config)) {
        if (typeof sectionConfig === 'object' && sectionConfig !== null) {
            for (const [param, value] of Object.entries(sectionConfig)) {
                if (value !== undefined && value !== null) {
                    const validation = validateParameter(param, value, rules);
                    if (!validation.valid) {
                        errors.push(`${section}.${param}: ${validation.error}`);
                    }
                }
            }
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

// ========================================
// 🎯 CONFIGURATION UTILITIES
// ========================================

// Generate variations of a parameter for testing
function generateParameterVariations(currentValue, rules, maxVariations = 5) {
    if (!rules || typeof rules !== 'object') {
        return [];
    }
    
    const { min, max, step = 1, type } = rules;
    const variations = new Set();
    
    // Always include min and max
    variations.add(min);
    variations.add(max);
    
    // Add current value if valid
    if (currentValue >= min && currentValue <= max) {
        variations.add(currentValue);
    }
    
    // Add strategic points
    const range = max - min;
    if (range > 0) {
        variations.add(min + Math.floor(range * 0.25));
        variations.add(min + Math.floor(range * 0.5));
        variations.add(min + Math.floor(range * 0.75));
    }
    
    // Convert to array and limit
    const result = Array.from(variations)
        .map(val => type === 'integer' ? Math.round(val) : val)
        .filter(val => val >= min && val <= max)
        .sort((a, b) => a - b)
        .slice(0, maxVariations);
    
    return result;
}

// ========================================
// 🔧 MODULE INITIALIZATION
// ========================================
function init(namespace) {
    // Store utilities in namespace
    namespace.utils = {
        sleep,
        deepClone,
        ensureCompleteConfig,
        getTriggerMode,
        cleanConfiguration,
        formatTimestamp,
        formatMcap,
        formatPercent,
        formatNumber,
        removeOutliers,
        calculateStats,
        validateParameter,
        validateConfiguration,
        generateParameterVariations
    };
    
    console.log('✅ Utilities module initialized');
    return Promise.resolve();
}

// ========================================
// 📤 MODULE EXPORTS
// ========================================
module.exports = {
    sleep,
    deepClone,
    ensureCompleteConfig,
    getTriggerMode,
    cleanConfiguration,
    formatTimestamp,
    formatMcap,
    formatPercent,
    formatNumber,
    removeOutliers,
    calculateStats,
    validateParameter,
    validateConfiguration,
    generateParameterVariations,
    init
};
