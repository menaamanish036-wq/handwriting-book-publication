const express = require("express");
const router = express.Router();

const Parcel = require("../models/Parcel");
const Certificate = require("../models/Certificate");

const { requireLogin } = require("../middleware/auth");

// CUSTOMER: VIEW OWN PARCEL TRACKING
router.get("/parcels", requireLogin, async (req, res) => {
    try {
        const parcels = await Parcel.find({
            customer: req.user._id
        })
            .populate(
                "enrollment",
                "projectSnapshot registrationStatus"
            )
            .sort({ createdAt: -1 })
            .lean();

        return res.json({
            success: true,
            parcels
        });

    } catch (error) {
        console.error("Customer parcel loading error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load parcel tracking."
        });
    }
});

// CUSTOMER: VIEW OWN ISSUED CERTIFICATES
router.get("/certificates", requireLogin, async (req, res) => {
    try {
        const certificates = await Certificate.find({
            customer: req.user._id,
            status: "issued"
        })
            .populate(
                "enrollment",
                "projectSnapshot registrationStatus"
            )
            .sort({ createdAt: -1 })
            .lean();

        return res.json({
            success: true,
            certificates
        });

    } catch (error) {
        console.error("Customer certificate loading error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load certificates."
        });
    }
});

module.exports = router;
