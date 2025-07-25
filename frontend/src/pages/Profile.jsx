"use client"

import { useState } from "react"
import { useAuth } from "../context/AuthContext"
import { User, Shield, Edit3, Save, X, Eye, EyeOff } from "lucide-react"

const Profile = () => {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [formData, setFormData] = useState({
    username: user?.username || "",
    email: user?.email || "user@example.com",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: "", text: "" })

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
      // Simulation d'appel API
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
      // Simulation d'appel API
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon Profil</h1>
        <p className="text-gray-600">Gérez vos informations personnelles et paramètres de compte</p>
      </div>

      {/* Message de feedback */}
      {message.text && (
        <div
          className={`p-4 rounded-md ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid lg-grid-cols-3 gap-6">
        {/* Informations du profil */}
        <div className="lg-col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Informations personnelles</h2>
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="btn btn-ghost flex items-center">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Modifier
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button onClick={() => setIsEditing(false)} className="btn btn-ghost flex items-center">
                    <X className="w-4 h-4 mr-2" />
                    Annuler
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid md-grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom d'utilisateur</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`form-input form-input-enhanced ${!isEditing ? "bg-gray-50 cursor-not-allowed" : ""}`}
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
                    className={`form-input form-input-enhanced ${!isEditing ? "bg-gray-50 cursor-not-allowed" : ""}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rôle</label>
                <div className="flex items-center">
                  <Shield className={`w-5 h-5 mr-2 ${user?.role === "admin" ? "text-green-600" : "text-blue-600"}`} />
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      user?.role === "admin" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {user?.role === "admin" ? "Administrateur" : "Utilisateur"}
                  </span>
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end">
                  <button type="submit" disabled={loading} className="btn btn-primary btn-enhanced flex items-center">
                    {loading ? <div className="spinner mr-2"></div> : <Save className="w-4 h-4 mr-2" />}
                    Sauvegarder
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Changement de mot de passe */}
          <div className="card p-6 mt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Sécurité</h2>
              <button onClick={() => setShowPasswordChange(!showPasswordChange)} className="btn btn-ghost">
                {showPasswordChange ? "Annuler" : "Changer le mot de passe"}
              </button>
            </div>

            {showPasswordChange && (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe actuel</label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? "text" : "password"}
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      className="form-input form-input-enhanced pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("current")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPasswords.current ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
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
                      className="form-input form-input-enhanced pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("new")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPasswords.new ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmer le nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="form-input form-input-enhanced pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("confirm")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPasswords.confirm ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button type="submit" disabled={loading} className="btn btn-primary btn-enhanced">
                    {loading ? <div className="spinner mr-2"></div> : null}
                    Changer le mot de passe
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Sidebar avec informations supplémentaires */}
        <div className="space-y-6">
          {/* Carte de profil */}
          <div className="card p-6 text-center">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{user?.username}</h3>
            <p className="text-gray-600 mb-3">{formData.email}</p>
            <span
              className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                user?.role === "admin" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
              }`}
            >
              {user?.role === "admin" ? "👑 Administrateur" : "👤 Utilisateur"}
            </span>
          </div>

          {/* Statistiques rapides */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiques rapides</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Compte créé</span>
                <span className="font-medium">Il y a 30 jours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Dernière connexion</span>
                <span className="font-medium">Aujourd'hui</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sessions totales</span>
                <span className="font-medium">156</span>
              </div>
            </div>
          </div>

          {/* Mode administrateur */}
          {user?.role === "admin" && (
            <div className="card p-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
              <div className="flex items-center mb-4">
                <Shield className="w-6 h-6 text-green-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Mode Administrateur</h3>
              </div>
              <p className="text-gray-600 mb-4">Vous avez accès aux fonctionnalités d'administration avancées.</p>
              <a href="/admin" className="btn btn-primary btn-enhanced w-full flex items-center justify-center">
                <Shield className="w-4 h-4 mr-2" />
                Accéder au panneau admin
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile
