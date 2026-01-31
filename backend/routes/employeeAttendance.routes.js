const express = require("express");
const router = express.Router();
const Employee = require("../models/employee.model");
const EmployeeAttendance = require("../models/employeeAttendance.model");
const EmployeeAttendanceSettings = require("../models/employeeAttendanceSettings.model");
const EmployeeAttendanceValidator = require("../utils/employeeAttendanceValidator");
const EmployeeAutoMarkService = require("../cron/employeeAutoMarkService");
const { authenticateToken, authorizeRoles } = require("../middlewares/auth");

// Protect all routes
router.use(authenticateToken);

// ============ MARK ATTENDANCE (IN/OUT) ============
router.post(
  "/mark",
  authorizeRoles("admin", "manager", "warden", "watchman"),
  async (req, res) => {
    try {
      const {
        employeeId,
        type,
        timestamp,
        source = "manual",
        deviceId,
        notes,
      } = req.body;

      console.log("\n" + "=".repeat(80));
      console.log("🎯 [MARK ATTENDANCE] New Request");
      console.log("=".repeat(80));
      console.log("📤 Request body:", JSON.stringify(req.body, null, 2));

      // ============ VALIDATION ============
      if (!employeeId || !type) {
        return res.status(400).json({
          success: false,
          message: "Employee ID and type (IN/OUT) are required",
        });
      }

      if (!["IN", "OUT"].includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Type must be IN or OUT",
        });
      }

      // ✅ Extract hostelId properly
      const hostelId = req.user.assignedHostel?._id || req.user.assignedHostel;

      if (!hostelId) {
        return res.status(400).json({
          success: false,
          message: "Hostel assignment missing",
        });
      }

      console.log("🔍 User hostelId:", hostelId);

      // ============ GET EMPLOYEE ============
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        console.log("❌ Employee not found with ID:", employeeId);
        return res.status(404).json({
          success: false,
          message: "Employee not found",
        });
      }

      console.log("👤 Employee found:", employee.fullName);

      // ✅ Check if employee belongs to hostel
      const employeeHostelId =
        employee.assignedHostel?._id || employee.assignedHostel;

      if (employeeHostelId.toString() !== hostelId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Employee does not belong to your hostel",
        });
      }

      // ============ PREPARE DATE & TIMESTAMP ============
      const date = timestamp
        ? new Date(timestamp).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      const entryTimestamp = timestamp ? new Date(timestamp) : new Date();

      console.log("📅 Date:", date);
      console.log("⏰ Entry timestamp:", entryTimestamp);

      // ============ RUN VALIDATOR ============
      console.log("\n🔍 Calling validator...");
      const validation = await EmployeeAttendanceValidator.validateBeforeMark(
        employeeId,
        hostelId,
        date,
        type,
        entryTimestamp
      );

      console.log("\n📊 Validation result:");
      console.log("  - canMark:", validation.canMark);
      console.log("  - errors:", validation.errors);
      console.log("  - warnings:", validation.warnings);

      if (!validation.canMark) {
        console.log("\n❌ Validation failed - returning 400");
        return res.status(400).json({
          success: false,
          message: "Cannot mark attendance",
          errors: validation.errors,
          warnings: validation.warnings,
          leaveConflict: validation.leaveConflict || null,
        });
      }

      console.log("\n✅ Validation passed - proceeding to mark attendance");

      // ============ GET OR CREATE ATTENDANCE RECORD ============
      let attendance = await EmployeeAttendance.findOne({
        employee: employeeId,
        date: date,
      });

      if (!attendance) {
        console.log("📝 Creating new attendance record");
        attendance = new EmployeeAttendance({
          employee: employeeId,
          assignedHostel: hostelId,
          date: date,
          entries: [],
          validationIssues: [], // ✅ Initialize empty array
          reconciled: false, // ✅ Default unreconciled
          createdBy: req.user._id,
        });
      } else {
        console.log("📝 Using existing attendance record");
      }

      // ============ ADD ENTRY ============
      console.log("\n➕ Adding new entry:");
      attendance.entries.push({
        type,
        timestamp: entryTimestamp,
        source,
        deviceId,
        markedBy: req.user._id,
        notes: notes || "",
      });

      console.log("  - Total entries after push:", attendance.entries.length);

      // ============ UPDATE TIMES ============
      attendance.updateTimesFromEntries();

      console.log("\n⏰ Updated times:");
      console.log("  - checkInTime:", attendance.checkInTime);
      console.log("  - checkOutTime:", attendance.checkOutTime);
      console.log("  - totalHours:", attendance.totalHours);

      // ============ ADD VALIDATION ISSUES FOR RECONCILIATION ============
      // ✅ Add warnings to validationIssues array
      if (validation.warnings && validation.warnings.length > 0) {
        validation.warnings.forEach((warning) => {
          attendance.validationIssues.push({
            type: "WARNING",
            severity: "medium",
            message: warning,
            timestamp: new Date(),
          });
        });

        console.log(
          `⚠️ Added ${validation.warnings.length} validation issues for reconciliation`
        );
      }

      // ✅ Mark as unreconciled if has validation issues
      if (attendance.validationIssues.length > 0) {
        attendance.reconciled = false;
        console.log("📋 Marked as unreconciled due to validation issues");
      }

      // ============ GET SETTINGS ============
      const settings = await EmployeeAttendanceSettings.getOrCreateSettings(
        hostelId
      );

      // ============ CHECK FOR LATE/EARLY ============
      if (type === "IN") {
        const lateCheck = await EmployeeAttendanceValidator.checkLateArrival(
          hostelId,
          entryTimestamp,
          date
        );
        if (lateCheck.isLate) {
          console.log("⚠️ Late arrival detected");
          attendance.isLate = true;

          // ✅ Add late issue to reconciliation
          attendance.validationIssues.push({
            type: "LATE_ARRIVAL",
            severity: "medium",
            message: lateCheck.message,
            timestamp: new Date(),
          });
          attendance.reconciled = false;
        }
      }

      if (type === "OUT") {
        const earlyCheck = await EmployeeAttendanceValidator.checkEarlyLeave(
          hostelId,
          entryTimestamp,
          date
        );
        if (earlyCheck.isEarlyLeave) {
          console.log("⚠️ Early leave detected");
          attendance.isEarlyLeave = true;

          // ✅ Add early leave issue to reconciliation
          attendance.validationIssues.push({
            type: "EARLY_LEAVE",
            severity: "medium",
            message: earlyCheck.message,
            timestamp: new Date(),
          });
          attendance.reconciled = false;
        }
      }

      // ============ DETERMINE STATUS ============
      const hasLeave = validation.leaveConflict ? true : false;
      attendance.status = await EmployeeAttendanceValidator.determineStatus(
        hostelId,
        attendance.totalHours,
        attendance.isLate,
        attendance.isEarlyLeave,
        hasLeave
      );

      console.log("\n📊 Final attendance status:", attendance.status);
      console.log(
        "📊 Validation issues count:",
        attendance.validationIssues.length
      );
      console.log("📊 Reconciled:", attendance.reconciled);

      // ============ SAVE ATTENDANCE ============
      console.log("\n💾 Saving attendance record...");
      await attendance.save();
      console.log("✅ Attendance record saved");

      // ============ UPDATE EMPLOYEE STATUS ============
      console.log("\n👤 Updating employee status...");
      employee.currentStatus = type;
      if (type === "IN") {
        employee.lastCheckIn = entryTimestamp;
      } else {
        employee.lastCheckOut = entryTimestamp;
      }
      await employee.save();
      console.log("✅ Employee status updated");

      // ============ POPULATE FOR RESPONSE ============
      await attendance.populate("employee", "fullName employeeCode role");

      console.log("\n✅ Attendance marked successfully");
      console.log("=".repeat(80) + "\n");

      // ============ RESPONSE ============
      res.status(200).json({
        success: true,
        message: `Attendance marked: ${type}`,
        data: attendance,
        warnings: validation.warnings,
        info: validation.info,
        // ✅ NEW: Include reconciliation info in response
        reconciliationRequired:
          attendance.validationIssues.length > 0 && !attendance.reconciled,
        validationIssuesCount: attendance.validationIssues.length,
      });
    } catch (error) {
      console.error("\n" + "=".repeat(80));
      console.error("❌ CRITICAL ERROR IN MARK ATTENDANCE");
      console.error("=".repeat(80));
      console.error("❌ Error message:", error.message);
      console.error("❌ Error stack:", error.stack);
      console.error("=".repeat(80) + "\n");

      res.status(500).json({
        success: false,
        message: error.message || "Error marking attendance",
      });
    }
  }
);

