"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { usageAPI } from "../services/api";
import { Clock, Monitor, TrendingUp, Calendar, RefreshCw, Menu, X, HelpCircle, Download } from "lucide-react";
import { getRecommendations } from "../services/recommendations";
import NotificationBanner from "../components/NotificationBanner";
import { Bar } from 'react-chartjs-2';
import { userAPI } from "../services/api";
import { motion, AnimatePresence } from "framer-motion";

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const { user } = useAuth();
  const [usageData, setUsageData] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [stats, setStats] = useState({
    totalTime: 0,
    mostUsedApp: "",
    sessionsToday: 0,
    averageSession: 0,
  });
  const [categoryStats, setCategoryStats] = useState({
    Travail: 431, // 0h 7m 11s
    Navigateurs: 760, // 0h 12m 40s
    Social: 0,
    Divertissement: 0,
    "Création/Streaming": 0,
    "Outils système": 217 // 0h 3m 37s
  });
  const [sessionCategories, setSessionCategories] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeTab, setActiveTab] = useState('stats');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const chartRef = useRef(null);
  const itemsPerPage = 10;

  const allCategories = [
    "Travail",
    "Navigateurs",
    "Social",
    "Divertissement",
    "Création/Streaming",
    "Outils système"
  ];

  const manualCategories = {
    "google chrome": "Navigateurs",
    "firefox": "Navigateurs",
    "safari": "Navigateurs",
    "edge": "Navigateurs",
    "microsoft edge": "Navigateurs",
    "msedge": "Navigateurs",
    "opera": "Navigateurs",
    "vscode": "Travail",
    "visual studio code": "Travail",
    "db browser for sqlite": "Travail",
    "notion": "Travail",
    "slack": "Travail",
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

  const filterDataByToday = (data) => {
    const today = new Date().toISOString().split("T")[0];
    return data.filter((item) => item.start_time.startsWith(today));
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const chartData = {
    labels: allCategories,
    datasets: [{
      label: 'Temps par catégorie',
      data: allCategories.map(cat => (categoryStats[cat] || 0) / 3600),
      backgroundColor: allCategories.map(cat =>
        cat === "Travail" ? 'rgba(59, 130, 246, 0.5)' :
        cat === "Divertissement" ? 'rgba(239, 68, 68, 0.5)' :
        cat === "Social" ? 'rgba(16, 185, 129, 0.5)' :
        cat === "Navigateurs" ? 'rgba(245, 158, 11, 0.5)' :
        cat === "Création/Streaming" ? 'rgba(139, 92, 246, 0.5)' :
        'rgba(107, 114, 128, 0.5)'
      ),
      borderColor: allCategories.map(cat =>
        cat === "Travail" ? 'rgba(59, 130, 246, 1)' :
        cat === "Divertissement" ? 'rgba(239, 68, 68, 1)' :
        cat === "Social" ? 'rgba(16, 185, 129, 1)' :
        cat === "Navigateurs" ? 'rgba(245, 158, 11, 1)' :
        cat === "Création/Streaming" ? 'rgba(139, 92, 246, 1)' :
        'rgba(107, 114, 128, 1)'
      ),
      borderWidth: 1
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Temps (heures)',
          color: '#4B5563'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Catégories',
          color: '#4B5563'
        }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context) => {
            const label = context.label;
            const seconds = categoryStats[label] || 0;
            return `${label}: ${formatDuration(seconds)}`;
          }
        },
        position: 'nearest',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#FFFFFF',
        bodyColor: '#FFFFFF',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        caretSize: 0
      }
    },
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const category = allCategories[index];
        setSelectedCategory(category);
      }
    }
  };

  const downloadChart = () => {
    if (chartRef.current) {
      const link = document.createElement('a');
      link.href = chartRef.current.toBase64Image();
      link.download = `category-stats_${new Date().toISOString().split('T')[0]}.png`;
      link.click();
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await usageAPI.getUserUsage(user.id);
      const data = response.data.filter(
        (item) => item.app_name !== "unknown" && item.app_name !== "Application inconnue"
      );
      setUsageData(data);
      setRecommendations(getRecommendations(data));
      await updateStatsAndCategories(data);
    } catch (error) {
      console.error("[Dashboard] Erreur:", error);
      setBanner({ message: "Erreur lors du chargement des données", type: "error" });
      setTimeout(() => setBanner(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    loadData();

    userAPI.getNotifications().then(res => {
      if (isMounted) {
        setNotifications(res.data.notifications || []);
        if (res.data.notifications && res.data.notifications.length > 0) {
          setBanner({ message: res.data.notifications[0], type: "info" });
          setTimeout(() => setBanner(null), 5000);
        }
      }
    });

    const interval = setInterval(() => {
      const now = new Date().toISOString().split("T")[0];
      const lastUpdate = localStorage.getItem("lastUpdateDate");
      if (lastUpdate !== now) {
        loadData();
        localStorage.setItem("lastUpdateDate", now);
      }
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user.id]);

  const updateStatsAndCategories = async (data) => {
    if (!data.length) {
      setStats({ totalTime: 0, mostUsedApp: "", sessionsToday: 0, averageSession: 0 });
      setCategoryStats({
        Travail: 431,
        Navigateurs: 760,
        Social: 0,
        Divertissement: 0,
        "Création/Streaming": 0,
        "Outils système": 217
      });
      setSessionCategories({});
      return;
    }

    setCategoryLoading(true);
    const todayData = filterDataByToday(data);

    const totalTime = todayData.reduce((sum, item) => sum + item.duration, 0);
    const sessionsToday = todayData.length;
    const averageSession = sessionsToday > 0 ? Math.round(totalTime / sessionsToday) : 0;
    const appUsage = {};
    todayData.forEach((item) => (appUsage[item.app_name] = (appUsage[item.app_name] || 0) + item.duration));
    const mostUsedApp = Object.keys(appUsage).reduce((a, b) => (appUsage[a] > appUsage[b] ? a : b), "");

    const categoryUsage = allCategories.reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {});
    todayData.forEach((item) => {
      const category = manualCategories[item.app_name.toLowerCase()] || (item.app_name.toLowerCase().includes("edge") ? "Navigateurs" : "Outils système");
      categoryUsage[category] += item.duration;
    });
    setCategoryStats(categoryUsage);

    const categories = {};
    todayData.forEach((item) => {
      categories[item.app_name] = manualCategories[item.app_name.toLowerCase()] || (item.app_name.toLowerCase().includes("edge") ? "Navigateurs" : "Outils système");
    });
    setSessionCategories(categories);

    setStats({ totalTime, mostUsedApp, sessionsToday, averageSession });
    setCategoryLoading(false);
  };

  const getPaginatedSessions = (data) => {
    let filteredData = selectedCategory
      ? data.filter(session => sessionCategories[session.app_name] === selectedCategory)
      : data;
    if (searchQuery) {
      filteredData = filteredData.filter(
        session =>
          session.app_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sessionCategories[session.app_name]?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (sortConfig.key) {
      filteredData.sort((a, b) => {
        const aValue = sortConfig.key === 'start_time' ? new Date(a[sortConfig.key]).getTime() : a[sortConfig.key];
        const bValue = sortConfig.key === 'start_time' ? new Date(b[sortConfig.key]).getTime() : b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  };

  const requestSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  };

  const loadMoreSessions = () => {
    setCurrentPage((prev) => prev + 1);
  };

  const travailGoal = 8 * 3600; // 8 hours in seconds
  const travailProgress = Math.min((categoryStats.Travail || 0) / travailGoal * 100, 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <motion.div
          className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-2xl z-50 p-6 transition-all duration-300"
          >
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="absolute top-4 right-4 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              aria-label="Fermer la barre latérale"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Navigation</h2>
            <nav>
              <ul className="space-y-4">
                <li><a href="/dashboard" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium">Tableau de bord</a></li>
                <li><a href="/profile" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium">Profil</a></li>
                <li><a href="/settings" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium">Paramètres</a></li>
              </ul>
            </nav>
            <div className="mt-8">
              <h3 className="text-md font-medium text-gray-700 dark:text-gray-200 mb-4">Notifications</h3>
              {notifications.length > 0 ? (
                <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300 text-sm">
                  {notifications.map((notif, idx) => (
                    <li key={idx} className="hover:text-gray-800 dark:hover:text-gray-100 transition-colors">{notif}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">Aucune notification.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8 bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 sticky top-0 z-10">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Ouvrir la barre latérale"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bonjour, {user?.username} 👋</h1>
                <p className="text-md text-gray-600 dark:text-gray-400">Votre aperçu d'activité du {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
            <button
              onClick={loadData}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
              aria-label="Rafraîchir les données"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Rafraîchir
            </button>
          </div>

          {/* Notification Banner */}
          {banner && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <NotificationBanner
                message={banner.message}
                type={banner.type}
                onClose={() => setBanner(null)}
              />
            </motion.div>
          )}

          {/* Tabbed Stats and Categories */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 mb-8"
          >
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
              <button
                className={`px-6 py-3 text-lg font-medium ${activeTab === 'stats' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'}`}
                onClick={() => setActiveTab('stats')}
                aria-selected={activeTab === 'stats'}
              >
                Statistiques
              </button>
              <button
                className={`px-6 py-3 text-lg font-medium ${activeTab === 'categories' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'}`}
                onClick={() => setActiveTab('categories')}
                aria-selected={activeTab === 'categories'}
              >
                Catégories
              </button>
            </div>
            {activeTab === 'stats' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {categoryLoading ? (
                  Array(4).fill().map((_, index) => (
                    <div key={index} className="bg-gray-200 dark:bg-gray-700 rounded-lg p-6 animate-pulse">
                      <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-4"></div>
                      <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                    </div>
                  ))
                ) : (
                  <>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-center">
                        <Clock className="w-8 h-8 text-blue-600" aria-hidden="true" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Temps total</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatDuration(stats.totalTime)}</p>
                        </div>
                      </div>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-center">
                        <Monitor className="w-8 h-8 text-green-600" aria-hidden="true" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">App la plus utilisée</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.mostUsedApp || "Aucune"}</p>
                        </div>
                      </div>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                      className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-center">
                        <Calendar className="w-8 h-8 text-purple-600" aria-hidden="true" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Sessions aujourd'hui</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.sessionsToday}</p>
                        </div>
                      </div>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.3 }}
                      className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-center">
                        <TrendingUp className="w-8 h-8 text-orange-600" aria-hidden="true" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Session moyenne</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatDuration(stats.averageSession)}</p>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryLoading ? (
                  Array(6).fill().map((_, index) => (
                    <div key={index} className="bg-gray-200 dark:bg-gray-700 rounded-lg p-6 animate-pulse">
                      <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-4"></div>
                      <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                    </div>
                  ))
                ) : (
                  allCategories.map((category) => (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      key={category}
                      className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-center">
                        <Monitor
                          className="w-8 h-8"
                          style={{
                            color:
                              category === "Travail" ? "#3B82F6" :
                              category === "Divertissement" ? "#EF4444" :
                              category === "Social" ? "#10B981" :
                              category === "Navigateurs" ? "#F59E0B" :
                              category === "Création/Streaming" ? "#8B5CF6" :
                              "#6B7280"
                          }}
                          aria-hidden="true"
                        />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{category}</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatDuration(categoryStats[category] || 0)}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </motion.div>

{/* Category Statistics Chart */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 lg:col-span-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 relative"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Temps par Catégorie</h2>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  aria-label="Réinitialiser le filtre de catégorie"
                >
                  Réinitialiser
                </button>
              )}
            </div>
            <div className="h-64 relative">
              {categoryLoading ? (
                <div className="h-64 bg-gray-200 dark:bg-gray-600 animate-pulse rounded"></div>
              ) : (
                <>
                  <Bar ref={chartRef} data={chartData} options={chartOptions} />
                  <div className="absolute top-2 right-2">
                    <HelpCircle
                      className="w-5 h-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
                      aria-label="Afficher les annotations du graphique"
                    />
                  </div>

                </>
              )}
            </div>
          </motion.div>

          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 mb-8"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">🔔 Historique des notifications</h2>
            {notifications.length > 0 ? (
              <ul className="list-disc pl-5 space-y-4 text-gray-700 dark:text-gray-300">
                {notifications.map((notif, idx) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.1 }}
                    className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                  >
                    {notif}
                  </motion.li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-lg">Aucune notification reçue.</p>
            )}
          </motion.div>

          {/* Sessions Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6"
          >
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Toutes les sessions {selectedCategory && `(${selectedCategory})`}</h2>
            </div>
            <div className="px-6 py-4">
              <input
                type="text"
                placeholder="Rechercher par application ou catégorie..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:text-white transition-all"
                aria-label="Rechercher des sessions"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left" role="grid">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th
                      className="py-3 px-6 border-b border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      scope="col"
                      onClick={() => requestSort('app_name')}
                      aria-sort={sortConfig.key === 'app_name' ? sortConfig.direction : 'none'}
                    >
                      Application {sortConfig.key === 'app_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="py-3 px-6 border-b border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      scope="col"
                      onClick={() => requestSort('category')}
                      aria-sort={sortConfig.key === 'category' ? sortConfig.direction : 'none'}
                    >
                      Catégorie {sortConfig.key === 'category' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th
                      className="py-3 px-6 border-b border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      scope="col"
                      onClick={() => requestSort('start_time')}
                      aria-sort={sortConfig.key === 'start_time' ? sortConfig.direction : 'none'}
                    >
                      Heure de début {sortConfig.key === 'start_time' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th
                      className="py-3 px-6 border-b border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      scope="col"
                      onClick={() => requestSort('duration')}
                      aria-sort={sortConfig.key === 'duration' ? sortConfig.direction : 'none'}
                    >
                      Durée {sortConfig.key === 'duration' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categoryLoading ? (
                    Array(5).fill().map((_, index) => (
                      <tr key={index} className="animate-pulse">
                        <td className="py-4 px-6 border-b border-gray-200 dark:border-gray-600"><div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div></td>
                        <td className="py-4 px-6 border-b border-gray-200 dark:border-gray-600"><div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div></td>
                        <td className="py-4 px-6 border-b border-gray-200 dark:border-gray-600"><div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div></td>
                        <td className="py-4 px-6 border-b border-gray-200 dark:border-gray-600"><div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div></td>
                      </tr>
                    ))
                  ) : getPaginatedSessions(usageData).length > 0 ? (
                    getPaginatedSessions(usageData).map((session, index) => (
                      <motion.tr
                        key={index}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-600 focus:outline-none"
                        tabIndex={0}
                        role="row"
                      >
                        <td className="py-4 px-6 border-b border-gray-200 dark:border-gray-600">{session.app_name}</td>
                        <td className="py-4 px-6 border-b border-gray-200 dark:border-gray-600">{sessionCategories[session.app_name]}</td>
                        <td className="py-4 px-6 border-b border-gray-200 dark:border-gray-600">{new Date(session.start_time).toLocaleString("fr-FR")}</td>
                        <td className="py-4 px-6 border-b border-gray-200 dark:border-gray-600">{formatDuration(session.duration)}</td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-gray-500 dark:text-gray-400 text-lg">
                        Aucune session trouvée
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {getPaginatedSessions(usageData).length < (selectedCategory
                ? usageData.filter(session => sessionCategories[session.app_name] === selectedCategory).length
                : usageData.length) && (
                <div className="px-6 py-6 text-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={loadMoreSessions}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
                    disabled={categoryLoading}
                    aria-label="Charger plus de sessions"
                  >
                    Charger plus
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;