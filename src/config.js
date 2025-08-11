(function(AG){
  // Configuration extraction & scaling parity layer
  if(!AG) return; if(AG.config){ console.log('[AG][config] Already loaded'); return; }
  const CFG = (AG.constants && AG.constants.CONFIG)||{};

  function getTriggerMode(){
    const el = document.getElementById('trigger-mode-select');
    if(el){ const v = el.value; return v === '' ? null : parseInt(v,10); }
    return 4; // Launchpads default
  }
  function getDateRange(){
    const fromDate = document.getElementById('from-date')?.value || null;
    const toDate = document.getElementById('to-date')?.value || null;
    return { fromDate: fromDate && fromDate.trim()? fromDate: null, toDate: toDate && toDate.trim()? toDate: null };
  }
  function getDateRangeScaling(){
    const {fromDate,toDate} = getDateRange();
    const DEFAULT_DAYS = 7;
    if(!fromDate || !toDate){ return { days: DEFAULT_DAYS, scalingFactor:1, isDateFiltered:false }; }
    try { const fd=new Date(fromDate); const td=new Date(toDate); const diff = Math.max(1, Math.ceil((td-fd)/(1000*3600*24))); return { days: diff, scalingFactor: diff/DEFAULT_DAYS, isDateFiltered:true }; } catch(e){ return { days: DEFAULT_DAYS, scalingFactor:1, isDateFiltered:false }; }
  }
  function getScaledTokenThresholds(){
    const scaling = getDateRangeScaling();
    const BASE = { LARGE_SAMPLE_THRESHOLD:1000, MEDIUM_SAMPLE_THRESHOLD:500, MIN_TOKENS: (CFG.MIN_TOKENS||75) };
    const scaled = {
      LARGE_SAMPLE_THRESHOLD: Math.round(BASE.LARGE_SAMPLE_THRESHOLD*scaling.scalingFactor),
      MEDIUM_SAMPLE_THRESHOLD: Math.round(BASE.MEDIUM_SAMPLE_THRESHOLD*scaling.scalingFactor),
      MIN_TOKENS: Math.round(BASE.MIN_TOKENS*scaling.scalingFactor),
      scalingInfo: scaling
    };
    // Minimum floors
    if(scaled.LARGE_SAMPLE_THRESHOLD < 100) scaled.LARGE_SAMPLE_THRESHOLD = 100;
    if(scaled.MEDIUM_SAMPLE_THRESHOLD < 50) scaled.MEDIUM_SAMPLE_THRESHOLD = 50;
    if(scaled.MIN_TOKENS < 10) scaled.MIN_TOKENS = 10;
    // Order safety
    if(scaled.MEDIUM_SAMPLE_THRESHOLD >= scaled.LARGE_SAMPLE_THRESHOLD) scaled.MEDIUM_SAMPLE_THRESHOLD = Math.floor(scaled.LARGE_SAMPLE_THRESHOLD*0.5);
    if(scaled.MIN_TOKENS >= scaled.MEDIUM_SAMPLE_THRESHOLD) scaled.MIN_TOKENS = Math.floor(scaled.MEDIUM_SAMPLE_THRESHOLD*0.15);
    return scaled;
  }
  async function getCurrentConfigFromUI(){
    // Scrape current values from backtester UI similar to monolith's logic
    // This is heuristic; can be refined later.
    const template = (AG.constants && AG.constants.COMPLETE_CONFIG_TEMPLATE) || { basic:{}, tokenDetails:{}, wallets:{}, risk:{}, advanced:{} };
    const config = JSON.parse(JSON.stringify(template));
    const map = Object.keys(template).reduce((acc,section)=>{ Object.keys(template[section]).forEach(p=> acc[p]=section); return acc; }, {});
    const numericInputs = Array.from(document.querySelectorAll('input[type="number"]'));
    numericInputs.forEach(inp=>{
      const labelEl = inp.closest('.form-group')?.querySelector('.sidebar-label') || inp.parentElement?.querySelector('.sidebar-label');
      const label = labelEl? labelEl.textContent.trim(): null;
      if(label && map[label]!==undefined){ const v = inp.value; if(v!=='' && !isNaN(parseFloat(v))) config[map[label]][label] = parseFloat(v); }
    });
    // Boolean toggles for Description / Fresh Deployer (simplified detection)
    ['Description','Fresh Deployer'].forEach(name=>{
      const btns = Array.from(document.querySelectorAll('button')).filter(b=> b.textContent.trim() === name || b.getAttribute('data-field')===name);
      const btn = btns[0];
      if(btn){ const text = btn.textContent.trim(); if(text==='Required') config.risk[name] = true; else if(text==='Forbidden') config.risk[name] = false; }
    });
    return config;
  }

  AG.config = { getTriggerMode, getDateRange, getDateRangeScaling, getScaledTokenThresholds, getCurrentConfigFromUI, MODULE_VERSION:'config-1.0' };
  // Global fallbacks if not already defined
  if(typeof window.getTriggerMode !== 'function') window.getTriggerMode = getTriggerMode;
  if(typeof window.getDateRange !== 'function') window.getDateRange = getDateRange;
  if(typeof window.getDateRangeScaling !== 'function') window.getDateRangeScaling = getDateRangeScaling;
  if(typeof window.getScaledTokenThresholds !== 'function') window.getScaledTokenThresholds = getScaledTokenThresholds;
  if(typeof window.getCurrentConfigFromUI !== 'function') window.getCurrentConfigFromUI = getCurrentConfigFromUI;
  console.log('[AG][config] Loaded');
})(window.AG = window.AG || {});
