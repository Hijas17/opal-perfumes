<?php

namespace Opal\Controllers;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;
use Opal\Config\Database;
use Opal\Config\Stripe as StripeConfig;
use Opal\Helpers\OrderNotifier;
use Opal\Helpers\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Admin-side order management: list, inspect, and advance an order's status.
 *
 * Distinct from the customer-facing OrderController, which is scoped to the
 * requesting customer and hides payment internals. This one sees every order
 * and joins in the customer record, so it sits behind AuthMiddleware.
 */
class AdminOrderController
{
    private const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    private const PER_PAGE = 30;

    /** Paginated list, newest first, filterable by status and payment state. */
    public function index(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $params = $request->getQueryParams();
        $filter = [];

        $status = $params['status'] ?? '';
        if ($status !== '' && in_array($status, self::STATUSES, true)) {
            $filter['status'] = $status;
        }

        $paymentStatus = $params['payment_status'] ?? '';
        if ($paymentStatus !== '' && in_array($paymentStatus, ['pending', 'paid', 'refunded', 'failed'], true)) {
            $filter['payment_status'] = $paymentStatus;
        }

        $paymentMethod = $params['payment_method'] ?? '';
        if ($paymentMethod !== '' && in_array($paymentMethod, ['cod', 'card'], true)) {
            $filter['payment_method'] = $paymentMethod;
        }

        // Free-text search over the order number and the recipient's details —
        // the three things someone has to hand when a customer calls.
        $search = trim($params['search'] ?? '');
        if ($search !== '') {
            $rx = new \MongoDB\BSON\Regex(preg_quote($search, '/'), 'i');
            $filter['$or'] = [
                ['order_number'     => $rx],
                ['shipping.name'    => $rx],
                ['shipping.phone'   => $rx],
                ['shipping.email'   => $rx],
            ];
        }

        $page = max(1, (int)($params['page'] ?? 1));

        try {
            $db    = Database::getInstance();
            $total = $db->orders->countDocuments($filter);

            $cursor = $db->orders->find($filter, [
                'sort'    => ['created_at' => -1],
                'limit'   => self::PER_PAGE,
                'skip'    => ($page - 1) * self::PER_PAGE,
                'typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array'],
            ]);

            $orders = [];
            foreach ($cursor as $o) $orders[] = $this->serialize($o);

            return Response::json($response, [
                'error' => false,
                'data'  => $orders,
                'meta'  => [
                    'page'        => $page,
                    'per_page'    => self::PER_PAGE,
                    'total'       => $total,
                    'total_pages' => (int)ceil($total / self::PER_PAGE),
                ],
            ]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to fetch orders: ' . $e->getMessage(), 500);
        }
    }

