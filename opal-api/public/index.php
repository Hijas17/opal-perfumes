<?php

declare(strict_types=1);

use Opal\Controllers\AuthController;
use Opal\Controllers\CartController;
use Opal\Controllers\CategoryController;
use Opal\Controllers\CustomerAuthController;
use Opal\Controllers\DashboardController;
use Opal\Controllers\InquiryController;
use Opal\Controllers\MediaController;
use Opal\Controllers\OrderController;
use Opal\Controllers\ProductController;
use Opal\Controllers\SettingsController;
use Opal\Middleware\AuthMiddleware;
use Opal\Middleware\CustomerAuthMiddleware;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Slim\Factory\AppFactory;
use Slim\Routing\RouteCollectorProxy;

require_once __DIR__ . '/../vendor/autoload.php';

// ─── Load .env ───────────────────────────────────────────────────────────────
$dotenv = Dotenv\Dotenv::createImmutable(dirname(__DIR__));
$dotenv->safeLoad();

// ─── Create Slim app ─────────────────────────────────────────────────────────
$app = AppFactory::create();

// Add error middleware (must be last middleware added)
$app->addRoutingMiddleware();

// ─── CORS Middleware ─────────────────────────────────────────────────────────
$app->add(function (ServerRequestInterface $request, $handler) {
    // Read ALLOWED_ORIGINS: check $_ENV first (phpdotenv), then getenv() (Docker/Apache env vars)
    $allowedOriginsRaw = $_ENV['ALLOWED_ORIGINS'] ?? getenv('ALLOWED_ORIGINS') ?: '*';
    $allowedOrigins    = array_values(array_filter(array_map('trim', explode(',', $allowedOriginsRaw))));

    $origin        = $request->getHeaderLine('Origin');
    $allowedOrigin = '*';

    if (!empty($allowedOrigins) && $origin !== '') {
        $allowedOrigin = in_array($origin, $allowedOrigins, true) ? $origin : 'null';
    }

    // Handle preflight OPTIONS request
    if ($request->getMethod() === 'OPTIONS') {
        $response = new \Slim\Psr7\Response();
        return $response
            ->withHeader('Access-Control-Allow-Origin', $allowedOrigin)
            ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            ->withHeader('Access-Control-Allow-Credentials', 'true')
            ->withHeader('Access-Control-Max-Age', '3600')
            ->withStatus(200);
    }

    $response = $handler->handle($request);

    return $response
        ->withHeader('Access-Control-Allow-Origin', $allowedOrigin)
        ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        ->withHeader('Access-Control-Allow-Credentials', 'true');
});

// ─── Body Parsing Middleware ──────────────────────────────────────────────────
$app->addBodyParsingMiddleware();

