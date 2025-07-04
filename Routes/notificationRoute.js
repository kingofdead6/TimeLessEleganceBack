import express from "express";
import { getNotifications, markNotificationRead } from "../Controllers/notificationController.js";
import { authMiddleware } from "../Middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getNotifications);
router.put("/:id/read", authMiddleware, markNotificationRead);

export default router;