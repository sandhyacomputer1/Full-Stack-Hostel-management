// server/routes/marks.routes.js
const express = require("express");
const { body, validationResult } = require("express-validator");
const Marks = require("../models/marks.model");
const MarksSettings = require("../models/marksSettings.model");
const Student = require("../models/student.model");
const AuditLog = require("../models/auditLog.model");
const {
  authenticateToken,
  authorizeAdminOrManager,
} = require("../middlewares/auth");

const router = express.Router();

// ============================================
// HELPER FUNCTION FOR AUDIT LOGGING
// ============================================

/**
 * Helper function to capture changes between old and new documents
 */
const getChangedFields = (oldDoc, newData) => {
  const changes = {};
  const fieldsToTrack = [
    "examType",
    "examName",
    "subject",
    "marksObtained",
    "totalMarks",
    "examDate",
    "academicYear",
    "remarks",
  ];

  fieldsToTrack.forEach((field) => {
    if (
      newData[field] !== undefined &&
      JSON.stringify(oldDoc[field]) !== JSON.stringify(newData[field])
    ) {
      changes[field] = {
        old: oldDoc[field],
        new: newData[field],
      };
    }
  });

  return changes;
};

// ============================================
// SETTINGS ROUTES (✅ FIRST - Most Specific)
// ============================================

/**
 * @route   GET /api/marks/settings
 * @desc    Get marks settings for the hostel
 * @access  Private
 */
