const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");

const router = express.Router();

// Customer Registration
router.post(
    "/register",
    [
        body("fullName")
            .trim()
            .notEmpty()
            .withMessage("Full name is required."),

        body("mobile")
            .trim()
            .matches(/^[0-9]{10}$/)
            .withMessage("Enter a valid 10-digit mobile number."),

        body("email")
            .trim()
            .isEmail()
            .withMessage("Enter a valid email address.")
            .normalizeEmail(),

        body("password")
            .isLength({ min: 8 })
            .withMessage("Password must be at least 8 characters long.")
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

            const {
                fullName,
                fatherName,
                mobile,
                whatsapp,
                email,
                password,
                address,
                state,
                district,
                city,
                pinCode
            } = req.body;

            const existingUser = await User.findOne({
                $or: [
                    { email },
                    { mobile }
                ]
            });

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: "Email or mobile number is already registered."
                });
            }

            const user = await User.create({
                fullName,
                fatherName,
                mobile,
                whatsapp,
                email,
                password,
                address,
                state,
                district,
                city,
                pinCode,
                role: "customer",
                accountStatus: "pending"
            });

            return res.status(201).json({
                success: true,
                message: "Registration successful. Please login.",
                customer: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    accountStatus: user.accountStatus
                }
            });

        } catch (error) {
            console.error("Registration error:", error);

            return res.status(500).json({
                success: false,
                message: "Registration failed. Please try again."
            });
        }
    }
);

// Customer Login
router.post(
    "/login",
    [
        body("identifier")
            .trim()
            .notEmpty()
            .withMessage("Email or mobile number is required."),

        body("password")
            .notEmpty()
            .withMessage("Password is required.")
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

            const { identifier, password } = req.body;

            const user = await User.findOne({
                $or: [
                    { email: identifier.toLowerCase() },
                    { mobile: identifier }
                ]
            }).select("+password");

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid login details."
                });
            }

            if (user.isBlocked) {
                return res.status(403).json({
                    success: false,
                    message: "Your account is blocked. Contact support."
                });
            }

            const passwordMatches = await bcrypt.compare(
                password,
                user.password
            );

            if (!passwordMatches) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid login details."
                });
            }

            if (user.role !== "customer") {
                return res.status(403).json({
                    success: false,
                    message: "Customer login is not available for this account."
                });
            }

            req.session.regenerate((error) => {
                if (error) {
                    return res.status(500).json({
                        success: false,
                        message: "Unable to create login session."
                    });
                }

                req.session.userId = user._id.toString();
                req.session.role = user.role;

                req.session.save((saveError) => {
                    if (saveError) {
                        return res.status(500).json({
                            success: false,
                            message: "Unable to save login session."
                        });
                    }

                    return res.status(200).json({
                        success: true,
                        message: "Login successful.",
                        customer: {
                            id: user._id,
                            fullName: user.fullName,
                            accountStatus: user.accountStatus
                        }
                    });
                });
            });

        } catch (error) {
            console.error("Login error:", error);

            return res.status(500).json({
                success: false,
                message: "Login failed. Please try again."
            });
        }
    }
);

// Customer Logout
router.post("/logout", (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                success: false,
                message: "Logout failed."
            });
        }

        res.clearCookie("hbps.sid");

        return res.status(200).json({
            success: true,
            message: "Logout successful."
        });
    });
});

// Check Login Status
router.get("/me", async (req, res) => {
    try {
        if (!req.session.userId || req.session.role !== "customer") {
            return res.status(401).json({
                success: false,
                message: "Please login first."
            });
        }

        const user = await User.findById(req.session.userId);

        if (!user || user.isBlocked) {
            return res.status(401).json({
                success: false,
                message: "Account not available."
            });
        }

        return res.json({
            success: true,
            customer: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                mobile: user.mobile,
                accountStatus: user.accountStatus
            }
        });

    } catch (error) {
        console.error("Session check error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to check login status."
        });
    }
});

module.exports = router;
