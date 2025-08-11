(function(AG){
  // Compatibility layer: exposes legacy helper functions not yet modularized elsewhere
  if(!AG) return; if(AG.compat){ console.log('[AG][compat] Already loaded'); return; }
  const cfg = (AG.constants && AG.constants.CONFIG)||{};
  const utils = AG.utils || {};

  function cleanConfiguration(config){
    function deepClone(o){ return JSON.parse(JSON.stringify(o)); }
    const cleaned = deepClone(config||{});
    function visit(obj){ if(!obj||typeof obj!=='object') return; Object.entries(obj).forEach(([k,v])=>{
      if(v && typeof v==='object') return visit(v);
      if(v===null || v===undefined || v==='') delete obj[k];
      else if(typeof v==='string'){
        if(['NaN','undefined','null'].includes(v)) delete obj[k];
        else {
          const num = parseFloat(v);
            if(!isNaN(num) && isFinite(num)){
              if(k==='Min AG Score') obj[k] = Math.max(0, Math.min(10, Math.round(num)));
              else obj[k] = num;
            }
        }
      } else if(typeof v==='number'){
        if(isNaN(v) || !isFinite(v)) delete obj[k];
        else if(k==='Min AG Score') obj[k] = Math.max(0, Math.min(10, Math.round(v)));
      }
    }); }
    visit(cleaned); return cleaned;
  }

  async function testConfigurationAPI(config, testName='API Test'){
    try {
      if(!AG.api || !AG.api.BacktesterAPI){ return {success:false,error:'API module unavailable'}; }
      const api = AG.__btApi || (AG.__btApi = new AG.api.BacktesterAPI());
      const cleaned = cleanConfiguration(config);
      const result = await api.fetchResults(cleaned);
      if(!result.success) return result;
      const metrics = result.metrics;
      if(!metrics || metrics.tpPnlPercent===undefined || metrics.totalTokens===undefined){
        return {success:false,error:'Invalid metrics structure'};
      }
      const robust = (AG.scoring && AG.scoring.calculateRobustScore)? AG.scoring.calculateRobustScore(metrics): null;
      if(robust){ metrics.robustScoring = robust; metrics.optimizedMetric = cfg.USE_ROBUST_SCORING? 'robustScore':'tpPnlPercent'; metrics.optimizedValue = robust.score; }
      return { success:true, metrics, source:'API' };
    } catch(e){ return { success:false, error:e.message }; }
  }

  // Minimal token processing utilities (subset of original)
  function processTokenData(tokenInfo, swaps){
    swaps = Array.isArray(swaps)? swaps.slice().sort((a,b)=> (b.timestamp||0)-(a.timestamp||0)) : [];
    const firstSwap = swaps[swaps.length-1];
    const lastSwap = swaps[0];
    const tp = v=> (v===null||v===undefined)? 'N/A': `${v.toFixed? v.toFixed(2): v}%`;
    const fm = m=> { if(!m) return 'N/A'; if(m>=1_000_000) return `$${(m/1_000_000).toFixed(2)}M`; if(m>=1000) return `$${(m/1000).toFixed(2)}K`; return `$${m}`; };
    const ft = t=> t? new Date(t*1000).toISOString().replace('T',' ').split('.')[0] : 'N/A';
    const totalSignals = swaps.length;
    const winPreds = swaps.map(s=> s.winPredPercent||0);
    const avgWinPred = winPreds.length? tp(winPreds.reduce((a,b)=>a+b,0)/winPreds.length): 'N/A';
    const maxWinPred = winPreds.length? tp(Math.max(...winPreds)): 'N/A';
    const minWinPred = winPreds.length? tp(Math.min(...winPreds)): 'N/A';
    const athMultRaw = (tokenInfo.athMcap && tokenInfo.signalMcap)? (tokenInfo.athMcap/tokenInfo.signalMcap):0;
    return {
      tokenAddress: tokenInfo.tokenAddress,
      tokenName: tokenInfo.token,
      symbol: tokenInfo.symbol,
      currentMcap: fm(tokenInfo.currentMcap),
      currentMcapRaw: tokenInfo.currentMcap,
      athMcap: fm(tokenInfo.athMcap),
      athMcapRaw: tokenInfo.athMcap,
      athTime: ft(tokenInfo.athTime),
      atlMcap: fm(tokenInfo.atlMcap),
      atlMcapRaw: tokenInfo.atlMcap,
      atlTime: ft(tokenInfo.atlTime),
      athMultiplier: athMultRaw? `${athMultRaw.toFixed(2)}x`:'N/A',
      athMultiplierRaw: athMultRaw||0,
      currentFromAth: (tokenInfo.athMcap && tokenInfo.currentMcap)? tp(((tokenInfo.currentMcap-tokenInfo.athMcap)/tokenInfo.athMcap)*100): 'N/A',
      totalSignals,
      firstSignalTime: ft(firstSwap?.timestamp),
      lastSignalTime: ft(lastSwap?.timestamp),
      firstSignalMcap: fm(firstSwap?.signalMcap),
      lastSignalMcap: fm(lastSwap?.signalMcap),
      avgWinPred, maxWinPred, minWinPred,
      triggerModes: [...new Set(swaps.map(s=> s.triggerMode))].join(', '),
      latestCriteria: tokenInfo.criteria
    };
  }

  // Signal API helpers (subset)
  async function getTokenInfo(contractAddress){
    const base = cfg.API_BASE_URL || 'https://backtester.alphagardeners.xyz/api';
    const url = `${base}/swaps?fromDate=2000-01-01&toDate=9999-12-31&search=${contractAddress}&sort=timestamp&direction=desc&page=1&limit=1`;
    const data = await (AG.api && AG.api.fetchWithRetry? AG.api.fetchWithRetry(url): fetch(url).then(r=>r.json()));
    if(!data.swaps || !data.swaps.length) throw new Error('Token not found');
    return data.swaps[0];
  }
  async function getAllTokenSwaps(contractAddress){
    const base = cfg.API_BASE_URL || 'https://backtester.alphagardeners.xyz/api';
    const url = `${base}/swaps/by-token/${contractAddress}`;
    const data = await (AG.api && AG.api.fetchWithRetry? AG.api.fetchWithRetry(url): fetch(url).then(r=>r.json()));
    if(!data.swaps || !data.swaps.length) throw new Error('No swap history');
    return data.swaps;
  }

  // Legacy UI metric extractor (fallback): best-effort scrape
  async function extractMetricsFromUI(){
    try {
      const metrics = {};
      const statDivs = Array.from(document.querySelectorAll('div.text-xl.font-bold'));
      for(const div of statDivs){
        const label = div.parentElement?.querySelector('div.text-xs.text-gray-400');
        if(!label) continue; const labelText = label.textContent.trim().toLowerCase(); const value = div.textContent.trim();
        const pct = /([+-]?\d+(?:\.\d+)?)%/; const num = /([+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?)/;
        if(labelText.includes('tokens matched')){ const m=value.match(num); if(m) metrics.totalTokens=parseInt(m[1].replace(/,/g,'')); }
        else if(labelText==='tp pnl %'){ const m=value.match(pct); if(m) metrics.tpPnlPercent=parseFloat(m[1]); }
        else if(labelText==='tp pnl (sol)'){ const m=value.match(num); if(m) metrics.tpPnlSOL=parseFloat(m[1].replace(/,/g,'')); }
        else if(labelText.includes('ath pnl %')){ const m=value.match(pct); if(m) metrics.athPnlPercent=parseFloat(m[1]); }
        else if(labelText.includes('total sol spent')){ const m=value.match(num); if(m) metrics.totalSpent=parseFloat(m[1].replace(/,/g,'')); }
        else if(labelText.includes('win rate')){ const m=value.match(pct); if(m) metrics.winRate=parseFloat(m[1]); }
      }
      if(metrics.tpPnlPercent===undefined || metrics.totalTokens===undefined) return null;
      return metrics;
    } catch(e){ return null; }
  }

  // Simple manual test harness similar to monolith 'Manual Test' path
  async function manualTestCurrentConfig(getConfigFn){
    if(typeof getConfigFn!=='function') return {success:false,error:'No config getter'};
    const cfgObj = await getConfigFn();
    return testConfigurationAPI(cfgObj,'Manual Test');
  }

  // Simplified burst rate limit test: fires N identical lightweight calls
  async function runRateLimitTest(iterations=10){
    if(!AG.api || !AG.api.BacktesterAPI) return {success:false,error:'API unavailable'};
    const api = new AG.api.BacktesterAPI();
    const simpleConfig = { basic:{}, tokenDetails:{}, wallets:{}, risk:{}, advanced:{} };
    const results=[];
    for(let i=0;i<iterations;i++){
      const r = await api.fetchResults(simpleConfig);
      results.push(r.success);
    }
    return {success:true, pass: results.filter(Boolean).length, total: results.length};
  }

  AG.compat = { cleanConfiguration, testConfigurationAPI, processTokenData, getTokenInfo, getAllTokenSwaps, extractMetricsFromUI, manualTestCurrentConfig, runRateLimitTest, MODULE_VERSION:'compat-1.2' };
  // Bridge to legacy globals if absent
  if(typeof window.cleanConfiguration!=='function') window.cleanConfiguration = cleanConfiguration;
  if(typeof window.testConfigurationAPI!=='function') window.testConfigurationAPI = testConfigurationAPI;
  if(typeof window.processTokenData!=='function') window.processTokenData = processTokenData;
  if(typeof window.getTokenInfo!=='function') window.getTokenInfo = getTokenInfo;
  if(typeof window.getAllTokenSwaps!=='function') window.getAllTokenSwaps = getAllTokenSwaps;
  if(typeof window.extractMetricsFromUI!=='function') window.extractMetricsFromUI = extractMetricsFromUI;
  if(typeof window.runRateLimitTest!=='function') window.runRateLimitTest = runRateLimitTest;
  if(typeof window.manualTestCurrentConfig!=='function') window.manualTestCurrentConfig = manualTestCurrentConfig;
  console.log('[AG][compat] Loaded');
})(window.AG = window.AG || {});
