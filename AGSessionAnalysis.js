// ========================================
// 🌍 AG SESSION ANALYSIS
// Trading Session Analysis Tool
// ========================================

(function() {
    'use strict';

    console.log('🌍 AGSessionAnalysis.js loaded');

    // ========================================
    // CONFIGURATION
    // ========================================
    const SESSION_CONFIG = {
        API_BASE_URL: 'http://192.168.50.141:5000/api',
        DEFAULT_DAYS: 7,
        REFRESH_INTERVAL: null, // Set to milliseconds for auto-refresh, null to disable
    };

    // ========================================
    // SESSION ANALYSIS UI
    // ========================================
    async function renderSessionsUI(container) {
        const apiBaseUrl = SESSION_CONFIG.API_BASE_URL;
        
        // Build the UI with controls and results area
        container.innerHTML = `
            <div style="padding: 16px;">
                <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #e2e8f0; display: flex; align-items: center; gap: 8px;">
                    🌍 Trading Session Analysis
                </h3>
                
                <!-- Controls -->
                <div style="
                    background: rgba(45, 55, 72, 0.5);
                    border: 1px solid #4a5568;
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 16px;
                ">
                    <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
                        <div style="flex: 1; min-width: 120px;">
                            <label style="font-size: 11px; color: #a0aec0; display: block; margin-bottom: 4px;">Days Back</label>
                            <select id="sessions-days-select" style="
                                width: 100%;
                                padding: 6px 10px;
                                background: #2d3748;
                                border: 1px solid #4a5568;
                                border-radius: 4px;
                                color: #e2e8f0;
                                font-size: 12px;
                            ">
                                <option value="3">Last 3 Days</option>
                                <option value="7" selected>Last 7 Days</option>
                                <option value="14">Last 14 Days</option>
                                <option value="30">Last 30 Days</option>
                            </select>
                        </div>
                        <div style="flex: 1; min-width: 120px;">
                            <label style="font-size: 11px; color: #a0aec0; display: block; margin-bottom: 4px;">Trigger Mode</label>
                            <select id="sessions-trigger-select" style="
                                width: 100%;
                                padding: 6px 10px;
                                background: #2d3748;
                                border: 1px solid #4a5568;
                                border-radius: 4px;
                                color: #e2e8f0;
                                font-size: 12px;
                            ">
                                <option value="">All Modes</option>
                                <option value="0">Bullish Bonding (0)</option>
                                <option value="1">Fomo</option>
                                <option value="2">God Mode (2)</option>
                                <option value="3">Moonfinder</option>
                                <option value="4" selected>Launchpads</option>
                                <option value="5">SmartTracker</option>
                            </select>
                        </div>
                        <div style="flex: 0 0 auto; align-self: flex-end;">
                            <button id="sessions-refresh-btn" onclick="window.refreshSessionsData()" style="
                                padding: 8px 16px;
                                background: rgba(72, 187, 120, 0.2);
                                border: 1px solid rgba(72, 187, 120, 0.4);
                                border-radius: 6px;
                                color: #48bb78;
                                cursor: pointer;
                                font-size: 12px;
                                font-weight: 600;
                                transition: all 0.2s;
                            " onmouseover="this.style.background='rgba(72, 187, 120, 0.3)'" 
                               onmouseout="this.style.background='rgba(72, 187, 120, 0.2)'">
                                🔄 Refresh
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Current Session Status -->
                <div id="sessions-current-status" style="
                    background: rgba(66, 153, 225, 0.1);
                    border: 1px solid rgba(66, 153, 225, 0.3);
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 16px;
                ">
                    <div style="font-size: 11px; color: #a0aec0; margin-bottom: 6px;">📍 Currently Active Sessions</div>
                    <div id="sessions-active-list" style="font-size: 13px; color: #e2e8f0;">Loading...</div>
                </div>
                
                <!-- Session Results Table -->
                <div id="sessions-results" style="
                    background: rgba(45, 55, 72, 0.3);
                    border: 1px solid #4a5568;
                    border-radius: 8px;
                    overflow: hidden;
                ">
                    <div style="
                        padding: 12px;
                        background: #2d3748;
                        border-bottom: 1px solid #4a5568;
                        font-size: 12px;
                        font-weight: 600;
                        color: #e2e8f0;
                    ">
                        📊 Session Quality Analysis
                        <span style="font-weight: 400; color: #a0aec0; margin-left: 8px;">
                            Formula: (100k% × 0.4) + (200k% × 0.6)
                        </span>
                    </div>
                    <div id="sessions-table-container" style="padding: 0;">
                        <div style="text-align: center; padding: 40px; color: #a0aec0;">
                            Click Refresh to load session data
                        </div>
                    </div>
                </div>
                
                <!-- Hourly Analysis Section -->
                <div id="sessions-hourly" style="
                    margin-top: 16px;
                    background: rgba(45, 55, 72, 0.3);
                    border: 1px solid #4a5568;
                    border-radius: 8px;
                    overflow: hidden;
                ">
                    <div style="
                        padding: 12px;
                        background: #2d3748;
                        border-bottom: 1px solid #4a5568;
                        font-size: 12px;
                        font-weight: 600;
                        color: #e2e8f0;
                    ">
                        ⏰ Best Trading Hours (UTC)
                    </div>
                    <div id="sessions-hourly-container" style="padding: 12px;">
                        <div style="text-align: center; padding: 20px; color: #a0aec0; font-size: 12px;">
                            Session data will show best hours
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add refresh function to window
        window.refreshSessionsData = async function() {
            const daysSelect = document.getElementById('sessions-days-select');
            const triggerSelect = document.getElementById('sessions-trigger-select');
            const refreshBtn = document.getElementById('sessions-refresh-btn');
            
            const days = parseInt(daysSelect.value);
            const triggerMode = triggerSelect.value;
            
            // Calculate dates
            const toDate = new Date().toISOString().split('T')[0];
            const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            // Show loading state
            refreshBtn.innerHTML = '⏳ Loading...';
            refreshBtn.disabled = true;
            
            try {
                // Fetch session analysis
                let url = `${apiBaseUrl}/sessions/analyze?fromDate=${fromDate}&toDate=${toDate}`;
                if (triggerMode) url += `&triggerMode=${triggerMode}`;
                
                console.log('📡 Fetching sessions:', url);
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('📊 Session data:', data);
                
                // Update current status
                updateCurrentStatus(data);
                
                // Update results table
                updateSessionsTable(data);
                
                // Update hourly analysis
                await fetchAndUpdateHourly(apiBaseUrl, fromDate, toDate, triggerMode);
                
            } catch (error) {
                console.error('❌ Session fetch error:', error);
                document.getElementById('sessions-table-container').innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #ff6b6b;">
                        ❌ Failed to load session data: ${error.message}
                    </div>
                `;
            } finally {
                refreshBtn.innerHTML = '🔄 Refresh';
                refreshBtn.disabled = false;
            }
        };
        
        // Auto-refresh on load
        window.refreshSessionsData();
    }

    // ========================================
    // UI UPDATE FUNCTIONS
    // ========================================
    function updateCurrentStatus(data) {
        const activeList = document.getElementById('sessions-active-list');
        const activeSessions = data.activeSessions || [];
        const currentSentiment = data.recommendations?.currentSessionSentiment || [];
        
        if (activeSessions.length === 0) {
            activeList.innerHTML = '<span style="color: #a0aec0;">No active sessions</span>';
            return;
        }
        
        const sessionHtml = currentSentiment.map(s => {
            const sentimentColor = s.sentiment.includes('Bullish') ? '#48bb78' : 
                                  s.sentiment.includes('Bearish') ? '#fc8181' : '#ecc94b';
            return `
                <span style="
                    display: inline-block;
                    padding: 4px 10px;
                    background: rgba(66, 153, 225, 0.2);
                    border: 1px solid rgba(66, 153, 225, 0.3);
                    border-radius: 4px;
                    margin-right: 8px;
                    margin-bottom: 4px;
                ">
                    <span style="font-weight: 600;">${s.session}</span>
                    <span style="color: ${sentimentColor}; margin-left: 6px;">${s.sentiment}</span>
                    <span style="color: #a0aec0; margin-left: 4px; font-size: 11px;">Score: ${s.qualityScore.toFixed(2)}</span>
                </span>
            `;
        }).join('');
        
        activeList.innerHTML = sessionHtml + `<div style="margin-top: 8px; font-size: 11px; color: #718096;">UTC Time: ${data.currentUtcTime}</div>`;
    }

    function updateSessionsTable(data) {
        const container = document.getElementById('sessions-table-container');
        const sessions = data.sessions;
        
        // Sort by quality score descending
        const sortedSessions = Object.entries(sessions)
            .sort((a, b) => b[1].qualityScore - a[1].qualityScore);
        
        const tableHtml = `
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                    <tr style="background: #2d3748;">
                        <th style="padding: 10px; text-align: left; border-bottom: 1px solid #4a5568; color: #a0aec0;">Session</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 1px solid #4a5568; color: #a0aec0;">UTC Hours</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 1px solid #4a5568; color: #a0aec0;">Tokens</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 1px solid #4a5568; color: #a0aec0;">100k %</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 1px solid #4a5568; color: #a0aec0;">200k %</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 1px solid #4a5568; color: #a0aec0;">Score</th>
                        <th style="padding: 10px; text-align: left; border-bottom: 1px solid #4a5568; color: #a0aec0;">Sentiment</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedSessions.map(([key, s], idx) => {
                        const sentimentColor = s.sentiment.includes('Bullish') ? '#48bb78' : 
                                              s.sentiment.includes('Bearish') ? '#fc8181' : '#ecc94b';
                        const bgColor = idx === 0 ? 'rgba(72, 187, 120, 0.1)' : 'transparent';
                        const utcHours = s.timeRangeUtc.replace(' UTC', '');
                        return `
                            <tr style="background: ${bgColor};">
                                <td style="padding: 10px; border-bottom: 1px solid #4a5568; color: #e2e8f0; font-weight: ${idx === 0 ? '600' : '400'};">
                                    ${idx === 0 ? '🏆 ' : ''}${s.name}
                                </td>
                                <td style="padding: 10px; text-align: center; border-bottom: 1px solid #4a5568; color: #a0aec0; font-family: monospace; font-size: 11px;">
                                    ${utcHours}
                                </td>
                                <td style="padding: 10px; text-align: center; border-bottom: 1px solid #4a5568; color: #e2e8f0;">
                                    ${s.totalTokens.toLocaleString()}
                                </td>
                                <td style="padding: 10px; text-align: center; border-bottom: 1px solid #4a5568; color: #e2e8f0;">
                                    ${s.mcapBreakdown.reached100kPct.toFixed(1)}%
                                </td>
                                <td style="padding: 10px; text-align: center; border-bottom: 1px solid #4a5568; color: #e2e8f0;">
                                    ${s.mcapBreakdown.reached200kPct.toFixed(1)}%
                                </td>
                                <td style="padding: 10px; text-align: center; border-bottom: 1px solid #4a5568; color: #e2e8f0; font-weight: 600;">
                                    ${s.qualityScore.toFixed(2)}
                                </td>
                                <td style="padding: 10px; border-bottom: 1px solid #4a5568; color: ${sentimentColor};">
                                    ${s.sentiment}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            <div style="padding: 10px; font-size: 11px; color: #718096; border-top: 1px solid #4a5568;">
                📅 Date Range: ${data.dateRange.from} to ${data.dateRange.to} (${data.dateRange.days} days)
            </div>
        `;
        
        container.innerHTML = tableHtml;
    }

    async function fetchAndUpdateHourly(apiBaseUrl, fromDate, toDate, triggerMode) {
        try {
            let url = `${apiBaseUrl}/sessions/hourly?fromDate=${fromDate}&toDate=${toDate}`;
            if (triggerMode) url += `&triggerMode=${triggerMode}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Hourly fetch failed');
            
            const data = await response.json();
            const container = document.getElementById('sessions-hourly-container');
            
            const topHours = data.recommendations?.topHours || [];
            const bestHour = data.recommendations?.bestHour;
            const worstHour = data.recommendations?.worstHour;
            
            if (topHours.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: #a0aec0;">No hourly data available</div>';
                return;
            }
            
            const hourlyHtml = `
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <!-- Best Hour Highlight -->
                    <div style="
                        flex: 1;
                        min-width: 200px;
                        background: rgba(72, 187, 120, 0.1);
                        border: 1px solid rgba(72, 187, 120, 0.3);
                        border-radius: 6px;
                        padding: 12px;
                    ">
                        <div style="font-size: 11px; color: #48bb78; margin-bottom: 6px;">🏆 Best Hour</div>
                        <div style="font-size: 18px; font-weight: 600; color: #e2e8f0;">${bestHour?.timeRange || 'N/A'}</div>
                        <div style="font-size: 12px; color: #a0aec0; margin-top: 4px;">
                            ${bestHour?.successRate?.toFixed(1) || 0}% reach 100k • ${bestHour?.totalTokens || 0} tokens
                        </div>
                    </div>
                    
                    <!-- Worst Hour -->
                    <div style="
                        flex: 1;
                        min-width: 200px;
                        background: rgba(252, 129, 129, 0.1);
                        border: 1px solid rgba(252, 129, 129, 0.3);
                        border-radius: 6px;
                        padding: 12px;
                    ">
                        <div style="font-size: 11px; color: #fc8181; margin-bottom: 6px;">⚠️ Worst Hour</div>
                        <div style="font-size: 18px; font-weight: 600; color: #e2e8f0;">${worstHour?.timeRange || 'N/A'}</div>
                        <div style="font-size: 12px; color: #a0aec0; margin-top: 4px;">
                            ${worstHour?.successRate?.toFixed(1) || 0}% reach 100k • ${worstHour?.totalTokens || 0} tokens
                        </div>
                    </div>
                </div>
                
                <!-- Top 5 Hours List -->
                <div style="margin-top: 12px;">
                    <div style="font-size: 11px; color: #a0aec0; margin-bottom: 8px;">Top 5 Hours by Success Rate:</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        ${topHours.slice(0, 5).map((h, i) => `
                            <span style="
                                padding: 4px 10px;
                                background: ${i === 0 ? 'rgba(72, 187, 120, 0.2)' : 'rgba(45, 55, 72, 0.5)'};
                                border: 1px solid ${i === 0 ? 'rgba(72, 187, 120, 0.4)' : '#4a5568'};
                                border-radius: 4px;
                                font-size: 11px;
                                color: #e2e8f0;
                            ">
                                <span style="font-weight: 600;">${h.hour.toString().padStart(2, '0')}:00</span>
                                <span style="color: #a0aec0; margin-left: 4px;">${h.successRate.toFixed(1)}%</span>
                            </span>
                        `).join('')}
                    </div>
                </div>
            `;
            
            container.innerHTML = hourlyHtml;
            
        } catch (error) {
            console.error('Hourly fetch error:', error);
            document.getElementById('sessions-hourly-container').innerHTML = `
                <div style="text-align: center; padding: 20px; color: #a0aec0; font-size: 12px;">
                    Could not load hourly data
                </div>
            `;
        }
    }

    // ========================================
    // EXPORT TO WINDOW
    // ========================================
    window.AGSessionAnalysis = {
        renderSessionsUI,
        updateCurrentStatus,
        updateSessionsTable,
        fetchAndUpdateHourly,
        config: SESSION_CONFIG
    };

    console.log('✅ AGSessionAnalysis ready');

})();
