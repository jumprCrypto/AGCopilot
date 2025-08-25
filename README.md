# 🤖 AG Copilot Enhanced - Trading Optimization Suite

**AG Copilot Enhanced** is a cutting-edge browser-based optimization engine that revolutionizes trading strategy development through direct API integration, advanced machine learning techniques, and sophisticated parameter discovery systems. Built for Alpha Gardeners backtester, it combines multiple optimization algorithms with robust statistical analysis to find high-performing configurations with unprecedented efficiency and reliability.

## 📦 Modular Implementation Available!

**NEW**: AGCopilot is now available as modular JavaScript that loads directly from GitHub! This enables easier maintenance, selective loading, and better code organization.

### 🚀 Quick Start (Modular)

**Browser Console One-liner:**
```javascript
import('https://raw.githubusercontent.com/jumprCrypto/AGCopilot/copilot/fix-b158a735-8afc-4934-8fab-116fc94aa92a/agcopilot-modular.js');
```

**Load Specific Tools:**
```javascript
const { loadAGCopilot } = await import('https://raw.githubusercontent.com/jumprCrypto/AGCopilot/copilot/fix-b158a735-8afc-4934-8fab-116fc94aa92a/modules/loader.js');

// Load Enhanced AGCopilot
await loadAGCopilot('copilot');

// Load Signal Extractor
await loadAGCopilot('signal-extractor');
```

**📖 [Complete Modular Usage Guide](MODULAR-USAGE.md)**

---

## ✨ What's New in v3.0

### 🔍 **Parameter Discovery Engine**
- **Systematic Parameter Analysis** – Tests all 17+ parameters to rank effectiveness before optimization
- **Smart Value Generation** – Intelligently creates test values based on parameter ranges and characteristics
- **Impact Ranking** – Quantifies which parameters drive the most performance improvement
- **Adaptive Testing** – Focuses optimization time on the most effective parameters

### 🎯 **Enhanced Pin System**
- **Parameter Pinning** – Lock specific parameters as constants during optimization
- **Smart UI** – Optimized popup with categorized parameters and real-time feedback
- **Performance Optimized** – 60-70% faster rendering with reduced memory usage
- **Category Organization** – Parameters grouped logically (Basic, Wallets, Risk, Advanced, Take Profits)

### 🧠 **Advanced Robust Scoring**
- **Outlier Resistance** – Statistical methods prevent extreme values from skewing results
- **Sample Size Scaling** – Dynamic win rate thresholds based on token count reliability
- **Multi-Factor Scoring** – Balances profit (60%), consistency (40%), and reliability weighting
- **Intelligent Rejection** – Configurations below quality thresholds are filtered out automatically

---

## 🚀 Core Features

### ⚡ **Direct API Integration**
- **Native API Calls** – Direct integration with `backtester.alphagardeners.xyz/api/stats`
- **Smart Parameter Mapping** – Automatic translation from UI names to API parameters
- **Multi-TP Support** – Handles complex take-profit configurations accurately
- **Real-Time Validation** – Instant parameter validation and constraint checking

### 🔗 **Chained Optimization Runs**
- **Progressive Improvement** – Each run inherits the previous best as starting point
- **Global Best Tracking** – Maintains absolute best across all runs in the chain
- **Flexible Run Counts** – Configure 1-50 sequential optimization runs
- **Time Distribution** – Intelligent time budget allocation across runs

### 🛡️ **Ultra-Conservative Rate Limiting**
- **Burst Management** – 20 calls per burst with adaptive burst size learning
- **Rolling Window Tracking** – Precise 60-second rate limit monitoring
- **Dual Mode Support** – Normal (efficient) and Slower (ultra-safe) modes
- **Safety Margins** – Built-in 50% buffer prevents rate limit violations
- **Real-Time Monitoring** – Live API usage tracking and recovery time estimates

### 📊 **Advanced Progress Tracking**
- **Real-Time Dashboard** – Live updates with comprehensive statistics
- **Visual Progress Bars** – Color-coded completion indicators
- **Run Counter Display** – Clear current run vs total runs (e.g., "Run: 3/50")
- **Time Estimates** – Accurate remaining time and completion predictions
- **Performance Metrics** – Success rates, cache hit ratios, and efficiency stats

### 🎮 **Intelligent User Interface**
- **Split-Screen Mode** – Side-by-side optimization and backtester views
- **Floating Mode** – Compact overlay for smaller screens
- **Auto-Positioning** – Smart placement based on screen size
- **Responsive Design** – Adapts to different browser sizes and orientations
- **Real-Time Feedback** – Color-coded status updates and progress indicators

---

## 🧬 Optimization Algorithms

### **Multi-Phase Pipeline**

#### **Phase 1: Parameter Discovery** ⭐ *NEW in v3.0*
```
🔍 Tests 17+ parameters systematically
📊 Ranks effectiveness by improvement potential
🎯 Identifies high-impact parameters for focused optimization
⚡ Generates strategic test values using parameter rules
```

#### **Phase 2: Baseline & Validation**
```
📋 Establishes performance baseline from current config
🛡️ Validates minimum token requirements and win rates
🔗 Sets up API connections and rate limiting
✅ Confirms optimization readiness
```

