import { useState, useEffect, useMemo } from "react";
import { usageAPI } from "../services/api";
import { Users, Shield, User, Edit, Trash2, Search, RefreshCw, X } from "lucide-react";
import ".././AdminUsers.css";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsersMemo = useMemo(() => {
    return users.filter(
      (user) =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, users]);

  useEffect(() => {
    setFilteredUsers(filteredUsersMemo);
    setCurrentPage(1);
  }, [filteredUsersMemo]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setIsRefreshing(true);
      const response = await usageAPI.getAdminUsers();
      setUsers(response.data.users);
      setFilteredUsers(response.data.users);
    } catch (error) {
      console.error("Erreur fetchUsers:", error.response?.data || error.message, error);
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setError("Session expirée. Veuillez vous reconnecter.");
        setShowErrorPopup(true);
      } else {
        setError("Erreur lors du chargement des utilisateurs");
        setShowErrorPopup(true);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleUpdateUser = async (userId, updatedData) => {
    const { username, email, role } = updatedData;
    if (!username.trim()) {
      setError("Le nom d'utilisateur ne peut pas être vide");
      setShowErrorPopup(true);
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Veuillez entrer un email valide");
      setShowErrorPopup(true);
      return;
    }

    try {
      setIsSubmitting(true);
      console.log("Update request payload:", { userId, username, email, role });
      const response = await usageAPI.updateUser(userId, { username, email, role });
      console.log("Update response:", response.data);
      setUsers(users.map((user) => (user.id === userId ? { ...user, username, email, role } : user)));
      setEditingUser(null);
      setSuccess("Utilisateur mis à jour avec succès");
      setShowSuccessPopup(true);
      setTimeout(() => {
        setSuccess("");
        setShowSuccessPopup(false);
      }, 3000);
    } catch (error) {
      console.error("Erreur update:", error.response?.data || error.message, error);
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setError("Session expirée. Veuillez vous reconnecter.");
        setShowErrorPopup(true);
      } else {
        setError(`Erreur lors de la modification: ${error.response?.data?.error || error.message}`);
        setShowErrorPopup(true);
        setTimeout(() => {
          setError("");
          setShowErrorPopup(false);
        }, 5000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      setIsSubmitting(true);
      console.log("Delete request for userId:", userId);
      const response = await usageAPI.deleteUser(userId);
      console.log("Delete response:", response.data);
      setUsers(users.filter((user) => user.id !== userId));
      setShowDeleteModal(false);
      setUserToDelete(null);
      setSuccess("Utilisateur supprimé avec succès");
      setShowSuccessPopup(true);
      setTimeout(() => {
        setSuccess("");
        setShowSuccessPopup(false);
      }, 3000);
    } catch (error) {
      console.error("Erreur delete:", error.response?.data || error.message, error);
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setError("Session expirée. Veuillez vous reconnecter.");
        setShowErrorPopup(true);
      } else {
        setError(`Erreur lors de la suppression: ${error.response?.data?.error || error.message}`);
        setShowErrorPopup(true);
        setTimeout(() => {
          setError("");
          setShowErrorPopup(false);
        }, 5000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  const handleRefresh = () => {
    setSearchQuery("");
    fetchUsers();
  };

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <span className="loading-text">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="container">
      {showSuccessPopup && success && (
        <div className="modal-overlay slide-in">
          <div className="success-popup">
            <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            {success}
            <button
              onClick={() => setShowSuccessPopup(false)}
              className="popup-close-button"
              aria-label="Fermer le message de succès"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      {showErrorPopup && error && (
        <div className="modal-overlay slide-in">
          <div className="error-popup">
            <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            {error}
            {error.includes("Session expirée") && (
              <button
                onClick={() => (window.location.href = "/")}
                className="reconnect-button"
                aria-label="Se reconnecter"
              >
                Se reconnecter
              </button>
            )}
            <button
              onClick={() => setShowErrorPopup(false)}
              className="popup-close-button"
              aria-label="Fermer le message d'erreur"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <div>
        <h1 className="page-title">Gestion des utilisateurs</h1>
        <p className="page-subtitle">Administrez les comptes utilisateurs de manière efficace</p>
      </div>
      <div className="cards-container">
        <div className="card">
          <div className="card-content">
            <Users className="card-icon text-blue-500" />
            <div className="card-text">
              <p className="card-label">Total utilisateurs</p>
              <p className="card-value">{users.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-content">
            <Shield className="card-icon text-green-500" />
            <div className="card-text">
              <p className="card-label">Administrateurs</p>
              <p className="card-value">{users.filter((user) => user.role === "admin").length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-content">
            <User className="card-icon text-purple-500" />
            <div className="card-text">
              <p className="card-label">Utilisateurs</p>
              <p className="card-value">{users.filter((user) => user.role === "user").length}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">Liste des utilisateurs</h2>
          <div className="table-controls">
            <div className="search-container">
              <input
                type="text"
                placeholder="Rechercher par nom ou email..."
                value={searchQuery}
                onChange={handleSearch}
                className="search-input"
                aria-label="Rechercher des utilisateurs"
              />
              <Search className="search-icon" />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="clear-search-button"
                  aria-label="Effacer la recherche"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              onClick={handleRefresh}
              className={`refresh-button ${isRefreshing ? "spinning" : ""}`}
              aria-label="Rafraîchir la liste des utilisateurs"
              disabled={isSubmitting || isRefreshing}
            >
              <RefreshCw className="refresh-icon" />
            </button>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="user-table">
            <thead>
              <tr>
                <th className="uppercase">ID</th>
                <th className="uppercase">Nom d'utilisateur</th>
                <th className="uppercase">Email</th>
                <th className="uppercase">Rôle</th>
                <th className="uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="no-users">Aucun utilisateur trouvé</td>
                </tr>
              ) : (
                currentUsers.map((user, index) => (
                  <tr key={user.id} className={`table-row ${index % 2 === 0 ? "even-row" : "odd-row"}`}>
                    <td>{user.id}</td>
                    <td>
                      <div className="user-cell">
                        <User className="user-icon" />
                        <span>{user.username}</span>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span
                        className={`role-badge ${
                          user.role === "admin" ? "role-admin" : "role-user"
                        }`}
                      >
                        {user.role === "admin" ? "Administrateur" : "Utilisateur"}
                      </span>
                    </td>
                    <td>
                      <div className="action-container">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="action-button edit-button"
                          disabled={isSubmitting}
                          aria-label={`Modifier l'utilisateur ${user.username}`}
                        >
                          <Edit className="action-icon" /> Modifier
                        </button>
                        <span className="tooltip">Modifier l'utilisateur</span>
                      </div>
                      <div className="action-container">
                        <button
                          onClick={() => {
                            setUserToDelete(user);
                            setShowDeleteModal(true);
                          }}
                          className="action-button delete-button"
                          disabled={isSubmitting}
                          aria-label={`Supprimer l'utilisateur ${user.username}`}
                        >
                          <Trash2 className="action-icon" /> Supprimer
                        </button>
                        <span className="tooltip">Supprimer l'utilisateur</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="pagination">
            <div className="pagination-info">
              Affichage de {indexOfFirstUser + 1} à {Math.min(indexOfLastUser, filteredUsers.length)} sur {filteredUsers.length} utilisateurs
            </div>
            <div className="pagination-buttons">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-button"
                aria-label="Page précédente"
              >
                Précédent
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => paginate(page)}
                  className={`pagination-button ${currentPage === page ? "active" : ""}`}
                  aria-label={`Page ${page}`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-button"
                aria-label="Page suivante"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
      {editingUser && (
        <div className="modal-overlay slide-in">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Modifier l'utilisateur</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="modal-close-button"
                aria-label="Fermer la modale de modification"
                disabled={isSubmitting}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="modal-content">
              <label htmlFor="username-input" className="modal-label">Nom d'utilisateur</label>
              <input
                id="username-input"
                type="text"
                value={editingUser.username}
                onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                className="modal-input"
                placeholder="Nom d'utilisateur"
                aria-label="Nom d'utilisateur"
                disabled={isSubmitting}
              />
              <label htmlFor="email-input" className="modal-label">Email</label>
              <input
                id="email-input"
                type="email"
                value={editingUser.email}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                className="modal-input"
                placeholder="Email"
                aria-label="Email"
                disabled={isSubmitting}
              />
              <label htmlFor="role-select" className="modal-label">Rôle</label>
              <select
                id="role-select"
                value={editingUser.role}
                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                className="modal-select"
                aria-label="Rôle de l'utilisateur"
                disabled={isSubmitting}
              >
                <option value="user">Utilisateur</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setEditingUser(null)}
                className="modal-button cancel-button"
                disabled={isSubmitting}
                aria-label="Annuler la modification"
              >
                Annuler
              </button>
              <button
                onClick={() => handleUpdateUser(editingUser.id, editingUser)}
                className="modal-button save-button"
                disabled={isSubmitting}
                aria-label="Sauvegarder les modifications"
              >
                {isSubmitting ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeleteModal && userToDelete && (
        <div className="modal-overlay slide-in">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Confirmer la suppression</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                className="modal-close-button"
                aria-label="Fermer la modale de suppression"
                disabled={isSubmitting}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p>
              Êtes-vous sûr de vouloir supprimer l'utilisateur{" "}
              <span className="font-semibold">{userToDelete.username}</span> ? Cette action est irréversible.
            </p>
            <div className="modal-actions">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                className="modal-button cancel-button"
                disabled={isSubmitting}
                aria-label="Annuler la suppression"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteUser(userToDelete.id)}
                className="modal-button delete-button"
                disabled={isSubmitting}
                aria-label={`Supprimer l'utilisateur ${userToDelete.username}`}
              >
                {isSubmitting ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;