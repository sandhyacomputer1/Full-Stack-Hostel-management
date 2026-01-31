const express = require("express");
const { body } = require("express-validator");
const { Parser } = require("json2csv");
const Expense = require("../models/expense.model");
const AuditLog = require("../models/auditLog.model");

const {
  uploadConfigs,
  handleUploadError,
  deleteFromCloudinary,
  getFileUrl,
} = require("../middlewares/upload");

const {
  authenticateToken,
  authorizeAdmin,
  authorizeAdminOrManager,
} = require("../middlewares/auth");

const router = express.Router();

/**
 * Route order:
 * 1) summary / reports / audit
 * 2) upload receipts
 * 3) collection routes ("/")
 * 4) param routes ("/:id")
 */

// ================== SUMMARY & REPORTS ==================

// @route   GET /api/expenses/summary
router.get(
  "/summary",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const hostelId = req.user.assignedHostel._id;

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

      const totalResult = await Expense.aggregate([
        { $match: { assignedHostel: hostelId, type: "hostel_expense" } },
        {
          $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } },
        },
      ]);

      const monthResult = await Expense.aggregate([
        {
          $match: {
            assignedHostel: hostelId,
            type: "hostel_expense",
            date: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        {
          $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } },
        },
      ]);

      const totalExpenses = totalResult[0]?.total || 0;
      const totalCount = totalResult[0]?.count || 0;
      const monthTotal = monthResult[0]?.total || 0;
      const monthCount = monthResult[0]?.count || 0;

      const daysInMonth = endOfMonth.getDate();
      const avgDaily = daysInMonth > 0 ? monthTotal / daysInMonth : 0;

      res.json({
        success: true,
        summary: {
          totalExpenses,
          totalCount,
          monthTotal,
          monthCount,
          avgDaily: Math.round(avgDaily),
        },
      });
    } catch (error) {
      console.error("Summary error:", error);
      res.status(500).json({ message: "Failed to get summary" });
    }
  }
);

// @route   GET /api/expenses/reports/daily
router.get(
  "/reports/daily",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const { startDate, endDate, category, format = "json" } = req.query;

      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ message: "startDate and endDate are required" });
      }

      const match = {
        assignedHostel: req.user.assignedHostel._id,
        type: "hostel_expense",
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      };

      if (category) match.category = category;

      const expenses = await Expense.find(match)
        .populate({ path: "recordedBy", select: "name" })
        .populate({ path: "approvedBy", select: "name" })
        .lean();

      if (format === "csv") {
        const rows = expenses.map((e) => ({
          date: e.date ? e.date.toISOString().split("T")[0] : "",
          category: e.category || "",
          amount: e.amount || 0,
          description: e.description || "",
          paymentMode: e.paymentMode || "",
          transactionId: e.transactionId || "",
          vendorName: e.vendor?.name || "",
          status: e.status || "",
          approvedBy: e.approvedBy?.name || "",
          refundAmount: e.refund?.amount || "",
          refundDate: e.refund?.refundDate
            ? new Date(e.refund.refundDate).toISOString().split("T")[0]
            : "",
        }));

        const parser = new Parser({
          fields: [
            "date",
            "category",
            "amount",
            "description",
            "paymentMode",
            "transactionId",
            "vendorName",
            "status",
            "approvedBy",
            "refundAmount",
            "refundDate",
          ],
        });

        const csv = "\uFEFF" + parser.parse(rows); // ✅ UTF-8 BOM for Marathi
        res.header("Content-Type", "text/csv; charset=utf-8");
        res.attachment("expenses_daily_report.csv");
        return res.send(csv);
      }

      res.status(200).json({ success: true, expenses });
    } catch (error) {
      console.error("Daily report error:", error);
      res.status(500).json({ message: "Failed to get daily report" });
    }
  }
);

// @route   GET /api/expenses/reports/monthly
router.get(
  "/reports/monthly",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const { year, month } = req.query;

      if (!year || !month) {
        return res.status(400).json({ message: "year and month are required" });
      }

      const y = Number(year);
      const m = Number(month) - 1;

      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0, 23, 59, 59);

      const match = {
        assignedHostel: req.user.assignedHostel._id,
        type: "hostel_expense",
        date: { $gte: start, $lte: end },
      };

      const summary = await Expense.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$category",
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { totalAmount: -1 } },
      ]);

      res.status(200).json({ success: true, summary });
    } catch (error) {
      console.error("Monthly report error:", error);
      res.status(500).json({ message: "Failed to get monthly report" });
    }
  }
);

