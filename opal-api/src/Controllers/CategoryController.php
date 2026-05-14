<?php

namespace Opal\Controllers;

use MongoDB\BSON\ObjectId;
use Opal\Config\Database;
use Opal\Helpers\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

class CategoryController
{
    // ─── Public ──────────────────────────────────────────────────────────────

    public function index(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $db = Database::getInstance();
            $cursor = $db->subcategories->find(
                [],
                ['sort' => ['display_order' => 1]]
            );

            $categories = [];
            foreach ($cursor as $cat) {
                $categories[] = $this->formatCategory($cat);
            }

            return Response::json($response, ['error' => false, 'data' => $categories]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to fetch categories: ' . $e->getMessage(), 500);
        }
    }

    // ─── Admin ───────────────────────────────────────────────────────────────

    public function adminIndex(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $db     = Database::getInstance();
            $cursor = $db->subcategories->find([], ['sort' => ['display_order' => 1]]);

            $categories = [];
            foreach ($cursor as $cat) {
                $categories[] = $this->formatCategory($cat);
            }

            return Response::json($response, ['error' => false, 'data' => $categories]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to fetch categories: ' . $e->getMessage(), 500);
        }
    }

    public function store(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $body = $request->getParsedBody();

        $name         = trim($body['name'] ?? '');
        $slug         = trim($body['slug'] ?? '');
        $displayOrder = (int)($body['display_order'] ?? 0);

        if (empty($name)) {
            return Response::error($response, 'Category name is required.', 400);
        }

        if (empty($slug)) {
            $slug = $this->generateSlug($name);
        } else {
            $slug = $this->generateSlug($slug);
        }

        try {
            $db = Database::getInstance();

            // Check slug uniqueness
            $existing = $db->subcategories->findOne(['slug' => $slug]);
            if ($existing) {
                return Response::error($response, 'A category with this slug already exists.', 409);
            }

            $now = new \MongoDB\BSON\UTCDateTime();
            $doc = [
                'name'          => $name,
                'slug'          => $slug,
                'display_order' => $displayOrder,
                'created_at'    => $now,
                'updated_at'    => $now,
            ];

            $result = $db->subcategories->insertOne($doc);
            $doc['_id'] = $result->getInsertedId();

            return Response::json($response, [
                'error'   => false,
                'message' => 'Category created successfully.',
                'data'    => $this->formatCategory($doc),
            ], 201);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to create category: ' . $e->getMessage(), 500);
        }
    }

    public function update(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = $args['id'] ?? '';

        try {
            $objectId = new ObjectId($id);
        } catch (\Exception $e) {
            return Response::error($response, 'Invalid category ID.', 400);
        }

        $body = $request->getParsedBody();

        try {
            $db       = Database::getInstance();
            $existing = $db->subcategories->findOne(['_id' => $objectId]);

            if (!$existing) {
                return Response::error($response, 'Category not found.', 404);
            }

            $updateFields = [];

            if (isset($body['name']) && trim($body['name']) !== '') {
                $updateFields['name'] = trim($body['name']);
            }

            if (isset($body['slug']) && trim($body['slug']) !== '') {
                $newSlug = $this->generateSlug(trim($body['slug']));
                // Ensure unique slug (excluding current)
                $conflict = $db->subcategories->findOne([
                    'slug' => $newSlug,
                    '_id'  => ['$ne' => $objectId],
                ]);
                if ($conflict) {
                    return Response::error($response, 'A category with this slug already exists.', 409);
                }
                $updateFields['slug'] = $newSlug;
            }

            if (isset($body['display_order'])) {
                $updateFields['display_order'] = (int)$body['display_order'];
            }

            if (empty($updateFields)) {
                return Response::error($response, 'No fields to update.', 400);
            }

            $updateFields['updated_at'] = new \MongoDB\BSON\UTCDateTime();

            $db->subcategories->updateOne(
                ['_id' => $objectId],
                ['$set' => $updateFields]
            );

            $updated = $db->subcategories->findOne(['_id' => $objectId]);

            return Response::json($response, [
                'error'   => false,
                'message' => 'Category updated successfully.',
                'data'    => $this->formatCategory($updated),
            ]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to update category: ' . $e->getMessage(), 500);
        }
    }

    public function destroy(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = $args['id'] ?? '';

        try {
            $objectId = new ObjectId($id);
        } catch (\Exception $e) {
            return Response::error($response, 'Invalid category ID.', 400);
        }

        try {
            $db = Database::getInstance();

            $existing = $db->subcategories->findOne(['_id' => $objectId]);
            if (!$existing) {
                return Response::error($response, 'Category not found.', 404);
            }

            // Check if any products reference this category
            $productCount = $db->products->countDocuments(['subcategory_id' => $objectId]);
            if ($productCount > 0) {
                return Response::error(
                    $response,
                    "Cannot delete: {$productCount} product(s) are assigned to this category.",
                    409
                );
            }

            $db->subcategories->deleteOne(['_id' => $objectId]);

            return Response::success($response, 'Category deleted successfully.');
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to delete category: ' . $e->getMessage(), 500);
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function formatCategory(mixed $cat): array
    {
        return [
            'id'            => (string)$cat['_id'],
            'name'          => $cat['name'] ?? '',
            'slug'          => $cat['slug'] ?? '',
            'display_order' => $cat['display_order'] ?? 0,
            'created_at'    => isset($cat['created_at']) ? (string)$cat['created_at'] : null,
            'updated_at'    => isset($cat['updated_at']) ? (string)$cat['updated_at'] : null,
        ];
    }

    private function generateSlug(string $text): string
    {
        $slug = strtolower(trim($text));
        $slug = preg_replace('/[^a-z0-9\s\-]/', '', $slug);
        $slug = preg_replace('/[\s\-]+/', '-', $slug);
        return trim($slug, '-');
    }
}
