function getStat(details, typeId) {
  const item = Array.isArray(details) ? details.find(d => d.type_id === typeId) : null;
  return item ? item.value?.total || 0 : 0;
}

function calculateAge(dob) {
  const birthDate = new Date(dob);
  const today = new Date('2025-07-28T09:16:00Z'); // Current date and time in WAT
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(location.search);
  const playerId = params.get('id');
  if (!playerId) {
    alert('No player ID provided.');
    return;
  }

  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      contents.forEach(tab => tab.classList.add('hidden'));
      
      btn.classList.add('active');
      const tabId = btn.dataset.tab;
      document.getElementById(tabId).classList.remove('hidden');

      if (tabId === 'trophies' && !document.getElementById('trophies').dataset.loaded) {
        loadTrophies(playerId);
      } else if (tabId === 'statistics' && !document.getElementById('statistics').dataset.loaded) {
        loadStatistics(playerId);
      } else if (tabId === 'fixtures' && !document.getElementById('fixtures').dataset.loaded) {
        loadFixtures(playerId);
      } else if (tabId === 'overview' && !document.getElementById('overview').dataset.loaded) {
        loadOverview(playerId);
      }
    });
  });

  // Initial load for all tabs
  try {
    await Promise.all([
      loadPlayerHeader(playerId),
      loadOverview(playerId),
      loadTrophies(playerId),
      loadStatistics(playerId),
      loadFixtures(playerId)
    ]);
    document.querySelector('.tab-btn[data-tab="overview"]').click();
  } catch (err) {
    console.error('Error loading initial content:', err);
  }
});

async function loadPlayerHeader(playerId) {
  try {
    const res = await fetch(`http://localhost:3000/api/player/${playerId}`);
    if (!res.ok) throw new Error('Failed to fetch player info');
    const player = await res.json();

    // Separate national and club teams
    const clubTeam = player.teams?.find(t => t.team?.type === 'domestic');
    const nationalTeam = player.teams?.find(t => t.team?.type === 'national');

    // DOM Updates
    document.getElementById('player-image').src = player.image_path || 'https://cdn.sportmonks.com/images/soccer/player-placeholder.png';
    document.getElementById('player-image').alt = player.display_name || 'Player';
    document.getElementById('player-name').textContent = player.display_name || 'Unknown Player';

    document.getElementById('player-details').textContent = 
      `Position: ${player.detailedposition?.name || player.position?.name || 'N/A'} | ` +
      `Age: ${player.date_of_birth ? calculateAge(player.date_of_birth) : 'N/A'} | ` +
      `Height: ${player.height || 'N/A'}cm | Weight: ${player.weight || '-'}kg`;

    document.getElementById('player-team').textContent = 
      `Club: ${clubTeam?.team?.name || 'N/A'}`;

    document.getElementById('player-nationality').textContent = 
      `National Team: ${nationalTeam?.team?.name || player.nationality?.name || 'N/A'}`;

  } catch (err) {
    console.error('Error loading player header:', err);
    document.getElementById('player-name').textContent = 'Error loading player';
  }
}


