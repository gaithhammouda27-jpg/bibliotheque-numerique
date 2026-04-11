// src/pages/AdminUsers.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './AdminUsers.css';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deletedBooks, setDeletedBooks] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      console.log('Chargement des données admin...');
      const [usersRes, deletedRes, loginRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/books-deleted'),
        api.get('/admin/user-logins')
      ]);
      console.log('Utilisateurs reçus:', usersRes.data);
      setUsers(usersRes.data);
      setDeletedBooks(deletedRes.data);
      setLoginHistory(loginRes.data);
    } catch (error) {
      console.error("Erreur:", error);
      if (error.response?.status === 403) {
        alert("Accès refusé. Vous devez être administrateur.");
        navigate('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) {
      try {
        await api.delete(`/admin/users/${userId}`);
        fetchData();
        alert('Utilisateur supprimé');
      } catch (error) {
        alert(error.response?.data?.message);
      }
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      fetchData();
      alert('Rôle mis à jour');
    } catch (error) {
      alert(error.response?.data?.message);
    }
  };

  // ✅ RESTAURER UN LIVRE
  const handleRestoreBook = async (bookId, bookTitle) => {
    if (window.confirm(`Voulez-vous restaurer le livre "${bookTitle}" ?`)) {
      try {
        const response = await api.post(`/admin/books-deleted/${bookId}/restore`);
        alert(response.data.message);
        fetchData(); // Recharger les données
      } catch (error) {
        alert(error.response?.data?.message || "Erreur lors de la restauration");
      }
    }
  };

  // ✅ SUPPRIMER DÉFINITIVEMENT
  const handlePermanentDelete = async (bookId, bookTitle) => {
    if (window.confirm(`⚠️ Attention ! Voulez-vous supprimer DÉFINITIVEMENT "${bookTitle}" de l'historique ? Cette action est irréversible.`)) {
      try {
        const response = await api.delete(`/admin/books-deleted/${bookId}/permanent`);
        alert(response.data.message);
        fetchData();
      } catch (error) {
        alert(error.response?.data?.message || "Erreur lors de la suppression");
      }
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="admin-users-page">
      <div className="admin-header">
        <button className="back-btn" onClick={() => navigate('/admin')}>← Retour</button>
        <h1>📊 Administration</h1>
      </div>

      <div className="admin-tabs">
        <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
          👥 Utilisateurs ({users.length})
        </button>
        <button className={activeTab === 'deleted' ? 'active' : ''} onClick={() => setActiveTab('deleted')}>
          🗑️ Livres supprimés ({deletedBooks.length})
        </button>
        <button className={activeTab === 'logins' ? 'active' : ''} onClick={() => setActiveTab('logins')}>
          🔐 Historique connexions ({loginHistory.length})
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="users-table-container">
          <h2>👥 Liste des utilisateurs</h2>
          {users.length === 0 ? (
            <p>Aucun utilisateur trouvé</p>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Emprunts actifs</th>
                  <th>Limite</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.email}</td>
                    <td>
                      <select 
                        value={user.role} 
                        onChange={(e) => handleChangeRole(user.id, e.target.value)}
                        className="role-select"
                      >
                        <option value="user">👤 Utilisateur</option>
                        <option value="admin">👑 Admin</option>
                      </select>
                    </td>
                    <td>
                      <div className="borrow-count">{user.active_borrows?.length || 0}</div>
                      {user.active_borrows?.length > 0 && (
                        <div className="active-borrows-list">
                          {user.active_borrows.map(b => (
                            <span key={b.borrow_id} className="borrow-tag">
                              📖 {b.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>{user.current_borrow_count || 0}/{user.max_borrow_limit || 3}</td>
                    <td className="actions-cell">
                      <button 
                        className="btn-view" 
                        onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}
                      >
                        📋 Détails
                      </button>
                      {user.role !== 'admin' && (
                        <button 
                          className="btn-delete-user" 
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={user.active_borrows?.length > 0}
                          title={user.active_borrows?.length > 0 ? "Utilisateur a des emprunts en cours" : ""}
                        >
                          🗑 Supprimer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedUser && (
            <div className="user-details">
              <h3>📜 Historique complet des emprunts</h3>
              {users.find(u => u.id === selectedUser)?.borrow_history?.length > 0 ? (
                <ul>
                  {users.find(u => u.id === selectedUser)?.borrow_history.map((b, i) => (
                    <li key={i}>
                      <strong>{b.title}</strong> - {b.author}<br/>
                      📅 Emprunté: {new Date(b.borrow_date).toLocaleDateString()}
                      {b.return_date && ` - ✅ Retourné: ${new Date(b.return_date).toLocaleDateString()}`}
                      {!b.return_date && ' - ⏳ En cours'}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Aucun historique d'emprunt</p>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'deleted' && (
        <div className="deleted-books-table">
          <h2>🗑️ Livres supprimés</h2>
          {deletedBooks.length === 0 ? (
            <p>Aucun livre supprimé pour le moment</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID original</th>
                  <th>Titre</th>
                  <th>Auteur</th>
                  <th>Supprimé par</th>
                  <th>Date suppression</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deletedBooks.map(book => (
                  <tr key={book.id}>
                    <td>{book.original_id}</td>
                    <td>{book.title}</td>
                    <td>{book.author}</td>
                    <td>{book.deleted_by_email}</td>
                    <td>{new Date(book.deleted_at).toLocaleString()}</td>
                    <td className="actions-cell">
                      <button 
                        className="btn-restore"
                        onClick={() => handleRestoreBook(book.id, book.title)}
                        title="Restaurer le livre"
                      >
                        🔄 Restaurer
                      </button>
                      <button 
                        className="btn-permanent-delete"
                        onClick={() => handlePermanentDelete(book.id, book.title)}
                        title="Supprimer définitivement de l'historique"
                      >
                        ⚠️ Supprimer définitivement
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'logins' && (
        <div className="logins-table">
          <h2>🔐 Historique des connexions</h2>
          {loginHistory.length === 0 ? (
            <p>Aucune connexion enregistrée</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Utilisateur ID</th>
                  <th>Email</th>
                  <th>Date de connexion</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {loginHistory.map(login => (
                  <tr key={login.id}>
                    <td>{login.user_id}</td>
                    <td>{login.user_email}</td>
                    <td>{new Date(login.login_time).toLocaleString()}</td>
                    <td>{login.ip_address || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}