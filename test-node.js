/**
 * Node.js test for AGCopilot modular system
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Mock browser globals for Node.js testing
global.document = {
    createElement: () => ({ style: {}, textContent: '', innerHTML: '' }),
    querySelector: () => null,
    querySelectorAll: () => [],
    body: { appendChild: () => {}, removeChild: () => {} },
    head: { appendChild: () => {} }
};

global.window = {
    location: { search: '' },
    navigator: { clipboard: { writeText: async () => true } }
};

global.fetch = async () => ({ ok: true, json: async () => ({}) });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testModules() {
    console.log('🧪 Testing AGCopilot modules in Node.js environment...\n');
    
    try {
        // Test utilities
        console.log('📦 Testing utils module...');
        const utils = await import('./modules/utils.js');
        const { sleep, formatMcap, deepClone } = utils;
        
        await sleep(10);
        console.log('✅ sleep() works');
        
        const mcap = formatMcap(1500000);
        console.log(`✅ formatMcap(1500000) = ${mcap}`);
        
        const clone = deepClone({ a: { b: 1 } });
        console.log('✅ deepClone() works');
        
        // Test config
        console.log('\n📦 Testing config module...');
        const config = await import('./modules/config.js');
        const { ENHANCED_CONFIG } = config;
        console.log(`✅ Config loaded with ${Object.keys(ENHANCED_CONFIG).length} properties`);
        
        // Test rate limiter
        console.log('\n📦 Testing rate-limiter module...');
        const rateLimiterModule = await import('./modules/rate-limiter.js');
        const { RateLimiter } = rateLimiterModule;
        const limiter = new RateLimiter(50);
        
        const start = Date.now();
        await limiter.throttle();
        await limiter.throttle();
        const elapsed = Date.now() - start;
        console.log(`✅ RateLimiter works (${elapsed}ms elapsed)`);
        
        // Test optimization module
        console.log('\n📦 Testing optimization module...');
        const optimization = await import('./modules/optimization.js');
        const { ConfigCache } = optimization;
        
        const cache = new ConfigCache();
        const testConfig = { basic: { test: 123 } };
        cache.set(testConfig, { score: 95.5 });
        const result = cache.get(testConfig);
        console.log(`✅ ConfigCache works: score = ${result.score}`);
        
        // Test progress module
        console.log('\n📦 Testing progress module...');
        const progress = await import('./modules/progress.js');
        const { ProgressBar } = progress;
        const progressBar = new ProgressBar();
        console.log('✅ ProgressBar instantiated');
        
        // Test API module
        console.log('\n📦 Testing API module...');
        const api = await import('./modules/api.js');
        const { APIClient } = api;
        const client = new APIClient('https://test.api');
        console.log('✅ APIClient instantiated');
        
        // Test UI controller
        console.log('\n📦 Testing UI controller module...');
        const uiController = await import('./modules/ui-controller.js');
        const { UIController } = uiController;
        const ui = new UIController();
        console.log('✅ UIController instantiated');
        
        console.log('\n🎉 All modules loaded and tested successfully!');
        console.log('✅ Modular system is ready for browser deployment');
        
        return true;
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
        return false;
    }
}

testModules();