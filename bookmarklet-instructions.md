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