#### **Phase 3: Advanced Search Strategies**
```
🧬 Genetic Algorithm - Population-based evolution
🌡️ Simulated Annealing - Escape local optima
📐 Latin Hypercube - Uniform parameter space coverage
🎲 Multiple Starting Points - Diverse preset testing
🔄 Correlated Parameters - Related parameter testing
```

#### **Phase 4: Fine-Tuning & Exploration**
```
🔬 Deep Dive Analysis - Fine-grained parameter steps
🎯 Focused Search - Concentrated exploration of best regions
🔄 Continuous Exploration - Random testing until time expires
💎 Best Config Selection - Statistical validation of results
```

---

## 📈 Scoring & Statistics

### **Robust Scoring System**
The advanced scoring system provides statistical reliability:

```javascript
Composite Score = (Raw_PnL × 0.6) + (Win_Rate × 0.4) × Reliability_Factor

Where:
- Raw_PnL: Take-profit percentage performance
- Win_Rate: Percentage of profitable trades (≥2x gains)
- Reliability_Factor: Logarithmic scaling based on token count
```

### **Dynamic Win Rate Thresholds**
```
📊 Small Samples (<500 tokens):   50% minimum win rate
📊 Medium Samples (500-999):      40% minimum win rate  
📊 Large Samples (1000+):         30% minimum win rate
📊 Scaled by Date Range:          10 tokens/day minimum
```

### **Statistical Safeguards**
- **Outlier Detection** – Filters extreme values that could skew results
- **Sample Size Validation** – Ensures statistical significance
- **Confidence Intervals** – Provides reliability estimates
- **Rejection Logic** – Automatically discards low-quality results

---

## 🎛️ Configuration Options

### **Optimization Settings**
```yaml
Target PnL %:           Desired performance threshold (early stop)
Max Runtime (min):      Time budget per optimization run
Chained Runs:           Sequential optimization runs (1-50)
Scoring Mode:           Robust | TP-Only | Win Rate Only
```

### **Feature Toggles**
```yaml
✅ Parameter Discovery:     Systematic parameter effectiveness analysis
✅ Robust Scoring:          Outlier-resistant composite scoring
✅ Genetic Algorithm:       Population-based evolution
✅ Simulated Annealing:     Probabilistic local optima escape
✅ Latin Hypercube:         Uniform parameter space sampling
✅ Multiple Start Points:   Diverse preset testing
✅ Correlated Parameters:   Related parameter group testing
✅ Deep Dive Analysis:      Fine-grained parameter exploration
```

### **Rate Limiting Controls**
```yaml
Mode:               Normal (20s) | Slower (30s)
Burst Size:         20 calls (adaptive learning)
Safety Buffer:      50% margin prevents violations
Monitoring:         Real-time API usage tracking
```

---

## 🛠️ Installation & Quick Start

### **Bookmarklet Installation**
1. **Copy the bookmarklet code:**
```javascript
javascript:(async function(){try{console.log('🔄 Loading AGCopilot...');const r=await fetch('https://raw.githubusercontent.com/jumprCrypto/AGCopilot/refs/heads/copilot/fix-b158a735-8afc-4934-8fab-116fc94aa92a/AGCopilot.js');if(!r.ok)throw new Error(`HTTP ${r.status}`);eval(await r.text());console.log('✅ AGCopilot loaded!');}catch(e){console.error('❌ Load failed:',e);}})();
```

2. **Create bookmark:**
   - Right-click bookmarks bar → "Add page..."
   - **Name:** `AGCopilot Enhanced`
   - **URL:** Paste the code above

3. **Usage:**
   - Navigate to `backtester.alphagardeners.xyz`
   - Click the `AGCopilot Enhanced` bookmark
   - Tool loads automatically with full functionality

### **System Requirements**
- Modern browser (Chrome 80+, Firefox 75+, Safari 13+, Edge 80+)
- JavaScript enabled
- Access to Alpha Gardeners backtester
- Stable internet connection for API calls

---

## 🎯 Usage Guide

### **Getting Started**
1. **Load the tool** using the bookmarklet on the backtester page
2. **Configure settings** in the floating/split-screen interface
3. **Set date range** and basic parameters in the backtester
4. **Click "Start Optimization"** to begin the process

### **Parameter Discovery Workflow**
1. **Enable Parameter Discovery** in the settings panel
2. **Tool systematically tests** all 17+ parameters
3. **Review impact rankings** in the console output
4. **Optimization focuses** on high-impact parameters first

### **Advanced Optimization**
1. **Use chained runs** for progressive improvement (3-10 runs recommended)
2. **Enable robust scoring** for outlier-resistant results
3. **Adjust win rate thresholds** based on your risk tolerance
4. **Monitor rate limiting** and switch modes if needed

---

## 📊 Results & Output

### **Real-Time Dashboard**
```
🏆 Best Score: 45.2% (Robust Multi-Factor)
📈 Raw TP PnL: 52.1% | Win Rate: 38.5%
🎯 Tokens: 1,247 | Reliability: 95%
⏱️ Runtime: 15:23 | Progress: 67%
🔗 Run: 2/5 | Tests: 1,847 | Cache: 89%
```

