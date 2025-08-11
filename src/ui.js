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

  // ================================
  // Tracker + header helpers (ported for parity)
  // ================================
  function updateBestConfigHeader(state = 'idle') {
    const header = document.getElementById('best-config-header');
    if (!header) return;
    switch (state) {
      case 'idle':
        header.textContent = '⏳ Optimization Configuration';
        header.style.color = '#48bb78';
        break;
      case 'running':
        header.textContent = '🔄 Finding Best Configuration...';
        header.style.color = '#60a5fa';
        break;
      case 'completed':
        header.textContent = '🏆 Best Configuration Found';
        header.style.color = '#48bb78';
        break;
    }
  }

  function updateUIBackground(isCompleted = false){
    const bestConfigDisplay = document.getElementById('best-config-display');
    if (!bestConfigDisplay) return;
    if (isCompleted){
      bestConfigDisplay.style.border = '2px solid #48bb78';
      bestConfigDisplay.style.animation = 'successPulse 1.5s ease-in-out infinite';
      bestConfigDisplay.style.boxShadow = '0 0 15px rgba(72,187,120,0.3)';
      updateBestConfigHeader('completed');
      if (!document.getElementById('success-pulse-animation')){
        const style=document.createElement('style');
        style.id='success-pulse-animation';
        style.textContent='@keyframes successPulse {0%,100%{border-color:#48bb78;box-shadow:0 0 15px rgba(72,187,120,0.3);}50%{border-color:#68d391;box-shadow:0 0 30px rgba(72,187,120,0.6);}}';
        document.head.appendChild(style);
      }
    } else {
      bestConfigDisplay.style.border='1px solid #2d3748';
      bestConfigDisplay.style.animation='none';
      bestConfigDisplay.style.boxShadow='none';
      updateBestConfigHeader('idle');
    }
  }

  function updateProgress(message, progress, bestScore, testCount, totalTokens, startTime){
    if (startTime){
      const runtime = Math.floor((Date.now()-startTime)/1000);
      console.log(`📊 ${message} | Progress: ${(progress||0).toFixed(1)}% | Best: ${bestScore}% | Tests: ${testCount} | Tokens: ${totalTokens} | Runtime: ${runtime}s`);
    } else {
      console.log(`📊 ${message} | Progress: ${(progress||0).toFixed(1)}% | Best: ${bestScore}% | Tests: ${testCount} | Tokens: ${totalTokens}`);
    }
  }

  // Expose globally for modules expecting legacy globals
  window.updateProgress = window.updateProgress || updateProgress;
  window.updateBestConfigHeader = window.updateBestConfigHeader || updateBestConfigHeader;
  window.updateUIBackground = window.updateUIBackground || updateUIBackground;

  // Parity helpers required by optimizer (lightweight replicas)
  if (typeof window.ensureCompleteConfig !== 'function'){
    window.ensureCompleteConfig = function(config){
      try {
        const template = (window.AG?.constants?.COMPLETE_CONFIG_TEMPLATE) || { basic:{}, tokenDetails:{}, wallets:{}, risk:{}, advanced:{} };
        const clone = JSON.parse(JSON.stringify(template));
        for (const [section, sectionCfg] of Object.entries(config||{})){
          if (!clone[section]) clone[section] = {};
          Object.assign(clone[section], sectionCfg);
        }
        return clone;
      } catch(e){ return config; }
    };
  }
  if (typeof window.getScaledTokenThresholds !== 'function'){
    window.getScaledTokenThresholds = function(){
      const fromDate = document.getElementById('from-date')?.value || null;
      const toDate = document.getElementById('to-date')?.value || null;
      const DEFAULT_DAYS=7;
      let scalingFactor=1; if (fromDate && toDate){ try { const fd=new Date(fromDate), td=new Date(toDate); const diff=Math.max(1, Math.ceil((td-fd)/(1000*3600*24))); scalingFactor = diff/DEFAULT_DAYS; } catch(e){} }
      const base={ LARGE_SAMPLE_THRESHOLD:1000, MEDIUM_SAMPLE_THRESHOLD:500, MIN_TOKENS: (window.AG?.constants?.CONFIG?.MIN_TOKENS)||75 };
      const scaled={ LARGE_SAMPLE_THRESHOLD: Math.round(base.LARGE_SAMPLE_THRESHOLD*scalingFactor), MEDIUM_SAMPLE_THRESHOLD: Math.round(base.MEDIUM_SAMPLE_THRESHOLD*scalingFactor), MIN_TOKENS: Math.round(base.MIN_TOKENS*scalingFactor)};
      // enforce ordering
      if (scaled.MEDIUM_SAMPLE_THRESHOLD >= scaled.LARGE_SAMPLE_THRESHOLD) scaled.MEDIUM_SAMPLE_THRESHOLD = Math.floor(scaled.LARGE_SAMPLE_THRESHOLD*0.5);
      if (scaled.MIN_TOKENS >= scaled.MEDIUM_SAMPLE_THRESHOLD) scaled.MIN_TOKENS = Math.floor(scaled.MEDIUM_SAMPLE_THRESHOLD*0.15);
      return scaled;
    };
  }

  // Parameter discovery helpers (parity subset)
  if (typeof window.generateTestValuesFromRules !== 'function'){
    window.generateTestValuesFromRules = function(paramName){
      const rules = (window.AG?.constants?.PARAM_RULES)||{}; const rule=rules[paramName]; if(!rule){ console.warn('No rule for', paramName); return []; }
      const {min,max,step,type} = rule; const testValues=[min]; if(max!==min) testValues.push(max); const range=max-min; const numSteps=Math.floor(range/step);
      const roundToStep = val=>{ const rounded = Math.round((val-min)/step)*step+min; return type==='integer'? Math.round(rounded): rounded; };
      if(numSteps>1){ if(numSteps<=5){ for(let v=min+step; v<max; v+=step){ testValues.push(type==='integer'?Math.round(v):v);} } else { const q1=min+range*0.25, q2=min+range*0.5, q3=min+range*0.75; [q1,q2,q3].forEach(v=>testValues.push(roundToStep(v))); if(numSteps>20){ testValues.push(roundToStep(min+range*0.1)); testValues.push(roundToStep(min+range*0.9)); } } }
      let unique=[...new Set(testValues)].sort((a,b)=>a-b); if(unique.length>8){ const res=[unique[0]]; const stepSize=Math.floor((unique.length-2)/(8-2)); for(let i=stepSize;i<unique.length-1;i+=stepSize){ res.push(unique[i]); } res.push(unique[unique.length-1]); unique=res.slice(0,8);} if(paramName==='Min AG Score') unique=unique.map(v=>String(v)); console.log(`📊 Generated ${unique.length} test values for ${paramName}: [${unique.join(', ')}]`); return unique; };
  }
  if (typeof window.runParameterImpactDiscovery !== 'function'){
    window.runParameterImpactDiscovery = async function(){
      const MIN_TOKENS_REQUIRED=25; const MIN_IMPROVEMENT=1; const cfg=(window.AG?.constants?.CONFIG)||{}; const api = window.AG?.api?.BacktesterAPI? new window.AG.api.BacktesterAPI(): null; if(!api){ console.warn('BacktesterAPI unavailable'); return []; }
      console.log('%c🔬 Starting Parameter Impact Discovery (Full Parameter Set)','color:purple;font-weight:bold;');
      if(window.optimizationTracker && !window.optimizationTracker.isRunning){ window.optimizationTracker.startOptimization(1); }
      const currentConfig = (typeof getCurrentConfigFromUI==='function')? await getCurrentConfigFromUI(): {};
      let baseline; try { baseline = await api.fetchResults(currentConfig); } catch(e){ console.error('Baseline fetch failed', e); return []; }
      if(!baseline.success || !baseline.metrics){ console.error('No baseline metrics'); return []; }
      if((baseline.metrics.totalTokens||0) < MIN_TOKENS_REQUIRED){ console.warn('Baseline insufficient tokens (<',MIN_TOKENS_REQUIRED,')'); }
      const baselineScore = baseline.metrics.tpPnlPercent||0; console.log(`✅ Baseline ${baselineScore.toFixed(1)}% PnL | ${(baseline.metrics.totalTokens||0)} tokens`);
      // Dynamically derive param list from rules for breadth
      const RULES = (window.AG?.constants?.PARAM_RULES)||{};
      const sectionMap = { 'Min MCAP (USD)':'basic','Max MCAP (USD)':'basic','Min AG Score':'tokenDetails','Min Token Age (sec)':'tokenDetails','Max Token Age (sec)':'tokenDetails','Min Deployer Age (min)':'tokenDetails','Min Buy Ratio %':'risk','Max Buy Ratio %':'risk','Min Vol MCAP %':'risk','Max Vol MCAP %':'risk','Min Bundled %':'risk','Max Bundled %':'risk','Min Deployer Balance (SOL)':'risk','Max Drained %':'risk','Max Drained Count':'risk','Min Unique Wallets':'wallets','Max Unique Wallets':'wallets','Min KYC Wallets':'wallets','Max KYC Wallets':'wallets','Min Holders':'wallets','Max Holders':'wallets','Min TTC (sec)':'advanced','Max TTC (sec)':'advanced','Min Win Pred %':'advanced','Max Liquidity %':'advanced' };
      // Order parameters to test likely impactful first (heuristic ordering similar to legacy priorities)
      const priorityOrder = ['Min TTC (sec)','Min Unique Wallets','Min MCAP (USD)','Min AG Score','Max Drained %','Max Bundled %','Min Buy Ratio %','Min Vol MCAP %'];
      const allParams = Object.keys(RULES);
      allParams.sort((a,b)=>{ const ai=priorityOrder.indexOf(a); const bi=priorityOrder.indexOf(b); if(ai===-1 && bi===-1) return a.localeCompare(b); if(ai===-1) return 1; if(bi===-1) return -1; return ai-bi; });
      const results=[]; let testCount=0, failed=0; const startTime=Date.now();
      for(const param of allParams){ if(window.STOPPED) break; const section=sectionMap[param]||'basic'; const values=window.generateTestValuesFromRules(param); if(!values.length) continue; const paramOut=[]; let paramBestImprovement=0; for(const v of values){ if(window.STOPPED) break; testCount++; const testCfg = window.ensureCompleteConfig(currentConfig); if(!testCfg[section]) testCfg[section]={}; testCfg[section][param]=v; let r; try { r=await api.fetchResults(testCfg); } catch(e){ failed++; continue; } if(!r.success||!r.metrics){ failed++; continue; } if((r.metrics.totalTokens||0) < MIN_TOKENS_REQUIRED) continue; const improvement = (r.metrics.tpPnlPercent||0)-baselineScore; paramOut.push({ value:v, score:r.metrics.tpPnlPercent, tokens:r.metrics.totalTokens, improvement}); if(improvement>paramBestImprovement) paramBestImprovement=improvement; if(improvement>MIN_IMPROVEMENT && window.bestConfigTracker){ window.bestConfigTracker.update(testCfg, r.metrics, r.metrics.tpPnlPercent, `Param Discovery ${param}`); }
        if(window.optimizationTracker){ window.optimizationTracker.updateProgress(testCount, failed, 0); }
      }
        if(paramOut.length){ paramOut.sort((a,b)=>b.improvement-a.improvement); const best=paramOut[0]; results.push({param, bestValue:best.value, bestScore:best.score, improvement:best.improvement, tests: paramOut.length, details:paramOut}); console.log(`🔎 ${param} best ${best.value} -> ${best.score.toFixed(1)}% (${best.improvement.toFixed(1)} Δ | tokens ${best.tokens})`); }
        // Early exit heuristic if large improvement already achieved
        if(window.bestConfigTracker?.score && (window.bestConfigTracker.score - baselineScore) > 20 && (Date.now()-startTime) > 60000) { console.log('⏭️ Early stopping discovery (significant improvement found)'); break; }
      }
      console.log('✅ Parameter Discovery Complete', results);
      return results;
    };
  }

  // Console helper parity utilities
  if (typeof window.getRateLimitStats !== 'function'){
    window.getRateLimitStats = function(){ if(window.burstRateLimiter && typeof window.burstRateLimiter.getStats==='function'){ const s=window.burstRateLimiter.getStats(); console.log('📊 Rate Limiting Performance:', s); return s; } console.warn('burstRateLimiter stats unavailable'); return null; };
  }
  if (typeof window.forceRateLimitAdaptation !== 'function'){
    window.forceRateLimitAdaptation = function(){ if(window.burstRateLimiter && typeof window.burstRateLimiter.adaptToBurstLimit==='function'){ const newSize=window.burstRateLimiter.adaptToBurstLimit(); console.log('🔧 Forced adaptation. New dynamicBurstSize:', newSize); return newSize; } };
  }
  if (typeof window.resetRateLimiting !== 'function'){
    window.resetRateLimiting = function(){ const cfg=(window.AG?.constants?.CONFIG)||{}; window.burstRateLimiter = new (window.BurstRateLimiter||window.AG?.rateLimiting?.BurstRateLimiter||function(){})({ threshold: cfg.RATE_LIMIT_THRESHOLD, recoveryTime: cfg.RATE_LIMIT_RECOVERY, safetyMargin: cfg.RATE_LIMIT_SAFETY_MARGIN, intraBurstDelay: cfg.INTRA_BURST_DELAY, maxRequestsPerMinute: cfg.MAX_REQUESTS_PER_MINUTE }); console.log('♻️ Rate limiting reset'); return window.getRateLimitStats? window.getRateLimitStats(): null; };
  }
  if (typeof window.optimizeRateLimiting !== 'function'){
    window.optimizeRateLimiting = function(){ if(!window.burstRateLimiter) return; // naive strategy
      const s=window.burstRateLimiter.getStats(); if(s.requestsPerMinute < (window.AG?.constants?.CONFIG?.MAX_REQUESTS_PER_MINUTE||50)*0.6){ window.burstRateLimiter.dynamicBurstSize = Math.min(window.burstRateLimiter.dynamicBurstSize+1, 15);} console.log('⚙️ Optimized rate limiting; dynamicBurstSize:', window.burstRateLimiter.dynamicBurstSize); return window.getRateLimitStats(); };
  }
  if (typeof window.enableTurboMode !== 'function'){
    window.enableTurboMode = function(){ const cfg=(window.AG?.constants?.CONFIG)||{}; cfg.RATE_LIMIT_THRESHOLD = Math.min(cfg.RATE_LIMIT_THRESHOLD*2, 100); cfg.RATE_LIMIT_RECOVERY = Math.max(Math.floor(cfg.RATE_LIMIT_RECOVERY*0.7), 3000); cfg.INTRA_BURST_DELAY = Math.max(5, Math.floor(cfg.INTRA_BURST_DELAY*0.5)); window.resetRateLimiting && window.resetRateLimiting(); console.log('🚀 Turbo mode enabled (aggressive settings)'); };
  }
  if (typeof window.getConfigTracker !== 'function'){
    window.getConfigTracker = function(){ const t=window.bestConfigTracker; if(!t||!t.config){ console.log('⚠️ No tracked config'); return null;} console.log('🆔 Tracker:', { id: t.id, score: t.score, source: t.source }); return t.getDebugInfo? t.getDebugInfo(): {config:t.config, metrics:t.metrics, score:t.score}; };
  }
  if (typeof window.getBestConfig !== 'function'){
    window.getBestConfig = function(){ const t=window.bestConfigTracker; if(!t||!t.config){ console.log('⚠️ No best configuration captured yet'); return null; } console.log('📋 Best Configuration:', t.config); return t.config; };
  }

  // Auto-collapse / expand sections during optimization (best-effort heuristic)
  if (typeof window.__agAutoCollapseSections === 'undefined'){
    window.__agAutoCollapseSections = { enabled:false, collapsed:[] };
  }
  if (typeof window.toggleAutoCollapseDuringOptimization !== 'function'){
    window.toggleAutoCollapseDuringOptimization = function(enable){
      const state=window.__agAutoCollapseSections; if(enable===state.enabled) return; state.enabled=enable; const headers = Array.from(document.querySelectorAll('button[type="button"]')).filter(b=>/Basic|Token Details|Wallets|Risk|Advanced/i.test(b.textContent));
      if(enable){ state.collapsed=[]; headers.forEach(h=>{ if(h.getAttribute('aria-expanded')==='true'){ h.click(); state.collapsed.push(h.textContent); }}); console.log('🗂️ Auto-collapse engaged'); }
      else { headers.forEach(h=>{ if(state.collapsed.includes(h.textContent) && h.getAttribute('aria-expanded')==='false'){ h.click(); }}); state.collapsed=[]; console.log('🗂️ Auto-collapse restored sections'); }
    };
  }

  // Rate limiting mode toggle parity
  if (typeof window.toggleRateLimitingMode !== 'function'){
    window.toggleRateLimitingMode = function(){
      const cfg = (window.AG?.constants?.CONFIG)||window.CONFIG||{};
      const current = cfg.RATE_LIMIT_MODE || 'normal';
      const next = current === 'normal' ? 'slower' : 'normal';
      cfg.RATE_LIMIT_MODE = next;
      const modeSettings = (cfg.RATE_LIMIT_MODES||{})[next];
      if (modeSettings){
        cfg.BACKTEST_WAIT = modeSettings.BACKTEST_WAIT;
        cfg.RATE_LIMIT_THRESHOLD = modeSettings.RATE_LIMIT_THRESHOLD;
        cfg.RATE_LIMIT_RECOVERY = modeSettings.RATE_LIMIT_RECOVERY;
        cfg.REQUEST_DELAY = modeSettings.REQUEST_DELAY;
        cfg.INTRA_BURST_DELAY = modeSettings.INTRA_BURST_DELAY;
      }
      if (window.BurstRateLimiter){ window.burstRateLimiter = new window.BurstRateLimiter(cfg.RATE_LIMIT_THRESHOLD, cfg.RATE_LIMIT_RECOVERY, cfg.RATE_LIMIT_SAFETY_MARGIN); }
      if (window.APIRateLimiter){ window.rateLimiter = new window.APIRateLimiter(cfg.REQUEST_DELAY); }
      const btn = document.getElementById('toggle-rate-limit-btn');
      if (btn){ const modeDisplay = next === 'normal' ? 'Normal' : 'Slower'; btn.textContent = `⏱️ ${modeDisplay}`; btn.title = `Currently using ${modeDisplay.toLowerCase()} rate limiting (${(cfg.BACKTEST_WAIT||0)/1000}s wait). Click to switch.`; }
      console.log(`🔄 Rate limiting switched to ${next.toUpperCase()} mode`);
      return next;
    };
  }
  // Best config actions parity
  if (typeof window.applyBestConfigToUI !== 'function'){
    window.applyBestConfigToUI = async function(){ const tracker = window.bestConfigTracker; if(tracker && tracker.config && window.AG?.ui?.applyConfigToUI){ console.log(`⚙️ Applying best configuration (ID: ${(tracker.id||'').substring(0,8)}) to UI...`); const ok = await window.AG.ui.applyConfigToUI(tracker.config,true); console.log(ok? '✅ Applied best configuration' : '❌ Failed to apply configuration'); } else { console.log('❌ No best configuration available to apply'); } };
  }
  if (typeof window.copyBestConfigToClipboard !== 'function'){
    window.copyBestConfigToClipboard = function(){ const t=window.bestConfigTracker; if(t && t.config){ const configText = JSON.stringify(t.config,null,2); const meta = `// Best configuration (ID: ${(t.id||'').substring(0,8)})\n// Score: ${(t.score||0).toFixed? t.score.toFixed(1):t.score}% | Source: ${t.source||'Unknown'}\n// Generated: ${new Date(t.timestamp||Date.now()).toLocaleString()}\n\n`; navigator.clipboard.writeText(meta+configText).then(()=> console.log('📋 Best configuration copied to clipboard')).catch(()=> console.log('❌ Copy failed')); } else { console.log('❌ No best configuration available to copy'); } };
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
            <div style="margin:10px 0 14px 0; padding:10px;border:1px solid #4a5568;border-radius:6px;background:#243044;">
              <div style="font-size:11px;font-weight:600;color:#a0aec0;margin-bottom:6px;display:flex;align-items:center;gap:6px;">⚡ Optimization Features</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                <label style="display:flex;align-items:center;gap:6px;font-size:10px;"><input type="checkbox" id="multiple-starting-points" checked/>Multiple Starts</label>
                <label style="display:flex;align-items:center;gap:6px;font-size:10px;"><input type="checkbox" id="simulated-annealing" checked/>Annealing</label>
                <label style="display:flex;align-items:center;gap:6px;font-size:10px;"><input type="checkbox" id="latin-hypercube" checked/>Latin Hypercube</label>
                <label style="display:flex;align-items:center;gap:6px;font-size:10px;"><input type="checkbox" id="correlated-params" checked/>Correlated Params</label>
                <label style="display:flex;align-items:center;gap:6px;font-size:10px;"><input type="checkbox" id="deep-dive" checked/>Deep Dive</label>
                <label style="display:flex;align-items:center;gap:6px;font-size:10px;"><input type="checkbox" id="robust-scoring" checked/>Robust Scoring</label>
                <label style="display:flex;align-items:center;gap:6px;font-size:10px;"><input type="checkbox" id="low-bundled-constraint"/>Low Bundled%</label>
              </div>
            </div>
          <div id="best-config-display" style="background:rgba(72,187,120,0.1);border:1px solid rgba(72,187,120,0.3);border-radius:6px;padding:16px;margin:16px 0;display:block;">
            <h5 id="best-config-header" style="margin:0 0 12px 0;font-size:13px;font-weight:600;color:#48bb78;display:flex;align-items:center;gap:6px;">⏳ Optimization Configuration</h5>
            <div id="best-config-stats" style="font-size:12px;margin-bottom:12px;color:#e2e8f0;"></div>
            <div style="margin-bottom:12px;">
              <div style="margin-bottom:12px;"><button id="start-optimization" style="width:100%;padding:12px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border:none;border-radius:6px;color:#fff;font-weight:600;cursor:pointer;font-size:14px;">🚀 Start Enhanced Optimization</button></div>
              <div style="margin-bottom:12px;"><button id="stop-optimization" style="width:100%;padding:10px;background:#e53e3e;border:1px solid #c53030;border-radius:6px;color:#fff;font-weight:500;cursor:pointer;font-size:12px;display:none;">⏹️ Stop Optimization</button></div>
              <div id="optimization-result-buttons" style="display:none;gap:8px;grid-template-columns:1fr 1fr;" class="result-buttons-grid">
                <button id="apply-best-config" style="padding:8px;background:rgba(59,130,246,0.2);border:1px solid rgba(59,130,246,0.4);border-radius:4px;color:#63b3ed;font-size:11px;cursor:pointer;font-weight:500;">⚙️ Apply Best Config</button>
                <button id="copy-best-config" style="padding:8px;background:rgba(139,92,246,0.2);border:1px solid rgba(139,92,246,0.4);border-radius:4px;color:#a78bfa;font-size:11px;cursor:pointer;font-weight:500;">📋 Copy Best Config</button>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
                <button id="parameter-discovery" style="padding:10px;background:linear-gradient(135deg,#9f7aea 0%,#805ad5 100%);border:none;border-radius:6px;color:#fff;font-weight:500;cursor:pointer;font-size:12px;">🔬 Parameter Discovery</button>
                <button id="toggle-rate-limit-btn" style="padding:10px;background:linear-gradient(135deg,#38b2ac 0%,#319795 100%);border:none;border-radius:6px;color:#fff;font-weight:500;cursor:pointer;font-size:12px;">⏱️ Normal</button>
              </div>
            </div>
          </div>
        </div>
          <div id="signal-tab" class="tab-content" style="display:none;padding:16px 20px;">
            <div style="font-size:13px;font-weight:600;color:#63b3ed;margin-bottom:8px;display:flex;align-items:center;gap:6px;">🔍 Signal Analysis</div>
            <div style="font-size:11px;color:#a0aec0;margin-bottom:10px;">Paste token data JSON (array of tokens each containing swaps with criteria) then run analysis to generate a tight configuration.</div>
            <textarea id="signal-input" placeholder="[ { \"address\":\"...\", \"swaps\":[ { \"criteria\": { ... } } ] } ]" style="width:100%;min-height:120px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#e2e8f0;font-size:11px;padding:8px;font-family:monospace;resize:vertical;margin-bottom:10px;"></textarea>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px;">
              <div style="grid-column:span 1;"><label style="font-size:10px;font-weight:500;color:#a0aec0;display:block;margin-bottom:3px;">Buffer %</label><input id="signal-buffer" type="number" value="10" style="width:100%;padding:4px 6px;background:#2d3748;border:1px solid #4a5568;border-radius:4px;color:#e2e8f0;font-size:10px;text-align:center;"/></div>
              <div style="grid-column:span 1;"><label style="font-size:10px;font-weight:500;color:#a0aec0;display:block;margin-bottom:3px;">Outliers</label><select id="outlier-method" style="width:100%;padding:4px 6px;background:#2d3748;border:1px solid #4a5568;border-radius:4px;color:#e2e8f0;font-size:10px;">
                <option value="none">None</option><option value="iqr">IQR</option><option value="percentile">Percentile</option><option value="zscore">Z-Score</option></select></div>
              <div style="grid-column:span 1;display:flex;align-items:flex-end;">
                <label style="display:flex;align-items:center;gap:6px;font-size:10px;" title="Cluster similar signals first"><input id="use-clustering" type="checkbox" checked/> Clustering</label>
              </div>
              <div style="grid-column:span 1;display:flex;align-items:flex-end;justify-content:flex-end;">
                <button id="run-signal-analysis" style="width:100%;padding:8px;background:#2563eb;border:1px solid #1d4ed8;border-radius:6px;color:#fff;font-size:11px;font-weight:600;cursor:pointer;">📊 Analyze</button>
              </div>
            </div>
            <div id="cluster-select-container" style="display:none;align-items:center;gap:8px;margin:6px 0 10px 0;">
              <label for="cluster-select" style="font-size:10px;font-weight:500;color:#a0aec0;">Cluster</label>
              <select id="cluster-select" style="flex:1;padding:4px 8px;background:#2d3748;border:1px solid #4a5568;border-radius:4px;color:#e2e8f0;font-size:10px;"></select>
            </div>
            <div id="signal-analysis-results" style="background:#1e293b;border:1px solid #334155;border-radius:6px;padding:12px;font-size:11px;color:#e2e8f0;min-height:60px;white-space:pre-wrap;">
              <em style="opacity:0.6;">No analysis yet.</em>
            </div>
            <div style="margin-top:10px;display:flex;gap:8px;">
              <button id="apply-generated-config" style="flex:1;padding:8px;background:rgba(72,187,120,0.15);border:1px solid rgba(72,187,120,0.4);color:#48bb78;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;" disabled>⚙️ Apply Generated Config</button>
              <button id="copy-generated-config" style="flex:1;padding:8px;background:rgba(139,92,246,0.2);border:1px solid rgba(139,92,246,0.4);color:#a78bfa;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;" disabled>📋 Copy Config</button>
            </div>
          </div>
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
    safeAdd('start-optimization','click',async ()=>{
      const AG = window.AG || {};
      const cfg = (AG.constants && AG.constants.CONFIG) || {};
      const startBtn = document.getElementById('start-optimization');
      const stopBtn = document.getElementById('stop-optimization');
      if (startBtn) startBtn.style.display='none';
      if (stopBtn) stopBtn.style.display='block';
      // Read UI values
      const targetPnl = parseFloat(document.getElementById('target-pnl')?.value)||cfg.TARGET_PNL||100;
      const minTokens = parseInt(document.getElementById('min-tokens')?.value)||cfg.MIN_TOKENS||50;
      const runtimeMin = parseInt(document.getElementById('runtime-min')?.value)||cfg.MAX_RUNTIME_MIN||30;
      const chainRunCount = parseInt(document.getElementById('chain-run-count')?.value)||cfg.CHAIN_RUN_COUNT||1;
  // Feature toggles
  cfg.USE_MULTIPLE_STARTING_POINTS = document.getElementById('multiple-starting-points')?.checked || false;
  cfg.USE_SIMULATED_ANNEALING = document.getElementById('simulated-annealing')?.checked || false;
  cfg.USE_LATIN_HYPERCUBE_SAMPLING = document.getElementById('latin-hypercube')?.checked || false;
  cfg.USE_ROBUST_SCORING = document.getElementById('robust-scoring')?.checked || false;
  cfg.USE_CORRELATED_PARAMS = document.getElementById('correlated-params')?.checked || false;
  cfg.USE_DEEP_DIVE = document.getElementById('deep-dive')?.checked || false;
      cfg.TARGET_PNL = targetPnl; cfg.MIN_TOKENS = minTokens; cfg.MAX_RUNTIME_MIN = runtimeMin; cfg.CHAIN_RUN_COUNT = chainRunCount;
      console.log(`🚀 (modular) Starting optimization: target ${targetPnl}% PnL, min ${minTokens} tokens, ${runtimeMin} min runtime, chained runs: ${chainRunCount}`);
      window.STOPPED = false;
      try {
        let result;
        if (chainRunCount>1 && AG.optimizer?.ChainedOptimizer){
          const chained = new AG.optimizer.ChainedOptimizer();
            result = await chained.runChainedOptimization(chainRunCount, runtimeMin);
        } else if (AG.optimizer?.EnhancedOptimizer){
          const opt = new AG.optimizer.EnhancedOptimizer();
          result = await opt.runOptimization();
        } else {
          console.warn('[AG.ui] Optimizer module not available yet; aborting');
        }
        if (result?.bestConfig){
          window.currentBestConfig = result.bestConfig;
          console.log('🎉 (modular) Optimization completed. Best score:', result.bestScore);
        }
      } catch(e){
        console.error('❌ (modular) Optimization error:', e.message);
      } finally {
        if (startBtn) startBtn.style.display='block';
        if (stopBtn) stopBtn.style.display='none';
      }
    });
    safeAdd('stop-optimization','click',()=>{ window.STOPPED = true; console.log('⏹️ (modular) stop optimization clicked'); });
    // Signal analysis handlers
    safeAdd('run-signal-analysis','click', async ()=>{
      try {
        const raw=document.getElementById('signal-input')?.value||'';
        if(!raw.trim()){ console.warn('No input JSON'); return; }
        let parsed; try { parsed=JSON.parse(raw); } catch(e){ console.error('Invalid JSON:', e.message); return; }
        if(!Array.isArray(parsed)){ console.error('Input must be array of token objects'); return; }
        const buffer = parseFloat(document.getElementById('signal-buffer')?.value)||10;
        const outlierMethod = document.getElementById('outlier-method')?.value||'none';
        const useClustering = document.getElementById('use-clustering')?.checked || false;
        if(!window.AG?.signals?.analyzeSignalCriteria){ console.warn('Signal module not loaded'); return; }
        const result = window.AG.signals.analyzeSignalCriteria(parsed, buffer, outlierMethod, useClustering);
        let generatedConfig=null; let display='';
        const clusterContainer = document.getElementById('cluster-select-container');
        const clusterSelect = document.getElementById('cluster-select');
        if(result.type==='clustered'){
          display += `Clustered Analysis (Used clustering)\nTotal Signals: ${result.totalSignals}\nClusters: ${result.clusters.length}\n\n`;
          result.clusters.forEach((c,i)=>{ display += `• [${i}] ${c.name}: ${c.description}\n`; });
          if(clusterContainer && clusterSelect){
            clusterSelect.innerHTML = result.clusters.map((c,i)=>`<option value="${i}">Cluster ${i+1}: ${c.name}</option>`).join('');
            clusterContainer.style.display = result.clusters.length>1? 'flex':'none';
          }
          generatedConfig = window.AG.signals.generateTightestConfig(result.clusters[0].analysis);
          window.__agSignalClusters = result.clusters; // store
        } else {
          display += `Standard Analysis (No clustering)\nSignals: ${result.analysis.totalSignals}\n`;
          if(clusterContainer) clusterContainer.style.display='none';
          generatedConfig = window.AG.signals.generateTightestConfig(result.analysis);
        }
        if(generatedConfig){
          display += '\nSuggested Tight Config:\n'+ (window.AG.ui.formatConfigForDisplay? window.AG.ui.formatConfigForDisplay(generatedConfig): JSON.stringify(generatedConfig,null,2));
          window.generatedSignalConfig = generatedConfig;
          const applyBtn=document.getElementById('apply-generated-config'); const copyBtn=document.getElementById('copy-generated-config');
          if(applyBtn) applyBtn.disabled=false; if(copyBtn) copyBtn.disabled=false;
        }
        const out=document.getElementById('signal-analysis-results'); if(out){ out.textContent=display; }
      } catch(e){ console.error('Signal analysis error:', e.message); }
    });
    // cluster selection handler
    const clusterSelectEl=document.getElementById('cluster-select');
    if(clusterSelectEl){ clusterSelectEl.addEventListener('change', ()=>{ const idx=parseInt(clusterSelectEl.value); if(!isNaN(idx) && window.__agSignalClusters && window.__agSignalClusters[idx]){ const chosen=window.__agSignalClusters[idx]; const cfg=window.AG.signals.generateTightestConfig(chosen.analysis); window.generatedSignalConfig=cfg; const out=document.getElementById('signal-analysis-results'); if(out){ out.textContent = (out.textContent.split('\nSuggested Tight Config:')[0]+'\nSuggested Tight Config:\n'+ (window.AG.ui.formatConfigForDisplay? window.AG.ui.formatConfigForDisplay(cfg): JSON.stringify(cfg,null,2))); } console.log('🔀 Switched to cluster', idx); const applyBtn=document.getElementById('apply-generated-config'); const copyBtn=document.getElementById('copy-generated-config'); if(applyBtn) applyBtn.disabled=false; if(copyBtn) copyBtn.disabled=false; } }); }
    safeAdd('apply-generated-config','click', async ()=>{ if(window.generatedSignalConfig && window.AG?.ui?.applyConfigToUI){ await window.AG.ui.applyConfigToUI(window.generatedSignalConfig); console.log('Applied generated config'); }});
    safeAdd('copy-generated-config','click', ()=>{ if(window.generatedSignalConfig){ try{ navigator.clipboard.writeText(JSON.stringify(window.generatedSignalConfig,null,2)); console.log('Copied generated config'); }catch(e){ console.warn('Copy failed', e.message); } } });
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

// ==========================
// Optimization Tracker (parity subset)
// ==========================
(function addOptimizationTracker(){
  if (!window.AG || window.optimizationTracker) return;
  class OptimizationTracker {
    constructor(){
      this.currentBest=null; this.totalTests=0; this.failedTests=0; this.rateLimitFailures=0; this.startTime=null; this.isRunning=false; this.currentRun=0; this.totalRuns=1; this.maxRuntimeMs=((window.AG.constants&&window.AG.constants.CONFIG)||{}).MAX_RUNTIME_MIN*60*1000||0;
    }
    startOptimization(totalRuns=1){ this.isRunning=true; updateBestConfigHeader('running'); this.startTime=Date.now(); this.totalTests=0; this.failedTests=0; this.rateLimitFailures=0; this.currentBest=null; this.currentRun=1; this.totalRuns=totalRuns; const cfg=(window.AG.constants&&window.AG.constants.CONFIG)||{}; this.maxRuntimeMs=(cfg.MAX_RUNTIME_MIN||15)*60*1000*totalRuns; this.updateBestConfigDisplay(); }
    setCurrentRun(run,total){ this.currentRun=run; if(total) this.totalRuns=total; this.updateBestConfigDisplay(); }
    getTimeRemaining(){ if(!this.startTime||!this.isRunning) return null; const elapsed=Date.now()-this.startTime; return Math.max(0,this.maxRuntimeMs - elapsed); }
    formatTimeRemaining(){ const r=this.getTimeRemaining(); if(r===null||r<=0) return null; const m=Math.floor(r/60000), s=Math.floor((r%60000)/1000); return m>0?`${m}m ${s}s`:`${s}s`; }
    getEstimatedCompletionTime(){ const r=this.getTimeRemaining(); if(!r) return null; const d=new Date(Date.now()+r); return d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false}); }
    stopOptimization(){ this.isRunning=false; updateBestConfigHeader('idle'); }
    updateProgress(testCount, failedCount, rateLimitFailures=0){ this.totalTests=testCount; this.failedTests=failedCount; this.rateLimitFailures=rateLimitFailures; this.updateBestConfigDisplay(); }
    setCurrentBest(result, method='Unknown'){ if(result&&result.metrics){ this.currentBest={ metrics: result.metrics, config: result.config, method, timestamp: Date.now() }; this.updateBestConfigDisplay(); } }
    updateBestConfigDisplay(){ const statsEl=document.getElementById('best-config-stats'); if(!statsEl) return; const runtime=this.startTime? (Date.now()-this.startTime)/1000:0; const runtimeMin=Math.floor(runtime/60), runtimeSec=Math.floor(runtime%60); const testsPerMin= runtime>0? (this.totalTests/(runtime/60)).toFixed(1):'0'; const timeRemaining=this.formatTimeRemaining(); const progressPercent = this.maxRuntimeMs>0? Math.min(100, ((Date.now()-(this.startTime||Date.now()))/this.maxRuntimeMs)*100):0; let html=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;font-size:12px;font-weight:bold;">`+
      `<div>Tests: <span style=color:#4CAF50>${this.totalTests}</span></div>`+
      `<div>Rejected: <span style=color:${this.failedTests>0?'#ff9800':'#666'}>${this.failedTests}</span></div>`+
      `<div>Runtime: <span style=color:#4CAF50>${runtimeMin}m ${runtimeSec}s</span></div>`+
      `<div>Rate: <span style=color:#4CAF50>${testsPerMin}/min</span></div>`+
      `<div>📊 Run: <span style=color:#4CAF50>${this.currentRun}/${this.totalRuns}</span></div>`+
      `<div>${this.rateLimitFailures>0? '⚠️ Rate Hits: <span style=color:#ff4444>'+this.rateLimitFailures+'</span>':'✅ No Rate Hits'}</div>`+
      `</div>`;
      if (timeRemaining && this.isRunning){ const progressColor = progressPercent>80?'#ff4444': progressPercent>60?'#ff9800':'#4CAF50'; const completion=this.getEstimatedCompletionTime(); html += `<div style=margin-bottom:8px><div style=display:flex;align-items:center;gap:8px;font-size:10px><span style=color:#aaa>Progress:</span><div style=flex:1;background:rgba(255,255,255,0.1);border-radius:10px;height:6px;overflow:hidden><div style=width:${progressPercent.toFixed(1)}%;height:100%;background:${progressColor};transition:width .3s></div></div><span style=color:${progressColor};font-weight:bold>${progressPercent.toFixed(0)}%</span></div>${completion?`<div style="font-size:9px;color:#aaa;margin-top:2px;text-align:center;">📅 Est. completion: ${completion}</div>`:''}</div>`; }
      if (this.currentBest && this.currentBest.metrics){ const m=this.currentBest.metrics; html += `<div style="border-top:1px solid rgba(76,175,80,0.3);padding-top:8px;margin-bottom:8px;font-weight:bold;">`+
        `<div style="font-size:11px;font-weight:bold;color:#4CAF50;margin-bottom:4px;">🏆 Current Best:</div>`+
        `<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:10px;">`+
        `<div>Score: <span style=color:#4CAF50;font-weight:bold>${(m.score||0).toFixed?m.score.toFixed(1):m.score||'N/A'}</span></div>`+
        `<div>Tokens: <span>${m.totalTokens||0}</span></div>`+
        `<div>TP PnL: <span style=color:${(m.tpPnlPercent||0)>=0?'#4CAF50':'#f44336'}>${(m.tpPnlPercent||0).toFixed?m.tpPnlPercent.toFixed(1):m.tpPnlPercent||0}%</span></div>`+
        `<div>Win Rate: <span>${(m.winRate||0).toFixed?m.winRate.toFixed(1):m.winRate||0}%</span></div>`+
        `</div>`+
        `<div style="font-size:9px;color:#aaa;margin-top:4px;">Method: ${this.currentBest.method}</div>`+
        `</div>`;
        const btnRow=document.getElementById('optimization-result-buttons'); if(btnRow) btnRow.style.display='grid'; updateUIBackground(false); }
      else if (this.isRunning){ html += `<div style="text-align:center;padding:8px;font-size:10px;color:#aaa;">🔍 Searching for optimal configuration...</div>`; }
      statsEl.innerHTML=html;
    }
  }
  window.optimizationTracker = new OptimizationTracker();
  if (!window.bestConfigTracker){ window.bestConfigTracker = { update(config,metrics,score,source){ this.config=config; this.metrics=metrics; this.score=score; this.source=source; this.id='placeholder-'+Date.now(); }, getConfig(){ return this.config; }, getDebugInfo(){ return {config:this.config, metrics:this.metrics, score:this.score, source:this.source}; } }; }
  console.log('[AG.ui] OptimizationTracker initialized');
})();

