#!/bin/bash
set -e

# Install/update composer dependencies if vendor is missing or outdated
if [ ! -f /var/www/html/vendor/autoload.php ]; then
    echo "[entrypoint] vendor/ not found — running composer install..."
    cd /var/www/html
    composer install --no-interaction --no-dev --prefer-dist --no-security-blocking
    echo "[entrypoint] composer install done."
fi

# Ensure uploads dir is writable
mkdir -p /var/www/html/uploads
chmod -R 777 /var/www/html/uploads

echo "[entrypoint] Starting Apache..."
exec apache2-foreground
