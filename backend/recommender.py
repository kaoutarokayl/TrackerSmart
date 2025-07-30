import joblib
model = joblib.load("category_model.joblib")
vectorizer = joblib.load("vectorizer.joblib")
X_new = vectorizer.transform(["Chrome"])
print(model.predict(X_new))