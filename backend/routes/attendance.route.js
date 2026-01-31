// server/routes/attendanceRoutes.js
const express = require("express");
const Attendance = require("../models/attendance.model");
const BiometricLog = require("../models/biometricLog.model");
const AuditLog = require("../models/auditLog.model");
const Student = require("../models/student.model");
const LeaveApplication = require("../models/leaveApplication.model");
const AttendanceSettings = require("../models/attendanceSettings.model");
const { authenticateToken } = require("../middlewares/auth");
const { validateAttendanceEntry } = require("../utils/attendanceValidator");
const attendanceAutoMarkService = require("../cron/attendanceAutoMarkService");

const router = express.Router();

const toDateKey = (d) => d.toISOString().slice(0, 10);

const getLastEntry = async (studentId, date, hostelId) => {
  return await Attendance.findOne({
    student: studentId,
    date,
    assignedHostel: hostelId,
    deleted: { $ne: true },
  })
    .sort({ timestamp: -1 })
    .lean();
};

const updateStudentState = async (studentId, type, timestamp) => {
  await Student.findByIdAndUpdate(studentId, {
    currentHostelState: type,
    lastStateUpdate: timestamp,
  });
};

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

const determineShift = (timestamp) => {
  const hour = new Date(timestamp).getHours();
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
};

const calculateAllDaysInRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

const generateDateRange = (startDate, endDate) => {
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }

  return dates;
};

// ORDERING NOTE:
// 1) Most specific static paths
// 2) Report/export/reconciliation
// 3) Named param routes (/student/:id etc.)
// 4) Generic /:id, /bulk at the end

//  GET /api/attendance/settings
router.get("/settings", authenticateToken, async (req, res) => {
  try {
    const hostelId = req.user.assignedHostel._id;

    const settings = await AttendanceSettings.findOne({
      assignedHostel: hostelId,
    });

    return res.json({
      success: true,
      settings,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/attendance/reset-all-student-states
router.post("/reset-all-student-states", authenticateToken, async (req, res) => {
  try {
    const hostelId = req.user.assignedHostel._id;
    const userId = req.user._id;

    // Update all active students in this hostel to state "IN"
    const result = await Student.updateMany(
      {
        assignedHostel: hostelId,
        status: "active",
      },
      {
        $set: {
          currentHostelState: "IN",
          lastStateUpdate: new Date(),
        },
      }
    );

    await AuditLog.log({
      model: "Student",
      refId: null,
      action: "bulk_update",
      user: userId,
      assignedHostel: hostelId,
      payload: {
        operation: "reset_all_states_to_IN",
        count: result.modifiedCount,
      },
      reason: "Reset all student states to IN",
    });

    return res.json({
      success: true,
      message: `Updated ${result.modifiedCount} students to state IN`,
      updatedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error("Reset states error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to reset student states",
    });
  }
});

// GET /api/attendance/check-state-consistency
router.get("/check-state-consistency", authenticateToken, async (req, res) => {
  try {
    const hostelId = req.user.assignedHostel._id;

    // Get all active students with their current state
    const students = await Student.find({
      assignedHostel: hostelId,
      status: "active",
    })
      .select("_id name rollNumber block currentHostelState")
      .lean();

    if (!students || students.length === 0) {
      return res.json({
        success: true,
        issues: [],
        message: "No students found",
      });
    }

    const issues = [];

    // Check each student's last attendance record
    for (const student of students) {
      const lastAttendance = await Attendance.findOne({
        student: student._id,
        assignedHostel: hostelId,
        deleted: { $ne: true },
      })
        .sort({ timestamp: -1 })
        .select("type date timestamp")
        .lean();

      if (lastAttendance) {
        const currentState = student.currentHostelState || "IN";
        const lastType = lastAttendance.type;

        // If states don't match, record the issue
        if (currentState !== lastType) {
          issues.push({
            studentId: student._id,
            studentName: student.name,
            rollNumber: student.rollNumber,
            block: student.block,
            currentState: currentState,
            lastType: lastType,
            lastDate: lastAttendance.date,
            lastTimestamp: lastAttendance.timestamp,
          });
        }
      }
    }

    return res.json({
      success: true,
      issues,
      totalStudents: students.length,
      inconsistencies: issues.length,
      message: issues.length > 0
        ? `Found ${issues.length} inconsistencies`
        : "All states are consistent",
    });
  } catch (err) {
    console.error("Check consistency error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to check state consistency",
    });
  }
});

// GET /api/attendance/check-states
router.get("/check-states", authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const hostelId = req.user.assignedHostel._id;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date query param is required (YYYY-MM-DD)",
      });
    }

    // Get all active students for this hostel
    const students = await Student.find({
      assignedHostel: hostelId,
      status: "active",
    })
      .select("_id name rollNumber block currentHostelState lastStateUpdate")
      .lean();

    if (!students || students.length === 0) {
      return res.json({
        success: true,
        date,
        students: [],
        summary: {
          total: 0,
          inside: 0,
          outside: 0,
          onLeave: 0,
          unknown: 0,
        },
      });
    }

    // Get attendance records for this date
    const attendanceRecords = await Attendance.find({
      date,
      assignedHostel: hostelId,
      deleted: { $ne: true },
    })
      .select("student type timestamp status")
      .sort({ timestamp: -1 })
      .lean();

    // Create a map of student last entry
    const studentAttendanceMap = new Map();
    attendanceRecords.forEach((record) => {
      const studentId = record.student.toString();
      if (!studentAttendanceMap.has(studentId)) {
        studentAttendanceMap.set(studentId, record);
      }
    });

    // Check leave status for all students
    const studentIds = students.map((s) => s._id);
    const activeLeaves = await LeaveApplication.find({
      student: { $in: studentIds },
      status: "approved",
      fromDate: { $lte: date },
      $or: [
        { earlyReturn: false, toDate: { $gte: date } },
        { earlyReturn: true, actualReturnDate: { $gt: date } },
      ],
    })
      .select("student leaveType fromDate toDate")
      .lean();

    const leaveMap = new Map();
    activeLeaves.forEach((leave) => {
      leaveMap.set(leave.student.toString(), leave);
    });

    // Build response with current state for each student
    const studentsWithState = students.map((student) => {
      const studentId = student._id.toString();
      const lastAttendance = studentAttendanceMap.get(studentId);
      const leave = leaveMap.get(studentId);

      // Determine current state
      let currentState = student.currentHostelState || "UNKNOWN";
      let lastAction = null;
      let lastActionTime = student.lastStateUpdate || null;

      if (leave) {
        currentState = "ON_LEAVE";
        lastAction = "Leave";
      } else if (lastAttendance) {
        currentState = lastAttendance.type; // "IN" or "OUT"
        lastAction = lastAttendance.type;
        lastActionTime = lastAttendance.timestamp;
      }

      return {
        studentId: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        block: student.block,
        currentState,
        lastAction,
        lastActionTime,
        onLeave: !!leave,
        leaveType: leave?.leaveType || null,
      };
    });

    // Calculate summary
    const summary = {
      total: studentsWithState.length,
      inside: studentsWithState.filter((s) => s.currentState === "IN").length,
      outside: studentsWithState.filter((s) => s.currentState === "OUT").length,
      onLeave: studentsWithState.filter((s) => s.onLeave).length,
      unknown: studentsWithState.filter((s) => s.currentState === "UNKNOWN").length,
    };

    return res.json({
      success: true,
      date,
      students: studentsWithState,
      summary,
    });
  } catch (err) {
    console.error("Check states error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to check student states",
    });
  }
});

