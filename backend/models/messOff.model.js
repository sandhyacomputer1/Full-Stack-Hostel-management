// server/models/messOff.model.js
const mongoose = require("mongoose");

const messOffSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    fromDate: {
      type: String, // YYYY-MM-DD
      required: true,
      validate: {
        validator: function (v) {
          return /^\d{4}-\d{2}-\d{2}$/.test(v);
        },
      },
    },

    toDate: {
      type: String, // YYYY-MM-DD
      required: true,
      validate: {
        validator: function (v) {
          return /^\d{4}-\d{2}-\d{2}$/.test(v);
        },
      },
    },

    reason: {
      type: String,
      required: true,
      trim: true,
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

    rejectionReason: {
      type: String,
      trim: true,
    },

    // Early return handling
    actualReturnDate: {
      type: String, // YYYY-MM-DD
    },

    earlyReturn: {
      type: Boolean,
      default: false,
    },

    // Application metadata
    appliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Check if mess-off is active for a date
messOffSchema.statics.isActiveForDate = async function (studentId, date) {
  const activeMessOff = await this.findOne({
    student: studentId,
    status: "approved",
    fromDate: { $lte: date },
    $or: [
      { earlyReturn: false, toDate: { $gte: date } },
      { earlyReturn: true, actualReturnDate: { $gt: date } },
    ],
  });

  return !!activeMessOff;// server/models/messOff.model.js
  const mongoose = require("mongoose");

  const messOffSchema = new mongoose.Schema(
    {
      student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true,
        index: true,
      },

      // ✅ NEW: Add hostel field for multi-tenant support
      assignedHostel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hostel",
        required: true,
        index: true,
      },

      fromDate: {
        type: String, // YYYY-MM-DD
        required: true,
        validate: {
          validator: function (v) {
            return /^\d{4}-\d{2}-\d{2}$/.test(v);
          },
          message: "fromDate must be in YYYY-MM-DD format",
        },
      },

      toDate: {
        type: String, // YYYY-MM-DD
        required: true,
        validate: {
          validator: function (v) {
            return /^\d{4}-\d{2}-\d{2}$/.test(v);
          },
          message: "toDate must be in YYYY-MM-DD format",
        },
      },

      reason: {
        type: String,
        required: true,
        trim: true,
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

      rejectionReason: {
        type: String,
        trim: true,
      },

      // Early return handling
      actualReturnDate: {
        type: String, // YYYY-MM-DD
        validate: {
          validator: function (v) {
            if (!v) return true; // Optional field
            return /^\d{4}-\d{2}-\d{2}$/.test(v);
          },
          message: "actualReturnDate must be in YYYY-MM-DD format",
        },
      },

      earlyReturn: {
        type: Boolean,
        default: false,
        index: true,
      },

      // Application metadata
      appliedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      // ✅ NEW: Track who processed the application
      processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      processedAt: {
        type: Date,
      },
    },
    {
      timestamps: true,
      // ✅ Enable virtuals in JSON
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );

  // ✅ UPDATED: Add hostelId parameter for multi-tenant support
  messOffSchema.statics.isActiveForDate = async function (studentId, date, hostelId = null) {
    const query = {
      student: studentId,
      status: "approved",
      fromDate: { $lte: date },
      $or: [
        { earlyReturn: false, toDate: { $gte: date } },
        { earlyReturn: true, actualReturnDate: { $gt: date } },
      ],
    };

    // ✅ Add hostel filter if provided
    if (hostelId) {
      query.assignedHostel = hostelId;
    }

    const activeMessOff = await this.findOne(query);
    return !!activeMessOff;
  };

  // ✅ NEW: Get all active mess-offs for a hostel on a specific date
  messOffSchema.statics.getActiveForHostelAndDate = async function (hostelId, date) {
    return this.find({
      assignedHostel: hostelId,
      status: "approved",
      fromDate: { $lte: date },
      $or: [
        { earlyReturn: false, toDate: { $gte: date } },
        { earlyReturn: true, actualReturnDate: { $gt: date } },
      ],
    })
      .populate("student", "name rollNumber studentId batch")
      .lean();
  };

  // ✅ NEW: Check for overlapping mess-off periods
  messOffSchema.statics.hasOverlap = async function (studentId, fromDate, toDate, excludeId = null) {
    const query = {
      student: studentId,
      status: { $in: ["pending", "approved"] },
      $or: [
        // New period starts during existing period
        { fromDate: { $lte: fromDate }, toDate: { $gte: fromDate } },
        // New period ends during existing period
        { fromDate: { $lte: toDate }, toDate: { $gte: toDate } },
        // New period contains existing period
        { fromDate: { $gte: fromDate }, toDate: { $lte: toDate } },
      ],
    };

    // Exclude current document when updating
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const overlap = await this.findOne(query);
    return !!overlap;
  };

  // ✅ Compound indexes for performance
  messOffSchema.index({ assignedHostel: 1, status: 1 });
  messOffSchema.index({ student: 1, fromDate: 1, toDate: 1 });
  messOffSchema.index({ assignedHostel: 1, fromDate: 1, toDate: 1 });

  module.exports = mongoose.model("MessOff", messOffSchema);

};

module.exports = mongoose.model("MessOff", messOffSchema);
