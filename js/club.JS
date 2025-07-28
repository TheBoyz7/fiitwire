function getTeamForm(fixtures, teamId) {
  return fixtures
    .filter(f => new Date(f.starting_at) < new Date())
    .sort((a, b) => b.starting_at_timestamp - a.starting_at_timestamp)
    .slice(0, 5)
    .map(f => {
      const info = f.result_info?.toLowerCase() || '';
      const homeP = f.participants?.find(p => p.meta?.location === 'home');
      const awayP = f.participants?.find(p => p.meta?.location === 'away');
      if (info.includes('draw')) return 'D';
      const [winnerName] = info.split(' won');
      if (!homeP || !awayP) return '-';
      if (winnerName === homeP.name?.toLowerCase()) return homeP.id == teamId ? 'W' : 'L';
      if (winnerName === awayP.name?.toLowerCase()) return awayP.id == teamId ? 'W' : 'L';
      return '-';
    })
    .join(' ');
}

function getStat(details, typeId) {
  const item = Array.isArray(details) ? details.find(d => d.type_id === typeId) : null;
  return item ? item.value?.total || 0 : 0;
}

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(location.search);
  const teamId = params.get('id');
  if (!teamId) {
    alert('No team ID provided.');
    return;
  }

  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        tabs.forEach(b => b.classList.remove('active'));
        contents.forEach(tab => tab.classList.remove('active'));

        btn.classList.add('active');
        const tabId = btn.dataset.tab;
        const tabContent = document.getElementById(tabId);
        if (!tabContent) {
          console.error(`Tab content with ID ${tabId} not found`);
          return;
        }
        tabContent.classList.add('active');

        if (tabId === 'fixtures' && !tabContent.dataset.loaded) {
          await loadTeamFixtures(teamId);
          tabContent.dataset.loaded = 'true';
        } else if (tabId === 'squad' && !tabContent.dataset.loaded) {
          await loadTeamSquad(teamId);
          tabContent.dataset.loaded = 'true';
        } else if (tabId === 'transfers' && !tabContent.dataset.loaded) {
          await loadTeamTransfers(teamId);
          tabContent.dataset.loaded = 'true';
        } else if (tabId === 'honours' && !tabContent.dataset.loaded) {
          await loadTeamHonours(teamId);
          tabContent.dataset.loaded = 'true';
        }
      } catch (err) {
        console.error('Error in tab switching:', err);
      }
    });
  });

  try {
    await loadClubHeader(teamId);
    await loadOverview(teamId);
    const overviewTab = document.querySelector('.tab-btn[data-tab="overview"]');
    if (overviewTab) {
      overviewTab.click();
    } else {
      console.error('Overview tab button not found');
    }
  } catch (err) {
    console.error('Error loading initial content:', err);
  }
});

async function loadClubHeader(teamId) {
  try {
    const res = await fetch(`http://localhost:3000/api/teams/${teamId}`);
    if (!res.ok) throw new Error('Failed to fetch club info');
    const club = await res.json();

    document.querySelector('.club-logo-banner').src = club.image_path || 'https://cdn.sportmonks.com/images/soccer/placeholder.png';
    document.querySelector('.club-logo-banner').alt = club.name || 'Club Logo';
    document.querySelector('.club-info h2').textContent = club.name || 'Unknown Club';
    document.querySelector('.club-info p').textContent =
      `Founded: ${club.founded || 'N/A'} | Venue: ${club.venue?.name || 'N/A'} | Coach: ${club.coaches?.[0]?.coach?.common_name || 'N/A'}`;
  } catch (err) {
    console.error('Error loading club header:', err);
    document.querySelector('.club-info h2').textContent = 'Error loading club';
    document.querySelector('.club-info p').textContent = '';
  }
}

