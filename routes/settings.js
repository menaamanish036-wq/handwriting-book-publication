const express = require("express");
const router = express.Router();

const SiteSetting = require("../models/SiteSetting");
const { requireLogin, requireAdmin } = require("../middleware/auth");

// CUSTOMER: VIEW PAYMENT AND CONTACT SETTINGS
router.get("/", requireLogin, async (req, res) => {
  try {
    const settings = await SiteSetting.find({
      key: {
        $in: [
          "payment_qr",
          "payment_upi_id",
          "payment_payee_name",
          "whatsapp_number",
          "support_email"
        ]
      }
    }).lean();

    const result = {};

    settings.forEach((setting) => {
      result[setting.key] = setting.value;
    });

    res.json({
      success: true,
      settings: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to load settings."
    });
  }
});

// ADMIN: VIEW ALL SETTINGS
router.get("/admin/all", requireLogin, requireAdmin, async (req, res) => {
  try {
    const settings = await SiteSetting.find()
      .sort({ key: 1 })
      .lean();

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to load admin settings."
    });
  }
});

// ADMIN: CREATE OR UPDATE A SETTING
router.put("/:key", requireLogin, requireAdmin, async (req, res) => {
  try {
    const allowedKeys = [
      "payment_qr",
      "payment_upi_id",
      "payment_payee_name",
      "whatsapp_number",
      "support_email",
      "website_name",
      "website_description"
    ];

    const { key } = req.params;
    const { value } = req.body;

    if (!allowedKeys.includes(key)) {
      return res.status(400).json({
        success: false,
        message: "Invalid setting key."
      });
    }

    if (value === undefined || value === null) {
      return res.status(400).json({
        success: false,
        message: "Setting value is required."
      });
    }

    const setting = await SiteSetting.findOneAndUpdate(
      { key },
      {
        $set: {
          value,
          updatedBy: req.user._id
        }
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );

    res.json({
      success: true,
      message: "Setting updated successfully.",
      setting
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to update setting."
    });
  }
});

module.exports = router;
