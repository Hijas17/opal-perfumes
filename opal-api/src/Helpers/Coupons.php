<?php

namespace Opal\Helpers;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;
use Opal\Config\Database;

/**
 * Coupon validation and discount calculation.
 *
 * One entry point, `evaluate()`, used both by the checkout's "check this code"
 * request and by order placement. They must never disagree: a code that
 * previews as valid and then fails at submission, or previews one discount and
 * charges another, is worse than not offering coupons at all.
 *
 * Nothing here trusts the client. The caller passes the server-side cart, and
 * the discount is computed from stored prices.
 */
class Coupons
{
    /**
     * Check a code against a cart and work out what it's worth.
     *
     * @param array       $items      Server-side cart items (name, price, quantity, …).
     * @param string|null $customerId Used for the per-customer usage limit.
     *
     * @return array{ok: bool, message: string, discount: float, code: string, coupon: ?array}
     */
    public static function evaluate(
        string $code,
        array $items,
        ?string $customerId = null,
    ): array {
        $code = strtoupper(trim($code));
        if ($code === '') {
            return self::fail('Enter a promo code.');
        }

        $db     = Database::getInstance();
        $coupon = $db->coupons->findOne(
            ['code' => $code],
            ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']]
        );

        // Deliberately the same message for "no such code" and "switched off":
        // it stops the endpoint being used to enumerate which codes exist.
        if (!$coupon || ($coupon['status'] ?? 'active') !== 'active') {
            return self::fail('That promo code is not valid.');
        }

        $now = time();
        $startsAt = $coupon['starts_at'] ?? null;
        if ($startsAt instanceof UTCDateTime && $startsAt->toDateTime()->getTimestamp() > $now) {
            return self::fail('That promo code is not active yet.');
        }
        $endsAt = $coupon['ends_at'] ?? null;
        if ($endsAt instanceof UTCDateTime && $endsAt->toDateTime()->getTimestamp() < $now) {
            return self::fail('That promo code has expired.');
        }

        // ── Cart totals ──────────────────────────────────────────────────
        $subtotal = 0.0;
        foreach ($items as $item) {
            $arr = is_array($item) ? $item : iterator_to_array($item);
            $subtotal += (float)($arr['price'] ?? 0) * max(1, (int)($arr['quantity'] ?? 1));
        }
        $subtotal = round($subtotal, 2);

        $minOrder = isset($coupon['min_order']) ? (float)$coupon['min_order'] : 0.0;
        if ($minOrder > 0 && $subtotal < $minOrder) {
            return self::fail(sprintf(
                'This code needs a minimum order of %s %s.',
                $items[0]['currency'] ?? 'AED',
                number_format($minOrder, 2),
            ));
        }

        // ── Which items the code applies to ──────────────────────────────
        $eligible = self::eligibleSubtotal($coupon, $items);
        if ($eligible <= 0) {
            return self::fail('This code does not apply to anything in your cart.');
        }

        // ── Usage limits ─────────────────────────────────────────────────
        // Counted from the orders themselves rather than a stored counter, so
        // the number can't drift out of step with reality. Failed payments
        // don't count — an abandoned card checkout shouldn't burn a redemption.
        $maxRedemptions = isset($coupon['max_redemptions']) ? (int)$coupon['max_redemptions'] : 0;
        if ($maxRedemptions > 0) {
            $used = $db->orders->countDocuments([
                'coupon.code'    => $code,
                'payment_status' => ['$ne' => 'failed'],
            ]);
            if ($used >= $maxRedemptions) {
                return self::fail('That promo code has been fully redeemed.');
            }
        }

        $maxPerCustomer = isset($coupon['max_per_customer']) ? (int)$coupon['max_per_customer'] : 0;
        if ($maxPerCustomer > 0 && $customerId) {
            $usedByCustomer = $db->orders->countDocuments([
                'coupon.code'    => $code,
                'customer_id'    => new ObjectId($customerId),
                'payment_status' => ['$ne' => 'failed'],
            ]);
            if ($usedByCustomer >= $maxPerCustomer) {
                return self::fail('You have already used this promo code.');
            }
        }

        // ── The discount itself ──────────────────────────────────────────
        $discount = self::amount($coupon, $eligible);
        if ($discount <= 0) {
            return self::fail('That promo code is not valid.');
        }

        return [
            'ok'       => true,
            'message'  => 'Promo code applied.',
            'discount' => $discount,
            'code'     => $code,
            'coupon'   => $coupon,
        ];
    }

    /**
     * The snapshot stored on the order.
     *
     * Recorded in full rather than referenced by id, so the order still
     * explains itself after the coupon is edited or deleted — a year from now
     * "20% off, capped at 50" must still be readable from the order alone.
     */
    public static function snapshot(array $coupon, float $discount): array
    {
        return [
            'code'         => $coupon['code'] ?? '',
            'type'         => $coupon['type'] ?? 'fixed',
            'value'        => (float)($coupon['value'] ?? 0),
            'max_discount' => isset($coupon['max_discount']) ? (float)$coupon['max_discount'] : null,
            'discount'     => round($discount, 2),
            'applied_at'   => new UTCDateTime(),
        ];
    }

    // ─── Internals ──────────────────────────────────────────────────────

    /** Sum of the cart items this coupon is allowed to discount. */
    private static function eligibleSubtotal(array $coupon, array $items): float
    {
        $appliesTo = $coupon['applies_to'] ?? null;
        if ($appliesTo !== null && !is_array($appliesTo)) $appliesTo = iterator_to_array($appliesTo);

        $scope = $appliesTo['scope'] ?? 'all';

        $productIds  = self::stringList($appliesTo['product_ids']        ?? []);
        $subcatSlugs = self::stringList($appliesTo['subcategory_slugs']  ?? []);

        $total = 0.0;
        foreach ($items as $item) {
            $arr  = is_array($item) ? $item : iterator_to_array($item);
            $line = (float)($arr['price'] ?? 0) * max(1, (int)($arr['quantity'] ?? 1));

            $matches = match ($scope) {
                'products'      => in_array((string)($arr['product_id'] ?? ''), $productIds, true),
                'subcategories' => in_array((string)($arr['subcategory_slug'] ?? ''), $subcatSlugs, true),
                default         => true,
            };

            if ($matches) $total += $line;
        }

        return round($total, 2);
    }

    /** Percentage (optionally capped) or flat amount, never more than eligible. */
    private static function amount(array $coupon, float $eligible): float
    {
        $type  = $coupon['type']  ?? 'fixed';
        $value = (float)($coupon['value'] ?? 0);

        if ($type === 'percentage') {
            $discount = $eligible * ($value / 100);
            $cap = isset($coupon['max_discount']) ? (float)$coupon['max_discount'] : 0.0;
            if ($cap > 0) $discount = min($discount, $cap);
        } else {
            $discount = $value;
        }

        // A discount can never exceed what it applies to — otherwise a fixed
        // AED 50 code on a AED 30 cart would produce a negative total.
        return round(min($discount, $eligible), 2);
    }

    /** @return string[] */
    private static function stringList(mixed $value): array
    {
        if (!is_array($value) && !($value instanceof \Traversable)) return [];
        $out = [];
        foreach ($value as $entry) {
            if (is_string($entry) && $entry !== '') $out[] = $entry;
        }
        return $out;
    }

    private static function fail(string $message): array
    {
        return ['ok' => false, 'message' => $message, 'discount' => 0.0, 'code' => '', 'coupon' => null];
    }
}
