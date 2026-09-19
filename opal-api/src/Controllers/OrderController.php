<?php

namespace Opal\Controllers;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;
use Opal\Config\Database;
use Opal\Config\Stripe as StripeConfig;
use Opal\Helpers\CartResolver;
use Opal\Helpers\Coupons;
use Opal\Helpers\OrderNotifier;
use Opal\Helpers\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Customer-facing order endpoints.
 *
 * Two payment paths, both building the same order document from the cart the
 * storefront sends with the request (re-priced server-side by CartResolver):
 *
 *  - `cod`  — order is placed outright and the cart is cleared immediately.
 *  - `card` — order is written as `pending` and a Stripe Checkout Session is
 *             returned for the browser to mount. The cart is *not* cleared
 *             here; the webhook clears it once the money actually lands, so an
 *             abandoned checkout leaves the basket intact.
 */
class OrderController
{
    private const ORDER_STATUSES  = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    private const PAYMENT_METHODS = ['cod', 'card'];

    /** Create order from the current cart (customer-facing). */
    public function place(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $customerId = $request->getAttribute('customer_id');
        if (!$customerId) return Response::error($response, 'Unauthorised.', 401);

        $body = $request->getParsedBody();

        // ── Validate shipping ────────────────────────────────────────────
        $shipping = [
            'name'    => trim($body['shipping']['name']    ?? ''),
            'phone'   => trim($body['shipping']['phone']   ?? ''),
            'email'   => trim($body['shipping']['email']   ?? ''),
            'address' => trim($body['shipping']['address'] ?? ''),
            'city'    => trim($body['shipping']['city']    ?? ''),
            'country' => trim($body['shipping']['country'] ?? 'UAE'),
            'notes'   => trim($body['shipping']['notes']   ?? ''),
        ];

        foreach (['name', 'phone', 'address', 'city'] as $required) {
            if ($shipping[$required] === '') {
                return Response::error($response, "Shipping {$required} is required.", 400);
            }
        }

        $paymentMethod = strtolower(trim($body['payment_method'] ?? 'cod'));
        if (!in_array($paymentMethod, self::PAYMENT_METHODS, true)) {
            return Response::error($response, 'Unsupported payment method.', 400);
        }
        if ($paymentMethod === 'card' && !StripeConfig::isConfigured()) {
            // Fail closed rather than writing an order nobody can ever pay for.
            return Response::error($response, 'Card payment is not available right now.', 503);
        }

        try {
            $db = Database::getInstance();

            // The storefront keeps its cart in localStorage, so the basket
            // arrives with the request. Only ids and quantities are taken from
            // it — CartResolver re-reads every price from the products
            // collection, so a tampered payload cannot change what is charged.
            // Falls back to a server-side cart for any client that still keeps
            // one.
            if (isset($body['items'])) {
                $resolved = CartResolver::resolve($body['items']);
                if ($resolved['error'] !== null) {
                    return Response::error($response, $resolved['error'], 400);
                }
                $items = $resolved['items'];
            } else {
                $cart = $db->carts->findOne(
                    ['customer_id' => new ObjectId($customerId)],
                    ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']]
                );
                $items = $cart['items'] ?? [];
                if (empty($items)) {
                    return Response::error($response, 'Your cart is empty.', 400);
                }
            }

            // Normalise + recompute totals server-side (never trust client totals)
            $orderItems = [];
            $subtotal   = 0.0;
            $currency   = 'AED';
            foreach ($items as $item) {
                $arr = is_array($item) ? $item : iterator_to_array($item);
                $price    = (float)($arr['price']    ?? 0);
                $qty      = max(1, (int)($arr['quantity'] ?? 1));
                $currency = $arr['currency'] ?? $currency;
                $subtotal += $price * $qty;

                $orderItems[] = [
                    'product_id'       => $arr['product_id']       ?? '',
                    'name'             => $arr['name']             ?? '',
                    'slug'             => $arr['slug']             ?? '',
                    'subcategory_slug' => $arr['subcategory_slug'] ?? null,
                    'price'            => $price,
                    'currency'         => $currency,
                    'image'            => $arr['image']            ?? null,
                    'quantity'         => $qty,
                ];
            }

            $shippingFee = 0.0;            // free shipping for now

            // The coupon is re-checked here against the cart as it stands,
            // never taken from what the browser previewed. Between the preview
            // and this moment the cart can change, the code can be switched
            // off, or its last redemption can be used by someone else.
            $discount       = 0.0;
            $couponSnapshot = null;
            $couponCode     = strtoupper(trim($body['coupon_code'] ?? ''));

            if ($couponCode !== '') {
                $evaluated = Coupons::evaluate($couponCode, $orderItems, $customerId);
                if (!$evaluated['ok']) {
                    // Refuse rather than quietly charging full price: the
                    // customer is expecting the discount they were shown.
                    return Response::error($response, $evaluated['message'], 400);
                }
                $discount       = $evaluated['discount'];
                $couponSnapshot = Coupons::snapshot($evaluated['coupon'], $discount);
            }

            $total = max(0.0, $subtotal - $discount + $shippingFee);
            $now   = new UTCDateTime();

            $order = [
                'customer_id'      => new ObjectId($customerId),
                'order_number'     => $this->generateOrderNumber(),
                'items'            => $orderItems,
                'subtotal'         => round($subtotal,    2),
                'discount'         => round($discount,    2),
                'coupon'           => $couponSnapshot,
                'shipping_fee'     => round($shippingFee, 2),
                'total'            => round($total,       2),
                'currency'         => $currency,
                'payment_method'   => $paymentMethod,
                'payment_status'   => 'pending',
                'shipping'         => $shipping,
                'status'           => 'pending',
                'status_history'   => [
                    ['status' => 'pending', 'note' => $paymentMethod === 'card'
                        ? 'Order created — awaiting payment'
                        : 'Order placed', 'at' => $now],
                ],
                'created_at'       => $now,
                'updated_at'       => $now,
            ];

            $insert = $db->orders->insertOne($order);
            $order['_id'] = $insert->getInsertedId();

            if ($paymentMethod === 'card') {
                // The cart stays put until the webhook confirms payment.
                $session = $this->createCheckoutSession($order, $shipping);

                $db->orders->updateOne(
                    ['_id' => $insert->getInsertedId()],
                    ['$set' => [
                        'payment.stripe_session_id' => $session->id,
                        'updated_at'                => new UTCDateTime(),
                    ]]
                );

                return Response::json($response, [
                    'error' => false,
                    'data'  => $this->serialize($order),
                    // Stripe.js mounts embedded Checkout from this secret. It is
                    // scoped to this one session and safe to hand to the browser.
                    'checkout' => ['client_secret' => $session->client_secret],
                ], 201);
            }

            // Cash on delivery — nothing else to collect, so empty the cart now.
            $db->carts->updateOne(
                ['customer_id' => new ObjectId($customerId)],
                ['$set' => ['items' => [], 'updated_at' => $now]]
            );

            // Card orders are announced by the webhook once paid, not here —
            // an unpaid order isn't news yet.
            OrderNotifier::placed($order);
            OrderNotifier::confirmationToCustomer($order);

            return Response::json($response, [
                'error' => false,
                'data'  => $this->serialize($order),
            ], 201);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to place order: ' . $e->getMessage(), 500);
        }
    }

