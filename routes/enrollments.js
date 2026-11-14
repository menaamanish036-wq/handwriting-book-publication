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


// ==========================================
// CUSTOMER: CREATE PROJECT ENROLLMENT
// ==========================================

router.post("/", requireLogin, async (req, res) => {
    try {
        const {
            projectId,
            name,
            address,
            mobile,
            pinCode,
            district
        } = req.body;

        // CHECK PROJECT ID

        if (!mongoose.isValidObjectId(projectId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID."
            });
        }

        // VALIDATE CUSTOMER DETAILS

        const customerName = String(name || "").trim();
        const customerAddress = String(address || "").trim();
        const customerMobile = String(mobile || "").trim();
        const customerPinCode = String(pinCode || "").trim();
        const customerDistrict = String(district || "").trim();

        if (
            !customerName ||
            !customerAddress ||
            !customerMobile ||
            !customerPinCode ||
            !customerDistrict
        ) {
            return res.status(400).json({
                success: false,
                message: "Please fill all registration details."
            });
        }

        if (!/^[0-9]{10}$/.test(customerMobile)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid 10-digit mobile number."
            });
        }

        if (!/^[0-9]{6}$/.test(customerPinCode)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid 6-digit PIN code."
            });
        }

        // FIND ACTIVE PROJECT

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

        // CHECK DUPLICATE ENROLLMENT

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

        // CREATE ENROLLMENT

        const enrollment = await Enrollment.create({
            customer: req.user._id,

            project: project._id,

            registrationDetails: {
                name: customerName,
                address: customerAddress,
                mobile: customerMobile,
                pinCode: customerPinCode,
                district: customerDistrict,
                projectNo: project.projectNumber
            },

            projectSnapshot: {
                projectName: project.projectName,
                projectNumber: project.projectNumber,
                pages: project.pages,
                sides: project.sides,
                durationDays: project.durationDays,
                salary: project.salary,
                registrationFee: project.registrationFee
            },

            registrationStatus: "pending",
            paymentStatus: "unpaid"
        });

        return res.status(201).json({
            success: true,
            message: "Project registration details submitted successfully. Please continue to payment.",
            enrollment
        });

    } catch (error) {
        console.error("Enrollment creation error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create project enrollment."
        });
    }
});


// ==========================================
// CUSTOMER: VIEW OWN ENROLLMENTS
// ==========================================

router.get("/my", requireLogin, async (req, res) => {
    try {
        const enrollments = await Enrollment.find({
            customer: req.user._id
        })
        .sort({
            createdAt: -1
        });

        return res.json({
            success: true,
            enrollments
        });

    } catch (error) {
        console.error("Customer enrollment error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load enrollments."
        });
    }
});


// ==========================================
// ADMIN: VIEW ALL ENROLLMENTS
// ==========================================

router.get(
    "/admin/all",
    requireLogin,
    requireAdmin,
    async (req, res) => {
        try {
            const enrollments = await Enrollment.find()
                .populate(
                    "customer",
                    "fullName email mobile"
                )
                .sort({
                    createdAt: -1
                });

            return res.json({
                success: true,
                enrollments
            });

        } catch (error) {
            console.error("Admin enrollment error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to load enrollments."
            });
        }
    }
);


// ==========================================
// ADMIN: APPROVE OR REJECT ENROLLMENT
// ==========================================

router.patch(
    "/admin/:id/status",
    requireLogin,
    requireAdmin,
    async (req, res) => {
        try {
            const { status } = req.body;

            // VALIDATE ENROLLMENT ID

            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid enrollment ID."
                });
            }

            // VALIDATE STATUS

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

            // APPROVE ENROLLMENT

            if (status === "approved") {

                // PAYMENT MUST BE APPROVED FIRST

                if (enrollment.paymentStatus !== "approved") {
                    return res.status(400).json({
                        success: false,
                        message: "Approve the registration payment first."
                    });
                }

                const approvedAt = new Date();

                const totalSalary =
                    Number(enrollment.projectSnapshot.salary);

                if (!Number.isFinite(totalSalary) || totalSalary < 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid project salary."
                    });
                }

                const advanceAmount =
                    Math.floor(totalSalary / 2);

                const remainingAmount =
                    totalSalary - advanceAmount;

                const advanceDueAt = new Date(
                    approvedAt.getTime() + 15 * 60 * 1000
                );

                // CREATE OR UPDATE SALARY RECORD

                await Salary.findOneAndUpdate(
                    {
                        enrollment: enrollment._id
                    },
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

                // REJECT ENROLLMENT

                enrollment.registrationStatus = "rejected";
            }

            await enrollment.save();

            // CUSTOMER NOTIFICATION

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

            return res.json({
                success: true,
                message: `Enrollment ${status} successfully.`,
                enrollment
            });

        } catch (error) {
            console.error("Enrollment review error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to update enrollment."
            });
        }
    }
);


module.exports = router;
