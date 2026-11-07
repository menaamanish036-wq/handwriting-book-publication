const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        enrollment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Enrollment",
            required: true
        },

        certificateNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        projectName: {
            type: String,
            required: true
        },

        issueDate: {
            type: Date,
            default: Date.now
        },

        completionDate: {
            type: Date,
            default: null
        },

        certificateFileId: {
            type: String,
            default: null
        },

        status: {
            type: String,
            enum: ["issued", "revoked"],
            default: "issued"
        },

        remarks: {
            type: String,
            default: ""
        },

        issuedBy: {
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
    "Certificate",
    certificateSchema
);
