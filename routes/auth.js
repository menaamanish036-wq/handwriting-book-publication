const express = require("express");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");

const router = express.Router();

// CUSTOMER REGISTRATION
router.post(
    "/register",
    [
        body("mobile")
            .trim()
            .matches(/^[0-9]{10}$/)
            .withMessage("Enter a valid 10-digit mobile number."),

        body("password")
            .isLength({ min: 8 })
            .withMessage("Password must be at least 8 characters long."),

        body("confirmPassword")
            .custom((value, { req }) => {
                if (value !== req.body.password) {
                    throw new Error("Passwords do not match.");
                }
                return true;
            })
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

            const mobile = req.body.mobile.trim();
            const password = req.body.password;

            const existingUser = await User.findOne({ mobile });

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: "This mobile number is already registered."
                });
            }

            // Existing User model requires fullName and email.
            // Temporary values are used until project application details are submitted.
            const user = await User.create({
                fullName: "Customer",
                mobile: mobile,
                email: `${mobile}@noemail.handwritingbookpublication.invalid`,
                password: password,
                role: "customer",
                accountStatus: "approved",
                isBlocked: false
            });

            req.session.regenerate((error) => {
                if (error) {
                    return res.status(500).json({
                        success: false,
                        message: "Account created, but login session could not be started. Please login."
                    });
                }

                req.session.userId = user._id.toString();
                req.session.role = "customer";

                req.session.save((saveError) => {
                    if (saveError) {
                        return res.status(500).json({
                            success: false,
                            message: "Account created. Please login."
                        });
                    }

                    return res.status(201).json({
                        success: true,
                        message: "Account created successfully.",
                        customer: {
                            id: user._id,
                            mobile: user.mobile,
                            accountStatus: user.accountStatus
                        }
                    });
                });
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


// CUSTOMER LOGIN
router.post(
    "/login",
    [
        body("identifier")
            .trim()
            .matches(/^[0-9]{10}$/)
            .withMessage("Enter your registered 10-digit mobile number."),

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

            const mobile = req.body.identifier.trim();
            const password = req.body.password;

            const user = await User.findOne({ mobile }).select("+password");

            if (!user || user.role !== "customer") {
                return res.status(401).json({
                    success: false,
                    message: "Invalid mobile number or password."
                });
            }

            if (user.isBlocked) {
                return res.status(403).json({
                    success: false,
                    message: "Your account is blocked. Contact support."
                });
            }

            const passwordMatches = await user.comparePassword(password);

            if (!passwordMatches) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid mobile number or password."
                });
            }

            // Customer account does not require admin approval.
            if (user.accountStatus !== "approved") {
                user.accountStatus = "approved";
                await user.save();
            }

            req.session.regenerate((error) => {
                if (error) {
                    return res.status(500).json({
                        success: false,
                        message: "Unable to create login session."
                    });
                }

                req.session.userId = user._id.toString();
                req.session.role = "customer";

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
                            mobile: user.mobile,
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


// CUSTOMER LOGOUT
router.post("/logout", (req, res) => {
    if (!req.session) {
        return res.json({
            success: true,
            message: "Logout successful."
        });
    }

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


// CHECK CUSTOMER LOGIN STATUS
router.get("/me", async (req, res) => {
    try {
        if (!req.session || !req.session.userId ||
            req.session.role !== "customer") {
            return res.status(401).json({
                success: false,
                message: "Please login first."
            });
        }

        const user = await User.findById(req.session.userId);

        if (!user || user.isBlocked || user.role !== "customer") {
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
