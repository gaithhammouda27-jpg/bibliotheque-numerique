import express from "express";
import { readBook } from "../controllers/bookController.js";

import { 
  getBooks, 
  addBook, 
  editBook, 
  deleteBook, 
  borrowBook, 
  returnBook, 
  getUserBorrows,  // Ajouté
  requestBook, 
  getRequests, 
  approveRequest 
} from "../controllers/bookController.js";
import { authenticateToken } from "../middleware/auth.js";
const router = express.Router();

router.get("/", getBooks);
router.get("/my-borrows", getUserBorrows);  // Nouvelle route
router.post("/", addBook);
router.put("/:id", editBook);
router.delete("/:id", deleteBook);
router.post("/borrow/:id", borrowBook);
router.post("/return/:id", returnBook);
router.post("/request", requestBook);
router.get("/requests", getRequests);
router.put("/requests/:id/approve", approveRequest);
router.get("/read/:id", authenticateToken, readBook);

export default router;