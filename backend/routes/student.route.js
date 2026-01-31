const express = require("express");
const mongoose = require("mongoose");
const { body, validationResult, query } = require("express-validator");
const Student = require("../models/student.model");
const User = require("../models/user.model");
const Fee = require("../models/fees.model");
const Attendance = require("../models/attendance.model");
const Mark = require("../models/marks.model");
const MessAttendance = require("../models/messAttendance.model");
const MealPlan = require("../models/mealPlan.model"); // ⭐ ADD THIS
const multer = require("multer");
const {
  authenticateToken,
  authorizeAdmin,
  authorizeAdminOrManager,
  authorizeStudentAccess,
} = require("../middlewares/auth");
const {
  upload,
  uploadConfigs,
  handleUploadError,
  getFileUrl,
} = require("../middlewares/upload");

const router = express.Router();

// Validation rules
const studentValidation = [
  body("name")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters"),
  body("aadharNumber").notEmpty().withMessage("Aadhar Number is required"),
  body("phone").isMobilePhone().withMessage("Valid phone number is required"),
  body("dateOfBirth")
    .isISO8601()
    .withMessage("Valid date of birth is required"),
  body("gender")
    .isIn(["male", "female", "other"])
    .withMessage("Invalid gender"),
  body("class").notEmpty().withMessage("Class is required"),
  body("batch").notEmpty().withMessage("Batch is required"),
  body("rollNumber").notEmpty().withMessage("Roll number is required"),
  body("father.name").notEmpty().withMessage("Father name is required"),
  body("father.phone")
    .isMobilePhone()
    .withMessage("Valid father phone is required"),
  body("mother.name").notEmpty().withMessage("Mother name is required"),
];

// @route GET /api/students/next-roll-number
// @desc Get next roll number for a class and batch
// @access Private (admin, manager)
router.get(
  "/next-roll-number",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const { class: studentClass, batch } = req.query;
      const assignedHostel = req.user.assignedHostel._id;

      if (!studentClass || !batch || !assignedHostel) {
        return res
          .status(400)
          .json({ message: "assignedHostel ID and batch are required" });
      }

      // Find student with highest roll number
      const lastStudent = await Student.findOne({
        assignedHostel: assignedHostel,
        batch: batch,
      })
        .sort({ rollNumber: -1 })
        .lean();
      console.log("Last student:", lastStudent);

      let nextRollNumber = "001";

      if (lastStudent && lastStudent.rollNumber) {
        nextRollNumber = (parseInt(lastStudent.rollNumber) + 1)
          .toString()
          .padStart(3, "0");
      }

      return res.json({
        nextRollNumber,
        lastUsedRoll: lastStudent?.rollNumber || null,
      });
    } catch (error) {
      console.error("Get next roll number error:", error);
      res.status(500).json({
        message: "Failed to get next roll number",
        error: error.message,
      });
    }
  }
);

// @route   GET /api/students
// @desc    Get all students with pagination and filters
// @access  Private (Admin/Manager)
router.get(
  "/",
  authenticateToken,
  authorizeAdminOrManager,
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage("Limit must be between 1 and 10000"),
    query("class").optional().trim(),
    query("batch").optional().trim(),
    query("status")
      .optional()
      .isIn(["active", "inactive", "suspended", "graduated"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ message: "Validation failed", errors: errors.array() });
      }

      const {
        page = 1,
        limit = 10,
        search,
        class: studentClass,
        batch,
        status = "active",
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      // Build filter object
      const filter = { status };
      filter.assignedHostel = req.user.assignedHostel._id;
      if (studentClass) filter.class = studentClass;
      if (batch) filter.batch = batch;

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { studentId: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { rollNumber: { $regex: search, $options: "i" } },
        ];
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sortOptions = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

      // Get students with pagination
      const students = await Student.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .populate("createdBy", "name email phone");

      // Get total count for pagination
      const total = await Student.countDocuments(filter);

      res.json({
        students,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit),
        },
      });
    } catch (error) {
      console.error("Get students error:", error);
      res
        .status(500)
        .json({ message: "Failed to get students", error: error.message });
    }
  }
);