router.get("/settings", authenticateToken, async (req, res) => {
  try {
    const hostelId = req.user.assignedHostel._id;

    let settings = await MarksSettings.findOne({ assignedHostel: hostelId });

    if (!settings) {
      settings = await MarksSettings.create({
        assignedHostel: hostelId,
        passPercentage: 33,
        defaultAcademicYear: "2024-25",
        gradeBoundaries: {
          APlus: 90,
          A: 80,
          BPlus: 70,
          B: 60,
          CPlus: 50,
          C: 40,
          D: 33,
        },
        lastUpdatedBy: req.user._id,
      });

      console.log(`✅ Default marks settings created for hostel: ${hostelId}`);
    }

    return res.json({ success: true, settings });
  } catch (err) {
    console.error("❌ GET /settings error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route   PUT /api/marks/settings
 * @desc    Update marks settings
 * @access  Private (Admin/Manager)
 */
router.put(
  "/settings",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const hostelId = req.user.assignedHostel._id;
      const { passPercentage, defaultAcademicYear, gradeBoundaries } = req.body;

      if (
        passPercentage !== undefined &&
        (passPercentage < 0 || passPercentage > 100)
      ) {
        return res.status(400).json({
          success: false,
          message: "Pass percentage must be between 0 and 100",
        });
      }

      if (defaultAcademicYear && !/^\d{4}-\d{2}$/.test(defaultAcademicYear)) {
        return res.status(400).json({
          success: false,
          message: "Academic year must be in YYYY-YY format",
        });
      }

      if (gradeBoundaries) {
        const grades = Object.values(gradeBoundaries);
        const invalidGrade = grades.find((g) => g < 0 || g > 100);
        if (invalidGrade !== undefined) {
          return res.status(400).json({
            success: false,
            message: "All grade boundaries must be between 0 and 100",
          });
        }
      }

      const settings = await MarksSettings.findOneAndUpdate(
        { assignedHostel: hostelId },
        {
          passPercentage,
          defaultAcademicYear,
          gradeBoundaries,
          lastUpdatedBy: req.user._id,
        },
        { new: true, upsert: true, runValidators: true }
      );

      console.log(`✅ Marks settings updated for hostel: ${hostelId}`);

      return res.json({
        success: true,
        settings,
        message: "Settings updated successfully",
      });
    } catch (err) {
      console.error("❌ PUT /settings error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * @route   POST /api/marks/settings/reset
 * @desc    Reset settings to default
 * @access  Private (Admin/Manager)
 */
router.post(
  "/settings/reset",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const hostelId = req.user.assignedHostel._id;

      const settings = await MarksSettings.findOneAndUpdate(
        { assignedHostel: hostelId },
        {
          passPercentage: 33,
          defaultAcademicYear: "2024-25",
          gradeBoundaries: {
            APlus: 90,
            A: 80,
            BPlus: 70,
            B: 60,
            CPlus: 50,
            C: 40,
            D: 33,
          },
          lastUpdatedBy: req.user._id,
        },
        { new: true, upsert: true }
      );

      console.log(`✅ Marks settings reset for hostel: ${hostelId}`);

      return res.json({
        success: true,
        settings,
        message: "Settings reset to default successfully",
      });
    } catch (err) {
      console.error("❌ POST /settings/reset error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ============================================
// REPORT ROUTE (✅ SECOND - Specific Path)
// ============================================

/**
 * @route   GET /api/marks/report
 * @desc    Get summary report of marks (hostel-scoped)
 * @access  Private
 */
router.get("/report", authenticateToken, async (req, res) => {
  try {
    const { subject, examType, academicYear } = req.query;
    const hostelId = req.user.assignedHostel._id;

    const query = { assignedHostel: hostelId };

    if (subject) query.subject = subject;
    if (examType) query.examType = examType;
    if (academicYear) query.academicYear = academicYear;

    const stats = await Marks.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          averageMarks: { $avg: "$marksObtained" },
          totalStudents: { $addToSet: "$student" },
          passCount: {
            $sum: {
              $cond: [{ $gte: ["$percentage", 33] }, 1, 0],
            },
          },
          total: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          averageMarks: 1,
          totalStudents: { $size: "$totalStudents" },
          passCount: 1,
          total: 1,
          passRate: {
            $cond: [
              { $eq: ["$total", 0] },
              0,
              { $multiply: [{ $divide: ["$passCount", "$total"] }, 100] },
            ],
          },
        },
      },
    ]);

    const report = stats[0] || {
      averageMarks: 0,
      totalStudents: 0,
      total: 0,
      passCount: 0,
      passRate: 0,
    };

    res.json(report);
  } catch (error) {
    console.error("Marks report error:", error);
    res
      .status(500)
      .json({ message: "Failed to get report", error: error.message });
  }
});

// ============================================
// BULK ROUTE (✅ THIRD - Specific Path)
// ============================================

/**
 * @route   POST /api/marks/bulk
 * @desc    Bulk create marks records
 * @access  Private (Admin/Manager)
 */
router.post(
  "/bulk",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const marksArray = req.body;
      const hostelId = req.user.assignedHostel._id;

      if (!Array.isArray(marksArray) || marksArray.length === 0) {
        return res
          .status(400)
          .json({ message: "Data must be a non-empty array" });
      }

      const results = [];

      for (const [index, data] of marksArray.entries()) {
        const result = { index, student: data.student, success: false };

        if (
          !data.student ||
          !data.examType ||
          !data.examName ||
          !data.subject ||
          data.marksObtained === "" ||
          data.totalMarks === "" ||
          !data.examDate ||
          !data.academicYear
        ) {
          result.error = "Missing required fields";
          results.push(result);
          continue;
        }

        try {
          const studentDoc = await Student.findOne({
            studentId: data.student,
            assignedHostel: hostelId,
          });

          if (!studentDoc) {
            result.error = `Student not found in your hostel: ${data.student}`;
            results.push(result);
            continue;
          }

          const mark = new Marks({
            ...data,
            student: studentDoc._id,
            evaluatedBy: req.user._id,
            assignedHostel: hostelId,
          });

          await mark.save();
          result.success = true;
          results.push(result);
        } catch (err) {
          result.error = err.message;
          results.push(result);
        }
      }

      const failed = results.filter((r) => !r.success);
      const succeeded = results.filter((r) => r.success);

      console.log(
        `✅ Bulk marks: ${succeeded.length} succeeded, ${failed.length} failed`
      );

      return res.status(failed.length ? 207 : 201).json({
        message:
          failed.length === 0
            ? "All marks added successfully"
            : `Partial success: ${succeeded.length} succeeded, ${failed.length} failed`,
        results,
      });
    } catch (error) {
      console.error("Bulk add marks error:", error);
      res
        .status(500)
        .json({ message: "Bulk add failed", error: error.message });
    }
  }
);

// ============================================
// STUDENT-SPECIFIC ROUTE (✅ FOURTH - Parameterized Path)
// ============================================

/**
 * @route   GET /api/marks/student/:studentId
 * @desc    Get all marks for a specific student (hostel-scoped)
 * @access  Private
 */
router.get("/student/:studentId", authenticateToken, async (req, res) => {
  try {
    const {
      subject,
      examType,
      academicYear,
      page = 1,
      limit = 50,
    } = req.query;
    const hostelId = req.user.assignedHostel._id;

    const query = {
      student: req.params.studentId,
      assignedHostel: hostelId,
    };

    if (subject) query.subject = subject;
    if (examType) query.examType = examType;
    if (academicYear) query.academicYear = academicYear;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Marks.countDocuments(query);

    const marks = await Marks.find(query)
      .populate("student", "name studentId class batch")
      .sort({ examDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      marks,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        current: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get by student error:", error);
    res.status(500).json({
      message: "Failed to fetch marks for student",
      error: error.message,
    });
  }
});

// ============================================
// AUDIT HISTORY ROUTE
// ============================================

/**
 * @route   GET /api/marks/:id/history
 * @desc    Get audit history for a specific mark record
 * @access  Private
 */
router.get("/:id/history", authenticateToken, async (req, res) => {
  try {
    const hostelId = req.user.assignedHostel._id;

    // Verify the mark belongs to this hostel
    const mark = await Marks.findOne({
      _id: req.params.id,
      assignedHostel: hostelId,
    });

    if (!mark) {
      return res.status(404).json({ message: "Mark not found" });
    }

    // Get audit history
    const history = await AuditLog.getHistory("Marks", req.params.id);

    res.json({
      success: true,
      markId: req.params.id,
      history,
      total: history.length,
    });
  } catch (error) {
    console.error("Get mark history error:", error);
    res.status(500).json({
      message: "Failed to fetch audit history",
      error: error.message,
    });
  }
});

// ============================================
// GENERIC CRUD ROUTES (✅ FIFTH - Root Path Operations)
// ============================================

/**
 * @route   POST /api/marks
 * @desc    Add single marks entry
 * @access  Private (Admin/Manager)
 */
router.post(
  "/",
  authenticateToken,
  authorizeAdminOrManager,
  [
    body("student").notEmpty().withMessage("Student code is required"),
    body("examType")
      .isIn([
        "weekly_test",
        "monthly_test",
        "unit_test",
        "mid_term",
        "final_exam",
        "assignment",
        "project",
        "quiz",
      ])
      .withMessage("Invalid exam type"),
    body("examName").notEmpty().withMessage("Exam name is required"),
    body("subject").notEmpty().withMessage("Subject is required"),
    body("marksObtained")
      .isNumeric()
      .withMessage("Marks obtained must be a number"),
    body("totalMarks").isNumeric().withMessage("Total marks must be a number"),
    body("examDate").isISO8601().withMessage("Valid exam date is required"),
    body("academicYear")
      .matches(/^\d{4}-\d{2}$/)
      .withMessage("Academic year must be in YYYY-YY format"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ message: "Validation failed", errors: errors.array() });
      }

      const hostelId = req.user.assignedHostel._id;

      const studentCode = req.body.student;
      const studentDoc = await Student.findOne({
        studentId: studentCode,
        assignedHostel: hostelId,
      });

      if (!studentDoc) {
        return res.status(400).json({
          message: `Student not found in your hostel for ID: ${studentCode}`,
        });
      }

      const mark = new Marks({
        ...req.body,
        student: studentDoc._id,
        evaluatedBy: req.user._id,
        assignedHostel: hostelId,
      });

      await mark.save();
      await mark.populate("student", "name studentId class batch");

      console.log(`✅ Marks added: ${studentDoc.name} - ${req.body.subject}`);

      res.status(201).json({
        message: "Marks added successfully",
        mark,
      });
    } catch (error) {
      console.error("Add marks error:", error);
      res
        .status(500)
        .json({ message: "Failed to add marks", error: error.message });
    }
  }
);

/**
 * @route   GET /api/marks
 * @desc    List all marks with filters/pagination (hostel-scoped)
 * @access  Private
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const {
      search = "",
      subject,
      examType,
      academicYear,
      page = 1,
      limit = 10,
    } = req.query;

    const hostelId = req.user.assignedHostel._id;

    const query = { assignedHostel: hostelId };

    if (subject) query.subject = subject;
    if (examType) query.examType = examType;
    if (academicYear) query.academicYear = academicYear;

    if (search) {
      query.$or = [
        { examName: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Marks.countDocuments(query);

    const marks = await Marks.find(query)
      .populate("student", "name studentId class batch")
      .sort({ examDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      marks,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        current: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    console.error("List marks error:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch marks", error: err.message });
  }
});

// ============================================
// DYNAMIC ID ROUTES (✅ LAST - Catches Everything Else)
// ============================================

/**
 * @route   GET /api/marks/:id
 * @desc    Get a single mark by ID (hostel-scoped)
 * @access  Private
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const hostelId = req.user.assignedHostel._id;

    const mark = await Marks.findOne({
      _id: req.params.id,
      assignedHostel: hostelId,
    }).populate("student", "name studentId class batch");

    if (!mark) {
      return res.status(404).json({ message: "Mark not found" });
    }

    res.json({ mark });
  } catch (err) {
    console.error("Get mark error:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch mark", error: err.message });
  }
});

/**
 * @route   PUT /api/marks/:id
 * @desc    Update a mark by ID (hostel-scoped) with audit logging
 * @access  Private (Admin/Manager)
 */
router.put(
  "/:id",
  authenticateToken,
  authorizeAdminOrManager,
  [
    body("student").notEmpty().withMessage("Student code is required"),
    body("examType")
      .isIn([
        "weekly_test",
        "monthly_test",
        "unit_test",
        "mid_term",
        "final_exam",
        "assignment",
        "project",
        "quiz",
      ])
      .withMessage("Invalid exam type"),
    body("examName").notEmpty().withMessage("Exam name is required"),
    body("subject").notEmpty().withMessage("Subject is required"),
    body("marksObtained")
      .isNumeric()
      .withMessage("Marks obtained must be a number"),
    body("totalMarks").isNumeric().withMessage("Total marks must be a number"),
    body("examDate").isISO8601().withMessage("Valid exam date is required"),
    body("academicYear")
      .matches(/^\d{4}-\d{2}$/)
      .withMessage("Academic year must be in YYYY-YY format"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ message: "Validation failed", errors: errors.array() });
      }

      const hostelId = req.user.assignedHostel._id;

      // ✅ Step 1: Find the existing mark document (before update)
      const existingMark = await Marks.findOne({
        _id: req.params.id,
        assignedHostel: hostelId,
      }).populate("student", "name studentId class batch");

      if (!existingMark) {
        return res.status(404).json({ message: "Mark not found" });
      }

      // ✅ Step 2: Validate the student
      const studentCode = req.body.student;
      const studentDoc = await Student.findOne({
        studentId: studentCode,
        assignedHostel: hostelId,
      });

      if (!studentDoc) {
        return res.status(400).json({
          message: `Student not found in your hostel for ID: ${studentCode}`,
        });
      }

      // ✅ Step 3: Capture the changes
      const changes = getChangedFields(existingMark, req.body);

      // ✅ Step 4: Update the mark
      const updated = await Marks.findOneAndUpdate(
        {
          _id: req.params.id,
          assignedHostel: hostelId,
        },
        {
          ...req.body,
          student: studentDoc._id,
          evaluatedBy: req.user._id,
          assignedHostel: hostelId,
        },
        {
          new: true,
          runValidators: true,
        }
      ).populate("student", "name studentId class batch");

      // ✅ Step 5: Log the audit trail
      await AuditLog.log({
        model: "Marks",
        refId: updated._id,
        action: "update",
        payload: {
          changes,
          examType: updated.examType,
          examName: updated.examName,
          subject: updated.subject,
          studentId: studentDoc.studentId,
          studentName: studentDoc.name,
          oldMarks: existingMark.marksObtained,
          newMarks: updated.marksObtained,
          oldPercentage: existingMark.percentage,
          newPercentage: updated.percentage,
        },
        user: req.user._id,
        assignedHostel: hostelId,
        reason: req.body.reason || "Marks record updated",
        ip: req.ip || req.socket?.remoteAddress,
        userAgent: req.get("user-agent"),
      });

      console.log(`✅ Marks updated: ${studentDoc.name} - ${req.body.subject}`);

      res.json({ message: "Marks updated successfully", mark: updated });
    } catch (error) {
      console.error("Update marks error:", error);
      res
        .status(500)
        .json({ message: "Failed to update marks", error: error.message });
    }
  }
);