async function loadOverview(playerId) {
  const overview = document.getElementById('overview');
  overview.innerHTML = '<p class="loading">Loading overview...</p>';

  try {
    const res = await fetch(`http://localhost:3000/api/player/${playerId}`);
    if (!res.ok) throw new Error('Failed to fetch player data');
    const player = await res.json();

    const latestFixtures = Array.isArray(player.latest) ? player.latest.map(l => l.fixture).filter(f => f) : [];
    const currentSeasonStats = player.statistics?.find(s => s.season?.is_current) || {};
    const stats = Array.isArray(currentSeasonStats.details) ? currentSeasonStats.details : [];

    // Get ratings for the last 5 fixtures from latest details
    const ratings = latestFixtures
      .filter(f => f && f.id)
      .sort((a, b) => (b.starting_at_timestamp || 0) - (a.starting_at_timestamp || 0))
      .slice(0, 5)
      .map(f => {
        const lineup = player.latest.find(l => l.fixture_id === f.id);
        const ratingDetail = lineup?.details?.find(d => d.type_id === 118);
        return ratingDetail?.data?.value || '-';
      });

    const statsHtml = `
      <div class="stats-cards">
        <div class="stat-card">
          <h3>Goals</h3>
          <p class="stat-value">${getStat(stats, 52)}</p>
        </div>
        <div class="stat-card">
          <h3>Assists</h3>
          <p class="stat-value">${getStat(stats, 79)}</p>
        </div>
        <div class="stat-card">
          <h3>Apps</h3>
          <p class="stat-value">${getStat(stats, 321)}</p>
        </div>
        <div class="stat-card">
          <h3>Yellows</h3>
          <p class="stat-value">${getStat(stats, 84)}</p>
        </div>
        <div class="stat-card">
          <h3>Clean Sheets</h3>
          <p class="stat-value">${getStat(stats, 194)}</p>
        </div>
      </div>
    `;

    const latestMatch = latestFixtures[0] || {};
    const latestMatchHtml = latestMatch.id ? `
      <div class="section">
        <h3>Latest Match</h3>
        <div class="fixture-card">
          <div class="fixture-meta">
            <img src="${latestMatch.league?.image_path || 'https://cdn.sportmonks.com/images/soccer/placeholder.png'}" alt="${latestMatch.league?.name || 'N/A'}" class="league-img" />
            <span>${latestMatch.league?.name || 'N/A'}</span> • <span>${new Date(latestMatch.starting_at || Date.now()).toLocaleDateString('en-GB')}</span> • <span>Rating: ${player.latest.find(l => l.fixture_id === latestMatch.id)?.details?.find(d => d.type_id === 118)?.data?.value || 'N/A'}</span>
          </div>
          <div class="flex-row">
            <div class="team text-left">
              <a href="club.html?id=${latestMatch.participants?.[0]?.id || ''}">
                <img src="${latestMatch.participants?.[0]?.image_path || 'https://cdn.sportmonks.com/images/soccer/placeholder.png'}" alt="${latestMatch.participants?.[0]?.name || 'TBD'}" class="league-img" />
                ${latestMatch.participants?.[0]?.name || 'TBD'}
              </a>
            </div>
            <span class="score">${getScoreDisplay(latestMatch.scores)}</span>
            <div class="team text-right">
              <a href="club.html?id=${latestMatch.participants?.[1]?.id || ''}">
                ${latestMatch.participants?.[1]?.name || 'TBD'}
                <img src="${latestMatch.participants?.[1]?.image_path || 'https://cdn.sportmonks.com/images/soccer/placeholder.png'}" alt="${latestMatch.participants?.[1]?.name || 'TBD'}" class="league-img" />
              </a>
            </div>
          </div>
          <a href="match.html?id=${latestMatch.id}" class="view-match-btn">View Match</a>
        </div>
      </div>
    ` : '<p>No recent matches found.</p>';

    overview.innerHTML = `
      ${statsHtml}
      <div class="section">
        <h3>Recent Form</h3>
        <p>${ratings.length ? ratings.join(', ') : 'No ratings available'}</p>
      </div>
      ${latestMatchHtml}
    `;
    overview.dataset.loaded = 'true';
  } catch (err) {
    console.error('Error loading overview:', err);
    overview.innerHTML = '<p class="error">Error loading overview data.</p>';
  }
}

function getScoreDisplay(scores) {
  if (!Array.isArray(scores) || scores.length < 2) return '-';
  const homeScore = scores.find(s => s.description === 'CURRENT' && s.score?.participant === 'home')?.score?.goals || 0;
  const awayScore = scores.find(s => s.description === 'CURRENT' && s.score?.participant === 'away')?.score?.goals || 0;
  return `${homeScore} - ${awayScore}`;
}