// @route POST /api/students
// @desc Add a new student
// @access Private (admin, manager)
router.post(
  "/",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ message: "Validation failed", errors: errors.array() });
      }
      const assignedHostel = req.user.assignedHostel._id;

      // Check for existing student with same aadhar number
      const existingStudent = await Student.findOne({
        assignedHostel: assignedHostel,
        aadharNumber: req.body.aadharNumber,
      });

      if (existingStudent) {
        return res.status(400).json({
          message: `Student with Aadhar Number ${existingStudent.aadharNumber} already exists`,
        });
      }

      req.body.createdBy = req.user.id;
      req.body.assignedHostel = req.user.assignedHostel._id;
      console.log("Creating student:", req.body);

      // Create student
      const newStudent = new Student(req.body);
      await newStudent.save();

      // ⭐ NEW: Auto-create full meal plan (B, L, D)
      try {
        await MealPlan.create({
          student: newStudent._id,
          planType: "full",
          meals: {
            breakfast: true,
            lunch: true,
            snacks: false, // ⭐ You only want B, L, D (not snacks)
            dinner: true,
          },
          monthlyCharge: 0, // ⭐ Already included in ₹40,000 fees
          active: true,
          startDate: new Date(),
        });

        console.log(
          `✅ Student ${newStudent.name} created with auto meal plan (B,L,D)`
        );
      } catch (mealPlanError) {
        console.error("⚠️ Failed to create meal plan:", mealPlanError);
        // Don't fail student creation if meal plan fails
      }

      res.status(201).json({
        message: "Student added successfully with meal plan",
        student: {
          id: newStudent._id,
          name: newStudent.name,
          studentId: newStudent.studentId,
          class: newStudent.class,
          batch: newStudent.batch,
        },
      });
    } catch (error) {
      console.error("Create student error:", error);
      res
        .status(500)
        .json({ message: "Failed to create student", error: error.message });
    }
  }
);

// ---------------------------------------------------------------------------