    /** One order, with the customer record joined in. */
    public function show(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = $args['id'] ?? '';
        if ($id === '') return Response::error($response, 'Order id required.', 400);

        try {
            $db    = Database::getInstance();
            $order = $db->orders->findOne(
                ['_id' => new ObjectId($id)],
                ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']]
            );
            if (!$order) return Response::error($response, 'Order not found.', 404);

            $data = $this->serialize($order, true);

            if (isset($order['customer_id'])) {
                $customer = $db->customers->findOne(
                    ['_id' => $order['customer_id']],
                    ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']]
                );
                if ($customer) {
                    $data['customer'] = [
                        'id'    => (string)$customer['_id'],
                        'name'  => $customer['name']  ?? '',
                        'email' => $customer['email'] ?? '',
                        'phone' => $customer['phone'] ?? '',
                    ];
                }
            }

            return Response::json($response, ['error' => false, 'data' => $data]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to fetch order: ' . $e->getMessage(), 500);
        }
    }

    /** Advance the fulfilment status, appending to the audit trail. */
    public function updateStatus(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = $args['id'] ?? '';
        if ($id === '') return Response::error($response, 'Order id required.', 400);

        $body   = $request->getParsedBody();
        $status = strtolower(trim($body['status'] ?? ''));
        $note   = trim($body['note'] ?? '');
        // Defaults to true: the customer should hear about a status change
        // unless someone deliberately opts out (e.g. fixing a mis-click).
        $notifyCustomer = ($body['notify_customer'] ?? true) !== false;

        if (!in_array($status, self::STATUSES, true)) {
            return Response::error(
                $response,
                'Status must be one of: ' . implode(', ', self::STATUSES) . '.',
                400
            );
        }

        try {
            $db  = Database::getInstance();
            $now = new UTCDateTime();

            $result = $db->orders->updateOne(
                ['_id' => new ObjectId($id)],
                [
                    '$set'  => ['status' => $status, 'updated_at' => $now],
                    // Never rewrite history — every change appends.
                    '$push' => ['status_history' => [
                        'status' => $status,
                        'note'   => $note !== '' ? $note : 'Status updated by admin',
                        'at'     => $now,
                    ]],
                ]
            );

            if ($result->getMatchedCount() === 0) {
                return Response::error($response, 'Order not found.', 404);
            }

            $order = $db->orders->findOne(
                ['_id' => new ObjectId($id)],
                ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']]
            );

            $emailed = false;
            if ($notifyCustomer && $order) {
                OrderNotifier::statusToCustomer($order, $status, $note);
                $shipping = $order['shipping'] ?? [];
                if (!is_array($shipping)) $shipping = iterator_to_array($shipping);
                $emailed = trim($shipping['email'] ?? '') !== '';
            }

            return Response::json($response, [
                'error'   => false,
                'message' => $emailed
                    ? 'Order status updated and the customer was emailed.'
                    : 'Order status updated.',
                'data'    => $this->serialize($order, true),
            ]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to update order: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Refund a card payment and cancel the order.
     *
     * Deliberately one action rather than two. A refund without a cancellation
     * leaves an order that looks live but has been paid back, and a
     * cancellation without a refund leaves the customer out of pocket; together
     * is the only combination that is ever correct here.
     *
     * Stripe is the source of truth for whether money moved, so the refund is
     * created first and the order is rewritten only once Stripe confirms. A
     * failure leaves the order exactly as it was.
     */
    public function refund(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = $args['id'] ?? '';
        if ($id === '') return Response::error($response, 'Order id required.', 400);

        $body = $request->getParsedBody();
        $note = trim($body['note'] ?? '');

        if (!StripeConfig::isConfigured()) {
            return Response::error($response, 'Stripe is not configured, so no refund can be issued.', 503);
        }

        try {
            $db    = Database::getInstance();
            $order = $db->orders->findOne(
                ['_id' => new ObjectId($id)],
                ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']]
            );
            if (!$order) return Response::error($response, 'Order not found.', 404);

            if (($order['payment_method'] ?? 'cod') !== 'card') {
                return Response::error(
                    $response,
                    'This order was not paid by card. Cancel it instead and settle any money directly.',
                    400
                );
            }
            if (($order['payment_status'] ?? '') !== 'paid') {
                return Response::error($response, 'Only a paid order can be refunded.', 400);
            }

            $payment = $order['payment'] ?? [];
            if (!is_array($payment)) $payment = iterator_to_array($payment);
            $intentId = $payment['payment_intent_id'] ?? null;
            if (!$intentId) {
                return Response::error(
                    $response,
                    'No Stripe payment is recorded against this order, so it cannot be refunded here.',
                    400
                );
            }

            $total = (float)($order['total'] ?? 0);

            // Partial refunds are allowed, but anything at or above the total
            // counts as a full one, so rounding can never leave a stray
            // fraction behind and quietly block the coupon from being released.
            $requested = $body['amount'] ?? null;
            $amount    = ($requested === null || $requested === '')
                ? $total
                : round((float)$requested, 2);

            if ($amount <= 0) {
                return Response::error($response, 'The refund amount must be greater than zero.', 400);
            }
            if ($amount > $total) {
                return Response::error($response, 'The refund cannot exceed the order total.', 400);
            }
            $isFull = $amount >= $total;

            $refund = StripeConfig::getClient()->refunds->create([
                'payment_intent' => $intentId,
                'amount'         => (int) round($amount * 100),
                'metadata'       => [
                    'order_id'     => $id,
                    'order_number' => $order['order_number'] ?? '',
                ],
            ]);

            $now        = new UTCDateTime();
            $currency   = $order['currency'] ?? 'AED';
            $amountText = $currency . ' ' . number_format($amount, 2);
            $historyNote = ($isFull ? 'Refunded ' : 'Partially refunded ') . $amountText
                . ($note !== '' ? ' - ' . $note : '');

            $set = [
                'payment.refund_id'       => $refund->id,
                'payment.refunded_amount' => $amount,
                'payment.refunded_at'     => $now,
                'updated_at'              => $now,
            ];

            // Only a full refund cancels the order and releases the coupon. A
            // partial refund is an adjustment, not an undoing.
            if ($isFull) {
                $set['payment_status'] = 'refunded';
                $set['status']         = 'cancelled';
            }

            $db->orders->updateOne(['_id' => new ObjectId($id)], [
                '$set'  => $set,
                '$push' => ['status_history' => [
                    'status' => $isFull ? 'cancelled' : ($order['status'] ?? 'pending'),
                    'note'   => $historyNote,
                    'at'     => $now,
                ]],
            ]);

            $fresh = $db->orders->findOne(
                ['_id' => new ObjectId($id)],
                ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']]
            );

            OrderNotifier::refundedToCustomer($fresh, $amount, $isFull, $note);

            return Response::json($response, [
                'error'   => false,
                'message' => $isFull
                    ? "Refunded {$amountText} and cancelled the order."
                    : "Refunded {$amountText}.",
                'data'    => $this->serialize($fresh, true),
            ]);
        } catch (\Stripe\Exception\ApiErrorException $e) {
            // Stripe refused, so no money moved and the order is untouched.
            return Response::error($response, 'Stripe refused the refund: ' . $e->getMessage(), 400);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to refund: ' . $e->getMessage(), 500);
        }
    }

    // ─── Helpers ────────────────────────────────────────────────────────

    /**
     * @param bool $full Include line items and the status history. Omitted from
     *                   list responses, which would otherwise carry every item
     *                   of thirty orders to render a table of totals.
     */
    private function serialize(array $order, bool $full = false): array
    {
        $shipping = $order['shipping'] ?? [];
        if (!is_array($shipping)) $shipping = iterator_to_array($shipping);

        $payment = $order['payment'] ?? null;
        if ($payment !== null && !is_array($payment)) $payment = iterator_to_array($payment);

        $coupon = $order['coupon'] ?? null;
        if ($coupon !== null && !is_array($coupon)) $coupon = iterator_to_array($coupon);

        $createdAt = $order['created_at'] ?? null;
        $updatedAt = $order['updated_at'] ?? null;

        $data = [
            'id'             => isset($order['_id']) ? (string)$order['_id'] : '',
            'order_number'   => $order['order_number']   ?? '',
            'subtotal'       => (float)($order['subtotal']     ?? 0),
            'discount'       => (float)($order['discount']     ?? 0),
            'coupon'         => $coupon === null ? null : [
                'code'     => $coupon['code'] ?? '',
                'type'     => $coupon['type'] ?? '',
                'value'    => (float)($coupon['value']    ?? 0),
                'discount' => (float)($coupon['discount'] ?? 0),
            ],
            'shipping_fee'   => (float)($order['shipping_fee'] ?? 0),
            'total'          => (float)($order['total']        ?? 0),
            'currency'       => $order['currency']       ?? 'AED',
            'payment_method' => $order['payment_method'] ?? 'cod',
            'payment_status' => $order['payment_status'] ?? 'pending',
            'status'         => $order['status']         ?? 'pending',
            'shipping'       => $shipping,
            'item_count'     => count($order['items'] ?? []),
            'created_at'     => $createdAt instanceof UTCDateTime ? $createdAt->toDateTime()->format(\DateTime::ATOM) : null,
            'updated_at'     => $updatedAt instanceof UTCDateTime ? $updatedAt->toDateTime()->format(\DateTime::ATOM) : null,
        ];

        if (!$full) return $data;

        $items = [];
        foreach (($order['items'] ?? []) as $item) {
            $arr = is_array($item) ? $item : iterator_to_array($item);
            $items[] = [
                'product_id'       => $arr['product_id']       ?? '',
                'name'             => $arr['name']             ?? '',
                'slug'             => $arr['slug']             ?? '',
                'subcategory_slug' => $arr['subcategory_slug'] ?? null,
                'price'            => (float)($arr['price']    ?? 0),
                'currency'         => $arr['currency']         ?? 'AED',
                'image'            => $arr['image']            ?? null,
                'quantity'         => (int)($arr['quantity']   ?? 1),
            ];
        }

        $history = [];
        foreach (($order['status_history'] ?? []) as $h) {
            $arr = is_array($h) ? $h : iterator_to_array($h);
            $at  = $arr['at'] ?? null;
            $history[] = [
                'status' => $arr['status'] ?? '',
                'note'   => $arr['note']   ?? '',
                'at'     => $at instanceof UTCDateTime ? $at->toDateTime()->format(\DateTime::ATOM) : null,
            ];
        }

        $paidAt = $payment['paid_at'] ?? null;

        $data['items']          = $items;
        $data['status_history'] = $history;
        // Admin sees the PaymentIntent id — it's the handle for refunds in the
        // Stripe Dashboard.
        $refundedAt = $payment['refunded_at'] ?? null;
        $data['payment'] = $payment === null ? null : [
            'stripe_session_id' => $payment['stripe_session_id'] ?? null,
            'payment_intent_id' => $payment['payment_intent_id'] ?? null,
            'paid_at'           => $paidAt instanceof UTCDateTime ? $paidAt->toDateTime()->format(\DateTime::ATOM) : null,
            'refund_id'         => $payment['refund_id'] ?? null,
            'refunded_amount'   => isset($payment['refunded_amount']) ? (float)$payment['refunded_amount'] : null,
            'refunded_at'       => $refundedAt instanceof UTCDateTime ? $refundedAt->toDateTime()->format(\DateTime::ATOM) : null,
        ];

        return $data;
    }
}
