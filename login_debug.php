<?php
// login_debug.php

session_start();
require_once __DIR__ . '/admin/dbcon.php';

$error = '';
$debugInfo = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');

    $debugInfo[] = "Raw form input → username: '{$username}', password: '{$password}'";

    if ($username === '' || $password === '') {
        $error = "Please enter both username and password.";
    } else {
        // 1) Prepare and execute the query
        $stmt = $conn->prepare("SELECT id, username, password_hash FROM admins WHERE username = ?");
        if (! $stmt) {
            die("Prepare failed: " . $conn->error);
        }
        $stmt->bind_param("s", $username);
        $execOK = $stmt->execute();
        if (! $execOK) {
            die("Execute failed: " . $stmt->error);
        }

        $result = $stmt->get_result();
        $rowCount = $result ? $result->num_rows : 0;
        $debugInfo[] = "Query returned $rowCount row(s).";

        if ($result && $rowCount === 1) {
            $row = $result->fetch_assoc();
            $fetchedHash = $row['password_hash'];
            $debugInfo[] = "Fetched hash from database: '$fetchedHash'";

            $verifyResult = password_verify($password, $fetchedHash) ? 'TRUE' : 'FALSE';
            $debugInfo[] = "password_verify(...): $verifyResult";

            if ($verifyResult === 'TRUE') {
                // Successful login
                $_SESSION['isAdmin']  = true;
                $_SESSION['username'] = $row['username'];
                header("Location: admin/index.php");
                exit;
            } else {
                $error = "Invalid username or password. (password_verify failed)";
            }
        } else {
            $error = "Invalid username or password. (row count ≠ 1)";
        }

        $stmt->close();
    }
}

// HTML portion with debug output
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FootWire Admin Login (Debug)</title>
  <link rel="stylesheet" href="style.css">
  <style>
    body {
      background-color: #1e1e2f;
      color: #f0f0f5;
      font-family: Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .login-container {
      background: #2e2e42;
      padding: 2rem;
      border-radius: 8px;
      width: 360px;
      box-shadow: 0 0 10px rgba(0,0,0,0.5);
    }
    .login-container h2 {
      margin-bottom: 1rem;
      text-align: center;
    }
    .login-container label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }
    .login-container input[type="text"],
    .login-container input[type="password"] {
      width: 100%;
      padding: 0.5rem;
      margin-bottom: 1rem;
      border: 1px solid #555;
      border-radius: 4px;
      background-color: #3a3a55;
      color: #f0f0f5;
    }
    .login-container button {
      width: 100%;
      padding: 0.6rem;
      background: #4a90e2;
      border: none;
      color: #fff;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
    }
    .login-container button:hover {
      background: #357ab8;
    }
    .error {
      color: #f44336;
      margin-bottom: 1rem;
      text-align: center;
    }
    .debug {
      margin-top: 1rem;
      background: #1c1c2d;
      padding: 1rem;
      border-radius: 4px;
      font-size: 0.9rem;
      line-height: 1.4;
      max-height: 200px;
      overflow-y: auto;
    }
    .debug p {
      margin: 0.3rem 0;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <h2>Admin Login (Debug)</h2>
    <?php if ($error): ?>
      <div class="error"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>
    <form method="post" action="login_debug.php">
      <label for="username">Username:</label>
      <input 
        type="text" 
        id="username" 
        name="username" 
        required 
        value="<?= htmlspecialchars($_POST['username'] ?? '') ?>"
      >

      <label for="password">Password:</label>
      <input 
        type="password" 
        id="password" 
        name="password" 
        required
      >

      <button type="submit">Log In</button>
    </form>

    <?php if (!empty($debugInfo)): ?>
      <div class="debug">
        <strong>Debug Output:</strong>
        <?php foreach ($debugInfo as $line): ?>
          <p><?= htmlspecialchars($line) ?></p>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </div>
</body>
</html>
