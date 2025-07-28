const baseURL = 'http://localhost:3000/api';

const fetchStat = async (endpoint) => {
  try {
    const res = await fetch(`${baseURL}${endpoint}`);
    const data = await res.json();
    return Array.isArray(data) ? data : data.data || [];
  } catch (err) {
    console.error('❌ Error fetching:', endpoint, err);
    return [];
  }
};

const renderPlayerList = (selector, items, valueLabel = '') => {
  const list = document.querySelector(selector);
  list.innerHTML = '';

  items.forEach(item => {
    const playerName = item.player?.display_name || 'Unknown';
    const playerImg = item.player?.image_path || 'https://via.placeholder.com/32';
    const teamName = item.participant?.name || 'Unknown Team';
    const teamImg = item.participant?.image_path || 'https://via.placeholder.com/32';
    const value = item.total ?? 0;

    const li = document.createElement('li');
    li.innerHTML = `
      <div class="info">
        <img src="${playerImg}" alt="${playerName}">
        <strong>${playerName}</strong>
        <small>(${teamName})</small>
        <img src="${teamImg}" alt="${teamName}" style="width:24px;height:24px;">
      </div>
      <span><strong>${value}</strong> ${valueLabel}</span>
    `;
    list.appendChild(li);
  });
};

const renderTeamList = (selector, teams, label = '') => {
  const list = document.querySelector(selector);
  list.innerHTML = '';

  teams
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .forEach(team => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="info">
          <img src="${team.image}" alt="${team.name}">
          <strong>${team.name}</strong>
        </div>
        <span><strong>${team.total}</strong> ${label}</span>
      `;
      list.appendChild(li);
    });
};

const loadAllStats = async (seasonId) => {
  if (!seasonId) {
    console.error('🚫 No seasonId provided.');
    return;
  }

  const [
    topScorers,
    topAssisters,
    redCards,
    yellowCards,
    teamGoals,
    teamCleansheets
  ] = await Promise.all([
    fetchStat(`/topscorers/${seasonId}?filters=seasonTopscorerTypes:208`),
    fetchStat(`/topassists/${seasonId}`),
    fetchStat(`/redcards/${seasonId}`),
    fetchStat(`/yellowcards/${seasonId}`),
    fetchStat(`/teamstats/goals/${seasonId}`),
    fetchStat(`/teamstats/cleansheets/${seasonId}`)
  ]);

  renderPlayerList('#top-goals', topScorers.slice(0, 5), 'goals');
  renderPlayerList('#top-assists', topAssisters.slice(0, 5), 'assists');
  renderPlayerList('#top-reds', redCards.slice(0, 5), 'reds');
  renderPlayerList('#top-yellows', yellowCards.slice(0, 5), 'yellows');
  renderTeamList('#team-goals', teamGoals, 'goals');
  renderTeamList('#team-cleansheets', teamCleansheets, 'clean sheets');
};

// Option 1: From global window (set in main HTML)
if (window.seasonId) {
  loadAllStats(window.seasonId);

// Option 2: From <body data-season="12345">
} else if (document.body.dataset.season) {
  loadAllStats(document.body.dataset.season);

// Option 3: From URL query param ?season=12345
} else {
  const params = new URLSearchParams(window.location.search);
  const seasonIdFromURL = params.get('season');
  loadAllStats(seasonIdFromURL);
}
