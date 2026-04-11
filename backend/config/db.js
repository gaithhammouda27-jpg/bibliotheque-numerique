// C:\Users\ghaith\bibliotheque\backend\config\db.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'bibliotheque',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test de connexion
const testDb = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL connecté avec succès');
    connection.release();
  } catch (error) {
    console.error('❌ Erreur de connexion MySQL:', error.message);
  }
};

testDb();

export default pool;