import express from "express";
import { addToCart, getCart, updateCartItem, removeCartItem } from "../Controllers/cartController.js";
import { authMiddleware } from "../Middleware/authMiddleware.js";

const router = express.Router();

router.post("/add", authMiddleware, addToCart);
router.get("/", authMiddleware , getCart);
router.put("/update", authMiddleware, updateCartItem);
router.delete("/remove", authMiddleware , removeCartItem);

export default router;