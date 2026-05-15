<?php
declare(strict_types=1);

/**
 * Create or update an admin user in the database.
 *
 * Usage (local Docker):
 *   docker exec opal_api php create-admin.php hijas@example.com "MyStrongPass!" "Hijas Salam"
 *
 * Usage (deployed on Fly):
 *   fly ssh console -a opal-api -C "php /var/www/html/create-admin.php hijas@example.com 'MyStrongPass!' 'Hijas Salam'"
 *
 * If the email already exists, the password + name are UPDATED rather than failing.
 */

require_once __DIR__ . '/vendor/autoload.php';

use MongoDB\Client;
use Dotenv\Dotenv;

// Load .env when running locally (no-op when env vars are already set by Docker/Fly)
if (file_exists(__DIR__ . '/.env')) {
    Dotenv::createImmutable(__DIR__)->safeLoad();
}

// ─── Args ────────────────────────────────────────────────────────────────────
$email    = $argv[1] ?? null;
$password = $argv[2] ?? null;
$name     = $argv[3] ?? 'Admin';

if (!$email || !$password) {
    fwrite(STDERR, "Usage: php create-admin.php <email> <password> [name]\n");
    exit(1);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "ERROR: '$email' is not a valid email address.\n");
    exit(1);
}

if (strlen($password) < 6) {
    fwrite(STDERR, "ERROR: password must be at least 6 characters.\n");
    exit(1);
}

$email = strtolower(trim($email));

// ─── Connect ─────────────────────────────────────────────────────────────────
$mongoUri = getenv('MONGO_URI') ?: ($_ENV['MONGO_URI'] ?? 'mongodb://localhost:27017');
$mongoDb  = getenv('MONGO_DB')  ?: ($_ENV['MONGO_DB']  ?? 'opal_perfumes');

echo "Connecting to MongoDB: $mongoDb\n";

try {
    $client = new Client($mongoUri);
    $db     = $client->selectDatabase($mongoDb);
} catch (\Exception $e) {
    fwrite(STDERR, "ERROR: could not connect: " . $e->getMessage() . "\n");
    exit(1);
}

// ─── Upsert ──────────────────────────────────────────────────────────────────
$now      = new \MongoDB\BSON\UTCDateTime();
$hash     = password_hash($password, PASSWORD_BCRYPT);
$existing = $db->admin_users->findOne(['email' => $email]);

if ($existing) {
    $db->admin_users->updateOne(
        ['email' => $email],
        ['$set' => [
            'name'          => $name,
            'password_hash' => $hash,
            'updated_at'    => $now,
        ]]
    );
    echo "✓ Updated existing admin: $email\n";
} else {
    $db->admin_users->insertOne([
        'name'          => $name,
        'email'         => $email,
        'password_hash' => $hash,
        'created_at'    => $now,
        'updated_at'    => $now,
    ]);
    echo "✓ Created new admin: $email\n";
}

echo "Done. Login at the admin URL with these credentials.\n";
