const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = 3000;

// CORS enabled for all routes
app.use(cors());

// 🔐 Sportmonks API token
const apiToken = 'q3yfglJHbGTY8qXKg3TnwA6JIiuFCzbAaOCy7wYpHU2xJqIonKBPbp4iKxh0';
const BASE_URL = 'https://api.sportmonks.com/v3/football';

// 📊 Standings
app.get('/api/standings/:seasonId', async (req, res) => {
  const { seasonId } = req.params;
  try {
    const response = await axios.get(`${BASE_URL}/standings/seasons/${seasonId}`, {
      params: { api_token: apiToken, include: 'participant;rule;details;details.type' }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching standings:', error.response?.data || error.message);
    res.status(500).send('Failed to fetch standings.');
  }
});

// 📅 Fixtures within date range (auto-fetch all pages)
app.get('/api/fixtures', async (req, res) => {
  const { startDate, endDate, filters } = req.query;

  // ✅ Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!startDate || !endDate || !dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return res.status(400).json({ error: 'Invalid or missing startDate/endDate. Use YYYY-MM-DD format.' });
  }

  // ✅ Ensure startDate <= endDate
  if (new Date(startDate) > new Date(endDate)) {
    return res.status(400).json({ error: 'startDate cannot be after endDate.' });
  }

  const perPage = 1000; // Max allowed per Sportmonks docs
  let page = 1;
  let allFixtures = [];

  try {
    while (true) {
      const url = `${BASE_URL}/fixtures/between/${startDate}/${endDate}` +
                  `?api_token=${apiToken}` +
                  `&per_page=${perPage}` +
                  `&page=${page}` +
                  `&include=participants;league;scores` +
                  `${filters ? `&${filters}` : ''}`;

      const response = await axios.get(url);
      const fixtures = response.data.data || [];

      console.log(`Page ${page}: fetched ${fixtures.length} fixtures`);

      if (fixtures.length === 0) {
        break; // ✅ Stop if no more results
      }

      allFixtures = allFixtures.concat(fixtures);
      page++;
    }

    console.log(`Total fixtures fetched for ${startDate} to ${endDate}: ${allFixtures.length}`);
    res.json(allFixtures);
  } catch (error) {
    console.error('Error fetching fixtures:', {
      message: error.message,
      response: error.response?.data || 'No response data',
      status: error.response?.status
    });
    res.status(500).json({
      error: 'Failed to fetch fixtures',
      details: error.response?.data?.message || error.message
    });
  }
});

// ⚽ Goalscorers
app.get('/api/topscorers/:seasonId', async (req, res) => {
  const { seasonId } = req.params;
  try {
    const url = `${BASE_URL}/topscorers/seasons/${seasonId}?api_token=${apiToken}&include=player;participant&filters=seasonTopscorerTypes:208`;
    const response = await axios.get(url);
    res.json(response.data.data);
  } catch (error) {
    console.error('🔥 Error fetching top scorers:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch top scorers' });
  }
});

// Assists
app.get('/api/topassists/:seasonId', async (req, res) => {
  const { seasonId } = req.params;
  try {
    const url = `${BASE_URL}/topscorers/seasons/${seasonId}?api_token=${apiToken}&include=player;participant&filters=seasonTopscorerTypes:209`;
    const response = await axios.get(url);
    res.json(response.data.data);
  } catch (error) {
    console.error('🔥 Error fetching top assists:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch top assists' });
  }
});

// 🟥 Red Cards
app.get('/api/redcards/:seasonId', async (req, res) => {
  const { seasonId } = req.params;
  try {
    const url = `${BASE_URL}/topscorers/seasons/${seasonId}?api_token=${apiToken}&include=player;participant&filters=seasonTopscorerTypes:83`;
    const response = await axios.get(url);
    res.json(response.data.data);
  } catch (err) {
    console.error('🔥 Error fetching red cards:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch red cards' });
  }
});

// 🟨 Yellow Cards
app.get('/api/yellowcards/:seasonId', async (req, res) => {
  const { seasonId } = req.params;
  try {
    const url = `${BASE_URL}/topscorers/seasons/${seasonId}?api_token=${apiToken}&include=player;participant&filters=seasonTopscorerTypes:84`;
    const response = await axios.get(url);
    res.json(response.data.data);
  } catch (err) {
    console.error('🔥 Error fetching yellow cards:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch yellow cards' });
  }
});

