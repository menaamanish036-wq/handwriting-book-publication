require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();

app.set("trust proxy", 1);

// Security
app.use(helmet());

app.use(compression());

// Request body limits
app.use(express.json({ limit: "2mb" }));

app.use(express.urlencoded({
    extended: true,
    limit: "2mb"
}));

// Rate limiting
app.use("/api", rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false
}));

// Start application
async function startServer() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI;
        const SESSION_SECRET = process.env.SESSION_SECRET;

        if (!MONGODB_URI) {
            throw new Error("MONGODB_URI is missing.");
        }

        if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
            throw new Error(
                "SESSION_SECRET must contain at least 32 characters."
            );
        }

        // Connect MongoDB
        await mongoose.connect(MONGODB_URI);

        console.log("MongoDB connected successfully.");

        // Session configuration
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

        // Health check
        app.get("/api/health", (req, res) => {
            res.status(200).json({
                success: true,
                message: "Server is running.",
                database: "Connected"
            });
        });

        // Website files
        app.use(express.static(
            path.join(__dirname, "public")
        ));

        // Unknown API routes
        app.use("/api", (req, res) => {
            res.status(404).json({
                success: false,
                message: "API route not found."
            });
        });

        // 404 handler
        app.use((req, res) => {
            res.status(404).send("Page not found.");
        });

        // Error handler
        app.use((err, req, res, next) => {
            console.error(err);

            res.status(err.status || 500).json({
                success: false,
                message: "Internal server error."
            });
        });

        // Start server
        const PORT = process.env.PORT || 5000;

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Startup error:", error.message);
        process.exit(1);
    }
}

startServer();
