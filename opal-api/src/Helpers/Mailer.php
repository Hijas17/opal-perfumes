<?php

namespace Opal\Helpers;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailException;

/**
 * Outbound mail, in one place.
 *
 * Prefers authenticated SMTP (reliable, lands in the inbox rather than spam)
 * and falls back to PHP's `mail()` when no SMTP host is configured.
 *
 * Sending never throws and never blocks the caller: an order that was paid for
 * must still be recorded even if the notification email fails, so failures are
 * logged and reported through the return value instead.
 */
class Mailer
{
    /**
     * Sender names by message type.
     *
     * Staff receive orders and contact-form enquiries in the same inbox, so
     * the two must be distinguishable at a glance and filterable without
     * reading the subject. Customers see only the brand — internal routing
     * labels are not their business.
     *
     * Each is suffixed onto the brand from MAIL_FROM_NAME, so renaming the
     * brand renames all of them.
     */
    public const AUDIENCE_ORDERS    = 'Orders';
    public const AUDIENCE_ENQUIRIES = 'Enquiries';
    public const AUDIENCE_CUSTOMER  = '';

    /** Brand portion of the sender name, from MAIL_FROM_NAME. */
    public static function brand(): string
    {
        $name = trim($_ENV['MAIL_FROM_NAME'] ?? getenv('MAIL_FROM_NAME') ?: '');
        return $name !== '' ? $name : 'Opal Perfumes';
    }

    /** e.g. "Opal Perfume Orders", or just "Opal Perfume" for customers. */
    public static function senderName(string $audience): string
    {
        $brand = self::brand();
        return $audience === '' ? $brand : $brand . ' ' . $audience;
    }

    /**
     * @param string      $to        Recipient address. A blank address is a no-op.
     * @param string|null $replyTo   Reply-To address — lets the recipient answer
     *                               the customer directly rather than the noreply box.
     * @param string|null $fromName  Overrides the sender name for this one
     *                               message. Pass Mailer::senderName(...) so
     *                               every type stays derived from the brand.
     * @return bool                  True when the message was handed off successfully.
     */
    public static function send(
        string $to,
        string $subject,
        string $body,
        ?string $replyTo = null,
        ?string $replyToName = null,
        ?string $html = null,
        ?string $fromName = null,
    ): bool {
        if (trim($to) === '') {
            error_log("Mailer: no recipient configured; dropping message: {$subject}");
            return false;
        }

        $fromEmail = $_ENV['MAIL_FROM']      ?? 'noreply@opalperfumes.com';
        $fromName  = $fromName !== null && $fromName !== '' ? $fromName : self::brand();
        $smtpHost  = $_ENV['SMTP_HOST']      ?? '';

        if ($smtpHost !== '') {
            $mail = new PHPMailer(true);
            try {
                $mail->isSMTP();
                $mail->Host     = $smtpHost;
                $mail->SMTPAuth = true;
                $mail->Username = $_ENV['SMTP_USER'] ?? '';
                $mail->Password = $_ENV['SMTP_PASS'] ?? '';

                $secure = strtolower($_ENV['SMTP_SECURE'] ?? 'tls');
                $mail->SMTPSecure = $secure === 'ssl'
                    ? PHPMailer::ENCRYPTION_SMTPS
                    : PHPMailer::ENCRYPTION_STARTTLS;
                $mail->Port = (int)($_ENV['SMTP_PORT'] ?? ($secure === 'ssl' ? 465 : 587));

                $mail->setFrom($fromEmail, $fromName);
                $mail->addAddress($to);
                if ($replyTo !== null && $replyTo !== '') {
                    $mail->addReplyTo($replyTo, $replyToName ?? '');
                }

                $mail->Subject = $subject;
                if ($html !== null && $html !== '') {
                    $mail->isHTML(true);
                    $mail->Body    = $html;
                    // Plain-text alternative: for clients with HTML off, and
                    // because a text part meaningfully helps deliverability.
                    $mail->AltBody = $body;
                } else {
                    $mail->Body = $body;
                }

                $mail->send();
                return true;
            } catch (MailException $e) {
                error_log('SMTP send failed: ' . $mail->ErrorInfo);
                // fall through to mail() as a last resort
            }
        }

        // mail() fallback: send whichever single part we have. Hand-rolling
        // a multipart message here would be more ways to get it wrong than
        // it is worth for a path that only runs when SMTP is unconfigured.
        $isHtml      = $html !== null && $html !== '';
        $contentType = $isHtml ? 'text/html' : 'text/plain';
        $payload     = $isHtml ? $html : $body;
        $headers = "From: {$fromName} <{$fromEmail}>" . "\r\n"
            . "MIME-Version: 1.0" . "\r\n"
            . "Content-Type: {$contentType}; charset=UTF-8";
        if ($replyTo !== null && $replyTo !== '') {
            $name    = $replyToName !== null && $replyToName !== '' ? "{$replyToName} " : '';
            $headers .= "\r\nReply-To: {$name}<{$replyTo}>";
        }

        if (!@mail($to, $subject, $payload, $headers)) {
            error_log("Failed to send email to {$to}: {$subject}");
            return false;
        }
        return true;
    }

    /** The address order and inquiry notifications go to. */
    public static function adminAddress(): string
    {
        return trim($_ENV['ADMIN_NOTIFICATION_EMAIL'] ?? '');
    }
}
