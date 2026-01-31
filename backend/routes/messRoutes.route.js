// server/routes/messRoutes.js
const express = require("express");
const MessAttendance = require("../models/messAttendance.model");
const MealPlan = require("../models/mealPlan.model");
const MessOff = require("../models/messOff.model");
const GuestMeal = require("../models/guestMeal.model");
const MessSettings = require("../models/messSettings.model");
const Student = require("../models/student.model");
const LeaveApplication = require("../models/leaveApplication.model");
const Attendance = require("../models/attendance.model");
const { authenticateToken, authorizeAdminOrManager } = require("../middlewares/auth");

const router = express.Router();
router.use(authenticateToken, authorizeAdminOrManager);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get current meal based on time
 * @param {Object} settings - Mess settings with mealTimings
 * @returns {string|null} - "breakfast", "lunch", "dinner", or null
 */
const getCurrentMeal = (settings = null) => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;

  // Default timings if no settings provided
  const timings = settings?.mealTimings || {
    breakfast: { start: "07:00", end: "09:00" },
    lunch: { start: "12:00", end: "14:00" },
    dinner: { start: "19:00", end: "21:00" },
  };

  // Check each meal
  if (currentTime >= timings.breakfast.start && currentTime <= timings.breakfast.end) {
    return "breakfast";
  }
  if (currentTime >= timings.lunch.start && currentTime <= timings.lunch.end) {
    return "lunch";
  }
  if (currentTime >= timings.dinner.start && currentTime <= timings.dinner.end) {
    return "dinner";
  }

  return null;
};

/**
 * Check if student is on approved leave for a specific date
 * @param {string} studentId - Student ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Object|null} - Leave details or null
 */
const checkLeaveStatus = async (studentId, date) => {
  const activeLeave = await LeaveApplication.findOne({
    student: studentId,
    status: "approved",
    fromDate: { $lte: date },
    $or: [
      { earlyReturn: false, toDate: { $gte: date } },
      { earlyReturn: true, actualReturnDate: { $gt: date } },
    ],
  })
    .populate("student", "name rollNumber")
    .lean();

  return activeLeave;
};

// ============================================
// DAILY MARKING ROUTES
// ============================================

/**
 * GET /api/mess/daily
 * Query: date=YYYY-MM-DD, mealType=breakfast, block=A
 * Get daily mess attendance for a specific meal
 */
