const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const CompanyCertificate = require("../models/CompanyCertificate");

const {
    requireLogin,
    requireAdmin
} = require("../middleware/auth");

const ALLOWED_FILE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp"
];

// VERIFY ADMIN UPLOADED FILE
async function verifyAdminFile(fileId, userId) {
    if (!mongoose.isValidObjectId(fileId)) {
        return false;
    }

    if (!mongoose.connection.db) {
        return false;
    }

    const file = await mongoose.connection.db
        .collection("uploads.files")
        .findOne({
            _id: new mongoose.Types.ObjectId(fileId)
        });

    return Boolean(
        file &&
        file.metadata &&
        file.metadata.uploadedBy === String(userId) &&
        ALLOWED_FILE_TYPES.includes(file.contentType)
    );
}

// CUSTOMER: VIEW ACTIVE COMPANY CERTIFICATES
router.get("/", async (req, res) => {
    try {
        const certificates = await CompanyCertificate.find({
            isActive: true,
            fileType: { $in: ALLOWED_FILE_TYPES }
        })
            .sort({ createdAt: -1 })
            .select("fileId fileName fileType createdAt")
            .lean();

        return res.json({
            success: true,
            certificates
        });

    } catch (error) {
        console.error("Public certificate error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load company certificates."
        });
    }
});

// ADMIN: VIEW ALL CERTIFICATES
router.get(
    "/admin",
    requireLogin,
    requireAdmin,
    async (req, res) => {
        try {
            const certificates = await CompanyCertificate.find()
                .sort({ createdAt: -1 })
                .select("fileId fileName fileType isActive createdAt")
                .lean();

            return res.json({
                success: true,
                certificates
            });

        } catch (error) {
            console.error("Admin certificate error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to load company certificates."
            });
        }
    }
);

// ADMIN: UPLOAD CERTIFICATE PHOTO
router.post(
    "/",
    requireLogin,
    requireAdmin,
    async (req, res) => {
        try {
            const {
                fileId,
                fileName,
                fileType
            } = req.body;

            if (
                typeof fileName !== "string" ||
                !fileName.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Certificate photo is required."
                });
            }

            if (!ALLOWED_FILE_TYPES.includes(fileType)) {
                return res.status(400).json({
                    success: false,
                    message: "Only JPG, PNG and WEBP photos are allowed."
                });
            }

            const validFile = await verifyAdminFile(
                fileId,
                req.user._id
            );

            if (!validFile) {
                return res.status(400).json({
                    success: false,
                    message: "Uploaded photo is invalid or not owned by admin."
                });
            }

            const certificate = await CompanyCertificate.create({
                fileId: new mongoose.Types.ObjectId(fileId),
                fileName: fileName.trim(),
                fileType,
                isActive: true,
                uploadedBy: req.user._id
            });

            return res.status(201).json({
                success: true,
                message: "Certificate photo uploaded successfully.",
                certificate
            });

        } catch (error) {
            console.error("Certificate upload error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to upload certificate photo."
            });
        }
    }
);

// ADMIN: HIDE OR SHOW CERTIFICATE
router.patch(
    "/:id",
    requireLogin,
    requireAdmin,
    async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid certificate ID."
                });
            }

            if (typeof req.body.isActive !== "boolean") {
                return res.status(400).json({
                    success: false,
                    message: "Invalid visibility status."
                });
            }

            const certificate = await CompanyCertificate.findById(
                req.params.id
            );

            if (!certificate) {
                return res.status(404).json({
                    success: false,
                    message: "Certificate not found."
                });
            }

            certificate.isActive = req.body.isActive;
            certificate.updatedBy = req.user._id;

            await certificate.save();

            return res.json({
                success: true,
                message: certificate.isActive
                    ? "Certificate is now visible."
                    : "Certificate has been hidden.",
                certificate
            });

        } catch (error) {
            console.error("Certificate update error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to update certificate."
            });
        }
    }
);

// ADMIN: DELETE CERTIFICATE
router.delete(
    "/:id",
    requireLogin,
    requireAdmin,
    async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid certificate ID."
                });
            }

            const certificate =
                await CompanyCertificate.findByIdAndDelete(
                    req.params.id
                );

            if (!certificate) {
                return res.status(404).json({
                    success: false,
                    message: "Certificate not found."
                });
            }

            return res.json({
                success: true,
                message: "Certificate deleted successfully."
            });

        } catch (error) {
            console.error("Certificate delete error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to delete certificate."
            });
        }
    }
);

module.exports = router;
