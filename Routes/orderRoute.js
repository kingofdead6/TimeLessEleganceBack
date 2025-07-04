import express from "express";
import { createOrder, getAdminOrders, getUserOrders, updateOrderStatus } from "../Controllers/orderController.js";
import { authMiddleware, adminMiddleware } from "../Middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, createOrder);
router.get("/", authMiddleware, getUserOrders);
router.get("/admin", authMiddleware, adminMiddleware, getAdminOrders);
router.put("/:id", authMiddleware, adminMiddleware, updateOrderStatus);

export default router;