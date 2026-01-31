// src/models/employeeAttendance.model.js

const mongoose = require("mongoose");

const employeeAttendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    assignedHostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
    },
    entries: [
      {
        type: {
          type: String,
          enum: ["IN", "OUT"],
          required: true,
        },
        timestamp: {
          type: Date,
          required: true,
        },
        source: {
          type: String,
          enum: ["manual", "auto", "bulk", "device"],
          default: "manual",
        },
        deviceId: String,
        markedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        notes: String,
      },
    ],
    checkInTime: Date,
    checkOutTime: Date,
    totalHours: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: [
        "present",
        "absent",
        "half_day",
        "late",
        "early_leave",
        "on_leave",
        "holiday",
      ],
      default: "present",
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    isEarlyLeave: {
      type: Boolean,
      default: false,
    },
    leaveApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployeeLeaveApplication",
    },
    // ✅ UPDATED: Validation Issues for Reconciliation
    validationIssues: [
      {
        type: {
          type: String,
          enum: [
            "WARNING",
            "ERROR",
            "INFO",
            "LATE_ARRIVAL",
            "EARLY_LEAVE",
            "EXCESSIVE_ENTRIES",
            "MISSING_CHECKOUT",
            "INCOMPLETE_PAIR",
            "WEEKEND_MARKING",
            "AFTER_HOURS",
            "LEAVE_CONFLICT",
            "DUPLICATE_ENTRY",
          ],
          default: "WARNING",
        },
        severity: {
          type: String,
          enum: ["low", "medium", "high", "critical"],
          default: "medium",
        },
        message: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        metadata: mongoose.Schema.Types.Mixed, // For additional data
      },
    ],
    // ✅ Reconciliation Fields
    reconciled: {
      type: Boolean,
      default: false,
    },
    reconciledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reconciledAt: Date,
    reconciliationNotes: String,
    notes: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Index for quick reconciliation queries
employeeAttendanceSchema.index({ assignedHostel: 1, reconciled: 1 });
employeeAttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
employeeAttendanceSchema.index({ date: 1, assignedHostel: 1 });

// ============ METHODS ============

/**
 * Update check-in/out times and calculate total hours
 */
employeeAttendanceSchema.methods.updateTimesFromEntries = function () {
  if (!this.entries || this.entries.length === 0) {
    return;
  }

  // Sort entries by timestamp
  const sortedEntries = this.entries.sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  // Find first IN and last OUT
  const firstIn = sortedEntries.find((e) => e.type === "IN");
  const lastOut = sortedEntries
    .slice()
    .reverse()
    .find((e) => e.type === "OUT");

  if (firstIn) {
    this.checkInTime = firstIn.timestamp;
  }

  if (lastOut) {
    this.checkOutTime = lastOut.timestamp;
  }

  // Calculate total hours
  if (this.checkInTime && this.checkOutTime) {
    const diff = new Date(this.checkOutTime) - new Date(this.checkInTime);
    this.totalHours = parseFloat((diff / (1000 * 60 * 60)).toFixed(2));
  } else {
    this.totalHours = 0;
  }
};

// ============ STATIC METHODS ============

/**
 * Get attendance by date range
 */
employeeAttendanceSchema.statics.getAttendanceByDateRange = async function (
  employeeId,
  startDate,
  endDate
) {
  const query = { employee: employeeId };

  if (startDate && endDate) {
    query.date = { $gte: startDate, $lte: endDate };
  }

  return this.find(query)
    .populate("employee", "fullName employeeCode role")
    .populate("leaveApplication", "leaveType")
    .sort({ date: -1 });
};

/**
 * Get daily summary for a hostel
 */
employeeAttendanceSchema.statics.getDailySummary = async function (
  hostelId,
  date
) {
  const Employee = mongoose.model("Employee");

  // Get total active employees for the hostel
  const totalEmployees = await Employee.countDocuments({
    assignedHostel: hostelId,
    status: "ACTIVE",
  });

  // Get attendance records for the date
  const attendance = await this.find({
    assignedHostel: hostelId,
    date: date,
  });

  const summary = {
    total: totalEmployees,
    marked: attendance.length,
    notMarked: totalEmployees - attendance.length,
    present: 0,
    absent: 0,
    half_day: 0,
    late: 0,
    early_leave: 0,
    on_leave: 0,
    holiday: 0,
  };

  // Count by status
  attendance.forEach((record) => {
    if (summary[record.status] !== undefined) {
      summary[record.status]++;
    }
  });

  // Not marked employees are considered absent
  summary.absent += summary.notMarked;

  return summary;
};

/**
 * Get monthly summary for an employee
 */
employeeAttendanceSchema.statics.getMonthlySummary = async function (
  employeeId,
  month,
  year
) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  const attendance = await this.find({
    employee: employeeId,
    date: { $gte: startDate, $lte: endDate },
  });

  const summary = {
    totalDays: attendance.length,
    present: 0,
    absent: 0,
    half_day: 0,
    late: 0,
    early_leave: 0,
    on_leave: 0,
    totalHours: 0,
  };

  attendance.forEach((record) => {
    if (summary[record.status] !== undefined) {
      summary[record.status]++;
    }
    summary.totalHours += record.totalHours || 0;
  });

  summary.totalHours = parseFloat(summary.totalHours.toFixed(2));

  return summary;
};

const EmployeeAttendance = mongoose.model(
  "EmployeeAttendance",
  employeeAttendanceSchema
);

module.exports = EmployeeAttendance;
