// Script de test pour vérifier les appels API de catégorisation
import { usageAPI } from './services/api';

export async function testFrontendCategorization() {
  console.log("🧪 Test de catégorisation côté frontend...");
  
  const testApps = [
    "Chrome",
    "Visual Studio Code", 
    "api.py - SmartTracker - Visual Studio Code",
    "Application de suivi numérique personnalisé - Grok - Google Chrome"
  ];
  
  for (const app of testApps) {
    try {
      console.log(`\n🔍 Test pour: ${app}`);
      const response = await usageAPI.categorizeApp(app);
      console.log(`✅ Réponse:`, response.data);
    } catch (error) {
      console.log(`❌ Erreur pour ${app}:`, error.message);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data:`, error.response.data);
      }
    }
  }
}

// Fonction pour nettoyer le cache localStorage
export function clearCategorizationCache() {
  console.log("🧹 Nettoyage du cache de catégorisation...");
  const keys = Object.keys(localStorage);
  const categoryKeys = keys.filter(key => key.startsWith('category_'));
  categoryKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`🗑️ Supprimé: ${key}`);
  });
  console.log(`✅ Cache nettoyé (${categoryKeys.length} éléments supprimés)`);
} 