<?php
// admin/submit_news.php

session_start();

// 1. Ensure only logged-in admins can access this script
if (!isset($_SESSION['isAdmin']) || $_SESSION['isAdmin'] !== true) {
    header("Location: ../login.php");
    exit;
}

include __DIR__ . '/dbcon.php';
$adminUsername = $_SESSION['username'];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    // Direct access without a POST should just redirect back to “Create” tab
    header("Location: index.php?tab=create");
    exit;
}

// 2. Gather & sanitize form inputs
$id       = isset($_POST['id']) ? intval($_POST['id']) : null;
$title    = trim($_POST['title']   ?? '');
$summary  = trim($_POST['summary'] ?? '');
$body     = trim($_POST['body']    ?? '');
$tag      = trim($_POST['tag']     ?? '');
$date     = trim($_POST['date']    ?? '');
$featured = isset($_POST['featured']) && $_POST['featured'] == '1' ? 1 : 0;

if ($title === '' || $summary === '' || $body === '' || $tag === '' || $date === '') {
    die("Error: All fields (title, summary, body, tag, date) are required.");
}

// 3. Image upload handling function
function handleImageUpload(string $fieldName): ?string {
    if (!isset($_FILES[$fieldName]) || $_FILES[$fieldName]['error'] === UPLOAD_ERR_NO_FILE) {
        return null; // No file was submitted
    }

    $file = $_FILES[$fieldName];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        die("Upload error code: " . $file['error']);
    }

    // Validate MIME type
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    $finfo    = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeType, $allowedTypes, true)) {
        die("Invalid image type. Only JPEG, PNG, GIF, and WEBP allowed.");
    }

    // Validate extension
    $extension   = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!in_array($extension, $allowedExts, true)) {
        die("Invalid file extension. Only jpg, jpeg, png, gif, webp allowed.");
    }

    // Ensure uploads directory exists
    $uploadDir = __DIR__ . '/uploads/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // Generate a unique filename
    $newName     = time() . '_' . uniqid() . '.' . $extension;
    $destination = $uploadDir . $newName;

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        die("Failed to move uploaded file.");
    }

    // Return the relative path to be stored in DB (used later in <img src="../...">)
    return 'admin/uploads/' . $newName;
}

// 4. If an ID is provided, we’re updating an existing article
if ($id !== null) {
    // (a) Verify this admin actually owns that article
    $stmtCheck = $conn->prepare("SELECT image_path FROM news WHERE id = ? AND author = ?");
    $stmtCheck->bind_param("is", $id, $adminUsername);
    $stmtCheck->execute();
    $resCheck = $stmtCheck->get_result();
    if (!$resCheck || $resCheck->num_rows !== 1) {
        $stmtCheck->close();
        die("Error: Cannot update. Article not found or you do not have permission.");
    }
    $row = $resCheck->fetch_assoc();
    $oldImagePath = $row['image_path'];
    $stmtCheck->close();

    // (b) Handle a new image, if uploaded
    $newImagePath = handleImageUpload('image');
    if ($newImagePath === null) {
        // No new file uploaded; keep the old one
        $imagePathToStore = $oldImagePath;
    } else {
        // A new image was uploaded; delete the old file if it exists
        if ($oldImagePath && file_exists(__DIR__ . '/' . basename($oldImagePath))) {
            @unlink(__DIR__ . '/' . basename($oldImagePath));
        }
        $imagePathToStore = $newImagePath;
    }

    // --------------- Ensure only one featured at a time ---------------
    if ($featured === 1) {
        $conn->query("UPDATE news SET featured = 0 WHERE featured = 1");
    }

    // (c) Perform the UPDATE, including the featured flag
    $sqlUpdate = "
        UPDATE news SET
            title      = ?,
            summary    = ?,
            body       = ?,
            tag        = ?,
            date       = ?,
            image_path = ?,
            featured   = ?
        WHERE id = ? AND author = ?
    ";
    $stmtUpd = $conn->prepare($sqlUpdate);
    // nine parameters: title, summary, body, tag, date, image_path (s×6), featured (i), id (i), author (s)
    $stmtUpd->bind_param(
        "ssssssiss",
        $title,
        $summary,
        $body,
        $tag,
        $date,
        $imagePathToStore,
        $featured,
        $id,
        $adminUsername
    );

    if (!$stmtUpd->execute()) {
        $err = $stmtUpd->error;
        $stmtUpd->close();
        die("Database update error: $err");
    }

    $stmtUpd->close();
    // Redirect back to “My News” tab
    header("Location: index.php?tab=my_news");
    exit;
}

// 5. Otherwise, this is a brand-new article INSERT
$newImagePath = handleImageUpload('image');
$imageToStore = $newImagePath !== null ? $newImagePath : '';

// --------------- Ensure only one featured at a time ---------------
if ($featured === 1) {
    $conn->query("UPDATE news SET featured = 0 WHERE featured = 1");
}

$sqlInsert = "
    INSERT INTO news 
      (title, summary, body, tag, author, date, image_path, featured, created_at)
    VALUES 
      (?, ?, ?, ?, ?, ?, ?, ?, NOW())
";
$stmtIns = $conn->prepare($sqlInsert);
// eight parameters: title, summary, body, tag, author, date, image_path (s×7), featured (i)
$stmtIns->bind_param(
    "sssssssi",
    $title,
    $summary,
    $body,
    $tag,
    $adminUsername,
    $date,
    $imageToStore,
    $featured
);

if (!$stmtIns->execute()) {
    $err = $stmtIns->error;
    $stmtIns->close();
    die("Database insert error: $err");
}

$stmtIns->close();
// Redirect back to “My News” tab
header("Location: index.php?tab=my_news");
exit;
?>
