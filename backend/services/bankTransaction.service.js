// server/services/bankTransaction.service.js
const mongoose = require("mongoose");
const StudentBankAccount = require("../models/studentBankAccount.model");
const BankTransaction = require("../models/bankTransaction.model");
const AuditLog = require("../models/auditLog.model");
const twilioService = require("./twilioService");

/**
 * ✅ CORE RULE: All balance updates MUST go through transactions
 * This ensures consistency (removed session/transaction for standalone MongoDB)
 */

class BankTransactionService {
    /**
     * Credit money to student account (Deposit)
     */

    static async creditAccount({
        studentId,
        hostelId,
        amount,
        category = "deposit",
        remarks,
        referenceId,
        performedBy,
        metadata,
    }) {
        try {
            // 1. Find or CREATE account automatically
            let account = await StudentBankAccount.findOne({
                student: studentId,
                assignedHostel: hostelId,
            });

            // ✅ AUTO-CREATE if not found
            if (!account) {
                console.log(`🏦 Creating bank account for student: ${studentId}`);
                account = await StudentBankAccount.create({
                    student: studentId,
                    assignedHostel: hostelId,
                    balance: 0,
                    status: "active",
                    lastUpdatedBy: performedBy,
                });
            }

            if (account.status === "frozen") {
                throw new Error("Account is frozen. Cannot process credit.");
            }

            if (account.status === "closed") {
                throw new Error("Account is closed. Cannot process credit.");
            }

            // Rest of the code remains the same...
            const balanceBefore = account.balance;
            const balanceAfter = balanceBefore + amount;

            const transaction = await BankTransaction.create({
                student: studentId,
                bankAccount: account._id,
                assignedHostel: hostelId,
                type: "credit",
                category,
                amount,
                balanceBefore,
                balanceAfter,
                referenceId,
                remarks,
                performedBy,
                performedAt: new Date(),
                metadata,
            });

            account.balance = balanceAfter;
            account.lastTransactionAt = new Date();
            account.lastUpdatedBy = performedBy;
            await account.save();

            // Log audit
            try {
                await AuditLog.log({
                    model: "StudentBankAccount",
                    refId: account._id,
                    action: "payment",
                    payload: {
                        transactionId: transaction._id,
                        type: "credit",
                        category,
                        amount,
                        balanceBefore,
                        balanceAfter,
                        studentId,
                    },
                    user: performedBy,
                    assignedHostel: hostelId,
                    reason: remarks || `Credit: ${category}`,
                });
            } catch (auditError) {
                console.error("⚠️ Audit log failed:", auditError.message);
            }

            await transaction.populate("performedBy", "name email");

            // Send SMS notification to parent
            try {
                const Student = require("../models/student.model");
                const student = await Student.findById(studentId)
                    .select("name father.phone mother.phone");

                if (student) {
                    const parentPhone = student.father?.phone || student.mother?.phone;

                    if (parentPhone) {
                        await twilioService.sendBankCreditNotification({
                            phone: parentPhone,
                            studentName: student.name,
                            amount,
                            category,
                            newBalance: balanceAfter,
                            transactionDate: new Date(),
                            remarks,
                            studentId,
                            hostelId
                        });
                        console.log(`✅ Credit SMS sent to parent: ${parentPhone}`);
                    }
                }
            } catch (smsError) {
                // Don't fail transaction if SMS fails
                console.error("⚠️ SMS notification failed:", smsError.message);
            }

            return {
                success: true,
                transaction,
                newBalance: balanceAfter,
            };
        } catch (error) {
            console.error("Credit account error:", error);
            throw new Error(error.message || "Failed to credit account");
        }
    }


    /**
     * Debit money from student account (Spend)
     */
    static async debitAccount({
        studentId,
        hostelId,
        amount,
        category,
        remarks,
        referenceId,
        performedBy,
        metadata,
    }) {
        try {
            // 1. Get account
            const account = await StudentBankAccount.findOne({
                student: studentId,
                assignedHostel: hostelId,
            });

            if (!account) {
                throw new Error("Bank account not found");
            }

            if (account.status === "frozen") {
                throw new Error("Account is frozen. Cannot process debit.");
            }

            if (account.status === "closed") {
                throw new Error("Account is closed. Cannot process debit.");
            }

            // 2. Check sufficient balance
            if (account.balance < amount) {
                throw new Error(
                    `Insufficient balance. Available: ₹${account.balance.toFixed(
                        2
                    )}, Required: ₹${amount.toFixed(2)}`
                );
            }

            // 3. Calculate new balance
            const balanceBefore = account.balance;
            const balanceAfter = balanceBefore - amount;

            // 4. Create transaction record
            const transaction = await BankTransaction.create({
                student: studentId,
                bankAccount: account._id,
                assignedHostel: hostelId,
                type: "debit",
                category,
                amount,
                balanceBefore,
                balanceAfter,
                referenceId,
                remarks,
                performedBy,
                performedAt: new Date(),
                metadata,
            });

            // 5. Update account balance
            account.balance = balanceAfter;
            account.lastTransactionAt = new Date();
            account.lastUpdatedBy = performedBy;
            await account.save();

            // 6. Log audit
            try {
                await AuditLog.log({
                    model: "StudentBankAccount",
                    refId: account._id,
                    action: "payment",
                    payload: {
                        transactionId: transaction._id,
                        type: "debit",
                        category,
                        amount,
                        balanceBefore,
                        balanceAfter,
                        studentId,
                    },
                    user: performedBy,
                    assignedHostel: hostelId,
                    reason: remarks || `Debit: ${category}`,
                });
            } catch (auditError) {
                console.error("⚠️ Audit log failed:", auditError.message);
                // Don't fail the transaction if audit fails
            }

            // Populate performedBy
            await transaction.populate("performedBy", "name email");

            // Send SMS notification to parent
            try {
                const Student = require("../models/student.model");
                const student = await Student.findById(studentId)
                    .select("name father.phone mother.phone");

                if (student) {
                    const parentPhone = student.father?.phone || student.mother?.phone;

                    if (parentPhone) {
                        await twilioService.sendBankDebitNotification({
                            phone: parentPhone,
                            studentName: student.name,
                            amount,
                            category,
                            newBalance: balanceAfter,
                            transactionDate: new Date(),
                            remarks,
                            studentId,
                            hostelId
                        });
                        console.log(`✅ Debit SMS sent to parent: ${parentPhone}`);
                    }
                }
            } catch (smsError) {
                // Don't fail transaction if SMS fails
                console.error("⚠️ SMS notification failed:", smsError.message);
            }

            return {
                success: true,
                transaction,
                newBalance: balanceAfter,
            };
        } catch (error) {
            console.error("Debit account error:", error);
            throw new Error(error.message || "Failed to debit account");
        }
    }

