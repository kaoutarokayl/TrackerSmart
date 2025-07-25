"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { usageAPI } from "../services/api"
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from "chart.js"
import { Bar, Doughnut } from "react-chartjs-2"

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

const Stats = () => {
  const { user } = useAuth()
  const [usageData, setUsageData] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("7") // 7 jours par défaut

  useEffect(() => {
    fetchUsageData()
  }, [])

  const fetchUsageData = async () => {
    try {
      const response = await usageAPI.getUserUsage(user.id)
      setUsageData(response.data)
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterDataByTimeRange = (data) => {
    const now = new Date()
    const daysAgo = new Date(now.getTime() - Number.parseInt(timeRange) * 24 * 60 * 60 * 1000)
    return data.filter((item) => new Date(item.start_time) >= daysAgo)
  }

  const getAppUsageData = () => {
    const filteredData = filterDataByTimeRange(usageData)
    const appUsage = {}

    filteredData.forEach((item) => {
      appUsage[item.app_name] = (appUsage[item.app_name] || 0) + item.duration
    })

    const sortedApps = Object.entries(appUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)

    return {
      labels: sortedApps.map(([app]) => (app.length > 20 ? app.substring(0, 20) + "..." : app)),
      datasets: [
        {
          label: "Temps d'utilisation (secondes)",
          data: sortedApps.map(([, duration]) => duration),
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
    }
  }

  const getDailyUsageData = () => {
    const filteredData = filterDataByTimeRange(usageData)
    const dailyUsage = {}

    filteredData.forEach((item) => {
      const date = item.start_time.split(" ")[0]
      dailyUsage[date] = (dailyUsage[date] || 0) + item.duration
    })

    const sortedDays = Object.entries(dailyUsage).sort(([a], [b]) => a.localeCompare(b))

    return {
      labels: sortedDays.map(([date]) =>
        new Date(date).toLocaleDateString("fr-FR", {
          month: "short",
          day: "numeric",
        }),
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
    }
  }

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${formatDuration(context.parsed.y)}`,
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
  }

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "right",
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const total = context.dataset.data.reduce((a, b) => a + b, 0)
            const percentage = ((context.parsed / total) * 100).toFixed(1)
            return `${context.label}: ${formatDuration(context.parsed)} (${percentage}%)`
          },
        },
      },
    },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistiques d'utilisation</h1>
          <p className="text-gray-600">Analysez votre temps d'écran</p>
        </div>

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
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applications les plus utilisées */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Applications les plus utilisées</h2>
          <div className="h-80">
            <Doughnut data={getAppUsageData()} options={doughnutOptions} />
          </div>
        </div>

        {/* Utilisation quotidienne */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Utilisation quotidienne</h2>
          <div className="h-80">
            <Bar data={getDailyUsageData()} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Tableau détaillé */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Détail par application ({timeRange} derniers jours)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Application
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Temps total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sessions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Temps moyen/session
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(
                filterDataByTimeRange(usageData).reduce((acc, item) => {
                  if (!acc[item.app_name]) {
                    acc[item.app_name] = { totalTime: 0, sessions: 0 }
                  }
                  acc[item.app_name].totalTime += item.duration
                  acc[item.app_name].sessions += 1
                  return acc
                }, {}),
              )
                .sort(([, a], [, b]) => b.totalTime - a.totalTime)
                .map(([appName, data]) => (
                  <tr key={appName} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{appName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDuration(data.totalTime)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{data.sessions}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDuration(Math.round(data.totalTime / data.sessions))}
                      </div>
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

export default Stats
