// server/models/marks.model.js
const mongoose = require("mongoose");

const marksSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    // ✅ ADD THIS - Hostel Reference
    assignedHostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
    },

    // Exam/Test Information
    examType: {
      type: String,
      enum: [
        "weekly_test",
        "monthly_test",
        "unit_test",
        "mid_term",
        "final_exam",
        "assignment",
        "project",
        "quiz",
      ],
      required: true,
    },

    examName: {
      type: String,
      required: true,
      trim: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    // Marks Details
    marksObtained: {
      type: Number,
      required: true,
      min: 0,
    },

    totalMarks: {
      type: Number,
      required: true,
      min: 1,
    },

    percentage: {
      type: Number,
      min: 0,
      max: 100,
    },

    grade: {
      type: String,
      enum: ["A+", "A", "B+", "B", "C+", "C", "D", "F"],
    },

    // Date Information
    examDate: {
      type: Date,
      required: true,
    },

    resultDate: {
      type: Date,
      default: Date.now,
    },

    // Academic Session
    academicYear: {
      type: String,
      required: true, // Format: "2023-24"
    },

    semester: {
      type: String,
      enum: ["1", "2", "annual"],
    },

    // Additional Information
    remarks: String,

    // Teacher/Evaluator
    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Notification Status
    parentNotified: {
      type: Boolean,
      default: false,
    },
    notificationSentAt: Date,

    // Performance Indicators
    classAverage: Number,
    rank: Number,
    totalStudents: Number,

    // Improvement Tracking
    previousMarks: Number,
    improvement: {
      type: String,
      enum: ["improved", "declined", "same", "first_attempt"],
    },

    // Attendance during exam
    attendanceStatus: {
      type: String,
      enum: ["present", "absent", "late"],
      default: "present",
    },
  },
  {
    timestamps: true,
  }
);

// Calculate percentage before saving
marksSchema.pre("save", function (next) {
  if (this.marksObtained !== undefined && this.totalMarks !== undefined) {
    this.percentage =
      Math.round((this.marksObtained / this.totalMarks) * 100 * 100) / 100;

    // Calculate grade based on percentage
    if (this.percentage >= 90) this.grade = "A+";
    else if (this.percentage >= 80) this.grade = "A";
    else if (this.percentage >= 70) this.grade = "B+";
    else if (this.percentage >= 60) this.grade = "B";
    else if (this.percentage >= 50) this.grade = "C+";
    else if (this.percentage >= 40) this.grade = "C";
    else if (this.percentage >= 33) this.grade = "D";
    else this.grade = "F";
  }
  next();
});

// ✅ ADD HOSTEL INDEX
marksSchema.index({ assignedHostel: 1, student: 1, examDate: -1 });
marksSchema.index({ assignedHostel: 1, subject: 1, examType: 1 });
marksSchema.index({ assignedHostel: 1, academicYear: 1, semester: 1 });
marksSchema.index({ student: 1, examDate: -1 });
marksSchema.index({ subject: 1, examType: 1 });
marksSchema.index({ academicYear: 1, semester: 1 });
marksSchema.index({ examDate: -1 });

// Virtual for pass/fail status
marksSchema.virtual("isPassed").get(function () {
  return this.percentage >= 33;
});

// Method to get performance status
marksSchema.methods.getPerformanceStatus = function () {
  if (this.percentage >= 90) return "Excellent";
  if (this.percentage >= 80) return "Very Good";
  if (this.percentage >= 70) return "Good";
  if (this.percentage >= 60) return "Satisfactory";
  if (this.percentage >= 50) return "Average";
  if (this.percentage >= 33) return "Below Average";
  return "Needs Improvement";
};

module.exports = mongoose.model("Marks", marksSchema);
