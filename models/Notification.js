const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },

    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    target: {
      type: String,
      enum: ["all", "customer", "admin"],
      default: "customer"
    },

    type: {
      type: String,
      enum: [
        "general",
        "registration",
        "payment",
        "salary",
        "project",
        "work",
        "parcel",
        "certificate",
        "support"
      ],
      default: "general"
    },

    isRead: {
      type: Boolean,
      default: false
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ target: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
