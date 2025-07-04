import express from 'express';
import { getAllUsers, getWilayas } from '../Controllers/userController.js';
import { authMiddleware, adminMiddleware } from "../Middleware/authMiddleware.js";

const router = express.Router();

router.get('/', authMiddleware, adminMiddleware, getAllUsers);
router.get('/wilayas' , authMiddleware , adminMiddleware , getWilayas);
export default router;