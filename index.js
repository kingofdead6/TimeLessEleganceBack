import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import { createServer } from "http";
import authRoute from "./Routes/authRoute.js";
import userRoute from "./Routes/userRoute.js";
import productRoute from "./Routes/productRoute.js";
import cartRoute from "./Routes/cartRoute.js";
import contactRoute from "./Routes/contactRoute.js";
import offerRoute from "./Routes/offerRoute.js";
import newsletterRoute from "./Routes/newsletterRoute.js";
import orderRoute from "./Routes/orderRoute.js";
import deliveryPriceRoute from "./Routes/deliveryPriceRoute.js";
import notificationRoute from "./Routes/notificationRoute.js";
import chatbotRoute from './Routes/ChatBotRoute.js'

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Create HTTP server
const server = createServer(app);

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Define API routes
app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/products", productRoute);
app.use("/api/cart", cartRoute);
app.use("/api/contact", contactRoute);
app.use("/api/offers", offerRoute);
app.use("/api/newsletters", newsletterRoute);
app.use("/api/orders", orderRoute);
app.use("/api/delivery-prices", deliveryPriceRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/chatbot", chatbotRoute);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Root endpoint
app.get("/", (req, res) => {
  res.send("API is running perfectly...");
});