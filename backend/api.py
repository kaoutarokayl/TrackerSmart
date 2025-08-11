from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import jwt
import datetime
import subprocess
import threading
import joblib
from tracker import start_tracker_for_user, stop_tracker_for_user, is_tracker_running
from functools import wraps
import pandas as pd
import logging
from email_utils import send_email_smtp


app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Configure CORS to include error responses
CORS(app, resources={r"/*": {
    "origins": ["http://localhost:3000"],
    "methods": ["GET", "POST", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"],
    "supports_credentials": True
}}, send_wildcard=False)

app.config['SECRET_KEY'] = '1e1c9bc44ba69983f48ae547464a6d8b3fdbdb0736d59ad06d8b39c0c14df1b3'
DATABASE = "usage_data.db"

def get_db_connection():
    try:
        conn = sqlite3.connect(DATABASE)
        conn.row_factory = sqlite3.Row
        return conn
    except sqlite3.Error as e:
        logger.error(f"Database connection error: {str(e)}")
        raise

# 🧩 Génération du token JWT
def generate_token(user_id, role):
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=6)
    }
    token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')
    return token

# 🧩 Décorateur pour sécuriser les routes avec token
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            logger.warning("No Authorization token provided")
            response = jsonify({'message': 'Token requis'})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
            return response, 401
        try:
            if token.startswith("Bearer "):
                token = token[7:]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            kwargs['current_user'] = {'user_id': data['user_id'], 'role': data['role']}
            return f(*args, **kwargs)
        except jwt.ExpiredSignatureError:
            logger.warning("Expired JWT token")
            response = jsonify({'message': 'Token expiré'})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
            return response, 401
        except jwt.InvalidTokenError:
            logger.warning("Invalid JWT token")
            response = jsonify({'message': 'Token invalide'})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
            return response, 401
        except Exception as e:
            logger.error(f"Token validation error: {str(e)}")
            response = jsonify({'message': 'Erreur de validation du token'})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
            return response, 401
    return decorated

