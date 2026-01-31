// server/models/attendance.model.js
const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    // NEW: hostel link for multi-tenant isolation
    assignedHostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true, // ✅ you said you made it required
      index: true,
    },

    // YYYY-MM-DD for easy grouping
    date: {
      type: String,
      required: true,
      index: true,
      validate: {
        validator: function (v) {
          return /^\d{4}-\d{2}-\d{2}$/.test(v);
        },
        message: (props) =>
          `${props.value} is not a valid date format (YYYY-MM-DD)`,
      },
    },

    type: {
      type: String,
      enum: ["IN", "OUT"],
      required: true,
    },

    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "present",
        "absent",
        "on_leave",
        "late",
        "excused",
        "left_early",
        "half_day",
        "unknown",
      ],
      default: "present",
    },

    leaveApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveApplication",
      default: null,
    },

    entryTime: Date,
    exitTime: Date,

    source: {
      type: String,
      enum: ["biometric", "manual", "bulk", "auto", "leave"],
      default: "manual",
      index: true,
    },

    deviceId: {
      type: String,
      trim: true,
    },

    shift: {
      type: String,
      enum: ["morning", "afternoon", "evening", "night"],
      trim: true,
    },

    notes: {
      type: String,
      trim: true,
    },

    reconciled: {
      type: Boolean,
      default: false,
      index: true,
    },

    reconciledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reconciledAt: Date,

    reconciliationNotes: {
      type: String,
      trim: true,
    },

    validationIssues: [
      {
        type: {
          type: String,
          enum: [
            "DUPLICATE_ENTRY",
            "SHORT_DURATION",
            "MISSING_OUT",
            "MISSING_IN",
            "EXCESSIVE_ENTRIES",
            "UNUSUAL_TIME",
            "WEEKEND_ENTRY",
          ],
        },
        severity: {
          type: String,
          enum: ["info", "warning", "error"],
        },
        message: String,
        data: mongoose.Schema.Types.Mixed,
      },
    ],

    deleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    deletedAt: Date,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// INDEXES
attendanceSchema.index({ student: 1, date: 1, timestamp: -1 });
attendanceSchema.index({ assignedHostel: 1, date: 1 }); // ✅ new
attendanceSchema.index({ assignedHostel: 1, status: 1, date: 1 }); // ✅ optional
attendanceSchema.index({ date: 1, status: 1 });
attendanceSchema.index({ reconciled: 1, date: 1 });
attendanceSchema.index({ source: 1, date: 1 });
attendanceSchema.index({ deleted: 1 });
attendanceSchema.index({ "validationIssues.severity": 1, date: 1 });

attendanceSchema.virtual("duration").get(function () {
  if (this.entryTime && this.exitTime) {
    return (this.exitTime - this.entryTime) / 1000;
  }
  return null;
});

attendanceSchema.virtual("formattedDate").get(function () {
  if (this.date) {
    const [year, month, day] = this.date.split("-");
    return `${day}/${month}/${year}`;
  }
  return null;
});

