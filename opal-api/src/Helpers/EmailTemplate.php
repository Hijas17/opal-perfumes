<?php

namespace Opal\Helpers;

/**
 * HTML for order emails.
 *
 * Written the way email has to be written rather than the way a web page is:
 * nested tables for layout, inline styles on every element, no flexbox, no
 * grid, no external stylesheet. Outlook renders none of those, and a
 * transactional email that collapses in a major client is worse than a plain
 * one.
 *
 * Every caller also passes a plain-text version, sent alongside as the
 * alternative body — for clients with images and HTML switched off, and
 * because a text part meaningfully improves deliverability.
 */
class EmailTemplate
{
    private const BLACK = '#0d0d0d';
    private const GOLD  = '#a67b30';
    private const INK   = '#1a1a1a';
    private const MUTED = '#6b6b6b';
    private const LINE  = '#e6e0d6';
    private const CREAM = '#faf7f2';

    /**
     * @param array $order Order document (or its serialized form).
     * @param array $o     heading, intro, cta_label, cta_url, show_address,
     *                     footer_note
     */
    public static function order(array $order, array $o = []): string
    {
        $brand    = self::text(Settings::get('brand_name', 'Opal Perfumes'));
        $currency = $order['currency'] ?? 'AED';
        $number   = self::text($order['order_number'] ?? '');
        $shipping = self::shipping($order);

        $heading = self::text($o['heading'] ?? 'Your order');
        $intro   = self::text($o['intro']   ?? '');

        // Either every row gets a thumbnail column or none does, so the
        // totals underneath can span the right number of cells. A table with
        // ragged column counts renders unpredictably across clients.
        $items = [];
        foreach (($order['items'] ?? []) as $item) {
            $items[] = is_array($item) ? $item : iterator_to_array($item);
        }
        $hasThumbs = false;
        foreach ($items as $item) {
            if (self::imageUrl($item['image'] ?? null) !== null) { $hasThumbs = true; break; }
        }
        $span = $hasThumbs ? 2 : 1;

        $rows = '';
        foreach ($items as $item) {
            $rows .= self::itemRow($item, $currency, $hasThumbs);
        }

        $totals = self::totalRow('Subtotal', self::money($order['subtotal'] ?? 0, $currency), self::INK, false, $span);

        $discount = (float)($order['discount'] ?? 0);
        if ($discount > 0) {
            $coupon = $order['coupon'] ?? [];
            if (!is_array($coupon)) $coupon = iterator_to_array($coupon);
            $label = 'Discount' . (($coupon['code'] ?? '') !== ''
                ? ' (' . self::text($coupon['code']) . ')'
                : '');
            $totals .= self::totalRow($label, '-' . self::money($discount, $currency), self::GOLD, false, $span);
        }

        $fee = (float)($order['shipping_fee'] ?? 0);
        $totals .= self::totalRow('Shipping', $fee > 0 ? self::money($fee, $currency) : 'Free', self::INK, false, $span);
        $totals .= self::totalRow('Total', self::money($order['total'] ?? 0, $currency), self::INK, true, $span);

        $method = ($order['payment_method'] ?? 'cod') === 'card' ? 'Card' : 'Cash on delivery';
        $status = self::text(ucfirst((string)($order['payment_status'] ?? 'pending')));
        $totals .= self::totalRow('Payment', self::text($method) . ' &middot; ' . $status, self::INK, false, $span);

        if (($shipping['notes'] ?? '') !== '') {
            $totals .= self::totalRow('Note', self::text($shipping['notes']), self::INK, false, $span);
        }

        // Class constants cannot be interpolated in a heredoc, so the palette
        // and the optional fragments are bound to locals first.
        $fg_black = self::BLACK;
        $fg_ink   = self::INK;
        $fg_muted = self::MUTED;
        $fg_line  = self::LINE;
        $fg_cream = self::CREAM;

        $orderNumberLine = $number === ''
            ? ''
            : '<p style="margin:12px 0 0;font-size:13px;color:' . self::MUTED . ';">Order '
              . '<span style="font-family:monospace;color:' . self::INK . ';">' . $number . '</span></p>';

        $cta = '';
        if (($o['cta_url'] ?? '') !== '') {
            $cta = self::button(self::text($o['cta_label'] ?? 'View order'), $o['cta_url']);
        }

        $address = ($o['show_address'] ?? true) ? self::addressBlock($shipping) : '';
        $footerNote = ($o['footer_note'] ?? '') !== ''
            ? '<p style="margin:0 0 10px;font-size:13px;line-height:20px;color:' . self::MUTED . ';">'
                . self::text($o['footer_note']) . '</p>'
            : '';

        $contactPhone = (string) Settings::get('contact_phone', '');
        $contactEmail = (string) Settings::get('contact_email', '');
        $contactLine  = trim(implode(' &middot; ', array_filter([
            $contactPhone !== '' ? self::text($contactPhone) : null,
            $contactEmail !== '' ? self::text($contactEmail) : null,
        ])));
        $contactSuffix = $contactLine === '' ? '' : '<br>' . $contactLine;

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{$heading}</title>
</head>
<body style="margin:0;padding:0;background:#f2efe9;font-family:Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f2efe9;padding:24px 12px;">
<tr><td align="center">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#ffffff;border:1px solid {$fg_line};">

  <tr>
    <td align="center" style="background:{$fg_black};padding:22px 24px;">
      <div style="font-size:22px;letter-spacing:6px;color:#ffffff;text-transform:uppercase;font-family:Georgia,'Times New Roman',serif;">{$brand}</div>
    </td>
  </tr>

  <tr>
    <td style="background:{$fg_cream};padding:26px 28px;border-bottom:1px solid {$fg_line};">
      <h1 style="margin:0 0 8px;font-size:21px;line-height:28px;color:{$fg_ink};font-family:Georgia,'Times New Roman',serif;font-weight:normal;">{$heading}</h1>
      <p style="margin:0;font-size:14px;line-height:22px;color:{$fg_muted};">{$intro}</p>
      {$orderNumberLine}
    </td>
  </tr>

  {$cta}

  <tr>
    <td style="padding:26px 28px 6px;">
      <p style="margin:0 0 14px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:{$fg_muted};">Order summary</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        {$rows}
        {$totals}
      </table>
    </td>
  </tr>

  {$address}

  <tr>
    <td style="padding:22px 28px 28px;border-top:1px solid {$fg_line};">
      {$footerNote}
      <p style="margin:0;font-size:12px;line-height:20px;color:{$fg_muted};">
        {$brand}{$contactSuffix}
      </p>
    </td>
  </tr>

</table>

</td></tr>
</table>
</body>
</html>
HTML;
    }

