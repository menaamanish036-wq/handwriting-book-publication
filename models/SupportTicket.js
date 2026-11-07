const mongoose = require("mongoose");

const supportTicketSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000
    },

    category: {
      type: String,
      enum: [
        "registration",
        "payment",
        "project",
        "salary",
        "work",
        "parcel",
        "certificate",
        "account",
        "other"
      ],
      default: "other"
    },

    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open"
    },

    adminReply: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: ""
    },

    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    repliedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

supportTicketSchema.index({ customer: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("SupportTicket", supportTicketSchema);
