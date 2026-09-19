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
