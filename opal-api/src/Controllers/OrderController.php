<?php

namespace Opal\Controllers;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;
use Opal\Config\Database;
use Opal\Helpers\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Customer-facing order endpoints. For now we only support cash-on-delivery —
 * the order is created from the current cart, the cart is cleared, and a
 * pending order is returned. Payment gateway integration will plug into
 * `place()` later by branching on `payment_method`.
 */
class OrderController
{
    private const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

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
        if ($paymentMethod !== 'cod') {
            return Response::error($response, 'Only cash on delivery is supported at the moment.', 400);
        }

        try {
            $db = Database::getInstance();
            $cart = $db->carts->findOne(
                ['customer_id' => new ObjectId($customerId)],
                ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']]
            );
            $items = $cart['items'] ?? [];
            if (empty($items)) {
                return Response::error($response, 'Your cart is empty.', 400);
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
            $total = $subtotal + $shippingFee;
            $now   = new UTCDateTime();

            $order = [
                'customer_id'      => new ObjectId($customerId),
                'order_number'     => $this->generateOrderNumber(),
                'items'            => $orderItems,
                'subtotal'         => round($subtotal,    2),
                'shipping_fee'     => round($shippingFee, 2),
                'total'            => round($total,       2),
                'currency'         => $currency,
                'payment_method'   => 'cod',
                'payment_status'   => 'pending',
                'shipping'         => $shipping,
                'status'           => 'pending',
                'status_history'   => [
                    ['status' => 'pending', 'note' => 'Order placed', 'at' => $now],
                ],
                'created_at'       => $now,
                'updated_at'       => $now,
            ];

            $insert = $db->orders->insertOne($order);
            $orderId = (string)$insert->getInsertedId();

            // Empty the cart now that the order is placed
            $db->carts->updateOne(
                ['customer_id' => new ObjectId($customerId)],
                ['$set' => ['items' => [], 'updated_at' => $now]]
            );

            $order['_id'] = $insert->getInsertedId();
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

    // ─── Helpers ────────────────────────────────────────────────────────

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

        return [
            'id'              => isset($order['_id']) ? (string)$order['_id'] : '',
            'order_number'    => $order['order_number']  ?? '',
            'items'           => $items,
            'subtotal'        => (float)($order['subtotal'] ?? 0),
            'shipping_fee'    => (float)($order['shipping_fee'] ?? 0),
            'total'           => (float)($order['total']    ?? 0),
            'currency'        => $order['currency']        ?? 'AED',
            'payment_method'  => $order['payment_method']  ?? 'cod',
            'payment_status'  => $order['payment_status']  ?? 'pending',
            'shipping'        => $shipping,
            'status'          => $order['status']          ?? 'pending',
            'status_history'  => $statusHistory,
            'created_at'      => $createdAt instanceof UTCDateTime ? $createdAt->toDateTime()->format(\DateTime::ATOM) : null,
            'updated_at'      => $updatedAt instanceof UTCDateTime ? $updatedAt->toDateTime()->format(\DateTime::ATOM) : null,
        ];
    }
}
