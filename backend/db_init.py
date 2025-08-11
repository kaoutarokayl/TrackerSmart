import sqlite3
from werkzeug.security import generate_password_hash

# Connexion à la base de données
conn = sqlite3.connect("usage_data.db")
cursor = conn.cursor()

# 1. Créer la table users si elle n'existe pas
cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user'
    )
''')

# 2. Ajouter la colonne user_id à usage si elle n'existe pas déjà
try:
    cursor.execute('ALTER TABLE usage ADD COLUMN user_id INTEGER')
except sqlite3.OperationalError:
    # La colonne existe déjà, on ignore l'erreur
    pass

# 3. Ajouter la colonne last_login à users si elle n'existe pas déjà
try:
    cursor.execute('ALTER TABLE users ADD COLUMN last_login TEXT')
    print("✅ Colonne last_login ajoutée à la table users")
except sqlite3.OperationalError:
    # La colonne existe déjà, on ignore l'erreur
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

# 5. Créer la table usage si elle n'existe pas
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
# 5bis. Créer la table tasks si elle n'existe pas
cursor.execute('''
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT,
        status TEXT,
        priority TEXT,
        time TEXT,
        date TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
''')
print("✅ Table tasks créée ou déjà existante")

# 6. Corriger les user_id NULL dans usage (si nécessaire)
cursor.execute("UPDATE usage SET user_id = 1 WHERE user_id IS NULL")
print("✅ Valeurs NULL de user_id dans usage mises à jour avec user_id 1")

# 7. Insérer des données de test dans usage
test_data = [
    (1, "App1", "2025-07-29 11:30:33", 3600),  # user_id 1, 1 heure
    (2, "App2", "2025-07-29 12:00:00", 1800),  # user_id 2, 30 minutes
]
cursor.executemany('''
    INSERT INTO usage (user_id, app_name, start_time, duration)
    VALUES (?, ?, ?, ?)
''', test_data)
print("✅ Données de test insérées dans la table usage")

# 8. Vérifier le nombre d'enregistrements dans usage
cursor.execute("SELECT COUNT(*) FROM usage")
usage_count = cursor.fetchone()[0]
print(f"ℹ️ Nombre d'enregistrements dans usage : {usage_count}")

conn.commit()
conn.close()
print("✅ Initialisation terminée.")