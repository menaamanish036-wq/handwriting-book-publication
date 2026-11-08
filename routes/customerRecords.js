const express = require("express");
const router = express.Router();

const Parcel = require("../models/Parcel");
const Certificate = require("../models/Certificate");

const { requireLogin } = require("../middleware/auth");

// CUSTOMER ROLE SECURITY
function requireCustomer(req, res, next) {
    if (!req.user || req.user.role !== "customer") {
        return res.status(403).json({
            success: false,
            message: "Customer access only."
        });
    }

    next();
}

// =====================================
// CUSTOMER: VIEW OWN PARCEL TRACKING
// =====================================

router.get(
    "/parcels",
    requireLogin,
    requireCustomer,
    async (req, res) => {
        try {
            const parcels = await Parcel.find({
                customer: req.user._id
            })
                .select(
                    "parcelNumber courierName trackingNumber trackingUrl dispatchDate deliveryDate status adminRemarks enrollment createdAt updatedAt"
                )
                .populate({
                    path: "enrollment",
                    select: "projectSnapshot registrationStatus"
                })
                .sort({ createdAt: -1 })
                .lean();

            return res.status(200).json({
                success: true,
                parcels
            });

        } catch (error) {
            console.error(
                "Customer parcel loading error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to load parcel tracking."
            });
        }
    }
);

// =====================================
// CUSTOMER: VIEW OWN CERTIFICATES
// =====================================

router.get(
    "/certificates",
    requireLogin,
    requireCustomer,
    async (req, res) => {
        try {
            const certificates = await Certificate.find({
                customer: req.user._id,
                status: "issued"
            })
                .select(
                    "certificateNumber projectName issueDate completionDate certificateFileId status remarks enrollment createdAt"
                )
                .populate({
                    path: "enrollment",
                    select: "projectSnapshot registrationStatus"
                })
                .sort({ issueDate: -1 })
                .lean();

            return res.status(200).json({
                success: true,
                certificates
            });

        } catch (error) {
            console.error(
                "Customer certificate loading error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to load certificates."
            });
        }
    }
);

module.exports = router;
