<?php

namespace Opal\Helpers;

/**
 * Keeps both sides of an order informed.
 *
 * **Staff** are told when an order arrives and when payment lands, at every
 * address configured under admin → Settings → Order notifications. Without
 * this an order sits silently in the database until someone thinks to look.
 *
 * **Customers** get a confirmation when they order, and an update whenever the
 * fulfilment status changes, so nobody has to email asking where their parcel
 * is.
 *
 * Nothing here throws. A notification that fails must never roll back an order
 * that was paid for — failures are logged and the order stands.
 */
class OrderNotifier
{
    /** Customer-facing wording for each fulfilment status. */
    private const STATUS_MESSAGE = [
        'pending'   => 'We have received your order and will confirm it shortly.',
        'confirmed' => 'Your order is confirmed and is being prepared.',
        'shipped'   => 'Your order is on its way.',
        'delivered' => 'Your order has been delivered. We hope you enjoy it.',
        'cancelled' => 'Your order has been cancelled. If this is unexpected, please contact us.',
    ];

    // ─── Staff ──────────────────────────────────────────────────────────

    /** A new order was placed — cash on delivery, or card awaiting payment. */
    public static function placed(array $order): void
    {
        $paid = ($order['payment_status'] ?? '') === 'paid';
        self::toStaff(
            $order,
            $paid ? 'New paid order' : 'New order',
            $paid ? 'A new order has been paid for.' : 'A new order has been placed.',
        );
    }

    /** Stripe confirmed payment for an order that was awaiting it. */
    public static function paid(array $order): void
    {
        self::toStaff($order, 'Payment received', 'Payment has been received for this order.');
    }

    private static function toStaff(array $order, string $subjectPrefix, string $intro): void
    {
        $recipients = Settings::orderNotificationEmails();
        if ($recipients === []) {
            error_log('OrderNotifier: no staff recipients configured; order ' . ($order['order_number'] ?? '?'));
            return;
        }

        $number   = $order['order_number'] ?? '—';
        $shipping = self::shipping($order);

        $body = "{$intro}\n\n"
            . self::summary($order)
            . "\nDeliver to:\n" . self::address($shipping)
            . "\nManage this order in the admin portal under Orders.\n";

        $customerEmail = trim($shipping['email'] ?? '');

        $html = EmailTemplate::order($order, [
            'heading'     => $subjectPrefix,
            'intro'       => $intro,
            'footer_note' => 'Manage this order in the admin portal under Orders.',
        ]);

        foreach ($recipients as $to) {
            Mailer::send(
                $to,
                "{$subjectPrefix} — {$number}",
                $body,
                // Reply-To is the customer, so hitting reply reaches them.
                $customerEmail !== '' ? $customerEmail : null,
                $shipping['name'] ?? null,
                $html,
            );
        }
    }

    // ─── Customer ───────────────────────────────────────────────────────

    /** Confirmation sent to the customer as soon as the order exists. */
    public static function confirmationToCustomer(array $order): void
    {
        $shipping = self::shipping($order);
        $to       = trim($shipping['email'] ?? '');
        if ($to === '') return;   // Email is optional at checkout.

        $number = $order['order_number'] ?? '';
        $paid   = ($order['payment_status'] ?? '') === 'paid';

        $body = 'Thank you for your order.' . "\n\n"
            . ($paid
                ? "We have received your payment and your order is confirmed.\n\n"
                : "We will contact you shortly to confirm delivery.\n\n")
            . self::summary($order)
            . "\nDelivering to:\n" . self::address($shipping)
            . "\nWe will email you as your order progresses.\n\n"
            . self::signoff();

        $html = EmailTemplate::order($order, [
            'heading'     => 'Thank you for your order',
            'intro'       => $paid
                ? 'We have received your payment and your order is confirmed.'
                : 'We will contact you shortly to confirm delivery.',
            'cta_label'   => 'View your order',
            'cta_url'     => self::orderUrl($order),
            'footer_note' => 'We will email you as your order progresses.',
        ]);

        Mailer::send($to, "Your order {$number}", $body, null, null, $html);
    }

