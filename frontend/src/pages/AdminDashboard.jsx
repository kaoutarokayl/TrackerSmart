"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { BarChart, Bar as RechartsBar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { adminAPI } from "../services/api";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip as ChartTooltip, Legend, ArcElement } from "chart.js";
import { Bar as ChartBar, Doughnut } from "react-chartjs-2";
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
  Calendar,
} from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend, ArcElement);

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalSessions: 0,
    avgSessionTime: 0,
    systemHealth: "loading",
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemInfo, setSystemInfo] = useState({
    database: "loading",
    server: "loading",
    lastBackup: "loading",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [usageTrends, setUsageTrends] = useState([]);
  const [usersStats, setUsersStats] = useState([]);
  const [timeRange, setTimeRange] = useState("7"); // 7 jours par défaut

  useEffect(() => {
    fetchAllAdminData();
    const interval = setInterval(fetchAllAdminData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchAllAdminData = async () => {
    try {
      setError("");

      const [statsResponse, activityResponse, systemResponse, trendsResponse, usersStatsResponse] = await Promise.all([
        adminAPI.getAdminStats().catch((error) => {
          console.error("Erreur getAdminStats:", error);
          return { data: null };
        }),
        adminAPI.getRecentActivity().catch((error) => {
          console.error("Erreur getRecentActivity:", error);
          return { data: [] };
        }),
        adminAPI.getSystemHealth().catch((error) => {
          console.error("Erreur getSystemHealth:", error);
          return { data: null };
        }),
        adminAPI.getUsageTrends().catch((error) => {
          console.error("Erreur getUsageTrends:", error);
          return [];
        }),
        adminAPI.getUsersWithStats().catch((error) => {
          console.error("Erreur getUsersWithStats:", error);
          return { data: { users_stats: [] } };
        }),
      ]);

      if (statsResponse.data) {
        setStats({
          totalUsers: statsResponse.data.total_users || 0,
          activeUsers: statsResponse.data.active_users || 0,
          totalSessions: statsResponse.data.total_sessions || 0,
          avgSessionTime: statsResponse.data.avg_session_time || 0,
          systemHealth: statsResponse.data.system_health || "good",
        });
      }

      if (activityResponse.data && Array.isArray(activityResponse.data)) {
        setRecentActivity(
          activityResponse.data.map((activity) => ({
            id: activity.id,
            user: activity.username || activity.user,
            action: activity.action,
            time: formatTimeAgo(activity.timestamp || activity.time),
            type: activity.type || getActivityType(activity.action),
            details: activity.details || "",
            timestamp: activity.timestamp || activity.time,
          })),
        );
      }

      if (systemResponse.data) {
        setSystemInfo({
          database: systemResponse.data.database_status || "operational",
          server: systemResponse.data.server_status || "online",
          lastBackup: systemResponse.data.last_backup || "Unknown",
        });
      }

      if (Array.isArray(trendsResponse.data)) {
        setUsageTrends(trendsResponse.data);
      } else {
        setUsageTrends(trendsResponse);
      }

      if (usersStatsResponse.data && usersStatsResponse.data.users_stats) {
        console.log("Raw Users Stats:", usersStatsResponse.data.users_stats); // Débogage
        setUsersStats(usersStatsResponse.data.users_stats);
      }

      setLastRefresh(new Date());
    } catch (error) {
      console.error("Erreur globale fetchAllAdminData:", error);
      setError("Erreur lors du chargement des données. Vérifiez que le backend est démarré.");
    } finally {
      setLoading(false);
    }
  };

  const filterDataByTimeRange = (data, dateField) => {
    const now = new Date();
    const daysAgo = new Date(now.getTime() - Number.parseInt(timeRange) * 24 * 60 * 60 * 1000);
    return data.filter((item) => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= daysAgo && itemDate <= now;
    });
  };

  const getDynamicStats = () => {
    const filteredUsersStats = filterDataByTimeRange(
      usersStats.map((user) => ({
        ...user,
        top_apps: user.top_apps
          ? filterDataByTimeRange(
              user.top_apps.map((app) => ({
                ...app,
                app_name: app.app_name || "Inconnu",
                total_duration: app.total_duration || 0,
                start_time: app.start_time || new Date().toISOString(),
              })),
              "start_time"
            )
          : [],
      })),
      "last_activity"
    );

    const totalSessions = filteredUsersStats.reduce((sum, user) => sum + (user.session_count || 0), 0);
    const totalTime = filteredUsersStats.reduce((sum, user) => sum + (user.total_time || 0), 0);
    const avgSessionTime = totalSessions > 0 ? (totalTime / totalSessions).toFixed(2) : 0;

    return {
      totalUsers: usersStats.length,
      activeUsers: filteredUsersStats.filter((user) => (user.session_count || 0) > 0).length,
      totalSessions: totalSessions,
      avgSessionTime: avgSessionTime,
      systemHealth: stats.systemHealth,
    };
  };

  const getFilteredUsersStats = () => {
    const filtered = filterDataByTimeRange(
      usersStats.map((user) => ({
        ...user,
        top_apps: user.top_apps
          ? filterDataByTimeRange(
              user.top_apps.map((app) => ({
                ...app,
                app_name: app.app_name || "Inconnu",
                total_duration: app.total_duration || 0,
                start_time: app.start_time || new Date().toISOString(),
              })),
              "start_time"
            )
          : [],
      })),
      "last_activity"
    );
    console.log("Filtered Users Stats:", filtered); // Débogage
    return filtered;
  };

  const getUsersTotalTimeData = () => {
    const filteredUsersStats = getFilteredUsersStats();
    return {
      labels: filteredUsersStats.map((user) => user.username),
      datasets: [
        {
          label: `Temps total (${getTimeRangeLabel()})`,
          data: filteredUsersStats.map((user) => user.total_time || 0),
          backgroundColor: "#3B82F6",
          borderColor: "#1D4ED8",
          borderWidth: 1,
        },
      ],
    };
  };

  const getUsersSessionsData = () => {
    const filteredUsersStats = getFilteredUsersStats();
    return {
      labels: filteredUsersStats.map((user) => user.username),
      datasets: [
        {
          label: `Nombre de sessions (${getTimeRangeLabel()})`,
          data: filteredUsersStats.map((user) => user.session_count || 0),
          backgroundColor: [
            "#3B82F6",
            "#EF4444",
            "#10B981",
            "#F59E0B",
            "#8B5CF6",
            "#EC4899",
            "#06B6D4",
            "#84CC16",
            "#F97316",
            "#6366F1",
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  const getGlobalAppUsageData = () => {
    const filteredUsersStats = getFilteredUsersStats();
    const appUsage = {};
    filteredUsersStats.forEach((user) => {
      if (user.top_apps && Array.isArray(user.top_apps)) {
        user.top_apps.forEach((app) => {
          const appName = app.app_name || "Inconnu";
          appUsage[appName] = (appUsage[appName] || 0) + (app.total_duration || 0);
        });
      }
    });
    console.log("Global App Usage Data:", appUsage); // Débogage

    const sortedApps = Object.entries(appUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    if (sortedApps.length === 0) {
      return {
        labels: ["Aucune donnée"],
        datasets: [
          {
            label: `Temps d'utilisation global (${getTimeRangeLabel()})`,
            data: [0],
            backgroundColor: "#E5E7EB",
            borderWidth: 1,
          },
        ],
      };
    }

    return {
      labels: sortedApps.map(([app]) => (app.length > 20 ? app.substring(0, 20) + "..." : app)),
      datasets: [
        {
          label: `Temps d'utilisation global (${getTimeRangeLabel()})`,
          data: sortedApps.map(([, duration]) => Math.round(duration / 3600)),
          backgroundColor: [
            "#3B82F6",
            "#EF4444",
            "#10B981",
            "#F59E0B",
            "#8B5CF6",
            "#EC4899",
            "#06B6D4",
            "#84CC16",
            "#F97316",
            "#6366F1",
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  const getFilteredUsageTrends = () => {
    return filterDataByTimeRange(usageTrends, "date");
  };

  const getFilteredRecentActivity = () => {
    return filterDataByTimeRange(recentActivity, "timestamp");
  };

  const dynamicStats = getDynamicStats();

  const adminChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      tooltip: {
        callbacks: { label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(2)}` },
      },
    },
    scales: {
      y: { ticks: { callback: (value) => `${value.toFixed(2)}h` } },
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: { position: "right" },
      tooltip: {
        callbacks: {
          label: (context) => {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total ? ((context.parsed / total) * 100).toFixed(1) : 0;
            return `${context.label}: ${
              context.dataset.label === "Nombre de sessions" ? context.parsed : context.parsed
            } (${percentage}%)`;
          },
        },
      },
    },
  };

  const escapeHtml = (str) => (str ? str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;") : "");

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "Inconnu";
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    if (diffInMinutes < 1) return "À l'instant";
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `Il y a ${diffInDays} jour${diffInDays > 1 ? "s" : ""}`;
  };

  const getActivityType = (action) => {
    if (!action) return "other";
    if (action.toLowerCase().includes("connexion") || action.toLowerCase().includes("login")) return "login";
    if (action.toLowerCase().includes("déconnexion") || action.toLowerCase().includes("logout")) return "logout";
    if (action.toLowerCase().includes("session")) return "session";
    if (action.toLowerCase().includes("admin") || action.toLowerCase().includes("modification")) return "admin";
    if (action.toLowerCase().includes("system") || action.toLowerCase().includes("sauvegarde")) return "system";
    return "other";
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "login": return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "logout": return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case "session": return <Activity className="w-4 h-4 text-blue-600" />;
      case "admin": return <Shield className="w-4 h-4 text-purple-600" />;
      case "system": return <Settings className="w-4 h-4 text-gray-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "operational":
      case "online":
      case "good": return "text-green-600";
      case "warning": return "text-yellow-600";
      case "error":
      case "offline": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "operational":
      case "online":
      case "good": return <CheckCircle className="w-4 h-4" />;
      case "loading": return <RefreshCw className="w-4 h-4 animate-spin" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchAllAdminData();
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case "1": return "Dernières 24h";
      case "7": return "7 derniers jours";
      case "30": return "30 derniers jours";
      case "365": return "1 an";
      default: return "7 derniers jours";
    }
  };

  const generateReport = () => {
    const filteredUsersStats = getFilteredUsersStats();
    const filteredRecentActivity = getFilteredRecentActivity();
    const filteredUsageTrends = getFilteredUsageTrends();

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device=device-width, initial-scale=1.0">
        <title>Rapport Global des Activités</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-100 font-sans">
        <div class="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <header class="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-lg shadow-lg mb-8">
            <h1 class="text-2xl sm:text-3xl font-bold flex items-center">
              <svg class="w-8 h-8 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Rapport Global des Activités
            </h1>
            <p class="mt-2 text-green-100">Généré le ${new Date().toLocaleString("fr-FR")}</p>
            <p class="mt-1 text-green-100">Période: ${getTimeRangeLabel()}</p>
          </header>

          <section class="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6">
            <h2 class="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">Statistiques Générales</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <p><span class="font-medium">Utilisateur Connecté:</span> ${escapeHtml(user?.username || "Inconnu")}</p>
              <p><span class="font-medium">Total Utilisateurs:</span> ${dynamicStats.totalUsers}</p>
              <p><span class="font-medium">Utilisateurs Actifs:</span> ${dynamicStats.activeUsers}</p>
              <p><span class="font-medium">Sessions Totales:</span> ${dynamicStats.totalSessions}</p>
              <p><span class="font-medium">Temps Moyen par Session:</span> ${dynamicStats.avgSessionTime} heures</p>
            </div>
          </section>

          <section class="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6">
            <h2 class="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">État du Système</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <p><span class="font-medium">Santé Système:</span> ${dynamicStats.systemHealth}</p>
              <p><span class="font-medium">Statut Base de Données:</span> ${systemInfo.database}</p>
              <p><span class="font-medium">Statut Serveur:</span> ${systemInfo.server}</p>
              <p><span class="font-medium">Dernière Sauvegarde:</span> ${systemInfo.lastBackup}</p>
            </div>
          </section>

          <section class="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6">
            <h2 class="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">Activités Récentes</h2>
            <p class="mb-2">Nombre d'Activités: ${filteredRecentActivity.length}</p>
            ${
              filteredRecentActivity.length > 0
                ? `
                  <ul class="list-disc pl-5 space-y-2">
                    ${filteredRecentActivity
                      .slice(0, 10)
                      .map(
                        (activity) =>
                          `<li>ID: ${activity.id}, Utilisateur: ${escapeHtml(activity.user)}, Action: ${escapeHtml(activity.action)}, Type: ${escapeHtml(activity.type)}, Temps: ${escapeHtml(activity.time)}, Détails: ${escapeHtml(activity.details || "N/A")}</li>`
                      )
                      .join("")}
                  </ul>`
                : "<p class='text-gray-500'>Aucune activité récente disponible.</p>"
            }
          </section>

          <section class="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6">
            <h2 class="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">Tendances d'Utilisation</h2>
            <p class="mb-2">Nombre de Points de Données: ${filteredUsageTrends.length}</p>
            ${
              filteredUsageTrends.length > 0
                ? `
                  <ul class="list-disc pl-5 space-y-2">
                    ${filteredUsageTrends
                      .map((trend) => `<li>Date: ${escapeHtml(trend.date)}, Utilisateurs Actifs: ${trend.active_users}</li>`)
                      .join("")}
                  </ul>
                  <div class="max-w-lg mx-auto mt-4">
                    <canvas id="usageTrendsChart"></canvas>
                  </div>
                  <script>
                    /* eslint-disable no-undef */
                    const usageTrendsCtx = document.getElementById('usageTrendsChart').getContext('2d');
                    new Chart(usageTrendsCtx, {
                      type: 'bar',
                      data: {
                        labels: ${JSON.stringify(filteredUsageTrends.map((trend) => trend.date))},
                        datasets: [{
                          label: 'Utilisateurs Actifs',
                          data: ${JSON.stringify(filteredUsageTrends.map((trend) => trend.active_users))},
                          backgroundColor: '#3B82F6',
                          borderColor: '#1D4ED8',
                          borderWidth: 1
                        }]
                      },
                      options: {
                        responsive: true,
                        scales: {
                          y: { beginAtZero: true, title: { display: true, text: 'Utilisateurs Actifs' } },
                          x: { title: { display: true, text: 'Date' } }
                        },
                        plugins: {
                          legend: { position: 'top' },
                          tooltip: { mode: 'index' }
                        }
                      }
                    });
                  </script>`
                : "<p class='text-gray-500'>Aucune tendance d'utilisation disponible.</p>"
            }
          </section>

          <section class="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6">
            <h2 class="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">Répartition des Utilisateurs</h2>
            <div class="max-w-lg mx-auto">
              <canvas id="userDistributionChart"></canvas>
            </div>
            <script>
              /* eslint-disable no-undef */
              const userDistributionCtx = document.getElementById('userDistributionChart').getContext('2d');
              new Chart(userDistributionCtx, {
                type: 'doughnut',
                data: {
                  labels: ['Actifs', 'Inactifs'],
                  datasets: [{
                    label: 'Répartition des utilisateurs',
                    data: [${dynamicStats.activeUsers}, ${dynamicStats.totalUsers - dynamicStats.activeUsers}],
                    backgroundColor: ['#3B82F6', '#E5E7EB'],
                    borderColor: ['#1D4ED8', '#D1D5DB'],
                    borderWidth: 1
                  }]
                },
                options: {
                  responsive: true,
                  plugins: {
                    legend: { position: 'right' },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const total = context.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = total ? ((context.parsed / total) * 100).toFixed(1) : 0;
                          return context.label + ': ' + context.parsed + ' (' + percentage + '%)';
                        }
                      }
                    }
                  }
                }
              });
            </script>
          </section>

          <section class="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6">
            <h2 class="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">Statistiques des Utilisateurs</h2>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Temps total (h)</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sessions</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score d'Engagement</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dernière activité</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  ${
                    filteredUsersStats.length > 0
                      ? filteredUsersStats
                          .map(
                            (user) => {
                              const maxTotalTime = Math.max(...filteredUsersStats.map((u) => u.total_time || 0)) || 1;
                              const maxSessionCount = Math.max(...filteredUsersStats.map((u) => u.session_count || 0)) || 1;
                              const engagementScore =
                                ((user.total_time || 0) / maxTotalTime) * 60 +
                                ((user.session_count || 0) / maxSessionCount) * 40;
                              return `
                                <tr class="hover:bg-gray-50">
                                  <td class="px-4 py-2 whitespace-nowrap">${escapeHtml(user.username)}</td>
                                  <td class="px-4 py-2 whitespace-nowrap">${user.total_time || 0}</td>
                                  <td class="px-4 py-2 whitespace-nowrap">${user.session_count || 0}</td>
                                  <td class="px-4 py-2 whitespace-nowrap">${engagementScore.toFixed(2)} / 100</td>
                                  <td class="px-4 py-2 whitespace-nowrap">${escapeHtml(user.last_activity || "N/A")}</td>
                                </tr>`;
                            }
                          )
                          .join("")
                      : "<tr><td colspan='5' class='px-4 py-2 text-center text-gray-500'>Aucune statistique utilisateur disponible.</td></tr>"
                  }
                </tbody>
              </table>
            </div>
          </section>

          <section class="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6">
            <h2 class="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">Temps total par utilisateur</h2>
            <div class="max-w-lg mx-auto">
              <canvas id="usersTotalTimeChart"></canvas>
            </div>
            <script>
              /* eslint-disable no-undef */
              const usersTotalTimeCtx = document.getElementById('usersTotalTimeChart').getContext('2d');
              new Chart(usersTotalTimeCtx, {
                type: 'bar',
                data: {
                  labels: ${JSON.stringify(filteredUsersStats.map((user) => escapeHtml(user.username)))},
                  datasets: [{
                    label: 'Temps total (${getTimeRangeLabel()})',
                    data: ${JSON.stringify(filteredUsersStats.map((user) => user.total_time || 0))},
                    backgroundColor: '#3B82F6',
                    borderColor: '#1D4ED8',
                    borderWidth: 1
                  }]
                },
                options: {
                  responsive: true,
                  scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Heures' } },
                    x: { title: { display: true, text: 'Utilisateurs' } }
                  },
                  plugins: {
                    legend: { position: 'top' },
                    tooltip: { mode: 'index' }
                  }
                }
              });
            </script>
          </section>

          <section class="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6">
            <h2 class="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">Répartition des sessions</h2>
            <div class="max-w-lg mx-auto">
              <canvas id="usersSessionsChart"></canvas>
            </div>
            <script>
              /* eslint-disable no-undef */
              const usersSessionsCtx = document.getElementById('usersSessionsChart').getContext('2d');
              new Chart(usersSessionsCtx, {
                type: 'doughnut',
                data: {
                  labels: ${JSON.stringify(filteredUsersStats.map((user) => escapeHtml(user.username)))},
                  datasets: [{
                    label: 'Nombre de sessions (${getTimeRangeLabel()})',
                    data: ${JSON.stringify(filteredUsersStats.map((user) => user.session_count || 0))},
                    backgroundColor: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'],
                    borderWidth: 1
                  }]
                },
                options: {
                  responsive: true,
                  plugins: {
                    legend: { position: 'right' },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const total = context.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = total ? ((context.parsed / total) * 100).toFixed(1) : 0;
                          return context.label + ': ' + context.parsed + ' (' + percentage + '%)';
                        }
                      }
                    }
                  }
                }
              });
            </script>
          </section>

          <section class="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6">
            <h2 class="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">Applications les plus utilisées</h2>
            <div class="max-w-lg mx-auto">
              <canvas id="globalAppUsageChart"></canvas>
            </div>
            <script>
              /* eslint-disable no-undef */
              const globalAppUsageCtx = document.getElementById('globalAppUsageChart').getContext('2d');
              new Chart(globalAppUsageCtx, {
                type: 'bar',
                data: {
                  labels: ${JSON.stringify(getGlobalAppUsageData().labels.map(escapeHtml))},
                  datasets: [{
                    label: 'Temps d\'utilisation global (${getTimeRangeLabel()})',
                    data: ${JSON.stringify(getGlobalAppUsageData().data)},
                    backgroundColor: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'],
                    borderWidth: 1
                  }]
                },
                options: {
                  responsive: true,
                  scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Heures' } },
                    x: { title: { display: true, text: 'Applications' } }
                  },
                  plugins: {
                    legend: { position: 'top' },
                    tooltip: { mode: 'index' }
                  }
                }
              });
            </script>
          </section>

          <footer class="mt-8 text-center text-gray-500">
            <hr class="mb-4">
            <p>Fin du Rapport - xAI Admin Dashboard</p>
            <p class="text-sm mt-2">Généré à ${new Date().toLocaleTimeString("fr-FR")} le ${new Date().toLocaleDateString("fr-FR")}</p>
          </footer>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rapport_activites_${timeRange}_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading && recentActivity.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Chargement des données administrateur...</p>
        </div>
      </div>
    );
  }

  const filteredRecentActivity = getFilteredRecentActivity();
  const filteredUsageTrends = getFilteredUsageTrends();

  return (
    <div className="space-y-6">
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
            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-white rounded-lg px-3 py-1 shadow-lg">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-700 font-medium text-xs">Période:</span>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="bg-white text-gray-800 font-semibold border-none outline-none cursor-pointer text-xs px-1 py-0.5 rounded"
                  >
                    <option value="1">Dernières 24h</option>
                    <option value="7">7 derniers jours</option>
                    <option value="30">30 derniers jours</option>
                    <option value="365">1 an</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleRefresh}
                className="p-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
                title="Actualiser les données"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="text-2xl font-bold">👑</div>
            <p className="text-sm text-green-100">Dernière MAJ: {lastRefresh.toLocaleTimeString("fr-FR")}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center">
            <Users className="w-12 h-12 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-800">Utilisateurs totaux</p>
              <p className="text-3xl font-bold text-blue-900">{dynamicStats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <div className="flex items-center">
            <Activity className="w-12 h-12 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-green-800">Utilisateurs actifs</p>
              <p className="text-3xl font-bold text-green-900">{dynamicStats.activeUsers}</p>
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center">
            <BarChart3 className="w-12 h-12 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-800">Sessions totales</p>
              <p className="text-3xl font-bold text-purple-900">{dynamicStats.totalSessions}</p>
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center">
            <Clock className="w-12 h-12 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-orange-800">Temps moyen/session</p>
              <p className="text-3xl font-bold text-orange-900">{dynamicStats.avgSessionTime}h</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Activité récente (${getTimeRangeLabel()})
              </h2>
              <span className="text-sm text-gray-500">${filteredRecentActivity.length} événement${filteredRecentActivity.length > 1 ? "s" : ""}</span>
            </div>
            <div className="p-6">
              {filteredRecentActivity.length > 0 ? (
                <div className="space-y-4">
                  {filteredRecentActivity.slice(0, 10).map((activity) => (
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

        <div className="space-y-6">
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
              <button onClick={generateReport} className="w-full btn btn-ghost text-left flex items-center">
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

          {(dynamicStats.totalUsers > 40 || dynamicStats.activeUsers < 10) && (
            <div className="card p-6 bg-yellow-50 border-yellow-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
                Alertes système
              </h3>
              <div className="space-y-2">
                {dynamicStats.totalUsers > 40 && <div className="text-sm text-yellow-800">• Nombre d'utilisateurs élevé ({dynamicStats.totalUsers})</div>}
                {dynamicStats.activeUsers < 10 && <div className="text-sm text-yellow-800">• Peu d'utilisateurs actifs ({dynamicStats.activeUsers})</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Statistiques détaillées des utilisateurs ({getTimeRangeLabel()})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temps total (heures)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sessions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score d'Engagement</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dernière activité</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getFilteredUsersStats().map((user) => {
                  const maxTotalTime = Math.max(...getFilteredUsersStats().map((u) => u.total_time || 0)) || 1;
                  const maxSessionCount = Math.max(...getFilteredUsersStats().map((u) => u.session_count || 0)) || 1;
                  const engagementScore =
                    ((user.total_time || 0) / maxTotalTime) * 60 + ((user.session_count || 0) / maxSessionCount) * 40;

                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{escapeHtml(user.username)}</div>
                        <div className="text-sm text-gray-500">{escapeHtml(user.email)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.total_time || 0}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.session_count || 0}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{engagementScore.toFixed(2)} / 100</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{escapeHtml(user.last_activity || "N/A")}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Temps total par utilisateur ({getTimeRangeLabel()})</h2>
            <div className="h-80">
              <ChartBar data={getUsersTotalTimeData()} options={adminChartOptions} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Répartition des sessions par utilisateur ({getTimeRangeLabel()})</h2>
            <div className="h-80">
              <Doughnut data={getUsersSessionsData()} options={doughnutOptions} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Applications les plus utilisées (global) ({getTimeRangeLabel()})</h2>
            <div className="h-80">
              <ChartBar data={getGlobalAppUsageData()} options={adminChartOptions} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Tendances d'utilisation ({getTimeRangeLabel()})
          </h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            {filteredUsageTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredUsageTrends} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <RechartsBar dataKey="active_users" fill="#3b82f6" name="Utilisateurs actifs" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                <p>Graphique des tendances</p>
                <p className="text-sm">Aucune donnée disponible</p>
              </div>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Répartition des utilisateurs ({getTimeRangeLabel()})
          </h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2" />
              <p>Actifs: ${dynamicStats.activeUsers}</p>
              <p>Inactifs: ${dynamicStats.totalUsers - dynamicStats.activeUsers}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;