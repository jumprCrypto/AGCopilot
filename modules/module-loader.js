// ========================================
// 🔄 MODULE LOADER - Dynamic GitHub Module Loading
// ========================================

/**
 * Dynamic module loader for AG Copilot Enhanced
 * Loads modules from GitHub repository for modular architecture
 */
export class ModuleLoader {
    constructor(baseUrl = 'https://raw.githubusercontent.com/jumprCrypto/AGCopilot/main/modules') {
        this.baseUrl = baseUrl;
        this.loadedModules = new Map();
        this.loadingPromises = new Map();
    }

    /**
     * Load a module from GitHub
     * @param {string} moduleName - Name of the module (without .js extension)
     * @param {boolean} forceReload - Force reload even if already cached
     * @returns {Promise<object>} Module exports
     */
    async loadModule(moduleName, forceReload = false) {
        const moduleKey = moduleName.toLowerCase();
        
        // Return cached module if available and not forcing reload
        if (!forceReload && this.loadedModules.has(moduleKey)) {
            return this.loadedModules.get(moduleKey);
        }

        // If already loading, return the existing promise
        if (this.loadingPromises.has(moduleKey)) {
            return this.loadingPromises.get(moduleKey);
        }

        // Create loading promise
        const loadingPromise = this._fetchAndEvaluateModule(moduleName);
        this.loadingPromises.set(moduleKey, loadingPromise);

        try {
            const moduleExports = await loadingPromise;
            this.loadedModules.set(moduleKey, moduleExports);
            this.loadingPromises.delete(moduleKey);
            return moduleExports;
        } catch (error) {
            this.loadingPromises.delete(moduleKey);
            throw error;
        }
    }

    /**
     * Load multiple modules in parallel
     * @param {string[]} moduleNames - Array of module names
     * @param {boolean} forceReload - Force reload even if already cached
     * @returns {Promise<object>} Object with module names as keys and exports as values
     */
    async loadModules(moduleNames, forceReload = false) {
        const loadPromises = moduleNames.map(async name => {
            const exports = await this.loadModule(name, forceReload);
            return { name, exports };
        });

        const results = await Promise.all(loadPromises);
        
        const moduleExports = {};
        results.forEach(({ name, exports }) => {
            moduleExports[name] = exports;
        });

        return moduleExports;
    }

    /**
     * Fetch and evaluate a module from GitHub
     * @private
     */
    async _fetchAndEvaluateModule(moduleName) {
        const url = `${this.baseUrl}/${moduleName}.js`;
        
        console.log(`📦 Loading module: ${moduleName} from ${url}`);
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch module ${moduleName}: ${response.status} ${response.statusText}`);
            }
            
            const code = await response.text();
            
            // Create a module scope with exports object
            const moduleScope = {
                exports: {},
                console: console,
                fetch: fetch,
                setTimeout: setTimeout,
                setInterval: setInterval,
                clearTimeout: clearTimeout,
                clearInterval: clearInterval,
                Date: Date,
                Math: Math,
                JSON: JSON,
                window: window,
                document: document
            };
            
            // Transform ES6 export statements to CommonJS-style exports
            const transformedCode = this._transformExports(code);
            
            // Execute the module code in the created scope
            const moduleFunction = new Function(
                'exports', 'console', 'fetch', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
                'Date', 'Math', 'JSON', 'window', 'document',
                transformedCode + '\nreturn exports;'
            );
            
            const exports = moduleFunction(
                moduleScope.exports,
                moduleScope.console,
                moduleScope.fetch,
                moduleScope.setTimeout,
                moduleScope.setInterval,
                moduleScope.clearTimeout,
                moduleScope.clearInterval,
                moduleScope.Date,
                moduleScope.Math,
                moduleScope.JSON,
                moduleScope.window,
                moduleScope.document
            );
            
            console.log(`✅ Successfully loaded module: ${moduleName}`);
            return exports;
            
        } catch (error) {
            console.error(`❌ Failed to load module ${moduleName}:`, error);
            throw new Error(`Module loading failed for ${moduleName}: ${error.message}`);
        }
    }

    /**
     * Transform ES6 export statements to CommonJS-style
     * @private
     */
    _transformExports(code) {
        return code
            // Transform export const/let/var
            .replace(/export\s+(const|let|var)\s+([^=]+)\s*=/g, 'exports.$2 = ')
            // Transform export function
            .replace(/export\s+function\s+([^(]+)\s*\(/g, 'exports.$1 = function $1(')
            // Transform export class
            .replace(/export\s+class\s+([^{]+)\s*{/g, 'exports.$1 = class $1 {')
            // Transform export { ... }
            .replace(/export\s*{\s*([^}]+)\s*}/g, (match, exports) => {
                const exportList = exports.split(',').map(exp => exp.trim());
                return exportList.map(exp => `exports.${exp} = ${exp};`).join('\n');
            })
            // Transform import statements to use the passed modules
            .replace(/import\s+.*?from\s+['"]\.\/.*?['"];?\s*/g, '// $&')
            // Remove standalone export statements
            .replace(/export\s*;?\s*$/gm, '');
    }

    /**
     * Clear module cache
     */
    clearCache() {
        this.loadedModules.clear();
        this.loadingPromises.clear();
        console.log('🗑️ Module cache cleared');
    }

    /**
     * Get list of loaded modules
     */
    getLoadedModules() {
        return Array.from(this.loadedModules.keys());
    }

    /**
     * Check if a module is loaded
     */
    isModuleLoaded(moduleName) {
        return this.loadedModules.has(moduleName.toLowerCase());
    }
}

// Create global module loader instance
export const moduleLoader = new ModuleLoader();
