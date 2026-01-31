const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    // Expense Type (now only hostel)
    type: {
      type: String,
      enum: ["hostel_expense"],
      required: true,
    },

    // Hostel expense category
    category: {
      type: String,
      enum: [
        "food_groceries",
        "maintenance",
        "utilities",
        "salary",
        "rent",
        "equipment",
        "cleaning",
        "security",
        "medical",
        "transportation",
        "office_supplies",
        "marketing",
        "legal",
        "insurance",
        "other",
      ],
      required: true,
    },

    // Common Fields
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // Payment Information
    paymentMode: {
      type: String,
      enum: ["cash", "card", "upi", "bank_transfer", "cheque", "online"],
      required: true,
    },

    transactionId: {
      type: String,
      trim: true,
    },

    // Receipt/Bill Information
    billNumber: String,
    vendor: {
      name: String,
      contact: String,
      address: String,
    },

    // Document Attachments
    attachments: [
      {
        filename: String,
        url: String,
        type: { type: String },
        publicId: String,
        uploadedAt: Date,
      },
    ],

    // Approval Workflow (for larger expenses)
    approvalRequired: {
      type: Boolean,
      default: false,
    },

    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    approvalDate: Date,
    approvalRemarks: String,

    // Recorded by
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedHostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
    },

    // Budget Tracking
    budgetCategory: String,
    budgetMonth: String, // Format: "YYYY-MM"
    budgetYear: Number,

    // Recurring Expense
    isRecurring: {
      type: Boolean,
      default: false,
    },

    recurringFrequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "quarterly", "yearly"],
    },

    nextRecurringDate: Date,

    // Additional Information
    remarks: String,
    tags: [String],

    // Status
    status: {
      type: String,
      enum: ["active", "cancelled", "refunded"],
      default: "active",
    },

    // Refund Information
    refund: {
      amount: Number,
      reason: String,
      refundDate: Date,
      refundTransactionId: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
expenseSchema.index({ type: 1, date: -1 });
expenseSchema.index({ category: 1, date: -1 });
expenseSchema.index({ budgetMonth: 1, budgetYear: 1 });
expenseSchema.index({ recordedBy: 1 });

// Virtual for formatted date
expenseSchema.virtual("formattedDate").get(function () {
  return this.date.toISOString().split("T")[0];
});

// Method to get expense summary
expenseSchema.statics.getExpenseSummary = async function (filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: "$category",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
        avgAmount: { $avg: "$amount" },
      },
    },
    { $sort: { totalAmount: -1 } },
  ];

  return this.aggregate(pipeline);
};

// Method to get monthly expenses
expenseSchema.statics.getMonthlyExpenses = async function (
  year,
  month,
  type = null
) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const match = {
    date: { $gte: startDate, $lte: endDate },
  };

  if (type) match.type = type;

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$category",
        totalAmount: { $sum: "$amount" },
        transactions: { $sum: 1 },
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);
};

module.exports = mongoose.model("Expense", expenseSchema);
