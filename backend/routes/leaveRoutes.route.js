// server/routes/leaveRoutes.route.js
const express = require("express");
const router = express.Router();
const LeaveApplication = require("../models/leaveApplication.model");
const Student = require("../models/student.model");
const Attendance = require("../models/attendance.model");
const AuditLog = require("../models/auditLog.model");
const { authenticateToken } = require("../middlewares/auth");

/**
 * GET /api/leave-applications
 * Get all leave applications with filters
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const {
      status,
      studentId,
      fromDate,
      toDate,
      page = 1,
      limit = 50,
    } = req.query;

    const hostelId = req.user.assignedHostel._id;

    const query = { assignedHostel: hostelId };

    if (status) {
      query.status = status;
    }

    if (studentId) {
      query.student = studentId;
    }

    if (fromDate && toDate) {
      query.$or = [
        { fromDate: { $gte: fromDate, $lte: toDate } },
        { toDate: { $gte: fromDate, $lte: toDate } },
        { fromDate: { $lte: fromDate }, toDate: { $gte: toDate } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [applications, total] = await Promise.all([
      LeaveApplication.find(query)
        .populate("student", "name rollNumber block photo status assignedHostel")
        .populate("approvedBy", "name email")
        .populate("rejectedBy", "name email")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      LeaveApplication.countDocuments(query),
    ]);

    return res.json({
      success: true,
      applications,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * GET /api/leave-applications/:id
 * Get single leave application
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const hostelId = req.user.assignedHostel._id;

    const application = await LeaveApplication.findOne({
      _id: id,
      assignedHostel: hostelId,
    })
      .populate("student", "name rollNumber block photo email phone status assignedHostel")
      .populate("approvedBy", "name email")
      .populate("rejectedBy", "name email")
      .populate("createdBy", "name email");

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Leave application not found",
      });
    }

    return res.json({
      success: true,
      application,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * POST /api/leave-applications
 * Create new leave application
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      studentId,
      leaveType,
      fromDate,
      toDate,
      reason,
      contactNumber,
      emergencyContact,
      destinationAddress,
    } = req.body;

    const hostelId = req.user.assignedHostel._id;

    if (!studentId || !leaveType || !fromDate || !toDate || !reason) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (new Date(toDate) < new Date(fromDate)) {
      return res.status(400).json({
        success: false,
        message: "End date cannot be before start date",
      });
    }

    const student = await Student.findOne({
      _id: studentId,
      assignedHostel: hostelId,
      status: "active",
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found in your hostel",
      });
    }

    const overlapping = await LeaveApplication.findOne({
      student: studentId,
      assignedHostel: hostelId,
      status: { $in: ["pending", "approved"] },
      $or: [
        { fromDate: { $lte: toDate }, toDate: { $gte: fromDate } },
        { fromDate: { $gte: fromDate, $lte: toDate } },
      ],
    });

    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: "Student already has a leave application for this period",
      });
    }

    const leaveApp = await LeaveApplication.create({
      student: studentId,
      assignedHostel: hostelId,
      leaveType,
      fromDate,
      toDate,
      reason,
      contactNumber,
      emergencyContact,
      destinationAddress,
      status: "pending",
      createdBy: req.user._id,
    });

    const populated = await LeaveApplication.findById(leaveApp._id)
      .populate("student", "name rollNumber block status assignedHostel")
      .populate("createdBy", "name email");

    await AuditLog.log({
      model: "LeaveApplication",
      refId: leaveApp._id,
      action: "create",
      payload: { studentId, leaveType, fromDate, toDate },
      user: req.user._id,
      assignedHostel: hostelId,
      reason: "Leave application submitted",
    });

    return res.status(201).json({
      success: true,
      application: populated,
      message: "Leave application submitted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * PUT /api/leave-applications/:id/approve
 * Approve leave application
 */
