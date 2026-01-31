const express = require("express");
const { body, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const Fee = require("../models/Fees.model");
const AuditLog = require("../models/auditLog.model");
const Student = require("../models/Student.model");
const twilioService = require("../services/twilioService");

const {
  authenticateToken,
  authorizeAdminOrManager,
} = require("../middlewares/auth");

const router = express.Router();

// @route   POST /api/fees/recordPayment
// @desc    Record installment payment + Update Student feeStructure
// @access  Private (Admin/Manager)
router.post(
  "/recordPayment",
  authenticateToken,
  authorizeAdminOrManager,
  [
    body("studentId").notEmpty().withMessage("Student ID is required"),
    body("installmentNumber")
      .isInt({ min: 1 })
      .withMessage("Valid installment number required"),
    body("paidAmount")
      .isFloat({ min: 0 })
      .withMessage("Paid amount must be positive"),
    body("paymentMode")
      .isIn(["cash", "cheque", "upi", "card", "online", "bank_transfer"])
      .withMessage("Invalid payment mode"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const {
        studentId,
        installmentNumber,
        installmentAmount,
        installmentType,
        paidAmount,
        paymentMode,
        paymentDate,
        overdueCharges,
        otherCharges,
        remarks,
      } = req.body;

      const assignedHostel = req.user.assignedHostel._id;

      const student = await Student.findOne({
        _id: studentId,
        assignedHostel,
        status: "active",
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found in your hostel",
        });
      }

      const existingPayment = await Fee.findOne({
        student: studentId,
        installmentNumber,
        status: "paid",
        assignedHostel,
      });

      if (existingPayment) {
        return res.status(409).json({
          success: false,
          message: `Installment ${installmentNumber} has already been paid for this student (Receipt: ${existingPayment.receiptNumber})`,
          existingPayment: {
            receiptNumber: existingPayment.receiptNumber,
            paidAmount: existingPayment.paidAmount,
            paymentDate: existingPayment.paymentDate,
            installmentNumber: existingPayment.installmentNumber,
          },
        });
      }

      const instIndex = student.feeStructure.installmentBreakdown.findIndex(
        (inst) => inst.installmentNumber === installmentNumber
      );

      if (instIndex !== -1) {
        const inst = student.feeStructure.installmentBreakdown[instIndex];

        if (inst.status === "paid") {
          return res.status(409).json({
            success: false,
            message: `Installment ${installmentNumber} is already marked as paid in student record`,
            paidDate: inst.paidDate,
          });
        }
      }

      const feeRecord = new Fee({
        student: studentId,
        installmentNumber,
        installmentAmount,
        installmentType,
        paidAmount,
        paymentMode,
        paymentDate: paymentDate || new Date(),
        overdueCharges: overdueCharges
          ? {
            title: overdueCharges.title || "Overdue Charges",
            amount: overdueCharges.amount || 0,
          }
          : undefined,
        otherCharges: otherCharges || [],
        remarks,
        status: "paid",
        collectedBy: req.user._id,
        assignedHostel,
      });

      await feeRecord.save();

      if (instIndex !== -1) {
        const inst = student.feeStructure.installmentBreakdown[instIndex];

        inst.status = "paid";
        inst.paidAmount = paidAmount;
        inst.paidDate = paymentDate || new Date();

        student.feeStructure.paidFees =
          Number(student.feeStructure.paidFees || 0) + Number(paidAmount);

        student.feeStructure.pendingFees =
          Number(student.feeStructure.pendingFees || 0) - Number(paidAmount);

        if (student.feeStructure.pendingFees < 0) {
          student.feeStructure.pendingFees = 0;
        }
      }

      await student.save();

      await feeRecord.populate([
        {
          path: "student",
          select: "name studentId class batch feeStructure status assignedHostel father.phone mother.phone",
        },
        { path: "collectedBy", select: "name email" },
        { path: "assignedHostel", select: "name" },
      ]);

      // Send SMS notification to parent
      try {
        const parentPhone = student.father?.phone || student.mother?.phone;

        if (parentPhone) {
          await twilioService.sendFeePaymentConfirmation(
            parentPhone,
            student.name,
            paidAmount,
            feeRecord.receiptNumber,
            studentId,
            feeRecord._id,
            assignedHostel,
            installmentNumber,
            paymentMode
          );
          console.log(`✅ Payment confirmation SMS sent to parent: ${parentPhone}`);
        }
      } catch (smsError) {
        // Don't fail payment if SMS fails
        console.error("⚠️ SMS notification failed:", smsError.message);
      }

      return res.status(201).json({
        success: true,
        message: "Payment recorded & student updated successfully",
        data: feeRecord,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to record payment",
        error: error.message,
      });
    }
  }
);

