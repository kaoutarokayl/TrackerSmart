"use client"

import { useAuth } from "../context/AuthContext"
import { LogOut, User, BarChart3, Users, Home, Shield, Settings, Bell, Calendar } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { userAPI } from "../services/api"; // Ajoute cette ligne en haut


const Layout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth()
  const location = useLocation()

  const navigation = [
    { name: "Tableau de bord", href: "/dashboard", icon: Home },
    { name: "Statistiques", href: "/stats", icon: BarChart3 },
    { name: "Mon Profil", href: "/profile", icon: User },
    { name: "Calendrier", href: "/calendar", icon: Calendar }, 

    ...(isAdmin
      ? [
          { name: "Utilisateurs", href: "/admin/users", icon: Users },
          { name: "Mode Admin", href: "/admin", icon: Shield, special: true },
        ]
      : []),
  ]

  const isActive = (path) => location.pathname === path

  const handleLogout = () => {
    if (window.confirm("Êtes-vous sûr de vouloir vous déconnecter ?")) {
      logout()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b border-gray-200">
            <Link to="/" className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-2">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-blue-600">SmartTracker</h1>
                <p className="text-xs text-gray-500">ERTC Technologies</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-4 py-6">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`nav-link ${isActive(item.href) ? "active" : ""} ${
                    item.special ? "bg-gradient-to-r from-green-100 to-blue-100 text-green-700 font-semibold" : ""
                  }`}
                >
                  <Icon className="mr-3 icon" />
                  {item.name}
                  {item.special && <span className="ml-auto text-xs">👑</span>}
                </Link>
              )
            })}

            {/* Lien vers la page d'accueil */}
            <Link to="/" className="nav-link">
              <Home className="mr-3 icon" />
              Accueil
            </Link>
          </nav>

          {/* User info */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <User className="icon-lg text-gray-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{user?.username}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
              </div>
              <div>
        <button
           onClick={async () => {
    const { data } = await userAPI.getNotifications();
    alert(data.notifications.map(n => `${n}`).join('\n'));
  }}
  className="ml-2 text-blue-500 hover:text-blue-700 relative"
  title="Voir les notifications"
>
  <span className="relative">
    <Bell className="w-5 h-5" />
    {user?.notifications?.length > 0 && (
      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2">
        {user.notifications.length}
      </span>
    )}
  </span>
</button>
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover-text-red-600 transition-colors ml-2"
                  title="Se déconnecter et retourner à l'accueil"
                >
                  <LogOut className="icon" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="main-content">
        <main className="py-8 px-8">{children}</main>
      </div>
    </div>
  )
}

export default Layout