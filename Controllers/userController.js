import userModel from '../Models/userModel.js';

// Get all users with pagination and filtering
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, user_type, wilaya } = req.query;

    // Build query object for filtering
    const query = {};
    if (user_type) query.user_type = user_type;
    if (wilaya) query.wilaya = wilaya;

    // Fetch users with pagination
    const users = await userModel
      .find(query)
      .select('name email user_type phone_number wilaya createdAt')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    // Count total matching documents
    const total = await userModel.countDocuments(query);

    res.status(200).json({
      users,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
export const getWilayas = async (req, res) => {
  try {
    const wilayas = await userModel
      .distinct('wilaya')
      .where('wilaya').ne(null)
      .where('wilaya').ne('');
    res.status(200).json({ wilayas });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};