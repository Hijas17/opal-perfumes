<?php

namespace Opal\Helpers;

use MongoDB\BSON\ObjectId;
use Opal\Config\Database;

/**
 * Turns a browser-held cart into priced, trustworthy order lines.
 *
 * The storefront keeps its cart in localStorage rather than on the server, so
 * checkout and the promo-code check receive the basket with the request. Only
 * the product id and quantity are taken from it — **every** other field, price
 * above all, is read from the products collection. A tampered payload can
 * therefore change what someone buys, but never what it costs.
 *
 * Unpublished or deleted products are dropped rather than silently priced at
 * zero, and a cart left holding nothing but those is reported as an error so
 * the customer is told instead of being handed a free order.
 */
class CartResolver
{
    /** Guards against a payload with thousands of lines. */
    private const MAX_LINES = 100;

    /**
     * @param  mixed $clientItems Raw `items` from the request body.
     * @return array{items: array, error: ?string}
     */
    public static function resolve(mixed $clientItems): array
    {
        if (!is_array($clientItems) || $clientItems === []) {
            return ['items' => [], 'error' => 'Your cart is empty.'];
        }
        if (count($clientItems) > self::MAX_LINES) {
            return ['items' => [], 'error' => 'That is too many items for one order.'];
        }

        // Collapse duplicates first so the same product sent twice becomes one
        // line rather than two, and so each product is looked up once.
        $quantities = [];
        foreach ($clientItems as $raw) {
            if (!is_array($raw)) continue;
            $id  = trim((string)($raw['product_id'] ?? ''));
            $qty = (int)($raw['quantity'] ?? 1);
            if ($id === '' || $qty < 1) continue;
            // A quantity in the thousands is a mistake or an attack, not an order.
            $quantities[$id] = min(999, ($quantities[$id] ?? 0) + $qty);
        }

        if ($quantities === []) {
            return ['items' => [], 'error' => 'Your cart is empty.'];
        }

        $objectIds = [];
        foreach (array_keys($quantities) as $id) {
            try {
                $objectIds[] = new ObjectId($id);
            } catch (\Exception $e) {
                // Not a valid id — treated the same as a product that's gone.
            }
        }

        if ($objectIds === []) {
            return ['items' => [], 'error' => 'Nothing in your cart is available any more.'];
        }

        $cursor = Database::getInstance()->products->find(
            ['_id' => ['$in' => $objectIds], 'status' => 'published'],
            ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']]
        );

        $items = [];
        foreach ($cursor as $product) {
            $id = (string)$product['_id'];
            $images = $product['images'] ?? [];
            if (!is_array($images)) $images = iterator_to_array($images);

            $items[] = [
                'product_id'       => $id,
                'name'             => $product['name'] ?? '',
                'slug'             => $product['slug'] ?? '',
                'subcategory_slug' => $product['subcategory_slug'] ?? null,
                'price'            => (float)($product['price'] ?? 0),
                'currency'         => $product['currency'] ?? 'AED',
                'image'            => $images['primary'] ?? null,
                'quantity'         => $quantities[$id],
            ];
        }

        if ($items === []) {
            return ['items' => [], 'error' => 'Nothing in your cart is available any more.'];
        }

        return ['items' => $items, 'error' => null];
    }
}
