<?php

namespace Opal\Config;

use MongoDB\Client;
use MongoDB\Database as MongoDatabase;

class Database
{
    private static ?MongoDatabase $instance = null;

    public static function getInstance(): MongoDatabase
    {
        if (self::$instance === null) {
            $uri = $_ENV['MONGO_URI'] ?? 'mongodb://localhost:27017';
            $dbName = $_ENV['MONGO_DB'] ?? 'opal_perfumes';

            $client = new Client($uri);
            self::$instance = $client->selectDatabase($dbName);
        }

        return self::$instance;
    }

    private function __construct() {}
    private function __clone() {}
}
