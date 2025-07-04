import asyncHandler from "express-async-handler";
import userModel from "../Models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "validator";
import nodemailer from "nodemailer";
import cartModel from "../models/cartModel.js"; // Adjust path if needed
// List of valid Algerian wilayas
const wilayas = [
  "Adrar", "Chlef", "Laghouat", "Oum El Bouaghi", "Batna", "Béjaïa", "Biskra", "Béchar",
  "Blida", "Bouira", "Tamanrasset", "Tébessa", "Tlemcen", "Tiaret", "Tizi Ouzou", "Algiers",
  "Djelfa", "Jijel", "Sétif", "Saïda", "Skikda", "Sidi Bel Abbès", "Annaba", "Guelma",
  "Constantine", "Médéa", "Mostaganem", "M'Sila", "Mascara", "Ouargla", "Oran", "El Bayadh",
  "Illizi", "Bordj Bou Arréridj", "Boumerdès", "El Tarf", "Tindouf", "Tissemsilt", "El Oued",
  "Khenchela", "Souk Ahras", "Tipaza", "Mila", "Aïn Defla", "Naâma", "Aïn Témouchent",
  "Ghardaïa", "Relizane", "Timimoun", "Bordj Badji Mokhtar", "Ouled Djellal", "Béni Abbès",
  "In Salah", "In Guezzam", "Touggourt", "Djanet", "El M'Ghair", "El Meniaa"
];

// Generate JWT token for user authentication
const createToken = (_id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return jwt.sign({ _id }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

// Generate reset password token
const createResetToken = (_id) => {
  if (!process.env.JWT_RESET_SECRET) {
    throw new Error("JWT_RESET_SECRET is not defined in environment variables");
  }
  return jwt.sign({ _id }, process.env.JWT_RESET_SECRET, { expiresIn: "1h" });
};

// Register a new user
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone_number, user_type, wilaya } = req.body;

  // Validate required fields
  if (!name || !email || !password || !phone_number || !wilaya) {
    res.status(400);
    throw new Error("All user fields are required");
  }
  if (!validator.isEmail(email)) {
    res.status(400);
    throw new Error("Invalid email");
  }
  if (!validator.isStrongPassword(password, { minSymbols: 0 })) {
    res.status(400);
    throw new Error("Password must be strong (min 8 chars, with letters and numbers)");
  }

  // Validate user_type
  const userTypeString = String(user_type).trim().toLowerCase();
  const validUserTypes = ["customer", "admin"];
  if (!validUserTypes.includes(userTypeString)) {
    res.status(400);
    throw new Error("Invalid user type. Must be 'customer' or 'admin'");
  }

  // Validate wilaya
  if (!wilayas.includes(wilaya)) {
    res.status(400);
    throw new Error("Invalid wilaya");
  }

  // Check for existing user
  const existingUser = await userModel.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new Error("Email already exists");
  }

  // Create and save new user
  const salt = await bcrypt.genSalt(10);
  const hashed_password = await bcrypt.hash(password, salt);
  const user = new userModel({
    name,
    email,
    hashed_password,
    phone_number,
    user_type: userTypeString,
    wilaya,
  });
  await user.save();

  // Return token and user details
  const token = createToken(user._id);
  res.status(201).json({
    token,
    user: { _id: user._id, name, email, user_type: user.user_type, wilaya },
  });
});

// Login user and return JWT token
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  // Check user credentials
  const user = await userModel.findOne({ email });
  if (!user) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  const isMatch = await bcrypt.compare(password, user.hashed_password);
  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  const token = createToken(user._id);
  res.status(200).json({
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      user_type: user.user_type,
      wilaya: user.wilaya,
    },
  });
});

// Get details of the authenticated user
export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.status(200).json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      user_type: user.user_type,
      phone_number: user.phone_number,
      wilaya: user.wilaya,
    },
  });
});

// Update user information
export const updateUser = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { name, phone_number, wilaya } = req.body;

  // Validate input
  if (!name || !phone_number || !wilaya) {
    res.status(400);
    throw new Error("Name, phone number, and wilaya are required");
  }

  // Validate wilaya
  if (!wilayas.includes(wilaya)) {
    res.status(400);
    throw new Error("Invalid wilaya");
  }

  // Check if user exists
  const user = await userModel.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Update fields
  user.name = name;
  user.phone_number = phone_number;
  user.wilaya = wilaya;
  await user.save();

  res.status(200).json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      user_type: user.user_type,
      phone_number: user.phone_number,
      wilaya: user.wilaya,
    },
  });
});

