import axios from "axios";

export const API_BASE_URL = "http://127.0.0.1:5000";

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
      window.location.href = "/";
    }
    return Promise.reject(error);
  },
);

export const authAPI = {
  login: (credentials) => api.post("/login", credentials),
  register: (userData) => api.post("/register", userData),
  updateProfile: (data) => api.post("/profile/update", data),
  changePassword: (data) => api.post("/profile/change-password", data),
};

export const trackerAPI = {
  start: () => api.post("/tracker/start"),
  stop: () => api.post("/tracker/stop"),
  status: () => api.get("/tracker/status"),
};

export const usageAPI = {
  getUserUsage: (userId) => api.get(`/usage/${userId}`),
  getAdminUsers: () => api.get("/admin/users"),
  categorizeApp: (appName) => api.get(`/categorize/${encodeURIComponent(appName)}`),
  updateUser: (userId, data) => api.post(`/admin/users/${userId}`, { ...data, action: 'update' }),
  deleteUser: (userId) => api.post(`/admin/users/${userId}`, { action: 'delete' }),
};

export const adminAPI = {
  getAdminStats: (timeRange = "7") => api.get(`/admin/stats?time_range=${timeRange}`),
  getRecentActivity: (timeRange = "7") => api.get(`/admin/activity?time_range=${timeRange}`),
  getUsersWithStats: (timeRange = "7") => api.get(`/admin/users/stats?time_range=${timeRange}`),
  getSystemHealth: () => api.get("/admin/system/health"),
  getUsageTrends: (timeRange = "7") => api.get(`/admin/usage-trends?time_range=${timeRange}`),
};

export const userAPI = {
  getNotifications: () => api.get('/user/notifications'),
};
export const fetchTasks = (date) =>
  api.get(`/tasks?date=${date}`)

export const addTask = (task) =>
  api.post("/tasks", task)

export const deleteTask = (id) =>
  api.delete(`/tasks/${id}`)

export const updateTaskStatus = (id, status) =>
  api.patch(`/tasks/${id}`, { status })

export const attendanceAPI = {
  getUserAttendance: (userId, timeRange = "7") => api.get(`/attendance/${userId}?time_range=${timeRange}`),
  getAllAttendance: (timeRange = "7") => api.get(`/admin/attendance?time_range=${timeRange}`),
};

export default api;