async function loadOverview(teamId) {
  const overview = document.getElementById('overview');
  overview.innerHTML = '<p>Loading overview...</p>';

  try {
    const now = new Date();
    const past = new Date(now); past.setMonth(past.getMonth() - 2);
    const future = new Date(now); future.setMonth(future.getMonth() + 1);

    const startDate = past.toISOString().split('T')[0];
    const endDate = future.toISOString().split('T')[0];

    const fixturesRes = await fetch(`http://localhost:3000/api/team-schedule/${teamId}`);
    if (!fixturesRes.ok) throw new Error('Failed to fetch fixtures');
    const fixtures = await fixturesRes.json();

    const teamFixtures = fixtures
      .filter(f => f.participants?.some(p => p.id == teamId))
      .sort((a, b) => b.starting_at_timestamp - a.starting_at_timestamp);

    const lastMatch = teamFixtures.find(f => new Date(f.starting_at) < now);
    const nextMatch = [...teamFixtures].reverse().find(f => new Date(f.starting_at) > now);

    let lastMatchDetails = {};
    if (lastMatch?.id) {
      const lastMatchRes = await fetch(`http://localhost:3000/api/fixture/${lastMatch.id}`);
      if (!lastMatchRes.ok) throw new Error('Failed to fetch last match details');
      lastMatchDetails = await lastMatchRes.json();
    }

    const lineups = Array.isArray(lastMatchDetails.lineups) ? lastMatchDetails.lineups : [];
    const startingLineup = lineups
      .filter(p => p.formation_position && p.team_id == teamId)
      .sort((a, b) => (a.formation_position || 0) - (b.formation_position || 0));

    const cardsHtml = `
      <div class="player-cards">
        ${startingLineup.length ? startingLineup.map(p => {
          const player = p.player || {};
          return `
            <a href="player.html?id=${player.id || ''}" class="player-card">
              <img src="${player.image_path || 'https://cdn.sportmonks.com/images/soccer/player-placeholder.png'}" 
                   alt="${player.display_name || 'Unknown'}" class="player-img">
              <div class="player-name">${player.display_name || 'Unknown'}</div>
              <div class="player-pos">${p.position?.name || ''}</div>
            </a>
          `;
        }).join('') : '<p>No lineup data available.</p>'}
      </div>`;

    const nextMatchHtml = nextMatch ? `
      <div class="next-match">
        <div class="next-match-clubs">
          <a href="club.html?id=${nextMatch.participants[0]?.id || ''}">
            <img src="${nextMatch.participants[0]?.image_path || 'https://cdn.sportmonks.com/images/soccer/placeholder.png'}" alt="${nextMatch.participants[0]?.name || 'TBD'}" class="club-logo-small">
          </a>
          <span class="vs">vs</span>
          <a href="club.html?id=${nextMatch.participants[1]?.id || ''}">
            <img src="${nextMatch.participants[1]?.image_path || 'https://cdn.sportmonks.com/images/soccer/placeholder.png'}" alt="${nextMatch.participants[1]?.name || 'TBD'}" class="club-logo-small">
          </a>
        </div>
        <div class="match-date">${new Date(nextMatch.starting_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: '2-digit' })}</div>
        <a href="match.html?matchid=${nextMatch.id}" class="view-match-btn">></a>
      </div>
    ` : '<p>No upcoming match found.</p>';

    const standingsRes = await fetch(`http://localhost:3000/api/standings/${lastMatchDetails.season_id || ''}`);
    const standingsData = standingsRes.ok ? await standingsRes.json() : { data: [] };
    const standings = standingsData.data || [];
    const teamStanding = standings.find(s => s.participant_id == teamId) || {};

    overview.innerHTML = `
      <div class="section"><h3>Recent Form</h3><p>${getTeamForm(teamFixtures, teamId) || '-'}</p></div>
      <div class="section"><h3>Last Starting XI</h3>${cardsHtml}</div>
      <div class="section"><h3>Next Match</h3>${nextMatchHtml}</div>
      <div class="section"><h3>League Position</h3><p>Position: ${teamStanding.position ?? '-'} | Points: ${teamStanding.points ?? '-'}</p></div>
      <div class="section"><h3>Full Table</h3>
        <table class="league-table">
          <thead><tr><th>Pos</th><th>Club</th><th>MP</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead>
          <tbody>
            ${standings.map(t => {
              const w = t.overall?.won ?? getStat(t.details, 'overall-won');
              const d = t.overall?.draw ?? getStat(t.details, 'overall-draw');
              const l = t.overall?.lost ?? getStat(t.details, 'overall-lost');
              const mp = t.overall?.games_played ?? (w + d + l);
              const gf = t.overall?.goals_scored ?? getStat(t.details, 'overall-goals-for');
              const ga = t.overall?.goals_against ?? getStat(t.details, 'overall-goals-against');
              const gd = getStat(t.details, 'goal-difference') || (gf - ga);
              const pts = t.points ?? getStat(t.details, 'overall-points');
              const p = t.participant || {};
              return `
                <tr>
                  <td>${t.position ?? '-'}</td>
                  <td class="club-cell">
                    <a href="club.html?id=${p.id || ''}">
                      <img src="${p.image_path || 'https://cdn.sportmonks.com/images/soccer/placeholder.png'}" class="club-logo-small" alt="${p.name || 'Unknown'}">${p.name || 'Unknown'}
                    </a>
                  </td>
                  <td>${mp}</td><td>${w}</td><td>${d}</td><td>${l}</td><td>${gf}</td><td>${ga}</td><td>${gd}</td><td>${pts}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    console.error('Error loading overview:', err);
    overview.innerHTML = '<p>Error loading overview data. Please try again later.</p>';
  }
}

