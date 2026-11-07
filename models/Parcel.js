const mongoose = require("mongoose");

const parcelSchema = new mongoose.Schema(
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
            default: null
        },

        parcelNumber: {
            type: String,
            unique: true,
            sparse: true
        },

        courierName: {
            type: String,
            default: ""
        },

        trackingNumber: {
            type: String,
            default: ""
        },

        trackingUrl: {
            type: String,
            default: ""
        },

        dispatchDate: {
            type: Date,
            default: null
        },

        deliveryDate: {
            type: Date,
            default: null
        },

        status: {
            type: String,
            enum: [
                "preparing",
                "dispatched",
                "in_transit",
                "out_for_delivery",
                "delivered",
                "returned"
            ],
            default: "preparing"
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

module.exports = mongoose.model("Parcel", parcelSchema);
