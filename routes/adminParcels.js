const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Parcel = require("../models/Parcel");
const User = require("../models/User");
const Enrollment = require("../models/Enrollment");

const {
    requireLogin,
    requireAdmin
} = require("../middleware/auth");

router.use(requireLogin, requireAdmin);

const ALLOWED_STATUSES = [
    "preparing",
    "dispatched",
    "in_transit",
    "out_for_delivery",
    "delivered",
    "returned"
];

function validTrackingUrl(value) {
    if (!value) return true;

    try {
        const url = new URL(value);

        return (
            url.protocol === "https:" ||
            url.protocol === "http:"
        );
    } catch {
        return false;
    }
}

// GET ALL PARCELS
router.get("/", async (req, res) => {
    try {
        const parcels = await Parcel.find()
            .populate("customer", "fullName customerId email mobile")
            .populate("enrollment", "projectSnapshot registrationStatus")
            .sort({ createdAt: -1 })
            .lean();

        return res.json({
            success: true,
            parcels
        });

    } catch (error) {
        console.error("Admin parcel loading error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load parcels."
        });
    }
});

// CREATE PARCEL
router.post("/", async (req, res) => {
    try {
        const {
            customerId,
            enrollmentId,
            parcelNumber,
            courierName,
            trackingNumber,
            trackingUrl,
            dispatchDate,
            deliveryDate,
            status,
            adminRemarks
        } = req.body;

        if (!mongoose.isValidObjectId(customerId)) {
            return res.status(400).json({
                success: false,
                message: "Valid customer is required."
            });
        }

        const customer = await User.findOne({
            _id: customerId,
            role: "customer"
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found."
            });
        }

        let enrollment = null;

        if (enrollmentId) {
            if (!mongoose.isValidObjectId(enrollmentId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid enrollment ID."
                });
            }

            enrollment = await Enrollment.findOne({
                _id: enrollmentId,
                customer: customer._id
            });

            if (!enrollment) {
                return res.status(400).json({
                    success: false,
                    message: "Enrollment does not belong to this customer."
                });
            }
        }

        if (status && !ALLOWED_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid parcel status."
            });
        }

        if (!validTrackingUrl(trackingUrl)) {
            return res.status(400).json({
                success: false,
                message: "Tracking URL must be a valid HTTP or HTTPS URL."
            });
        }

        const parcel = await Parcel.create({
            customer: customer._id,
            enrollment: enrollment ? enrollment._id : null,
            parcelNumber: parcelNumber || undefined,
            courierName: courierName || "",
            trackingNumber: trackingNumber || "",
            trackingUrl: trackingUrl || "",
            dispatchDate: dispatchDate || null,
            deliveryDate: deliveryDate || null,
            status: status || "preparing",
            adminRemarks: adminRemarks || ""
        });

        return res.status(201).json({
            success: true,
            message: "Parcel created successfully.",
            parcel
        });

    } catch (error) {
        console.error("Create parcel error:", error);

        return res.status(error.code === 11000 ? 409 : 500).json({
            success: false,
            message: error.code === 11000
                ? "Parcel number already exists."
                : "Unable to create parcel."
        });
    }
});

// UPDATE PARCEL
router.patch("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid parcel ID."
            });
        }

        const parcel = await Parcel.findById(req.params.id);

        if (!parcel) {
            return res.status(404).json({
                success: false,
                message: "Parcel not found."
            });
        }

        const allowedFields = [
            "parcelNumber",
            "courierName",
            "trackingNumber",
            "trackingUrl",
            "dispatchDate",
            "deliveryDate",
            "status",
            "adminRemarks"
        ];

        for (const field of allowedFields) {
            if (req.body[field] === undefined) continue;

            if (
                field === "status" &&
                !ALLOWED_STATUSES.includes(req.body.status)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid parcel status."
                });
            }

            if (
                field === "trackingUrl" &&
                !validTrackingUrl(req.body.trackingUrl)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid tracking URL."
                });
            }

            parcel[field] = req.body[field] === ""
                ? null
                : req.body[field];
        }

        await parcel.save();

        return res.json({
            success: true,
            message: "Parcel updated successfully.",
            parcel
        });

    } catch (error) {
        console.error("Update parcel error:", error);

        return res.status(error.code === 11000 ? 409 : 500).json({
            success: false,
            message: error.code === 11000
                ? "Parcel number already exists."
                : "Unable to update parcel."
        });
    }
});

// DELETE PARCEL
router.delete("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid parcel ID."
            });
        }

        const parcel = await Parcel.findByIdAndDelete(
            req.params.id
        );

        if (!parcel) {
            return res.status(404).json({
                success: false,
                message: "Parcel not found."
            });
        }

        return res.json({
            success: true,
            message: "Parcel deleted successfully."
        });

    } catch (error) {
        console.error("Delete parcel error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to delete parcel."
        });
    }
});

module.exports = router;
