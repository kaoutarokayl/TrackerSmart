import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:5000";

// Configuration axios avec intercepteur pour le token
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Intercepteur pour ajouter le token automatiquement
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 Requête envoyée: ${config.method?.toUpperCase()} ${config.url}`);
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error("❌ Erreur dans l'intercepteur de requête:", error);
    return Promise.reject(error);
  },
);

// Intercepteur pour gérer les erreurs d'authentification
api.interceptors.response.use(
  (response) => {
    console.log(`✅ Réponse reçue: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`❌ Erreur de réponse: ${error.response?.status} ${error.config?.url}`, error.message);
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Rediriger vers la page d'accueil au lieu de la page de connexion
      window.location.href = "/";
    }
    return Promise.reject(error);
  },
);

export const authAPI = {
  login: (credentials) => api.post("/login", credentials),
  register: (userData) => api.post("/register", userData),
};

export const trackerAPI = {
  // Démarrer le tracker
  start: () => api.post("/tracker/start"),

  // Arrêter le tracker
  stop: () => api.post("/tracker/stop"),

  // Statut du tracker
  status: () => api.get("/tracker/status"),
};

export const usageAPI = {
  getUserUsage: (userId) => api.get(`/usage/${userId}`),
  getAdminUsers: () => api.get("/admin/users"),
  categorizeApp: (appName) => api.get(`/categorize/${encodeURIComponent(appName)}`), // Nouvelle méthode ajoutée
};

export const adminAPI = {
  // Statistiques générales admin
  getAdminStats: (timeRange = "7") => api.get(`/admin/stats?time_range=${timeRange}`),

  // Activité récente
  getRecentActivity: (timeRange = "7") => api.get(`/admin/activity?time_range=${timeRange}`),

  // Utilisateurs avec leurs statistiques
  getUsersWithStats: (timeRange = "7") => api.get(`/admin/users/stats?time_range=${timeRange}`),

  // Données système
  getSystemHealth: () => api.get("/admin/system/health"),

  // 📈 Tendances d'utilisation (utilisateurs actifs par jour sur 7 jours)
  getUsageTrends: (timeRange = "7") => api.get(`/admin/usage-trends?time_range=${timeRange}`),
};



export default api;