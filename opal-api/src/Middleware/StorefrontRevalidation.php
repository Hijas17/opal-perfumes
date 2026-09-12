<?php

declare(strict_types=1);

namespace Opal\Middleware;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * Tell the storefront to drop its cached reads after an admin write.
 *
 * The storefront caches API responses server-side for minutes at a time, which
 * is what keeps it quick. Without this ping, an admin save only appeared once
 * that TTL lapsed — up to ten minutes later — and reloading the browser did
 * nothing, because the stale copy sits in the Next server's cache rather than
 * the visitor's.
 *
 * Sitting in middleware rather than in each controller is deliberate: a write
 * added later is covered automatically, whereas a purge call per controller is
 * one someone eventually forgets.
 *
 * The ping is best-effort by design. If the storefront is down, mid-deploy, or
 * simply not configured, the admin's save still succeeded and must still report
 * success — the only cost of a missed ping is that the change waits for the
 * ordinary TTL, which is the behaviour we had before this existed.
 */
final class StorefrontRevalidation implements MiddlewareInterface
{
    /** Long enough for a local or same-host call; short enough not to stall the admin UI. */
    private const TIMEOUT_SECONDS = 3;

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $response = $handler->handle($request);

        if ($this->changedSomething($request, $response)) {
            $this->ping();
        }

        return $response;
    }

    /**
     * A write that actually took effect. GET/HEAD/OPTIONS change nothing, and a
     * rejected write (401 from auth, 404, 422) leaves the data as it was — a
     * purge for either just throws away a warm cache for no reason.
     */
    private function changedSomething(ServerRequestInterface $request, ResponseInterface $response): bool
    {
        $method = strtoupper($request->getMethod());
        if (in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
            return false;
        }

        $status = $response->getStatusCode();

        return $status >= 200 && $status < 300;
    }

    private function ping(): void
    {
        $url    = $_ENV['STOREFRONT_URL']      ?? getenv('STOREFRONT_URL')      ?: '';
        $secret = $_ENV['REVALIDATE_SECRET']   ?? getenv('REVALIDATE_SECRET')   ?: '';

        // Not configured is a normal state — local development, or a deploy that
        // has not set these yet. Stay silent rather than logging on every save.
        if ($url === '' || $secret === '') {
            return;
        }

        $endpoint = rtrim($url, '/') . '/api/revalidate';

        $ch = curl_init($endpoint);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => '{}',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => self::TIMEOUT_SECONDS,
            CURLOPT_CONNECTTIMEOUT => self::TIMEOUT_SECONDS,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'X-Revalidate-Secret: ' . $secret,
            ],
        ]);

        $body   = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error  = curl_error($ch);
        curl_close($ch);

        // Log, never throw: the write succeeded and the response is already
        // built. A failure here means slower propagation, not lost data — but it
        // should be visible, because a permanently misconfigured secret would
        // otherwise look exactly like the bug this middleware was added to fix.
        if ($body === false || $status < 200 || $status >= 300) {
            error_log(sprintf(
                '[revalidate] storefront purge failed: %s (HTTP %d) %s',
                $error !== '' ? $error : 'unexpected response',
                $status,
                is_string($body) ? substr($body, 0, 200) : ''
            ));
        }
    }
}
