/**
 * SMS Rate Limiting Middleware
 * Prevents SMS spam by limiting the number of SMS that can be sent to a phone number
 */

const Notification = require("../models/notification.model");

/**
 * Rate limit configuration
 */
const RATE_LIMITS = {
    // Maximum SMS per phone number per day
    MAX_SMS_PER_DAY: 10,
    // Maximum SMS per phone number per hour
    MAX_SMS_PER_HOUR: 5,
    // Cooldown period between SMS to same number (in minutes)
    COOLDOWN_MINUTES: 2,
};

/**
 * Check if SMS can be sent to a phone number
 * @param {string} phone - Phone number to check
 * @param {string} purpose - Purpose of SMS (otp, fee_reminder, etc.)
 * @returns {Promise<{canSend: boolean, message?: string}>}
 */
async function checkSMSRateLimit(phone, purpose = "general") {
    try {
        const now = new Date();

        // Check cooldown period (last 2 minutes)
        const cooldownTime = new Date(now.getTime() - RATE_LIMITS.COOLDOWN_MINUTES * 60 * 1000);
        const recentSMS = await Notification.findOne({
            recipient: phone,
            type: "sms",
            sentAt: { $gte: cooldownTime },
            status: "sent"
        }).sort({ sentAt: -1 });

        if (recentSMS) {
            const secondsSinceLastSMS = Math.floor((now - recentSMS.sentAt) / 1000);
            const waitSeconds = (RATE_LIMITS.COOLDOWN_MINUTES * 60) - secondsSinceLastSMS;
            return {
                canSend: false,
                message: `Please wait ${waitSeconds} seconds before sending another SMS to this number.`
            };
        }

        // Check hourly limit
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const hourlyCount = await Notification.countDocuments({
            recipient: phone,
            type: "sms",
            sentAt: { $gte: oneHourAgo },
            status: "sent"
        });

        if (hourlyCount >= RATE_LIMITS.MAX_SMS_PER_HOUR) {
            return {
                canSend: false,
                message: `Hourly SMS limit (${RATE_LIMITS.MAX_SMS_PER_HOUR}) reached for this number. Please try again later.`
            };
        }

        // Check daily limit
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dailyCount = await Notification.countDocuments({
            recipient: phone,
            type: "sms",
            sentAt: { $gte: startOfDay },
            status: "sent"
        });

        if (dailyCount >= RATE_LIMITS.MAX_SMS_PER_DAY) {
            return {
                canSend: false,
                message: `Daily SMS limit (${RATE_LIMITS.MAX_SMS_PER_DAY}) reached for this number. Please try again tomorrow.`
            };
        }

        // OTP has special exemption - allow even if close to limits
        if (purpose === "otp" && dailyCount < RATE_LIMITS.MAX_SMS_PER_DAY) {
            return { canSend: true };
        }

        return { canSend: true };
    } catch (error) {
        console.error("Rate limit check error:", error);
        // On error, allow SMS to prevent blocking legitimate requests
        return { canSend: true };
    }
}

/**
 * Express middleware for SMS rate limiting
 * Usage: Add to routes that send SMS
 */
async function smsRateLimitMiddleware(req, res, next) {
    try {
        // Extract phone number from request
        // Can be in body, params, or from student data
        let phone = req.body.phone || req.body.parentPhone;
        const purpose = req.body.smsPurpose || "general";

        // If phone not in body, try to get from student
        if (!phone && req.body.studentId) {
            const Student = require("../models/student.model");
            const student = await Student.findById(req.body.studentId)
                .select("father.phone mother.phone");

            if (student) {
                phone = student.father?.phone || student.mother?.phone;
            }
        }

        if (!phone) {
            // No phone number found, skip rate limiting
            return next();
        }

        const rateLimitCheck = await checkSMSRateLimit(phone, purpose);

        if (!rateLimitCheck.canSend) {
            return res.status(429).json({
                success: false,
                message: rateLimitCheck.message,
                error: "RATE_LIMIT_EXCEEDED"
            });
        }

        // Rate limit passed, continue
        next();
    } catch (error) {
        console.error("SMS rate limit middleware error:", error);
        // On error, allow request to continue
        next();
    }
}

/**
 * Get SMS statistics for a phone number
 * @param {string} phone - Phone number
 * @returns {Promise<Object>} - SMS statistics
 */
async function getSMSStats(phone) {
    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        const [dailyCount, hourlyCount, lastSMS] = await Promise.all([
            Notification.countDocuments({
                recipient: phone,
                type: "sms",
                sentAt: { $gte: startOfDay },
                status: "sent"
            }),
            Notification.countDocuments({
                recipient: phone,
                type: "sms",
                sentAt: { $gte: oneHourAgo },
                status: "sent"
            }),
            Notification.findOne({
                recipient: phone,
                type: "sms",
                status: "sent"
            }).sort({ sentAt: -1 })
        ]);

        return {
            dailyCount,
            hourlyCount,
            dailyLimit: RATE_LIMITS.MAX_SMS_PER_DAY,
            hourlyLimit: RATE_LIMITS.MAX_SMS_PER_HOUR,
            dailyRemaining: Math.max(0, RATE_LIMITS.MAX_SMS_PER_DAY - dailyCount),
            hourlyRemaining: Math.max(0, RATE_LIMITS.MAX_SMS_PER_HOUR - hourlyCount),
            lastSMSSentAt: lastSMS?.sentAt || null
        };
    } catch (error) {
        console.error("Get SMS stats error:", error);
        return null;
    }
}

module.exports = {
    checkSMSRateLimit,
    smsRateLimitMiddleware,
    getSMSStats,
    RATE_LIMITS
};
