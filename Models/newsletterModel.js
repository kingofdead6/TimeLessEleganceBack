import mongoose from 'mongoose';

const newsLetterSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
});

export default mongoose.model('NewsLetter', newsLetterSchema);