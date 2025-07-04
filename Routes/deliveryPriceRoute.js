import express from "express";
import { getDeliveryPrices, updateDeliveryPrices } from "../Controllers/deliveryPriceController.js";
import { authMiddleware, adminMiddleware } from "../Middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getDeliveryPrices);
router.put("/", authMiddleware, adminMiddleware, updateDeliveryPrices);

export default router;