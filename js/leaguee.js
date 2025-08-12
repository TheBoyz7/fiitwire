document.addEventListener('DOMContentLoaded', async () => {
  const container = document.querySelector('.leagues-container');
  const searchInput = document.getElementById('league-search');
  let leagues = [];
  let fixtureCache = {};

  // Debounce function for search
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  try {
    const response = await fetch('http://localhost:3000/api/leagues');
    if (!response.ok) throw new Error('Failed to fetch leagues');
    leagues = await response.json();
    renderLeagues(leagues);
  } catch (err) {
    console.error('Error loading leagues:', err);
    container.innerHTML = `
      <p class="error">Failed to load leagues. <button class="retry-btn">Retry</button></p>
    `;
    document.querySelector('.retry-btn').addEventListener('click', () => location.reload());
  }

  searchInput.addEventListener('input', debounce(() => {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredLeagues = leagues.filter(league =>
      league.name.toLowerCase().includes(searchTerm)
    );
    renderLeagues(filteredLeagues);
  }, 300));
});

function renderLeagues(leagues) {
  const container = document.querySelector('.leagues-container');
  container.innerHTML = ''; // Clear existing content

  leagues.forEach(league => {
    const card = document.createElement('div');
    card.className = 'league-card';
    card.dataset.leagueId = league.id;

    const header = document.createElement('div');
    header.className = 'league-header';

    const logo = document.createElement('img');
    logo.src = league.image_path || 'https://cdn.sportmonks.com/images/soccer/placeholder.png';
    logo.alt = `${league.name} Logo`;

    const title = document.createElement('h2');
    title.textContent = league.name;

    header.appendChild(logo);
    header.appendChild(title);

    const viewMoreBtn = document.createElement('button');
    viewMoreBtn.className = 'view-more';
    viewMoreBtn.textContent = 'View League';
    viewMoreBtn.addEventListener('click', () => {
      window.location.href = `leagues.html?id=${league.id}`;
    });

    card.appendChild(header);
    card.appendChild(viewMoreBtn);

    container.appendChild(card);
  });
}