@app.route('/user/send-notification-email', methods=['POST'])
def send_notification_email():
    try:
        data = request.json
        # data doit contenir: to_email, subject, message
        to_email = data.get("to_email")
        subject = data.get("subject")
        message = data.get("message")
        # Configure tes identifiants SMTP ici (remplace par tes vrais identifiants)
        smtp_user = "kaoutarokayl4@gmail.com"
        smtp_password = "oehu savm etlo pycr"
        success = send_email_smtp(
            to_email, subject, message,
            from_email=smtp_user,
            smtp_user=smtp_user,
            smtp_password=smtp_password
        )
        if success:
            return jsonify({"success": True, "message": "Email envoyé"}), 200
        else:
            return jsonify({"success": False, "error": "Erreur d'envoi"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
# 🎯 Démarrer le tracker pour un utilisateur
@app.route('/tracker/start', methods=['POST'])
@token_required
def start_user_tracker(current_user):
    try:
        user_id = current_user['user_id']
        success = start_tracker_for_user(user_id)
        if success:
            return jsonify({
                'message': 'Tracker démarré avec succès',
                'user_id': user_id,
                'status': 'running'
            })
        else:
            return jsonify({
                'message': 'Tracker déjà actif',
                'user_id': user_id,
                'status': 'already_running'
            })
    except Exception as e:
        logger.error(f"Error starting tracker for user {user_id}: {str(e)}")
        return jsonify({'error': f'Erreur lors du démarrage: {str(e)}'}), 500

# ⏹️ Arrêter le tracker pour un utilisateur
@app.route('/tracker/stop', methods=['POST'])
@token_required
def stop_user_tracker(current_user):
    try:
        user_id = current_user['user_id']
        success = stop_tracker_for_user(user_id)
        if success:
            return jsonify({
                'message': 'Tracker arrêté avec succès',
                'user_id': user_id,
                'status': 'stopped'
            })
        else:
            return jsonify({
                'message': 'Tracker non actif',
                'user_id': user_id,
                'status': 'not_running'
            })
    except Exception as e:
        logger.error(f"Error stopping tracker for user {user_id}: {str(e)}")
        return jsonify({'error': f'Erreur lors de l\'arrêt: {str(e)}'}), 500

# 📊 Statut du tracker
@app.route('/tracker/status', methods=['GET'])
@token_required
def get_tracker_status(current_user):
    try:
        user_id = current_user['user_id']
        running = is_tracker_running(user_id)
        return jsonify({
            'user_id': user_id,
            'status': 'running' if running else 'stopped',
            'is_running': running
        })
    except Exception as e:
        logger.error(f"Error getting tracker status for user {user_id}: {str(e)}")
        return jsonify({'error': f'Erreur lors de la vérification du statut: {str(e)}'}), 500

@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.json
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")
        if not username or not email or not password:
            logger.warning("Missing registration fields")
            return jsonify({"error": "Champs manquants"}), 400
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO users (username, email, password_hash, role)
            VALUES (?, ?, ?, ?)
        ''', (username, email, generate_password_hash(password), "user"))
        conn.commit()
        logger.info(f"User {username} registered successfully")
        return jsonify({"message": "Inscription réussie"}), 201
    except sqlite3.IntegrityError:
        logger.warning(f"Registration failed: Username {username} or email {email} already exists")
        return jsonify({"error": "Nom d'utilisateur ou email déjà utilisé"}), 409
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return jsonify({"error": f"Erreur lors de l'inscription: {str(e)}"}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.json
        username = data.get("username")
        password = data.get("password")
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        
        if user and check_password_hash(user["password_hash"], password):
            cursor.execute(
                "UPDATE users SET last_login = ? WHERE id = ?", 
                (datetime.datetime.now().isoformat(), user["id"])
            )
            conn.commit()
            token = generate_token(user["id"], user["role"])
            logger.info(f"User {username} logged in successfully")
            conn.close()
            return jsonify({
                "message": "Connexion réussie",
                "token": token,
                "user": {
                    "id": user["id"],
                    "username": user["username"],
                    "email": user["email"],
                    "role": user["role"]
                }
            })
        logger.warning(f"Login failed for username {username}")
        conn.close()
        return jsonify({"error": "Identifiants invalides"}), 401
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({"error": f"Erreur lors de la connexion: {str(e)}"}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/profile/update', methods=['POST'])
@token_required
def update_profile(current_user):
    try:
        data = request.json
        username = data.get("username")
        email = data.get("email")
        if not username or not email:
            logger.warning("Missing profile update fields")
            return jsonify({"error": "Champs manquants (username ou email)"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ? AND id != ?", (username, current_user['user_id']))
        if cursor.fetchone():
            conn.close()
            logger.warning(f"Username {username} already exists")
            return jsonify({"error": "Nom d'utilisateur déjà utilisé"}), 409

        cursor.execute("SELECT * FROM users WHERE email = ? AND id != ?", (email, current_user['user_id']))
        if cursor.fetchone():
            conn.close()
            logger.warning(f"Email {email} already exists")
            return jsonify({"error": "Email déjà utilisé"}), 409

        cursor.execute(
            "UPDATE users SET username = ?, email = ? WHERE id = ?",
            (username, email, current_user['user_id'])
        )
        conn.commit()
        conn.close()
        logger.info(f"Profile updated for user {current_user['user_id']}")
        return jsonify({"message": "Profil mis à jour avec succès"})
    except sqlite3.Error as e:
        logger.error(f"Database error updating profile for user {current_user['user_id']}: {str(e)}")
        return jsonify({"error": f"Erreur base de données: {str(e)}"}), 500
    except Exception as e:
        logger.error(f"Error updating profile for user {current_user['user_id']}: {str(e)}")
        return jsonify({"error": f"Erreur lors de la mise à jour du profil: {str(e)}"}), 500

@app.route('/profile/change-password', methods=['POST'])
@token_required
def change_password(current_user):
    try:
        data = request.json
        current_password = data.get("currentPassword")
        new_password = data.get("newPassword")
        if not current_password or not new_password:
            logger.warning("Missing password change fields")
            return jsonify({"error": "Champs manquants (mot de passe actuel ou nouveau)"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT password_hash FROM users WHERE id = ?", (current_user['user_id'],))
        user = cursor.fetchone()
        if not user or not check_password_hash(user["password_hash"], current_password):
            conn.close()
            logger.warning(f"Invalid current password for user {current_user['user_id']}")
            return jsonify({"error": "Mot de passe actuel incorrect"}), 401

        cursor.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (generate_password_hash(new_password), current_user['user_id'])
        )
        conn.commit()
        conn.close()
        logger.info(f"Password changed for user {current_user['user_id']}")
        return jsonify({"message": "Mot de passe changé avec succès"})
    except Exception as e:
        logger.error(f"Error changing password for user {current_user['user_id']}: {str(e)}")
        return jsonify({"error": f"Erreur lors du changement de mot de passe: {str(e)}"}), 500

@app.route('/usage/<int:user_id>', methods=['GET'])
def get_usage(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT app_name, start_time, duration
            FROM usage
            WHERE user_id = ?
            ORDER BY start_time DESC
        ''', (user_id,))
        rows = cursor.fetchall()
        conn.close()
        usage_data = [
            {
                "app_name": row["app_name"],
                "start_time": row["start_time"],
                "duration": row["duration"]
            }
            for row in rows
        ]
        logger.info(f"Usage data retrieved for user {user_id}")
        return jsonify(usage_data)
    except Exception as e:
        logger.error(f"Error retrieving usage for user {user_id}: {str(e)}")
        return jsonify({"error": f"Erreur lors de la récupération des données: {str(e)}"}), 500

# 🗂️ Liste des utilisateurs (GET)
@app.route('/admin/users', methods=['GET'])
@token_required
def get_all_users(current_user):
    if current_user['role'] != 'admin':
        logger.warning(f"Access denied for user {current_user['user_id']}: not admin")
        return jsonify({'message': 'Accès refusé'}), 403
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT id, username, email, role FROM users')
        users = [dict(row) for row in cursor.fetchall()]
        conn.close()
        logger.info(f"User list retrieved by admin {current_user['user_id']}")
        return jsonify({'users': users})
    except Exception as e:
        logger.error(f"Error retrieving user list: {str(e)}")
        return jsonify({'error': f'Erreur lors de la récupération des utilisateurs: {str(e)}'}), 500

@app.route('/admin/users/<int:user_id>', methods=['POST'])
@token_required
def manage_user(user_id, current_user):
    if current_user['role'] != 'admin':
        logger.warning(f"Access denied for user {current_user['user_id']}: not admin")
        return jsonify({'message': 'Accès refusé'}), 403
    try:
        data = request.json
        logger.debug(f"Request data for user {user_id}: {data}")
        action = data.get('action')
        if not action:
            logger.warning(f"No action specified for user {user_id}")
            return jsonify({'error': 'Action non spécifiée'}), 400
        
        if action == 'update':
            username = data.get('username')
            email = data.get('email')
            role = data.get('role')
            if not username or not email or not role:
                logger.warning(f"Missing fields for update: username={username}, email={email}, role={role}")
                return jsonify({'error': 'Champs manquants pour la mise à jour'}), 400
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE users SET username = ?, email = ?, role = ? WHERE id = ?",
                (username, email, role, user_id)
            )
            if cursor.rowcount == 0:
                logger.warning(f"User {user_id} not found for update")
                return jsonify({'error': 'Utilisateur non trouvé'}), 404
            conn.commit()
            logger.info(f"User {user_id} updated successfully: username={username}, email={email}, role={role}")
            conn.close()
            return jsonify({'message': 'Utilisateur mis à jour avec succès'}), 200
        elif action == 'delete':
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
            if cursor.rowcount == 0:
                logger.warning(f"User {user_id} not found for deletion")
                return jsonify({'error': 'Utilisateur non trouvé'}), 404
            conn.commit()
            logger.info(f"User {user_id} deleted successfully")
            conn.close()
            return jsonify({'message': 'Utilisateur supprimé avec succès'}), 200
        else:
            logger.warning(f"Invalid action for user {user_id}: {action}")
            return jsonify({'error': 'Action non reconnue'}), 400
    except sqlite3.IntegrityError as e:
        logger.error(f"Database integrity error for user {user_id}: {str(e)}")
        return jsonify({'error': 'Nom d\'utilisateur ou email déjà utilisé'}), 409
    except Exception as e:
        logger.error(f"Error managing user {user_id}: {str(e)}")
        return jsonify({'error': f'Erreur lors de l\'opération: {str(e)}'}), 500
    finally:
        if 'conn' in locals():
            conn.close()

