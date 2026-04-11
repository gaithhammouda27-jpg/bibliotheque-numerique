// controllers/bookController.js
import pool from '../config/db.js';

// Récupérer tous les livres avec statut d'emprunt
export const getBooks = async (req, res) => {
  try {
    const [books] = await pool.execute(`
      SELECT b.*, 
             br.user_id, 
             br.borrow_date, 
             br.return_date,
             DATEDIFF(CURDATE(), br.borrow_date) as days_borrowed
      FROM books b
      LEFT JOIN borrows br ON b.id = br.book_id AND br.status = 'active'
      ORDER BY b.id DESC
    `);
    
    res.json(books);
  } catch (error) {
    console.error("Erreur getBooks:", error);
    res.status(500).json({ message: error.message });
  }
};

// Ajouter un livre
export const addBook = async (req, res) => {
  try {
    const { title, author, description = '', available = 1, pdfUrl = null } = req.body;
    
    const [result] = await pool.execute(
      'INSERT INTO books (title, author, description, available, pdfUrl) VALUES (?, ?, ?, ?, ?)',
      [title, author, description, available, pdfUrl]
    );
    
    res.status(201).json({ 
      id: result.insertId, 
      title, 
      author, 
      description, 
      available 
    });
  } catch (error) {
    console.error("Erreur addBook:", error);
    res.status(500).json({ message: error.message });
  }
};

// Modifier un livre
export const editBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, description, available } = req.body;
    
    await pool.execute(
      'UPDATE books SET title = ?, author = ?, description = ?, available = ? WHERE id = ?',
      [title, author, description, available, id]
    );
    
    res.json({ message: "Livre modifié", id, title, author, description, available });
  } catch (error) {
    console.error("Erreur editBook:", error);
    res.status(500).json({ message: error.message });
  }
};

// Supprimer un livre
export const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;
    const adminEmail = req.user?.email;
    
    const [books] = await pool.execute(
      'SELECT title, author FROM books WHERE id = ?',
      [id]
    );
    
    if (books.length === 0) {
      return res.status(404).json({ message: "Livre non trouvé" });
    }
    
    const book = books[0];
    
    const [activeBorrows] = await pool.execute(
      'SELECT * FROM borrows WHERE book_id = ? AND status = "active"',
      [id]
    );
    
    if (activeBorrows.length > 0) {
      return res.status(400).json({ 
        message: `Ce livre est actuellement emprunté. Impossible de le supprimer.` 
      });
    }
    
    await pool.execute(
      'INSERT INTO books_deleted_history (original_id, title, author, deleted_by, deleted_by_email) VALUES (?, ?, ?, ?, ?)',
      [id, book.title, book.author, adminId, adminEmail]
    );
    
    await pool.execute('DELETE FROM books WHERE id = ?', [id]);
    
    res.json({ message: "Livre supprimé avec succès" });
  } catch (error) {
    console.error("Erreur deleteBook:", error);
    res.status(500).json({ message: error.message });
  }
};

