
// Player detailed information - will be populated from Google Sheets
let playerData = {};

// Modal functions
function openPlayerModal(playerId) {
    const player = playerData[playerId];
    if (!player) {
        console.warn('Player not found:', playerId);
        return;
    }
    const modalBody = document.getElementById('modalBody');

    modalBody.innerHTML = `
                <h2>${player.name}</h2>
                <div class="player-detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Roles:</span>
                        <span class="detail-value">${player.roles || '—'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Summary:</span>
                        <span class="detail-value">${player.summary || '—'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Top 5 Champs:</span>
                        <span class="detail-value">${player.topChamps || '—'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Comfort Style:</span>
                        <span class="detail-value">${player.style || '—'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Weakness:</span>
                        <span class="detail-value">${player.weakness || '—'}</span>
                    </div>
                    ${player.notes ? `<div class="detail-item">
                        <span class="detail-label">Notes:</span>
                        <span class="detail-value">${player.notes}</span>
                    </div>` : ''}
                </div>
            `;

    document.getElementById('playerModal').style.display = 'block';
}

function closePlayerModal() {
    document.getElementById('playerModal').style.display = 'none';
}

// Process player data from API into playerData object
function processPlayerData(players) {
    if (!players || !Array.isArray(players)) return;

    players.forEach(p => {
        // Get player name and create a key from it
        const fullName = String(p['Player'] || '').trim();
        if (!fullName) return;

        // Extract key from name: "LC Pretzel" -> "pretzel", "LC Midas (Team Manager)" -> "midas"
        let key = fullName.toLowerCase()
            .replace(/^lc\s+/, '')  // Remove "LC " prefix
            .replace(/\s*\([^)]*\)\s*/g, '')  // Remove parenthetical text
            .replace(/\s+/g, '')  // Remove spaces
            .trim();

        // Handle special cases
        if (key.includes('sheep') || key.includes('sh4un')) key = 'sheep';
        if (key.includes('sage')) key = 'redsage';

        playerData[key] = {
            name: fullName,
            summary: String(p['Player Summary'] || '').trim(),
            roles: String(p['Primary Roles'] || '').trim(),
            rank: String(p['Rank'] || '').trim(),
            topChamps: String(p['Top 5 Champs'] || '').trim(),
            style: String(p['Comfort Style'] || '').trim(),
            weakness: String(p['Weakness'] || '').trim(),
            notes: String(p['Notes'] || '').trim()
        };
    });

    // Update rank badges on player cards
    updatePlayerRanks();

    // Show player grid, hide loading
    document.getElementById('players-loading').style.display = 'none';
    document.getElementById('players-grid').style.display = 'grid';
}

// Update rank badges on player cards
function updatePlayerRanks() {
    document.querySelectorAll('.player-rank[data-player-key]').forEach(badge => {
        const key = badge.dataset.playerKey;
        const player = playerData[key];
        if (player && player.rank) {
            badge.textContent = player.rank;
        }
    });
}

// Store player champion data from Tourney Prep
let playerChamps = {};

// Process player champion data from Tourney Prep sheet
function processPlayerChamps(champsData) {
    if (!champsData) return;
    playerChamps = champsData;

    // Update best champion sections
    document.querySelectorAll('.champion-section[data-champ-type="best"]').forEach(section => {
        const key = section.dataset.playerKey;
        const champs = playerChamps[key];
        if (champs && champs.best) {
            const nameDiv = section.querySelector('.champion-name.best');
            if (nameDiv) {
                nameDiv.textContent = champs.best;
            }
        }
    });

    // Update comfort champion sections
    document.querySelectorAll('.champion-section[data-champ-type="comfort"]').forEach(section => {
        const key = section.dataset.playerKey;
        const champs = playerChamps[key];
        if (champs && champs.comfort && champs.comfort.length) {
            // Remove existing champion names (except label)
            const label = section.querySelector('.champion-label');
            section.innerHTML = '';
            section.appendChild(label);

            // Add each comfort pick
            champs.comfort.forEach(champName => {
                const div = document.createElement('div');
                div.className = 'champion-name';
                div.textContent = champName;
                section.appendChild(div);
            });
        }
    });
}

// Reflections data - will be populated from Google Sheets
let reflections = [];

// Get reflections for a specific game date
function getReflectionsForGame(gameDate) {
    if (!reflections || !reflections.length) return [];

    // Parse DD/MM/YYYY or D/M/YYYY format (with optional time) to YYYY-MM-DD
    const normalizeDate = (dateStr) => {
        if (!dateStr) return '';
        const str = String(dateStr).trim();

        // Already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            return str;
        }

        // Match DD/MM/YYYY or D/M/YYYY (with optional time at the end)
        const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (match) {
            const day = match[1].padStart(2, '0');
            const month = match[2].padStart(2, '0');
            const year = match[3];
            return `${year}-${month}-${day}`;
        }

        // Fallback: try parsing as Date (for ISO strings)
        const d = new Date(str);
        if (!isNaN(d)) {
            return d.toISOString().split('T')[0];
        }

        return str;
    };

    const normalizedGameDate = normalizeDate(gameDate);

    return reflections.filter(r => {
        const reflectionDate = normalizeDate(r.gameDate);
        return reflectionDate === normalizedGameDate;
    });
}

