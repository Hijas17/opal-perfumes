<?php

namespace Opal\Helpers;

use Opal\Config\Database;

/**
 * Read access to the `site_settings` key-value store for server-side code.
 *
 * The admin portal writes these through SettingsController; this is the read
 * side for things like notification recipients, which are configuration rather
 * than content and must never appear in `PUBLIC_KEYS`.
 */
class Settings
{
    /** Used until the admin sets `shipping_fee`. */
    public const DEFAULT_SHIPPING_FEE = 30.0;

    /** Used until the admin sets `free_shipping_threshold`. */
    public const DEFAULT_FREE_SHIPPING_THRESHOLD = 149.0;

    /** Per-request cache — a single order email reads several keys. */
    private static array $cache = [];

    public static function get(string $key, mixed $default = null): mixed
    {
        if (array_key_exists($key, self::$cache)) {
            return self::$cache[$key];
        }

        try {
            $doc = Database::getInstance()->site_settings->findOne(
                ['key' => $key],
                ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']]
            );
            $value = $doc['value'] ?? $default;
        } catch (\Throwable $e) {
            // Throwable, not Exception: a driver or class-loading failure is an
            // Error and would otherwise escape, taking down the order email —
            // or the order — over a lookup that has a perfectly good default.
            error_log("Settings::get({$key}) failed: " . $e->getMessage());
            $value = $default;
        }

        return self::$cache[$key] = $value;
    }

    /**
     * Delivery charge for an order with this subtotal (before any discount).
     *
     * The flat `shipping_fee` applies unless the subtotal reaches
     * `free_shipping_threshold`. A blank or zero threshold means there is no
     * free-shipping level; an unset one falls back to the default. The
     * storefront mirrors this in lib/shipping.ts to preview the fee — keep the
     * two in step, though this is the one that is actually charged.
     */
    public static function shippingFee(float $subtotal): float
    {
        $fee = self::get('shipping_fee');
        $fee = is_numeric($fee) && (float)$fee >= 0 ? (float)$fee : self::DEFAULT_SHIPPING_FEE;

        $threshold = self::get('free_shipping_threshold');
        if ($threshold === null) {
            $threshold = self::DEFAULT_FREE_SHIPPING_THRESHOLD;
        } elseif (!is_numeric($threshold) || (float)$threshold <= 0) {
            $threshold = null;
        } else {
            $threshold = (float)$threshold;
        }

        if ($threshold !== null && $subtotal >= $threshold) {
            return 0.0;
        }
        return round($fee, 2);
    }

    /**
     * Staff addresses that order notifications go to.
     *
     * Falls back to ADMIN_NOTIFICATION_EMAIL so notifications keep working
     * before anyone configures the list in the admin portal.
     *
     * @return string[]
     */
    public static function orderNotificationEmails(): array
    {
        $configured = self::get('order_notification_emails', []);
        if (!is_array($configured)) $configured = [];

        $emails = [];
        foreach ($configured as $entry) {
            $email = trim(is_string($entry) ? $entry : '');
            if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $emails[] = $email;
            }
        }

        if ($emails === []) {
            $fallback = Mailer::adminAddress();
            if ($fallback !== '') $emails[] = $fallback;
        }

        return array_values(array_unique($emails));
    }
}
