 ## 🚀 SmartTracker
SmartTracker est une application full-stack permettant de suivre, analyser et optimiser l’utilisation des applications sur un ordinateur.
Elle aide les utilisateurs à améliorer leur productivité grâce à des statistiques détaillées et des recommandations personnalisées, et fournit aux administrateurs des outils avancés de gestion et d’analyse.

💡 Développée pour un usage interne (ex. : ERTC Technologies), avec un accent sur productivité, sécurité et analyse des données.

## 📌 Table des Matières
Fonctionnalités

Architecture

Technologies

Structure des Fichiers

Base de Données

Installation

Utilisation

API Endpoints

Tests & Débogage

Contribuer

Améliorations Futures

Licence

## ✨ Fonctionnalités
🖥 Utilisateur
Suivi en temps réel des applications avec normalisation des noms.

Statistiques visuelles : temps total, app la plus utilisée, répartition par catégorie.

Recommandations personnalisées :

Alertes en cas de dépassement de seuils (ex. >3h sur WhatsApp).

Suggestions d’optimisation.

Calendrier & Pomodoro :

Gestion des tâches avec priorités et statuts.

Timer intégré (25 min).

Pointage (Attendance) : suivi des heures de travail, export CSV.

Profil utilisateur : mise à jour infos, stats personnelles.

Notifications :

In-App (bannières dynamiques).

Email (rapports, alertes).

🔑 Administrateur
Gestion des utilisateurs (CRUD).

Statistiques globales et tendances.

Supervision des pointages.

Santé système.

Export des données.

##🛠 Architecture

Frontend (React)  →  API REST (Flask)  →  SQLite
         ↑                           ↓
       Tracker.py     ←     Modèle ML (Joblib)
## 🧰 Technologies
Frontend :

React.js, React Router, Tailwind CSS, Chart.js, Recharts, Framer Motion, EmailJS

Backend :

Flask, SQLite, PyJWT, PyGetWindow, Pandas, Joblib, SMTPlib

Autres :

CSV statique (app_categories.csv)

Modèle ML (category_model.joblib, vectorizer.joblib)

## 📂 Structure des Fichiers
smarttracker/
├── backend/
│   ├──__pycache__/	Cache Python (à ignorer).
│   ├──uploads/	Dossier pour fichiers uploadés.
│   ├──venv/	Environnement virtuel Python (à ignorer).
│   ├──api.py	Serveur Flask principal et routes API.
│   ├──app_categories.csv	Mapping Application → Catégorie.
│   ├──category_model.joblib	Modèle ML pour prédire les catégories d’apps.
│   ├──config_tracker.json	Configuration du tracker (fréquence, exclusions).
│   ├──db_init.py	Script pour initialiser la base SQLite.
│   ├──email_utils.py	Gestion des envois d’emails.
│   ├──normalize_data.py	Normalisation des noms d’applications.
│   ├──recommandation.py	Génération de recommandations.
│   ├──recommender.py	Moteur central de recommandations.
│   ├──requirements.txt	Dépendances backend.
│   ├──test_usage.py	Script de test du tracking d’usage.
│   ├──tracker.py	Suivi en temps réel des applications.
│   ├──train_model.py	Entraînement du modèle ML.
│   ├──usage_data.db	Base SQLite contenant les données.
│   ├──vectorizer.joblib	Transformateur de texte pour le ML.
├── frontend/
│   ├── src/
│   │   ├── pages/ (Dashboard, Stats, Calendar, AdminDashboard, ...)
│   │   ├── components/ (NotificationBanner, TrackerStatus, ...)
│   │   ├── context/ (AuthContext.js)
│   │   └── services/ (api.js, emailService.js, recommendations.js)

## 🗄 Base de Données
Tables principales :

users : informations et rôles.

usage : logs des applications.

tasks : tâches avec priorité/statut.

user_settings : seuils personnalisés.

## ⚙ Installation
1️⃣ Cloner le projet
git clone <url-du-repo>
cd smarttracker
2️⃣ Backend

python -m venv venv
source venv/bin/activate   # Unix/Mac
venv\Scripts\activate      # Windows
pip install -r requirements.txt
python db_init.py
python api.py
API disponible sur http://127.0.0.1:5000

3️⃣ Frontend

npm install
npm start
Interface disponible sur http://localhost:3000

## ▶ Utilisation
Se connecter (admin/admin123 pour test)

Démarrer le tracker (automatique au login)

Consulter le dashboard

Gérer tâches et pointages

Recevoir recommandations & alertes email

## 📡 API Endpoints (Exemples)
# Authentification :
POST /login
POST /register
# Tracker :
POST /tracker/start
POST /tracker/stop
GET /tracker/status
# Usage :
GET /usage/<user_id>
# Admin :
GET /admin/stats
GET /admin/users
🧪 Tests & Débogage

## Outils utiles :

SQLite Browser (inspection DB)

Console navigateur