// ─── Static uploads route ────────────────────────────────────────────────────
// Serve files from the uploads/ directory at /uploads/{filename}
$app->get('/uploads/{filename}', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $filename  = basename($args['filename']);
    $uploadDir = $_ENV['UPLOAD_DIR'] ?? 'uploads';

    if (!str_starts_with($uploadDir, '/') && !preg_match('/^[A-Za-z]:/', $uploadDir)) {
        $uploadDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . $uploadDir;
    }

    $path = rtrim($uploadDir, '/\\') . DIRECTORY_SEPARATOR . $filename;

    if (!file_exists($path) || !is_file($path)) {
        $response->getBody()->write(json_encode(['error' => true, 'message' => 'File not found.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
    }

    $finfo    = new \finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($path);

    $fileContents = file_get_contents($path);
    $response->getBody()->write($fileContents);

    return $response
        ->withHeader('Content-Type', $mimeType)
        ->withHeader('Content-Length', (string)filesize($path))
        ->withHeader('Cache-Control', 'public, max-age=31536000');
});

// ─── API Routes ───────────────────────────────────────────────────────────────
$app->group('/api', function (RouteCollectorProxy $api) {

    // ── Auth ────────────────────────────────────────────────────────────────
    $api->post('/auth/login',  [AuthController::class, 'login']);
    $api->post('/auth/logout', [AuthController::class, 'logout']);

    // ── Public: Categories ───────────────────────────────────────────────────
    $api->get('/categories', [CategoryController::class, 'index']);

    // ── Public: Products ─────────────────────────────────────────────────────
    $api->get('/products',        [ProductController::class, 'index']);
    $api->get('/products/{slug}', [ProductController::class, 'show']);

    // ── Public: Settings ─────────────────────────────────────────────────────
    $api->get('/settings', [SettingsController::class, 'publicIndex']);

    // ── Public: Inquiries ────────────────────────────────────────────────────
    $api->post('/inquiries', [InquiryController::class, 'store']);

    // ── Customer auth (public — anyone can register/login) ──────────────────
    $api->post('/customer/register', [CustomerAuthController::class, 'register']);
    $api->post('/customer/login',    [CustomerAuthController::class, 'login']);
    $api->post('/customer/logout',   [CustomerAuthController::class, 'logout']);

    // ── Customer: Protected (cart, orders, profile) ─────────────────────────
    $api->group('/customer', function (RouteCollectorProxy $cust) {
        // Profile
        $cust->get('/me',  [CustomerAuthController::class, 'me']);
        $cust->put('/me',  [CustomerAuthController::class, 'updateProfile']);

        // Cart
        $cust->get   ('/cart',                       [CartController::class, 'get']);
        $cust->post  ('/cart/items',                 [CartController::class, 'addItem']);
        $cust->put   ('/cart/items/{productId}',     [CartController::class, 'updateItem']);
        $cust->delete('/cart/items/{productId}',     [CartController::class, 'removeItem']);
        $cust->delete('/cart',                       [CartController::class, 'clear']);

        // Orders
        $cust->post('/orders',     [OrderController::class, 'place']);
        $cust->get ('/orders',     [OrderController::class, 'index']);
        $cust->get ('/orders/{id}',[OrderController::class, 'show']);
    })->add(new CustomerAuthMiddleware());

    // ── Admin: Protected routes ───────────────────────────────────────────────
    $api->group('/admin', function (RouteCollectorProxy $admin) {

        // Dashboard
        $admin->get('/dashboard', [DashboardController::class, 'index']);

        // Products
        $admin->get('/products',         [ProductController::class, 'adminIndex']);
        $admin->post('/products/bulk-import', [ProductController::class, 'bulkImport']);
        $admin->get('/products/{id}',    [ProductController::class, 'adminShow']);
        $admin->post('/products',        [ProductController::class, 'store']);
        $admin->put('/products/{id}',    [ProductController::class, 'update']);
        $admin->post('/products/{id}',   [ProductController::class, 'update']);
        $admin->delete('/products/{id}', [ProductController::class, 'destroy']);

        // Categories
        $admin->get('/categories',         [CategoryController::class, 'adminIndex']);
        $admin->post('/categories',        [CategoryController::class, 'store']);
        $admin->put('/categories/{id}',    [CategoryController::class, 'update']);
        $admin->delete('/categories/{id}', [CategoryController::class, 'destroy']);

        // Inquiries
        $admin->get('/inquiries',            [InquiryController::class, 'index']);
        $admin->get('/inquiries/export',     [InquiryController::class, 'export']);
        $admin->put('/inquiries/{id}',       [InquiryController::class, 'update']);
        $admin->delete('/inquiries/{id}',    [InquiryController::class, 'destroy']);

        // Media
        $admin->get('/media',                [MediaController::class, 'index']);
        $admin->post('/media/upload',        [MediaController::class, 'upload']);
        $admin->delete('/media/{filename}',  [MediaController::class, 'destroy']);

        // Settings
        $admin->get('/settings',          [SettingsController::class, 'adminIndex']);
        $admin->put('/settings',          [SettingsController::class, 'update']);
        $admin->post('/settings/image',   [SettingsController::class, 'uploadImage']);

    })->add(new AuthMiddleware());

});

// ─── OPTIONS preflight for all routes ────────────────────────────────────────
$app->options('/{routes:.+}', function (ServerRequestInterface $request, ResponseInterface $response) {
    return $response;
});

// ─── Error handler ────────────────────────────────────────────────────────────
$errorMiddleware = $app->addErrorMiddleware(false, true, true);

$errorMiddleware->setDefaultErrorHandler(
    function (
        ServerRequestInterface $request,
        \Throwable $exception,
        bool $displayErrorDetails,
        bool $logErrors,
        bool $logErrorDetails
    ) use ($app) {
        $statusCode = 500;

        if ($exception instanceof \Slim\Exception\HttpNotFoundException) {
            $statusCode = 404;
            $message    = 'Route not found.';
        } elseif ($exception instanceof \Slim\Exception\HttpMethodNotAllowedException) {
            $statusCode = 405;
            $message    = 'Method not allowed.';
        } else {
            $message = $displayErrorDetails
                ? $exception->getMessage()
                : 'An internal server error occurred.';
        }

        $payload  = json_encode(['error' => true, 'message' => $message ?? 'An error occurred.']);
        $response = $app->getResponseFactory()->createResponse();
        $response->getBody()->write($payload);

        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($statusCode);
    }
);

$app->run();
