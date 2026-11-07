const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Salary = require("../models/Salary");

const {
requireLogin,
requireAdmin
} = require("../middleware/auth");

// CUSTOMER: VIEW OWN SALARY
router.get("/my", requireLogin, async (req, res) => {
try {
const salaries = await Salary.find({
customer: req.user._id
}).populate(
"enrollment",
"projectSnapshot registrationStatus"
).sort({ createdAt: -1 });

    return res.json({
        success: true,
        salaries
    });
} catch (error) {
    console.error("Customer salary error:", error);

    return res.status(500).json({
        success: false,
        message: "Unable to load salary records."
    });
}

});

// ADMIN: VIEW ALL SALARIES
router.get(
"/admin/all",
requireLogin,
requireAdmin,
async (req, res) => {
try {
const salaries = await Salary.find()
.populate("customer", "fullName email mobile")
.populate("enrollment", "projectSnapshot")
.sort({ createdAt: -1 });

        return res.json({
            success: true,
            salaries
        });
    } catch (error) {
        console.error("Admin salary error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load salary records."
        });
    }
}

);

// ADMIN: MARK 50% ADVANCE AS PAID
router.patch(
"/admin/:id/advance-paid",
requireLogin,
requireAdmin,
async (req, res) => {
try {
if (!mongoose.isValidObjectId(req.params.id)) {
return res.status(400).json({
success: false,
message: "Invalid salary ID."
});
}

        const salary = await Salary.findById(req.params.id);

        if (!salary) {
            return res.status(404).json({
                success: false,
                message: "Salary record not found."
            });
        }

        if (salary.advanceStatus === "paid") {
            return res.status(400).json({
                success: false,
                message: "Advance salary is already marked as paid."
            });
        }

        if (
            !salary.advanceDueAt ||
            new Date() < new Date(salary.advanceDueAt)
        ) {
            return res.status(400).json({
                success: false,
                message: "The 50% advance is not due yet. It becomes due 15 minutes after registration approval."
            });
        }

        salary.advanceStatus = "paid";
        salary.advancePaidAt = new Date();

        await salary.save();

        return res.json({
            success: true,
            message: "50% advance salary marked as paid.",
            salary
        });
    } catch (error) {
        console.error("Advance salary update error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update advance salary."
        });
    }
}

);

// ADMIN: MARK REMAINING 50% AS PAID
router.patch(
"/admin/:id/remaining-paid",
requireLogin,
requireAdmin,
async (req, res) => {
try {
if (!mongoose.isValidObjectId(req.params.id)) {
return res.status(400).json({
success: false,
message: "Invalid salary ID."
});
}

        const salary = await Salary.findById(req.params.id);

        if (!salary) {
            return res.status(404).json({
                success: false,
                message: "Salary record not found."
            });
        }

        if (salary.remainingStatus === "paid") {
            return res.status(400).json({
                success: false,
                message: "Remaining salary is already marked as paid."
            });
        }

        if (!salary.workCompletedAt) {
            return res.status(400).json({
                success: false,
                message: "The remaining 50% becomes payable only after work completion."
            });
        }

        salary.remainingStatus = "paid";
        salary.remainingPaidAt = new Date();

        await salary.save();

        return res.json({
            success: true,
            message: "Remaining 50% salary marked as paid.",
            salary
        });
    } catch (error) {
        console.error("Remaining salary update error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update remaining salary."
        });
    }
}

);

module.exports = router;
