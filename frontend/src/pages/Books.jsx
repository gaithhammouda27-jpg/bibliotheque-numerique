import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { booksAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import './Books.css'

export default function Books() {
  const [books, setBooks] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [borrowing, setBorrowing] = useState(null)
  const [toast, setToast] = useState(null)
  const [userInfo, setUserInfo] = useState(null)
  const [userBorrows, setUserBorrows] = useState([])  // ← AJOUTÉ à l'intérieur
  const [expandedDesc, setExpandedDesc] = useState({})
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetchBooks()
    fetchUserInfo()
    fetchUserBorrows()  // ← AJOUTÉ
  }, [])

  const fetchBooks = async () => {
    try {
      const { data } = await booksAPI.getAll()
      setBooks(data)
    } catch {
      showToast('Erreur lors du chargement des livres', 'error')
    } finally {
      setLoading(false)
    }
  }
  

  const fetchUserInfo = async () => {
    try {
      const { data } = await api.get('/auth/me')
      setUserInfo(data)
    } catch (error) {
      console.error("Erreur chargement infos user:", error)
    }
  }

  // ✅ NOUVEAU - Récupérer les emprunts de l'utilisateur
  const fetchUserBorrows = async () => {
    try {
      const { data } = await api.get('/books/my-borrows')
      setUserBorrows(data)
    } catch (error) {
      console.error("Erreur:", error)
    }
  }

  // ✅ NOUVEAU - Vérifier si l'utilisateur a emprunté ce livre
  const hasBorrowed = (bookId) => {
    return userBorrows.some(b => b.book_id === bookId)
  }

  // ✅ NOUVEAU - Lire un livre emprunté
  const handleReadBook = async (bookId, bookTitle) => {
    try {
      const response = await api.get(`/books/read/${bookId}`)
      if (response.data.success && response.data.pdfUrl) {
        window.open(response.data.pdfUrl, '_blank')
      } else {
        showToast("Ce livre n'a pas de version PDF disponible", 'error')
      }
    } catch (error) {
      if (error.response?.status === 403) {
        showToast("Vous n'avez pas emprunté ce livre", 'error')
      } else {
        showToast(error.response?.data?.message || "Erreur", 'error')
      }
    }
  }

  const handleBorrow = async (book) => {
    if (!book.available) return
    
    if (userInfo && userInfo.current_borrow_count >= userInfo.max_borrow_limit) {
      showToast(`Vous avez atteint votre limite d'emprunt (${userInfo.max_borrow_limit} livres maximum)`, 'error')
      return
    }
    
    setBorrowing(book.id)
    try {
      const response = await booksAPI.borrow(book.id)
      setBooks(prev => prev.map(b => b.id === book.id ? { ...b, available: false } : b))
      
      const expectedDate = response.data.expectedReturnDate 
        ? new Date(response.data.expectedReturnDate).toLocaleDateString('fr-FR')
        : new Date(Date.now() + 14*24*60*60*1000).toLocaleDateString('fr-FR')
      
      showToast(`"${book.title}" emprunté ! À rendre avant le ${expectedDate}`, 'success')
      fetchUserInfo()
      fetchUserBorrows()  // ← Mettre à jour la liste des emprunts
    } catch (err) {
      showToast(err.response?.data?.message || 'Impossible d\'emprunter ce livre', 'error')
    } finally {
      setBorrowing(null)
    }
  }

  const showToast = (msg, type) => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const filtered = books.filter(b =>
    b.title?.toLowerCase().includes(search.toLowerCase()) ||
    b.author?.toLowerCase().includes(search.toLowerCase())
  )
  // Ajoutez cette fonction après les autres fonctions
const toggleDescription = (bookId) => {
  setExpandedDesc(prev => ({ ...prev, [bookId]: !prev[bookId] }));
};

  const available = books.filter(b => b.available).length

  const getDaysLeft = (borrowDate) => {
    if (!borrowDate) return null
    const borrow = new Date(borrowDate)
    const today = new Date()
    const daysPassed = Math.floor((today - borrow) / (1000 * 60 * 60 * 24))
    const daysLeft = 14 - daysPassed
    if (daysLeft < 0) return `${Math.abs(daysLeft)}j de retard`
    if (daysLeft === 0) return 'Dernier jour'
    return `${daysLeft}j restants`
  }

