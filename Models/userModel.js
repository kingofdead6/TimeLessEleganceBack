import mongoose from 'mongoose';
import validator from 'validator';

// Define the User schema
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, validate: [validator.isEmail, 'Invalid email'] },
    hashed_password: { type: String, required: true },
    phone_number: { type: String, required: true },
    user_type: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    profile_image: { type: String, default: null },
    wilaya: { type: String, required: true },
    resetToken: { type: String },
    resetTokenExpires: { type: Date },
  },
  { timestamps: true }
);

// Export the User model, ensuring it's only created once
export default mongoose.models.User || mongoose.model('User', UserSchema);