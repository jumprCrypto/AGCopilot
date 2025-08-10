# 🤖 AG Co-Pilot Enhanced v2.0 - Advanced Optimization + Direct API Integration

AG Co-Pilot Enhanced is a sophisticated browser-based optimization engine that directly integrates with backtester APIs to intelligently tune configuration parameters. It combines multiple advanced search strategies with robust scoring systems, real-time progress tracking, and chained optimization runs to find high-performing configurations with maximum efficiency and reliability.

---

## 🚀 Features

### ⚡ Direct API Integration (NEW v2.0)
- **Direct Backtester API** – Bypasses UI scraping with direct API calls to `backtester.alphagardeners.xyz/api/stats`
- **Parameter Mapping** – Automatic translation from UI parameter names to API parameter names
- **Multi-TP Analysis** – Supports multiple take-profit configurations for accurate PnL calculations
- **Smart Rate Limiting** – Ultra-conservative burst rate limiting with 0-1 rate limit errors per session
- **API Validation** – Real-time parameter validation and error handling

### 🏆 Robust Scoring System (NEW v2.0)
- **Outlier-Resistant Metrics** – Advanced scoring that handles extreme outliers gracefully
- **Adaptive Win Rate Thresholds** – Dynamic requirements based on sample size (Small: 50%, Medium: 40%, Large: 30%)
- **Sample Size Reliability** – Logarithmic scaling based on token count for more reliable scores
- **Strict Rejection Logic** – Configurations below win rate thresholds are immediately rejected
- **Composite Scoring** – Combines raw PnL (60%), win rate consistency (40%), and reliability weighting

### 📊 Enhanced Progress Tracking (NEW v2.0)
- **Real-Time Progress** – Live updates with tests completed, failure rates, and runtime
- **Run Progress Display** – Clear visualization of current run vs total runs (e.g., "Run: 3/50")
- **Time Estimates** – Accurate time remaining calculations and estimated completion times
- **Visual Progress Bar** – Color-coded progress indicator with completion percentage
- **Rate Limit Monitoring** – Real-time tracking of API rate limit hits and recovery

### 🔗 Chained Optimization Runs (NEW v2.0)
- **Sequential Optimization** – Run multiple optimization sessions back-to-back
- **Progressive Improvement** – Each run starts from the previous run's best configuration
- **Global Best Tracking** – Maintains the absolute best configuration across all runs
- **Configurable Run Count** – Set any number of chained runs (default: 3-50)
- **Smart Inheritance** – Later runs build upon earlier discoveries for compound improvements

### 🛡️ Rate Limiting & Reliability (NEW v2.0)
- **Burst Rate Limiting** – Conservative 20 calls/burst with 10s recovery time
- **Adaptive Learning** – Smart burst size adjustment based on actual rate limit encounters
- **Rolling Window Tracking** – Accurate 60-second rolling window for hard rate caps
- **Dual Mode Support** – Normal and Slower rate limiting modes for different scenarios
- **Safety Margins** – Built-in 50% safety margins to prevent rate limit violations

### Core Optimization
- **Config Caching** – Avoid redundant tests by storing previously evaluated configurations
- **Parameter Impact Analysis** – Quantify which parameters influence performance the most
- **Genetic Algorithm** – Population-based search with crossover and mutation
- **Simulated Annealing** – Escape local optima using probabilistic acceptance
- **Latin Hypercube Sampling** – Uniform coverage of parameter space
- **Multiple Starting Points** – Explore diverse presets to avoid bias
- **Correlated Parameter Testing** – Vary related parameters together for smarter exploration

### 🎯 Signal Analysis & Clustering
- **Signal Extraction** – Automatically fetches signal data from Alpha Gardeners API
- **Smart Clustering** – Groups similar signals using Euclidean distance analysis
- **Multiple Config Generation** – Creates optimized configs for each signal cluster
- **Tighter Bounds** – Generates more precise parameter ranges from clustered signals
- **Outlier Filtering** – Removes extreme values for more robust analysis
- **Time Unit Conversion** – Handles API data conversion (seconds to minutes)
- **Win Prediction Analysis** – Includes winPredPercent and TTC parameters
- **Visual Clustering Interface** – Easy-to-use checkbox for enabling clustering mode

