<?php
// admin/index.php

session_start();

// 1. Protect the admin dashboard
if (!isset($_SESSION['isAdmin']) || $_SESSION['isAdmin'] !== true) {
    header("Location: ../login.php");
    exit;
}

// 2. We'll assume the admin's username is stored in the session
$adminUsername = $_SESSION['username'];

// 3. Database connection
include __DIR__ . '/dbcon.php';

// 4. Determine which “tab” we’re on (create, my_news, or all_news)
$tab = $_GET['tab'] ?? 'create';

// 5. Handle “delete” action if present (only in My News tab)
if ($tab === 'my_news' && isset($_GET['action'], $_GET['id']) && $_GET['action'] === 'delete') {
    $deleteId = intval($_GET['id']);
    // Only let admins delete their own posts
    $stmtDel = $conn->prepare("DELETE FROM news WHERE id = ? AND author = ?");
    $stmtDel->bind_param("is", $deleteId, $adminUsername);
    $stmtDel->execute();
    $stmtDel->close();
    // Redirect back to My News (so the URL doesn’t linger with action=delete)
    header("Location: index.php?tab=my_news");
    exit;
}

// 6. If “action=edit” was clicked (in either My News or Create tab), fetch that row to prefill the form
$editing       = false;
$editPostData  = [
    'id'         => '',
    'title'      => '',
    'summary'    => '',
    'body'       => '',
    'tag'        => '',
    'author'     => $adminUsername,
    'date'       => date('Y-m-d'),
    'image_path' => '',
    'featured'   => 0
];

if (isset($_GET['action'], $_GET['id']) && $_GET['action'] === 'edit') {
    $editId   = intval($_GET['id']);
    $stmtEdit = $conn->prepare("SELECT * FROM news WHERE id = ? AND author = ?");
    $stmtEdit->bind_param("is", $editId, $adminUsername);
    $stmtEdit->execute();
    $resEdit = $stmtEdit->get_result();
    if ($resEdit && $resEdit->num_rows === 1) {
        $row = $resEdit->fetch_assoc();
        $editing                    = true;
        $editPostData['id']         = $row['id'];
        $editPostData['title']      = $row['title'];
        $editPostData['summary']    = $row['summary'];
        $editPostData['body']       = $row['body'];
        $editPostData['tag']        = $row['tag'];
        $editPostData['author']     = $row['author'];
        $editPostData['date']       = $row['date'];
        $editPostData['image_path'] = $row['image_path'];
        $editPostData['featured']   = intval($row['featured']);
    }
    $stmtEdit->close();
}

// 7. For “My News” tab: handle search parameter
$myNewsSearch = trim($_GET['search'] ?? '');

// 8. Fetch “My News” if that tab is active
$myNewsResult = null;
if ($tab === 'my_news') {
    if ($myNewsSearch !== '') {
        $likeTerm = '%' . $myNewsSearch . '%';
        $stmtMy = $conn->prepare(
            "SELECT * 
             FROM news 
             WHERE author = ? 
               AND title LIKE ? 
             ORDER BY date DESC"
        );
        $stmtMy->bind_param("ss", $adminUsername, $likeTerm);
    } else {
        $stmtMy = $conn->prepare(
            "SELECT * 
             FROM news 
             WHERE author = ? 
             ORDER BY date DESC"
        );
        $stmtMy->bind_param("s", $adminUsername);
    }
    $stmtMy->execute();
    $myNewsResult = $stmtMy->get_result();
    $stmtMy->close();
}

