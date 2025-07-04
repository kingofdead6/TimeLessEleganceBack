import asyncHandler from "express-async-handler";
import Order from "../Models/orderModel.js";
import Cart from "../Models/cartModel.js";
import Product from "../Models/productModel.js";
import Notification from "../Models/notificationModel.js";
import nodemailer from "nodemailer";
import DeliveryPrice from "../Models/deliveryPriceModel.js";
import User from "../Models/userModel.js";

export const createOrder = asyncHandler(async (req, res) => {
  const { items, deliveryMethod, wilaya, address, subtotal, total } = req.body;
  const userId = req.user._id;

  if (!items || !deliveryMethod || !wilaya || !subtotal || !total) {
    res.status(400);
    throw new Error("All required fields must be provided");
  }

  // Validate stock
  for (const item of items) {
    const product = await Product.findById(item.product_id);
    if (!product) {
      res.status(404);
      throw new Error(`Product ${item.product_id} not found`);
    }
    const stockItem = product.stock.find((s) => s.size === item.size);
    if (!stockItem || stockItem.quantity < item.quantity) {
      res.status(400);
      throw new Error(`Insufficient stock for ${product.name} (size: ${item.size})`);
    }
    if (item.quantity <= 0) {
      res.status(400);
      throw new Error(`Invalid quantity for ${product.name} (size: ${item.size})`);
    }
  }

  const order = new Order({
    user_id: userId,
    items,
    deliveryMethod,
    wilaya,
    address,
    subtotal,
    total,
    status: "pending",
  });

  const createdOrder = await order.save();

  // Update stock
  const stockUpdates = [];
  for (const item of items) {
    const product = await Product.findById(item.product_id);
    const stockItem = product.stock.find((s) => s.size === item.size);
    stockItem.quantity = Math.max(0, stockItem.quantity - item.quantity); // Prevent negative stock
    await product.save();
    stockUpdates.push({
      product_id: item.product_id,
      size: item.size,
      newQuantity: stockItem.quantity,
    });
  }

  // Clear cart
  await Cart.findOneAndUpdate(
    { user_id: userId },
    { $set: { items: [] } }
  );

  // Send confirmation email
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const itemsList = await Promise.all(
    items.map(async (item) => {
      const product = await Product.findById(item.product_id);
      return {
        name: product.name,
        size: item.size,
        quantity: item.quantity,
        price: (product.price * item.quantity).toFixed(2),
        picture: product.pictures?.[0] || "https://res.cloudinary.com/dhu2uyrwx/image/upload/v1234567890/placeholder.jpg",
      };
    })
  );

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation</title>
      <style>
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background-color: #0f172a; color: #ffffff; }
        .container { max-width: 600px; margin: 20px auto; background: linear-gradient(135deg, #1e3a8a, #6b21a8); border-radius: 12px; padding: 20px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3); }
        .header { text-align: center; padding: 20px; background AscentTheme: 'light' background: linear-gradient(45deg, #38f6fc, #007bff); border-radius: 8px 8px 0 0; }
        .header img { max-width: 150px; }
        .header h1 { font-size: 28px; margin: 10px 0; color: #ffffff; }
        .content { padding: 20px; }
        h2 { font-size: 22px; margin-bottom: 10px; color: #38f6fc; }
        p { font-size: 16px; line-height: 1.5; margin: 5px 0; color: #e5e7eb; }
        .item { display: flex; align-items: center; margin-bottom: 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.2); padding-bottom: 10px; }
        .item img { width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 15px; }
        .item-details { flex: 1; }
        .item-details p { margin: 2px 0; }
        .summary { margin-top: 20px; background: rgba(0, 0, 0, 0.3); padding: 15px; border-radius: 8px; }
        .summary p { font-size: 16px; margin: 5px 0; }
        .footer { text-align: center; padding: 20px; font-size: 14px; color: #94a3b8; }
        .footer a { color: #38f6fc; text-decoration: none; }
        .wave-bg { position: absolute; top: 0; left: 0; right: 0; height: 100px; background: url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320"%3E%3Cpath fill="none" stroke="rgba(34, 211, 238, 0.2)" stroke-width="2" d="M0,160 C320,100 640,100 960,160 C1280,220 1440,220 1440,220"/%3E%3Ccircle cx="360" cy="120" r="4" fill="rgba(34, 211, 238, 0.5)"/%3E%3Ccircle cx="720" cy="180" r="4" fill="rgba(139, 92, 246, 0.5)"/%3E%3Ccircle cx="1080" cy="140" r="4" fill="rgba(236, 72, 153, 0.5)"/%3E%3C/svg%3E'); opacity: 0.3; }
        @media (max-width: 600px) {
          .container { padding: 10px; }
          .header h1 { font-size: 24px; }
          h2 { font-size: 18px; }
          p { font-size: 14px; }
          .item img { width: 50px; height: 50px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="wave-bg"></div>
        <div class="header">
          <h1>Order Confirmation</h1>
          <p>Thank you for shopping with Timeless Elegance!</p>
        </div>
        <div class="content">
          <h2>Order Details</h2>
          <p><strong>Order ID:</strong> ${createdOrder._id}</p>
          <p><strong>Customer:</strong> ${req.user.name}</p>
          <p><strong>Email:</strong> ${req.user.email}</p>
          <p><strong>Phone:</strong> ${req.user.phone_number || 'N/A'}</p>
          <p><strong>Wilaya:</strong> ${wilaya}</p>
          ${address ? `<p><strong>Address:</strong> ${address}</p>` : ''}
          <p><strong>Delivery Method:</strong> ${deliveryMethod}</p>
          <h2>Items Ordered</h2>
          ${itemsList
            .map(
              (item) => `
                <div class="item">
                  <img src="${item.picture}" alt="${item.name}" />
                  <div class="item-details">
                    <p><strong>${item.name}</strong></p>
                    <p>Size: ${item.size}</p>
                    <p>Quantity: ${item.quantity}</p>
                    <p>Price: $${item.price}</p>
                  </div>
                </div>
              `
            )
            .join('')}
          <div class="summary">
            <p><strong>Subtotal:</strong> $${subtotal}</p>
            <p><strong>Delivery:</strong> $${(total - subtotal).toFixed(2)}</p>
            <p><strong>Total:</strong> $${total}</p>
          </div>
          <p style="margin-top: 20px;">You will receive a call soon to confirm your order.</p>
        </div>
        <div class="footer">
          <p>Need help? Contact us at <a href="mailto:support@timelesselegance.com">support@timelesselegance.com</a></p>
          <p>© ${new Date().getFullYear()} Timeless Elegance. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: req.user.email,
    subject: "Order Confirmation - Timeless Elegance",
    text: `Thank you for your order!\n\nOrder ID: ${createdOrder._id}\n\nItems:\n${itemsList
      .map((item) => `- ${item.name} (Size: ${item.size}, Qty: ${item.quantity}, Price: $${item.price})`)
      .join('\n')}\n\nSubtotal: $${subtotal}\nDelivery: $${(total - subtotal).toFixed(2)}\nTotal: $${total}\n\nDelivery: ${deliveryMethod}\nWilaya: ${wilaya}${address ? `\nAddress: ${address}` : ""}\n\nYou will receive a call soon to confirm your order.`,
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);

  // Notify admin
  const admins = await User.find({ user_type: "admin" });
  for (const admin of admins) {
    await new Notification({
      user_id: admin._id,
      message: `New order #${createdOrder._id} placed by user ${req.user.name}`,
      type: "order",
      related_id: createdOrder._id,
    }).save();
  }

  // Notify user
  await new Notification({
    user_id: userId,
    message: `Your order #${createdOrder._id} is pending confirmation`,
    type: "order",
    related_id: createdOrder._id,
  }).save();

  res.status(201).json({ order: createdOrder, stockUpdates });
});

export const getAdminOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find()
    .populate({
      path: "user_id",
      select: "name email phone_number wilaya",
    })
    .populate({
      path: "items.product_id",
      select: "name pictures price category subcategory",
    });
  res.json({ orders });
});

export const getUserOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user_id: req.user._id }).populate({
    path: "items.product_id",
    select: "name pictures price category subcategory",
  });
  res.json({ orders });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  order.status = status;
  await order.save();

  // Notify user of status change
  await new Notification({
    user_id: order.user_id,
    message: `Your order #${order._id} has been ${status}`,
    type: "order",
    related_id: order._id,
  }).save();

  res.json({ order });
});