// @route   GET /api/fees/data
// @desc    Get students with fees data
// @access  Private (Admin/Manager)
router.get(
  "/data",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const hostel = req.user.assignedHostel._id;
      const now = new Date();
      const cm = now.getMonth() + 1;
      const cy = now.getFullYear();
      const nm = cm === 12 ? 1 : cm + 1;
      const nmy = nm === 1 ? cy + 1 : cy;

      const result = await Student.aggregate([
        {
          $match: {
            status: "active",
            assignedHostel: new mongoose.Types.ObjectId(hostel),
          },
        },
        { $unwind: "$feeStructure.installmentBreakdown" },
        {
          $addFields: {
            inst: "$feeStructure.installmentBreakdown",
            dueDate: {
              $cond: [
                {
                  $and: [
                    {
                      $ne: [
                        "$feeStructure.installmentBreakdown.dueDate",
                        null,
                      ],
                    },
                    {
                      $ne: [
                        "$feeStructure.installmentBreakdown.dueDate",
                        "",
                      ],
                    },
                    {
                      $ne: [
                        "$feeStructure.installmentBreakdown.dueDate",
                        "\u0000",
                      ],
                    },
                  ],
                },
                { $toDate: "$feeStructure.installmentBreakdown.dueDate" },
                null,
              ],
            },
          },
        },
        {
          $addFields: {
            month: {
              $cond: [
                { $ne: ["$dueDate", null] },
                { $month: "$dueDate" },
                null,
              ],
            },
            year: {
              $cond: [
                { $ne: ["$dueDate", null] },
                { $year: "$dueDate" },
                null,
              ],
            },
            isOverdue: {
              $and: [
                { $ne: ["$dueDate", null] },
                { $lt: ["$dueDate", now] },
                { $eq: ["$inst.status", "pending"] },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            thisMonthDueAmount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$inst.status", "pending"] },
                      { $eq: ["$month", cm] },
                      { $eq: ["$year", cy] },
                    ],
                  },
                  "$inst.amount",
                  0,
                ],
              },
            },
            thisMonthPaidAmount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$inst.status", "paid"] },
                      { $eq: ["$month", cm] },
                      { $eq: ["$year", cy] },
                    ],
                  },
                  "$inst.amount",
                  0,
                ],
              },
            },
            nextMonthDueAmount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$inst.status", "pending"] },
                      { $eq: ["$month", nm] },
                      { $eq: ["$year", nmy] },
                    ],
                  },
                  "$inst.amount",
                  0,
                ],
              },
            },
            totalOverdueAmount: {
              $sum: {
                $cond: [{ $eq: ["$isOverdue", true] }, "$inst.amount", 0],
              },
            },
          },
        },
      ]);

      res.json(
        result[0] || {
          thisMonthDueAmount: 0,
          thisMonthPaidAmount: 0,
          nextMonthDueAmount: 0,
          totalOverdueAmount: 0,
        }
      );
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error fetching fees data", error: error.message });
    }
  }
);

