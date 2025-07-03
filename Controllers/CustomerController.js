import cartModel from "../Models/cartModel.js";
import productModel from "../Models/productModel.js";
import orderModel from "../Models/orderModel.js";
import notificationModel from "../Models/notificationModel.js";
import validator from "validator";

// Add product to cart
export const addToCart = async (req, res) => {
  try {
    const { productId, quantity, size } = req.body;
    if (!productId || !quantity || !size) {
      return res.status(400).json({ message: "Product ID, quantity, and size are required" });
    }
    if (!validator.isInt(String(quantity)) || Number(quantity) < 1) {
      return res.status(400).json({ message: "Invalid quantity" });
    }
    if (!["XS", "S", "M", "L", "XL", "XXL", "XXXL"].includes(size)) {
      return res.status(400).json({ message: "Invalid size" });
    }

    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (product.quantity < quantity) {
      return res.status(400).json({ message: "Insufficient stock" });
    }

    let cart = await cartModel.findOne({ user_id: req.user._id });
    if (!cart) {
      cart = new cartModel({ user_id: req.user._id, items: [] });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId && item.size === size
    );
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += Number(quantity);
    } else {
      cart.items.push({ product: productId, quantity: Number(quantity), size });
    }

    cart.updatedAt = Date.now();
    await cart.save();

    res.status(200).json({ message: "Product added to cart", cart });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// Remove product from cart
export const removeFromCart = async (req, res) => {
  try {
    const { productId, size } = req.body;
    if (!productId || !size) {
      return res.status(400).json({ message: "Product ID and size are required" });
    }

    const cart = await cartModel.findOne({ user_id: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId && item.size === size
    );
    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    cart.items.splice(itemIndex, 1);
    cart.updatedAt = Date.now();
    await cart.save();

    res.status(200).json({ message: "Product removed from cart", cart });
  } catch (error) {
    console.error("Remove from cart error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// Place an order
export const placeOrder = async (req, res) => {
  try {
    const { wilaya, deliveryPrice } = req.body;
    if (!wilaya || !deliveryPrice) {
      return res.status(400).json({ message: "Wilaya and delivery price are required" });
    }
    if (!validator.isNumeric(String(deliveryPrice)) || Number(deliveryPrice) < 0) {
      return res.status(400).json({ message: "Invalid delivery price" });
    }

    const cart = await cartModel.findOne({ user_id: req.user._id }).populate("items.product");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Calculate total price and validate stock
    let totalPrice = 0;
    for (const item of cart.items) {
      if (item.product.quantity < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${item.product.name}` });
      }
      totalPrice += item.product.price * item.quantity;
    }
    totalPrice += Number(deliveryPrice);

    // Create order
    const order = new orderModel({
      user: req.user._id,
      products: cart.items.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
        size: item.size,
      })),
      totalPrice,
      deliveryPrice: Number(deliveryPrice),
      wilaya,
      status: "pending",
    });
    await order.save();

    // Update product quantities
    for (const item of cart.items) {
      const product = await productModel.findById(item.product._id);
      product.quantity -= item.quantity;
      await product.save();
    }

    // Clear cart
    await cartModel.deleteOne({ user_id: req.user._id });

    // Create notification for customer
    const customerNotification = new notificationModel({
      user_id: req.user._id,
      type: "order_placed",
      message: `Your order #${order._id} has been placed and is pending approval.`,
      related_id: order._id,
      read: false,
    });
    await customerNotification.save();

    // Notify customer in real-time
    const io = req.app.get("io");
    const notifyUser = req.app.get("notifyUser");
    notifyUser(req.user._id.toString(), customerNotification);

    // Notify admins in real-time
    const adminNotification = new notificationModel({
      user_id: null, // Will be set for each admin
      type: "order_placed",
      message: `New order #${order._id} placed by user ${req.user.name}.`,
      related_id: order._id,
      read: false,
    });
    const notifyAdmins = req.app.get("notifyAdmins");
    const admins = await userModel.find({ user_type: "admin" }).select("_id");
    for (const admin of admins) {
      const adminNotif = new notificationModel({
        ...adminNotification.toObject(),
        user_id: admin._id,
      });
      await adminNotif.save();
      notifyAdmins(adminNotif);
    }

    res.status(201).json({ message: "Order placed successfully", order });
  } catch (error) {
    console.error("Place order error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// Get all products (same as admin)
export const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, gender, age, search } = req.query;
    const query = {};
    if (category) query.category = category;
    if (gender) query.gender = gender;
    if (age) query.age = age;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const products = await productModel
      .find(query)
      .select("name price description quantity gender age pictures category size")
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

// Get customer's orders
export const getOrders = async (req, res) => {
  try {
    const orders = await orderModel
      .find({ user: req.user._id })
      .populate("products.product", "name price pictures")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ orders });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};