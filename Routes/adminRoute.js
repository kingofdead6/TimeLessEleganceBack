import express from "express";
import {
  getAllUsers,
  getRatings,
  deleteRating,
  addProduct,
  removeProduct,
  addProductQuantity,
  approveOrRejectOrder,
  updateOrderStatusToShipped,
  getAllProducts,
} from "../controllers/adminController.js";
import authMiddleware from "../Middleware/authMiddleware.js";
import multer from "multer";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"), false);
    }
  },
});

router.get("/users", authMiddleware, getAllUsers);
router.get("/ratings", authMiddleware, getRatings);
router.delete("/ratings/:productId/:ratingId", authMiddleware, deleteRating);
router.post("/products", authMiddleware, upload.single("picture"), addProduct);
router.delete("/products/:productId", authMiddleware, removeProduct);
router.put("/products/:productId/quantity", authMiddleware, addProductQuantity);
router.put("/orders/:orderId/approve-reject", authMiddleware, approveOrRejectOrder);
router.put("/orders/:orderId/shipped", authMiddleware, updateOrderStatusToShipped);
router.get("/products", authMiddleware, getAllProducts);
export default router;