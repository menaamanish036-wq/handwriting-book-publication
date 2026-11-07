const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const CustomerCharge = require("../models/CustomerCharge");
const { requireLogin, requireAdmin } = require("../middleware/auth");

// CUSTOMER: VIEW OWN CHARGES
router.get("/", requireLogin, async (req, res) => {
  try {
    const charges = await CustomerCharge.find({
      customer: req.user._id
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      charges
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to load customer charges."
    });
  }
});

// ADMIN: VIEW ALL CUSTOMER CHARGES
router.get("/admin/all", requireLogin, requireAdmin, async (req, res) => {
  try {
    const charges = await CustomerCharge.find()
      .populate("customer", "fullName email mobile")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      charges
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to load charges."
    });
  }
});

// ADMIN: ADD CHARGE TO CUSTOMER
router.post(
  "/admin/:customerId",
  requireLogin,
  requireAdmin,
  async (req, res) => {
    try {
      const { amount, reason, notes } = req.body;
      const User = require("../models/User");

      if (!mongoose.isValidObjectId(req.params.customerId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID."
        });
      }

      if (
        amount === undefined ||
        !Number.isFinite(Number(amount)) ||
        Number(amount) <= 0 ||
        !reason ||
        !reason.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "A valid amount and reason are required."
        });
      }

      const customer = await User.findOne({
        _id: req.params.customerId,
        role: "customer"
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found."
        });
      }

      const charge = await CustomerCharge.create({
        customer: customer._id,
        amount: Number(amount),
        reason: reason.trim(),
        notes: notes || "",
        createdBy: req.user._id
      });

      res.status(201).json({
        success: true,
        message: "Customer charge added successfully.",
        charge
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Unable to add customer charge."
      });
    }
  }
);

// ADMIN: UPDATE CHARGE
router.patch(
  "/admin/:id",
  requireLogin,
  requireAdmin,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid charge ID."
        });
      }

      const allowedFields = ["amount", "reason", "notes", "status"];
      const updates = {};

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (
        updates.amount !== undefined &&
        (!Number.isFinite(Number(updates.amount)) ||
          Number(updates.amount) <= 0)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid charge amount."
        });
      }

      if (updates.amount !== undefined) {
        updates.amount = Number(updates.amount);
      }

      if (updates.reason !== undefined) {
        if (
          typeof updates.reason !== "string" ||
          !updates.reason.trim()
        ) {
          return res.status(400).json({
            success: false,
            message: "A valid reason is required."
          });
        }

        updates.reason = updates.reason.trim();
      }

      if (
        updates.status !== undefined &&
        !["unpaid", "paid", "waived"].includes(updates.status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid charge status."
        });
      }

      updates.updatedBy = req.user._id;

      const charge = await CustomerCharge.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!charge) {
        return res.status(404).json({
          success: false,
          message: "Charge not found."
        });
      }

      res.json({
        success: true,
        message: "Charge updated successfully.",
        charge
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Unable to update charge."
      });
    }
  }
);

// ADMIN: DELETE CHARGE
router.delete(
  "/admin/:id",
  requireLogin,
  requireAdmin,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid charge ID."
        });
      }

      const charge = await CustomerCharge.findByIdAndDelete(
        req.params.id
      );

      if (!charge) {
        return res.status(404).json({
          success: false,
          message: "Charge not found."
        });
      }

      res.json({
        success: true,
        message: "Charge deleted successfully."
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Unable to delete charge."
      });
    }
  }
);

module.exports = router;
