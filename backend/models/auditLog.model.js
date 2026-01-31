// server/models/auditLog.model.js
const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    model: {
      type: String,
      required: true,
      index: true,
    },
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false, // Can be null for bulk operations
      index: true,
    },
    action: {
      type: String,
      enum: [
        // Basic CRUD operations
        "create",
        "update",
        "delete",
        "read",
        "view",

        // Bulk operations
        "bulk_create",
        "bulk_update",
        "bulk_delete",
        "bulk_import",
        "bulk_export",

        // Leave management operations
        "approve",
        "reject",
        "cancel",
        "early_return",
        "extend",

        // Attendance operations
        "mark",
        "reconcile",
        "auto_mark",
        "bulk_mark",

        // User authentication
        "login",
        "logout",
        "password_reset",

        // Student operations
        "admit",
        "discharge",
        "transfer",

        // Fee operations
        "payment",
        "refund",

        // Other operations
        "export",
        "import",
      ],
      required: true,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed, // Stores details of the action
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Can be null for system-generated actions
    },
    assignedHostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true, // Optional for system-wide actions or multi-hostel admins
      index: true, // ✅ Index for fast hostel-based filtering
    },
    reason: {
      type: String,
      trim: true,
    },
    ip: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Compound indexes for performance
auditLogSchema.index({ model: 1, assignedHostel: 1, createdAt: -1 }); // ✅ NEW: hostel + model + time
auditLogSchema.index({ assignedHostel: 1, action: 1, createdAt: -1 }); // ✅ NEW: hostel + action + time
auditLogSchema.index({ model: 1, refId: 1, createdAt: -1 });
auditLogSchema.index({ user: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

// ✅ Static method: Safe logging (won't throw errors)
auditLogSchema.statics.log = async function (data) {
  try {
    return await this.create(data);
  } catch (err) {
    console.error("❌ Audit log error:", err.message);
    return null;
  }
};

// ✅ Static method: Get logs for a specific record
auditLogSchema.statics.getHistory = async function (model, refId) {
  return await this.find({ model, refId })
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .lean();
};

// ✅ Static method: Get user activity
auditLogSchema.statics.getUserActivity = async function (userId, limit = 50) {
  return await this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// ✅ NEW: Get logs for specific hostel
auditLogSchema.statics.getHostelLogs = async function (
  hostelId,
  filters = {}
) {
  const query = { assignedHostel: hostelId, ...filters };
  return await this.find(query)
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .lean();
};

// ✅ Virtual: Format timestamp
auditLogSchema.virtual("formattedDate").get(function () {
  return this.createdAt.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
});

// ✅ Method: Get action description
auditLogSchema.methods.getDescription = function () {
  const descriptions = {
    create: "created",
    update: "updated",
    delete: "deleted",
    approve: "approved",
    reject: "rejected",
    cancel: "cancelled",
    early_return: "processed early return for",
    extend: "extended",
    mark: "marked attendance for",
    reconcile: "reconciled",
    auto_mark: "auto-marked",
    bulk_create: "bulk created",
    bulk_update: "bulk updated",
    bulk_delete: "bulk deleted",
    bulk_mark: "bulk marked",
    admit: "admitted",
    discharge: "discharged",
    transfer: "transferred",
    payment: "processed payment for",
    refund: "processed refund for",
  };

  return descriptions[this.action] || this.action;
};

// Enable virtuals in JSON output
auditLogSchema.set("toJSON", { virtuals: true });
auditLogSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("AuditLog", auditLogSchema);
