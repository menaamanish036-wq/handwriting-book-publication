const express = require("express");
const router = express.Router();

const User = require("../models/User");
const { requireLogin, requireAdmin } = require("../middleware/auth");

// GET ALL CUSTOMERS (ADMIN ONLY)
router.get("/", requireLogin, requireAdmin, async (req, res) => {
  try {
    const customers = await User.find({ role: "customer" })
      .select("fullName customerId email mobile whatsapp accountStatus isBlocked createdAt")
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    res.json({
      success: true,
      customers
    });

  } catch (error) {
    console.error("Admin customer list error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load customers."
    });
  }
});

module.exports = router;
