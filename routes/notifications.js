const express = require("express");
const router = express.Router();

const Notification = require("../models/Notification");
const { requireLogin, requireAdmin } = require("../middleware/auth");

// GET CUSTOMER/ADMIN NOTIFICATIONS
router.get("/", requireLogin, async (req, res) => {
  try {
    const role = req.user.role;

    const notifications = await Notification.find({
      $or: [
        { recipient: req.user._id },
        { recipient: null, target: "all" },
        { recipient: null, target: role }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to load notifications."
    });
  }
});

// MARK NOTIFICATION AS READ
router.patch("/:id/read", requireLogin, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      $or: [
        { recipient: req.user._id },
        { recipient: null, target: "all" },
        { recipient: null, target: req.user.role }
      ]
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found."
      });
    }

    notification.isRead = true;
    await notification.save();

    res.json({
      success: true,
      message: "Notification marked as read."
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to update notification."
    });
  }
});

// CREATE NOTIFICATION (ADMIN ONLY)
router.post("/", requireLogin, requireAdmin, async (req, res) => {
  try {
    const { title, message, target, recipient, type } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required."
      });
    }

    const notification = await Notification.create({
      title,
      message,
      target: recipient ? "customer" : (target || "all"),
      recipient: recipient || null,
      type: type || "general",
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: "Notification created successfully.",
      notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to create notification."
    });
  }
});

module.exports = router;
