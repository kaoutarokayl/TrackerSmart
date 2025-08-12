"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { usageAPI } from "../services/api";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { saveAs } from "file-saver";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const Stats = () => {
  const { user } = useAuth();
  const [usageData, setUsageData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("7");
  const [searchTerm, setSearchTerm] = useState("");

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

  const browserContentCategories = {
    Travail: ["docs.google.com", "notion.so", "trello.com", "asana.com", "jira.com"],
    Divertissement: ["youtube.com", "netflix.com", "twitch.tv", "hulu.com"],
    Social: ["facebook.com", "instagram.com", "twitter.com", "linkedin.com"],
    Recherche: ["google.com", "bing.com", "duckduckgo.com", "yahoo.com"],
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userUsageResponse = await usageAPI.getUserUsage(user.id);
      const data = userUsageResponse.data.filter(
        (item) => item.app_name && item.app_name.toLowerCase() !== "unknown" && item.app_name.toLowerCase() !== "application inconnue"
      );
      setUsageData(data);
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
      setError("Impossible de charger les données. Veuillez réessayer plus tard.");
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchData();
  }, [timeRange, fetchData]);

  const filterDataByTimeRange = useCallback((data) => {
    const now = new Date();
    const daysAgo = new Date(now.getTime() - Number.parseInt(timeRange) * 24 * 60 * 60 * 1000);
    return data.filter((item) => new Date(item.start_time) >= daysAgo);
  }, [timeRange]);

  const categorizeApp = useCallback((appName, url) => {
    const lowerAppName = appName.toLowerCase().replace(/[-_]/g, " ").replace(/[^\w\s]/g, "").trim();
    if (manualCategories[lowerAppName]) return manualCategories[lowerAppName];
    if (url) {
      try {
        const urlDomain = new URL(url).hostname.toLowerCase();
        const contentCategory = Object.entries(browserContentCategories).find(([_, domains]) =>
          domains.some((domain) => urlDomain.includes(domain))
        )?.[0];
        return contentCategory || "Outils système";
      } catch (e) {
        return "Outils système";
      }
    }
    return "Outils système";
  }, []);

  const getAppUsageData = useMemo(() => {
    const filteredData = filterDataByTimeRange(usageData);
    const appUsage = {};

    filteredData.forEach((item) => {
      if (item.app_name && item.app_name.toLowerCase() !== "unknown" && item.app_name.toLowerCase() !== "application inconnue") {
        const key = item.url ? `${item.app_name} - ${new URL(item.url).hostname}` : item.app_name;
        appUsage[key] = (appUsage[key] || 0) + item.duration;
      }
    });

    const sortedApps = Object.entries(appUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    return {
      labels: sortedApps.map(([app]) => (app.length > 20 ? app.substring(0, 20) + "..." : app)),
      datasets: [
        {
          label: "Temps d'utilisation (secondes)",
          data: sortedApps.map(([, duration]) => duration),
          backgroundColor: [
            "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
            "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
          ],
          borderWidth: 1,
        },
      ],
    };
  }, [usageData, filterDataByTimeRange]);

  const getCategoryUsageData = useMemo(() => {
    const filteredData = filterDataByTimeRange(usageData);
    const categoryUsage = {};

    filteredData.forEach((item) => {
      if (item.app_name && item.app_name.toLowerCase() !== "unknown" && item.app_name.toLowerCase() !== "application inconnue") {
        const category = categorizeApp(item.app_name, item.url);
        categoryUsage[category] = (categoryUsage[category] || 0) + item.duration;
      }
    });

    return {
      labels: allCategories,
      datasets: [
        {
          label: "Temps par catégorie (secondes)",
          data: allCategories.map((cat) => categoryUsage[cat] || 0),
          backgroundColor: ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#6B7280"],
          borderWidth: 1,
        },
      ],
    };
  }, [usageData, filterDataByTimeRange, categorizeApp]);

  const getDailyUsageData = useMemo(() => {
    const filteredData = filterDataByTimeRange(usageData);
    const dailyUsage = {};

    filteredData.forEach((item) => {
      if (item.app_name && item.app_name.toLowerCase() !== "unknown" && item.app_name.toLowerCase() !== "application inconnue") {
        const date = item.start_time.split(" ")[0];
        dailyUsage[date] = (dailyUsage[date] || 0) + item.duration;
      }
    });

    const sortedDays = Object.entries(dailyUsage).sort(([a], [b]) => a.localeCompare(b));

    return {
      labels: sortedDays.map(([date]) =>
        new Date(date).toLocaleDateString("fr-FR", { month: "short", day: "numeric" })
      ),
      datasets: [
        {
          label: "Temps total par jour (secondes)",
          data: sortedDays.map(([, duration]) => duration),
          backgroundColor: "#3B82F6",
          borderColor: "#1D4ED8",
          borderWidth: 1,
        },
      ],
    };
  }, [usageData, filterDataByTimeRange]);

  const formatDuration = (seconds) => {
    if (!seconds) return "0m";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          font: { size: 12 },
          padding: 20,
          boxWidth: 15,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleFont: { size: 14 },
        bodyFont: { size: 12 },
        callbacks: {
          label: (context) => `${context.label}: ${formatDuration(context.parsed.y)}`,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (value) => formatDuration(value),
          font: { size: 12 },
        },
        grid: { color: "rgba(0, 0, 0, 0.05)" },
      },
      x: {
        ticks: { font: { size: 12 } },
        grid: { display: false },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: {
          font: { size: 12 },
          padding: 20,
          boxWidth: 15,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleFont: { size: 14 },
        bodyFont: { size: 12 },
        callbacks: {
          label: (context) => {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${formatDuration(context.parsed)} (${percentage}%)`;
          },
        },
      },
    },
  };

  const exportToCSV = useCallback(() => {
    const filteredData = filterDataByTimeRange(usageData);
    const csv = [
      ["Application", "Catégorie", "Temps total", "Sessions", "Temps moyen/session"].join(","),
      ...Object.entries(
        filteredData.reduce((acc, item) => {
          if (item.app_name && item.app_name.toLowerCase() !== "unknown" && item.app_name.toLowerCase() !== "application inconnue") {
            const key = item.url ? `${item.app_name} - ${new URL(item.url).hostname}` : item.app_name;
            const category = categorizeApp(item.app_name, item.url);
            if (!acc[key]) {
              acc[key] = { totalTime: 0, sessions: 0, category };
            }
            acc[key].totalTime += item.duration;
            acc[key].sessions += 1;
          }
          return acc;
        }, {})
      )
        .sort(([, a], [, b]) => b.totalTime - a.totalTime)
        .map(([appName, data]) =>
          [
            `"${appName.replace(/"/g, '""')}"`,
            data.category,
            formatDuration(data.totalTime),
            data.sessions,
            formatDuration(Math.round(data.totalTime / data.sessions)),
          ].join(",")
        ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `stats_usage_${user.id}_${timeRange}days.csv`);
  }, [usageData, timeRange, filterDataByTimeRange, categorizeApp]);

  const getSummaryStats = useMemo(() => {
    const filteredData = filterDataByTimeRange(usageData);
    const totalTime = filteredData.reduce((sum, item) => sum + item.duration, 0);
    const totalSessions = filteredData.length;
    const uniqueApps = new Set(filteredData.map((item) => item.app_name)).size;
    const categoryUsage = {};
    filteredData.forEach((item) => {
      const category = categorizeApp(item.app_name, item.url);
      categoryUsage[category] = (categoryUsage[category] || 0) + item.duration;
    });
    const mainCategory = Object.entries(categoryUsage).reduce((a, b) => a[1] > b[1] ? a : b, [null, 0])[0] || "Travail";
    const mainCategoryTime = categoryUsage[mainCategory] || 0;
    const averageSessionTime = totalSessions ? Math.round(totalTime / totalSessions) : 0;

    return {
      totalTime: formatDuration(totalTime),
      uniqueApps,
      activeApps: uniqueApps, // Assuming all tracked apps are active; adjust if you have specific active app data
      mainCategory,
      mainCategoryTime: formatDuration(mainCategoryTime),
      averageSessionTime: formatDuration(averageSessionTime),
    };
  }, [usageData, filterDataByTimeRange, categorizeApp]);

  const getCategoryColor = (category) => {
    switch (category) {
      case "Travail": return "text-blue-600";
      case "Navigateurs": return "text-yellow-600";
      case "Social": return "text-green-600";
      case "Divertissement": return "text-red-600";
      case "Création/Streaming": return "text-purple-600";
      case "Outils système": return "text-gray-600";
      default: return "text-gray-900";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <div>{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center flex-col md:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mes Statistiques d'Utilisation</h1>
          <p className="text-gray-600 text-sm">
            Analysez votre temps d'écran - {new Date().toLocaleString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
              timeZoneName: "short",
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            aria-label="Sélectionner la période"
          >
            <option value="1">Dernières 24h</option>
            <option value="7">7 derniers jours</option>
            <option value="30">30 derniers jours</option>
            <option value="90">90 derniers jours</option>
          </select>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            aria-label="Exporter en CSV"
          >
            Exporter en CSV
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-6"></h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-500">Temps total</p>
              <p className="text-xl font-bold text-gray-900">{getSummaryStats.totalTime}</p>
              <p className="text-xs text-gray-500">sur {timeRange} jours</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-500">Applications suivies</p>
              <p className="text-xl font-bold text-gray-900">{getSummaryStats.uniqueApps}</p>
              <p className="text-xs text-gray-500">dont {getSummaryStats.activeApps} actives</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-500">Catégorie principale</p>
              <p className="text-xl font-bold text-gray-900">{getSummaryStats.mainCategory}</p>
              <p className="text-xs text-gray-500">avec {getSummaryStats.mainCategoryTime} temps</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-500">Sessions moyennes</p>
              <p className="text-xl font-bold text-gray-900">{getSummaryStats.averageSessionTime}</p>
              <p className="text-xs text-gray-500">par application</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Applications les plus utilisées</h2>
          <div className="h-80">
            <Doughnut data={getAppUsageData} options={doughnutOptions} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Utilisation par catégorie</h2>
          <div className="h-80">
            <Doughnut data={getCategoryUsageData} options={doughnutOptions} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Utilisation quotidienne</h2>
          <div className="h-80">
            <Bar data={getDailyUsageData} options={chartOptions} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Détail par application ({timeRange} derniers jours)
          </h2>
          <input
            type="text"
            placeholder="Rechercher une application..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Rechercher une application"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Application</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégorie</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temps total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sessions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temps moyen/session</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(
                filterDataByTimeRange(usageData).reduce((acc, item) => {
                  if (item.app_name && item.app_name.toLowerCase() !== "unknown" && item.app_name.toLowerCase() !== "application inconnue") {
                    const key = item.url ? `${item.app_name} - ${new URL(item.url).hostname}` : item.app_name;
                    const category = categorizeApp(item.app_name, item.url);
                    if (!acc[key]) {
                      acc[key] = { totalTime: 0, sessions: 0, category };
                    }
                    acc[key].totalTime += item.duration;
                    acc[key].sessions += 1;
                  }
                  return acc;
                }, {})
              )
                .sort(([, a], [, b]) => b.totalTime - a.totalTime)
                .filter(([appName]) => appName.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(([appName, data]) => (
                  <tr key={appName} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{appName}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${getCategoryColor(data.category)}`}>{data.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDuration(data.totalTime)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{data.sessions}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDuration(Math.round(data.totalTime / data.sessions))}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Stats;