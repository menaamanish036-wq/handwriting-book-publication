require("dotenv").config();

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");

const connectDB = require("./config/db");

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(compression());

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({
    extended: true,
    limit: "2mb"
}));

app.use("/api", rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false
}));

async function startServer() {
    try {
        if (
            !process.env.SESSION_SECRET ||
            process.env.SESSION_SECRET.length < 32
        ) {
            throw new Error(
                "SESSION_SECRET must contain at least 32 characters."
            );
        }

        await connectDB();

        console.log("Database connected.");

        app.use(session({
            name: "hbps.sid",
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,

            store: MongoStore.create({
                client: mongoose.connection.getClient(),
                collectionName: "sessions",
                ttl: 14 * 24 * 60 * 60
            }),

            cookie: {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 14 * 24 * 60 * 60 * 1000
            }
        }));

        // CUSTOMER AUTHENTICATION
        app.use("/api/auth",
            require("./routes/auth"));

        // ADMIN AUTHENTICATION
        app.use("/api/admin/auth",
            require("./routes/adminAuth"));

        // PROJECTS
        app.use("/api/projects",
            require("./routes/projects"));

        // ENROLLMENTS
        app.use("/api/enrollments",
            require("./routes/enrollments"));

        // ADMIN PROJECTS
        app.use("/api/admin/projects",
            require("./routes/adminProjects"));

        // CUSTOMER PROFILE
        app.use("/api/profile",
            require("./routes/profile"));

        // NOTIFICATIONS
        app.use("/api/notifications",
            require("./routes/notifications"));

        // CUSTOMER CHARGES
        app.use("/api/customer-charges",
            require("./routes/customerCharges"));

        // SUPPORT
        app.use("/api/support",
            require("./routes/support"));

        // CUSTOMER WORK SHOWCASE
        app.use("/api/showcase",
            require("./routes/showcase"));

        // WEBSITE SETTINGS
        app.use("/api/settings",
            require("./routes/settings"));

        // COMPANY CERTIFICATE
        app.use("/api/company-certificate",
            require("./routes/companyCertificate"));

        // ACTIVITY LOGS
        app.use("/api/activity-logs",
            require("./routes/activityLogs"));

        // FILE UPLOADS
        app.use("/api/uploads",
            require("./routes/uploads"));

        // PAYMENTS
        app.use("/api/payments",
            require("./routes/payments"));

        // HEALTH CHECK
        app.get("/api/health", (req, res) => {
            res.status(200).json({
                success: true,
                message: "Server is running.",
                database: "Connected"
            });
        });

        // UNKNOWN API ROUTES
        app.use("/api", (req, res) => {
            res.status(404).json({
                success: false,
                message: "API route not found."
            });
        });

        // UNKNOWN PAGES
        app.use((req, res) => {
            res.status(404).send("Page not found.");
        });

        // ERROR HANDLER
        app.use((err, req, res, next) => {
            console.error(err);

            res.status(err.status || 500).json({
                success: false,
                message: "Internal server error."
            });
        });

        const PORT = process.env.PORT || 5000;

        app.listen(PORT, "0.0.0.0", () => {
            console.log(
                `Server running on port ${PORT}`
            );
        });

    } catch (error) {
        console.error(
            "Server startup failed:",
            error.message
        );

        process.exit(1);
    }
}

startServer();
