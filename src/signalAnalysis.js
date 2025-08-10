(function(AG){
  if(!AG.signals){ AG.signals = {}; }
  const utils = AG.utils || {};

  // Placeholder minimal dependency stubs expected to exist globally in legacy script:
  // distance calculation & outlier removal

  function removeOutliers(values, method){
    if(!Array.isArray(values) || values.length < 4) return values.slice();
    method = method || 'none';
    if(method === 'none') return values.slice();
    const sorted = values.slice().sort((a,b)=>a-b);
    if(method === 'iqr'){
      const q1 = sorted[Math.floor(sorted.length*0.25)];
      const q3 = sorted[Math.floor(sorted.length*0.75)];
      const iqr = q3 - q1;
      const lower = q1 - 1.5*iqr;
      const upper = q3 + 1.5*iqr;
      return sorted.filter(v=>v>=lower && v<=upper);
    }
    if(method === 'percentile'){
      const lower = sorted[Math.floor(sorted.length*0.05)];
      const upper = sorted[Math.floor(sorted.length*0.95)];
      return sorted.filter(v=>v>=lower && v<=upper);
    }
    if(method === 'zscore'){
      const mean = values.reduce((s,v)=>s+v,0)/values.length;
      const variance = values.reduce((s,v)=>s+Math.pow(v-mean,2),0)/values.length;
      const std = Math.sqrt(variance)||1;
      return values.filter(v=>Math.abs((v-mean)/std) <= 3);
    }
    return values.slice();
  }

  function calculateSignalDistance(a,b){
    let sum=0, count=0;
    const numericFields = ['signalMcap','agScore','tokenAge','deployerAge','deployerBalance','uniqueCount','kycCount','holdersCount','liquidity','liquidityPct','buyVolumePct','bundledPct','drainedPct','volMcapPct','winPredPercent','ttc'];
    numericFields.forEach(f=>{
      if(typeof a[f]==='number' && typeof b[f]==='number'){
        const diff = a[f]-b[f]; sum += diff*diff; count++; }
    });
    return count? Math.sqrt(sum/count): Infinity;
  }

  function findSignalClusters(signals, tokenData, minClusterTokens){
    if(signals.length < 4) return [];
    const normalizedSignals = signals.map(s=>({...s})); // shallow copy; normalization omitted here (legacy still used)
    const signalToToken = new Map();
    let idx=0; tokenData.forEach(t=>{ t.swaps.forEach(sw=>{ if(sw.criteria) signalToToken.set(idx++, t.address); }); });
    const thresholds = [0.15,0.25,0.35,0.45,0.6,0.8,1.0];
    const clusters=[];
    for(const threshold of thresholds){
      const used = new Set();
      const current=[];
      for(let i=0;i<normalizedSignals.length;i++){
        if(used.has(i)) continue;
        const cluster=[i]; const clusterTokens=new Set([signalToToken.get(i)]); used.add(i);
        for(let j=i+1;j<normalizedSignals.length;j++){
          if(used.has(j)) continue;
            const dist = calculateSignalDistance(normalizedSignals[i], normalizedSignals[j]);
            if(dist <= threshold){
              cluster.push(j); used.add(j); clusterTokens.add(signalToToken.get(j));
            }
        }
        if(cluster.length>=2 && clusterTokens.size >= minClusterTokens){
          const avgDistance = cluster.length>1 ? cluster.reduce((sum,aIdx)=> sum + cluster.reduce((inner,jIdx)=> inner + (aIdx!==jIdx? calculateSignalDistance(normalizedSignals[aIdx], normalizedSignals[jIdx]):0),0),0)/(cluster.length*(cluster.length-1)) : 0;
          current.push({ indices: cluster, size: cluster.length, uniqueTokens: clusterTokens.size, tokenCount: clusterTokens.size, signals: cluster.map(i=>signals[i]), threshold, avgDistance });
        }
      }
      if(current.length){ clusters.push(...current); break; }
    }
    const final=[]; const globalUsed=new Set();
    clusters.sort((a,b)=>{ const tight = a.avgDistance - b.avgDistance; if(Math.abs(tight)<0.01) return b.tokenCount - a.tokenCount; return tight; });
    clusters.forEach(c=>{ const overlap = c.indices.some(i=>globalUsed.has(i)); if(!overlap){ c.indices.forEach(i=>globalUsed.add(i)); final.push(c);} });
    return final;
  }

  function analyzeSignalCriteria(allTokenData, bufferPercent=10, outlierMethod='none', useClustering=true){
    const allSignals=[];
    allTokenData.forEach(td=>{ td.swaps.forEach(sw=>{ if(sw.criteria){ allSignals.push({...sw.criteria, signalMcap: sw.signalMcap, athMultiplier: sw.athMcap && sw.signalMcap ? (sw.athMcap/sw.signalMcap):0 }); } }); });
    if(!allSignals.length) throw new Error('No signal criteria found to analyze');
    if(useClustering && allSignals.length>=4){
      const uniqueTokens = new Set(allTokenData.map(t=>t.address)).size;
      const minClusterSize = Math.max(2, Math.min(6, Math.ceil(uniqueTokens*0.3)));
      const clusters = findSignalClusters(allSignals, allTokenData, minClusterSize);
      if(clusters.length){
        const clusteredAnalyses=[];
        clusters.forEach((cluster,index)=>{ try{ const clusterAnalysis = generateClusterAnalysis(cluster.signals, bufferPercent, outlierMethod); clusterAnalysis.tokenCount = allTokenData.length; clusterAnalysis.clusterInfo={ clusterId:index+1, clusterName:`Cluster ${index+1}`, signalCount: cluster.size, tokenCount: cluster.tokenCount, tightness: cluster.avgDistance, threshold: cluster.threshold, description: `${cluster.size} signals from ${cluster.tokenCount} tokens (avg distance: ${cluster.avgDistance.toFixed(3)})`}; clusteredAnalyses.push({ id:`cluster_${index+1}`, name:`Cluster ${index+1}`, description: `${cluster.size} signals from ${cluster.tokenCount} tokens (avg distance: ${cluster.avgDistance.toFixed(3)})`, signalCount: cluster.size, tokenCount: cluster.tokenCount, tightness: cluster.avgDistance, threshold: cluster.threshold, analysis: clusterAnalysis, signals: cluster.signals }); }catch(e){} });
        if(clusteredAnalyses.length){ const fullAnalysis = generateFullAnalysis(allSignals, bufferPercent, outlierMethod); fullAnalysis.tokenCount = allTokenData.length; return { type:'clustered', clusters: clusteredAnalyses, fallback: fullAnalysis, totalSignals: allSignals.length, clusteredSignals: clusteredAnalyses.reduce((s,c)=>s+c.signalCount,0), usedClustering:true }; }
      }
    }
    const standard = generateFullAnalysis(allSignals, bufferPercent, outlierMethod); standard.tokenCount = allTokenData.length; return { type:'standard', analysis: standard, usedClustering:false };
  }

  function generateFullAnalysis(allSignals, bufferPercent, outlierMethod){ return generateAnalysisFromSignals(allSignals, bufferPercent, outlierMethod); }
  function generateClusterAnalysis(clusterSignals, bufferPercent, outlierMethod){ return generateAnalysisFromSignals(clusterSignals, bufferPercent, outlierMethod); }

  function generateAnalysisFromSignals(signals, bufferPercent, outlierMethod){
    function applyBuffer(value, isMin=true, isPercent=false){ if(value==null) return null; const multiplier = isMin? (1 - bufferPercent/100):(1 + bufferPercent/100); let r = value*multiplier; if(isPercent){ r = Math.max(0, Math.min(100, r)); } else if(r<0){ r=0;} return Math.round(r*100)/100; }
    function getValidValues(field){ return removeOutliers(signals.map(s=>s[field]).filter(v=>v!=null && !isNaN(v)), outlierMethod); }
    const analysis={ totalSignals: signals.length, bufferPercent, outlierMethod };
    // MCAP
    (function(){ const raw = signals.map(s=>s.signalMcap).filter(m=>m&&m>0); const mcaps=removeOutliers(raw,outlierMethod); if(!mcaps.length){ analysis.mcap={ min:0,max:20000,avg:0,count:0, originalCount: raw.length, filteredCount:0, outlierMethod }; return;} const min=Math.min(...mcaps), max=Math.max(...mcaps), avg=mcaps.reduce((s,m)=>s+m,0)/mcaps.length; const sorted=[...mcaps].sort((a,b)=>a-b); const p75=sorted[Math.floor(sorted.length*0.75)]||max; analysis.mcap={ min:Math.round(min), max:Math.round(applyBuffer(max,false)), avg:Math.round(avg), count: mcaps.length, originalCount: raw.length, filteredCount: mcaps.length, outliersRemoved: raw.length-mcaps.length, tightestMax: Math.round(applyBuffer(p75,false)), outlierMethod }; })();
    // AG Score
    (function(){ const scores=getValidValues('agScore'); if(!scores.length){ analysis.agScore={min:0,max:100,avg:0,count:0}; return;} const min=Math.min(...scores), max=Math.max(...scores), avg=scores.reduce((s,v)=>s+v,0)/scores.length; analysis.agScore={ min:Math.round(applyBuffer(min,true)), max:Math.round(applyBuffer(max,false)), avg:Math.round(avg), count:scores.length }; })();
    // Token Age (sec->min)
    (function(){ const ages=getValidValues('tokenAge'); if(!ages.length){ analysis.tokenAge={min:0,max:10080,avg:0,count:0}; return;} const mins=ages.map(a=>a/60); const min=Math.min(...mins), max=Math.max(...mins), avg=mins.reduce((s,a)=>s+a,0)/mins.length; analysis.tokenAge={ min:Math.round(applyBuffer(min,true)), max:Math.round(applyBuffer(max,false)), avg:Math.round(avg), count: mins.length }; })();
    // Deployer Age
    (function(){ const ages=getValidValues('deployerAge'); if(!ages.length){ analysis.deployerAge={min:0,max:10080,avg:0,count:0}; return;} const mins=ages.map(a=>a/60); const min=Math.min(...mins), max=Math.max(...mins), avg=mins.reduce((s,a)=>s+a,0)/mins.length; analysis.deployerAge={ min:Math.round(applyBuffer(min,true)), max:Math.round(applyBuffer(max,false)), avg:Math.round(avg), count: mins.length }; })();
    // Deployer Balance
    (function(){ const balances=getValidValues('deployerBalance'); if(!balances.length){ analysis.deployerBalance={min:0,max:1000,avg:0,count:0}; return;} const min=Math.min(...balances), max=Math.max(...balances), avg=balances.reduce((s,b)=>s+b,0)/balances.length; analysis.deployerBalance={ min:applyBuffer(min,true), max:applyBuffer(max,false), avg: Math.round(avg*100)/100, count: balances.length }; })();
    // Unique Wallets
    (function(){ const counts=getValidValues('uniqueCount'); if(!counts.length){ analysis.uniqueWallets={min:0,max:1000,avg:0,count:0}; return;} const min=Math.min(...counts), max=Math.max(...counts), avg=counts.reduce((s,c)=>s+c,0)/counts.length; analysis.uniqueWallets={ min:Math.round(applyBuffer(min,true)), max:Math.round(applyBuffer(max,false)), avg:Math.round(avg), count: counts.length }; })();
    // KYC Wallets
    (function(){ const counts=getValidValues('kycCount'); if(!counts.length){ analysis.kycWallets={min:0,max:100,avg:0,count:0}; return;} const min=Math.min(...counts), max=Math.max(...counts), avg=counts.reduce((s,c)=>s+c,0)/counts.length; analysis.kycWallets={ min:Math.round(applyBuffer(min,true)), max:Math.round(applyBuffer(max,false)), avg:Math.round(avg), count: counts.length }; })();
    // Holders
    (function(){ const counts=getValidValues('holdersCount'); if(!counts.length){ analysis.holders={min:0,max:1000,avg:0,count:0}; return;} const min=Math.min(...counts), max=Math.max(...counts), avg=counts.reduce((s,c)=>s+c,0)/counts.length; analysis.holders={ min:Math.round(applyBuffer(min,true)), max:Math.round(applyBuffer(max,false)), avg:Math.round(avg), count: counts.length }; })();
    // Liquidity
    (function(){ const liq=getValidValues('liquidity'); if(!liq.length){ analysis.liquidity={min:0,max:100000,avg:0,count:0}; return;} const min=Math.min(...liq), max=Math.max(...liq), avg=liq.reduce((s,l)=>s+l,0)/liq.length; analysis.liquidity={ min:Math.round(applyBuffer(min,true)), max:Math.round(applyBuffer(max,false)), avg:Math.round(avg), count: liq.length }; })();
    // Liquidity %
    (function(){ const p=getValidValues('liquidityPct'); if(!p.length){ analysis.liquidityPct={min:0,max:100,avg:0,count:0}; return;} analysis.liquidityPct={ min:applyBuffer(Math.min(...p),true,true), max:applyBuffer(Math.max(...p),false,true), avg: Math.round((p.reduce((s,v)=>s+v,0)/p.length)*100)/100, count: p.length }; })();
    // Buy Volume %
    (function(){ const p=getValidValues('buyVolumePct'); if(!p.length){ analysis.buyVolumePct={min:0,max:100,avg:0,count:0}; return;} analysis.buyVolumePct={ min:applyBuffer(Math.min(...p),true,true), max:applyBuffer(Math.max(...p),false,true), avg: Math.round((p.reduce((s,v)=>s+v,0)/p.length)*100)/100, count: p.length }; })();
    // Bundled %
    (function(){ const p=getValidValues('bundledPct'); if(!p.length){ analysis.bundledPct={min:0,max:100,avg:0,count:0}; return;} analysis.bundledPct={ min:applyBuffer(Math.min(...p),true,true), max:applyBuffer(Math.max(...p),false,true), avg: Math.round((p.reduce((s,v)=>s+v,0)/p.length)*100)/100, count: p.length }; })();
    // Drained %
    (function(){ const p=getValidValues('drainedPct'); if(!p.length){ analysis.drainedPct={min:0,max:100,avg:0,count:0}; return;} const min=Math.min(...p), max=Math.max(...p); analysis.drainedPct={ min:applyBuffer(min,true,true), max:applyBuffer(max,false,true), avg: Math.round((p.reduce((s,v)=>s+v,0)/p.length)*100)/100, count: p.length }; })();
    // Vol MCAP %
    (function(){ const p=getValidValues('volMcapPct'); if(!p.length){ analysis.volMcapPct={min:0,max:300,avg:0,count:0}; return;} analysis.volMcapPct={ min:applyBuffer(Math.min(...p),true), max:applyBuffer(Math.max(...p),false), avg: Math.round((p.reduce((s,v)=>s+v,0)/p.length)*100)/100, count: p.length }; })();
    // Win Pred %
    (function(){ const wp=getValidValues('winPredPercent'); if(!wp.length){ analysis.winPred={min:0,max:100,avg:0,count:0}; return;} const min=Math.min(...wp), max=Math.max(...wp), avg=wp.reduce((s,v)=>s+v,0)/wp.length; analysis.winPred={ min:applyBuffer(min,true,true), max:applyBuffer(max,false,true), avg: Math.round(avg*100)/100, count: wp.length }; })();
    // TTC
    (function(){ const t=getValidValues('ttc'); if(!t.length){ analysis.ttc={min:0,max:3600,avg:0,count:0}; return;} const min=Math.min(...t), max=Math.max(...t), avg=t.reduce((s,v)=>s+v,0)/t.length; analysis.ttc={ min:Math.round(applyBuffer(min,true)), max:Math.round(applyBuffer(max,false)), avg:Math.round(avg), count: t.length }; })();
    // Booleans
    analysis.freshDeployer={ trueCount: signals.filter(s=>s.freshDeployer===true).length, falseCount: signals.filter(s=>s.freshDeployer===false).length, nullCount: signals.filter(s=>s.freshDeployer==null).length, preferredValue:null };
    analysis.hasDescription={ trueCount: signals.filter(s=>s.hasDescription===true).length, falseCount: signals.filter(s=>s.hasDescription===false).length, nullCount: signals.filter(s=>s.hasDescription==null).length, preferredValue:null };
    analysis.hasSocials={ trueCount: signals.filter(s=>s.hasSocials===true).length, falseCount: signals.filter(s=>s.hasSocials===false).length, nullCount: signals.filter(s=>s.hasSocials==null).length, preferredValue:null };
    ['freshDeployer','hasDescription','hasSocials'].forEach(f=>{ const d=analysis[f]; if(d.trueCount>d.falseCount) d.preferredValue=true; else if(d.falseCount>d.trueCount) d.preferredValue=false; else d.preferredValue=null; });
    return analysis;
  }

  function generateTightestConfig(analysis){
    const config={ metadata:{ generatedAt:new Date().toISOString(), basedOnSignals: analysis.totalSignals, basedOnTokens: analysis.tokenCount, bufferPercent: analysis.bufferPercent, outlierMethod: analysis.outlierMethod, configType:'Tightest Generated Config' } };
    if(analysis.clusterInfo){ config.metadata.clusterInfo = analysis.clusterInfo; config.metadata.configType = `Cluster ${analysis.clusterInfo.clusterId} Config`; }
    if(analysis.mcap && analysis.mcap.min!=null) config['Min MCAP (USD)']=analysis.mcap.min;
    if(analysis.mcap && analysis.mcap.tightestMax!=null) config['Max MCAP (USD)']=analysis.mcap.tightestMax; else if(analysis.mcap && analysis.mcap.max!=null) config['Max MCAP (USD)']=analysis.mcap.max;
    if(analysis.agScore && analysis.agScore.min!=null) config['Min AG Score']=analysis.agScore.min;
    if(analysis.tokenAge && analysis.tokenAge.max!=null && analysis.tokenAge.count>0) config['Max Token Age (sec)']=analysis.tokenAge.max;
    if(analysis.tokenAge && analysis.tokenAge.min!=null && analysis.tokenAge.count>0) config['Min Token Age (sec)']=analysis.tokenAge.min;
    if(analysis.deployerAge && analysis.deployerAge.min!=null && analysis.deployerAge.count>0) config['Min Deployer Age (min)']=analysis.deployerAge.min;
    if(analysis.uniqueWallets && analysis.uniqueWallets.min!=null && analysis.uniqueWallets.count>0) config['Min Unique Wallets']=analysis.uniqueWallets.min;
    if(analysis.uniqueWallets && analysis.uniqueWallets.max!=null && analysis.uniqueWallets.count>0) config['Max Unique Wallets']=analysis.uniqueWallets.max;
    if(analysis.kycWallets && analysis.kycWallets.min!=null && analysis.kycWallets.count>0) config['Min KYC Wallets']=analysis.kycWallets.min;
    if(analysis.kycWallets && analysis.kycWallets.max!=null && analysis.kycWallets.count>0) config['Max KYC Wallets']=analysis.kycWallets.max;
    if(analysis.holders && analysis.holders.min!=null && analysis.holders.count>0) config['Min Holders']=analysis.holders.min;
    if(analysis.holders && analysis.holders.max!=null && analysis.holders.count>0) config['Max Holders']=analysis.holders.max;
    if(analysis.liquidity && analysis.liquidity.min!=null && analysis.liquidity.count>0) config['Min Liquidity (USD)']=analysis.liquidity.min;
    if(analysis.liquidity && analysis.liquidity.max!=null && analysis.liquidity.count>0) config['Max Liquidity (USD)']=analysis.liquidity.max;
    if(analysis.liquidityPct && analysis.liquidityPct.max!=null && analysis.liquidityPct.count>0){ if(analysis.liquidityPct.max >= 20) config['Max Liquidity %']=analysis.liquidityPct.max; }
    if(analysis.buyVolumePct && analysis.buyVolumePct.min!=null && analysis.buyVolumePct.count>0) config['Min Buy Ratio %']=analysis.buyVolumePct.min;
    if(analysis.buyVolumePct && analysis.buyVolumePct.max!=null && analysis.buyVolumePct.count>0){ if(analysis.buyVolumePct.max >= 80) config['Max Buy Ratio %']=analysis.buyVolumePct.max; }
    if(analysis.volMcapPct && analysis.volMcapPct.min!=null && analysis.volMcapPct.count>0) config['Min Vol MCAP %']=analysis.volMcapPct.min;
    if(analysis.volMcapPct && analysis.volMcapPct.max!=null && analysis.volMcapPct.count>0) config['Max Vol MCAP %']=analysis.volMcapPct.max;
    if(analysis.bundledPct && analysis.bundledPct.min!=null && analysis.bundledPct.count>0) config['Min Bundled %']=analysis.bundledPct.min;
    if(analysis.bundledPct && analysis.bundledPct.max!=null && analysis.bundledPct.count>0) config['Max Bundled %']=analysis.bundledPct.max;
    if(analysis.drainedPct && analysis.drainedPct.max!=null && analysis.drainedPct.count>0){ if(analysis.drainedPct.max >=5) config['Max Drained %']=analysis.drainedPct.max; else if(analysis.drainedPct.max <5 && analysis.drainedPct.max>=0) config['Max Drained %']=5; }
    if(analysis.deployerBalance && analysis.deployerBalance.min!=null && analysis.deployerBalance.count>0) config['Min Deployer Balance (SOL)']=analysis.deployerBalance.min;
    if(analysis.freshDeployer && analysis.freshDeployer.preferredValue!==undefined) config['Fresh Deployer']=analysis.freshDeployer.preferredValue;
    if(analysis.hasDescription && analysis.hasDescription.preferredValue!==undefined) config['Description']=analysis.hasDescription.preferredValue;
    if(analysis.winPred && analysis.winPred.min!=null && analysis.winPred.count>0) config['Min Win Pred %']=analysis.winPred.min;
    if(analysis.ttc && analysis.ttc.min!=null && analysis.ttc.count>0) config['Min TTC (sec)']=analysis.ttc.min;
    if(analysis.ttc && analysis.ttc.max!=null && analysis.ttc.count>0){ if(analysis.ttc.max >=60) config['Max TTC (sec)']=analysis.ttc.max; }
    return config;
  }

  AG.signals.removeOutliers = removeOutliers;
  AG.signals.findSignalClusters = findSignalClusters;
  AG.signals.analyzeSignalCriteria = analyzeSignalCriteria;
  AG.signals.generateTightestConfig = generateTightestConfig;
  AG.signals.MODULE_VERSION = 'signals-1.0';
  console.log('[AG][signals] Loaded');
})(window.AG = window.AG || {});
