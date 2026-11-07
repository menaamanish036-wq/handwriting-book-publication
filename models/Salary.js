const mongoose = require("mongoose");

const salarySchema = new mongoose.Schema(
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

        totalSalary: {
            type: Number,
            required: true,
            min: 0
        },

        advanceAmount: {
            type: Number,
            required: true,
            min: 0
        },

        remainingAmount: {
            type: Number,
            required: true,
            min: 0
        },

        advanceDueAt: {
            type: Date,
            default: null
        },

        advanceStatus: {
            type: String,
            enum: ["pending", "paid"],
            default: "pending"
        },

        advancePaidAt: {
            type: Date,
            default: null
        },

        remainingStatus: {
            type: String,
            enum: ["pending", "paid"],
            default: "pending"
        },

        remainingPaidAt: {
            type: Date,
            default: null
        },

        workCompletedAt: {
            type: Date,
            default: null
        },

        adminRemarks: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

salarySchema.index(
    { enrollment: 1 },
    { unique: true }
);

module.exports = mongoose.model("Salary", salarySchema);
