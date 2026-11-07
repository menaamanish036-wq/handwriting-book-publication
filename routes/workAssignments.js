const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const WorkAssignment = require("../models/WorkAssignment");
const Enrollment = require("../models/Enrollment");
const Salary = require("../models/Salary");
const Notification = require("../models/Notification");

const {
    requireLogin,
    requireAdmin
} = require("../middleware/auth");

// ADMIN: ASSIGN WORK TO CUSTOMER
router.post(
    "/admin",
    requireLogin,
    requireAdmin,
    async (req, res) => {
        try {
            const {
                enrollmentId,
                title,
                totalPages,
                instructions,
                deadline
            } = req.body;

            if (!mongoose.isValidObjectId(enrollmentId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid enrollment ID."
                });
            }

            if (
                typeof title !== "string" ||
                !title.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Work title is required."
                });
            }

            const pages = Number(totalPages);

            if (
                !Number.isInteger(pages) ||
                pages < 1
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Enter a valid page count."
                });
            }

            const enrollment = await Enrollment.findById(
                enrollmentId
            );

            if (!enrollment) {
                return res.status(404).json({
                    success: false,
                    message: "Enrollment not found."
                });
            }

            if (enrollment.registrationStatus !== "approved") {
                return res.status(400).json({
                    success: false,
                    message: "Customer registration is not approved."
                });
            }

            if (pages > enrollment.projectSnapshot.pages) {
                return res.status(400).json({
                    success: false,
                    message: "Assigned pages cannot exceed project pages."
                });
            }

            let workDeadline = null;

            if (deadline) {
                workDeadline = new Date(deadline);

                if (Number.isNaN(workDeadline.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid deadline."
                    });
                }
            }

            const assignment = await WorkAssignment.create({
                customer: enrollment.customer,
                enrollment: enrollment._id,
                project: enrollment.project,
                title: title.trim(),
                totalPages: pages,
                instructions:
                    typeof instructions === "string" &&
                    instructions.trim()
                        ? instructions.trim()
                        : "Write all assigned work in English uppercase letters A-Z.",
                deadline: workDeadline
            });

            try {
                await Notification.create({
                    title: "New Work Assigned",
                    message: `New work "${assignment.title}" has been assigned to you.`,
                    recipient: enrollment.customer,
                    target: "customer",
                    type: "work",
                    createdBy: req.user._id
                });
            } catch (notificationError) {
                console.error(
                    "Work notification error:",
                    notificationError
                );
            }

            res.status(201).json({
                success: true,
                message: "Work assigned successfully.",
                assignment
            });

        } catch (error) {
            console.error("Assign work error:", error);

            res.status(500).json({
                success: false,
                message: "Unable to assign work."
            });
        }
    }
);

// CUSTOMER: VIEW OWN ASSIGNMENTS
router.get("/my", requireLogin, async (req, res) => {
    try {
        const assignments = await WorkAssignment.find({
            customer: req.user._id
        })
            .populate("enrollment", "projectSnapshot registrationStatus")
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            assignments
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Unable to load your work."
        });
    }
});

