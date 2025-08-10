(function(AG){
  if(!AG.scoring){ AG.scoring = {}; }
  const cfg = AG.constants.CONFIG;

  function calculateRobustScore(metrics){
    if(!metrics){ return null; }
    if(metrics.tpPnlPercent === undefined || metrics.totalTokens === undefined) return null;
    if(!cfg.USE_ROBUST_SCORING){
      return { score: metrics.tpPnlPercent, components:{ rawPnL: metrics.tpPnlPercent, winRate: metrics.winRate||0, reliabilityFactor:1, finalScore: metrics.tpPnlPercent }, scoringMethod:'Raw TP PnL %' };
    }
    const rawPnL = metrics.tpPnlPercent;
    const winRate = metrics.winRate || 0;
    const tokensCount = metrics.totalTokens || 1;
    const reliabilityFactor = Math.min(1.0, Math.log(tokensCount)/Math.log(100));
    let scaledThresholds = { MEDIUM_SAMPLE_THRESHOLD: cfg.MEDIUM_SAMPLE_THRESHOLD, LARGE_SAMPLE_THRESHOLD: cfg.LARGE_SAMPLE_THRESHOLD };
    if(typeof getScaledTokenThresholds === 'function'){
      try { scaledThresholds = getScaledTokenThresholds(); } catch(e){}
    }
    let effectiveMinWinRate, sampleTier;
    if(tokensCount >= scaledThresholds.LARGE_SAMPLE_THRESHOLD){ effectiveMinWinRate = cfg.MIN_WIN_RATE_LARGE_SAMPLE; sampleTier='Large'; }
    else if(tokensCount >= scaledThresholds.MEDIUM_SAMPLE_THRESHOLD){ effectiveMinWinRate = cfg.MIN_WIN_RATE_MEDIUM_SAMPLE; sampleTier='Medium'; }
    else { effectiveMinWinRate = cfg.MIN_WIN_RATE; sampleTier='Small'; }
    if(winRate < effectiveMinWinRate){
      return { score: -Infinity, rejected:true, rejectionReason:`Win rate ${winRate.toFixed(1)}% below required ${effectiveMinWinRate}% for ${sampleTier.toLowerCase()} samples`, components:{ rawPnL: rawPnL, winRate, reliabilityFactor, effectiveMinWinRate, sampleTier, tokensCount }, scoringMethod:`REJECTED - ${sampleTier} Sample: ${effectiveMinWinRate}% min win rate required` };
    }
    const returnComponent = rawPnL * cfg.RETURN_WEIGHT;
    const consistencyComponent = winRate * cfg.CONSISTENCY_WEIGHT;
    const baseScore = returnComponent + consistencyComponent;
    const reliabilityAdjustedScore = baseScore * (1 - cfg.RELIABILITY_WEIGHT) + baseScore * reliabilityFactor * cfg.RELIABILITY_WEIGHT;
    const finalScore = reliabilityAdjustedScore; // winRatePenalty is always 1 in current logic
    return { score: finalScore, components:{ rawPnL: rawPnL, winRate, reliabilityFactor, effectiveMinWinRate, sampleTier, tokensCount, returnComponent, consistencyComponent, baseScore, reliabilityAdjustedScore, finalScore }, scoringMethod:`Robust Multi-Factor (${sampleTier} Sample: ${effectiveMinWinRate}% min win rate met)` };
  }

  AG.scoring.calculateRobustScore = calculateRobustScore;
  AG.scoring.MODULE_VERSION = 'scoring-1.0';
  console.log('[AG][scoring] Loaded');
})(window.AG = window.AG || {});
