<?php

namespace Opal\Controllers;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;
use Opal\Config\Database;
use Opal\Helpers\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Admin CRUD for promo codes.
 *
 * The rules defined here are the only thing that grants a discount. A promo
 * code printed on a home page banner is just text — if no coupon exists with
 * that code, it does nothing.
 */
class AdminCouponController
{
    private const TYPES  = ['percentage', 'fixed'];
    private const SCOPES = ['all', 'products', 'subcategories'];

    /** List every coupon, newest first, with how many times each has been used. */
    public function index(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $db = Database::getInstance();

            $cursor = $db->coupons->find([], [
                'sort'    => ['created_at' => -1],
                'typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array'],
            ]);

            // One aggregation for every coupon's usage rather than a count per
            // row — thirty coupons would otherwise be thirty round trips.
            $usage = [];
            $agg = $db->orders->aggregate([
                ['$match' => ['coupon.code' => ['$ne' => null], 'payment_status' => ['$ne' => 'failed']]],
                ['$group' => [
                    '_id'      => '$coupon.code',
                    'count'    => ['$sum' => 1],
                    'discount' => ['$sum' => '$discount'],
                ]],
            ], ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']]);
            foreach ($agg as $row) {
                $usage[(string)$row['_id']] = [
                    'count'    => (int)$row['count'],
                    'discount' => round((float)($row['discount'] ?? 0), 2),
                ];
            }

            $coupons = [];
            foreach ($cursor as $c) {
                $data = $this->serialize($c);
                $stats = $usage[$data['code']] ?? ['count' => 0, 'discount' => 0.0];
                $data['redemptions']     = $stats['count'];
                $data['total_discount']  = $stats['discount'];
                $coupons[] = $data;
            }

            return Response::json($response, ['error' => false, 'data' => $coupons]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to fetch coupons: ' . $e->getMessage(), 500);
        }
    }

    public function store(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $parsed = $this->parse($request->getParsedBody());
        if (isset($parsed['error'])) {
            return Response::error($response, $parsed['error'], 400);
        }

        try {
            $db  = Database::getInstance();
            $now = new UTCDateTime();

            if ($db->coupons->countDocuments(['code' => $parsed['doc']['code']]) > 0) {
                return Response::error($response, 'A coupon with that code already exists.', 409);
            }

            $doc = $parsed['doc'] + ['created_at' => $now, 'updated_at' => $now];
            $insert = $db->coupons->insertOne($doc);
            $doc['_id'] = $insert->getInsertedId();

            return Response::json($response, ['error' => false, 'data' => $this->serialize($doc)], 201);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to create coupon: ' . $e->getMessage(), 500);
        }
    }

