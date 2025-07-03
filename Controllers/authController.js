import userModel from '../models/userModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import cloudinary from '../utils/cloudinary.js';

// Generate JWT token for user authentication
const createToken = (_id) => {
  return jwt.sign({ _id }, process.env.JWT_SECRET, { expiresIn: '3d' });
};

// Register a new user
export const registerUser = async (req, res) => {
  const { name, email, password, phone_number, user_type, wilaya } = req.body;

  try {
    // Validate required fields
    if (!name || !email || !password || !phone_number || !wilaya) {
      return res.status(400).json({ message: 'All user fields are required' });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email' });
    }
    if (!validator.isStrongPassword(password, { minSymbols: 0 })) {
      return res.status(400).json({ message: 'Password must be strong (min 8 chars, with letters and numbers)' });
    }

    // Validate user_type
    const userTypeString = String(user_type).trim().toLowerCase();
    const validUserTypes = ['customer', 'admin'];
    if (!validUserTypes.includes(userTypeString)) {
      return res.status(400).json({ message: "Invalid user type. Must be 'customer' or 'admin'" });
    }

    // Check for existing user
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
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
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// Login user and return JWT token
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check user credentials
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.hashed_password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// Get details of the authenticated user
export const getCurrentUser = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
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
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};