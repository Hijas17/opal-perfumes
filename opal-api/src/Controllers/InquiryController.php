<?php

namespace Opal\Controllers;

use MongoDB\BSON\ObjectId;
use Opal\Config\Database;
use Opal\Helpers\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

class InquiryController
{
    // ─── Public ──────────────────────────────────────────────────────────────

    public function store(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $body = $request->getParsedBody();

        $name    = trim($body['name']    ?? '');
        $email   = trim($body['email']   ?? '');
        $message = trim($body['message'] ?? '');
        $phone   = trim($body['phone']   ?? '');
        $subject = trim($body['subject'] ?? '');

        if (empty($name)) {
            return Response::error($response, 'Name is required.', 400);
        }
        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return Response::error($response, 'A valid email address is required.', 400);
        }
        if (empty($message)) {
            return Response::error($response, 'Message is required.', 400);
        }

        // Rate limiting: max 5 inquiries per IP in last 3600 seconds
        $ip      = $this->getClientIp($request);
        $cutoff  = new \MongoDB\BSON\UTCDateTime((time() - 3600) * 1000);

        try {
            $db = Database::getInstance();

            $recentCount = $db->inquiries->countDocuments([
                'ip'         => $ip,
                'created_at' => ['$gte' => $cutoff],
            ]);

            if ($recentCount >= 5) {
                return Response::error(
                    $response,
                    'Too many inquiries submitted. Please try again later.',
                    429
                );
            }

            $now = new \MongoDB\BSON\UTCDateTime();
            $doc = [
                'name'       => $name,
                'email'      => $email,
                'phone'      => $phone,
                'subject'    => $subject,
                'message'    => $message,
                'ip'         => $ip,
                'is_read'    => false,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            $result = $db->inquiries->insertOne($doc);

            // Send admin notification email
            $this->sendAdminNotification($name, $email, $subject, $message);

            return Response::json($response, [
                'error'   => false,
                'message' => 'Your inquiry has been submitted successfully. We will get back to you soon.',
                'data'    => ['id' => (string)$result->getInsertedId()],
            ], 201);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to submit inquiry: ' . $e->getMessage(), 500);
        }
    }

    // ─── Admin ───────────────────────────────────────────────────────────────

