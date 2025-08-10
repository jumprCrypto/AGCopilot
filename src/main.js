(function(){
  if (!window.AG) { console.warn('[AG.main] AG namespace missing'); return; }
  if (window.AG.main) { console.log('[AG.main] Already loaded'); return; }

  function bootstrap() {
    if (document.getElementById('ag-copilot-enhanced-ui')) {
      console.log('[AG.main] Legacy/Existing UI detected, no bootstrap needed');
      return;
    }
    if (window.AG.ui && window.AG.ui.createFullUI) {
      window.AG.ui.createFullUI();
      if (window.AG.ui.registerEventHandlers) window.AG.ui.registerEventHandlers();
      console.log('[AG.main] UI bootstrapped via modular system');
    } else {
      console.warn('[AG.main] UI module not available for bootstrap');
    }
  }

  window.AG.main = { bootstrap };
  console.log('[AG.main] main module loaded (bootstrap available: window.AG.main.bootstrap())');
})();
