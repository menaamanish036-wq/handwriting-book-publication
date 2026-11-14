const mongoose = require("mongoose");

const companyCertificateSchema = new mongoose.Schema(
    {
        // Uploaded certificate image
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

        // Legacy fields retained for existing records
        title: {
            type: String,
            default: "",
            trim: true,
            maxlength: 200
        },

        description: {
            type: String,
            default: "",
            trim: true
        },

        // Certificate visibility
        isActive: {
            type: Boolean,
            default: true
        },

        // Admin information
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

companyCertificateSchema.index({
    isActive: 1,
    createdAt: -1
});

module.exports = mongoose.model(
    "CompanyCertificate",
    companyCertificateSchema
);
