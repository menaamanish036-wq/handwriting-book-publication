const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");

const router = express.Router();

// Admin Login
router.post(
    "/login",
    [
        body("email").trim().isEmail().normalizeEmail(),
        body("password").notEmpty()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter valid login details."
                });
            }

            const { email, password } = req.body;

            const admin = await User.findOne({
                email,
                role: "admin"
            }).select("+password");

            if (!admin || admin.isBlocked) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid admin login details."
                });
            }

            const passwordMatch = await bcrypt.compare(
                password,
                admin.password
            );

            if (!passwordMatch) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid admin login details."
                });
            }

            req.session.regenerate((error) => {
                if (error) {
                    return res.status(500).json({
                        success: false,
                        message: "Unable to create admin session."
                    });
                }

                req.session.userId = admin._id.toString();
                req.session.role = "admin";

                req.session.save((saveError) => {
                    if (saveError) {
                        return res.status(500).json({
                            success: false,
                            message: "Unable to save admin session."
                        });
                    }

                    return res.json({
                        success: true,
                        message: "Admin login successful."
                    });
                });
            });

        } catch (error) {
            console.error("Admin login error:", error);

            res.status(500).json({
                success: false,
                message: "Admin login failed."
            });
        }
    }
);

// Check Admin Session
router.get("/me", async (req, res) => {
    try {
        if (
            !req.session.userId ||
            req.session.role !== "admin"
        ) {
            return res.status(401).json({
                success: false,
                message: "Admin login required."
            });
        }

        const admin = await User.findOne({
            _id: req.session.userId,
            role: "admin",
            isBlocked: false
        });

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Admin account not available."
            });
        }

        res.json({
            success: true,
            admin: {
                id: admin._id,
                fullName: admin.fullName,
                email: admin.email
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Unable to check admin session."
        });
    }
});

// Admin Logout
router.post("/logout", (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                success: false,
                message: "Logout failed."
            });
        }

        res.clearCookie("hbps.sid");

        res.json({
            success: true,
            message: "Admin logout successful."
        });
    });
});

module.exports = router;