# 📊 Statistiques admin avec vraies données
@app.route('/admin/stats', methods=['GET'])
@token_required
def get_admin_stats(current_user):
    if current_user['role'] != 'admin':
        logger.warning(f"Access denied for user {current_user['user_id']}: not admin")
        return jsonify({'message': 'Accès refusé'}), 403
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) as total FROM users")
        total_users = cursor.fetchone()["total"]
        
        seven_days_ago = (datetime.datetime.now() - datetime.timedelta(days=7)).isoformat()
        cursor.execute("SELECT COUNT(*) as active FROM users WHERE last_login > ?", (seven_days_ago,))
        active_users = cursor.fetchone()["active"]
        
        cursor.execute("SELECT COUNT(*) as total FROM usage")
        total_sessions = cursor.fetchone()["total"]
        
        cursor.execute("SELECT AVG(duration) as avg_duration FROM usage")
        avg_result = cursor.fetchone()["avg_duration"]
        avg_session_time = round((avg_result or 0) / 3600, 1)
        
        conn.close()
        logger.info(f"Admin stats retrieved by user {current_user['user_id']}")
        return jsonify({
            'total_users': total_users,
            'active_users': active_users,
            'total_sessions': total_sessions,
            'avg_session_time': avg_session_time,
            'system_health': 'good'
        })
    except Exception as e:
        logger.error(f"Error retrieving admin stats: {str(e)}")
        return jsonify({'error': f'Erreur lors de la récupération des statistiques: {str(e)}'}), 500

