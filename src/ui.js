(function() {
  // UI module (duplicate extraction) - attaches to window.AG.ui
  if (!window.AG) window.AG = {};
  if (window.AG.ui) {
    console.log('[AG.ui] UI module already loaded');
    return;
  }

  const AGNS = window.AG;
  const CONFIG = (AGNS.constants && AGNS.constants.CONFIG) || window.CONFIG || {};
  const PRESETS = (AGNS.constants && AGNS.constants.PRESETS) || window.PRESETS || {};
  const sleep = (AGNS.utils && AGNS.utils.sleep) || (ms => new Promise(r => setTimeout(r, ms)));

  // Local state mirrors legacy globals (do NOT modify legacy usage yet)
  let isSplitScreenMode = false;
  const COPILOT_WIDTH = 420;

  function updateStatus(message, isError = false) {
    const icon = isError ? '❌' : '📝';
    console.log(`${icon} ${message}`);
  }

  // ---- Preset helpers ----
  function getPresetDisplayName(presetKey, presetConfig) {
    if (presetConfig && presetConfig.description) {
      const priorityIcon = (presetConfig.priority <= 3) ? '🏆 ' :
                           (presetConfig.priority <= 5) ? '🔥 ' :
                           (presetConfig.priority <= 10) ? '⭐ ' : '';
      return `${priorityIcon}${presetConfig.description}`;
    }
    return presetKey
      .replace(/([A-Z])/g, ' $1')
      .replace(/([0-9]+)/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  function generatePresetOptions() {
    let options = '<option value="">-- Select a Preset --</option>';
    const sortedPresets = Object.entries(PRESETS).sort(([a, ca],[b, cb]) => (ca.priority||999) - (cb.priority||999));
    let currentCategory = null;
    sortedPresets.forEach(([key, cfg]) => {
      if (cfg.category && cfg.category !== currentCategory) {
        currentCategory = cfg.category;
        options += `<optgroup label="── ${currentCategory} ──">`;
      }
      const displayName = getPresetDisplayName(key, cfg);
      options += `<option value="${key}">${displayName}</option>`;
    });
    return options;
  }

  // ---- Split screen controls (duplicate) ----
  function enableSplitScreen() {
    const ui = document.getElementById('ag-copilot-enhanced-ui');
    const collapsedUI = document.getElementById('ag-copilot-collapsed-ui');
    const body = document.body;
    if (!ui) return;
    if (window.innerWidth < 1200) {
      console.log('⚠️ Screen too narrow for split-screen mode (minimum 1200px required)');
      return;
    }
    if (!body.dataset.originalMargin) {
      body.dataset.originalMargin = body.style.marginRight || '0px';
      body.dataset.originalWidth = body.style.width || 'auto';
      body.dataset.originalMaxWidth = body.style.maxWidth || 'none';
      body.dataset.originalOverflowX = body.style.overflowX || 'visible';
    }
    body.style.marginRight = `${COPILOT_WIDTH}px`;
    body.style.transition = 'margin-right 0.3s ease';
    body.style.overflowX = 'hidden';
    ui.style.position = 'fixed';
    ui.style.top = '0px';
    ui.style.right = '0px';
    ui.style.width = `${COPILOT_WIDTH}px`;
    ui.style.height = '100vh';
    ui.style.borderRadius = '0px';
    ui.style.maxHeight = '100vh';
    ui.style.border = '1px solid #2d3748';
    ui.style.borderRight = 'none';
    ui.style.transition = 'all 0.3s ease';
    if (collapsedUI) collapsedUI.style.right = '10px';
    isSplitScreenMode = true;
  }
  function disableSplitScreen() {
    const ui = document.getElementById('ag-copilot-enhanced-ui');
    const collapsedUI = document.getElementById('ag-copilot-collapsed-ui');
    const body = document.body;
    if (!ui) return;
    body.style.marginRight = body.dataset.originalMargin || '0px';
    body.style.width = body.dataset.originalWidth || 'auto';
    body.style.maxWidth = body.dataset.originalMaxWidth || 'none';
    body.style.overflowX = body.dataset.originalOverflowX || 'visible';
    body.style.transition = 'margin-right 0.3s ease';
    ui.style.position = 'fixed';
    ui.style.top = '20px';
    ui.style.right = '20px';
    ui.style.width = `${COPILOT_WIDTH}px`;
    ui.style.height = 'auto';
    ui.style.borderRadius = '8px';
    ui.style.maxHeight = '90vh';
    ui.style.border = '1px solid #2d3748';
    ui.style.transition = 'all 0.3s ease';
    if (collapsedUI) collapsedUI.style.right = '20px';
    isSplitScreenMode = false;
  }
  function toggleSplitScreen() { isSplitScreenMode ? disableSplitScreen() : enableSplitScreen(); }
  function cleanupSplitScreen() { if (isSplitScreenMode) disableSplitScreen(); }

  // ---- Full UI creation (duplicate of legacy createUI) ----
  function createFullUI() {
    if (document.getElementById('ag-copilot-enhanced-ui')) return document.getElementById('ag-copilot-enhanced-ui');
    const ui = document.createElement('div');
    ui.id = 'ag-copilot-enhanced-ui';
    ui.style.cssText = 'position:fixed;top:20px;right:20px;width:420px;background:#1a2332;border:1px solid #2d3748;border-radius:8px;padding:0;z-index:10000;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',system-ui,sans-serif;color:#e2e8f0;box-shadow:0 20px 25px -5px rgba(0,0,0,.1),0 10px 10px -5px rgba(0,0,0,.04);max-height:90vh;overflow:hidden;display:flex;flex-direction:column;';
    // Inject trimmed innerHTML (kept identical for parity). For brevity we generate preset options dynamically.
    ui.innerHTML = `
      <div id="ui-header" style="padding:16px 20px;background:#2d3748;border-bottom:1px solid #4a5568;border-radius:8px 8px 0 0;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:8px;height:8px;background:#48bb78;border-radius:50%;animation:pulse 2s infinite;"></div>
            <h3 style="margin:0;font-size:16px;font-weight:600;color:#f7fafc;">🤖 AG Copilot Enhanced</h3>
          </div>
          <div style="display:flex;gap:8px;">
            <button id="collapse-ui-btn" style="background:#4a5568;border:1px solid #718096;border-radius:4px;color:#e2e8f0;cursor:pointer;padding:6px 10px;font-size:11px;font-weight:500;">➖</button>
            <button id="close-ui-btn" style="background:#e53e3e;border:1px solid #c53030;border-radius:4px;color:#fff;cursor:pointer;padding:6px 10px;font-size:11px;font-weight:500;">✕</button>
          </div>
        </div>
      </div>
      <div id="ui-content" style="flex:1;overflow-y:auto;">
        <div style="display:flex;background:#2d3748;border-bottom:1px solid #4a5568;">
          <button class="tab-button active" onclick="switchTab('config-tab')" id="config-tab-btn">⚙️ Configuration</button>
          <button class="tab-button" onclick="switchTab('signal-tab')" id="signal-tab-btn">🔍 Signal Analysis</button>
        </div>
        <div id="config-tab" class="tab-content active" style="padding:16px 20px;">
          <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;margin-bottom:12px;">
            <div>
              <label style="font-size:11px;font-weight:500;color:#a0aec0;display:block;margin-bottom:4px;">Quick Presets</label>
              <select id="preset-dropdown" style="width:100%;padding:6px 10px;background:#2d3748;border:1px solid #4a5568;border-radius:4px;color:#e2e8f0;font-size:11px;">${generatePresetOptions()}</select>
            </div>
            <div>
              <label style="font-size:11px;font-weight:500;color:#a0aec0;display:block;margin-bottom:4px;">Trigger Mode</label>
              <select id="trigger-mode-select" style="width:100%;padding:6px 10px;background:#2d3748;border:1px solid #4a5568;border-radius:4px;color:#e2e8f0;font-size:11px;">
                <option value="0">Bullish Bonding</option><option value="1">God Mode</option><option value="2">Moon Finder</option><option value="3">Fomo</option><option value="4" selected>Launchpads</option><option value="5">Smart Tracker</option>
              </select>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
            <div><label style="font-size:11px;font-weight:500;color:#a0aec0;display:block;margin-bottom:2px;">From Date (optional)</label><input type="date" id="from-date" style="width:100%;padding:4px 8px;background:#2d3748;border:1px solid #4a5568;border-radius:4px;color:#e2e8f0;font-size:10px;"/></div>
            <div><label style="font-size:10px;font-weight:500;color:#a0aec0;display:block;margin-bottom:2px;">To Date (optional)</label><input type="date" id="to-date" style="width:100%;padding:4px 8px;background:#2d3748;border:1px solid #4a5568;border-radius:4px;color:#e2e8f0;font-size:10px;"/></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-bottom:10px;">
            <div><label style="font-size:10px;font-weight:500;color:#a0aec0;display:block;margin-bottom:3px;">Target PnL %</label><input type="number" id="target-pnl" value="100" style="width:100%;padding:5px 6px;background:#2d3748;border:1px solid #4a5568;border-radius:4px;color:#e2e8f0;font-size:10px;text-align:center;"/></div>
            <div><label style="font-size:10px;font-weight:500;color:#a0aec0;display:block;margin-bottom:3px;">Min Tokens</label><input type="number" id="min-tokens" value="75" style="width:100%;padding:5px 6px;background:#2d3748;border:1px solid #4a5568;border-radius:4px;color:#e2e8f0;font-size:10px;text-align:center;"/></div>
            <div><label style="font-size:10px;font-weight:500;color:#a0aec0;display:block;margin-bottom:3px;">Runtime (min)</label><input type="number" id="runtime-min" value="15" style="width:100%;padding:5px 6px;background:#2d3748;border:1px solid #4a5568;border-radius:4px;color:#e2e8f0;font-size:10px;text-align:center;"/></div>
            <div><label style="font-size:10px;font-weight:500;color:#a0aec0;display:block;margin-bottom:3px;">Chain Runs</label><input type="number" id="chain-run-count" value="4" style="width:100%;padding:5px 6px;background:#2d3748;border:1px solid #4a5568;border-radius:4px;color:#e2e8f0;font-size:10px;text-align:center;"/></div>
          </div>
          <div id="best-config-display" style="background:rgba(72,187,120,0.1);border:1px solid rgba(72,187,120,0.3);border-radius:6px;padding:16px;margin:16px 0;display:block;">
            <h5 id="best-config-header" style="margin:0 0 12px 0;font-size:13px;font-weight:600;color:#48bb78;display:flex;align-items:center;gap:6px;">⏳ Optimization Configuration</h5>
            <div id="best-config-stats" style="font-size:12px;margin-bottom:12px;color:#e2e8f0;"></div>
            <div style="margin-bottom:12px;">
              <div style="margin-bottom:12px;"><button id="start-optimization" style="width:100%;padding:12px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border:none;border-radius:6px;color:#fff;font-weight:600;cursor:pointer;font-size:14px;">🚀 Start Enhanced Optimization</button></div>
              <div style="margin-bottom:12px;"><button id="stop-optimization" style="width:100%;padding:10px;background:#e53e3e;border:1px solid #c53030;border-radius:6px;color:#fff;font-weight:500;cursor:pointer;font-size:12px;display:none;">⏹️ Stop Optimization</button></div>
            </div>
          </div>
        </div>
        <div id="signal-tab" class="tab-content" style="display:none;padding:16px 20px;">Signal Analysis Coming (modular placeholder)</div>
      </div>`;
    document.body.appendChild(ui);
    // collapsed placeholder
    if (!document.getElementById('ag-copilot-collapsed-ui')) {
      const collapsedUI = document.createElement('div');
      collapsedUI.id = 'ag-copilot-collapsed-ui';
      collapsedUI.style.cssText = 'position:fixed;top:20px;right:20px;width:120px;height:60px;background:#1a2332;border:1px solid #2d3748;border-radius:8px;padding:8px;z-index:10000;display:none;cursor:pointer;';
      collapsedUI.innerHTML = '<div style="text-align:center;display:flex;flex-direction:column;justify-content:center;height:100%;"><div style="width:8px;height:8px;background:#48bb78;border-radius:50%;margin:0 auto 4px;animation:pulse 2s infinite;"></div><div style="font-size:14px;">🤖</div><div style="font-size:9px;font-weight:600;">AG Copilot</div><div style="font-size:7px;opacity:.7;">Click to expand</div></div>';
      collapsedUI.addEventListener('click', () => { ui.style.display='block'; collapsedUI.style.display='none'; enableSplitScreen(); });
      document.body.appendChild(collapsedUI);
    }
    // switchTab helper
    window.switchTab = function(activeTabId){
      document.querySelectorAll('.tab-button').forEach(btn=>btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
      const activeButton = document.getElementById(activeTabId + '-btn'); if (activeButton) activeButton.classList.add('active');
      const activeContent = document.getElementById(activeTabId); if (activeContent) activeContent.classList.add('active');
    };
    setTimeout(()=>{ if (window.innerWidth>=1200) enableSplitScreen(); },100);
    return ui;
  }

  // Register event handlers (subset of legacy) - safe id existence checks
  function registerEventHandlers() {
    const safeAdd = (id, evt, handler)=>{ const el=document.getElementById(id); if(el) el.addEventListener(evt, handler); };
    safeAdd('collapse-ui-btn','click',()=>{ const ui=document.getElementById('ag-copilot-enhanced-ui'); const collapsed=document.getElementById('ag-copilot-collapsed-ui'); if(ui&&collapsed){ ui.style.display='none'; collapsed.style.display='flex'; disableSplitScreen(); }});
    safeAdd('close-ui-btn','click',()=>{ cleanupSplitScreen(); const ui=document.getElementById('ag-copilot-enhanced-ui'); const collapsed=document.getElementById('ag-copilot-collapsed-ui'); if(ui) ui.remove(); if(collapsed) collapsed.remove(); console.log('🚫 AG Copilot (modular) closed'); });
    safeAdd('start-optimization','click',()=>{ console.log('🚀 (modular) start optimization clicked'); });
    safeAdd('stop-optimization','click',()=>{ window.STOPPED = true; console.log('⏹️ (modular) stop optimization clicked'); });
  }

  // ---- Public API ----
  AGNS.ui = {
    generatePresetOptions,
    getPresetDisplayName,
    enableSplitScreen,
    disableSplitScreen,
    toggleSplitScreen,
    cleanupSplitScreen,
    createFullUI,
    registerEventHandlers,
    updateStatus
  };

  console.log('[AG.ui] UI module loaded (helpers + full UI creation)');
})();

// We'll re-open the IIFE to append additional helpers without editing earlier block
(function appendUiFormatting(){
  if (!window.AG || !window.AG.ui || window.AG.ui.formatConfigForDisplay) return;
  function formatConfigForDisplay(config){
    const lines=[]; const isClusterConfig = config.metadata && config.metadata.clusterInfo;
    if (isClusterConfig){
      lines.push(`🎯 CLUSTER ${config.metadata.clusterInfo.clusterId} CONFIG`);
      lines.push('═'.repeat(50));
      lines.push(`🔗 ${config.metadata.clusterInfo.clusterName}: ${config.metadata.clusterInfo.description}`);
      lines.push(`🎯 Tightness Score: ${config.metadata.clusterInfo.tightness.toFixed(3)} (lower = tighter)`);
      lines.push(`📏 Distance Threshold: ${config.metadata.clusterInfo.threshold}`);
    } else {
      lines.push('🎯 TIGHTEST GENERATED CONFIG');
      lines.push('═'.repeat(50));
    }
    if (config.metadata){
      const tokenText = config.metadata.basedOnTokens !== undefined ? `${config.metadata.basedOnTokens} tokens` : 'undefined tokens';
      lines.push(`📊 Based on: ${config.metadata.basedOnSignals} signals from ${tokenText}`);
      lines.push(`🛡️ Buffer: ${config.metadata.bufferPercent}%`);
      lines.push(`🎯 Outlier Filter: ${config.metadata.outlierMethod || 'none'}`);
      lines.push(`⏰ Generated: ${new Date(config.metadata.generatedAt).toLocaleString()}`);
    }
    lines.push('');
    lines.push('📈 BASIC CRITERIA:');
    if (config['Min MCAP (USD)']!==undefined || config['Max MCAP (USD)']!==undefined){
      const min=config['Min MCAP (USD)']||0; const max=config['Max MCAP (USD)']||'N/A'; lines.push(`MCAP: $${min} - $${max}`);
    }
    if (config['Min AG Score']!==undefined){ lines.push(`AG Score: ${config['Min AG Score']} - ${config['Max AG Score']||100}`); }
    if (config['Min Token Age (sec)']!==undefined || config['Max Token Age (sec)']!==undefined){
      const min=config['Min Token Age (sec)']||0; const max=config['Max Token Age (sec)']||'∞'; lines.push(`Token Age: ${min} - ${max} seconds`);
    }
    if (config['Min Deployer Age (min)']!==undefined){ lines.push(`Deployer Age: ${config['Min Deployer Age (min)']} - ∞ minutes`); }
    if (config['Min Deployer Balance (SOL)']!==undefined){ lines.push(`Deployer Balance: ${config['Min Deployer Balance (SOL)']} - ∞ SOL`); }
    lines.push('');
    lines.push('👥 WALLET CRITERIA:');
    if (config['Min Holders']!==undefined || config['Max Holders']!==undefined){ const min=config['Min Holders']||0; const max=config['Max Holders']||'∞'; lines.push(`Holders: ${min} - ${max}`);}    
    if (config['Min Unique Wallets']!==undefined || config['Max Unique Wallets']!==undefined){ const min=config['Min Unique Wallets']||0; const max=config['Max Unique Wallets']||'∞'; lines.push(`Unique Wallets: ${min} - ${max}`);}    
    if (config['Min KYC Wallets']!==undefined || config['Max KYC Wallets']!==undefined){ const min=config['Min KYC Wallets']||0; const max=config['Max KYC Wallets']||'∞'; lines.push(`KYC Wallets: ${min} - ${max}`);}    
    lines.push('');
    lines.push('💧 LIQUIDITY CRITERIA:');
    if (config['Min Liquidity (USD)']!==undefined || config['Max Liquidity (USD)']!==undefined){ const min=config['Min Liquidity (USD)']||0; const max=config['Max Liquidity (USD)']||'∞'; lines.push(`Liquidity: $${min} - $${max}`);}    
    if (config['Max Liquidity %']!==undefined){ lines.push(`Liquidity %: 0% - ${config['Max Liquidity %']}%`);}    
    lines.push('');
    lines.push('📊 TRADING CRITERIA:');
    if (config['Min Buy Ratio %']!==undefined || config['Max Buy Ratio %']!==undefined){ const min=config['Min Buy Ratio %']||0; const max=config['Max Buy Ratio %']||100; lines.push(`Buy Volume %: ${min}% - ${max}%`);}    
    if (config['Min Vol MCAP %']!==undefined || config['Max Vol MCAP %']!==undefined){ const min=config['Min Vol MCAP %']||0; const max=config['Max Vol MCAP %']||'∞'; lines.push(`Vol/MCAP %: ${min}% - ${max}%`);}    
    lines.push('');
    lines.push('⚠️ RISK CRITERIA:');
    if (config['Min Bundled %']!==undefined || config['Max Bundled %']!==undefined){ const min=config['Min Bundled %']||0; const max=config['Max Bundled %']||100; lines.push(`Bundled %: ${min}% - ${max}%`);}    
    if (config['Max Drained %']!==undefined){ lines.push(`Drained %: 0% - ${config['Max Drained %']}%`);}    
    lines.push('');
    lines.push('🔘 BOOLEAN SETTINGS:');
    const boolToString = v => v===null?"Don't Care":(v?"Required":"Forbidden");
    if (config['Fresh Deployer']!==undefined){ lines.push(`Fresh Deployer: ${boolToString(config['Fresh Deployer'])}`);}    
    if (config['Description']!==undefined){ lines.push(`Has Description: ${boolToString(config['Description'])}`);}    
    lines.push('');
    lines.push('🔬 ADVANCED CRITERIA:');
    if (config['Min Win Pred %']!==undefined){ lines.push(`Win Prediction: ${config['Min Win Pred %']}% - 100%`);}    
    if (config['Min TTC (sec)']!==undefined || config['Max TTC (sec)']!==undefined){ const min=config['Min TTC (sec)']||0; const max=config['Max TTC (sec)']||'∞'; lines.push(`Time to Complete: ${min} - ${max} seconds`);}    
    lines.push('');
    lines.push('📊 CONFIG SUMMARY:');
    const paramCount = Object.keys(config).filter(k=>k!=='metadata').length; lines.push(`Total Parameters Set: ${paramCount}`);
    return lines.join('\n');
  }
  window.AG.ui.formatConfigForDisplay = formatConfigForDisplay;
  console.log('[AG.ui] Added formatConfigForDisplay helper');
})();

// Append interaction helpers (duplicate)
(function appendUiInteraction(){
  if (!window.AG || !window.AG.ui) return;
  const sleep = (window.AG.utils && window.AG.utils.sleep) || (ms=>new Promise(r=>setTimeout(r,ms)));
  if (window.AG.ui.setFieldValue) return; // already added

  async function setFieldValue(labelText, value, maxRetries=2){
    const shouldClear = (value===undefined || value===null || value==="" || value==="clear");
    for (let attempt=1; attempt<=maxRetries; attempt++){
      try {
        const labels = Array.from(document.querySelectorAll('.sidebar-label'));
        const label = labels.find(el=>el.textContent.trim()===labelText);
        if (!label) return false;
        let container = label.closest('.form-group') || label.parentElement;
        if (labelText === 'Description' || labelText === 'Fresh Deployer') {
          let toggleButton = container.querySelector('button');
          if (!toggleButton){
            let searchContainer = container.parentElement; let depth=0;
            while (searchContainer && depth<3){
              toggleButton = searchContainer.querySelector('button');
              if (toggleButton && toggleButton.textContent.trim() !== '×') break;
              toggleButton = null; searchContainer = searchContainer.parentElement; depth++;
            }
          }
          if (toggleButton && toggleButton.textContent.trim() !== '×'){
            const targetValue = value || "Don't care"; const currentValue = toggleButton.textContent.trim();
            if (currentValue !== targetValue){
              toggleButton.click(); await sleep(100);
              const newValue = toggleButton.textContent.trim();
              if (newValue !== targetValue && newValue !== currentValue){ toggleButton.click(); await sleep(100);} }
            return true;
          } else { return false; }
        }
        if (!container.querySelector('input[type="number"]') && !container.querySelector('select')){
          container = container.parentElement;
          if (!container.querySelector('input[type="number"]') && !container.querySelector('select')){
            container = container.parentElement;
          }
        }
        const input = container.querySelector('input[type="number"]');
        if (input){
          if (shouldClear){
            const relativeContainer = input.closest('.relative');
            const clearButton = relativeContainer?.querySelector('button');
            if (clearButton && clearButton.textContent.trim()==='×'){ clearButton.click(); await sleep(100);} else {
              input.focus(); input.value=''; input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})); input.blur(); }
          } else {
            let processedValue = value;
            if (typeof value==='string' && value.trim()!==''){ const parsed = parseFloat(value); if (!isNaN(parsed)) processedValue = parsed; }
            if (labelText.includes('Wallets') || labelText.includes('Count') || labelText.includes('Age') || labelText.includes('Score')) processedValue = Math.round(processedValue);
            if ((typeof processedValue==='number' && !isNaN(processedValue)) || (typeof processedValue==='string' && processedValue.trim()!=='')) {
              input.focus(); const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; setter.call(input, processedValue); input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})); input.blur(); }
          }
          return true;
        }
        const select = container.querySelector('select');
        if (select){ if (shouldClear){ select.selectedIndex=0; } else { select.value = value; } select.dispatchEvent(new Event('change',{bubbles:true})); return true; }
        await sleep(200);
      } catch(e){ if (attempt<maxRetries) await sleep(200); }
    }
    return false;
  }
  async function openSection(sectionTitle){
    const allHeaders = Array.from(document.querySelectorAll('button[type="button"]'));
    const sectionHeader = allHeaders.find(h=>h.textContent.includes(sectionTitle));
    if (sectionHeader){ sectionHeader.click(); await sleep(200); return true; }
    return false;
  }
  async function applyConfigToUI(config, skipStopCheck=false){
    if (!config){ console.log('❌ No configuration to apply'); return false; }
    console.log('⚙️ (AG.ui duplicate) Applying configuration to backtester UI...');
    const sectionMap = { basic:'Basic', tokenDetails:'Token Details', wallets:'Wallets', risk:'Risk', advanced:'Advanced'};
    let successCount=0,totalFields=0;
    try {
      for (const [section, sectionConfig] of Object.entries(config)){
        if (!skipStopCheck && window.STOPPED) return false;
        if (sectionConfig && typeof sectionConfig==='object'){
          const sectionName = sectionMap[section];
            if (sectionName){ await openSection(sectionName); await sleep(300); }
            for (const [param,value] of Object.entries(sectionConfig)){
              if (!skipStopCheck && window.STOPPED) return false;
              totalFields++; const success = await setFieldValue(param, value); if (success) successCount++; await sleep(150);
            }
            await sleep(200);
        }
      }
      if (config.dateRange){
        if (config.dateRange.fromDate){ const el=document.getElementById('from-date'); if (el){ el.value=config.dateRange.fromDate; totalFields++; successCount++; }}
        if (config.dateRange.toDate){ const el=document.getElementById('to-date'); if (el){ el.value=config.dateRange.toDate; totalFields++; successCount++; }}
      } else {
        const fd=document.getElementById('from-date'); const td=document.getElementById('to-date'); if (fd){ fd.value=''; totalFields++; successCount++; } if (td){ td.value=''; totalFields++; successCount++; }
      }
      const successRate = totalFields>0 ? (successCount/totalFields*100) : 0;
      console.log(`⚙️ (AG.ui) Applied ${successCount}/${totalFields} fields (${successRate.toFixed(1)}% success rate)`);
      return successRate>70;
    } catch(err){ console.log('❌ (AG.ui) Error applying configuration:', err.message); return false; }
  }
  window.AG.ui.setFieldValue = setFieldValue;
  window.AG.ui.openSection = openSection;
  window.AG.ui.applyConfigToUI = applyConfigToUI;
  console.log('[AG.ui] Added interaction helpers (non-invasive)');
})();
