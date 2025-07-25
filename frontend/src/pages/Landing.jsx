"use client"

import { useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { sendContactEmail } from "../services/emailService"
import {
  BarChart3,
  Clock,
  Shield,
  Users,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle,
  AlertCircle,
} from "lucide-react"

const Landing = () => {
  const { isAuthenticated, user } = useAuth()
  const [contactForm, setContactForm] = useState({
    name: "",
    phone: "",
    company: "",
    preferredDate: "",
    preferredTime: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState({ type: "", message: "" })

  const handleContactChange = (e) => {
    setContactForm({
      ...contactForm,
      [e.target.name]: e.target.value,
    })
    // Effacer le message de statut quand l'utilisateur tape
    if (submitStatus.message) {
      setSubmitStatus({ type: "", message: "" })
    }
  }

  const handleContactSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus({ type: "", message: "" })

    // Validation des champs requis
    if (!contactForm.name || !contactForm.phone || !contactForm.message) {
      setSubmitStatus({
        type: "error",
        message: "Veuillez remplir tous les champs obligatoires (Nom, Téléphone, Message)",
      })
      setIsSubmitting(false)
      return
    }

    // Validation du format téléphone (basique)
    const phoneRegex = /^[0-9+\-\s()]{8,}$/
    if (!phoneRegex.test(contactForm.phone)) {
      setSubmitStatus({
        type: "error",
        message: "Veuillez entrer un numéro de téléphone valide",
      })
      setIsSubmitting(false)
      return
    }

    try {
      console.log("Tentative d'envoi du formulaire:", contactForm)

      // Envoyer l'email via EmailJS
      const result = await sendContactEmail(contactForm)

      if (result.success) {
        setSubmitStatus({
          type: "success",
          message: `Merci ${contactForm.name} ! Votre message a été envoyé avec succès à ERTC Technologies. Nous vous contacterons au ${contactForm.phone} dans les plus brefs délais.`,
        })

        // Réinitialiser le formulaire après succès
        setContactForm({
          name: "",
          phone: "",
          company: "",
          preferredDate: "",
          preferredTime: "",
          message: "",
        })
      } else {
        throw new Error(result.error?.text || "Erreur inconnue")
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi:", error)
      setSubmitStatus({
        type: "error",
        message: `Erreur lors de l'envoi du message: ${error.message}. Veuillez réessayer ou nous contacter directement à kaoutarokayl4@gmail.com`,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header Navigation */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm-px-6 lg-px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  SMART<span className="text-blue-600">TRACKER</span>
                </h1>
                <p className="text-xs text-gray-500">by ERTC Technologies</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md-flex space-x-8">
              <a href="#platform" className="text-gray-600 hover-text-blue-600 transition-colors">
                Platform
              </a>
              <a href="#features" className="text-gray-600 hover-text-blue-600 transition-colors">
                Features
              </a>
              <a href="#about" className="text-gray-600 hover-text-blue-600 transition-colors">
                About Us
              </a>
              <a href="#testimonials" className="text-gray-600 hover-text-blue-600 transition-colors">
                Testimonials
              </a>
              <a href="#contact" className="text-gray-600 hover-text-blue-600 transition-colors">
                Contact
              </a>
            </nav>

            {/* CTA Button - Conditionnel selon l'état de connexion */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <span className="text-sm text-gray-600">Bonjour, {user?.username}</span>
                  <Link to="/dashboard" className="btn btn-primary btn-enhanced">
                    TABLEAU DE BORD
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-gray-600 hover-text-blue-600 transition-colors">
                    Se connecter
                  </Link>
                  <Link to="/register" className="btn btn-primary btn-enhanced">
                    COMMENCER
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-primary text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm-px-6 lg-px-8">
          <div className="grid lg-grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl font-bold mb-6">
                {isAuthenticated ? (
                  <>
                    Bon retour, <span className="text-blue-200">{user?.username}</span> ! 👋
                  </>
                ) : (
                  <>
                    Optimisez votre productivité avec <span className="text-blue-200">SmartTracker</span>
                  </>
                )}
              </h1>
              <p className="text-xl text-blue-100 mb-8">
                {isAuthenticated
                  ? "Continuez à analyser et améliorer votre productivité avec SmartTracker."
                  : "La solution intelligente de suivi d'activité qui vous aide à comprendre et améliorer votre temps de travail."}
              </p>
              <div className="flex space-x-4">
                {isAuthenticated ? (
                  <>
                    <Link to="/dashboard" className="btn btn-white btn-enhanced">
                      Voir le tableau de bord
                    </Link>
                    <Link to="/stats" className="btn btn-outline-white btn-enhanced">
                      Voir les statistiques
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/register" className="btn btn-white btn-enhanced">
                      Commencer gratuitement
                    </Link>
                    <a href="#contact" className="btn btn-outline-white btn-enhanced">
                      Demander une démo
                    </a>
                  </>
                )}
              </div>
            </div>
            <div className="relative">
              <div className="w-full h-96 bg-white bg-opacity-10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <div className="text-center">
                  <BarChart3 className="w-24 h-24 text-blue-200 mx-auto mb-4" />
                  <p className="text-blue-100">Interface SmartTracker</p>
                  {isAuthenticated && <p className="text-blue-200 text-sm mt-2">Connecté en tant que {user?.role}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm-px-6 lg-px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Fonctionnalités Principales</h2>
            <p className="text-xl text-gray-600">Découvrez comment SmartTracker transforme votre productivité</p>
          </div>

          <div className="grid md-grid-cols-3 gap-8">
            <div className="card p-8 text-center hover-shadow-lg transition-all">
              <Clock className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Suivi en Temps Réel</h3>
              <p className="text-gray-600">
                Surveillez automatiquement le temps passé sur chaque application et projet.
              </p>
            </div>

            <div className="card p-8 text-center hover-shadow-lg transition-all">
              <TrendingUp className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Analyses Détaillées</h3>
              <p className="text-gray-600">
                Obtenez des rapports complets avec des graphiques interactifs et des insights.
              </p>
            </div>

            <div className="card p-8 text-center hover-shadow-lg transition-all">
              <Shield className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Sécurité Garantie</h3>
              <p className="text-gray-600">Vos données restent privées et sécurisées sur votre machine locale.</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm-px-6 lg-px-8">
          <div className="grid lg-grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">À propos d'ERTC Technologies</h2>
              <p className="text-lg text-gray-600 mb-6">
                Nous sommes une entreprise technologique innovante spécialisée dans le développement de solutions
                logicielles avancées pour améliorer la productivité en entreprise.
              </p>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Users className="w-6 h-6 text-blue-600 mr-3" />
                  <span className="text-gray-700">Équipe d'experts passionnés</span>
                </div>
                <div className="flex items-center">
                  <TrendingUp className="w-6 h-6 text-green-600 mr-3" />
                  <span className="text-gray-700">Solutions sur mesure</span>
                </div>
                <div className="flex items-center">
                  <Shield className="w-6 h-6 text-purple-600 mr-3" />
                  <span className="text-gray-700">Sécurité et confidentialité</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="w-full h-96 bg-gradient-primary rounded-2xl flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">ERTC Technologies</h3>
                  <p className="text-blue-100">Innovation • Excellence • Résultats</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm-px-6 lg-px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Contactez-nous</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Si vous avez des questions ou souhaitez en savoir plus, nous sommes là pour vous aider. Remplissez le
              formulaire ci-dessous pour commencer !
            </p>
          </div>

          <div className="grid lg-grid-cols-2 gap-12 items-start">
            {/* Contact Form */}
            <div className="card p-8">
              {/* Message de statut */}
              {submitStatus.message && (
                <div
                  className={`mb-6 p-4 rounded-lg flex items-start ${
                    submitStatus.type === "success"
                      ? "bg-green-50 border border-green-200 text-green-700"
                      : "bg-red-50 border border-red-200 text-red-700"
                  }`}
                >
                  {submitStatus.type === "success" ? (
                    <CheckCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                  )}
                  <span className="text-sm">{submitStatus.message}</span>
                </div>
              )}

              <form onSubmit={handleContactSubmit} className="space-y-6">
                <div className="grid md-grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={contactForm.name}
                      onChange={handleContactChange}
                      className="form-input form-input-enhanced"
                      placeholder="Entrez votre nom"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Téléphone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={contactForm.phone}
                      onChange={handleContactChange}
                      className="form-input form-input-enhanced"
                      placeholder="Ex: 0707756272"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Entreprise</label>
                  <input
                    type="text"
                    name="company"
                    value={contactForm.company}
                    onChange={handleContactChange}
                    className="form-input form-input-enhanced"
                    placeholder="Nom de votre entreprise"
                  />
                </div>

                <div className="grid md-grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date préférée</label>
                    <input
                      type="date"
                      name="preferredDate"
                      value={contactForm.preferredDate}
                      onChange={handleContactChange}
                      className="form-input form-input-enhanced"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Heure préférée</label>
                    <input
                      type="time"
                      name="preferredTime"
                      value={contactForm.preferredTime}
                      onChange={handleContactChange}
                      className="form-input form-input-enhanced"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="message"
                    value={contactForm.message}
                    onChange={handleContactChange}
                    rows={4}
                    className="form-input form-input-enhanced resize-none"
                    placeholder="Décrivez vos besoins, le type d'organisation, le nombre d'utilisateurs, etc."
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`btn btn-primary btn-enhanced w-full ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="spinner mr-2"></div>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer le message
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Contact Info & Image */}
            <div className="space-y-8">
              {/* Contact Information */}
              <div className="card p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Informations de contact</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Mail className="w-5 h-5 text-blue-600 mr-3" />
                    <span className="text-gray-700">kaoutarokayl4@gmail.com</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="w-5 h-5 text-green-600 mr-3" />
                    <span className="text-gray-700">+33 1 23 45 67 89</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-5 h-5 text-red-600 mr-3" />
                    <span className="text-gray-700">Paris, France</span>
                  </div>
                </div>
              </div>

              {/* Professional Image Placeholder */}
              <div className="relative">
                <div className="w-full h-80 bg-gradient-primary rounded-2xl flex items-center justify-center overflow-hidden">
                  <div className="text-center text-white">
                    <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-12 h-12" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Notre équipe vous accompagne</h3>
                    <p className="text-blue-100">Support professionnel et personnalisé</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm-px-6 lg-px-8">
          <div className="grid md-grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-2">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold">SmartTracker</span>
              </div>
              <p className="text-gray-400">Solution intelligente de suivi d'activité par ERTC Technologies.</p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Produit</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#features" className="hover-text-white transition-colors">
                    Fonctionnalités
                  </a>
                </li>
                <li>
                  <Link to="/login" className="hover-text-white transition-colors">
                    Se connecter
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="hover-text-white transition-colors">
                    S'inscrire
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Entreprise</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#about" className="hover-text-white transition-colors">
                    À propos
                  </a>
                </li>
                <li>
                  <a href="#contact" className="hover-text-white transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover-text-white transition-colors">
                    Carrières
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover-text-white transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover-text-white transition-colors">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="#contact" className="hover-text-white transition-colors">
                    Support
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 ERTC Technologies. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