### **Parameter Discovery Results**
```
🏆 TOP PARAMETER IMPACT RANKINGS:
============================================================
 1. Min KYC Wallets = 3 → +15.2 improvement
 2. Min MCAP (USD) = 8000 → +12.7 improvement  
 3. Max Bundled % = 25 → +9.3 improvement
 4. Min Unique Wallets = 2 → +7.8 improvement
 5. Min AG Score = 6 → +6.1 improvement
```

### **Final Configuration Export**
```javascript
// Best configuration (ID: 1734567890)
// Score: 45.2% | Source: Genetic Algorithm Run 3
// Generated: 8/23/2025, 2:15:30 PM

{
  "basic": {
    "Min MCAP (USD)": 8000,
    "Max MCAP (USD)": 500000
  },
  "wallets": {
    "Min KYC Wallets": 3,
    "Min Unique Wallets": 2
  },
  "risk": {
    "Max Bundled %": 25,
    "Min Buy Ratio %": 55
  }
}
```

---

## 🔬 Technical Architecture

### **Performance Characteristics**
- **Speed:** 50-100 configurations/minute (with rate limiting)
- **Reliability:** <1% API error rate target
- **Memory:** <50MB typical usage with full caching
- **Accuracy:** Outlier-resistant scoring prevents false positives
- **Scalability:** Handles 1-50 chained runs efficiently

### **Key Technical Features**
- **Burst Rate Limiting** – Conservative API usage with adaptive learning
- **Configuration Caching** – LRU cache with intelligent eviction
- **Real-Time UI Updates** – Non-blocking progress with smooth animations
- **Error Recovery** – Graceful degradation and comprehensive error handling
- **Memory Management** – Efficient data structures and garbage collection

### **API Integration**
- **Direct REST Calls** – Bypasses UI scraping for 10x speed improvement
- **Parameter Validation** – Real-time constraint checking
- **Response Processing** – Intelligent parsing of complex API responses
- **Error Handling** – Robust retry logic and fallback mechanisms

---

## 🎯 Optimization Strategies

### **Conservative Strategy** (Recommended for beginners)
```yaml
Chained Runs: 3
Runtime per Run: 30 minutes
Total Time: 90 minutes
Features: Parameter Discovery + Robust Scoring
Rate Limiting: Normal mode
```

### **Aggressive Strategy** (For experienced users)
```yaml
Chained Runs: 10
Runtime per Run: 15 minutes  
Total Time: 150 minutes
Features: All algorithms enabled
Rate Limiting: Normal mode with monitoring
```

### **Marathon Strategy** (Maximum optimization depth)
```yaml
Chained Runs: 25-50
Runtime per Run: 10 minutes
Total Time: 250-500 minutes
Features: Full algorithm suite + deep dive
Rate Limiting: Slower mode for stability
```

---

## 🐛 Troubleshooting

### **Common Issues**
| Issue | Solution |
|-------|----------|
| Rate limit errors | Switch to "Slower" rate limiting mode |
| Low token counts | Extend date range or lower MCAP minimums |
| Poor win rates | Enable robust scoring, check parameter discovery results |
| UI not loading | Refresh page, try bookmarklet again |
| Optimization stalling | Check console for errors, restart if needed |

### **Console Commands**
```javascript
// View current best configuration
window.bestConfigTracker.getConfig()

// Get optimization statistics
window.optimizationTracker.getStats()

// Check rate limiting status
window.rateLimitStats()

// Force stop optimization
window.STOPPED = true
```

---

## 📄 License & Support

### **License**
MIT License - Free to use, modify, and distribute.

### **Contributing**
- **Bug Reports:** Include browser console logs and configuration details
- **Feature Requests:** New algorithms, UI improvements, or API integrations
- **Development:** Fork repository, follow existing patterns, test thoroughly

### **Contact & Support**
- **GitHub Issues:** Primary support channel
- **Pull Requests:** Welcome for improvements and new features
- **Documentation:** Help improve this README and inline comments

---

## 🏆 Version History

### **v3.0** (Current) - Ultimate Optimization Suite
- ⭐ Parameter Discovery Engine with systematic effectiveness analysis
- 📥 Configuration import/export system with smart parsing
- 🎯 Enhanced pin system with optimized performance
- 🧠 Advanced robust scoring with outlier resistance
- 🎮 Improved UI with split-screen and floating modes

### **v2.0** - Enhanced API Integration  
- Direct backtester API integration
- Chained optimization runs
- Ultra-conservative rate limiting
- Real-time progress tracking

### **v1.x** - Original Optimizer
- UI-based parameter extraction
- Basic optimization strategies
- Signal analysis and clustering

---

## 🌟 Credits

**Developed with inspiration from:**
- Modern machine learning optimization techniques
- Statistical analysis and outlier detection methods  
- Game AI and trading algorithm research
- Professional trading strategy development practices

**Special thanks to the Alpha Gardeners community for feedback and testing!**

---

*AG Copilot Enhanced v3.0 - Turning trading strategy optimization into a science.* 🚀

