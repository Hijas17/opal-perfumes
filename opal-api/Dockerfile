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

# ── Entrypoint (runs composer install at start if vendor/ is missing) ─────────
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

WORKDIR /var/www/html

EXPOSE 80

ENTRYPOINT ["docker-entrypoint.sh"]
