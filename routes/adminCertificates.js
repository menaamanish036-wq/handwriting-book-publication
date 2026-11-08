const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Certificate = require("../models/Certificate");
const Enrollment = require("../models/Enrollment");

const upload = require("../middleware/upload");

const {
    requireLogin,
    requireAdmin
} = require("../middleware/auth");

const {
    saveFile,
    deleteFile
} = require("../services/fileStorage");

router.use(requireLogin, requireAdmin);

// GET ALL CUSTOMER CERTIFICATES
router.get("/", async (req, res) => {
    try {
        const certificates = await Certificate.find()
            .populate("customer", "fullName customerId email mobile")
            .populate("enrollment", "projectSnapshot registrationStatus")
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            certificates
        });

    } catch (error) {
        console.error("Certificate list error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load certificates."
        });
    }
});

// ISSUE CUSTOMER COMPLETION CERTIFICATE
router.post(
    "/",
    upload.single("file"),
    async (req, res) => {
        let uploadedFileId = null;

        try {
            const {
                customerId,
                enrollmentId,
                certificateNumber,
                projectName,
                completionDate,
                issueDate,
                remarks
            } = req.body;

            if (
                !mongoose.isValidObjectId(customerId) ||
                !mongoose.isValidObjectId(enrollmentId)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid customer or enrollment ID."
                });
            }

            if (
                !certificateNumber ||
                !certificateNumber.trim() ||
                !projectName ||
                !projectName.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Certificate number and project name are required."
                });
            }

            const enrollment = await Enrollment.findOne({
                _id: enrollmentId,
                customer: customerId
            });

            if (!enrollment) {
                return res.status(404).json({
                    success: false,
                    message: "Customer enrollment not found."
                });
            }

            if (enrollment.registrationStatus !== "approved") {
                return res.status(400).json({
                    success: false,
                    message: "Customer registration must be approved."
                });
            }

            const existing = await Certificate.findOne({
                certificateNumber: certificateNumber.trim()
            });

            if (existing) {
                return res.status(409).json({
                    success: false,
                    message: "Certificate number already exists."
                });
            }

            let validIssueDate = new Date();

            if (issueDate) {
                validIssueDate = new Date(issueDate);

                if (Number.isNaN(validIssueDate.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid issue date."
                    });
                }
            }

            let validCompletionDate = null;

            if (completionDate) {
                validCompletionDate = new Date(completionDate);

                if (Number.isNaN(validCompletionDate.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid completion date."
                    });
                }
            }

            if (req.file) {
                const file = await saveFile(
                    req.file,
                    req.user._id
                );

                uploadedFileId = String(file.fileId);
            }

            const certificate = await Certificate.create({
                customer: customerId,
                enrollment: enrollmentId,
                certificateNumber: certificateNumber.trim(),
                projectName: projectName.trim(),
                issueDate: validIssueDate,
                completionDate: validCompletionDate,
                certificateFileId: uploadedFileId,
                status: "issued",
                remarks: typeof remarks === "string"
                    ? remarks.trim()
                    : "",
                issuedBy: req.user._id
            });

            return res.status(201).json({
                success: true,
                message: "Customer completion certificate issued successfully.",
                certificate
            });

        } catch (error) {
            if (uploadedFileId) {
                try {
                    await deleteFile(uploadedFileId);
                } catch (deleteError) {
                    console.error("Uploaded file cleanup error:", deleteError);
                }
            }

            console.error("Certificate issue error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to issue certificate."
            });
        }
    }
);

// UPDATE CERTIFICATE STATUS AND REMARKS
router.patch("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid certificate ID."
            });
        }

        const certificate = await Certificate.findById(
            req.params.id
        );

        if (!certificate) {
            return res.status(404).json({
                success: false,
                message: "Certificate not found."
            });
        }

        const { status, remarks } = req.body;

        if (
            status !== undefined &&
            !["issued", "revoked"].includes(status)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid certificate status."
            });
        }

        if (status !== undefined) {
            certificate.status = status;
        }

        if (remarks !== undefined) {
            if (typeof remarks !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Invalid remarks."
                });
            }

            certificate.remarks = remarks.trim();
        }

        await certificate.save();

        return res.json({
            success: true,
            message: "Certificate updated successfully.",
            certificate
        });

    } catch (error) {
        console.error("Certificate update error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update certificate."
        });
    }
});

// DELETE CERTIFICATE
router.delete("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid certificate ID."
            });
        }

        const certificate = await Certificate.findById(
            req.params.id
        );

        if (!certificate) {
            return res.status(404).json({
                success: false,
                message: "Certificate not found."
            });
        }

        if (certificate.certificateFileId) {
            try {
                await deleteFile(certificate.certificateFileId);
            } catch (error) {
                console.error("Certificate file deletion error:", error);
            }
        }

        await certificate.deleteOne();

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
});

module.exports = router;