// Extend existing event handlers with tracker usage & buttons
(function extendUiEventHandlers(){
  if (!window.AG || !window.AG.ui) return; if (window.AG.ui.__extendedHandlers) return; window.AG.ui.__extendedHandlers=true;
  const originalRegister = window.AG.ui.registerEventHandlers;
  window.AG.ui.registerEventHandlers = function(){
    originalRegister && originalRegister();
    const applyBtn=document.getElementById('apply-best-config');
    const copyBtn=document.getElementById('copy-best-config');
    if (applyBtn){ applyBtn.addEventListener('click', async ()=>{ if(window.currentBestConfig && window.AG?.ui?.applyConfigToUI){ await window.AG.ui.applyConfigToUI(window.currentBestConfig); console.log('⚙️ Applied best config to UI'); } }); }
    if (copyBtn){ copyBtn.addEventListener('click', ()=>{ if(window.currentBestConfig){ try { const text=JSON.stringify(window.currentBestConfig,null,2); navigator.clipboard.writeText(text); console.log('📋 Copied best config JSON to clipboard'); } catch(e){ console.warn('Copy failed', e.message); } } }); }
  const rateBtn=document.getElementById('toggle-rate-limit-btn'); if(rateBtn){ rateBtn.addEventListener('click', ()=>{ if(typeof window.toggleRateLimitingMode==='function') window.toggleRateLimitingMode(); }); }
  const paramDisc=document.getElementById('parameter-discovery'); if(paramDisc){ paramDisc.addEventListener('click', async ()=>{ if(paramDisc.disabled) return; paramDisc.disabled=true; const startBtn=document.getElementById('start-optimization'); if(startBtn) startBtn.disabled=true; try { const results = await window.runParameterImpactDiscovery(); console.log('📊 Discovery results summary:', results.map(r=>`${r.param}:${r.bestValue} (+${r.improvement.toFixed(1)})`).join(', ')); } catch(e){ console.error('Parameter discovery error', e); } finally { paramDisc.disabled=false; if(startBtn) startBtn.disabled=false; } }); }
    // Patch start button to engage tracker
    const startBtn=document.getElementById('start-optimization'); const stopBtn=document.getElementById('stop-optimization');
    if (startBtn){ startBtn.addEventListener('click', ()=>{ if(window.optimizationTracker && !window.optimizationTracker.isRunning){ const chainRunCount=parseInt(document.getElementById('chain-run-count')?.value)||1; window.optimizationTracker.startOptimization(chainRunCount); updateUIBackground(false); } }); }
    if (stopBtn){ stopBtn.addEventListener('click', ()=>{ if(window.optimizationTracker && window.optimizationTracker.isRunning){ window.optimizationTracker.stopOptimization(); updateUIBackground(false); } }); }
  // Engage auto collapse when optimization starts
  if(startBtn){ startBtn.addEventListener('click', ()=>{ if(window.toggleAutoCollapseDuringOptimization) window.toggleAutoCollapseDuringOptimization(true); }); }
  if(stopBtn){ stopBtn.addEventListener('click', ()=>{ if(window.toggleAutoCollapseDuringOptimization) window.toggleAutoCollapseDuringOptimization(false); }); }
  };
})();
