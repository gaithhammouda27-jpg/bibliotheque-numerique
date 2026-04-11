import pool from '../config/db.js';

// Récupérer tous les utilisateurs avec leurs emprunts
export const getAllUsersWithBorrows = async (req, res) => {
  try {
    console.log('=== RÉCUPÉRATION UTILISATEURS ===');
    
    // Récupérer tous les utilisateurs
    const [users] = await pool.execute(`
      SELECT id, email, role, current_borrow_count, max_borrow_limit, created_at
      FROM users
      ORDER BY id DESC
    `);
    
    console.log(`📊 ${users.length} utilisateurs trouvés`);
    
    // Pour chaque utilisateur, récupérer ses emprunts actifs
    for (let user of users) {
      const [borrows] = await pool.execute(`
        SELECT 
          b.id as borrow_id,
          b.book_id,
          b.borrow_date,
          b.return_date,
          b.status,
          bk.title,
          bk.author
        FROM borrows b
        JOIN books bk ON b.book_id = bk.id
        WHERE b.user_id = ? AND b.status = 'active'
      `, [user.id]);
      
      user.active_borrows = borrows;
      
      // Récupérer l'historique
      const [history] = await pool.execute(`
        SELECT 
          bk.title,
          bk.author,
          b.borrow_date,
          b.return_date,
          b.status
        FROM borrows b
        JOIN books bk ON b.book_id = bk.id
        WHERE b.user_id = ?
        ORDER BY b.borrow_date DESC
        LIMIT 10
      `, [user.id]);
      
      user.borrow_history = history;
    }
    
    console.log('✅ Données envoyées');
    res.json(users);
    
  } catch (error) {
    console.error("❌ Erreur:", error);
    res.status(500).json({ message: error.message });
  }
};

// Récupérer l'historique des livres supprimés
export const getBookDeleteHistory = async (req, res) => {
  try {
    const [deletedBooks] = await pool.execute(`
      SELECT * FROM books_deleted_history
      ORDER BY deleted_at DESC
      LIMIT 100
    `);
    res.json(deletedBooks);
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ message: error.message });
  }
};

// Récupérer l'historique des connexions
export const getUserLoginHistory = async (req, res) => {
  try {
    const [logins] = await pool.execute(`
      SELECT 
        ul.*,
        u.email,
        u.role
      FROM user_logins ul
      JOIN users u ON ul.user_id = u.id
      ORDER BY ul.login_time DESC
      LIMIT 100
    `);
    res.json(logins);
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ message: error.message });
  }
};

// Supprimer un utilisateur
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier si l'utilisateur a des emprunts actifs
    const [activeBorrows] = await pool.execute(
      'SELECT * FROM borrows WHERE user_id = ? AND status = "active"',
      [id]
    );
    
    if (activeBorrows.length > 0) {
      return res.status(400).json({ 
        message: `Impossible de supprimer l'utilisateur car il a ${activeBorrows.length} emprunt(s) en cours` 
      });
    }
    
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: "Utilisateur supprimé" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Modifier le rôle d'un utilisateur
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    await pool.execute('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    res.json({ message: "Rôle mis à jour" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ RESTAURER UN LIVRE SUPPRIMÉ
// RESTAURER UN LIVRE SUPPRIMÉ (avec suppression de l'historique)
export const restoreDeletedBook = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔄 Tentative de restauration du livre supprimé ID: ${id}`);
    
    // Récupérer le livre supprimé
    const [deletedBooks] = await pool.execute(
      'SELECT * FROM books_deleted_history WHERE id = ?',
      [id]
    );
    
    if (deletedBooks.length === 0) {
      return res.status(404).json({ message: "Livre supprimé non trouvé" });
    }
    
    const deletedBook = deletedBooks[0];
    
    // Vérifier si le livre existe déjà
    const [existingBooks] = await pool.execute(
      'SELECT * FROM books WHERE id = ?',
      [deletedBook.original_id]
    );
    
    if (existingBooks.length > 0) {
      return res.status(400).json({ 
        message: "Un livre avec cet ID existe déjà. Impossible de restaurer." 
      });
    }
    
    // Restaurer le livre dans books
    await pool.execute(
      'INSERT INTO books (id, title, author, available) VALUES (?, ?, ?, ?)',
      [deletedBook.original_id, deletedBook.title, deletedBook.author, 1]
    );
    
    // ✅ SUPPRIMER DE L'HISTORIQUE APRÈS RESTAURATION
    await pool.execute('DELETE FROM books_deleted_history WHERE id = ?', [id]);
    
    res.json({ 
      success: true,
      message: `Le livre "${deletedBook.title}" a été restauré avec succès et retiré de l'historique` 
    });
    
  } catch (error) {
    console.error("❌ Erreur restoreDeletedBook:", error);
    res.status(500).json({ message: error.message });
  }
};
// ✅ SUPPRIMER DÉFINITIVEMENT UN LIVRE DE L'HISTORIQUE
export const permanentlyDeleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Suppression définitive du livre supprimé ID: ${id}`);
    
    const [deletedBooks] = await pool.execute(
      'SELECT * FROM books_deleted_history WHERE id = ?',
      [id]
    );
    
    if (deletedBooks.length === 0) {
      return res.status(404).json({ message: "Livre supprimé non trouvé" });
    }
    
    const deletedBook = deletedBooks[0];
    
    // Supprimer définitivement de l'historique
    await pool.execute('DELETE FROM books_deleted_history WHERE id = ?', [id]);
    
    res.json({ 
      success: true,
      message: `Le livre "${deletedBook.title}" a été supprimé définitivement de l'historique` 
    });
    
  } catch (error) {
    console.error("❌ Erreur permanentlyDeleteBook:", error);
    res.status(500).json({ message: error.message });
  }
};