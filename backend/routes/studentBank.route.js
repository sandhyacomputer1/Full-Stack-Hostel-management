// server/routes/studentBank.routes.js
const express = require("express");
const mongoose = require("mongoose");
const { body, validationResult } = require("express-validator");
const StudentBankAccount = require("../models/studentBankAccount.model");
const BankTransaction = require("../models/bankTransaction.model");
const Student = require("../models/student.model");
const AuditLog = require("../models/auditLog.model");
const BankTransactionService = require("../services/bankTransaction.service");
const twilioService = require("../services/twilioService");
const {
  authenticateToken,
  authorizeAdminOrManager,
  authorizeAdmin,
} = require("../middlewares/auth");

const router = express.Router();

// ============================================
// ACCOUNT MANAGEMENT ROUTES
// ============================================

/**
 * @route   POST /api/student-bank/create/:studentId
 * @desc    Create bank account for student (Auto-called on admission)
 * @access  Private (Admin/Manager)
 */
router.post(
  "/create/:studentId",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const hostelId = req.user.assignedHostel._id;
      const { studentId } = req.params;

      // Check if student exists
      const student = await Student.findOne({
        _id: studentId,
        assignedHostel: hostelId,
      });

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Check if account already exists
      const existingAccount = await StudentBankAccount.findOne({
        student: studentId,
        assignedHostel: hostelId,
      });

      if (existingAccount) {
        return res.status(400).json({
          message: "Bank account already exists for this student",
          account: existingAccount,
        });
      }

      // Create new account
      const account = await StudentBankAccount.create({
        student: studentId,
        assignedHostel: hostelId,
        balance: 0,
        status: "active",
        lastUpdatedBy: req.user._id,
      });

      await account.populate("student", "name studentId class batch");

      console.log(`✅ Bank account created for student: ${student.name}`);

      res.status(201).json({
        success: true,
        message: "Bank account created successfully",
        account,
      });
    } catch (error) {
      console.error("Create bank account error:", error);
      res.status(500).json({
        message: "Failed to create bank account",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/student-bank/account/:studentId
 * @desc    Get bank account details
 * @access  Private
 */
router.get(
  "/account/:studentId",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const hostelId = req.user.assignedHostel._id;

      const account = await StudentBankAccount.getByStudent(
        req.params.studentId,
        hostelId
      );

      if (!account) {
        return res.status(404).json({ message: "Bank account not found" });
      }

      // Check permissions - students can only view their own
      if (
        req.user.role === "student" &&
        account.student._id.toString() !== req.user.student?.toString()
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json({
        success: true,
        account,
      });
    } catch (error) {
      console.error("Get account error:", error);
      res.status(500).json({
        message: "Failed to fetch account",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/student-bank/accounts
 * @desc    Get all bank accounts (hostel-scoped)
 * @access  Private (Admin/Manager)
 */
router.get(
  "/accounts",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const hostelId = req.user.assignedHostel._id;
      const { status, page = 1, limit = 50 } = req.query;

      const filters = {};
      if (status) filters.status = status;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const query = { assignedHostel: hostelId, ...filters };

      const total = await StudentBankAccount.countDocuments(query);
      const accounts = await StudentBankAccount.find(query)
        .populate("student", "name studentId class batch")
        .sort({ balance: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Calculate total hostel liability
      const totalLiability = accounts.reduce(
        (sum, acc) => sum + acc.balance,
        0
      );

      res.json({
        success: true,
        accounts,
        totalLiability,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          current: parseInt(page),
          limit: parseInt(limit),
        },
      });
    } catch (error) {
      console.error("Get accounts error:", error);
      res.status(500).json({
        message: "Failed to fetch accounts",
        error: error.message,
      });
    }
  }
);

/**
 * @route   PUT /api/student-bank/freeze/:studentId
 * @desc    Freeze/Unfreeze account
 * @access  Private (Admin/Manager)
 */
router.put(
  "/freeze/:studentId",
  authenticateToken,
  authorizeAdmin,
  authorizeAdminOrManager,
  [body("freeze").isBoolean().withMessage("freeze must be boolean")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const hostelId = req.user.assignedHostel._id;
      const { freeze } = req.body;
      const { reason } = req.body;

      const account = await StudentBankAccount.findOneAndUpdate(
        {
          student: req.params.studentId,
          assignedHostel: hostelId,
        },
        {
          status: freeze ? "frozen" : "active",
          freezeReason: freeze ? reason : null,
          lastUpdatedBy: req.user._id,
        },
        { new: true }
      ).populate("student", "name studentId");

      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      console.log(
        `✅ Account ${freeze ? "frozen" : "unfrozen"}: ${account.student.name}`
      );

      // Send SMS notification to parent
      try {
        const student = await Student.findById(req.params.studentId).select(
          "name father.phone mother.phone"
        );

        if (student) {
          const parentPhone = student.father?.phone || student.mother?.phone;

          if (parentPhone) {
            if (freeze) {
              // Send freeze notification
              await twilioService.sendBankFreezeNotification({
                phone: parentPhone,
                studentName: student.name,
                reason: reason || "Administrative action",
                currentBalance: account.balance,
                studentId: req.params.studentId,
                hostelId,
              });
              console.log(`✅ Freeze SMS sent to parent: ${parentPhone}`);
            } else {
              // Send unfreeze notification
              await twilioService.sendBankUnfreezeNotification({
                phone: parentPhone,
                studentName: student.name,
                currentBalance: account.balance,
                studentId: req.params.studentId,
                hostelId,
              });
              console.log(`✅ Unfreeze SMS sent to parent: ${parentPhone}`);
            }
          }
        }
      } catch (smsError) {
        // Don't fail operation if SMS fails
        console.error("⚠️ SMS notification failed:", smsError.message);
      }

      res.json({
        success: true,
        message: `Account ${freeze ? "frozen" : "unfrozen"} successfully`,
        account,
      });
    } catch (error) {
      console.error("Freeze account error:", error);
      res.status(500).json({
        message: "Failed to update account status",
        error: error.message,
      });
    }
  }
);

// ============================================
// TRANSACTION ROUTES
// ============================================

/**
 * @route   POST /api/student-bank/deposit
 * @desc    Deposit money to student account
 * @access  Private (Admin/Manager)
 */
router.post(
  "/deposit",
  authenticateToken,
  authorizeAdminOrManager,
  [
    body("studentId").notEmpty().withMessage("Student ID is required"),
    body("amount")
      .isFloat({ min: 0.01 })
      .withMessage("Amount must be greater than 0"),
    body("category")
      .optional()
      .isIn(["cash_deposit", "online_deposit", "deposit"])
      .withMessage("Invalid category"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const hostelId = req.user.assignedHostel._id;
      const { studentId, amount, category, remarks, referenceId } = req.body;

      // Verify student
      const student = await Student.findOne({
        _id: studentId,
        assignedHostel: hostelId,
      });

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Process deposit
      const result = await BankTransactionService.creditAccount({
        studentId,
        hostelId,
        amount: parseFloat(amount),
        category: category || "deposit",
        remarks: remarks || "Cash deposit",
        referenceId,
        performedBy: req.user._id,
      });

      console.log(`✅ Deposit: ₹${amount} to ${student.name}`);

      res.status(201).json({
        success: true,
        message: "Deposit successful",
        transaction: result.transaction,
        newBalance: result.newBalance,
      });
    } catch (error) {
      console.error("Deposit error:", error);
      res.status(500).json({
        message: error.message || "Failed to process deposit",
      });
    }
  }
);

/**
 * @route   POST /api/student-bank/debit
 * @desc    Debit money from student account
 * @access  Private (Admin/Manager/Staff)
 */
router.post(
  "/debit",
  authenticateToken,
  [
    body("studentId").notEmpty().withMessage("Student ID is required"),
    body("amount")
      .isFloat({ min: 0.01 })
      .withMessage("Amount must be greater than 0"),
    body("category")
      .isIn(["canteen", "fine", "hostel_fee", "laundry", "stationery", "other"])
      .withMessage("Invalid category"),
    body("remarks").notEmpty().withMessage("Remarks are required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const hostelId = req.user.assignedHostel._id;
      const { studentId, amount, category, remarks, referenceId } = req.body;

      // Verify student
      const student = await Student.findOne({
        _id: studentId,
        assignedHostel: hostelId,
      });

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Process debit
      const result = await BankTransactionService.debitAccount({
        studentId,
        hostelId,
        amount: parseFloat(amount),
        category,
        remarks,
        referenceId,
        performedBy: req.user._id,
      });

      console.log(`✅ Debit: ₹${amount} from ${student.name} - ${category}`);

      res.status(201).json({
        success: true,
        message: "Debit successful",
        transaction: result.transaction,
        newBalance: result.newBalance,
      });
    } catch (error) {
      console.error("Debit error:", error);
      res.status(500).json({
        message: error.message || "Failed to process debit",
      });
    }
  }
);

/**
 * @route   POST /api/student-bank/reverse/:transactionId
 * @desc    Reverse a transaction
 * @access  Private (Admin only)
 */
router.post(
  "/reverse/:transactionId",
  authenticateToken,
  authorizeAdmin,
  [body("reason").notEmpty().withMessage("Reason is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const hostelId = req.user.assignedHostel._id;
      const { reason } = req.body;

      const result = await BankTransactionService.reverseTransaction({
        transactionId: req.params.transactionId,
        hostelId,
        reason,
        performedBy: req.user._id,
      });

      console.log(`✅ Transaction reversed: ${req.params.transactionId}`);

      res.json({
        success: true,
        message: "Transaction reversed successfully",
        reversalTransaction: result.reversalTransaction,
        originalTransaction: result.originalTransaction,
      });
    } catch (error) {
      console.error("Reverse transaction error:", error);
      res.status(500).json({
        message: error.message || "Failed to reverse transaction",
      });
    }
  }
);

/**
 * @route   GET /api/student-bank/transactions/:studentId
 * @desc    Get transaction history for a student
 * @access  Private
 */
router.get("/transactions/:studentId", authenticateToken, async (req, res) => {
  try {
    const hostelId = req.user.assignedHostel._id;
    const {
      page = 1,
      limit = 50,
      type,
      category,
      startDate,
      endDate,
    } = req.query;

    // Build filters
    const filters = {};
    if (type) filters.type = type;
    if (category) filters.category = category;
    if (startDate || endDate) {
      filters.performedAt = {};
      if (startDate) filters.performedAt.$gte = new Date(startDate);
      if (endDate) filters.performedAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = {
      student: req.params.studentId,
      assignedHostel: hostelId,
      ...filters,
    };

    const total = await BankTransaction.countDocuments(query);
    const transactions = await BankTransaction.find(query)
      .populate("performedBy", "name email role")
      .sort({ performedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      transactions,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        current: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({
      message: "Failed to fetch transactions",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/student-bank/balance/:studentId
 * @desc    Get current balance
 * @access  Private
 */
router.get("/balance/:studentId", authenticateToken, async (req, res) => {
  try {
    const hostelId = req.user.assignedHostel._id;

    const account = await StudentBankAccount.findOne({
      student: req.params.studentId,
      assignedHostel: hostelId,
    }).populate("student", "name studentId");

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    res.json({
      success: true,
      balance: account.balance,
      status: account.status,
      student: account.student,
      lastTransactionAt: account.lastTransactionAt,
    });
  } catch (error) {
    console.error("Get balance error:", error);
    res.status(500).json({
      message: "Failed to fetch balance",
      error: error.message,
    });
  }
});

// ============================================
// REPORTS & RECONCILIATION
// ============================================

/**
 * @route   GET /api/student-bank/reports/daily
 * @desc    Get daily transaction summary
 * @access  Private (Admin/Manager)
 */
router.get(
  "/reports/daily",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const hostelId = req.user.assignedHostel._id;
      const { date = new Date().toISOString().split("T")[0] } = req.query;

      const summary = await BankTransaction.getDailySummary(
        hostelId,
        new Date(date)
      );

      const credits = summary.find((s) => s._id === "credit")?.total || 0;
      const debits = summary.find((s) => s._id === "debit")?.total || 0;
      const creditCount = summary.find((s) => s._id === "credit")?.count || 0;
      const debitCount = summary.find((s) => s._id === "debit")?.count || 0;

      res.json({
        success: true,
        date,
        summary: {
          totalCredits: credits,
          totalDebits: debits,
          netFlow: credits - debits,
          creditTransactions: creditCount,
          debitTransactions: debitCount,
          totalTransactions: creditCount + debitCount,
        },
      });
    } catch (error) {
      console.error("Daily report error:", error);
      res.status(500).json({
        message: "Failed to generate report",
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/student-bank/reconcile/:studentId
 * @desc    Reconcile account balance
 * @access  Private (Admin)
 */
router.post(
  "/reconcile/:studentId",
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      const hostelId = req.user.assignedHostel._id;

      const account = await StudentBankAccount.findOne({
        student: req.params.studentId,
        assignedHostel: hostelId,
      });

      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      const reconciliation = await BankTransactionService.reconcileBalance(
        account._id
      );

      console.log(
        `✅ Reconciliation: ${reconciliation.isMatching ? "PASS" : "FAIL"}`
      );

      res.json({
        success: true,
        reconciliation,
      });
    } catch (error) {
      console.error("Reconciliation error:", error);
      res.status(500).json({
        message: "Failed to reconcile balance",
        error: error.message,
      });
    }
  }
);

// ============================================
// AUDIT LOG ROUTES
// ============================================

/**
 * @route   GET /api/student-bank/audit-logs
 * @desc    Get student bank audit logs with filters
 * @access  Private (Admin/Manager)
 */
router.get(
  "/audit-logs",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const hostelId = req.user.assignedHostel._id;
      const {
        page = 1,
        limit = 50,
        action,
        studentId,
        startDate,
        endDate,
      } = req.query;

      // Build filters for bank-related logs only
      const filters = {
        assignedHostel: hostelId,
        model: "StudentBankAccount", // Only bank account logs
      };

      if (action) filters.action = action;

      // Filter by student (search in payload)
      if (studentId) {
        filters["payload.studentId"] = studentId;
      }

      // Date range filter
      if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) {
          filters.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          filters.createdAt.$lte = end;
        }
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const total = await AuditLog.countDocuments(filters);

      const logs = await AuditLog.find(filters)
        .populate("user", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      res.json({
        success: true,
        logs,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          current: parseInt(page),
          limit: parseInt(limit),
        },
      });
    } catch (error) {
      console.error("Get audit logs error:", error);
      res.status(500).json({
        message: "Failed to fetch audit logs",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/student-bank/audit-logs/student/:studentId
 * @desc    Get audit logs for specific student
 * @access  Private (Admin/Manager)
 */
router.get(
  "/audit-logs/student/:studentId",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const hostelId = req.user.assignedHostel._id;
      const { studentId } = req.params;
      const { limit = 100 } = req.query;

      const logs = await AuditLog.find({
        assignedHostel: hostelId,
        model: "StudentBankAccount",
        "payload.studentId": studentId,
      })
        .populate("user", "name email role")
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

      res.json({
        success: true,
        logs,
        total: logs.length,
      });
    } catch (error) {
      console.error("Get student audit logs error:", error);
      res.status(500).json({
        message: "Failed to fetch student audit logs",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/student-bank/audit-logs/summary
 * @desc    Get audit summary (daily/monthly)
 * @access  Private (Admin/Manager)
 */
router.get(
  "/audit-logs/summary",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const hostelId = req.user.assignedHostel._id;
      const { date, period = "daily" } = req.query;

      let startDate, endDate;

      if (period === "daily") {
        startDate = new Date(date || new Date());
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
      } else if (period === "monthly") {
        const targetDate = new Date(date || new Date());
        startDate = new Date(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          1
        );
        endDate = new Date(
          targetDate.getFullYear(),
          targetDate.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
      }

      const matchQuery = {
        assignedHostel: new mongoose.Types.ObjectId(hostelId),
        model: "StudentBankAccount",
        createdAt: { $gte: startDate, $lte: endDate },
      };

      // Action summary
      const actionSummary = await AuditLog.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: "$action",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      // User activity
      const userActivity = await AuditLog.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: "$user",
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            userName: { $ifNull: ["$user.name", "System"] },
            userEmail: "$user.email",
            count: 1,
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      const total = actionSummary.reduce((sum, item) => sum + item.count, 0);

      res.json({
        success: true,
        period,
        startDate,
        endDate,
        totalActions: total,
        actionSummary,
        userActivity,
      });
    } catch (error) {
      console.error("Get audit summary error:", error);
      res.status(500).json({
        message: "Failed to fetch audit summary",
        error: error.message,
      });
    }
  }
);

module.exports = router;
