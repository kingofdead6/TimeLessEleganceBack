import asyncHandler from "express-async-handler";
import Cart from "../Models/cartModel.js";
import Product from "../Models/productModel.js";

export const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity, size } = req.body;
  const userId = req.user._id;

  if (!productId || !quantity || !size) {
    res.status(400);
    throw new Error("Product ID, quantity, and size are required");
  }

  // Check if product exists and has stock
  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const stockItem = product.stock.find((s) => s.size === size);
  if (!stockItem || stockItem.quantity < quantity) {
    res.status(400);
    throw new Error("Insufficient stock or invalid size");
  }

  let cart = await Cart.findOne({ user_id: userId });
  if (!cart) {
    cart = new Cart({ user_id: userId, items: [] });
  }

  const existingItem = cart.items.find(
    (item) => item.product_id.toString() === productId && item.size === size
  );
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({ product_id: productId, quantity, size });
  }

  await cart.save();
  const populatedCart = await Cart.findById(cart._id).populate("items.product_id");
  res.status(201).json({ message: "Product added to cart", cart: populatedCart });
});

export const getCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const cart = await Cart.findOne({ user_id: userId }).populate("items.product_id");
  if (!cart) {
    res.status(404);
    throw new Error("Cart not found");
  }
  res.json({ cart });
});

export const updateCartItem = asyncHandler(async (req, res) => {
  const { itemId, quantity } = req.body;
  const userId = req.user._id;

  if (!itemId || !quantity) {
    res.status(400);
    throw new Error("Item ID and quantity are required");
  }

  const cart = await Cart.findOne({ user_id: userId });
  if (!cart) {
    res.status(404);
    throw new Error("Cart not found");
  }

  const item = cart.items.id(itemId);
  if (!item) {
    res.status(404);
    throw new Error("Item not found in cart");
  }

  const product = await Product.findById(item.product_id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const stockItem = product.stock.find((s) => s.size === item.size);
  if (!stockItem || stockItem.quantity < quantity) {
    res.status(400);
    throw new Error("Insufficient stock for this size");
  }

  item.quantity = quantity;
  await cart.save();
  const populatedCart = await Cart.findById(cart._id).populate("items.product_id");
  res.json({ cart: populatedCart });
});

export const removeCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.body;
  const userId = req.user._id;

  if (!itemId) {
    res.status(400);
    throw new Error("Item ID is required");
  }

  const cart = await Cart.findOne({ user_id: userId });
  if (!cart) {
    res.status(404);
    throw new Error("Cart not found");
  }

  const item = cart.items.id(itemId);
  if (!item) {
    res.status(404);
    throw new Error("Item not found in cart");
  }

  cart.items.pull(itemId);
  await cart.save();
  const populatedCart = await Cart.findById(cart._id).populate("items.product_id");
  res.json({ cart: populatedCart });
});