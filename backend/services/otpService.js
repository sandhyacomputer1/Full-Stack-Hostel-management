const OTP = require("../models/otp.model");

class OTPService {
    /**
     * Generate a 6-digit OTP
     */
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Create and save OTP for a phone number
     * @param {string} phone - Phone number
     * @returns {Promise<string>} - Generated OTP (plain text)
     */
    async createOTP(phone) {
        // Delete any existing OTPs for this phone
        await OTP.deleteMany({ phone });

        // Generate new OTP
        const otpCode = this.generateOTP();

        // Create OTP record (will be hashed by pre-save hook)
        const otp = new OTP({
            phone,
            otp: otpCode,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
            attempts: 0,
            verified: false,
        });

        await otp.save();

        // Return plain OTP for SMS sending
        return otpCode;
    }

    /**
     * Verify OTP
     * @param {string} phone - Phone number
     * @param {string} otpCode - OTP code to verify
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async verifyOTP(phone, otpCode) {
        // Find OTP record
        const otpRecord = await OTP.findOne({
            phone,
            verified: false,
        }).sort({ createdAt: -1 });

        if (!otpRecord) {
            return { success: false, message: "OTP not found or already used" };
        }

        // Check if expired
        if (otpRecord.expiresAt < new Date()) {
            await OTP.deleteOne({ _id: otpRecord._id });
            return { success: false, message: "OTP has expired" };
        }

        // Check attempts
        if (otpRecord.attempts >= 3) {
            await OTP.deleteOne({ _id: otpRecord._id });
            return {
                success: false,
                message: "Maximum verification attempts exceeded",
            };
        }

        // Verify OTP
        const isValid = await otpRecord.compareOTP(otpCode);

        if (!isValid) {
            // Increment attempts
            otpRecord.attempts += 1;
            await otpRecord.save();

            return {
                success: false,
                message: `Invalid OTP. ${3 - otpRecord.attempts} attempts remaining`,
            };
        }

        // Mark as verified and delete
        otpRecord.verified = true;
        await otpRecord.save();
        await OTP.deleteOne({ _id: otpRecord._id });

        return { success: true, message: "OTP verified successfully" };
    }

    /**
     * Clean up expired OTPs (can be called by cron job)
     */
    async cleanExpiredOTPs() {
        const result = await OTP.deleteMany({
            expiresAt: { $lt: new Date() },
        });

        console.log(`🧹 Cleaned ${result.deletedCount} expired OTPs`);
        return result.deletedCount;
    }

    /**
     * Check if phone can request OTP (rate limiting)
     * @param {string} phone - Phone number
     * @returns {Promise<{canRequest: boolean, message: string}>}
     */
    async canRequestOTP(phone) {
        // Check OTPs created in last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentOTPs = await OTP.countDocuments({
            phone,
            createdAt: { $gte: oneHourAgo },
        });

        if (recentOTPs >= 3) {
            return {
                canRequest: false,
                message: "Too many OTP requests. Please try again after 1 hour",
            };
        }

        return { canRequest: true, message: "OK" };
    }
}

module.exports = new OTPService();
