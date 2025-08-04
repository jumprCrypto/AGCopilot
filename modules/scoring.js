// ========================================
// 📊 SCORING MODULE
// ========================================

// ========================================
// 📊 ROBUST SCORING SYSTEM (Outlier-Resistant)
// ========================================
export function calculateRobustScore(metrics, CONFIG) {
    if (!metrics) {
        console.warn('⚠️ calculateRobustScore: metrics is null/undefined');
        return null;
    }
    
    if (metrics.tpPnlPercent === undefined || metrics.totalTokens === undefined) {
        console.warn('⚠️ calculateRobustScore: missing required properties', {
            tpPnlPercent: metrics.tpPnlPercent,
            totalTokens: metrics.totalTokens,
            allKeys: Object.keys(metrics)
        });
        return null;
    }

    // If robust scoring is disabled, use raw TP PnL %
    if (!CONFIG.USE_ROBUST_SCORING) {
        return {
            score: metrics.tpPnlPercent,
            components: {
                rawPnL: metrics.tpPnlPercent,
                winRate: metrics.winRate || 0,
                reliabilityFactor: 1.0,
                finalScore: metrics.tpPnlPercent
            },
            scoringMethod: 'Raw TP PnL %'
        };
    }

    // Use raw TP PnL % without capping
    const rawPnL = metrics.tpPnlPercent;
    
    // Win rate component (0-100%)
    const winRate = metrics.winRate || 0;
    
    // Reliability factor based on sample size (more tokens = more reliable)
    // Uses logarithmic scaling: log(tokens)/log(100) capped at 1.0
    const tokensCount = metrics.totalTokens || 1; // Default to 1 to avoid log(0)
    const reliabilityFactor = Math.min(1.0, Math.log(tokensCount) / Math.log(100));
    
    // Early exit for low win rate configs (likely unreliable)
    if (winRate < CONFIG.MIN_WIN_RATE) {
        return {
            score: -10, // Heavily penalize configs with poor win rates
            components: {
                rawPnL: metrics.tpPnlPercent,
                winRate: winRate,
                reliabilityFactor: reliabilityFactor,
                finalScore: -10,
                penalty: 'Low win rate'
            },
            scoringMethod: 'Robust (Penalized for low win rate)'
        };
    }
    
    // Calculate composite score
    // Formula: (Raw_PnL * RETURN_WEIGHT) + (Win_Rate * CONSISTENCY_WEIGHT) * Reliability_Factor
    const returnComponent = rawPnL * CONFIG.RETURN_WEIGHT;
    const consistencyComponent = winRate * CONFIG.CONSISTENCY_WEIGHT;
    const baseScore = returnComponent + consistencyComponent;
    
    // Apply reliability weighting
    const finalScore = baseScore * (1 - CONFIG.RELIABILITY_WEIGHT) + baseScore * reliabilityFactor * CONFIG.RELIABILITY_WEIGHT;
    
    return {
        score: finalScore,
        components: {
            rawPnL: metrics.tpPnlPercent,
            winRate: winRate,
            reliabilityFactor: reliabilityFactor,
            returnComponent: returnComponent,
            consistencyComponent: consistencyComponent,
            baseScore: baseScore,
            finalScore: finalScore
        },
        scoringMethod: 'Robust Multi-Factor (Uncapped)'
    };
}
