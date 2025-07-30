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

app = Flask(__name__)
CORS(app)


# 🧩 Clé secrète pour signer les tokens JWT
app.config['SECRET_KEY'] = '1e1c9bc44ba69983f48ae547464a6d8b3fdbdb0736d59ad06d8b39c0c14df1b3'
DATABASE = "usage_data.db"

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

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
            return jsonify({'message': 'Token requis'}), 401
        try:
            if token.startswith("Bearer "):
                token = token[7:]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            return f(user_id=data['user_id'], role=data['role'], *args, **kwargs)
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expiré'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token invalide'}), 401
    return decorated

# 🎯 Démarrer le tracker pour un utilisateur
@app.route('/tracker/start', methods=['POST'])
@token_required
def start_user_tracker(user_id, role):
    try:
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
        return jsonify({'error': f'Erreur lors du démarrage: {str(e)}'}), 500

# ⏹️ Arrêter le tracker pour un utilisateur
@app.route('/tracker/stop', methods=['POST'])
@token_required
def stop_user_tracker(user_id, role):
    try:
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
        return jsonify({'error': f'Erreur lors de l\'arrêt: {str(e)}'}), 500

# 📊 Statut du tracker
@app.route('/tracker/status', methods=['GET'])
@token_required
def get_tracker_status(user_id, role):
    running = is_tracker_running(user_id)
    return jsonify({
        'user_id': user_id,
        'status': 'running' if running else 'stopped',
        'is_running': running
    })

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    if not username or not email or not password:
        return jsonify({"error": "Champs manquants"}), 400
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO users (username, email, password_hash, role)
            VALUES (?, ?, ?, ?)
        ''', (username, email, generate_password_hash(password), "user"))
        conn.commit()
        return jsonify({"message": "Inscription réussie"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Nom d'utilisateur ou email déjà utilisé"}), 409
    finally:
        conn.close()

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    
    if user and check_password_hash(user["password_hash"], password):
        # Mettre à jour la dernière connexion
        cursor.execute(
            "UPDATE users SET last_login = ? WHERE id = ?", 
            (datetime.datetime.now().isoformat(), user["id"])
        )
        conn.commit()
        
        token = generate_token(user["id"], user["role"])
        conn.close()
        return jsonify({
            "message": "Connexion réussie",
            "token": token
        })
    
    conn.close()
    return jsonify({"error": "Identifiants invalides"}), 401

@app.route('/usage/<int:user_id>', methods=['GET'])
def get_usage(user_id):
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
    return jsonify(usage_data)

# 🔐 Route protégée par token JWT
@app.route('/admin/users', methods=['GET'])
@token_required
def get_all_users(user_id, role):
    if role != 'admin':
        return jsonify({'message': 'Accès refusé'}), 403
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, username, email, role FROM users')
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify({'users': users})

# 📊 Statistiques admin avec vraies données
@app.route('/admin/stats', methods=['GET'])
@token_required
def get_admin_stats(user_id, role):
    if role != 'admin':
        return jsonify({'message': 'Accès refusé'}), 403
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Calculer les vraies statistiques
    cursor.execute("SELECT COUNT(*) as total FROM users")
    total_users = cursor.fetchone()["total"]
    
    # Utilisateurs actifs (connectés dans les 7 derniers jours)
    seven_days_ago = (datetime.datetime.now() - datetime.timedelta(days=7)).isoformat()
    cursor.execute("SELECT COUNT(*) as active FROM users WHERE last_login > ?", (seven_days_ago,))
    active_users = cursor.fetchone()["active"]
    
    # Sessions totales
    cursor.execute("SELECT COUNT(*) as total FROM usage")
    total_sessions = cursor.fetchone()["total"]
    
    # Temps moyen par session (en secondes, converti en heures)
    cursor.execute("SELECT AVG(duration) as avg_duration FROM usage")
    avg_result = cursor.fetchone()["avg_duration"]
    avg_session_time = round((avg_result or 0) / 3600, 1)  # Convertir en heures
    
    conn.close()
    
    return jsonify({
        'total_users': total_users,
        'active_users': active_users,
        'total_sessions': total_sessions,
        'avg_session_time': avg_session_time,
        'system_health': 'good'
    })
# Chargement du modèle et du vectoriseur
model = joblib.load("category_model.joblib")
vectorizer = joblib.load("vectorizer.joblib")

@app.route('/categorize/<app_name>', methods=['GET'])
def categorize_app(app_name):
    print(f"🔍 Demande de catégorisation reçue pour: {app_name}")
    try:
        X_new = vectorizer.transform([app_name])
        category = model.predict(X_new)[0]
        print(f"✅ Catégorie prédite pour {app_name}: {category}")
        return jsonify({"app_name": app_name, "category": category})
    except Exception as e:
        print(f"❌ Erreur modèle pour {app_name}: {str(e)}")
        # Logique de secours basée sur des mots-clés
        lower_app = app_name.lower()
        if any(keyword in lower_app for keyword in ["vscode", "notion", "slack"]): 
            print(f"🔄 Utilisation de la logique de secours pour {app_name}: Travail")
            return jsonify({"app_name": app_name, "category": "Travail"})
        elif any(keyword in lower_app for keyword in ["youtube", "netflix"]): 
            print(f"🔄 Utilisation de la logique de secours pour {app_name}: Divertissement")
            return jsonify({"app_name": app_name, "category": "Divertissement"})
        elif any(keyword in lower_app for keyword in ["facebook", "whatsapp"]): 
            print(f"🔄 Utilisation de la logique de secours pour {app_name}: Social")
            return jsonify({"app_name": app_name, "category": "Social"})
        print(f"❓ Aucune catégorie trouvée pour {app_name}, retour: Non catégorisé")
        return jsonify({"app_name": app_name, "category": "Non catégorisé"})
@app.route('/categorize/batch', methods=['POST'])
def categorize_batch():
    data = request.get_json()
    app_names = data.get('app_names', [])
    X_new = vectorizer.transform(app_names)
    categories = model.predict(X_new)
    return jsonify({app_name: category for app_name, category in zip(app_names, categories)})
# 📈 Activité récente
@app.route('/admin/activity', methods=['GET'])
@token_required
def get_recent_activity(user_id, role):
    if role != 'admin':
        return jsonify({'message': 'Accès refusé'}), 403
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    activities = []
    
    # Dernières connexions
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
    
    # Dernières sessions d'usage
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
    
    # Trier par timestamp décroissant
    activities.sort(key=lambda x: x['timestamp'], reverse=True)
    
    conn.close()
    return jsonify(activities[:15])  # Retourner les 15 plus récents

# 🖥️ État du système
@app.route('/admin/system/health', methods=['GET'])
@token_required
def get_system_health(user_id, role):
    if role != 'admin':
        return jsonify({'message': 'Accès refusé'}), 403
    
    # Vérifier la base de données
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users")
        conn.close()
        db_status = "operational"
    except:
        db_status = "error"
    
    return jsonify({
        'database_status': db_status,
        'server_status': 'online',
        'last_backup': datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
    })
@app.route('/admin/users/stats', methods=['GET'])
@token_required
def get_users_with_stats(user_id, role):
    if role != 'admin':
        return jsonify({'message': 'Accès refusé'}), 403
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
    return jsonify({'users_stats': users_stats})
# 📈 Tendances d'utilisation (utilisateurs actifs par jour sur 7 jours)
@app.route('/admin/usage-trends', methods=['GET'])
@token_required
def get_usage_trends(user_id, role):
    if role != 'admin':
        return jsonify({'message': 'Accès refusé'}), 403

    conn = get_db_connection()
    cursor = conn.cursor()

    today = datetime.datetime.now().date()  # Utilise l'heure locale actuelle
    trends = []

    for i in range(6, -1, -1):
        day = today - datetime.timedelta(days=i)
        # Ajouter un débogage pour vérifier les timestamps bruts
        cursor.execute(
            "SELECT user_id, start_time FROM usage WHERE DATE(start_time) = ?",
            (day.strftime("%Y-%m-%d"),)
        )
        rows = cursor.fetchall()
        print(f"Debug - Date: {day}, Raw Rows: {rows}")
        # Vérifier tous les timestamps pour ce jour
        cursor.execute(
            "SELECT user_id, start_time FROM usage WHERE start_time LIKE ?",
            (f"{day.strftime('%Y-%m-%d')}%",)
        )
        raw_timestamps = cursor.fetchall()
        print(f"Debug - Date: {day}, Raw Timestamps: {raw_timestamps}")
        cursor.execute(
            "SELECT COUNT(DISTINCT user_id) as active_users FROM usage WHERE DATE(start_time) = ?",
            (day.strftime("%Y-%m-%d"),)
        )
        count = cursor.fetchone()["active_users"]
        print(f"Debug - Count for {day}: {count}")
        trends.append({
            "date": day.strftime("%Y-%m-%d"),
            "active_users": count if count else 0
        })

    conn.close()
    return jsonify(trends)

# Ajouter un index sur start_time pour optimiser les requêtes
def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_start_time ON usage (start_time)')
    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()  # Créer l'index au démarrage
    app.run(debug=True)