const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        customerId: {
            type: String,
            unique: true,
            sparse: true
        },

        fullName: {
            type: String,
            required: true,
            trim: true
        },

        fatherName: {
            type: String,
            trim: true,
            default: ""
        },

        mobile: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        whatsapp: {
            type: String,
            trim: true,
            default: ""
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        dateOfBirth: {
            type: Date,
            default: null
        },

        gender: {
            type: String,
            enum: ["Male", "Female", "Other", ""],
            default: ""
        },

        address: {
            type: String,
            default: ""
        },

        state: {
            type: String,
            default: ""
        },

        district: {
            type: String,
            default: ""
        },

        city: {
            type: String,
            default: ""
        },

        pinCode: {
            type: String,
            default: ""
        },

        password: {
            type: String,
            required: true,
            minlength: 8,
            select: false
        },

        role: {
            type: String,
            enum: ["customer", "admin"],
            default: "customer"
        },

        accountStatus: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending"
        },

        isBlocked: {
            type: Boolean,
            default: false
        },

        registrationDate: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

// Hash password before saving
userSchema.pre("save", async function () {
    if (!this.isModified("password")) {
        return;
    }

    this.password = await bcrypt.hash(this.password, 12);
});

// Compare password during login
userSchema.methods.comparePassword = async function (enteredPassword) {
    return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
