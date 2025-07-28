<?php
// article.php
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Article | FootWire</title>
  <link rel="stylesheet" href="css/style.css" />
  <link rel="stylesheet" href="css/article.css">
</head>
<body>

<?php
// Include DB
include __DIR__ . '/admin/dbcon.php';

// Get article ID
$articleId = isset($_GET['id']) ? intval($_GET['id']) : 0;

// Fetch article
$stmt = $conn->prepare("SELECT * FROM news WHERE id = ?");
$stmt->bind_param("i", $articleId);
$stmt->execute();
$result = $stmt->get_result();
$article = $result->fetch_assoc();
$stmt->close();

if (!$article) {
    // Article not found, show 404
    http_response_code(404);
}
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

  <!-- 📄 ARTICLE CONTENT -->
  <section class="article-content container">
    <div class="main-article">
      <?php if ($article): ?>
        <h1 class="article-title"><?php echo htmlspecialchars($article['title']); ?></h1>
        <p class="article-meta">
          Published on <span><?php echo date('F j, Y', strtotime($article['date'])); ?></span>
          | Author: <span><?php echo htmlspecialchars($article['author']); ?></span>
        </p>
        <?php if ($article['image_path']): ?>
        <img src="<?php echo htmlspecialchars($article['image_path']); ?>" alt="<?php echo htmlspecialchars($article['title']); ?>" class="article-image" />
        <?php endif; ?>
        <div class="article-body">
          <?php echo $article['body']; ?>
        </div>
      <?php else: ?>
        <h1>Article Not Found</h1>
        <p>Sorry, the article you are looking for does not exist.</p>
      <?php endif; ?>
    </div>

    <!-- Sidebar: Related Articles -->
    <aside class="sidebar">
      <h3>Related Articles</h3>
      <ul class="related-articles">
        <?php
        if ($article) {
            // Fetch 3 related (other) articles
            $relStmt = $conn->prepare(
                "SELECT id, title FROM news WHERE id != ? ORDER BY date DESC LIMIT 3"
            );
            $relStmt->bind_param("i", $articleId);
            $relStmt->execute();
            $relResult = $relStmt->get_result();
            while ($rel = $relResult->fetch_assoc()):
        ?>
            <li><a href="article.php?id=<?php echo intval($rel['id']); ?>"><?php echo htmlspecialchars($rel['title']); ?></a></li>
        <?php
            endwhile;
            $relStmt->close();
        }
        ?>
      </ul>

      <!-- Social Sharing -->
      <div class="social-share">
        <a href="https://twitter.com/share?url=<?php echo urlencode((
            "https://" . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI']
        )); ?>&text=<?php echo rawurlencode($article['title']); ?>" target="_blank" class="share-btn">Share on Twitter</a>
        <a href="https://api.whatsapp.com/send?text=<?php echo rawurlencode(
            $article['title'] . ' ' . ("https://" . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'])
        ); ?>" target="_blank" class="share-btn">Share on WhatsApp</a>
      </div>
    </aside>
  </section>

  <!-- ⚫ FOOTER -->
  <footer class="site-footer">
    <div class="container">
      <p>&copy; <?php echo date('Y'); ?> FootWire. All rights reserved.</p>
    </div>
  </footer>
</body>
</html>