// ============ BULK MARK ATTENDANCE ============
router.post(
  "/bulk",
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      const { date, employees, notes } = req.body;

      if (!date || !employees || !Array.isArray(employees)) {
        return res.status(400).json({
          success: false,
          message: "Date and employees array are required",
        });
      }

      // ✅ FIX: Extract hostelId
      const hostelId = req.user.assignedHostel?._id || req.user.assignedHostel;

      const results = {
        total: employees.length,
        success: 0,
        failed: 0,
        errors: [],
      };

      for (const entry of employees) {
        try {
          const { employeeId, type } = entry;

          const employee = await Employee.findById(employeeId);
          if (!employee) {
            results.failed++;
            results.errors.push({
              employeeId,
              error: "Employee not found",
            });
            continue;
          }

          // ✅ FIX: Check if employee belongs to hostel
          const employeeHostelId =
            employee.assignedHostel?._id || employee.assignedHostel;
          if (employeeHostelId.toString() !== hostelId.toString()) {
            results.failed++;
            results.errors.push({
              employeeId,
              error: "Employee does not belong to your hostel",
            });
            continue;
          }

          // Get or create attendance
          let attendance = await EmployeeAttendance.findOne({
            employee: employeeId,
            date: date,
          });

          if (!attendance) {
            attendance = new EmployeeAttendance({
              employee: employeeId,
              assignedHostel: hostelId, // ✅ FIX: Use hostelId
              date: date,
              entries: [],
              createdBy: req.user._id,
            });
          }

          attendance.entries.push({
            type,
            timestamp: new Date(`${date}T12:00:00`),
            source: "bulk",
            markedBy: req.user._id,
            notes: notes || "Bulk marking",
          });

          attendance.updateTimesFromEntries();
          await attendance.save();

          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            employeeId: entry.employeeId,
            error: error.message,
          });
        }
      }

      res.status(200).json({
        success: true,
        message: "Bulk marking completed",
        data: results,
      });
    } catch (error) {
      console.error("❌ Bulk mark error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error in bulk marking",
      });
    }
  }
);