router.put("/:id/approve", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.user._id;
    const hostelId = req.user.assignedHostel._id;

    const leaveApp = await LeaveApplication.findOne({
      _id: id,
      assignedHostel: hostelId,
    });

    if (!leaveApp) {
      return res.status(404).json({
        success: false,
        message: "Leave application not found",
      });
    }

    if (leaveApp.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending applications can be approved",
      });
    }

    await leaveApp.approve(userId, notes);

    await Student.findOneAndUpdate(
      { _id: leaveApp.student, assignedHostel: hostelId },
      {
        currentHostelState: "OUT",
        lastStateUpdate: new Date(),
      }
    );

    const attendanceRecords = [];

    let currentDate = new Date(leaveApp.fromDate);
    const endDate = new Date(leaveApp.toDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().slice(0, 10);

      attendanceRecords.push({
        student: leaveApp.student,
        assignedHostel: hostelId,
        date: dateStr,
        type: "OUT",
        timestamp: new Date(`${dateStr}T00:00:00`),
        status: "on_leave",
        source: "leave",
        shift: "morning",
        leaveApplication: leaveApp._id,
        notes: `On ${leaveApp.leaveType} leave`,
        reconciled: true,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (attendanceRecords.length > 0) {
      await Attendance.insertMany(attendanceRecords);

      leaveApp.attendanceCreated = true;
      await leaveApp.save();
    }

    await AuditLog.log({
      model: "LeaveApplication",
      refId: leaveApp._id,
      action: "approve",
      payload: { notes },
      user: userId,
      assignedHostel: hostelId,
      reason: "Leave approved",
    });

    const populated = await LeaveApplication.findById(leaveApp._id)
      .populate("student", "name rollNumber block status assignedHostel")
      .populate("approvedBy", "name email");

    return res.json({
      success: true,
      message: "Leave approved successfully",
      leaveApplication: populated,
      attendanceRecords: attendanceRecords.length,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to approve leave",
    });
  }
});

/**
 * PUT /api/leave-applications/:id/reject
 * Reject leave application
 */
router.put("/:id/reject", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, notes } = req.body;
    const userId = req.user._id;
    const hostelId = req.user.assignedHostel._id;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const leaveApp = await LeaveApplication.findOne({
      _id: id,
      assignedHostel: hostelId,
    });

    if (!leaveApp) {
      return res.status(404).json({
        success: false,
        message: "Leave application not found",
      });
    }

    if (leaveApp.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending applications can be rejected",
      });
    }

    await leaveApp.reject(userId, reason, notes);

    const deletedResult = await Attendance.deleteMany({
      student: leaveApp.student,
      leaveApplication: leaveApp._id,
      source: "leave",
      assignedHostel: hostelId,
    });

    await Student.findOneAndUpdate(
      { _id: leaveApp.student, assignedHostel: hostelId },
      {
        currentHostelState: "IN",
        lastStateUpdate: new Date(),
      }
    );

    await AuditLog.log({
      model: "LeaveApplication",
      refId: leaveApp._id,
      action: "reject",
      payload: { reason, notes, deletedRecords: deletedResult.deletedCount },
      user: userId,
      assignedHostel: hostelId,
      reason: "Leave rejected",
    });

    const populated = await LeaveApplication.findById(leaveApp._id)
      .populate("student", "name rollNumber block status assignedHostel")
      .populate("rejectedBy", "name email");

    return res.json({
      success: true,
      message: "Leave rejected successfully",
      leaveApplication: populated,
      deletedRecords: deletedResult.deletedCount,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to reject leave",
    });
  }
});

/**
 * PUT /api/leave-applications/:id/cancel
 * Cancel leave application (by student)
 */
router.put("/:id/cancel", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const hostelId = req.user.assignedHostel._id;

    const leaveApp = await LeaveApplication.findOne({
      _id: id,
      assignedHostel: hostelId,
    });

    if (!leaveApp) {
      return res.status(404).json({
        success: false,
        message: "Leave application not found",
      });
    }

    if (
      leaveApp.createdBy.toString() !== userId.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this application",
      });
    }

    if (leaveApp.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Leave is already cancelled",
      });
    }

    await leaveApp.cancel();

    if (leaveApp.status === "approved" && leaveApp.attendanceCreated) {
      await Attendance.deleteMany({
        leaveApplication: leaveApp._id,
        source: "leave",
        assignedHostel: hostelId,
      });
    }

    await AuditLog.log({
      model: "LeaveApplication",
      refId: leaveApp._id,
      action: "cancel",
      payload: {},
      user: userId,
      assignedHostel: hostelId,
      reason: "Leave cancelled by user",
    });

    return res.json({
      success: true,
      application: leaveApp,
      message: "Leave cancelled successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * DELETE /api/leave-applications/:id
 * Delete leave application (admin only)
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const hostelId = req.user.assignedHostel._id;

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can delete leave applications",
      });
    }

    const leaveApp = await LeaveApplication.findOne({
      _id: id,
      assignedHostel: hostelId,
    });

    if (!leaveApp) {
      return res.status(404).json({
        success: false,
        message: "Leave application not found",
      });
    }

    await Attendance.deleteMany({
      leaveApplication: leaveApp._id,
      source: "leave",
      assignedHostel: hostelId,
    });

    await AuditLog.log({
      model: "LeaveApplication",
      refId: leaveApp._id,
      action: "delete",
      payload: leaveApp.toObject(),
      user: userId,
      assignedHostel: hostelId,
      reason: "Leave application deleted by admin",
    });

    await LeaveApplication.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: "Leave application deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * PUT /api/leave-applications/:id/early-return
 * Mark student as returned early from leave
 */