// @route POST /api/students/:id/documents
// @desc Upload documents for a student
// @access Private (admin, manager)
router.post(
  "/:id/documents",
  authenticateToken,
  authorizeAdminOrManager,

  // Logging middleware
  (req, res, next) => {
    console.log("➡️ Incoming request to /documents");
    next();
  },

  // Multer upload middleware
  uploadConfigs.studentDocuments,
  handleUploadError,

  async (req, res) => {
    try {
      console.log("📥 req.files:", req.files);

      const allowed = ["photo", "aadharCard", "addressProof", "idCard"];
      const uploadedDocs = {};

      // Extract uploaded files
      allowed.forEach((field) => {
        if (req.files[field] && req.files[field].length > 0) {
          const file = req.files[field][0];
          uploadedDocs[field] = {
            url: file.path,
            publicId: file.filename,
            uploadedAt: new Date(),
          };
        }
      });

      console.log("Uploaded documents data:", uploadedDocs);

      // Fetch student
      const student = await Student.findById(req.params.id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Initialize documents if not present
      if (!student.documents) {
        student.documents = {
          photo: { url: null, publicId: null, uploadedAt: null },
          aadharCard: { url: null, publicId: null, uploadedAt: null },
          addressProof: { url: null, publicId: null, uploadedAt: null },
          idCard: { url: null, publicId: null, uploadedAt: null },
        };
      }

      // Merge uploaded documents with existing ones
      allowed.forEach((field) => {
        if (uploadedDocs[field]) {
          student.documents[field] = uploadedDocs[field];
        }
      });

      await student.save();

      res.json({
        message: "Documents uploaded successfully",
        documents: student.documents,
      });
    } catch (error) {
      console.error("Upload documents error:", error);
      res.status(500).json({
        message: "Failed to upload documents",
        error: error.message,
      });
    }
  }
);

// @route PATCH /api/students/:id/inactivate
// @desc Soft delete (update status to inactive)
// @access Private (Admin only)
router.patch(
  "/:id/inactivate",
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const student = await Student.findByIdAndUpdate(
        id,
        { status: "inactive" },
        { new: true }
      );

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      res.json({
        message: "Student marked as inactive",
        student,
      });
    } catch (error) {
      console.error("Inactivate Student Error:", error);
      res.status(500).json({ message: "Server error while updating status" });
    }
  }
);
// @route   GET /api/students/:id/unpaid-fees
// @desc    Get student's UNPAID fee installments (similar to /fees/all-due)
// @access  Private (Admin/Manager)
router.get(
  "/:id/unpaid-fees",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const studentId = req.params.id;
      const assignedHostel = req.user.assignedHostel._id;

      if (!studentId) {
        return res.status(400).json({
          message: "Student ID is required",
        });
      }

      const currentDate = new Date();

      const pipeline = [
        {
          $match: {
            _id: new mongoose.Types.ObjectId(studentId),
            assignedHostel,
            status: "active",
          },
        },

        // Unwind all installments
        { $unwind: "$feeStructure.installmentBreakdown" },

        // Convert dueDate safely
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
            installmentStatus: "$feeStructure.installmentBreakdown.status",
          },
        },

        // Calculate days overdue
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
            isOverdue: {
              $cond: [
                { $and: ["$dueDate", { $lt: ["$dueDate", currentDate] }] },
                true,
                false,
              ],
            },
          },
        },

        // Only pending/overdue installments
        {
          $match: {
            installmentStatus: { $in: ["pending", "overdue"] },
          },
        },

        // Format output
        {
          $project: {
            _id: "$feeStructure.installmentBreakdown._id",
            studentObjectId: "$_id",
            studentId: 1,
            name: 1,
            class: 1,
            batch: 1,
            fatherName: "$father.name",
            fatherPhone: "$father.phone",

            installmentNumber:
              "$feeStructure.installmentBreakdown.installmentNumber",
            dueAmount: "$feeStructure.installmentBreakdown.amount",
            dueDate: "$dueDate",
            status: {
              $cond: ["$isOverdue", "overdue", "pending"],
            },
            daysOverdue: "$daysOverdue",
            overdueCharges: {
              $cond: [
                "$isOverdue",
                {
                  $ifNull: [
                    "$feeStructure.installmentBreakdown.overdueCharges",
                    0,
                  ],
                },
                0,
              ],
            },
          },
        },

        // Sort by due date (earliest first)
        { $sort: { dueDate: 1 } },
      ];

      const unpaidFees = await Student.aggregate(pipeline);

      return res.status(200).json({
        data: {
          unpaidFees,
        },
      });
    } catch (error) {
      console.error("Unpaid Fee fetch error:", error);
      return res.status(500).json({
        message: "Error fetching student unpaid fee details",
        error: error.message,
      });
    }
  }
);

