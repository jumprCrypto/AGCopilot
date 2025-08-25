# 📦 AGCopilot Modular System

## Overview

The AGCopilot suite has been refactored from monolithic JavaScript files into a modular, maintainable architecture. This enables:

- **🔧 Easy Maintenance**: Focused, single-responsibility modules
- **📦 GitHub Loading**: Load modules directly from the repository
- **🎯 Selective Loading**: Only load what you need
- **🔄 Version Control**: Load specific versions or branches
- **♻️ Reusability**: Share components across tools

## 🚀 Quick Start

### Browser Console (Recommended)

**One-liner to load Enhanced AGCopilot:**
```javascript
import('https://raw.githubusercontent.com/jumprCrypto/AGCopilot/main/agcopilot-modular.js');
```

**Load specific tools:**
```javascript
// Load the module loader
const { loadAGCopilot } = await import('https://raw.githubusercontent.com/jumprCrypto/AGCopilot/main/modules/loader.js');

// Load Enhanced AGCopilot
const copilot = await loadAGCopilot('copilot');

// Load Legacy AGCopilot
const legacy = await loadAGCopilot('legacy');

// Load Signal Extractor
const extractor = await loadAGCopilot('signal-extractor');
```

### Bookmarklet

Create a bookmark with this JavaScript:
```javascript
javascript:(function(){const script=document.createElement('script');script.type='module';script.textContent="import('https://raw.githubusercontent.com/jumprCrypto/AGCopilot/main/agcopilot-modular.js');";document.head.appendChild(script);})();
```

## 📁 Module Structure

### Core Modules
- **`utils.js`** - Utility functions (sleep, formatting, deep cloning)
- **`config.js`** - Configuration constants and templates
- **`rate-limiter.js`** - Rate limiting for API requests
- **`api.js`** - API clients for backtester and signal services
- **`progress.js`** - Progress bars, notifications, spinners
- **`loader.js`** - Dynamic module loading system

### Specialized Modules
- **`optimization.js`** - Optimization algorithms (genetic, simulated annealing, etc.)
- **`ui-controller.js`** - UI manipulation and form handling

### Entry Points
- **`agcopilot.js`** - Enhanced AGCopilot with full feature set
- **`agcopilot-legacy.js`** - Legacy AGCopilot implementation *(coming soon)*
- **`signal-extractor.js`** - Signal extraction tool

## 🔧 Advanced Usage

### Manual Module Loading

```javascript
import { ModuleLoader } from 'https://raw.githubusercontent.com/jumprCrypto/AGCopilot/main/modules/loader.js';

const loader = new ModuleLoader();

// Load core modules
const coreModules = await loader.loadCoreModules();
const { sleep, deepClone } = coreModules.utils;
const { ENHANCED_CONFIG } = coreModules.config;

// Load specific module
const optimizationModule = await loader.loadModule('optimization');
const { GeneticOptimizer } = optimizationModule;
```

### Version/Branch Selection

```javascript
import { ModuleLoader } from 'https://raw.githubusercontent.com/jumprCrypto/AGCopilot/main/modules/loader.js';

const loader = new ModuleLoader();

// Load from specific branch
loader.setVersion('develop');
const devModule = await loader.loadModule('agcopilot');

// Load from specific commit
loader.setVersion('abc123def456');
const specificModule = await loader.loadModule('utils');
```

### Custom Configuration

```javascript
const { loadAGCopilot } = await import('https://raw.githubusercontent.com/jumprCrypto/AGCopilot/main/modules/loader.js');

// Load with custom options
const copilot = await loadAGCopilot('copilot', {
    MAX_RUNTIME_MIN: 60,
    USE_GENETIC_ALGORITHM: false,
    SCORING_MODE: 'robust'
});
```

## 🛠️ Development

### Creating New Modules

1. **Create module file**: `modules/my-module.js`
2. **Use ES6 exports**: Export functions and classes
3. **Import dependencies**: Use relative imports for local modules
4. **Document**: Add JSDoc comments

