const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Showcase = require("../models/Showcase");

const {
    requireLogin,
    requireAdmin
} = require("../middleware/auth");

// VERIFY THAT FILE BELONGS TO THE LOGGED-IN ADMIN
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
        file.metadata.uploadedBy === String(userId)
    );
}

// CUSTOMER: VIEW PUBLISHED SHOWCASE ITEMS
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
            message: "Unable to load work showcase."
        });
    }
});

// ADMIN: VIEW ALL SHOWCASE ITEMS
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
                message: "Unable to load showcase items."
            });
        }
    }
);

// ADMIN: ADD SHOWCASE ITEM
router.post(
    "/",
    requireLogin,
    requireAdmin,
    async (req, res) => {
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

            if (
                typeof title !== "string" ||
                !title.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "A title is required."
                });
            }

            if (
                fileId &&
                !(await verifyAdminFile(fileId, req.user._id))
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Uploaded file is invalid or not owned by admin."
                });
            }

            const item = await Showcase.create({
                title: title.trim(),

                description:
                    typeof description === "string"
                        ? description.trim()
                        : "",

                customerName:
                    typeof customerName === "string"
                        ? customerName.trim()
                        : "",

                workType:
                    typeof workType === "string" && workType.trim()
                        ? workType.trim()
                        : "Handwriting Work",

                fileId: fileId
                    ? new mongoose.Types.ObjectId(fileId)
                    : null,

                fileName:
                    typeof fileName === "string"
                        ? fileName.trim()
                        : "",

                fileType:
                    typeof fileType === "string"
                        ? fileType
                        : "",

                displayOrder:
                    displayOrder === undefined
                        ? 0
                        : Number(displayOrder),

                isPublished: false,
                uploadedBy: req.user._id
            });

            return res.status(201).json({
                success: true,
                message: "Showcase item added successfully.",
                item
            });

        } catch (error) {
            console.error("Add showcase error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to add showcase item."
            });
        }
    }
);

// ADMIN: UPDATE OR PUBLISH/HIDE SHOWCASE ITEM
router.patch(
    "/:id",
    requireLogin,
    requireAdmin,
    async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid showcase item ID."
                });
            }

            const item = await Showcase.findById(req.params.id);

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: "Showcase item not found."
                });
            }

            const {
                title,
                description,
                customerName,
                workType,
                fileId,
                fileName,
                fileType,
                displayOrder,
                isPublished
            } = req.body;

            if (title !== undefined) {
                if (
                    typeof title !== "string" ||
                    !title.trim()
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid showcase title."
                    });
                }

                item.title = title.trim();
            }

            if (description !== undefined) {
                if (typeof description !== "string") {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid description."
                    });
                }

                item.description = description.trim();
            }

            if (customerName !== undefined) {
                if (typeof customerName !== "string") {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid customer name."
                    });
                }

                item.customerName = customerName.trim();
            }

            if (workType !== undefined) {
                if (typeof workType !== "string") {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid work type."
                    });
                }

                item.workType = workType.trim();
            }

            if (fileId !== undefined) {
                if (fileId === null || fileId === "") {
                    item.fileId = null;
                } else {
                    const validFile = await verifyAdminFile(
                        fileId,
                        req.user._id
                    );

                    if (!validFile) {
                        return res.status(400).json({
                            success: false,
                            message: "Uploaded file is invalid or not owned by admin."
                        });
                    }

                    item.fileId =
                        new mongoose.Types.ObjectId(fileId);
                }
            }

            if (fileName !== undefined) {
                if (typeof fileName !== "string") {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid file name."
                    });
                }

                item.fileName = fileName.trim();
            }

            if (fileType !== undefined) {
                if (typeof fileType !== "string") {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid file type."
                    });
                }

                item.fileType = fileType;
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

            if (isPublished !== undefined) {
                if (typeof isPublished !== "boolean") {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid publish status."
                    });
                }

                item.isPublished = isPublished;
            }

            await item.save();

            return res.json({
                success: true,
                message: "Showcase item updated successfully.",
                item
            });

        } catch (error) {
            console.error("Update showcase error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to update showcase item."
            });
        }
    }
);

// ADMIN: DELETE SHOWCASE ITEM
router.delete(
    "/:id",
    requireLogin,
    requireAdmin,
    async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid showcase item ID."
                });
            }

            const item = await Showcase.findByIdAndDelete(
                req.params.id
            );

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: "Showcase item not found."
                });
            }

            return res.json({
                success: true,
                message: "Showcase item deleted successfully."
            });

        } catch (error) {
            console.error("Delete showcase error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to delete showcase item."
            });
        }
    }
);

module.exports = router;