// CUSTOMER: SUBMIT COMPLETED WORK
router.post("/:id/submit", requireLogin, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid assignment ID."
            });
        }

        const {
            fileIds,
            customerRemarks
        } = req.body;

        if (
            !Array.isArray(fileIds) ||
            fileIds.length < 1 ||
            fileIds.length > 20
        ) {
            return res.status(400).json({
                success: false,
                message: "Upload between 1 and 20 work files."
            });
        }

        const validIds = fileIds.every(
            id => mongoose.isValidObjectId(id)
        );

        if (!validIds) {
            return res.status(400).json({
                success: false,
                message: "One or more file IDs are invalid."
            });
        }

        const assignment = await WorkAssignment.findOne({
            _id: req.params.id,
            customer: req.user._id
        });

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: "Work assignment not found."
            });
        }

        if (![
            "assigned",
            "in_progress",
            "correction_required"
        ].includes(assignment.status)) {
            return res.status(400).json({
                success: false,
                message: "This assignment cannot be submitted now."
            });
        }

        const uniqueIds = [...new Set(fileIds)];

        const objectIds = uniqueIds.map(
            id => new mongoose.Types.ObjectId(id)
        );

        const uploadedFiles = await mongoose.connection.db
            .collection("uploads.files")
            .find({
                _id: { $in: objectIds },
                "metadata.uploadedBy": String(req.user._id)
            })
            .toArray();

        if (uploadedFiles.length !== uniqueIds.length) {
            return res.status(403).json({
                success: false,
                message: "Some files do not belong to your account."
            });
        }

        assignment.submissionFileIds = uniqueIds;
        assignment.customerRemarks =
            typeof customerRemarks === "string"
                ? customerRemarks.trim().slice(0, 2000)
                : "";

        assignment.status = "submitted";

        await assignment.save();

        try {
            await Notification.create({
                title: "Work Submitted",
                message: `Your work "${assignment.title}" has been submitted successfully.`,
                recipient: req.user._id,
                target: "customer",
                type: "work"
            });

            await Notification.create({
                title: "Customer Work Submitted",
                message: `A customer has submitted work: ${assignment.title}.`,
                target: "admin",
                type: "work"
            });
        } catch (notificationError) {
            console.error(
                "Submission notification error:",
                notificationError
            );
        }

        res.json({
            success: true,
            message: "Work submitted successfully.",
            assignment
        });

    } catch (error) {
        console.error("Work submission error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to submit work."
        });
    }
});

// ADMIN: VIEW ALL WORK ASSIGNMENTS
router.get(
    "/admin/all",
    requireLogin,
    requireAdmin,
    async (req, res) => {
        try {
            const assignments = await WorkAssignment.find()
                .populate("customer", "fullName email mobile customerId")
                .populate("enrollment", "projectSnapshot")
                .sort({ createdAt: -1 });

            res.json({
                success: true,
                assignments
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Unable to load work assignments."
            });
        }
    }
);

// ADMIN: REVIEW CUSTOMER WORK
router.patch(
    "/admin/:id/review",
    requireLogin,
    requireAdmin,
    async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid assignment ID."
                });
            }

            const {
                status,
                adminRemarks
            } = req.body;

            const allowedStatuses = [
                "under_review",
                "correction_required",
                "approved",
                "completed"
            ];

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid review status."
                });
            }

            const assignment = await WorkAssignment.findById(
                req.params.id
            );

            if (!assignment) {
                return res.status(404).json({
                    success: false,
                    message: "Assignment not found."
                });
            }

            if (![
                "submitted",
                "under_review"
            ].includes(assignment.status) &&
                status !== "correction_required") {
                return res.status(400).json({
                    success: false,
                    message: "Assignment is not ready for review."
                });
            }

            assignment.status = status;

            assignment.adminRemarks =
                typeof adminRemarks === "string"
                    ? adminRemarks.trim().slice(0, 2000)
                    : "";

            assignment.reviewedAt = new Date();

            if (status === "completed") {
                assignment.completedAt = new Date();

                await Salary.findOneAndUpdate(
                    {
                        enrollment: assignment.enrollment
                    },
                    {
                        $set: {
                            workCompletedAt: new Date(),
                            remainingStatus: "pending"
                        }
                    }
                );
            }

            await assignment.save();

            try {
                await Notification.create({
                    title: "Work Review Updated",
                    message: `Your work "${assignment.title}" status is now ${status}.`,
                    recipient: assignment.customer,
                    target: "customer",
                    type: "work",
                    createdBy: req.user._id
                });
            } catch (notificationError) {
                console.error(
                    "Review notification error:",
                    notificationError
                );
            }

            res.json({
                success: true,
                message: "Work review updated successfully.",
                assignment
            });

        } catch (error) {
            console.error("Work review error:", error);

            res.status(500).json({
                success: false,
                message: "Unable to review work."
            });
        }
    }
);

module.exports = router;
