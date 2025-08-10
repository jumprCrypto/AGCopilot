(function(){
  if (!window.AG) return;
  if (window.AG.bridge){ console.log('[AG.bridge] Already initialized'); return; }

  function expose(name, value){
    if (!value) return;
    window[name] = value; // overwrite for rewiring
  }

  // Scoring
  if (window.AG.scoring){ expose('calculateRobustScore', window.AG.scoring.calculateRobustScore); }

  // Rate limiting
  if (window.AG.rateLimiting){
    expose('BurstRateLimiter', window.AG.rateLimiting.BurstRateLimiter);
    expose('APIRateLimiter', window.AG.rateLimiting.APIRateLimiter);
  }

  // API
  if (window.AG.api){
    expose('BacktesterAPI', window.AG.api.BacktesterAPI);
    expose('fetchWithRetry', window.AG.api.fetchWithRetry);
  }

  // Signal analysis
  if (window.AG.signals){
    const s = window.AG.signals;
    expose('removeOutliers', s.removeOutliers);
    expose('findSignalClusters', s.findSignalClusters);
    expose('analyzeSignalCriteria', s.analyzeSignalCriteria);
    expose('generateTightestConfig', s.generateTightestConfig);
  }

  // Optimizer
  if (window.AG.optimizer){
    const o = window.AG.optimizer;
    expose('LatinHypercubeSampler', o.LatinHypercubeSampler);
    expose('SimulatedAnnealing', o.SimulatedAnnealing);
    expose('EnhancedOptimizer', o.EnhancedOptimizer);
    expose('ChainedOptimizer', o.ChainedOptimizer);
  }

  // UI helpers
  if (window.AG.ui){ expose('formatConfigForDisplay', window.AG.ui.formatConfigForDisplay); }

  window.AG.bridge = { timestamp: Date.now(), rewired: true };
  console.log('[AG.bridge] Global symbols rewired to modular implementations');
})();
