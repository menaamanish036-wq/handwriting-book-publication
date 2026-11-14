const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true
        },

        // CUSTOMER REGISTRATION FORM DETAILS
        registrationDetails: {
            name: {
                type: String,
                trim: true
            },
            address: {
                type: String,
                trim: true
            },
            mobile: {
                type: String,
                trim: true
            },
            pinCode: {
                type: String,
                trim: true
            },
            district: {
                type: String,
                trim: true
            },
            projectNo: {
                type: Number
            }
        },

        projectSnapshot: {
            projectName: {
                type: String,
                required: true
            },
            projectNumber: {
                type: Number,
                required: true
            },
            pages: {
                type: Number,
                required: true
            },
            sides: {
                type: Number,
                required: true
            },
            durationDays: {
                type: Number,
                required: true
            },
            salary: {
                type: Number,
                required: true
            },
            registrationFee: {
                type: Number,
                required: true
            }
        },

        registrationStatus: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending"
        },

        paymentStatus: {
            type: String,
            enum: ["unpaid", "pending", "approved", "rejected"],
            default: "unpaid"
        },

        approvedAt: {
            type: Date,
            default: null
        },

        advanceSalary: {
            type: Number,
            default: 0
        },

        remainingSalary: {
            type: Number,
            default: 0
        },

        advanceDueAt: {
            type: Date,
            default: null
        },

        createdAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

enrollmentSchema.index({
    customer: 1,
    project: 1
});

module.exports = mongoose.model(
    "Enrollment",
    enrollmentSchema
);
