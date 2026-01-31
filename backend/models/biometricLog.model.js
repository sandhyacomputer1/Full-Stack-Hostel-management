// server/models/BiometricLog.js
const mongoose = require("mongoose");

const biometricLogSchema = new mongoose.Schema(
  {
    assignedHostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: false,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: false,
      index: true,
    },
    rawId: {
      type: String,
      required: true,
      trim: true,
    },
    deviceId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    event: {
      type: String,
      enum: ["IN", "OUT", "SCAN"],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ["success", "fail", "unknown"],
      default: "unknown",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

biometricLogSchema.index({ deviceId: 1, timestamp: -1 });
biometricLogSchema.index({ assignedHostel: 1, timestamp: -1 });

module.exports = mongoose.model("BiometricLog", biometricLogSchema);
