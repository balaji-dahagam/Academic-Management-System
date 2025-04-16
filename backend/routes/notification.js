const express = require("express");
const router = express.Router();
const Notification = require("../schemes/Notification");
// const notificationController = require("../controllers/notificationController");
const fetchUser=require("../middleware/fetchUser");


router.get("/notifications",fetchUser,async(req,res)=>{
    try {
        const userId = req.user; // Assuming you have auth middleware
        console.log(userId);
        const notifications = await Notification.find({ userId})
          .sort({ createdAt: -1 })
          .lean();
        
        res.json(notifications);
      } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error fetching notifications" });
      }
});

router.patch("/:notificationId/seen",fetchUser,async(req,res)=>{
    try {
        const { notificationId } = req.params;
        
        await Notification.findByIdAndUpdate(notificationId, { seen: true });
        
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ message: "Error updating notification" });
      }
});

router.patch("mark-all-seen",fetchUser,async(req,res)=>{
    try {
        const { userId } = req.user;
        
        await Notification.updateMany(
          { userId, seen: false },
          { $set: { seen: true } }
        );
        
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ message: "Error updating notifications" });
      }
});

exports.createNotification = async (userId, userType, notificationData) => {
    try {
      const notification = new Notification({
        userId,
        userType,
        ...notificationData
      });
      
      await notification.save();
      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  };

  module.exports = router;

