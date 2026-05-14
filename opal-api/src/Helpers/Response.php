<?php

namespace Opal\Helpers;

use Psr\Http\Message\ResponseInterface;

class Response
{
    public static function json(ResponseInterface $response, mixed $data, int $status = 200): ResponseInterface
    {
        $payload = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $response->getBody()->write($payload);
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }

    public static function error(ResponseInterface $response, string $message, int $status = 400): ResponseInterface
    {
        return self::json($response, ['error' => true, 'message' => $message], $status);
    }

    public static function success(ResponseInterface $response, string $message, mixed $data = []): ResponseInterface
    {
        $payload = ['error' => false, 'message' => $message];
        if (!empty($data)) {
            $payload['data'] = $data;
        }
        return self::json($response, $payload, 200);
    }
}
