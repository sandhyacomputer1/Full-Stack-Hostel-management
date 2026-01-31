const mongoose = require("mongoose");

const employeeSalaryRecordSchema = new mongoose.Schema(
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

    // Period
    month: {
      type: String, // "YYYY-MM"
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
    },
    year: {
      type: Number,
      required: true,
    },

    // ✅ Prorated salary fields
    isProrated: {
      type: Boolean,
      default: false,
    },
    proratedReason: {
      type: String,
      default: null,
    },
    workingStartDate: {
      type: String, // "YYYY-MM-DD"
      default: null,
    },
    workingEndDate: {
      type: String, // "YYYY-MM-DD"
      default: null,
    },
    monthWorkingDays: {
      type: Number, // Total days in the month (e.g., 31)
      default: null,
    },

    // Base salary
    baseSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    // Attendance summary
    totalWorkingDays: {
      type: Number, // Actual working days for employee (prorated if mid-month)
      required: true,
      min: 0,
    },
    presentDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    absentDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    halfDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    paidLeaveDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    unpaidLeaveDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    holidayDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    lateDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    earlyLeaveDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Work hours tracking
    totalHoursWorked: {
      type: Number,
      default: 0,
      min: 0,
    },
    overtimeHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    overtimePay: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Calculations
    perDayAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    absentDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },
    halfDayDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },
    unpaidLeaveDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Bonuses
    bonuses: [
      {
        title: {
          type: String,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        description: {
          type: String,
          default: "",
        },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Other deductions
    otherDeductions: [
      {
        title: {
          type: String,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        description: {
          type: String,
          default: "",
        },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Final amounts
    totalDeductions: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalBonuses: {
      type: Number,
      default: 0,
      min: 0,
    },
    grossSalary: {
      type: Number,
      default: 0,
      min: 0,
    },
    netSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    // Payment tracking
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidDate: {
      type: Date,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    paymentMode: {
      type: String,
      enum: ["cash", "bank_transfer", "upi", "cheque", "other"],
    },
    transactionId: {
      type: String,
      default: "",
    },
    paymentProof: {
      type: String, // URL to document
      default: "",
    },

    // ✅ Expense integration tracking
    expenseRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
      default: null,
    },
    isAddedToExpense: {
      type: Boolean,
      default: false,
    },

    // Additional info
    notes: {
      type: String,
      default: "",
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // ✅ Edit audit trail
    editHistory: [
      {
        editedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        editedAt: {
          type: Date,
          default: Date.now,
        },
        reason: {
          type: String,
          required: true,
        },
        changes: {
          type: mongoose.Schema.Types.Mixed,
          required: true,
        },
      },
    ],
    lastEditedAt: {
      type: Date,
    },
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // ✅ Calculation metadata
    calculatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    calculatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: One salary record per employee per month
employeeSalaryRecordSchema.index({ employee: 1, month: 1 }, { unique: true });

// Indexes for queries
employeeSalaryRecordSchema.index({ assignedHostel: 1, month: 1 });
employeeSalaryRecordSchema.index({ assignedHostel: 1, isPaid: 1 });
employeeSalaryRecordSchema.index({ month: 1, year: 1 });
employeeSalaryRecordSchema.index({ isPaid: 1, month: 1 });
employeeSalaryRecordSchema.index({ isAddedToExpense: 1 });

// ✅ Pre-save middleware with better edit control
employeeSalaryRecordSchema.pre("save", function (next) {
  if (!this.isNew && this.isPaid && this.isModified()) {
    // Allow only payment-related and expense-tracking fields to be modified
    const modifiedFields = this.modifiedPaths();
    const allowedFields = [
      "isPaid",
      "paidDate",
      "paidBy",
      "paymentMode",
      "transactionId",
      "paymentProof",
      "notes",
      "expenseRecordId",
      "isAddedToExpense",
      "editHistory",
      "lastEditedAt",
      "lastEditedBy",
      "updatedAt", // Allow timestamps to update
    ];

    const hasUnallowedModification = modifiedFields.some(
      (field) =>
        !allowedFields.includes(field) && !field.startsWith("editHistory")
    );

    if (hasUnallowedModification) {
      return next(
        new Error(
          "Cannot modify paid salary record except payment details and expense tracking"
        )
      );
    }
  }
  next();
});

// ✅ Calculate salary with prorated support
employeeSalaryRecordSchema.methods.calculateSalary = function () {
  // Use monthWorkingDays for per-day calculation if available, else use totalWorkingDays
  const daysForCalculation = this.monthWorkingDays || this.totalWorkingDays;

  // Calculate per day amount based on full month working days
  this.perDayAmount = parseFloat(
    (this.baseSalary / daysForCalculation).toFixed(2)
  );

  // ✅ For prorated salary: Calculate earned amount based on actual working days
  const earnedAmount = this.isProrated
    ? parseFloat((this.perDayAmount * this.totalWorkingDays).toFixed(2))
    : this.baseSalary;

  // Calculate deductions
  this.absentDeduction = parseFloat(
    (this.perDayAmount * this.absentDays).toFixed(2)
  );
  this.halfDayDeduction = parseFloat(
    (this.perDayAmount * 0.5 * this.halfDays).toFixed(2)
  );
  this.unpaidLeaveDeduction = parseFloat(
    (this.perDayAmount * this.unpaidLeaveDays).toFixed(2)
  );

  // Calculate total bonuses
  this.totalBonuses = this.bonuses.reduce(
    (sum, bonus) => sum + bonus.amount,
    0
  );
  this.totalBonuses += this.overtimePay;
  this.totalBonuses = parseFloat(this.totalBonuses.toFixed(2));

  // Calculate total deductions
  this.totalDeductions =
    this.absentDeduction +
    this.halfDayDeduction +
    this.unpaidLeaveDeduction +
    this.otherDeductions.reduce((sum, deduction) => sum + deduction.amount, 0);
  this.totalDeductions = parseFloat(this.totalDeductions.toFixed(2));

  // ✅ Calculate gross salary (earned amount + bonuses)
  this.grossSalary = parseFloat((earnedAmount + this.totalBonuses).toFixed(2));

  // Calculate net salary (ensure it's never negative)
  this.netSalary = Math.max(
    0,
    parseFloat((this.grossSalary - this.totalDeductions).toFixed(2))
  );

  return this.netSalary;
};

// Method: Add bonus
employeeSalaryRecordSchema.methods.addBonus = function (
  title,
  amount,
  description = "",
  userId
) {
  if (this.isPaid) {
    throw new Error("Cannot add bonus to paid salary record");
  }

  this.bonuses.push({
    title,
    amount,
    description,
    addedBy: userId,
  });

  this.calculateSalary();
  return this.save();
};

// Method: Add deduction
employeeSalaryRecordSchema.methods.addDeduction = function (
  title,
  amount,
  description = "",
  userId
) {
  if (this.isPaid) {
    throw new Error("Cannot add deduction to paid salary record");
  }

  this.otherDeductions.push({
    title,
    amount,
    description,
    addedBy: userId,
  });

  this.calculateSalary();
  return this.save();
};

// ✅ Mark as paid with expense tracking
employeeSalaryRecordSchema.methods.markAsPaid = function (
  userId,
  paymentMode,
  transactionId = "",
  paymentProof = ""
) {
  if (this.isPaid) {
    throw new Error("Salary already marked as paid");
  }

  this.isPaid = true;
  this.paidDate = new Date();
  this.paidBy = userId;
  this.paymentMode = paymentMode;
  this.transactionId = transactionId;
  this.paymentProof = paymentProof;

  return this.save();
};

// ✅ Edit salary record with audit trail
employeeSalaryRecordSchema.methods.editSalaryRecord = function (
  changes,
  reason,
  userId
) {
  if (this.isPaid) {
    throw new Error(
      "Cannot edit paid salary record. Please create a new adjustment."
    );
  }

  // Store old values for audit
  const oldValues = {};
  Object.keys(changes).forEach((key) => {
    oldValues[key] = this[key];
  });

  // Apply changes
  Object.keys(changes).forEach((key) => {
    this[key] = changes[key];
  });

  // Add to edit history
  this.editHistory.push({
    editedBy: userId,
    editedAt: new Date(),
    reason: reason,
    changes: {
      before: oldValues,
      after: changes,
    },
  });

  this.lastEditedAt = new Date();
  this.lastEditedBy = userId;

  // Recalculate salary
  this.calculateSalary();

  return this.save();
};

// ✅ Link expense record
employeeSalaryRecordSchema.methods.linkExpenseRecord = function (expenseId) {
  this.expenseRecordId = expenseId;
  this.isAddedToExpense = true;
  return this.save();
};

// ✅ Unlink expense record
employeeSalaryRecordSchema.methods.unlinkExpenseRecord = function () {
  this.expenseRecordId = null;
  this.isAddedToExpense = false;
  return this.save();
};

// Static method: Get pending payments for hostel
employeeSalaryRecordSchema.statics.getPendingPayments = async function (
  hostelId,
  month = null
) {
  const query = {
    assignedHostel: hostelId,
    isPaid: false,
  };

  if (month) {
    query.month = month;
  }

  return this.find(query)
    .populate("employee", "fullName employeeCode role department salary")
    .populate("calculatedBy", "name")
    .sort({ month: -1, createdAt: -1 });
};

// Static method: Get paid salaries for month
employeeSalaryRecordSchema.statics.getPaidSalaries = async function (
  hostelId,
  month
) {
  return this.find({
    assignedHostel: hostelId,
    month: month,
    isPaid: true,
  })
    .populate("employee", "fullName employeeCode role department")
    .populate("paidBy", "name")
    .populate("expenseRecordId")
    .sort({ paidDate: -1 });
};

// Static method: Get salary records for employee
employeeSalaryRecordSchema.statics.getEmployeeSalaryHistory = async function (
  employeeId,
  limit = 12
) {
  return this.find({ employee: employeeId })
    .populate("paidBy", "name")
    .populate("lastEditedBy", "name")
    .populate("calculatedBy", "name")
    .sort({ month: -1 })
    .limit(limit);
};

// Static method: Get monthly summary for hostel
employeeSalaryRecordSchema.statics.getMonthlySummary = async function (
  hostelId,
  month
) {
  const summary = await this.aggregate([
    {
      $match: {
        assignedHostel: new mongoose.Types.ObjectId(hostelId),
        month: month,
      },
    },
    {
      $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        totalGrossSalary: { $sum: "$grossSalary" },
        totalDeductions: { $sum: "$totalDeductions" },
        totalBonuses: { $sum: "$totalBonuses" },
        totalNetSalary: { $sum: "$netSalary" },
        totalPaid: {
          $sum: { $cond: ["$isPaid", "$netSalary", 0] },
        },
        totalPending: {
          $sum: { $cond: ["$isPaid", 0, "$netSalary"] },
        },
        paidCount: {
          $sum: { $cond: ["$isPaid", 1, 0] },
        },
        pendingCount: {
          $sum: { $cond: ["$isPaid", 0, 1] },
        },
        proratedCount: {
          $sum: { $cond: ["$isProrated", 1, 0] },
        },
        expenseLinkedCount: {
          $sum: { $cond: ["$isAddedToExpense", 1, 0] },
        },
      },
    },
  ]);

  return summary.length > 0 ? summary[0] : null;
};

// Static method: Get all unpaid expenses-linked salaries
employeeSalaryRecordSchema.statics.getUnlinkedExpenses = async function (
  hostelId
) {
  return this.find({
    assignedHostel: hostelId,
    isPaid: true,
    isAddedToExpense: false,
  })
    .populate("employee", "fullName employeeCode")
    .sort({ paidDate: -1 });
};

module.exports =
  mongoose.models.EmployeeSalaryRecord ||
  mongoose.model("EmployeeSalaryRecord", employeeSalaryRecordSchema);
