// server/models/messSettings.model.js
const mongoose = require("mongoose");

const messSettingsSchema = new mongoose.Schema(
  {
    assignedHostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
      index: true,
    },

    // 3 meals with start/end
    mealTimings: {
      breakfast: {
        start: { type: String, default: "07:00" },
        end: { type: String, default: "09:00" },
      },
      lunch: {
        start: { type: String, default: "12:00" },
        end: { type: String, default: "14:00" },
      },
      dinner: {
        start: { type: String, default: "19:00" },
        end: { type: String, default: "21:00" },
      },
    },

    // Auto-mark settings
    autoMarkAbsent: {
      enabled: { type: Boolean, default: true },
      time: { type: String, default: "23:00" },
    },

    // Mess-off rules
    messOffMinDays: {
      type: Number,
      default: 2,
    },

    messOffAdvanceNotice: {
      type: Number,
      default: 1,
    },

    // Guest meal charges
    guestMealCharge: {
      type: Number,
      default: 100,
    },
  },
  { timestamps: true }
);

// ✅ ADDED: Unique index per hostel
messSettingsSchema.index(
  { assignedHostel: 1 },
  { unique: true }
);

module.exports = mongoose.model("MessSettings", messSettingsSchema);