// @router GET /api/fees/due
// @desc Get Students with due fees (this month)
// @access Private (Admin/Manager)
router.get(
  "/due",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const { search, class: studentClass, batch } = req.query;
      const assignedHostel = req.user.assignedHostel._id;

      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const matchStage = {
        status: "active",
        assignedHostel,
      };

      if (studentClass) matchStage.class = studentClass;
      if (batch) matchStage.batch = batch;
      if (search) {
        matchStage.$or = [
          { name: { $regex: search, $options: "i" } },
          { studentId: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { rollNumber: { $regex: search, $options: "i" } },
        ];
      }

      const pipeline = [
        { $match: matchStage },
        { $unwind: "$feeStructure.installmentBreakdown" },
        {
          $addFields: {
            dueDate: {
              $cond: [
                {
                  $and: [
                    {
                      $ne: [
                        "$feeStructure.installmentBreakdown.dueDate",
                        null,
                      ],
                    },
                    {
                      $ne: [
                        "$feeStructure.installmentBreakdown.dueDate",
                        "",
                      ],
                    },
                  ],
                },
                { $toDate: "$feeStructure.installmentBreakdown.dueDate" },
                null,
              ],
            },
            installmentStatus: "$feeStructure.installmentBreakdown.status",
            installmentNumber:
              "$feeStructure.installmentBreakdown.installmentNumber",
            installmentAmount: "$feeStructure.installmentBreakdown.amount",
          },
        },
        {
          $match: {
            installmentStatus: { $in: ["pending", "overdue"] },
            dueDate: { $ne: null },
          },
        },
        {
          $match: {
            $expr: {
              $and: [
                { $eq: [{ $month: "$dueDate" }, currentMonth] },
                { $eq: [{ $year: "$dueDate" }, currentYear] },
              ],
            },
          },
        },
        {
          $addFields: {
            daysOverdue: {
              $cond: [
                { $gt: [currentDate, "$dueDate"] },
                {
                  $floor: {
                    $divide: [
                      { $subtract: [currentDate, "$dueDate"] },
                      1000 * 60 * 60 * 24,
                    ],
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $project: {
            studentObjectId: "$_id",
            studentId: 1,
            name: 1,
            class: 1,
            batch: 1,
            fatherName: "$father.name",
            fatherPhone: "$father.phone",
            installment: {
              installmentNumber: "$installmentNumber",
              amount: "$installmentAmount",
              dueDate: "$dueDate",
              status: "$installmentStatus",
              daysOverdue: "$daysOverdue",
            },
          },
        },
        { $sort: { "installment.dueDate": 1 } },
      ];

      const data = await Student.aggregate(pipeline);
      return res.json({ thisMonthDues: data });
    } catch (error) {
      return res.status(500).json({
        message: "Error fetching current month dues",
        error: error.message,
      });
    }
  }
);

// @router GET /api/fees/next-month-due
// @desc get Students with next month due
// @access Private (Admin/Manager)
router.get(
  "/next-month-due",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const { search, class: studentClass, batch } = req.query;
      const assignedHostel = req.user.assignedHostel._id;

      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      const nextMonth = (currentMonth + 1) % 12;
      const nextMonthYear = nextMonth === 0 ? currentYear + 1 : currentYear;

      const matchStage = {
        status: "active",
        assignedHostel,
      };

      if (studentClass) matchStage.class = studentClass;
      if (batch) matchStage.batch = batch;
      if (search) {
        matchStage.$or = [
          { name: { $regex: search, $options: "i" } },
          { studentId: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { rollNumber: { $regex: search, $options: "i" } },
        ];
      }

      const pipeline = [
        { $match: matchStage },
        { $unwind: "$feeStructure.installmentBreakdown" },
        {
          $addFields: {
            dueDate: {
              $convert: {
                input: "$feeStructure.installmentBreakdown.dueDate",
                to: "date",
                onError: null,
                onNull: null,
              },
            },
            status: "$feeStructure.installmentBreakdown.status",
          },
        },
        {
          $addFields: {
            daysOverdue: {
              $cond: [
                {
                  $and: ["$dueDate", { $lt: ["$dueDate", currentDate] }],
                },
                {
                  $floor: {
                    $divide: [
                      { $subtract: [currentDate, "$dueDate"] },
                      1000 * 60 * 60 * 24,
                    ],
                  },
                },
                0,
              ],
            },
          },
        },
        { $match: { status: "pending" } },
        {
          $match: {
            $expr: {
              $and: [
                { $eq: [{ $month: "$dueDate" }, nextMonth + 1] },
                { $eq: [{ $year: "$dueDate" }, nextMonthYear] },
              ],
            },
          },
        },
        {
          $project: {
            studentObjectId: "$_id",
            studentId: 1,
            name: 1,
            class: 1,
            batch: 1,
            fatherName: "$father.name",
            fatherPhone: "$father.phone",
            installment: {
              installmentNumber:
                "$feeStructure.installmentBreakdown.installmentNumber",
              amount: "$feeStructure.installmentBreakdown.amount",
              dueDate: "$dueDate",
              status: "$status",
              daysOverdue: "$daysOverdue",
            },
          },
        },
      ];

      const data = await Student.aggregate(pipeline);
      res.json({ nextMonthDues: data });
    } catch (error) {
      res.status(500).json({
        message: "Error fetching next month dues",
        error: error.message,
      });
    }
  }
);

// @router   GET /api/fees/all-due
// @desc     Get ALL pending dues for all students
// @access   Private (Admin/Manager)
router.get(
  "/all-due",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const { search, class: studentClass, batch } = req.query;
      const assignedHostel = req.user.assignedHostel._id;

      const currentDate = new Date();

      const matchStage = {
        status: "active",
        assignedHostel,
      };

      if (studentClass) matchStage.class = studentClass;
      if (batch) matchStage.batch = batch;

      if (search) {
        matchStage.$or = [
          { name: { $regex: search, $options: "i" } },
          { studentId: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { rollNumber: { $regex: search, $options: "i" } },
        ];
      }

      const pipeline = [
        { $match: matchStage },
        { $unwind: "$feeStructure.installmentBreakdown" },
        {
          $addFields: {
            dueDate: {
              $cond: [
                {
                  $and: [
                    {
                      $ne: [
                        "$feeStructure.installmentBreakdown.dueDate",
                        "",
                      ],
                    },
                    {
                      $ne: [
                        "$feeStructure.installmentBreakdown.dueDate",
                        null,
                      ],
                    },
                  ],
                },
                { $toDate: "$feeStructure.installmentBreakdown.dueDate" },
                null,
              ],
            },
            status: "$feeStructure.installmentBreakdown.status",
          },
        },
        {
          $addFields: {
            daysOverdue: {
              $cond: [
                { $and: ["$dueDate", { $lt: ["$dueDate", currentDate] }] },
                {
                  $floor: {
                    $divide: [
                      { $subtract: [currentDate, "$dueDate"] },
                      1000 * 60 * 60 * 24,
                    ],
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $match: {
            status: { $in: ["pending", "overdue"] },
          },
        },
        {
          $project: {
            studentObjectId: "$_id",
            studentId: 1,
            name: 1,
            class: 1,
            batch: 1,
            fatherName: "$father.name",
            fatherPhone: "$father.phone",
            installment: {
              installmentNumber:
                "$feeStructure.installmentBreakdown.installmentNumber",
              amount: "$feeStructure.installmentBreakdown.amount",
              dueDate: "$dueDate",
              status: "$status",
              daysOverdue: "$daysOverdue",
            },
          },
        },
      ];

      const data = await Student.aggregate(pipeline);

      res.status(200).json({ allPendingDues: data });
    } catch (error) {
      res.status(500).json({
        message: "Error fetching pending dues",
        error: error.message,
      });
    }
  }
);

// @route   GET /api/fees/overdue
// @desc    Get Students with overdue fees
// @access  Private (Admin/Manager)
router.get(
  "/overdue",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const { search, class: studentClass, batch } = req.query;
      const assignedHostel = req.user.assignedHostel._id;

      const currentDate = new Date();

      const matchStage = {
        status: "active",
        assignedHostel,
      };

      if (studentClass) matchStage.class = studentClass;
      if (batch) matchStage.batch = batch;

      if (search) {
        matchStage.$or = [
          { name: { $regex: search, $options: "i" } },
          { studentId: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { rollNumber: { $regex: search, $options: "i" } },
        ];
      }

      const pipeline = [
        { $match: matchStage },
        { $unwind: "$feeStructure.installmentBreakdown" },
        {
          $addFields: {
            dueDate: {
              $convert: {
                input: "$feeStructure.installmentBreakdown.dueDate",
                to: "date",
                onError: null,
                onNull: null,
              },
            },
            status: "$feeStructure.installmentBreakdown.status",
          },
        },
        {
          $addFields: {
            daysOverdue: {
              $cond: [
                { $and: ["$dueDate", { $lt: ["$dueDate", currentDate] }] },
                {
                  $floor: {
                    $divide: [
                      { $subtract: [currentDate, "$dueDate"] },
                      1000 * 60 * 60 * 24,
                    ],
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $match: {
            status: "overdue",
            dueDate: { $lt: currentDate },
          },
        },
        {
          $project: {
            studentObjectId: "$_id",
            studentId: 1,
            name: 1,
            class: 1,
            batch: 1,
            fatherName: "$father.name",
            fatherPhone: "$father.phone",
            installment: {
              installmentNumber:
                "$feeStructure.installmentBreakdown.installmentNumber",
              amount: "$feeStructure.installmentBreakdown.amount",
              dueDate: "$dueDate",
              status: "$status",
              daysOverdue: "$daysOverdue",
            },
          },
        },
      ];

      const overduePaymentData = await Student.aggregate(pipeline);

      res.status(200).json({ overduePaymentData });
    } catch (error) {
      res.status(500).json({
        message: "Error fetching overdue fees",
        error: error.message,
      });
    }
  }
);

// @route   GET /api/fees/paid
// @desc    Get Paid Fees with Student Details for Current Month
// @access  Private (Admin/Manager)
router.get(
  "/paid",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const { search, class: studentClass, batch } = req.query;
      const assignedHostel = req.user.assignedHostel._id;

      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const matchStage = {
        assignedHostel,
        status: "paid",
        $expr: {
          $and: [
            { $eq: [{ $month: "$paymentDate" }, currentMonth] },
            { $eq: [{ $year: "$paymentDate" }, currentYear] },
          ],
        },
      };

      const pipeline = [
        { $match: matchStage },
        {
          $lookup: {
            from: "students",
            localField: "student",
            foreignField: "_id",
            as: "student",
          },
        },
        { $unwind: "$student" },
        {
          $match: {
            ...(studentClass && { "student.class": studentClass }),
            ...(batch && { "student.batch": batch }),
            ...(search && {
              $or: [
                { "student.name": { $regex: search, $options: "i" } },
                { "student.studentId": { $regex: search, $options: "i" } },
                { "student.email": { $regex: search, $options: "i" } },
                { "student.rollNumber": { $regex: search, $options: "i" } },
              ],
            }),
          },
        },
        {
          $project: {
            _id: 1,
            receiptNumber: 1,
            installmentNumber: 1,
            paidAmount: 1,
            paymentDate: 1,
            paymentMode: 1,
            overdueCharges: 1,
            otherCharges: 1,
            remarks: 1,
            status: 1,
            studentObjectId: "$student._id",
            studentId: "$student.studentId",
            name: "$student.name",
            class: "$student.class",
            batch: "$student.batch",
            fatherName: "$student.father.name",
            fatherPhone: "$student.father.phone",
          },
        },
        { $sort: { paymentDate: -1 } },
      ];

      const paidPaymentData = await Fee.aggregate(pipeline);

      return res.json({ paidPaymentData });
    } catch (error) {
      return res.status(500).json({
        message: "Error fetching paid fees data",
        error: error.message,
      });
    }
  }
);

// @route   GET /api/fees/all-paid
// @desc    Get all students who have paid fees
// @access  Private (Admin/Manager)
router.get(
  "/all-paid",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const {
        search = "",
        class: classFilter = "",
        batch = "",
        page = 1,
        limit = 10,
      } = req.query;

      const query = {
        status: "paid",
        assignedHostel: req.user.assignedHostel._id,
      };

      const skip = (page - 1) * limit;

      const pipeline = [
        {
          $lookup: {
            from: "students",
            localField: "student",
            foreignField: "_id",
            as: "studentDetails",
          },
        },
        { $unwind: "$studentDetails" },
        {
          $match: {
            ...query,
            ...(classFilter && { "studentDetails.class": classFilter }),
            ...(batch && { "studentDetails.batch": batch }),
            ...(search.trim() !== "" && {
              $or: [
                {
                  "studentDetails.name": {
                    $regex: search,
                    $options: "i",
                  },
                },
                {
                  "studentDetails.rollNumber": {
                    $regex: search,
                    $options: "i",
                  },
                },
              ],
            }),
          },
        },
        {
          $project: {
            _id: 1,
            receiptNumber: 1,
            installmentNumber: 1,
            paidAmount: 1,
            paymentDate: 1,
            paymentMode: 1,
            overdueCharges: 1,
            otherCharges: 1,
            remarks: 1,
            status: 1,
            student: {
              _id: "$studentDetails._id",
              studentId: "$studentDetails.studentId",
              name: "$studentDetails.name",
              class: "$studentDetails.class",
              batch: "$studentDetails.batch",
              fatherName: "$studentDetails.father.name",
              fatherPhone: "$studentDetails.father.phone",
            },
          },
        },
        { $sort: { paymentDate: -1 } },
        { $skip: parseInt(skip) },
        { $limit: parseInt(limit) },
      ];

      const result = await Fee.aggregate(pipeline);
      const totalCount = await Fee.countDocuments(query);

      res.status(200).json({
        success: true,
        totalCount,
        currentPage: Number(page),
        totalPages: Math.ceil(totalCount / limit),
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching paid fees",
        error: error.message,
      });
    }
  }
);

// @route   GET /api/fees/:id/receipt
// @desc    Generate fee receipt
// @access  Private (Admin/Manager)
router.get(
  "/:id/receipt",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const fee = await Fee.findById(req.params.id)
        .populate("student", "name class batch studentId address father status assignedHostel")
        .populate("assignedHostel", "name hostelOwner address")
        .populate("collectedBy", "name");

      if (!fee) {
        return res.status(404).json({ message: "Fee record not found" });
      }

      if (
        !fee.assignedHostel ||
        fee.assignedHostel._id.toString() !==
        req.user.assignedHostel._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      fee.receiptGenerated = true;
      await fee.save();

      res.json({
        receipt: {
          success: true,
          message: "Payment recorded successfully",
          feeRecord: fee,
        },
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to generate receipt", error: error.message });
    }
  }
);

// @route   GET /api/fees/:id
// @desc    Get single payment details
// @access  Private (Admin/Manager)
router.get(
  "/:id",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const fee = await Fee.findById(req.params.id)
        .populate("student", "name class batch studentId address father status assignedHostel")
        .populate("assignedHostel", "name hostelOwner address")
        .populate("collectedBy", "name email");

      if (!fee) {
        return res.status(404).json({
          success: false,
          message: "Payment record not found",
        });
      }

      if (
        !fee.assignedHostel ||
        fee.assignedHostel._id.toString() !==
        req.user.assignedHostel._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      res.status(200).json({
        success: true,
        data: fee,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch payment details",
        error: error.message,
      });
    }
  }
);

// @route   PUT /api/fees/:id
// @desc    Update payment (only mode, date, remarks)
// @access  Private (Admin/Manager)
router.put(
  "/:id",
  authenticateToken,
  authorizeAdminOrManager,
  [
    body("paymentMode")
      .optional()
      .isIn(["cash", "cheque", "upi", "card", "online", "bank_transfer"])
      .withMessage("Invalid payment mode"),
    body("remarks").optional().isString().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const fee = await Fee.findById(req.params.id);
      if (!fee) {
        return res.status(404).json({
          success: false,
          message: "Payment record not found",
        });
      }

      if (
        !fee.assignedHostel ||
        fee.assignedHostel.toString() !==
        req.user.assignedHostel._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const { paymentDate, paymentMode, remarks, reason } = req.body;

      const oldValues = {
        paidAmount: fee.paidAmount,
        paymentMode: fee.paymentMode,
        paymentDate: fee.paymentDate,
        remarks: fee.remarks,
        receiptNumber: fee.receiptNumber,
        installmentNumber: fee.installmentNumber,
        installmentAmount: fee.installmentAmount,
      };

      if (paymentDate) {
        fee.paymentDate = new Date(paymentDate);
      }
      if (paymentMode) {
        fee.paymentMode = paymentMode;
      }
      if (typeof remarks === "string") {
        fee.remarks = remarks;
      }

      await fee.save();

      await fee.populate([
        {
          path: "student",
          select: "name class batch studentId address father status assignedHostel",
        },
        { path: "assignedHostel", select: "name hostelOwner address" },
        { path: "collectedBy", select: "name email" },
      ]);

      await AuditLog.log({
        model: "Fee",
        refId: fee._id,
        action: "update",
        payload: {
          oldValues,
          newValues: {
            paidAmount: fee.paidAmount,
            paymentMode: fee.paymentMode,
            paymentDate: fee.paymentDate,
            remarks: fee.remarks,
            receiptNumber: fee.receiptNumber,
            installmentNumber: fee.installmentNumber,
            installmentAmount: fee.installmentAmount,
          },
        },
        user: req.user._id,
        assignedHostel: req.user.assignedHostel._id,
        reason: reason || "Payment updated",
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });

      return res.status(200).json({
        success: true,
        message: "Payment updated successfully",
        data: fee,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update payment",
        error: error.message,
      });
    }
  }
);

// @route   DELETE /api/fees/:id
// @desc    Delete payment record
// @access  Private (Admin/Manager)
router.delete(
  "/:id",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const fee = await Fee.findById(req.params.id);

      if (!fee) {
        return res.status(404).json({
          success: false,
          message: "Payment record not found",
        });
      }

      if (
        !fee.assignedHostel ||
        fee.assignedHostel.toString() !==
        req.user.assignedHostel._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const deletedData = {
        receiptNumber: fee.receiptNumber,
        student: fee.student,
        installmentNumber: fee.installmentNumber,
        paidAmount: fee.paidAmount,
        paymentMode: fee.paymentMode,
        paymentDate: fee.paymentDate,
      };

      const student = await Student.findOne({
        _id: fee.student,
        assignedHostel: req.user.assignedHostel._id,
      });

      if (
        student &&
        student.feeStructure &&
        Array.isArray(student.feeStructure.installmentBreakdown)
      ) {
        for (let inst of student.feeStructure.installmentBreakdown) {
          if (inst.installmentNumber === fee.installmentNumber) {
            inst.status = "pending";
            inst.paidAmount = 0;
            inst.paidDate = null;
            break;
          }
        }
        await student.save();
      }

      await Fee.findByIdAndDelete(req.params.id);

      await AuditLog.log({
        model: "Fee",
        refId: fee._id,
        action: "delete",
        payload: { deletedData },
        user: req.user._id,
        assignedHostel: req.user.assignedHostel._id,
        reason: req.body.reason || "Payment record deleted",
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.status(200).json({
        success: true,
        message: "Payment deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete payment",
        error: error.message,
      });
    }
  }
);

// ============================================
// SMS NOTIFICATION ROUTES
// ============================================

/**
 * @route   POST /api/fees/send-due-reminder/:studentId
 * @desc    Send due payment reminder SMS to parent
 * @access  Private (Admin/Manager)
 */
router.post(
  "/send-due-reminder/:studentId",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const { studentId } = req.params;
      const assignedHostel = req.user.assignedHostel._id;

      // Get student with pending installments
      const student = await Student.findOne({
        _id: studentId,
        assignedHostel,
        status: "active"
      }).select("name father.phone mother.phone feeStructure");

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found"
        });
      }

      // Get pending installments
      const pendingInstallments = student.feeStructure.installmentBreakdown.filter(
        inst => inst.status === "pending" || inst.status === "overdue"
      );

      if (pendingInstallments.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No pending fees for this student"
        });
      }

      const parentPhone = student.father?.phone || student.mother?.phone;

      if (!parentPhone) {
        return res.status(400).json({
          success: false,
          message: "No parent phone number found"
        });
      }

      // Get hostel name
      const Hostel = require("../models/hostel.model");
      const hostel = await Hostel.findById(assignedHostel).select("name");
      const hostelName = hostel?.name || "Hostel";

      // Send SMS
      const result = await twilioService.sendFeePendingReminder(
        parentPhone,
        student.name,
        pendingInstallments,
        hostelName,
        studentId,
        assignedHostel
      );

      if (result.success) {
        return res.json({
          success: true,
          message: result.mock ? "SMS Simulated (Mock Mode - Check Console)" : "Due payment reminder sent successfully",
          sentTo: parentPhone,
          isMock: result.mock
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Failed to send SMS",
          error: result.error
        });
      }
    } catch (error) {
      console.error("Send due reminder error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to send due reminder",
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/fees/send-overdue-alert/:studentId
 * @desc    Send overdue payment alert SMS to parent
 * @access  Private (Admin/Manager)
 */
router.post(
  "/send-overdue-alert/:studentId",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const { studentId } = req.params;
      const assignedHostel = req.user.assignedHostel._id;

      // Get student with overdue installments
      const student = await Student.findOne({
        _id: studentId,
        assignedHostel,
        status: "active"
      }).select("name father.phone mother.phone feeStructure");

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found"
        });
      }

      // Get overdue installments
      const now = new Date();
      const overdueInstallments = student.feeStructure.installmentBreakdown.filter(
        inst => {
          if (inst.status !== "overdue" && inst.status !== "pending") return false;
          if (!inst.dueDate) return false;
          return new Date(inst.dueDate) < now;
        }
      );

      if (overdueInstallments.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No overdue fees for this student"
        });
      }

      const parentPhone = student.father?.phone || student.mother?.phone;

      if (!parentPhone) {
        return res.status(400).json({
          success: false,
          message: "No parent phone number found"
        });
      }

      // Get hostel name
      const Hostel = require("../models/hostel.model");
      const hostel = await Hostel.findById(assignedHostel).select("name");
      const hostelName = hostel?.name || "Hostel";

      // Send SMS
      const result = await twilioService.sendFeeOverdueAlert(
        parentPhone,
        student.name,
        overdueInstallments,
        hostelName,
        studentId,
        assignedHostel
      );

      if (result.success) {
        return res.json({
          success: true,
          message: result.mock ? "SMS Simulated (Mock Mode - Check Console)" : "Overdue alert sent successfully",
          sentTo: parentPhone,
          isMock: result.mock
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Failed to send SMS",
          error: result.error
        });
      }
    } catch (error) {
      console.error("Send overdue alert error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to send overdue alert",
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/fees/resend-payment-confirmation/:feeId
 * @desc    Resend payment confirmation SMS
 * @access  Private (Admin/Manager)
 */
router.post(
  "/resend-payment-confirmation/:feeId",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const { feeId } = req.params;
      const assignedHostel = req.user.assignedHostel._id;

      // Get fee record
      const fee = await Fee.findOne({
        _id: feeId,
        assignedHostel
      }).populate({
        path: "student",
        select: "name father.phone mother.phone"
      });

      if (!fee) {
        return res.status(404).json({
          success: false,
          message: "Fee record not found"
        });
      }

      const parentPhone = fee.student.father?.phone || fee.student.mother?.phone;

      if (!parentPhone) {
        return res.status(400).json({
          success: false,
          message: "No parent phone number found"
        });
      }

      // Send SMS
      const result = await twilioService.sendFeePaymentConfirmation(
        parentPhone,
        fee.student.name,
        fee.paidAmount,
        fee.receiptNumber,
        fee.student._id,
        fee._id,
        assignedHostel,
        fee.installmentNumber,
        fee.paymentMode
      );

      if (result.success) {
        return res.json({
          success: true,
          message: result.mock ? "SMS Simulated (Mock Mode - Check Console)" : "Payment confirmation resent successfully",
          sentTo: parentPhone,
          isMock: result.mock
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Failed to send SMS",
          error: result.error
        });
      }
    } catch (error) {
      console.error("Resend payment confirmation error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to resend payment confirmation",
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/fees/bulk-send-reminders
 * @desc    Send due payment reminders to multiple students
 * @access  Private (Admin/Manager)
 */
router.post(
  "/bulk-send-reminders",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const { studentIds, type = "due" } = req.body; // type: 'due' or 'overdue'
      const assignedHostel = req.user.assignedHostel._id;

      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Student IDs array is required"
        });
      }

      // Get hostel name
      const Hostel = require("../models/hostel.model");
      const hostel = await Hostel.findById(assignedHostel).select("name");
      const hostelName = hostel?.name || "Hostel";

      const results = {
        total: studentIds.length,
        sent: 0,
        mock: 0,
        failed: 0,
        errors: []
      };

      // Process each student
      for (const studentId of studentIds) {
        try {
          const student = await Student.findOne({
            _id: studentId,
            assignedHostel,
            status: "active"
          }).select("name father.phone mother.phone feeStructure");

          if (!student) {
            results.failed++;
            results.errors.push({ studentId, error: "Student not found" });
            continue;
          }

          const parentPhone = student.father?.phone || student.mother?.phone;

          if (!parentPhone) {
            results.failed++;
            results.errors.push({ studentId, error: "No parent phone" });
            continue;
          }

          let installments;
          let smsResult;

          if (type === "overdue") {
            // Get overdue installments
            const now = new Date();
            installments = student.feeStructure.installmentBreakdown.filter(
              inst => {
                if (inst.status !== "overdue" && inst.status !== "pending") return false;
                if (!inst.dueDate) return false;
                return new Date(inst.dueDate) < now;
              }
            );

            if (installments.length > 0) {
              smsResult = await twilioService.sendFeeOverdueAlert(
                parentPhone,
                student.name,
                installments,
                hostelName,
                studentId,
                assignedHostel
              );
            }
          } else {
            // Get pending installments
            installments = student.feeStructure.installmentBreakdown.filter(
              inst => inst.status === "pending" || inst.status === "overdue"
            );

            if (installments.length > 0) {
              smsResult = await twilioService.sendFeePendingReminder(
                parentPhone,
                student.name,
                installments,
                hostelName,
                studentId,
                assignedHostel
              );
            }
          }

          if (installments && installments.length > 0) {
            if (smsResult && smsResult.success) {
              if (smsResult.mock) {
                results.mock++;
              } else {
                results.sent++;
              }
            } else {
              results.failed++;
              results.errors.push({
                studentId,
                error: smsResult?.error || "SMS send failed"
              });
            }
          } else {
            results.failed++;
            results.errors.push({ studentId, error: "No pending/overdue fees" });
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (studentError) {
          results.failed++;
          results.errors.push({ studentId, error: studentError.message });
        }
      }

      return res.json({
        success: true,
        message: `Bulk SMS completed. Sent: ${results.sent}, Mock: ${results.mock}, Failed: ${results.failed}`,
        results
      });

    } catch (error) {
      console.error("Bulk send reminders error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to send bulk reminders",
        error: error.message
      });
    }
  }
);


module.exports = router;