# Chargement du modèle et du vectoriseur
try:
    model = joblib.load("category_model.joblib")
    vectorizer = joblib.load("vectorizer.joblib")
except Exception as e:
    logger.error(f"Error loading model or vectorizer: {str(e)}")
    model = None
    vectorizer = None

# Chargement des catégories CSV pour fallback
try:
    app_categories = pd.read_csv("app_categories.csv")
    app_category_map = dict(zip(app_categories["app_name"], app_categories["category"]))
except Exception as e:
    logger.error(f"Error loading app_categories.csv: {str(e)}")
    app_category_map = {}

@app.route('/categorize/<app_name>', methods=['GET'])
def categorize_app(app_name):
    logger.debug(f"Received categorization request for: {app_name}")
    try:
        if model and vectorizer:
            X_new = vectorizer.transform([app_name])
            category = model.predict(X_new)[0]
            logger.info(f"Predicted category for {app_name}: {category}")
            return jsonify({"app_name": app_name, "category": category})
        else:
            category = app_category_map.get(app_name, "Non catégorisé")
            logger.info(f"Using CSV fallback for {app_name}: {category}")
            return jsonify({"app_name": app_name, "category": category})
    except Exception as e:
        logger.error(f"Error categorizing app {app_name}: {str(e)}")
        category = app_category_map.get(app_name, "Non catégorisé")
        logger.info(f"Using CSV fallback for {app_name}: {category}")
        return jsonify({"app_name": app_name, "category": category})

@app.route('/categorize/batch', methods=['POST'])
def categorize_batch():
    try:
        data = request.get_json()
        app_names = data.get('app_names', [])
        if model and vectorizer:
            X_new = vectorizer.transform(app_names)
            categories = model.predict(X_new)
            logger.info(f"Batch categorization completed for {len(app_names)} apps")
            return jsonify({app_name: category for app_name, category in zip(app_names, categories)})
        else:
            logger.info(f"Using CSV fallback for batch categorization")
            return jsonify({app_name: app_category_map.get(app_name, "Non catégorisé") for app_name in app_names})
    except Exception as e:
        logger.error(f"Error in batch categorization: {str(e)}")
        return jsonify({"error": f"Erreur lors de la catégorisation: {str(e)}"}), 500

