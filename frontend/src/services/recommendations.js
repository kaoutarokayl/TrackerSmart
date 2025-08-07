export const getRecommendations = (usageData) => {
  const recs = [];

  // Temps passé sur YouTube
  const whatsappTime = usageData
    .filter(item => item.app_name.toLowerCase().includes("whatsapp"))
    .reduce((sum, item) => sum + item.duration, 0);

  if (whatsappTime > 60) {
    recs.push("🚨 Vous avez passé plus de 3h sur whatsapp aujourd’hui. Essayez de faire une pause de 15 min.");
  }

  // Temps de travail total aujourd'hui
  const workApps = ["vscode", "notion", "slack", "DB Browser for SQLite", "visual studio code"];
  const todayWorkTime = usageData
    .filter(item => workApps.some(app => item.app_name.toLowerCase().includes(app)))
    .reduce((sum, item) => sum + item.duration, 0);

  // Simuler hier pour l’instant (valeur fixe)
  const yesterdayWorkTime = 120; // minutes
  if (todayWorkTime < yesterdayWorkTime * 0.6) {
    recs.push("⚠️ Votre temps de concentration a baissé par rapport à hier. Essayez de vous recentrer.");
  }

  return recs;
};
