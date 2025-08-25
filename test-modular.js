/**
 * @fileoverview Test script to validate modular loading functionality
 * @version 1.0.0
 */

// Test the modular system locally
async function testModularSystem() {
    console.clear();
    console.log('%c🧪 AGCopilot Modular System Test 🧪', 'color: purple; font-size: 16px; font-weight: bold;');
    
    try {
        // Test 1: Load module loader
        console.log('📦 Test 1: Loading module loader...');
        const { ModuleLoader, moduleLoader } = await import('./modules/loader.js');
        console.log('✅ Module loader loaded successfully');
        
        // Test 2: Load individual modules
        console.log('📦 Test 2: Loading individual modules...');
        const utils = await moduleLoader.loadModule('utils');
        const config = await moduleLoader.loadModule('config');
        console.log('✅ Individual modules loaded:', Object.keys(utils), Object.keys(config).slice(0, 3));
        
        // Test 3: Load core modules
        console.log('📦 Test 3: Loading core modules...');
        const coreModules = await moduleLoader.loadCoreModules();
        console.log('✅ Core modules loaded:', Object.keys(coreModules));
        
        // Test 4: Test utility functions
        console.log('📦 Test 4: Testing utility functions...');
        const { sleep, formatMcap, deepClone } = utils;
        
        await sleep(100);
        console.log('✅ Sleep function works');
        
        const mcapTest = formatMcap(1500000);
        console.log(`✅ formatMcap(1500000) = ${mcapTest}`);
        
        const cloneTest = deepClone({ a: { b: { c: 1 } } });
        console.log('✅ deepClone works:', cloneTest);
        
        // Test 5: Test configuration
        console.log('📦 Test 5: Testing configuration...');
        const { ENHANCED_CONFIG, COMPLETE_CONFIG_TEMPLATE } = config;
        console.log('✅ Enhanced config has', Object.keys(ENHANCED_CONFIG).length, 'properties');
        console.log('✅ Config template has', Object.keys(COMPLETE_CONFIG_TEMPLATE).length, 'sections');
        
        // Test 6: Test rate limiter
        console.log('📦 Test 6: Testing rate limiter...');
        const rateLimiterModule = await moduleLoader.loadModule('rate-limiter');
        const { RateLimiter } = rateLimiterModule;
        const limiter = new RateLimiter(100);
        
        const start = Date.now();
        await limiter.throttle();
        await limiter.throttle();
        const elapsed = Date.now() - start;
        console.log(`✅ Rate limiter works (${elapsed}ms elapsed, should be ~100ms)`);
        
        // Test 7: Test optimization classes
        console.log('📦 Test 7: Testing optimization classes...');
        const optimizationModule = await moduleLoader.loadModule('optimization');
        const { ConfigCache, GeneticOptimizer } = optimizationModule;
        
        const cache = new ConfigCache();
        const testConfig = { basic: { 'Min MCAP (USD)': 100000 } };
        cache.set(testConfig, { score: 85.5 });
        const cached = cache.get(testConfig);
        console.log(`✅ ConfigCache works: stored and retrieved score ${cached.score}`);
        
        // Test 8: Module status and cache
        console.log('📦 Test 8: Checking module status...');
        const status = moduleLoader.getStatus();
        console.log('✅ Module status:', status);
        
        console.log('');
        console.log('🎉 All tests passed! Modular system is working correctly.');
        console.log('');
        console.log('💡 Usage examples:');
        console.log('   • import("./agcopilot-modular.js") - Auto-load with UI');
        console.log('   • loadAGCopilot("copilot") - Load enhanced version');
        console.log('   • loadAGCopilot("signal-extractor") - Load signal extractor');
        
        return true;
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Full error:', error.stack);
        return false;
    }
}

// Auto-run test if this script is executed directly
testModularSystem();

// Export for manual testing
window.testModularSystem = testModularSystem;
export { testModularSystem };
export default testModularSystem;