// Endpoint: Team with most goals (aggregated from individual scorers)
app.get('/api/teamstats/goals/:seasonId', async (req, res) => {
  const { seasonId } = req.params;

  try {
    const response = await axios.get(`${BASE_URL}/topscorers/seasons/${seasonId}`, {
      params: {
        api_token: apiToken,
        include: 'participant',
        filters: 'seasonTopscorerTypes:208', // Goals
      },
    });

    const data = response.data.data || [];

    const teamTotals = {};

    data.forEach(entry => {
      const teamId = entry.participant_id;
      if (!teamTotals[teamId]) {
        teamTotals[teamId] = {
          id: teamId,
          name: entry.participant?.name || `Team ${teamId}`,
          image: entry.participant?.image_path || '',
          total: 0,
        };
      }
      teamTotals[teamId].total += entry.total;
    });

    const sortedTeams = Object.values(teamTotals).sort((a, b) => b.total - a.total);
    res.json(sortedTeams);

  } catch (error) {
    console.error('🔥 Error fetching team stats:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch team stats' });
  }
});

// Most Clean Sheets (Team level)
app.get('/api/teamstats/cleansheets/:seasonId', async (req, res) => {
  const { seasonId } = req.params;

  try {
    const { data } = await axios.get(
      `${BASE_URL}/teams/seasons/${seasonId}`,
      {
        params: {
          api_token: apiToken,
          include: 'statistics.details.type',
          filters: `teamStatisticSeasons:${seasonId}`
        }
      }
    );

    const teams = data.data;

    const stats = teams.map(team => {
      const statDetails = team.statistics?.[0]?.details || [];

      const cleansheetStat = statDetails.find(
        stat => stat?.type?.developer_name === 'CLEANSHEET'
      );

      const total = cleansheetStat?.value?.all?.count || 0;

      return {
        id: team.id,
        name: team.name,
        image: team.image_path,
        total
      };
    });

    stats.sort((a, b) => b.total - a.total);

    res.json(stats);
  } catch (err) {
    console.error('🔥 Error fetching cleansheets:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch team cleansheets' });
  }
});

// 📄 Match Details by Fixture ID
app.get('/api/fixture/:fixtureId', async (req, res) => {
  const { fixtureId } = req.params;

  try {
    const response = await axios.get(
      `${BASE_URL}/fixtures/${fixtureId}`,
      {
        params: {
          api_token: apiToken,
          include: [
            'participants',
            'lineups',
            'events',
            'statistics',
            'scores',
            'events.type',
            'events.player',
            'events.period',
            'lineups.player',
            'lineups.position',
            'statistics.type',
            'lineups.detailedPosition',
          ].join(';')
        }
      }
    );
    res.json(response.data.data);
  } catch (err) {
    console.error('🔥 Sportmonks API error:', err.response?.status, err.response?.data);
    return res.status(500).json({ error: err.response?.data || err.message });
  }
});

// 🏆 Team info & all trophies (uncapped)
app.get('/api/teams/:teamId', async (req, res) => {
  const { teamId } = req.params;

  const perPage = 1000; // Large page size to reduce calls
  let page = 1;
  let allTrophies = null;

  try {
    // First request to get team info + first batch of trophies
    const baseUrl = `${BASE_URL}/teams/${teamId}`;
    const params = {
      api_token: apiToken,
      per_page: perPage,
      page: page,
      include: 'venue;coaches;coaches.coach;trophies;trophies.trophy;trophies.season;trophies.league'
    };

    const firstRes = await axios.get(baseUrl, { params });
    const teamData = firstRes.data.data || {};

    // Extract initial trophies (if any)
    allTrophies = teamData.trophies?.data || [];

    // Keep fetching trophies until no more results
    while ((teamData.trophies?.data?.length || 0) === perPage) {
      page++;
      const nextRes = await axios.get(baseUrl, {
        params: {
          ...params,
          page
        }
      });
      const trophiesPage = nextRes.data.data?.trophies?.data || [];
      if (trophiesPage.length === 0) break;
      allTrophies = allTrophies.concat(trophiesPage);
    }

    // Replace trophies in teamData with full uncapped list
    if (teamData.trophies) {
      teamData.trophies.data = allTrophies;
    }

    res.json(teamData);

  } catch (err) {
    console.error('🛑 Error fetching team info:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch team info' });
  }
});


