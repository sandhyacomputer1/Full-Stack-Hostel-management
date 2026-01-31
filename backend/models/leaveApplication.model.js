// server/models/leaveApplication.model.js
const mongoose = require("mongoose");

const leaveApplicationSchema = new mongoose.Schema(
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

    leaveType: {
      type: String,
      enum: ["sick", "home", "emergency", "vacation", "personal", "other"],
      required: true,
    },

    fromDate: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^\d{4}-\d{2}-\d{2}$/.test(v);
        },
        message: "Invalid date format (use YYYY-MM-DD)",
      },
    },

    toDate: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^\d{4}-\d{2}-\d{2}$/.test(v);
        },
        message: "Invalid date format (use YYYY-MM-DD)",
      },
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: [10, "Reason must be at least 10 characters"],
      maxlength: [500, "Reason cannot exceed 500 characters"],
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    approvedAt: {
      type: Date,
    },

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    rejectedAt: {
      type: Date,
    },

    rejectionReason: {
      type: String,
      trim: true,
    },

    earlyReturn: {
      type: Boolean,
      default: false,
      index: true,
    },

    actualReturnDate: {
      type: String,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^\d{4}-\d{2}-\d{2}$/.test(v);
        },
        message: "Invalid date format (use YYYY-MM-DD)",
      },
    },

    earlyReturnNotes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },

    earlyReturnProcessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    earlyReturnProcessedAt: {
      type: Date,
    },

    contactNumber: {
      type: String,
      trim: true,
    },

    emergencyContact: {
      type: String,
      trim: true,
    },

    destinationAddress: {
      type: String,
      trim: true,
    },

    documents: [
      {
        filename: String,
        url: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    parentApprovalRequired: {
      type: Boolean,
      default: false,
    },

    parentApproved: {
      type: Boolean,
      default: false,
    },

    parentApprovedAt: {
      type: Date,
    },

    attendanceCreated: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    adminNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

leaveApplicationSchema.index({ student: 1, status: 1 });
leaveApplicationSchema.index({ fromDate: 1, toDate: 1 });
leaveApplicationSchema.index({ status: 1, createdAt: -1 });
leaveApplicationSchema.index({ earlyReturn: 1 });
leaveApplicationSchema.index({ assignedHostel: 1 });

leaveApplicationSchema.virtual("totalDays").get(function () {
  const start = new Date(this.fromDate);
  const end = new Date(this.toDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
});

leaveApplicationSchema.virtual("actualDays").get(function () {
  const start = new Date(this.fromDate);
  const end =
    this.earlyReturn && this.actualReturnDate
      ? new Date(this.actualReturnDate)
      : new Date(this.toDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
});

leaveApplicationSchema.virtual("isActive").get(function () {
  if (this.status !== "approved") return false;

  const today = new Date().toISOString().slice(0, 10);

  if (this.earlyReturn && this.actualReturnDate) {
    return today >= this.fromDate && today < this.actualReturnDate;
  }

  return today >= this.fromDate && today <= this.toDate;
});

leaveApplicationSchema.virtual("hasEnded").get(function () {
  if (this.status !== "approved") return false;

  const today = new Date().toISOString().slice(0, 10);
  const endDate =
    this.earlyReturn && this.actualReturnDate
      ? this.actualReturnDate
      : this.toDate;

  return today > endDate;
});

leaveApplicationSchema.methods.approve = async function (userId, notes) {
  this.status = "approved";
  this.approvedBy = userId;
  this.approvedAt = new Date();
  if (notes) this.adminNotes = notes;
  return await this.save();
};

leaveApplicationSchema.methods.reject = async function (
  userId,
  reason,
  notes
) {
  this.status = "rejected";
  this.rejectedBy = userId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  if (notes) this.adminNotes = notes;
  return await this.save();
};

leaveApplicationSchema.methods.cancel = async function () {
  this.status = "cancelled";
  return await this.save();
};

leaveApplicationSchema.methods.processEarlyReturn = async function (
  returnDate,
  notes,
  userId
) {
  if (returnDate < this.fromDate) {
    throw new Error("Return date cannot be before leave start date");
  }

  if (returnDate > this.toDate) {
    throw new Error("Return date cannot be after leave end date");
  }

  this.earlyReturn = true;
  this.actualReturnDate = returnDate;
  this.earlyReturnNotes = notes;
  this.earlyReturnProcessedBy = userId;
  this.earlyReturnProcessedAt = new Date();

  return await this.save();
};

leaveApplicationSchema.pre("save", function (next) {
  if (this.fromDate && this.toDate) {
    if (this.toDate < this.fromDate) {
      return next(new Error("End date cannot be before start date"));
    }
  }

  if (this.earlyReturn && this.actualReturnDate) {
    if (this.actualReturnDate < this.fromDate) {
      return next(new Error("Return date cannot be before start date"));
    }
    if (this.actualReturnDate > this.toDate) {
      return next(new Error("Return date cannot be after end date"));
    }
  }

  next();
});

leaveApplicationSchema.post("save", function (doc) {
  if (doc.earlyReturn) {
    console.log(
      `Leave ${doc._id} - Early return processed (returned: ${doc.actualReturnDate})`
    );
  } else {
    console.log(`Leave ${doc._id} - Status: ${doc.status}`);
  }
});

// Find active leaves for today (hostel-aware)
leaveApplicationSchema.statics.findActiveToday = async function ({
  date,
  assignedHostel,
}) {
  const today = date || new Date().toISOString().slice(0, 10);
  const match = {
    status: "approved",
    fromDate: { $lte: today },
    $or: [
      { earlyReturn: false, toDate: { $gte: today } },
      { earlyReturn: true, actualReturnDate: { $gt: today } },
    ],
  };
  if (assignedHostel) {
    match.assignedHostel = assignedHostel;
  }

  return await this.find(match).populate(
    "student",
    "name rollNumber block assignedHostel status"
  );
};

// Find students on leave for a date range (hostel-aware)
leaveApplicationSchema.statics.findByDateRange = async function (
  fromDate,
  toDate,
  assignedHostel
) {
  const match = {
    status: "approved",
    $or: [
      {
        fromDate: { $lte: toDate },
        toDate: { $gte: fromDate },
      },
    ],
  };
  if (assignedHostel) {
    match.assignedHostel = assignedHostel;
  }

  return await this.find(match).populate(
    "student",
    "name rollNumber block assignedHostel status"
  );
};

// Get leave statistics (hostel-aware)
leaveApplicationSchema.statics.getStats = async function (filters = {}) {
  const match = {};

  if (filters.status) match.status = filters.status;
  if (filters.fromDate) match.fromDate = { $gte: filters.fromDate };
  if (filters.toDate) match.toDate = { ...(match.toDate || {}), $lte: filters.toDate };
  if (filters.student) match.student = filters.student;
  if (filters.assignedHostel) match.assignedHostel = filters.assignedHostel;

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        approved: {
          $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
        },
        pending: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
        },
        rejected: {
          $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
        },
        cancelled: {
          $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
        },
        earlyReturns: {
          $sum: { $cond: ["$earlyReturn", 1, 0] },
        },
      },
    },
  ]);

  return (
    stats[0] || {
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      cancelled: 0,
      earlyReturns: 0,
    }
  );
};

leaveApplicationSchema.set("toJSON", { virtuals: true });
leaveApplicationSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("LeaveApplication", leaveApplicationSchema);