// Update user wilaya
export const updateWilaya = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { wilaya } = req.body;

  // Validate input
  if (!wilaya) {
    res.status(400);
    throw new Error("Wilaya is required");
  }

  // Validate wilaya
  if (!wilayas.includes(wilaya)) {
    res.status(400);
    throw new Error("Invalid wilaya");
  }

  // Check if user exists
  const user = await userModel.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Update wilaya
  user.wilaya = wilaya;
  await user.save();

  res.status(200).json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      user_type: user.user_type,
      phone_number: user.phone_number,
      wilaya: user.wilaya,
    },
  });
});

// Request password reset
export const resetPasswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email || !validator.isEmail(email)) {
    res.status(400);
    throw new Error("A valid email is required");
  }

  const user = await userModel.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error("No user found with this email");
  }

  const resetToken = createResetToken(user._id);
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Request</title>
      <style>
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background-color: #0f172a; color: #ffffff; }
        .container { max-width: 600px; margin: 20px auto; background: linear-gradient(135deg, #1e3a8a, #6b21a8); border-radius: 12px; padding: 20px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3); }
        .header { text-align: center; padding: 20px; background: linear-gradient(45deg, #38f6fc, #007bff); border-radius: 8px 8px 0 0; }
        .header h1 { font-size: 28px; margin: 10px 0; color: #ffffff; }
        .content { padding: 20px; }
        h2 { font-size: 22px; margin-bottom: 10px; color: #38f6fc; }
        p { font-size: 16px; line-height: 1.5; margin: 5px 0; color: #e5e7eb; }
        a { color: #38f6fc; text-decoration: none; font-weight: bold; }
        a:hover { text-decoration: underline; }
        .footer { text-align: center; padding: 20px; font-size: 14px; color: #94a3b8; }
        .footer a { color: #38f6fc; }
        .wave-bg { position: absolute; top: 0; left: 0; right: 0; height: 100px; background: url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320"%3E%3Cpath fill="none" stroke="rgba(34, 211, 238, 0.2)" stroke-width="2" d="M0,160 C320,100 640,100 960,160 C1280,220 1440,220 1440,220"/%3E%3Ccircle cx="360" cy="120" r="4" fill="rgba(34, 211, 238, 0.5)"/%3E%3Ccircle cx="720" cy="180" r="4" fill="rgba(139, 92, 246, 0.5)"/%3E%3Ccircle cx="1080" cy="140" r="4" fill="rgba(236, 72, 153, 0.5)"/%3E%3C/svg%3E'); opacity: 0.3; }
        @media (max-width: 600px) {
          .container { padding: 10px; }
          .header h1 { font-size: 24px; }
          h2 { font-size: 18px; }
          p { font-size: 14px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="wave-bg"></div>
        <div class="header">
          <h1>Password Reset Request</h1>
          <p>Timeless Elegance</p>
        </div>
        <div class="content">
          <h2>Reset Your Password</h2>
          <p>Hello ${user.name},</p>
          <p>We received a request to reset your password. Click the link below to set a new password:</p>
          <p><a href="${resetLink}">Reset Password</a></p>
          <p>This link will expire in 1 hour. If you did not request a password reset, please ignore this email.</p>
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
    to: email,
    subject: "Password Reset Request - Timeless Elegance",
    text: `Hello ${user.name},\n\nWe received a request to reset your password. Click the link to set a new password: ${resetLink}\n\nThis link will expire in 1 hour. If you did not request a password reset, please ignore this email.\n\nTimeless Elegance`,
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
  res.status(200).json({ message: "Password reset link sent to your email" });
});

// Reset password with token
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    res.status(400);
    throw new Error("Token and password are required");
  }
  if (!validator.isStrongPassword(password, { minSymbols: 0 })) {
    res.status(400);
    throw new Error("Password must be strong (min 8 chars, with letters and numbers)");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);
    const user = await userModel.findById(decoded._id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    const salt = await bcrypt.genSalt(10);
    user.hashed_password = await bcrypt.hash(password, salt);
    await user.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      res.status(400);
      throw new Error("Reset token has expired");
    }
    res.status(400);
    throw new Error("Invalid reset token");
  }
});

// Delete user account
export const deleteUser = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Check if user exists
  const user = await userModel.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  // Prevent admin deletion
  if (user.user_type === "admin") {
    res.status(403);
    throw new Error("Admin accounts cannot be deleted");
  }

  // Delete associated data
  await cartModel.deleteOne({ user_id: userId }); 
  await userModel.deleteOne({ _id: userId });

  res.status(200).json({ message: "Account deleted successfully" });
});