// Emprunter un livre
export const borrowBook = async (req, res) => {
  try {
    const { id: bookId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "Utilisateur non authentifié" 
      });
    }
    
    const [userLimit] = await pool.execute(
      'SELECT current_borrow_count, max_borrow_limit FROM users WHERE id = ?',
      [userId]
    );
    
    if (userLimit.length === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    
    const user = userLimit[0];
    if (user.current_borrow_count >= user.max_borrow_limit) {
      return res.status(400).json({ 
        success: false,
        message: `Limite d'emprunt atteinte (${user.max_borrow_limit} livres max)` 
      });
    }
    
    const [books] = await pool.execute(
      'SELECT * FROM books WHERE id = ? AND available = 1',
      [bookId]
    );
    
    if (books.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "Livre non disponible" 
      });
    }
    
    const [existingBorrow] = await pool.execute(
      'SELECT * FROM borrows WHERE user_id = ? AND book_id = ? AND status = "active"',
      [userId, bookId]
    );
    
    if (existingBorrow.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: "Vous avez déjà emprunté ce livre" 
      });
    }
    
    const borrowDate = new Date();
    const expectedReturnDate = new Date();
    expectedReturnDate.setDate(expectedReturnDate.getDate() + 14);
    
    await pool.execute(
      'INSERT INTO borrows (user_id, book_id, borrow_date, status) VALUES (?, ?, ?, "active")',
      [userId, bookId, borrowDate]
    );
    
    await pool.execute('UPDATE books SET available = 0 WHERE id = ?', [bookId]);
    
    await pool.execute(
      'UPDATE users SET current_borrow_count = current_borrow_count + 1 WHERE id = ?',
      [userId]
    );
    
    res.json({ 
      success: true,
      message: "Livre emprunté avec succès",
      borrowDate: borrowDate,
      expectedReturnDate: expectedReturnDate
    });
    
  } catch (error) {
    console.error("Erreur borrowBook:", error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Retourner un livre
export const returnBook = async (req, res) => {
  try {
    const { id: bookId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "Utilisateur non authentifié" 
      });
    }
    
    const [borrows] = await pool.execute(
      `SELECT * FROM borrows WHERE user_id = ? AND book_id = ? AND status = 'active'`,
      [userId, bookId]
    );
    
    if (borrows.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "Vous n'avez pas emprunté ce livre" 
      });
    }
    
    const borrow = borrows[0];
    const returnDate = new Date().toISOString().split('T')[0];
    
    await pool.execute(
      'UPDATE borrows SET return_date = ?, status = "returned" WHERE id = ?',
      [returnDate, borrow.id]
    );
    
    await pool.execute('UPDATE books SET available = 1 WHERE id = ?', [bookId]);
    
    await pool.execute(
      'UPDATE users SET current_borrow_count = current_borrow_count - 1 WHERE id = ?',
      [userId]
    );
    
    res.json({ 
      success: true,
      message: "Livre retourné avec succès" 
    });
    
  } catch (error) {
    console.error("Erreur returnBook:", error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Obtenir les emprunts d'un utilisateur
export const getUserBorrows = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    const [borrows] = await pool.execute(`
      SELECT 
        br.id as borrow_id,
        br.book_id,
        br.user_id,
        br.borrow_date,
        br.return_date,
        br.status,
        COALESCE(b.id, br.book_id) as id,
        COALESCE(b.title, 'Livre supprimé') as title,
        COALESCE(b.author, 'Auteur inconnu') as author,
        COALESCE(b.description, '') as description,
        COALESCE(b.available, 0) as available,
        CASE 
          WHEN b.id IS NULL THEN 'deleted'
          WHEN br.status = 'active' AND DATEDIFF(CURDATE(), br.borrow_date) > 14 
          THEN 'overdue'
          ELSE br.status
        END as current_status
      FROM borrows br
      LEFT JOIN books b ON br.book_id = b.id
      WHERE br.user_id = ? AND br.status = 'active'
      ORDER BY br.borrow_date DESC
    `, [userId]);
    
    res.json(borrows);
  } catch (error) {
    console.error("Erreur getUserBorrows:", error);
    res.status(500).json({ message: error.message });
  }
};

// Lire un livre (PDF)
export const readBook = async (req, res) => {
  try {
    const { id: bookId } = req.params;
    const userId = req.user?.id;
    
    const [borrows] = await pool.execute(
      'SELECT * FROM borrows WHERE user_id = ? AND book_id = ? AND status = "active"',
      [userId, bookId]
    );
    
    if (borrows.length === 0) {
      return res.status(403).json({ 
        success: false,
        message: "Vous n'avez pas emprunté ce livre" 
      });
    }
    
    const [books] = await pool.execute(
      'SELECT title, pdfUrl FROM books WHERE id = ?',
      [bookId]
    );
    
    if (books.length === 0) {
      return res.status(404).json({ message: "Livre non trouvé" });
    }
    
    const book = books[0];
    
    if (!book.pdfUrl) {
      return res.status(404).json({ 
        message: "Ce livre n'a pas de version PDF disponible" 
      });
    }
    
    res.json({ 
      success: true,
      title: book.title,
      pdfUrl: `http://localhost:5000/${book.pdfUrl}`
    });
    
  } catch (error) {
    console.error("Erreur readBook:", error);
    res.status(500).json({ message: error.message });
  }
};

// Exports
export const createBook = addBook;
export const updateBook = editBook;
export const requestBook = async (req, res) => {
  res.json({ message: "Demande envoyée" });
};
export const getRequests = async (req, res) => {
  res.json([]);
};
export const approveRequest = async (req, res) => {
  res.json({ message: "Demande approuvée" });
};