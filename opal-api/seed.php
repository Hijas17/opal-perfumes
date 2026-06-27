<?php

declare(strict_types=1);

/**
 * Opal Perfumes — Database Seeder
 * Run: php seed.php
 */

require_once __DIR__ . '/vendor/autoload.php';

use MongoDB\Client;
use Dotenv\Dotenv;

// ─── Load environment ─────────────────────────────────────────────────────────
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();

$mongoUri = $_ENV['MONGO_URI'] ?? 'mongodb://localhost:27017';
$mongoDb  = $_ENV['MONGO_DB']  ?? 'opal_perfumes';

echo "Connecting to MongoDB: {$mongoUri} / {$mongoDb}\n";

try {
    $client = new Client($mongoUri);
    $db     = $client->selectDatabase($mongoDb);
    echo "Connected.\n\n";
} catch (\Exception $e) {
    echo "ERROR: Could not connect to MongoDB — " . $e->getMessage() . "\n";
    exit(1);
}

$now = new \MongoDB\BSON\UTCDateTime();

// ─── Admin User ───────────────────────────────────────────────────────────────
echo "Seeding admin user...\n";
$adminEmail    = 'admin@opalperfumes.com';
$adminPassword = 'Admin@1234';

$existingAdmin = $db->admin_users->findOne(['email' => $adminEmail]);
if ($existingAdmin) {
    echo "  Admin user already exists ({$adminEmail}), skipping.\n";
} else {
    $db->admin_users->insertOne([
        'name'          => 'Opal Admin',
        'email'         => $adminEmail,
        'password_hash' => password_hash($adminPassword, PASSWORD_BCRYPT),
        'created_at'    => $now,
        'updated_at'    => $now,
    ]);
    echo "  Created admin: {$adminEmail} / {$adminPassword}\n";
}

// ─── Subcategories ────────────────────────────────────────────────────────────
echo "\nSeeding subcategories...\n";

$subcategories = [
    ['name' => 'Perfume', 'slug' => 'perfume', 'display_order' => 1],
    ['name' => 'Buhoor',  'slug' => 'buhoor',  'display_order' => 2],
];

foreach ($subcategories as $cat) {
    $existing = $db->subcategories->findOne(['slug' => $cat['slug']]);
    if ($existing) {
        echo "  Category '{$cat['name']}' already exists, skipping.\n";
        continue;
    }
    $db->subcategories->insertOne(array_merge($cat, [
        'created_at' => $now,
        'updated_at' => $now,
    ]));
    echo "  Created category: {$cat['name']}\n";
}

// ─── Site Settings ────────────────────────────────────────────────────────────
echo "\nSeeding site settings...\n";

$settings = [
    // Brand
    'brand_name'          => 'Opal Perfumes',
    'footer_tagline'      => 'Luxury Fragrances for Every Occasion',
    'default_currency'    => 'USD',

    // Contact
    'contact_email'       => 'hello@opalperfumes.com',
    'contact_phone'       => '+1 (800) 000-0000',
    'address'             => '123 Luxury Lane, Dubai, UAE',
    'whatsapp_number'     => '+971508213885',

    // Social
    'facebook_url'        => 'https://facebook.com/opalperfumes',
    'instagram_url'       => 'https://instagram.com/opalperfumes',
    'youtube_url'         => 'https://youtube.com/@opalperfumes',

    // Hero section
    'hero_title'          => 'Discover Your Signature Scent',
    'hero_subtitle'       => 'Explore our exclusive collection of luxury perfumes and buhoor.',
    'hero_image'          => '',
    'hero_bottle_image'   => '',
    'hero_cta_text'       => 'Shop Now',
    'hero_cta_url'        => '/products',

    // About section
    'about_title'         => 'The Art of Fragrance',
    'about_description'   => 'At Opal Perfumes, we craft each fragrance with the finest ingredients sourced from around the world.',
    'about_image'         => '',
];

foreach ($settings as $key => $value) {
    $existing = $db->site_settings->findOne(['key' => $key]);
    if ($existing) {
        echo "  Setting '{$key}' already exists, skipping.\n";
        continue;
    }
    $db->site_settings->insertOne([
        'key'        => $key,
        'value'      => $value,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    echo "  Created setting: {$key}\n";
}

// ─── Indexes ──────────────────────────────────────────────────────────────────
echo "\nCreating indexes...\n";

$db->products->createIndex(['slug' => 1], ['unique' => true]);
$db->products->createIndex(['status' => 1]);
$db->products->createIndex(['subcategory_id' => 1]);
$db->products->createIndex(['created_at' => -1]);
$db->products->createIndex(['is_featured' => 1]);

$db->subcategories->createIndex(['slug' => 1], ['unique' => true]);
$db->subcategories->createIndex(['display_order' => 1]);

$db->admin_users->createIndex(['email' => 1], ['unique' => true]);

$db->inquiries->createIndex(['created_at' => -1]);
$db->inquiries->createIndex(['ip' => 1, 'created_at' => -1]);
$db->inquiries->createIndex(['is_read' => 1]);

$db->site_settings->createIndex(['key' => 1], ['unique' => true]);

// Customer auth + cart + orders
$db->customers->createIndex(['email' => 1], ['unique' => true]);
$db->customers->createIndex(['created_at' => -1]);

$db->carts->createIndex(['customer_id' => 1], ['unique' => true]);

$db->orders->createIndex(['customer_id' => 1, 'created_at' => -1]);
$db->orders->createIndex(['order_number' => 1], ['unique' => true]);
$db->orders->createIndex(['status' => 1]);

echo "  Indexes created.\n";

echo "\nSeed complete!\n";
echo "---\n";
echo "Admin login: {$adminEmail} / {$adminPassword}\n";
echo "Run 'composer install' in the project root if you haven't already.\n";