### 🎮 User Interface Enhancements (NEW v2.0)
- **Rate Limiting Toggle** – Switch between Normal/Slower modes with a single button
- **Progress Dashboard** – Comprehensive real-time statistics and performance metrics
- **Best Config Display** – Live updates of current best configuration with detailed metrics
- **Color-Coded Feedback** – Green for success, amber for warnings, red for errors
- **Run Counter Display** – Always visible current run / total runs indicator
- **Completion Estimates** – Shows estimated completion time for long-running optimizations

#### How Robust Scoring Works (NEW v2.0)
The enhanced scoring system provides more reliable optimization by handling edge cases:

1. **Sample Size Tiers** – Small (<500), Medium (500-999), Large (1000+) samples get different win rate requirements
2. **Strict Rejection** – Configurations below minimum win rates are immediately rejected (score = -∞)
3. **Reliability Weighting** – More tokens = higher reliability factor using logarithmic scaling
4. **Composite Score** – `(Raw_PnL × 0.6) + (Win_Rate × 0.4) × Reliability_Factor`
5. **Outlier Resistance** – System handles extreme PnL values without skewing results

#### How Chained Runs Work (NEW v2.0)
Chained optimization allows for progressive improvement across multiple sessions:

1. **First Run** – Starts from current UI configuration or selected preset
2. **Subsequent Runs** – Begin with the previous run's best configuration as baseline
3. **Global Tracking** – Maintains absolute best across all runs for final result
4. **Time Management** – Each run gets `MAX_RUNTIME_MIN × total_runs` total time budget
5. **Progress Display** – Shows current run number and progress through the chain

Example: 3 chained runs of 30 minutes each = 90 minutes total optimization time

---

## 📦 Installation & Setup

### Quick Start 
1. Copy the following JavaScript code:

javascript:(async function(){try{console.log('🔄 Loading AGCopilot...');const r=await fetch('https://raw.githubusercontent.com/jumprCrypto/AGCopilot/refs/heads/main/AGCopilot.js');if(!r.ok)throw new Error(`HTTP ${r.status}`);eval(await r.text());console.log('✅ AGCopilot loaded!');}catch(e){console.error('❌ Load failed:',e);}})();

2. Create a new bookmark in Chrome:
   - Right-click on the bookmarks bar
   - Select "Add page..."
   - Name: "AGCopilot"
   - URL: Paste the JavaScript code above

3. Usage:
   - Navigate to your trading page
   - Click the "AGCopilot" bookmark
   - The script will automatically load and run!


### Requirements
- Modern web browser (Chrome, Firefox, Edge, Safari)
- Access to backtester.alphagardeners.xyz
- JavaScript enabled
- No additional dependencies or installations required

---

## 🧠 Optimization Strategy

AG Co-Pilot Enhanced v2.0 uses a **sophisticated multi-phase optimization pipeline** with direct API integration:

### Phase 1: Initialization & Baseline
1. **API Connection** – Establishes direct connection to backtester API
2. **Rate Limit Setup** – Configures conservative burst rate limiting
3. **Baseline Establishment** – Tests current configuration or selected preset
4. **Validation** – Ensures minimum token requirements and win rate thresholds

### Phase 2: Parameter Discovery
1. **Parameter Impact Analysis** – Systematically tests all parameters to rank effectiveness
2. **Smart Variations** – Generates optimal test variations based on parameter rules
3. **Min/Max Validation** – Prevents invalid configurations with conflicting constraints
4. **Effectiveness Ranking** – Sorts parameters by improvement potential

### Phase 3: Advanced Optimization (Configurable)
1. **Multiple Starting Points** – Tests diverse preset configurations as launch pads
2. **Latin Hypercube Sampling** – Ensures uniform coverage of top parameter spaces
3. **Correlated Parameter Testing** – Tests related parameters together (e.g., min/max pairs)
4. **Genetic Algorithm** – Evolves populations of high-performing configurations

