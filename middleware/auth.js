const User = require("../models/User");

// Check whether user is logged in
async function requireLogin(req, res, next) {
    try {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                success: false,
                message: "Please login first."
            });
        }

        const user = await User.findById(req.session.userId);

        if (!user || user.isBlocked) {
            return res.status(401).json({
                success: false,
                message: "Account not available. Please login again."
            });
        }

        req.user = user;
        next();

    } catch (error) {
        console.error("Authentication error:", error);

        return res.status(500).json({
            success: false,
            message: "Authentication failed."
        });
    }
}

// Check whether user is admin
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Admin access only."
        });
    }

    next();
}

// Check whether customer is approved
function requireApproved(req, res, next) {
    if (!req.user || req.user.accountStatus !== "approved") {
        return res.status(403).json({
            success: false,
            message: "Your account is awaiting approval."
        });
    }

    next();
}

module.exports = {
    requireLogin,
    requireAdmin,
    requireApproved
};
