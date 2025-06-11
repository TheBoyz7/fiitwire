<?php
$host = "localhost";
$user = "root"; // Change this if you're not using the default XAMPP setup
$pass = ""; // Most XAMPP installs have NO password on root
$db = "sportwirenews";

$conn = mysqli_connect($host, $user, $pass, $db);

if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}
?>
