const express = require("express");
const router = express.Router();
const Employee = require("../models/employee.model");
const EmployeeLeaveApplication = require("../models/employeeLeaveApplication.model");
const EmployeeAttendance = require("../models/employeeAttendance.model");
const { authenticateToken, authorizeRoles } = require("../middlewares/auth");

// Protect all routes
router.use(authenticateToken);

// ============ APPLY FOR LEAVE ============
router.post(
  "/apply",
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      const {
        employeeId,
        leaveType,
        fromDate,
        toDate,
        reason,
        contactNumber,
        address,
        isPaid = true,
      } = req.body;

      // Validation
      if (!employeeId || !leaveType || !fromDate || !toDate || !reason) {
        return res.status(400).json({
          success: false,
          message: "All required fields must be provided",
        });
      }

      if (reason.length < 10) {
        return res.status(400).json({
          success: false,
          message: "Reason must be at least 10 characters",
        });
      }

      // Validate dates
      if (new Date(toDate) < new Date(fromDate)) {
        return res.status(400).json({
          success: false,
          message: "End date cannot be before start date",
        });
      }

      // Get employee
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee not found",
        });
      }

      // Check for overlapping leaves
      const overlappingLeave = await EmployeeLeaveApplication.findOne({
        employee: employeeId,
        status: { $in: ["pending", "approved"] },
        $or: [
          {
            fromDate: { $lte: toDate },
            toDate: { $gte: fromDate },
          },
        ],
      });

      if (overlappingLeave) {
        return res.status(400).json({
          success: false,
          message: "Leave application overlaps with existing leave",
          existingLeave: overlappingLeave,
        });
      }

      // ✅ Calculate totalDays (ADDED THIS)
      const from = new Date(fromDate);
      const to = new Date(toDate);
      const diffTime = Math.abs(to - from);
      const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      console.log(
        `📊 Leave calculation: ${fromDate} to ${toDate} = ${totalDays} days`
      );

      // Create leave application
      const leave = new EmployeeLeaveApplication({
        employee: employeeId,
        assignedHostel: employee.assignedHostel,
        leaveType,
        fromDate,
        toDate,
        totalDays, // ✅ Explicitly set totalDays
        reason,
        contactNumber,
        address,
        isPaid,
        status: "pending",
        createdBy: req.user._id,
      });

      await leave.save();
      await leave.populate("employee", "fullName employeeCode role department");

      res.status(201).json({
        success: true,
        message: "Leave application submitted successfully",
        data: leave,
      });
    } catch (error) {
      console.error("Apply leave error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error applying for leave",
        error: error.message, // ✅ Include error message for debugging
      });
    }
  }
);

// ============ GET ALL LEAVE APPLICATIONS ============
router.get(
  "/",
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      const { status, employeeId, leaveType } = req.query;
      const hostelId = req.user.assignedHostel;

      const query = { assignedHostel: hostelId };

      if (status) {
        query.status = status;
      }

      if (employeeId) {
        query.employee = employeeId;
      }

      if (leaveType) {
        query.leaveType = leaveType;
      }

      const leaves = await EmployeeLeaveApplication.find(query)
        .populate("employee", "fullName employeeCode role department phone")
        .populate("approvedBy", "name")
        .populate("rejectedBy", "name")
        .sort({ createdAt: -1 })
        .limit(100);

      res.status(200).json({
        success: true,
        data: leaves,
      });
    } catch (error) {
      console.error("Get leaves error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error fetching leave applications",
      });
    }
  }
);

// ============ GET PENDING LEAVES ============
router.get(
  "/pending",
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      const hostelId = req.user.assignedHostel;

      const pendingLeaves = await EmployeeLeaveApplication.getPendingLeaves(
        hostelId
      );

      res.status(200).json({
        success: true,
        data: pendingLeaves,
      });
    } catch (error) {
      console.error("Get pending leaves error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error fetching pending leaves",
      });
    }
  }
);

// ============ GET LEAVE BY ID ============
router.get(
  "/:id",
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const leave = await EmployeeLeaveApplication.findById(id)
        .populate("employee", "fullName employeeCode role department phone")
        .populate("approvedBy", "name")
        .populate("rejectedBy", "name");

      if (!leave) {
        return res.status(404).json({
          success: false,
          message: "Leave application not found",
        });
      }

      res.status(200).json({
        success: true,
        data: leave,
      });
    } catch (error) {
      console.error("Get leave error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error fetching leave application",
      });
    }
  }
);

// ============ APPROVE LEAVE ============
router.put(
  "/:id/approve",
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const leave = await EmployeeLeaveApplication.findById(id);
      if (!leave) {
        return res.status(404).json({
          success: false,
          message: "Leave application not found",
        });
      }

      if (leave.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: `Leave is already ${leave.status}`,
        });
      }

      // Approve leave
      await leave.approve(req.user._id, notes);

      // Create attendance records for leave period
      await createLeaveAttendanceRecords(leave);

      await leave.populate("employee", "fullName employeeCode role department");

      res.status(200).json({
        success: true,
        message: "Leave approved successfully",
        data: leave,
      });
    } catch (error) {
      console.error("Approve leave error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error approving leave",
      });
    }
  }
);

