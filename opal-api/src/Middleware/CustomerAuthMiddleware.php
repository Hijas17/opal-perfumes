<?php

namespace Opal\Middleware;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\SignatureInvalidException;
use Opal\Helpers\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response as SlimResponse;

/**
 * Verifies a customer JWT (issued by CustomerAuthController) and stashes the
 * customer id + email on the request for downstream handlers. Rejects tokens
 * with a different `iss` so admin tokens can never authenticate customer
 * routes (and vice-versa).
 */
class CustomerAuthMiddleware implements MiddlewareInterface
{
    private const EXPECTED_ISSUER = 'opal-customer';

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $authHeader = $request->getHeaderLine('Authorization');
        if (empty($authHeader) || !str_starts_with($authHeader, 'Bearer ')) {
            return Response::error(new SlimResponse(), 'Authentication required.', 401);
        }
        $token = substr($authHeader, 7);

        try {
            $secret  = $_ENV['JWT_SECRET'] ?? 'secret';
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));

            if (($decoded->iss ?? null) !== self::EXPECTED_ISSUER) {
                return Response::error(new SlimResponse(), 'Invalid token.', 401);
            }

            $request = $request
                ->withAttribute('customer_id',    $decoded->sub   ?? null)
                ->withAttribute('customer_email', $decoded->email ?? null);
        } catch (ExpiredException) {
            return Response::error(new SlimResponse(), 'Session expired. Please log in again.', 401);
        } catch (SignatureInvalidException) {
            return Response::error(new SlimResponse(), 'Invalid token signature.', 401);
        } catch (\Exception) {
            return Response::error(new SlimResponse(), 'Invalid or malformed token.', 401);
        }

        return $handler->handle($request);
    }
}
