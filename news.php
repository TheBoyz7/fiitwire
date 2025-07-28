<?php
//news page
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FootWire | News Hub</title>
  <link rel="stylesheet" href="css/style.css">
  <link rel="stylesheet" href="css/news-hub.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
</head>
<body>
  <?php
// Include database connection
include __DIR__ . '/admin/dbcon.php';

// Fetch latest articles
$latestStmt = $conn->prepare("SELECT * FROM news ORDER BY date DESC LIMIT 6");
$latestStmt->execute();
$latestResult = $latestStmt->get_result();
$latest = [];
while ($row = $latestResult->fetch_assoc()) {
    $latest[] = $row;
}
$latestStmt->close();
?>

<header class="site-header">
    <div class="container">
      <div class="logo">
        <h1>FootWire</h1>
      </div>
      <nav class="main-nav">
        <ul>
          <li><a href="index.php">Home</a></li>
          <li><a href="news.php">News</a></li>
          <li><a href="league.html">Leagues</a></li>
          <li><a href="team.html">Teams</a></li>
          <li><a href="live.html">Live Scores</a></li>
        </ul>
      </nav>
      <!-- <div class="auth-buttons">
        <button class="login-btn">Login</button>
        <button class="signup-btn">Sign Up</button>
      </div> -->
    </div>
  </header>


  <main class="news-hub container">
    <h2 class="page-title">Latest Football News</h2>

    <input type="text" placeholder="Search news, leagues, teams, players…" class="search-bar universal-search">
    <br>
    <br>

    <!-- News Grid -->
   <div class="news-grid">
        <?php if (!empty($latest)): ?>
          <?php foreach ($latest as $article): ?>
          <article class="news-card">
            <img src="<?php echo htmlspecialchars($article['image_path']); ?>" alt="News thumbnail" />
            <div class="news-info">
              <span class="tag <?php echo strtolower(htmlspecialchars($article['tag'])); ?>"><?php echo htmlspecialchars($article['tag']); ?></span>
              <h4><a href="article.php?id=<?php echo intval($article['id']); ?>"><?php echo htmlspecialchars($article['title']); ?></a></h4>
              <p><?php echo htmlspecialchars($article['summary']); ?></p>
              <span class="date"><?php echo date('F j, Y', strtotime($article['date'])); ?></span>
            </div>
          </article>
          <?php endforeach; ?>
        <?php else: ?>
          <p>No recent articles available.</p>
        <?php endif; ?>
      </div>

    <!-- <button class="load-more">Load More</button> -->

  </main>
<script>


   const searchInput = document.querySelector('.universal-search');

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    const articles = document.querySelectorAll('.news-card');

    articles.forEach(article => {
      const content = article.textContent.toLowerCase();
      if(content.includes(query)) {
        article.style.display = 'block';
        article.classList.add('fade-in');
      } else {
        article.style.display = 'none';
      }
    });
  });


</script>
</body>
</html>
