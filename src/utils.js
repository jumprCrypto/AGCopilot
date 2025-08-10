(function(AG){
  // Utilities extracted (non-breaking). Original functions kept in monolith until full cutover.
  if(!AG.utils){ AG.utils = {}; }

  AG.utils.sleep = function(ms){ return new Promise(r=>setTimeout(r, ms)); };
  AG.utils.formatTimestamp = function(timestamp){ if(!timestamp) return 'N/A'; return new Date(timestamp * 1000).toISOString().replace('T',' ').split('.')[0]; };
  AG.utils.formatMcap = function(mcap){ if(!mcap) return 'N/A'; if(mcap >= 1000000) return `$${(mcap/1000000).toFixed(2)}M`; if(mcap >= 1000) return `$${(mcap/1000).toFixed(2)}K`; return `$${mcap}`; };
  AG.utils.formatPercent = function(value){ if(value === null || value === undefined) return 'N/A'; return `${value.toFixed(2)}%`; };
  AG.utils.deepClone = function deepClone(obj){ if(obj === null || typeof obj !== 'object') return obj; if(obj instanceof Date) return new Date(obj.getTime()); if(Array.isArray(obj)) return obj.map(deepClone); const cloned={}; for(const k in obj){ if(Object.prototype.hasOwnProperty.call(obj,k)){ cloned[k]=deepClone(obj[k]); } } return cloned; };

  console.log('[AG][utils] Loaded');
})(window.AG = window.AG || {});
