<?php

namespace Opal\Controllers;

use Firebase\JWT\JWT;
use Opal\Config\Database;
use Opal\Helpers\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

class AuthController
{
    public function login(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $body = $request->getParsedBody();

        $email    = trim($body['email'] ?? '');
        $password = $body['password'] ?? '';

        if (empty($email) || empty($password)) {
            return Response::error($response, 'Email and password are required.', 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return Response::error($response, 'Invalid email address.', 400);
        }

        try {
            $db    = Database::getInstance();
            $admin = $db->admin_users->findOne(['email' => $email]);
        } catch (\Exception $e) {
            return Response::error($response, 'Database error: ' . $e->getMessage(), 500);
        }

        if (!$admin) {
            return Response::error($response, 'Invalid credentials.', 401);
        }

        if (!password_verify($password, $admin['password_hash'])) {
            return Response::error($response, 'Invalid credentials.', 401);
        }

        $now     = time();
        $expiry  = (int)($_ENV['JWT_EXPIRY'] ?? 86400);
        $secret  = $_ENV['JWT_SECRET'] ?? 'secret';

        $payload = [
            'iss' => 'opal-api',
            'iat' => $now,
            'exp' => $now + $expiry,
            'sub' => (string)$admin['_id'],
            'email' => $admin['email'],
        ];

        $token = JWT::encode($payload, $secret, 'HS256');

        return Response::json($response, [
            'error' => false,
            'token' => $token,
            'admin' => [
                'id'    => (string)$admin['_id'],
                'email' => $admin['email'],
                'name'  => $admin['name'] ?? '',
            ],
        ]);
    }

    public function logout(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        return Response::success($response, 'Logged out successfully.');
    }
}
