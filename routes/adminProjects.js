const express = require("express");
const mongoose = require("mongoose");
const Project = require("../models/Project");
const {
    requireLogin,
    requireAdmin
} = require("../middleware/auth");

const router = express.Router();

// All admin routes require admin login
router.use(requireLogin, requireAdmin);

// Get all projects
router.get("/", async (req, res) => {
    try {
        const projects = await Project.find().sort({
            projectNumber: 1
        });

        res.json({
            success: true,
            projects
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Unable to load projects."
        });
    }
});

// Add new project
router.post("/", async (req, res) => {
    try {
        const {
            projectName,
            projectNumber,
            pages,
            sides,
            durationDays,
            salary,
            registrationFee,
            description,
            instructions
        } = req.body;

        if (
            !projectName ||
            !Number.isInteger(Number(projectNumber)) ||
            Number(projectNumber) < 1 ||
            !Number.isInteger(Number(pages)) ||
            Number(pages) < 1 ||
            !Number.isInteger(Number(sides)) ||
            Number(sides) < 1 ||
            !Number.isInteger(Number(durationDays)) ||
            Number(durationDays) < 1 ||
            !Number.isFinite(Number(salary)) ||
            Number(salary) < 0 ||
            !Number.isFinite(Number(registrationFee)) ||
            Number(registrationFee) < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Please enter valid project details."
            });
        }

        const project = await Project.create({
            projectName,
            projectNumber: Number(projectNumber),
            pages: Number(pages),
            sides: Number(sides),
            durationDays: Number(durationDays),
            salary: Number(salary),
            registrationFee: Number(registrationFee),
            description,
            instructions
        });

        res.status(201).json({
            success: true,
            message: "Project added successfully.",
            project
        });

    } catch (error) {
        res.status(error.code === 11000 ? 409 : 500).json({
            success: false,
            message: error.code === 11000
                ? "Project number already exists."
                : "Unable to add project."
        });
    }
});

// Update project
router.put("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID."
            });
        }

        const allowedFields = [
            "projectName",
            "projectNumber",
            "pages",
            "sides",
            "durationDays",
            "salary",
            "registrationFee",
            "description",
            "instructions",
            "isActive"
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        const project = await Project.findByIdAndUpdate(
            req.params.id,
            updates,
            {
                new: true,
                runValidators: true
            }
        );

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found."
            });
        }

        res.json({
            success: true,
            message: "Project updated successfully.",
            project
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Unable to update project."
        });
    }
});

// Deactivate project instead of permanently deleting it
router.delete("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID."
            });
        }

        const project = await Project.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found."
            });
        }

        res.json({
            success: true,
            message: "Project deactivated successfully."
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Unable to deactivate project."
        });
    }
});

module.exports = router;
