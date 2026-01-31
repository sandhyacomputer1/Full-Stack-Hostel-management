// server/models/guestMeal.model.js
const mongoose = require("mongoose");

const guestMealSchema = new mongoose.Schema(
  {
    guestName: {
      type: String,
      required: true,
      trim: true,
    },

    purpose: {
      type: String,
      trim: true,
    },

    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },

    mealType: {
      type: String,
      enum: ["breakfast", "lunch", "snacks", "dinner"],
      required: true,
    },

    // Which student is responsible for this guest
    hostedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    charge: {
      type: Number,
      required: true,
      default: 100, // ₹100 per guest meal
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },

    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Index for billing queries
guestMealSchema.index({ hostedBy: 1, date: 1 });

module.exports = mongoose.model("GuestMeal", guestMealSchema);
