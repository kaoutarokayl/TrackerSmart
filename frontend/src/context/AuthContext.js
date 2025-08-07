"use client"

import { createContext, useState, useContext, useEffect } from "react"
import { trackerAPI } from "../services/api"

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [trackerStatus, setTrackerStatus] = useState("stopped")

  useEffect(() => {
    const savedToken = localStorage.getItem("token")
    const savedUser = localStorage.getItem("user")

    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
      // Vérifier le statut du tracker au démarrage
      checkTrackerStatus()
    }
    setLoading(false)
  }, [])

  const checkTrackerStatus = async () => {
    try {
      const response = await trackerAPI.status()
      setTrackerStatus(response.data.status)
    } catch (error) {
      console.error("Erreur lors de la vérification du tracker:", error)
    }
  }

  const startTracker = async () => {
    try {
      const response = await trackerAPI.start()
      setTrackerStatus("running")
      console.log("✅ Tracker démarré:", response.data.message)
      return true
    } catch (error) {
      console.error("❌ Erreur démarrage tracker:", error)
      return false
    }
  }

  const stopTracker = async () => {
    try {
      const response = await trackerAPI.stop()
      setTrackerStatus("stopped")
      console.log("⏹️ Tracker arrêté:", response.data.message)
      return true
    } catch (error) {
      console.error("❌ Erreur arrêt tracker:", error)
      return false
    }
  }

  const login = async (userData, userToken) => {
    setUser(userData)
    setToken(userToken)
    localStorage.setItem("token", userToken)
    localStorage.setItem("user", JSON.stringify(userData))

    // 🚀 Démarrer automatiquement le tracker après connexion
    setTimeout(async () => {
      const success = await startTracker()
      if (success) {
        console.log("🎯 Tracker automatiquement démarré pour", userData.username)
      }
    }, 1000) // Délai de 1 seconde pour s'assurer que tout est initialisé
  }

  const logout = async () => {
    // 🛑 Arrêter le tracker avant déconnexion
    await stopTracker()

    setUser(null)
    setToken(null)
    setTrackerStatus("stopped")
    localStorage.removeItem("token")
    localStorage.removeItem("user")

    // Rediriger vers la page d'accueil
    window.location.href = "/"
  }

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token,
    isAdmin: user?.role === "admin",
    trackerStatus,
    startTracker,
    stopTracker,
    checkTrackerStatus,
  }

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
}