// 9. Fetch “All News” if that tab is active
$allNewsResult = null;
if ($tab === 'all_news') {
    $allNewsResult = $conn->query("SELECT * FROM news ORDER BY date DESC");
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FootWire Admin Dashboard</title>
  <link rel="stylesheet" href="../css/style.css">
  <link rel="stylesheet" href="../css/admin.css">
</head>
<body>
  <div class="container">
    <h1>Admin Dashboard</h1>
    <p>Welcome, <strong><?php echo htmlspecialchars($adminUsername); ?></strong>. Choose a tab below.</p>

    <!-- 10. Tab Navigation -->
    <div class="tabs">
      <a href="index.php?tab=create" class="<?php echo ($tab === 'create') ? 'active' : ''; ?>">Create News</a>
      <a href="index.php?tab=my_news" class="<?php echo ($tab === 'my_news') ? 'active' : ''; ?>">My News</a>
      <a href="index.php?tab=all_news" class="<?php echo ($tab === 'all_news') ? 'active' : ''; ?>">All News</a>
    </div>

    <!-- 11. CREATE NEWS SECTION -->
    <?php if ($tab === 'create'): ?>
      <div class="section" id="createNewsSection">
        <h2><?php echo $editing ? 'Edit News Article' : 'Create News Article'; ?></h2>
        <form id="newsForm" method="post" action="submit_news.php" enctype="multipart/form-data">
          <?php if ($editing): ?>
            <!-- Hidden ID so submit_news.php knows we're updating -->
            <input type="hidden" name="id" value="<?php echo intval($editPostData['id']); ?>">
          <?php endif; ?>

          <label>Title:<br>
            <input 
              type="text" 
              name="title" 
              id="title" 
              required 
              value="<?php echo htmlspecialchars($editPostData['title']); ?>"
            >
          </label><br><br>

          <label>Summary:<br>
            <textarea 
              name="summary" 
              id="summary" 
              rows="3" 
              required
            ><?php echo htmlspecialchars($editPostData['summary']); ?></textarea>
          </label><br><br>

          <label>Full Body:<br>
            <textarea 
              name="body" 
              id="body" 
              rows="8" 
              required
            ><?php echo htmlspecialchars($editPostData['body']); ?></textarea>
          </label><br><br>

          <label>Tag:<br>
            <select name="tag" id="tag">
              <?php
                $tags = ['Breaking', 'Transfer', 'Injury', 'Analysis'];
                foreach ($tags as $t) {
                  $sel = ($t === $editPostData['tag']) ? 'selected' : '';
                  echo "<option value=\"$t\" $sel>$t</option>";
                }
              ?>
            </select>
          </label><br><br>

          <!-- Featured checkbox -->
          <label style="display:inline-block; margin-bottom:1rem;">
            <input 
              type="checkbox" 
              name="featured" 
              id="featured" 
              value="1"
              <?php echo ($editing && $editPostData['featured'] == 1) ? 'checked' : ''; ?>
            >
            Featured?
          </label><br><br>

          <label>Author:<br>
            <input 
              type="text" 
              name="author" 
              id="author" 
              required 
              value="<?php echo htmlspecialchars($editPostData['author']); ?>"
              readonly
            >
          </label><br><br>

          <label>Date:<br>
            <input 
              type="date" 
              name="date" 
              id="date" 
              value="<?php echo htmlspecialchars($editPostData['date']); ?>"
              required
            >
          </label><br><br>

          <label>Image:
            <input type="file" name="image" id="image" accept="image/jpeg, image/png, image/gif, image/webp">
          </label>
          <?php if ($editing && $editPostData['image_path']): ?>
            <p>Current image: <img 
              src="../<?php echo htmlspecialchars($editPostData['image_path']); ?>" 
              alt="Existing" 
              style="max-width: 150px; display: block; margin-top: 0.5rem;"
            ></p>
          <?php endif; ?>
          <br>

          <button type="button" id="previewBtn">
            <?php echo $editing ? 'Preview Changes' : 'Preview Article'; ?>
          </button>
          <button type="submit">
            <?php echo $editing ? 'Update Article' : 'Publish Article'; ?>
          </button>
        </form>

        <!-- Live Preview Container (Initially hidden) -->
        <div 
          id="previewContainer" 
          style="display:none; padding: 2rem; margin-top:2rem; background:#1e1e2f; border-radius:10px;"
        >
          <h2>Live Preview</h2>
          <h3 id="previewTitle"></h3>
          <p><em id="previewSummary"></em></p>
          <div id="previewBody" style="margin: 1rem 0;"></div>
          <img 
            id="previewImage" 
            src="#" 
            alt="Preview" 
            style="max-width:100%; display:none; margin-top:1rem;"
          >
          <p><strong>Author:</strong> <span id="previewAuthor"></span></p>
          <p><strong>Date:</strong> <span id="previewDate"></span></p>
          <p><strong>Tag:</strong> <span id="previewTag"></span></p>
        </div>
      </div>
    <?php endif; ?>


    <!-- 12. MY NEWS SECTION -->
    <?php if ($tab === 'my_news'): ?>
      <div class="section" id="myNewsSection">
        <h2>My News Articles</h2>

        <!-- Search Form -->
        <form method="get" action="index.php" class="search-form">
          <!-- Keep tab=my_news so we stay on this section -->
          <input type="hidden" name="tab" value="my_news">
          <input 
            type="text" 
            name="search" 
            placeholder="Search by title..." 
            value="<?php echo htmlspecialchars($myNewsSearch); ?>"
          >
          <button type="submit">Search</button>
        </form>

        <?php if ($myNewsResult && $myNewsResult->num_rows > 0): ?>
          <table class="news-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Date</th>
                <th>Tag</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <?php while ($row = $myNewsResult->fetch_assoc()): ?>
                <tr>
                  <td><?php echo intval($row['id']); ?></td>
                  <td><?php echo htmlspecialchars($row['title']); ?></td>
                  <td><?php echo htmlspecialchars($row['date']); ?></td>
                  <td><?php echo htmlspecialchars($row['tag']); ?></td>
                  <td>
                    <!-- Edit: reload Create tab with action=edit&id=… -->
                    <a 
                      class="btn-small" 
                      href="index.php?tab=create&action=edit&id=<?php echo intval($row['id']); ?>"
                    >Edit</a>

                    <!-- Delete: triggers ?tab=my_news&action=delete&id=… -->
                    <a 
                      class="btn-small" 
                      href="index.php?tab=my_news&action=delete&id=<?php echo intval($row['id']); ?>"
                      onclick="return confirm('Are you sure you want to delete this article?');"
                    >Delete</a>
                  </td>
                </tr>
              <?php endwhile; ?>
            </tbody>
          </table>
        <?php else: ?>
          <p>You have no news articles yet.</p>
        <?php endif; ?>
      </div>
    <?php endif; ?>


    <!-- 13. ALL NEWS SECTION -->
    <?php if ($tab === 'all_news'): ?>
      <div class="section" id="allNewsSection">
        <h2>All News Articles</h2>

        <?php if ($allNewsResult && $allNewsResult->num_rows > 0): ?>
          <table class="news-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Date</th>
                <th>Tag</th>
                <th>Author</th>
              </tr>
            </thead>
            <tbody>
              <?php while ($row = $allNewsResult->fetch_assoc()): ?>
                <tr>
                  <td><?php echo intval($row['id']); ?></td>
                  <td><?php echo htmlspecialchars($row['title']); ?></td>
                  <td><?php echo htmlspecialchars($row['date']); ?></td>
                  <td><?php echo htmlspecialchars($row['tag']); ?></td>
                  <td><?php echo htmlspecialchars($row['author']); ?></td>
                </tr>
              <?php endwhile; ?>
            </tbody>
          </table>
        <?php else: ?>
          <p>There are no news articles in the database.</p>
        <?php endif; ?>

      </div>
    <?php endif; ?>

  </div>

  <!-- 14. JavaScript for live preview and date autofill -->
  <script>
    // Only run if “Create News” or “Edit News” tab is active
    const tab = "<?php echo $tab; ?>";
    if (tab === 'create') {
      // Autofill date on load (only if not editing, or override if editing)
      window.onload = () => {
        const dateInput = document.getElementById('date');
        if (!dateInput.value) {
          const today = new Date().toISOString().split('T')[0];
          dateInput.value = today;
        }
      };

      // Live text preview
      document.getElementById('title').oninput = function() {
        document.getElementById('previewTitle').innerText = this.value;
      };
      document.getElementById('summary').oninput = function() {
        document.getElementById('previewSummary').innerText = this.value;
      };
      document.getElementById('body').oninput = function() {
        document.getElementById('previewBody').innerText = this.value;
      };

      // Image preview
      document.getElementById('image').onchange = function(event) {
        const imgFile = event.target.files[0];
        const imgPreview = document.getElementById('previewImage');
        if (imgFile) {
          imgPreview.src = URL.createObjectURL(imgFile);
          imgPreview.style.display = "block";
          imgPreview.onload = () => URL.revokeObjectURL(imgPreview.src);
        }
      };

      // Preview button logic
      document.getElementById('previewBtn').onclick = function() {
        document.getElementById('previewAuthor').innerText = document.getElementById('author').value;
        document.getElementById('previewDate').innerText = document.getElementById('date').value;
        document.getElementById('previewTag').innerText = document.getElementById('tag').value;
        document.getElementById('previewContainer').style.display = 'block';
      };
    }
  </script>
</body>
</html>
