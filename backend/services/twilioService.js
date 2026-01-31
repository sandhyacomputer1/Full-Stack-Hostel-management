const Notification = require("../models/notification.model");
const SMSTemplates = require("./smsTemplates");
const { checkSMSRateLimit } = require("../middlewares/smsRateLimit");

class TwilioService {
    constructor() {
        // Twilio credentials from environment variables
        this.accountSid = process.env.TWILIO_ACCOUNT_SID;
        this.authToken = process.env.TWILIO_AUTH_TOKEN;
        this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
        this.serviceSid = process.env.TWILIO_SERVICE_SID; // For Verify API

        // Initialize Twilio client only if credentials are provided
        if (this.accountSid && this.authToken) {
            try {
                const twilio = require("twilio");
                this.client = twilio(this.accountSid, this.authToken);
                console.log("✅ Twilio service initialized");

                // Check if using Verify API or regular SMS
                if (this.serviceSid) {
                    console.log("✅ Twilio Verify API enabled for OTP");
                } else if (this.phoneNumber) {
                    console.log("✅ Twilio SMS API enabled");
                }
            } catch (error) {
                console.warn("⚠️ Twilio not initialized:", error.message);
                this.client = null;
            }
        } else {
            console.warn(
                "⚠️ Twilio credentials not found in environment variables. SMS features will be disabled."
            );
            this.client = null;
        }
    }

    /**
   * Format phone number to E.164 format (required by Twilio)
   * @param {string} phone - Phone number
   * @returns {string} - Formatted phone number
   */
    formatPhoneNumber(phone) {
        // Remove any spaces, dashes, or parentheses
        let cleaned = phone.replace(/[\s\-\(\)]/g, "");

        // If it doesn't start with +, assume it's Indian number and add +91
        if (!cleaned.startsWith("+")) {
            // If it starts with 91 and is 12 digits, add +
            if (cleaned.startsWith("91") && cleaned.length === 12) {
                cleaned = "+" + cleaned;
            } else if (cleaned.length === 10) {
                // If it's 10 digits, add +91
                cleaned = "+91" + cleaned;
            } else {
                // Otherwise, just add +
                cleaned = "+" + cleaned;
            }
        }

        return cleaned;
    }