# 📈 Activité récente
@app.route('/admin/activity', methods=['GET'])
@token_required
def get_recent_activity(current_user):
    if current_user['role'] != 'admin':
        logger.warning(f"Access denied for user {current_user['user_id']}: not admin")
        return jsonify({'message': 'Accès refusé'}), 403
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        activities = []
        cursor.execute('''
            SELECT username, last_login 
            FROM users 
            WHERE last_login IS NOT NULL 
            ORDER BY last_login DESC 
            LIMIT 10
        ''')
        recent_logins = cursor.fetchall()
        
        for i, user in enumerate(recent_logins):
            if user["last_login"]:
                activities.append({
                    'id': f'login_{i}',
                    'username': user["username"],
                    'action': 'Connexion',
                    'timestamp': user["last_login"],
                    'type': 'login'
                })
        
        cursor.execute('''
            SELECT u.username, usage.start_time, usage.app_name
            FROM usage 
            JOIN users u ON usage.user_id = u.id
            ORDER BY usage.start_time DESC 
            LIMIT 10
        ''')
        recent_sessions = cursor.fetchall()
        
        for i, session in enumerate(recent_sessions):
            activities.append({
                'id': f'session_{i}',
                'username': session["username"],
                'action': f'Session {session["app_name"]}',
                'timestamp': session["start_time"],
                'type': 'session'
            })
        
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        conn.close()
        logger.info(f"Recent activity retrieved by user {current_user['user_id']}")
        return jsonify(activities[:15])
    except Exception as e:
        logger.error(f"Error retrieving recent activity: {str(e)}")
        return jsonify({'error': f'Erreur lors de la récupération de l\'activité: {str(e)}'}), 500

# 🖥️ État du système
@app.route('/admin/system/health', methods=['GET'])
@token_required
def get_system_health(current_user):
    if current_user['role'] != 'admin':
        logger.warning(f"Access denied for user {current_user['user_id']}: not admin")
        return jsonify({'message': 'Accès refusé'}), 403
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users")
        conn.close()
        db_status = "operational"
        logger.info(f"System health checked by user {current_user['user_id']}")
        return jsonify({
            'database_status': db_status,
            'server_status': 'online',
            'last_backup': datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
        })
    except Exception as e:
        logger.error(f"Error checking system health: {str(e)}")
        return jsonify({
            'database_status': 'error',
            'server_status': 'online',
            'last_backup': datetime.datetime.now().strftime('%Y-%m-%d %H:%M'),
            'error': str(e)
        }), 500
    

    
@app.route('/admin/users/stats', methods=['GET'])
@token_required
def get_users_with_stats(current_user):
    if current_user['role'] != 'admin':
        logger.warning(f"Access denied for user {current_user['user_id']}: not admin")
        return jsonify({'message': 'Accès refusé'}), 403
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT id, username, email, role FROM users')
        users = [dict(row) for row in cursor.fetchall()]
        users_stats = []
        for user in users:
            cursor.execute('SELECT SUM(duration) as total_time FROM usage WHERE user_id = ?', (user['id'],))
            total_time = cursor.fetchone()['total_time'] or 0
            cursor.execute('SELECT COUNT(*) as session_count FROM usage WHERE user_id = ?', (user['id'],))
            session_count = cursor.fetchone()['session_count']
            cursor.execute('SELECT app_name, SUM(duration) as total_duration FROM usage WHERE user_id = ? GROUP BY app_name ORDER BY total_duration DESC LIMIT 3', (user['id'],))
            top_apps = [dict(row) for row in cursor.fetchall()]
            cursor.execute('SELECT MAX(start_time) as last_activity FROM usage WHERE user_id = ?', (user['id'],))
            last_activity = cursor.fetchone()['last_activity'] or 'Aucune'
            users_stats.append({
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'role': user['role'],
                'total_time': round(total_time / 3600, 2),
                'session_count': session_count,
                'top_apps': top_apps,
                'last_activity': last_activity
            })
        conn.close()
        logger.info(f"User stats retrieved by user {current_user['user_id']}")
        return jsonify({'users_stats': users_stats})
    except Exception as e:
        logger.error(f"Error retrieving user stats: {str(e)}")
        return jsonify({'error': f'Erreur lors de la récupération des statistiques: {str(e)}'}), 500

