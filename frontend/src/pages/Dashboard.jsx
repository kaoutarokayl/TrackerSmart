"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { usageAPI } from "../services/api"
import { Clock, Monitor, TrendingUp, Calendar } from "lucide-react"

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

  useEffect(() => {
    fetchUsageData()
  }, [])

  const fetchUsageData = async () => {
    try {
      const response = await usageAPI.getUserUsage(user.id)
      const data = response.data
      setUsageData(data)
      calculateStats(data)
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data) => {
    const today = new Date().toISOString().split("T")[0]
    const todayData = data.filter((item) => item.start_time.startsWith(today))

    const totalTime = data.reduce((sum, item) => sum + item.duration, 0)
    const sessionsToday = todayData.length
    const averageSession =
      sessionsToday > 0 ? Math.round(todayData.reduce((sum, item) => sum + item.duration, 0) / sessionsToday) : 0

    // Application la plus utilisée
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
  }

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
    return usageData.sort((a, b) => new Date(b.start_time) - new Date(a.start_time)).slice(0, 10)
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
      <div className="grid grid-cols-1 md-grid-cols-2 lg-grid-cols-4 gap-6">
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
