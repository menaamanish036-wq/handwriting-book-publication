const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const CompanyCertificate = require("../models/CompanyCertificate");

const {
    requireLogin,
    requireAdmin
} = require("../middleware/auth");

// VERIFY THAT FILE WAS UPLOADED BY THE ADMIN
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

    if (!file || !file.metadata) {
        return false;
    }

    return file.metadata.uploadedBy === String(userId);
}

// ALLOWED DOCUMENT FORMATS
const ALLOWED_FILE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf"
];

// PUBLIC: GET ACTIVE COMPANY CERTIFICATES
router.get("/", async (req, res) => {
    try {
        const certificates = await CompanyCertificate.find({
            isActive: true
        })
            .sort({ createdAt: -1 })
            .lean();

        return res.json({
            success: true,
            certificates,
            certificate: certificates[0] || null
        });

    } catch (error) {
        console.error("Public certificate error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load company documents."
        });
    }
});

// ADMIN: GET ALL COMPANY CERTIFICATES
router.get(
    "/admin",
    requireLogin,
    requireAdmin,
    async (req, res) => {
        try {
            const certificates = await CompanyCertificate.find()
                .sort({ createdAt: -1 })
                .lean();

            return res.json({
                success: true,
                certificates,
                certificate: certificates[0] || null
            });

        } catch (error) {
            console.error("Admin certificate error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to load company documents."
            });
        }
    }
);

// ADMIN: ADD COMPANY CERTIFICATE
router.post(
    "/",
    requireLogin,
    requireAdmin,
    async (req, res) => {
        try {
            const {
                title,
                description,
                fileId,
                fileName,
                fileType
            } = req.body;

            if (
                typeof title !== "string" ||
                !title.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Document title is required."
                });
            }

            if (
                typeof fileName !== "string" ||
                !fileName.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Document file name is required."
                });
            }

            if (!ALLOWED_FILE_TYPES.includes(fileType)) {
                return res.status(400).json({
                    success: false,
                    message: "Unsupported document format."
                });
            }

            const validFile = await verifyAdminFile(
                fileId,
                req.user._id
            );

            if (!validFile) {
                return res.status(400).json({
                    success: false,
                    message: "Uploaded file not found or not owned by admin."
                });
            }

            const certificate = await CompanyCertificate.create({
                title: title.trim(),

                description:
                    typeof description === "string"
                        ? description.trim()
                        : "",

                fileId: new mongoose.Types.ObjectId(fileId),
                fileName: fileName.trim(),
                fileType,
                isActive: true,
                uploadedBy: req.user._id
            });

            return res.status(201).json({
                success: true,
                message: "Company document added successfully.",
                certificate
            });

        } catch (error) {
            console.error("Add certificate error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to add company document."
            });
        }
    }
);

// ADMIN: UPDATE COMPANY CERTIFICATE
router.patch(
    "/:id",
    requireLogin,
    requireAdmin,
    async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid document ID."
                });
            }

            const certificate = await CompanyCertificate.findById(
                req.params.id
            );

            if (!certificate) {
                return res.status(404).json({
                    success: false,
                    message: "Company document not found."
                });
            }

            const {
                title,
                description,
                fileId,
                fileName,
                fileType,
                isActive
            } = req.body;

            // UPDATE TITLE
            if (title !== undefined) {
                if (
                    typeof title !== "string" ||
                    !title.trim()
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid document title."
                    });
                }

                certificate.title = title.trim();
            }

            // UPDATE DESCRIPTION
            if (description !== undefined) {
                if (typeof description !== "string") {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid document description."
                    });
                }

                certificate.description = description.trim();
            }

            // UPDATE FILE
            if (fileId !== undefined) {
                const validFile = await verifyAdminFile(
                    fileId,
                    req.user._id
                );

                if (!validFile) {
                    return res.status(400).json({
                        success: false,
                        message: "Uploaded file is invalid."
                    });
                }

                certificate.fileId =
                    new mongoose.Types.ObjectId(fileId);
            }

            // UPDATE FILE NAME
            if (fileName !== undefined) {
                if (
                    typeof fileName !== "string" ||
                    !fileName.trim()
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid document file name."
                    });
                }

                certificate.fileName = fileName.trim();
            }

            // UPDATE FILE TYPE
            if (fileType !== undefined) {
                if (!ALLOWED_FILE_TYPES.includes(fileType)) {
                    return res.status(400).json({
                        success: false,
                        message: "Unsupported file format."
                    });
                }

                certificate.fileType = fileType;
            }

            // UPDATE VISIBILITY
            if (isActive !== undefined) {
                if (typeof isActive !== "boolean") {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid active status."
                    });
                }

                certificate.isActive = isActive;
            }

            // RECORD LAST ADMIN WHO UPDATED THE DOCUMENT
            certificate.updatedBy = req.user._id;

            await certificate.save();

            return res.json({
                success: true,
                message: "Company document updated successfully.",
                certificate
            });

        } catch (error) {
            console.error("Update certificate error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to update company document."
            });
        }
    }
);

// ADMIN: DELETE COMPANY CERTIFICATE
router.delete(
    "/:id",
    requireLogin,
    requireAdmin,
    async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid document ID."
                });
            }

            const certificate =
                await CompanyCertificate.findByIdAndDelete(
                    req.params.id
                );

            if (!certificate) {
                return res.status(404).json({
                    success: false,
                    message: "Company document not found."
                });
            }

            return res.json({
                success: true,
                message: "Company document deleted successfully."
            });

        } catch (error) {
            console.error("Delete certificate error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to delete company document."
            });
        }
    }
);

module.exports = router;
