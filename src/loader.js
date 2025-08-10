(function(){
  if (window.AG && window.AG.__loaderActive){ console.log('[AG.loader] Already active'); return; }
  if (!window.AG) window.AG = {};
  window.AG.__loaderActive = true;

  const LOADER_VERSION = '1.0.0';
  const REPO_BASE = 'https://raw.githubusercontent.com/jumprCrypto/AGCopilot/refs/heads/main/AGCopilot/src';
  const MANIFEST_URL = `${REPO_BASE}/manifest.json`;

  async function fetchText(url){
    const res = await fetch(url + `?t=${Date.now()}`); // cache-bust
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    return res.text();
  }

  async function loadScript(url){
    const code = await fetchText(url);
    try { (0,eval)(code); console.log(`[AG.loader] Loaded: ${url.split('/').pop()}`); }
    catch(e){ console.error('[AG.loader] Eval failed for', url, e); throw e; }
  }

  function logBanner(msg){ console.log(`%c${msg}`, 'color:#63b3ed;font-weight:bold;'); }

  async function loadAll(){
    logBanner('🔄 AGCopilot Modular Loader v'+LOADER_VERSION+' starting');
    let manifest; try { manifest = JSON.parse(await fetchText(MANIFEST_URL)); } catch(e){ console.error('❌ Failed to load manifest:', e.message); return; }
    if (!manifest.modules || !Array.isArray(manifest.modules)){ console.error('❌ Invalid manifest format'); return; }
    for (const mod of manifest.modules){
      const url = `${REPO_BASE}/${mod}`; try { await loadScript(url); } catch(e){ console.error('❌ Aborting due to module load failure:', mod); return; }
    }
    if (window.AG && window.AG.main && window.AG.main.bootstrap){ try { window.AG.main.bootstrap(); } catch(e){ console.warn('Bootstrap error:', e.message); } }
    logBanner('✅ AGCopilot modules loaded');
  }

  loadAll();
})();
