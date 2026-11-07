const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Enrollment = require("../models/Enrollment");
const Project = require("../models/Project");
const Salary = require("../models/Salary");
const Notification = require("../models/Notification");

const {
    requireLogin,
    requireAdmin
} = require("../middleware/auth");

// CUSTOMER: CREATE PROJECT ENROLLMENT
router.post("/", requireLogin, async (req, res) => {
    try {
        const { projectId } = req.body;

        if (!mongoose.isValidObjectId(projectId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID."
            });
        }

        const project = await Project.findOne({
            _id: projectId,
            isActive: true
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found or inactive."
            });
        }

        const existing = await Enrollment.findOne({
            customer: req.user._id,
            project: project._id,
            registrationStatus: {
                $in: ["pending", "approved"]
            }
        });

        if (existing) {
            return res.status(409).json({
                success: false,
                message: "You already have an enrollment for this project."
            });
        }

        const enrollment = await Enrollment.create({
            customer: req.user._id,
            project: project._id,

            projectSnapshot: {
                projectName: project.projectName,
                projectNumber: project.projectNumber,
                pages: project.pages,
                sides: project.sides,
                durationDays: project.durationDays,
                salary: project.salary,
                registrationFee: project.registrationFee
            }
        });

        res.status(201).json({
            success: true,
            message: "Project enrollment created successfully.",
            enrollment
        });

    } catch (error) {
        console.error("Enrollment error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to create enrollment."
        });
    }
});

// CUSTOMER: VIEW OWN ENROLLMENTS
router.get("/my", requireLogin, async (req, res) => {
    try {
        const enrollments = await Enrollment.find({
            customer: req.user._id
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            enrollments
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Unable to load enrollments."
        });
    }
});

// ADMIN: VIEW ALL ENROLLMENTS
router.get(
    "/admin/all",
    requireLogin,
    requireAdmin,
    async (req, res) => {
        try {
            const enrollments = await Enrollment.find()
                .populate("customer", "fullName email mobile")
                .sort({ createdAt: -1 });

            res.json({
                success: true,
                enrollments
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Unable to load enrollments."
            });
        }
    }
);

// ADMIN: APPROVE OR REJECT ENROLLMENT
router.patch(
    "/admin/:id/status",
    requireLogin,
    requireAdmin,
    async (req, res) => {
        try {
            const { status } = req.body;

            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid enrollment ID."
                });
            }

            if (!["approved", "rejected"].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid enrollment status."
                });
            }

            const enrollment = await Enrollment.findById(
                req.params.id
            );

            if (!enrollment) {
                return res.status(404).json({
                    success: false,
                    message: "Enrollment not found."
                });
            }

            if (enrollment.registrationStatus !== "pending") {
                return res.status(400).json({
                    success: false,
                    message: "Enrollment has already been reviewed."
                });
            }

            if (status === "approved") {
                if (enrollment.paymentStatus !== "approved") {
                    return res.status(400).json({
                        success: false,
                        message: "Approve the registration payment first."
                    });
                }

                const approvedAt = new Date();
                const totalSalary =
                    enrollment.projectSnapshot.salary;

                const advanceAmount =
                    Math.floor(totalSalary / 2);

                const remainingAmount =
                    totalSalary - advanceAmount;

                const advanceDueAt = new Date(
                    approvedAt.getTime() + 15 * 60 * 1000
                );

                await Salary.findOneAndUpdate(
                    { enrollment: enrollment._id },
                    {
                        $setOnInsert: {
                            customer: enrollment.customer,
                            enrollment: enrollment._id,
                            totalSalary,
                            advanceAmount,
                            remainingAmount,
                            advanceDueAt,
                            advanceStatus: "pending",
                            remainingStatus: "pending"
                        }
                    },
                    {
                        upsert: true,
                        new: true,
                        runValidators: true
                    }
                );

                enrollment.registrationStatus = "approved";
                enrollment.approvedAt = approvedAt;
                enrollment.advanceSalary = advanceAmount;
                enrollment.remainingSalary = remainingAmount;
                enrollment.advanceDueAt = advanceDueAt;

            } else {
                enrollment.registrationStatus = "rejected";
            }

            await enrollment.save();

            await Notification.create({
                title: status === "approved"
                    ? "Project Registration Approved"
                    : "Project Registration Rejected",

                message: status === "approved"
                    ? "Your project registration has been approved. Your 50% salary advance is due 15 minutes after approval."
                    : "Your project registration has been rejected. Please contact support.",

                recipient: enrollment.customer,
                target: "customer",
                type: "registration",
                createdBy: req.user._id
            });

            res.json({
                success: true,
                message: `Enrollment ${status} successfully.`,
                enrollment
            });

        } catch (error) {
            console.error("Enrollment review error:", error);

            res.status(500).json({
                success: false,
                message: "Unable to update enrollment."
            });
        }
    }
);

module.exports = router;
