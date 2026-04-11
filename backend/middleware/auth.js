import jwt from 'jsonwebtoken';

// ✅ UTILISEZ LA MÊME CLÉ QUE DANS AUTHCONTROLLER.JS
const JWT_SECRET = 'mon_super_secret_jwt_2024';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  console.log('🔐 Authentification - Token reçu:', token ? 'Oui' : 'Non');
  
  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Token d\'authentification manquant' 
    });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Utilisateur authentifié:', decoded.email);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ Token invalide:', error.message);
    return res.status(403).json({ 
      success: false,
      message: 'Token invalide ou expiré' 
    });
  }
};

// ✅ AJOUTER CE MIDDLEWARE - Vérifie que l'utilisateur est admin
export const isAdmin = (req, res, next) => {
  console.log('=== VÉRIFICATION ADMIN ===');
  console.log('req.user:', req.user);
  
  if (!req.user) {
     console.log('❌ Pas d\'utilisateur');
    return res.status(401).json({ 
      success: false,
      message: 'Non authentifié' 
    });
  }
  
  if (req.user.role !== 'admin') {
    console.log(`❌ Accès refusé - ${req.user.email} n'est pas admin (rôle: ${req.user.role})`);
    return res.status(403).json({ 
      success: false,
      message: 'Accès refusé. Droits administrateur requis.' 
    });
  }
  
  console.log(`✅ Accès admin autorisé pour: ${req.user.email}`);
  next();
};