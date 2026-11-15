const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Payment = require("../models/Payment");
const Enrollment = require("../models/Enrollment");
const CustomerCharge = require("../models/CustomerCharge");
const Notification = require("../models/Notification");

const {
    requireLogin,
    requireAdmin
} = require("../middleware/auth");

// VERIFY PAYMENT SCREENSHOT
async function verifyScreenshot(fileId, userId) {
    if (!mongoose.isValidObjectId(fileId)) {
        return false;
    }

    const screenshot = await mongoose.connection.db
        .collection("uploads.files")
        .findOne({
            _id: new mongoose.Types.ObjectId(fileId),
            "metadata.uploadedBy": String(userId),
            contentType: {
                $in: [
                    "image/jpeg",
                    "image/png",
                    "image/webp"
                ]
            }
        });

    return !!screenshot;
}

// CUSTOMER: SUBMIT PAYMENT
router.post("/", requireLogin, async (req, res) => {
    try {
        const {
            enrollmentId,
            customerChargeId,
            paymentType,
            transactionId,
            paymentScreenshotId
        } = req.body;

        if (
            typeof transactionId !== "string" ||
            !transactionId.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Transaction ID is required."
            });
        }

        if (
            !await verifyScreenshot(
                paymentScreenshotId,
                req.user._id
            )
        ) {
            return res.status(403).json({
                success: false,
                message: "Invalid payment screenshot."
            });
        }

        const duplicate = await Payment.findOne({
            transactionId: transactionId.trim()
        });

        if (duplicate) {
            return res.status(409).json({
                success: false,
                message: "This transaction ID has already been submitted."
            });
        }

        // CUSTOMER CHARGE PAYMENT
        if (paymentType === "customer_charge") {

            if (!mongoose.isValidObjectId(customerChargeId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid charge ID."
                });
            }

            const charge = await CustomerCharge.findOne({
                _id: customerChargeId,
                customer: req.user._id,
                status: "unpaid"
            });

            if (!charge) {
                return res.status(404).json({
                    success: false,
                    message: "Unpaid charge not found."
                });
            }

            const existingPayment = await Payment.findOne({
                customerCharge: charge._id,
                status: "pending"
            });

            if (existingPayment) {
                return res.status(409).json({
                    success: false,
                    message: "Payment is already awaiting verification."
                });
            }

            const payment = await Payment.create({
                customer: req.user._id,
                customerCharge: charge._id,
                paymentType: "customer_charge",
                amount: charge.amount,
                transactionId: transactionId.trim(),
                paymentScreenshotId: String(paymentScreenshotId),
                paymentMethod: "UPI",
                status: "pending"
            });

            try {
                await Notification.create({
                    title: "Charge Payment Submitted",
                    message: "Your charge payment has been submitted for verification.",
                    recipient: req.user._id,
                    target: "customer",
                    type: "payment"
                });

                await Notification.create({
                    title: "New Charge Payment",
                    message: "A customer has submitted a charge payment for verification.",
                    target: "admin",
                    type: "payment"
                });
            } catch (error) {
                console.error("Notification error:", error);
            }

            return res.status(201).json({
                success: true,
                message: "Charge payment submitted for verification.",
                payment
            });
        }

        // REGISTRATION PAYMENT
        if (!mongoose.isValidObjectId(enrollmentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid enrollment ID."
            });
        }

        const enrollment = await Enrollment.findOne({
            _id: enrollmentId,
            customer: req.user._id
        });

        if (!enrollment) {
            return res.status(404).json({
                success: false,
                message: "Enrollment not found."
            });
        }

        if (enrollment.registrationStatus !== "pending") {
            return res.status(400).json({
                success: false,
                message: "This enrollment is not awaiting payment."
            });
        }

        if (enrollment.paymentStatus === "approved") {
            return res.status(400).json({
                success: false,
                message: "Payment is already approved."
            });
        }

        const existingPayment = await Payment.findOne({
            enrollment: enrollment._id,
            customer: req.user._id,
            status: "pending"
        });

        if (existingPayment) {
            return res.status(409).json({
                success: false,
                message: "A payment is already awaiting verification."
            });
        }

        const amount = enrollment.projectSnapshot.registrationFee;

        if (!Number.isFinite(amount) || amount < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid registration fee."
            });
        }

        const payment = await Payment.create({
            customer: req.user._id,
            enrollment: enrollment._id,
            paymentType: "registration_fee",
            amount,
            transactionId: transactionId.trim(),
            paymentScreenshotId: String(paymentScreenshotId),
            paymentMethod: "UPI",
            status: "pending"
        });

        enrollment.paymentStatus = "pending";
        await enrollment.save();

        try {
            await Notification.create({
                title: "Payment Submitted",
                message: "Your registration payment has been submitted for verification.",
                recipient: req.user._id,
                target: "customer",
                type: "payment"
            });

            await Notification.create({
                title: "New Payment Received",
                message: "A customer has submitted a registration payment for verification.",
                target: "admin",
                type: "payment"
            });
        } catch (error) {
            console.error("Notification error:", error);
        }

        return res.status(201).json({
            success: true,
            message: "Payment submitted for verification.",
            payment
        });

    } catch (error) {
        console.error("Payment submission error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to submit payment."
        });
    }
});

