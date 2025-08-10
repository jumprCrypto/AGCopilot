(function(AG){
  if(!AG.api){ AG.api = {}; }
  const cfg = AG.constants.CONFIG;
  const utils = AG.utils||{};

  async function fetchWithRetry(url, maxRetries = cfg.MAX_RETRIES) {
    // Keep legacy dependency on global window.rateLimiter if present
    if(window.rateLimiter && typeof window.rateLimiter.throttle === 'function'){
      await window.rateLimiter.throttle();
    } else if(AG.rateLimiting && AG.rateLimiting.APIRateLimiter){
      // Fallback simple spacing using APIRateLimiter wrapper
      if(!AG.api._internalLimiter){
        AG.api._internalLimiter = new AG.rateLimiting.APIRateLimiter(cfg.REQUEST_DELAY);
      }
      await AG.api._internalLimiter.wait();
    }
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url);
        if(!response.ok){
          if(response.status === 429){
            const baseDelay = 3000;
            const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
            const maxDelay = 30000;
            const delay = Math.min(exponentialDelay, maxDelay);
            throw new Error(`Rate limited (HTTP 429). Waiting ${delay / 1000}s before retry.`);
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        }
        return await response.json();
      } catch(err){
        if(attempt === maxRetries) throw new Error(`Failed after ${maxRetries} attempts: ${err.message}`);
        let retryDelay;
        if(err.message.includes('Rate limited')){
          const baseDelay = 3000;
            const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
            retryDelay = Math.min(exponentialDelay, 30000);
        } else {
          retryDelay = cfg.RETRY_DELAY * attempt;
        }
        await (utils.sleep? utils.sleep(retryDelay) : new Promise(r=>setTimeout(r,retryDelay)));
      }
    }
  }

  class BacktesterAPI {
    constructor(){ this.baseUrl = 'https://backtester.alphagardeners.xyz/api/stats'; }
    flattenConfig(config){
      const flat = {};
      if(config && typeof config === 'object'){
        Object.values(config).forEach(section => { if(section && typeof section === 'object') Object.assign(flat, section); });
      }
      return flat;
    }
    mapParametersToAPI(config){
      const apiParams = {};
      const flatConfig = this.flattenConfig(config);
      const parameterMap = {
        'Min MCAP (USD)': 'minMcap','Max MCAP (USD)': 'maxMcap','Min Deployer Age (min)': 'minDeployerAge','Min Token Age (sec)': 'minTokenAge','Max Token Age (sec)': 'maxTokenAge','Min AG Score': 'minAgScore','Min Holders': 'minHoldersCount','Max Holders': 'maxHoldersCount','Min Unique Wallets': 'minUniqueWallets','Max Unique Wallets': 'maxUniqueWallets','Min KYC Wallets': 'minKycWallets','Max KYC Wallets': 'maxKycWallets','Min Bundled %': 'minBundledPercent','Max Bundled %': 'maxBundledPercent','Min Deployer Balance (SOL)': 'minDeployerBalance','Min Buy Ratio %': 'minBuyRatio','Max Buy Ratio %': 'maxBuyRatio','Min Vol MCAP %': 'minVolMcapPercent','Max Vol MCAP %': 'maxVolMcapPercent','Max Drained %': 'maxDrainedPercent','Max Drained Count': 'maxDrainedCount','Min TTC (sec)': 'minTtc','Max TTC (sec)': 'maxTtc','Max Liquidity %': 'maxLiquidityPct','Min Win Pred %': 'minWinPredPercent','Min Liquidity (USD)': 'minLiquidity','Max Liquidity (USD)': 'maxLiquidity','Description': 'needsDescription','Fresh Deployer': 'needsFreshDeployer'
      };
      Object.entries(parameterMap).forEach(([agName, apiName]) => {
        const value = flatConfig[agName];
        if(value !== undefined && value !== null && value !== ''){
          if(apiName === 'needsDescription' || apiName === 'needsFreshDeployer'){
            if(value === true || value === 'Yes') apiParams[apiName] = true;
            else if(value === false || value === 'No') apiParams[apiName] = false;
          } else {
            const numericValue = parseFloat(value);
            if(isNaN(numericValue) || !isFinite(numericValue)) return;
            if(apiName === 'minAgScore'){
              const agScore = Math.max(0, Math.min(10, Math.round(numericValue)));
              apiParams[apiName] = agScore;
            } else apiParams[apiName] = numericValue;
          }
        }
      });
      if(typeof getTriggerMode === 'function'){
        const triggerMode = getTriggerMode();
        if(triggerMode !== null) apiParams.triggerMode = triggerMode;
      }
      apiParams.excludeSpoofedTokens = true;
      apiParams.buyingAmount = cfg.DEFAULT_BUYING_AMOUNT;
      if(typeof getDateRange === 'function'){
        const dateRange = getDateRange();
        if(dateRange.fromDate) apiParams.fromDate = dateRange.fromDate;
        if(dateRange.toDate) apiParams.toDate = dateRange.toDate;
      }
      return apiParams;
    }
    validateConfig(apiParams){
      const pairs = [['minMcap','maxMcap'],['minAgScore','maxAgScore'],['minTokenAge','maxTokenAge'],['minTtc','maxTtc'],['minLiquidity','maxLiquidity'],['minLiquidityPct','maxLiquidityPct'],['minUniqueWallets','maxUniqueWallets'],['minKycWallets','maxKycWallets'],['minHoldersCount','maxHoldersCount'],['minBundledPercent','maxBundledPercent'],['minBuyRatio','maxBuyRatio'],['minVolMcapPercent','maxVolMcapPercent'],['minDrainedPercent','maxDrainedPercent']];
      const errors=[]; pairs.forEach(([a,b])=>{ const av=apiParams[a], bv=apiParams[b]; if(av!==undefined&&bv!==undefined&&!isNaN(av)&&!isNaN(bv)&&parseFloat(av)>parseFloat(bv)) errors.push(`${a}(${av}) > ${b}(${bv})`); });
      return { isValid: errors.length===0, errors };
    }
    buildApiUrl(apiParams){
      const params = new URLSearchParams();
      Object.entries(apiParams).forEach(([k,v])=>{ if(v!==undefined && v!==null && v!=='' ){ if(typeof v==='number' && (isNaN(v)||!isFinite(v))) return; const sv = String(v); if(['NaN','undefined','null'].includes(sv)) return; params.append(k, sv);} });
      const tpParams = cfg.TP_CONFIGURATIONS.map(tp=>`tpSize=${tp.size}&tpGain=${tp.gain}`).join('&');
      return `${this.baseUrl}?${params.toString()}&${tpParams}`;
    }
    async fetchResults(config, retries=3){
      if(!window.burstRateLimiter && AG.rateLimiting && AG.rateLimiting.BurstRateLimiter){
        window.burstRateLimiter = new AG.rateLimiting.BurstRateLimiter();
      }
      const burst = window.burstRateLimiter;
      try{
        if(burst && typeof burst.throttle === 'function') await burst.throttle();
        const apiParams = this.mapParametersToAPI(config);
        const validation = this.validateConfig(apiParams);
        if(!validation.isValid){
          return { success: true, error: 'Skipping Invalid configuration: '+validation.errors.join(', '), validation: validation.errors };
        }
        const url = this.buildApiUrl(apiParams);
        if(url.includes('minAgScore=NaN') || url.includes('minAgScore=undefined')){
          return { success:false, error:'Invalid AG Score parameter (NaN/undefined) detected in API URL', source:'URL_VALIDATION' };
        }
        for(let attempt=1; attempt<=retries; attempt++){
          try{
            const response = await fetch(url,{ method:'GET', credentials:'include', headers:{'Accept':'application/json','Content-Type':'application/json'}});
            if(!response.ok){
              if(response.status === 429){
                if(burst && typeof burst.adaptToBurstLimit === 'function') burst.adaptToBurstLimit();
                let waitTime = Math.max(20000, cfg.RATE_LIMIT_RECOVERY * 2);
                if(attempt>1) waitTime *= Math.pow(2, attempt-1);
                waitTime = Math.min(120000, Math.max(20000, waitTime));
                if(attempt < retries) await (utils.sleep? utils.sleep(waitTime): new Promise(r=>setTimeout(r,waitTime)));
                else return { success:false, error:'Rate limit exceeded after all retries - throttling insufficient', isRateLimit:true, retryable:true };
                continue;
              }
              if(response.status === 500){
                throw new Error('Server Error (500) - possibly invalid parameters');
              }
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            const metrics = { totalTokens: data.totalTokens||0, tpPnlPercent: data.averageTpGain||0, tpPnlSOL: data.pnlSolTp||0, athPnlPercent: data.averageAthGain||0, athPnlSOL: data.pnlSolAth||0, totalSpent: data.totalSolSpent||0, winRate: data.winRate||0, cleanPnL: data.cleanPnL||0, totalSignals: data.totalAvailableSignals||0 };
            if(isNaN(metrics.tpPnlPercent) || isNaN(metrics.totalTokens)) throw new Error('Invalid metrics (NaN)');
            return { success:true, metrics, rawResponse:data, source:'API' };
          }catch(err){
            if(attempt===retries) return { success:false, error: err.message, source:'API' };
            if(!err.message.includes('429')) await (utils.sleep? utils.sleep(1000*attempt): new Promise(r=>setTimeout(r,1000*attempt)));
          }
        }
      }catch(err){
        return { success:false, error: err.message, source:'API' };
      }
    }
  }

  AG.api.fetchWithRetry = fetchWithRetry;
  AG.api.BacktesterAPI = BacktesterAPI;
  AG.api.MODULE_VERSION = 'api-1.0';
  console.log('[AG][api] Loaded');
})(window.AG = window.AG || {});
