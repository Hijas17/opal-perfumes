FROM php:8.4-apache

# ── System dependencies ───────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ── Fast PHP extension installer (pre-compiled binaries) ──────────────────────
RUN curl -sSLf \
    https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions \
    -o /usr/local/bin/install-php-extensions \
    && chmod +x /usr/local/bin/install-php-extensions

# ── PHP extensions ────────────────────────────────────────────────────────────
RUN install-php-extensions mongodb

# ── PHP ini overrides ─────────────────────────────────────────────────────────
RUN printf "upload_max_filesize = 50M\npost_max_size = 55M\nmax_execution_time = 120\nmax_input_time = 120\nmemory_limit = 256M\n" \
    > /usr/local/etc/php/conf.d/uploads.ini

# ── Apache: enable mod_rewrite, DocumentRoot → public/ ───────────────────────
RUN a2enmod rewrite

RUN sed -i 's|DocumentRoot /var/www/html|DocumentRoot /var/www/html/public|g' \
        /etc/apache2/sites-available/000-default.conf \
    && sed -i 's|<Directory /var/www/>|<Directory /var/www/html/public/>|g' \
        /etc/apache2/apache2.conf \
    && sed -i 's|AllowOverride None|AllowOverride All|g' \
        /etc/apache2/apache2.conf

# ── Composer ──────────────────────────────────────────────────────────────────
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# ── Bake the application + vendor into the image (production deploys) ─────────
# In local dev, docker-compose mounts ./opal-api → /var/www/html, which shadows
# these COPY layers — so the same Dockerfile works in dev and prod.
#
# composer.json & lock copy in their own layer to maximise Docker cache hits
# when only source code (not deps) changes.
COPY composer.json composer.lock /var/www/html/
RUN composer install --no-interaction --no-dev --no-scripts --no-autoloader --prefer-dist
COPY . /var/www/html/
RUN composer dump-autoload --optimize --no-dev \
    && mkdir -p /var/www/html/uploads \
    && chown -R www-data:www-data /var/www/html/uploads \
    && chmod -R 775 /var/www/html/uploads

# ── Entrypoint (runs composer install on first start if vendor/ is missing) ───
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["docker-entrypoint.sh"]
