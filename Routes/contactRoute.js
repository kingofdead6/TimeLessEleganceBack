import { Router } from 'express';
import { createContact, getContacts, deleteContact } from "../Controllers/ContactController.js";
import { authMiddleware, adminMiddleware } from "../Middleware/authMiddleware.js";

const router = Router();

router.post('/', createContact);
router.get('/', authMiddleware, adminMiddleware, getContacts);
router.delete('/:id', authMiddleware, adminMiddleware, deleteContact);

export default router;