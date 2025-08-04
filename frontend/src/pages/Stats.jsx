"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { usageAPI } from "../services/api";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { saveAs } from "file-saver"; // Pour le téléchargement CSV (installez avec `npm install file-saver`)

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const Stats = () => {
  const { user } = useAuth();
  const [usageData, setUsageData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7"); // 7 jours par défaut
  const [searchTerm, setSearchTerm] = useState(""); // Pour la recherche dans le tableau

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
    "visual studio code": "Travail",
    "DB Browser for SQLite": "Travail",
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

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const userUsageResponse = await usageAPI.getUserUsage(user.id);
      const data = userUsageResponse.data.filter(
        (item) => item.app_name && item.app_name.toLowerCase() !== "unknown" && item.app_name.toLowerCase() !== "application inconnue"
      );
      setUsageData(data);
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterDataByTimeRange = (data) => {
    const now = new Date();
    const daysAgo = new Date(now.getTime() - Number.parseInt(timeRange) * 24 * 60 * 60 * 1000);
    return data.filter((item) => new Date(item.start_time) >= daysAgo);
  };

  const categorizeApp = (appName, url) => {
    const lowerAppName = appName.toLowerCase().replace(/[-_]/g, " ").replace(/[^\w\s]/g, "").trim();
    if (manualCategories[lowerAppName]) return manualCategories[lowerAppName];
    if (url) {
      const urlDomain = new URL(url).hostname.toLowerCase();
      const contentCategory = Object.entries(browserContentCategories).find(([_, domains]) =>
        domains.some((domain) => urlDomain.includes(domain))
      )?.[0];
      return contentCategory || "Navigateurs";
    }
    return "Navigateurs";
  };

  const browserContentCategories = {
    "Travail": ["docs.google.com", "notion.so", "trello.com", "asana.com", "jira.com"],
    "Divertissement": ["youtube.com", "netflix.com", "twitch.tv", "hulu.com"],
    "Social": ["facebook.com", "instagram.com", "twitter.com", "linkedin.com"],
    "Recherche": ["google.com", "bing.com", "duckduckgo.com", "yahoo.com"],
  };

  const getAppUsageData = () => {
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
  };

  const getCategoryUsageData = () => {
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
  };

  const getDailyUsageData = () => {
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
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: {
          generateLabels: (chart) => {
            const data = chart.data;
            return data.labels.map((label, i) => ({
              text: label,
              fillStyle: data.datasets[0].backgroundColor[i],
              strokeStyle: data.datasets[0].borderColor || "#fff",
              lineWidth: data.datasets[0].borderWidth,
              hidden: !chart.isDatasetVisible(0),
              index: i,
            }));
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.label}: ${formatDuration(context.parsed.y)}`,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (value) => formatDuration(value),
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "right",
        onClick: (e, legendItem, legend) => {
          const index = legendItem.index;
          const ci = legend.chart;
          if (ci.isDatasetVisible(0)) {
            ci.hide(0, index);
          } else {
            ci.show(0, index);
          }
        },
      },
      tooltip: {
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

  // Fonction pour exporter en CSV
  const exportToCSV = () => {
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
            appName,
            data.category,
            formatDuration(data.totalTime),
            data.sessions,
            formatDuration(Math.round(data.totalTime / data.sessions)),
          ].join(",")
        ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `stats_usage_${user.id}_${timeRange}days.csv`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center flex-col md:flex-row gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes Statistiques d'utilisation</h1>
          <p className="text-gray-600">Analysez votre temps d'écran personnel - 02:13 PM +01, Monday, August 04, 2025</p>
        </div>
        <div className="flex gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1">Dernières 24h</option>
            <option value="7">7 derniers jours</option>
            <option value="30">30 derniers jours</option>
            <option value="90">90 derniers jours</option>
          </select>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Exporter en CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Applications les plus utilisées</h2>
          <div className="h-80">
            <Doughnut data={getAppUsageData()} options={doughnutOptions} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Utilisation par catégorie</h2>
          <div className="h-80">
            <Doughnut data={getCategoryUsageData()} options={doughnutOptions} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Utilisation quotidienne</h2>
          <div className="h-80">
            <Bar data={getDailyUsageData()} options={chartOptions} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-sm font-semibold text-gray-900">
            Détail par application ({timeRange} derniers jours)
          </h2>
          <input
            type="text"
            placeholder="Rechercher une application..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="w-full">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Application</th>
                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Temps total</th>
                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Sessions</th>
                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Temps moyen/session</th>
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
                    <td className="px-2 py-1 whitespace-nowrap text-sm">
                      <div className="text-gray-900">{appName}</div>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-sm">
                      <div className={`text-gray-900 ${getCategoryColor(data.category)}`}>{data.category}</div>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-sm">
                      <div className="text-gray-900">{formatDuration(data.totalTime)}</div>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-sm">
                      <div className="text-gray-900">{data.sessions}</div>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-sm">
                      <div className="text-gray-900">{formatDuration(Math.round(data.totalTime / data.sessions))}</div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Fonction pour associer une couleur à une catégorie
  function getCategoryColor(category) {
    switch (category) {
      case "Travail": return "text-blue-600";
      case "Navigateurs": return "text-yellow-600";
      case "Social": return "text-green-600";
      case "Divertissement": return "text-red-600";
      case "Création/Streaming": return "text-purple-600";
      case "Outils système": return "text-gray-600";
      default: return "text-gray-900";
    }
  }
};

export default Stats;