// @route   GET /api/students/:id/paid-fees
// @desc    Get student's PAID fees from Fee collection (similar to /fees/paid)
// @access  Private (Admin/Manager)
router.get(
  "/:id/paid-fees",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const studentId = req.params.id;
      const assignedHostel = req.user.assignedHostel._id;

      if (!studentId) {
        return res.status(400).json({
          message: "Student ID is required",
        });
      }

      // Verify student exists and belongs to this hostel
      const studentExists = await Student.findOne({
        _id: studentId,
        assignedHostel,
      });

      if (!studentExists) {
        return res.status(404).json({
          message: "Student not found or doesn't belong to your hostel",
        });
      }

      const pipeline = [
        {
          $match: {
            student: new mongoose.Types.ObjectId(studentId),
            status: "paid",
          },
        },

        // Join student data
        {
          $lookup: {
            from: "students",
            localField: "student",
            foreignField: "_id",
            as: "student",
          },
        },
        { $unwind: "$student" },

        // Format output (same structure as /fees/paid)
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

        // Sort by payment date (latest first)
        { $sort: { paymentDate: -1 } },
      ];

      const paidPaymentData = await Fee.aggregate(pipeline);

      return res.status(200).json({
        data: {
          paidPaymentData,
        },
      });
    } catch (error) {
      console.error("Paid Fee fetch error:", error);
      return res.status(500).json({
        message: "Error fetching student paid fee details",
        error: error.message,
      });
    }
  }
);
// @route   GET /api/students/:id/marks
// @desc    Get student marks/grades with pagination
// @access  Private (Admin/Manager)
router.get(
  "/:id/marks",
  authenticateToken,
  authorizeAdminOrManager,
  [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { limit = 50 } = req.query;

      // Verify student exists
      const student = await Student.findOne({
        _id: id,
        assignedHostel: req.user.assignedHostel._id,
      });

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Import Mark model (add at top of file)
      const Mark = require("../models/marks.model");

      // Fetch marks
      const marks = await Mark.find({ student: id })
        .sort({ examDate: -1 })
        .limit(parseInt(limit))
        .lean();

      // Calculate statistics
      const stats = marks.reduce(
        (acc, mark) => {
          const percentage = (mark.marksObtained / mark.totalMarks) * 100;
          acc.totalExams += 1;
          acc.averagePercentage += percentage;
          if (percentage >= 90) acc.excellent += 1;
          else if (percentage >= 75) acc.good += 1;
          else if (percentage >= 60) acc.average += 1;
          else acc.needsImprovement += 1;
          return acc;
        },
        {
          totalExams: 0,
          averagePercentage: 0,
          excellent: 0,
          good: 0,
          average: 0,
          needsImprovement: 0,
        }
      );

      if (stats.totalExams > 0) {
        stats.averagePercentage = (
          stats.averagePercentage / stats.totalExams
        ).toFixed(2);
      }

      res.json({
        data: {
          marks,
          stats,
        },
      });
    } catch (error) {
      console.error("Get student marks error:", error);
      res.status(500).json({
        message: "Failed to fetch marks",
        error: error.message,
      });
    }
  }
);

// @route   GET /api/students/:id/gate-entries
// @desc    Get student IN/OUT entry records (all entries, not daily summary)
// @access  Private (Admin/Manager)
router.get(
  "/:id/gate-entries",
  authenticateToken,
  authorizeAdminOrManager,
  [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("type")
      .optional()
      .isIn(["IN", "OUT"])
      .withMessage("Type must be IN or OUT"),
    query("startDate")
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage("Date must be in YYYY-MM-DD format"),
    query("endDate")
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage("Date must be in YYYY-MM-DD format"),
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { limit = 50, type, startDate, endDate } = req.query;

      // Verify student exists
      const student = await Student.findOne({
        _id: id,
        assignedHostel: req.user.assignedHostel._id,
      });

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const Attendance = require("../models/attendance.model");

      // Build filter for IN/OUT entries
      const filter = {
        student: id,
        deleted: { $ne: true },
      };

      // Filter by entry type (IN or OUT)
      if (type) {
        filter.type = type;
      }

      // Filter by date range
      if (startDate && endDate) {
        filter.date = { $gte: startDate, $lte: endDate };
      } else if (startDate) {
        filter.date = { $gte: startDate };
      } else if (endDate) {
        filter.date = { $lte: endDate };
      }

      // Fetch all IN/OUT entries (not grouped by day)
      const gateEntries = await Attendance.find(filter)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .select({
          date: 1,
          type: 1,
          timestamp: 1,
          entryTime: 1,
          exitTime: 1,
          status: 1,
          source: 1,
          deviceId: 1,
          shift: 1,
          notes: 1,
          validationIssues: 1,
          reconciled: 1,
          createdBy: 1,
          createdAt: 1,
        })
        .populate("createdBy", "name")
        .lean();

      // Calculate summary statistics
      const summary = await Attendance.aggregate([
        {
          $match: {
            student: new mongoose.Types.ObjectId(id),
            deleted: { $ne: true },
          },
        },
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
          },
        },
      ]);

      const totalEntries = gateEntries.length;
      const inEntries = summary.find((s) => s._id === "IN")?.count || 0;
      const outEntries = summary.find((s) => s._id === "OUT")?.count || 0;

      // Count entries with validation issues
      const entriesWithIssues = gateEntries.filter(
        (entry) => entry.validationIssues && entry.validationIssues.length > 0
      ).length;

      res.json({
        data: {
          gateEntries,
          summary: {
            totalEntries,
            inEntries,
            outEntries,
            entriesWithIssues,
            unreconciled: gateEntries.filter((e) => !e.reconciled).length,
          },
        },
      });
    } catch (error) {
      console.error("Get gate entries error:", error);
      res.status(500).json({
        message: "Failed to fetch gate entries",
        error: error.message,
      });
    }
  }
);

