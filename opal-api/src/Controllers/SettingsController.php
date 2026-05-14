<?php

namespace Opal\Controllers;

use Opal\Config\Database;
use Opal\Helpers\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

class SettingsController
{
    private const PUBLIC_KEYS = [
        'brand_name',
        'footer_tagline',
        'contact_email',
        'contact_phone',
        'address',
        'facebook_url',
        'instagram_url',
        'youtube_url',
        'whatsapp_number',
        'currency',
        // Home page
        'hero_image',
        'hero_bottle_image',
        'hero_tagline',
        'hero_headline',
        'hero_subtext',
        'about_snippet',
        'cta_message',
        // About Us page
        'about_hero_image',
        'brand_story',
        'mission_statement',
        'founder_photo',
        'founder_bio',
    ];

    // ─── Public ──────────────────────────────────────────────────────────────

    public function publicIndex(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $db     = Database::getInstance();
            $cursor = $db->site_settings->find(['key' => ['$in' => self::PUBLIC_KEYS]]);

            $settings = [];
            foreach ($cursor as $setting) {
                $settings[$setting['key']] = $setting['value'];
            }

            return Response::json($response, ['error' => false, 'data' => $settings]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to fetch settings: ' . $e->getMessage(), 500);
        }
    }

    // ─── Admin ───────────────────────────────────────────────────────────────

    public function adminIndex(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $db     = Database::getInstance();
            $cursor = $db->site_settings->find([], ['sort' => ['key' => 1]]);

            $settings = [];
            foreach ($cursor as $setting) {
                $settings[$setting['key']] = $setting['value'];
            }

            return Response::json($response, ['error' => false, 'data' => $settings]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to fetch settings: ' . $e->getMessage(), 500);
        }
    }

    public function update(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $body = $request->getParsedBody();

        if (empty($body) || !is_array($body)) {
            return Response::error($response, 'Request body must be a JSON object of key-value pairs.', 400);
        }

        try {
            $db = Database::getInstance();

            foreach ($body as $key => $value) {
                $key = (string)$key;
                if (empty($key)) {
                    continue;
                }

                $db->site_settings->updateOne(
                    ['key' => $key],
                    [
                        '$set' => [
                            'key'        => $key,
                            'value'      => $value,
                            'updated_at' => new \MongoDB\BSON\UTCDateTime(),
                        ],
                        '$setOnInsert' => [
                            'created_at' => new \MongoDB\BSON\UTCDateTime(),
                        ],
                    ],
                    ['upsert' => true]
                );
            }

            return Response::success($response, 'Settings updated successfully.');
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to update settings: ' . $e->getMessage(), 500);
        }
    }

    public function uploadImage(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $body          = $request->getParsedBody();
        $uploadedFiles = $request->getUploadedFiles();
        $key           = trim($body['key'] ?? '');

        if (empty($key)) {
            return Response::error($response, 'Setting key is required.', 400);
        }

        if (!isset($uploadedFiles['file'])) {
            return Response::error($response, 'No file uploaded.', 400);
        }

        $uploadedFile = $uploadedFiles['file'];

        if ($uploadedFile->getError() !== UPLOAD_ERR_OK) {
            return Response::error($response, 'File upload error.', 400);
        }

        $maxSize = (int)($_ENV['MAX_FILE_SIZE'] ?? 5242880);
        if ($uploadedFile->getSize() > $maxSize) {
            return Response::error($response, 'File size exceeds maximum allowed size.', 400);
        }

        $tmpName      = $uploadedFile->getStream()->getMetadata('uri');
        $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        $extensions   = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

        $finfo    = new \finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($tmpName);

        if (!in_array($mimeType, $allowedMimes, true)) {
            return Response::error($response, 'Invalid file type. Only JPEG, PNG and WebP are allowed.', 400);
        }

        $uploadDir = $_ENV['UPLOAD_DIR'] ?? 'uploads';
        if (!str_starts_with($uploadDir, '/') && !preg_match('/^[A-Za-z]:/', $uploadDir)) {
            $uploadDir = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . $uploadDir;
        }

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $filename = uniqid('setting_', true) . '.' . $extensions[$mimeType];
        $uploadedFile->moveTo(rtrim($uploadDir, '/\\') . DIRECTORY_SEPARATOR . $filename);

        try {
            $db = Database::getInstance();
            $db->site_settings->updateOne(
                ['key' => $key],
                [
                    '$set' => [
                        'key'        => $key,
                        'value'      => $filename,
                        'updated_at' => new \MongoDB\BSON\UTCDateTime(),
                    ],
                    '$setOnInsert' => [
                        'created_at' => new \MongoDB\BSON\UTCDateTime(),
                    ],
                ],
                ['upsert' => true]
            );

            return Response::json($response, [
                'error'   => false,
                'message' => 'Image uploaded successfully.',
                'data'    => ['key' => $key, 'value' => $filename],
            ]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to save setting: ' . $e->getMessage(), 500);
        }
    }
}
