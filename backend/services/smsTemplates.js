/**
 * SMS Templates Service
 * Centralized SMS message templates for consistency and easy maintenance
 * 
 * TRIAL-SAFE VERSION: Short messages optimized for Twilio trial accounts
 * For production with DLT registration, use rich templates in comments below each method
 */

class SMSTemplates {
    /**
     * OTP Login SMS Template
     * @param {Object} params - Template parameters
     * @param {string} params.hostelName - Name of the hostel
     * @param {string} params.studentNames - Comma-separated student names
     * @param {string} params.otp - OTP code
     * @returns {string} - Formatted SMS message
     */
    static otpLogin({ hostelName, studentNames, otp }) {
        const studentInfo = studentNames ? ` for ${studentNames}` : "";
        return `${hostelName}: Login OTP ${otp}${studentInfo}. Valid 5 min. Do not share.`;

        /* PRODUCTION/DLT VERSION (commented for future use):
        const studentInfo = studentNames ? `\n\nStudent(s): ${studentNames}` : "";
        return `${hostelName} - Parent Portal Login

Dear Parent,${studentInfo}

Your verification code is: ${otp}

This code is valid for 5 minutes only.

⚠️ SECURITY NOTICE:
Never share this code with anyone. If you didn't request this login, please contact the hostel administration immediately.

- ${hostelName} Management`;
        */
    }