// ============ REJECT LEAVE ============
router.put(
  "/:id/reject",
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: "Rejection reason is required",
        });
      }

      const leave = await EmployeeLeaveApplication.findById(id);
      if (!leave) {
        return res.status(404).json({
          success: false,
          message: "Leave application not found",
        });
      }

      if (leave.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: `Leave is already ${leave.status}`,
        });
      }

      // Reject leave
      await leave.reject(req.user._id, reason);
      await leave.populate("employee", "fullName employeeCode role department");

      res.status(200).json({
        success: true,
        message: "Leave rejected",
        data: leave,
      });
    } catch (error) {
      console.error("Reject leave error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error rejecting leave",
      });
    }
  }
);

// ============ PROCESS EARLY RETURN ============
router.post(
  "/:id/early-return",
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { returnDate } = req.body;

      if (!returnDate) {
        return res.status(400).json({
          success: false,
          message: "Return date is required",
        });
      }

      const leave = await EmployeeLeaveApplication.findById(id);
      if (!leave) {
        return res.status(404).json({
          success: false,
          message: "Leave application not found",
        });
      }

      if (leave.status !== "approved") {
        return res.status(400).json({
          success: false,
          message: "Only approved leaves can be processed for early return",
        });
      }

      // Validate return date
      if (returnDate < leave.fromDate || returnDate > leave.toDate) {
        return res.status(400).json({
          success: false,
          message: "Return date must be within leave period",
        });
      }

      // Process early return
      await leave.processEarlyReturn(returnDate, req.user._id);

      // Delete attendance records after return date
      await EmployeeAttendance.deleteMany({
        employee: leave.employee,
        date: { $gt: returnDate, $lte: leave.toDate },
        status: "on_leave",
        leaveApplication: leave._id,
      });

      await leave.populate("employee", "fullName employeeCode role department");

      res.status(200).json({
        success: true,
        message: "Early return processed successfully",
        data: leave,
      });
    } catch (error) {
      console.error("Process early return error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error processing early return",
      });
    }
  }
);

// ============ CANCEL LEAVE ============
router.put(
  "/:id/cancel",
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const leave = await EmployeeLeaveApplication.findById(id);
      if (!leave) {
        return res.status(404).json({
          success: false,
          message: "Leave application not found",
        });
      }

      if (leave.status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Leave is already cancelled",
        });
      }

      leave.status = "cancelled";
      await leave.save();

      // Delete attendance records if leave was approved
      if (leave.status === "approved") {
        await EmployeeAttendance.deleteMany({
          employee: leave.employee,
          date: { $gte: leave.fromDate, $lte: leave.toDate },
          status: "on_leave",
          leaveApplication: leave._id,
        });
      }

      res.status(200).json({
        success: true,
        message: "Leave cancelled successfully",
        data: leave,
      });
    } catch (error) {
      console.error("Cancel leave error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error cancelling leave",
      });
    }
  }
);

// ============ GET LEAVE BALANCE ============
router.get(
  "/balance/:employeeId",
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      const { employeeId } = req.params;
      const year = req.query.year || new Date().getFullYear();

      const balance = await EmployeeLeaveApplication.getLeaveBalance(
        employeeId,
        year
      );

      res.status(200).json({
        success: true,
        data: {
          year,
          balance,
        },
      });
    } catch (error) {
      console.error("Get leave balance error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error fetching leave balance",
      });
    }
  }
);

// ============ GET LEAVE HISTORY ============
router.get(
  "/history/:employeeId",
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      const { employeeId } = req.params;
      const limit = parseInt(req.query.limit) || 10;

      const history = await EmployeeLeaveApplication.getLeaveHistory(
        employeeId,
        limit
      );

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      console.error("Get leave history error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error fetching leave history",
      });
    }
  }
);

// ============ DELETE LEAVE APPLICATION ============
router.delete("/:id", authorizeRoles("admin", "manager"), async (req, res) => {
  try {
    const { id } = req.params;

    const leave = await EmployeeLeaveApplication.findById(id);
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave application not found",
      });
    }

    // Delete associated attendance records
    await EmployeeAttendance.deleteMany({
      leaveApplication: leave._id,
    });

    await leave.deleteOne();

    res.status(200).json({
      success: true,
      message: "Leave application deleted successfully",
    });
  } catch (error) {
    console.error("Delete leave error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error deleting leave application",
    });
  }
});

// ============ HELPER FUNCTION ============
async function createLeaveAttendanceRecords(leave) {
  try {
    const startDate = new Date(leave.fromDate);
    const endDate = new Date(leave.toDate);

    const records = [];

    for (
      let date = new Date(startDate);
      date <= endDate;
      date.setDate(date.getDate() + 1)
    ) {
      const dateString = date.toISOString().split("T")[0];

      // Check if record already exists
      const existingRecord = await EmployeeAttendance.findOne({
        employee: leave.employee,
        date: dateString,
      });

      if (!existingRecord) {
        records.push({
          employee: leave.employee,
          assignedHostel: leave.assignedHostel,
          date: dateString,
          status: "on_leave",
          totalHours: 0,
          leaveApplication: leave._id,
          entries: [
            {
              type: "IN",
              timestamp: new Date(`${dateString}T00:00:00`),
              source: "auto",
              notes: `On ${leave.leaveType} leave`,
            },
          ],
          notes: `Employee on approved ${leave.leaveType} leave`,
        });
      }
    }

    if (records.length > 0) {
      await EmployeeAttendance.insertMany(records);
      console.log(`Created ${records.length} leave attendance records`);
    }
  } catch (error) {
    console.error("Error creating leave attendance records:", error);
  }
}

module.exports = router;