// @route   GET /api/students/:id/mess-attendance
// @desc    Get student mess attendance records
// @access  Private (Admin/Manager)
router.get(
  "/:id/mess-attendance",
  authenticateToken,
  authorizeAdminOrManager,
  [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("mealType")
      .optional()
      .isIn(["breakfast", "lunch", "snacks", "dinner"])
      .withMessage("Invalid meal type"),
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { limit = 50, mealType } = req.query;

      // Verify student exists
      const student = await Student.findOne({
        _id: id,
        assignedHostel: req.user.assignedHostel._id,
      });

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Import MessAttendance model (add at top of file)
      const MessAttendance = require("../models/messAttendance.model");

      // Build filter
      const filter = { student: id };
      if (mealType) filter.mealType = mealType;

      // Fetch mess attendance
      const messAttendance = await MessAttendance.find(filter)
        .sort({ date: -1, timestamp: -1 })
        .limit(parseInt(limit))
        .lean();

      // Calculate meal-wise summary
      const mealSummary = await MessAttendance.aggregate([
        { $match: { student: new mongoose.Types.ObjectId(id) } },
        {
          $group: {
            _id: "$mealType",
            count: { $sum: 1 },
          },
        },
      ]);

      const totalMeals = messAttendance.length;
      const breakfast =
        mealSummary.find((m) => m._id === "breakfast")?.count || 0;
      const lunch = mealSummary.find((m) => m._id === "lunch")?.count || 0;
      const snacks = mealSummary.find((m) => m._id === "snacks")?.count || 0;
      const dinner = mealSummary.find((m) => m._id === "dinner")?.count || 0;

      res.json({
        data: {
          messAttendance,
          summary: {
            totalMeals,
            breakfast,
            lunch,
            snacks,
            dinner,
          },
        },
      });
    } catch (error) {
      console.error("Get mess attendance error:", error);
      res.status(500).json({
        message: "Failed to fetch mess attendance",
        error: error.message,
      });
    }
  }
);