Example module:
```javascript
/**
 * @fileoverview My Custom Module
 * @version 1.0.0
 */

import { sleep } from './utils.js';
import { ENHANCED_CONFIG } from './config.js';

export class MyClass {
    constructor(options = {}) {
        this.config = { ...ENHANCED_CONFIG, ...options };
    }
    
    async doSomething() {
        await sleep(1000);
        return 'done';
    }
}

export function myFunction() {
    return 'hello world';
}

export default { MyClass, myFunction };
```

### Testing Modules

```javascript
// Test individual module
const { myFunction } = await import('./modules/my-module.js');
console.log(myFunction()); // 'hello world'

// Test module loading
import { moduleLoader } from './modules/loader.js';
const myModule = await moduleLoader.loadModule('my-module');
console.log(myModule.myFunction());
```

## 📊 Available Tools

### 🚀 Enhanced AGCopilot (`copilot`)
- Direct API integration with backtester
- Genetic algorithms and simulated annealing
- Parameter impact analysis
- Configuration caching
- Real-time progress tracking

**Features:**
- Multi-objective optimization
- Robust scoring system
- Chain optimization runs
- Advanced rate limiting

### 🔧 Legacy AGCopilot (`legacy`) *(coming soon)*
- Original UI-based optimization
- Proven optimization strategies
- Compatible with existing workflows

### 📊 Signal Extractor (`signal-extractor`)
- Batch token analysis
- Google Sheets export formats
- Multiple trigger mode filtering
- Customizable signal limits

**Export Formats:**
- Custom TSV (optimized for sheets)
- Detailed TSV (comprehensive data)
- Header toggle option

## 🔍 API Reference

### ModuleLoader

```javascript
const loader = new ModuleLoader(options);

// Options
{
    baseURL: 'https://raw.githubusercontent.com/jumprCrypto/AGCopilot/main/modules/',
    version: 'main'
}

// Methods
await loader.loadModule(name, useCache)
await loader.loadModules(names, useCache)
await loader.loadCoreModules()
loader.clearCache(moduleName)
loader.setVersion(version)
```

### loadAGCopilot Function

```javascript
await loadAGCopilot(tool, options)

// Parameters
tool: 'copilot' | 'legacy' | 'signal-extractor'
options: Configuration overrides
```

## 🐛 Troubleshooting

### Common Issues

**CORS Errors:**
- Use a browser that supports ES6 modules from external sources
- Some browsers may block external module loading

**Module Not Found:**
- Check network connectivity
- Verify the GitHub repository is accessible
- Try a different branch/version

**Loading Failures:**
- Clear browser cache
- Check browser console for detailed errors
- Ensure JavaScript is enabled

### Debug Mode

```javascript
// Enable debug logging
import { moduleLoader } from './modules/loader.js';
console.log(moduleLoader.getStatus());

// Check loaded modules
console.log('Loaded modules:', moduleLoader.getStatus().loadedModules);

// Clear cache and reload
moduleLoader.clearCache();
const freshModule = await moduleLoader.loadModule('utils');
```

## 📈 Migration Guide

### From Monolithic Files

**Before (monolithic):**
```javascript
// Copy/paste entire file content into console
(async function() {
    // 3000+ lines of code...
})();
```

**After (modular):**
```javascript
// One-liner in console
import('https://raw.githubusercontent.com/jumprCrypto/AGCopilot/main/agcopilot-modular.js');
```

### Benefits of Migration

1. **Smaller Initial Load**: Only load what you need
2. **Better Caching**: Modules cache individually
3. **Easier Updates**: Update specific components
4. **Reduced Conflicts**: Isolated namespaces
5. **Better Testing**: Test individual components

## 🔮 Future Enhancements

- **Hot Reloading**: Update modules without full reload
- **Plugin System**: Third-party module support
- **CDN Distribution**: Faster module loading
- **Bundle Optimization**: Pre-built module bundles
- **TypeScript Support**: Type definitions for modules

---

## 💡 Tips & Best Practices

- **Use Latest Version**: Always load from `main` branch for stability
- **Cache Wisely**: Clear cache when debugging, use cache in production
- **Handle Errors**: Wrap loading in try-catch blocks
- **Version Pin**: Pin to specific commits for critical applications
- **Monitor Performance**: Check network tab for loading times

---

*For support, issues, or feature requests, please visit the [AGCopilot GitHub repository](https://github.com/jumprCrypto/AGCopilot).*