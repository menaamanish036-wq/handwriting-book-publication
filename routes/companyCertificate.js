const mongoose = require("mongoose");

const companyCertificateSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },

    description: {
      type: String,
      default: "",
      trim: true
    },

    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },

    fileName: {
      type: String,
      required: true,
      trim: true
    },

    fileType: {
      type: String,
      enum: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf"
      ],
      required: true
    },

    isActive: {
      type: Boolean,
      default: true
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
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

module.exports = mongoose.model(
  "CompanyCertificate",
  companyCertificateSchema
);
