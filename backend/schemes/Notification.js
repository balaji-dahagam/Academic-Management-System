const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, refPath: "userType", required: true },
  // userType: { type: String, enum: ["Student", "Faculty"], required: true },
  title: { type: String, required: true }, // Added title for better display
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ["Class", "Attendance", "System", "Alert"], 
    default: "System" 
  },
  relatedId: { type: mongoose.Schema.Types.ObjectId }, // For linking to specific items
  seen: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true } // Added index for sorting
});

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;