// Open reflections modal
function openReflectionsModal(gameDate) {
    const gameReflections = getReflectionsForGame(gameDate);
    const modalBody = document.getElementById('reflectionsBody');

    if (!gameReflections.length) {
        modalBody.innerHTML = '<p class="no-reflections-message">No reflections for this game.</p>';
    } else {
        modalBody.innerHTML = gameReflections.map(r => {
            // Map role to icon filename
            const getRoleIcon = (role) => {
                if (!role) return '';
                const roleLower = role.toLowerCase().trim();
                const roleMap = {
                    'top': 'Top_icon.png',
                    'jungle': 'Jungle_icon.png',
                    'jungler': 'Jungle_icon.png',
                    'mid': 'Middle_icon.png',
                    'middle': 'Middle_icon.png',
                    'adc': 'Bottom_icon.png',
                    'bot': 'Bottom_icon.png',
                    'bottom': 'Bottom_icon.png',
                    'support': 'Support_icon.png',
                    'supp': 'Support_icon.png'
                };
                return roleMap[roleLower] || '';
            };

            const roleIcon = getRoleIcon(r.role);
            const roleHtml = roleIcon
                ? `<div class="reflection-role-icon" title="${r.role}"><img src="assets/icons/${roleIcon}" alt="${r.role}"></div>`
                : '';

            return `
                    <div class="reflection-card">
                        <div class="reflection-header">
                            <span class="reflection-player">${r.playerName}</span>
                            <div class="reflection-badges">
                                ${roleHtml}
                                <span class="reflection-comms">Comms: ${r.commsQuality}/5</span>
                            </div>
                        </div>
                        <div class="reflection-section">
                            <span class="reflection-label">What worked well:</span>
                            <p class="reflection-text">${r.whatWorked || '—'}</p>
                        </div>
                        <div class="reflection-section">
                            <span class="reflection-label">What broke down:</span>
                            <p class="reflection-text">${r.whatBroke || '—'}</p>
                        </div>
                        ${r.whatWentWrong ? `<div class="reflection-section">
                            <span class="reflection-label">What went wrong the most:</span>
                            <p class="reflection-text">${r.whatWentWrong}</p>
                        </div>` : ''}
                        <div class="reflection-section">
                            <span class="reflection-label">Focus for next scrim:</span>
                            <p class="reflection-text">${r.focusNext || '—'}</p>
                        </div>
                    </div>
                `;
        }).join('');
    }

    document.getElementById('reflectionsModal').style.display = 'block';
}
window.openReflectionsModal = openReflectionsModal;

function closeReflectionsModal() {
    document.getElementById('reflectionsModal').style.display = 'none';
}
window.closeReflectionsModal = closeReflectionsModal;

// Close modal when clicking outside
window.onclick = function (event) {
    const playerModal = document.getElementById('playerModal');
    const reflectionsModal = document.getElementById('reflectionsModal');
    if (event.target === playerModal) {
        playerModal.style.display = 'none';
    }
    if (event.target === reflectionsModal) {
        reflectionsModal.style.display = 'none';
    }
}

// Game data - will be populated from Google Sheets
let games = [];
let currentGameTypeFilter = 'all';

// Game type filter function
function setGameTypeFilter(filterType) {
    currentGameTypeFilter = filterType;

    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filterType) {
            btn.classList.add('active');
        }
    });

    // Refresh all stats
    updateOverviewStats();
    updateChartValues();
    createLineChart();
    updateReflectionInsights();
    updateAnalytics();
}
window.setGameTypeFilter = setGameTypeFilter;

// Filter games by current game type
function getFilteredGames() {
    const gamesList = Array.isArray(window.games) ? window.games : [];

    if (currentGameTypeFilter === 'all') {
        return gamesList;
    }

    return gamesList.filter(game => {
        const type = (game.type || '').toLowerCase();

        switch (currentGameTypeFilter) {
            case 'scrim':
                return type.includes('scrim') && !type.includes('tournament');
            case 'tournament':
                return type.includes('tournament') || type.includes('tourney');
            case 'competitive':
                return type.includes('scrim') || type.includes('tournament') || type.includes('tourney');
            case 'ranked':
                return type.includes('ranked') || type.includes('flex');
            default:
                return true;
        }
    });
}

// Get reflections for filtered games
function getFilteredReflections() {
    const filteredGames = getFilteredGames();
    const gameDates = filteredGames.map(g => g.date);

    return (window.reflections || []).filter(r => gameDates.includes(r.gameDate));
}

// Update overview stats from games data
function updateOverviewStats() {
    const gamesList = getFilteredGames();
    const gamesPlayed = gamesList.length;
    const wins = gamesList.filter(g => (g.result || '').toLowerCase().includes('win')).length;
    const losses = gamesPlayed - wins;
    const winRate = gamesPlayed > 0 ? ((wins / gamesPlayed) * 100).toFixed(1) : '0.0';

    // Update stat cards
    document.getElementById('stat-games').textContent = gamesPlayed;
    document.getElementById('stat-wins').textContent = wins;
    document.getElementById('stat-winrate').textContent = winRate + '%';
    document.getElementById('stat-losses').textContent = losses;
}

// Calculate averages for gold at different timestamps
function calculateGoldAverages() {
    const timestamps = ['gold_10', 'gold_20', 'gold_30', 'gold_40', 'gold_50'];
    const averages = {};
    const gamesList = getFilteredGames();

    timestamps.forEach(timestamp => {
        const values = gamesList.map(game => game[timestamp]).filter(val => typeof val === 'number');
        const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b) / values.length) : 0;
        averages[timestamp] = avg;
    });

    return averages;
}

// Analyze reflections and extract common themes
function updateReflectionInsights() {
    const filteredReflections = getFilteredReflections();
    const workingEl = document.getElementById('insights-working');
    const improveEl = document.getElementById('insights-improve');

    if (filteredReflections.length === 0) {
        workingEl.innerHTML = '<p class="insight-empty">No reflections for selected games</p>';
        improveEl.innerHTML = '<p class="insight-empty">No reflections for selected games</p>';
        return;
    }

    // Extract and count themes from "what worked"
    const workingThemes = extractThemes(filteredReflections.map(r => r.whatWorked).filter(Boolean));
    const brokeThemes = extractThemes(filteredReflections.map(r => r.whatBroke).filter(Boolean));
    const wrongThemes = extractThemes(filteredReflections.map(r => r.whatWentWrong).filter(Boolean));

    // Combine broke and wrong themes
    const improveThemes = {};
    [...Object.entries(brokeThemes), ...Object.entries(wrongThemes)].forEach(([theme, count]) => {
        improveThemes[theme] = (improveThemes[theme] || 0) + count;
    });

    // Display top themes
    workingEl.innerHTML = formatThemes(workingThemes, 'positive');
    improveEl.innerHTML = formatThemes(improveThemes, 'negative');
}

// Extract common themes/keywords from text
function extractThemes(texts) {
    const themes = {};
    const keywords = [
        'comms', 'communication', 'vision', 'macro', 'micro', 'mechanics',
        'objectives', 'teamfights', 'team fights', 'draft', 'comp', 'composition',
        'tracking', 'map awareness', 'positioning', 'picks', 'ganks', 'roams',
        'shotcalling', 'shot calling', 'calls', 'focus', 'synergy', 'coordination',
        'early game', 'late game', 'mid game', 'laning', 'jungle', 'mental'
    ];

    texts.forEach(text => {
        const lowerText = text.toLowerCase();
        keywords.forEach(keyword => {
            if (lowerText.includes(keyword)) {
                // Normalize similar keywords
                let normalizedKey = keyword;
                if (keyword === 'communication') normalizedKey = 'comms';
                if (keyword === 'team fights') normalizedKey = 'teamfights';
                if (keyword === 'shot calling' || keyword === 'calls') normalizedKey = 'shotcalling';
                if (keyword === 'composition' || keyword === 'comp') normalizedKey = 'draft/comp';
                if (keyword === 'map awareness') normalizedKey = 'map awareness';

                themes[normalizedKey] = (themes[normalizedKey] || 0) + 1;
            }
        });
    });

    return themes;
}

