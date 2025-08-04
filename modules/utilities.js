// ========================================
// 🛠️ UTILITIES MODULE
// ========================================

// Format functions for signal analysis
export function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toISOString().replace('T', ' ').split('.')[0];
}

export function formatMcap(mcap) {
    if (!mcap) return 'N/A';
    if (mcap >= 1000000) return `$${(mcap / 1000000).toFixed(2)}M`;
    if (mcap >= 1000) return `$${(mcap / 1000).toFixed(2)}K`;
    return `$${mcap}`;
}

export function formatPercent(value) {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(2)}%`;
}

// Efficient deep clone utility function
export function deepClone(obj) {
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
export function ensureCompleteConfig(config, COMPLETE_CONFIG_TEMPLATE) {
    const completeConfig = deepClone(COMPLETE_CONFIG_TEMPLATE);
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
export function getTriggerMode() {
    const triggerSelect = document.getElementById('trigger-mode-select');
    if (triggerSelect) {
        const value = triggerSelect.value;
        return value === '' ? null : parseInt(value); // Handle empty string for "Bullish Bonding"
    }
    return 4; // Default to Launchpads if no selection
}

// Clean and validate configuration values before API calls
export function cleanConfiguration(config) {
    const cleanedConfig = deepClone(config);
    
    // Recursively clean all values in the configuration
    function cleanValue(obj) {
        if (typeof obj === 'object' && obj !== null) {
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'object' && value !== null) {
                    cleanValue(value);
                } else if (value === null || value === undefined || value === '' || 
                          (typeof value === 'string' && (value.toLowerCase() === 'nan' || value.toLowerCase() === 'undefined'))) {
                    delete obj[key];
                } else if (typeof value === 'number' && (!isFinite(value) || isNaN(value))) {
                    delete obj[key];
                } else if (typeof value === 'string') {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue) && isFinite(numValue)) {
                        obj[key] = numValue;
                    }
                }
            }
        }
    }
    
    cleanValue(cleanedConfig);
    return cleanedConfig;
}

// Outlier filtering functions
export function removeOutliers(values, method = 'none') {
    if (!values || values.length === 0) return values;
    if (method === 'none') return values;
    
    const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
    if (validValues.length < 4) return validValues; // Need at least 4 values for meaningful outlier detection
    
    const sorted = [...validValues].sort((a, b) => a - b);
    
    switch (method) {
        case 'iqr':
            const q1Index = Math.floor(sorted.length * 0.25);
            const q3Index = Math.floor(sorted.length * 0.75);
            const q1 = sorted[q1Index];
            const q3 = sorted[q3Index];
            const iqr = q3 - q1;
            const lowerBound = q1 - 1.5 * iqr;
            const upperBound = q3 + 1.5 * iqr;
            return validValues.filter(v => v >= lowerBound && v <= upperBound);
            
        case 'percentile':
            const p5Index = Math.floor(sorted.length * 0.05);
            const p95Index = Math.floor(sorted.length * 0.95);
            const p5 = sorted[p5Index];
            const p95 = sorted[p95Index];
            return validValues.filter(v => v >= p5 && v <= p95);
            
        default:
            return validValues;
    }
}
