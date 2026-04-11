// C:\Users\ghaith\bibliotheque\backend\routes\auth.js
import express from "express";
import { register, login, getMe } from "../controllers/authController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticateToken, getMe);  // ← AJOUTER CETTE LIGNE

export default router;