import asyncHandler from "express-async-handler";
import Notification from "../Models/notificationModel.js";

export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user_id: req.user._id }).sort({ createdAt: -1 });
  res.json({ notifications });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }
  if (notification.user_id.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to modify this notification");
  }
  notification.read = true;
  await notification.save();
  res.json({ notification });
});