// @route   GET /api/expenses/reports/yearly/:year
router.get(
  "/reports/yearly/:year",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const hostelId = req.user.assignedHostel._id;
      const year = Number(req.params.year);

      if (!year || Number.isNaN(year)) {
        return res.status(400).json({ message: "Invalid year" });
      }

      const start = new Date(year, 0, 1);
      const end = new Date(year + 1, 0, 0, 23, 59, 59);

      const match = {
        assignedHostel: hostelId,
        type: "hostel_expense",
        date: { $gte: start, $lte: end },
      };

      const expenses = await Expense.find(match)
        .populate({ path: "recordedBy", select: "name" })
        .lean();

      const months = await Expense.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $month: "$date" },
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const formattedMonths = months.map((m) => ({
        month: m._id,
        totalAmount: m.totalAmount || 0,
        count: m.count || 0,
      }));

      const safeExpenses = expenses.map((e) => ({
        ...e,
        attachments: Array.isArray(e.attachments) ? e.attachments : [],
      }));

      return res.status(200).json({
        success: true,
        year,
        months: formattedMonths,
        expenses: safeExpenses,
      });
    } catch (error) {
      console.error("Yearly report error:", error);
      res.status(500).json({ message: "Failed to get yearly report" });
    }
  }
);

// @route   GET /api/expenses/audit
router.get(
  "/audit",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const hostelId = req.user.assignedHostel._id;

      const logs = await AuditLog.find({
        model: "Expense",
        assignedHostel: hostelId, // ✅ Filter by hostel
      })
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      res.status(200).json({ success: true, logs });
    } catch (error) {
      console.error("Expense audit fetch error:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  }
);

// ================== RECEIPTS UPLOAD ==================

// @route   POST /api/expenses/:id/receipts
router.post(
  "/:id/receipts",
  authenticateToken,
  authorizeAdminOrManager,
  uploadConfigs.expenseReceipts,
  handleUploadError,
  async (req, res) => {
    try {
      const { id } = req.params;

      const expense = await Expense.findById(id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const newAttachments = req.files.map((file) => ({
        filename: file.originalname,
        url: getFileUrl(file),
        type: file.mimetype.startsWith("image") ? "image" : "document",
        publicId: file.filename || file.public_id || null,
        uploadedAt: new Date(),
      }));

      expense.attachments.push(...newAttachments);
      await expense.save();

      res.status(200).json({
        success: true,
        message: "Receipts uploaded successfully",
        attachments: newAttachments,
      });
    } catch (error) {
      console.error("Receipt upload error:", error);
      res.status(500).json({
        message: "Error uploading receipts",
        error: error.message,
      });
    }
  }
);

// ================== COLLECTION ROUTES (NO :id) ==================

// @route   POST /api/expenses
router.post(
  "/",
  authenticateToken,
  authorizeAdminOrManager,
  [
    body("type").isIn(["hostel_expense"]).withMessage("Invalid expense type"),
    body("amount").isNumeric().withMessage("Amount must be a number"),
    body("description").notEmpty().withMessage("Description is required"),
    body("paymentMode")
      .isIn(["cash", "card", "upi", "bank_transfer", "cheque", "online"])
      .withMessage("Invalid payment mode"),
  ],
  async (req, res) => {
    try {
      const data = req.body;

      if (!req.user.assignedHostel) {
        return res.status(400).json({
          message: "User is not assigned to any hostel",
        });
      }

      data.assignedHostel = req.user.assignedHostel._id;
      data.recordedBy = req.user._id;
      data.type = "hostel_expense";

      const validCategories = [
        "food_groceries",
        "maintenance",
        "utilities",
        "salary",
        "rent",
        "equipment",
        "cleaning",
        "security",
        "medical",
        "transportation",
        "office_supplies",
        "marketing",
        "legal",
        "insurance",
        "other",
      ];

      if (!validCategories.includes(data.category)) {
        return res.status(400).json({
          message: `Invalid hostel category: ${data.category}`,
        });
      }

      const expense = await Expense.create(data);

      // ✅ Log with assignedHostel
      await AuditLog.log({
        model: "Expense",
        refId: expense._id,
        action: "create",
        user: req.user?._id,
        assignedHostel: req.user.assignedHostel._id, // ✅ Added
        payload: {
          type: expense.type,
          amount: expense.amount,
          paymentMode: expense.paymentMode,
          category: expense.category,
          description: expense.description,
        },
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.status(201).json({
        success: true,
        expense,
      });
    } catch (error) {
      console.error("Expense Create Error:", error);
      res.status(500).json({
        message: "Failed to add expense",
        error: error.message,
      });
    }
  }
);

// @route   GET /api/expenses
router.get(
  "/",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const {
        search = "",
        category = "",
        paymentMode = "",
        startDate = "",
        endDate = "",
        page = 1,
        limit = 10,
      } = req.query;

      const query = {
        assignedHostel: req.user.assignedHostel._id,
        type: "hostel_expense",
      };

      if (category) query.category = category;
      if (paymentMode) query.paymentMode = paymentMode;

      if (search) {
        query.description = { $regex: search, $options: "i" };
      }

      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;

      const [expenses, total] = await Promise.all([
        Expense.find(query)
          .populate({ path: "recordedBy", select: "name" })
          .sort({ date: -1 })
          .skip(skip)
          .limit(Number(limit)),
        Expense.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        expenses,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
        },
      });
    } catch (error) {
      console.error("GET EXPENSE ERROR:", error);
      res.status(500).json({
        success: false,
        message: "Server Error",
      });
    }
  }
);

// ================== PARAM ROUTES (WITH :id) ==================

// @route   GET /api/expenses/:id
router.get(
  "/:id",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const { id } = req.params;

      const expense = await Expense.findById(id)
        .populate({ path: "recordedBy", select: "name role" })
        .populate({ path: "assignedHostel", select: "name" })
        .lean();

      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      res.status(200).json({
        success: true,
        data: expense,
      });
    } catch (error) {
      console.error("Error fetching expense:", error);
      res.status(500).json({
        message: "Server error while fetching expense",
      });
    }
  }
);

