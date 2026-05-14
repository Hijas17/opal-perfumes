<?php

namespace Opal\Controllers;

use Opal\Helpers\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

class MediaController
{
    // ─── Admin ───────────────────────────────────────────────────────────────

    public function index(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $uploadDir = $this->getUploadDir();

            if (!is_dir($uploadDir)) {
                return Response::json($response, ['error' => false, 'data' => []]);
            }

            $files = [];
            $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];

            $items = scandir($uploadDir);
            if ($items === false) {
                return Response::error($response, 'Failed to read upload directory.', 500);
            }

            foreach ($items as $item) {
                if ($item === '.' || $item === '..' || $item === '.gitkeep') {
                    continue;
                }

                $ext = strtolower(pathinfo($item, PATHINFO_EXTENSION));
                if (!in_array($ext, $allowedExtensions, true)) {
                    continue;
                }

                $fullPath = $uploadDir . DIRECTORY_SEPARATOR . $item;
                if (!is_file($fullPath)) {
                    continue;
                }

                $files[] = [
                    'name' => $item,
                    'size' => filesize($fullPath),
                    'url'  => '/uploads/' . $item,
                ];
            }

            // Sort by filename descending (newest uniqid first)
            usort($files, fn($a, $b) => strcmp($b['name'], $a['name']));

            return Response::json($response, ['error' => false, 'data' => $files]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to list media: ' . $e->getMessage(), 500);
        }
    }

    public function upload(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $uploadedFiles = $request->getUploadedFiles();

        if (empty($uploadedFiles['file'])) {
            return Response::error($response, 'No file uploaded. Use field name "file".', 400);
        }

        $uploadedFile = $uploadedFiles['file'];

        if ($uploadedFile->getError() !== UPLOAD_ERR_OK) {
            return Response::error($response, 'File upload failed with error code: ' . $uploadedFile->getError(), 400);
        }

        try {
            $uploadDir  = $this->getUploadDir();
            $maxSize    = (int)($_ENV['MAX_FILE_SIZE'] ?? 5242880);
            $size       = $uploadedFile->getSize();

            if ($size > $maxSize) {
                return Response::error($response, 'File size exceeds the maximum allowed size of ' . ($maxSize / 1048576) . 'MB.', 400);
            }

            $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
            $extensions   = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

            $tmpUri   = $uploadedFile->getStream()->getMetadata('uri');
            $finfo    = new \finfo(FILEINFO_MIME_TYPE);
            $mimeType = $finfo->file($tmpUri);

            if (!in_array($mimeType, $allowedMimes, true)) {
                return Response::error($response, 'Invalid file type. Only JPEG, PNG and WebP images are allowed.', 400);
            }

            $extension = $extensions[$mimeType];
            $filename  = uniqid('img_', true) . '.' . $extension;

            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            $destination = rtrim($uploadDir, '/\\') . DIRECTORY_SEPARATOR . $filename;
            $uploadedFile->moveTo($destination);

            return Response::json($response, [
                'error'   => false,
                'message' => 'File uploaded successfully.',
                'data'    => [
                    'name' => $filename,
                    'size' => $size,
                    'url'  => '/uploads/' . $filename,
                ],
            ], 201);
        } catch (\Exception $e) {
            return Response::error($response, 'Upload failed: ' . $e->getMessage(), 500);
        }
    }

    public function destroy(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $filename = $args['filename'] ?? '';

        if (empty($filename)) {
            return Response::error($response, 'Filename is required.', 400);
        }

        // Security: prevent directory traversal
        $basename = basename($filename);
        if ($basename !== $filename || str_contains($filename, '/') || str_contains($filename, '\\')) {
            return Response::error($response, 'Invalid filename.', 400);
        }

        try {
            $uploadDir = $this->getUploadDir();
            $path      = rtrim($uploadDir, '/\\') . DIRECTORY_SEPARATOR . $basename;

            if (!file_exists($path)) {
                return Response::error($response, 'File not found.', 404);
            }

            if (!is_file($path)) {
                return Response::error($response, 'Path is not a file.', 400);
            }

            if (!unlink($path)) {
                return Response::error($response, 'Failed to delete file.', 500);
            }

            return Response::success($response, 'File deleted successfully.');
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to delete file: ' . $e->getMessage(), 500);
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function getUploadDir(): string
    {
        $dir = $_ENV['UPLOAD_DIR'] ?? 'uploads';
        if (!str_starts_with($dir, '/') && !preg_match('/^[A-Za-z]:/', $dir)) {
            $dir = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . $dir;
        }
        return $dir;
    }
}
