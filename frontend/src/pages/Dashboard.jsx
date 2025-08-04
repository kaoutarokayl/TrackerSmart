"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { usageAPI } from "../services/api";
import { Clock, Monitor, TrendingUp, Calendar } from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const [usageData, setUsageData] = useState([]);
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
          await updateStatsAndCategories(data);
        }
      } catch (error) {
        console.error("[Dashboard] Erreur:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

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
    const averageSession = sessionsToday > 0 ? Math.round(todayData.reduce((sum, item) => sum + item.duration, 0) / sessionsToday) : 0;
    const appUsage = {};
    todayData.forEach((item) => (appUsage[item.app_name] = (appUsage[item.app_name] || 0) + item.duration));
    const mostUsedApp = Object.keys(appUsage).reduce((a, b) => (appUsage[a] > appUsage[b] ? a : b), "") || "";

    setStats({ totalTime, mostUsedApp, sessionsToday, averageSession });

    const categoryPromises = todayData.map((item) => categorizeApp(item.app_name));
    const categories = await Promise.all(categoryPromises);
    console.log("[Update] Catégories:", todayData.map((item) => item.app_name), categories);
    const categoryUsage = allCategories.reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {});
    const newSessionCategories = {};
    todayData.forEach((item, index) => {
      const appNameCleaned = item.app_name.toLowerCase().replace(/[-_]/g, " ").replace(/[^\w\s]/g, "").trim();
      console.log("[Update] Nom nettoyé pour:", item.app_name, "→", appNameCleaned);
      const category = categories[index];
      if (category && allCategories.includes(category)) {
        categoryUsage[category] = (categoryUsage[category] || 0) + item.duration;
        newSessionCategories[item.app_name] = category;
        console.log("[Update] Association API:", item.app_name, "→", category);
      } else if (manualCategories[appNameCleaned] && allCategories.includes(manualCategories[appNameCleaned])) {
        categoryUsage[manualCategories[appNameCleaned]] = (categoryUsage[manualCategories[appNameCleaned]] || 0) + item.duration;
        newSessionCategories[item.app_name] = manualCategories[appNameCleaned];
        console.log("[Update] Association manuelle:", item.app_name, "→", manualCategories[appNameCleaned]);
      } else {
        console.log("[Update] Aucune catégorie valide pour:", item.app_name);
        const defaultCategory = "Navigateurs";
        categoryUsage[defaultCategory] = (categoryUsage[defaultCategory] || 0) + item.duration;
        newSessionCategories[item.app_name] = defaultCategory;
      }
    });
    setCategoryStats(categoryUsage);
    setSessionCategories((prev) => ({ ...prev, ...newSessionCategories }));
    setCategoryLoading(false);
  };

  const categorizeApp = async (appName) => {
    console.log("[Categorize] Tentative pour:", appName);
    const cleanAppName = appName
      .toLowerCase()
      .replace(/[-_]/g, " ")
      .replace(/[^\w\s]/g, "")
      .trim();
    console.log("[Categorize] Nom nettoyé:", cleanAppName);
    if (manualCategories[cleanAppName] && allCategories.includes(manualCategories[cleanAppName])) {
      console.log("[Categorize] Manuel:", cleanAppName, "→", manualCategories[cleanAppName]);
      localStorage.setItem(`category_${encodeURIComponent(appName)}`, manualCategories[cleanAppName]);
      return manualCategories[cleanAppName];
    }
    const cachedCategory = localStorage.getItem(`category_${encodeURIComponent(appName)}`);
    if (cachedCategory) {
      console.log("[Categorize] Cache:", cachedCategory);
      return allCategories.includes(cachedCategory) ? cachedCategory : null;
    }

    try {
      const response = await usageAPI.categorizeApp(cleanAppName);
      console.log("[Categorize] Réponse API:", response.data);
      if (response.data && response.data.category) {
        const category = response.data.category;
        if (allCategories.includes(category)) {
          localStorage.setItem(`category_${encodeURIComponent(appName)}`, category);
          console.log("[Categorize] Sauvegardé:", category);
          return category;
        }
      }
      throw new Error("Catégorie invalide");
    } catch (error) {
      console.error("[Categorize] Erreur API:", error);
      console.log("[Categorize] Ignoré, pas de catégorie valide");
      return null;
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hours > 0 ? `${hours}h ${minutes}m ${secs}s` : minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
  };

  const getPaginatedSessions = (data) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data
      .filter((item) => item.app_name !== "unknown" && item.app_name !== "Application inconnue")
      .filter((item) => sessionCategories[item.app_name] && allCategories.includes(sessionCategories[item.app_name]))
      .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
      .slice(startIndex, endIndex);
  };

  const loadMoreSessions = () => {
    setCurrentPage(currentPage + 1);
    updateStatsAndCategories(usageData);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="spinner-lg"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bonjour, {user?.username} 👋</h1>
        <p className="text-gray-600">Voici un aperçu de votre activité aujourd'hui - 02:20 PM +01, Monday, August 04, 2025</p>
      </div>
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
              <p className="text-lg font-bold text-gray-900 max-w-full break-words whitespace-normal" style={{ wordBreak: "break-word" }}>
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