// @route   GET /api/students/:id/complete-report
// @desc    Get comprehensive student report (all data combined)
// @access  Private (Admin/Manager)
router.get(
  "/:id/complete-report",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Verify student exists
      const student = await Student.findOne({
        _id: id,
        assignedHostel: req.user.assignedHostel._id,
      })
        .populate("createdBy", "name email")
        .lean();

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Import all required models
      const Attendance = require("../models/attendance.model");
      const Mark = require("../models/marks.model");
      const MessAttendance = require("../models/messAttendance.model");

      // Fetch all related data in parallel
      const [fees, attendance, marks, gateEntries, messAttendance] =
        await Promise.all([
          // Paid fees
          Fee.find({ student: id, status: "paid" })
            .sort({ paymentDate: -1 })
            .lean(),

          // Daily/regular attendance (you already use this shape in /:id/attendance)
          Attendance.find({ student: id }).sort({ date: -1 }).limit(100).lean(),

          // Marks
          Mark.find({ student: id }).sort({ examDate: -1 }).lean(),

          // Gate entries: same Attendance model, filtered by type IN/OUT
          Attendance.find({
            student: id,
            type: { $in: ["IN", "OUT"] },
          })
            .sort({ timestamp: -1 })
            .limit(50)
            .lean(),

          // Mess attendance
          MessAttendance.find({ student: id })
            .sort({ date: -1 })
            .limit(100)
            .lean(),
        ]);

      // Calculate fee summary
      const feeData = student.feeStructure || {};
      const baseFee = Number(feeData.baseFee) || 0;
      const installments = Array.isArray(feeData.installmentBreakdown)
        ? feeData.installmentBreakdown
        : [];

      const totalPaid = installments.reduce((sum, i) => {
        if (i.status === "paid") {
          return sum + (Number(i.paidAmount) || Number(i.amount) || 0);
        }
        return sum;
      }, 0);

      const feeSummary = {
        baseFee,
        totalPaid,
        dueAmount: Math.max(baseFee - totalPaid, 0),
        totalInstallments: installments.length,
        paidInstallments: installments.filter((i) => i.status === "paid")
          .length,
      };

      res.json({
        data: {
          student,
          feeSummary,
          fees,
          attendance,
          marks,
          gateEntries,
          messAttendance,
          generatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Get complete report error:", error);
      res.status(500).json({
        message: "Failed to generate complete report",
        error: error.message,
      });
    }
  }
);

// @route   GET /api/students/:id/attendance
// @desc    Get student attendance records (daily attendance - not IN/OUT entries)
// @access  Private (Admin/Manager)
router.get(
  "/:id/attendance",
  authenticateToken,
  authorizeAdminOrManager,
  [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("startDate")
      .optional()
      .isISO8601()
      .withMessage("Invalid start date format"),
    query("endDate")
      .optional()
      .isISO8601()
      .withMessage("Invalid end date format"),
    query("status")
      .optional()
      .isIn(["present", "absent", "on_leave", "late", "half_day"])
      .withMessage("Invalid status"),
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { limit = 50, startDate, endDate, status } = req.query;

      // Verify student exists and belongs to user's hostel
      const student = await Student.findOne({
        _id: id,
        assignedHostel: req.user.assignedHostel._id,
      });

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const Attendance = require("../models/attendance.model");

      // Build aggregation pipeline to get DAILY attendance summary
      // (not individual IN/OUT entries)
      const matchStage = {
        student: new mongoose.Types.ObjectId(id),
        deleted: { $ne: true },
      };

      // Filter by date range
      if (startDate && endDate) {
        matchStage.date = { $gte: startDate, $lte: endDate };
      } else if (startDate) {
        matchStage.date = { $gte: startDate };
      } else if (endDate) {
        matchStage.date = { $lte: endDate };
      }

      // Filter by status
      if (status) {
        matchStage.status = status;
      }

      // Aggregate to get one record per day (latest status for that day)
      const dailyAttendance = await Attendance.aggregate([
        { $match: matchStage },
        // Sort by timestamp to get latest entry per day
        { $sort: { date: 1, timestamp: -1 } },
        // Group by date and take first (latest) record
        {
          $group: {
            _id: "$date",
            record: { $first: "$$ROOT" },
          },
        },
        // Replace root with the record
        { $replaceRoot: { newRoot: "$record" } },
        // Sort by date descending (most recent first)
        { $sort: { date: -1 } },
        // Limit results
        { $limit: parseInt(limit) },
        // Project only needed fields
        {
          $project: {
            _id: 1,
            date: 1,
            status: 1,
            type: 1,
            timestamp: 1,
            entryTime: 1,
            exitTime: 1,
            source: 1,
            notes: 1,
            leaveApplication: 1,
            validationIssues: 1,
            reconciled: 1,
            createdAt: 1,
          },
        },
      ]);

      // Calculate summary statistics for this student
      const summaryPipeline = [
        {
          $match: {
            student: new mongoose.Types.ObjectId(id),
            deleted: { $ne: true },
          },
        },
        // Group by date first to get unique days
        {
          $group: {
            _id: "$date",
            latestStatus: { $last: "$status" }, // Last status of the day
          },
        },
        // Now count by status
        {
          $group: {
            _id: "$latestStatus",
            count: { $sum: 1 },
          },
        },
      ];

      const statusCounts = await Attendance.aggregate(summaryPipeline);

      // Build summary object
      const summary = {
        totalDays: 0,
        present: 0,
        absent: 0,
        on_leave: 0,
        late: 0,
        half_day: 0,
        percentage: 0,
      };

      statusCounts.forEach((item) => {
        summary[item._id] = item.count;
        summary.totalDays += item.count;
      });

      // Calculate attendance percentage (present + late + half_day as attended)
      const attendedDays = summary.present + summary.late + summary.half_day;
      if (summary.totalDays > 0) {
        summary.percentage = ((attendedDays / summary.totalDays) * 100).toFixed(
          2
        );
      }

      res.json({
        data: {
          attendance: dailyAttendance,
          summary,
        },
      });
    } catch (error) {
      console.error("Get student attendance error:", error);
      res.status(500).json({
        message: "Failed to fetch attendance",
        error: error.message,
      });
    }
  }
);
// @route   GET /api/students/:id
// @desc    Get student by ID
// @access  Private (Admin/Manager)
router.get(
  "/:id",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const student = await Student.findById(req.params.id).populate(
        "createdBy",
        "name email phone address"
      );

      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const feeData = student.feeStructure || {};
      const baseFee = Number(feeData.baseFee) || 0;
      const installments = Array.isArray(feeData.installmentBreakdown)
        ? feeData.installmentBreakdown
        : [];

      const totalPaid = installments.reduce((sum, i) => {
        if (i.status === "paid") {
          const paid = Number(i.paidAmount) || Number(i.amount) || 0;
          return sum + paid;
        }
        return sum;
      }, 0);

      const dueAmount = Math.max(baseFee - totalPaid, 0);
      const nillAmount = totalPaid >= baseFee;

      const totalInstallments = installments.length;
      const paidInstallments = installments.filter(
        (i) => i.status === "paid"
      ).length;
      const unpaidInstallments = totalInstallments - paidInstallments;

      res.json({
        student,
        feeSummary: {
          baseFee,
          totalPaid,
          dueAmount,
          nillAmount,
          totalInstallments,
          paidInstallments,
          unpaidInstallments,
        },
      });
    } catch (error) {
      console.error("Get student error:", error);
      res.status(500).json({
        message: "Failed to get student",
        error: error.message,
      });
    }
  }
);

