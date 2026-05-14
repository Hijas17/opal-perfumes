<?php

namespace Opal\Helpers;

class Upload
{
    private static array $allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/webp',
    ];

    private static array $allowedExtensions = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
    ];

    /**
     * Handle a single uploaded file.
     *
     * @param array  $file      Entry from $_FILES (single file, not array slot)
     * @param string $uploadDir Absolute path to upload directory
     * @return string           Saved filename
     * @throws \Exception
     */
    public static function handle(array $file, string $uploadDir): string
    {
        if (!isset($file['tmp_name']) || $file['error'] !== UPLOAD_ERR_OK) {
            $errorMessages = [
                UPLOAD_ERR_INI_SIZE   => 'File exceeds server upload limit.',
                UPLOAD_ERR_FORM_SIZE  => 'File exceeds form upload limit.',
                UPLOAD_ERR_PARTIAL    => 'File was only partially uploaded.',
                UPLOAD_ERR_NO_FILE    => 'No file was uploaded.',
                UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder.',
                UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk.',
                UPLOAD_ERR_EXTENSION  => 'A PHP extension stopped the upload.',
            ];
            $code = $file['error'] ?? UPLOAD_ERR_NO_FILE;
            throw new \Exception($errorMessages[$code] ?? 'Unknown upload error.');
        }

        $maxSize = (int)($_ENV['MAX_FILE_SIZE'] ?? 5242880);
        if ($file['size'] > $maxSize) {
            throw new \Exception('File size exceeds the maximum allowed size of ' . ($maxSize / 1048576) . 'MB.');
        }

        // Detect real MIME type from content, not from client-supplied header
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);

        if (!in_array($mimeType, self::$allowedMimes, true)) {
            throw new \Exception('Invalid file type. Only JPEG, PNG and WebP images are allowed.');
        }

        $extension = self::$allowedExtensions[$mimeType];
        $filename  = uniqid('img_', true) . '.' . $extension;

        if (!is_dir($uploadDir)) {
            if (!mkdir($uploadDir, 0755, true)) {
                throw new \Exception('Failed to create upload directory.');
            }
        }

        $destination = rtrim($uploadDir, '/\\') . DIRECTORY_SEPARATOR . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            throw new \Exception('Failed to move uploaded file.');
        }

        return $filename;
    }
}
