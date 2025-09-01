// RobustScoring.js
// Advanced scoring system with outlier resistance and sample size validation
// Extracted from AGCopilot.js for better modularity

(function(AGUtils) {
    'use strict';

    const RS = {};
    const AG = AGUtils || (window && window.AGUtils) || {};

    // ========================================
    // 🎯 ROBUST SCORING SYSTEM
    // ========================================
    
    // Get scaled token thresholds based on date range
    const getScaledTokenThresholds = AG.getScaledTokenThresholds || (window.getScaledTokenThresholds) || (() => ({
        LARGE_SAMPLE_THRESHOLD: 1000,
        MEDIUM_SAMPLE_THRESHOLD: 500,
        MIN_TOKENS: 10
    }));

    // Get scoring mode from UI or config
    const getScoringMode = AG.getScoringMode || (window.getScoringMode) || (() => 'robust');

    // Main robust scoring function
    RS.calculateRobustScore = function(metrics, options = {}) {
        if (!metrics || typeof metrics !== 'object') {
            console.warn('⚠️ calculateRobustScore: Invalid metrics provided');
            return null;
        }

        // Extract configuration from options or globals
        const CONFIG = options.config || (window.CONFIG) || {};
        const scoringMode = options.scoringMode || getScoringMode();
        
        // Default configuration values with fallbacks
        const MIN_WIN_RATE = CONFIG.MIN_WIN_RATE || 35.0;
        const MIN_WIN_RATE_MEDIUM_SAMPLE = CONFIG.MIN_WIN_RATE_MEDIUM_SAMPLE || 33.0;
        const MIN_WIN_RATE_LARGE_SAMPLE = CONFIG.MIN_WIN_RATE_LARGE_SAMPLE || 30.0;
        const RELIABILITY_WEIGHT = CONFIG.RELIABILITY_WEIGHT || 0.3;
        const CONSISTENCY_WEIGHT = CONFIG.CONSISTENCY_WEIGHT || 0.4;
        const RETURN_WEIGHT = CONFIG.RETURN_WEIGHT || 0.6;

        // Get token thresholds based on date range scaling
        const scaledThresholds = getScaledTokenThresholds();

        // Extract values with safe defaults
        const rawPnL = metrics.tpPnlPercent || 0;
        const winRate = metrics.winRate || 0;
        const totalTokens = metrics.totalTokens || 0;

        // Validate required metrics
        if (isNaN(rawPnL) || isNaN(winRate) || isNaN(totalTokens)) {
            console.warn('⚠️ calculateRobustScore: Invalid numeric values in metrics', { rawPnL, winRate, totalTokens });
            return null;
        }

        // Handle different scoring modes
        if (scoringMode === 'tp_only') {
            return {
                score: rawPnL,
                scoringMethod: 'TP-Only',
                rejected: false,
                components: { rawPnL, winRate, reliabilityFactor: 1 }
            };
        }

        if (scoringMode === 'winrate_only') {
            // Simple win rate threshold check
            const threshold = totalTokens >= scaledThresholds.LARGE_SAMPLE_THRESHOLD ? MIN_WIN_RATE_LARGE_SAMPLE :
                             totalTokens >= scaledThresholds.MEDIUM_SAMPLE_THRESHOLD ? MIN_WIN_RATE_MEDIUM_SAMPLE : 
                             MIN_WIN_RATE;
            
            if (winRate < threshold) {
                return {
                    score: 0,
                    scoringMethod: 'Win Rate Only',
                    rejected: true,
                    rejectionReason: `Win rate ${winRate.toFixed(1)}% < ${threshold}% threshold`
                };
            }
            
            return {
                score: winRate,
                scoringMethod: 'Win Rate Only',
                rejected: false,
                components: { rawPnL, winRate, reliabilityFactor: 1 }
            };
        }

        // Default: 'robust' scoring mode
        return RS.calculateRobustScoreDetailed(metrics, {
            minWinRate: MIN_WIN_RATE,
            minWinRateMedium: MIN_WIN_RATE_MEDIUM_SAMPLE,
            minWinRateLarge: MIN_WIN_RATE_LARGE_SAMPLE,
            reliabilityWeight: RELIABILITY_WEIGHT,
            consistencyWeight: CONSISTENCY_WEIGHT,
            returnWeight: RETURN_WEIGHT,
            scaledThresholds
        });
    };

    // Detailed robust scoring implementation
    RS.calculateRobustScoreDetailed = function(metrics, thresholds) {
        const rawPnL = metrics.tpPnlPercent || 0;
        const winRate = metrics.winRate || 0;
        const totalTokens = metrics.totalTokens || 0;

        // Sample size-based thresholds
        const {
            minWinRate,
            minWinRateMedium,
            minWinRateLarge,
            reliabilityWeight,
            consistencyWeight,
            returnWeight,
            scaledThresholds
        } = thresholds;

        // Dynamic win rate threshold based on sample size
        let winRateThreshold;
        let sampleTier;
        
        if (totalTokens >= scaledThresholds.LARGE_SAMPLE_THRESHOLD) {
            winRateThreshold = minWinRateLarge;
            sampleTier = 'Large Sample';
        } else if (totalTokens >= scaledThresholds.MEDIUM_SAMPLE_THRESHOLD) {
            winRateThreshold = minWinRateMedium;
            sampleTier = 'Medium Sample';
        } else {
            winRateThreshold = minWinRate;
            sampleTier = 'Small Sample';
        }

        // Win rate threshold check (hard rejection)
        if (winRate < winRateThreshold) {
            return {
                score: 0,
                scoringMethod: 'Robust Multi-Factor',
                rejected: true,
                rejectionReason: `${sampleTier}: Win rate ${winRate.toFixed(1)}% < ${winRateThreshold}% threshold (${totalTokens} tokens)`,
                sampleTier,
                components: { rawPnL, winRate, reliabilityFactor: 0 }
            };
        }

        // Reliability factor based on sample size (logarithmic scaling)
        let reliabilityFactor;
        if (totalTokens <= 0) {
            reliabilityFactor = 0;
        } else if (totalTokens >= scaledThresholds.LARGE_SAMPLE_THRESHOLD) {
            reliabilityFactor = 1.0; // Full confidence for large samples
        } else if (totalTokens >= scaledThresholds.MEDIUM_SAMPLE_THRESHOLD) {
            // Logarithmic scaling for medium samples (0.7-0.95)
            const logFactor = Math.log(totalTokens) / Math.log(scaledThresholds.LARGE_SAMPLE_THRESHOLD);
            reliabilityFactor = 0.7 + (0.25 * logFactor);
        } else {
            // Penalty for small samples (0.3-0.7)
            const smallSampleFactor = totalTokens / scaledThresholds.MEDIUM_SAMPLE_THRESHOLD;
            reliabilityFactor = 0.3 + (0.4 * smallSampleFactor);
        }

        reliabilityFactor = Math.max(0.1, Math.min(1.0, reliabilityFactor));

        // Multi-factor composite score: 60% return, 40% consistency
        // Reliability factor affects the overall confidence in the score
        const normalizedWinRate = Math.min(100, winRate); // Cap at 100% to prevent inflation
        const compositeScore = (rawPnL * returnWeight) + (normalizedWinRate * consistencyWeight);
        
        // Apply reliability weighting
        const robustScore = compositeScore * reliabilityFactor;

        return {
            score: robustScore,
            scoringMethod: 'Robust Multi-Factor',
            rejected: false,
            sampleTier,
            components: {
                rawPnL,
                winRate: normalizedWinRate,
                reliabilityFactor,
                compositeScore,
                winRateThreshold
            },
            formula: `(${rawPnL.toFixed(1)} × ${returnWeight}) + (${normalizedWinRate.toFixed(1)} × ${consistencyWeight}) × ${reliabilityFactor.toFixed(3)} = ${robustScore.toFixed(1)}`
        };
    };

    // ========================================
    // 📊 SCORING UTILITIES
    // ========================================

    // Outlier detection for PnL values
    RS.detectOutliers = function(values, method = 'iqr') {
        if (!Array.isArray(values) || values.length < 4) {
            return { outliers: [], filtered: values };
        }

        const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
        if (validValues.length < 4) {
            return { outliers: [], filtered: validValues };
        }

        const sorted = [...validValues].sort((a, b) => a - b);
        let outliers = [];
        let filtered = validValues;

        switch (method) {
            case 'iqr': {
                const q1Index = Math.floor(sorted.length * 0.25);
                const q3Index = Math.floor(sorted.length * 0.75);
                const q1 = sorted[q1Index];
                const q3 = sorted[q3Index];
                const iqr = q3 - q1;
                const lowerBound = q1 - 1.5 * iqr;
                const upperBound = q3 + 1.5 * iqr;
                
                outliers = validValues.filter(v => v < lowerBound || v > upperBound);
                filtered = validValues.filter(v => v >= lowerBound && v <= upperBound);
                break;
            }
            case 'percentile': {
                const startIndex = Math.floor(sorted.length * 0.05);
                const endIndex = Math.ceil(sorted.length * 0.95);
                const bounds = sorted.slice(startIndex, endIndex);
                const lowerBound = bounds[0];
                const upperBound = bounds[bounds.length - 1];
                
                outliers = validValues.filter(v => v < lowerBound || v > upperBound);
                filtered = validValues.filter(v => v >= lowerBound && v <= upperBound);
                break;
            }
            case 'zscore': {
                const mean = validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
                const variance = validValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / validValues.length;
                const stdDev = Math.sqrt(variance);
                const threshold = 2.5;
                
                outliers = validValues.filter(v => Math.abs(v - mean) > threshold * stdDev);
                filtered = validValues.filter(v => Math.abs(v - mean) <= threshold * stdDev);
                break;
            }
            default:
                filtered = validValues;
        }

        return { outliers, filtered };
    };

    // Score normalization for comparison across different datasets
    RS.normalizeScore = function(score, datasetStats) {
        if (!datasetStats || typeof score !== 'number') return score;
        
        const { mean, stdDev, min, max } = datasetStats;
        
        // Z-score normalization with bounds
        if (stdDev > 0) {
            const zScore = (score - mean) / stdDev;
            // Convert to 0-100 scale, clamping extreme values
            return Math.max(0, Math.min(100, 50 + (zScore * 15)));
        }
        
        // Fallback to min-max normalization
        if (max > min) {
            return ((score - min) / (max - min)) * 100;
        }
        
        return score;
    };

    // Calculate dataset statistics for normalization
    RS.calculateDatasetStats = function(scores) {
        if (!Array.isArray(scores) || scores.length === 0) {
            return { mean: 0, stdDev: 0, min: 0, max: 0 };
        }

        const validScores = scores.filter(s => typeof s === 'number' && !isNaN(s));
        if (validScores.length === 0) {
            return { mean: 0, stdDev: 0, min: 0, max: 0 };
        }

        const mean = validScores.reduce((sum, s) => sum + s, 0) / validScores.length;
        const variance = validScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / validScores.length;
        const stdDev = Math.sqrt(variance);
        const min = Math.min(...validScores);
        const max = Math.max(...validScores);

        return { mean, stdDev, min, max };
    };

    // ========================================
    // 🔍 SCORE ANALYSIS & REPORTING
    // ========================================

    // Analyze scoring results for optimization insights
    RS.analyzeScoring = function(results) {
        if (!Array.isArray(results) || results.length === 0) {
            return { total: 0, rejected: 0, accepted: 0, averageScore: 0 };
        }

        const total = results.length;
        const rejected = results.filter(r => r.rejected).length;
        const accepted = total - rejected;
        const acceptedScores = results.filter(r => !r.rejected).map(r => r.score);
        const averageScore = acceptedScores.length > 0 ? 
            acceptedScores.reduce((sum, s) => sum + s, 0) / acceptedScores.length : 0;

        const rejectionReasons = {};
        results.filter(r => r.rejected).forEach(r => {
            const reason = r.rejectionReason || 'Unknown';
            rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
        });

        return {
            total,
            rejected,
            accepted,
            rejectionRate: total > 0 ? (rejected / total) * 100 : 0,
            averageScore: averageScore.toFixed(1),
            rejectionReasons,
            scoreDistribution: RS.calculateDatasetStats(acceptedScores)
        };
    };

    // Format scoring result for display
    RS.formatScoringResult = function(result) {
        if (!result) return 'Invalid Result';

        if (result.rejected) {
            return `❌ REJECTED: ${result.rejectionReason}`;
        }

        const score = result.score?.toFixed(1) || 'N/A';
        const method = result.scoringMethod || 'Unknown';
        
        if (result.components) {
            const { rawPnL, winRate, reliabilityFactor } = result.components;
            return `✅ Score: ${score} (${method}) | PnL: ${rawPnL.toFixed(1)}% | Win Rate: ${winRate.toFixed(1)}% | Reliability: ${(reliabilityFactor * 100).toFixed(0)}%`;
        }

        return `✅ Score: ${score} (${method})`;
    };

    // ========================================
    // 🔧 CONFIGURATION HELPERS
    // ========================================

    // Create scoring configuration from UI or defaults
    RS.createScoringConfig = function(overrides = {}) {
        const CONFIG = (window.CONFIG) || {};
        
        return {
            minWinRate: overrides.minWinRate || CONFIG.MIN_WIN_RATE || 35.0,
            minWinRateMedium: overrides.minWinRateMedium || CONFIG.MIN_WIN_RATE_MEDIUM_SAMPLE || 33.0,
            minWinRateLarge: overrides.minWinRateLarge || CONFIG.MIN_WIN_RATE_LARGE_SAMPLE || 30.0,
            reliabilityWeight: overrides.reliabilityWeight || CONFIG.RELIABILITY_WEIGHT || 0.3,
            consistencyWeight: overrides.consistencyWeight || CONFIG.CONSISTENCY_WEIGHT || 0.4,
            returnWeight: overrides.returnWeight || CONFIG.RETURN_WEIGHT || 0.6,
            scoringMode: overrides.scoringMode || getScoringMode(),
            scaledThresholds: overrides.scaledThresholds || getScaledTokenThresholds()
        };
    };

    // Validate scoring configuration
    RS.validateScoringConfig = function(config) {
        const errors = [];

        if (config.consistencyWeight + config.returnWeight !== 1.0) {
            errors.push('Consistency weight + Return weight must equal 1.0');
        }

        if (config.minWinRate < 0 || config.minWinRate > 100) {
            errors.push('Win rate thresholds must be between 0-100%');
        }

        if (config.reliabilityWeight < 0 || config.reliabilityWeight > 1) {
            errors.push('Reliability weight must be between 0-1');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    };

    // Expose module
    if (typeof window !== 'undefined') {
        window.RobustScoring = RS;
        // Maintain backward compatibility
        window.calculateRobustScore = RS.calculateRobustScore;
    }

    console.log('RobustScoring module loaded');

})(window && window.AGUtils);
