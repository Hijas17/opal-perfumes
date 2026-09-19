<?php

namespace Opal\Controllers;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;
use Opal\Config\Database;
use Opal\Config\Stripe as StripeConfig;
use Opal\Helpers\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Stripe webhook receiver — the *only* place an order becomes paid.
 *
 * Fulfilment deliberately does not live on the checkout success page. A
 * customer can pay and then close the tab or lose signal before the redirect
 * lands, and with delayed-notification payment methods the money arrives hours
 * later with no browser involved at all. Anything driven off the success page
 * silently drops those orders.
 *
 * This route is public (Stripe has no JWT) but not unauthenticated: every
 * request must carry a valid `Stripe-Signature` computed with the endpoint's
 * signing secret, which is verified before a single field is read.
 */
class StripeWebhookController
{
    public function handle(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $secret = StripeConfig::webhookSecret();
        if ($secret === '') {
            // Fail closed. An unverified endpoint would let anyone who can reach
            // the API mark any order paid.
            error_log('[stripe] webhook received but STRIPE_WEBHOOK_SECRET is not set — rejected.');
            return Response::error($response, 'Webhook not configured.', 500);
        }

        // Casting the stream to string rewinds it first, so this still returns
        // the exact bytes Stripe signed even though the body-parsing middleware
        // has already read the stream to its end.
        $payload   = (string) $request->getBody();
        $signature = $request->getHeaderLine('Stripe-Signature');

        try {
            $event = \Stripe\Webhook::constructEvent($payload, $signature, $secret);
        } catch (\UnexpectedValueException $e) {
            return Response::error($response, 'Invalid payload.', 400);
        } catch (\Stripe\Exception\SignatureVerificationException $e) {
            return Response::error($response, 'Invalid signature.', 400);
        }

        try {
            switch ($event->type) {
                // `completed` fires as soon as the customer finishes the form —
                // which for a delayed-notification method is *before* the money
                // has actually moved. Both handlers therefore gate on
                // payment_status rather than trusting the event name.
                case 'checkout.session.completed':
                case 'checkout.session.async_payment_succeeded':
                    $this->fulfil($event->data->object);
                    break;

                case 'checkout.session.async_payment_failed':
                    $this->markFailed($event->data->object, 'Payment failed.');
                    break;

                case 'checkout.session.expired':
                    $this->markFailed($event->data->object, 'Checkout session expired before payment.');
                    break;
            }
        } catch (\Exception $e) {
            // A 500 makes Stripe retry with backoff, which is what we want for a
            // transient database failure. The event itself was valid.
            error_log('[stripe] failed handling ' . $event->type . ': ' . $e->getMessage());
            return Response::error($response, 'Handler error.', 500);
        }

        return Response::json($response, ['received' => true]);
    }

    // ─── Fulfilment ─────────────────────────────────────────────────────

    /**
     * Mark the order paid and clear the customer's cart.
     *
     * Stripe retries events and `completed` can be followed by
     * `async_payment_succeeded` for the same session, so this must be safe to
     * run more than once — the update is conditioned on the order still being
     * unpaid, and a second run matches nothing.
     */
    private function fulfil(\Stripe\Checkout\Session $session): void
    {
        if ($session->payment_status === 'unpaid') {
            return; // Money hasn't moved yet — wait for async_payment_succeeded.
        }

        $orderId = $session->metadata['order_id'] ?? null;
        if (!$orderId) {
            error_log('[stripe] session ' . $session->id . ' has no order_id metadata.');
            return;
        }

        $db  = Database::getInstance();
        $now = new UTCDateTime();

        $result = $db->orders->updateOne(
            [
                '_id'            => new ObjectId($orderId),
                'payment_status' => ['$ne' => 'paid'],   // idempotency guard
            ],
            [
                '$set' => [
                    'payment_status'             => 'paid',
                    'status'                     => 'confirmed',
                    'payment.stripe_session_id'  => $session->id,
                    'payment.payment_intent_id'  => is_string($session->payment_intent)
                        ? $session->payment_intent
                        : ($session->payment_intent->id ?? null),
                    'payment.paid_at'            => $now,
                    'updated_at'                 => $now,
                ],
                '$push' => [
                    'status_history' => [
                        'status' => 'confirmed',
                        'note'   => 'Payment received via Stripe.',
                        'at'     => $now,
                    ],
                ],
            ]
        );

        if ($result->getModifiedCount() === 0) {
            return; // Already fulfilled by an earlier delivery of this event.
        }

        // The cart is held until payment lands, so an abandoned checkout leaves
        // the customer's basket intact. Clear it only now.
        $order = $db->orders->findOne(
            ['_id' => new ObjectId($orderId)],
            ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']]
        );
        if ($order && isset($order['customer_id'])) {
            $db->carts->updateOne(
                ['customer_id' => $order['customer_id']],
                ['$set' => ['items' => [], 'updated_at' => $now]]
            );
        }
    }

    /** Record a failed or abandoned payment without touching a paid order. */
    private function markFailed(\Stripe\Checkout\Session $session, string $note): void
    {
        $orderId = $session->metadata['order_id'] ?? null;
        if (!$orderId) return;

        $now = new UTCDateTime();
        Database::getInstance()->orders->updateOne(
            [
                '_id'            => new ObjectId($orderId),
                'payment_status' => 'pending',   // never downgrade a paid order
            ],
            [
                '$set'  => [
                    'payment_status' => 'failed',
                    'updated_at'     => $now,
                ],
                '$push' => [
                    'status_history' => ['status' => 'pending', 'note' => $note, 'at' => $now],
                ],
            ]
        );
    }
}
