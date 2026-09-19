<?php

namespace Opal\Controllers;

use MongoDB\BSON\ObjectId;
use Opal\Config\Database;
use Opal\Helpers\Coupons;
use Opal\Helpers\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Customer-facing promo code check.
 *
 * Lets the checkout show what a code is worth before the order is submitted.
 * It is a preview only — order placement re-evaluates the code against the
 * cart as it stands at that moment, so nothing here can be replayed to lock in
 * a discount the cart no longer qualifies for.
 */
class CouponController
{
    public function validateCode(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $customerId = $request->getAttribute('customer_id');
        if (!$customerId) return Response::error($response, 'Unauthorised.', 401);

        $body = $request->getParsedBody();
        $code = is_array($body) ? (string)($body['code'] ?? '') : '';

        try {
            $cart = Database::getInstance()->carts->findOne(
                ['customer_id' => new ObjectId($customerId)],
                ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']]
            );
            $items = $cart['items'] ?? [];
            if (empty($items)) {
                return Response::error($response, 'Your cart is empty.', 400);
            }

            $result = Coupons::evaluate($code, $items, $customerId);

            // A rejected code is a normal outcome, not a server problem — 200
            // with ok:false keeps the checkout's error handling simple.
            return Response::json($response, [
                'error' => false,
                'data'  => [
                    'ok'       => $result['ok'],
                    'message'  => $result['message'],
                    'code'     => $result['code'],
                    'discount' => $result['discount'],
                ],
            ]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to check promo code: ' . $e->getMessage(), 500);
        }
    }
}
