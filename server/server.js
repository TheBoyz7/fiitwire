// Import required packages
const express = require('express');
const axios = require('axios');
const cors = require('cors');

// Initialize express app
const app = express();
const port = 3000;

// Enable CORS for all routes
app.use(cors());

// Sportmonks API token
const apiToken = 'lARRrh4DmR4zOY4mMDEPlX7H44hE8SxRRKc9P7rwta12qLlguJVbLN2TF1i5';

// Standings for a given seasonId
app.get('/api/standings/:seasonId', async (req, res) => {
  const seasonId = req.params.seasonId;
  try {
    const response = await axios.get(`https://api.sportmonks.com/v3/football/standings/seasons/${seasonId}`, {
      params: { api_token: apiToken, include: 'participant' }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching standings:', error.response?.data || error.message);
    res.status(500).send('Failed to fetch standings.');
  }
});


// ✅ Fixtures for a date range


app.get('/api/fixtures', async (req, res) => {
  const { startDate, endDate } = req.query;
  const url = `https://api.sportmonks.com/v3/football/fixtures/between/${startDate}/${endDate}?api_token=${apiToken}&include=participants;league;scores`;

  try {
    const response = await axios.get(url);

    // ✅ Send only the fixtures array, not the whole response
    res.json(response.data.data);
  } catch (error) {
    console.error("Error fetching fixtures:", error.message);
    res.status(500).json({ error: "Failed to fetch fixtures" });
  }
});



// Start the server
app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
});
