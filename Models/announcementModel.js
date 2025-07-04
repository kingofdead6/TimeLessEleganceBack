import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true,},
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Announcement || mongoose.model("Announcement", announcementSchema);
