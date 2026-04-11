import express from "express";
import cors from "cors";
import path from "path";
import authRoutes from "./routes/auth.js";
import booksRoutes from "./routes/Books.js";
import { authenticateToken } from "./middleware/auth.js"; // ← À AJOUTER
import adminRoutes from "./routes/admin.js";
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Routes publiques (pas besoin de token)
app.use("/api/auth", authRoutes);

// Routes protégées (nécessitent un token)
app.use("/api/books", authenticateToken, booksRoutes); // ← AJOUTER authenticateToken

// Routes admin
app.use("/api/admin", adminRoutes);

//servir les fichiers pdf 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(5000, () => console.log("Backend démarré sur le port 5000"));
