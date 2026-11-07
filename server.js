require("dotenv").config();

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const path = require("path");

const connectDB = require("./config/db");
const User = require("./models/User");

const app = express();

app.set("trust proxy", 1);

app.use(helmet({
    contentSecurityPolicy: false
}));

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
        const SESSION_SECRET = process.env.SESSION_SECRET;

        if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
            throw new Error(
                "SESSION_SECRET must contain at least 32 characters."
            );
        }

        await connectDB();

        console.log("Database connected successfully.");

        app.use(session({
            name: "hbps.sid",
            secret: SESSION_SECRET,
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
        app.use("/api/auth", require("./routes/auth"));

        // ADMIN AUTHENTICATION
        app.use("/api/admin/auth", require("./routes/adminAuth"));

        // CUSTOMER PROJECTS
        app.use("/api/projects", require("./routes/projects"));

        // ENROLLMENTS
        app.use("/api/enrollments", require("./routes/enrollments"));

        // WORK ASSIGNMENTS
        app.use("/api/work-assignments", require("./routes/workAssignments"));

        // ADMIN PROJECT MANAGEMENT
        app.use("/api/admin/projects", require("./routes/adminProjects"));

        // ADMIN CUSTOMER MANAGEMENT
        app.use("/api/admin/customers", require("./routes/adminCustomers"));

        // CUSTOMER PROFILE
        app.use("/api/profile", require("./routes/profile"));

        // NOTIFICATIONS
        app.use("/api/notifications", require("./routes/notifications"));

        // CUSTOMER CHARGES
        app.use("/api/customer-charges", require("./routes/customerCharges"));

        // CUSTOMER SUPPORT
        app.use("/api/support", require("./routes/support"));

        // CUSTOMER WORK SHOWCASE
        app.use("/api/showcase", require("./routes/showcase"));

        // WEBSITE SETTINGS
        app.use("/api/settings", require("./routes/settings"));

        // COMPANY CERTIFICATE
        app.use("/api/company-certificate", require("./routes/companyCertificate"));

        // ACTIVITY LOGS
        app.use("/api/activity-logs", require("./routes/activityLogs"));

        // FILE UPLOADS
        app.use("/api/uploads", require("./routes/uploads"));

        // PAYMENTS
        app.use("/api/payments", require("./routes/payments"));

        // SALARY MANAGEMENT
        app.use("/api/salaries", require("./routes/salaries"));

        // HEALTH CHECK
        app.get("/api/health", (req, res) => {
            res.set("Cache-Control", "no-store");

            return res.status(200).json({
                success: true,
                message: "Server is running.",
                database: "Connected"
            });
        });

        // CUSTOMER PAGE AUTHENTICATION
        async function requireCustomerPage(req, res, next) {
            try {
                if (
                    !req.session ||
                    !req.session.userId ||
                    req.session.role !== "customer"
                ) {
                    return res.redirect("/");
                }

                const user = await User.findById(req.session.userId);

                if (
                    !user ||
                    user.isBlocked ||
                    user.role !== "customer"
                ) {
                    return res.redirect("/");
                }

                req.user = user;

                res.set("Cache-Control", "no-store");

                return next();

            } catch (error) {
                console.error(
                    "Customer page authentication error:",
                    error
                );

                return res.status(500).send(
                    "Unable to verify your account."
                );
            }
        }

        // LOGIN AND REGISTRATION PAGE
        app.get("/", async (req, res) => {
            try {
                if (
                    req.session &&
                    req.session.userId &&
                    req.session.role === "customer"
                ) {
                    const user = await User.findById(req.session.userId);

                    if (
                        user &&
                        !user.isBlocked &&
                        user.role === "customer"
                    ) {
                        return res.redirect("/dashboard.html");
                    }
                }

                res.set("Cache-Control", "no-store");

                return res.sendFile(
                    path.join(__dirname, "public", "index.html")
                );

            } catch (error) {
                console.error("Homepage error:", error);

                return res.status(500).send(
                    "Unable to load website."
                );
            }
        });

        // LOGIN AND REGISTRATION PAGE
        app.get("/index.html", (req, res) => {
            res.set("Cache-Control", "no-store");

            return res.sendFile(
                path.join(__dirname, "public", "index.html")
            );
        });

        // PROTECTED CUSTOMER DASHBOARD
        app.get(
            "/dashboard.html",
            requireCustomerPage,
            (req, res) => {
                return res.sendFile(
                    path.join(__dirname, "public", "dashboard.html")
                );
            }
        );

        // ADMIN PANEL PAGE
        app.get("/admin.html", (req, res) => {
            res.set("Cache-Control", "no-store");

            return res.sendFile(
                path.join(__dirname, "public", "admin.html")
            );
        });

        // UNKNOWN API ROUTES
        app.use("/api", (req, res) => {
            return res.status(404).json({
                success: false,
                message: "API route not found."
            });
        });

        // UNKNOWN WEBSITE PAGES
        app.use((req, res) => {
            return res.status(404).send("Page not found.");
        });

        // ERROR HANDLER
        app.use((err, req, res, next) => {
            console.error("Application error:", err);

            if (res.headersSent) {
                return next(err);
            }

            return res.status(err.status || 500).json({
                success: false,
                message: "Internal server error."
            });
        });

        // START SERVER
        const PORT = process.env.PORT || 5000;

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on port ${PORT}`);
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
