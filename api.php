<?php
session_start();
require_once 'connection/db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$action = $_POST['action'] ?? '';

switch ($action) {
    case 'login':
        handleLogin();
        break;
    case 'logout':
        handleLogout();
        break;
    case 'get_surveys':
        handleGetSurveys();
        break;
    case 'add_survey':
        handleAddSurvey();
        break;
    case 'update_survey':
        handleUpdateSurvey();
        break;
    case 'delete_survey':
        handleDeleteSurvey();
        break;
    default:
        echo json_encode(['success' => false, 'error' => 'Action invalide']);
}

// ---------- Fonctions de gestion CRUD ----------
// ---------- CRUD handler functions ----------

/**
 * Connexion de l'utilisateur (Create session)
 * User login (Create session)
 */
function handleLogin() {
    global $collection;
    $username = trim($_POST['username'] ?? '');
    if ($username === '') {
        echo json_encode(['success' => false, 'error' => 'Nom d\'utilisateur requis']);
        return;
    }
    $_SESSION['username'] = $username;
    echo json_encode(['success' => true]);
}

/**
 * Déconnexion (Delete session)
 * Logout (Delete session)
 */
function handleLogout() {
    session_destroy();
    echo json_encode(['success' => true]);
}

/**
 * Récupérer tous les sondages de l'utilisateur connecté (Read)
 * Get all surveys of the logged-in user (Read)
 */
function handleGetSurveys() {
    global $collection;
    if (!isset($_SESSION['username'])) {
        echo json_encode(['success' => false, 'error' => 'Non connecté']);
        return;
    }
    $username = $_SESSION['username'];

    try {
        // Recherche des documents avec le nom d'utilisateur correspondant, triés par date décroissante
        // Find documents with matching username, sorted by date descending
        $surveys = $collection->find(
            ['username' => $username],
            ['sort' => ['timestamp' => -1]]
        )->toArray();

        // Conversion des objets MongoDB en tableaux simples, avec formatage de _id et timestamp
        // Convert MongoDB objects to plain arrays, formatting _id and timestamp
        $result = [];
        foreach ($surveys as $doc) {
            $result[] = [
                '_id' => (string)$doc['_id'],
                'cafeteria' => $doc['cafeteria'],
                'satisfaction' => $doc['satisfaction'],
                'recommendations' => $doc['recommendations'],
                'timestamp' => $doc['timestamp']->toDateTime()->format('c')
            ];
        }
        echo json_encode(['success' => true, 'surveys' => $result]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Erreur de base de données']);
    }
}

/**
 * Ajouter un nouveau sondage (Create)
 * Add a new survey (Create)
 */
function handleAddSurvey() {
    global $collection;
    if (!isset($_SESSION['username'])) {
        echo json_encode(['success' => false, 'error' => 'Non connecté']);
        return;
    }
    $username = $_SESSION['username'];

    $cafeteria = $_POST['cafeteria'] ?? '';
    $satisfaction = isset($_POST['satisfaction']) ? (int)$_POST['satisfaction'] : 0;
    $recommendations = $_POST['recommendations'] ?? '';

    // Validation des données
    // Data validation
    if (!in_array($cafeteria, ['yes', 'no', 'maybe']) || $satisfaction < 1 || $satisfaction > 5) {
        echo json_encode(['success' => false, 'error' => 'Données invalides']);
        return;
    }

    try {
        // Insertion du document dans MongoDB
        // Insert document into MongoDB
        $insertResult = $collection->insertOne([
            'username' => $username,
            'cafeteria' => $cafeteria,
            'satisfaction' => $satisfaction,
            'recommendations' => $recommendations,
            'timestamp' => new MongoDB\BSON\UTCDateTime()
        ]);
        echo json_encode(['success' => true, 'id' => (string)$insertResult->getInsertedId()]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Échec de l\'insertion']);
    }
}

/**
 * Mettre à jour un sondage existant (Update)
 * Update an existing survey (Update)
 */
function handleUpdateSurvey() {
    global $collection;
    if (!isset($_SESSION['username'])) {
        echo json_encode(['success' => false, 'error' => 'Non connecté']);
        return;
    }
    $username = $_SESSION['username'];

    $id = $_POST['id'] ?? '';
    // Vérification du format de l'ID MongoDB (24 caractères hexadécimaux)
    // Check MongoDB ID format (24 hex characters)
    if (!preg_match('/^[a-f0-9]{24}$/', $id)) {
        echo json_encode(['success' => false, 'error' => 'ID invalide']);
        return;
    }

    $cafeteria = $_POST['cafeteria'] ?? '';
    $satisfaction = isset($_POST['satisfaction']) ? (int)$_POST['satisfaction'] : 0;
    $recommendations = $_POST['recommendations'] ?? '';

    if (!in_array($cafeteria, ['yes', 'no', 'maybe']) || $satisfaction < 1 || $satisfaction > 5) {
        echo json_encode(['success' => false, 'error' => 'Données invalides']);
        return;
    }

    try {
        // Mise à jour du document : on s'assure que l'utilisateur est bien le propriétaire
        // Update the document: ensure the user owns it
        $updateResult = $collection->updateOne(
            ['_id' => new MongoDB\BSON\ObjectId($id), 'username' => $username],
            ['$set' => [
                'cafeteria' => $cafeteria,
                'satisfaction' => $satisfaction,
                'recommendations' => $recommendations,
                'timestamp' => new MongoDB\BSON\UTCDateTime()
            ]]
        );

        if ($updateResult->getMatchedCount() === 0) {
            echo json_encode(['success' => false, 'error' => 'Sondage introuvable ou ne vous appartient pas']);
        } else {
            echo json_encode(['success' => true]);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Échec de la mise à jour']);
    }
}

/**
 * Supprimer un sondage (Delete)
 * Delete a survey (Delete)
 */
function handleDeleteSurvey() {
    global $collection;
    if (!isset($_SESSION['username'])) {
        echo json_encode(['success' => false, 'error' => 'Non connecté']);
        return;
    }
    $username = $_SESSION['username'];

    $id = $_POST['id'] ?? '';
    if (!preg_match('/^[a-f0-9]{24}$/', $id)) {
        echo json_encode(['success' => false, 'error' => 'ID invalide']);
        return;
    }

    try {
        // Suppression du document : seul le propriétaire peut le faire
        // Delete the document: only the owner can do it
        $deleteResult = $collection->deleteOne([
            '_id' => new MongoDB\BSON\ObjectId($id),
            'username' => $username
        ]);

        if ($deleteResult->getDeletedCount() === 0) {
            echo json_encode(['success' => false, 'error' => 'Sondage introuvable ou ne vous appartient pas']);
        } else {
            echo json_encode(['success' => true]);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Échec de la suppression']);
    }
}
?>