const cron = require("node-cron");
const Employee = require("../models/employee.model");
const EmployeeAttendance = require("../models/employeeAttendance.model");
const EmployeeLeaveApplication = require("../models/employeeLeaveApplication.model");
const EmployeeAttendanceSettings = require("../models/employeeAttendanceSettings.model");

class EmployeeAutoMarkService {
  /**
   * Run auto-mark for a specific hostel and date
   */
  static async runAutoMark(hostelId, date) {
    try {
      console.log(
        `[Employee Auto-Mark] Running for hostel ${hostelId} on ${date}`
      );

      const settings = await EmployeeAttendanceSettings.getOrCreateSettings(
        hostelId
      );

      if (!settings.autoMarkEnabled) {
        console.log(
          `[Employee Auto-Mark] Auto-mark disabled for hostel ${hostelId}`
        );
        return {
          success: false,
          message: "Auto-mark is disabled for this hostel",
        };
      }

      // Check if date is weekend
      if (settings.isWeekend(date)) {
        console.log(`[Employee Auto-Mark] ${date} is a weekend. Skipping.`);
        return {
          success: false,
          message: "Weekend day - no auto-mark",
        };
      }

      // Check if date is holiday
      const holiday = settings.getHoliday(date);
      if (holiday) {
        console.log(
          `[Employee Auto-Mark] ${date} is a holiday: ${holiday.name}`
        );
        await this.markAllAsHoliday(hostelId, date, holiday);
        return {
          success: true,
          message: `Marked as holiday: ${holiday.name}`,
        };
      }

      // Get all active employees for this hostel
      const employees = await Employee.find({
        assignedHostel: hostelId, // FIXED: was hostelId
        status: "ACTIVE",
      });

      if (employees.length === 0) {
        console.log(
          `[Employee Auto-Mark] No active employees found for hostel ${hostelId}`
        );
        return {
          success: false,
          message: "No active employees found",
        };
      }

      // Get employees on approved leave for this date
      const employeesOnLeave = await EmployeeLeaveApplication.find({
        assignedHostel: hostelId,
        status: "approved",
        fromDate: { $lte: date },
        toDate: { $gte: date },
      }).populate("employee");

      const leaveEmployeeIds = employeesOnLeave.map((leave) =>
        leave.employee._id.toString()
      );

      let stats = {
        total: employees.length,
        processed: 0,
        markedPresent: 0,
        markedAbsent: 0,
        markedHalfDay: 0,
        markedOnLeave: 0,
        alreadyMarked: 0,
        errors: 0,
      };

      // Process each employee
      for (const employee of employees) {
        try {
          const employeeId = employee._id.toString();

          // Check if already marked
          const existingRecord = await EmployeeAttendance.findOne({
            employee: employee._id,
            date: date,
          });

          if (existingRecord && existingRecord.entries.length > 0) {
            stats.alreadyMarked++;
            stats.processed++;

            // Update status based on work hours if not already set properly
            await this.updateAttendanceStatus(existingRecord, settings);
            continue;
          }

          // Check if employee is on leave
          if (leaveEmployeeIds.includes(employeeId)) {
            const leave = employeesOnLeave.find(
              (l) => l.employee._id.toString() === employeeId
            );
            await this.markAsOnLeave(employee, hostelId, date, leave._id);
            stats.markedOnLeave++;
            stats.processed++;
            continue;
          }

          // Mark based on current status
          if (employee.currentStatus === "IN") {
            // Employee is IN but didn't check out - mark as present
            await this.markAsPresent(employee, hostelId, date, settings);
            stats.markedPresent++;
          } else {
            // Employee is OUT - mark as absent
            await this.markAsAbsent(employee, hostelId, date);
            stats.markedAbsent++;
          }

          stats.processed++;
        } catch (error) {
          console.error(
            `[Employee Auto-Mark] Error processing employee ${employee.employeeCode}:`,
            error
          );
          stats.errors++;
        }
      }

      // Update last run info in settings
      settings.lastRunInfo = {
        lastRunDate: date,
        lastRunTime: new Date(),
        employeesProcessed: stats.processed,
        markedPresent: stats.markedPresent,
        markedAbsent: stats.markedAbsent,
        markedOnLeave: stats.markedOnLeave,
        errors: stats.errors,
      };
      await settings.save();

      console.log(`[Employee Auto-Mark] Completed:`, stats);

      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error("[Employee Auto-Mark] Error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Mark employee as present
   */
  static async markAsPresent(employee, hostelId, date, settings) {
    const attendance = await EmployeeAttendance.findOneAndUpdate(
      { employee: employee._id, date },
      {
        employee: employee._id,
        assignedHostel: hostelId,
        date,
        status: "present",
        totalHours: settings.workingHoursPerDay,
        entries: [
          {
            type: "IN",
            timestamp: new Date(`${date}T${settings.checkInTime}:00`),
            source: "auto",
            notes: "Auto-marked as present (employee was IN)",
          },
        ],
        notes: "Auto-marked at end of day",
      },
      { upsert: true, new: true }
    );

    return attendance;
  }

  /**
   * Mark employee as absent
   */
  static async markAsAbsent(employee, hostelId, date) {
    const attendance = await EmployeeAttendance.findOneAndUpdate(
      { employee: employee._id, date },
      {
        employee: employee._id,
        assignedHostel: hostelId,
        date,
        status: "absent",
        totalHours: 0,
        entries: [],
        notes: "Auto-marked as absent (employee was OUT)",
      },
      { upsert: true, new: true }
    );

    return attendance;
  }

  /**
   * Mark employee as on leave
   */
  static async markAsOnLeave(employee, hostelId, date, leaveApplicationId) {
    const attendance = await EmployeeAttendance.findOneAndUpdate(
      { employee: employee._id, date },
      {
        employee: employee._id,
        assignedHostel: hostelId,
        date,
        status: "onleave", // FIXED: was on_leave
        totalHours: 0,
        leaveApplication: leaveApplicationId,
        entries: [
          {
            type: "IN",
            timestamp: new Date(`${date}T00:00:00`),
            source: "auto",
            notes: "On approved leave",
          },
        ],
        notes: "Employee on approved leave",
      },
      { upsert: true, new: true }
    );

    return attendance;
  }

  /**
   * Mark all employees as holiday
   */
  static async markAllAsHoliday(hostelId, date, holiday) {
    const employees = await Employee.find({
      assignedHostel: hostelId, // FIXED: was hostelId
      status: "ACTIVE",
    });

    for (const employee of employees) {
      await EmployeeAttendance.findOneAndUpdate(
        { employee: employee._id, date },
        {
          employee: employee._id,
          assignedHostel: hostelId,
          date,
          status: "holiday",
          totalHours: 0,
          entries: [],
          notes: `Holiday: ${holiday.name}`,
        },
        { upsert: true, new: true }
      );
    }
  }

  /**
   * Update attendance status based on work hours
   */
  static async updateAttendanceStatus(attendanceRecord, settings) {
    if (!attendanceRecord.checkInTime) {
      attendanceRecord.status = "absent";
      await attendanceRecord.save();
      return;
    }

    // Calculate total hours
    attendanceRecord.updateTimesFromEntries();

    // Determine status
    if (attendanceRecord.totalHours >= settings.workingHoursPerDay) {
      attendanceRecord.status = "present";
    } else if (attendanceRecord.totalHours >= settings.halfDayThreshold) {
      attendanceRecord.status = "halfday"; // FIXED: was half_day
    } else {
      // if you want very short days to count as absent instead:
      // attendanceRecord.status = 'absent';
      attendanceRecord.status = "halfday";
    }

    // Check for late or early leave
    if (attendanceRecord.checkInTime) {
      const isLate = settings.isLate(attendanceRecord.checkInTime);
      if (isLate) {
        attendanceRecord.isLate = true;
        if (attendanceRecord.status === "present") {
          attendanceRecord.status = "late";
        }
      }
    }

    if (attendanceRecord.checkOutTime) {
      const isEarly = settings.isEarlyLeave(attendanceRecord.checkOutTime);
      if (isEarly) {
        attendanceRecord.isEarlyLeave = true;
        if (attendanceRecord.status === "present") {
          attendanceRecord.status = "earlyleave"; // FIXED: matches enum
        }
      }
    }

    await attendanceRecord.save();
  }

  /**
   * Start cron scheduler (runs daily at 11:59 PM)
   */
  static async startScheduler() {
    // Run every day at 11:59 PM
    cron.schedule("59 23 * * *", async () => {
      console.log("[Employee Auto-Mark Cron] Starting daily auto-mark...");

      try {
        // Get all hostels with settings
        const allSettings = await EmployeeAttendanceSettings.find({
          autoMarkEnabled: true,
        });

        const today = new Date().toISOString().split("T")[0];

        for (const settings of allSettings) {
          await this.runAutoMark(settings.assignedHostel, today);
        }

        console.log("[Employee Auto-Mark Cron] Completed successfully");
      } catch (error) {
        console.error("[Employee Auto-Mark Cron] Error:", error);
      }
    });

    console.log(
      "[Employee Auto-Mark Cron] Scheduler initialized - will run daily at 11:59 PM"
    );
  }

  /**
   * Manual trigger for specific date (for backfilling)
   */
  static async manualRun(hostelId, date) {
    console.log(`[Employee Auto-Mark Manual] Running for ${date}`);
    return await this.runAutoMark(hostelId, date);
  }

  /**
   * Run for date range (bulk backfill)
   */
  static async runForDateRange(hostelId, startDate, endDate) {
    const results = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
      const dateString = date.toISOString().split("T")[0];
      const result = await this.runAutoMark(hostelId, dateString);
      results.push({
        date: dateString,
        ...result,
      });
    }

    return results;
  }
}

module.exports = EmployeeAutoMarkService;
