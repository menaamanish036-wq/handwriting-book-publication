const Project = require("../models/Project");

const defaultProjects = [
    {
        projectName: "Project 1",
        projectNumber: 1,
        pages: 50,
        sides: 100,
        durationDays: 7,
        salary: 25000,
        registrationFee: 499,
        description: "50 Pages Handwriting Project. Complete 100 Sides Within 7 Days.",
        instructions: "WRITE ALL ASSIGNED WORK IN ENGLISH UPPERCASE LETTERS A-Z.",
        isActive: true
    },
    {
        projectName: "Project 2",
        projectNumber: 2,
        pages: 90,
        sides: 180,
        durationDays: 10,
        salary: 30000,
        registrationFee: 750,
        description: "90 Pages Handwriting Project. Complete 180 Sides Within 10 Days.",
        instructions: "WRITE ALL ASSIGNED WORK IN ENGLISH UPPERCASE LETTERS A-Z.",
        isActive: true
    },
    {
        projectName: "Project 3",
        projectNumber: 3,
        pages: 120,
        sides: 240,
        durationDays: 15,
        salary: 35000,
        registrationFee: 1199,
        description: "120 Pages Handwriting Project. Complete 240 Sides Within 15 Days.",
        instructions: "WRITE ALL ASSIGNED WORK IN ENGLISH UPPERCASE LETTERS A-Z.",
        isActive: true
    },
    {
        projectName: "Project 4",
        projectNumber: 4,
        pages: 190,
        sides: 380,
        durationDays: 26,
        salary: 40000,
        registrationFee: 1499,
        description: "190 Pages Handwriting Project. Complete 380 Sides Within 26 Days.",
        instructions: "WRITE ALL ASSIGNED WORK IN ENGLISH UPPERCASE LETTERS A-Z.",
        isActive: true
    }
];

async function seedDefaultProjects() {
    try {
        for (const projectData of defaultProjects) {
            const existingProject = await Project.findOne({
                projectNumber: projectData.projectNumber
            });

            if (!existingProject) {
                await Project.create(projectData);

                console.log(
                    `Default Project ${projectData.projectNumber} created.`
                );
            } else {
                console.log(
                    `Project ${projectData.projectNumber} already exists. Skipping.`
                );
            }
        }

        console.log("Default projects check completed.");

    } catch (error) {
        console.error("Default projects setup failed:", error);
        throw error;
    }
}

module.exports = seedDefaultProjects;
