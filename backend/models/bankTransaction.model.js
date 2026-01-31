// server/models/bankTransaction.model.js
const mongoose = require("mongoose");

const bankTransactionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    bankAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentBankAccount",
      required: true,
      index: true,
    },
    assignedHostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        "deposit",
        "cash_deposit",
        "online_deposit",
        "canteen",
        "fine",
        "hostel_fee",
        "laundry",
        "stationery",
        "refund",
        "reversal",
        "manual_adjustment",
        "withdrawal",
        "other",
      ],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    referenceId: {
      type: String,
      trim: true,
      index: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    performedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isReversed: {
      type: Boolean,
      default: false,
    },
    reversalOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankTransaction",
    },
    reversedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankTransaction",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Compound indexes for queries
bankTransactionSchema.index({ assignedHostel: 1, type: 1, createdAt: -1 });
bankTransactionSchema.index({ student: 1, createdAt: -1 });
bankTransactionSchema.index({ bankAccount: 1, createdAt: -1 });
bankTransactionSchema.index({ category: 1, performedAt: -1 });
bankTransactionSchema.index({ referenceId: 1 });

// ✅ Virtual: Get transaction description
bankTransactionSchema.virtual("description").get(function () {
  const action = this.type === "credit" ? "credited to" : "debited from";
  return `₹${this.amount} ${action} account - ${this.category}`;
});

// ✅ Static: Get transaction history
bankTransactionSchema.statics.getHistory = async function (
  studentId,
  hostelId,
  filters = {}
) {
  const query = {
    student: studentId,
    assignedHostel: hostelId,
    ...filters,
  };

  return await this.find(query)
    .populate("performedBy", "name email role")
    .sort({ performedAt: -1 })
    .lean();
};

// ✅ Static: Calculate balance from transactions (reconciliation)
bankTransactionSchema.statics.calculateBalance = async function (
  bankAccountId
) {
  const result = await this.aggregate([
    { $match: { bankAccount: bankAccountId, isReversed: false } },
    {
      $group: {
        _id: null,
        credits: {
          $sum: { $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0] },
        },
        debits: {
          $sum: { $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0] },
        },
      },
    },
    {
      $project: {
        balance: { $subtract: ["$credits", "$debits"] },
      },
    },
  ]);

  return result[0]?.balance || 0;
};

// ✅ Static: Daily summary
bankTransactionSchema.statics.getDailySummary = async function (
  hostelId,
  date
) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return await this.aggregate([
    {
      $match: {
        assignedHostel: hostelId,
        performedAt: { $gte: startOfDay, $lte: endOfDay },
        isReversed: false,
      },
    },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);
};

// Enable virtuals in JSON output
bankTransactionSchema.set("toJSON", { virtuals: true });
bankTransactionSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("BankTransaction", bankTransactionSchema);