// ============ GET DAILY ATTENDANCE ============
router.get(
  "/daily",
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      const date = req.query.date || new Date().toISOString().split("T")[0];
      // ✅ FIX: Extract hostelId with fallback
      const hostelId = req.user.assignedHostel?._id || req.user.assignedHostel;

      console.log(
        "🔍 Fetching daily attendance for hostel:",
        hostelId,
        "date:",
        date
      );

      const attendance = await EmployeeAttendance.find({
        assignedHostel: hostelId,
        date: date,
      })
        .populate(
          "employee",
          "fullName employeeCode role department currentStatus"
        )
        .sort({ "employee.employeeCode": 1 });

      console.log(`✅ Found ${attendance.length} attendance records`);

      // Get summary
      const summary = await EmployeeAttendance.getDailySummary(hostelId, date);

      res.status(200).json({
        success: true,
        data: {
          date,
          attendance,
          summary,
        },
      });
    } catch (error) {
      console.error("❌ Get daily attendance error:", error);
      console.error("❌ Error stack:", error.stack);
      res.status(500).json({
        success: false,
        message: error.message || "Error fetching attendance",
      });
    }
  }
);

// ============ GET EMPLOYEE ATTENDANCE HISTORY ============
router.get(
  "/employee/:employeeId",
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { startDate, endDate } = req.query;

      const attendance = await EmployeeAttendance.getAttendanceByDateRange(
        employeeId,
        startDate,
        endDate
      );

      res.status(200).json({
        success: true,
        data: attendance,
      });
    } catch (error) {
      console.error("Get employee attendance error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error fetching attendance",
      });
    }
  }
);

// ============ GET ATTENDANCE HISTORY WITH FILTERS ============
router.get(
  "/history",
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      const { startDate, endDate, status, employeeId } = req.query;
      const hostelId = req.user.assignedHostel;

      const query = { assignedHostel: hostelId };

      if (startDate && endDate) {
        query.date = { $gte: startDate, $lte: endDate };
      }

      if (status) {
        query.status = status;
      }

      if (employeeId) {
        query.employee = employeeId;
      }

      const attendance = await EmployeeAttendance.find(query)
        .populate("employee", "fullName employeeCode role department")
        .sort({ date: -1 })
        .limit(100);

      res.status(200).json({
        success: true,
        data: attendance,
      });
    } catch (error) {
      console.error("Get attendance history error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error fetching history",
      });
    }
  }
);

// ============ GET DAILY SUMMARY ============
router.get(
  "/summary",
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      const date = req.query.date || new Date().toISOString().split("T")[0];
      const hostelId = req.user.assignedHostel;

      const summary = await EmployeeAttendance.getDailySummary(hostelId, date);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error("Get summary error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error fetching summary",
      });
    }
  }
);

