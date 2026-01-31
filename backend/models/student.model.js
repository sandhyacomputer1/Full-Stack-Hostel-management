// server/models/student.model.js
const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      unique: true,
    },
    aadharNumber: {
      type: String,
      unique: true,
      required: true,
      sparse: true,
    },
    email: {
      type: String,
      default: "studentwithno@email.com",
    },
    nillFees: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: "India" },
    },
    father: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String }, // ✅ REMOVED: unique: true, sparse: true
      occupation: String,
    },
    mother: {
      name: { type: String, required: true },
      phone: { type: String },
      email: { type: String }, // ✅ REMOVED: unique: true, sparse: true
      occupation: String,
    },
    guardian: {
      name: String,
      phone: String,
      email: String,
      occupation: String,
    },
    class: {
      type: String,
      required: true,
    },
    batch: {
      type: String,
      required: true,
    },
    rollNumber: {
      type: String,
      required: true,
    },
    admissionDate: {
      type: Date,
      default: Date.now,
    },
    documents: {
      photo: {
        url: { type: String, default: null },
        publicId: { type: String, default: null },
        uploadedAt: { type: Date, default: null },
      },
      aadharCard: {
        url: { type: String, default: null },
        publicId: { type: String, default: null },
        uploadedAt: { type: Date, default: null },
      },
      addressProof: {
        url: { type: String, default: null },
        publicId: { type: String, default: null },
        uploadedAt: { type: Date, default: null },
      },
      idCard: {
        url: { type: String, default: null },
        publicId: { type: String, default: null },
        uploadedAt: { type: Date, default: null },
      },
    },
    roomNumber: String,
    bedNumber: String,
    hostelBlock: String,
    feeStructure: {
      installmentType: {
        type: String,
        enum: ["oneTime", "twoInstallments", "threeInstallments", "monthly"],
        required: true,
        default: "oneTime",
      },
      baseFee: { type: Number, required: true, min: 0 },
      admissionFee: { type: Number, default: 0, min: 0 },
      otherCharges: { type: Number, default: 0, min: 0 },
      installmentBreakdown: [
        {
          installmentNumber: Number,
          amount: Number,
          dueDate: String,
          status: {
            type: String,
            enum: ["pending", "paid", "overdue"],
            default: "pending",
          },
          paidDate: Date,
          paidAmount: Number,
        },
      ],
      otherFees: [
        {
          name: String,
          amount: Number,
        },
      ],
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    assignedHostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    currentHostelState: {
      type: String,
      enum: ["IN", "OUT"],
      default: "IN",
    },
    lastStateUpdate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// ============================================
// PRE-SAVE HOOKS
// ============================================

/**
 * Pre-save: Store isNew status for post-save hook
 */
studentSchema.pre("save", function (next) {
  this.$locals = this.$locals || {};
  this.$locals.wasNew = this.isNew;
  next();
});

/**
 * Pre-save: Auto update nillFees based on paid installments
 */
studentSchema.pre("save", function (next) {
  const feeData = this.feeStructure || {};
  const baseFee = Number(feeData.baseFee) || 0;
  const installments = Array.isArray(feeData.installmentBreakdown)
    ? feeData.installmentBreakdown
    : [];

  const totalPaid = installments.reduce((sum, inst) => {
    if (inst.status === "paid") {
      const paidAmt = Number(inst.paidAmount) || 0;
      return sum + (paidAmt > 0 ? paidAmt : Number(inst.amount || 0));
    }
    return sum;
  }, 0);

  this.nillFees = totalPaid >= baseFee;
  next();
});

/**
 * Pre-save: Auto-generate unique studentId
 */
studentSchema.pre("save", async function (next) {
  if (!this.studentId) {
    const year = new Date().getFullYear();

    const lastStudent = await this.constructor
      .find({ studentId: { $regex: `^STU${year}` } })
      .sort({ studentId: -1 })
      .limit(1);

    const lastSeq = lastStudent.length
      ? parseInt(lastStudent[0].studentId.slice(7))
      : 0;

    this.studentId = `STU${year}${String(lastSeq + 1).padStart(4, "0")}`;
  }
  next();
});

// ============================================
// POST-SAVE HOOKS
// ============================================

/**
 * Post-save: Auto-create StudentBankAccount and MealPlan for NEW students only
 */
studentSchema.post("save", async function (doc) {
  try {
    const wasNew = doc.$locals?.wasNew;

    // Only for NEW students (not updates)
    if (!wasNew) {
      return;
    }

    // Lazy load models to avoid circular dependency
    const StudentBankAccount = require("./studentBankAccount.model");
    const MealPlan = require("./mealPlan.model");

    // ============================================
    // 1. AUTO-CREATE BANK ACCOUNT
    // ============================================
    try {
      const existingAccount = await StudentBankAccount.findOne({
        student: doc._id,
        assignedHostel: doc.assignedHostel,
      });

      if (!existingAccount) {
        await StudentBankAccount.create({
          student: doc._id,
          assignedHostel: doc.assignedHostel,
          balance: 0,
          status: "active",
          lastUpdatedBy: doc.createdBy,
        });
        console.log(
          `✅ Bank account created for: ${doc.studentId} (${doc.name})`
        );
      }
    } catch (bankError) {
      console.error(
        `⚠️ Bank account creation failed for ${doc.studentId}:`,
        bankError.message
      );
      // Continue to meal plan creation even if bank fails
    }

    // ============================================
    // 2. AUTO-CREATE MEAL PLAN
    // ============================================
    try {
      const existingMealPlan = await MealPlan.findOne({
        student: doc._id,
        assignedHostel: doc.assignedHostel,
      });

      if (!existingMealPlan) {
        await MealPlan.create({
          student: doc._id,
          assignedHostel: doc.assignedHostel,
          planType: "full",
          meals: {
            breakfast: true,
            lunch: true,
            dinner: true,
          },
          active: true,
          startDate: doc.admissionDate || new Date(),
          endDate: null,
          notes: "Auto-enrolled on admission",
        });
        console.log(
          `✅ Meal plan created for: ${doc.studentId} (${doc.name})`
        );
      }
    } catch (mealError) {
      console.error(
        `⚠️ Meal plan creation failed for ${doc.studentId}:`,
        mealError.message
      );
    }
  } catch (error) {
    console.error(
      `⚠️ Post-save hook error for student ${doc.studentId}:`,
      error.message
    );
    // Don't throw - student creation should succeed even if hooks fail
  }
});

// ============================================
// VIRTUALS
// ============================================

studentSchema.virtual("fullName").get(function () {
  return this.name;
});

studentSchema.virtual("age").get(function () {
  if (this.dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  }
  return null;
});

studentSchema.virtual("bankAccount", {
  ref: "StudentBankAccount",
  localField: "_id",
  foreignField: "student",
  justOne: true,
});

studentSchema.virtual("mealPlan", {
  ref: "MealPlan",
  localField: "_id",
  foreignField: "student",
  justOne: true,
});

// ============================================
// INSTANCE METHODS
// ============================================

studentSchema.methods.getBankAccount = async function () {
  const StudentBankAccount = mongoose.model("StudentBankAccount");
  return await StudentBankAccount.findOne({
    student: this._id,
    assignedHostel: this.assignedHostel,
  });
};

studentSchema.methods.hasSufficientBalance = async function (amount) {
  const account = await this.getBankAccount();
  if (!account) return false;
  return account.balance >= amount;
};

studentSchema.methods.getBankBalance = async function () {
  const account = await this.getBankAccount();
  return account ? account.balance : 0;
};

// ============================================
// STATIC METHODS
// ============================================

studentSchema.statics.getStudentsWithLowBalance = async function (
  hostelId,
  threshold = 100
) {
  const StudentBankAccount = mongoose.model("StudentBankAccount");

  const lowBalanceAccounts = await StudentBankAccount.find({
    assignedHostel: hostelId,
    balance: { $lte: threshold },
    status: "active",
  }).select("student balance");

  const studentIds = lowBalanceAccounts.map((acc) => acc.student);

  return await this.find({
    _id: { $in: studentIds },
    status: "active",
  }).populate("bankAccount");
};

// Enable virtuals in JSON output
studentSchema.set("toJSON", { virtuals: true });
studentSchema.set("toObject", { virtuals: true });

module.exports =
  mongoose.models.Student || mongoose.model("Student", studentSchema);
