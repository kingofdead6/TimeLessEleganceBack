import express from "express";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  resetPasswordRequest,
  resetPassword,
  deleteUser,
  updateUser,
  updateWilaya,
} from "../Controllers/authController.js";
import { authMiddleware } from "../Middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/reset-password-request", resetPasswordRequest);
router.post("/reset-password", resetPassword);

// Protected routes
router.get("/me", authMiddleware, getCurrentUser);
router.put("/update", authMiddleware, updateUser);
router.put("/update-wilaya", authMiddleware, updateWilaya);
router.delete("/delete", authMiddleware, deleteUser);

export default router;