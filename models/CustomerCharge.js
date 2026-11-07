const mongoose = require("mongoose");

const customerChargeSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },

    status: {
      type: String,
      enum: ["unpaid", "paid", "waived"],
      default: "unpaid"
    },

    paymentReference: {
      type: String,
      trim: true,
      default: ""
    },

    notes: {
      type: String,
      trim: true,
      default: ""
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

customerChargeSchema.index({ customer: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("CustomerCharge", customerChargeSchema);
