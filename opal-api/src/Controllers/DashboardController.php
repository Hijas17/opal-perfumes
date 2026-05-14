<?php

namespace Opal\Controllers;

use Opal\Config\Database;
use Opal\Helpers\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

class DashboardController
{
    public function index(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $db = Database::getInstance();

            // Total products
            $totalProducts = $db->products->countDocuments([]);

            // Products by category
            $pipeline = [
                [
                    '$group' => [
                        '_id'   => '$subcategory_id',
                        'count' => ['$sum' => 1],
                    ],
                ],
            ];
            $grouped = $db->products->aggregate($pipeline);

            $productsByCategory = [];
            foreach ($grouped as $group) {
                $categoryName = 'Uncategorized';
                if (!empty($group['_id'])) {
                    try {
                        $cat = $db->subcategories->findOne(['_id' => $group['_id']]);
                        if ($cat) {
                            $categoryName = $cat['name'] ?? 'Uncategorized';
                        }
                    } catch (\Exception $e) {
                        // ignore
                    }
                }
                $productsByCategory[] = [
                    'name'  => $categoryName,
                    'count' => (int)$group['count'],
                ];
            }

            // Unread inquiries count
            $unreadInquiries = $db->inquiries->countDocuments(['is_read' => false]);

            // Recent 5 inquiries
            $recentCursor    = $db->inquiries->find(
                [],
                [
                    'sort'  => ['created_at' => -1],
                    'limit' => 5,
                ]
            );

            $recentInquiries = [];
            foreach ($recentCursor as $inquiry) {
                $recentInquiries[] = [
                    'id'         => (string)$inquiry['_id'],
                    'name'       => $inquiry['name']       ?? '',
                    'email'      => $inquiry['email']      ?? '',
                    'subject'    => $inquiry['subject']    ?? '',
                    'is_read'    => (bool)($inquiry['is_read'] ?? false),
                    'created_at' => isset($inquiry['created_at']) ? (string)$inquiry['created_at'] : null,
                ];
            }

            return Response::json($response, [
                'error' => false,
                'data'  => [
                    'total_products'       => (int)$totalProducts,
                    'products_by_category' => $productsByCategory,
                    'unread_inquiries'     => (int)$unreadInquiries,
                    'recent_inquiries'     => $recentInquiries,
                ],
            ]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to load dashboard: ' . $e->getMessage(), 500);
        }
    }
}