    /** List all orders for the current customer (most recent first). */
    public function index(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $customerId = $request->getAttribute('customer_id');
        if (!$customerId) return Response::error($response, 'Unauthorised.', 401);

        try {
            $db = Database::getInstance();
            $cursor = $db->orders->find(
                ['customer_id' => new ObjectId($customerId)],
                [
                    'sort'    => ['created_at' => -1],
                    'typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array'],
                ]
            );
            $orders = [];
            foreach ($cursor as $o) $orders[] = $this->serialize($o);
            return Response::json($response, ['error' => false, 'data' => $orders]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to fetch orders: ' . $e->getMessage(), 500);
        }
    }

    /** Get a single order — only if it belongs to the requesting customer. */
    public function show(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $customerId = $request->getAttribute('customer_id');
        if (!$customerId) return Response::error($response, 'Unauthorised.', 401);

        $id = $args['id'] ?? '';
        if ($id === '') return Response::error($response, 'Order id required.', 400);

        try {
            $db = Database::getInstance();
            $order = $db->orders->findOne(
                ['_id' => new ObjectId($id), 'customer_id' => new ObjectId($customerId)],
                ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']]
            );
            if (!$order) return Response::error($response, 'Order not found.', 404);

            return Response::json($response, [
                'error' => false,
                'data'  => $this->serialize($order),
            ]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to fetch order: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Look up an order by its Stripe Checkout Session id.
     *
     * Embedded Checkout returns the customer to `?session_id=…`, not to an
     * order id, so the success page needs this to show what was bought. It is
     * scoped to the requesting customer like `show()` — a session id is not a
     * capability to read someone else's order.
     */
    public function showBySession(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $customerId = $request->getAttribute('customer_id');
        if (!$customerId) return Response::error($response, 'Unauthorised.', 401);

        $sessionId = $args['sessionId'] ?? '';
        if ($sessionId === '') return Response::error($response, 'Session id required.', 400);

        try {
            $order = Database::getInstance()->orders->findOne(
                [
                    'payment.stripe_session_id' => $sessionId,
                    'customer_id'               => new ObjectId($customerId),
                ],
                ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']]
            );
            if (!$order) return Response::error($response, 'Order not found.', 404);

            return Response::json($response, ['error' => false, 'data' => $this->serialize($order)]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to fetch order: ' . $e->getMessage(), 500);
        }
    }

    // ─── Helpers ────────────────────────────────────────────────────────

    /**
     * Build an embedded Checkout Session from the order we just wrote.
     *
     * Line items are priced from the stored order, which was itself recomputed
     * from the server-side cart — the client never gets a say in what is
     * charged.
     *
     * Note there is no `payment_method_types`: omitting it turns on dynamic
     * payment methods, so cards, Apple Pay, Google Pay and any regional method
     * enabled in the Dashboard appear automatically, ranked per customer. It
     * would be a mistake to pin this to `['card']`.
     */
    private function createCheckoutSession(array $order, array $shipping): \Stripe\Checkout\Session
    {
        $currency = strtolower($order['currency'] ?? 'AED');

        $lineItems = [];
        foreach ($order['items'] as $item) {
            $product = ['name' => $item['name'] !== '' ? $item['name'] : 'Opal Perfumes item'];
            // Stripe fetches these itself, so a bare upload filename is no use.
            if (is_string($item['image'] ?? null) && str_starts_with($item['image'], 'http')) {
                $product['images'] = [$item['image']];
            }

            $lineItems[] = [
                'quantity'   => $item['quantity'],
                'price_data' => [
                    'currency'     => $currency,
                    // Minor units. round() before the cast, or 14.99 * 100 lands
                    // on 1498 through float representation.
                    'unit_amount'  => (int) round($item['price'] * 100),
                    'product_data' => $product,
                ],
            ];
        }

        if (($order['shipping_fee'] ?? 0) > 0) {
            $lineItems[] = [
                'quantity'   => 1,
                'price_data' => [
                    'currency'     => $currency,
                    'unit_amount'  => (int) round($order['shipping_fee'] * 100),
                    'product_data' => ['name' => 'Shipping'],
                ],
            ];
        }

        $params = [
            'mode'                   => 'payment',
            'ui_mode'                => 'embedded',
            'line_items'             => $lineItems,
            'return_url'             => StripeConfig::storefrontUrl()
                . '/checkout/success?session_id={CHECKOUT_SESSION_ID}',
            // Surfaces the order number in the Dashboard next to the payment.
            'client_reference_id'    => $order['order_number'],
            'metadata'               => [
                'order_id'     => (string) $order['_id'],
                'order_number' => $order['order_number'],
            ],
            'integration_identifier' => StripeConfig::INTEGRATION_IDENTIFIER,
        ];

        if (($shipping['email'] ?? '') !== '') {
            $params['customer_email'] = $shipping['email'];
        }

        $client = StripeConfig::getClient();

        // Stripe only accepts a discount as a Coupon it already holds, so the
        // amount we calculated is pushed across as a throwaway coupon rather
        // than by quietly shaving the line items — which would misreport what
        // each product cost on the receipt.
        //
        // Our own rules stay authoritative: this coupon carries the final
        // figure and nothing else, so Stripe never re-derives the discount.
        $discount = (float)($order['discount'] ?? 0);
        if ($discount > 0) {
            $stripeCoupon = $client->coupons->create([
                'amount_off'      => (int) round($discount * 100),
                'currency'        => $currency,
                'duration'        => 'once',
                'name'            => 'Promo ' . ($order['coupon']['code'] ?? 'discount'),
                // Single-use and short-lived: it exists for this one session
                // and cannot be reused if the id ever leaked.
                'max_redemptions' => 1,
                'redeem_by'       => time() + 86400,
            ]);
            $params['discounts'] = [['coupon' => $stripeCoupon->id]];
        }

        return $client->checkout->sessions->create($params);
    }

    private function generateOrderNumber(): string
    {
        // OPL-YYYYMMDD-XXXXX
        return 'OPL-' . date('Ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 5));
    }

    private function serialize(array $order): array
    {
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

        $shipping = $order['shipping'] ?? [];
        if (!is_array($shipping)) $shipping = iterator_to_array($shipping);

        $statusHistory = [];
        foreach (($order['status_history'] ?? []) as $h) {
            $arr = is_array($h) ? $h : iterator_to_array($h);
            $at  = $arr['at'] ?? null;
            $statusHistory[] = [
                'status' => $arr['status'] ?? '',
                'note'   => $arr['note']   ?? '',
                'at'     => $at instanceof UTCDateTime ? $at->toDateTime()->format(\DateTime::ATOM) : null,
            ];
        }

        $createdAt = $order['created_at'] ?? null;
        $updatedAt = $order['updated_at'] ?? null;

        // Only the Stripe session id is exposed — the PaymentIntent id stays
        // server-side, as it's the handle used for refunds and captures.
        $payment = $order['payment'] ?? null;
        if ($payment !== null && !is_array($payment)) $payment = iterator_to_array($payment);

        $coupon = $order['coupon'] ?? null;
        if ($coupon !== null && !is_array($coupon)) $coupon = iterator_to_array($coupon);
        $paidAt = $payment['paid_at'] ?? null;

        return [
            'id'              => isset($order['_id']) ? (string)$order['_id'] : '',
            'order_number'    => $order['order_number']  ?? '',
            'items'           => $items,
            'subtotal'        => (float)($order['subtotal'] ?? 0),
            'discount'        => (float)($order['discount'] ?? 0),
            'coupon'          => $coupon === null ? null : [
                'code'     => $coupon['code']     ?? '',
                'discount' => (float)($coupon['discount'] ?? 0),
            ],
            'shipping_fee'    => (float)($order['shipping_fee'] ?? 0),
            'total'           => (float)($order['total']    ?? 0),
            'currency'        => $order['currency']        ?? 'AED',
            'payment_method'  => $order['payment_method']  ?? 'cod',
            'payment_status'  => $order['payment_status']  ?? 'pending',
            'payment'         => $payment === null ? null : [
                'stripe_session_id' => $payment['stripe_session_id'] ?? null,
                'paid_at'           => $paidAt instanceof UTCDateTime
                    ? $paidAt->toDateTime()->format(\DateTime::ATOM)
                    : null,
            ],
            'shipping'        => $shipping,
            'status'          => $order['status']          ?? 'pending',
            'status_history'  => $statusHistory,
            'created_at'      => $createdAt instanceof UTCDateTime ? $createdAt->toDateTime()->format(\DateTime::ATOM) : null,
            'updated_at'      => $updatedAt instanceof UTCDateTime ? $updatedAt->toDateTime()->format(\DateTime::ATOM) : null,
        ];
    }
}
