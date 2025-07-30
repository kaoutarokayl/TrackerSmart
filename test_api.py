import requests
import json

def test_categorization_api():
    base_url = "http://127.0.0.1:5000"
    
    # Applications à tester
    test_apps = [
        "Chrome",
        "Visual Studio Code",
        "api.py - SmartTracker - Visual Studio Code",
        "Application de suivi numérique personnalisé - Grok - Google Chrome",
        "Microsoft Edge",
        "Firefox"
    ]
    
    print("🧪 Test de l'API de catégorisation")
    print("=" * 50)
    
    for app in test_apps:
        try:
            # Nettoyer le nom de l'application
            clean_app = app.split(' - ').pop() if ' - ' in app else app
            url = f"{base_url}/categorize/{clean_app}"
            
            print(f"\n🔍 Test pour: {app}")
            print(f"   URL: {url}")
            
            response = requests.get(url)
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Status: {response.status_code}")
                print(f"   📊 Catégorie: {data.get('category', 'Non trouvée')}")
            else:
                print(f"   ❌ Status: {response.status_code}")
                print(f"   📄 Réponse: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print(f"   ❌ Erreur de connexion - Serveur non accessible")
            print("   💡 Assurez-vous que le serveur Flask est démarré")
            break
        except Exception as e:
            print(f"   ❌ Erreur: {str(e)}")

if __name__ == "__main__":
    test_categorization_api() 