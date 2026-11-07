const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
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

        paymentType: {
            type: String,
            enum: [
                "registration_fee",
                "customer_charge"
            ],
            default: "registration_fee"
        },

        amount: {
            type: Number,
            required: true,
            min: 1
        },

        transactionId: {
            type: String,
            required: true,
            trim: true
        },

        paymentScreenshotId: {
            type: String,
            default: null
        },

        paymentMethod: {
            type: String,
            default: "UPI"
        },

        status: {
            type: String,
            enum: [
                "pending",
                "approved",
                "rejected"
            ],
            default: "pending"
        },

        adminRemarks: {
            type: String,
            default: ""
        },

        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        reviewedAt: {
            type: Date,
            default: null
        },

        paidAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

paymentSchema.index({
    customer: 1,
    createdAt: -1
});

module.exports = mongoose.model(
    "Payment",
    paymentSchema
);
