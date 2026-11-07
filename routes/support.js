const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const SupportTicket = require("../models/SupportTicket");
const { requireLogin, requireAdmin } = require("../middleware/auth");

// CUSTOMER: CREATE SUPPORT TICKET
router.post("/", requireLogin, async (req, res) => {
  try {
    const { subject, message, category } = req.body;

    if (
      typeof subject !== "string" ||
      !subject.trim() ||
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Subject and message are required."
      });
    }

    const ticket = await SupportTicket.create({
      customer: req.user._id,
      subject: subject.trim(),
      message: message.trim(),
      category: category || "other"
    });

    res.status(201).json({
      success: true,
      message: "Support request submitted successfully.",
      ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to submit support request."
    });
  }
});

// CUSTOMER: VIEW OWN SUPPORT TICKETS
router.get("/", requireLogin, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({
      customer: req.user._id
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      tickets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to load support requests."
    });
  }
});

// ADMIN: VIEW ALL SUPPORT TICKETS
router.get("/admin/all", requireLogin, requireAdmin, async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .populate("customer", "fullName email mobile")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      tickets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to load support tickets."
    });
  }
});

// ADMIN: REPLY TO SUPPORT TICKET
router.patch(
  "/admin/:id/reply",
  requireLogin,
  requireAdmin,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid ticket ID."
        });
      }

      const { adminReply, status } = req.body;

      if (
        typeof adminReply !== "string" ||
        !adminReply.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Reply message is required."
        });
      }

      const allowedStatuses = [
        "open",
        "in_progress",
        "resolved",
        "closed"
      ];

      if (status && !allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid ticket status."
        });
      }

      const ticket = await SupportTicket.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            adminReply: adminReply.trim(),
            status: status || "in_progress",
            repliedBy: req.user._id,
            repliedAt: new Date()
          }
        },
        {
          new: true,
          runValidators: true
        }
      );

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Support ticket not found."
        });
      }

      res.json({
        success: true,
        message: "Reply sent successfully.",
        ticket
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Unable to send reply."
      });
    }
  }
);

module.exports = router;