router.put("/:id/early-return", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { returnDate, notes } = req.body;
    const userId = req.user._id;
    const hostelId = req.user.assignedHostel._id;

    if (!returnDate) {
      return res.status(400).json({
        success: false,
        message: "Return date is required",
      });
    }

    const leaveApp = await LeaveApplication.findOne({
      _id: id,
      assignedHostel: hostelId,
    });

    if (!leaveApp) {
      return res.status(404).json({
        success: false,
        message: "Leave application not found",
      });
    }

    if (leaveApp.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Only approved leaves can be marked as early return",
      });
    }

    const returnDateObj = new Date(returnDate);
    const fromDateObj = new Date(leaveApp.fromDate);
    const toDateObj = new Date(leaveApp.toDate);

    if (returnDateObj < fromDateObj) {
      return res.status(400).json({
        success: false,
        message: "Return date cannot be before leave start date",
      });
    }

    if (returnDateObj > toDateObj) {
      return res.status(400).json({
        success: false,
        message: "Return date cannot be after leave end date",
      });
    }

    const deletedResult = await Attendance.deleteMany({
      student: leaveApp.student,
      leaveApplication: leaveApp._id,
      source: "leave",
      date: { $gte: returnDate },
      assignedHostel: hostelId,
    });

    leaveApp.earlyReturn = true;
    leaveApp.actualReturnDate = returnDate;
    leaveApp.earlyReturnNotes = notes || "";
    leaveApp.earlyReturnProcessedBy = userId;
    leaveApp.earlyReturnProcessedAt = new Date();
    await leaveApp.save();

    await Student.findOneAndUpdate(
      { _id: leaveApp.student, assignedHostel: hostelId },
      {
        currentHostelState: "IN",
        lastStateUpdate: new Date(),
      }
    );

    await AuditLog.log({
      model: "LeaveApplication",
      refId: leaveApp._id,
      action: "early_return",
      payload: {
        returnDate,
        deletedRecords: deletedResult.deletedCount,
        notes,
      },
      user: userId,
      assignedHostel: hostelId,
      reason: "Early return from leave",
    });

    const populated = await LeaveApplication.findById(leaveApp._id)
      .populate("student", "name rollNumber block status assignedHostel")
      .populate("earlyReturnProcessedBy", "name email");

    return res.json({
      success: true,
      message: "Early return processed successfully",
      leaveApplication: populated,
      deletedRecords: deletedResult.deletedCount,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to process early return",
    });
  }
});

// Helper: Create attendance records for leave period (hostel-aware)
async function createLeaveAttendanceRecords(leaveApp) {
  const start = new Date(leaveApp.fromDate);
  const end = new Date(leaveApp.toDate);

  let currentDate = new Date(start);
  const records = [];

  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().slice(0, 10);

    const existing = await Attendance.findOne({
      student: leaveApp.student,
      date: dateStr,
      assignedHostel: leaveApp.assignedHostel,
    });

    if (!existing) {
      records.push({
        student: leaveApp.student,
        assignedHostel: leaveApp.assignedHostel,
        date: dateStr,
        type: "OUT",
        timestamp: new Date(`${dateStr}T00:00:00`),
        shift: "morning",
        source: "leave",
        status: "on_leave",
        leaveApplication: leaveApp._id,
        notes: `On ${leaveApp.leaveType} leave`,
        reconciled: true,
      });
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (records.length > 0) {
    await Attendance.insertMany(records);

    leaveApp.attendanceCreated = true;
    await leaveApp.save();
  }

  return records.length;
}

module.exports = router;
