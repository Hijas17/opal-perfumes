<?php
declare(strict_types=1);

/**
 * Production database initialiser.
 *
 * Creates all collections + indexes in MongoDB. Does NOT insert any data
 * (no test admin, no default settings, no sample categories). Idempotent —
 * safe to run on an existing prod cluster to backfill missing indexes.
 *
 * Usage:
 *   MONGO_URI="mongodb+srv://..." MONGO_DB="opal_perfumes" php db/init-prod.php
 *
 * After running, create your real admin user with create-admin.php.
 *
 * The authoritative schema reference is db/schema.md — keep both in sync.
 */

require_once __DIR__ . '/../vendor/autoload.php';

use MongoDB\Client;
use Dotenv\Dotenv;

// Load .env if present (no-op when env vars are already in the environment)
if (file_exists(__DIR__ . '/../.env')) {
    Dotenv::createImmutable(__DIR__ . '/..')->safeLoad();
}

$mongoUri = getenv('MONGO_URI') ?: ($_ENV['MONGO_URI'] ?? null);
$mongoDb  = getenv('MONGO_DB')  ?: ($_ENV['MONGO_DB']  ?? 'opal_perfumes');

if (!$mongoUri) {
    fwrite(STDERR, "ERROR: MONGO_URI is not set.\n");
    exit(1);
}

echo "Connecting to: $mongoDb\n";

try {
    $client = new Client($mongoUri);
    $db     = $client->selectDatabase($mongoDb);
    // Force a round-trip so we fail fast on connection issues
    $db->command(['ping' => 1]);
    echo "Connected.\n\n";
} catch (\Exception $e) {
    fwrite(STDERR, "ERROR: " . $e->getMessage() . "\n");
    exit(1);
}

// ─── Indexes ─────────────────────────────────────────────────────────────────
// Each entry: collection => [[keys, options], ...]
// `createIndex` is idempotent in MongoDB — it's a no-op if the same index exists.
$indexes = [
    'admin_users' => [
        [['email' => 1], ['unique' => true, 'name' => 'email_unique']],
    ],
    'customers' => [
        [['email' => 1],       ['unique' => true, 'name' => 'email_unique']],
        [['created_at' => -1], ['name' => 'created_desc']],
    ],
    'subcategories' => [
        [['slug' => 1],          ['unique' => true, 'name' => 'slug_unique']],
        [['display_order' => 1], ['name' => 'display_order_asc']],
    ],
    'products' => [
        [['slug' => 1],           ['unique' => true, 'name' => 'slug_unique']],
        [['status' => 1],         ['name' => 'status']],
        [['subcategory_id' => 1], ['name' => 'subcategory_id']],
        [['created_at' => -1],    ['name' => 'created_desc']],
        [['is_featured' => 1],    ['name' => 'is_featured']],
    ],
    'site_settings' => [
        [['key' => 1], ['unique' => true, 'name' => 'key_unique']],
    ],
    'inquiries' => [
        [['created_at' => -1],              ['name' => 'created_desc']],
        [['ip' => 1, 'created_at' => -1],   ['name' => 'rate_limit']],
        [['is_read' => 1],                  ['name' => 'is_read']],
    ],
    'carts' => [
        [['customer_id' => 1], ['unique' => true, 'name' => 'customer_id_unique']],
    ],
    'orders' => [
        [['customer_id' => 1, 'created_at' => -1], ['name' => 'customer_history']],
        [['order_number' => 1], ['unique' => true, 'name' => 'order_number_unique']],
        [['status' => 1], ['name' => 'status']],
    ],
];

$created = 0;
$skipped = 0;

foreach ($indexes as $collection => $defs) {
    echo "→ $collection\n";

    // Trigger collection creation by writing the first index
    foreach ($defs as [$keys, $options]) {
        try {
            $name = $options['name'] ?? '';
            // Check if it already exists
            $existing = iterator_to_array($db->$collection->listIndexes());
            $names    = array_map(fn($i) => $i->getName(), $existing);
            if (in_array($name, $names, true)) {
                echo "    · $name (already exists)\n";
                $skipped++;
                continue;
            }
            $db->$collection->createIndex($keys, $options);
            echo "    ✓ $name\n";
            $created++;
        } catch (\Exception $e) {
            echo "    ✗ $name — " . $e->getMessage() . "\n";
        }
    }
}

echo "\n────────────────────────────────────────────\n";
echo "Done. Created $created indexes, skipped $skipped already-existing.\n";
echo "\nNext steps:\n";
echo "  1. Create your admin user:\n";
echo "       php create-admin.php you@yourcompany.com 'StrongPass!' 'Your Name'\n";
echo "  2. Populate site_settings from the admin portal (Settings tab),\n";
echo "     OR run seed.php if you want the default placeholder values.\n";
