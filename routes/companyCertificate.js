const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const CompanyCertificate = require("../models/CompanyCertificate");
const { requireLogin, requireAdmin } = require("../middleware/auth");

// CUSTOMER: VIEW COMPANY CERTIFICATE
router.get("/", requireLogin, async (req, res) => {
  try {
    const certificate = await CompanyCertificate.findOne({
      isActive: true
    }).lean();

    res.json({
      success: true,
      certificate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to load company certificate."
    });
  }
});

// ADMIN: VIEW COMPANY CERTIFICATE
router.get("/admin", requireLogin, requireAdmin, async (req, res) => {
  try {
    const certificate = await CompanyCertificate.findOne().lean();

    res.json({
      success: true,
      certificate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to load certificate."
    });
  }
});

// ADMIN: ADD OR UPDATE COMPANY CERTIFICATE DETAILS
router.put("/", requireLogin, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      fileId,
      fileName,
      fileType,
      isActive
    } = req.body;

    if (
      fileId &&
      !mongoose.isValidObjectId(fileId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid certificate file ID."
      });
    }

    const updates = {
      updatedBy: req.user._id
    };

    if (title !== undefined) updates.title = title;
    if (fileId !== undefined) updates.fileId = fileId || null;
    if (fileName !== undefined) updates.fileName = fileName;
    if (fileType !== undefined) updates.fileType = fileType;
    if (isActive !== undefined) updates.isActive = isActive;

    const certificate = await CompanyCertificate.findOneAndUpdate(
      {},
      { $set: updates },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    res.json({
      success: true,
      message: "Company certificate details saved.",
      certificate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to save company certificate."
    });
  }
});

// ADMIN: REMOVE COMPANY CERTIFICATE
router.delete("/", requireLogin, requireAdmin, async (req, res) => {
  try {
    await CompanyCertificate.deleteMany({});

    res.json({
      success: true,
      message: "Company certificate removed."
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to remove company certificate."
    });
  }
});

module.exports = router;
