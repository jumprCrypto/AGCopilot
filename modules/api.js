/**
 * @fileoverview API communication and data fetching utilities
 * @version 1.0.0
 */

import { sleep } from './utils.js';
import { APIRateLimiter } from './rate-limiter.js';
import { API_ENDPOINTS, MESSAGES } from './config.js';

/**
 * API client for AGCopilot backend services
 */
export class APIClient {
    constructor(baseURL, options = {}) {
        this.baseURL = baseURL;
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 1000;
        this.rateLimiter = new APIRateLimiter(options.requestDelay || 500);
        this.defaultHeaders = options.headers || {};
    }
    
    /**
     * Make a fetch request with retry logic
     */
    async fetchWithRetry(url, options = {}) {
        const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`;
        let lastError;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                await this.rateLimiter.throttle();
                
                const response = await fetch(fullURL, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        ...this.defaultHeaders,
                        ...options.headers
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return await response.json();
                
            } catch (error) {
                lastError = error;
                console.warn(`🔄 API request failed (attempt ${attempt}/${this.maxRetries}):`, error.message);
                
                if (attempt < this.maxRetries) {
                    const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
                    console.log(`⏳ Retrying in ${delay}ms...`);
                    await sleep(delay);
                }
            }
        }
        
        throw new Error(`${MESSAGES.ERRORS.API_ERROR} ${lastError.message}`);
    }
    
    /**
     * GET request
     */
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.fetchWithRetry(url);
    }
    
    /**
     * POST request
     */
    async post(endpoint, data = {}) {
        return this.fetchWithRetry(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    /**
     * PUT request
     */
    async put(endpoint, data = {}) {
        return this.fetchWithRetry(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    /**
     * DELETE request
     */
    async delete(endpoint) {
        return this.fetchWithRetry(endpoint, {
            method: 'DELETE'
        });
    }
}

/**
 * AG Backtester API client
 */
export class BacktesterAPI extends APIClient {
    constructor(baseURL, options = {}) {
        super(baseURL, options);
    }
    
    /**
     * Get backtesting statistics
     */
    async getStats(config, options = {}) {
        const payload = {
            buying_amount: options.buyingAmount || 0.25,
            ...this.formatConfigForAPI(config)
        };
        
        return this.post(API_ENDPOINTS.STATS, payload);
    }
    
    /**
     * Get token information
     */
    async getTokenInfo(contractAddress) {
        return this.get(API_ENDPOINTS.TOKEN_INFO, { 
            contract_address: contractAddress 
        });
    }
    
    /**
     * Get token swap data
     */
    async getTokenSwaps(contractAddress) {
        return this.get(API_ENDPOINTS.TOKEN_SWAPS, { 
            contract_address: contractAddress 
        });
    }
    
    /**
     * Format configuration object for API consumption
     */
    formatConfigForAPI(config) {
        const apiConfig = {};
        
        // Flatten the nested config structure for API
        for (const [section, fields] of Object.entries(config)) {
            for (const [field, value] of Object.entries(fields)) {
                if (value !== undefined && value !== null && value !== '') {
                    apiConfig[this.mapFieldToAPIParam(field)] = value;
                }
            }
        }
        
        return apiConfig;
    }
    
    /**
     * Map UI field names to API parameter names
     */
    mapFieldToAPIParam(fieldName) {
        const mapping = {
            'Min MCAP (USD)': 'min_mcap',
            'Max MCAP (USD)': 'max_mcap',
            'Min Deployer Age (min)': 'min_deployer_age',
            'Max Token Age (min)': 'max_token_age',
            'Min AG Score': 'min_ag_score',
            'Min Unique Wallets': 'min_unique_wallets',
            'Max Unique Wallets': 'max_unique_wallets',
            'Min KYC Wallets': 'min_kyc_wallets',
            'Max KYC Wallets': 'max_kyc_wallets',
            'Min Bundled %': 'min_bundled_percent',
            'Max Bundled %': 'max_bundled_percent',
            'Min Deployer Balance (SOL)': 'min_deployer_balance',
            'Min Buy Ratio %': 'min_buy_ratio',
            'Max Buy Ratio %': 'max_buy_ratio',
            'Min Vol MCAP %': 'min_vol_mcap_percent',
            'Max Vol MCAP %': 'max_vol_mcap_percent',
            'Max Drained %': 'max_drained_percent',
            'Max Drained Count': 'max_drained_count',
            'Min TTC (sec)': 'min_ttc',
            'Max TTC (sec)': 'max_ttc',
            'Max Liquidity %': 'max_liquidity_percent',
            'Min Win Pred %': 'min_win_pred_percent',
            'Description': 'description',
            'Fresh Deployer': 'fresh_deployer'
        };
        
        return mapping[fieldName] || fieldName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
}

/**
 * Signal extraction API utilities
 */
export class SignalAPI extends APIClient {
    constructor(baseURL, options = {}) {
        super(baseURL, options);
    }
    
    /**
     * Batch process multiple contract addresses
     */
    async batchAnalyze(contractAddresses, options = {}) {
        const results = [];
        const errors = [];
        
        console.log(`📊 Starting batch analysis for ${contractAddresses.length} contracts...`);
        
        for (let i = 0; i < contractAddresses.length; i++) {
            const address = contractAddresses[i].trim();
            if (!address) continue;
            
            try {
                console.log(`🔍 Processing ${i + 1}/${contractAddresses.length}: ${address}`);
                
                const [tokenInfo, swaps] = await Promise.all([
                    this.getTokenInfo(address),
                    this.getTokenSwaps(address)
                ]);
                
                const processedData = this.processTokenData(tokenInfo, swaps, options);
                results.push(processedData);
                
            } catch (error) {
                console.error(`❌ Error processing ${address}:`, error.message);
                errors.push({ address, error: error.message });
            }
        }
        
        return { results, errors };
    }
    
    /**
     * Process token data for signal extraction
     */
    processTokenData(tokenInfo, swaps, options = {}) {
        const signalsPerToken = options.signalsPerToken || 3;
        const selectedTriggerModes = options.triggerModes || ['pump', 'photon', 'jup'];
        
        // Filter swaps by trigger mode
        const filteredSwaps = this.filterSwapsByTriggerMode(swaps, selectedTriggerModes);
        
        // Sort by best gain first
        filteredSwaps.sort((a, b) => (b.best_gain_percent || 0) - (a.best_gain_percent || 0));
        
        // Take top N signals
        const topSignals = filteredSwaps.slice(0, signalsPerToken);
        
        return {
            contract_address: tokenInfo.contract_address,
            name: tokenInfo.name || 'Unknown',
            symbol: tokenInfo.symbol || 'UNK',
            created_at: tokenInfo.created_at,
            creator: tokenInfo.creator,
            market_cap: tokenInfo.market_cap,
            total_signals: filteredSwaps.length,
            top_signals: topSignals,
            summary: this.generateTokenSummary(tokenInfo, topSignals)
        };
    }
    
    /**
     * Filter swaps by trigger mode
     */
    filterSwapsByTriggerMode(swaps, selectedModes) {
        if (!selectedModes || selectedModes.length === 0) return swaps;
        
        return swaps.filter(swap => {
            const source = (swap.source || '').toLowerCase();
            return selectedModes.some(mode => 
                source.includes(mode.toLowerCase()) || 
                (mode === 'pump' && source.includes('pump.fun'))
            );
        });
    }
    
    /**
     * Generate summary statistics for a token
     */
    generateTokenSummary(tokenInfo, signals) {
        if (!signals || signals.length === 0) {
            return {
                best_gain: 0,
                avg_gain: 0,
                total_signals: 0,
                success_rate: 0
            };
        }
        
        const gains = signals.map(s => s.best_gain_percent || 0);
        const successful = gains.filter(g => g > 0).length;
        
        return {
            best_gain: Math.max(...gains),
            avg_gain: gains.reduce((sum, g) => sum + g, 0) / gains.length,
            total_signals: signals.length,
            success_rate: (successful / signals.length) * 100
        };
    }
}

/**
 * Factory function to create appropriate API client
 */
export function createAPIClient(type, baseURL, options = {}) {
    switch (type) {
        case 'backtester':
            return new BacktesterAPI(baseURL, options);
        case 'signal':
            return new SignalAPI(baseURL, options);
        default:
            return new APIClient(baseURL, options);
    }
}