// @route PUT /api/students/:id
// @desc Update student data
// @access Private(Admin)
router.put(
  "/:id",
  authenticateToken,
  authorizeAdmin,
  uploadConfigs.studentDocuments,
  async (req, res) => {
    try {
      const { id } = req.params;
      const student = await Student.findById(id);
      if (!student)
        return res.status(404).json({ message: "Student not found" });

      const body = req.body;
      let updateData = { ...body };

      const files = req.files || {};

      // Handle new + delete old function
      const processFile = async (fieldName) => {
        if (files[fieldName]?.length > 0) {
          const newFile = files[fieldName][0];
          const publicId = newFile.filename?.split("/").pop()?.split(".")[0];

          // delete old file
          if (student[fieldName]?.publicId) {
            await deleteFromCloudinary(student[fieldName].publicId);
          }

          updateData[fieldName] = {
            url: newFile.path,
            publicId,
            uploadedAt: new Date(),
          };
        }
      };

      await processFile("photo");
      await processFile("aadharCard");
      await processFile("addressProof");
      await processFile("idCard");

      // Update student in DB
      const updatedStudent = await Student.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      res.json({
        message: "Student updated successfully",
        student: updatedStudent,
      });
    } catch (error) {
      console.error("Update Student Error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

module.exports = router;