return (
    <div className="books-page">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <header className="books-header">
        <div className="header-left">
          <div className="logo">📚</div>
          <div>
            <h1>Bibliothèque</h1>
            <span>{books.length} livres · {available} disponibles</span>
          </div>
        </div>
        <div className="header-right">
          {userInfo && (
            <div className="borrow-limit-badge">
              <span>📊</span>
              <span className="limit-count">{userInfo.current_borrow_count || 0}</span>
              <span>/</span>
              <span>{userInfo.max_borrow_limit || 3}</span>
            </div>
          )}
          <span className="user-badge">{user?.email}</span>
          <Link to="/my-borrows" className="my-borrows-link">
            📋 Mes Emprunts
          </Link>
          <button className="btn-logout" onClick={handleLogout}>Déconnexion</button>
        </div>
      </header>

      <main className="books-main">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Rechercher par titre ou auteur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="clear-search" onClick={() => setSearch('')}>✕</button>}
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Chargement des livres...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>Aucun livre trouvé</h3>
            <p>{search ? 'Modifiez votre recherche' : 'Aucun livre dans la bibliothèque'}</p>
          </div>
        ) : (
          <div className="books-grid">
            {filtered.map((book, i) => (
              <div key={book.id} className={`book-card ${!book.available ? 'unavailable' : ''}`} style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="book-cover">
                  <span className="book-initial">{book.title?.[0] || '?'}</span>
                </div>
                <div className="book-info">
                  <h3 className="book-title">{book.title}</h3>
                  <p className="book-author">{book.author}</p>
                  
                  {/* ✅ AFFICHAGE DE LA DESCRIPTION (RÉSUMÉ) */}
                  {book.description && (
                    <div className="book-description">
                      <p className="description-text">
                        {expandedDesc[book.id] 
                          ? book.description 
                          : `${book.description.substring(0, 100)}${book.description.length > 100 ? '...' : ''}`}
                      </p>
                      {book.description.length > 100 && (
                        <span className="read-more" onClick={() => toggleDescription(book.id)}>
                          {expandedDesc[book.id] ? ' lire moins' : ' lire plus'}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {!book.available && book.borrow_date && (
                    <div className="borrow-info-card">
                      <div className="borrow-date">
                        <small>📅 Emprunté le: {new Date(book.borrow_date).toLocaleDateString('fr-FR')}</small>
                      </div>
                      <div className="return-date">
                        <small>⏰ Retour prévu: {
                          new Date(new Date(book.borrow_date).setDate(new Date(book.borrow_date).getDate() + 14))
                            .toLocaleDateString('fr-FR')
                        }</small>
                      </div>
                      <div className={`days-left ${getDaysLeft(book.borrow_date)?.includes('retard') ? 'overdue' : 'warning'}`}>
                        <small>{getDaysLeft(book.borrow_date)}</small>
                      </div>
                    </div>
                  )}
                  
                  <div className={`book-status ${book.available ? 'available' : 'borrowed'}`}>
                    <span className="status-dot" />
                    {book.available ? 'Disponible' : 'Emprunté'}
                  </div>
                  
                  {/* ✅ Bouton Lire ou Emprunter selon le statut */}
                  {hasBorrowed(book.id) ? (
                    <button 
                      className="btn-read"
                      onClick={() => handleReadBook(book.id, book.title)}
                    >
                      📖 Lire
                    </button>
                  ) : (
                    <button
                      className="btn-borrow"
                      onClick={() => handleBorrow(book)}
                      disabled={!book.available || borrowing === book.id || (userInfo && userInfo.current_borrow_count >= userInfo.max_borrow_limit)}
                      title={userInfo?.current_borrow_count >= userInfo?.max_borrow_limit ? "Limite d'emprunt atteinte" : ""}
                    >
                      {borrowing === book.id ? 'En cours...' 
                        : !book.available ? 'Indisponible'
                        : userInfo?.current_borrow_count >= userInfo?.max_borrow_limit ? 'Limite atteinte'
                        : 'Emprunter'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
// FIN DU COMPOSANT - NE RIEN METTRE APRÈS ICI