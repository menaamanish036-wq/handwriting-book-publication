const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const upload = require("../middleware/upload");
const { requireLogin } = require("../middleware/auth");

const {
  saveFile,
  getFileStream
} = require("../services/fileStorage");

const Showcase = require("../models/Showcase");
const CompanyCertificate = require("../models/CompanyCertificate");

// UPLOAD FILE
router.post(
  "/",
  requireLogin,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please select a file."
        });
      }

      const result = await saveFile(
        req.file,
        req.user._id
      );

      res.status(201).json({
        success: true,
        message: "File uploaded successfully.",
        file: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "File upload failed."
      });
    }
  }
);

// VIEW FILE
router.get("/:id", requireLogin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file ID."
      });
    }

    const fileId = new mongoose.Types.ObjectId(req.params.id);

    const fileRecord = await mongoose.connection.db
      .collection("uploads.files")
      .findOne({ _id: fileId });

    if (!fileRecord) {
      return res.status(404).json({
        success: false,
        message: "File not found."
      });
    }

    const isAdmin = req.user.role === "admin";

    const isOwner =
      fileRecord.metadata &&
      fileRecord.metadata.uploadedBy === String(req.user._id);

    let isPublished = false;

    if (!isAdmin && !isOwner) {
      const showcase = await Showcase.findOne({
        fileId,
        isPublished: true
      });

      const certificate = await CompanyCertificate.findOne({
        fileId,
        isActive: true
      });

      isPublished = Boolean(showcase || certificate);
    }

    if (!isAdmin && !isOwner && !isPublished) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view this file."
      });
    }

    res.setHeader(
      "Content-Type",
      fileRecord.contentType || "application/octet-stream"
    );

    res.setHeader(
      "X-Content-Type-Options",
      "nosniff"
    );

    res.setHeader(
      "Content-Disposition",
      "inline"
    );

    const stream = getFileStream(req.params.id);

    stream.on("error", () => {
      if (!res.headersSent) {
        res.status(404).json({
          success: false,
          message: "Unable to read file."
        });
      } else {
        res.destroy();
      }
    });

    stream.pipe(res);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to load file."
    });
  }
});

module.exports = router;
