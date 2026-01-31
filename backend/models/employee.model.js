const mongoose = require("mongoose");
const Counter = require("./counter.model");

const employeeSchema = new mongoose.Schema(
  {
    assignedHostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      sparse: true,
      validate: {
        validator: async function (value) {
          if (!value) return true;
          const count = await this.constructor.countDocuments({
            userId: value,
            _id: { $ne: this._id },
          });
          return count === 0;
        },
        message: "This user account is already linked to another employee",
      },
    },

    currentStatus: {
      type: String,
      enum: ["IN", "OUT"],
      default: "OUT",
    },

    lastCheckIn: {
      type: Date,
      default: null,
    },

    lastCheckOut: {
      type: Date,
      default: null,
    },

    // Leave balance
    leaveBalance: {
      sick: {
        type: Number,
        default: 12,
      },
      casual: {
        type: Number,
        default: 12,
      },
      earned: {
        type: Number,
        default: 15,
      },
    },

    employeeCode: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },

    role: {
      type: String,
      enum: {
        values: [
          "watchman",
          "mess_staff",
          "cleaner",
          "warden",
          "manager",
          "mess_manager",
        ],
        message: "{VALUE} is not a valid role",
      },
      required: [true, "Role is required"],
      index: true,
    },

    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      validate: {
        validator: function (v) {
          return /^[6-9]\d{9}$/.test(v);
        },
        message: (props) =>
          `${props.value} is not a valid Indian phone number!`,
      },
      index: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          return !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: "Invalid email format",
      },
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Male",
    },

    address: {
      type: String,
      required: [true, "Address is required"],
    },

    emergencyContact: {
      name: {
        type: String,
        required: [true, "Emergency contact name is required"],
        trim: true,
      },
      phone: {
        type: String,
        required: [true, "Emergency contact phone is required"],
        validate: {
          validator: function (v) {
            return /^[6-9]\d{9}$/.test(v);
          },
          message: "Emergency contact phone must be valid 10-digit number",
        },
      },
      relation: {
        type: String,
        required: [true, "Emergency contact relation is required"],
        trim: true,
      },
    },

    salary: {
      type: Number,
      required: [true, "Salary is required"],
      min: [0, "Salary cannot be negative"],
    },

    shift: {
      type: String,
      enum: {
        values: ["MORNING", "EVENING", "NIGHT", "GENERAL"],
        message: "{VALUE} is not a valid shift",
      },
      default: "GENERAL",
    },

    employmentType: {
      type: String,
      enum: {
        values: ["FULL_TIME", "PART_TIME", "CONTRACT"],
        message: "{VALUE} is not a valid employment type",
      },
      default: "FULL_TIME",
    },

    profilePhoto: {
      url: String,
      uploadedAt: Date,
    },

    documents: [
      {
        type: {
          type: String,
          enum: [
            "aadhar",
            "pan",
            "id_card",
            "police_verification",
            "resume",
            "offer_letter",
            "other",
          ],
          required: true,
        },
        fileUrl: {
          type: String,
          required: true,
        },
        verified: {
          type: Boolean,
          default: false,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "INACTIVE"],
        message: "{VALUE} is not a valid status",
      },
      default: "ACTIVE",
      index: true,
    },

    joiningDate: {
      type: Date,
      default: Date.now,
    },

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
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Indexes
employeeSchema.index({ hostelId: 1, status: 1 });
employeeSchema.index({ hostelId: 1, role: 1 });
employeeSchema.index({ phone: 1, hostelId: 1 });

// Virtual populate
employeeSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

// ✅ STATIC METHOD - Generate Employee Code
employeeSchema.statics.generateEmployeeCode = async function () {
  const year = new Date().getFullYear();
  const counterId = `employeeCode_${year}`;

  try {
    console.log(`🔄 Generating employee code for year ${year}`);

    const counter = await Counter.findByIdAndUpdate(
      counterId,
      {
        $inc: {
          seq: 1,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    const sequence = counter.seq;
    const code = `EMP${year}${String(sequence).padStart(4, "0")}`;

    console.log(`✅ Generated employee code: ${code} (seq: ${sequence})`);
    return code;
  } catch (error) {
    console.error("❌ Error generating employee code:", error);
    throw new Error("Failed to generate employee code: " + error.message);
  }
};

// Pre-save validation
employeeSchema.pre("save", function (next) {
  if (this.emergencyContact && this.emergencyContact.phone === this.phone) {
    return next(
      new Error("Emergency contact phone cannot be same as employee phone")
    );
  }
  next();
});

module.exports =
  mongoose.models.Employee || mongoose.model("Employee", employeeSchema);
