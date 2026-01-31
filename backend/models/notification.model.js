const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["sms", "email"],
            required: true,
            default: "sms",
        },
        recipient: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
        },
        purpose: {
            type: String,
            enum: [
                "otp",
                "fee_payment",
                "fee_reminder",
                "leave_approval",
                "low_balance",
                "other",
            ],
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "sent", "failed"],
            default: "pending",
        },
        sentAt: {
            type: Date,
        },
        failureReason: {
            type: String,
        },
        relatedStudent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
        },
        relatedFee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Fee",
        },
        assignedHostel: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hostel",
        },
    },
    { timestamps: true }
);

// Indexes for efficient queries
notificationSchema.index({ status: 1, createdAt: -1 });
notificationSchema.index({ purpose: 1, createdAt: -1 });
notificationSchema.index({ assignedHostel: 1, createdAt: -1 });
notificationSchema.index({ relatedStudent: 1 });

module.exports =
    mongoose.models.Notification ||
    mongoose.model("Notification", notificationSchema);