// Format themes for display
function formatThemes(themes, type) {
    const sorted = Object.entries(themes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (sorted.length === 0) {
        return '<p class="insight-empty">No clear patterns found</p>';
    }

    const maxCount = sorted[0][1];

    return sorted.map(([theme, count]) => {
        const percentage = Math.round((count / maxCount) * 100);
        const colorClass = type === 'positive' ? 'theme-positive' : 'theme-negative';
        return `
                    <div class="theme-item">
                        <div class="theme-header">
                            <span class="theme-name">${theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
                            <span class="theme-count">${count} mentions</span>
                        </div>
                        <div class="theme-bar">
                            <div class="theme-bar-fill ${colorClass}" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                `;
    }).join('');
}

// Update chart with calculated values
function updateChartValues() {
    const averages = calculateGoldAverages();
    // Only consider non-zero values for max calculation
    const nonZeroValues = Object.values(averages).filter(v => v !== 0);
    const maxValue = nonZeroValues.length > 0 ? Math.max(...nonZeroValues.map(Math.abs)) : 1;

    const chartBars = document.querySelectorAll('.chart-bar');
    const keys = ['gold_10', 'gold_20', 'gold_30', 'gold_40', 'gold_50'];

    chartBars.forEach((bar, index) => {
        const barValue = averages[keys[index]];
        const barFill = bar.querySelector('.bar-fill');
        const barValueEl = bar.querySelector('.bar-value');

        // Hide bar if value is 0 (no data for this timestamp)
        if (barValue === 0) {
            bar.style.display = 'none';
        } else {
            bar.style.display = '';
            const isNegative = barValue < 0;
            const height = (Math.abs(barValue) / maxValue) * 100;

            barFill.dataset.height = height;
            barFill.style.background = isNegative
                ? 'linear-gradient(180deg, var(--loss-color), var(--accent-purple))'
                : 'linear-gradient(180deg, var(--accent-blue), var(--accent-gold))';

            barValueEl.textContent = barValue > 0 ? '+' + barValue : barValue;
            barValueEl.style.color = isNegative ? 'var(--loss-color)' : 'var(--win-color)';
        }
    });
}

// ===== ANALYTICS FUNCTIONS =====

let performanceChartInstance = null;

// Master analytics update function
function updateAnalytics() {
    const gamesList = getFilteredGames();

    // Update all analytics with filtered games (even if empty, to show empty states)
    updateRecentForm(gamesList);
    updateGameLengthAnalysis(gamesList);
    updateWinRateByComp(gamesList);
    updateChampionPool(gamesList);
    createPerformanceTrendChart(gamesList);
}

// Parse game length string to seconds
function parseGameLength(lengthStr) {
    if (!lengthStr) return 0;
    const parts = lengthStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
}

// Recent games form indicator (up to 20)
function updateRecentForm(gamesList) {
    const container = document.getElementById('recent-form');
    const recentGames = gamesList.slice(-20).reverse();

    if (recentGames.length === 0) {
        container.innerHTML = '<p class="analytics-empty">No games found</p>';
        return;
    }

    // Calculate current streak
    let currentStreak = 0;
    let streakType = '';
    for (let i = 0; i < recentGames.length; i++) {
        const isWin = recentGames[i].result.toLowerCase() === 'win';
        if (i === 0) {
            streakType = isWin ? 'win' : 'loss';
            currentStreak = 1;
        } else if ((isWin && streakType === 'win') || (!isWin && streakType === 'loss')) {
            currentStreak++;
        } else {
            break;
        }
    }

    const streakText = streakType === 'win' ? `${currentStreak} Win Streak` : `${currentStreak} Loss Streak`;
    const streakClass = streakType === 'win' ? 'streak-win' : 'streak-loss';

    // Create slots only for available games
    const slots = recentGames.map(g => {
        const isWin = g.result.toLowerCase() === 'win';
        return `
                    <div class="form-dot ${isWin ? 'win' : 'loss'}" data-date="${g.date}" onclick="navigateToGame('${g.date}')">
                        <div class="form-tooltip">${g.date}<br>vs ${g.opponent}</div>
                    </div>
                `;
    });

    container.innerHTML = `
                <div class="form-grid">
                    ${slots.join('')}
                </div>
                <div class="form-streak ${streakClass}">${streakText}</div>
            `;
}

// Navigate to games table and filter to specific date
function navigateToGame(gameDate) {
    showSection('games');

    // Wait for section to show then filter the DataTable
    setTimeout(() => {
        const tableElement = document.getElementById('gamesTable');
        if (tableElement && window.jQuery && window.jQuery.fn.dataTable.isDataTable(tableElement)) {
            const table = window.jQuery(tableElement).DataTable();
            table.search(gameDate).draw();
        }
    }, 100);
}
window.navigateToGame = navigateToGame;

// Game length breakdown
function updateGameLengthAnalysis(gamesList) {
    const container = document.getElementById('game-length-analysis');
    const buckets = {
        'Early (<25m)': { range: [0, 25], wins: 0, total: 0 },
        'Mid (25-35m)': { range: [25, 35], wins: 0, total: 0 },
        'Late (35-45m)': { range: [35, 45], wins: 0, total: 0 },
        'Very Late (>45m)': { range: [45, Infinity], wins: 0, total: 0 }
    };

    gamesList.forEach(g => {
        const seconds = parseGameLength(g.length);
        if (seconds === 0) return;
        const mins = seconds / 60;

        for (const [name, bucket] of Object.entries(buckets)) {
            if (mins >= bucket.range[0] && mins < bucket.range[1]) {
                bucket.total++;
                if (g.result.toLowerCase() === 'win') bucket.wins++;
                break;
            }
        }
    });

    const maxTotal = Math.max(...Object.values(buckets).map(b => b.total), 1);

    container.innerHTML = `
                <div class="length-breakdown">
                    ${Object.entries(buckets).map(([name, bucket]) => {
        const winrate = bucket.total > 0 ? Math.round((bucket.wins / bucket.total) * 100) : 0;
        const barWidth = (bucket.total / maxTotal) * 100;
        const colorClass = bucket.total === 0 ? 'neutral' : (winrate >= 50 ? 'positive' : 'negative');
        return `
                            <div class="length-row">
                                <span class="length-label">${name}</span>
                                <div class="length-bar-container">
                                    <div class="length-bar ${colorClass}" style="width: ${barWidth}%"></div>
                                    <span class="length-stats">${bucket.total} games ${bucket.total > 0 ? `(${winrate}% WR)` : ''}</span>
                                </div>
                            </div>
                        `;
    }).join('')}
                </div>
            `;
}

// Win rate by comp type
function updateWinRateByComp(gamesList) {
    const container = document.getElementById('winrate-by-comp');
    const compStats = {};

    gamesList.forEach(g => {
        const comp = g.comp_type || 'Unknown';
        if (!compStats[comp]) compStats[comp] = { wins: 0, total: 0 };
        compStats[comp].total++;
        if (g.result.toLowerCase() === 'win') compStats[comp].wins++;
    });

    const sorted = Object.entries(compStats)
        .map(([name, data]) => ({
            name,
            wins: data.wins,
            total: data.total,
            winrate: data.wins / data.total
        }))
        .sort((a, b) => b.total - a.total);

    if (sorted.length === 0) {
        container.innerHTML = '<p class="analytics-empty">No comp data</p>';
        return;
    }

    container.innerHTML = `
                <div class="comp-stats-list">
                    ${sorted.map(c => {
        const colorClass = c.winrate >= 0.5 ? 'positive' : 'negative';
        return `
                            <div class="comp-stat">
                                <span class="comp-name">${c.name}</span>
                                <span class="comp-record">${c.wins}W - ${c.total - c.wins}L</span>
                                <span class="comp-winrate ${colorClass}">${Math.round(c.winrate * 100)}%</span>
                            </div>
                        `;
    }).join('')}
                </div>
            `;
}

// Most played champions
function updateChampionPool(gamesList) {
    const container = document.getElementById('champion-pool');
    const champCount = {};
    const champWins = {};

    gamesList.forEach(g => {
        if (!g.picks) return;
        // Split picks by common separators
        const champs = g.picks.split(/[,\/\-\|]/).map(c => c.trim()).filter(Boolean);
        const isWin = g.result.toLowerCase() === 'win';

        champs.forEach(champ => {
            champCount[champ] = (champCount[champ] || 0) + 1;
            if (isWin) champWins[champ] = (champWins[champ] || 0) + 1;
        });
    });

    const sorted = Object.entries(champCount)
        .map(([name, count]) => ({
            name,
            count,
            wins: champWins[name] || 0,
            winrate: (champWins[name] || 0) / count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    if (sorted.length === 0) {
        container.innerHTML = '<p class="analytics-empty">No champion data</p>';
        return;
    }

    const maxCount = sorted[0].count;

    container.innerHTML = `
                <div class="champ-stats-list">
                    ${sorted.map(c => {
        const losses = c.count - c.wins;
        const colorClass = c.winrate >= 0.5 ? 'positive' : 'negative';
        return `
                            <div class="champ-stat">
                                <span class="champ-name">${c.name}</span>
                                <span class="champ-record">${c.wins}W - ${losses}L</span>
                                <span class="champ-winrate ${colorClass}">${Math.round(c.winrate * 100)}%</span>
                            </div>
                        `;
    }).join('')}
                </div>
            `;
}

// Performance trend chart (last 20 games gold diff)
function createPerformanceTrendChart(gamesList) {
    const ctx = document.getElementById('performanceTrendChart');
    if (!ctx) return;

    // Destroy existing chart
    if (performanceChartInstance) {
        performanceChartInstance.destroy();
    }

    const last20 = gamesList.slice(-20);
    if (last20.length === 0) return;

    const labels = last20.map((g, i) => `#${i + 1}`);
    const goldData = last20.map(g => g.gold_20 || 0);
    const resultColors = last20.map(g =>
        g.result.toLowerCase() === 'win' ? 'rgba(0, 204, 153, 0.8)' : 'rgba(231, 60, 60, 0.8)'
    );

    performanceChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Gold Diff @20',
                data: goldData,
                backgroundColor: resultColors,
                borderColor: resultColors.map(c => c.replace('0.8', '1')),
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (items) => {
                            const idx = items[0].dataIndex;
                            return `${last20[idx].date} vs ${last20[idx].opponent}`;
                        },
                        label: (item) => {
                            const val = item.raw;
                            const result = last20[item.dataIndex].result;
                            return `Gold @20: ${val > 0 ? '+' : ''}${val} (${result})`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        color: '#a09b8c',
                        font: { family: "'Rajdhani', sans-serif", size: 11 },
                        callback: (val) => (val > 0 ? '+' : '') + (val / 1000).toFixed(0) + 'k'
                    },
                    grid: { color: 'rgba(200, 170, 110, 0.1)' }
                },
                x: {
                    ticks: {
                        color: '#a09b8c',
                        font: { family: "'Rajdhani', sans-serif", size: 10 },
                        maxRotation: 0,
                        minRotation: 0
                    },
                    grid: { display: false }
                }
            }
        }
    });
}

