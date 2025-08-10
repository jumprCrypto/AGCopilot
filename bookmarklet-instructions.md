AGCopilot Bookmarklet Instructions
=====================================

1. Copy the following JavaScript code:

javascript:(async function(){try{console.log('🔄 Loading AGCopilot...');const r=await fetch('https://raw.githubusercontent.com/jumprCrypto/AGCopilot/refs/heads/main/AGCopilot.js');if(!r.ok)throw new Error(`HTTP ${r.status}`);eval(await r.text());console.log('✅ AGCopilot loaded!');}catch(e){console.error('❌ Load failed:',e);}})();

2. Create a new bookmark in Chrome:
   - Right-click on the bookmarks bar
   - Select "Add page..."
   - Name: "AGCopilot"
   - URL: Paste the JavaScript code above

3. Usage:
   - Navigate to your trading page
   - Click the "AGCopilot Enhanced" bookmark
   - The script will automatically load and run!

Benefits:
- One-click execution
- Always loads the latest version from GitHub
- Works on any page
- No need to open Dev Tools console

---

Modular Loader Bookmarklet (New)
--------------------------------

This version loads the manifest-driven modular build (constants/utils/.../main) instead of the monolith. Use this while we transition to full modular runtime.

1. Copy the following JavaScript code (minified loader bootstrap):

javascript:(function(){const base='https://raw.githubusercontent.com/jumprCrypto/AGCopilot/refs/heads/main/AGCopilot/src/';const loader=base+'loader.js';const vKey='AGCOPILOT_LOADED_V';if(window[vKey]){console.log('[AGCopilot] Already loaded v'+window[vKey]);if(window.AG&&window.AG.smoke){window.AG.smoke.run();}return;}console.log('🔄 Loading AGCopilot modular loader...');fetch(loader+'?t='+Date.now()).then(r=>{if(!r.ok)throw new Error(r.status);return r.text();}).then(c=>{(0,eval)(c);setTimeout(()=>{if(window.AG&&window.AG.constants){window[vKey]=window.AG.constants.VERSION;console.log('✅ AGCopilot modules loaded v'+window.AG.constants.VERSION);if(window.AG.smoke){window.AG.smoke.run();}}},800);}).catch(e=>console.error('❌ Loader fetch failed:',e));})();

2. Create a new bookmark (same steps as above) and name it "AGCopilot (Modular)".

3. Usage:
   - Navigate to the target page
   - Click the "AGCopilot (Modular)" bookmark
   - Loader will fetch manifest then sequentially fetch each module

Fallback / Recovery:
- If any module fails to load you'll see an abort message in console; you can still use the legacy bookmarklet.
- Cache busting is applied automatically via timestamp query parameter.

Notes:
- Loader is idempotent; re-clicking prints version & runs smoke test (if available) instead of reloading.
- For debugging: inspect window.AG (constants, utils, rateLimiting, api, scoring, signals, optimizer, ui, main, bridge, smoke).
- VERSION exposed at window.AG.constants.VERSION
