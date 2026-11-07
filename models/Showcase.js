const mongoose = require("mongoose");

const showcaseSchema = new mongoose.Schema(
  {
    title: {
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

    customerName: {
      type: String,
      trim: true,
      default: ""
    },

    workType: {
      type: String,
      trim: true,
      default: "Handwriting Work"
    },

    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },

    fileName: {
      type: String,
      default: ""
    },

    fileType: {
      type: String,
      enum: ["image/jpeg", "image/png", "image/webp", "application/pdf", ""],
      default: ""
    },

    isPublished: {
      type: Boolean,
      default: false
    },

    displayOrder: {
      type: Number,
      default: 0
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

showcaseSchema.index({ isPublished: 1, displayOrder: 1 });

module.exports = mongoose.model("Showcase", showcaseSchema);
