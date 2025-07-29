import sqlite3
import time
from datetime import datetime
import pygetwindow as gw
import json
import sys
import os
import signal
import threading

class UsageTracker:
    def __init__(self, user_id):
        self.user_id = user_id
        self.running = False
        self.last_app = None
        self.start_time = time.time()
        self.conn = sqlite3.connect("usage_data.db", check_same_thread=False)
        self.cursor = self.conn.cursor()

    def get_active_window_name(self):
        try:
            window = gw.getActiveWindow()
            if window:
                return window.title
        except:
            pass
        return "Unknown"

    def format_duration(self, seconds):
        if seconds >= 3600:
            hours = seconds // 3600
            minutes = (seconds % 3600) // 60
            secs = seconds % 60
            return f"{hours}h {minutes}m {secs}s"
        elif seconds >= 60:
            minutes = seconds // 60
            secs = seconds % 60
            return f"{minutes}m {secs}s"
        else:
            return f"{seconds}s"

    def save_session(self, app_name, start_time, duration):
        timestamp = datetime.fromtimestamp(start_time).strftime('%Y-%m-%d %H:%M:%S')
        self.cursor.execute('''
            INSERT INTO usage (app_name, start_time, duration, user_id)
            VALUES (?, ?, ?, ?)
        ''', (app_name, timestamp, duration, self.user_id))
        self.conn.commit()
        print(f"[{timestamp}] {app_name} utilisé pendant {self.format_duration(duration)}")
        print(f"Données insérées : app={app_name}, start={timestamp}, duration={duration}, user_id={self.user_id}")

    def start_tracking(self):
        self.running = True
        print(f"🚀 Suivi démarré pour l'utilisateur {self.user_id}")
        
        try:
            while self.running:
                current_app = self.get_active_window_name()
                
                if current_app != self.last_app:
                    end_time = time.time()
                    
                    if self.last_app is not None:
                        duration = int(end_time - self.start_time)
                        if duration > 0:
                            self.save_session(self.last_app, self.start_time, duration)
                    
                    self.last_app = current_app
                    self.start_time = time.time()
                
                time.sleep(1)
                
        except Exception as e:
            print(f"❌ Erreur dans le tracker: {e}")
        finally:
            self.stop_tracking()

    def stop_tracking(self):
        if self.running:
            self.running = False
            
            # Sauvegarder la dernière session
            if self.last_app is not None:
                end_time = time.time()
                duration = int(end_time - self.start_time)
                if duration > 0:
                    self.save_session(self.last_app, self.start_time, duration)
            
            self.conn.close()
            print("⏹️ Suivi arrêté")

# Gestion des instances de tracker
active_trackers = {}

def start_tracker_for_user(user_id):
    """Démarre le tracker pour un utilisateur"""
    conn = sqlite3.connect("usage_data.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
    if not cursor.fetchone():
        print(f"⚠️ L'utilisateur avec ID {user_id} n'existe pas dans users")
        conn.close()
        return False
    conn.close()
    
    if user_id in active_trackers:
        print(f"⚠️ Tracker déjà actif pour l'utilisateur {user_id}")
        return False
    
    tracker = UsageTracker(user_id)
    active_trackers[user_id] = tracker
    
    # Lancer le tracker dans un thread séparé
    thread = threading.Thread(target=tracker.start_tracking, daemon=True)
    thread.start()
    
    return True

def stop_tracker_for_user(user_id):
    """Arrête le tracker pour un utilisateur"""
    if user_id in active_trackers:
        active_trackers[user_id].stop_tracking()
        del active_trackers[user_id]
        return True
    return False

def is_tracker_running(user_id):
    """Vérifie si le tracker est actif pour un utilisateur"""
    return user_id in active_trackers and active_trackers[user_id].running

# Si le script est exécuté directement
if __name__ == "__main__":
    if len(sys.argv) > 1:
        user_id = int(sys.argv[1])
    else:
        # Lire depuis le fichier config
        try:
            with open("config_tracker.json") as f:
                config = json.load(f)
                user_id = config.get("user_id", 1)
        except:
            user_id = 1
    
    tracker = UsageTracker(user_id)
    
    # Gérer l'arrêt propre avec Ctrl+C
    def signal_handler(sig, frame):
        for tracker in active_trackers.values():
            tracker.stop_tracking()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    tracker.start_tracking()