// @route   PUT /api/expenses/:id
router.put(
  "/:id",
  authenticateToken,
  authorizeAdmin,
  uploadConfigs.array("newFiles", 5),
  handleUploadError,
  async (req, res) => {
    try {
      const { id } = req.params;

      const expense = await Expense.findById(id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      const incoming = req.body;

      // Snapshot BEFORE
      const before = {
        amount: expense.amount,
        description: expense.description,
        paymentMode: expense.paymentMode,
        date: expense.date,
        category: expense.category,
        transactionId: expense.transactionId,
      };

      // Apply changes
      expense.amount = incoming.amount || expense.amount;
      expense.description = incoming.description || expense.description;
      expense.paymentMode = incoming.paymentMode || expense.paymentMode;
      expense.transactionId = incoming.transactionId || expense.transactionId;
      expense.date = incoming.date || expense.date;
      expense.remarks = incoming.remarks || expense.remarks;
      expense.category = incoming.category || expense.category;

      if (!expense.vendor) {
        expense.vendor = {};
      }
      if (incoming["vendor.name"]) expense.vendor.name = incoming["vendor.name"];
      if (incoming["vendor.contact"]) expense.vendor.contact = incoming["vendor.contact"];
      if (incoming["vendor.address"]) expense.vendor.address = incoming["vendor.address"];

      if (incoming.billNumber) expense.billNumber = incoming.billNumber;

      // Attachments
      let existingAttachments = [];
      if (incoming.attachments) {
        try {
          existingAttachments = JSON.parse(incoming.attachments);
        } catch (err) {
          console.log("Attachment parse error:", err);
        }
      }

      const oldList = expense.attachments || [];
      const deleted = oldList.filter(
        (oldFile) =>
          !existingAttachments.some((a) => a.publicId === oldFile.publicId)
      );

      for (const file of deleted) {
        if (file.publicId) {
          await deleteFromCloudinary(file.publicId);
        }
      }

      expense.attachments = existingAttachments;

      if (req.files && req.files.length > 0) {
        const newFiles = req.files.map((file) => ({
          filename: file.originalname,
          url: getFileUrl(file),
          type: file.mimetype.startsWith("image") ? "image" : "document",
          publicId: file.filename || file.public_id || null,
          uploadedAt: new Date(),
        }));

        expense.attachments.push(...newFiles);
      }

      await expense.save();

      // Snapshot AFTER
      const after = {
        amount: expense.amount,
        description: expense.description,
        paymentMode: expense.paymentMode,
        date: expense.date,
        category: expense.category,
        transactionId: expense.transactionId,
      };

      // Calculate changes
      const changedFields = {};
      Object.keys(after).forEach((key) => {
        const beforeVal = before[key] ? before[key].toString() : before[key];
        const afterVal = after[key] ? after[key].toString() : after[key];
        if (beforeVal !== afterVal) {
          changedFields[key] = {
            from: before[key],
            to: after[key],
          };
        }
      });

      // ✅ Log with assignedHostel
      await AuditLog.log({
        model: "Expense",
        refId: expense._id,
        action: "update",
        user: req.user?._id,
        assignedHostel: req.user.assignedHostel._id, // ✅ Added
        payload: {
          before,
          after,
          changedFields,
        },
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({
        success: true,
        message: "Expense updated successfully",
        data: expense,
      });
    } catch (error) {
      console.error("Update expense error:", error);
      res.status(500).json({
        message: "Failed to update expense",
        error: error.message,
      });
    }
  }
);

// @route   DELETE /api/expenses/:id
router.delete("/:id", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const hostelId = expense.assignedHostel; // ✅ Store before delete

    await expense.deleteOne();

    // ✅ Log with assignedHostel
    await AuditLog.log({
      model: "Expense",
      refId: expense._id,
      action: "delete",
      user: req.user?._id,
      assignedHostel: hostelId, // ✅ Added
      payload: {
        amount: expense.amount,
        category: expense.category,
        description: expense.description,
        paymentMode: expense.paymentMode,
      },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json({ success: true, message: "Expense deleted" });
  } catch (error) {
    console.error("Delete expense error:", error);
    res.status(500).json({ message: "Failed to delete expense" });
  }
});

module.exports = router;
