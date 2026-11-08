const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const CompanyCertificate = require("../models/CompanyCertificate");

const {
    requireLogin,
    requireAdmin
} = require("../middleware/auth");

// CHECK THAT THE UPLOADED FILE BELONGS TO ADMIN
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

    if (!file) {
        return false;
    }

    return (
        file.metadata &&
        file.metadata.uploadedBy === String(userId)
    );
}

// PUBLIC: VIEW ACTIVE COMPANY DOCUMENTS
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

// ADMIN: VIEW ALL COMPANY DOCUMENTS
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

// ADMIN: ADD A NEW COMPANY DOCUMENT
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

            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp",
                "application/pdf"
            ];

            if (!allowedTypes.includes(fileType)) {
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

// ADMIN: UPDATE A COMPANY DOCUMENT
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

            if (description !== undefined) {
                if (typeof description !== "string") {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid document description."
                    });
                }

                certificate.description = description.trim();
            }

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

            if (fileType !== undefined) {
                const allowedTypes = [
                    "image/jpeg",
                    "image/png",
                    "image/webp",
                    "application/pdf"
                ];

                if (!allowedTypes.includes(fileType
