import React, { useState, useEffect } from "react";  // Ajout de useEffect
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./CalendarCustom.css";

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

const initialTasks = {
  "2025-07-21": [
    {
      title: "Préparer le rapport mensuel",
      description: "Rassembler les données et rédiger le rapport pour la direction.",
      status: "à faire",
      priority: "haute",
      time: "09:00",
      id: 1,
    },
    {
      title: "Appeler le client X",
      description: "Faire le point sur l'avancement du projet.",
      status: "en cours",
      priority: "normale",
      time: "14:30",
      id: 2,
    },
  ],
};

const PomodoroTimer = () => {
  const [seconds, setSeconds] = useState(25 * 60);
  const [active, setActive] = useState(false);

  React.useEffect(() => {
    let timer = null;
    if (active && seconds > 0) {
      timer = setInterval(() => setSeconds((s) => s - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [active, seconds]);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="card pomodoro-card">
      <div className="pomodoro-header">
        <span role="img" aria-label="timer">⏰</span> Minuteur Pomodoro
      </div>
      <div className="pomodoro-time">{minutes.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}</div>
      <div className="pomodoro-actions">
        <button onClick={() => setActive(!active)} className="pomodoro-btn start">
          {active ? "Pause" : "Démarrer"}
        </button>
        <button onClick={() => { setActive(false); setSeconds(25 * 60); }} className="pomodoro-btn reset">
          Réinitialiser
        </button>
      </div>
    </div>
  );
};

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasksData, setTasksData] = useState(() => {
    // Chargement depuis localStorage au démarrage
    const savedTasks = localStorage.getItem("tasksData");
    return savedTasks ? JSON.parse(savedTasks) : initialTasks;
  });
  const [newTask, setNewTask] = useState({ title: "", description: "", time: "", priority: "normale" });
  const [editId, setEditId] = useState(null);

  const dateKey = formatDate(selectedDate);
  const tasks = tasksData[dateKey] || [];

  // Sauvegarde dans localStorage à chaque changement de tasksData
  useEffect(() => {
    localStorage.setItem("tasksData", JSON.stringify(tasksData));
  }, [tasksData]);

  const handleAddOrEditTask = (e) => {
    e.preventDefault();
    if (!newTask.title || !newTask.time) return;
    if (editId) {
      const updatedTasks = tasks.map((t) => (t.id === editId ? { ...t, ...newTask } : t));
      setTasksData({ ...tasksData, [dateKey]: updatedTasks });
      setEditId(null);
    } else {
      const newId = Date.now();
      const updatedTasks = [...tasks, { ...newTask, status: "à faire", id: newId }];
      setTasksData({ ...tasksData, [dateKey]: updatedTasks });
    }
    setNewTask({ title: "", description: "", time: "", priority: "normale" });
  };

  const handleDeleteTask = (id) => {
    const updatedTasks = tasks.filter((t) => t.id !== id);
    setTasksData({ ...tasksData, [dateKey]: updatedTasks });
    setEditId(null);
    setNewTask({ title: "", description: "", time: "", priority: "normale" });
  };

  const handleToggleStatus = (id) => {
    const updatedTasks = tasks.map((t) =>
      t.id === id ? { ...t, status: t.status === "à faire" ? "terminée" : "à faire" } : t
    );
    setTasksData({ ...tasksData, [dateKey]: updatedTasks });
  };

  const handleEditTask = (task) => {
    setEditId(task.id);
    setNewTask({
      title: task.title,
      description: task.description || "",
      time: task.time,
      priority: task.priority,
    });
  };

  return (
    <div className="calendar-page-container">
      <div className="large-calendar-section card">
        <h2><span role="img" aria-label="calendar">📅</span> Calendrier personnel</h2>
        <Calendar
          onChange={setSelectedDate}
          value={selectedDate}
          locale="fr-FR"
          className="extra-large-calendar"
        />
      </div>

      <div className="task-management-section">
        <div className="task-form-card card">
          <h3>Ajouter une tâche</h3>
          <form onSubmit={handleAddOrEditTask} className="trello-form">
            <input
              type="text"
              placeholder="Titre de la tâche..."
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Description..."
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            />
            <input
              type="time"
              value={newTask.time}
              onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
              required
            />
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
            >
              <option value="normale">Normale</option>
              <option value="haute">Haute</option>
            </select>
            <button type="submit">Ajouter</button>
            {editId && (
              <button
                type="button"
                onClick={() => {
                  setEditId(null);
                  setNewTask({ title: "", description: "", time: "", priority: "normale" });
                }}
              >
                Annuler
              </button>
            )}
          </form>
        </div>
        <div className="tasks-list-card card">
          <div className="tasks-header">
            <h3>{selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h3>
          </div>
          <div className="tasks-list">
            {tasks.length === 0 ? (
              <div className="empty">Aucune tâche prévue.</div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="trello-card">
                  <div className="card-main">
                    <div className="card-title">{task.title}</div>
                    <div className="card-desc">{task.description}</div>
                    <div className="card-meta">
                      <span className="meta-time">🕒 {task.time}</span>
                      <span className={`badge ${task.priority}`}>{task.priority === "haute" ? "⚡ Haute" : "Normale"}</span>
                      <span className={`badge status ${task.status}`}>{task.status}</span>
                    </div>
                  </div>
                  <div className="card-actions">
                    <button
                      onClick={() => handleToggleStatus(task.id)}
                      title={task.status === "à faire" ? "Marquer comme terminée" : "Revenir à à faire"}
                      className="card-btn"
                    >
                      {task.status === "à faire" ? "✔" : "↺"}
                    </button>
                    <button onClick={() => handleEditTask(task)} title="Modifier" className="card-btn">
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      title="Supprimer"
                      className="card-btn delete"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="pomodoro-section card">
        <PomodoroTimer />
      </div>
    </div>
  );
};

export default CalendarPage;