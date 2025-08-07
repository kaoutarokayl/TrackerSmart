"use client"

import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { authAPI } from "../services/api"
import { Eye, EyeOff, Shield, BarChart3, Clock, Info } from "lucide-react"

const Login = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showTestInfo, setShowTestInfo] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await authAPI.login(formData)
      const { token, user } = response.data
      login(user, token)
      navigate("/dashboard")
    } catch (error) {
      setError(error.response?.data?.error || "Erreur de connexion. Vérifiez vos identifiants.")
    } finally {
      setLoading(false)
    }
  }

  const fillAdminCredentials = () => {
    setFormData({
      username: "admin",
      password: "admin123",
    })
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-10"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mr-4">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">ERTC TECHNOLOGIES</h1>
                <p className="text-blue-100 text-sm">Solutions Technologiques Avancées</p>
              </div>
            </div>
          </div>
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">SmartTracker 📊</h2>
            <p className="text-lg text-blue-100 mb-6">
              Optimisez votre productivité avec notre solution intelligente de suivi d'activité
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center">
              <Clock className="w-5 h-5 mr-3 text-blue-200" />
              <span className="text-blue-100">Suivi en temps réel de vos applications</span>
            </div>
            <div className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-3 text-blue-200" />
              <span className="text-blue-100">Analyses détaillées et graphiques interactifs</span>
            </div>
            <div className="flex items-center">
              <Shield className="w-5 h-5 mr-3 text-blue-200" />
              <span className="text-blue-100">Données sécurisées et privées</span>
            </div>
          </div>
          <div className="mt-12 p-6 bg-white bg-opacity-10 rounded-lg backdrop-blur-sm">
            <p className="text-lg italic text-blue-100">
              "La productivité n'est jamais un accident. C'est toujours le résultat d'un engagement envers
              l'excellence."
            </p>
            <p className="text-sm text-blue-200 mt-2">- ERTC Technologies</p>
          </div>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ERTC TECHNOLOGIES</h1>
                <p className="text-sm text-gray-600">SmartTracker</p>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Connexion</h2>
            <p className="text-gray-600">Accédez à votre tableau de bord SmartTracker</p>
          </div>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowTestInfo(!showTestInfo)}
              className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              <Info className="w-4 h-4 mr-1" />
              {showTestInfo ? "Masquer" : "Afficher"} les informations de test
            </button>
          </div>
          {showTestInfo && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center">🧪 Compte de test</h3>
              <div className="text-xs text-blue-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span>
                    <strong>Admin:</strong> admin / admin123
                  </span>
                  <button
                    type="button"
                    onClick={fillAdminCredentials}
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                  >
                    Utiliser 🚀
                  </button>
                </div>
                <p>
                  <strong>Ou créez votre propre compte</strong>
                </p>
              </div>
            </div>
          )}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-error flex items-center">
                <span className="mr-2">⚠️</span>
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  👤 Nom d'utilisateur
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="form-input form-input-enhanced"
                  placeholder="Entrez votre nom d'utilisateur"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  🔑 Mot de passe
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="form-input form-input-enhanced pr-10"
                    placeholder="Entrez votre mot de passe"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-blue-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="icon text-gray-400" /> : <Eye className="icon text-gray-400" />}
                  </button>
                </div>
              </div>
            </div>
            <div>
              <button type="submit" disabled={loading} className="btn btn-primary btn-enhanced w-full">
                {loading ? <div className="spinner mr-2"></div> : <span className="mr-2">🚀</span>}
                {loading ? "Connexion en cours..." : "Se connecter"}
              </button>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Nouveau chez ERTC Technologies ?{" "}
                <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                  Créer un compte 📝
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login