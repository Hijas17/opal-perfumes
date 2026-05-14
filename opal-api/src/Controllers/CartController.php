<?php

namespace Opal\Controllers;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;
use Opal\Config\Database;
use Opal\Helpers\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Customer cart — server-side, keyed by customer_id. One cart per customer
 * (an upsertable document in the `carts` collection). Keeps a denormalised
 * snapshot of each line so price/name/image survive product edits.
 */
class CartController
{
    public function get(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $customerId = $request->getAttribute('customer_id');
        if (!$customerId) return Response::error($response, 'Unauthorised.', 401);

        try {
            $cart = $this->fetchOrCreateCart($customerId);
            return Response::json($response, ['error' => false, 'data' => $this->serialize($cart)]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to load cart: ' . $e->getMessage(), 500);
        }
    }

    public function addItem(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $customerId = $request->getAttribute('customer_id');
        if (!$customerId) return Response::error($response, 'Unauthorised.', 401);

        $body = $request->getParsedBody();
        $productId = trim($body['product_id'] ?? '');
        $quantity  = max(1, (int)($body['quantity'] ?? 1));

        if ($productId === '') return Response::error($response, 'product_id is required.', 400);

        try {
            $db = Database::getInstance();
            $product = $db->products->findOne(['_id' => new ObjectId($productId), 'status' => 'published']);
            if (!$product) return Response::error($response, 'Product not found or unavailable.', 404);

            $cart  = $this->fetchOrCreateCart($customerId);
            $items = $cart['items'] ?? [];

            $found = false;
            foreach ($items as &$item) {
                if (($item['product_id'] ?? '') === $productId) {
                    $item['quantity'] = (int)$item['quantity'] + $quantity;
                    $found = true;
                    break;
                }
            }
            unset($item);

            if (!$found) {
                $items[] = [
                    'product_id'       => $productId,
                    'name'             => $product['name'] ?? '',
                    'slug'             => $product['slug'] ?? '',
                    'subcategory_slug' => $product['subcategory_slug'] ?? null,
                    'price'            => (float)($product['price'] ?? 0),
                    'currency'         => $product['currency'] ?? 'AED',
                    'image'            => $product['images']['primary'] ?? null,
                    'quantity'         => $quantity,
                ];
            }

            $this->saveCart($customerId, $items);
            $fresh = $this->fetchOrCreateCart($customerId);
            return Response::json($response, ['error' => false, 'data' => $this->serialize($fresh)]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to add item: ' . $e->getMessage(), 500);
        }
    }

    public function updateItem(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $customerId = $request->getAttribute('customer_id');
        if (!$customerId) return Response::error($response, 'Unauthorised.', 401);

        $productId = $args['productId'] ?? '';
        $body      = $request->getParsedBody();
        $quantity  = (int)($body['quantity'] ?? 0);

        if ($productId === '') return Response::error($response, 'productId is required.', 400);
        if ($quantity < 0)     return Response::error($response, 'quantity must be >= 0.', 400);

        try {
            $cart  = $this->fetchOrCreateCart($customerId);
            $items = array_values(array_filter($cart['items'] ?? [], fn($it) => ($it['product_id'] ?? '') !== $productId
                || ($quantity > 0)));

            // If item still exists, set its quantity. If quantity is 0, the filter above already removed it.
            foreach ($items as &$it) {
                if (($it['product_id'] ?? '') === $productId) {
                    $it['quantity'] = $quantity;
                }
            }
            unset($it);

            $this->saveCart($customerId, $items);
            $fresh = $this->fetchOrCreateCart($customerId);
            return Response::json($response, ['error' => false, 'data' => $this->serialize($fresh)]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to update item: ' . $e->getMessage(), 500);
        }
    }

    public function removeItem(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $customerId = $request->getAttribute('customer_id');
        if (!$customerId) return Response::error($response, 'Unauthorised.', 401);

        $productId = $args['productId'] ?? '';
        if ($productId === '') return Response::error($response, 'productId is required.', 400);

        try {
            $cart  = $this->fetchOrCreateCart($customerId);
            $items = array_values(array_filter($cart['items'] ?? [], fn($it) => ($it['product_id'] ?? '') !== $productId));
            $this->saveCart($customerId, $items);
            $fresh = $this->fetchOrCreateCart($customerId);
            return Response::json($response, ['error' => false, 'data' => $this->serialize($fresh)]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to remove item: ' . $e->getMessage(), 500);
        }
    }

    public function clear(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $customerId = $request->getAttribute('customer_id');
        if (!$customerId) return Response::error($response, 'Unauthorised.', 401);

        try {
            $this->saveCart($customerId, []);
            $fresh = $this->fetchOrCreateCart($customerId);
            return Response::json($response, ['error' => false, 'data' => $this->serialize($fresh)]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to clear cart: ' . $e->getMessage(), 500);
        }
    }

    // ─── Internal helpers ───────────────────────────────────────────────

    private function fetchOrCreateCart(string $customerId): array
    {
        $db = Database::getInstance();
        $cart = $db->carts->findOne(
            ['customer_id' => new ObjectId($customerId)],
            ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']]
        );

        if ($cart) return $cart;

        $now = new UTCDateTime();
        $doc = [
            'customer_id' => new ObjectId($customerId),
            'items'       => [],
            'created_at'  => $now,
            'updated_at'  => $now,
        ];
        $insert = $db->carts->insertOne($doc);
        $doc['_id'] = $insert->getInsertedId();
        return $doc;
    }

    private function saveCart(string $customerId, array $items): void
    {
        $db = Database::getInstance();
        $db->carts->updateOne(
            ['customer_id' => new ObjectId($customerId)],
            [
                '$set' => [
                    'items'      => $items,
                    'updated_at' => new UTCDateTime(),
                ],
                '$setOnInsert' => [
                    'customer_id' => new ObjectId($customerId),
                    'created_at'  => new UTCDateTime(),
                ],
            ],
            ['upsert' => true]
        );
    }

    private function serialize(array|object $cart): array
    {
        // Normalise BSONArray/BSONDocument to plain associative arrays
        $items = [];
        $rawItems = is_array($cart) ? ($cart['items'] ?? []) : ($cart->items ?? []);
        foreach ($rawItems as $item) {
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

        $subtotal = array_sum(array_map(fn($i) => $i['price'] * $i['quantity'], $items));
        $itemCount = array_sum(array_map(fn($i) => $i['quantity'], $items));

        return [
            'items'      => $items,
            'subtotal'   => round($subtotal, 2),
            'item_count' => $itemCount,
            'currency'   => $items[0]['currency'] ?? 'AED',
        ];
    }
}
