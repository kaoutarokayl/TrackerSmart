import sqlite3

conn = sqlite3.connect("usage_data.db")
cursor = conn.cursor()

# Change la date selon ce que tu veux tester
date = "2025-07-29"
cursor.execute("SELECT user_id, start_time FROM usage WHERE start_time LIKE ?", (f"{date}%",))
rows = cursor.fetchall()

print(f"Nombre de lignes pour {date} :", len(rows))
for row in rows:
    print(row)

conn.close()