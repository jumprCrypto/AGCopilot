// Lightweight browser smoke test for AGCopilot modular build.
// Usage (after loader + modules have been injected): window.AG.smoke.run()
(function(){
  const AG = window.AG = window.AG || {};
  if(!AG.smoke){ AG.smoke = {}; }
  AG.smoke.run = function(){
    const errors = [];
    function check(cond,msg){ if(!cond) errors.push(msg); }
    check(AG.constants && AG.constants.CONFIG, 'CONFIG missing');
    check(AG.utils && typeof AG.utils.formatMcap==='function', 'utils.formatMcap missing');
    check(AG.api && typeof AG.api.BacktesterAPI==='function', 'api.BacktesterAPI missing');
    check(AG.signals && typeof AG.signals.analyzeSignalCriteria==='function', 'signals.analyzeSignalCriteria missing');
    check(AG.optimizer && AG.optimizer.EnhancedOptimizer, 'optimizer.EnhancedOptimizer missing');
    check(AG.ui && typeof AG.ui.formatConfigForDisplay==='function', 'ui.formatConfigForDisplay missing');
    if(errors.length){
      console.group('[AG][smoke] Fail');
      errors.forEach(e=>console.warn('•', e));
      console.groupEnd();
      return { ok:false, errors };
    }
    console.log(`[AG][smoke] All core modules present (v${AG.constants.VERSION})`);
    return { ok:true };
  };
  console.log('[AG][smoke] Browser smoke helper ready. Call window.AG.smoke.run() after loader completes.');
})();
