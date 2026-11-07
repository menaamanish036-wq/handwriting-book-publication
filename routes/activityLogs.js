const express = require("express");
const router = express.Router();

const ActivityLog = require("../models/ActivityLog");
const { requireLogin, requireAdmin } = require("../middleware/auth");

// ADMIN: VIEW ACTIVITY LOGS
router.get("/", requireLogin, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));

    const logs = await ActivityLog.find()
      .populate("actor", "fullName email mobile")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await ActivityLog.countDocuments();

    res.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to load activity logs."
    });
  }
});

module.exports = router;
