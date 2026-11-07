require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/User");

async function createAdmin() {
  try {
    const {
      MONGODB_URI,
      ADMIN_NAME,
      ADMIN_EMAIL,
      ADMIN_MOBILE,
      ADMIN_PASSWORD
    } = process.env;

    if (
      !MONGODB_URI ||
      !ADMIN_NAME ||
      !ADMIN_EMAIL ||
      !ADMIN_MOBILE ||
      !ADMIN_PASSWORD
    ) {
      throw new Error("Required admin environment variables are missing.");
    }

    if (ADMIN_PASSWORD.length < 12) {
      throw new Error("Admin password must be at least 12 characters.");
    }

    await mongoose.connect(MONGODB_URI);

    const existingAdmin = await User.findOne({
      role: "admin"
    });

    if (existingAdmin) {
      throw new Error("An admin account already exists.");
    }

    const admin = await User.create({
      fullName: ADMIN_NAME,
      email: ADMIN_EMAIL.toLowerCase(),
      mobile: ADMIN_MOBILE,
      password: ADMIN_PASSWORD,
      role: "admin"
    });

    console.log("Admin account created successfully.");
    console.log("Admin ID:", admin._id);

  } catch (error) {
    console.error("Admin creation failed:", error.message);
    process.exitCode = 1;

  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();