async function loadTeamFixtures(teamId) {
  const container = document.getElementById('fixtures');
  container.innerHTML = '<p>Loading fixtures...</p>';

  try {
    let upcomingPage = 1;
    let pastPage = 1;
    const perPageUpcoming = 10;
    const perPagePast = 5;
    let upcomingFixtures = [];
    let pastFixtures = [];

    const res = await fetch(`http://localhost:3000/api/team-schedule/${teamId}`);
    if (!res.ok) throw new Error('Failed to fetch team schedule');
    const fixtures = await res.json();

    const now = new Date();
    upcomingFixtures = fixtures
      .filter(f => new Date(f.starting_at) >= now)
      .sort((a, b) => a.starting_at_timestamp - b.starting_at_timestamp);
    pastFixtures = fixtures
      .filter(f => new Date(f.starting_at) < now)
      .sort((a, b) => b.starting_at_timestamp - a.starting_at_timestamp);

    renderFixtures(upcomingFixtures.slice(0, perPageUpcoming), false, false, pastFixtures.length > 0);
    container.dataset.loaded = 'true';

    let isLoading = false;

    const loadPreviousButton = document.getElementById('load-previous-matches');
    if (loadPreviousButton) {
      loadPreviousButton.addEventListener('click', async () => {
        if (isLoading) return;
        isLoading = true;
        loadPreviousButton.textContent = 'Loading...';
        loadPreviousButton.disabled = true;
        await new Promise(resolve => setTimeout(resolve, 500));
        const nextPastFixtures = pastFixtures.slice((pastPage - 1) * perPagePast, pastPage * perPagePast);
        renderFixtures(nextPastFixtures, false, true, pastPage * perPagePast < pastFixtures.length);
        pastPage++;
        loadPreviousButton.textContent = 'Load Previous Matches';
        loadPreviousButton.disabled = false;
        if (pastPage * perPagePast >= pastFixtures.length) {
          loadPreviousButton.style.display = 'none';
        }
        isLoading = false;
      });
    }

    window.addEventListener('scroll', async () => {
      if (isLoading || upcomingPage * perPageUpcoming >= upcomingFixtures.length) return;
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        isLoading = true;
        container.insertAdjacentHTML('beforeend', '<p class="loading">Loading more fixtures...</p>');
        await new Promise(resolve => setTimeout(resolve, 500));
        upcomingPage++;
        const nextUpcomingFixtures = upcomingFixtures.slice((upcomingPage - 1) * perPageUpcoming, upcomingPage * perPageUpcoming);
        renderFixtures(nextUpcomingFixtures, true, false, pastFixtures.length > 0);
        container.querySelector('.loading')?.remove();
        isLoading = false;
      }
    });
  } catch (err) {
    console.error('Failed to load team fixtures:', err);
    container.innerHTML = '<p class="error">Could not load fixtures. Try again later.</p>';
  }
}

