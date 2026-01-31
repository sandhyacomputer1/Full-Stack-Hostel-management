// src/utils/employeeAttendanceValidator.js

const EmployeeAttendance = require("../models/employeeAttendance.model");
const EmployeeLeaveApplication = require("../models/employeeLeaveApplication.model");
const EmployeeAttendanceSettings = require("../models/employeeAttendanceSettings.model");

class EmployeeAttendanceValidator {
  /**
   * ✅ MAIN VALIDATION - Called before marking attendance
   * Returns: { canMark, errors, warnings, info, leaveConflict }
   */
  static async validateBeforeMark(
    employeeId,
    hostelId,
    date,
    type,
    entryTimestamp
  ) {
    console.log("\n🔍 [VALIDATOR] Starting validation...");
    console.log("  - employeeId:", employeeId);
    console.log("  - hostelId:", hostelId);
    console.log("  - date:", date);
    console.log("  - type:", type);
    console.log("  - entryTimestamp:", entryTimestamp);

    const result = {
      canMark: true,
      errors: [],
      warnings: [],
      info: [],
      leaveConflict: null,
    };

    try {
      // ✅ 1. Check for leave conflict
      const leaveCheck = await this.checkLeaveConflict(
        employeeId,
        date,
        hostelId
      );
      if (leaveCheck.onLeave) {
        result.canMark = false;
        result.errors.push(
          `Employee is on approved ${leaveCheck.leave.leaveType} leave till ${leaveCheck.leave.toDate}`
        );
        result.leaveConflict = leaveCheck.leave;
        return result;
      }

      // ✅ 2. Check IN/OUT sequence
      const sequenceCheck = await this.checkSequence(employeeId, date, type);
      if (!sequenceCheck.isValid) {
        result.canMark = false;
        result.errors.push(sequenceCheck.message);
        return result;
      }

      // ✅ 3. Check for duplicate entry (same type within short time)
      const duplicateCheck = await this.checkDuplicateEntry(
        employeeId,
        date,
        type,
        entryTimestamp
      );
      if (duplicateCheck.isDuplicate) {
        result.canMark = false;
        result.errors.push(duplicateCheck.message);
        return result;
      }

      // ✅ 4. Check for excessive entries (anomaly)
      const excessiveCheck = await this.checkExcessiveEntries(employeeId, date);
      if (excessiveCheck.hasExcessiveEntries) {
        result.warnings.push(excessiveCheck.message);
        result.info.push(
          `This will be the ${excessiveCheck.count + 1}th entry today`
        );
      }

      // ✅ 5. Check for late arrival (if IN)
      if (type === "IN") {
        const lateCheck = await this.checkLateArrival(
          hostelId,
          entryTimestamp,
          date
        );
        if (lateCheck.isLate) {
          result.warnings.push(lateCheck.message);
        }
      }

      // ✅ 6. Check for early leave (if OUT)
      if (type === "OUT") {
        const earlyCheck = await this.checkEarlyLeave(
          hostelId,
          entryTimestamp,
          date
        );
        if (earlyCheck.isEarlyLeave) {
          result.warnings.push(earlyCheck.message);
        }
      }

      // ✅ 7. Check for weekend marking
      const weekendCheck = await this.checkWeekendMarking(
        hostelId,
        entryTimestamp
      );
      if (weekendCheck.isWeekend) {
        result.warnings.push(weekendCheck.message);
      }

      // ✅ 8. Check for after-hours marking
      const afterHoursCheck = await this.checkAfterHoursMarking(
        hostelId,
        entryTimestamp
      );
      if (afterHoursCheck.isAfterHours) {
        result.warnings.push(afterHoursCheck.message);
      }

      console.log("\n✅ [VALIDATOR] Validation complete:", result);
      return result;
    } catch (error) {
      console.error("❌ [VALIDATOR] Error:", error);
      result.canMark = false;
      result.errors.push("Validation failed: " + error.message);
      return result;
    }
  }

  /**
   * ✅ 1. CHECK LEAVE CONFLICT
   */
  static async checkLeaveConflict(employeeId, date, hostelId) {
    try {
      const leave = await EmployeeLeaveApplication.findOne({
        employee: employeeId,
        assignedHostel: hostelId,
        status: "approved",
        fromDate: { $lte: date },
        toDate: { $gte: date },
      });

      if (leave) {
        return { onLeave: true, leave };
      }

      return { onLeave: false };
    } catch (error) {
      console.error("Check leave conflict error:", error);
      return { onLeave: false };
    }
  }

