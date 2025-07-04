import jwt from 'jsonwebtoken';
import userModel from '../Models/userModel.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded._id) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    const user = await userModel
      .findById(decoded._id)
      .select('name email user_type phone_number wilaya');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const adminMiddleware = (req, res, next) => {
  if (req.user.user_type !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Admin only' });
  }
  next();
};