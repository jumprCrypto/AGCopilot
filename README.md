# 🤖 AG Co-Pilot - Advanced Config Optimizer + Signal Analysis

AG Co-Pilot is a browser-based optimization engine designed to intelligently tune configuration parameters for token screening and backtesting platforms. It combines multiple advanced search strategies with signal analysis and clustering to find high-performing configurations with minimal manual effort.

---

## 🚀 Features

### Core Optimization
- **Config Caching** – Avoid redundant tests by storing previously evaluated configurations.
- **Parameter Impact Analysis** – Quantify which parameters influence performance the most.
- **Genetic Algorithm** – Population-based search with crossover and mutation.
- **Simulated Annealing** – Escape local optima using probabilistic acceptance.
- **Adaptive Step Sizes** – Dynamically adjust parameter step sizes based on success rates.
- **Latin Hypercube Sampling** – Uniform coverage of parameter space.
- **Multiple Starting Points** – Explore diverse presets to avoid bias.
- **Correlated Parameter Testing** – Vary related parameters together for smarter exploration.
- **Progress UI** – Real-time feedback with runtime, score, and test count.
- **Interactive Popup** – Configure runtime, target PnL, and baseline presets before launch.

### 🎯 Signal Analysis & Clustering (NEW)
- **Signal Extraction** – Automatically fetches signal data from Alpha Gardeners API
- **Smart Clustering** – Groups similar signals using Euclidean distance analysis
- **Multiple Config Generation** – Creates optimized configs for each signal cluster
- **Tighter Bounds** – Generates more precise parameter ranges from clustered signals
- **Outlier Filtering** – Removes extreme values for more robust analysis
- **Time Unit Conversion** – Handles API data conversion (seconds to minutes)
- **Win Prediction Analysis** – Includes winPredPercent and TTC parameters
- **Visual Clustering Interface** – Easy-to-use checkbox for enabling clustering mode

#### How Clustering Works
The clustering system analyzes your signal data to find groups of similar signals, allowing for tighter, more targeted configurations:

1. **Signal Collection** – Extracts all signal criteria from token data
2. **Parameter Normalization** – Scales all parameters to 0-1 range for fair comparison
3. **Distance Calculation** – Uses Euclidean distance to measure signal similarity
4. **Threshold Clustering** – Groups signals within distance thresholds (0.1-0.6)
5. **Cluster Ranking** – Sorts by tightness (lower average distance) and size
6. **Config Generation** – Creates separate optimized configs for each cluster plus fallback

Example: If token BOB has signals with market caps [5k, 50k, 200k] and token PAP has [5k, 6k, 7k], clustering will group the 5k signals together for a much tighter configuration.

---

## 📦 Installation

This script is designed to run directly in the browser console on supported platforms.

### Steps:

1. Open the backtesting interface.
2. Open your browser's Developer Console (`F12` or `Ctrl+Shift+I`).
3. Paste the entire script from `AGCopilot.js` into the console.
4. Hit `Enter` to launch the optimizer.

---

## 🧠 Optimization Strategy

AG Co-Pilot uses a **multi-phase optimization pipeline**:

1. **Baseline Establishment** – Captures current config or uses preset.
2. **Parameter Impact Analysis** – Ranks parameters by influence.
3. **Hill-Climbing Phase** – Tests variations of top parameters.
4. **Latin Hypercube Sampling** – Broad sampling across key parameters.
5. **Genetic Optimization** – Evolves a population of configs.
6. **Correlated Parameter Phase** – Tests smart combinations.
7. **Simulated Annealing** – Escapes local traps.
8. **Multiple Starting Points** – Tests alternative presets.
9. **Continuous Exploration** – Randomized search until time expires.

---

## ⚙️ Configuration

You can customize the optimizer via the popup UI:

- **Target PnL %** – Desired performance threshold.
- **Max Runtime (min)** – Time budget for optimization.
- **Min Tokens Required** – Minimum token matches to validate a config.
- **Baseline Preset** – Choose from conservative, aggressive, balanced, etc.
- **Advanced Features** – Toggle strategies like simulated annealing or multiple starting points.

---

## 📊 Output

After optimization, you'll see:

- Final TP PnL %
- Total tests run
- Tokens matched
- Runtime duration
- Best configuration preview
- Option to apply best config directly

---

## 🛠️ Development Notes

- Written in **vanilla JavaScript** with modular classes.
- No external dependencies.
- Designed for **headless execution** in browser environments.
- Easily extensible: add new presets, strategies, or metrics.

---

## 📄 License

MIT License. Free to use, modify, and distribute.

---

## 🙌 Credits

Inspired by optimization techniques from machine learning, trading, and game AI.

---

## 💡 Suggestions or Contributions?

Feel free to open an issue or submit a pull request.  
Ideas for new strategies, metrics, or UI improvements are always welcome!

