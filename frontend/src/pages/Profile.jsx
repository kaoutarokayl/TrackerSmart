"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { User, Shield, Edit3, Save, X, Eye, EyeOff, Clock } from "lucide-react"
import { authAPI } from "../services/api"

const Profile = () => {
  const { user, setUser } = useAuth()
  console.log("User dans Profile.jsx :", user)

  const [formData, setFormData] = useState({
    username: user?.username || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: "", text: "" })

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      username: user?.username || "",
      email: user?.email || "",
    }))
  }, [user])

  useEffect(() => {
    const styles = `
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
    `
    const styleSheet = document.createElement("style")
    styleSheet.textContent = styles
    document.head.appendChild(styleSheet)
    return () => document.head.removeChild(styleSheet)
  }, [])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setMessage({ type: "", text: "" }) // Réinitialiser le message à chaque changement
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: "", text: "" })

    try {
      const updateData = {
        username: formData.username,
        email: formData.email,
      }
      const response = await authAPI.updateProfile(updateData)
      setUser((prev) => ({ ...prev, username: formData.username, email: formData.email }))
      localStorage.setItem("user", JSON.stringify({ ...user, username: formData.username, email: formData.email }))
      setMessage({ type: "success", text: response.data.message || "Profil mis à jour avec succès !" })
      setIsEditing(false)
    } catch (error) {
      console.error("API Error - Update Profile:", error.response?.data || error.message)
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Erreur lors de la mise à jour du profil. Vérifiez la console.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: "", text: "" })

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: "error", text: "Les nouveaux mots de passe ne correspondent pas" })
      setLoading(false)
      return
    }

    try {
      const response = await authAPI.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      })
      setMessage({ type: "success", text: response.data.message || "Mot de passe changé avec succès !" })
      setShowPasswordChange(false)
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }))
    } catch (error) {
      console.error("API Error - Change Password:", error.response?.data || error.message)
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Erreur lors du changement de mot de passe. Vérifiez la console.",
      })
    } finally {
      setLoading(false)
    }
  }

  const togglePasswordVisibility = (field) => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field],
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center animate-fade-in">
          <h1 className="text-4xl font-semibold text-gray-900">Mon Profil</h1>
          <p className="mt-2 text-gray-600">Gérez vos informations personnelles</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between mb-6 border-b pb-4 border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <User className="w-6 h-6 mr-2 text-blue-600" />
                  Informations Personnelles
                </h2>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <Edit3 className="w-5 h-5 mr-2" />
                    Modifier
                  </button>
                ) : (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setIsEditing(false)
                        setFormData({
                          ...formData,
                          username: user?.username || "",
                          email: user?.email || "",
                        })
                      }}
                      className="text-red-600 hover:text-red-800 flex items-center"
                    >
                      <X className="w-5 h-5 mr-2" />
                      Annuler
                    </button>
                  </div>
                )}
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom d'utilisateur</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={`w-full px-4 py-2 rounded-md border ${
                        !isEditing ? "bg-gray-100 cursor-not-allowed" : "border-gray-300 focus:ring-2 focus:ring-blue-500"
                      }`}
                      placeholder="Choisis un nom unique"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={`w-full px-4 py-2 rounded-md border ${
                        !isEditing ? "bg-gray-100 cursor-not-allowed" : "border-gray-300 focus:ring-2 focus:ring-blue-500"
                      }`}
                      placeholder="ton@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Shield className={user?.role === "admin" ? "text-green-600" : "text-purple-600"} />
                  <span className={user?.role === "admin" ? "bg-green-100 text-green-800" : "bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm"}>
                    {user?.role === "admin" ? "👑 Administrateur" : "🎨 Utilisateur"}
                  </span>
                </div>

                {isEditing && (
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md flex items-center"
                    >
                      {loading ? <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                      Sauvegarder
                    </button>
                  </div>
                )}
              </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mt-6">
              <div className="flex items-center justify-between mb-6 border-b pb-4 border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Shield className="w-6 h-6 mr-2 text-purple-600" />
                  Sécurité
                </h2>
                <button
                  onClick={() => setShowPasswordChange(!showPasswordChange)}
                  className="text-purple-600 hover:text-purple-800"
                >
                  {showPasswordChange ? "Annuler" : "Changer le mot de passe"}
                </button>
              </div>

              {showPasswordChange && (
                <form onSubmit={handleChangePassword} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe actuel</label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? "text" : "password"}
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-purple-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("current")}
                        className="absolute inset-y-0 right-3 flex items-center text-gray-500"
                      >
                        {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {message.type === "error" && message.text.includes("mot de passe actuel") && (
                      <p className="mt-1 text-sm text-red-600">{message.text}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nouveau mot de passe</label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-purple-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("new")}
                        className="absolute inset-y-0 right-3 flex items-center text-gray-500"
                      >
                        {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {message.type === "error" && message.text.includes("nouveau mot de passe") && (
                      <p className="mt-1 text-sm text-red-600">{message.text}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirmer le nouveau mot de passe</label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-purple-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("confirm")}
                        className="absolute inset-y-0 right-3 flex items-center text-gray-500"
                      >
                        {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {message.type === "error" && message.text === "Les nouveaux mots de passe ne correspondent pas" && (
                      <p className="mt-1 text-sm text-red-600">{message.text}</p>
                    )}
                  </div>

                  {message.text && !message.text.includes("mot de passe actuel") && !message.text.includes("nouveau mot de passe") && !message.text.includes("ne correspondent pas") && (
                    <div className={`mt-4 p-2 rounded-md ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      {message.text}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-purple-600 text-white hover:bg-purple-700 px-4 py-2 rounded-md"
                    >
                      {loading ? <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mr-2" /> : "Changer"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-12 h-12 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{formData.username}</h3>
              <p className="text-gray-600 mb-4">{formData.email}</p>
              <span className={user?.role === "admin" ? "bg-green-100 text-green-800" : "bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm"}>
                {user?.role === "admin" ? "👑 Administrateur" : "🎨 Utilisateur"}
              </span>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="w-6 h-6 mr-2 text-blue-600" />
                Statistiques
              </h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Compte créé</span>
                  <span className="font-medium text-blue-600">Il y a 30 jours</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Dernière connexion</span>
                  <span className="font-medium text-blue-600">Aujourd'hui, 06:38 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sessions totales</span>
                  <span className="font-medium text-blue-600">156</span>
                </div>
              </div>
            </div>

            {user?.role === "admin" && (
              <div className="bg-green-50 p-6 rounded-lg shadow-md">
                <div className="flex items-center mb-4">
                  <Shield className="w-6 h-6 text-green-600 mr-2" />
                  <h3 className="text-xl font-semibold text-gray-900">Mode Administrateur</h3>
                </div>
                <p className="text-gray-600 mb-4">Accédez aux outils avancés de gestion.</p>
                <a
                  href="/admin"
                  className="bg-green-600 text-white hover:bg-green-700 w-full flex items-center justify-center px-4 py-2 rounded-md"
                >
                  <Shield className="w-5 h-5 mr-2" />
                  Panneau Admin
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile