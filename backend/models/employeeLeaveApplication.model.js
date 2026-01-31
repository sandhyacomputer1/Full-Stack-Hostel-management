const mongoose = require("mongoose");

const employeeLeaveApplicationSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    assignedHostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
      index: true,
    },

    // Leave details
    leaveType: {
      type: String,
      enum: [
        "sick",
        "casual",
        "earned",
        "unpaid",
        "emergency",
        "maternity",
        "paternity",
      ],
      required: true,
    },
    fromDate: {
      type: String, // "YYYY-MM-DD"
      required: true,
    },
    toDate: {
      type: String, // "YYYY-MM-DD"
      required: true,
    },
    totalDays: {
      type: Number,
      required: false,
      min: 1,
    },
    duration: {
      type: Number, // Actual days taken (for early return)
      default: null,
    },

    // Reason and contact
    reason: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 500,
    },
    contactNumber: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },

    // Status and approval
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
    reviewNotes: {
      type: String,
      default: "",
    },

    // Early return handling
    earlyReturn: {
      type: Boolean,
      default: false,
    },
    actualReturnDate: {
      type: String,
      default: null,
    },
    earlyReturnProcessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    earlyReturnProcessedAt: {
      type: Date,
    },

    // Salary impact
    isPaid: {
      type: Boolean,
      default: true,
    },

    // Supporting documents
    documents: [
      {
        url: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          default: "medical_certificate",
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Additional info
    notes: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for queries
employeeLeaveApplicationSchema.index({ employee: 1, status: 1 });
employeeLeaveApplicationSchema.index({ assignedHostel: 1, status: 1 });
employeeLeaveApplicationSchema.index({ fromDate: 1, toDate: 1 });
employeeLeaveApplicationSchema.index({ status: 1, fromDate: 1 });

// Pre-save: Calculate total days
employeeLeaveApplicationSchema.pre("save", function (next) {
  // ✅ Calculate on new documents OR when dates are modified
  if (this.isNew || this.isModified("fromDate") || this.isModified("toDate")) {
    if (this.fromDate && this.toDate) {
      const from = new Date(this.fromDate);
      const to = new Date(this.toDate);
      const diffTime = Math.abs(to - from);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      this.totalDays = diffDays;

      console.log(`🔧 Pre-save hook: Calculated totalDays = ${diffDays}`);
    }
  }
  next();
});

// Method: Check if date falls in leave period
employeeLeaveApplicationSchema.methods.isDateInRange = function (date) {
  return date >= this.fromDate && date <= this.toDate;
};

// Method: Approve leave
employeeLeaveApplicationSchema.methods.approve = function (userId, notes = "") {
  this.status = "approved";
  this.approvedBy = userId;
  this.approvedAt = new Date();
  this.reviewNotes = notes;
  return this.save();
};

// Method: Reject leave
employeeLeaveApplicationSchema.methods.reject = function (userId, reason) {
  this.status = "rejected";
  this.rejectedBy = userId;
  this.rejectedAt = new Date();
  this.reviewNotes = reason;
  return this.save();
};

// Method: Process early return
employeeLeaveApplicationSchema.methods.processEarlyReturn = function (
  returnDate,
  userId
) {
  this.earlyReturn = true;
  this.actualReturnDate = returnDate;
  this.earlyReturnProcessedBy = userId;
  this.earlyReturnProcessedAt = new Date();

  // Calculate actual duration
  const from = new Date(this.fromDate);
  const actualReturn = new Date(returnDate);
  const diffTime = Math.abs(actualReturn - from);
  this.duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  return this.save();
};

// Static method: Get active leaves for date
employeeLeaveApplicationSchema.statics.getActiveLeavesForDate = async function (
  hostelId,
  date
) {
  return this.find({
    assignedHostel: hostelId,
    status: "approved",
    fromDate: { $lte: date },
    toDate: { $gte: date },
  }).populate("employee", "fullName employeeCode role");
};

// Static method: Check if employee has leave on date
employeeLeaveApplicationSchema.statics.hasLeaveOnDate = async function (
  employeeId,
  date
) {
  const leave = await this.findOne({
    employee: employeeId,
    status: "approved",
    fromDate: { $lte: date },
    toDate: { $gte: date },
  });
  return leave;
};

// Static method: Get leave balance for employee
employeeLeaveApplicationSchema.statics.getLeaveBalance = async function (
  employeeId,
  year
) {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const leaves = await this.find({
    employee: employeeId,
    status: "approved",
    fromDate: { $gte: startDate },
    toDate: { $lte: endDate },
  });

  const balance = {
    sick: 0,
    casual: 0,
    earned: 0,
    unpaid: 0,
    emergency: 0,
    maternity: 0,
    paternity: 0,
    total: 0,
  };

  leaves.forEach((leave) => {
    const days = leave.duration || leave.totalDays;
    balance[leave.leaveType] += days;
    balance.total += days;
  });

  return balance;
};

// Static method: Get pending leaves for hostel
employeeLeaveApplicationSchema.statics.getPendingLeaves = async function (
  hostelId
) {
  return this.find({
    assignedHostel: hostelId,
    status: "pending",
  })
    .populate("employee", "fullName employeeCode role department")
    .sort({ createdAt: -1 });
};

// Static method: Get leave history for employee
employeeLeaveApplicationSchema.statics.getLeaveHistory = async function (
  employeeId,
  limit = 10
) {
  return this.find({
    employee: employeeId,
  })
    .populate("approvedBy", "name")
    .populate("rejectedBy", "name")
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports =
  mongoose.models.EmployeeLeaveApplication ||
  mongoose.model("EmployeeLeaveApplication", employeeLeaveApplicationSchema);
