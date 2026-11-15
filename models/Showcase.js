const mongoose = require("mongoose");

const showcaseSchema = new mongoose.Schema(
{
fileId: {
type: mongoose.Schema.Types.ObjectId,
required: true
},

    fileName: {
        type: String,
        default: ""
    },

    fileType: {
        type: String,
        enum: [
            "image/jpeg",
            "image/png",
            "image/webp"
        ],
        required: true
    },

    isPublished: {
        type: Boolean,
        default: false
    },

    displayOrder: {
        type: Number,
        default: 0
    },

    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    }
},
{
    timestamps: true
}

);

showcaseSchema.index({
isPublished: 1,
displayOrder: 1
});

module.exports = mongoose.model(
"Showcase",
showcaseSchema
);
