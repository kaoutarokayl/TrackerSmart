"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { usageAPI } from "../services/api"
import { Clock, Monitor, TrendingUp, Calendar } from "lucide-react"
import { testFrontendCategorization, clearCategorizationCache } from "../test_categorization"

const Dashboard = () => {
  const { user } = useAuth()
  const [usageData, setUsageData] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTime: 0,
    mostUsedApp: "",
    sessionsToday: 0,
    averageSession: 0,
  })
  const [categoryStats, setCategoryStats] = useState({})
  const [sessionCategories, setSessionCategories] = useState({})

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true)
        console.log("Tentative de chargement des données pour user.id:", user.id)
        const response = await usageAPI.getUserUsage(user.id)
        const data = response.data.slice(0, 50)
                  .filter(item => item.app_name !== "unknown" && item.app_name !== "Application inconnue") // 🟡 MODIFICATION

        console.log("Données chargées (app_names):", data.map(item => item.app_name))
        if (isMounted) {
          setUsageData(data)
          await updateStatsAndCategories(data)
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false;
    };
  }, [user.id])

  const updateStatsAndCategories = async (data) => {
    if (!data.length) {
      setStats({ totalTime: 0, mostUsedApp: "", sessionsToday: 0, averageSession: 0 })
      setCategoryStats({})
      setSessionCategories({})
      return
    }

    const today = new Date().toISOString().split("T")[0]
    const todayData = data.filter((item) => item.start_time.startsWith(today))

    const totalTime = data.reduce((sum, item) => sum + item.duration, 0)
    const sessionsToday = todayData.length
    const averageSession = sessionsToday > 0 ? Math.round(todayData.reduce((sum, item) => sum + item.duration, 0) / sessionsToday) : 0

    const appUsage = {}
    data.forEach((item) => {
      appUsage[item.app_name] = (appUsage[item.app_name] || 0) + item.duration
    })
    const mostUsedApp = Object.keys(appUsage).reduce((a, b) => (appUsage[a] > appUsage[b] ? a : b), "")

    setStats({
      totalTime,
      mostUsedApp,
      sessionsToday,
      averageSession,
    })

    const categoryPromises = data.map(item => categorizeApp(item.app_name))
    const categories = await Promise.all(categoryPromises)
    console.log("Catégories calculées (avec app_names):", data.map(item => item.app_name), categories)
    const categoryUsage = {}
    data.forEach((item, index) => {
      const category = categories[index] || "Non catégorisé"
      categoryUsage[category] = (categoryUsage[category] || 0) + item.duration
    })
    setCategoryStats(categoryUsage)

    const recentSessions = getRecentSessions()
    const sessionCategoryPromises = recentSessions.map(session => categorizeApp(session.app_name))
    const sessionCategoriesData = await Promise.all(sessionCategoryPromises)
    console.log("Catégories des sessions récentes (avec app_names):", recentSessions.map(s => s.app_name), sessionCategoriesData)
    const newSessionCategories = {}
    recentSessions.forEach((session, index) => {
      newSessionCategories[session.app_name] = sessionCategoriesData[index] || "Non catégorisé"
    })
    setSessionCategories(newSessionCategories)
  }
const categorizeApp = async (appName) => {
  console.log(`Tentative de catégorisation pour: ${appName}`);
  
  // Nettoyer le nom de l'application pour l'API
  const cleanAppName = appName.split(' - ').pop() || appName; // Prendre la dernière partie après " - "
  console.log(`Nom nettoyé pour API: ${cleanAppName}`);
  
  const cachedCategory = localStorage.getItem(`category_${encodeURIComponent(appName)}`);
  if (cachedCategory) {
    console.log(`Catégorie trouvée en cache pour ${appName}: ${cachedCategory}`);
    return cachedCategory;
  }

  try {
    console.log(`Appel API pour catégoriser: ${cleanAppName}`);
    const response = await usageAPI.categorizeApp(cleanAppName);
    console.log(`Réponse API brute pour ${cleanAppName}:`, response.data);
    
    if (response.data && response.data.category) {
      const category = response.data.category;
      localStorage.setItem(`category_${encodeURIComponent(appName)}`, category);
      console.log(`Catégorie sauvegardée pour ${appName}: ${category}`);
      return category;
    }
    throw new Error("Structure de réponse inattendue ou catégorie absente");
  } catch (error) {
    console.error(`Erreur API pour ${cleanAppName}:`, error.response ? error.response.data : error.message);
    console.error(`Détails de l'erreur:`, error);
    
    // Logique de secours basée sur des mots-clés
    const lowerAppName = appName.toLowerCase();
    if (["vscode", "notion", "slack", "visual studio code"].some(keyword => lowerAppName.includes(keyword))) return "Travail";
    if (["youtube", "netflix", "chrome", "edge", "firefox"].some(keyword => lowerAppName.includes(keyword))) return "Navigateurs";
    if (["facebook", "whatsapp"].some(keyword => lowerAppName.includes(keyword))) return "Social";
    return "Non catégorisé";
  }
};

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const getRecentSessions = () => {
    return usageData
      .filter(item => item.app_name !== "unknown" && item.app_name !== "Application inconnue") // 🟡 MODIFICATION
      .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
      .slice(0, 10)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner-lg"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bonjour, {user?.username} 👋</h1>
        <p className="text-gray-600">Voici un aperçu de votre activité</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <Clock className="icon-lg text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Temps total</p>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.totalTime)}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <Monitor className="icon-lg text-green-600" />
            <div className="ml-4 max-w-full">
              <p className="text-sm font-medium text-gray-600">App la plus utilisée</p>
              <p
                className="text-lg font-bold text-gray-900 max-w-full break-words whitespace-normal"
                style={{ wordBreak: 'break-word' }}
              >
                {stats.mostUsedApp || "Aucune"}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <Calendar className="icon-lg text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sessions aujourd'hui</p>
              <p className="text-2xl font-bold text-gray-900">{stats.sessionsToday}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <TrendingUp className="icon-lg text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Session moyenne</p>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.averageSession)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(categoryStats).map(([category, time]) => (
          <div key={category} className="card p-6">
            <div className="flex items-center">
              <Monitor className="icon-lg" style={{ color: category === "Travail" ? "#3B82F6" : category === "Divertissement" ? "#EF4444" : category === "Social" ? "#10B981" : "#6366F1" }} />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{category}</p>
                <p className="text-2xl font-bold text-gray-900">{formatDuration(time)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Sessions */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Sessions récentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Application</th>
                <th>Catégorie</th>
                <th>Heure de début</th>
                <th>Durée</th>
              </tr>
            </thead>
            <tbody>
              {getRecentSessions().map((session, index) => (
                <tr key={index}>
                  <td>
                    <div className="text-sm font-medium text-gray-900">{session.app_name}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-500">{sessionCategories[session.app_name] || "Non catégorisé"}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-500">{new Date(session.start_time).toLocaleString("fr-FR")}</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">{formatDuration(session.duration)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Dashboard