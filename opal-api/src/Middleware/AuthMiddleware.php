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

class AuthMiddleware implements MiddlewareInterface
{
    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $authHeader = $request->getHeaderLine('Authorization');

        if (empty($authHeader) || !str_starts_with($authHeader, 'Bearer ')) {
            $response = new SlimResponse();
            return Response::error($response, 'Authorization token is required.', 401);
        }

        $token = substr($authHeader, 7);

        try {
            $secret = $_ENV['JWT_SECRET'] ?? 'secret';
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));
            $request = $request->withAttribute('admin_id', $decoded->sub ?? null);
            $request = $request->withAttribute('admin_email', $decoded->email ?? null);
        } catch (ExpiredException $e) {
            $response = new SlimResponse();
            return Response::error($response, 'Token has expired.', 401);
        } catch (SignatureInvalidException $e) {
            $response = new SlimResponse();
            return Response::error($response, 'Invalid token signature.', 401);
        } catch (\Exception $e) {
            $response = new SlimResponse();
            return Response::error($response, 'Invalid or malformed token.', 401);
        }

        return $handler->handle($request);
    }
}
