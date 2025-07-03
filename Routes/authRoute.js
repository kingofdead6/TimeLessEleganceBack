import express from 'express';
import { registerUser, loginUser, getCurrentUser } from '../Controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected route
router.get('/me', authMiddleware, getCurrentUser);

export default router;