function renderFixtures(fixtures, append = false, prepend = false, showLoadPreviousButton = false) {
  const container = document.getElementById('fixtures');
  if (!append && !prepend) {
    container.innerHTML = '';
    if (showLoadPreviousButton) {
      container.insertAdjacentHTML('afterbegin', '<button id="load-previous-matches" class="load-previous-btn">Load Previous Matches</button>');
    }
  }
  if (!fixtures.length && !append && !prepend) {
    container.innerHTML = '<p>No fixtures available.</p>';
    return;
  }

  fixtures.forEach(fixture => {
    const { name, starting_at, starting_at_timestamp, participants = [], leagueName, leagueImagePath, roundName, id, scores = [], result_info } = fixture;
    const home = participants.find(p => p.meta?.location === 'home') || {};
    const away = participants.find(p => p.meta?.location === 'away') || {};
    const now = new Date();
    const matchTime = new Date(starting_at);
    const minutesSinceStart = (now - matchTime) / 1000 / 60;
    let matchStatus = '';
    let scoreDisplay = '';
    if (matchTime > now) {
      matchStatus = matchTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: '2-digit' });
    } else if (minutesSinceStart < 45) {
      matchStatus = `${Math.floor(minutesSinceStart)}'`;
    } else if (minutesSinceStart < 60) {
      matchStatus = 'HT';
    } else if (minutesSinceStart < 90 + 15) {
      matchStatus = `${Math.floor(minutesSinceStart)}'`;
    } else {
      matchStatus = 'FT';
    }
    if (scores.length >= 2 && (minutesSinceStart >= 0 || result_info)) {
      const homeScore = scores.find(s => s.description === 'CURRENT' && s.type_id === 1525 && s.score?.participant === 'home')?.score?.goals || 0;
      const awayScore = scores.find(s => s.description === 'CURRENT' && s.type_id === 1525 && s.score?.participant === 'away')?.score?.goals || 0;
      scoreDisplay = `${homeScore} - ${awayScore}`;
    } else {
      scoreDisplay = '-';
    }
    const html = `
      <div class="fixture-card ${matchTime > now ? 'upcoming-match' : 'past-match'}">
        <div class="fixture-meta">
          <img src="${leagueImagePath || 'https://cdn.sportmonks.com/images/soccer/placeholder.png'}" alt="${leagueName || 'N/A'}" class="club-logo-small" />
          <span class="fixture-league">${leagueName || 'N/A'}</span> • 
          <span class="fixture-round">${roundName || 'N/A'}</span> • 
          <span class="fixture-date">${matchStatus}</span>
        </div>
        <div class="fixture-teams">
          <div class="team">
            <a href="club.html?id=${home.id || ''}">
              <img src="${home.image_path || 'https://cdn.sportmonks.com/images/soccer/placeholder.png'}" alt="${home.name || 'TBD'}" class="club-logo-small" />
              <span>${home.name || 'TBD'}</span>
            </a>
          </div>
          <span class="score">${scoreDisplay}</span>
          <div class="team">
            <a href="club.html?id=${away.id || ''}">
              <img src="${away.image_path || 'https://cdn.sportmonks.com/images/soccer/placeholder.png'}" alt="${away.name || 'TBD'}" class="club-logo-small" />
              <span>${away.name || 'TBD'}</span>
            </a>
          </div>
        </div>
        <a href="match.html?id=${id}" class="view-match-btn">View Match</a>
      </div>
    `;
    container.insertAdjacentHTML(prepend ? 'afterbegin' : 'beforeend', html);
  });
}

