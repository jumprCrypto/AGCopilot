/**
 * @fileoverview Module loader for AGCopilot - enables dynamic loading from GitHub
 * @version 1.0.0
 */

/**
 * AGCopilot Module Loader
 * Enables loading modules directly from GitHub in browser console
 */
export class ModuleLoader {
    constructor(options = {}) {
        this.baseURL = options.baseURL || 'https://raw.githubusercontent.com/jumprCrypto/AGCopilot/main/modules/';
        this.cache = new Map();
        this.loadedModules = new Map();
        this.version = options.version || 'main'; // Allow version/branch selection
    }
    
    /**
     * Load a single module
     * @param {string} moduleName - Name of the module (without .js extension)
     * @param {boolean} useCache - Whether to use cached version
     * @returns {Promise<Object>} Module exports
     */
    async loadModule(moduleName, useCache = true) {
        if (useCache && this.loadedModules.has(moduleName)) {
            return this.loadedModules.get(moduleName);
        }
        
        try {
            const moduleURL = `${this.baseURL}${moduleName}.js`;
            console.log(`📦 Loading module: ${moduleName} from ${moduleURL}`);
            
            // Use dynamic import for ES6 modules
            const module = await import(moduleURL);
            
            this.loadedModules.set(moduleName, module);
            console.log(`✅ Module loaded successfully: ${moduleName}`);
            
            return module;
            
        } catch (error) {
            console.error(`❌ Failed to load module ${moduleName}:`, error);
            throw new Error(`Failed to load module ${moduleName}: ${error.message}`);
        }
    }
    
    /**
     * Load multiple modules in parallel
     * @param {string[]} moduleNames - Array of module names
     * @param {boolean} useCache - Whether to use cached versions
     * @returns {Promise<Object>} Object with module names as keys and exports as values
     */
    async loadModules(moduleNames, useCache = true) {
        const promises = moduleNames.map(name => 
            this.loadModule(name, useCache).then(module => ({ name, module }))
        );
        
        try {
            const results = await Promise.all(promises);
            const modules = {};
            
            results.forEach(({ name, module }) => {
                modules[name] = module;
            });
            
            console.log(`✅ All modules loaded successfully: ${moduleNames.join(', ')}`);
            return modules;
            
        } catch (error) {
            console.error('❌ Failed to load some modules:', error);
            throw error;
        }
    }
    
    /**
     * Load core AGCopilot modules
     * @returns {Promise<Object>} Core modules object
     */
    async loadCoreModules() {
        const coreModules = [
            'utils',
            'config',
            'rate-limiter',
            'api',
            'progress'
        ];
        
        return this.loadModules(coreModules);
    }
    
    /**
     * Load optimization modules
     * @returns {Promise<Object>} Optimization modules object
     */
    async loadOptimizationModules() {
        const optimizationModules = [
            'optimization',
            'ui-controller'
        ];
        
        return this.loadModules(optimizationModules);
    }
    
    /**
     * Get loaded module
     * @param {string} moduleName - Name of the module
     * @returns {Object|null} Module exports or null if not loaded
     */
    getModule(moduleName) {
        return this.loadedModules.get(moduleName) || null;
    }
    
    /**
     * Check if module is loaded
     * @param {string} moduleName - Name of the module
     * @returns {boolean} True if module is loaded
     */
    isModuleLoaded(moduleName) {
        return this.loadedModules.has(moduleName);
    }
    
    /**
     * Clear module cache
     * @param {string} moduleName - Optional specific module to clear, or all if not specified
     */
    clearCache(moduleName = null) {
        if (moduleName) {
            this.loadedModules.delete(moduleName);
            this.cache.delete(moduleName);
            console.log(`🗑️ Cleared cache for module: ${moduleName}`);
        } else {
            this.loadedModules.clear();
            this.cache.clear();
            console.log('🗑️ Cleared all module cache');
        }
    }
    
    /**
     * Reload a module (bypasses cache)
     * @param {string} moduleName - Name of the module to reload
     * @returns {Promise<Object>} Reloaded module exports
     */
    async reloadModule(moduleName) {
        this.clearCache(moduleName);
        return this.loadModule(moduleName, false);
    }
    
    /**
     * Get module loading status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            baseURL: this.baseURL,
            version: this.version,
            loadedModules: Array.from(this.loadedModules.keys()),
            cacheSize: this.loadedModules.size
        };
    }
    
    /**
     * Set version/branch for module loading
     * @param {string} version - Version or branch name
     */
    setVersion(version) {
        this.version = version;
        this.baseURL = `https://raw.githubusercontent.com/jumprCrypto/AGCopilot/${version}/modules/`;
        console.log(`📦 Module loader version set to: ${version}`);
    }
}

/**
 * Global module loader instance
 */
export const moduleLoader = new ModuleLoader();

/**
 * Convenience function to load AGCopilot quickly
 * @param {string} tool - Tool to load ('copilot', 'legacy', 'signal-extractor')
 * @param {Object} options - Loading options
 */
export async function loadAGCopilot(tool = 'copilot', options = {}) {
    console.clear();
    console.log('%c🤖 AGCopilot Module Loader v1.0 🤖', 'color: blue; font-size: 16px; font-weight: bold;');
    console.log('%c📦 Loading modular AGCopilot from GitHub...', 'color: green; font-size: 12px;');
    
    try {
        // Load core modules first
        console.log('📦 Loading core modules...');
        const coreModules = await moduleLoader.loadCoreModules();
        
        // Load tool-specific modules
        let toolModule;
        switch (tool) {
            case 'legacy':
                console.log('📦 Loading AGCopilot Legacy...');
                toolModule = await moduleLoader.loadModule('agcopilot-legacy');
                break;
            case 'signal-extractor':
                console.log('📦 Loading Signal Extractor...');
                toolModule = await moduleLoader.loadModule('signal-extractor');
                break;
            case 'copilot':
            default:
                console.log('📦 Loading AGCopilot Enhanced...');
                toolModule = await moduleLoader.loadModule('agcopilot');
                break;
        }
        
        console.log('✅ All modules loaded successfully!');
        console.log('🎮 Initializing tool...');
        
        // Initialize the tool
        if (toolModule && typeof toolModule.initialize === 'function') {
            return await toolModule.initialize(options);
        } else if (toolModule && typeof toolModule.main === 'function') {
            return await toolModule.main(options);
        } else {
            console.warn('⚠️ Tool module does not have initialize() or main() function');
            return toolModule;
        }
        
    } catch (error) {
        console.error('❌ Failed to load AGCopilot:', error);
        throw error;
    }
}

/**
 * One-liner for quick AGCopilot loading in browser console
 * Usage examples:
 * - window.AGCopilot.load() // Load default copilot
 * - window.AGCopilot.load('legacy') // Load legacy version
 * - window.AGCopilot.load('signal-extractor') // Load signal extractor
 */
if (typeof window !== 'undefined') {
    window.AGCopilot = {
        load: loadAGCopilot,
        loader: moduleLoader,
        version: '1.0.0'
    };
}

// Also export for ES6 import usage
export { loadAGCopilot as load };
export default {
    load: loadAGCopilot,
    loader: moduleLoader,
    ModuleLoader
};