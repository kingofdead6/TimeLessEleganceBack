import userModel from "../Models/userModel.js";
import productModel from "../Models/productModel.js";
import orderModel from "../Models/orderModel.js";
import notificationModel from "../Models/notificationModel.js";
import validator from "validator";
import cloudinary from "../utils/cloudinary.js";

// Helper to check if the user is an admin
const ensureAdmin = (user) => {
  if (!user || user.user_type !== "admin") {
    throw new Error("Admin access required");
  }
};

// Get all users with pagination and filtering
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, user_type, search } = req.query;
    ensureAdmin(req.user);

    const query = {};
    if (user_type) query.user_type = user_type;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await userModel
      .find(query)
      .select("name email user_type phone_number wilaya createdAt")
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const total = await userModel.countDocuments(query);

    res.status(200).json({
      users,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// Get all ratings for products
export const getRatings = async (req, res) => {
  try {
    ensureAdmin(req.user);

    const products = await productModel
      .find({})
      .select("name ratings")
      .populate("ratings.patient_id", "name email")
      .lean();

    const ratings = products
      .filter((product) => product.ratings.length > 0)
      .map((product) => ({
        product_id: product._id,
        product_name: product.name,
        ratings: product.ratings,
      }));

    res.status(200).json({ ratings });
  } catch (error) {
    console.error("Get ratings error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// Delete a specific rating from a product
export const deleteRating = async (req, res) => {
  try {
    const { productId, ratingId } = req.params;
    ensureAdmin(req.user);

    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const ratingIndex = product.ratings.findIndex(
      (rating) => rating._id.toString() === ratingId
    );
    if (ratingIndex === -1) {
      return res.status(404).json({ message: "Rating not found" });
    }

    product.ratings.splice(ratingIndex, 1);
    await product.save();

    res.status(200).json({ message: "Rating deleted successfully" });
  } catch (error) {
    console.error("Delete rating error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// Add a new product
export const addProduct = async (req, res) => {
  try {
    const {
      name,
      price,
      description,
      quantity,
      gender,
      age,
      category,
      size,
      season,
    } = req.body;
    const picture = req.file;
    ensureAdmin(req.user);

    // Validate inputs
    if (!name || !price || !quantity || !gender || !age || !category || !size || !picture || !season) {
      return res.status(400).json({ message: "All fields and image are required" });
    }
    if (!["Men", "Women"].includes(gender)) {
      return res.status(400).json({ message: "Invalid gender" });
    }
    if (!["Adult", "Child"].includes(age)) {
      return res.status(400).json({ message: "Invalid age" });
    }
    if (!["XS", "S", "M", "L", "XL", "XXL", "XXXL"].includes(size)) {
      return res.status(400).json({ message: "Invalid size" });
    }
    if (!["Winter", "Summer", "both"].includes(season)) {
      return res.status(400).json({ message: "Invalid season" });
    }
    if (!validator.isNumeric(String(price)) || Number(price) < 0) {
      return res.status(400).json({ message: "Invalid price" });
    }
    if (!validator.isInt(String(quantity)) || Number(quantity) < 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }

    // Upload image to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "products",
          public_id: `${name}_${Date.now()}`,
          resource_type: "image",
          allowed_formats: ["jpg", "png"],
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(picture.buffer);
    });

    // Create product
    const product = new productModel({
      user_id: req.user._id,
      name,
      price: Number(price),
      description: description || "",
      quantity: Number(quantity),
      gender,
      age,
      pictures: uploadResult.secure_url,
      category,
      size,
      season,
    });
    await product.save();

    res.status(201).json({ message: "Product added successfully", product });
  } catch (error) {
    console.error("Add product error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// Remove a product
export const removeProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    ensureAdmin(req.user);

    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Delete image from Cloudinary
    if (product.pictures) {
      const publicId = product.pictures.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`products/${publicId}`).catch((err) => {
        console.error("Cloudinary deletion error:", err);
      });
    }

    await productModel.deleteOne({ _id: productId });

    res.status(200).json({ message: "Product removed successfully" });
  } catch (error) {
    console.error("Remove product error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// Add quantity to a product (considering sizes)
export const addProductQuantity = async (req, res) => {
  try {
    const { productId } = req.params;
    const { size, quantity } = req.body;
    ensureAdmin(req.user);

    if (!size || !quantity) {
      return res.status(400).json({ message: "Size and quantity are required" });
    }
    if (!["XS", "S", "M", "L", "XL", "XXL", "XXXL"].includes(size)) {
      return res.status(400).json({ message: "Invalid size" });
    }
    if (!validator.isInt(String(quantity)) || Number(quantity) < 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }

    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // For simplicity, update the main quantity (adjust if using stock array)
    product.quantity += Number(quantity);
    await product.save();

    res.status(200).json({ message: "Quantity updated successfully", product });
  } catch (error) {
    console.error("Add product quantity error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// In approveOrRejectOrder
export const approveOrRejectOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { action } = req.body;
    ensureAdmin(req.user);

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    const order = await orderModel.findById(orderId).populate("user", "name email");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (order.status !== "pending") {
      return res.status(400).json({ message: "Order is not in pending status" });
    }

    order.status = action === "approve" ? "processing" : "cancelled";
    await order.save();

    const notificationType = action === "approve" ? "order_accepted" : "order_rejected";
    const message =
      action === "approve"
        ? `Your order #${orderId} has been accepted and is now processing.`
        : `Your order #${orderId} has been rejected.`;
    const notification = new notificationModel({
      user_id: order.user._id,
      type: notificationType,
      message,
      related_id: order._id,
      read: false,
    });
    await notification.save();

    // Emit real-time notification
    const notifyUser = req.app.get("notifyUser");
    notifyUser(order.user._id.toString(), notification);

    res.status(200).json({ message: `Order ${action}d successfully`, order });
  } catch (error) {
    console.error("Approve/reject order error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// In updateOrderStatusToShipped
export const updateOrderStatusToShipped = async (req, res) => {
  try {
    const { orderId } = req.params;
    ensureAdmin(req.user);

    const order = await orderModel.findById(orderId).populate("user", "name email");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (!["pending", "processing"].includes(order.status)) {
      return res.status(400).json({ message: "Order is not in pending or processing status" });
    }

    order.status = "shipped";
    await order.save();

    const notification = new notificationModel({
      user_id: order.user._id,
      type: "order_shipped",
      message: `Your order #${orderId} has been shipped.`,
      related_id: order._id,
      read: false,
    });
    await notification.save();

    // Emit real-time notification
    const notifyUser = req.app.get("notifyUser");
    notifyUser(order.user._id.toString(), notification);

    res.status(200).json({ message: "Order status updated to shipped", order });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};
// adminController.js
export const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    ensureAdmin(req.user);

    const query = search ? { name: { $regex: search, $options: "i" } } : {};
    const products = await productModel
      .find(query)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const total = await productModel.countDocuments(query);

    res.status(200).json({
      products,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error("Get all products error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};