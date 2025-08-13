"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { attendanceAPI } from "../services/api";
import { Calendar, Clock, AlertTriangle, BarChart2, Search, Download, Filter, Users, CalendarDays } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { CSVLink } from "react-csv"; // Assurez-vous d'installer react-csv via npm/yarn

const Attendance = () => {
  const { user, isAdmin } = useAuth();
  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("24"); // Par défaut 24 heures
  const [viewMode, setViewMode] = useState("byUser"); // "byUser" ou "byDate"
  const [weeklySummary, setWeeklySummary] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      try {
        if (!isAdmin) {
          throw new Error("Accès non autorisé");
        }
        const response = await attendanceAPI.getAllAttendance(timeRange);
        const data = response.data.all_attendance || [];
        setAttendanceData(data);

        // Appliquer le filtrage immédiatement après le chargement
        const today = new Date().toISOString().split('T')[0]; // "2025-08-13"
        const filtered = data.filter(entry => entry.date === today);
        setFilteredData(filtered);

        // Calcul du résumé uniquement sur les données filtrées
        const summary = filtered.reduce((acc, entry) => {
          const arrival = new Date(entry.arrival).toLocaleTimeString();
          const departure = new Date(entry.departure).toLocaleTimeString();
          const effectiveHours = calculateEffectiveHours(arrival, departure);
          acc[entry.username] = (acc[entry.username] || 0) + parseFloat(effectiveHours);
          return acc;
        }, {});
        setWeeklySummary(summary);
      } catch (error) {
        console.error("Erreur chargement pointage:", error);
        setAttendanceData([]);
        setFilteredData([]);
        setWeeklySummary({});
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [timeRange, isAdmin]);

  // Filtrage des données basé sur la recherche
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]; // "2025-08-13"
    const filtered = attendanceData.filter(entry =>
      (entry.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.date.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (timeRange === "24" ? entry.date === today : true) // Filtrer par aujourd'hui uniquement pour "24"
    );
    setFilteredData(filtered);
  }, [searchTerm, attendanceData, timeRange]);

  // Calcul des heures effectives (exclut la pause de 12h-13h et limite aux horaires 9h-17h)
  const calculateEffectiveHours = (arrival, departure) => {
    const workStart = new Date(`2000-01-01 09:00:00`);
    const workEnd = new Date(`2000-01-01 17:00:00`);
    const lunchStart = new Date(`2000-01-01 12:00:00`);
    const lunchEnd = new Date(`2000-01-01 13:00:00`);

    let start = new Date(`2000-01-01 ${arrival}`);
    let end = new Date(`2000-01-01 ${departure}`);

    let effectiveStart = Math.max(start.getTime(), workStart.getTime());
    let effectiveEnd = Math.min(end.getTime(), workEnd.getTime());

    if (effectiveEnd <= effectiveStart) {
      return '0.00';
    }

    let totalMs = effectiveEnd - effectiveStart;

    if (effectiveStart < lunchEnd.getTime() && effectiveEnd > lunchStart.getTime()) {
      const pauseStart = Math.max(effectiveStart, lunchStart.getTime());
      const pauseEnd = Math.min(effectiveEnd, lunchEnd.getTime());
      const pauseMs = pauseEnd - pauseStart;
      totalMs -= Math.min(pauseMs, 3600000); // 3600000 ms = 1 heure
    }

    return (totalMs / 3600000).toFixed(2); // Convertir en heures
  };

  // Nouvelle fonction pour ajuster l'affichage des heures d'arrivée et de départ
  const formatWorkTime = (timeStr) => {
    const time = new Date(`2000-01-01 ${timeStr}`);
    const workStart = new Date(`2000-01-01 09:00:00`).getTime();
    const workEnd = new Date(`2000-01-01 17:00:00`).getTime();

    const timeInMs = time.getTime();
    if (timeInMs < workStart) return '09:00';
    if (timeInMs > workEnd) return '17:00';
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Déterminer le statut
  const getStatus = (hours) => {
    const effectiveHours = parseFloat(hours);
    return effectiveHours >= 7 ? 'Complet' : 'Incomplet';
  };

  // Regrouper les données selon le mode de vue
  const groupedData = viewMode === "byUser"
    ? filteredData.reduce((acc, entry) => {
        if (!acc[entry.username]) acc[entry.username] = [];
        acc[entry.username].push(entry);
        return acc;
      }, {})
    : filteredData.reduce((acc, entry) => {
        if (!acc[entry.date]) acc[entry.date] = [];
        acc[entry.date].push(entry);
        return acc;
      }, {});

  // Préparer les données pour le graphique des heures
  const chartData = Object.entries(weeklySummary).map(([username, hours]) => ({
    name: username,
    hours: parseFloat(hours.toFixed(2)),
  }));

  // Préparer les données CSV pour export
  const csvData = filteredData.map(entry => ({
    Date: entry.date,
    Utilisateur: entry.username,
    Arrivée: new Date(entry.arrival).toLocaleTimeString(),
    Départ: new Date(entry.departure).toLocaleTimeString(),
    'Heures Effectives': calculateEffectiveHours(new Date(entry.arrival).toLocaleTimeString(), new Date(entry.departure).toLocaleTimeString()),
    Statut: getStatus(calculateEffectiveHours(new Date(entry.arrival).toLocaleTimeString(), new Date(entry.departure).toLocaleTimeString())),
  }));

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 text-center bg-red-50 min-h-screen">
        <h1 className="text-2xl font-bold mb-6 text-red-600 flex items-center justify-center">
          <AlertTriangle className="mr-2" /> Accès refusé
        </h1>
        <p className="text-gray-600">Cette page est réservée aux administrateurs.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-100 min-h-screen">
      {/* En-tête avec couleur claire */}
      <div className="bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 p-6 rounded-xl shadow-xl mb-8 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
        <div className="flex items-center">
          <Calendar className="mr-3 text-gray-800" size={32} />
          <h1 className="text-3xl font-bold">Système de Pointage Admin</h1>
        </div>
        <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-8">
          <div className="flex items-center">
            <Clock className="mr-2 text-gray-800" size={24} />
            <span className="text-lg font-medium">Horaires : 9h00 - 17h00</span>
          </div>
          <div className="flex items-center">
            <AlertTriangle className="mr-2 text-yellow-600" size={24} />
            <span className="text-lg font-medium">Pause : 12h00 - 13h00 (exclue des heures effectives)</span>
          </div>
        </div>
      </div>

      {/* Barre de contrôles avec recherche, filtres et export */}
      <div className="mb-8 bg-white p-6 rounded-xl shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6 w-full lg:w-auto">
          <div className="flex items-center space-x-4 w-full md:w-auto">
            <button
              onClick={() => {
                setTimeRange("24");
                const today = new Date().toISOString().split('T')[0]; // "2025-08-13"
                setFilteredData(attendanceData.filter(entry => entry.date === today));
              }}
              className={`px-4 py-2 border rounded-lg ${timeRange === "24" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"} transition duration-200`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setTimeRange("7")}
              className={`px-4 py-2 border rounded-lg ${timeRange === "7" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"} transition duration-200`}
            >
              7 jours
            </button>
            <button
              onClick={() => setTimeRange("30")}
              className={`px-4 py-2 border rounded-lg ${timeRange === "30" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"} transition duration-200`}
            >
              30 jours
            </button>
            <button
              onClick={() => setTimeRange("90")}
              className={`px-4 py-2 border rounded-lg ${timeRange === "90" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"} transition duration-200`}
            >
              90 jours
            </button>
          </div>
          <div className="flex items-center w-full md:w-auto">
            <label htmlFor="viewMode" className="mr-4 text-gray-700 font-medium whitespace-nowrap">Afficher :</label>
            <select
              id="viewMode"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 w-full md:w-auto"
            >
              <option value="byUser">Par Utilisateur</option>
              <option value="byDate">Par Date</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full lg:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher par utilisateur ou date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 w-full"
            />
          </div>

          <CSVLink
            data={csvData}
            filename={`pointage_${timeRange}_jours.csv`}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200"
          >
            <Download className="mr-2" size={18} /> Exporter CSV
          </CSVLink>
        </div>
      </div>

      {/* Filtres avancés (masqués par défaut) */}
      {showFilters && (
        <div className="mb-6 bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Filtres Avancés</h3>
          <p className="text-gray-500">Fonctionnalité à implémenter : filtres par statut, heures, etc.</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
        </div>
      ) : Object.keys(groupedData).length === 0 ? (
        <div className="bg-yellow-50 p-6 rounded-xl text-center shadow-md">
          <AlertTriangle className="inline mr-2 text-yellow-500" size={24} />
          <span className="text-gray-600 text-lg">Aucune donnée de pointage disponible pour la période sélectionnée.</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section des graphiques améliorée */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-800">
              <BarChart2 className="mr-2 text-blue-500" /> Résumé Heures Totales
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="name" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #ddd", borderRadius: "8px", padding: "10px" }}
                  itemStyle={{ color: "#333" }}
                />
                <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Données détaillées avec tables responsives */}
          {viewMode === "byUser" ? (
            <div className="space-y-8">
              {Object.entries(groupedData).map(([username, entries]) => (
                <div key={username} className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-xl transition-shadow duration-300 overflow-x-auto">
                  <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
                    <Users className="mr-2 text-blue-500" /> {username}
                    <span className="ml-3 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      Total : {weeklySummary[username]?.toFixed(2) || 0} h
                    </span>
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[640px]">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="p-4 border-b font-semibold text-gray-700">Date</th>
                          <th className="p-4 border-b font-semibold text-gray-700">Arrivée</th>
                          <th className="p-4 border-b font-semibold text-gray-700">Départ</th>
                          <th className="p-4 border-b font-semibold text-gray-700">Heures Effectives</th>
                          <th className="p-4 border-b font-semibold text-gray-700">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry, index) => {
                          const arrivalTime = new Date(entry.arrival).toLocaleTimeString();
                          const departureTime = new Date(entry.departure).toLocaleTimeString();
                          const effectiveHours = calculateEffectiveHours(arrivalTime, departureTime);
                          const status = getStatus(effectiveHours);
                          return (
                            <tr key={index} className="hover:bg-gray-50 transition-colors border-t">
                              <td className="p-4 border-b text-gray-800">{entry.date}</td>
                              <td className="p-4 border-b text-gray-800">{formatWorkTime(arrivalTime)}</td>
                              <td className="p-4 border-b text-gray-800">{formatWorkTime(departureTime)}</td>
                              <td className="p-4 border-b text-gray-800">{effectiveHours} h</td>
                              <td className="p-4 border-b text-center">
                                {status === 'Complet' ? (
                                  <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                    <Clock className="mr-1" size={16} /> Complet
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                                    <AlertTriangle className="mr-1" size={16} /> Incomplet
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedData).map(([date, entries]) => (
                <div key={date} className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-xl transition-shadow duration-300 overflow-x-auto">
                  <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
                    <CalendarDays className="mr-2 text-blue-500" /> {date}
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[640px]">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="p-4 border-b font-semibold text-gray-700">Utilisateur</th>
                          <th className="p-4 border-b font-semibold text-gray-700">Arrivée</th>
                          <th className="p-4 border-b font-semibold text-gray-700">Départ</th>
                          <th className="p-4 border-b font-semibold text-gray-700">Heures Effectives</th>
                          <th className="p-4 border-b font-semibold text-gray-700">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry, index) => {
                          const arrivalTime = new Date(entry.arrival).toLocaleTimeString();
                          const departureTime = new Date(entry.departure).toLocaleTimeString();
                          const effectiveHours = calculateEffectiveHours(arrivalTime, departureTime);
                          const status = getStatus(effectiveHours);
                          return (
                            <tr key={index} className="hover:bg-gray-50 transition-colors border-t">
                              <td className="p-4 border-b text-gray-800">{entry.username}</td>
                              <td className="p-4 border-b text-gray-800">{formatWorkTime(arrivalTime)}</td>
                              <td className="p-4 border-b text-gray-800">{formatWorkTime(departureTime)}</td>
                              <td className="p-4 border-b text-gray-800">{effectiveHours} h</td>
                              <td className="p-4 border-b text-center">
                                {status === 'Complet' ? (
                                  <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                    <Clock className="mr-1" size={16} /> Complet
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                                    <AlertTriangle className="mr-1" size={16} /> Incomplet
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Attendance;