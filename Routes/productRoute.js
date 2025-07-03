import express from "express";
import multer from "multer";
import {
  getProducts,
  createProduct,
  getCategories,
  updateProduct,
  deleteProduct,
  getSubcategories,
  getAllCategories,
  getAllSubcategories,
  getRelatedProducts,
  getProductById,
} from "../Controllers/ProductController.js";
import { authMiddleware, adminMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Get all products with filters
router.get("/", getProducts);

// Create a new product with image uploads
router.post("/", authMiddleware, adminMiddleware, upload.array("pictures", 10), createProduct);

// Update a product with optional image uploads
router.put("/:id", authMiddleware, adminMiddleware, upload.array("pictures", 10), updateProduct);

// Delete a product
router.delete("/:id", authMiddleware, adminMiddleware, deleteProduct);

// Get product categories (only those with products)
router.get("/categories", getCategories);

// Get product subcategories (only those with products)
router.get("/subcategories", getSubcategories);

// Get all schema-defined categories
router.get("/all-categories", authMiddleware, adminMiddleware, getAllCategories);

// Get all schema-defined subcategories for a category
router.get("/all-subcategories", authMiddleware, adminMiddleware, getAllSubcategories);

router.get("/related" , getRelatedProducts);

router.get("/:id" , getProductById);


export default router;