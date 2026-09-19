<?php

namespace Opal\Config;

use Stripe\StripeClient;

/**
 * Stripe client factory.
 *
 * The secret lives only in the environment — never in source, never in the
 * repo, never sent to the browser. Prefer a **restricted** key (`rk_…`) over a
 * full secret key (`sk_…`): scope it to write Checkout Sessions and read
 * PaymentIntents and nothing else, so a leak can't drain the account.
 *
 * Reads `$_ENV` first (phpdotenv in local dev) then `getenv()` (Docker/Fly
 * secrets in production), matching how the rest of the API resolves config.
 */
class Stripe
{
    /** Pinned so a Stripe-side default bump can never silently change response shapes. */
    public const API_VERSION = '2026-08-26.dahlia';

    /**
     * Tags every Checkout Session so this flow can be compared against others
     * in the Dashboard. The random suffix is fixed, not regenerated per call —
     * a per-call suffix would scatter every session into its own bucket.
     */
    public const INTEGRATION_IDENTIFIER = 'opal-embedded-checkout-kqvmztbr';

    private static ?StripeClient $client = null;

    /** True when a secret key is configured — used to fail closed on `card`. */
    public static function isConfigured(): bool
    {
        return self::env('STRIPE_SECRET_KEY') !== '';
    }

    public static function getClient(): StripeClient
    {
        if (self::$client === null) {
            $key = self::env('STRIPE_SECRET_KEY');
            if ($key === '') {
                throw new \RuntimeException('STRIPE_SECRET_KEY is not set.');
            }
            // Instance client, not the deprecated global `Stripe::setApiKey()`.
            self::$client = new StripeClient([
                'api_key'          => $key,
                'stripe_version'   => self::API_VERSION,
            ]);
        }
        return self::$client;
    }

    public static function webhookSecret(): string
    {
        return self::env('STRIPE_WEBHOOK_SECRET');
    }

    /**
     * Storefront origin used to build Checkout return URLs.
     *
     * Guarded, because the failure mode is otherwise invisible until it has
     * already cost a real sale: with a live key and an unset `STOREFRONT_URL`,
     * every paying customer would be redirected to `localhost` and left
     * staring at a dead page, while the order sits paid in the database.
     * Better to refuse to create the session at all.
     */
    public static function storefrontUrl(): string
    {
        $url = rtrim(self::env('STOREFRONT_URL'), '/');

        if (self::isLiveMode() && (
            $url === ''
            || str_contains($url, 'localhost')
            || str_contains($url, '127.0.0.1')
        )) {
            throw new \RuntimeException(
                'STOREFRONT_URL must be set to the public storefront origin when using a live Stripe key.'
            );
        }

        return $url !== '' ? $url : 'http://localhost:3000';
    }

    /** True when the configured key is a live-mode key rather than a test one. */
    public static function isLiveMode(): bool
    {
        return str_contains(self::env('STRIPE_SECRET_KEY'), '_live_');
    }

    private static function env(string $name): string
    {
        $value = $_ENV[$name] ?? getenv($name);
        return is_string($value) ? trim($value) : '';
    }
}
