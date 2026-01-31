// server/models/mealPlan.model.js
const mongoose = require("mongoose");

const mealPlanSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      unique: true, // ⭐ One meal plan per student
      index: true,
    },

    // Plan type (always "full" for your hostel)
    planType: {
      type: String,
      enum: ["full"],
      default: "full",
    },

    // Meal eligibility (all true by default)
    meals: {
      breakfast: { type: Boolean, default: true },
      lunch: { type: Boolean, default: true },
      dinner: { type: Boolean, default: true },
    },

    // Active status
    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Start date (when enrolled in mess)
    startDate: {
      type: Date,
      default: Date.now,
      required: true,
    },

    // End date (null = no end date)
    endDate: {
      type: Date,
      default: null,
    },

    // Optional notes
    notes: {
      type: String,
      trim: true,
    },
  },
  { 
    timestamps: true,
  }
);

// ⭐ COMPOUND INDEX: For efficient queries
mealPlanSchema.index({ student: 1, active: 1 });

// ⭐ STATIC METHOD: Check if student has active meal plan
mealPlanSchema.statics.hasActivePlan = async function (studentId) {
  const plan = await this.findOne({
    student: studentId,
    active: true,
  });
  return !!plan;
};

// ⭐ STATIC METHOD: Get active plan for student
mealPlanSchema.statics.getActivePlan = async function (studentId) {
  return this.findOne({
    student: studentId,
    active: true,
    startDate: { $lte: new Date() },
    $or: [
      { endDate: null },
      { endDate: { $gte: new Date() } }
    ]
  });
};

module.exports = mongoose.model("MealPlan", mealPlanSchema);