// 📅 Full schedule tree for a team (league → rounds → fixtures)
app.get('/api/team-schedule/:teamId', async (req, res) => {
  const { teamId } = req.params;

  try {
    // Fetch team schedule
    const scheduleResponse = await axios.get(`${BASE_URL}/schedules/teams/${teamId}`, {
      params: {
        api_token: apiToken
      }
    });

    const stages = scheduleResponse.data.data;

    // Extract unique league IDs from fixtures
    const leagueIds = new Set();
    stages.forEach(stage => {
      (stage.rounds || []).forEach(round => {
        (round.fixtures || []).forEach(fixture => {
          if (fixture.league_id) {
            leagueIds.add(fixture.league_id);
          }
        });
      });
    });

    // Fetch league details for each unique league_id
    const leaguePromises = Array.from(leagueIds).map(leagueId =>
      axios.get(`${BASE_URL}/leagues/${leagueId}`, {
        params: {
          api_token: apiToken
        }
      })
    );

    const leagueResponses = await Promise.all(leaguePromises);
    const leagueMap = {};
    leagueResponses.forEach(response => {
      const league = response.data.data;
      leagueMap[league.id] = {
        name: league.name || 'N/A',
        image_path: league.image_path || 'https://cdn.sportmonks.com/images/soccer/placeholder.png'
      };
    });

    // Transform schedule into a flat array of fixtures with leagueName and leagueImagePath
    const fixtures = stages.flatMap(stage =>
      (stage.rounds || []).flatMap(round =>
        (round.fixtures || []).map(fixture => ({
          ...fixture,
          leagueName: leagueMap[fixture.league_id]?.name || 'N/A',
          leagueImagePath: leagueMap[fixture.league_id]?.image_path || 'https://cdn.sportmonks.com/images/soccer/placeholder.png',
          roundName: round.name || 'N/A'
        }))
      )
    );

    res.json(fixtures);
  } catch (error) {
    console.error('📛 Error fetching team schedule:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch team schedule' });
  }
});

// 🧑‍🦱 Team Squad — now 100% correct
app.get('/api/squad/:teamId', async (req, res) => {
  const { teamId } = req.params;

  try {
    // Step 1: Get team's schedule to extract leagueId
    const scheduleRes = await axios.get(`${BASE_URL}/schedules/teams/${teamId}`, {
      params: { api_token: apiToken },
    });

    const stages = scheduleRes.data.data;
    let leagueId = null;

    for (const stage of stages) {
      for (const round of stage.rounds || []) {
        for (const fixture of round.fixtures || []) {
          if (fixture.league_id) {
            leagueId = fixture.league_id;
            break;
          }
        }
        if (leagueId) break;
      }
      if (leagueId) break;
    }

    let seasonId = 25583; // fallback

    // Step 2: Fetch current season from league
    if (leagueId) {
      try {
        const leagueRes = await axios.get(`${BASE_URL}/leagues/${leagueId}`, {
          params: {
            api_token: apiToken,
            include: 'currentSeason',
          },
        });

        const league = leagueRes.data.data;
        if (league.currentseason?.id) {
          seasonId = league.currentseason.id;
          console.log(`✅ Found current seasonId=${seasonId} for leagueId=${leagueId}`);
        } else {
          console.warn(`⚠️ League ${leagueId} does not have a current season`);
        }
      } catch (e) {
        console.warn(`⚠️ Failed to fetch league ${leagueId} for season ID:`, e.response?.data || e.message);
      }
    }

    // Step 3: Fetch squad with statistics already filtered by season
    const squadRes = await axios.get(`${BASE_URL}/squads/teams/${teamId}`, {
      params: {
        api_token: apiToken,
        include: 'team;player.nationality;player.position;player.statistics.details',
        filters: `playerStatisticSeasons:${seasonId}`, // ✅ filter for this season only
      },
    });

    let squad = squadRes.data.data;

    if (!Array.isArray(squad.player)) {
      console.warn(`⚠️ No player data found in squad response for team ${teamId}`);
    }

    console.log(`✅ Squad fetched for team ${teamId} with seasonId=${seasonId} (API filtered)`);
    res.json(squad);
  } catch (err) {
    console.error('📛 Error fetching team squad:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch team squad' });
  }
});