    public function update(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = $args['id'] ?? '';
        if ($id === '') return Response::error($response, 'Coupon id required.', 400);

        $parsed = $this->parse($request->getParsedBody());
        if (isset($parsed['error'])) {
            return Response::error($response, $parsed['error'], 400);
        }

        try {
            $db = Database::getInstance();

            // The code is the identity customers type, so a clash has to be
            // caught even when only some other field is being edited.
            $clash = $db->coupons->countDocuments([
                'code' => $parsed['doc']['code'],
                '_id'  => ['$ne' => new ObjectId($id)],
            ]);
            if ($clash > 0) {
                return Response::error($response, 'Another coupon already uses that code.', 409);
            }

            $result = $db->coupons->updateOne(
                ['_id' => new ObjectId($id)],
                ['$set' => $parsed['doc'] + ['updated_at' => new UTCDateTime()]]
            );
            if ($result->getMatchedCount() === 0) {
                return Response::error($response, 'Coupon not found.', 404);
            }

            $doc = $db->coupons->findOne(
                ['_id' => new ObjectId($id)],
                ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']]
            );
            return Response::json($response, ['error' => false, 'data' => $this->serialize($doc)]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to update coupon: ' . $e->getMessage(), 500);
        }
    }

    public function destroy(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = $args['id'] ?? '';
        if ($id === '') return Response::error($response, 'Coupon id required.', 400);

        try {
            $result = Database::getInstance()->coupons->deleteOne(['_id' => new ObjectId($id)]);
            if ($result->getDeletedCount() === 0) {
                return Response::error($response, 'Coupon not found.', 404);
            }
            // Orders keep their own snapshot of the coupon, so deleting one
            // never rewrites the history of what was charged.
            return Response::success($response, 'Coupon deleted.');
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to delete coupon: ' . $e->getMessage(), 500);
        }
    }

    // ─── Helpers ────────────────────────────────────────────────────────

    /**
     * Validate and normalise a submitted coupon.
     *
     * @return array{doc?: array, error?: string}
     */
    private function parse(mixed $body): array
    {
        if (!is_array($body)) return ['error' => 'Request body must be a JSON object.'];

        // Stored uppercase and matched uppercase, so the customer can type
        // whatever case they like.
        $code = strtoupper(trim($body['code'] ?? ''));
        if ($code === '') return ['error' => 'Code is required.'];
        if (!preg_match('/^[A-Z0-9][A-Z0-9_-]{1,31}$/', $code)) {
            return ['error' => 'Code must be 2–32 characters: letters, numbers, hyphen or underscore.'];
        }

        $type = strtolower(trim($body['type'] ?? 'percentage'));
        if (!in_array($type, self::TYPES, true)) {
            return ['error' => 'Type must be percentage or fixed.'];
        }

        $value = (float)($body['value'] ?? 0);
        if ($value <= 0) return ['error' => 'Value must be greater than zero.'];
        if ($type === 'percentage' && $value > 100) {
            return ['error' => 'A percentage discount cannot exceed 100.'];
        }

        $scope = strtolower(trim($body['applies_to']['scope'] ?? 'all'));
        if (!in_array($scope, self::SCOPES, true)) {
            return ['error' => 'Scope must be all, products or subcategories.'];
        }

        $productIds  = $this->stringList($body['applies_to']['product_ids']       ?? []);
        $subcatSlugs = $this->stringList($body['applies_to']['subcategory_slugs'] ?? []);

        // A restricted coupon with an empty list would silently apply to
        // nothing and look broken to whoever typed the code.
        if ($scope === 'products' && $productIds === []) {
            return ['error' => 'Select at least one product, or set the scope to the whole cart.'];
        }
        if ($scope === 'subcategories' && $subcatSlugs === []) {
            return ['error' => 'Select at least one collection, or set the scope to the whole cart.'];
        }

        $startsAt = $this->date($body['starts_at'] ?? null);
        $endsAt   = $this->date($body['ends_at']   ?? null);
        if ($startsAt && $endsAt && $endsAt->toDateTime() < $startsAt->toDateTime()) {
            return ['error' => 'The end date cannot be before the start date.'];
        }

        return ['doc' => [
            'code'             => $code,
            'description'      => trim($body['description'] ?? ''),
            'type'             => $type,
            'value'            => round($value, 2),
            'max_discount'     => $this->positiveOrNull($body['max_discount']     ?? null),
            'min_order'        => $this->positiveOrNull($body['min_order']        ?? null),
            'max_redemptions'  => $this->positiveIntOrNull($body['max_redemptions']  ?? null),
            'max_per_customer' => $this->positiveIntOrNull($body['max_per_customer'] ?? null),
            'starts_at'        => $startsAt,
            'ends_at'          => $endsAt,
            'applies_to'       => [
                'scope'             => $scope,
                'product_ids'       => $scope === 'products'      ? $productIds  : [],
                'subcategory_slugs' => $scope === 'subcategories' ? $subcatSlugs : [],
            ],
            'status' => ($body['status'] ?? 'active') === 'inactive' ? 'inactive' : 'active',
        ]];
    }

    private function stringList(mixed $value): array
    {
        if (!is_array($value)) return [];
        $out = [];
        foreach ($value as $entry) {
            $entry = is_string($entry) ? trim($entry) : '';
            if ($entry !== '') $out[] = $entry;
        }
        return array_values(array_unique($out));
    }

    /** Dates arrive as `YYYY-MM-DD` from the admin's date inputs. */
    private function date(mixed $value): ?UTCDateTime
    {
        if (!is_string($value) || trim($value) === '') return null;
        $ts = strtotime($value);
        return $ts === false ? null : new UTCDateTime($ts * 1000);
    }

    private function positiveOrNull(mixed $value): ?float
    {
        if ($value === null || $value === '') return null;
        $f = (float)$value;
        return $f > 0 ? round($f, 2) : null;
    }

    private function positiveIntOrNull(mixed $value): ?int
    {
        if ($value === null || $value === '') return null;
        $i = (int)$value;
        return $i > 0 ? $i : null;
    }

    private function serialize(array $c): array
    {
        $appliesTo = $c['applies_to'] ?? [];
        if (!is_array($appliesTo)) $appliesTo = iterator_to_array($appliesTo);

        $fmt = static fn ($v) => $v instanceof UTCDateTime
            ? $v->toDateTime()->format('Y-m-d')
            : null;

        return [
            'id'               => isset($c['_id']) ? (string)$c['_id'] : '',
            'code'             => $c['code']        ?? '',
            'description'      => $c['description'] ?? '',
            'type'             => $c['type']        ?? 'percentage',
            'value'            => (float)($c['value'] ?? 0),
            'max_discount'     => isset($c['max_discount'])     ? (float)$c['max_discount']   : null,
            'min_order'        => isset($c['min_order'])        ? (float)$c['min_order']      : null,
            'max_redemptions'  => isset($c['max_redemptions'])  ? (int)$c['max_redemptions']  : null,
            'max_per_customer' => isset($c['max_per_customer']) ? (int)$c['max_per_customer'] : null,
            'starts_at'        => $fmt($c['starts_at'] ?? null),
            'ends_at'          => $fmt($c['ends_at']   ?? null),
            'applies_to'       => [
                'scope'             => $appliesTo['scope'] ?? 'all',
                'product_ids'       => array_values((array)($appliesTo['product_ids']       ?? [])),
                'subcategory_slugs' => array_values((array)($appliesTo['subcategory_slugs'] ?? [])),
            ],
            'status'     => $c['status'] ?? 'active',
            'created_at' => $c['created_at'] instanceof UTCDateTime
                ? $c['created_at']->toDateTime()->format(\DateTime::ATOM)
                : null,
        ];
    }
}
