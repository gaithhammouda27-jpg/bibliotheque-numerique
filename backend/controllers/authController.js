// C:\Users\ghaith\bibliotheque\backend\controllers\authController.js
import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// ✅ AJOUTER - Définir la clé secrète (la même que dans middleware/auth.js)
const JWT_SECRET = process.env.JWT_SECRET || 'mon_super_secret_jwt_2024';

// Inscription
export const register = async (req, res) => {
  try {
    const { email, password, role = 'user' } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email et mot de passe requis" });
    }
    
    // Vérifier si l'utilisateur existe
    const [existing] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ message: "Cet email est déjà utilisé" });
    }
    
    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insérer l'utilisateur avec les colonnes max_borrow_limit et current_borrow_count
    const [result] = await pool.execute(
      'INSERT INTO users (email, password, role, max_borrow_limit, current_borrow_count) VALUES (?, ?, ?, 3, 0)',
      [email, hashedPassword, role]
    );
    
    // ✅ CHANGEMENT - Utiliser JWT_SECRET
    const token = jwt.sign(
      { id: result.insertId, email, role },
      JWT_SECRET,  // ← Utiliser la constante
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      message: "Inscription réussie",
      token,
      role
    });
    
  } catch (error) {
    console.error("Erreur register:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Connexion
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email et mot de passe requis" });
    }
    
    // Chercher l'utilisateur
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ message: "Identifiants incorrects" });
    }
    
    const user = users[0];
    
    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ message: "Identifiants incorrects" });
    }
    
    // ✅ AJOUT - Enregistrer l'historique des connexions
    try {
      // Récupérer l'adresse IP
      const ip = req.headers['x-forwarded-for'] || 
                 req.connection?.remoteAddress || 
                 req.socket?.remoteAddress || 
                 'unknown';
      
      // Nettoyer l'IP (enlever le préfixe IPv6 si présent)
      const cleanIp = ip.replace(/^::ffff:/, '');
      
      await pool.execute(
        'INSERT INTO user_logins (user_id, user_email, ip_address) VALUES (?, ?, ?)',
        [user.id, user.email, cleanIp]
      );
      console.log(`📝 Connexion enregistrée pour ${email} depuis ${cleanIp}`);
    } catch (logError) {
      console.error("⚠️ Erreur enregistrement connexion:", logError.message);
      // Ne pas bloquer la connexion si l'historique échoue
    }
    
    // Créer le token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('✅ Login réussi pour:', email);
    
    res.json({
      message: "Connexion réussie",
      token,
      role: user.role
    });
    
  } catch (error) {
    console.error("Erreur login:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Get current user info
export const getMe = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    
    const [users] = await pool.execute(
      'SELECT id, email, role, current_borrow_count, max_borrow_limit FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    
    res.json(users[0]);
  } catch (error) {
    console.error("Erreur getMe:", error);
    res.status(500).json({ message: error.message });
  }
};