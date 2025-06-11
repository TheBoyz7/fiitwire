<?php
// make_hash.php
$plain = 'admin';
$hash  = password_hash($plain, PASSWORD_DEFAULT);
echo "Hash for '{$plain}' → {$hash}";
?>