async function loadTeamSquad(teamId) {
  const container = document.getElementById('squad');
  container.innerHTML = '<p>Loading squad...</p>';

  try {
    const res = await fetch(`http://localhost:3000/api/squad/${teamId}`);
    if (!res.ok) throw new Error('Failed to fetch team squad');
    const squad = await res.json();

    // Group players by position
    const positionOrder = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
    const groupedSquad = {};
    squad.forEach(member => {
      const position = member.player?.position?.name || 'Unknown';
      if (!groupedSquad[position]) {
        groupedSquad[position] = [];
      }
      groupedSquad[position].push(member);
    });

    // Sort players within each position by jersey number
    Object.keys(groupedSquad).forEach(position => {
      groupedSquad[position].sort((a, b) => (a.jersey_number || 999) - (b.jersey_number || 999));
    });

    // Flatten sorted groups
    const sortedSquad = positionOrder
      .filter(pos => groupedSquad[pos])
      .flatMap(pos => groupedSquad[pos])
      .concat(Object.keys(groupedSquad).filter(pos => !positionOrder.includes(pos)).flatMap(pos => groupedSquad[pos]));

    let page = 1;
    const perPage = 1000;
    let displayedSquad = sortedSquad.slice(0, perPage);

    renderSquad(displayedSquad);
    container.dataset.loaded = 'true';

    let isLoading = false;
    const loadMoreButton = document.getElementById('load-more-squad');
    if (loadMoreButton) {
      loadMoreButton.addEventListener('click', async () => {
        if (isLoading || page * perPage >= sortedSquad.length) return;
        isLoading = true;
        loadMoreButton.textContent = 'Loading...';
        loadMoreButton.disabled = true;
        await new Promise(resolve => setTimeout(resolve, 500));
        page++;
        const nextSquad = sortedSquad.slice((page - 1) * perPage, page * perPage);
        renderSquad(nextSquad);
        loadMoreButton.textContent = 'Load More Players';
        loadMoreButton.disabled = false;
        if (page * perPage >= sortedSquad.length) {
          loadMoreButton.style.display = 'none';
        }
        isLoading = false;
      });
    }
  } catch (err) {
    console.error('Failed to load team squad:', err);
    container.innerHTML = '<p class="error">Could not load squad. Try again later.</p>';
  }
}

function renderSquad(squad) {
  const container = document.getElementById('squad');
  container.innerHTML = '';

  if (!squad.length) {
    container.innerHTML = '<p>No squad members available.</p>';
    return;
  }

  const tableHeader = `
    <table class="squad-table">
      <thead>
        <tr>
          <th>Player</th>
          <th>Jersey</th>
          <th>Nationality</th>
          <th>Apps</th>
          <th class="hide-mobile">Mins</th>
          <th>CS</th>
          <th>Goals</th>
          <th>Assists</th>
          <th class="hide-mobile">Yellows</th>
          <th>Reds</th>
        </tr>
      </thead>
      <tbody>
  `;

  let rows = '';

  squad.forEach(member => {
    const player = member.player || {};
    const nationality = player.nationality || {};
    const position = player.position?.name || 'Unknown';
    const jerseyNumber = member.jersey_number || '-';
    const stats = player.statistics?.[0]?.details || [];
    const goals = getStat(stats, 52);
    const assists = getStat(stats, 79);
    const yellowCards = getStat(stats, 84);
    const redCards = getStat(stats, 83);
    const appearances = getStat(stats, 321);
    const minutesPlayed = getStat(stats, 119);
    const cleansheets = getStat(stats, 194);

    rows += `
      <tr>
        <td class="player-cell">
          <a href="player.html?id=${player.id || ''}" class="player-link">
            <img src="${player.image_path || 'https://cdn.sportmonks.com/images/soccer/player-placeholder.png'}" alt="${player.display_name || 'Unknown'}" class="player-img">
            <div class="player-info">
              <span class="player-name">${player.display_name || 'Unknown'}</span>
              <span class="player-position">${position}</span>
            </div>
          </a>
        </td>
        <td>${jerseyNumber}</td>
        <td class="nationality-cell">
          <img src="${nationality.image_path || 'https://cdn.sportmonks.com/images/soccer/placeholder.png'}" alt="${nationality.name || 'N/A'}" class="flag-img">
          <span class="nationality-name">${nationality.name || 'N/A'}</span>
        </td>
        <td>${appearances}</td>
        <td class="hide-mobile">${minutesPlayed}</td>
        <td>${cleansheets}</td>
        <td>${goals}</td>
        <td>${assists}</td>
        <td class="hide-mobile">${yellowCards}</td>
        <td class="red-card">${redCards}</td>
      </tr>
    `;
  });

  const tableFooter = `
      </tbody>
    </table>
  `;

  container.innerHTML = tableHeader + rows + tableFooter;
}