    /**
     * Fee Payment Confirmation SMS Template
     * @param {Object} params - Template parameters
     * @returns {string} - Formatted SMS message
     */
    static feePaymentConfirmation({
        hostelName,
        studentName,
        amount,
        receiptNumber,
        paymentDate,
        installmentNumber,
        paymentMode
    }) {
        const date = new Date(paymentDate).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });

        return `${hostelName}: Fee Rs ${amount} received for ${studentName}, Inst #${installmentNumber}, Receipt ${receiptNumber}, ${paymentMode}, ${date}. Thank you.`;

        /* PRODUCTION/DLT VERSION:
        return `${hostelName} - Payment Received ✓

Dear Parent of ${studentName},

PAYMENT CONFIRMATION
--------------------
Amount Paid: ₹${amount.toLocaleString('en-IN')}
Installment: #${installmentNumber}
Receipt No: ${receiptNumber}
Payment Mode: ${paymentMode.toUpperCase()}
Date: ${date}

Thank you for your timely payment!

For queries, contact hostel office.`;
        */
    }

    /**
     * Due Payment Reminder SMS Template
     * @param {Object} params - Template parameters
     * @returns {string} - Formatted SMS message
     */
    static duePaymentReminder({
        hostelName,
        studentName,
        pendingInstallments,
        totalPending
    }) {
        // Show only first pending installment to keep message short
        const nextInst = pendingInstallments?.[0];
        let instText = "";

        if (nextInst) {
            const dueDate = new Date(nextInst.dueDate).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short'
            });
            instText = ` Next: Inst #${nextInst.installmentNumber} Rs ${nextInst.amount} due ${dueDate}.`;
        }

        return `${hostelName}: Fee pending Rs ${totalPending} for ${studentName}.${instText} Pay soon to avoid late fee.`;

        /* PRODUCTION/DLT VERSION:
        let installmentDetails = "";
        pendingInstallments.forEach((inst, index) => {
            const dueDate = new Date(inst.dueDate).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short'
            });
            installmentDetails += `\n${index + 1}. Installment #${inst.installmentNumber}: ₹${inst.amount.toLocaleString('en-IN')} (Due: ${dueDate})`;
        });

        return `${hostelName} - Fee Reminder 📋

Dear Parent of ${studentName},

PENDING FEE DETAILS
--------------------${installmentDetails}

Total Pending: ₹${totalPending.toLocaleString('en-IN')}

Please pay at the earliest to avoid late charges.

Payment can be made at the hostel office or online through the parent portal.`;
        */
    }

    /**
     * Overdue Payment Alert SMS Template
     * @param {Object} params - Template parameters
     * @returns {string} - Formatted SMS message
     */
    static overduePaymentAlert({
        hostelName,
        studentName,
        overdueInstallments,
        totalOverdue
    }) {
        // Show only first overdue installment
        const first = overdueInstallments?.[0];
        let extra = "";

        if (first) {
            const daysOverdue = Math.floor(
                (new Date() - new Date(first.dueDate)) / (1000 * 60 * 60 * 24)
            );
            extra = ` Inst #${first.installmentNumber} Rs ${first.amount} is ${daysOverdue} days overdue.`;
        }

        return `${hostelName}: OVERDUE fee Rs ${totalOverdue} for ${studentName}.${extra} Pay immediately to avoid penalty.`;

        /* PRODUCTION/DLT VERSION:
        let overdueDetails = "";
        overdueInstallments.forEach((inst, index) => {
            const daysOverdue = Math.floor(
                (new Date() - new Date(inst.dueDate)) / (1000 * 60 * 60 * 24)
            );
            overdueDetails += `\n${index + 1}. Installment #${inst.installmentNumber}: ₹${inst.amount.toLocaleString('en-IN')} (${daysOverdue} days overdue)`;
        });

        return `${hostelName} - URGENT: Fee Overdue ⚠️

Dear Parent of ${studentName},

OVERDUE FEE ALERT
--------------------${overdueDetails}

Total Overdue: ₹${totalOverdue.toLocaleString('en-IN')}

⚠️ IMMEDIATE PAYMENT REQUIRED
Late fees may apply. Please clear dues immediately to avoid penalties.

Contact hostel office for assistance.`;
        */
    }

    /**
     * Bank Account Credit SMS Template
     * @param {Object} params - Template parameters
     * @returns {string} - Formatted SMS message
     */
    static bankAccountCredit({
        hostelName,
        studentName,
        amount,
        category,
        newBalance,
        transactionDate,
        remarks
    }) {
        const date = new Date(transactionDate).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });

        const categoryText = category === 'cash_deposit' ? 'cash' :
            category === 'online_deposit' ? 'online' : 'deposit';

        const remarkText = remarks ? ` Note: ${remarks}.` : "";

        return `${hostelName}: Account credit Rs ${amount} for ${studentName} (${categoryText}). New balance Rs ${newBalance}. ${date}.${remarkText}`;

        /* PRODUCTION/DLT VERSION:
        const date = new Date(transactionDate).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const categoryText = category === 'cash_deposit' ? 'Cash Deposit' :
            category === 'online_deposit' ? 'Online Deposit' :
                'Deposit';

        return `${hostelName} - Account Credited ✓

Dear Parent of ${studentName},

CREDIT TRANSACTION
--------------------
Amount: +₹${amount.toLocaleString('en-IN')}
Type: ${categoryText}
${remarks ? `Purpose: ${remarks}\n` : ''}New Balance: ₹${newBalance.toLocaleString('en-IN')}
Date: ${date}

Thank you for the deposit!`;
        */
    }

    /**
     * Bank Account Debit SMS Template
     * @param {Object} params - Template parameters
     * @returns {string} - Formatted SMS message
     */
    static bankAccountDebit({
        hostelName,
        studentName,
        amount,
        category,
        newBalance,
        transactionDate,
        remarks
    }) {
        const date = new Date(transactionDate).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });

        const categoryMap = {
            'canteen': 'canteen',
            'fine': 'fine',
            'hostel_fee': 'fee',
            'laundry': 'laundry',
            'stationery': 'stationery',
            'other': 'other'
        };

        const categoryText = categoryMap[category] || category;
        const remarkText = remarks ? ` Note: ${remarks}.` : "";

        return `${hostelName}: Account debit Rs ${amount} for ${studentName} (${categoryText}). New balance Rs ${newBalance}. ${date}.${remarkText}`;

        /* PRODUCTION/DLT VERSION:
        const date = new Date(transactionDate).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const categoryMap = {
            'canteen': 'Canteen Purchase',
            'fine': 'Fine/Penalty',
            'hostel_fee': 'Hostel Fee',
            'laundry': 'Laundry Service',
            'stationery': 'Stationery',
            'other': 'Other Expense'
        };

        const categoryText = categoryMap[category] || category;

        return `${hostelName} - Account Debited

Dear Parent of ${studentName},

DEBIT TRANSACTION
--------------------
Amount: -₹${amount.toLocaleString('en-IN')}
Category: ${categoryText}
${remarks ? `Details: ${remarks}\n` : ''}New Balance: ₹${newBalance.toLocaleString('en-IN')}
Date: ${date}

For queries, contact hostel office.`;
        */
    }

    /**
     * Bank Account Freeze Alert SMS Template
     * @param {Object} params - Template parameters
     * @returns {string} - Formatted SMS message
     */
    static bankAccountFreeze({
        hostelName,
        studentName,
        reason,
        currentBalance
    }) {
        const reasonText = reason ? ` Reason: ${reason}.` : "";
        return `${hostelName}: Account for ${studentName} is FROZEN. Balance Rs ${currentBalance}.${reasonText} Contact office.`;

        /* PRODUCTION/DLT VERSION:
        return `${hostelName} - Account Frozen 🔒

Dear Parent of ${studentName},

ACCOUNT STATUS ALERT
--------------------
Status: FROZEN
${reason ? `Reason: ${reason}\n` : ''}Current Balance: ₹${currentBalance.toLocaleString('en-IN')}

⚠️ No transactions can be processed until the account is unfrozen.

Please contact the hostel administration immediately for more information.`;
        */
    }

    /**
     * Bank Account Unfreeze Notification SMS Template
     * @param {Object} params - Template parameters
     * @returns {string} - Formatted SMS message
     */
    static bankAccountUnfreeze({
        hostelName,
        studentName,
        currentBalance
    }) {
        return `${hostelName}: Account for ${studentName} is now ACTIVE. Balance Rs ${currentBalance}. Transactions allowed.`;

        /* PRODUCTION/DLT VERSION:
        return `${hostelName} - Account Activated ✓

Dear Parent of ${studentName},

ACCOUNT STATUS UPDATE
--------------------
Status: ACTIVE
Current Balance: ₹${currentBalance.toLocaleString('en-IN')}

Your child's account has been successfully activated. All transactions can now be processed normally.

Thank you for your cooperation.`;
        */
    }

    /**
     * Low Balance Alert SMS Template
     * @param {Object} params - Template parameters
     * @returns {string} - Formatted SMS message
     */
    static lowBalanceAlert({
        hostelName,
        studentName,
        currentBalance,
        threshold = 500
    }) {
        return `${hostelName}: Low balance for ${studentName}. Current Rs ${currentBalance}. Recommended min Rs ${threshold}. Recharge soon.`;

        /* PRODUCTION/DLT VERSION:
        return `${hostelName} - Low Balance Alert ⚠️

Dear Parent of ${studentName},

BALANCE NOTIFICATION
--------------------
Current Balance: ₹${currentBalance.toLocaleString('en-IN')}

Your child's account balance is running low. Please recharge soon to ensure uninterrupted services.

Recommended minimum balance: ₹${threshold}`;
        */
    }
}

module.exports = SMSTemplates;
