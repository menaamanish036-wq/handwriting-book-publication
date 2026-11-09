const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const upload = require("../middleware/upload");
const User = require("../models/User");

const {
    saveFile,
    getFileStream
} = require("../services/fileStorage");

const Showcase = require("../models/Showcase");
const CompanyCertificate = require("../models/CompanyCertificate");
const Certificate = require("../models/Certificate");

// =====================================
// UPLOAD FILE
// =====================================

router.post(
    "/",
    async (req, res, next) => {
        const { requireLogin } = require("../middleware/auth");
        return requireLogin(req, res, next);
    },
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

            return res.status(201).json({
                success: true,
                message: "File uploaded successfully.",
                file: result
            });

        } catch (error) {
            console.error("File upload error:", error);

            return res.status(500).json({
                success: false,
                message: "File upload failed."
            });
        }
    }
);

// =====================================
// VIEW FILE
// =====================================

router.get("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid file ID."
            });
        }

        const fileId = new mongoose.Types.ObjectId(
            req.params.id
        );

        const fileRecord = await mongoose.connection.db
            .collection("uploads.files")
            .findOne({
                _id: fileId
            });

        if (!fileRecord) {
            return res.status(404).json({
                success: false,
                message: "File not found."
            });
        }

        // =====================================
        // PUBLIC COMPANY CERTIFICATE ACCESS
        // =====================================

        const publicCertificate =
            await CompanyCertificate.findOne({
                fileId: fileId,
                isActive: true
            }).lean();

        let allowed = Boolean(publicCertificate);

        // =====================================
        // PRIVATE FILE ACCESS
        // =====================================

        if (!allowed) {

            if (!req.session || !req.session.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Please login to view this file."
                });
            }

            const user = await User.findById(
                req.session.userId
            );

            if (!user || user.isBlocked) {
                return res.status(401).json({
                    success: false,
                    message: "Account not available. Please login again."
                });
            }

            const isAdmin = user.role === "admin";

            // =====================================
            // FILE OWNER ACCESS
            // =====================================

            const isOwner =
                fileRecord.metadata &&
                fileRecord.metadata.uploadedBy ===
                String(user._id);

            // =====================================
            // CUSTOMER OWN CERTIFICATE ACCESS
            // =====================================

            const ownCertificate =
                user.role === "customer"
                    ? await Certificate.findOne({
                        customer: user._id,
                        certificateFileId: String(fileId),
                        status: "issued"
                    }).lean()
                    : null;

            // =====================================
            // PUBLISHED SHOWCASE ACCESS
            // =====================================

            const publishedShowcase =
                await Showcase.findOne({
                    fileId: fileId,
                    isPublished: true
                }).lean();

            allowed =
                isAdmin ||
                isOwner ||
                Boolean(ownCertificate) ||
                Boolean(publishedShowcase);
        }

        // =====================================
        // ACCESS DENIED
        // =====================================

        if (!allowed) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to view this file."
            });
        }

        // =====================================
        // ALLOWED FILE TYPES
        // =====================================

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf"
        ];

        const contentType =
            fileRecord.contentType ||
            "application/octet-stream";

        if (!allowedTypes.includes(contentType)) {
            return res.status(415).json({
                success: false,
                message: "Unsupported file format."
            });
        }

        // =====================================
        // FILE RESPONSE
        // =====================================

        res.setHeader(
            "Content-Type",
            contentType
        );

        res.setHeader(
            "X-Content-Type-Options",
            "nosniff"
        );

        res.setHeader(
            "Content-Disposition",
            "inline"
        );

        res.setHeader(
            "Cache-Control",
            "private, no-store"
        );

        const stream = getFileStream(req.params.id);

        stream.on("error", (error) => {
            console.error("File stream error:", error);

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
        console.error("View file error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load file."
        });
    }
});

module.exports = router;