router.get("/daily", authenticateToken, async (req, res) => {
  try {
    const { date, mealType, block } = req.query;
    const hostelId = req.user.assignedHostel._id;

    if (!date || !mealType) {
      return res.status(400).json({
        success: false,
        message: "date and mealType are required",
      });
    }

    const studentQuery = { status: "active", assignedHostel: hostelId };
    if (block && block !== "") {
      studentQuery.hostelBlock = block;
    }

    const students = await Student.find(studentQuery)
      .select("_id studentId name rollNumber batch hostelBlock")
      .lean();

    if (students.length === 0) {
      return res.json({
        success: true,
        date,
        mealType,
        data: [],
        summary: {
          total: 0,
          eligible: 0,
          present: 0,
          absent: 0,
          onLeave: 0,
          noMealPlan: 0,
        },
      });
    }

    const studentIds = students.map((s) => s._id);

    const [mealPlans, attendanceRecords, studentsOnLeave] = await Promise.all([
      MealPlan.find({
        student: { $in: studentIds },
        active: true,
      }).lean(),

      MessAttendance.find({
        student: { $in: studentIds },
        date,
        mealType,
        assignedHostel: hostelId,
      }).lean(),

      LeaveApplication.find({
        student: { $in: studentIds },
        status: "approved",
        fromDate: { $lte: date },
        $or: [
          { earlyReturn: false, toDate: { $gte: date } },
          { earlyReturn: true, actualReturnDate: { $gt: date } },
        ],
      })
        .select("student leaveType fromDate toDate actualReturnDate earlyReturn reason")
        .lean(),
    ]);

    const planMap = new Map();
    mealPlans.forEach((plan) => {
      planMap.set(plan.student.toString(), plan);
    });

    const attendanceMap = new Map();
    attendanceRecords.forEach((rec) => {
      attendanceMap.set(rec.student.toString(), rec);
    });

    const leaveMap = new Map();
    studentsOnLeave.forEach((leave) => {
      leaveMap.set(leave.student.toString(), leave);
    });

    const data = students.map((student) => {
      const studentId = student._id.toString();
      const plan = planMap.get(studentId);
      const attendance = attendanceMap.get(studentId);
      const leaveDetails = leaveMap.get(studentId);
      const isOnLeave = !!leaveDetails;

      const hasMealPlan = !!plan;
      const eligible = hasMealPlan && !isOnLeave;

      return {
        _id: student._id,
        studentId: student.studentId,
        name: student.name,
        rollNumber: student.rollNumber,
        block: student.hostelBlock,
        batch: student.batch || "N/A",
        planType: plan ? plan.planType : null,
        hasMealPlan,
        eligible,
        isOnLeave,
        leaveDetails: isOnLeave
          ? {
            leaveType: leaveDetails.leaveType,
            fromDate: leaveDetails.fromDate,
            toDate: leaveDetails.toDate,
            actualReturnDate: leaveDetails.actualReturnDate,
            earlyReturn: leaveDetails.earlyReturn,
            reason: leaveDetails.reason,
          }
          : null,
        status: attendance?.status || null,
        markedAt: attendance?.timestamp || null,
        markedBy: attendance?.markedBy || null,
      };
    });

    const summary = {
      total: data.length,
      eligible: data.filter((d) => d.eligible).length,
      present: data.filter((d) => d.status === "present").length,
      absent: data.filter((d) => d.status === "absent").length,
      onLeave: data.filter((d) => d.isOnLeave).length,
      noMealPlan: data.filter((d) => !d.hasMealPlan).length,
    };

    return res.json({
      success: true,
      date,
      mealType,
      data,
      summary,
    });
  } catch (err) {
    console.error("GET /mess/daily error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * POST /api/mess/mark
 * Body: { studentId, date, mealType, status, notes? }
 * Mark single student for a meal
 */
router.post("/mark", authenticateToken, async (req, res) => {
  try {
    const { studentId, date, mealType, status, notes } = req.body;
    const userId = req.user._id || req.user.id;
    const hostelId = req.user.assignedHostel._id;

    if (!studentId || !date || !mealType || !status) {
      return res.status(400).json({
        success: false,
        message: "studentId, date, mealType, and status are required",
      });
    }

    if (!["breakfast", "lunch", "dinner"].includes(mealType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid meal type",
      });
    }

    if (!["present", "absent"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status must be present or absent",
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const activeLeave = await checkLeaveStatus(studentId, date);
    if (activeLeave) {
      return res.status(400).json({
        success: false,
        message: `Cannot mark mess attendance. ${student.name} is on ${activeLeave.leaveType
          } leave from ${activeLeave.fromDate} to ${activeLeave.earlyReturn
            ? activeLeave.actualReturnDate
            : activeLeave.toDate
          }.`,
        onLeave: true,
        leaveDetails: {
          _id: activeLeave._id,
          leaveType: activeLeave.leaveType,
          fromDate: activeLeave.fromDate,
          toDate: activeLeave.toDate,
          actualReturnDate: activeLeave.actualReturnDate,
          earlyReturn: activeLeave.earlyReturn,
          reason: activeLeave.reason,
        },
      });
    }

    const isOnMessOff = await MessOff.isActiveForDate(studentId, date);
    if (isOnMessOff && status === "present") {
      return res.status(400).json({
        success: false,
        message: `${student.name} is on mess-off for this date`,
        onMessOff: true,
      });
    }

    const attendance = await MessAttendance.findOneAndUpdate(
      { student: studentId, date, mealType, assignedHostel: hostelId },
      {
        student: studentId,
        date,
        mealType,
        assignedHostel: hostelId,
        status: isOnMessOff ? "on_mess_off" : status,
        timestamp: new Date(),
        source: "manual",
        markedBy: userId,
        notes: notes || "",
      },
      { upsert: true, new: true }
    ).populate("student", "name rollNumber block");

    console.log(
      `✅ Mess attendance marked: ${student.name} - ${mealType} - ${status}`
    );

    return res.status(201).json({
      success: true,
      attendance,
      message: `${student.name} marked ${status} for ${mealType}`,
    });
  } catch (err) {
    console.error("POST /mess/mark error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * POST /api/mess/bulk-mark
 * Body: { date, mealType, studentIds: [], status }
 * Mark multiple students at once
 */
router.post("/bulk-mark", authenticateToken, async (req, res) => {
  try {
    const { date, mealType, studentIds, status } = req.body;
    const userId = req.user._id || req.user.id;
    const hostelId = req.user.assignedHostel._id;

    if (!date || !mealType || !studentIds || !status) {
      return res.status(400).json({
        success: false,
        message: "date, mealType, studentIds array, and status are required",
      });
    }

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "studentIds must be a non-empty array",
      });
    }

    const results = [];
    const errors = [];
    const skippedOnLeave = [];

    for (const studentId of studentIds) {
      try {
        const activeLeave = await checkLeaveStatus(studentId, date);
        if (activeLeave) {
          const student = await Student.findById(studentId).select(
            "name rollNumber"
          );
          skippedOnLeave.push({
            studentId,
            studentName: student?.name || "Unknown",
            rollNumber: student?.rollNumber || "N/A",
            reason: `On ${activeLeave.leaveType} leave till ${activeLeave.earlyReturn
              ? activeLeave.actualReturnDate
              : activeLeave.toDate
              }`,
          });
          continue;
        }

        const isOnMessOff = await MessOff.isActiveForDate(studentId, date);

        const attendance = await MessAttendance.findOneAndUpdate(
          { student: studentId, date, mealType, assignedHostel: hostelId },
          {
            student: studentId,
            date,
            mealType,
            assignedHostel: hostelId,
            status: isOnMessOff ? "on_mess_off" : status,
            timestamp: new Date(),
            source: "manual",
            markedBy: userId,
          },
          { upsert: true, new: true }
        );

        results.push(attendance);
      } catch (err) {
        errors.push({ studentId, error: err.message });
      }
    }

    console.log(
      `✅ Bulk marked: ${results.length} students for ${mealType} on ${date}${skippedOnLeave.length > 0
        ? ` (${skippedOnLeave.length} skipped - on leave)`
        : ""
      }`
    );

    return res.status(201).json({
      success: true,
      message: `Marked ${results.length} students${skippedOnLeave.length > 0
        ? `, skipped ${skippedOnLeave.length} (on leave)`
        : ""
        }`,
      marked: results.length,
      skippedOnLeave: skippedOnLeave.length,
      skippedOnLeaveDetails: skippedOnLeave,
      errors: errors.length,
      errorDetails: errors,
    });
  } catch (err) {
    console.error("POST /mess/bulk-mark error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * POST /api/mess/auto-mark
 * Body: { date, mealType }
 * Manually trigger auto-mark absent for a specific meal
 */
router.post("/auto-mark", authenticateToken, async (req, res) => {
  try {
    const { date, mealType } = req.body;

    if (!date || !mealType) {
      return res.status(400).json({
        success: false,
        message: "date and mealType are required",
      });
    }

    if (!["breakfast", "lunch", "dinner"].includes(mealType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid meal type",
      });
    }

    const messAutoMarkService = require("../cron/messAutoMarkService");
    const result = await messAutoMarkService.autoMarkAbsentForMeal(
      date,
      mealType
    );

    return res.json({
      success: true,
      result,
      message: `Auto-marked ${result.marked} students absent for ${mealType}`,
    });
  } catch (err) {
    console.error("POST /mess/auto-mark error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
// ============================================
// BIOMETRIC ATTENDANCE ROUTES
// ============================================

/**
 * POST /api/mess/biometric/mark
 * Body: { deviceId, studentId, timestamp }
 * Mark attendance via biometric device
 */
router.post("/biometric/mark", async (req, res) => {
  try {
    const { deviceId, studentId, timestamp } = req.body;

    if (!deviceId || !studentId) {
      return res.status(400).json({
        success: false,
        message: "deviceId and studentId are required",
      });
    }

    const student = await Student.findById(studentId)
      .select("_id name rollNumber block assignedHostel");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const now = timestamp ? new Date(timestamp) : new Date();
    const date = now.toISOString().slice(0, 10);
    const hostelId = student.assignedHostel;
    const settings = await MessSettings.findOne({ assignedHostel: hostelId });
    const currentMeal = getCurrentMeal(settings);

    if (!currentMeal) {
      return res.status(400).json({
        success: false,
        message: "Not during any meal time. Cannot mark attendance.",
        currentTime: now.toLocaleTimeString("en-IN"),
      });
    }

    const activeLeave = await checkLeaveStatus(studentId, date);
    if (activeLeave) {
      return res.status(400).json({
        success: false,
        message: `Student is on ${activeLeave.leaveType} leave. Cannot mark attendance.`,
        onLeave: true,
        leaveDetails: {
          leaveType: activeLeave.leaveType,
          fromDate: activeLeave.fromDate,
          toDate: activeLeave.toDate,
        },
      });
    }

    const isOnMessOff = await MessOff.isActiveForDate(studentId, date);
    if (isOnMessOff) {
      return res.status(400).json({
        success: false,
        message: "Student is on mess-off. Cannot mark attendance.",
        onMessOff: true,
      });
    }

    const existingAttendance = await MessAttendance.findOne({
      student: studentId,
      date,
      mealType: currentMeal,
      assignedHostel: hostelId,
    });

    if (existingAttendance && existingAttendance.status === "present") {
      return res.status(400).json({
        success: false,
        message: `Already marked present for ${currentMeal}`,
        alreadyMarked: true,
        markedAt: existingAttendance.timestamp,
      });
    }

    const attendance = await MessAttendance.findOneAndUpdate(
      { student: studentId, date, mealType: currentMeal, assignedHostel: hostelId },
      {
        student: studentId,
        date,
        mealType: currentMeal,
        assignedHostel: hostelId,
        status: "present",
        timestamp: now,
        source: "biometric",
        deviceId: deviceId,
      },
      { upsert: true, new: true }
    ).populate("student", "name rollNumber block");

    console.log(
      `✅ Biometric attendance: ${student.name} - ${currentMeal} - ${date}`
    );

    return res.status(201).json({
      success: true,
      attendance,
      message: `${student.name} marked present for ${currentMeal}`,
      student: {
        name: student.name,
        rollNumber: student.rollNumber,
        block: student.block,
      },
      meal: currentMeal,
      time: now.toLocaleTimeString("en-IN"),
    });
  } catch (err) {
    console.error("POST /mess/biometric/mark error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * POST /api/mess/biometric/verify
 * Body: { studentId }
 * Verify if student can mark biometric attendance
 */
router.post("/biometric/verify", async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "studentId is required",
      });
    }

    const student = await Student.findById(studentId)
      .select("_id name rollNumber block assignedHostel");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const hostelId = student.assignedHostel;
    const settings = await MessSettings.findOne({ assignedHostel: hostelId });
    const currentMeal = getCurrentMeal(settings);

    if (!currentMeal) {
      return res.status(400).json({
        success: false,
        canMark: false,
        message: "Not during any meal time",
        currentTime: now.toLocaleTimeString("en-IN"),
      });
    }

    const mealPlan = await MealPlan.findOne({
      student: studentId,
      active: true,
    });

    if (!mealPlan) {
      return res.status(400).json({
        success: false,
        canMark: false,
        message: "Student does not have an active meal plan",
      });
    }

    const activeLeave = await checkLeaveStatus(studentId, date);
    if (activeLeave) {
      return res.json({
        success: true,
        canMark: false,
        message: `Student is on ${activeLeave.leaveType} leave`,
        reason: "on_leave",
        leaveDetails: {
          leaveType: activeLeave.leaveType,
          fromDate: activeLeave.fromDate,
          toDate: activeLeave.toDate,
        },
      });
    }

    const isOnMessOff = await MessOff.isActiveForDate(studentId, date);
    if (isOnMessOff) {
      return res.json({
        success: true,
        canMark: false,
        message: "Student is on mess-off",
        reason: "on_mess_off",
      });
    }

    const existingAttendance = await MessAttendance.findOne({
      student: studentId,
      date,
      mealType: currentMeal,
      assignedHostel: hostelId,
    });

    if (existingAttendance && existingAttendance.status === "present") {
      return res.json({
        success: true,
        canMark: false,
        message: `Already marked present for ${currentMeal}`,
        reason: "already_marked",
        markedAt: existingAttendance.timestamp,
      });
    }

    return res.json({
      success: true,
      canMark: true,
      message: "Student can mark attendance",
      student: {
        name: student.name,
        rollNumber: student.rollNumber,
        block: student.block,
        photo: student.documents?.photo?.url || null,
      },
      meal: currentMeal,
      currentTime: now.toLocaleTimeString("en-IN"),
    });
  } catch (err) {
    console.error("POST /mess/biometric/verify error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * GET /api/mess/biometric/recent
 * Query: limit=10
 * Get recent biometric attendance records
 */
router.get("/biometric/recent", authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const hostelId = req.user.assignedHostel._id;

    const records = await MessAttendance.find({
      source: "biometric",
      assignedHostel: hostelId,
    })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate("student", "name rollNumber block");

    return res.json({
      success: true,
      records,
      total: records.length,
    });
  } catch (err) {
    console.error("GET /mess/biometric/recent error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ============================================
// MESS-OFF ROUTES
// ============================================

/**
 * GET /api/mess/mess-off
 * Query: status=pending
 * Get mess-off applications
 */
router.get("/mess-off", authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    const hostelId = req.user.assignedHostel._id;

    const query = {
      assignedHostel: hostelId,
    };

    if (status && status !== "") {
      query.status = status;
    }

    const applications = await MessOff.find(query)
      .populate("student", "name rollNumber studentId batch")
      .populate("appliedBy", "name email")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      applications,
    });
  } catch (err) {
    console.error("GET /mess-off error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * POST /api/mess/mess-off
 * Body: { student, fromDate, toDate, reason }
 * Create mess-off application
 */
router.post("/mess-off", authenticateToken, async (req, res) => {
  try {
    const { student, fromDate, toDate, reason } = req.body;
    const hostelId = req.user.assignedHostel._id;
    const userId = req.user._id;

    if (!student || !fromDate || !toDate || !reason) {
      return res.status(400).json({
        success: false,
        message: "student, fromDate, toDate, and reason are required",
      });
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);

    if (from > to) {
      return res.status(400).json({
        success: false,
        message: "fromDate must be before toDate",
      });
    }

    const settings = await MessSettings.findOne({ assignedHostel: hostelId });
    const minDays = settings?.messOffMinDays || 2;
    const diffDays = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays < minDays) {
      return res.status(400).json({
        success: false,
        message: `Mess-off must be for at least ${minDays} days`,
      });
    }

    const studentDoc = await Student.findById(student);
    if (!studentDoc) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const hasOverlap = await MessOff.hasOverlap(student, fromDate, toDate);
    if (hasOverlap) {
      return res.status(400).json({
        success: false,
        message: "Student already has a mess-off application for overlapping dates",
      });
    }

    const messOff = await MessOff.create({
      student,
      fromDate,
      toDate,
      reason,
      status: "pending",
      assignedHostel: hostelId,
      appliedBy: userId,
    });

    const populated = await MessOff.findById(messOff._id)
      .populate("student", "name rollNumber studentId batch")
      .populate("appliedBy", "name email")
      .lean();

    console.log(
      `✅ Mess-off application created for ${studentDoc.name} (${fromDate} to ${toDate})`
    );

    return res.status(201).json({
      success: true,
      messOff: populated,
      message: "Mess-off application created successfully",
    });
  } catch (err) {
    console.error("POST /mess-off error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * PUT /api/mess/mess-off/:id
 * Body: { status, rejectionReason? }
 * Update mess-off application status
 */
router.put("/mess-off/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    const hostelId = req.user.assignedHostel._id;
    const userId = req.user._id;

    if (!["approved", "rejected", "cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status must be 'approved', 'rejected', or 'cancelled'",
      });
    }

    const messOff = await MessOff.findOne({
      _id: id,
      assignedHostel: hostelId,
    });

    if (!messOff) {
      return res.status(404).json({
        success: false,
        message: "Mess-off application not found",
      });
    }

    messOff.status = status;
    messOff.processedBy = userId;
    messOff.processedAt = new Date();

    if (status === "approved") {
      messOff.approvedBy = userId;
      messOff.approvedAt = new Date();
    }

    if (status === "rejected" && rejectionReason) {
      messOff.rejectionReason = rejectionReason;
    }

    await messOff.save();

    const populated = await MessOff.findById(messOff._id)
      .populate("student", "name rollNumber studentId batch")
      .populate("appliedBy", "name email")
      .populate("approvedBy", "name email")
      .lean();

    return res.json({
      success: true,
      messOff: populated,
      message: `Mess-off application ${status}`,
    });
  } catch (err) {
    console.error("PUT /mess-off error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * PATCH /api/mess/mess-off/:id/early-return
 * Body: { actualReturnDate }
 * Mark early return for mess-off
 */
router.patch("/mess-off/:id/early-return", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { actualReturnDate } = req.body;
    const hostelId = req.user.assignedHostel._id;

    if (!actualReturnDate) {
      return res.status(400).json({
        success: false,
        message: "actualReturnDate is required",
      });
    }

    const messOff = await MessOff.findOne({
      _id: id,
      assignedHostel: hostelId,
      status: "approved",
    });

    if (!messOff) {
      return res.status(404).json({
        success: false,
        message: "Approved mess-off application not found",
      });
    }

    messOff.earlyReturn = true;
    messOff.actualReturnDate = actualReturnDate;
    await messOff.save();

    const populated = await MessOff.findById(messOff._id)
      .populate("student", "name rollNumber studentId batch")
      .lean();

    return res.json({
      success: true,
      messOff: populated,
      message: "Early return marked successfully",
    });
  } catch (err) {
    console.error("PATCH /mess-off early-return error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * DELETE /api/mess/mess-off/:id
 * Delete/Cancel mess-off application
 */
router.delete("/mess-off/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const hostelId = req.user.assignedHostel._id;

    const messOff = await MessOff.findOne({
      _id: id,
      assignedHostel: hostelId,
      status: "pending",
    });

    if (!messOff) {
      return res.status(404).json({
        success: false,
        message: "Pending mess-off application not found",
      });
    }

    messOff.status = "cancelled";
    await messOff.save();

    return res.json({
      success: true,
      message: "Mess-off application cancelled successfully",
    });
  } catch (err) {
    console.error("DELETE /mess-off error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
// ============================================
// GUEST MEAL ROUTES (✅ FIXED)
// ============================================

/**
 * GET /api/mess/guests
 * Query: date=YYYY-MM-DD, hostedBy=studentId, month=YYYY-MM
 * Get guest meal records
 */
router.get("/guests", authenticateToken, async (req, res) => {
  try {
    const { date, hostedBy, month } = req.query;
    const hostelId = req.user.assignedHostel._id; // ✅ FIXED

    const query = {
      assignedHostel: hostelId, // ✅ FIXED
    };

    if (date) {
      query.date = date;
    } else if (month) {
      const startDate = `${month}-01`;
      const endDate = `${month}-31`;
      query.date = { $gte: startDate, $lte: endDate };
    }

    if (hostedBy) {
      query.hostedBy = hostedBy;
    }

    const guests = await GuestMeal.find(query)
      .populate("hostedBy", "name rollNumber block")
      .populate("markedBy", "name email")
      .sort({ date: -1, createdAt: -1 });

    return res.json({
      success: true,
      guests,
      total: guests.length,
    });
  } catch (err) {
    console.error("GET /mess/guests error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * POST /api/mess/guests
 * Body: { guestName, purpose, date, mealType, hostedBy, charge?, notes? }
 * Add guest meal entry
 */
router.post("/guests", authenticateToken, async (req, res) => {
  try {
    const { guestName, purpose, date, mealType, hostedBy, charge, notes } =
      req.body;
    const userId = req.user._id || req.user.id;
    const hostelId = req.user.assignedHostel._id; // ✅ FIXED

    if (!guestName || !date || !mealType || !hostedBy) {
      return res.status(400).json({
        success: false,
        message: "guestName, date, mealType, and hostedBy are required",
      });
    }

    // Get default guest charge from settings
    const settings = await MessSettings.findOne({ assignedHostel: hostelId }); // ✅ FIXED
    const defaultCharge = settings?.guestMealCharge || 100;

    const guest = await GuestMeal.create({
      guestName,
      purpose: purpose || "",
      date,
      mealType,
      hostedBy,
      charge: charge || defaultCharge,
      markedBy: userId,
      assignedHostel: hostelId, // ✅ FIXED - ADDED
      notes: notes || "",
      paymentStatus: "pending",
    });

    const populated = await GuestMeal.findById(guest._id).populate(
      "hostedBy",
      "name rollNumber block"
    );

    console.log(`✅ Guest meal added: ${guestName} - ${mealType} on ${date}`);

    return res.status(201).json({
      success: true,
      guest: populated,
      message: "Guest meal recorded successfully",
    });
  } catch (err) {
    console.error("POST /mess/guests error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * DELETE /api/mess/guests/:id
 * Delete guest meal record
 */
router.delete("/guests/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const guest = await GuestMeal.findByIdAndDelete(id);
    if (!guest) {
      return res.status(404).json({
        success: false,
        message: "Guest meal record not found",
      });
    }

    return res.json({
      success: true,
      message: "Guest meal record deleted",
    });
  } catch (err) {
    console.error("DELETE /mess/guests/:id error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ============================================
// REPORTS ROUTES (✅ FIXED)
// ============================================

/**
 * GET /api/mess/report/daily-summary
 * Query: date=YYYY-MM-DD
 * Get daily summary for all meals
 */
router.get("/report/daily-summary", authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const hostelId = req.user.assignedHostel._id;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date query parameter is required",
      });
    }

    const meals = ["breakfast", "lunch", "dinner"];
    const summary = {};

    for (const mealType of meals) {
      const records = await MessAttendance.find({
        date,
        mealType,
        assignedHostel: hostelId,
      });

      summary[mealType] = {
        total: records.length,
        present: records.filter((r) => r.status === "present").length,
        absent: records.filter((r) => r.status === "absent").length,
        onMessOff: records.filter((r) => r.status === "on_mess_off").length,
      };
    }

    const guestMeals = await GuestMeal.find({
      date,
      assignedHostel: hostelId // ✅ FIXED
    });

    return res.json({
      success: true,
      date,
      summary,
      guestMeals: guestMeals.length,
      guestDetails: guestMeals,
    });
  } catch (err) {
    console.error("GET /mess/report/daily-summary error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * GET /api/mess/report/monthly
 * Query: month=YYYY-MM, studentId?
 * Get monthly report (student-wise meal consumption)
 */
router.get("/report/monthly", authenticateToken, async (req, res) => {
  try {
    const { month, studentId } = req.query;
    const hostelId = req.user.assignedHostel._id;

    if (!month) {
      return res.status(400).json({
        success: false,
        message: "month query parameter is required (YYYY-MM)",
      });
    }

    // Calculate date range
    const startDate = `${month}-01`;
    const year = parseInt(month.split("-")[0]);
    const monthNum = parseInt(month.split("-")[1]);
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${month}-${lastDay}`;

    // Build query
    const query = {
      date: { $gte: startDate, $lte: endDate },
      assignedHostel: hostelId,
    };

    if (studentId) {
      query.student = studentId;
    }

    // Get all attendance records
    const records = await MessAttendance.find(query).populate(
      "student",
      "name rollNumber block"
    );

    // Get all active students from THIS hostel
    const studentQuery = studentId
      ? { _id: studentId, assignedHostel: hostelId } // ✅ FIXED
      : { status: "active", assignedHostel: hostelId }; // ✅ FIXED
    const students = await Student.find(studentQuery);

    // Get guest meals for students
    const guestMeals = await GuestMeal.find({
      date: { $gte: startDate, $lte: endDate },
      hostedBy: { $in: students.map((s) => s._id) },
    });

    // Group records by student
    const studentMap = new Map();

    students.forEach((student) => {
      studentMap.set(student._id.toString(), {
        studentId: student.studentId || "",
        studentName: student.name,
        rollNumber: student.rollNumber,
        batch: student.batch || "",
        block: student.block || "",
        planType: "full",
        meals: {
          breakfast: { present: 0, absent: 0, total: 0 },
          lunch: { present: 0, absent: 0, total: 0 },
          dinner: { present: 0, absent: 0, total: 0 },
        },
        guestMeals: 0,
        guestCharges: 0,
      });
    });

    // Count attendance
    records.forEach((record) => {
      const studentId = record.student._id.toString();
      const data = studentMap.get(studentId);

      if (data && data.meals[record.mealType]) {
        const mealData = data.meals[record.mealType];
        mealData.total++;

        if (record.status === "present") {
          mealData.present++;
        } else if (record.status === "absent") {
          mealData.absent++;
        }
      }
    });

    // Count guest meals
    guestMeals.forEach((guest) => {
      const studentId = guest.hostedBy.toString();
      const data = studentMap.get(studentId);

      if (data) {
        data.guestMeals++;
        data.guestCharges += guest.charge;
      }
    });

    const report = Array.from(studentMap.values());

    return res.json({
      success: true,
      month,
      report,
      total: report.length,
    });
  } catch (err) {
    console.error("GET /mess/report/monthly error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * GET /api/mess/report/student/:id
 * Query: from=YYYY-MM-DD, to=YYYY-MM-DD
 * Get student mess history
 */
router.get("/report/student/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;
    const hostelId = req.user.assignedHostel._id;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "from and to query parameters are required",
      });
    }

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const records = await MessAttendance.find({
      student: id,
      date: { $gte: from, $lte: to },
      assignedHostel: hostelId,
    }).sort({ date: 1, mealType: 1 });

    const guestMeals = await GuestMeal.find({
      hostedBy: id,
      date: { $gte: from, $lte: to },
      assignedHostel: hostelId,
    }).sort({ date: 1 });

    const summary = {
      breakfast: { present: 0, absent: 0 },
      lunch: { present: 0, absent: 0 },
      dinner: { present: 0, absent: 0 },
    };

    records.forEach((record) => {
      if (record.status === "present") {
        summary[record.mealType].present++;
      } else if (record.status === "absent") {
        summary[record.mealType].absent++;
      }
    });

    return res.json({
      success: true,
      student: {
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        block: student.block,
      },
      from,
      to,
      records,
      guestMeals,
      summary,
    });
  } catch (err) {
    console.error("GET /mess/report/student/:id error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * GET /api/mess/report/expense
 * Query: month=YYYY-MM
 * Get monthly mess expense report
 */
router.get("/report/expense", authenticateToken, async (req, res) => {
  try {
    const { month } = req.query;
    const hostelId = req.user.assignedHostel._id;

    if (!month) {
      return res.status(400).json({
        success: false,
        message: "month query parameter is required (YYYY-MM)",
      });
    }

    const startDate = `${month}-01`;
    const year = parseInt(month.split("-")[0]);
    const monthNum = parseInt(month.split("-")[1]);
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${month}-${lastDay}`;

    const settings = await MessSettings.findOne({ assignedHostel: hostelId });
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "Mess settings not found",
      });
    }

    const records = await MessAttendance.find({
      date: { $gte: startDate, $lte: endDate },
      status: "present",
      assignedHostel: hostelId,
    });

    const guestMeals = await GuestMeal.find({
      date: { $gte: startDate, $lte: endDate },
      assignedHostel: hostelId,
    });

    const mealCounts = {
      breakfast: records.filter((r) => r.mealType === "breakfast").length,
      lunch: records.filter((r) => r.mealType === "lunch").length,
      dinner: records.filter((r) => r.mealType === "dinner").length,
    };

    const guestCharges = guestMeals.reduce(
      (sum, guest) => sum + guest.charge,
      0
    );

    const totalMealCost = settings.monthlyCharge || 0;

    return res.json({
      success: true,
      month,
      mealCounts,
      guestMealCount: guestMeals.length,
      guestCharges,
      totalMealCost,
      settings: {
        monthlyCharge: settings.monthlyCharge,
        guestMealCharge: settings.guestMealCharge,
      },
    });
  } catch (err) {
    console.error("GET /mess/report/expense error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ============================================
// SETTINGS ROUTES (✅ MISSING - ADD THIS)
// ============================================

/**
 * GET /api/mess/settings
 * Get mess settings for the hostel
 */
router.get("/settings", authenticateToken, async (req, res) => {
  try {
    const hostelId = req.user.assignedHostel._id;

    let settings = await MessSettings.findOne({ assignedHostel: hostelId });

    // If no settings exist, create default settings
    if (!settings) {
      settings = await MessSettings.create({
        assignedHostel: hostelId,
        mealTimings: {
          breakfast: { start: "07:00", end: "09:00" },
          lunch: { start: "12:00", end: "14:00" },
          dinner: { start: "19:00", end: "21:00" },
        },
        monthlyCharge: 3000,
        guestMealCharge: 100,
        messOffMinDays: 2,
        messOffMaxDays: 30,
        autoMarkAbsent: true,
        autoMarkTime: {
          breakfast: "09:30",
          lunch: "14:30",
          dinner: "21:30",
        },
      });
    }

    return res.json({
      success: true,
      settings,
    });
  } catch (err) {
    console.error("GET /mess/settings error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * PUT /api/mess/settings
 * Update mess settings
 */
router.put("/settings", authenticateToken, async (req, res) => {
  try {
    const hostelId = req.user.assignedHostel._id;
    const updateData = req.body;

    // Validate meal timings if provided
    if (updateData.mealTimings) {
      const { breakfast, lunch, dinner } = updateData.mealTimings;

      if (breakfast && (!breakfast.start || !breakfast.end)) {
        return res.status(400).json({
          success: false,
          message: "Breakfast start and end times are required",
        });
      }
      if (lunch && (!lunch.start || !lunch.end)) {
        return res.status(400).json({
          success: false,
          message: "Lunch start and end times are required",
        });
      }
      if (dinner && (!dinner.start || !dinner.end)) {
        return res.status(400).json({
          success: false,
          message: "Dinner start and end times are required",
        });
      }
    }

    const settings = await MessSettings.findOneAndUpdate(
      { assignedHostel: hostelId },
      updateData,
      { new: true, upsert: true, runValidators: true }
    );

    console.log(`✅ Mess settings updated for hostel: ${hostelId}`);

    return res.json({
      success: true,
      settings,
      message: "Settings updated successfully",
    });
  } catch (err) {
    console.error("PUT /mess/settings error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * POST /api/mess/settings/reset
 * Reset settings to default
 */
router.post("/settings/reset", authenticateToken, async (req, res) => {
  try {
    const hostelId = req.user.assignedHostel._id;

    const defaultSettings = {
      assignedHostel: hostelId,
      mealTimings: {
        breakfast: { start: "07:00", end: "09:00" },
        lunch: { start: "12:00", end: "14:00" },
        dinner: { start: "19:00", end: "21:00" },
      },
      monthlyCharge: 3000,
      guestMealCharge: 100,
      messOffMinDays: 2,
      messOffMaxDays: 30,
      autoMarkAbsent: true,
      autoMarkTime: {
        breakfast: "09:30",
        lunch: "14:30",
        dinner: "21:30",
      },
    };

    const settings = await MessSettings.findOneAndUpdate(
      { assignedHostel: hostelId },
      defaultSettings,
      { new: true, upsert: true }
    );

    console.log(`✅ Mess settings reset to default for hostel: ${hostelId}`);

    return res.json({
      success: true,
      settings,
      message: "Settings reset to default successfully",
    });
  } catch (err) {
    console.error("POST /mess/settings/reset error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});


/**
 * GET /api/mess/history
 * Query: from=YYYY-MM-DD, to=YYYY-MM-DD, studentId?, mealType?, page=1, limit=50
 * Get mess attendance history with pagination and filters
 */
router.get("/history", authenticateToken, async (req, res) => {
  try {
    const { from, to, studentId, mealType, page = 1, limit = 50 } = req.query;
    const hostelId = req.user.assignedHostel._id;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "from and to date parameters are required (YYYY-MM-DD)",
      });
    }

    // Build query
    const query = {
      date: { $gte: from, $lte: to },
      assignedHostel: hostelId,
    };

    if (studentId && studentId !== "") {
      query.student = studentId;
    }

    if (mealType && mealType !== "") {
      query.mealType = mealType;
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const totalRecords = await MessAttendance.countDocuments(query);

    // Get paginated records
    const records = await MessAttendance.find(query)
      .populate("student", "name rollNumber studentId batch hostelBlock")
      .populate("markedBy", "name email")
      .sort({ date: -1, mealType: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Calculate summary statistics
    const summary = {
      total: totalRecords,
      present: await MessAttendance.countDocuments({ ...query, status: "present" }),
      absent: await MessAttendance.countDocuments({ ...query, status: "absent" }),
      onMessOff: await MessAttendance.countDocuments({ ...query, status: "on_mess_off" }),
    };

    return res.json({
      success: true,
      from,
      to,
      records,
      summary,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limitNum),
        hasNextPage: pageNum < Math.ceil(totalRecords / limitNum),
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (err) {
    console.error("GET /mess/history error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ============================================
// EXPORT ROUTER
// ============================================

module.exports = router;