/**
 * @route   DELETE /api/marks/:id
 * @desc    Delete a mark by ID (hostel-scoped) with audit logging
 * @access  Private (Admin/Manager)
 */
router.delete(
  "/:id",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const hostelId = req.user.assignedHostel._id;

      // ✅ Step 1: Find the mark before deletion to capture its details
      const markToDelete = await Marks.findOne({
        _id: req.params.id,
        assignedHostel: hostelId,
      }).populate("student", "name studentId class batch");

      if (!markToDelete) {
        return res.status(404).json({ message: "Mark not found" });
      }

      // ✅ Step 2: Delete the mark
      await Marks.findOneAndDelete({
        _id: req.params.id,
        assignedHostel: hostelId,
      });

      // ✅ Step 3: Log the audit trail
      await AuditLog.log({
        model: "Marks",
        refId: markToDelete._id,
        action: "delete",
        payload: {
          deletedRecord: {
            examType: markToDelete.examType,
            examName: markToDelete.examName,
            subject: markToDelete.subject,
            marksObtained: markToDelete.marksObtained,
            totalMarks: markToDelete.totalMarks,
            percentage: markToDelete.percentage,
            grade: markToDelete.grade,
            examDate: markToDelete.examDate,
            academicYear: markToDelete.academicYear,
            studentId: markToDelete.student.studentId,
            studentName: markToDelete.student.name,
            class: markToDelete.student.class,
            batch: markToDelete.student.batch,
          },
        },
        user: req.user._id,
        assignedHostel: hostelId,
        reason: req.body.reason || req.query.reason || "Marks record deleted",
        ip: req.ip || req.socket?.remoteAddress,
        userAgent: req.get("user-agent"),
      });

      console.log(
        `✅ Marks deleted: ${req.params.id} - ${markToDelete.student.name}`
      );

      res.json({
        message: "Mark deleted successfully",
        deletedMark: {
          id: markToDelete._id,
          student: markToDelete.student.name,
          subject: markToDelete.subject,
          examName: markToDelete.examName,
        },
      });
    } catch (error) {
      console.error("Delete mark error:", error);
      res
        .status(500)
        .json({ message: "Failed to delete mark", error: error.message });
    }
  }
);

module.exports = router;
