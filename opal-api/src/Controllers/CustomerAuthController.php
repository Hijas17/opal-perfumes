<?php

namespace Opal\Controllers;

use Firebase\JWT\JWT;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;
use Opal\Config\Database;
use Opal\Helpers\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

class CustomerAuthController
{
    /** Stable issuer string so customer tokens can't be confused with admin tokens. */
    private const JWT_ISSUER = 'opal-customer';

    // ─── Public endpoints ────────────────────────────────────────────────

    public function register(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $body = $request->getParsedBody();

        $name     = trim($body['name'] ?? '');
        $email    = strtolower(trim($body['email'] ?? ''));
        $password = $body['password'] ?? '';
        $phone    = trim($body['phone'] ?? '');

        if ($name === '' || $email === '' || $password === '') {
            return Response::error($response, 'Name, email and password are required.', 400);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return Response::error($response, 'Invalid email address.', 400);
        }
        if (strlen($password) < 6) {
            return Response::error($response, 'Password must be at least 6 characters.', 400);
        }

        try {
            $db = Database::getInstance();

            if ($db->customers->findOne(['email' => $email])) {
                return Response::error($response, 'An account with this email already exists.', 409);
            }

            $now = new UTCDateTime();
            $insert = $db->customers->insertOne([
                'name'          => $name,
                'email'         => $email,
                'phone'         => $phone,
                'password_hash' => password_hash($password, PASSWORD_BCRYPT),
                'created_at'    => $now,
                'updated_at'    => $now,
            ]);

            $id = (string)$insert->getInsertedId();
            $token = $this->issueToken($id, $email);

            return Response::json($response, [
                'error'    => false,
                'token'    => $token,
                'customer' => ['id' => $id, 'name' => $name, 'email' => $email, 'phone' => $phone],
            ], 201);
        } catch (\Exception $e) {
            return Response::error($response, 'Registration failed: ' . $e->getMessage(), 500);
        }
    }

    public function login(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $body = $request->getParsedBody();

        $email    = strtolower(trim($body['email'] ?? ''));
        $password = $body['password'] ?? '';

        if ($email === '' || $password === '') {
            return Response::error($response, 'Email and password are required.', 400);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return Response::error($response, 'Invalid email address.', 400);
        }

        try {
            $db = Database::getInstance();
            $customer = $db->customers->findOne(['email' => $email]);
        } catch (\Exception $e) {
            return Response::error($response, 'Database error: ' . $e->getMessage(), 500);
        }

        if (!$customer || !password_verify($password, $customer['password_hash'])) {
            return Response::error($response, 'Invalid credentials.', 401);
        }

        $id    = (string)$customer['_id'];
        $token = $this->issueToken($id, $customer['email']);

        return Response::json($response, [
            'error'    => false,
            'token'    => $token,
            'customer' => [
                'id'      => $id,
                'name'    => $customer['name']  ?? '',
                'email'   => $customer['email'] ?? '',
                'phone'   => $customer['phone'] ?? '',
                'address' => $customer['address'] ?? null,
            ],
        ]);
    }

    public function logout(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        // Stateless JWT — clients just discard the token. Endpoint exists for symmetry.
        return Response::success($response, 'Logged out successfully.');
    }

    // ─── Protected endpoints (require CustomerAuthMiddleware) ────────────

    public function me(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $customerId = $request->getAttribute('customer_id');
        if (!$customerId) return Response::error($response, 'Unauthorised.', 401);

        try {
            $db = Database::getInstance();
            $customer = $db->customers->findOne(
                ['_id' => new ObjectId($customerId)],
                ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']]
            );
            if (!$customer) return Response::error($response, 'Customer not found.', 404);

            return Response::json($response, [
                'error' => false,
                'data'  => [
                    'id'      => (string)$customer['_id'],
                    'name'    => $customer['name']    ?? '',
                    'email'   => $customer['email']   ?? '',
                    'phone'   => $customer['phone']   ?? '',
                    'address' => $customer['address'] ?? null,
                ],
            ]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to fetch profile: ' . $e->getMessage(), 500);
        }
    }

    public function updateProfile(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $customerId = $request->getAttribute('customer_id');
        if (!$customerId) return Response::error($response, 'Unauthorised.', 401);

        $body = $request->getParsedBody();
        $update = [];
        foreach (['name', 'phone', 'address'] as $field) {
            if (array_key_exists($field, $body)) {
                $update[$field] = is_string($body[$field]) ? trim($body[$field]) : $body[$field];
            }
        }
        if (empty($update)) return Response::error($response, 'Nothing to update.', 400);

        $update['updated_at'] = new UTCDateTime();

        try {
            $db = Database::getInstance();
            $db->customers->updateOne(
                ['_id' => new ObjectId($customerId)],
                ['$set' => $update]
            );
            return Response::success($response, 'Profile updated.');
        } catch (\Exception $e) {
            return Response::error($response, 'Update failed: ' . $e->getMessage(), 500);
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    private function issueToken(string $customerId, string $email): string
    {
        $now    = time();
        $expiry = (int)($_ENV['JWT_EXPIRY'] ?? 86400);
        $secret = $_ENV['JWT_SECRET'] ?? 'secret';

        return JWT::encode([
            'iss'   => self::JWT_ISSUER,
            'iat'   => $now,
            'exp'   => $now + $expiry,
            'sub'   => $customerId,
            'email' => $email,
        ], $secret, 'HS256');
    }
}
