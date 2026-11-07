const express = require("express");
const Project = require("../models/Project");
const { requireLogin } = require("../middleware/auth");

const router = express.Router();

// Get all active projects for logged-in customers
router.get("/", requireLogin, async (req, res) => {
    try {
        const projects = await Project.find({
            isActive: true
        })
        .select(
            "projectName projectNumber pages sides durationDays salary registrationFee description"
        )
        .sort({ projectNumber: 1 });

        return res.status(200).json({
            success: true,
            projects
        });

    } catch (error) {
        console.error("Projects loading error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load projects."
        });
    }
});

// Get one project by ID
router.get("/:id", requireLogin, async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.id,
            isActive: true
        }).select(
            "projectName projectNumber pages sides durationDays salary registrationFee description instructions"
        );

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found."
            });
        }

        return res.status(200).json({
            success: true,
            project
        });

    } catch (error) {
        console.error("Project details error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load project details."
        });
    }
});

module.exports = router;
