// routes/admin.js
import express from "express";
import { authenticateToken, isAdmin } from "../middleware/auth.js";
import { 
  getAllUsersWithBorrows,
  getBookDeleteHistory,
  getUserLoginHistory,
  deleteUser,
  updateUserRole,
  restoreDeletedBook,      // ← IMPORTANT
  permanentlyDeleteBook    // ← IMPORTANT
} from "../controllers/adminController.js";

const router = express.Router();

router.use(authenticateToken, isAdmin);

// Routes existantes
router.get("/users", getAllUsersWithBorrows);
router.get("/books-deleted", getBookDeleteHistory);
router.get("/user-logins", getUserLoginHistory);
router.delete("/users/:id", deleteUser);
router.put("/users/:id/role", updateUserRole);

// ✅ NOUVELLES ROUTES - Livres supprimés
router.post("/books-deleted/:id/restore", restoreDeletedBook);
router.delete("/books-deleted/:id/permanent", permanentlyDeleteBook);

export default router;