    // ─── Pieces ─────────────────────────────────────────────────────────

    private static function itemRow(array $item, string $currency, bool $withThumb): string
    {
        $name = self::text($item['name'] ?? 'Item');
        $qty  = (int)($item['quantity'] ?? 1);
        $line = self::money((float)($item['price'] ?? 0) * $qty, $currency);
        $img  = self::imageUrl($item['image'] ?? null);

        $thumb = $img === null
            ? ''
            : '<img src="' . self::attr($img) . '" width="56" height="56" alt=""'
              . ' style="display:block;width:56px;height:56px;object-fit:cover;border:1px solid ' . self::LINE . ';">';

        // The cell is emitted even when this particular item has no image, so
        // every row keeps the same shape.
        $thumbCell = $withThumb
            ? '<td width="72" style="padding:10px 0;vertical-align:middle;">' . $thumb . '</td>'
            : '';

        return '<tr>'
            . $thumbCell
            . '<td style="padding:10px 0;font-size:14px;line-height:20px;color:' . self::INK . ';vertical-align:middle;">'
            . $name
            . '<span style="display:block;font-size:12px;color:' . self::MUTED . ';">Quantity: ' . $qty . '</span>'
            . '</td>'
            . '<td align="right" style="padding:10px 0;font-size:14px;color:' . self::INK . ';white-space:nowrap;vertical-align:middle;">'
            . $line
            . '</td>'
            . '</tr>';
    }

    private static function totalRow(
        string $label,
        string $value,
        string $colour = self::INK,
        bool $strong = false,
        int $span = 1,
    ): string {
        $weight = $strong ? 'bold' : 'normal';
        $size   = $strong ? '16px' : '14px';
        $border = $strong ? 'border-top:1px solid ' . self::LINE . ';' : '';

        return '<tr>'
            . '<td colspan="' . $span . '" style="padding:8px 0;' . $border . 'font-size:' . $size . ';color:' . self::MUTED . ';font-weight:' . $weight . ';">'
            . $label . '</td>'
            . '<td align="right" style="padding:8px 0;' . $border . 'font-size:' . $size . ';color:' . $colour . ';font-weight:' . $weight . ';white-space:nowrap;">'
            . $value . '</td>'
            . '</tr>';
    }

    private static function button(string $label, string $url): string
    {
        return '<tr><td align="center" style="padding:22px 28px 0;">'
            . '<a href="' . self::attr($url) . '"'
            . ' style="display:inline-block;background:' . self::BLACK . ';color:#ffffff;text-decoration:none;'
            . 'padding:13px 30px;font-size:13px;letter-spacing:2px;text-transform:uppercase;">'
            . $label . '</a></td></tr>';
    }

    private static function addressBlock(array $shipping): string
    {
        $lines = array_filter([
            $shipping['name']    ?? '',
            $shipping['phone']   ?? '',
            $shipping['address'] ?? '',
            trim(implode(', ', array_filter([$shipping['city'] ?? '', $shipping['country'] ?? '']))),
            $shipping['email']   ?? '',
        ], static fn ($v) => trim((string)$v) !== '');

        $html = '';
        foreach ($lines as $line) {
            $html .= '<span style="display:block;">' . self::text($line) . '</span>';
        }

        return '<tr><td style="padding:8px 28px 22px;">'
            . '<p style="margin:0 0 8px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:' . self::MUTED . ';">Delivery address</p>'
            . '<div style="font-size:13px;line-height:21px;color:' . self::INK . ';background:' . self::CREAM . ';padding:14px 16px;">'
            . $html . '</div></td></tr>';
    }

    // ─── Helpers ────────────────────────────────────────────────────────

    /**
     * Product images are stored as bare filenames, so an absolute base is
     * needed before they can be loaded from an inbox. Without one the image is
     * dropped rather than emitted broken — API_PUBLIC_URL is documented in
     * .env.example.
     */
    private static function imageUrl(mixed $image): ?string
    {
        if (!is_string($image) || $image === '') return null;
        if (str_starts_with($image, 'http://') || str_starts_with($image, 'https://')) {
            return $image;
        }

        $base = trim($_ENV['API_PUBLIC_URL'] ?? getenv('API_PUBLIC_URL') ?: '');
        if ($base === '') return null;

        return rtrim($base, '/') . '/uploads/' . ltrim($image, '/');
    }

    private static function shipping(array $order): array
    {
        $shipping = $order['shipping'] ?? [];
        return is_array($shipping) ? $shipping : iterator_to_array($shipping);
    }

    private static function money(mixed $amount, string $currency): string
    {
        return self::text($currency) . ' ' . number_format((float)$amount, 2);
    }

    private static function text(mixed $value): string
    {
        return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    private static function attr(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