// ============ GENERATE ATTENDANCE REPORT ============
router.post(
  "/report",
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      const { startDate, endDate, employeeId } = req.body;
      const hostelId = req.user.assignedHostel;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Start date and end date are required",
        });
      }

      const query = {
        assignedHostel: hostelId,
        date: { $gte: startDate, $lte: endDate },
      };

      if (employeeId) {
        query.employee = employeeId;
      }

      const attendance = await EmployeeAttendance.find(query)
        .populate("employee", "fullName employeeCode role department")
        .sort({ date: -1 });

      // Generate summary
      const summary = {
        totalRecords: attendance.length,
        present: attendance.filter((a) => a.status === "present").length,
        absent: attendance.filter((a) => a.status === "absent").length,
        half_day: attendance.filter((a) => a.status === "half_day").length,
        on_leave: attendance.filter((a) => a.status === "on_leave").length,
        late: attendance.filter((a) => a.status === "late").length,
        early_leave: attendance.filter((a) => a.status === "early_leave")
          .length,
      };

      res.status(200).json({
        success: true,
        data: {
          startDate,
          endDate,
          attendance,
          summary,
        },
      });
    } catch (error) {
      console.error("Generate report error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error generating report",
      });
    }
  }
);

// ============ GET UNRECONCILED RECORDS ============
router.get(
  "/unreconciled",
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      const hostelId = req.user.assignedHostel;

      const unreconciled = await EmployeeAttendance.find({
        assignedHostel: hostelId,
        reconciled: false,
        validationIssues: { $exists: true, $ne: [] },
      })
        .populate("employee", "fullName employeeCode role")
        .sort({ date: -1 })
        .limit(50);

      res.status(200).json({
        success: true,
        data: unreconciled,
      });
    } catch (error) {
      console.error("Get unreconciled error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error fetching records",
      });
    }
  }
);

// ============ RECONCILE ATTENDANCE ============
router.put(
  "/reconcile/:id",
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const attendance = await EmployeeAttendance.findById(id);
      if (!attendance) {
        return res.status(404).json({
          success: false,
          message: "Attendance record not found",
        });
      }

      attendance.reconciled = true;
      attendance.reconciledBy = req.user._id;
      attendance.reconciledAt = new Date();
      attendance.reconciliationNotes = notes || "";

      await attendance.save();

      res.status(200).json({
        success: true,
        message: "Attendance reconciled successfully",
        data: attendance,
      });
    } catch (error) {
      console.error("Reconcile error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error reconciling attendance",
      });
    }
  }
);

// ============ GET ATTENDANCE SETTINGS ============
router.get(
  "/settings",
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      const hostelId = req.user.assignedHostel;
      const settings = await EmployeeAttendanceSettings.getOrCreateSettings(
        hostelId
      );

      res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error) {
      console.error("Get settings error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error fetching settings",
      });
    }
  }
);

// ============ UPDATE ATTENDANCE SETTINGS ============
router.put(
  "/settings",
  authorizeRoles("admin", "manager"),
  async (req, res) => {
    try {
      const hostelId = req.user.assignedHostel;
      let settings = await EmployeeAttendanceSettings.findOne({
        assignedHostel: hostelId,
      });

      if (!settings) {
        settings = new EmployeeAttendanceSettings({
          assignedHostel: hostelId,
        });
      }

      // Update fields
      const allowedFields = [
        "workingHoursPerDay",
        "halfDayThreshold",
        "checkInTime",
        "checkOutTime",
        "lateThreshold",
        "earlyLeaveThreshold",
        "weekendDays",
        "autoMarkEnabled",
        "autoMarkTime",
        "deductFullDayForAbsent",
        "deductHalfDayAmount",
        "includeWeekendsInCalculation",
        "overtimeEnabled",
        "overtimeThreshold",
        "overtimeRate",
      ];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          settings[field] = req.body[field];
        }
      });

      await settings.save();

      res.status(200).json({
        success: true,
        message: "Settings updated successfully",
        data: settings,
      });
    } catch (error) {
      console.error("Update settings error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error updating settings",
      });
    }
  }
);

// ============ RUN AUTO-MARK (MANUAL TRIGGER) ============
router.post(
  "/auto-mark",
  authorizeRoles("admin", "manager"),
  async (req, res) => {
    try {
      const { date } = req.body;
      const hostelId = req.user.assignedHostel;

      const targetDate = date || new Date().toISOString().split("T")[0];

      const result = await EmployeeAutoMarkService.manualRun(
        hostelId,
        targetDate
      );

      res.status(200).json({
        success: true,
        message: "Auto-mark completed",
        data: result,
      });
    } catch (error) {
      console.error("Auto-mark error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error running auto-mark",
      });
    }
  }
);

// ============ DELETE ATTENDANCE RECORD ============
router.delete("/:id", authorizeRoles("admin", "manager"), async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await EmployeeAttendance.findByIdAndDelete(id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Attendance deleted successfully",
    });
  } catch (error) {
    console.error("Delete attendance error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error deleting attendance",
    });
  }
});

module.exports = router;
