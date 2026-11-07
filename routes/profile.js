const express = require("express");
const { body, validationResult } = require("express-validator");
const { requireLogin } = require("../middleware/auth");

const router = express.Router();

// Get customer profile
router.get("/", requireLogin, async (req, res) => {
    try {
        const user = req.user;

        return res.status(200).json({
            success: true,
            profile: {
                customerId: user.customerId,
                fullName: user.fullName,
                fatherName: user.fatherName,
                mobile: user.mobile,
                whatsapp: user.whatsapp,
                email: user.email,
                dateOfBirth: user.dateOfBirth,
                gender: user.gender,
                address: user.address,
                state: user.state,
                district: user.district,
                city: user.city,
                pinCode: user.pinCode,
                accountStatus: user.accountStatus,
                registrationDate: user.registrationDate
            }
        });

    } catch (error) {
        console.error("Profile error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load profile."
        });
    }
});

// Update customer profile
router.put(
    "/",
    requireLogin,
    [
        body("fullName").trim().notEmpty(),
        body("whatsapp").optional().trim(),
        body("fatherName").optional().trim(),
        body("address").optional().trim(),
        body("state").optional().trim(),
        body("district").optional().trim(),
        body("city").optional().trim(),
        body("pinCode").optional().trim()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const allowedFields = [
                "fullName",
                "fatherName",
                "whatsapp",
                "address",
                "state",
                "district",
                "city",
                "pinCode"
            ];

            allowedFields.forEach((field) => {
                if (req.body[field] !== undefined) {
                    req.user[field] = req.body[field];
                }
            });

            await req.user.save();

            return res.status(200).json({
                success: true,
                message: "Profile updated successfully."
            });

        } catch (error) {
            console.error("Profile update error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to update profile."
            });
        }
    }
);

module.exports = router;