    /**
     * Tell the customer their order has moved to a new fulfilment status.
     *
     * @param string $note Optional free text from the admin — a tracking
     *                     number, a delay explanation — passed straight through.
     */
    public static function statusToCustomer(array $order, string $status, string $note = ''): void
    {
        $shipping = self::shipping($order);
        $to       = trim($shipping['email'] ?? '');
        if ($to === '') return;

        $number  = $order['order_number'] ?? '';
        $message = self::STATUS_MESSAGE[$status] ?? 'There is an update on your order.';

        $body = "Hello " . ($shipping['name'] ?? 'there') . ",\n\n"
            . "{$message}\n\n"
            . "Order: {$number}\n"
            . 'Status: ' . ucfirst($status) . "\n"
            . ($note !== '' ? "\n{$note}\n" : '')
            . "\n" . self::summary($order, false)
            . "\n" . self::signoff();

        $html = EmailTemplate::order($order, [
            'heading'     => ucfirst($status),
            'intro'       => $message,
            'cta_label'   => 'Track your order',
            'cta_url'     => self::orderUrl($order),
            'footer_note' => $note,
        ]);

        Mailer::send(
            $to,
            "Update on your order {$number} — " . ucfirst($status),
            $body,
            null,
            null,
            $html,
        );
    }

    // ─── Shared formatting ──────────────────────────────────────────────

    /**
     * Where the customer can see this order.
     *
     * Empty when STOREFRONT_URL is unset or still points at a dev machine,
     * which drops the button rather than mailing a link to localhost.
     */
    private static function orderUrl(array $order): string
    {
        $base = trim($_ENV['STOREFRONT_URL'] ?? getenv('STOREFRONT_URL') ?: '');
        $id   = isset($order['_id']) ? (string)$order['_id'] : '';
        if ($base === '' || $id === '' || str_contains($base, 'localhost')) return '';
        return rtrim($base, '/') . '/account/orders/' . $id;
    }

    private static function shipping(array $order): array
    {
        $shipping = $order['shipping'] ?? [];
        return is_array($shipping) ? $shipping : iterator_to_array($shipping);
    }

    private static function summary(array $order, bool $withPaymentLine = true): string
    {
        $currency = $order['currency'] ?? 'AED';

        $lines = [];
        foreach (($order['items'] ?? []) as $item) {
            $arr = is_array($item) ? $item : iterator_to_array($item);
            $qty = (int)($arr['quantity'] ?? 1);
            $lines[] = sprintf(
                '  %s x%d — %s %s',
                $arr['name'] ?? 'Item',
                $qty,
                $currency,
                number_format((float)($arr['price'] ?? 0) * $qty, 2),
            );
        }

        $out = 'Order: ' . ($order['order_number'] ?? '—') . "\n";

        if ($withPaymentLine) {
            $method = ($order['payment_method'] ?? 'cod') === 'card'
                ? 'Card'
                : 'Cash on delivery';
            $out .= "Payment: {$method} — " . ($order['payment_status'] ?? 'pending') . "\n";
        }

        $discount = (float)($order['discount'] ?? 0);
        if ($discount > 0) {
            $coupon = $order['coupon'] ?? [];
            if (!is_array($coupon)) $coupon = iterator_to_array($coupon);
            $out .= 'Discount: -' . $currency . ' ' . number_format($discount, 2)
                . ' (' . ($coupon['code'] ?? 'promo') . ")\n";
        }

        $out .= 'Total: ' . $currency . ' ' . number_format((float)($order['total'] ?? 0), 2) . "\n\n"
            . "Items:\n" . implode("\n", $lines) . "\n";

        return $out;
    }

    private static function address(array $shipping): string
    {
        $out = '  ' . ($shipping['name']    ?? '—') . "\n"
             . '  ' . ($shipping['phone']   ?? '—') . "\n"
             . '  ' . ($shipping['address'] ?? '—') . "\n"
             . '  ' . ($shipping['city']    ?? '—') . ', ' . ($shipping['country'] ?? '—') . "\n";

        if (($shipping['notes'] ?? '') !== '') {
            $out .= "  Notes: {$shipping['notes']}\n";
        }
        return $out;
    }

    private static function signoff(): string
    {
        $brand = Settings::get('brand_name', 'Opal Perfumes');
        $phone = Settings::get('contact_phone', '');
        $email = Settings::get('contact_email', '');

        $out = "— {$brand}\n";
        if (is_string($phone) && $phone !== '') $out .= "{$phone}\n";
        if (is_string($email) && $email !== '') $out .= "{$email}\n";
        return $out;
    }
}