// ===== END ANALYTICS FUNCTIONS =====

// Create line chart
let lineChartInstance = null;

function createLineChart() {
    const averages = calculateGoldAverages();
    const ctx = document.getElementById('goldDiffLineChart');

    if (!ctx) return;

    // Destroy existing chart if it exists
    if (lineChartInstance) {
        lineChartInstance.destroy();
    }

    lineChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['@10', '@20', '@30', '@40', '@50'].filter((_, i) => {
                const keys = ['gold_10', 'gold_20', 'gold_30', 'gold_40', 'gold_50'];
                return averages[keys[i]] !== 0;
            }),
            datasets: [{
                label: 'Average Gold Difference',
                data: [
                    averages.gold_10,
                    averages.gold_20,
                    averages.gold_30,
                    averages.gold_40,
                    averages.gold_50
                ].filter(v => v !== 0),
                borderColor: '#0ac8b9',
                backgroundColor: 'rgba(10, 200, 185, 0.1)',
                borderWidth: 3,
                pointRadius: 6,
                pointBackgroundColor: '#0ac8b9',
                pointBorderColor: '#c8aa6e',
                pointBorderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#f0e6d2',
                        font: {
                            family: "'Rajdhani', sans-serif",
                            size: 14
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#a09b8c',
                        font: {
                            family: "'Rajdhani', sans-serif"
                        }
                    },
                    grid: {
                        color: 'rgba(200, 170, 110, 0.1)',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: '#a09b8c',
                        font: {
                            family: "'Rajdhani', sans-serif"
                        }
                    },
                    grid: {
                        color: 'rgba(200, 170, 110, 0.1)',
                        drawBorder: false
                    }
                }
            }
        }
    });
}