### Phase 4: Fine-Tuning
1. **Simulated Annealing** – Escapes local optima with probabilistic exploration
2. **Deep Dive Analysis** – Fine-tunes the most effective parameters with smaller steps
3. **Continuous Exploration** – Randomized testing until time budget expires

### Phase 5: Chained Runs (NEW v2.0)
1. **Progressive Improvement** – Each run inherits the previous best as starting point
2. **Global Optimization** – Tracks absolute best across all runs in the chain
3. **Time Management** – Distributes total time budget across all planned runs
4. **Final Selection** – Returns the globally optimal configuration from all runs

---

## ⚙️ Configuration Options

### Basic Settings
- **Target PnL %** – Desired performance threshold (optimization stops early if achieved)
- **Max Runtime (min)** – Time budget per optimization run (default: 30 minutes)
- **Chained Runs** – Number of sequential optimization runs (1-50, default: 3)
- **Min Tokens Required** – Minimum token matches to validate a configuration (default: 50)

### Advanced Features (Toggleable)
- **Robust Scoring** – Use outlier-resistant composite scoring vs raw TP PnL %
- **Parameter Impact Analysis** – Systematic parameter effectiveness ranking
- **Genetic Algorithm** – Population-based evolution of configurations  
- **Simulated Annealing** – Probabilistic exploration to escape local optima
- **Latin Hypercube Sampling** – Uniform parameter space coverage
- **Multiple Starting Points** – Test diverse preset configurations
- **Correlated Parameters** – Test related parameters together
- **Deep Dive** – Fine-grained exploration of top parameters

### Rate Limiting Controls (NEW v2.0)
- **Rate Limiting Mode** – Toggle between Normal (20s wait) and Slower (30s wait)
- **Burst Size** – Conservative 20 calls per burst with adaptive learning
- **Safety Margins** – Built-in 50% safety buffer to prevent rate limit violations
- **Real-Time Monitoring** – Live tracking of API usage and rate limit status

### Win Rate Thresholds (NEW v2.0)
- **Small Samples** (<500 tokens): 50% minimum win rate
- **Medium Samples** (500-999 tokens): 40% minimum win rate  
- **Large Samples** (1000+ tokens): 30% minimum win rate
- **Strict Rejection** – Configurations below thresholds are immediately discarded

---

## 📊 Output & Results

### Real-Time Dashboard
- **Progress Tracking** – Live updates of tests completed, failure rates, and runtime
- **Run Counter** – Clear display of current run vs total runs (e.g., "Run: 3/50")
- **Best Configuration** – Real-time updates of current best config with detailed metrics
- **Rate Limit Status** – Monitoring of API usage and rate limit encounters
- **Time Estimates** – Accurate remaining time and estimated completion

### Final Results Display
- **Robust Score** – Composite score combining PnL, win rate, and reliability
- **Raw TP PnL %** – Traditional take-profit percentage for comparison
- **Win Rate %** – Percentage of profitable trades
- **Token Count** – Number of tokens matched by the configuration
- **Test Statistics** – Total tests run, failures, and success rate
- **Runtime Duration** – Total optimization time across all runs

### Configuration Export
- **JSON Format** – Complete configuration ready for copy/paste
- **Parameter Summary** – Human-readable breakdown of all set parameters
- **Performance Metrics** – Score breakdown showing why the config was selected
- **Source Tracking** – Method/phase that discovered the optimal configuration

### Debug Information (NEW v2.0)
- **Cache Statistics** – Configuration cache hit rates and efficiency
- **Rate Limiting Stats** – API usage patterns and burst performance
- **Parameter Effectiveness** – Ranking of which parameters drove improvements
- **Optimization History** – Complete log of all tested configurations

## 🔧 Advanced Usage

### Console Commands
```javascript
// View current best configuration
window.getBestConfig()

// Get detailed tracker information  
window.getConfigTracker()

// Test rate limiting performance
window.testRateLimit()

// View optimization history
window.optimizationTracker.history
```