# 📈 Tendances d'utilisation (utilisateurs actifs par jour sur 7 jours)
@app.route('/admin/usage-trends', methods=['GET'])
@token_required
def get_usage_trends(current_user):
    if current_user['role'] != 'admin':
        logger.warning(f"Access denied for user {current_user['user_id']}: not admin")
        return jsonify({'message': 'Accès refusé'}), 403
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        today = datetime.datetime.now().date()
        trends = []
        for i in range(6, -1, -1):
            day = today - datetime.timedelta(days=i)
            cursor.execute(
                "SELECT user_id, start_time FROM usage WHERE DATE(start_time) = ?",
                (day.strftime("%Y-%m-%d"),)
            )
            rows = cursor.fetchall()
            logger.debug(f"Usage trends for {day}: {len(rows)} rows")
            cursor.execute(
                "SELECT COUNT(DISTINCT user_id) as active_users FROM usage WHERE DATE(start_time) = ?",
                (day.strftime("%Y-%m-%d"),)
            )
            count = cursor.fetchone()["active_users"]
            trends.append({
                "date": day.strftime("%Y-%m-%d"),
                "active_users": count if count else 0
            })
        conn.close()
        logger.info(f"Usage trends retrieved by user {current_user['user_id']}")
        return jsonify(trends)
    except Exception as e:
        logger.error(f"Error retrieving usage trends: {str(e)}")
        return jsonify({'error': f'Erreur lors de la récupération des tendances: {str(e)}'}), 500
# 🔖 CRUD tâches personnelles
@app.route('/tasks', methods=['GET'])
@token_required
def get_tasks(current_user):
    user_id = current_user['user_id']
    date = request.args.get('date')  # format: YYYY-MM-DD
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, title, status, priority, time, date
            FROM tasks
            WHERE user_id = ? AND date = ?
        ''', (user_id, date))
        tasks = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(tasks)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/tasks', methods=['POST'])
@token_required
def add_task(current_user):
    user_id = current_user['user_id']
    data = request.json
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO tasks (user_id, title, status, priority, time, date)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            user_id,
            data.get('title'),
            data.get('status', 'à faire'),
            data.get('priority', 'normale'),
            data.get('time'),
            data.get('date')
        ))
        conn.commit()
        conn.close()
        return jsonify({'success': True}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/tasks/<int:task_id>', methods=['DELETE'])
@token_required
def delete_task(current_user, task_id):
    user_id = current_user['user_id']
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM tasks WHERE id = ? AND user_id = ?', (task_id, user_id))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/tasks/<int:task_id>', methods=['PATCH'])
@token_required
def update_task(current_user, task_id):
    user_id = current_user['user_id']
    data = request.json
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE tasks SET
                title = COALESCE(?, title),
                status = COALESCE(?, status),
                priority = COALESCE(?, priority),
                time = COALESCE(?, time),
                date = COALESCE(?, date)
            WHERE id = ? AND user_id = ?
        ''', (
            data.get('title'),
            data.get('status'),
            data.get('priority'),
            data.get('time'),
            data.get('date'),
            task_id,
            user_id
        ))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
