<?php
// Inclusion de l'autoloader de Composer pour la bibliothèque MongoDB
// Include Composer's autoloader for the MongoDB library
require_once __DIR__ . '/../vendor/autoload.php';

try {
    // Connexion au serveur MongoDB local
    // Connect to local MongoDB server
    $client = new MongoDB\Client("mongodb://localhost:27017");
    
    // Sélection de la base de données 'isig_survey' et de la collection 'surveys'
    // Select database 'isig_survey' and collection 'surveys'
    $db = $client->isig_survey;
    $collection = $db->surveys;
} catch (Exception $e) {
    // En cas d'erreur, arrêter l'exécution et afficher le message
    // On error, stop execution and display message
    die("Échec de la connexion à la base de données : " . $e->getMessage());
}
?>