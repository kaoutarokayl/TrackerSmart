import axios from "axios"

const API_BASE_URL = "http://127.0.0.1:5000"

// Configuration axios avec intercepteur pour le token
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Intercepteur pour ajouter le token automatiquement
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Intercepteur pour gérer les erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      // Rediriger vers la page d'accueil au lieu de la page de connexion
      window.location.href = "/"
    }
    return Promise.reject(error)
  },
)

export const authAPI = {
  login: (credentials) => api.post("/login", credentials),
  register: (userData) => api.post("/register", userData),
}

export const usageAPI = {
  getUserUsage: (userId) => api.get(`/usage/${userId}`),
  getAdminUsers: () => api.get("/admin/users"),
}

export const adminAPI = {
  // Statistiques générales admin
  getAdminStats: () => api.get("/admin/stats"),

  // Activité récente
  getRecentActivity: () => api.get("/admin/activity"),

  // Utilisateurs avec leurs statistiques
  getUsersWithStats: () => api.get("/admin/users/stats"),

  // Données système
  getSystemHealth: () => api.get("/admin/system/health"),
}

export default api
