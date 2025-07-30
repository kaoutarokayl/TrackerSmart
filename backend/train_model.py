from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
import pandas as pd
import joblib

# Chargement des données
data = pd.read_csv("app_categories.csv")
X = data["app_name"]
y = data["category"]

# Vectorisation des noms d'applications
vectorizer = TfidfVectorizer()
X_vectorized = vectorizer.fit_transform(X)

# Entraînement du modèle
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_vectorized, y)

# Sauvegarde du modèle et du vectoriseur
joblib.dump(model, "category_model.joblib")
joblib.dump(vectorizer, "vectorizer.joblib")

print("Modèle entraîné et sauvegardé avec succès !")