// Champion class data - will be populated from Google Sheet
let championData = {};

// Class descriptions for team composition
const classDescriptions = {
    'Controller/Enchanter': 'strong utility and peel',
    'Controller/Catcher': 'excellent pick potential',
    'Fighter/Juggernaut': 'frontline durability and sustained damage',
    'Fighter/Diver': 'strong engage and disruption',
    'Mage/Burst': 'high burst magic damage',
    'Mage/Battlemage': 'hybrid sustained and burst magic',
    'Mage/Artillery': 'long-range zone control and poke',
    'Marksman': 'sustained DPS from range',
    'Slayer/Assassin': 'high pick potential and burst threat',
    'Slayer/Skirmisher': 'strong dueling and skirmish presence',
    'Tank/Vanguard': 'frontline and initiation',
    'Tank/Warden': 'defensive frontline and peel',
    'Specialist': 'flexible or situational impact',
};

// Generate team composition summary
function generateCompSummary(champNames) {
    const classes = {};

    champNames.forEach(name => {
        if (!name || !championData[name]) return;
        championData[name].classes.forEach(cls => {
            classes[cls] = (classes[cls] || 0) + 1;
        });
    });

    const summaries = [];
    Object.entries(classes).forEach(([cls, count]) => {
        if (count > 0 && classDescriptions[cls]) {
            summaries.push(classDescriptions[cls]);
        }
    });

    if (summaries.length === 0) return 'Select champions to see composition summary.';
    return summaries.join(', ') + '.';
}

// Calculate team strengths (simplified version of Excel logic)
function calculateTeamStrengths(champNames) {
    const strengths = {
        frontline: 0,
        burst: 0,
        dps: 0,
        utility: 0,
        engage: 0,
        siege: 0,
        pick: 0,
        scaling: 0
    };

    champNames.forEach(name => {
        if (!name || !championData[name]) return;
        championData[name].classes.forEach(cls => {
            if (cls.includes('Tank/Vanguard') || cls.includes('Fighter/Juggernaut')) strengths.frontline++;
            if (cls.includes('Mage/Burst') || cls.includes('Slayer/Assassin')) strengths.burst++;
            if (cls.includes('Marksman') || cls.includes('Mage/Battlemage')) strengths.dps++;
            if (cls.includes('Controller/Enchanter') || cls.includes('Controller/Catcher')) strengths.utility++;
            if (cls.includes('Fighter/Diver') || cls.includes('Slayer/Assassin')) strengths.engage++;
            if (cls.includes('Mage/Artillery') || cls.includes('Controller/Catcher')) strengths.siege++;
            if (cls.includes('Slayer/Assassin') || cls.includes('Controller/Catcher')) strengths.pick++;
            if (cls.includes('Marksman') || cls.includes('Mage/Battlemage') || cls.includes('Specialist')) strengths.scaling++;
        });
    });

    return strengths;
}

// Generate match summary advice
function generateMatchSummary(allyChamps, enemyChamps) {
    const allyStrengths = calculateTeamStrengths(allyChamps);
    const enemyStrengths = calculateTeamStrengths(enemyChamps);

    const margin = 1;

    if (allyStrengths.frontline + allyStrengths.engage - enemyStrengths.frontline - enemyStrengths.engage > margin) {
        return 'Your team favours **frontline and engage** play — excels in direct 5v5s and forcing grouped fights. Engage advice: Be selective — look for cooldown windows and vision advantages.';
    }
    if (allyStrengths.burst + allyStrengths.dps - enemyStrengths.burst - enemyStrengths.dps > margin) {
        return 'Your team favours **burst/skirmish** fights — thrive in short, decisive trades and snowball potential. Skirmish advice: Enemy excels at picks — stay grouped, clear vision, and protect carries.';
    }
    if (allyStrengths.utility + allyStrengths.siege - enemyStrengths.utility - enemyStrengths.siege > margin) {
        return 'Your team favours **poke/siege** play — maintain spacing, chip them down, and avoid all-ins. Objective advice: Your team has relatively low sustained DPS — focus vision, secure neutral objectives and scale.';
    }
    if (allyStrengths.pick + allyStrengths.scaling - enemyStrengths.pick - enemyStrengths.scaling > margin) {
        return 'Your team favours **pick and scaling** — leverage map control and vision to punish mispositioning.';
    }
    if (enemyStrengths.frontline + enemyStrengths.engage - allyStrengths.frontline - allyStrengths.engage > margin) {
        return '⚖️ Enemy favours **frontline and engage** — kite back and punish overcommitment.';
    }
    if (enemyStrengths.burst + enemyStrengths.dps - allyStrengths.burst - allyStrengths.dps > margin) {
        return '⚖️ Enemy favours **burst/skirmish** — respect early fights and control tempo.';
    }
    if (enemyStrengths.utility + enemyStrengths.siege - allyStrengths.utility - allyStrengths.siege > margin) {
        return '⚖️ Enemy favours **poke/siege** — force fast engages or flank to disrupt them.';
    }
    return '⚖️ Even draft — execution and tempo will decide the outcome.';
}

// Update draft display
function updateDraftDisplay() {
    const allyChamps = [
        document.getElementById('ally-top').value,
        document.getElementById('ally-jungle').value,
        document.getElementById('ally-mid').value,
        document.getElementById('ally-adc').value,
        document.getElementById('ally-support').value
    ];

    const enemyChamps = [
        document.getElementById('enemy-top').value,
        document.getElementById('enemy-jungle').value,
        document.getElementById('enemy-mid').value,
        document.getElementById('enemy-adc').value,
        document.getElementById('enemy-support').value
    ];

    document.getElementById('allyCompSummary').textContent = generateCompSummary(allyChamps);
    document.getElementById('enemyCompSummary').textContent = generateCompSummary(enemyChamps);
    document.getElementById('matchSummary').textContent = generateMatchSummary(allyChamps, enemyChamps);
}

