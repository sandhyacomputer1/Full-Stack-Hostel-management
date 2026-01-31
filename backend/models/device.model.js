// server/models/Device.js
const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    apiKey: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    assignedHostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["gate", "mess", "other"],
      default: "gate",
    },
    lastSeen: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

deviceSchema.index({ deviceId: 1 });

module.exports = mongoose.model("Device", deviceSchema);