attendanceSchema.virtual("formattedTime").get(function () {
  if (this.timestamp) {
    return new Date(this.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }
  return null;
});

// ✅ INSTANCE METHODS
attendanceSchema.methods.isOnLeave = function () {
  return this.status === "on_leave";
};

attendanceSchema.methods.needsReconciliation = function () {
  return (
    !this.reconciled &&
    (this.status === "unknown" ||
      (this.validationIssues && this.validationIssues.length > 0))
  );
};

attendanceSchema.methods.hasValidationErrors = function () {
  return (
    this.validationIssues &&
    this.validationIssues.some((issue) => issue.severity === "error")
  );
};

attendanceSchema.methods.getValidationSummary = function () {
  if (!this.validationIssues || this.validationIssues.length === 0) {
    return { hasIssues: false, errors: 0, warnings: 0, info: 0 };
  }

  const summary = {
    hasIssues: true,
    errors: 0,
    warnings: 0,
    info: 0,
    issues: this.validationIssues,
  };

  this.validationIssues.forEach((issue) => {
    summary[issue.severity + "s"]++;
  });

  return summary;
};

attendanceSchema.methods.markReconciled = async function (userId, notes) {
  this.reconciled = true;
  this.reconciledBy = userId;
  this.reconciledAt = new Date();
  this.reconciliationNotes = notes;
  return await this.save();
};

attendanceSchema.methods.softDelete = async function (userId) {
  this.deleted = true;
  this.deletedBy = userId;
  this.deletedAt = new Date();
  return await this.save();
};

// ✅ STATIC METHODS
attendanceSchema.statics.getLastEntry = async function (studentId, date) {
  return await this.findOne({
    student: studentId,
    date: date,
    deleted: { $ne: true },
  })
    .sort({ timestamp: -1 })
    .lean();
};

attendanceSchema.statics.getDayEntries = async function (studentId, date) {
  return await this.find({
    student: studentId,
    date: date,
    deleted: { $ne: true },
  })
    .sort({ timestamp: 1 })
    .lean();
};

attendanceSchema.statics.hasRecordForDate = async function (studentId, date) {
  const count = await this.countDocuments({
    student: studentId,
    date: date,
    deleted: { $ne: true },
  });
  return count > 0;
};

attendanceSchema.statics.getUnreconciled = async function (fromDate, toDate) {
  return await this.find({
    reconciled: false,
    date: { $gte: fromDate, $lte: toDate },
    deleted: { $ne: true },
  })
    .populate("student", "name rollNumber block")
    .sort({ date: -1, timestamp: -1 });
};

attendanceSchema.statics.getWithValidationIssues = async function (
  date,
  severity = null
) {
  const query = {
    date,
    validationIssues: { $exists: true, $ne: [] },
    deleted: { $ne: true },
  };

  if (severity) {
    query["validationIssues.severity"] = severity;
  }

  return await this.find(query)
    .populate("student", "name rollNumber block")
    .sort({ timestamp: -1 });
};

// ✅ MIDDLEWARE
attendanceSchema.pre("save", async function (next) {
  if (this.isNew && this.type === "OUT") {
    const lastEntry = await this.constructor.getLastEntry(
      this.student,
      this.date
    );

    if (lastEntry && lastEntry.type === "OUT") {
      this.status = "unknown";
      this.notes = this.notes
        ? `${this.notes} [Multiple OUT entries detected]`
        : "Multiple OUT entries detected";
    }

    if (lastEntry && lastEntry.type === "IN") {
      if (this.timestamp < lastEntry.timestamp) {
        this.status = "unknown";
        this.notes = this.notes
          ? `${this.notes} [OUT time before IN time]`
          : "OUT time before IN time";
      }
    }
  }

  next();
});

attendanceSchema.post("save", function (doc) {
  const validationStatus =
    doc.validationIssues && doc.validationIssues.length > 0
      ? ` [${doc.validationIssues.length} validation issue(s)]`
      : "";
  console.log(
    `✅ Attendance saved: ${doc.student} - ${doc.type} on ${doc.date} (${doc.status})${validationStatus}`
  );
});

// ✅ QUERY HELPERS
attendanceSchema.query.active = function () {
  return this.where({ deleted: { $ne: true } });
};

attendanceSchema.query.reconciled = function () {
  return this.where({ reconciled: true });
};

attendanceSchema.query.unreconciled = function () {
  return this.where({ reconciled: false });
};

attendanceSchema.query.leaves = function () {
  return this.where({ status: "on_leave" });
};

attendanceSchema.query.withValidationIssues = function () {
  return this.where({ validationIssues: { $exists: true, $ne: [] } });
};

attendanceSchema.query.withValidationErrors = function () {
  return this.where({ "validationIssues.severity": "error" });
};

// ✅ JSON/OBJECT OUTPUT
attendanceSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  },
});

attendanceSchema.set("toObject", {
  virtuals: true,
});

module.exports =
  mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);
