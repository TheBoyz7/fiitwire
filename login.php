<?php
// login.php

session_start();

// If already logged in, redirect to admin dashboard
if (isset($_SESSION['isAdmin']) && $_SESSION['isAdmin'] === true) {
    header("Location: admin/index.php");
    exit;
}

// Include database connection (adjust the path if needed)
require_once __DIR__ . '/admin/dbcon.php';

// Initialize variables
$error = '';

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');

    if ($username === '' || $password === '') {
        $error = "Please enter both username and password.";
    } else {
        // Look up user in the admins table
        $stmt = $conn->prepare("SELECT id, username, password_hash FROM admins WHERE username = ?");
        $stmt->bind_param("s", $username);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result && $result->num_rows === 1) {
            $row = $result->fetch_assoc();
            // Verify password
            if (password_verify($password, $row['password_hash'])) {
                // Authentication successful
                $_SESSION['isAdmin'] = true;
                $_SESSION['username'] = $row['username'];
                // Redirect to admin dashboard
                header("Location: admin/index.php");
                exit;
            } else {
                $error = "Invalid username or password.";
            }
        } else {
            $error = "Invalid username or password.";
        }

        $stmt->close();
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SportsWire Admin Login</title>
  <link rel="stylesheet" href="styles.css">
  <style>
    /* Simple centered form styling */
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
      width: 320px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
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
  </style>
</head>
<body>
  <div class="login-container">
    <h2>Admin Login</h2>
    <?php if ($error): ?>
      <div class="error"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>
    <form method="post" action="login.php">
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
  </div>
</body>
</html>
