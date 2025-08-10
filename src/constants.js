(function(AG){
  // Constants module (read-only copy). Does NOT overwrite window.CONFIG used by legacy monolith.
  // When full cutover happens, legacy script can be trimmed and these become the source of truth.
  if(!AG.constants){ AG.constants = {}; }

  const VERSION = '2.0.0-modular-beta';

  const CONFIG = {
    MAX_RUNTIME_MIN: 30,
    BACKTEST_WAIT: 20000,
    MIN_TOKENS: 50,
    TARGET_PNL: 100.0,
    CHAIN_RUN_COUNT: 3,
    USE_CONFIG_CACHING: true,
    USE_PARAMETER_IMPACT_ANALYSIS: true,
    USE_GENETIC_ALGORITHM: true,
    USE_SIMULATED_ANNEALING: true,
    USE_LATIN_HYPERCUBE_SAMPLING: true,
    USE_MULTIPLE_STARTING_POINTS: true,
    USE_ROBUST_SCORING: true,
    MIN_WIN_RATE: 50.0,
    MIN_WIN_RATE_MEDIUM_SAMPLE: 40.0,
    MIN_WIN_RATE_LARGE_SAMPLE: 30.0,
    MEDIUM_SAMPLE_THRESHOLD: 500,
    LARGE_SAMPLE_THRESHOLD: 1000,
    RELIABILITY_WEIGHT: 0.3,
    CONSISTENCY_WEIGHT: 0.4,
    RETURN_WEIGHT: 0.6,
    API_BASE_URL: 'https://backtester.alphagardeners.xyz/api',
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    REQUEST_DELAY: 9360,
    DEFAULT_BUYING_AMOUNT: 0.25,
    TP_CONFIGURATIONS: [
      { size: 20, gain: 300 },
      { size: 20, gain: 650 },
      { size: 20, gain: 1400 },
      { size: 20, gain: 3000 },
      { size: 20, gain: 10000 }
    ],
    RATE_LIMIT_THRESHOLD: 20,
    RATE_LIMIT_RECOVERY: 10000,
    RATE_LIMIT_SAFETY_MARGIN: 1.5,
    INTRA_BURST_DELAY: 100,
    MAX_REQUESTS_PER_MINUTE: 50,
    USE_BURST_RATE_LIMITING: true,
    SMART_BURST_SIZE: true,
    RATE_LIMIT_MODE: 'normal',
    RATE_LIMIT_MODES: {
      normal: { BACKTEST_WAIT: 20000, RATE_LIMIT_THRESHOLD: 20, RATE_LIMIT_RECOVERY: 10000, REQUEST_DELAY: 9360, INTRA_BURST_DELAY: 100 },
      slower: { BACKTEST_WAIT: 30000, RATE_LIMIT_THRESHOLD: 15, RATE_LIMIT_RECOVERY: 15000, REQUEST_DELAY: 14000, INTRA_BURST_DELAY: 150 }
    }
  };

  const PARAM_RULES = {
    'Min MCAP (USD)': { min: 0, max: 10000, step: 1000, type: 'integer'},
    'Max MCAP (USD)': { min: 10000, max: 60000, step: 1000, type: 'integer' },
    'Min Deployer Age (min)': { min: 0, max: 1440, step: 5, type: 'integer' },
    'Min Token Age (sec)': { min: 0, max: 99999, step: 15, type: 'integer' },
    'Max Token Age (sec)': { min: 0, max: 99999, step: 15, type: 'integer' },
    'Min AG Score': { min: 0, max: 10, step: 1, type: 'integer' },
    'Min Holders': { min: 1, max: 5, step: 1, type: 'integer' },
    'Max Holders': { min: 1, max: 50, step: 5, type: 'integer' },
    'Min Unique Wallets': { min: 1, max: 3, step: 1, type: 'integer' },
    'Max Unique Wallets': { min: 1, max: 8, step: 1, type: 'integer' },
    'Min KYC Wallets': { min: 0, max: 3, step: 1, type: 'integer' },
    'Max KYC Wallets': { min: 1, max: 8, step: 1, type: 'integer' },
    'Min Bundled %': { min: 0, max: 50, step: 1 },
    'Max Bundled %': { min: 0, max: 100, step: 5 },
    'Min Deployer Balance (SOL)': { min: 0, max: 10, step: 0.5 },
    'Min Buy Ratio %': { min: 0, max: 50, step: 10 },
    'Max Buy Ratio %': { min: 50, max: 100, step: 5 },
    'Min Vol MCAP %': { min: 0, max: 100, step: 10 },
    'Max Vol MCAP %': { min: 33, max: 300, step: 20 },
    'Max Drained %': { min: 0, max: 100, step: 5 },
    'Max Drained Count': { min: 0, max: 11, step: 1, type: 'integer' },
    'Min TTC (sec)': { min: 0, max: 3600, step: 5, type: 'integer' },
    'Max TTC (sec)': { min: 10, max: 3600, step: 10, type: 'integer' },
    'Max Liquidity %': { min: 10, max: 100, step: 10, type: 'integer' },
    'Min Win Pred %': { min: 0, max: 70, step: 5, type: 'integer' }
  };

  const COMPLETE_CONFIG_TEMPLATE = {
    basic: { 'Min MCAP (USD)': undefined, 'Max MCAP (USD)': undefined },
    tokenDetails: { 'Min Deployer Age (min)': undefined, 'Min Token Age (sec)': undefined, 'Max Token Age (sec)': undefined, 'Min AG Score': undefined },
    wallets: { 'Min Unique Wallets': undefined, 'Min KYC Wallets': undefined, 'Max KYC Wallets': undefined, 'Max Unique Wallets': undefined, 'Min Holders': undefined, 'Max Holders': undefined },
    risk: { 'Min Bundled %': undefined, 'Max Bundled %': undefined, 'Min Deployer Balance (SOL)': undefined, 'Min Buy Ratio %': undefined, 'Max Buy Ratio %': undefined, 'Min Vol MCAP %': undefined, 'Max Vol MCAP %': undefined, 'Max Drained %': undefined, 'Max Drained Count': undefined, 'Description': undefined, 'Fresh Deployer': undefined },
    advanced: { 'Min TTC (sec)': undefined, 'Max TTC (sec)': undefined, 'Max Liquidity %': undefined, 'Min Win Pred %': undefined }
  };

  const PRESETS = {
    9747: { category: 'Custom', description: 'Buy Ratio 97%+, Min V2MC 47%', risk: { 'Min Buy Ratio %': 97, 'Max Buy Ratio %': 100, 'Min Vol MCAP %': 47 } },
    oldDeployer: { category: 'Custom', description: 'Old Deployer', tokenDetails: { 'Min Deployer Age (min)': 43200, 'Min AG Score': '4' } },
    oldishDeployer: { category: 'Custom', description: 'Oldish Deployer', tokenDetails: { 'Min Deployer Age (min)': 1200, 'Min AG Score': '6' }, risk: { 'Max Bundled %': 5, 'Min Buy Ratio %': 20, 'Max Vol MCAP %': 40, 'Max Drained Count': 6 }, advanced: { 'Max TTC (sec)': 400 } },
    minWinPred: { category: 'Custom', description: 'Min Win Pred % 28', advanced: { 'Min Win Pred %': 28 } },
    bundle1_74: { category: 'Custom', description: 'Max Bundled % 1.74', risk: { 'Max Bundled %': 1.74 } },
    deployerBalance10: { category: 'Custom', description: 'Min Deployer Balance 10 SOL', risk: { 'Min Deployer Balance (SOL)': 10 } },
    agScore7: { category: 'Custom', description: 'Min AG Score 7', tokenDetails: { 'Min AG Score': '7' } },
    TTCNineHundred: { priority: 1, category: 'Param Discovery', description: 'Min TTC 900', advanced: { 'Min TTC (sec)': 900 } },
    UnqWallet3: { priority: 2, category: 'Param Discovery', description: '3+ Unq', wallets: { 'Min Unique Wallets': 3 } },
    MinMcap10k: { priority: 3, category: 'Param Discovery', description: 'Min MCAP 10K', basic: { 'Min MCAP (USD)': 10000 } },
    highAgScore: { priority: 4, category: 'Param Discovery', description: 'Min AG Score 8', tokenDetails: { 'Min AG Score': '8' } },
    moderateDrainTolerance: { priority: 5, category: 'Param Discovery', description: 'Max Drained 50%', risk: { 'Max Drained %': 50 } },
    kycRequired: { priority: 6, category: 'Param Discovery', description: 'Min KYC Wallets 3', wallets: { 'Min KYC Wallets': 3 } },
    zeroDrainTolerance: { priority: 7, category: 'Param Discovery', description: 'Max Drained Count 0', risk: { 'Max Drained Count': 0 } },
    mediumVolMcap: { priority: 8, category: 'Param Discovery', description: 'Min Vol MCAP % 30', risk: { 'Min Vol MCAP %': 30 } },
    agedTokens: { priority: 9, category: 'Param Discovery', description: 'Min Token Age (sec) 10005', tokenDetails: { 'Min Token Age (sec)': 10005 } },
    lowVolMcapCap: { priority: 10, category: 'Param Discovery', description: 'Max Vol MCAP % 33', risk: { 'Max Vol MCAP %': 33 } }
  };

  AG.constants.VERSION = VERSION;
  AG.constants.CONFIG = CONFIG; // reference copy
  AG.constants.PARAM_RULES = PARAM_RULES;
  AG.constants.COMPLETE_CONFIG_TEMPLATE = COMPLETE_CONFIG_TEMPLATE;
  AG.constants.PRESETS = PRESETS;
  AG.constants.MODULE_VERSION = 'constants-1.0';
  console.log('[AG][constants] Loaded');
})(window.AG = window.AG || {});