// CUSTOMER: VIEW OWN PAYMENTS
router.get("/my", requireLogin, async (req, res) => {
    try {
        const payments = await Payment.find({
            customer: req.user._id
        })
            .populate(
                "enrollment",
                "projectSnapshot registrationStatus paymentStatus"
            )
            .populate(
                "customerCharge",
                "amount reason status"
            )
            .sort({ createdAt: -1 })
            .lean();

        return res.json({
            success: true,
            payments
        });

    } catch (error) {
        console.error("Load payments error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load payments."
        });
    }
});

// ADMIN: VIEW ALL PAYMENTS
router.get(
    "/admin/all",
    requireLogin,
    requireAdmin,
    async (req, res) => {
        try {
            const payments = await Payment.find()
                .populate("customer", "fullName email mobile")
                .populate(
                    "enrollment",
                    "projectSnapshot registrationStatus paymentStatus"
                )
                .populate(
                    "customerCharge",
                    "amount reason status"
                )
                .populate("reviewedBy", "fullName")
                .sort({ createdAt: -1 })
                .lean();

            return res.json({
                success: true,
                payments
            });

        } catch (error) {
            console.error("Admin payments error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to load payments."
            });
        }
    }
);

// ADMIN: APPROVE OR REJECT PAYMENT
router.patch(
    "/admin/:id/status",
    requireLogin,
    requireAdmin,
    async (req, res) => {
        try {
            const { status, adminRemarks } = req.body;

            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid payment ID."
                });
            }

            if (!["approved", "rejected"].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid payment status."
                });
            }

            const payment = await Payment.findOne({
                _id: req.params.id,
                status: "pending"
            });

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: "Pending payment not found or already reviewed."
                });
            }

            // CUSTOMER CHARGE PAYMENT REVIEW
            if (payment.paymentType === "customer_charge") {

                const charge = await CustomerCharge.findOne({
                    _id: payment.customerCharge,
                    customer: payment.customer
                });

                if (!charge) {
                    return res.status(404).json({
                        success: false,
                        message: "Related customer charge not found."
                    });
                }

                if (charge.status !== "unpaid") {
                    return res.status(400).json({
                        success: false,
                        message: "This charge is no longer unpaid."
                    });
                }

                payment.status = status;
                payment.adminRemarks =
                    typeof adminRemarks === "string"
                        ? adminRemarks.trim().slice(0, 2000)
                        : "";

                payment.reviewedBy = req.user._id;
                payment.reviewedAt = new Date();

                if (status === "approved") {
                    payment.paidAt = new Date();
                    charge.status = "paid";
                    charge.paymentReference = payment.transactionId;
                    charge.updatedBy = req.user._id;
                }

                await payment.save();

                if (status === "approved") {
                    await charge.save();
                }

                try {
                    await Notification.create({
                        title: status === "approved"
                            ? "Charge Payment Approved"
                            : "Charge Payment Rejected",
                        message: status === "approved"
                            ? "Your charge payment has been approved."
                            : "Your charge payment was rejected. Please check the remarks and submit again.",
                        recipient: payment.customer,
                        target: "customer",
                        type: "payment",
                        createdBy: req.user._id
                    });
                } catch (error) {
                    console.error("Notification error:", error);
                }

                return res.json({
                    success: true,
                    message: status === "approved"
                        ? "Charge payment approved."
                        : "Charge payment rejected.",
                    payment,
                    charge
                });
            }

            // REGISTRATION PAYMENT REVIEW
            const enrollment = await Enrollment.findOne({
                _id: payment.enrollment,
                customer: payment.customer
            });

            if (!enrollment) {
                return res.status(404).json({
                    success: false,
                    message: "Related enrollment not found."
                });
            }

            if (enrollment.registrationStatus !== "pending") {
                return res.status(400).json({
                    success: false,
                    message: "Enrollment is not awaiting approval."
                });
            }

            payment.status = status;
            payment.adminRemarks =
                typeof adminRemarks === "string"
                    ? adminRemarks.trim().slice(0, 2000)
                    : "";

            payment.reviewedBy = req.user._id;
            payment.reviewedAt = new Date();

            if (status === "approved") {
                payment.paidAt = new Date();
                enrollment.paymentStatus = "approved";
            } else {
                enrollment.paymentStatus = "rejected";
            }

            await payment.save();
            await enrollment.save();

            try {
                await Notification.create({
                    title: status === "approved"
                        ? "Payment Approved"
                        : "Payment Rejected",
                    message: status === "approved"
                        ? "Your registration payment has been approved. Your registration is now awaiting final admin approval."
                        : "Your registration payment was rejected. Please check the admin remarks and submit payment again.",
                    recipient: payment.customer,
                    target: "customer",
                    type: "payment",
                    createdBy: req.user._id
                });
            } catch (error) {
                console.error("Payment review notification error:", error);
            }

            return res.json({
                success: true,
                message: status === "approved"
                    ? "Payment approved. Enrollment is now ready for admin approval."
                    : "Payment rejected.",
                payment,
                enrollment
            });

        } catch (error) {
            console.error("Payment review error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to update payment status."
            });
        }
    }
);

module.exports = router;
