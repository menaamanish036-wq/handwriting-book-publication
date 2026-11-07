const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Payment = require("../models/Payment");
const Enrollment = require("../models/Enrollment");

const { requireLogin, requireAdmin } = require("../middleware/auth");

// CUSTOMER: SUBMIT REGISTRATION PAYMENT
router.post("/", requireLogin, async (req, res) => {
  try {
    const {
      enrollmentId,
      transactionId,
      paymentScreenshotId
    } = req.body;

    if (!mongoose.isValidObjectId(enrollmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enrollment ID."
      });
    }

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
      paymentScreenshotId &&
      !mongoose.isValidObjectId(paymentScreenshotId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment screenshot ID."
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

    if (enrollment.registrationStatus === "rejected") {
      return res.status(400).json({
        success: false,
        message: "This enrollment has been rejected."
      });
    }

    if (enrollment.paymentStatus === "approved") {
      return res.status(400).json({
        success: false,
        message: "Registration payment is already approved."
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

    const payment = await Payment.create({
      customer: req.user._id,
      enrollment: enrollment._id,
      paymentType: "registration_fee",
      amount: enrollment.projectSnapshot.registrationFee,
      transactionId: transactionId.trim(),
      paymentScreenshotId: paymentScreenshotId || null,
      paymentMethod: "UPI",
      status: "pending"
    });

    enrollment.paymentStatus = "pending";
    await enrollment.save();

    res.status(201).json({
      success: true,
      message: "Payment submitted for verification.",
      payment
    });

  } catch (error) {
    res.status(500).json({
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
      .populate("enrollment", "projectSnapshot registrationStatus")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      payments
    });

  } catch (error) {
    res.status(500).json({
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
        .populate("enrollment", "projectSnapshot registrationStatus")
        .populate("reviewedBy", "fullName")
        .sort({ createdAt: -1 })
        .lean();

      res.json({
        success: true,
        payments
      });

    } catch (error) {
      res.status(500).json({
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
          message: "Status must be approved or rejected."
        });
      }

      const payment = await Payment.findById(req.params.id);

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found."
        });
      }

      if (payment.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "This payment has already been reviewed."
        });
      }

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

      payment.status = status;
      payment.adminRemarks =
        typeof adminRemarks === "string"
          ? adminRemarks.trim()
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

      res.json({
        success: true,
        message: `Payment ${status} successfully.`,
        payment
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Unable to update payment status."
      });
    }
  }
);

module.exports = router;