    public function index(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $params = $request->getQueryParams();
        $filter = [];

        if (isset($params['read']) && $params['read'] !== '') {
            $filter['is_read'] = filter_var($params['read'], FILTER_VALIDATE_BOOLEAN);
        }

        try {
            $db     = Database::getInstance();
            $cursor = $db->inquiries->find($filter, ['sort' => ['created_at' => -1]]);

            $inquiries = [];
            foreach ($cursor as $inquiry) {
                $inquiries[] = $this->formatInquiry($inquiry);
            }

            return Response::json($response, ['error' => false, 'data' => $inquiries]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to fetch inquiries: ' . $e->getMessage(), 500);
        }
    }

    public function update(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = $args['id'] ?? '';

        try {
            $objectId = new ObjectId($id);
        } catch (\Exception $e) {
            return Response::error($response, 'Invalid inquiry ID.', 400);
        }

        try {
            $db      = Database::getInstance();
            $inquiry = $db->inquiries->findOne(['_id' => $objectId]);

            if (!$inquiry) {
                return Response::error($response, 'Inquiry not found.', 404);
            }

            $body         = $request->getParsedBody();
            $updateFields = [];

            if (isset($body['is_read'])) {
                $updateFields['is_read'] = filter_var($body['is_read'], FILTER_VALIDATE_BOOLEAN);
            } else {
                // Toggle if not specified
                $updateFields['is_read'] = !((bool)($inquiry['is_read'] ?? false));
            }

            $updateFields['updated_at'] = new \MongoDB\BSON\UTCDateTime();

            $db->inquiries->updateOne(['_id' => $objectId], ['$set' => $updateFields]);

            $updated = $db->inquiries->findOne(['_id' => $objectId]);

            return Response::json($response, [
                'error'   => false,
                'message' => 'Inquiry updated successfully.',
                'data'    => $this->formatInquiry($updated),
            ]);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to update inquiry: ' . $e->getMessage(), 500);
        }
    }

    public function destroy(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = $args['id'] ?? '';

        try {
            $objectId = new ObjectId($id);
        } catch (\Exception $e) {
            return Response::error($response, 'Invalid inquiry ID.', 400);
        }

        try {
            $db      = Database::getInstance();
            $inquiry = $db->inquiries->findOne(['_id' => $objectId]);

            if (!$inquiry) {
                return Response::error($response, 'Inquiry not found.', 404);
            }

            $db->inquiries->deleteOne(['_id' => $objectId]);

            return Response::success($response, 'Inquiry deleted successfully.');
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to delete inquiry: ' . $e->getMessage(), 500);
        }
    }

    public function export(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $db     = Database::getInstance();
            $cursor = $db->inquiries->find([], ['sort' => ['created_at' => -1]]);

            $lines   = [];
            $headers = ['ID', 'Name', 'Email', 'Phone', 'Subject', 'Message', 'Read', 'Submitted At'];
            $lines[] = implode(',', array_map([$this, 'csvEscape'], $headers));

            foreach ($cursor as $inquiry) {
                $row = [
                    (string)$inquiry['_id'],
                    $inquiry['name']    ?? '',
                    $inquiry['email']   ?? '',
                    $inquiry['phone']   ?? '',
                    $inquiry['subject'] ?? '',
                    $inquiry['message'] ?? '',
                    ($inquiry['is_read'] ?? false) ? 'Yes' : 'No',
                    isset($inquiry['created_at']) ? (string)$inquiry['created_at'] : '',
                ];
                $lines[] = implode(',', array_map([$this, 'csvEscape'], $row));
            }

            $csv = implode("\n", $lines);

            $response->getBody()->write($csv);
            return $response
                ->withHeader('Content-Type', 'text/csv')
                ->withHeader('Content-Disposition', 'attachment; filename="inquiries.csv"')
                ->withStatus(200);
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to export inquiries: ' . $e->getMessage(), 500);
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function formatInquiry(mixed $inquiry): array
    {
        return [
            'id'         => (string)$inquiry['_id'],
            'name'       => $inquiry['name']       ?? '',
            'email'      => $inquiry['email']      ?? '',
            'phone'      => $inquiry['phone']      ?? '',
            'subject'    => $inquiry['subject']    ?? '',
            'message'    => $inquiry['message']    ?? '',
            'ip'         => $inquiry['ip']         ?? '',
            'is_read'    => (bool)($inquiry['is_read']   ?? false),
            'created_at' => isset($inquiry['created_at']) ? (string)$inquiry['created_at'] : null,
            'updated_at' => isset($inquiry['updated_at']) ? (string)$inquiry['updated_at'] : null,
        ];
    }

    private function getClientIp(ServerRequestInterface $request): string
    {
        $serverParams = $request->getServerParams();

        foreach (['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'] as $key) {
            if (!empty($serverParams[$key])) {
                $ip = explode(',', $serverParams[$key])[0];
                return trim($ip);
            }
        }

        return '0.0.0.0';
    }

    private function sendAdminNotification(string $name, string $email, string $subject, string $message): void
    {
        $adminEmail = $_ENV['ADMIN_NOTIFICATION_EMAIL'] ?? '';
        $fromEmail  = $_ENV['MAIL_FROM'] ?? 'noreply@opalperfumes.com';

        if (empty($adminEmail)) {
            error_log("Inquiry notification: new inquiry from {$name} <{$email}> — subject: {$subject}");
            return;
        }

        $emailSubject = 'New Inquiry from Opal Perfumes Website';
        $emailBody    = "You have received a new inquiry.\n\n"
            . "Name: {$name}\n"
            . "Email: {$email}\n"
            . "Subject: {$subject}\n\n"
            . "Message:\n{$message}\n";

        $headers = "From: {$fromEmail}\r\nReply-To: {$email}\r\nContent-Type: text/plain; charset=UTF-8";

        if (!@mail($adminEmail, $emailSubject, $emailBody, $headers)) {
            error_log("Failed to send inquiry notification email to {$adminEmail}");
        }
    }

    private function csvEscape(string $value): string
    {
        // Escape double quotes and wrap in double quotes if necessary
        if (str_contains($value, '"') || str_contains($value, ',') || str_contains($value, "\n")) {
            return '"' . str_replace('"', '""', $value) . '"';
        }
        return $value;
    }
}
