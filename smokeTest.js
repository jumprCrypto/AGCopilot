// Simple smoke test for modular AGCopilot components (Node environment)
// Note: This does not execute DOM/UI code; it validates namespace wiring and critical method availability.

const fs = require('fs');
const vm = require('vm');
const path = require('path');

// Minimal browser-ish globals
global.window = global;
window.fetch = async function(url){
  // Return minimal JSON for api.fetchWithRetry tests if invoked (not called in this smoke test by default)
  return { ok: true, json: async ()=>({}) };
};

window.AG = {};

function loadModule(rel){
  const p = path.join(__dirname, 'src', rel);
  const code = fs.readFileSync(p,'utf8');
  vm.runInThisContext(code, { filename: rel });
  console.log('[SMOKE] Loaded', rel);
}

const modules = ['constants.js','utils.js','rateLimiter.js','api.js','scoring.js','signalAnalysis.js','optimizer.js','ui.js','bridge.js'];
modules.forEach(loadModule);

// Assertions
function assert(cond, msg){ if(!cond){ throw new Error('Assertion failed: '+msg); } }

assert(window.AG.constants && window.AG.constants.CONFIG, 'CONFIG present');
assert(typeof window.AG.utils.formatMcap === 'function', 'formatMcap function');
assert(window.AG.api && typeof window.AG.api.BacktesterAPI === 'function', 'BacktesterAPI class');
assert(window.AG.signals && typeof window.AG.signals.analyzeSignalCriteria === 'function', 'signals analyze function');
assert(window.AG.optimizer && window.AG.optimizer.EnhancedOptimizer, 'EnhancedOptimizer present');
assert(window.AG.ui && typeof window.AG.ui.formatConfigForDisplay === 'function', 'UI format function');

console.log('\n[SMOKE] Core module presence checks passed.');

// Instantiate API (no network call)
const api = new window.AG.api.BacktesterAPI();
const sampleConfig = { basic: { 'Min MCAP (USD)': 1000, 'Max MCAP (USD)': 5000 } };
const mapped = api.mapParametersToAPI(sampleConfig);
console.log('[SMOKE] Mapped parameters:', mapped);

console.log('\n[SMOKE] All tests completed successfully.');
