import express from "express";
import multer from "multer";
import {
  getOffers,
  getAdminOffers,
  createOffer,
  updateOffer,
  deleteOffer,
} from "../Controllers/OffersController.js";
import { authMiddleware, adminMiddleware } from "../Middleware/authMiddleware.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get("/", getOffers);
router.get("/admin", authMiddleware, adminMiddleware, getAdminOffers);
router.post("/", authMiddleware, adminMiddleware, upload.single("image"), createOffer);
router.put("/:id", authMiddleware, adminMiddleware, upload.single("image"), updateOffer);
router.delete("/:id", authMiddleware, adminMiddleware, deleteOffer);

export default router;