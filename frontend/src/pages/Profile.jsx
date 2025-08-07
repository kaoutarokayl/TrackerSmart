"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { User, Shield, Edit3, Save, X, Eye, EyeOff } from "lucide-react"

const Profile = () => {
  const { user } = useAuth()
  console.log("User dans Profile.jsx :", user)

  const [formData, setFormData] = useState({
    username: user?.username || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      username: user?.username || "",
      email: user?.email || "",
    }))
  }, [user])

  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: "", text: "" })

  // Injecter les styles CSS
  useEffect(() => {
    const styles = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes bounceIn {
        0% { transform: scale(0.9); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
      @keyframes shake {
        0% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        50% { transform: translateX(5px); }
        75% { transform: translateX(-5px); }
        100% { transform: translateX(0); }
      }
      @keyframes pulseOnce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      @keyframes spinSlow {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
      .animate-bounce-in { animation: bounceIn 0.5s ease-out; }
      .animate-shake { animation: shake 0.5s ease-out; }
      .animate-pulse-once { animation: pulseOnce 1.5s ease-in-out; }
      .animate-spin-slow { animation: spinSlow 10s linear infinite; }
    `
    const styleSheet = document.createElement("style")
    styleSheet.textContent = styles
    document.head.appendChild(styleSheet)
    return () => document.head.removeChild(styleSheet)
  }, []) // Vide pour s'exécuter une seule fois au montage

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setMessage({ type: "", text: "" })
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: "", text: "" })

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setMessage({ type: "success", text: "Profil mis à jour avec succès !" })
      setIsEditing(false)
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors de la mise à jour du profil" })
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
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setMessage({ type: "success", text: "Mot de passe changé avec succès !" })
      setShowPasswordChange(false)
      setFormData({
        ...formData,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors du changement de mot de passe" })
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center animate-fade-in">
          <h1 className="text-4xl font-extrabold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Mon Profil 
          </h1>
          <p className="mt-2 text-gray-600">Découvre et personnalise ton univers personnel</p>
        </div>

        {message.text && (
          <div
            className={`p-4 rounded-xl shadow-md transform transition-all duration-300 ${
              message.type === "success"
                ? "bg-green-100 border-l-4 border-green-500 text-green-800 animate-bounce-in"
                : "bg-red-100 border-l-4 border-red-500 text-red-800 animate-shake"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="card bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <User className="w-6 h-6 mr-2 text-blue-600" /> Informations Personnelles
                </h2>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn btn-ghost text-blue-600 hover:text-blue-800 flex items-center transition-colors"
                  >
                    <Edit3 className="w-5 h-5 mr-2" />
                    Modifier
                  </button>
                ) : (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="btn btn-ghost text-red-600 hover:text-red-800 flex items-center"
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
                      className={`w-full px-4 py-2 rounded-lg border ${
                        !isEditing ? "bg-gray-100 cursor-not-allowed" : "border-gray-300 focus:ring-2 focus:ring-blue-500"
                      } transition-all`}
                      placeholder="Choisis un nom unique"
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
                      className={`w-full px-4 py-2 rounded-lg border ${
                        !isEditing ? "bg-gray-100 cursor-not-allowed" : "border-gray-300 focus:ring-2 focus:ring-blue-500"
                      } transition-all`}
                      placeholder="ton@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rôle</label>
                  <div className="flex items-center">
                    <Shield className={`w-6 h-6 mr-3 ${user?.role === "admin" ? "text-green-600" : "text-purple-600"}`} />
                    <span
                      className={`px-4 py-2 rounded-full text-sm font-medium ${
                        user?.role === "admin" ? "bg-green-200 text-green-800" : "bg-purple-200 text-purple-800"
                      } animate-pulse-once`}
                    >
                      {user?.role === "admin" ? "👑 Administrateur" : "🎨 Utilisateur"}
                    </span>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 flex items-center px-6 py-2 rounded-xl transition-all"
                    >
                      {loading ? <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                      Sauvegarder
                    </button>
                  </div>
                )}
              </form>
            </div>

            <div className="card bg-white p-6 rounded-2xl shadow-lg mt-8 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Shield className="w-6 h-6 mr-2 text-purple-600" /> Sécurité
                </h2>
                <button
                  onClick={() => setShowPasswordChange(!showPasswordChange)}
                  className="btn btn-ghost text-purple-600 hover:text-purple-800"
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
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("current")}
                        className="absolute inset-y-0 right-3 flex items-center"
                      >
                        {showPasswords.current ? <EyeOff className="w-5 h-5 text-gray-500" /> : <Eye className="w-5 h-5 text-gray-500" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nouveau mot de passe</label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("new")}
                        className="absolute inset-y-0 right-3 flex items-center"
                      >
                        {showPasswords.new ? <EyeOff className="w-5 h-5 text-gray-500" /> : <Eye className="w-5 h-5 text-gray-500" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirmer le nouveau mot de passe</label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("confirm")}
                        className="absolute inset-y-0 right-3 flex items-center"
                      >
                        {showPasswords.confirm ? <EyeOff className="w-5 h-5 text-gray-500" /> : <Eye className="w-5 h-5 text-gray-500" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 px-6 py-2 rounded-xl"
                    >
                      {loading ? <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mr-2" /> : "Changer"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 text-center">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-spin-slow">
                <User className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{user?.username}</h3>
              <p className="text-gray-600 mb-4">{formData.email}</p>
              <span
                className={`inline-flex px-4 py-2 rounded-full text-sm font-medium ${
                  user?.role === "admin" ? "bg-green-200 text-green-800" : "bg-purple-200 text-purple-800"
                } animate-pulse`}
              >
                {user?.role === "admin" ? "👑 Administrateur" : "🎨 Utilisateur"}
              </span>
            </div>

            <div className="card bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Shield className="w-6 h-6 mr-2 text-blue-600" /> Statistiques
              </h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Compte créé</span>
                  <span className="font-medium text-blue-600">Il y a 30 jours</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Dernière connexion</span>
                  <span className="font-medium text-blue-600">Aujourd'hui, 12:24 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sessions totales</span>
                  <span className="font-medium text-blue-600">156</span>
                </div>
              </div>
            </div>

            {user?.role === "admin" && (
              <div className="card bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center mb-4">
                  <Shield className="w-6 h-6 text-green-600 mr-2" />
                  <h3 className="text-xl font-semibold text-gray-900">Mode Administrateur</h3>
                </div>
                <p className="text-gray-600 mb-4">Accédez aux outils avancés de gestion.</p>
                <a
                  href="/admin"
                  className="btn btn-primary bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700 w-full flex items-center justify-center px-4 py-2 rounded-xl"
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