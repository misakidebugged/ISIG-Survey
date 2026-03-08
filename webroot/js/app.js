// Point d'entrée de l'application / Application entry point
const app = document.getElementById('app');

let currentUser = null; // Utilisateur actuellement connecté / Currently logged in user
let currentEditId = null; // ID du sondage en cours d'édition / ID of survey being edited

// Affichage initial de l'écran de connexion / Initial render of login screen
renderLogin();

/**
 * Affiche le formulaire de connexion avec le logo ISIG
 * Renders the login form with the ISIG logo
 */
function renderLogin() {
    app.innerHTML = /*html*/`
        <div style="text-align: center; margin-bottom: 20px;">
            <img src="media/images/ISIGLogo.png" alt="Logo ISIG" style="max-width: 900px;">
        </div>
        <h1>Bienvenue au sondage sur le bâtiment ISIG</h1>
        <div id="loginSection">
            <h2>Connexion / Entrez votre nom d'utilisateur</h2>
            <div class="form-group">
                <label for="username">Nom d'utilisateur :</label>
                <input type="text" id="username" placeholder="Votre nom" required>
            </div>
            <button id="loginBtn">Continuer</button>
            <div id="message"></div>
        </div>
    `;

    document.getElementById('loginBtn').addEventListener('click', () => {
        const username = document.getElementById('username').value.trim();
        if (username === '') {
            showMessage('Veuillez entrer un nom d\'utilisateur', 'error');
            return;
        }
        login(username);
    });
}

/**
 * Envoie la demande de connexion au serveur (Create session)
 * Sends login request to the server (Create session)
 */
function login(username) {
    fetch('api.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                action: 'login',
                username
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                currentUser = username;
                loadSurveySection();
            } else {
                showMessage(data.error || 'Échec de la connexion', 'error');
            }
        })
        .catch(err => showMessage('Erreur réseau', 'error'));
}

/**
 * Charge la section des sondages (appelle fetchSurveys)
 * Loads the survey section (calls fetchSurveys)
 */
function loadSurveySection() {
    fetchSurveys();
}

/**
 * Récupère tous les sondages de l'utilisateur depuis le serveur (Read)
 * Fetches all surveys of the user from the server (Read)
 */
function fetchSurveys() {
    fetch('api.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                action: 'get_surveys'
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                renderSurveySection(data.surveys);
            } else {
                showMessage('Impossible de charger les sondages', 'error');
            }
        })
        .catch(err => showMessage('Erreur réseau', 'error'));
}

/**
 * Affiche la liste des sondages et le formulaire d'ajout/édition
 * Displays the list of surveys and the add/edit form
 */
function renderSurveySection(surveys) {
    const surveysHtml = surveys.map(s => /*html*/`
<div class="survey-item" data-id="${s._id}">
    <p><strong>Cafétéria :</strong> ${s.cafeteria === 'yes' ? 'Oui' : s.cafeteria === 'no' ? 'Non' : 'Peut-être'}</p>
    <p><strong>Satisfaction :</strong> ${s.satisfaction}/5</p>
    <p><strong>Recommandations :</strong> ${s.recommendations}</p>
    <p><em>Soumis le : ${new Date(s.timestamp).toLocaleString('fr-FR')}</em></p>
    <div class="survey-actions">
        <button class="btn-secondary edit-btn" data-id="${s._id}">Modifier</button>
        <button class="btn-danger delete-btn" data-id="${s._id}">Supprimer</button>
    </div>
</div>
`).join('');

    app.innerHTML = /*html*/ `
<h1>Bonjour, ${currentUser} !</h1>
<div id="surveySection">
    <h2>Ajouter / Modifier votre avis</h2>
    <form id="surveyForm">
        <div class="form-group">
            <label for="cafeteria">Souhaitez-vous une cafétéria ?</label>
            <select id="cafeteria" required>
                <option value="yes">Oui</option>
                <option value="no">Non</option>
                <option value="maybe">Peut-être</option>
            </select>
        </div>
        <div class="form-group">
            <label for="satisfaction">Satisfaction des salles de classe (1-5) :</label>
            <input type="number" id="satisfaction" min="1" max="5" required>
        </div>
        <div class="form-group">
            <label for="recommendations">Recommandations supplémentaires :</label>
            <textarea id="recommendations" rows="3"></textarea>
        </div>
        <button type="submit" id="submitBtn">Soumettre</button>
        <button type="button" id="cancelEditBtn" class="btn-secondary hidden">Annuler la modification</button>
    </form>

    <div id="message"></div>

    <div class="survey-list">
        <h2>Vos précédentes soumissions</h2>
        ${surveysHtml || '<p>Aucune soumission pour l\'instant.</p>'}
    </div>

    <button id="logoutBtn" class="btn-secondary">Déconnexion</button>
</div>
`;

    document.getElementById('surveyForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);

    // Attacher les événements aux boutons Modifier et Supprimer
    // Attach events to Edit and Delete buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editSurvey(btn.dataset.id));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteSurvey(btn.dataset.id));
    });

    if (currentEditId) {
        // Si on est en mode édition, le formulaire est déjà pré-rempli via editSurvey()
        // If in edit mode, the form is already pre-filled via editSurvey()
    }
}

/**
 * Gère la soumission du formulaire (Create ou Update selon currentEditId)
 * Handles form submission (Create or Update depending on currentEditId)
 */
function handleFormSubmit(e) {
    e.preventDefault();

    const cafeteria = document.getElementById('cafeteria').value;
    const satisfaction = parseInt(document.getElementById('satisfaction').value, 10);
    const recommendations = document.getElementById('recommendations').value;

    const formData = new URLSearchParams({
        action: currentEditId ? 'update_survey' : 'add_survey',
        cafeteria,
        satisfaction,
        recommendations
    });

    if (currentEditId) {
        formData.append('id', currentEditId);
    }

    fetch('api.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showMessage(currentEditId ? 'Sondage mis à jour !' : 'Sondage ajouté !', 'success');
                cancelEdit(); // Réinitialiser le formulaire / Reset form
                fetchSurveys(); // Rafraîchir la liste / Refresh list
            } else {
                showMessage(data.error || 'Opération échouée', 'error');
            }
        })
        .catch(err => showMessage('Erreur réseau', 'error'));
}

/**
 * Prépare le formulaire pour l'édition d'un sondage (Update)
 * Prepares the form for editing a survey (Update)
 */
function editSurvey(id) {
    // Récupérer les données affichées dans l'élément du DOM
    // Retrieve displayed data from the DOM element
    const item = document.querySelector(`.survey-item[data-id="${id}"]`);
    if (!item) return;

    const paragraphs = item.querySelectorAll('p');
    // paragraphs[0] : Cafétéria, [1] : Satisfaction, [2] : Recommandations, [3] : Timestamp
    const cafeteriaText = paragraphs[0].innerText.split(': ')[1];
    const satisfactionText = paragraphs[1].innerText.split(': ')[1].replace('/5', '');
    const recommendationsText = paragraphs[2].innerText.split(': ')[1];

    // Remplir le formulaire
    // Fill the form
    document.getElementById('cafeteria').value =
        cafeteriaText === 'Oui' ? 'yes' : cafeteriaText === 'Non' ? 'no' : 'maybe';
    document.getElementById('satisfaction').value = satisfactionText;
    document.getElementById('recommendations').value = recommendationsText;

    currentEditId = id;
    document.getElementById('submitBtn').textContent = 'Mettre à jour';
    document.getElementById('cancelEditBtn').classList.remove('hidden');
}

/**
 * Annule l'édition et réinitialise le formulaire
 * Cancels editing and resets the form
 */
function cancelEdit() {
    currentEditId = null;
    document.getElementById('surveyForm').reset();
    document.getElementById('submitBtn').textContent = 'Soumettre';
    document.getElementById('cancelEditBtn').classList.add('hidden');
}

/**
 * Supprime un sondage après confirmation (Delete)
 * Deletes a survey after confirmation (Delete)
 */
function deleteSurvey(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette soumission ?')) return;

    fetch('api.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                action: 'delete_survey',
                id
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showMessage('Sondage supprimé', 'success');
                fetchSurveys();
            } else {
                showMessage(data.error || 'Échec de la suppression', 'error');
            }
        })
        .catch(err => showMessage('Erreur réseau', 'error'));
}

/**
 * Déconnexion (détruit la session côté serveur et réinitialise le client)
 * Logout (destroys server session and resets client)
 */
function logout() {
    fetch('api.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                action: 'logout'
            })
        })
        .then(() => {
            currentUser = null;
            currentEditId = null;
            renderLogin();
        });
}

/**
 * Affiche un message à l'utilisateur
 * Displays a message to the user
 */
function showMessage(msg, type) {
    const msgDiv = document.getElementById('message');
    if (msgDiv) {
        msgDiv.textContent = msg;
        msgDiv.className = type;
    }
}