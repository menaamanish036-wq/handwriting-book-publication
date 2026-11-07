const mongoose = require("mongoose");

const workAssignmentSchema = new mongoose.Schema(
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

        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        totalPages: {
            type: Number,
            required: true,
            min: 1
        },

        instructions: {
            type: String,
            default: "Write all assigned work in English uppercase letters A-Z."
        },

        assignedDate: {
            type: Date,
            default: Date.now
        },

        deadline: {
            type: Date,
            default: null
        },

        status: {
            type: String,
            enum: [
                "assigned",
                "in_progress",
                "submitted",
                "under_review",
                "correction_required",
                "approved",
                "completed"
            ],
            default: "assigned"
        },

        submissionFileIds: [{
            type: String
        }],

        customerRemarks: {
            type: String,
            default: ""
        },

        adminRemarks: {
            type: String,
            default: ""
        },

        reviewedAt: {
            type: Date,
            default: null
        },

        completedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

workAssignmentSchema.index({
    customer: 1,
    status: 1
});

module.exports = mongoose.model(
    "WorkAssignment",
    workAssignmentSchema
);
