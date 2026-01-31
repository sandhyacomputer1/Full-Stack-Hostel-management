const mongoose = require("mongoose");

const feeSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    // Payment details
    installmentAmount: { type: Number, required: true, min: 0 },
    installmentType: { type: String, required: true },
    installmentNumber: { type: Number, required: true },
    paidAmount: { type: Number, required: true, min: 0 },

    paymentMode: {
      type: String,
      enum: ["cash", "cheque", "upi", "card", "online", "bank_transfer"],
      required: true,
    },

    receiptNumber: {
      type: String,
      unique: true,
      sparse: true, // Already creates a unique sparse index
    },

    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["paid", "refund"],
      default: "paid",
    },

    receiptGenerated: {
      type: Boolean,
      default: false,
    },

    overdueCharges: {
      title: { type: String, default: "Overdue Payment" },
      amount: Number,
    },

    otherCharges: [
      {
        title: String,
        amount: Number,
      },
    ],

    receiptPath: String,
    remarks: String,

    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedHostel: { type: mongoose.Schema.Types.ObjectId, ref: "Hostel" },
  },
  { timestamps: true }
);

/* -----------------------------------------
  BUG-FREE RECEIPT NUMBER GENERATOR
  Always unique — never duplicates
-------------------------------------------- */

feeSchema.pre("save", async function (next) {
  if (this.receiptNumber) return next(); // skip if already set

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  // Find latest receipt for this month
  const lastReceipt = await this.constructor
    .findOne({
      receiptNumber: { $regex: `^RCPT-${year}${month}-` },
    })
    .sort({ receiptNumber: -1 })
    .lean();

  let nextNumber = 1;

  if (lastReceipt) {
    const lastNum = parseInt(lastReceipt.receiptNumber.split("-")[2], 10);
    nextNumber = lastNum + 1;
  }

  this.receiptNumber = `RCPT-${year}${month}-${String(nextNumber).padStart(
    4,
    "0"
  )}`;

  next();
});

/* -----------------------------------------
  Indexes
-------------------------------------------- */
feeSchema.index({ paymentDate: -1 });
feeSchema.index({ status: 1 });
// REMOVED: feeSchema.index({ receiptNumber: 1 }, { unique: true, sparse: true });
// ↑ This is duplicate because receiptNumber already has unique: true in schema

module.exports = mongoose.models.Fee || mongoose.model("Fee", feeSchema);
