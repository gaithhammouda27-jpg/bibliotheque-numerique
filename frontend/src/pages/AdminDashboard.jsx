import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { booksAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import './Admin.css'

const EMPTY_FORM = { title: '', author: '', description: '' };

export default function AdminDashboard() {
  // ========== TOUS LES STATES ==========
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [toast, setToast] = useState(null)
  const [showForm, setShowForm] = useState(false)  // ← IMPORTANT: showForm doit être déclaré
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // ========== CHARGEMENT DES LIVRES ==========
  useEffect(() => { 
    fetchBooks() 
  }, [])

  const fetchBooks = async () => {
    try {
      const { data } = await booksAPI.getAll()
      console.log("Livres reçus:", data)
      setBooks(data)
    } catch (error) {
      showToast('Erreur lors du chargement', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ========== GESTION DU FORMULAIRE ==========
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.author.trim()) return
    setSaving(true)
    try {
      if (editingId) {
        const { data } = await booksAPI.update(editingId, {
          title: form.title,
          author: form.author,
          description: form.description,
          available: true
        })
        setBooks(prev => prev.map(b => b.id === editingId ? data : b))
        showToast('Livre modifié avec succès', 'success')
      } else {
        const { data } = await booksAPI.create({ 
          title: form.title, 
          author: form.author, 
          description: form.description,
          available: true 
        })
        setBooks(prev => [...prev, data])
        showToast('Livre ajouté avec succès', 'success')
      }
      resetForm()
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur lors de l\'opération', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (book) => {
    setForm({ 
      title: book.title, 
      author: book.author, 
      description: book.description || '' 
    })
    setEditingId(book.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteBook = async (book) => {
    console.log('=== TENTATIVE SUPPRESSION ===');
    console.log('Livre:', book.title);
    console.log('Disponible:', book.available);
    
    if (!book.available) {
      showToast(`❌ Impossible de supprimer "${book.title}" car il est actuellement emprunté !`, 'error');
      return;
    }
    
    if (window.confirm(`Voulez-vous vraiment supprimer "${book.title}" ?`)) {
      setDeleting(book.id);
      try {
        const response = await booksAPI.delete(book.id);
        console.log('Réponse:', response.data);
        await fetchBooks();
        showToast('✅ Livre supprimé avec succès!', 'success');
      } catch (error) {
        console.error("Erreur détaillée:", error);
        const errorMessage = error.response?.data?.message || "Erreur lors de la suppression";
        showToast(`❌ ${errorMessage}`, 'error');
      } finally {
        setDeleting(null);
      }
    }
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(false)
  }

  const showToast = (msg, type) => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleLogout = () => { 
    logout(); 
    navigate('/login') 
  }

  // ========== FILTRES ET STATS ==========
  const filtered = books.filter(b =>
    b.title?.toLowerCase().includes(search.toLowerCase()) ||
    b.author?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: books.length,
    available: books.filter(b => b.available).length,
    borrowed: books.filter(b => !b.available).length,
  }

  // ========== RENDU JSX ==========
  return (
    <div className="admin-page">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <span className="logo">📚</span>
          <div>
            <h2>Bibliothèque</h2>
            <span>Panel Admin</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div 
            className={`nav-item ${location.pathname === '/admin' ? 'active' : ''}`}
            onClick={() => navigate('/admin')}
            style={{ cursor: 'pointer' }}
          >
            <span>📖</span> Catalogue
          </div>
          <div 
            className={`nav-item ${location.pathname === '/admin/users' ? 'active' : ''}`}
            onClick={() => navigate('/admin/users')}
            style={{ cursor: 'pointer' }}
          >
            <span>👥</span> Utilisateurs
          </div>
        </nav>

        <div className="sidebar-stats">
          <div className="stat-item">
            <span className="stat-val">{stats.total}</span>
            <span className="stat-lbl">Total</span>
          </div>
          <div className="stat-item">
            <span className="stat-val available">{stats.available}</span>
            <span className="stat-lbl">Disponibles</span>
          </div>
          <div className="stat-item">
            <span className="stat-val borrowed">{stats.borrowed}</span>
            <span className="stat-lbl">Empruntés</span>
          </div>
        </div>

        <button className="sidebar-logout" onClick={handleLogout}>
          ↩ Déconnexion
        </button>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar">
          <h1>Gestion du catalogue</h1>
          <button className="btn-add" onClick={() => { resetForm(); setShowForm(v => !v) }}>
            {showForm ? '✕ Annuler' : '+ Ajouter un livre'}
          </button>
        </div>

        {showForm && (
          <div className="form-panel">
            <h3>{editingId ? 'Modifier le livre' : 'Nouveau livre'}</h3>
            <form onSubmit={handleSubmit} className="book-form">
              <div className="form-row">
                <div className="field">
                  <label>Titre *</label>
                  <input
                    type="text"
                    placeholder="Titre du livre"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Auteur *</label>
                  <input
                    type="text"
                    placeholder="Nom de l'auteur"
                    value={form.author}
                    onChange={e => setForm({ ...form, author: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Champ Description */}
              <div className="form-row">
                <div className="field full-width">
                  <label>Description / Résumé</label>
                  <textarea
                    placeholder="Résumé du livre..."
                    value={form.description || ''}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    rows="4"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={resetForm}>Annuler</button>
                <button type="submit" className="btn-save" disabled={saving}>
                  {saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="search-row">
          <div className="search-wrap">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="result-count">{filtered.length} livre{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="loading-state"><div className="spinner" /><p>Chargement...</p></div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Titre</th>
                  <th>Auteur</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-row">Aucun livre trouvé</td>
                  </tr>
                ) : (
                  filtered.map((book, i) => (
                    <tr key={book.id} className={editingId === book.id ? 'editing' : ''}>
                      <td className="col-num">{i + 1}</td>
                      <td className="col-title">{book.title}</td>
                      <td className="col-author">{book.author}</td>
                      <td>
                        <span className={`badge ${book.available ? 'badge-ok' : 'badge-out'}`}>
                          {book.available ? 'Disponible' : 'Emprunté'}
                        </span>
                      </td>
                      <td className="col-actions">
                        <button className="btn-edit" onClick={() => handleEdit(book)}>✏️ Modifier</button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteBook(book)}
                          disabled={deleting === book.id}
                        >
                          {deleting === book.id ? '...' : '🗑 Supprimer'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}