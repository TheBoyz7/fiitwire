document.addEventListener('DOMContentLoaded', async () => {
  console.log('Script loaded and DOM ready');

  const urlParams = new URLSearchParams(window.location.search);
  const leagueNumId = urlParams.get('id');
  let selectedLeague = null;

  // Fetch league data from API with fallback to local data
  try {
    const response = await fetch('http://localhost:3000/api/leagues?per_page=50');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const leagues = await response.json();
    selectedLeague = leagues.find(l => l.id.toString() === leagueNumId) || leagues[0];
    console.log('Fetched leagues:', leagues);
  } catch (err) {
    console.error('Error fetching leagues, using local fallback:', err);
    const localLeagues = [
      { id: 271, name: 'Premier League', logo: '/SportsWire/images/premier-league-logo-5F922E3/premier-league-logo.png', description: 'England’s top-flight competition featuring 20 clubs battling for glory.', seasonId: '23690', league_id: '271' },
    ];
    selectedLeague = localLeagues.find(l => l.id.toString() === leagueNumId) || localLeagues[0];
  }

  if (!selectedLeague) {
    const leagueInfoH2 = document.querySelector('.league-info h2');
    const leagueDesc = document.querySelector('.league-description');
    if (leagueInfoH2 && leagueDesc) {
      leagueInfoH2.textContent = 'Error Loading League';
      leagueDesc.textContent = 'Failed to load league data.';
    } else {
      console.error('Could not find .league-info h2 or .league-description');
    }
    return;
  }

  document.title = `SportsWire | ${selectedLeague.name} Overview`;
  const siteHeaderH1 = document.querySelector('.site-header h1');
  const leagueLogo = document.querySelector('.league-logo');
  const leagueInfoH2 = document.querySelector('.league-info h2');
  const leagueDesc = document.querySelector('.league-description');
  if (siteHeaderH1 && leagueLogo && leagueInfoH2 && leagueDesc) {
    siteHeaderH1.textContent = `SportsWire ⚽ ${selectedLeague.name}`;
    leagueLogo.src = selectedLeague.logo || selectedLeague.image_path || 'https://via.placeholder.com/48';
    leagueLogo.alt = `${selectedLeague.name} Logo`;
    leagueInfoH2.textContent = selectedLeague.name;
    leagueDesc.textContent = selectedLeague.description || 'No description available';
  } else {
    console.error('Missing one or more header elements:', { siteHeaderH1, leagueLogo, leagueInfoH2, leagueDesc });
  }

  const leagueId = selectedLeague.league_id || selectedLeague.id;
  const seasonId = selectedLeague.seasonId || selectedLeague.current_season_id;

  // TAB SWITCHING
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  if (tabButtons.length > 0 && tabContents.length > 0) {
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const tabContent = document.getElementById(btn.dataset.tab);
        if (tabContent) {
          tabContent.classList.add('active');
          btn.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        } else {
          console.error(`Tab content not found for ${btn.dataset.tab}`);
        }
      });
    });
  } else {
    console.error('Tab buttons or contents not found:', { tabButtons, tabContents });
  }

  // VIDEO
  const overviewVideoContainer = document.querySelector('#overview .video-container');
  if (overviewVideoContainer) {
    const fallbackVideoURL = 'https://www.youtube.com/embed/https://youtu.be/XYoMhLSd3Ww?si=e_AmEjPWuONVtwQd';
    overviewVideoContainer.innerHTML = `
      <iframe src="${fallbackVideoURL}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    `;
  } else {
    console.error('Video container not found');
  }

  // FIXTURES PREVIEW
  const fixturesPreview = document.querySelector('.fixtures-preview');
  if (fixturesPreview) {
    const startDate = new Date().toISOString().split('T')[0]; // 08:59 AM WAT, 29 Jul 2025
    const endDate = new Date(new Date().setDate(new Date().getDate() + 90)).toISOString().split('T')[0];
    try {
      const fixturesResponse = await fetch(`http://localhost:3000/api/fixtures?startDate=${startDate}&endDate=${endDate}`);
      if (fixturesResponse.ok) {
        const fixtures = await fixturesResponse.json();
        console.log('Fixtures data:', fixtures);
        const filtered = fixtures.filter(f => f.league?.id == leagueId && new Date(f.starting_at) > new Date());
        const latest3 = filtered.slice(0, 3);
        if (latest3.length > 0) {
          fixturesPreview.innerHTML = '';
          latest3.forEach(fx => {
            const participants = fx.participants || [];
            const home = participants.find(p => p.meta?.location === 'home') || participants[0] || {};
            const away = participants.find(p => p.meta?.location === 'away') || participants[1] || {};
            const homeName = home.name || 'TBD';
            const awayName = away.name || 'TBD';
            const homeLogo = home.image_path || '';
            const awayLogo = away.image_path || '';
            const kickoff = new Date(fx.starting_at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            const a = document.createElement('a');
            a.href = `match.html?id=${fx.id}`;
            a.className = 'fixture-item';
            a.innerHTML = `
              <img src="${homeLogo}" alt="${homeName} logo" class="fixture-logo">
              <span class="fixture-text">${homeName} vs ${awayName} — ${kickoff}</span>
              <img src="${awayLogo}" alt="${awayName} logo" class="fixture-logo">
            `;
            fixturesPreview.appendChild(a);
          });
        } else {
          fixturesPreview.innerHTML = '<p style="color:#facc15;">No upcoming fixtures available.</p>';
        }
      } else {
        fixturesPreview.innerHTML = '<p style="color:#facc15;">No upcoming fixtures available.</p>';
      }
    } catch (err) {
      console.error('Error fetching fixtures preview:', err);
      fixturesPreview.innerHTML = '<p style="color:red;">Failed to load fixtures preview.</p>';
    }
  } else {
    console.error('Fixtures preview not found');
  }

  // TEAM OF THE WEEK
  const pitchContainer = document.querySelector('.pitch-container');
  if (pitchContainer) {
    const fallbackTeam = [
      { name: 'Alisson', position: 'GK', rating: 7.8, image_path: '/SportsWire/images/players/alisson.png' },
      { name: 'Trent Alexander-Arnold', position: 'RB', rating: 8.2, image_path: '/SportsWire/images/players/trent.png' },
    ];
    const formationPositions = {
      GK: { top: 90, left: 50 },
      RB: { top: 70, left: 85 },
    };
    const positionCounters = {};
    pitchContainer.innerHTML = '';
    fallbackTeam.forEach(player => {
      const pos = player.position;
      let coords = formationPositions[pos] ? (Array.isArray(formationPositions[pos]) ? formationPositions[pos][(positionCounters[pos] || 0)] : formationPositions[pos]) : null;
      if (coords) {
        if (Array.isArray(formationPositions[pos])) {
          if (!positionCounters[pos]) positionCounters[pos] = 0;
          coords = formationPositions[pos][positionCounters[pos]++];
        }
        const playerCard = document.createElement('a');
        playerCard.href = `player.html?id=${encodeURIComponent(player.name.toLowerCase().replace(/\s+/g, '-'))}`;
        playerCard.className = 'player-card';
        playerCard.style.top = `${coords.top}%`;
        playerCard.style.left = `${coords.left}%`;
        playerCard.innerHTML = `
          <img src="${player.image_path || 'https://via.placeholder.com/40'}" alt="${player.name}" class="player-img">
          <span class="player-rating">${(player.rating || 0).toFixed(1)}</span>
        `;
        pitchContainer.appendChild(playerCard);
      }
    });
  } else {
    console.error('Pitch container not found');
  }

  // STANDINGS
  const errorDiv = document.getElementById('error');
  const standingsBody = document.getElementById('standings-body');
  if (errorDiv && standingsBody) {
    if (!seasonId) {
      errorDiv.textContent = 'No season ID available for this league.';
      return;
    }
    try {
      const standingsResponse = await fetch(`http://localhost:3000/api/standings/${seasonId}`);
      if (standingsResponse.ok) {
        const data = await standingsResponse.json();
        console.log('Standings data:', data);
        if (data.data && data.data.length > 0) {
          standingsBody.innerHTML = '';
          data.data.forEach(team => {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td>${team.position || '-'}</td>
              <td><img src="${team.participant?.image_path || ''}" alt="${team.participant?.name || 'Unknown'}" class="team-logo"> ${team.participant?.name || 'Unknown'}</td>
              <td>${team.points || '0'}</td>
            `;
            standingsBody.appendChild(row);
          });
        } else {
          errorDiv.textContent = 'No standings data found.';
        }
      } else {
        errorDiv.textContent = 'No standings data found.';
      }
    } catch (error) {
      console.error('Error fetching standings:', error);
      errorDiv.textContent = 'Failed to load standings data.';
    }
  } else {
    console.error('Error div or standings body not found:', { errorDiv, standingsBody });
  }

  // FULL FIXTURES
  const fixturesTab = document.querySelector('#fixtures');
  const observer = new MutationObserver(() => {
    if (fixturesTab && !fixturesTab.classList.contains('active')) return;
    observer.disconnect();
    fetchFixtures();
  });
  if (fixturesTab) {
    observer.observe(fixturesTab, { attributes: true, attributeFilter: ['class'] });
    if (fixturesTab.classList.contains('active')) fetchFixtures();
  } else {
    console.error('Fixtures tab not found');
  }

  async function fetchFixtures() {
    const list = document.querySelector('.fixtures-list');
    const noFixturesMsg = document.getElementById('no-fixtures');
    if (list && noFixturesMsg) {
      list.innerHTML = '';
      noFixturesMsg.style.display = 'none';
      if (!leagueId) {
        list.innerHTML = '<p style="color:red;">League ID not found.</p>';
        return;
      }
      try {
        const response = await fetch(`http://localhost:3000/api/fixtures?startDate=${startDate}&endDate=${endDate}`);
        if (response.ok) {
          const fixtures = await response.json();
          console.log('Full fixtures data:', fixtures);
          const leagueFixtures = fixtures.filter(f => f.league?.id == leagueId);
          if (leagueFixtures.length > 0) {
            leagueFixtures.forEach(fixture => {
              const participants = fixture.participants || [];
              const home = participants.find(p => p.meta?.location === 'home') || participants[0] || {};
              const away = participants.find(p => p.meta?.location === 'away') || participants[1] || {};
              const homeName = home.name || 'TBD';
              const awayName = away.name || 'TBD';
              const homeLogo = home.image_path ? `<img src="${home.image_path}" alt="${homeName}" height="30" style="border-radius:50%">` : '';
              const awayLogo = away.image_path ? `<img src="${away.image_path}" alt="${awayName}" height="30" style="border-radius:50%">` : '';
              const kickoff = new Date(fixture.starting_at).toLocaleString();
              const scores = fixture.scores?.filter(s => s.description === 'CURRENT') || [];
              const homeScore = scores.find(s => s.participant_id === home.id)?.score?.goals ?? '-';
              const awayScore = scores.find(s => s.participant_id === away.id)?.score?.goals ?? '-';
              const a = document.createElement('a');
              a.href = `match.html?id=${fixture.id}`;
              a.style = 'text-decoration: none; color: inherit;';
              const div = document.createElement('div');
              div.className = 'fixture-card';
              div.style = 'background:#222;padding:15px;margin-bottom:10px;border-radius:8px;color:#facc15;font-family:\'Inter\',sans-serif;box-shadow:0 2px 4px rgba(255,255,255,0.05);';
              div.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;">
                  <div style="display:flex;align-items:center;gap:10px;">${homeLogo} <strong>${homeName}</strong></div>
                  <div style="font-weight:bold;font-size:18px;">${homeScore} - ${awayScore}</div>
                  <div style="display:flex;align-items:center;gap:10px;"><strong>${awayName}</strong> ${awayLogo}</div>
                </div>
                <em style="font-size:14px;color:#aaa;">${kickoff}</em>
              `;
              a.appendChild(div);
              list.appendChild(a);
            });
          } else {
            noFixturesMsg.style.display = 'block';
          }
        } else {
          noFixturesMsg.style.display = 'block';
        }
      } catch (error) {
        console.error('Error fetching fixtures:', error);
        list.innerHTML = '<p style="color:red;">Failed to fetch fixtures.</p>';
      }
    } else {
      console.error('Fixtures list or no-fixtures message not found:', { list, noFixturesMsg });
    }
  }

  // STATISTICS
  if (!seasonId) {
    console.error('❌ League not found or season ID missing.');
    return;
  }
  const baseURL = 'http://localhost:3000/api';
  const fetchStat = async (endpoint) => {
    try {
      const res = await fetch(`${baseURL}${endpoint}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      console.log(`Fetched ${endpoint}:`, data);
      return Array.isArray(data) ? data : data.data || [];
    } catch (err) {
      console.error('❌ Error fetching:', endpoint, err);
      return [];
    }
  };
  const renderPlayerList = (selector, items, valueLabel = '') => {
    const list = document.querySelector(selector);
    if (list) {
      list.innerHTML = '';
      if (items.length > 0) {
        items.slice(0, 5).forEach(item => {
          const playerName = item.player?.display_name || item.player?.name || item.name || 'Unknown';
          const playerImg = item.player?.image_path || item.image_path || 'https://via.placeholder.com/32';
          const teamName = item.participant?.name || item.team?.name || 'Unknown Team';
          const teamImg = item.participant?.image_path || item.team?.image_path || 'https://via.placeholder.com/32';
          const value = (item.total ?? item.statistics?.total ?? item.value ?? 0) || 0;
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
        if (items.length > 5) {
          const btn = document.createElement('button');
          btn.textContent = 'View More';
          btn.className = 'view-more-btn';
          btn.addEventListener('click', () => {
            list.classList.toggle('expanded');
            btn.textContent = list.classList.contains('expanded') ? 'View Less' : 'View More';
          });
          list.parentElement.appendChild(btn);
        }
      } else {
        list.innerHTML = '<p style="color:#facc15;">No data available.</p>';
      }
    } else {
      console.error(`Element ${selector} not found`);
    }
  };
  const renderTeamList = (selector, teams, label = '') => {
    const list = document.querySelector(selector);
    if (list) {
      list.innerHTML = '';
      if (teams.length > 0) {
        teams.sort((a, b) => (b.total ?? b.value ?? 0) - (a.total ?? a.value ?? 0)).slice(0, 5).forEach(team => {
          const li = document.createElement('li');
          li.innerHTML = `
            <div class="info">
              <img src="${team.image_path || team.image || 'https://via.placeholder.com/32'}" alt="${team.name}">
              <strong>${team.name}</strong>
            </div>
            <span><strong>${team.total || team.value || '0'}</strong> ${label}</span>
          `;
          list.appendChild(li);
        });
        if (teams.length > 5) {
          const btn = document.createElement('button');
          btn.textContent = 'View More';
          btn.className = 'view-more-btn';
          btn.addEventListener('click', () => {
            list.classList.toggle('expanded');
            btn.textContent = list.classList.contains('expanded') ? 'View Less' : 'View More';
          });
          list.parentElement.appendChild(btn);
        }
      } else {
        list.innerHTML = '<p style="color:#facc15;">No data available.</p>';
      }
    } else {
      console.error(`Element ${selector} not found`);
    }
  };
  const loadAllStats = async () => {
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
    console.log('Top Scorers:', topScorers);
    console.log('Top Assists:', topAssisters);
    console.log('Red Cards:', redCards);
    console.log('Yellow Cards:', yellowCards);
    console.log('Team Goals:', teamGoals);
    console.log('Team Clean Sheets:', teamCleansheets);
    renderPlayerList('#top-goals', topScorers, 'goals');
    renderPlayerList('#top-assists', topAssisters, 'assists');
    renderPlayerList('#top-reds', redCards, 'reds');
    renderPlayerList('#top-yellows', yellowCards, 'yellows');
    renderTeamList('#team-goals', teamGoals, 'goals');
    renderTeamList('#team-cleansheets', teamCleansheets, 'clean sheets');
  };
  loadAllStats();

  // ANIMATION FOR STATISTICS
  const statsSections = document.querySelector('#stats-sections');
  if (statsSections) {
    const sections = statsSections.querySelectorAll('section');
    sections.forEach((sec, i) => {
      sec.style.opacity = 0;
      sec.style.transform = 'translateY(30px)';
      sec.style.transition = `opacity 0.6s ease ${i * 0.1}s, transform 0.6s ease ${i * 0.1}s`;
      setTimeout(() => {
        sec.style.opacity = 1;
        sec.style.transform = 'translateY(0)';
      }, 300);
    });
  } else {
    console.error('Stats sections not found');
  }
});