async function loadTeamTransfers(teamId) {
  const container = document.getElementById('transfers');
  container.innerHTML = '<p>Loading transfers...</p>';

  try {
    let page = 1;
    const perPage = 50;
    const order = 'desc';

    const res = await fetch(`http://localhost:3000/api/transfers/${teamId}?page=${page}&per_page=${perPage}&order=${order}`);
    if (!res.ok) throw new Error('Failed to fetch team transfers');
    const transferData = await res.json();
    const transfers = Array.isArray(transferData.data) ? transferData.data : [];

    renderTransfers(transfers, false, transferData.meta?.pagination?.total_pages > page);
    container.dataset.loaded = 'true';

    let isLoading = false;
    window.addEventListener('scroll', async () => {
      if (isLoading || page >= transferData.meta?.pagination?.total_pages) return;
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        isLoading = true;
        container.insertAdjacentHTML('beforeend', '<p class="loading">Loading more transfers...</p>');
        await new Promise(resolve => setTimeout(resolve, 500));
        page++;
        try {
          const nextRes = await fetch(`http://localhost:3000/api/transfers/${teamId}?page=${page}&per_page=${perPage}&order=${order}`);
          if (!nextRes.ok) throw new Error('Failed to fetch more transfers');
          const nextData = await nextRes.json();
          const nextTransfers = Array.isArray(nextData.data) ? nextData.data : [];
          renderTransfers(nextTransfers, true, nextData.meta?.pagination?.total_pages > page);
          container.querySelector('.loading')?.remove();
        } catch (err) {
          console.error('Failed to load more transfers:', err);
          container.querySelector('.loading')?.remove();
          container.insertAdjacentHTML('beforeend', '<p class="error">Could not load more transfers.</p>');
        }
        isLoading = false;
      }
    });
  } catch (err) {
    console.error('Failed to load team transfers:', err);
    container.innerHTML = '<p class="error">Could not load transfers. Try again later.</p>';
  }
}

function renderTransfers(transfers, append = false, hasMore = false) {
  const container = document.getElementById('transfers');
  if (!append) {
    container.innerHTML = `
      <div class="transfers-table-wrapper">
        <table class="transfers-table">
          <thead>
            <tr>
              <th class="fixed-player">Player</th>
              <th>Type</th>
              <th>From</th>
              <th>To</th>
              <th>Position</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    `;
  }
  if (!transfers.length && !append) {
    container.querySelector('tbody').innerHTML = '<tr><td colspan="6">No transfers available.</td></tr>';
    return;
  }

  const tbody = container.querySelector('tbody');
  let rows = '';
  transfers.forEach(transfer => {
    const player = transfer.player || {};
    const type = transfer.type?.name || 'Unknown';
    const fromTeam = transfer.fromteam || {};
    const toTeam = transfer.toteam || {};
    const position = transfer.detailedposition?.name || transfer.position?.name || 'Footballer';
    const transferDate = transfer.date ? new Date(transfer.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: '2-digit' }) : 'N/A';

    rows += `
      <tr>
        <td class="player-cell fixed-player">
          <a href="player.html?id=${player.id || ''}" class="player-link">
            <img src="${player.image_path || 'https://cdn.sportmonks.com/images/soccer/player-placeholder.png'}" alt="${player.display_name || 'Unknown'}" class="player-img">
            <span class="player-name">${player.display_name || 'Unknown'}</span>
          </a>
        </td>
        <td>${type}</td>
        <td class="club-cell">
          <a href="club.html?id=${fromTeam.id || ''}">
            <img src="${fromTeam.image_path || 'https://cdn.sportmonks.com/images/soccer/placeholder.png'}" alt="${fromTeam.name || 'N/A'}" class="club-logo-small">
            <span>${fromTeam.name || 'N/A'}</span>
          </a>
        </td>
        <td class="club-cell">
          <a href="club.html?id=${toTeam.id || ''}">
            <img src="${toTeam.image_path || 'https://cdn.sportmonks.com/images/soccer/placeholder.png'}" alt="${toTeam.name || 'N/A'}" class="club-logo-small">
            <span>${toTeam.name || 'N/A'}</span>
          </a>
        </td>
        <td>${position}</td>
        <td>${transferDate}</td>
      </tr>
    `;
  });

  tbody.insertAdjacentHTML('beforeend', rows);

  if (hasMore) {
    if (!container.querySelector('#load-more-transfers')) {
      container.insertAdjacentHTML('beforeend', '<button id="load-more-transfers" class="load-more-btn">Load More Transfers</button>');
      const loadMoreButton = document.getElementById('load-more-transfers');
      loadMoreButton.addEventListener('click', async () => {
        loadMoreButton.textContent = 'Loading...';
        loadMoreButton.disabled = true;
        await new Promise(resolve => setTimeout(resolve, 500));
        window.dispatchEvent(new Event('scroll'));
        loadMoreButton.textContent = 'Load More Transfers';
        loadMoreButton.disabled = false;
      });
    }
  } else {
    const loadMoreButton = container.querySelector('#load-more-transfers');
    if (loadMoreButton) {
      loadMoreButton.remove();
    }
  }
}

