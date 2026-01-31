// server/models/marksSettings.model.js
const mongoose = require("mongoose");

const marksSettingsSchema = new mongoose.Schema(
    {
        assignedHostel: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hostel",
            required: true,
            unique: true,
        },

        // Pass/Fail Configuration
        passPercentage: {
            type: Number,
            default: 33,
            min: 0,
            max: 100,
        },

        // Default Academic Year
        defaultAcademicYear: {
            type: String,
            default: "2024-25",
            match: /^\d{4}-\d{2}$/,
        },

        // Grade Boundaries (percentage thresholds)
        gradeBoundaries: {
            APlus: { type: Number, default: 90, min: 0, max: 100 },
            A: { type: Number, default: 80, min: 0, max: 100 },
            BPlus: { type: Number, default: 70, min: 0, max: 100 },
            B: { type: Number, default: 60, min: 0, max: 100 },
            CPlus: { type: Number, default: 50, min: 0, max: 100 },
            C: { type: Number, default: 40, min: 0, max: 100 },
            D: { type: Number, default: 33, min: 0, max: 100 },
        },

        // Additional Settings (optional)
        enableParentNotification: {
            type: Boolean,
            default: false,
        },

        enableRankCalculation: {
            type: Boolean,
            default: true,
        },

        lastUpdatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster hostel-based lookups
marksSettingsSchema.index({ assignedHostel: 1 });

module.exports = mongoose.model("MarksSettings", marksSettingsSchema);
