# 🤖 AGCopilot - Advanced Trading Strategy Optimizer

> **Browser-based optimization suite for Alpha Gardeners backtester**  
> Find high-performing trading configurations with advanced algorithms and statistical analysis

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Browser](https://img.shields.io/badge/Browser-Chrome%20%7C%20Firefox%20%7C%20Safari-blue)]()

---

## 🚀 Quick Start

### Installation (30 seconds)

1. **Copy this bookmarklet code:**
```javascript
javascript:(async function(){try{const r=await fetch('https://raw.githubusercontent.com/jumprCrypto/AGCopilot/refs/heads/main/AGCopilot.js');if(!r.ok)throw new Error(`HTTP ${r.status}`);eval(await r.text());}catch(e){console.error('Load failed:',e);}})();
```

2. **Create bookmark** in your browser:
   - Right-click bookmarks bar → "Add page"
   - **Name:** `AGCopilot`
   - **URL:** Paste the code above

3. **Use it:**
   - Go to `backtester.alphagardeners.xyz`
   - Click the `AGCopilot` bookmark
   - Configure and start optimizing!

---

## ✨ Key Features

### 🎯 **Multi-Algorithm Optimization**
- **Genetic Algorithm** - Population-based parameter evolution
- **Simulated Annealing** - Probabilistic search with temperature cooling
- **Latin Hypercube Sampling** - Uniform parameter space coverage
- **Parameter Discovery** - Systematic testing to identify high-impact parameters

### � **Intelligent Scoring**
- **Robust Composite Score** - Balances profit (60%) and win rate (40%)
- **Outlier Resistance** - Statistical filtering prevents false positives
- **Sample Size Scaling** - Dynamic thresholds based on token counts
- **Reliability Weighting** - Logarithmic scaling for confidence

### 🔗 **Chained Optimization**
- Run 1-50 sequential optimizations
- Each run inherits the previous best configuration
- Progressive improvement with global best tracking
- Intelligent time budget distribution

### 🛡️ **Safe API Integration**
- Direct API calls (10x faster than UI scraping)
- Ultra-conservative rate limiting (20 calls/burst, 50% safety margin)
- Adaptive burst management with recovery tracking
- Configuration caching reduces redundant API calls by 60-90%

### 📌 **Pin System**
- Lock specific parameters during optimization
- Categorized parameter organization
- 10-second dialog with auto-timeout
- Maintains pinned values across all algorithm phases

---

## � Usage

### Basic Workflow
1. **Load AGCopilot** on the backtester page
2. **Configure settings:** Target PnL, runtime, algorithm features
3. **Optional:** Use Parameter Discovery to identify top parameters
4. **Pin settings** you want to keep constant (popup after clicking Start)
5. **Monitor progress** in real-time dashboard
6. **Export results** - copy best configuration when done

### Recommended Settings
```yaml
Beginner:
  - Chained Runs: 3
  - Runtime: 15 min/run
  - Enable: Genetic Algorithm, Robust Scoring
  
Advanced:
  - Chained Runs: 5-10
  - Runtime: 20-30 min/run  
  - Enable: All algorithms, Parameter Discovery
  - Rate Limiting: Slower mode (if hitting limits)
```

---

## 📈 Example Results

### Parameter Discovery Output
```
🏆 TOP PARAMETER IMPACT RANKINGS:
1. Min KYC Wallets = 3      → +15.2% improvement
2. Min MCAP (USD) = 8000     → +12.7% improvement  
3. Max Bundled % = 25        → +9.3% improvement
```

### Dashboard Display
```
🏆 Best Score: 45.2% (Robust)
📈 TP PnL: 52.1% | Win Rate: 38.5%
🎯 Tokens: 1,247 | Tests: 1,847
🔗 Run: 3/5 | Runtime: 15:23
```

---

## �️ Technical Details

### Algorithms
- **Genetic**: 20-30 population, crossover/mutation, elitism selection
- **Annealing**: Adaptive temperature cooling, Metropolis criterion
- **Latin Hypercube**: Stratified sampling with jittering
- **Parameter Discovery**: Systematic testing with impact ranking

### Performance
- **Speed:** 50-100 configs/minute (rate-limited)
- **Memory:** <50MB typical usage
- **Cache Hit Rate:** 60-90% with optimal settings
- **API Error Rate:** <1% target

### Rate Limiting
```
Normal Mode:  20 calls/burst, 10s recovery
Slower Mode:  15 calls/burst, 15s recovery  
Safety Margin: 50% buffer on all limits
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Rate limit errors | Switch to "Slower" mode in settings |
| Low token counts | Extend date range or adjust MCAP filters |
| UI not loading | Refresh page and retry bookmarklet |
| Poor results | Enable Parameter Discovery first |
| Browser freezing | Reduce chained run count |

**Pro tip:** Check browser console (F12) for detailed diagnostic logs.

---

## 📦 Components

- **`AGCopilot.js`** - Main optimization engine (8400+ lines)
- **`AGSignalExtractor.js`** - Token signal analysis tool
- **`AGSignalAnalysis.js`** - Advanced signal clustering
- **`AGBaseConfigBuilder.js`** - Configuration generation utility

---

## 🤝 Contributing

Contributions welcome! Areas of interest:
- New optimization algorithms
- UI/UX improvements
- Performance optimizations
- Bug fixes and testing

**Guidelines:**
1. Fork the repository
2. Create feature branch
3. Test thoroughly on backtester
4. Submit PR with clear description

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

---

## 🙏 Acknowledgments

Built for the Alpha Gardeners community with inspiration from:
- Machine learning optimization research
- Statistical analysis methodologies
- Trading algorithm development practices

**Special thanks to all beta testers and contributors!**

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/jumprCrypto/AGCopilot/issues)
- **Discussions:** [GitHub Discussions](https://github.com/jumprCrypto/AGCopilot/discussions)
- **Updates:** Watch repository for latest releases

---

**⭐ Star this repo if AGCopilot helps your trading!**