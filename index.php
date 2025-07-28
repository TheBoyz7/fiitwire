<?php
// index.php (public homepage)
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FootWire | Football News Reimagined</title>
  <link rel="stylesheet" href="css/style.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
</head>
<body>

<?php
// Include database connection
include __DIR__ . '/admin/dbcon.php';

// Fetch featured article (assuming only one featured)
$featStmt = $conn->prepare("SELECT * FROM news WHERE featured = 1 ORDER BY date DESC LIMIT 1");
$featStmt->execute();
$featResult = $featStmt->get_result();
$featured = $featResult->fetch_assoc();
$featStmt->close();

// Fetch latest non-featured articles
$latestStmt = $conn->prepare("SELECT * FROM news WHERE featured = 0 ORDER BY date DESC LIMIT 6");
$latestStmt->execute();
$latestResult = $latestStmt->get_result();
$latest = [];
while ($row = $latestResult->fetch_assoc()) {
    $latest[] = $row;
}
$latestStmt->close();
?>

  <!-- 🔵 HEADER -->
  <header class="site-header">
    <div class="container">
      <div class="logo">
        <h1>FootWire</h1>
      </div>
      <nav class="main-nav">
        <ul>
          <li><a href="index.php">Home</a></li>
          <li><a href="news.php">News</a></li>
          <li><a href="league.php">Leagues</a></li>
          <li><a href="team.php">Teams</a></li>
          <li><a href="live.php">Live Scores</a></li>
        </ul>
      </nav>
      <!-- <div class="auth-buttons">
        <button class="login-btn">Login</button>
        <button class="signup-btn">Sign Up</button>
      </div> -->
    </div>
  </header>

  <!-- 🔴 FEATURED NEWS -->
  <section class="featured-news">
    <div class="container">
      <?php if ($featured): ?>
      <div class="headline">
        <img src="<?php echo htmlspecialchars($featured['image_path']); ?>" alt="<?php echo htmlspecialchars($featured['title']); ?>" class="headline-img" />
        <div class="headline-content">
          <span class="tag <?php echo strtolower(htmlspecialchars($featured['tag'])); ?>"><?php echo htmlspecialchars($featured['tag']); ?></span>
          <h2><a href="article.php?id=<?php echo intval($featured['id']); ?>"><?php echo htmlspecialchars($featured['title']); ?></a></h2>
          <p><?php echo htmlspecialchars($featured['summary']); ?></p>
          <span class="date"><?php echo date('F j, Y', strtotime($featured['date'])); ?></span>
        </div>
      </div>
      <?php else: ?>
      <p>No featured article at the moment.</p>
      <?php endif; ?>
    </div>
  </section>

  <!-- 🟡 MAIN CONTENT -->
  <main class="main-content container">

    <!-- News Feed -->
    <section class="news-feed">
      <h3>Latest Headlines</h3>
      <div class="articles-grid">
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
    </section>

    <!-- Sidebar -->
    <aside class="sidebar">
      <section class="live-scores">
        <h4>Live Scores</h4>
        <ul class="score-list">
          <!-- Static or dynamic live scores -->
        </ul>
      </section>

      <section class="trending-topics">
        <h4>Trending Topics</h4>
        <ul class="tags">
          <li><a href="">Messi</a></li>
          <li><a href="">Ronaldo</a></li>
          <li><a href="">TransferTalk</a></li>
          <li><a href="">VARDrama</a></li>
          <li><a href="">PremierLeague</a></li>
          <li><a href="">AFCON</a></li>
        </ul>
      </section>
    </aside>

  </main>

  <!-- ⚫ FOOTER -->
  <footer class="site-footer">
    <div class="container">
      <p>&copy; <?php echo date('Y'); ?> FootWire. All rights reserved.</p>
      <ul class="footer-links">
        <li><a href="">Privacy</a></li>
        <li><a href="">Terms</a></li>
        <li><a href="">Contact</a></li>
      </ul>
      <ul class="social-icons">
        <li><a href=""><img src="icons/x.svg" alt="Twitter/X"></a></li>
        <li><a href=""><img src="icons/instagram.svg" alt="Instagram"></a></li>
        <li><a href=""><img src="icons/youtube.svg" alt="YouTube"></a></li>
      </ul>
    </div>
  </footer>

</body>
</html>
