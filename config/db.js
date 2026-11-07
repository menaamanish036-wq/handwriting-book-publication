const mongoose = require("mongoose");

async function connectDB() {
    try {
        const mongoURI = process.env.MONGODB_URI;

        if (!mongoURI) {
            throw new Error("MongoDB URI is missing.");
        }

        await mongoose.connect(mongoURI);

        console.log("MongoDB connected successfully.");

        return mongoose.connection;

    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        throw error;
    }
}

module.exports = connectDB;