    /**
     * Reverse a transaction (Refund/Correction)
     */
    static async reverseTransaction({
        transactionId,
        hostelId,
        reason,
        performedBy,
    }) {
        try {
            // 1. Get original transaction
            const originalTxn = await BankTransaction.findOne({
                _id: transactionId,
                assignedHostel: hostelId,
            });

            if (!originalTxn) {
                throw new Error("Transaction not found");
            }

            if (originalTxn.isReversed) {
                throw new Error("Transaction already reversed");
            }

            // 2. Get account
            const account = await StudentBankAccount.findOne({
                student: originalTxn.student,
                assignedHostel: hostelId,
            });

            if (!account) {
                throw new Error("Account not found");
            }

            // 3. Create reversal transaction (opposite type)
            const reversalType = originalTxn.type === "credit" ? "debit" : "credit";
            const balanceBefore = account.balance;
            const balanceAfter =
                reversalType === "credit"
                    ? balanceBefore + originalTxn.amount
                    : balanceBefore - originalTxn.amount;

            // Check balance if reversing a credit (debit reversal)
            if (reversalType === "debit" && account.balance < originalTxn.amount) {
                throw new Error(
                    `Insufficient balance for reversal. Available: ₹${account.balance.toFixed(
                        2
                    )}, Required: ₹${originalTxn.amount.toFixed(2)}`
                );
            }

            // Create reversal transaction
            const reversalTxn = await BankTransaction.create({
                student: originalTxn.student,
                bankAccount: account._id,
                assignedHostel: hostelId,
                type: reversalType,
                category: "reversal",
                amount: originalTxn.amount,
                balanceBefore,
                balanceAfter,
                referenceId: `REV-${transactionId}`,
                remarks: `Reversal of transaction ${transactionId}. Reason: ${reason}`,
                performedBy,
                performedAt: new Date(),
                metadata: { originalTransactionId: transactionId },
                reversalOf: transactionId,
            });

            // 4. Mark original as reversed
            originalTxn.isReversed = true;
            originalTxn.reversedBy = reversalTxn._id;
            await originalTxn.save();

            // 5. Update account balance
            account.balance = balanceAfter;
            account.lastTransactionAt = new Date();
            account.lastUpdatedBy = performedBy;
            await account.save();

            // 6. Log audit
            try {
                await AuditLog.log({
                    model: "StudentBankAccount",
                    refId: account._id,
                    action: "reversal",
                    payload: {
                        originalTransactionId: transactionId,
                        reversalTransactionId: reversalTxn._id,
                        amount: originalTxn.amount,
                        reason,
                    },
                    user: performedBy,
                    assignedHostel: hostelId,
                    reason: `Transaction reversal: ${reason}`,
                });
            } catch (auditError) {
                console.error("⚠️ Audit log failed:", auditError.message);
            }

            return {
                success: true,
                reversalTransaction: reversalTxn,
                originalTransaction: originalTxn,
            };
        } catch (error) {
            console.error("Reverse transaction error:", error);
            throw new Error(error.message || "Failed to reverse transaction");
        }
    }

    /**
     * Reconcile account balance
     */
    static async reconcileBalance(bankAccountId) {
        try {
            const account = await StudentBankAccount.findById(bankAccountId);

            if (!account) {
                throw new Error("Account not found");
            }

            // Calculate balance from all transactions
            const transactions = await BankTransaction.find({
                bankAccount: bankAccountId,
                isReversed: { $ne: true },
            }).sort({ performedAt: 1 });

            let calculatedBalance = 0;
            transactions.forEach((txn) => {
                if (txn.type === "credit") {
                    calculatedBalance += txn.amount;
                } else {
                    calculatedBalance -= txn.amount;
                }
            });

            const difference = Math.abs(account.balance - calculatedBalance);
            const isMatching = difference < 0.01; // Float comparison tolerance

            return {
                accountBalance: account.balance,
                calculatedBalance,
                isMatching,
                difference,
                totalTransactions: transactions.length,
            };
        } catch (error) {
            console.error("Reconcile balance error:", error);
            throw new Error("Failed to reconcile balance");
        }
    }
}

module.exports = BankTransactionService;
