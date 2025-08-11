"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { usageAPI } from "../services/api";
import { Clock, Monitor, TrendingUp, Calendar } from "lucide-react";
import { getRecommendations } from "../services/recommendations";
import NotificationBanner from "../components/NotificationBanner";
import api from "../services/api";

import { userAPI } from "../services/api";

const Dashboard = () => {
  const { user } = useAuth();
  const [usageData, setUsageData] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [banner, setBanner] = useState(null);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTime: 0,
    mostUsedApp: "",
    sessionsToday: 0,
    averageSession: 0,
  });
  const [categoryStats, setCategoryStats] = useState({});
  const [sessionCategories, setSessionCategories] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [categoryLoading, setCategoryLoading] = useState(false);

  // Catégories basées uniquement sur app_categories.csv, sans "Autre"
  const allCategories = ["Travail", "Navigateurs", "Social", "Divertissement", "Création/Streaming", "Outils système"];

  // Correspondances manuelles pour les cas où l'API échoue, avec variantes pour Snipping Tool
  const manualCategories = {
    "google chrome": "Navigateurs",
    "firefox": "Navigateurs",
    "safari": "Navigateurs",
    "edge": "Navigateurs",
    "microsoft​ edge": "Navigateurs",
    "opera": "Navigateurs",
    "vscode": "Travail",
    "notion": "Travail",
    "slack": "Travail",
    "DB Browser for SQLite": "Travail",
    "visual studio code": "Travail",
    "youtube": "Divertissement",
    "netflix": "Divertissement",
    "whatsapp": "Social",
    "facebook": "Social",
    "instagram": "Social",
    "obs studio": "Création/Streaming",
    "snipping tool": "Outils système",
    "snippingtool": "Outils système",
    "microsoft snipping tool": "Outils système",
  };

  // Filtrer les données pour la journée actuelle
  const filterDataByToday = (data) => {
    const today = new Date().toISOString().split("T")[0]; // Format YYYY-MM-DD
    return data.filter((item) => item.start_time.startsWith(today));
  };

  useEffect(() => {
    let isMounted = true;
    

    const loadData = async () => {
      try {
        setLoading(true);
        console.log("[Dashboard] Chargement des données pour user.id:", user.id);
        const response = await usageAPI.getUserUsage(user.id);
        const data = response.data.filter(
          (item) => item.app_name !== "unknown" && item.app_name !== "Application inconnue"
        );
        console.log("[Dashboard] Données chargées:", data.length, "app_names:", data.map((item) => item.app_name));
        if (isMounted) {
          setUsageData(data);
          setRecommendations(getRecommendations(data));

          await updateStatsAndCategories(data);
        }
      } catch (error) {
        console.error("[Dashboard] Erreur:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

// Charger les notifications à chaque chargement du dashboard
  userAPI.getNotifications().then(res => {
    setNotifications(res.data.notifications || []);
    if (res.data.notifications && res.data.notifications.length > 0) {
      setBanner(res.data.notifications[0]);
      setTimeout(() => setBanner(null), 5000);
    }
  });

    // Vérifier le changement de jour toutes les minutes
    const interval = setInterval(() => {
      const now = new Date().toISOString().split("T")[0];
      const lastUpdate = localStorage.getItem("lastUpdateDate");
      if (lastUpdate !== now) {
        loadData();
        localStorage.setItem("lastUpdateDate", now);
      }
    }, 60000); // Vérifie toutes les minutes

    return () => {
      isMounted = false;
      clearInterval(interval); // Nettoie l'intervalle en cas de démontage
    };
  }, [user.id]);

  const updateStatsAndCategories = async (data) => {
    if (!data.length) {
      setStats({ totalTime: 0, mostUsedApp: "", sessionsToday: 0, averageSession: 0 });
      setCategoryStats(() =>
        allCategories.reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {})
      );
      setSessionCategories({});
      console.log("[Update] Aucune donnée");
      return;
    }

    setCategoryLoading(true);
    const todayData = filterDataByToday(data); // Utilise uniquement les données d'aujourd'hui

    const totalTime = todayData.reduce((sum, item) => sum + item.duration, 0);
    const sessionsToday = todayData.length;
    const averageSession = sessionsToday > 0 ? Math.round(totalTime / sessionsToday) : 0;
    const appUsage = {};
    todayData.forEach((item) => (appUsage[item.app_name] = (appUsage[item.app_name] || 0) + item.duration));
    const mostUsedApp = Object.keys(appUsage).reduce((a, b) => (appUsage[a] > appUsage[b] ? a : b), "");

    // Calcul des stats par catégorie
    const categoryUsage = allCategories.reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {});
    todayData.forEach((item) => {
      const category = manualCategories[item.app_name.toLowerCase()] || "Outils système";
      categoryUsage[category] += item.duration;
    });
    setCategoryStats(categoryUsage);

    // Catégorisation des sessions
    const categories = {};
    todayData.forEach((item) => {
      categories[item.app_name] = manualCategories[item.app_name.toLowerCase()] || "Outils système";
    });
    setSessionCategories(categories);

    setStats({ totalTime, mostUsedApp, sessionsToday, averageSession });
    setCategoryLoading(false);
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const getPaginatedSessions = (data) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  };

  const loadMoreSessions = () => {
    setCurrentPage((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       {/* Notification en temps réel */}
      {banner && (
        <NotificationBanner message={banner} onClose={() => setBanner(null)} />
      )}

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
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">App la plus utilisée</p>
              <p className="text-2xl font-bold text-gray-900">{stats.mostUsedApp || "Aucune"}</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.keys(categoryStats).length > 0 ? (
          allCategories.map((category) => (
            <div key={category} className="card p-6">
              <div className="flex items-center">
                <Monitor
                  className="icon-lg"
                  style={{
                    color:
                      category === "Travail"
                        ? "#3B82F6"
                        : category === "Divertissement"
                        ? "#EF4444"
                        : category === "Social"
                        ? "#10B981"
                        : category === "Navigateurs"
                        ? "#F59E0B"
                        : category === "Création/Streaming"
                        ? "#8B5CF6"
                        : category === "Outils système"
                        ? "#6B7280"
                        : "#9CA3AF",
                  }}
                />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{category}</p>
                  <p className="text-2xl font-bold text-gray-900">{formatDuration(categoryStats[category] || 0)}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card p-6 text-center text-gray-500">Aucune statistique par catégorie disponible</div>
        )}
      </div>
      {/* Historique des notifications */}
      <div className="card p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🔔 Historique des notifications</h2>
        {notifications.length > 0 ? (
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            {notifications.map((notif, idx) => (
              <li key={idx}>{notif}</li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">Aucune notification reçue.</p>
        )}
      </div>
  

      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Toutes les sessions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Application</th>
                <th className="py-2 px-4 border-b">Catégorie</th>
                <th className="py-2 px-4 border-b">Heure de début</th>
                <th className="py-2 px-4 border-b">Durée</th>
              </tr>
            </thead>
            <tbody>
              {getPaginatedSessions(usageData).length > 0 ? (
                getPaginatedSessions(usageData).map((session, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b">{session.app_name}</td>
                    <td className="py-2 px-4 border-b">
                      {categoryLoading ? "Chargement..." : sessionCategories[session.app_name]}
                    </td>
                    <td className="py-2 px-4 border-b">{new Date(session.start_time).toLocaleString("fr-FR")}</td>
                    <td className="py-2 px-4 border-b">{formatDuration(session.duration)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-4 text-center text-gray-500">
                    Aucune session catégorisée disponible
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {getPaginatedSessions(usageData).length < usageData.length && (
            <div className="px-6 py-4 text-center">
              <button
                onClick={loadMoreSessions}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={categoryLoading}
              >
                Charger plus
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;