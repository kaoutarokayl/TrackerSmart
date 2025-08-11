
import sqlite3
import datetime
from email_utils import send_email_smtp  # Ajoute cet import

def get_user_usage(user_id):
    conn = sqlite3.connect("usage_data.db")
    cursor = conn.cursor()
    today = datetime.datetime.now().date()
    cursor.execute("""
        SELECT app_name, SUM(duration) as total_duration 
        FROM usage 
        WHERE user_id = ? AND DATE(start_time) = ?
        GROUP BY app_name
    """, (user_id, today))
    usage_data = cursor.fetchall()
    conn.close()
    return usage_data

def get_user_settings(user_id):
    conn = sqlite3.connect("usage_data.db")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT app_name, max_duration 
        FROM user_settings 
        WHERE user_id = ?
    """, (user_id,))
    settings = {row[0]: row[1] for row in cursor.fetchall()}
    conn.close()
    return settings

def get_recommendations_and_notifications(user_id):
    conn = sqlite3.connect("usage_data.db")
    conn.row_factory = sqlite3.Row  # Ajoute ceci pour accéder aux colonnes par nom
    cursor = conn.cursor()
    cursor.execute("SELECT email FROM users WHERE id = ?", (user_id,))
    email = cursor.fetchone()['email']
    conn.close()

    recommendations = []
    notifications = []
    usage_data = get_user_usage(user_id)
    settings = get_user_settings(user_id)

    for app, duration in usage_data:
        max_duration = settings.get(app, 10800)  # Défaut 3 heures si pas de seuil
            # Recommandation pour les navigateurs
    if app.lower() in ["google chrome", "firefox", "edge"] and duration > 10800:
        recommendations.append("Attention à votre temps sur les navigateurs !")

        if duration > max_duration:
            recommendations.append(f"Réduisez l'utilisation de {app} (dépassement de {max_duration/3600:.1f}h : {duration/3600:.1f}h)")
            notif = {
                "to": email,
                "subject": "Alerte de dépassement - SmartTracker",
                "message": f"Vous avez dépassé le seuil pour {app} : {duration/3600:.1f}h sur {max_duration/3600:.1f}h."
            }
            notifications.append(notif)
            # Envoi email ici
            send_email_smtp(notif["to"], notif["subject"], notif["message"], smtp_user="kaoutarokayl4@gmail.com", smtp_password="oehu savm etlo pycr", from_email="kaoutarokayl4@gmail.com")
        elif duration > 0:
            recommendations.append(f"Utilisation normale de {app} : {duration/3600:.1f}h")

    # Résumé quotidien
    total_duration = sum(d[1] for d in usage_data)
    if total_duration > 0:
        notif = {
            "to": email,
            "subject": "Résumé quotidien - SmartTracker",
            "message": f"Résumé du {datetime.datetime.now().date()}: {total_duration/3600:.1f}h d'utilisation totale."
        }
        notifications.append(notif)
        send_email_smtp(notif["to"], notif["subject"], notif["message"], smtp_user="kaoutarokayl4@gmail.com", smtp_password="oehu savm etlo pycr", from_email="kaoutarokayl4@gmail.com")

    return recommendations, notifications

# Exemple d'appel
if __name__ == "__main__":
    recs, notifs = get_recommendations_and_notifications(1)
    print("Recommandations:", recs)
    print("Notifications:", notifs)
