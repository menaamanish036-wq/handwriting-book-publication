const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    actorRole: {
      type: String,
      enum: ["admin", "customer", "system"],
      default: "system"
    },

    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },

    targetType: {
      type: String,
      trim: true,
      default: ""
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },

    ipAddress: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ actor: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