// 📦 Transfer history by team
app.get('/api/transfers/:teamId', async (req, res) => {
  const { teamId } = req.params;
  const { page = 1, per_page = 5000, order = 'desc' } = req.query; 

  try {
    const transferRes = await axios.get(`${BASE_URL}/transfers/teams/${teamId}`, {
      params: {
        api_token: apiToken,
        include: 'sport;player;type;fromTeam;toTeam;position;detailedPosition',
        per_page,
        page,
        order,
      },
    });

    console.log(`✅ Transfers fetched for team ${teamId} (page ${page})`);
    res.json(transferRes.data);
  } catch (err) {
    console.error('📛 Error fetching team transfers:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch team transfers' });
  }
});

// 🏆 Full Player Profile + Trophies + Stats + Fixtures
app.get('/api/player/:playerId', async (req, res) => {
  const { playerId } = req.params;

  try {
    const response = await axios.get(`${BASE_URL}/players/${playerId}`, {
      params: {
        api_token: apiToken,
        include: [
          'trophies.league',
          'trophies.season',
          'trophies.trophy',
          'trophies.team',
          'teams.team',
          'statistics.details.type',
          'statistics.team',
          'statistics.season.league',
          'latest.fixture.participants',
          'latest.fixture.league',
          'latest.fixture.scores',
          'latest.details.type',
          'nationality',
          'detailedPosition',
          'metadata.type'
        ].join(';')
      }
    });

    res.json(response.data.data); // just the juicy part, no meta
  } catch (err) {
    console.error('📛 Error fetching player profile:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch player data' });
  }
});


// 🌍 Get all leagues
app.get('/api/leagues', async (req, res) => {
  try {
    const { include, select, filters, locale, per_page = 500, page = 1, order = 'asc' } = req.query;

    const response = await axios.get(`${BASE_URL}/leagues`, {
      params: {
        api_token: apiToken,
        include,
        select,
        filters,
        locale,
        per_page,
        page,
        order,
        include:[
          'seasons',
        ].join(';')
      }
    });

    res.json(response.data.data); 
  } catch (err) {
    console.error('🛑 Error fetching leagues:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch leagues' });
  }
});

// 🌐 Get all teams
app.get('/api/teams', async (req, res) => {
  const {
    page = 1,
    per_page = 25,
    order = 'asc',
    include, // e.g. players, venue, etc.
    select,
    filters,
    locale,
  } = req.query;

  try {
    const response = await axios.get(`${BASE_URL}/teams`, {
      params: {
        api_token: apiToken,
        page,
        per_page,
        order,
        include,
        select,
        filters,
        locale,
        include:[
          'seasons'
        ].join(';')
      },
    });

    res.json(response.data.data); // send only the relevant data array
  } catch (err) {
    console.error('🛑 Error fetching teams:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});


// 📅 Get All Fixtures (Safe Full Include)
app.get('/api/all-fixtures', async (req, res) => {
  const {
    select,
    sortBy,
    filters,
    locale,
    page = 1,
    per_page = 10,
    order = 'asc'
  } = req.query;

  // Safe include list for fixtures (based on docs)
  const defaultIncludes = [
    'round',
    'stage',
    'group',
    'aggregate',
    'league',
    'venue',
    'periods',
    'currentPeriod',
    'participants',
    'scores'
  ].join(';');

  try {
    const response = await axios.get(`${BASE_URL}/fixtures`, {
      params: {
        api_token: apiToken,
        include: defaultIncludes,
        select,
        sortBy,
        filters,
        locale,
        page,
        per_page,
        order
      }
    });

    res.json(response.data.data);
  } catch (err) {
    console.error('🛑 Error fetching all fixtures:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch all fixtures', details: err.response?.data || err.message });
  }
});



// 🚗 Start server
app.listen(port, () => {
  console.log(`✅ Proxy server running at http://localhost:${port}`);
});