<?php

namespace Opal\Controllers;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\Regex;
use Opal\Config\Database;
use Opal\Helpers\Response;
use Opal\Helpers\Upload;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

class ProductController
{
    // ─── Public ──────────────────────────────────────────────────────────────

    public function index(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $params   = $request->getQueryParams();
        $category = $params['category'] ?? '';
        $sort     = $params['sort']     ?? 'newest';
        $search   = $params['search']   ?? '';
        $featured = $params['featured'] ?? '';

        $filter = ['status' => 'published'];

        if ($featured === 'true' || $featured === '1') {
            $filter['is_featured'] = true;
        }

        try {
            $db = Database::getInstance();

            // Category filter by slug
            if (!empty($category)) {
                $cat = $db->subcategories->findOne(['slug' => $category]);
                if ($cat) {
                    $filter['subcategory_id'] = $cat['_id'];
                } else {
                    return Response::json($response, ['error' => false, 'data' => []]);
                }
            }

            // Search filter
            if (!empty($search)) {
                $filter['name'] = new Regex(preg_quote($search, '/'), 'i');
            }

            $sortOption = $this->buildSortOption($sort);

            $cursor   = $db->products->find($filter, ['sort' => $sortOption]);
            $products = [];

            foreach ($cursor as $product) {
                $products[] = $this->formatProduct($product, $db);
            }

            return Response::json($response, ['error' => false, 'data' => $products]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to fetch products: ' . $e->getMessage(), 500);
        }
    }

    public function show(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $slug = $args['slug'] ?? '';

        if (empty($slug)) {
            return Response::error($response, 'Product slug is required.', 400);
        }

        try {
            $db      = Database::getInstance();
            $product = $db->products->findOne(['slug' => $slug, 'status' => 'published']);

            if (!$product) {
                return Response::error($response, 'Product not found.', 404);
            }

            return Response::json($response, [
                'error' => false,
                'data'  => $this->formatProduct($product, $db),
            ]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to fetch product: ' . $e->getMessage(), 500);
        }
    }

    // ─── Admin ───────────────────────────────────────────────────────────────

    public function adminIndex(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $params   = $request->getQueryParams();
        $status   = $params['status']   ?? '';
        $category = $params['category'] ?? '';

        $filter = [];

        if (!empty($status) && in_array($status, ['published', 'draft'], true)) {
            $filter['status'] = $status;
        }

        try {
            $db = Database::getInstance();

            if (!empty($category)) {
                $cat = $db->subcategories->findOne(['slug' => $category]);
                if ($cat) {
                    $filter['subcategory_id'] = $cat['_id'];
                }
            }

            $cursor   = $db->products->find($filter, ['sort' => ['created_at' => -1]]);
            $products = [];

            foreach ($cursor as $product) {
                $products[] = $this->formatProduct($product, $db);
            }

            return Response::json($response, ['error' => false, 'data' => $products]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to fetch products: ' . $e->getMessage(), 500);
        }
    }

    public function adminShow(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = $args['id'] ?? '';

        try {
            $objectId = new ObjectId($id);
        } catch (\Exception $e) {
            return Response::error($response, 'Invalid product ID.', 400);
        }

        try {
            $db      = Database::getInstance();
            $product = $db->products->findOne(['_id' => $objectId]);

            if (!$product) {
                return Response::error($response, 'Product not found.', 404);
            }

            return Response::json($response, [
                'error' => false,
                'data'  => $this->formatProduct($product, $db),
            ]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to fetch product: ' . $e->getMessage(), 500);
        }
    }

    public function store(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $body        = $request->getParsedBody();
        $uploadedFiles = $request->getUploadedFiles();

        $name = trim($body['name'] ?? '');
        if (empty($name)) {
            return Response::error($response, 'Product name is required.', 400);
        }

        try {
            $db = Database::getInstance();

            // Handle subcategory
            $subcategoryId = null;
            if (!empty($body['subcategory_id'])) {
                try {
                    $subcategoryId = new ObjectId($body['subcategory_id']);
                } catch (\Exception $e) {
                    return Response::error($response, 'Invalid subcategory ID.', 400);
                }
                $cat = $db->subcategories->findOne(['_id' => $subcategoryId]);
                if (!$cat) {
                    return Response::error($response, 'Subcategory not found.', 404);
                }
            }

            $slug = $this->generateSlug($name);
            $slug = $this->ensureUniqueSlug($db, $slug);

            $uploadDir = $this->getUploadDir();
            $images    = ['primary' => null, 'hover' => null, 'gallery' => [], 'ingredients' => null];

            if (isset($uploadedFiles['primary_image'])) {
                $images['primary'] = $this->handleUploadedFile($uploadedFiles['primary_image'], $uploadDir);
            }
            if (isset($uploadedFiles['hover_image'])) {
                $images['hover'] = $this->handleUploadedFile($uploadedFiles['hover_image'], $uploadDir);
            }
            if (isset($uploadedFiles['ingredients_image'])) {
                $images['ingredients'] = $this->handleUploadedFile($uploadedFiles['ingredients_image'], $uploadDir);
            }
            if (isset($uploadedFiles['gallery'])) {
                $galleryFiles = $uploadedFiles['gallery'];
                if (!is_array($galleryFiles)) {
                    $galleryFiles = [$galleryFiles];
                }
                foreach ($galleryFiles as $gFile) {
                    $fn = $this->handleUploadedFile($gFile, $uploadDir);
                    if ($fn) {
                        $images['gallery'][] = $fn;
                    }
                }
            }

            $purchaseLinks = [];
            if (!empty($body['purchase_links'])) {
                $decoded = json_decode($body['purchase_links'], true);
                if (is_array($decoded)) {
                    $purchaseLinks = $decoded;
                }
            }

            $scentNotes = [
                'top'    => $body['scent_top']    ?? '',
                'middle' => $body['scent_middle']  ?? '',
                'base'   => $body['scent_base']    ?? '',
            ];

            $now = new \MongoDB\BSON\UTCDateTime();
            $doc = [
                'name'              => $name,
                'slug'              => $slug,
                'subcategory_id'    => $subcategoryId,
                'short_description' => $body['short_description'] ?? '',
                'full_description'  => $body['full_description']  ?? '',
                'scent_notes'       => $scentNotes,
                'price'             => isset($body['price']) ? (float)$body['price'] : 0.0,
                'currency'          => $body['currency'] ?? 'USD',
                'purchase_links'    => $purchaseLinks,
                'size_volume'       => $body['size_volume'] ?? '',
                'images'            => $images,
                'label'             => $body['label'] ?? 'none',
                'is_featured'       => filter_var($body['is_featured'] ?? false, FILTER_VALIDATE_BOOLEAN),
                'display_order'     => isset($body['display_order']) ? (int)$body['display_order'] : 0,
                'status'            => in_array($body['status'] ?? '', ['published', 'draft']) ? $body['status'] : 'draft',
                'created_at'        => $now,
                'updated_at'        => $now,
            ];

            $result = $db->products->insertOne($doc);
            $doc['_id'] = $result->getInsertedId();

            return Response::json($response, [
                'error'   => false,
                'message' => 'Product created successfully.',
                'data'    => $this->formatProduct($doc, $db),
            ], 201);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to create product: ' . $e->getMessage(), 500);
        }
    }

    public function update(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = $args['id'] ?? '';

        try {
            $objectId = new ObjectId($id);
        } catch (\Exception $e) {
            return Response::error($response, 'Invalid product ID.', 400);
        }

        try {
            $db      = Database::getInstance();
            $product = $db->products->findOne(['_id' => $objectId]);

            if (!$product) {
                return Response::error($response, 'Product not found.', 404);
            }

            $body          = $request->getParsedBody();
            $uploadedFiles = $request->getUploadedFiles();
            $uploadDir     = $this->getUploadDir();

            $updateFields = [];

            if (isset($body['name']) && trim($body['name']) !== '') {
                $updateFields['name'] = trim($body['name']);
                // Only regenerate slug if name changed
                if ($updateFields['name'] !== ($product['name'] ?? '')) {
                    $newSlug = $this->generateSlug($updateFields['name']);
                    $updateFields['slug'] = $this->ensureUniqueSlug($db, $newSlug, (string)$objectId);
                }
            }

            if (isset($body['subcategory_id']) && $body['subcategory_id'] !== '') {
                try {
                    $subId = new ObjectId($body['subcategory_id']);
                } catch (\Exception $e) {
                    return Response::error($response, 'Invalid subcategory ID.', 400);
                }
                $cat = $db->subcategories->findOne(['_id' => $subId]);
                if (!$cat) {
                    return Response::error($response, 'Subcategory not found.', 404);
                }
                $updateFields['subcategory_id'] = $subId;
            }

            $simpleFields = ['short_description', 'full_description', 'size_volume', 'currency'];
            foreach ($simpleFields as $field) {
                if (isset($body[$field])) {
                    $updateFields[$field] = $body[$field];
                }
            }

            if (isset($body['price'])) {
                $updateFields['price'] = (float)$body['price'];
            }
            if (isset($body['display_order'])) {
                $updateFields['display_order'] = (int)$body['display_order'];
            }
            if (isset($body['is_featured'])) {
                $updateFields['is_featured'] = filter_var($body['is_featured'], FILTER_VALIDATE_BOOLEAN);
            }
            if (isset($body['status']) && in_array($body['status'], ['published', 'draft'], true)) {
                $updateFields['status'] = $body['status'];
            }
            if (isset($body['label'])) {
                $updateFields['label'] = $body['label'];
            }

            // Scent notes
            $scentNotes = (array)($product['scent_notes'] ?? []);
            $scentChanged = false;
            foreach (['scent_top' => 'top', 'scent_middle' => 'middle', 'scent_base' => 'base'] as $bodyKey => $noteKey) {
                if (isset($body[$bodyKey])) {
                    $scentNotes[$noteKey] = $body[$bodyKey];
                    $scentChanged = true;
                }
            }
            if ($scentChanged) {
                $updateFields['scent_notes'] = $scentNotes;
            }

            // Purchase links
            if (isset($body['purchase_links'])) {
                $decoded = json_decode($body['purchase_links'], true);
                if (is_array($decoded)) {
                    $updateFields['purchase_links'] = $decoded;
                }
            }

            // Images
            $currentImages = (array)($product['images'] ?? ['primary' => null, 'hover' => null, 'gallery' => [], 'ingredients' => null]);
            $imagesChanged = false;

            if (isset($uploadedFiles['primary_image'])) {
                $fn = $this->handleUploadedFile($uploadedFiles['primary_image'], $uploadDir);
                if ($fn) {
                    $this->deleteFile($currentImages['primary'] ?? null, $uploadDir);
                    $currentImages['primary'] = $fn;
                    $imagesChanged = true;
                }
            }
            if (isset($uploadedFiles['hover_image'])) {
                $fn = $this->handleUploadedFile($uploadedFiles['hover_image'], $uploadDir);
                if ($fn) {
                    $this->deleteFile($currentImages['hover'] ?? null, $uploadDir);
                    $currentImages['hover'] = $fn;
                    $imagesChanged = true;
                }
            }
            if (isset($uploadedFiles['ingredients_image'])) {
                $fn = $this->handleUploadedFile($uploadedFiles['ingredients_image'], $uploadDir);
                if ($fn) {
                    $this->deleteFile($currentImages['ingredients'] ?? null, $uploadDir);
                    $currentImages['ingredients'] = $fn;
                    $imagesChanged = true;
                }
            }
            if (isset($uploadedFiles['gallery'])) {
                $galleryFiles = $uploadedFiles['gallery'];
                if (!is_array($galleryFiles)) {
                    $galleryFiles = [$galleryFiles];
                }
                $newGallery = is_array($currentImages['gallery'] ?? null) ? (array)$currentImages['gallery'] : [];
                foreach ($galleryFiles as $gFile) {
                    $fn = $this->handleUploadedFile($gFile, $uploadDir);
                    if ($fn) {
                        $newGallery[] = $fn;
                        $imagesChanged = true;
                    }
                }
                $currentImages['gallery'] = $newGallery;
            }

            if ($imagesChanged) {
                $updateFields['images'] = $currentImages;
            }

            if (empty($updateFields)) {
                return Response::error($response, 'No fields to update.', 400);
            }

            $updateFields['updated_at'] = new \MongoDB\BSON\UTCDateTime();

            $db->products->updateOne(['_id' => $objectId], ['$set' => $updateFields]);

            $updated = $db->products->findOne(['_id' => $objectId]);

            return Response::json($response, [
                'error'   => false,
                'message' => 'Product updated successfully.',
                'data'    => $this->formatProduct($updated, $db),
            ]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to update product: ' . $e->getMessage(), 500);
        }
    }

    public function destroy(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = $args['id'] ?? '';

        try {
            $objectId = new ObjectId($id);
        } catch (\Exception $e) {
            return Response::error($response, 'Invalid product ID.', 400);
        }

        try {
            $db      = Database::getInstance();
            $product = $db->products->findOne(['_id' => $objectId]);

            if (!$product) {
                return Response::error($response, 'Product not found.', 404);
            }

            $uploadDir = $this->getUploadDir();
            $images    = (array)($product['images'] ?? []);

            $this->deleteFile($images['primary']     ?? null, $uploadDir);
            $this->deleteFile($images['hover']       ?? null, $uploadDir);
            $this->deleteFile($images['ingredients'] ?? null, $uploadDir);

            $gallery = $images['gallery'] ?? [];
            if (is_array($gallery)) {
                foreach ($gallery as $gFile) {
                    $this->deleteFile($gFile, $uploadDir);
                }
            }

            $db->products->deleteOne(['_id' => $objectId]);

            return Response::success($response, 'Product deleted successfully.');
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to delete product: ' . $e->getMessage(), 500);
        }
    }

    // ─── Bulk Import ─────────────────────────────────────────────────────────

    public function bulkImport(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $body = $request->getParsedBody();
        $rows = $body['rows'] ?? null;

        if (!is_array($rows) || empty($rows)) {
            return Response::error($response, 'No rows provided. Send { "rows": [...] }.', 400);
        }

        if (count($rows) > 500) {
            return Response::error($response, 'Maximum 500 rows per import.', 400);
        }

        try {
            $db         = Database::getInstance();
            $categories = [];

            // Pre-load all categories keyed by lowercase name
            foreach ($db->subcategories->find() as $cat) {
                $categories[strtolower(trim($cat['name'] ?? ''))] = $cat;
            }

            $validLabels     = ['none', 'new', 'bestseller', 'limited', 'featured'];
            $validCurrencies = ['AED', 'USD', 'SAR', 'KWD', 'OMR', 'BHD', 'QAR', 'GBP', 'EUR'];
            $results         = [];
            $imported        = 0;
            $skipped         = 0;

            foreach ($rows as $index => $row) {
                $rowNum = $index + 1;
                $errors = [];

                // ── Required: name ───────────────────────────────────────────
                $name = trim($row['name'] ?? '');
                if ($name === '') {
                    $errors[] = 'Product name is required.';
                }

                // ── Required: subcategory ────────────────────────────────────
                $subcategoryRaw = strtolower(trim($row['subcategory'] ?? ''));
                $subcategory    = null;
                if ($subcategoryRaw === '') {
                    $errors[] = 'Subcategory is required.';
                } elseif (!isset($categories[$subcategoryRaw])) {
                    $errors[] = "Subcategory \"{$row['subcategory']}\" does not exist.";
                } else {
                    $subcategory = $categories[$subcategoryRaw];
                }

                // ── Duplicate check ──────────────────────────────────────────
                if ($name !== '') {
                    $existing = $db->products->findOne([
                        'name' => new Regex('^' . preg_quote($name, '/') . '$', 'i'),
                    ]);
                    if ($existing) {
                        $errors[] = "A product named \"{$name}\" already exists.";
                    }
                }

                // ── Price ────────────────────────────────────────────────────
                $price = 0.0;
                if (isset($row['price']) && $row['price'] !== '' && $row['price'] !== null) {
                    if (!is_numeric($row['price'])) {
                        $errors[] = 'Price must be a number.';
                    } elseif ((float)$row['price'] < 0) {
                        $errors[] = 'Price cannot be negative.';
                    } else {
                        $price = (float)$row['price'];
                    }
                }

                // ── Currency ─────────────────────────────────────────────────
                $currency = strtoupper(trim($row['currency'] ?? 'AED'));
                if (!in_array($currency, $validCurrencies, true)) {
                    $currency = 'AED';
                }

                // ── Label ─────────────────────────────────────────────────────
                $label = strtolower(trim($row['label'] ?? 'none'));
                if ($label === '') $label = 'none';
                if (!in_array($label, $validLabels, true)) {
                    $errors[] = "Invalid label \"{$label}\". Must be one of: " . implode(', ', $validLabels) . '.';
                    $label = 'none';
                }

                // ── Status ───────────────────────────────────────────────────
                $status = strtolower(trim($row['status'] ?? 'draft'));
                if ($status === '') $status = 'draft';
                if (!in_array($status, ['published', 'draft'], true)) {
                    $errors[] = "Invalid status \"{$status}\". Must be published or draft.";
                    $status = 'draft';
                }

                // ── is_featured ──────────────────────────────────────────────
                $isFeatured = false;
                if (isset($row['is_featured'])) {
                    $fv = strtolower(trim((string)$row['is_featured']));
                    $isFeatured = in_array($fv, ['true', '1', 'yes'], true);
                }

                // ── display_order ────────────────────────────────────────────
                $displayOrder = 0;
                if (isset($row['display_order']) && $row['display_order'] !== '' && $row['display_order'] !== null) {
                    if (!is_numeric($row['display_order'])) {
                        $errors[] = 'display_order must be an integer.';
                    } else {
                        $displayOrder = (int)$row['display_order'];
                    }
                }

                // ── Image URLs — validate format before attempting download ──
                $imageUrlFields = ['primary_image_url', 'hover_image_url', 'ingredients_image_url'];
                $imageUrls      = [];
                foreach ($imageUrlFields as $field) {
                    $url = trim($row[$field] ?? '');
                    if ($url !== '' && !filter_var($url, FILTER_VALIDATE_URL)) {
                        $errors[] = "{$field} is not a valid URL.";
                        $imageUrls[$field] = null;
                    } else {
                        $imageUrls[$field] = $url !== '' ? $url : null;
                    }
                }

                // ── Gallery URLs (comma-separated) — validate format ─────────
                $galleryRawUrls = [];
                $galleryRaw     = trim($row['gallery_image_urls'] ?? '');
                if ($galleryRaw !== '') {
                    foreach (array_map('trim', explode(',', $galleryRaw)) as $gUrl) {
                        if ($gUrl === '') continue;
                        if (!filter_var($gUrl, FILTER_VALIDATE_URL)) {
                            $errors[] = "Gallery URL \"{$gUrl}\" is not valid.";
                        } else {
                            $galleryRawUrls[] = $gUrl;
                        }
                    }
                }

                // ── Purchase links ───────────────────────────────────────────
                $purchaseLinks = [];
                $plRaw = trim($row['purchase_links'] ?? '');
                if ($plRaw !== '') {
                    $decoded = json_decode($plRaw, true);
                    if (!is_array($decoded)) {
                        $errors[] = 'purchase_links must be a valid JSON array, e.g. [{"platform":"Noon","url":"https://..."}]';
                    } else {
                        foreach ($decoded as $pl) {
                            if (empty($pl['platform']) || empty($pl['url'])) {
                                $errors[] = 'Each purchase link must have platform and url fields.';
                            } elseif (!filter_var($pl['url'], FILTER_VALIDATE_URL)) {
                                $errors[] = "Purchase link URL \"{$pl['url']}\" is not valid.";
                            } else {
                                $purchaseLinks[] = ['platform' => (string)$pl['platform'], 'url' => (string)$pl['url']];
                            }
                        }
                    }
                }

                // ── If errors, skip this row ─────────────────────────────────
                if (!empty($errors)) {
                    $results[] = [
                        'row'    => $rowNum,
                        'name'   => $name ?: "(row {$rowNum})",
                        'status' => 'skipped',
                        'errors' => $errors,
                    ];
                    $skipped++;
                    continue;
                }

                // ── Insert ───────────────────────────────────────────────────
                $slug      = $this->generateSlug($name);
                $slug      = $this->ensureUniqueSlug($db, $slug);
                $now       = new \MongoDB\BSON\UTCDateTime();
                $uploadDir = $this->getUploadDir();

                // Download images from URLs and save locally
                $savedImages = [
                    'primary'     => null,
                    'hover'       => null,
                    'gallery'     => [],
                    'ingredients' => null,
                ];

                $imageDownloadWarnings = [];

                foreach (['primary_image_url' => 'primary', 'hover_image_url' => 'hover', 'ingredients_image_url' => 'ingredients'] as $urlField => $imgKey) {
                    if (!empty($imageUrls[$urlField])) {
                        $filename = $this->downloadImageFromUrl($imageUrls[$urlField], $uploadDir);
                        if ($filename) {
                            $savedImages[$imgKey] = $filename;
                        } else {
                            $imageDownloadWarnings[] = "Could not download {$urlField} — URL kept.";
                            $savedImages[$imgKey] = $imageUrls[$urlField]; // fallback: keep URL
                        }
                    }
                }

                foreach ($galleryRawUrls as $gUrl) {
                    $filename = $this->downloadImageFromUrl($gUrl, $uploadDir);
                    if ($filename) {
                        $savedImages['gallery'][] = $filename;
                    } else {
                        $imageDownloadWarnings[] = "Could not download gallery image from {$gUrl} — URL kept.";
                        $savedImages['gallery'][] = $gUrl; // fallback: keep URL
                    }
                }

                $doc = [
                    'name'              => $name,
                    'slug'              => $slug,
                    'subcategory_id'    => $subcategory['_id'],
                    'short_description' => trim($row['short_description'] ?? ''),
                    'full_description'  => trim($row['full_description']  ?? ''),
                    'scent_notes'       => [
                        'top'    => trim($row['top_notes']    ?? ''),
                        'middle' => trim($row['middle_notes'] ?? ''),
                        'base'   => trim($row['base_notes']   ?? ''),
                    ],
                    'price'          => $price,
                    'currency'       => $currency,
                    'purchase_links' => $purchaseLinks,
                    'size_volume'    => trim($row['size_volume'] ?? ''),
                    'images'         => $savedImages,
                    'label'         => $label,
                    'is_featured'   => $isFeatured,
                    'display_order' => $displayOrder,
                    'status'        => $status,
                    'created_at'    => $now,
                    'updated_at'    => $now,
                ];

                $db->products->insertOne($doc);
                $imported++;

                $results[] = [
                    'row'      => $rowNum,
                    'name'     => $name,
                    'status'   => 'imported',
                    'errors'   => [],
                    'warnings' => $imageDownloadWarnings,
                ];
            }

            return Response::json($response, [
                'error' => false,
                'data'  => [
                    'total'    => count($rows),
                    'imported' => $imported,
                    'skipped'  => $skipped,
                    'results'  => $results,
                ],
            ]);
        } catch (\Exception $e) {
            return Response::error($response, 'Bulk import failed: ' . $e->getMessage(), 500);
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function formatProduct(mixed $product, mixed $db): array
    {
        $subcategoryName = '';
        $subcategorySlug = '';

        if (!empty($product['subcategory_id'])) {
            try {
                $cat = $db->subcategories->findOne(['_id' => $product['subcategory_id']]);
                if ($cat) {
                    $subcategoryName = $cat['name'] ?? '';
                    $subcategorySlug = $cat['slug'] ?? '';
                }
            } catch (\Exception $e) {
                // Ignore lookup errors
            }
        }

        $images = (array)($product['images'] ?? []);
        $gallery = [];
        if (isset($images['gallery'])) {
            foreach ((array)$images['gallery'] as $g) {
                $gallery[] = (string)$g;
            }
        }

        $purchaseLinks = [];
        if (isset($product['purchase_links'])) {
            foreach ((array)$product['purchase_links'] as $link) {
                $purchaseLinks[] = [
                    'platform' => $link['platform'] ?? '',
                    'url'      => $link['url']      ?? '',
                ];
            }
        }

        $scentNotes = (array)($product['scent_notes'] ?? []);

        return [
            'id'                => (string)$product['_id'],
            'name'              => $product['name']              ?? '',
            'slug'              => $product['slug']              ?? '',
            'subcategory_id'    => isset($product['subcategory_id']) ? (string)$product['subcategory_id'] : null,
            'subcategory_name'  => $subcategoryName,
            'subcategory_slug'  => $subcategorySlug,
            'short_description' => $product['short_description'] ?? '',
            'full_description'  => $product['full_description']  ?? '',
            'scent_notes'       => [
                'top'    => $scentNotes['top']    ?? '',
                'middle' => $scentNotes['middle'] ?? '',
                'base'   => $scentNotes['base']   ?? '',
            ],
            'price'             => (float)($product['price']      ?? 0),
            'currency'          => $product['currency']           ?? 'USD',
            'purchase_links'    => $purchaseLinks,
            'size_volume'       => $product['size_volume']        ?? '',
            'images'            => [
                'primary'     => $images['primary']     ?? null,
                'hover'       => $images['hover']       ?? null,
                'gallery'     => $gallery,
                'ingredients' => $images['ingredients'] ?? null,
            ],
            'label'             => $product['label']              ?? 'none',
            'is_featured'       => (bool)($product['is_featured'] ?? false),
            'display_order'     => (int)($product['display_order'] ?? 0),
            'status'            => $product['status']             ?? 'draft',
            'created_at'        => isset($product['created_at'])  ? (string)$product['created_at']  : null,
            'updated_at'        => isset($product['updated_at'])  ? (string)$product['updated_at']  : null,
        ];
    }

    private function buildSortOption(string $sort): array
    {
        return match ($sort) {
            'price_asc'  => ['price' => 1],
            'price_desc' => ['price' => -1],
            'name_asc'   => ['name' => 1],
            'name_desc'  => ['name' => -1],
            default      => ['created_at' => -1], // newest
        };
    }

    private function generateSlug(string $text): string
    {
        $slug = strtolower(trim($text));
        $slug = preg_replace('/[^a-z0-9\s\-]/', '', $slug);
        $slug = preg_replace('/[\s\-]+/', '-', $slug);
        return trim($slug, '-');
    }

    private function ensureUniqueSlug(mixed $db, string $slug, ?string $excludeId = null): string
    {
        $base    = $slug;
        $counter = 1;

        while (true) {
            $filter = ['slug' => $slug];
            if ($excludeId !== null) {
                try {
                    $filter['_id'] = ['$ne' => new ObjectId($excludeId)];
                } catch (\Exception $e) {}
            }
            $existing = $db->products->findOne($filter);
            if (!$existing) {
                break;
            }
            $slug = $base . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    private function getUploadDir(): string
    {
        $dir = $_ENV['UPLOAD_DIR'] ?? 'uploads';
        // Make absolute relative to project root (one level above public/)
        if (!str_starts_with($dir, '/') && !preg_match('/^[A-Za-z]:/', $dir)) {
            $dir = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . $dir;
        }
        return $dir;
    }

    private function handleUploadedFile(mixed $uploadedFile, string $uploadDir): ?string
    {
        if (!$uploadedFile || $uploadedFile->getError() !== UPLOAD_ERR_OK) {
            return null;
        }

        $tmpName = $uploadedFile->getStream()->getMetadata('uri');
        $size    = $uploadedFile->getSize();
        $file    = [
            'tmp_name' => $tmpName,
            'size'     => $size,
            'error'    => UPLOAD_ERR_OK,
        ];

        // For Slim PSR-7 uploaded files we need to move them ourselves
        $maxSize = (int)($_ENV['MAX_FILE_SIZE'] ?? 5242880);
        if ($size > $maxSize) {
            throw new \Exception('File size exceeds the maximum allowed size.');
        }

        $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        $extensions   = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

        $finfo    = new \finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($tmpName);

        if (!in_array($mimeType, $allowedMimes, true)) {
            throw new \Exception('Invalid file type. Only JPEG, PNG and WebP images are allowed.');
        }

        $extension = $extensions[$mimeType];
        $filename  = uniqid('img_', true) . '.' . $extension;

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $uploadedFile->moveTo(rtrim($uploadDir, '/\\') . DIRECTORY_SEPARATOR . $filename);

        return $filename;
    }

    private function deleteFile(?string $filename, string $uploadDir): void
    {
        if (empty($filename)) {
            return;
        }
        $path = rtrim($uploadDir, '/\\') . DIRECTORY_SEPARATOR . $filename;
        if (file_exists($path)) {
            @unlink($path);
        }
    }

    /**
     * Download an image from a remote URL, validate it is an image,
     * save it to the upload directory, and return the saved filename.
     * Returns null on failure (caller falls back to storing the URL as-is).
     */
    private function downloadImageFromUrl(string $url, string $uploadDir): ?string
    {
        if (empty($url) || !filter_var($url, FILTER_VALIDATE_URL)) {
            return null;
        }

        // Normalise Google Drive share URLs to direct-download format
        // e.g. https://drive.google.com/file/d/FILE_ID/view  →  https://drive.google.com/uc?export=download&id=FILE_ID
        if (preg_match('#drive\.google\.com/file/d/([^/]+)#', $url, $m)) {
            $url = 'https://drive.google.com/uc?export=download&id=' . $m[1];
        }
        // https://drive.google.com/open?id=FILE_ID
        if (preg_match('#drive\.google\.com/open\?id=([^&]+)#', $url, $m)) {
            $url = 'https://drive.google.com/uc?export=download&id=' . $m[1];
        }

        try {
            $maxSize      = (int)($_ENV['MAX_FILE_SIZE'] ?? 5242880);
            $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
            $extensions   = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

            $ctx = stream_context_create([
                'http' => [
                    'timeout'          => 15,
                    'follow_location'  => 1,
                    'max_redirects'    => 5,
                    'user_agent'       => 'OpalPerfumes/1.0 (+https://opalperfumes.com)',
                ],
                'ssl' => [
                    'verify_peer'      => false,
                    'verify_peer_name' => false,
                ],
            ]);

            $data = @file_get_contents($url, false, $ctx);

            if ($data === false || strlen($data) === 0) {
                return null;
            }

            if (strlen($data) > $maxSize) {
                return null; // too large
            }

            // Detect MIME from content
            $finfo    = new \finfo(FILEINFO_MIME_TYPE);
            $mimeType = $finfo->buffer($data);

            if (!in_array($mimeType, $allowedMimes, true)) {
                return null; // not an image
            }

            $extension = $extensions[$mimeType];
            $filename  = uniqid('img_', true) . '.' . $extension;

            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            $saved = file_put_contents(
                rtrim($uploadDir, '/\\') . DIRECTORY_SEPARATOR . $filename,
                $data
            );

            return $saved !== false ? $filename : null;
        } catch (\Throwable $e) {
            return null;
        }
    }
}
