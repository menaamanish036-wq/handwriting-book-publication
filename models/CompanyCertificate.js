const mongoose = require("mongoose");

const companyCertificateSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            default: ""
        },

        fileId: {
            type: String,
            required: true
        },

        fileName: {
            type: String,
            required: true
        },

        fileType: {
            type: String,
            enum: ["image/jpeg", "image/png", "application/pdf"],
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
