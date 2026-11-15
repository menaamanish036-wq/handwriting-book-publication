const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Showcase = require("../models/Showcase");

const {
    requireLogin,
    requireAdmin
} = require("../middleware/auth");

// Verify uploaded image belongs to logged-in admin
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
        ["image/jpeg", "image/png", "image/webp"].includes(
            file.contentType
        )
    );
}

// CUSTOMER: VIEW PUBLISHED PHOTOS
router.get("/", requireLogin, async (req, res) => {
    try {
        const items = await Showcase.find({
            isPublished: true
        })
            .sort({
                displayOrder: 1,
                createdAt: -1
            })
            .lean();

        return res.json({
            success: true,
            items
        });

    } catch (error) {
        console.error("Showcase loading error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load work gallery."
        });
    }
});

// ADMIN: VIEW ALL PHOTOS
router.get(
    "/admin/all",
    requireLogin,
    requireAdmin,
    async (req, res) => {
        try {
            const items = await Showcase.find()
                .sort({
                    createdAt: -1
                })
                .lean();

            return res.json({
                success: true,
                items
            });

        } catch (error) {
            console.error("Admin showcase error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to load gallery photos."
            });
        }
    }
);

// ADMIN: ADD PHOTO
router.post(
    "/",
    requireLogin,
    requireAdmin,
    async (req, res) => {
        try {
            const {
                fileId,
                fileName,
                fileType,
                displayOrder
            } = req.body;

            if (!fileId) {
                return res.status(400).json({
                    success: false,
                    message: "Please upload an image."
                });
            }

            const validFile = await verifyAdminFile(
                fileId,
                req.user._id
            );

            if (!validFile) {
                return res.status(400).json({
                    success: false,
                    message: "Uploaded image is invalid."
                });
            }

            if (
                !["image/jpeg", "image/png", "image/webp"].includes(fileType)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Only JPG, PNG and WEBP images are allowed."
                });
            }

            const order = Number(displayOrder || 0);

            if (!Number.isFinite(order)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid display order."
                });
            }

            const item = await Showcase.create({
                fileId: new mongoose.Types.ObjectId(fileId),
                fileName: typeof fileName === "string"
                    ? fileName.trim()
                    : "",
                fileType,
                displayOrder: order,
                isPublished: false,
                uploadedBy: req.user._id
            });

            return res.status(201).json({
                success: true,
                message: "Gallery photo added successfully.",
                item
            });

        } catch (error) {
            console.error("Add showcase photo error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to add gallery photo."
            });
        }
    }
);

// ADMIN: PUBLISH OR HIDE PHOTO
router.patch(
    "/:id",
    requireLogin,
    requireAdmin,
    async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid gallery photo ID."
                });
            }

            const item = await Showcase.findById(req.params.id);

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: "Gallery photo not found."
                });
            }

            const { isPublished, displayOrder } = req.body;

            if (isPublished !== undefined) {
                if (typeof isPublished !== "boolean") {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid publish status."
                    });
                }

                item.isPublished = isPublished;
            }

            if (displayOrder !== undefined) {
                const order = Number(displayOrder);

                if (!Number.isFinite(order)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid display order."
                    });
                }

                item.displayOrder = order;
            }

            await item.save();

            return res.json({
                success: true,
                message: "Gallery photo updated successfully.",
                item
            });

        } catch (error) {
            console.error("Update showcase photo error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to update gallery photo."
            });
        }
    }
);

// ADMIN: DELETE PHOTO
router.delete(
    "/:id",
    requireLogin,
    requireAdmin,
    async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid gallery photo ID."
                });
            }

            const item = await Showcase.findByIdAndDelete(
                req.params.id
            );

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: "Gallery photo not found."
                });
            }

            return res.json({
                success: true,
                message: "Gallery photo deleted successfully."
            });

        } catch (error) {
            console.error("Delete showcase photo error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to delete gallery photo."
            });
        }
    }
);

module.exports = router;
