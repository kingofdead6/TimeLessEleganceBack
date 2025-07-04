import { Router } from 'express';
import { CreateNewsLetter, getNewsLetter, removeMultipleNewsLetter, removeNewsLetter, SendEmails } from '../Controllers/NewsletterController.js';
import { authMiddleware, adminMiddleware } from "../Middleware/authMiddleware.js";

const router = Router();

// Add NewsLetter (public)
router.post('/', CreateNewsLetter);

// Get all NewsLetters (admin)
router.get('/', authMiddleware , adminMiddleware , getNewsLetter );

// Remove NewsLetter
router.delete('/:id', authMiddleware , adminMiddleware , removeNewsLetter);

// Remove Multiple NewsLetters
router.delete('/',authMiddleware , adminMiddleware , removeMultipleNewsLetter);

// Send custom email
router.post('/send-email', authMiddleware , adminMiddleware , SendEmails);

export default router;
