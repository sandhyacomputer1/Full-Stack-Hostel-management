// backend/models/messAttendance.model.js
const mongoose = require("mongoose");

const messAttendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    assignedHostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
      index: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
      validate: {
        validator: function (v) {
          return /^\d{4}-\d{2}-\d{2}$/.test(v);
        },
        message: "Date must be in YYYY-MM-DD format",
      },
    },

    mealType: {
      type: String,
      enum: ["breakfast", "lunch", "dinner"],
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["present", "absent", "on_mess_off"],
      default: "present",
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },

    source: {
      type: String,
      enum: ["manual", "biometric"],
      default: "manual",
    },

    // Track which biometric device marked attendance
    deviceId: {
      type: String,
      default: null,
      index: true,
    },

    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

// ✅ UPDATED: Compound index with assignedHostel for multi-tenant isolation
messAttendanceSchema.index(
  { student: 1, date: 1, mealType: 1, assignedHostel: 1 },
  { unique: true }
);

// ✅ Additional indexes with assignedHostel
messAttendanceSchema.index({ assignedHostel: 1, date: 1, mealType: 1 });
messAttendanceSchema.index({ assignedHostel: 1, student: 1, date: 1 });
messAttendanceSchema.index({ date: 1, mealType: 1 });
messAttendanceSchema.index({ student: 1, date: 1 });
messAttendanceSchema.index({ source: 1, timestamp: -1 });
messAttendanceSchema.index({ deviceId: 1, date: 1 });

// ✅ UPDATED: Static method with hostel filter
messAttendanceSchema.statics.getMealAttendance = async function (
  date,
  mealType,
  hostelId,
  block = null
) {
  const pipeline = [
    { $match: { date, mealType, assignedHostel: hostelId } }, // ✅ Added hostel filter
    {
      $lookup: {
        from: "students",
        localField: "student",
        foreignField: "_id",
        as: "student",
      },
    },
    { $unwind: "$student" },
  ];

  if (block) {
    pipeline.push({ $match: { "student.block": block } });
  }

  pipeline.push({ $sort: { "student.name": 1 } });

  return await this.aggregate(pipeline);
};

// ✅ UPDATED: Biometric stats with hostel filter
messAttendanceSchema.statics.getBiometricStats = async function (
  startDate,
  endDate,
  hostelId = null
) {
  const matchStage = {
    source: "biometric",
    date: { $gte: startDate, $lte: endDate },
  };

  if (hostelId) {
    matchStage.assignedHostel = hostelId; // ✅ Added hostel filter
  }

  return await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          date: "$date",
          mealType: "$mealType",
          deviceId: "$deviceId",
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { "_id.date": -1, "_id.mealType": 1 },
    },
  ]);
};

// ✅ UPDATED: Student history with hostel filter
messAttendanceSchema.statics.getStudentHistory = async function (
  studentId,
  startDate,
  endDate,
  hostelId = null
) {
  const query = {
    student: studentId,
    date: { $gte: startDate, $lte: endDate },
  };

  if (hostelId) {
    query.assignedHostel = hostelId; // ✅ Added hostel filter
  }

  return await this.find(query)
    .sort({ date: -1, mealType: 1 })
    .lean();
};

// Instance method to check if marked by biometric
messAttendanceSchema.methods.isMarkedByBiometric = function () {
  return this.source === "biometric" && this.deviceId !== null;
};

module.exports = mongoose.model("MessAttendance", messAttendanceSchema);