    /**
     * Send OTP using Twilio Verify API (recommended for OTP)
     * @param {string} phone - Recipient phone number
     * @param {string} otp - OTP code (ignored when using Verify API, Twilio generates it)
     */
    async sendOTPViaVerify(phone) {
        if (!this.client || !this.serviceSid) {
            console.log(`📱 [OTP MOCK - Verify] To: ${phone}`);
            return {
                success: true,
                messageId: "mock-verify-" + Date.now(),
                mock: true,
            };
        }

        try {
            const formattedPhone = this.formatPhoneNumber(phone);

            const verification = await this.client.verify.v2
                .services(this.serviceSid)
                .verifications.create({
                    to: formattedPhone,
                    channel: "sms",
                });

            console.log(
                `✅ OTP sent via Verify to ${formattedPhone}: ${verification.sid}`
            );
            return { success: true, messageId: verification.sid };
        } catch (error) {
            console.error(`❌ Verify OTP failed to ${phone}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Verify OTP using Twilio Verify API
     * @param {string} phone - Phone number
     * @param {string} otp - OTP code to verify
     */
    async verifyOTPViaVerify(phone, otp) {
        if (!this.client || !this.serviceSid) {
            console.log(`📱 [OTP VERIFY MOCK] Phone: ${phone}, OTP: ${otp}`);
            // In mock mode, accept any 6-digit OTP
            return { success: true, status: "approved", mock: true };
        }

        try {
            const formattedPhone = this.formatPhoneNumber(phone);

            const verificationCheck = await this.client.verify.v2
                .services(this.serviceSid)
                .verificationChecks.create({
                    to: formattedPhone,
                    code: otp,
                });

            console.log(
                `✅ OTP verified for ${formattedPhone}: ${verificationCheck.status}`
            );
            return {
                success: verificationCheck.status === "approved",
                status: verificationCheck.status,
            };
        } catch (error) {
            console.error(`❌ OTP verification failed for ${phone}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send SMS via Twilio (for notifications, not OTP)
     * @param {string} to - Recipient phone number
     * @param {string} message - SMS message
     * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
     */
    async sendSMS(to, message) {
        // If Twilio not configured, log and return success (for development)
        if (!this.client || !this.phoneNumber) {
            console.log(`📱 [SMS MOCK] To: ${to}, Message: ${message}`);
            return {
                success: true,
                messageId: "mock-" + Date.now(),
                mock: true,
            };
        }

        try {
            const formattedPhone = this.formatPhoneNumber(to);

            const result = await this.client.messages.create({
                body: message,
                from: this.phoneNumber,
                to: formattedPhone,
            });

            console.log(`✅ SMS sent to ${formattedPhone}: ${result.sid}`);
            return { success: true, messageId: result.sid };
        } catch (error) {
            console.error(`❌ SMS failed to ${to}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send OTP SMS (uses Verify API if available, otherwise regular SMS)
     * @param {string} phone - Recipient phone number
     * @param {string} otp - OTP code
     * @param {string} hostelName - Hostel name (optional)
     * @param {string} studentNames - Student names (optional)
     */
    async sendOTP(phone, otp, hostelName = "Hostel", studentNames = "") {
        // If Verify API is configured, use it (recommended)
        if (this.serviceSid) {
            console.log("ℹ️ [Twilio] Using Verify API (TWILIO_SERVICE_SID detected).");
            console.log("   • Message: Standard Twilio OTP template (cannot be customized in code)");
            console.log("   • To use Custom Template: Remove TWILIO_SERVICE_SID from .env");

            const result = await this.sendOTPViaVerify(phone);

            // Log notification
            await Notification.create({
                type: "sms",
                recipient: phone,
                message: `OTP verification via Twilio Verify for ${hostelName} - Parent Portal Login`,
                purpose: "otp",
                status: result.success ? "sent" : "failed",
                sentAt: result.success ? new Date() : null,
                failureReason: result.error || null,
            });

            return result;
        }

        console.log("ℹ️ [Twilio] Using Standard SMS (No TWILIO_SERVICE_SID).");
        console.log("   • Message: Using custom SMSTemplates.otpLogin");

        // Otherwise, use regular SMS with detailed message using template
        const message = SMSTemplates.otpLogin({
            hostelName,
            studentNames,
            otp
        });

        const result = await this.sendSMS(phone, message);

        // Log notification
        await Notification.create({
            type: "sms",
            recipient: phone,
            message,
            purpose: "otp",
            status: result.success ? "sent" : "failed",
            sentAt: result.success ? new Date() : null,
            failureReason: result.error || null,
        });

        return result;
    }

    /**
     * Send fee payment confirmation SMS
     * @param {string} phone - Parent phone number
     * @param {string} studentName - Student name
     * @param {number} amount - Amount paid
     * @param {string} receiptNumber - Receipt number
     * @param {string} studentId - Student ID
     * @param {string} feeId - Fee record ID
     * @param {string} hostelId - Hostel ID
     * @param {number} installmentNumber - Installment number
     * @param {string} paymentMode - Payment mode
     */
    async sendFeePaymentConfirmation(
        phone,
        studentName,
        amount,
        receiptNumber,
        studentId,
        feeId,
        hostelId,
        installmentNumber = 1,
        paymentMode = "cash"
    ) {
        const hostelName = await this.getHostelName(hostelId);

        const message = SMSTemplates.feePaymentConfirmation({
            hostelName,
            studentName,
            amount,
            receiptNumber,
            paymentDate: new Date(),
            installmentNumber,
            paymentMode
        });

        const result = await this.sendSMS(phone, message);

        // Log notification
        await Notification.create({
            type: "sms",
            recipient: phone,
            message,
            purpose: "fee_payment",
            status: result.success ? "sent" : "failed",
            sentAt: result.success ? new Date() : null,
            failureReason: result.error || null,
            relatedStudent: studentId,
            relatedFee: feeId,
            assignedHostel: hostelId,
        });

        return result;
    }

    /**
     * Send fee reminder SMS for pending fees
     * @param {string} phone - Parent phone number
     * @param {string} studentName - Student name
     * @param {Array} pendingInstallments - Array of pending installments
     * @param {string} hostelName - Hostel name
     * @param {string} studentId - Student ID
     * @param {string} hostelId - Hostel ID
     */
    async sendFeePendingReminder(
        phone,
        studentName,
        pendingInstallments,
        hostelName,
        studentId,
        hostelId
    ) {
        // Calculate total pending
        const totalPending = pendingInstallments.reduce((sum, inst) => sum + (inst.amount || 0), 0);

        const message = SMSTemplates.duePaymentReminder({
            hostelName,
            studentName,
            pendingInstallments,
            totalPending
        });

        const result = await this.sendSMS(phone, message);

        // Log notification
        await Notification.create({
            type: "sms",
            recipient: phone,
            message,
            purpose: "fee_reminder",
            status: result.success ? "sent" : "failed",
            sentAt: result.success ? new Date() : null,
            failureReason: result.error || null,
            relatedStudent: studentId,
            assignedHostel: hostelId,
        });

        return result;
    }

    /**
     * Send fee overdue alert SMS
     * @param {string} phone - Parent phone number
     * @param {string} studentName - Student name
     * @param {Array} overdueInstallments - Array of overdue installments
     * @param {string} hostelName - Hostel name
     * @param {string} studentId - Student ID
     * @param {string} hostelId - Hostel ID
     */
    async sendFeeOverdueAlert(
        phone,
        studentName,
        overdueInstallments,
        hostelName,
        studentId,
        hostelId
    ) {
        // Calculate total overdue
        const totalOverdue = overdueInstallments.reduce((sum, inst) => sum + (inst.amount || 0), 0);

        const message = SMSTemplates.overduePaymentAlert({
            hostelName,
            studentName,
            overdueInstallments,
            totalOverdue
        });

        const result = await this.sendSMS(phone, message);

        // Log notification
        await Notification.create({
            type: "sms",
            recipient: phone,
            message,
            purpose: "fee_overdue",
            status: result.success ? "sent" : "failed",
            sentAt: result.success ? new Date() : null,
            failureReason: result.error || null,
            relatedStudent: studentId,
            assignedHostel: hostelId,
        });

        return result;
    }

    /**
     * Send low balance alert SMS
     * @param {string} phone - Parent phone number
     * @param {string} studentName - Student name
     * @param {number} balance - Current balance
     * @param {string} studentId - Student ID
     * @param {string} hostelId - Hostel ID
     */
    async sendLowBalanceAlert(phone, studentName, balance, studentId, hostelId) {
        const hostelName = await this.getHostelName(hostelId);

        const message = SMSTemplates.lowBalanceAlert({
            hostelName,
            studentName,
            currentBalance: balance
        });

        const result = await this.sendSMS(phone, message);

        // Log notification
        await Notification.create({
            type: "sms",
            recipient: phone,
            message,
            purpose: "low_balance",
            status: result.success ? "sent" : "failed",
            sentAt: result.success ? new Date() : null,
            failureReason: result.error || null,
            relatedStudent: studentId,
            assignedHostel: hostelId,
        });

        return result;
    }

    /**
     * Send bank account credit/deposit SMS notification
     * @param {Object} params - Notification parameters
     * @returns {Promise<Object>} - SMS result
     */
    async sendBankCreditNotification({
        phone,
        studentName,
        amount,
        category,
        newBalance,
        transactionDate,
        remarks,
        studentId,
        hostelId
    }) {
        const hostelName = await this.getHostelName(hostelId);

        const message = SMSTemplates.bankAccountCredit({
            hostelName,
            studentName,
            amount,
            category,
            newBalance,
            transactionDate,
            remarks
        });

        const result = await this.sendSMS(phone, message);

        // Log notification
        await Notification.create({
            type: "sms",
            recipient: phone,
            message,
            purpose: "bank_credit",
            status: result.success ? "sent" : "failed",
            sentAt: result.success ? new Date() : null,
            failureReason: result.error || null,
            relatedStudent: studentId,
            assignedHostel: hostelId,
        });

        return result;
    }

    /**
     * Send bank account debit/withdrawal SMS notification
     * @param {Object} params - Notification parameters
     * @returns {Promise<Object>} - SMS result
     */
    async sendBankDebitNotification({
        phone,
        studentName,
        amount,
        category,
        newBalance,
        transactionDate,
        remarks,
        studentId,
        hostelId
    }) {
        const hostelName = await this.getHostelName(hostelId);

        const message = SMSTemplates.bankAccountDebit({
            hostelName,
            studentName,
            amount,
            category,
            newBalance,
            transactionDate,
            remarks
        });

        const result = await this.sendSMS(phone, message);

        // Log notification
        await Notification.create({
            type: "sms",
            recipient: phone,
            message,
            purpose: "bank_debit",
            status: result.success ? "sent" : "failed",
            sentAt: result.success ? new Date() : null,
            failureReason: result.error || null,
            relatedStudent: studentId,
            assignedHostel: hostelId,
        });

        return result;
    }

    /**
     * Send bank account freeze alert SMS
     * @param {Object} params - Notification parameters
     * @returns {Promise<Object>} - SMS result
     */
    async sendBankFreezeNotification({
        phone,
        studentName,
        reason,
        currentBalance,
        studentId,
        hostelId
    }) {
        const hostelName = await this.getHostelName(hostelId);

        const message = SMSTemplates.bankAccountFreeze({
            hostelName,
            studentName,
            reason,
            currentBalance
        });

        const result = await this.sendSMS(phone, message);

        // Log notification
        await Notification.create({
            type: "sms",
            recipient: phone,
            message,
            purpose: "bank_freeze",
            status: result.success ? "sent" : "failed",
            sentAt: result.success ? new Date() : null,
            failureReason: result.error || null,
            relatedStudent: studentId,
            assignedHostel: hostelId,
        });

        return result;
    }

    /**
     * Send bank account unfreeze notification SMS
     * @param {Object} params - Notification parameters
     * @returns {Promise<Object>} - SMS result
     */
    async sendBankUnfreezeNotification({
        phone,
        studentName,
        currentBalance,
        studentId,
        hostelId
    }) {
        const hostelName = await this.getHostelName(hostelId);

        const message = SMSTemplates.bankAccountUnfreeze({
            hostelName,
            studentName,
            currentBalance
        });

        const result = await this.sendSMS(phone, message);

        // Log notification
        await Notification.create({
            type: "sms",
            recipient: phone,
            message,
            purpose: "bank_unfreeze",
            status: result.success ? "sent" : "failed",
            sentAt: result.success ? new Date() : null,
            failureReason: result.error || null,
            relatedStudent: studentId,
            assignedHostel: hostelId,
        });

        return result;
    }

    /**
     * Helper: Get hostel name by ID
     * @param {string} hostelId - Hostel ID
     * @returns {Promise<string>} - Hostel name
     */
    async getHostelName(hostelId) {
        try {
            const Hostel = require("../models/hostel.model");
            const hostel = await Hostel.findById(hostelId).select("name");
            return hostel?.name || "Hostel";
        } catch (error) {
            console.error("Error fetching hostel name:", error);
            return "Hostel";
        }
    }
}

module.exports = new TwilioService();
