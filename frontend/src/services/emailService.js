import emailjs from "@emailjs/browser"

// Configuration EmailJS
const EMAILJS_SERVICE_ID = "service_tracker"
const EMAILJS_TEMPLATE_ID = "template_track"
const EMAILJS_PUBLIC_KEY = "7fV94enCNRKV-OFDX" // Tu devras remplacer par ta vraie clé

// Initialiser EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY)

export const sendContactEmail = async (formData) => {
  try {
    // Préparer les données pour l'email
    const templateParams = {
      from_name: formData.name,
      from_phone: formData.phone,
      from_company: formData.company || "Non spécifiée",
      preferred_date: formData.preferredDate || "Non spécifiée",
      preferred_time: formData.preferredTime || "Non spécifiée",
      message: formData.message,
      to_email: "kaoutarokayl4@gmail.com",
      reply_to: "kaoutarokayl4@gmail.com",
    }

    console.log("Envoi email avec les paramètres:", templateParams)

    const response = await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)

    console.log("Email envoyé avec succès:", response)
    return { success: true, response }
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error)
    return { success: false, error }
  }
}
