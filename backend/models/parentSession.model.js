const mongoose = require("mongoose");

const parentSessionSchema = new mongoose.Schema(
    {
        phone: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        students: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Student",
            },
        ],
        lastLogin: {
            type: Date,
            default: Date.now,
        },
        deviceInfo: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
);

// Index for faster lookups
parentSessionSchema.index({ phone: 1 });
parentSessionSchema.index({ students: 1 });

module.exports =
    mongoose.models.ParentSession ||
    mongoose.model("ParentSession", parentSessionSchema);