// Page configuration
const pages = {
    'overview': { section: 'overview', title: "LC - Overview" },
    'players': { section: 'players', title: "LC - Player Profiles" },
    'matches': { section: 'games', title: "LC - Match History" },
    'draft': { section: 'draft', title: "LC - Draft Tool" }
};

// Get current page from URL
function getCurrentPage() {
    const params = new URLSearchParams(location.search);
    return params.get('page') || 'overview';
}

// Navigation - show section
function showSection(sectionId, updateUrl = true) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected section
    const sectionEl = document.getElementById(sectionId);
    if (sectionEl) {
        sectionEl.classList.add('active');
    }

    // Find and activate the correct nav button
    const activeBtn = document.querySelector(`.nav-btn[data-section="${sectionId}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // Update URL and title
    if (updateUrl) {
        const pageKey = Object.keys(pages).find(k => pages[k].section === sectionId) || 'overview';
        const config = pages[pageKey];
        const newUrl = pageKey === 'overview' ? location.pathname : `?page=${pageKey}`;
        history.pushState({ section: sectionId }, config.title, newUrl);
        document.title = config.title;
    }

    // Animate chart bars when overview is shown
    if (sectionId === 'overview') {
        setTimeout(() => {
            document.querySelectorAll('.bar-fill').forEach(bar => {
                bar.style.height = bar.dataset.height + '%';
            });
        }, 100);
    }
}

// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
    const pageKey = getCurrentPage();
    const config = pages[pageKey] || pages['overview'];
    showSection(config.section, false);
    document.title = config.title;
});

// Handle nav link clicks
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-btn').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.dataset.section;
            showSection(sectionId);
        });
    });

    // Handle initial page load based on URL query param
    const pageKey = getCurrentPage();
    const config = pages[pageKey] || pages['overview'];
    showSection(config.section, false);
    document.title = config.title;
});

// Populate games table
function populateGamesTable() {
    const tbody = document.getElementById('gamesTableBody');
    if (!tbody) return;
    const tableElement = document.getElementById('gamesTable');
    if (tableElement && window.jQuery && window.jQuery.fn.dataTable.isDataTable(tableElement)) {
        window.jQuery(tableElement).DataTable().destroy();
    }
    const gamesList = Array.isArray(window.games) ? window.games : (Array.isArray(games) ? games : []);
    tbody.innerHTML = '';


    if (gamesList.length === 0) {
        // Show loading spinner
        const loadingRow = document.createElement('tr');
        loadingRow.className = 'loading-row';
        loadingRow.innerHTML = '<td colspan="9"><div class="loading-container"><div class="spinner"></div><span class="loading-text">Loading match history...</span></div></td>';
        tbody.appendChild(loadingRow);
        return;
    }
    gamesList.forEach((game, index) => {
        const row = document.createElement('tr');
        const goldClass = game.gold_20 > 0 ? 'positive' : game.gold_20 < 0 ? 'negative' : '';
        const goldValue = game.gold_20 ? (game.gold_20 > 0 ? '+' : '') + game.gold_20 : '—';

        // Check if this game has reflections
        const gameReflections = getReflectionsForGame(game.date);
        const hasReflections = gameReflections && gameReflections.length > 0;
        const reflectionsCell = hasReflections
            ? `<button class="reflections-btn" onclick="openReflectionsModal('${game.date}')">View (${gameReflections.length})</button>`
            : '<span class="no-reflections">None</span>';

        row.innerHTML = `
                    <td>${game.date}</td>
                    <td>${game.type}</td>
                    <td>${game.opponent}</td>
                    <td><span class="comp-type-badge">${game.comp_type}</span></td>
                    <td><div class="picks-display">${game.picks}</div></td>
                    <td><span class="result-badge ${game.result.toLowerCase()}">${game.result}</span></td>
                    <td><span class="gold-diff ${goldClass}">${goldValue}</span></td>
                    <td>${game.length}</td>
                    <td>${reflectionsCell}</td>
                `;
        tbody.appendChild(row);
    });

    initGamesDataTable();
}

function initGamesDataTable() {
    const tableElement = document.getElementById('gamesTable');
    if (!tableElement || !window.jQuery) return;
    const $table = window.jQuery(tableElement);

    if (window.jQuery.fn.dataTable.isDataTable(tableElement)) {
        $table.DataTable().destroy();
    }

    $table.DataTable({
        responsive: {
            details: {
                type: 'inline'
            },
            breakpoints: [
                { name: 'desktop', width: Infinity },
                { name: 'laptop', width: 1400 },
                { name: 'tablet', width: 1024 },
                { name: 'mobile', width: 768 },
                { name: 'tiny', width: 480 }
            ]
        },
        pageLength: 10,
        lengthChange: false,
        autoWidth: false,
        order: [[0, 'desc']],
        language: {
            search: 'Search matches:',
            emptyTable: 'No matches available.'
        },
        columnDefs: [
            { responsivePriority: 1, targets: 0, className: 'all' },      // Date - always show
            { responsivePriority: 2, targets: 5, className: 'all' },      // Result - always show
            { responsivePriority: 3, targets: 2, className: 'min-tablet' }, // Opponent
            { responsivePriority: 4, targets: 1, className: 'min-tablet' }, // Type
            { responsivePriority: 5, targets: 6, className: 'min-tablet' }, // @20 Gold
            { responsivePriority: 6, targets: 7, className: 'min-tablet' }, // Length
            { responsivePriority: 7, targets: 3, className: 'min-desktop' }, // Comp
            { responsivePriority: 8, targets: 4, className: 'min-desktop' }, // Team Picks
            { responsivePriority: 9, targets: 8, className: 'min-desktop' }  // Reflections
        ]
    });
}

// Google Sheets web app URL — paste your deployed Apps Script Web App URL here
const GOOGLE_SHEETS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwsr20yONluDH3eMCj9yr6OoWTXNjt0RYxandS_xkhIv8uhzZII_lPWdlxHOJQZMvtuzg/exec';

// Fetch data from Google Sheets Apps Script web app
async function fetchSheetData(webAppUrl) {
    try {
        const res = await fetch(webAppUrl);
        if (!res.ok) throw new Error('Fetch failed: ' + res.status);
        const data = await res.json();

        // Map games
        const formatGameLength = (raw) => {
            if (raw === null || raw === undefined || raw === '') return '';

            const formatFromHMS = (hours, minutes, seconds) => {
                if (hours > 0) {
                    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                }
                return `${minutes}:${String(seconds).padStart(2, '0')}`;
            };

            if (typeof raw === 'number' && !Number.isNaN(raw)) {
                const totalSeconds = Math.round(raw * 86400);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                return formatFromHMS(hours, minutes, seconds);
            }

            if (raw instanceof Date && !isNaN(raw)) {
                const hours = raw.getUTCHours();
                const minutes = raw.getUTCMinutes();
                const seconds = raw.getUTCSeconds();
                return formatFromHMS(hours, minutes, seconds);
            }

            const str = String(raw).trim();
            if (!str) return '';
            const timeMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/);
            if (timeMatch) {
                const hours = Number(timeMatch[1] || 0);
                const minutes = Number(timeMatch[2] || 0);
                const seconds = Number(timeMatch[3] || 0);
                return formatFromHMS(hours, minutes, seconds);
            }

            const dateCandidate = new Date(str);
            if (!isNaN(dateCandidate)) {
                const hours = dateCandidate.getUTCHours();
                const minutes = dateCandidate.getUTCMinutes();
                const seconds = dateCandidate.getUTCSeconds();
                return formatFromHMS(hours, minutes, seconds);
            }

            return str;
        };

        if (Array.isArray(data.games) && data.games.length) {
            window.games = data.games
                .filter(g => g.Date || g.date) // Only include rows with dates
                .map(g => {
                    const dateStr = String(g.Date || g.date || '').trim();
                    let formattedDate = dateStr;

                    // Handle DD/MM/YYYY or D/M/YYYY format
                    const parts = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                    if (parts) {
                        const day = parts[1].padStart(2, '0');
                        const month = parts[2].padStart(2, '0');
                        const year = parts[3];
                        formattedDate = `${year}-${month}-${day}`;
                    } else if (dateStr) {
                        // Fallback for ISO format or other formats
                        const dateObj = new Date(dateStr);
                        if (!isNaN(dateObj)) {
                            formattedDate = dateObj.toISOString().split('T')[0];
                        }
                    }

                    return {
                        date: formattedDate,
                        type: g.Type || g.type || '',
                        opponent: (g.Opponent || g.opponent || '').trim(),
                        comp_type: g['Comp Type'] || g.comp_type || g.Comp_Type || '',
                        picks: g['Team Picks'] || g.picks || g.Picks || '',
                        result: g['Result (Win/Loss)'] || g.result || g.Result || '',
                        gold_10: Number(g['Gold Diff @ 10'] || g.gold_10 || g.gold10 || 0),
                        gold_20: Number(g['Gold Diff @ 20'] || g.gold_20 || g.gold20 || 0),
                        gold_30: Number(g['Gold Diff @ 30'] || g.gold_30 || g.gold30 || 0),
                        gold_40: Number(g['Gold Diff @ 40'] || g.gold_40 || g.gold40 || 0),
                        gold_50: Number(g['Gold Diff @ 50'] || g.gold_50 || g.gold50 || 0),
                        length: formatGameLength(g['Game Length'] || g.length || g.Length || '')
                    };
                });

            updateOverviewStats();
            populateGamesTable();
            updateChartValues();
            createLineChart(); // Recreate line chart with new data
            updateAnalytics(); // Update analytics section

            // Hide chart loading and show content
            document.getElementById('chart-loading').style.display = 'none';
            document.getElementById('chart-content').style.display = 'block';
        }

        // Map players from spreadsheet
        if (Array.isArray(data.players) && data.players.length) {
            processPlayerData(data.players);
        }

        // Map player champions from Tourney Prep
        if (data.playerChamps && typeof data.playerChamps === 'object') {
            processPlayerChamps(data.playerChamps);
        }

        // Map champions

        if (Array.isArray(data.champions) && data.champions.length) {
            window.championData = {};
            data.champions.forEach(c => {
                // Handle multiple possible column name variations
                const name = (c.Champion || c.champion || c.champ || c.Name || c.name || c.Champions || '').toString().trim();
                if (!name || name === '') {
                    return;
                }

                // Sheet uses "Role" column, but also check Class variations
                const classes = (c.Role || c.role || c.Class || c.Classes || c.class || c.classes || '').toString().trim();
                window.championData[name] = {
                    classes: classes.split(',').map(s => s.trim()).filter(Boolean),
                    strengths: c.Strengths || c.strengths || c.Strength || '',
                    weaknesses: c.Weaknesses || c.weaknesses || c.Weakness || '',
                    notes: c.Notes || c.notes || ''
                };
            });
            // Update local championData and populate dropdowns
            championData = window.championData;
            populateChampionDropdowns();
            if (typeof updateDraftDisplay === 'function') updateDraftDisplay();
        }

        // Map reflections
        if (Array.isArray(data.reflections) && data.reflections.length) {
            window.reflections = data.reflections.map(r => {
                // Normalize the game date
                const gameDateRaw = r['Game Date'] || r.gameDate || r.game_date || '';
                let gameDate = String(gameDateRaw).trim();

                // Handle ISO date format (2025-10-28T00:00:00.000Z)
                if (gameDate.includes('T')) {
                    gameDate = gameDate.split('T')[0];
                }
                // Handle DD/MM/YYYY or D/M/YYYY format (with optional time at the end)
                else {
                    const parts = gameDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                    if (parts) {
                        const day = parts[1].padStart(2, '0');
                        const month = parts[2].padStart(2, '0');
                        const year = parts[3];
                        gameDate = `${year}-${month}-${day}`;
                    }
                }

                // Find keys dynamically for columns with special characters
                const findValue = (obj, searchTerm) => {
                    const key = Object.keys(obj).find(k => k.toLowerCase().includes(searchTerm.toLowerCase()));
                    return key ? obj[key] : '';
                };

                return {
                    timestamp: r.Timestamp || r.timestamp || '',
                    gameDate: gameDate,
                    opponent: (r.Opponent || r.opponent || '').trim(),
                    commsQuality: r['Comms quality (1-5)'] || r.commsQuality || r.comms_quality || '',
                    whatWorked: findValue(r, 'worked well') || r.whatWorked || '',
                    whatBroke: findValue(r, 'broke down') || r.whatBroke || '',
                    focusNext: findValue(r, 'focus for next') || r.focusNext || '',
                    playerName: r['Player Name / Username'] || r.playerName || r.player_name || '',
                    whatWentWrong: findValue(r, 'went wrong') || r.whatWentWrong || '',
                    role: findValue(r, 'role did you') || r.role || ''
                };
            });
            reflections = window.reflections;

            // Re-populate games table now that reflections are loaded
            populateGamesTable();

            // Update reflection insights
            updateReflectionInsights();

            // Update favoured positions on player cards
            updateFavouredPositions();
        }
    } catch (err) {
        console.error('Error fetching sheet data:', err);
    }
}

// Calculate and display favoured positions from reflections
function updateFavouredPositions() {
    // Map role names to icon files and display names
    const roleMap = {
        'top': { icon: 'Top_icon.png', name: 'Top' },
        'jungle': { icon: 'Jungle_icon.png', name: 'Jungle' },
        'jungler': { icon: 'Jungle_icon.png', name: 'Jungle' },
        'mid': { icon: 'Middle_icon.png', name: 'Mid' },
        'middle': { icon: 'Middle_icon.png', name: 'Mid' },
        'adc': { icon: 'Bottom_icon.png', name: 'ADC' },
        'bot': { icon: 'Bottom_icon.png', name: 'ADC' },
        'bottom': { icon: 'Bottom_icon.png', name: 'ADC' },
        'support': { icon: 'Support_icon.png', name: 'Support' },
        'supp': { icon: 'Support_icon.png', name: 'Support' }
    };

    // Helper to check if a reflection playerName matches a card player
    // Matches: "LC Midas" matches "alex/lc midas", "LC Midas", "Midas", etc.
    const playerMatches = (reflectionPlayer, cardPlayer) => {
        const refLower = reflectionPlayer.toLowerCase();
        const cardLower = cardPlayer.toLowerCase();

        // Extract the name without "LC " prefix
        const cardName = cardLower.replace(/^lc\s+/, '');

        // Check if reflection contains the card name (without LC)
        // This matches "alex/lc midas" containing "midas"
        return refLower.includes(cardName);
    };

    // Count roles per player from reflections
    const playerRoles = {};
    document.querySelectorAll('.lane-icons[data-player]').forEach(container => {
        const cardPlayer = container.dataset.player;
        playerRoles[cardPlayer] = {};

        (window.reflections || []).forEach(r => {
            const refPlayer = r.playerName?.trim();
            const role = r.role?.toLowerCase().trim();
            if (!refPlayer || !role) return;

            if (playerMatches(refPlayer, cardPlayer)) {
                playerRoles[cardPlayer][role] = (playerRoles[cardPlayer][role] || 0) + 1;
            }
        });
    });

    // Update each player card
    document.querySelectorAll('.lane-icons[data-player]').forEach(container => {
        const playerName = container.dataset.player;
        const roles = playerRoles[playerName];

        if (!roles || Object.keys(roles).length === 0) {
            container.innerHTML = '<span class="lanes-empty">No data</span>';
            return;
        }

        // Normalize and combine similar roles
        const normalizedRoles = {};
        Object.entries(roles).forEach(([role, count]) => {
            const mapped = roleMap[role];
            if (mapped) {
                const key = mapped.name;
                normalizedRoles[key] = (normalizedRoles[key] || 0) + count;
            }
        });

        // Get top 2 roles by count
        const top2 = Object.entries(normalizedRoles)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2);

        if (top2.length === 0) {
            container.innerHTML = '<span class="lanes-empty">No data</span>';
            return;
        }

        // Generate icons HTML
        const iconsHtml = top2.map(([roleName, count]) => {
            const roleKey = Object.keys(roleMap).find(k => roleMap[k].name === roleName);
            const icon = roleMap[roleKey]?.icon || '';
            return `<img src="assets/icons/${icon}" alt="${roleName}" title="${roleName} - ${count} games">`;
        }).join('');

        container.innerHTML = iconsHtml;
    });
}

// Populate champion dropdowns
// Populate champion dropdowns from championData
function populateChampionDropdowns() {
    const champNames = Object.keys(championData).sort();
    const draftLoading = document.getElementById('draft-loading');
    const draftContainer = document.getElementById('draft-container');

    // Setup autocomplete for all champion inputs
    const inputs = document.querySelectorAll('.champion-select');

    // Single document click listener for all dropdowns
    document.addEventListener('click', (e) => {
        inputs.forEach(input => {
            const wrapper = input.parentElement;
            const dropdown = wrapper.querySelector('.autocomplete-dropdown');
            if (!wrapper.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
    }, { passive: true });

    inputs.forEach(input => {
        const wrapper = input.parentElement;
        const dropdown = wrapper.querySelector('.autocomplete-dropdown');

        // Show dropdown and filter on input
        input.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();

            if (searchTerm.length === 0) {
                dropdown.classList.remove('show');
                return;
            }

            const matches = champNames
                .filter(name => name.toLowerCase().includes(searchTerm))
                .slice(0, 10);

            if (matches.length > 0) {
                dropdown.innerHTML = matches
                    .map(name => `<div class="autocomplete-item" data-value="${name}">${name}</div>`)
                    .join('');
                dropdown.classList.add('show');
            } else {
                dropdown.classList.remove('show');
            }
        });

        // Handle dropdown item click
        dropdown.addEventListener('click', (e) => {
            if (e.target.classList.contains('autocomplete-item')) {
                input.value = e.target.dataset.value;
                dropdown.classList.remove('show');
                updateDraftDisplay();
            }
        });

        // Close dropdown on blur
        input.addEventListener('blur', () => {
            setTimeout(() => {
                dropdown.classList.remove('show');
            }, 150);
        });
    });

    // Hide loading state and show draft container when champions are loaded
    if (champNames.length > 0) {
        draftLoading.style.display = 'none';
        draftContainer.style.display = 'flex';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    populateChampionDropdowns();
    createLineChart();

    // If user has pasted the deployed web app URL, fetch sheet data
    if (GOOGLE_SHEETS_WEBAPP_URL) {
        fetchSheetData(GOOGLE_SHEETS_WEBAPP_URL);
    }

    // Animate chart bars on load
    setTimeout(() => {
        document.querySelectorAll('.bar-fill').forEach(bar => {
            bar.style.height = bar.dataset.height + '%';
        });
    }, 500);
});
