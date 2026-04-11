import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import './MyBorrows.css';

export default function MyBorrows() {
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchBorrows();
    fetchUserInfo();
  }, []);

  const fetchBorrows = async () => {
    try {
      const { data } = await api.get('/books/my-borrows');
      setBorrows(data);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInfo = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUserInfo(data);
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const handleReturn = async (bookId) => {
    if (window.confirm('Voulez-vous vraiment retourner ce livre ?')) {
      try {
        await api.post(`/books/return/${bookId}`);
        showToast('Livre retourné avec succès!', 'success');
        fetchBorrows();
        fetchUserInfo();
      } catch (error) {
        showToast(error.response?.data?.message || 'Erreur lors du retour', 'error');
      }
    }
  };

  // ✅ Fonction pour lire un livre
  const handleReadBook = async (bookId, bookTitle) => {
    try {
      const response = await api.get(`/books/read/${bookId}`);
      
      if (response.data.success && response.data.pdfUrl) {
        window.open(response.data.pdfUrl, '_blank');
      } else {
        showToast("Ce livre n'a pas de version PDF disponible", 'error');
      }
    } catch (error) {
      if (error.response?.status === 403) {
        showToast("Vous n'avez pas emprunté ce livre", 'error');
      } else {
        showToast(error.response?.data?.message || "Erreur lors de l'ouverture", 'error');
      }
    }
  };

  const showToast = (msg, type) => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const getDaysStatus = (borrowDate) => {
    const borrow = new Date(borrowDate);
    const today = new Date();
    const daysPassed = Math.floor((today - borrow) / (1000 * 60 * 60 * 24));
    const daysLeft = 14 - daysPassed;
    
    if (daysLeft < 0) {
      return { text: `${Math.abs(daysLeft)} jours de retard`, class: 'overdue' };
    } else if (daysLeft <= 3) {
      return { text: `${daysLeft} jours restants`, class: 'warning' };
    } else {
      return { text: `${daysLeft} jours restants`, class: 'ok' };
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="my-borrows-page">
      <div className="borrows-header">
        <h1>📚 Mes Emprunts</h1>
        {userInfo && (
          <div className="borrow-limit">
            <span>📊 Limite d'emprunt: </span>
            <strong>{userInfo.current_borrow_count} / {userInfo.max_borrow_limit}</strong>
            <span> livres</span>
          </div>
        )}
      </div>

      {borrows.length === 0 ? (
        <div className="no-borrows">
          <p>🎉 Vous n'avez aucun emprunt en cours</p>
          <button onClick={() => window.location.href = '/books'}>Parcourir les livres</button>
        </div>
      ) : (
        <>
          <div className="borrows-stats">
            <div className="stat-card">
              <div className="stat-value">{borrows.length}</div>
              <div className="stat-label">Livres empruntés</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{borrows.filter(b => b.current_status === 'overdue').length}</div>
              <div className="stat-label">En retard</div>
            </div>
          </div>

          <div className="borrows-grid">
            {borrows.map(borrow => {
              const daysStatus = getDaysStatus(borrow.borrow_date);
              return (
                <div key={borrow.id} className="borrow-card">
                  <div className="borrow-card-header">
                    <span className="book-icon">📖</span>
                    <h3>{borrow.title}</h3>
                  </div>
                  <div className="borrow-card-body">
                    <p><strong>Auteur:</strong> {borrow.author}</p>
                    <p><strong>Emprunté le:</strong> {new Date(borrow.borrow_date).toLocaleDateString('fr-FR')}</p>
                    <p><strong>Date de retour prévue:</strong> {
                      new Date(new Date(borrow.borrow_date).setDate(new Date(borrow.borrow_date).getDate() + 14))
                        .toLocaleDateString('fr-FR')
                    }</p>
                    <div className={`days-status ${daysStatus.class}`}>
                      ⏰ {daysStatus.text}
                    </div>
                    <div className={`status-badge ${borrow.current_status === 'overdue' ? 'overdue' : 'active'}`}>
                      {borrow.current_status === 'overdue' ? '⚠️ En retard' : '✅ En cours'}
                    </div>
                  </div>
                  {/* ✅ AJOUT DES DEUX BOUTONS : LIRE + RETOURNER */}
                  <div className="borrow-card-footer">
                    <div className="button-group">
                      <button 
                        className="read-btn"
                        onClick={() => handleReadBook(borrow.book_id, borrow.title)}
                      >
                        📖 Lire en ligne
                      </button>
                      <button 
                        className="return-btn"
                        onClick={() => handleReturn(borrow.book_id)}
                      >
                        Retourner le livre
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}