async function loadTrophies(playerId) {
  const container = document.getElementById('trophies');
  container.innerHTML = '<p class="loading">Loading trophies...</p>';

  try {
    const res = await fetch(`http://localhost:3000/api/player/${playerId}`);
    if (!res.ok) throw new Error('Failed to fetch player data');
    const player = await res.json();
    const trophies = Array.isArray(player.trophies) ? player.trophies : [];

    // 🧠 Sort trophies by ending date or fallback to season name
    trophies.sort((a, b) => {
      const dateA = new Date(a.season?.ending_at || a.season?.name || '1900');
      const dateB = new Date(b.season?.ending_at || b.season?.name || '1900');
      return dateB - dateA; // Newest first
    });

    container.innerHTML = `
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Trophy</th>
              <th>League</th>
              <th>Season</th>
              <th>Team</th>
            </tr>
          </thead>
          <tbody>
            ${trophies.length ? trophies.map(trophy => `
              <tr>
                <td>${trophy.trophy?.name || 'Unknown'}</td>
                <td class="league-cell">
                  <img src="${trophy.league?.image_path || 'https://cdn.sportmonks.com/images/soccer/placeholder.png'}" alt="${trophy.league?.name || 'N/A'}" class="league-img">
                  ${trophy.league?.name || 'Trophy'}
                </td>
                <td>${trophy.season?.name || 'This Century'}</td>
                <td>${trophy.team?.name || 'Club'}</td>
              </tr>
            `).join('') : '<tr><td colspan="4">No trophies available.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
    container.dataset.loaded = 'true';
  } catch (err) {
    console.error('Error loading trophies:', err);
    container.innerHTML = '<p class="error">Could not load trophies.</p>';
  }
}


async function loadStatistics(playerId) {
  const container = document.getElementById('statistics');
  container.innerHTML = '<p class="loading">Loading statistics...</p>';

  try {
    const res = await fetch(`http://localhost:3000/api/player/${playerId}`);
    if (!res.ok) throw new Error('Failed to fetch player data');
    const player = await res.json();
    const statistics = Array.isArray(player.statistics) ? player.statistics : [];

    // Sort seasons by ending_at in descending order
    statistics.sort((a, b) => new Date(b.season?.ending_at) - new Date(a.season?.ending_at));

    const seasonOptions = statistics.map(stat => 
      `<option value="${stat.season_id}">${stat.season?.name || 'Unknown'}</option>`
    ).join('');

    const defaultSeasonId = statistics[0]?.season_id || null;

    container.innerHTML = `
      <div class="season-selector">
        <label for="season-dropdown">Select Season: </label>
        <select id="season-dropdown" onchange="updateStats(${playerId}, this.value)">
          ${seasonOptions}
        </select>
      </div>
      <div id="stats-cards"></div>
      <canvas id="chart-canvas" width="400" height="200" style="width: 100%; height: 200px;"></canvas>
    `;

    updateStats(playerId, defaultSeasonId);
    container.dataset.loaded = 'true';
  } catch (err) {
    console.error('Error loading statistics:', err);
    container.innerHTML = '<p class="error">Could not load statistics.</p>';
  }
}

function updateStats(playerId, seasonId = null) {
  fetch(`http://localhost:3000/api/player/${playerId}`)
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch player data');
      return res.json();
    })
    .then(player => {
      const statistics = Array.isArray(player.statistics) ? player.statistics : [];
      const selectedStat = statistics.find(s => String(s.season_id) === String(seasonId)) || statistics[0] || {};
      const details = selectedStat.details || [];

      const statsCards = document.getElementById('stats-cards');
      statsCards.innerHTML = `
        <div class="stats-cards">
          ${Object.entries({
            'Goals': 52,
            'Assists': 79,
            'Appearances': 321,
            'Yellowcards': 84,
            'Reds': 83,
            'Clean Sheets': 194,
            'Minutes Played': 119,
            'Touches': 120,
            'Duels Lost': 1491,
            'Dribble Attempts': 108
          }).map(([name, typeId]) => `
            <div class="stat-card">
              <h3>${name}</h3>
              <p class="stat-value">${getStat(details, typeId)}</p>
            </div>
          `).join('')}
        </div>
      `;

      // Simple Line Chart Rendering
      const canvas = document.getElementById('chart-canvas');
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();

      const goalsData = statistics.map((s, i) => ({
        x: i * 50,
        y: 100 - getStat(s.details, 52) * 10
      }));

      goalsData.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });

      ctx.stroke();
    })
    .catch(err => console.error('Error updating stats:', err));
}