  /**
   * ✅ 2. CHECK IN/OUT SEQUENCE
   * Ensures alternating IN → OUT → IN → OUT pattern
   */
  static async checkSequence(employeeId, date, type) {
    try {
      console.log("\n🔍 [SEQUENCE CHECK] Starting...");

      const attendance = await EmployeeAttendance.findOne({
        employee: employeeId,
        date: date,
      });

      // No attendance record yet - must start with IN
      if (
        !attendance ||
        !attendance.entries ||
        attendance.entries.length === 0
      ) {
        console.log("  - No existing attendance found");
        if (type === "OUT") {
          return {
            isValid: false,
            message: "Cannot mark OUT without marking IN first",
          };
        }
        return { isValid: true };
      }

      // Sort entries by timestamp
      const sortedEntries = [...attendance.entries].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );

      const lastEntry = sortedEntries[sortedEntries.length - 1];

      console.log("  - Last entry type:", lastEntry.type);
      console.log("  - Current request type:", type);
      console.log("  - Last entry timestamp:", lastEntry.timestamp);

      // Check if trying to mark same type consecutively
      if (lastEntry.type === type) {
        console.log("  ❌ Invalid sequence - consecutive", type);
        return {
          isValid: false,
          message: `Last entry was already ${type}. Next entry must be ${
            type === "IN" ? "OUT" : "IN"
          }`,
        };
      }

      console.log("  ✅ Sequence is valid");
      return { isValid: true };
    } catch (error) {
      console.error("Check sequence error:", error);
      return { isValid: true }; // Allow on error
    }
  }

  /**
   * ✅ 3. CHECK DUPLICATE ENTRY
   * Prevents marking same type within 5 minutes
   */
  static async checkDuplicateEntry(employeeId, date, type, entryTimestamp) {
    try {
      const attendance = await EmployeeAttendance.findOne({
        employee: employeeId,
        date: date,
      });

      if (
        !attendance ||
        !attendance.entries ||
        attendance.entries.length === 0
      ) {
        return { isDuplicate: false };
      }

      // Check if same type was marked within last 5 minutes
      const recentEntries = attendance.entries.filter((entry) => {
        if (entry.type !== type) return false;

        const timeDiff = Math.abs(
          new Date(entryTimestamp) - new Date(entry.timestamp)
        );
        const minutesDiff = timeDiff / (1000 * 60);

        return minutesDiff < 5;
      });

      if (recentEntries.length > 0) {
        return {
          isDuplicate: true,
          message: `Duplicate ${type} entry detected. Same type was marked ${Math.floor(
            (new Date(entryTimestamp) - new Date(recentEntries[0].timestamp)) /
              (1000 * 60)
          )} minutes ago`,
        };
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error("Check duplicate entry error:", error);
      return { isDuplicate: false };
    }
  }

  /**
   * ✅ 4. CHECK EXCESSIVE ENTRIES (ANOMALY DETECTION)
   * Flags if more than 6 entries (3 IN/OUT pairs) in a day
   */
  static async checkExcessiveEntries(employeeId, date) {
    try {
      const attendance = await EmployeeAttendance.findOne({
        employee: employeeId,
        date: date,
      });

      if (!attendance || !attendance.entries) {
        return { hasExcessiveEntries: false, count: 0 };
      }

      const entryCount = attendance.entries.length;
      const threshold = 6; // 3 IN/OUT pairs is normal max

      if (entryCount >= threshold) {
        return {
          hasExcessiveEntries: true,
          count: entryCount,
          threshold: threshold,
          message: `⚠️ Excessive entries detected: ${entryCount} entries today (threshold: ${threshold}). This may indicate an anomaly`,
        };
      }

      return { hasExcessiveEntries: false, count: entryCount };
    } catch (error) {
      console.error("Check excessive entries error:", error);
      return { hasExcessiveEntries: false, count: 0 };
    }
  }

  /**
   * ✅ 5. CHECK LATE ARRIVAL
   */
  static async checkLateArrival(hostelId, entryTimestamp, date) {
    try {
      const settings = await EmployeeAttendanceSettings.getOrCreateSettings(
        hostelId
      );

      if (!settings.checkInTime) {
        return { isLate: false };
      }

      // Parse expected check-in time
      const [hours, minutes] = settings.checkInTime.split(":").map(Number);
      const expectedTime = new Date(date || entryTimestamp);
      expectedTime.setHours(hours, minutes, 0, 0);

      // Add late threshold (in minutes)
      expectedTime.setMinutes(
        expectedTime.getMinutes() + (settings.lateThreshold || 0)
      );

      const actualTime = new Date(entryTimestamp);

      if (actualTime > expectedTime) {
        const minutesLate = Math.floor(
          (actualTime - expectedTime) / (1000 * 60)
        );
        return {
          isLate: true,
          minutesLate: minutesLate,
          message: `Employee checked in ${minutesLate} minutes late (Expected: ${
            settings.checkInTime
          }, Actual: ${actualTime.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })})`,
        };
      }

      return { isLate: false };
    } catch (error) {
      console.error("Check late arrival error:", error);
      return { isLate: false };
    }
  }

  /**
   * ✅ 6. CHECK EARLY LEAVE
   */
  static async checkEarlyLeave(hostelId, entryTimestamp, date) {
    try {
      const settings = await EmployeeAttendanceSettings.getOrCreateSettings(
        hostelId
      );

      if (!settings.checkOutTime) {
        return { isEarlyLeave: false };
      }

      // Parse expected check-out time
      const [hours, minutes] = settings.checkOutTime.split(":").map(Number);
      const expectedTime = new Date(date || entryTimestamp);
      expectedTime.setHours(hours, minutes, 0, 0);

      // Subtract early leave threshold (in minutes)
      expectedTime.setMinutes(
        expectedTime.getMinutes() - (settings.earlyLeaveThreshold || 0)
      );

      const actualTime = new Date(entryTimestamp);

      if (actualTime < expectedTime) {
        const minutesEarly = Math.floor(
          (expectedTime - actualTime) / (1000 * 60)
        );
        return {
          isEarlyLeave: true,
          minutesEarly: minutesEarly,
          message: `Employee checked out ${minutesEarly} minutes early (Expected: ${
            settings.checkOutTime
          }, Actual: ${actualTime.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })})`,
        };
      }

      return { isEarlyLeave: false };
    } catch (error) {
      console.error("Check early leave error:", error);
      return { isEarlyLeave: false };
    }
  }

  /**
   * ✅ 7. CHECK WEEKEND MARKING
   */
  static async checkWeekendMarking(hostelId, entryTimestamp) {
    try {
      const settings = await EmployeeAttendanceSettings.getOrCreateSettings(
        hostelId
      );

      const dayOfWeek = new Date(entryTimestamp).getDay(); // 0 = Sunday, 6 = Saturday

      const weekendDays = settings.weekendDays || [0, 6]; // Default: Sunday & Saturday

      if (weekendDays.includes(dayOfWeek)) {
        const dayNames = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        return {
          isWeekend: true,
          message: `Attendance marked on weekend (${dayNames[dayOfWeek]})`,
        };
      }

      return { isWeekend: false };
    } catch (error) {
      console.error("Check weekend marking error:", error);
      return { isWeekend: false };
    }
  }

  /**
   * ✅ 8. CHECK AFTER-HOURS MARKING
   * Flags if marked very early (before 5 AM) or very late (after 11 PM)
   */
  static async checkAfterHoursMarking(hostelId, entryTimestamp) {
    try {
      const hour = new Date(entryTimestamp).getHours();

      // Flag if before 5 AM or after 11 PM
      if (hour < 5 || hour >= 23) {
        return {
          isAfterHours: true,
          message: `Attendance marked outside normal hours (${new Date(
            entryTimestamp
          ).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })})`,
        };
      }

      return { isAfterHours: false };
    } catch (error) {
      console.error("Check after-hours marking error:", error);
      return { isAfterHours: false };
    }
  }

  /**
   * ✅ 9. DETERMINE STATUS
   * Calculates final attendance status based on hours and flags
   */
  static async determineStatus(
    hostelId,
    totalHours,
    isLate,
    isEarlyLeave,
    hasLeave
  ) {
    try {
      if (hasLeave) {
        return "on_leave";
      }

      const settings = await EmployeeAttendanceSettings.getOrCreateSettings(
        hostelId
      );

      const workingHours = settings.workingHoursPerDay || 8;
      const halfDayThreshold = settings.halfDayThreshold || 4;

      // Not checked out yet
      if (!totalHours || totalHours === 0) {
        return "present";
      }

      // Half day
      if (totalHours < halfDayThreshold) {
        return "half_day";
      }

      // Early leave
      if (isEarlyLeave && totalHours < workingHours) {
        return "early_leave";
      }

      // Late
      if (isLate) {
        return "late";
      }

      // Present (full day)
      if (totalHours >= workingHours) {
        return "present";
      }

      return "present";
    } catch (error) {
      console.error("Determine status error:", error);
      return "present";
    }
  }

  /**
   * ✅ 10. GET VALIDATION SUMMARY FOR DISPLAY
   * Used in reconciliation tab to show why record was flagged
   */
  static async getValidationSummary(attendanceRecord) {
    const issues = [];

    try {
      // Check for excessive entries
      if (attendanceRecord.entries && attendanceRecord.entries.length > 6) {
        issues.push({
          type: "EXCESSIVE_ENTRIES",
          severity: "high",
          message: `${attendanceRecord.entries.length} entries in a single day`,
        });
      }

      // Check for late
      if (attendanceRecord.isLate) {
        issues.push({
          type: "LATE_ARRIVAL",
          severity: "medium",
          message: "Employee arrived late",
        });
      }

      // Check for early leave
      if (attendanceRecord.isEarlyLeave) {
        issues.push({
          type: "EARLY_LEAVE",
          severity: "medium",
          message: "Employee left early",
        });
      }

      // Check for missing checkout
      if (attendanceRecord.checkInTime && !attendanceRecord.checkOutTime) {
        issues.push({
          type: "MISSING_CHECKOUT",
          severity: "high",
          message: "Missing check-out entry",
        });
      }

      // Check for odd number of entries (incomplete pairs)
      if (
        attendanceRecord.entries &&
        attendanceRecord.entries.length % 2 !== 0
      ) {
        issues.push({
          type: "INCOMPLETE_PAIR",
          severity: "high",
          message: "Incomplete IN/OUT pair",
        });
      }

      return issues;
    } catch (error) {
      console.error("Get validation summary error:", error);
      return [];
    }
  }
}

module.exports = EmployeeAttendanceValidator;
