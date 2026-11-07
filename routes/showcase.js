const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Showcase = require("../models/Showcase");
const { requireLogin, requireAdmin } = require("../middleware/auth");

// CUSTOMER: VIEW PUBLISHED WORK SHOWCASE
router.get("/", requireLogin, async (req, res) => {
  try {
    const items = await Showcase.find({
      isPublished: true
    })
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to load work showcase."
    });
  }
});

// ADMIN: VIEW ALL SHOWCASE ITEMS
router.get("/admin/all", requireLogin, requireAdmin, async (req, res) => {
  try {
    const items = await Showcase.find()
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to load showcase items."
    });
  }
});

// ADMIN: ADD SHOWCASE ITEM
router.post("/", requireLogin, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      customerName,
      workType,
      fileId,
      fileName,
      fileType,
      displayOrder
    } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "A title is required."
      });
    }

    if (fileId && !mongoose.isValidObjectId(fileId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file ID."
      });
    }

    const item = await Showcase.create({
      title: title.trim(),
      description: description || "",
      customerName: customerName || "",
      workType: workType || "Handwriting Work",
      fileId: fileId || null,
      fileName: fileName || "",
      fileType: fileType || "",
      displayOrder: Number(displayOrder) || 0,
      isPublished: false,
      uploadedBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: "Showcase item added successfully.",
      item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to add showcase item."
    });
  }
});

// ADMIN: UPDATE OR PUBLISH/HIDE SHOWCASE ITEM
router.patch("/:id", requireLogin, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid showcase item ID."
      });
    }

    const allowedFields = [
      "title",
      "description",
      "customerName",
      "workType",
      "fileId",
      "fileName",
      "fileType",
      "displayOrder",
      "isPublished"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (
      updates.title !== undefined &&
      (typeof updates.title !== "string" || !updates.title.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid title."
      });
    }

    if (updates.title !== undefined) {
      updates.title = updates.title.trim();
    }

    if (
      updates.fileId &&
      !mongoose.isValidObjectId(updates.fileId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid file ID."
      });
    }

    if (
      updates.isPublished !== undefined &&
      typeof updates.isPublished !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid publish status."
      });
    }

    if (updates.displayOrder !== undefined) {
      updates.displayOrder = Number(updates.displayOrder);

      if (!Number.isFinite(updates.displayOrder)) {
        return res.status(400).json({
          success: false,
          message: "Invalid display order."
        });
      }
    }

    const item = await Showcase.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Showcase item not found."
      });
    }

    res.json({
      success: true,
      message: "Showcase item updated successfully.",
      item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to update showcase item."
    });
  }
});

// ADMIN: DELETE SHOWCASE ITEM
router.delete("/:id", requireLogin, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid showcase item ID."
      });
    }

    const item = await Showcase.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Showcase item not found."
      });
    }

    res.json({
      success: true,
      message: "Showcase item deleted successfully."
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to delete showcase item."
    });
  }
});

module.exports = router;
