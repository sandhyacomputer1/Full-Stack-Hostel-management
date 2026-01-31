// server/models/studentBankAccount.model.js
const mongoose = require("mongoose");

const studentBankAccountSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      unique: true,
      index: true,
    },
    assignedHostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
      index: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "frozen", "closed"],
      default: "active",
      index: true,
    },
    freezeReason: {
      type: String,
      trim: true,
    },
    lastTransactionAt: {
      type: Date,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Compound indexes for performance
studentBankAccountSchema.index({ assignedHostel: 1, status: 1 });
studentBankAccountSchema.index({ student: 1, assignedHostel: 1 });

// ✅ Virtual: Check if account is operational
studentBankAccountSchema.virtual("isOperational").get(function () {
  return this.status === "active";
});

// ✅ Method: Check if sufficient balance
studentBankAccountSchema.methods.hasSufficientBalance = function (amount) {
  return this.balance >= amount;
};

// ✅ Static: Get account by student
studentBankAccountSchema.statics.getByStudent = async function (
  studentId,
  hostelId
) {
  return await this.findOne({
    student: studentId,
    assignedHostel: hostelId,
  }).populate("student", "name studentId class batch");
};

// ✅ Static: Get all accounts for hostel
studentBankAccountSchema.statics.getHostelAccounts = async function (
  hostelId,
  filters = {}
) {
  const query = { assignedHostel: hostelId, ...filters };
  return await this.find(query)
    .populate("student", "name studentId class batch")
    .sort({ balance: -1 });
};

// Enable virtuals in JSON output
studentBankAccountSchema.set("toJSON", { virtuals: true });
studentBankAccountSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("StudentBankAccount", studentBankAccountSchema);
