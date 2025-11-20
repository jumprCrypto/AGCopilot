// ========================================
// 🧬 PARAMETER INTERACTION DISCOVERY
// ========================================
// Tests parameter combinations to find which parameters work best together
// Uses batch processing for efficient testing when local API is available

(function() {
    'use strict';

    // Helper to find which section a parameter belongs to
    function findParameterSection(paramName) {
        const template = window.COMPLETE_CONFIG_TEMPLATE || {};
        for (const [section, params] of Object.entries(template)) {
            if (params && typeof params === 'object' && paramName in params) {
                return section;
            }
        }
        return 'basic';
    }

    // Calculate variance helper
    function calculateVariance(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    }

    // Calculate interaction strength between two parameters
    function calculateInteractionStrength(results, values1, values2) {
        // Calculate how much the combination matters vs individual effects
        // High interaction = the effect of param1 depends strongly on param2's value
        
        const validResults = results.filter(r => r.success && r.totalTokens > 0);
        if (validResults.length < 10) return 0;
        
        // Calculate variance explained by interaction vs main effects
        const scores = validResults.map(r => r.tpPnlPercent);
        const totalVariance = calculateVariance(scores);
        
        if (totalVariance < 1) return 0; // Not enough variation
        
        // Group by first parameter value
        const param1Effects = new Map();
        for (let i = 0; i < values1.length; i++) {
            const group = validResults.slice(i * values2.length, (i + 1) * values2.length);
            if (group.length > 0) {
                const avgScore = group.reduce((sum, r) => sum + r.tpPnlPercent, 0) / group.length;
                param1Effects.set(i, avgScore);
            }
        }
        
        // Calculate effect size range
        const effectSizes = Array.from(param1Effects.values());
        if (effectSizes.length < 2) return 0;
        
        const effectRange = Math.max(...effectSizes) - Math.min(...effectSizes);
        const interactionStrength = effectRange / (Math.abs(Math.max(...scores)) + 1);
        
        return Math.min(interactionStrength, 1.0);
    }

    // Display interaction results in the UI
    function displayInteractionResults(interactions) {
        const resultsDiv = document.getElementById('interaction-results');
        if (!resultsDiv) {
            console.warn('⚠️ Interaction results div not found');
            return;
        }
        
        if (interactions.length === 0) {
            resultsDiv.innerHTML = '<p style="color: #888;">No significant parameter interactions found.</p>';
            return;
        }
        
        let html = '<div style="max-height: 400px; overflow-y: auto;">';
        html += '<h4 style="margin: 0 0 10px 0;">🧬 Parameter Interactions</h4>';
        html += '<p style="color: #888; font-size: 12px; margin-bottom: 15px;">Parameters that work better together</p>';
        
        interactions.slice(0, 10).forEach((int, idx) => {
            const strengthBar = Math.round(int.strength * 100);
            html += `
                <div style="margin-bottom: 15px; padding: 10px; background: rgba(138, 43, 226, 0.1); border-radius: 5px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="font-weight: bold;">${idx + 1}. ${int.param1} × ${int.param2}</span>
                        <span style="color: #8a2be2;">${int.strength.toFixed(3)}</span>
                    </div>
                    <div style="width: 100%; height: 4px; background: rgba(138, 43, 226, 0.2); border-radius: 2px;">
                        <div style="width: ${strengthBar}%; height: 100%; background: #8a2be2; border-radius: 2px;"></div>
                    </div>
                    <div style="margin-top: 5px; font-size: 11px; color: #666;">
                        Best config PnL: ${int.bestPnl?.toFixed(2)}%
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        resultsDiv.innerHTML = html;
    }

    // Main interaction discovery function
    async function runInteractionDiscovery(options = {}) {
        const {
            maxParameters = 8,  // Reduced from 12 (8 choose 2 = 28 pairs instead of 66)
            gridSize = 4        // Reduced from 5 (4×4 = 16 configs vs 25)
        } = options;
        
        console.log('%c🧬 Parameter Interaction Discovery Started', 'color: purple; font-weight: bold;');
        console.log(`Settings: ${maxParameters} parameters, ${gridSize}×${gridSize} grid per pair`);
        
        if (typeof window.updateStatus === 'function') {
            window.updateStatus('🧬 Discovering parameter interactions...');
        }
        
        const baseConfig = await window.getCurrentConfiguration();
        const PARAM_RULES = window.PARAM_RULES || {};
        const parameters = Object.keys(PARAM_RULES).slice(0, maxParameters);
        const interactions = [];
        
        let totalTests = 0;
        for (let i = 0; i < parameters.length; i++) {
            for (let j = i + 1; j < parameters.length; j++) {
                totalTests++;
            }
        }
        
        const totalConfigs = totalTests * (gridSize * gridSize);
        console.log(`Testing ${parameters.length} parameters for interactions...`);
        console.log(`Total interaction pairs: ${totalTests}, Total configs: ${totalConfigs}`);
        
        let currentTest = 0;
        const startTime = Date.now();
        
        for (let i = 0; i < parameters.length; i++) {
            if (window.STOPPED) {
                console.log('🛑 Interaction discovery stopped by user');
                break;
            }
            
            const param1 = parameters[i];
            const section1 = findParameterSection(param1);
            
            for (let j = i + 1; j < parameters.length; j++) {
                if (window.STOPPED) {
                    console.log('🛑 Interaction discovery stopped by user');
                    break;
                }
                
                currentTest++;
                const param2 = parameters[j];
                const section2 = findParameterSection(param2);
                
                const progress = ((currentTest / totalTests) * 100).toFixed(1);
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
                const estimatedTotal = (elapsed / currentTest) * totalTests;
                const remaining = Math.max(0, estimatedTotal - elapsed);
                
                if (typeof window.updateStatus === 'function') {
                    window.updateStatus(`🧬 Testing ${currentTest}/${totalTests} (${progress}%) - ${remaining.toFixed(0)}s remaining`);
                }
                console.log(`\n🔍 [${currentTest}/${totalTests}] ${param1} × ${param2}`);
                
                // Generate test grid (configurable size)
                const values1 = window.generateTestValuesFromRules(param1).slice(0, gridSize);
                const values2 = window.generateTestValuesFromRules(param2).slice(0, gridSize);
                
                const configs = [];
                for (const v1 of values1) {
                    for (const v2 of values2) {
                        const testConfig = window.deepClone(baseConfig);
                        testConfig[section1][param1] = v1;
                        testConfig[section2][param2] = v2;
                        configs.push(testConfig);
                    }
                }
                
                console.log(`  Generated ${configs.length} test configurations`);
                
                // Batch test all combinations
                const results = await window.backtesterAPI.fetchResultsBatch(configs, gridSize * gridSize);
                
                // Calculate interaction strength
                const interactionStrength = calculateInteractionStrength(results, values1, values2);
                
                if (interactionStrength > 0.15) {
                    const sortedResults = results.filter(r => r.success).sort((a, b) => b.tpPnlPercent - a.tpPnlPercent);
                    interactions.push({
                        param1,
                        param2,
                        strength: interactionStrength,
                        bestConfig: sortedResults[0]?.config,
                        bestPnl: sortedResults[0]?.tpPnlPercent
                    });
                    
                    console.log(`  ✨ Strong interaction detected! Strength: ${interactionStrength.toFixed(3)}`);
                } else {
                    console.log(`  No significant interaction (${interactionStrength.toFixed(3)})`);
                }
            }
        }
        
        // Sort by interaction strength
        interactions.sort((a, b) => b.strength - a.strength);
        
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log('\n' + '%c🎯 Interaction Discovery Complete', 'color: green; font-weight: bold;');
        console.log(`Completed in ${totalTime}s`);
        console.log(`Found ${interactions.length} significant parameter interactions:`);
        
        interactions.forEach((int, idx) => {
            console.log(`${idx + 1}. ${int.param1} × ${int.param2} (strength: ${int.strength.toFixed(3)})`);
        });
        
        // Display results in UI
        displayInteractionResults(interactions);
        
        if (typeof window.updateStatus === 'function') {
            window.updateStatus(`✅ Found ${interactions.length} parameter interactions`);
        }
        
        return interactions;
    }

    // Export to global scope
    window.runInteractionDiscovery = runInteractionDiscovery;
    window.calculateInteractionStrength = calculateInteractionStrength;
    window.displayInteractionResults = displayInteractionResults;
    
    console.log('✅ Parameter Interaction Discovery loaded');
})();