async function loadTeamHonours(teamId) {
  const container = document.getElementById('honours');
  container.innerHTML = '<p>Loading honours...</p>';

  try {
    const res = await fetch(`http://localhost:3000/api/teams/${teamId}`);
    if (!res.ok) throw new Error('Failed to fetch team honours');
    const teamData = await res.json();
    const trophies = Array.isArray(teamData.trophies) ? teamData.trophies : [];

    renderHonours(trophies);
    container.dataset.loaded = 'true';
  } catch (err) {
    console.error('Failed to load team honours:', err);
    container.innerHTML = '<p class="error">Could not load honours. Try again later.</p>';
  }
}

function renderHonours(trophies) {
  const container = document.getElementById('honours');

  // Count "Winner" trophies by league and "Runner-up" trophies
  const winnerCounts = trophies
    .filter(t => t.trophy?.name === 'Winner')
    .reduce((acc, trophy) => {
      const leagueName = trophy.league?.name || 'Other Competitions';
      const leagueImage = trophy.league?.image_path || 'https://cdn.sportmonks.com/images/soccer/placeholder.png';
      if (!acc[leagueName]) {
        acc[leagueName] = { count: 0, image: leagueImage };
      }
      acc[leagueName].count += 1;
      return acc;
    }, {});
  
  const runnerUpCount = trophies.filter(t => t.trophy?.name === 'Runner-up').length;

  // Generate trophy cards HTML
  const trophyCardsHtml = `
    <div class="trophy-cards">
      ${Object.entries(winnerCounts).length || runnerUpCount ? `
        ${Object.entries(winnerCounts).map(([leagueName, { count, image }]) => `
          <div class="trophy-card">
            <img src="${image}" alt="${leagueName}" class="trophy-img">
            <div class="trophy-name">${leagueName}</div>
            <div class="trophy-count">Won ${count} ${count === 1 ? 'time' : 'times'}</div>
          </div>
        `).join('')}
        ${runnerUpCount ? `
          <div class="trophy-card">
            <i class="fas fa-wine-bottle trophy-icon"></i>
            <div class="trophy-name">Runner-up</div>
            <div class="trophy-count">${runnerUpCount} ${runnerUpCount === 1 ? 'time' : 'times'}</div>
          </div>
        ` : ''}
      ` : '<p>No relevant trophies available.</p>'}
    </div>
  `;

  // Table HTML
  container.innerHTML = `
    ${trophyCardsHtml}
    <div class="honours-table-wrapper">
      <table class="honours-table">
        <thead>
          <tr>
            <th class="fixed-trophy">Trophy</th>
            <th>League</th>
            <th>Season</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  if (!trophies.length) {
    container.querySelector('tbody').innerHTML = '<tr><td colspan="3">No honours available.</td></tr>';
    return;
  }

  const tbody = container.querySelector('tbody');
  let rows = '';
  trophies.forEach(trophy => {
    const trophyName = trophy.trophy?.name || 'Unknown';
    const leagueName = trophy.league?.name || 'Unknown League';
    const leagueImage = trophy.league?.image_path || 'https://cdn.sportmonks.com/images/soccer/placeholder.png';
    const seasonName = trophy.season?.name || 'Unknown Season';

    rows += `
      <tr>
        <td class="trophy-cell fixed-trophy">
          ${trophyName}
        </td>
        <td class="league-cell">
          <img src="${leagueImage}" alt="${leagueName}" class="league-img">
          <span>${leagueName}</span>
        </td>
        <td>${seasonName}</td>
      </tr>
    `;
  });

  tbody.innerHTML = rows;
}