# 🔔 Notifications pour l'utilisateur (spécifiques à WhatsApp, dépassement de 60 secondes)
@app.route('/user/notifications', methods=['GET'])
@token_required
def get_notifications(current_user):
    try:
        logger.debug(f"Processing notifications for user_id: {current_user['user_id']}")
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT app_name, duration, start_time
            FROM usage
            WHERE user_id = ? AND app_name = 'WhatsApp' AND duration > 60 AND DATE(start_time) = DATE('now')
        ''', (current_user['user_id'],))
        overuses = cursor.fetchall()
        # Récupère l'email de l'utilisateur
        cursor.execute("SELECT email FROM users WHERE id = ?", (current_user['user_id'],))
        user_email = cursor.fetchone()["email"]
        conn.close()

        notifications = []
        if overuses:
            for overuse in overuses:
                message = f"Attention : Vous avez dépassé 3 heures sur WhatsApp  le {overuse['start_time']})"
                notifications.append({"message": message})
                logger.info(f"Notification générée : {message}")
                # ENVOI EMAIL ICI
                send_email_smtp(
                    user_email,
                    "Alerte SmartTracker",
                    message,
                    smtp_user="kaoutarokayl4@gmail.com",
                    smtp_password="TON_MOT_DE_PASSE_APPLICATION",  # Utilise le mot de passe d'application Gmail
                    from_email="kaoutarokayl4@gmail.com"
                )

        return jsonify({
            'recommendations': ["Réduisez votre temps sur WhatsApp"],
            'notifications': [n['message'] for n in notifications]
        })
    except Exception as e:
        logger.error(f"Error getting notifications for user {current_user['user_id']}: {str(e)}", exc_info=True)
        return jsonify({'error': f'Erreur: {str(e)}'}), 500

# 🔧 Initialisation de la base de données
def init_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()


        # 1. Créer la table users si elle n'existe pas
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                last_login TEXT
            )
        ''')
        print("✅ Table users créée ou déjà existante")

        # 2. Créer la table usage si elle n'existe pas
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                app_name TEXT NOT NULL,
                start_time TEXT NOT NULL,
                duration INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        print("✅ Table usage créée ou déjà existante")
        

        # 3. Ajouter la colonne last_login à users si elle n'existe pas déjà (déjà inclus dans la création)
        try:
            cursor.execute('ALTER TABLE users ADD COLUMN last_login TEXT')
            print("✅ Colonne last_login ajoutée à la table users")
        except sqlite3.OperationalError:
            print("ℹ️ Colonne last_login existe déjà")

        # 4. Créer un compte admin s'il n'existe pas
        cursor.execute("SELECT * FROM users WHERE role = 'admin'")
        admin_exists = cursor.fetchone()
        if not admin_exists:
            admin_password = generate_password_hash("admin123")  # Mot de passe temporaire
            cursor.execute('''
                INSERT INTO users (username, email, password_hash, role)
                VALUES (?, ?, ?, ?)
            ''', ("admin", "admin@example.com", admin_password, "admin"))
            print("✅ Admin créé avec le mot de passe : admin123")
        else:
            print("ℹ️ Compte admin existe déjà")

        # 5. Insérer des données de test dans usage (incluant WhatsApp > 60s)
        test_data = [
            (1, "WhatsApp", "2025-08-08 22:00:00", 70),  # 70 secondes > 60s
            (1, "YouTube", "2025-08-08 22:01:00", 50),   # 50 secondes < 60s
            (2, "App2", "2025-08-08 22:02:00", 1800),    # 30 minutes
        ]
        cursor.executemany('''
            INSERT INTO usage (user_id, app_name, start_time, duration)
            VALUES (?, ?, ?, ?)
        ''', test_data)
        print("✅ Données de test insérées dans la table usage")

        # 6. Vérifier le nombre d'enregistrements dans usage
        cursor.execute("SELECT COUNT(*) FROM usage")
        usage_count = cursor.fetchone()[0]
        print(f"ℹ️ Nombre d'enregistrements dans usage : {usage_count}")

        conn.commit()
        print("✅ Initialisation de la base de données terminée")
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        print(f"❌ Erreur lors de l'initialisation : {str(e)}")
    finally:
        if 'conn' in locals():
            conn.close()

# 🔧 Initialisation de la table des paramètres
def init_settings_table():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_settings (
                user_id INTEGER,
                app_name TEXT,
                max_duration INTEGER,
                PRIMARY KEY (user_id, app_name),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')
        conn.commit()
        print("✅ Table user_settings créée ou déjà existante")
    except Exception as e:
        logger.error(f"Error initializing settings table: {str(e)}")
        print(f"❌ Erreur lors de l'initialisation de user_settings : {str(e)}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    init_db()
    init_settings_table()
    app.run(debug=True)