### Chained Run Strategies
- **Conservative** – 3 runs of 30 minutes each (90 min total)
- **Aggressive** – 10 runs of 15 minutes each (150 min total) 
- **Marathon** – 50 runs of 10 minutes each (500 min total)
- **Custom** – Any combination up to practical limits

### Performance Tuning
- Use **Normal rate limiting** for fastest results
- Switch to **Slower mode** if encountering rate limits
- Enable **robust scoring** for outlier-resistant results
- Use **chained runs** for maximum optimization depth

---

## 🛠️ Development Notes

### Architecture
- **Direct API Integration** – Bypasses UI scraping for 10x faster performance
- **Modular Design** – Separate classes for optimization, rate limiting, and progress tracking  
- **Loader + Manifest** – `src/loader.js` sequentially loads modules defined in `src/manifest.json` (zero build, bookmarklet friendly)
- **Bridge Layer** – `src/bridge.js` exposes modular namespaces under legacy globals for backward compatibility
- **Versioning** – `AG.constants.VERSION` surfaces current modular version (e.g. `2.0.0-modular-beta`)
- **Re-Init Guard** – Legacy monolith includes a flag preventing double initialization when bookmarklet clicked twice
- **Robust Error Handling** – Graceful degradation and comprehensive error recovery
- **Memory Efficient** – Smart caching with LRU eviction and size limits
- **Browser Compatible** – Works across all modern browsers without dependencies

### Key Technical Features
- **Burst Rate Limiting** – Conservative API usage with adaptive learning
- **Configuration Validation** – Prevents invalid min/max parameter conflicts
- **Outlier-Resistant Scoring** – Statistical methods to handle extreme values
- **Progressive Optimization** – Each chained run builds on previous discoveries  
- **Real-Time UI Updates** – Non-blocking progress updates with smooth animations
- **Smoke Tests** – `smokeTest.js` (Node) and `browserSmoke.js` (browser) provide quick health checks

### Smoke Testing
```javascript
// In Node (from repo root)
node AGCopilot/smokeTest.js

// In browser console after loader finishes
window.AG.smoke.run();
```
Expected: confirmation that all core modules are present.

### Performance Characteristics
- **Speed**: ~50-100 configurations tested per minute (with rate limiting)
- **Reliability**: <1 rate limit error per session target
- **Memory**: <50MB typical usage with full caching enabled
- **Accuracy**: Outlier-resistant scoring prevents false positives
- **Scalability**: Handles 1-50 chained runs efficiently

### Extensibility
- Easy to add new optimization strategies
- Pluggable scoring systems
- Configurable rate limiting policies  
- Customizable UI components
- API endpoint abstraction for different platforms

---

## 📄 License

MIT License - Free to use, modify, and distribute.

---

## 🏆 Version History

### v2.0 (Current) - Enhanced API Integration
- Direct backtester API integration
- Robust scoring with outlier resistance  
- Chained optimization runs
- Real-time progress tracking with run counters
- Ultra-conservative rate limiting
- Enhanced error handling and validation

### v1.x - Original Optimizer
- UI-based parameter extraction
- Basic optimization strategies
- Signal analysis and clustering
- Parameter impact analysis

---

## 🙌 Credits & Acknowledgments

- **Optimization Techniques** – Inspired by machine learning, trading algorithms, and game AI
- **Statistical Methods** – Robust scoring based on statistical outlier detection
- **Rate Limiting** – Conservative burst strategies for API reliability
- **UI/UX Design** – Real-time feedback patterns from modern dev tools

---

## 💡 Contributing & Support

### Reporting Issues
- Provide browser console logs for any errors
- Include configuration details and optimization settings
- Describe expected vs actual behavior

### Feature Requests
- New optimization strategies or scoring methods
- Additional API integrations or data sources  
- UI/UX improvements and progress visualizations
- Performance optimizations or memory usage improvements

### Development
- Fork the repository and create feature branches
- Follow existing code style and documentation patterns
- Add appropriate error handling and user feedback
- Test thoroughly across different browser environments

**Contact**: Feel free to open issues or submit pull requests for improvements!

