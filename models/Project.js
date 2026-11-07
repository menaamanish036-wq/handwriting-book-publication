const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
    {
        projectName: {
            type: String,
            required: true,
            trim: true
        },

        projectNumber: {
            type: Number,
            required: true,
            unique: true
        },

        pages: {
            type: Number,
            required: true,
            min: 1
        },

        sides: {
            type: Number,
            required: true,
            min: 1
        },

        durationDays: {
            type: Number,
            required: true,
            min: 1
        },

        salary: {
            type: Number,
            required: true,
            min: 0
        },

        registrationFee: {
            type: Number,
            required: true,
            min: 0
        },

        description: {
            type: String,
            default: ""
        },

        instructions: {
            type: String,
            default: ""
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Project", projectSchema);