function getStat(details, typeId) {
  const item = Array.isArray(details) ? details.find(d => d.type_id === typeId) : null;
  return item ? item.value?.total || 0 : 0;
}


async function loadFixtures(playerId) {
  const container = document.getElementById('fixtures');
  container.innerHTML = '<p class="loading">Loading fixtures...</p>';

  try {
    const res = await fetch(`http://localhost:3000/api/player/${playerId}`);
    if (!res.ok) throw new Error(`Failed to fetch player data: ${res.status}`);
    const player = await res.json();
    const fixtures = Array.isArray(player.latest) ? player.latest.map(l => l.fixture).filter(f => f && f.id) : [];

    if (!fixtures.length) {
      container.innerHTML = '<p>No fixtures available.</p>';
      container.dataset.loaded = 'true';
      return;
    }

    container.innerHTML = fixtures.map(fixture => {
      const lineup = player.latest.find(l => l.fixture_id === fixture.id);
      const rating = lineup?.details?.find(d => d.type_id === 118)?.data?.value || 'N/A';
      const home = fixture.participants?.find(p => p.meta?.location === 'home') || {};
      const away = fixture.participants?.find(p => p.meta?.location === 'away') || {};
      const now = new Date();
      const matchTime = fixture.starting_at ? new Date(fixture.starting_at) : new Date();
      const minutesSinceStart = (now - matchTime) / 1000 / 60;
      let matchStatus = '';
      let scoreDisplay = getScoreDisplay(fixture.scores || []);

      if (matchTime > now) {
        matchStatus = matchTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: '2-digit' });
      } else if (minutesSinceStart < 45) {
        matchStatus = `${Math.floor(minutesSinceStart)}'`;
      } else if (minutesSinceStart < 60) {
        matchStatus = 'HT';
      } else if (minutesSinceStart < 105) {
        matchStatus = `${Math.floor(minutesSinceStart)}'`;
      } else {
        matchStatus = 'FT';
      }

      return `
        <div class="fixture-card ${matchTime > now ? 'upcoming-match' : 'past-match'}">
          <div class="fixture-meta">
            <img src="${fixture.league?.image_path || 'https://cdn.sportmonks.com/images/soccer/placeholder.png'}" alt="${fixture.league?.name || 'N/A'}" class="league-img" />
            <span>${fixture.league?.name || 'N/A'}</span> • <span>${matchStatus}</span> • <span>Rating: ${rating}</span>
          </div>
          <div class="flex-row">
            <div class="team text-left">
              <a href="club.html?id=${home.id || ''}">
                <img src="${home.image_path || 'https://cdn.sportmonks.com/images/soccer/placeholder.png'}" alt="${home.name || 'TBD'}" class="league-img" />
                ${home.name || 'TBD'}
              </a>
            </div>
            <span class="score">${scoreDisplay}</span>
            <div class="team text-right">
              <a href="club.html?id=${away.id || ''}">
                ${away.name || 'TBD'}
                <img src="${away.image_path || 'https://cdn.sportmonks.com/images/soccer/placeholder.png'}" alt="${away.name || 'TBD'}" class="league-img" />
              </a>
            </div>
          </div>
          <a href="match.html?id=${fixture.id || ''}" class="view-match-btn">View Match</a>
        </div>
      `;
    }).join('');
    container.dataset.loaded = 'true';
  } catch (err) {
    console.error('Error loading fixtures:', err);
    container.innerHTML = '<p class="error">Could not load fixtures: ' + err.message + '</p>';
    container.dataset.loaded = 'true';
  }
}