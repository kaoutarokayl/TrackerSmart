"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { adminAPI } from "../services/api"
import {
  Users,
  Shield,
  BarChart3,
  Activity,
  Clock,
  TrendingUp,
  Settings,
  Database,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from "lucide-react"

const AdminDashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalSessions: 0,
    avgSessionTime: 0,
    systemHealth: "loading",
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [systemInfo, setSystemInfo] = useState({
    database: "loading",
    server: "loading",
    lastBackup: "loading",
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastRefresh, setLastRefresh] = useState(new Date())

  useEffect(() => {
    fetchAllAdminData()

    // Actualiser les données toutes les 30 secondes
    const interval = setInterval(fetchAllAdminData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchAllAdminData = async () => {
    try {
      setError("")

      // Récupérer toutes les données en parallèle
      const [statsResponse, activityResponse, systemResponse] = await Promise.all([
        adminAPI.getAdminStats().catch(() => ({ data: null })),
        adminAPI.getRecentActivity().catch(() => ({ data: [] })),
        adminAPI.getSystemHealth().catch(() => ({ data: null })),
      ])

      // Traiter les statistiques
      if (statsResponse.data) {
        setStats({
          totalUsers: statsResponse.data.total_users || 0,
          activeUsers: statsResponse.data.active_users || 0,
          totalSessions: statsResponse.data.total_sessions || 0,
          avgSessionTime: statsResponse.data.avg_session_time || 0,
          systemHealth: statsResponse.data.system_health || "good",
        })
      }

      // Traiter l'activité récente
      if (activityResponse.data && Array.isArray(activityResponse.data)) {
        setRecentActivity(
          activityResponse.data.map((activity) => ({
            id: activity.id,
            user: activity.username || activity.user,
            action: activity.action,
            time: formatTimeAgo(activity.timestamp || activity.time),
            type: activity.type || getActivityType(activity.action),
            details: activity.details || "",
          })),
        )
      }

      // Traiter les informations système
      if (systemResponse.data) {
        setSystemInfo({
          database: systemResponse.data.database_status || "operational",
          server: systemResponse.data.server_status || "online",
          lastBackup: systemResponse.data.last_backup || "Unknown",
        })
      }

      setLastRefresh(new Date())
    } catch (error) {
      console.error("Erreur lors du chargement des données admin:", error)
      setError("Erreur lors du chargement des données. Vérifiez que le backend est démarré.")
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "Inconnu"

    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now - time) / (1000 * 60))

    if (diffInMinutes < 1) return "À l'instant"
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `Il y a ${diffInHours}h`

    const diffInDays = Math.floor(diffInHours / 24)
    return `Il y a ${diffInDays} jour${diffInDays > 1 ? "s" : ""}`
  }

  const getActivityType = (action) => {
    if (action.toLowerCase().includes("connexion") || action.toLowerCase().includes("login")) return "login"
    if (action.toLowerCase().includes("déconnexion") || action.toLowerCase().includes("logout")) return "logout"
    if (action.toLowerCase().includes("session")) return "session"
    if (action.toLowerCase().includes("admin") || action.toLowerCase().includes("modification")) return "admin"
    if (action.toLowerCase().includes("system") || action.toLowerCase().includes("sauvegarde")) return "system"
    return "other"
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case "login":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "logout":
        return <AlertTriangle className="w-4 h-4 text-orange-600" />
      case "session":
        return <Activity className="w-4 h-4 text-blue-600" />
      case "admin":
        return <Shield className="w-4 h-4 text-purple-600" />
      case "system":
        return <Settings className="w-4 h-4 text-gray-600" />
      default:
        return <Activity className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "operational":
      case "online":
      case "good":
        return "text-green-600"
      case "warning":
        return "text-yellow-600"
      case "error":
      case "offline":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "operational":
      case "online":
      case "good":
        return <CheckCircle className="w-4 h-4" />
      case "loading":
        return <RefreshCw className="w-4 h-4 animate-spin" />
      default:
        return <AlertTriangle className="w-4 h-4" />
    }
  }

  const handleRefresh = () => {
    setLoading(true)
    fetchAllAdminData()
  }

  if (loading && recentActivity.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner-lg mb-4"></div>
          <p className="text-gray-600">Chargement des données administrateur...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Admin avec bouton refresh */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center mb-2">
              <Shield className="w-8 h-8 mr-3" />
              <h1 className="text-3xl font-bold">Panneau d'Administration</h1>
            </div>
            <p className="text-green-100">Bienvenue, {user?.username} | Données en temps réel</p>
          </div>
          <div className="text-right">
            <button
              onClick={handleRefresh}
              className="mb-2 p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
              title="Actualiser les données"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <div className="text-2xl font-bold">👑</div>
            <p className="text-sm text-green-100">Dernière MAJ: {lastRefresh.toLocaleTimeString("fr-FR")}</p>
          </div>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {/* Stats principales */}
      <div className="grid grid-cols-1 md-grid-cols-2 lg-grid-cols-4 gap-6">
        <div className="card p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center">
            <Users className="w-12 h-12 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-800">Utilisateurs totaux</p>
              <p className="text-3xl font-bold text-blue-900">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <div className="flex items-center">
            <Activity className="w-12 h-12 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-green-800">Utilisateurs actifs</p>
              <p className="text-3xl font-bold text-green-900">{stats.activeUsers}</p>
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center">
            <BarChart3 className="w-12 h-12 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-800">Sessions totales</p>
              <p className="text-3xl font-bold text-purple-900">{stats.totalSessions}</p>
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center">
            <Clock className="w-12 h-12 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-orange-800">Temps moyen/session</p>
              <p className="text-3xl font-bold text-orange-900">{stats.avgSessionTime}h</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg-grid-cols-3 gap-6">
        {/* Activité récente */}
        <div className="lg-col-span-2">
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Activité récente
              </h2>
              <span className="text-sm text-gray-500">
                {recentActivity.length} événement{recentActivity.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="p-6">
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.slice(0, 10).map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        {getActivityIcon(activity.type)}
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            <span className="font-semibold">{activity.user}</span> - {activity.action}
                          </p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                          {activity.details && <p className="text-xs text-gray-400 mt-1">{activity.details}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune activité récente</p>
                  <p className="text-sm">Les événements apparaîtront ici en temps réel</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions rapides et état du système */}
        <div className="space-y-6">
          {/* État du système */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Database className="w-5 h-5 mr-2" />
              État du système
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Base de données</span>
                <span className={`flex items-center ${getStatusColor(systemInfo.database)}`}>
                  {getStatusIcon(systemInfo.database)}
                  <span className="ml-1 capitalize">{systemInfo.database}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Serveur</span>
                <span className={`flex items-center ${getStatusColor(systemInfo.server)}`}>
                  {getStatusIcon(systemInfo.server)}
                  <span className="ml-1 capitalize">{systemInfo.server}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Dernière sauvegarde</span>
                <span className="text-gray-900 text-sm">{systemInfo.lastBackup}</span>
              </div>
            </div>
          </div>

          {/* Actions rapides */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Actions rapides
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => (window.location.href = "/admin/users")}
                className="w-full btn btn-primary btn-enhanced text-left flex items-center"
              >
                <Users className="w-4 h-4 mr-2" />
                Gérer les utilisateurs
              </button>
              <button className="w-full btn btn-ghost text-left flex items-center">
                <BarChart3 className="w-4 h-4 mr-2" />
                Rapports globaux
              </button>
              <button onClick={handleRefresh} className="w-full btn btn-ghost text-left flex items-center">
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser les données
              </button>
              <button className="w-full btn btn-ghost text-left flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                Configuration système
              </button>
            </div>
          </div>

          {/* Alertes dynamiques */}
          {(stats.totalUsers > 40 || stats.activeUsers < 10) && (
            <div className="card p-6 bg-yellow-50 border-yellow-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
                Alertes système
              </h3>
              <div className="space-y-2">
                {stats.totalUsers > 40 && (
                  <div className="text-sm text-yellow-800">• Nombre d'utilisateurs élevé ({stats.totalUsers})</div>
                )}
                {stats.activeUsers < 10 && (
                  <div className="text-sm text-yellow-800">• Peu d'utilisateurs actifs ({stats.activeUsers})</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Graphiques et statistiques avancées */}
      <div className="grid md-grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Tendances d'utilisation
          </h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-2" />
              <p>Graphique des tendances</p>
              <p className="text-sm">Données réelles à venir</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Répartition des utilisateurs
          </h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2" />
              <p>Actifs: {stats.activeUsers}</p>
              <p>Inactifs: {stats.totalUsers - stats.activeUsers}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