// PUT /api/attendance/settings
router.put("/settings", authenticateToken, async (req, res) => {
  try {
    const data = req.body;
    const userId = req.user._id;
    const hostelId = req.user.assignedHostel._id;

    let before = await AttendanceSettings.findOne({ assignedHostel: hostelId });
    let settings;

    if (before) {
      settings = await AttendanceSettings.findOneAndUpdate(
        { assignedHostel: hostelId },
        { ...data },
        { new: true }
      );
    } else {
      settings = await AttendanceSettings.create({
        ...data,
        assignedHostel: hostelId,
      });
    }

    await AuditLog.log({
      model: "AttendanceSettings",
      refId: settings._id,
      action: before ? "update" : "create",
      user: userId,
      assignedHostel: hostelId,
      payload: {
        before: before || null,
        after: data,
      },
      reason: "Attendance settings updated",
    });

    return res.json({ success: true, settings });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/attendance/biometric-scan
router.post("/biometric-scan", authenticateToken, async (req, res) => {
  try {
    const { rawId, deviceId, event, timestamp, studentId } = req.body;
    const hostelId = req.user.assignedHostel?._id;

    if (!hostelId) {
      return res.status(400).json({
        success: false,
        message: "User is not assigned to any hostel",
      });
    }

    if (!rawId || !deviceId) {
      return res.status(400).json({
        success: false,
        message: "rawId and deviceId are required",
      });
    }

    const ts = timestamp ? new Date(timestamp) : new Date();

    const log = await BiometricLog.create({
      rawId,
      deviceId,
      event: event || "SCAN",
      timestamp: ts,
      student: studentId || null,
      status: "success",
      assignedHostel: hostelId,
    });

    if (!studentId) {
      return res.json({
        success: true,
        message: "Biometric log saved, student not mapped",
        log,
      });
    }

    const student = await Student.findById(studentId).select(
      "_id name currentHostelState assignedHostel"
    );
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (
      !student.assignedHostel ||
      student.assignedHostel.toString() !== hostelId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Student does not belong to your hostel",
      });
    }

    const date = toDateKey(ts);

    const activeLeave = await checkLeaveStatus(studentId, date);
    if (activeLeave) {
      return res.status(400).json({
        success: false,
        message: `${student.name} is on approved leave till ${activeLeave.earlyReturn
          ? activeLeave.actualReturnDate
          : activeLeave.toDate
          }`,
        onLeave: true,
        leave: {
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

    const lastEntry = await getLastEntry(studentId, date, hostelId);

    let type = "IN";
    if (lastEntry) {
      type = lastEntry.type === "IN" ? "OUT" : "IN";
    }

    const validationIssues = await validateAttendanceEntry({
      studentId,
      type,
      date,
      timestamp: ts,
    });

    const hasErrors = validationIssues.some((i) => i.severity === "error");

    const attendance = await Attendance.create({
      student: studentId,
      assignedHostel: hostelId,
      date,
      type,
      timestamp: ts,
      entryTime: type === "IN" ? ts : lastEntry?.entryTime,
      exitTime: type === "OUT" ? ts : null,
      deviceId,
      source: "biometric",
      shift: determineShift(ts),
      status: "present",
      reconciled: !hasErrors,
      validationIssues:
        validationIssues.length > 0 ? validationIssues : undefined,
      createdBy: req.user && req.user._id,
    });

    await updateStudentState(studentId, type, ts);

    if (req.io) {
      req.io.to(`hostel-${deviceId}`).emit("scan", {
        studentId,
        type,
        timestamp: ts,
        attendanceId: attendance._id,
      });
    }

    return res.json({
      success: true,
      attendance,
      log,
      type,
      warnings: validationIssues,
      autoReconciled: !hasErrors,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/attendance/manual
router.post("/manual", authenticateToken, async (req, res) => {
  try {
    const {
      studentId,
      type,
      notes,
      shift,
      overrideLeave = false,
      leaveApplicationId,
    } = req.body;
    const userId = req.user && req.user._id;
    const hostelId = req.user.assignedHostel?._id;

    if (!studentId || !type) {
      return res.status(400).json({
        success: false,
        message: "studentId and type (IN/OUT) are required",
      });
    }

    if (!["IN", "OUT"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "type must be IN or OUT",
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();

    let settings;
    try {
      settings = await AttendanceSettings.findOne({
        assignedHostel: hostelId,
      });
    } catch (_) { }

    const student = await Student.findById(studentId).select(
      "currentHostelState name rollNumber block assignedHostel"
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (
      !student.assignedHostel ||
      student.assignedHostel.toString() !== hostelId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Student does not belong to your hostel",
      });
    }

    const activeLeave = await checkLeaveStatus(studentId, today);

    if (activeLeave && !overrideLeave) {
      return res.status(400).json({
        success: false,
        message: `${student.name} is on approved leave till ${activeLeave.earlyReturn
          ? activeLeave.actualReturnDate
          : activeLeave.toDate
          }`,
        onLeave: true,
        leave: {
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

    if (overrideLeave && leaveApplicationId) {
      await Attendance.deleteOne({
        student: studentId,
        date: today,
        source: "leave",
        leaveApplication: leaveApplicationId,
        assignedHostel: hostelId,
      });
    }

    const currentState = student.currentHostelState || "IN";
    let validationNotes = notes || "";

    if (settings?.firstEntryMustBeIn) {
      if (currentState === "OUT" && type === "OUT") {
        return res.status(400).json({
          success: false,
          message: `${student.name} is already OUT of hostel. Next entry must be IN.`,
          currentState: "OUT",
        });
      }

      if (currentState === "IN" && type === "IN") {
        validationNotes = `Duplicate IN entry - student was already IN. ${validationNotes}`;
      }
    }

    const finalShift = shift || determineShift(now);

    let status = "present";
    if (type === "OUT") {
      const hour = now.getHours();
      if (hour < 18) {
        status = "left_early";
      }
    }

    if (overrideLeave) {
      validationNotes = `Override from leave. ${validationNotes}`.trim();
    }

    const validationIssues = await validateAttendanceEntry({
      studentId,
      type,
      date: today,
      timestamp: now,
    });

    const hasErrors = validationIssues.some((i) => i.severity === "error");

    const attendance = await Attendance.create({
      student: studentId,
      assignedHostel: hostelId,
      date: today,
      type,
      timestamp: now,
      entryTime: type === "IN" ? now : null,
      exitTime: type === "OUT" ? now : null,
      source: "manual",
      shift: finalShift,
      status,
      notes: validationNotes.trim(),
      reconciled: !hasErrors,
      validationIssues:
        validationIssues.length > 0 ? validationIssues : undefined,
      createdBy: userId,
    });

    await updateStudentState(studentId, type, now);

    const populated = await Attendance.findById(attendance._id).populate(
      "student",
      "name rollNumber block"
    );

    return res.status(201).json({
      success: true,
      attendance: populated,
      message: `${student.name} marked ${type} successfully`,
      warnings: validationIssues,
      autoReconciled: !hasErrors,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});


// POST /api/attendance/bulk
router.post("/bulk", authenticateToken, async (req, res) => {
  try {
    const { date, students, notes } = req.body;
    const userId = req.user && req.user._id;
    const hostelId = req.user.assignedHostel?._id;

    if (!date || !students || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: "date and students array required",
      });
    }

    const results = [];
    const errors = [];
    const skippedOnLeave = [];

    for (const s of students) {
      try {
        const { studentId, type, status } = s;

        if (!type || !["IN", "OUT"].includes(type)) {
          errors.push({ studentId, error: "type must be IN or OUT" });
          continue;
        }

        const student = await Student.findById(studentId).select(
          "assignedHostel"
        );
        if (!student || !student.assignedHostel) {
          errors.push({
            studentId,
            error: "Student or assigned hostel not found",
          });
          continue;
        }

        if (student.assignedHostel.toString() !== hostelId.toString()) {
          errors.push({
            studentId,
            error: "Student does not belong to your hostel",
          });
          continue;
        }

        const activeLeave = await checkLeaveStatus(studentId, date);
        if (activeLeave) {
          skippedOnLeave.push({
            studentId,
            reason: `On ${activeLeave.leaveType} leave till ${activeLeave.earlyReturn
              ? activeLeave.actualReturnDate
              : activeLeave.toDate
              }`,
          });
          continue;
        }

        const lastEntry = await getLastEntry(studentId, date, hostelId);
        if (lastEntry && lastEntry.type === type) {
          errors.push({
            studentId,
            error: `Last entry was ${type}`,
          });
          continue;
        }

        const ts = new Date();

        const attendance = await Attendance.create({
          student: studentId,
          assignedHostel: hostelId,
          date,
          type,
          timestamp: ts,
          entryTime: type === "IN" ? ts : lastEntry?.entryTime,
          exitTime: type === "OUT" ? ts : null,
          source: "bulk",
          shift: determineShift(ts),
          status: status || "present",
          notes: notes || "",
          reconciled: false,
          createdBy: userId,
        });

        results.push(attendance);

        await updateStudentState(studentId, type, ts);
      } catch (err) {
        errors.push({ studentId: s.studentId, error: err.message });
      }
    }

    return res.json({
      success: true,
      inserted: results.length,
      errors,
      skippedOnLeave: skippedOnLeave.length,
      skippedOnLeaveDetails: skippedOnLeave,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/attendance  (list by date)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { date, block, page = 1, limit = 50 } = req.query;
    const hostelId = req.user.assignedHostel._id;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date query param is required",
      });
    }

    const query = {
      date,
      assignedHostel: hostelId,
      deleted: { $ne: true },
    };
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: "students",
          localField: "student",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
    ];

    if (block) {
      pipeline.push({ $match: { "student.block": block } });
    }

    pipeline.push(
      { $sort: { "student.name": 1, timestamp: 1 } },
      { $skip: skip },
      { $limit: parseInt(limit, 10) }
    );

    const [items, totalCount] = await Promise.all([
      Attendance.aggregate(pipeline),
      Attendance.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: items,
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
// GET /api/attendance/check-leave/:id
router.get("/check-leave/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query; // YYYY-MM-DD
    const checkDate = date || new Date().toISOString().slice(0, 10);

    const activeLeave = await checkLeaveStatus(id, checkDate);

    if (!activeLeave) {
      return res.json({ onLeave: false });
    }

    return res.json({
      onLeave: true,
      leave: {
        _id: activeLeave._id,
        leaveType: activeLeave.leaveType,
        fromDate: activeLeave.fromDate,
        toDate: activeLeave.toDate,
        actualReturnDate: activeLeave.actualReturnDate,
        earlyReturn: activeLeave.earlyReturn,
        reason: activeLeave.reason,
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: err.message || "Failed to check leave" });
  }
});

// GET /api/attendance/student/:id
router.get("/student/:id", authenticateToken, async (req, res) => {
  try {
    const studentId = req.params.id;
    const { from, to } = req.query;
    const hostelId = req.user.assignedHostel._id;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "from and to query params are required (YYYY-MM-DD)",
      });
    }

    const range = { $gte: from, $lte: to };

    const records = await Attendance.find({
      student: studentId,
      date: range,
      assignedHostel: hostelId,
      deleted: { $ne: true },
    })
      .sort({ date: -1, timestamp: -1 })
      .populate("createdBy", "name email")
      .populate("leaveApplication", "leaveType reason fromDate toDate")
      .lean();

    const summary = {
      totalEntries: records.length,
      totalInEntries: records.filter((r) => r.type === "IN").length,
      totalOutEntries: records.filter((r) => r.type === "OUT").length,
      onLeaveDays: records.filter((r) => r.status === "on_leave").length,
      daysWithActivity: new Set(records.map((r) => r.date)).size,
      shifts: {
        morning: records.filter((r) => r.shift === "morning").length,
        afternoon: records.filter((r) => r.shift === "afternoon").length,
        evening: records.filter((r) => r.shift === "evening").length,
        night: records.filter((r) => r.shift === "night").length,
      },
      sources: {
        biometric: records.filter((r) => r.source === "biometric").length,
        manual: records.filter((r) => r.source === "manual").length,
        bulk: records.filter((r) => r.source === "bulk").length,
        leave: records.filter((r) => r.source === "leave").length,
      },
    };

    return res.json({
      success: true,
      records,
      summary,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/attendance/student-status/:id
router.get("/student-status/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    const hostelId = req.user.assignedHostel._id;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date query param required",
      });
    }

    const activeLeave = await checkLeaveStatus(id, date);
    if (activeLeave) {
      return res.json({
        success: true,
        currentStatus: "OUT",
        nextAction: "IN",
        onLeave: true,
        leave: {
          leaveType: activeLeave.leaveType,
          fromDate: activeLeave.fromDate,
          toDate: activeLeave.toDate,
          actualReturnDate: activeLeave.actualReturnDate,
          earlyReturn: activeLeave.earlyReturn,
          reason: activeLeave.reason,
        },
        lastEntry: null,
      });
    }

    const lastEntry = await Attendance.findOne({
      student: id,
      date,
      assignedHostel: hostelId,
      deleted: { $ne: true },
    })
      .sort({ timestamp: -1 })
      .lean();

    let currentStatus = null;
    let nextAction = "IN";

    if (lastEntry) {
      currentStatus = lastEntry.type;
      nextAction = lastEntry.type === "IN" ? "OUT" : "IN";
    }

    return res.json({
      success: true,
      currentStatus,
      nextAction,
      onLeave: false,
      lastEntry: lastEntry
        ? {
          type: lastEntry.type,
          timestamp: lastEntry.timestamp,
          shift: lastEntry.shift,
        }
        : null,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/attendance/reconciliation
// GET /api/attendance/reconciliation
router.get("/reconciliation", authenticateToken, async (req, res) => {
  try {
    const { date, block, severity } = req.query;
    const hostelId = req.user.assignedHostel._id;

    if (!date) {
      return res
        .status(400)
        .json({ success: false, message: "date query param is required" });
    }

    const match = {
      date,
      assignedHostel: hostelId,
      deleted: { $ne: true },
      $or: [
        { validationIssues: { $exists: true, $ne: [] } }, // any issues
        { status: "unknown" },                             // unknown status
      ],
    };

    const pipeline = [{ $match: match }];

    pipeline.push({
      $lookup: {
        from: "students",
        localField: "student",
        foreignField: "_id",
        as: "student",
      },
    });

    pipeline.push({
      $unwind: { path: "$student", preserveNullAndEmptyArrays: true },
    });

    if (block) {
      pipeline.push({ $match: { "student.block": block } });
    }

    if (severity) {
      pipeline.push({
        $match: { validationIssues: { $elemMatch: { severity } } },
      });
    }

    // optional: only students with valid block
    pipeline.push({
      $match: { "student.block": { $exists: true, $ne: null, $ne: "" } },
    });

    pipeline.push({ $sort: { "student.name": 1, timestamp: 1 } });

    const records = await Attendance.aggregate(pipeline);

    const stats = {
      total: records.length,
      unreconciled: records.filter((r) => r.reconciled === false).length,
      unknown: records.filter((r) => r.status === "unknown").length,
    };

    return res.json({ success: true, records, stats });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: err.message });
  }
});



// PUT /api/attendance/reconciliation/approve-all
router.put(
  "/reconciliation/approve-all",
  authenticateToken,
  async (req, res) => {
    try {
      const { date, block } = req.body;
      const userId = req.user._id || req.user.id;
      const hostelId = req.user.assignedHostel._id;

      if (!date) {
        return res.status(400).json({
          success: false,
          message: "date required",
        });
      }

      const query = {
        date,
        assignedHostel: hostelId,
        deleted: { $ne: true },
        reconciled: false,
        $or: [
          { validationIssues: { $exists: false } },
          { validationIssues: { $size: 0 } },
          {
            validationIssues: {
              $not: { $elemMatch: { severity: "error" } },
            },
          },
        ],
      };

      if (block) {
        const students = await Student.find({
          block,
          assignedHostel: hostelId,
        }).distinct("_id");
        query.student = { $in: students };
      }

      const result = await Attendance.updateMany(query, {
        $set: {
          reconciled: true,
          reconciledBy: userId,
          reconciledAt: new Date(),
        },
      });

      return res.json({
        success: true,
        message: `Approved ${result.modifiedCount} records`,
        approvedCount: result.modifiedCount,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
);

// PUT /api/attendance/:id/reconcile
router.put("/:id/reconcile", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, type, notes } = req.body;
    const userId = req.user && req.user._id;
    const hostelId = req.user.assignedHostel._id;

    const attendance = await Attendance.findOne({
      _id: id,
      assignedHostel: hostelId,
      deleted: { $ne: true },
    });
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    const before = {
      status: attendance.status,
      type: attendance.type,
      notes: attendance.notes,
    };

    if (status) attendance.status = status;
    if (type) attendance.type = type;
    if (notes) attendance.notes = notes;
    attendance.reconciled = true;
    attendance.reconciledBy = userId;
    attendance.reconciledAt = new Date();

    await attendance.save();

    const after = {
      status: attendance.status,
      type: attendance.type,
      notes: attendance.notes,
    };

    await AuditLog.log({
      model: "Attendance",
      refId: attendance._id,
      action: "reconcile",
      user: userId,
      assignedHostel: hostelId,
      payload: { before, after },
      reason: notes || "Reconciliation",
    });

    return res.json({ success: true, attendance });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/attendance/export/csv
router.get("/export/csv", authenticateToken, async (req, res) => {
  try {
    const { from, to, block } = req.query;
    const hostelId = req.user.assignedHostel._id;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "from and to dates required",
      });
    }

    const match = {
      date: { $gte: from, $lte: to },
      assignedHostel: hostelId,
      deleted: { $ne: true },
    };

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "students",
          localField: "student",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
    ];

    if (block) {
      pipeline.push({ $match: { "student.block": block } });
    }

    pipeline.push({ $sort: { date: 1, "student.name": 1, timestamp: 1 } });

    const records = await Attendance.aggregate(pipeline);

    const csvRows = [
      [
        "Date",
        "Student",
        "Roll",
        "Block",
        "Type",
        "Time",
        "Shift",
        "Status",
        "Source",
        "Reconciled",
      ].join(","),
    ];

    records.forEach((r) => {
      csvRows.push(
        [
          r.date,
          r.student.name,
          r.student.rollNumber || "",
          r.student.block || "",
          r.type || "",
          r.timestamp ? new Date(r.timestamp).toLocaleString() : "",
          r.shift || "",
          r.status || "",
          r.source,
          r.reconciled ? "Yes" : "No",
        ].join(",")
      );
    });

    const csv = "\uFEFF" + csvRows.join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=attendance_${from}_${to}.csv`
    );
    return res.send(csv);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/attendance/report/monthly
router.get("/report/monthly", authenticateToken, async (req, res) => {
  try {
    const { month, block } = req.query;
    const hostelId = req.user.assignedHostel._id;

    if (!month) {
      return res.status(400).json({
        success: false,
        message: "month query param required (YYYY-MM)",
      });
    }

    const year = parseInt(month.split("-")[0]);
    const monthNum = parseInt(month.split("-")[1]);

    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);
    const today = new Date();
    const lastCountDate = endDate > today ? today : endDate;

    const startDateStr = startDate.toISOString().slice(0, 10);
    const endDateStr = lastCountDate.toISOString().slice(0, 10);

    const totalDays = calculateAllDaysInRange(startDateStr, endDateStr);

    const match = {
      date: { $gte: startDateStr, $lte: endDateStr },
      assignedHostel: hostelId,
      deleted: { $ne: true },
    };

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "students",
          localField: "student",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
    ];

    if (block) {
      pipeline.push({ $match: { "student.block": block } });
    }

    pipeline.push(
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: { studentId: "$student._id", date: "$date" },
          studentName: { $first: "$student.name" },
          rollNumber: { $first: "$student.rollNumber" },
          block: { $first: "$student.block" },
          status: { $first: "$status" },
          type: { $first: "$type" },
        },
      }
    );

    pipeline.push({
      $group: {
        _id: "$_id.studentId",
        studentName: { $first: "$studentName" },
        rollNumber: { $first: "$rollNumber" },
        block: { $first: "$block" },
        presentDays: {
          $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
        },
        absentDays: {
          $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
        },
        leaveDays: {
          $sum: { $cond: [{ $eq: ["$status", "on_leave"] }, 1, 0] },
        },
        totalMarkedDays: { $sum: 1 },
      },
    });

    const attendanceData = await Attendance.aggregate(pipeline);

    const allStudentsQuery = { status: "active" };
    if (block) allStudentsQuery.block = block;
    allStudentsQuery.assignedHostel = hostelId;

    const allStudents = await Student.find(allStudentsQuery).lean();

    const report = allStudents.map((student) => {
      const record = attendanceData.find(
        (a) => a._id.toString() === student._id.toString()
      );

      const presentDays = record?.presentDays || 0;
      const absentDays = record?.absentDays || 0;
      const leaveDays = record?.leaveDays || 0;
      const totalMarkedDays = record?.totalMarkedDays || 0;

      const unmarkedDays = Math.max(0, totalDays - totalMarkedDays);
      const totalAbsent = absentDays + unmarkedDays;

      const effectiveTotalDays = totalDays - leaveDays;
      const attendancePercentage =
        effectiveTotalDays > 0
          ? ((presentDays / effectiveTotalDays) * 100).toFixed(2)
          : 0;

      return {
        studentId: student._id,
        studentName: student.name,
        rollNumber: student.rollNumber,
        block: student.block,
        totalDays,
        presentDays,
        absentDays: totalAbsent,
        leaveDays,
        unmarkedDays,
        attendancePercentage: parseFloat(attendancePercentage),
      };
    });

    report.sort((a, b) => a.attendancePercentage - b.attendancePercentage);

    return res.json({
      success: true,
      month,
      startDate: startDateStr,
      endDate: endDateStr,
      totalDays,
      report,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/attendance/report/monthly-date-wise
router.get(
  "/report/monthly-date-wise",
  authenticateToken,
  async (req, res) => {
    try {
      const { month, block } = req.query;
      const hostelId = req.user.assignedHostel._id;

      if (!month) {
        return res.status(400).json({
          success: false,
          message: "month query param required (YYYY-MM)",
        });
      }

      const year = parseInt(month.split("-")[0], 10);
      const monthNum = parseInt(month.split("-")[1], 10);

      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastCountDate = endDate > today ? today : endDate;

      if (startDate > today) {
        return res.status(400).json({
          success: false,
          message: "Cannot generate report for future months",
        });
      }

      const startDateStr = startDate.toISOString().slice(0, 10);
      const endDateStr = lastCountDate.toISOString().slice(0, 10);

      const studentQuery = { status: "active", assignedHostel: hostelId };
      if (block) studentQuery.block = block;

      const allStudents = await Student.find(studentQuery)
        .select("_id studentId name rollNumber block batch")
        .lean();

      if (!allStudents.length) {
        return res.json({
          success: true,
          month,
          startDate: startDateStr,
          endDate: endDateStr,
          data: [],
        });
      }

      const studentsOnLeave = await LeaveApplication.find({
        status: "approved",
        student: { $in: allStudents.map((s) => s._id) },
        fromDate: { $lte: endDateStr },
        $or: [
          { earlyReturn: false, toDate: { $gte: startDateStr } },
          { earlyReturn: true, actualReturnDate: { $gt: startDateStr } },
        ],
      })
        .select("student fromDate toDate earlyReturn actualReturnDate")
        .lean();


      const leaveMap = new Map();
      studentsOnLeave.forEach((leave) => {
        const studentId = leave.student.toString();
        const leaveStart = new Date(leave.fromDate);

        const leaveEnd = new Date(
          leave.earlyReturn && leave.actualReturnDate
            ? leave.actualReturnDate
            : leave.toDate
        );


        for (
          let d = new Date(leaveStart);
          d < leaveEnd;
          d.setDate(d.getDate() + 1)
        ) {
          const dateKey = d.toISOString().slice(0, 10);
          if (dateKey >= startDateStr && dateKey <= endDateStr) {
            if (!leaveMap.has(studentId)) {
              leaveMap.set(studentId, new Set());
            }
            leaveMap.get(studentId).add(dateKey);
          }
        }
      });

      const attendanceRecords = await Attendance.find({
        date: { $gte: startDateStr, $lte: endDateStr },
        assignedHostel: hostelId,
        deleted: { $ne: true },
        student: { $in: allStudents.map((s) => s._id) },
      })
        .select("student date status type")
        .lean();

      const attendanceMap = new Map();
      attendanceRecords.forEach((record) => {
        const key = `${record.student.toString()}-${record.date}`;
        attendanceMap.set(key, record);
      });

      const allDates = [];
      for (
        let d = new Date(startDate);
        d <= lastCountDate;
        d.setDate(d.getDate() + 1)
      ) {
        allDates.push(d.toISOString().slice(0, 10));
      }

      const dateWiseData = allDates.map((date) => {
        const students = allStudents.map((student) => {
          const studentId = student._id.toString();
          const key = `${studentId}-${date}`;

          // ✅ Check if student is on leave for this specific date
          const isOnLeave =
            leaveMap.has(studentId) && leaveMap.get(studentId).has(date);

          if (isOnLeave) {
            return {
              studentId: student.studentId,
              studentName: student.name,
              rollNumber: student.rollNumber,
              block: student.block,
              batch: student.batch || null,
              status: "leave",
            };
          }

          const record = attendanceMap.get(key);

          if (record) {
            let status = "absent";
            if (record.status === "present") status = "present";
            else if (record.status === "on_leave") status = "leave";

            return {
              studentId: student.studentId,
              studentName: student.name,
              rollNumber: student.rollNumber,
              block: student.block,
              batch: student.batch || null,
              status,
            };
          }

          return {
            studentId: student.studentId,
            studentName: student.name,
            rollNumber: student.rollNumber,
            block: student.block,
            batch: student.batch || null,
            status: "absent",
          };
        });

        return { date, students };
      });

      dateWiseData.sort((a, b) => new Date(b.date) - new Date(a.date));

      return res.json({
        success: true,
        month,
        startDate: startDateStr,
        endDate: endDateStr,
        data: dateWiseData,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// POST /api/attendance/mark-daily
router.post("/mark-daily", authenticateToken, async (req, res) => {
  try {
    const { date } = req.body;
    const hostelId = req.user.assignedHostel._id;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date required (YYYY-MM-DD)",
      });
    }

    const result = await attendanceAutoMarkService.markForDate(date, hostelId);

    return res.json({
      success: true,
      result,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});


// POST /api/attendance/mark-multi-day
router.post("/mark-multi-day", authenticateToken, async (req, res) => {
  try {
    const { fromDate, toDate } = req.body;
    const hostelId = req.user.assignedHostel._id;

    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: "fromDate and toDate required",
      });
    }

    const results = await attendanceAutoMarkService.processMultiDayAbsence(
      fromDate,
      toDate,
      hostelId
    );

    return res.json({
      success: true,
      results,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/attendance/student-state/:id
router.get("/student-state/:id", authenticateToken, async (req, res) => {
  try {
    const hostelId = req.user.assignedHostel._id;

    const student = await Student.findOne({
      _id: req.params.id,
      assignedHostel: hostelId,
    }).select("name rollNumber currentHostelState lastStateUpdate");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    return res.json({
      success: true,
      student: {
        id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        currentState: student.currentHostelState || "IN",
        lastUpdate: student.lastStateUpdate,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/attendance/history
router.get("/history", authenticateToken, async (req, res) => {
  try {
    const {
      from,
      to,
      block,
      search,
      type,
      source,
      shift,
      page = 1,
      limit = 50,
    } = req.query;
    const hostelId = req.user.assignedHostel._id;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "from and to dates required",
      });
    }

    const query = {
      date: { $gte: from, $lte: to },
      assignedHostel: hostelId,
      deleted: { $ne: true },
    };

    if (type) query.type = type;
    if (source) query.source = source;
    if (shift) query.shift = shift;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: "students",
          localField: "student",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
    ];

    if (block) {
      pipeline.push({ $match: { "student.block": block } });
    }

    if (search) {
      const regex = new RegExp(search, "i");
      pipeline.push({
        $match: {
          $or: [
            { "student.name": regex },
            { "student.rollNumber": regex },
            { "student.block": regex },
          ],
        },
      });
    }

    pipeline.push(
      { $sort: { date: -1, timestamp: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit, 10) }
    );

    const [items, totalCount] = await Promise.all([
      Attendance.aggregate(pipeline),
      Attendance.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: items,
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/attendance/:id
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const hostelId = req.user.assignedHostel._id;
    const userId = req.user && req.user._id;

    const rec = await Attendance.findOne({
      _id: id,
      assignedHostel: hostelId,
      deleted: { $ne: true },
    });

    if (!rec) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }

    const before = {
      status: rec.status,
      notes: rec.notes,
      type: rec.type,
      date: rec.date,
    };

    const { status, notes, type } = req.body;
    if (status) rec.status = status;
    if (notes !== undefined) rec.notes = notes;
    if (type && ["IN", "OUT"].includes(type)) rec.type = type;

    await rec.save();

    const after = {
      status: rec.status,
      notes: rec.notes,
      type: rec.type,
      date: rec.date,
    };

    await AuditLog.log({
      model: "Attendance",
      refId: rec._id,
      action: "update",
      user: userId,
      assignedHostel: hostelId,
      payload: {
        before,
        after,
      },
      reason: "Manual attendance edit",
    });

    return res.json({ success: true, data: rec });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/attendance/:id
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const hostelId = req.user.assignedHostel._id;
    const userId = req.user && req.user._id;

    const rec = await Attendance.findOne({
      _id: id,
      assignedHostel: hostelId,
      deleted: { $ne: true },
    });

    if (!rec) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }

    await rec.softDelete(userId);

    await AuditLog.log({
      model: "Attendance",
      refId: rec._id,
      action: "delete",
      user: userId,
      assignedHostel: hostelId,
      payload: {
        student: rec.student,
        date: rec.date,
        type: rec.type,
        status: rec.status,
      },
      reason: "Attendance record deleted",
    });

    return res.json({ success: true, message: "Attendance deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/attendance/bulk
router.put("/bulk", authenticateToken, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    const userId = req.user && req.user._id;
    const hostelId = req.user.assignedHostel._id;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "ids array required",
      });
    }

    const records = await Attendance.find({
      _id: { $in: ids },
      assignedHostel: hostelId,
      deleted: { $ne: true },
    });

    const updated = [];

    for (const rec of records) {
      const before = {
        status: rec.status,
        notes: rec.notes,
      };

      if (updates.status) rec.status = updates.status;
      if (updates.notes !== undefined) rec.notes = updates.notes;

      await rec.save();

      const after = {
        status: rec.status,
        notes: rec.notes,
      };

      await AuditLog.log({
        model: "Attendance",
        refId: rec._id,
        action: "bulk_update",
        user: userId,
        assignedHostel: hostelId,
        payload: {
          before,
          after,
        },
        reason: "Bulk attendance update",
      });

      updated.push(rec._id);
    }

    return res.json({
      success: true,
      updatedCount: updated.length,
      updatedIds: updated,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/attendance/bulk
router.delete("/bulk", authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    const userId = req.user && req.user._id;
    const hostelId = req.user.assignedHostel._id;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "ids array required",
      });
    }

    const records = await Attendance.find({
      _id: { $in: ids },
      assignedHostel: hostelId,
      deleted: { $ne: true },
    });

    const deletedIds = [];

    for (const rec of records) {
      await rec.softDelete(userId);

      await AuditLog.log({
        model: "Attendance",
        refId: rec._id,
        action: "bulk_delete",
        user: userId,
        assignedHostel: hostelId,
        payload: {
          student: rec.student,
          date: rec.date,
          type: rec.type,
          status: rec.status,
        },
        reason: "Bulk attendance delete",
      });

      deletedIds.push(rec._id);
    }

    return res.json({
      success: true,
      deletedCount: deletedIds.length,
      deletedIds,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/attendance/reset-day
router.post("/reset-day", authenticateToken, async (req, res) => {
  try {
    const { date } = req.body;
    const hostelId = req.user.assignedHostel._id;
    const userId = req.user && req.user._id;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date required (YYYY-MM-DD)",
      });
    }

    const result = await Attendance.updateMany(
      { date, assignedHostel: hostelId },
      { $set: { deleted: true, deletedBy: userId, deletedAt: new Date() } }
    );

    await AuditLog.log({
      model: "Attendance",
      refId: null,
      action: "bulk_delete",
      user: userId,
      assignedHostel: hostelId,
      payload: { date, count: result.modifiedCount },
      reason: "Reset day attendance",
    });

    return res.json({
      success: true,
      message: `Soft-deleted ${result.modifiedCount} records for ${date}`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/attendance/fix-orphan
router.post("/fix-orphan", authenticateToken, async (req, res) => {
  try {
    const hostelId = req.user.assignedHostel._id;
    const userId = req.user && req.user._id;

    const records = await Attendance.find({
      assignedHostel: { $exists: false },
    }).limit(500);

    for (const rec of records) {
      const stu = await Student.findById(rec.student).select("assignedHostel");
      if (stu?.assignedHostel) {
        rec.assignedHostel = stu.assignedHostel;
        await rec.save();

        await AuditLog.log({
          model: "Attendance",
          refId: rec._id,
          action: "update",
          user: userId,
          assignedHostel: stu.assignedHostel,
          payload: { fix: "assignedHostel backfill" },
          reason: "Backfilled assignedHostel on attendance",
        });
      }
    }

    return res.json({
      success: true,
      message: "Orphan attendance fixed where possible",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
