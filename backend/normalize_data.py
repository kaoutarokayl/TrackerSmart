import sqlite3

conn = sqlite3.connect("usage_data.db")
cursor = conn.cursor()

cursor.execute("SELECT id, app_name FROM usage")
rows = cursor.fetchall()

for row_id, app_name in rows:
    normalized_name = UsageTracker(1).normalize_app_name(app_name)
    if normalized_name and normalized_name != app_name:
        cursor.execute("UPDATE usage SET app_name = ? WHERE id = ?", (normalized_name, row_id))

conn.commit()
conn.close()
print("Normalisation des noms dans la base terminée.")