const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const otpSchema = new mongoose.Schema(
    {
        phone: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        otp: {
            type: String,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: true,
        },
        verified: {
            type: Boolean,
            default: false,
        },
        attempts: {
            type: Number,
            default: 0,
            max: 3,
        },
    },
    { timestamps: true }
);

// Hash OTP before saving
otpSchema.pre("save", async function (next) {
    if (!this.isModified("otp")) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.otp = await bcrypt.hash(this.otp, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare OTP method
otpSchema.methods.compareOTP = async function (candidateOTP) {
    return bcrypt.compare(candidateOTP, this.otp);
};

// Auto-delete expired OTPs after 10 minutes
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 600 });

module.exports = mongoose.models.OTP || mongoose.model("OTP", otpSchema);
