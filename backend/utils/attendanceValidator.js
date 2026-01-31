// server/utils/attendanceValidator.js
const Attendance = require("../models/attendance.model");

/**
 * Validate attendance entry for suspicious patterns
 * @param {Object} entry - { studentId, type, date, timestamp }
 * @returns {Array} - Array of validation issues
 */
async function validateAttendanceEntry({ studentId, type, date, timestamp }) {
  const issues = [];

  try {
    // Get student's attendance records for the date
    const todayRecords = await Attendance.find({
      student: studentId,
      date,
    })
      .sort({ timestamp: 1 })
      .lean();

    // ✅ VALIDATION 1: Check for duplicate entries
    if (todayRecords.length > 0) {
      const lastEntry = todayRecords[todayRecords.length - 1];
      const timeDiff = (timestamp - new Date(lastEntry.timestamp)) / 1000; // seconds

      // Duplicate if same type within 2 minutes
      if (lastEntry.type === type && timeDiff < 120) {
        issues.push({
          type: "DUPLICATE_ENTRY",
          severity: "warning",
          message: `Duplicate ${type} entry within ${Math.round(
            timeDiff / 60
          )} minutes`,
          data: {
            lastEntryTime: lastEntry.timestamp,
            currentTime: timestamp,
            differenceSeconds: timeDiff,
          },
        });
      }

      // ✅ VALIDATION 2: Check for very short duration
      if (lastEntry.type === "IN" && type === "OUT") {
        if (timeDiff < 300) {
          // Less than 5 minutes
          issues.push({
            type: "SHORT_DURATION",
            severity: "warning",
            message: `Very short stay: ${Math.round(timeDiff / 60)} minutes`,
            data: {
              durationSeconds: timeDiff,
              durationMinutes: Math.round(timeDiff / 60),
            },
          });
        }
      }

      // ✅ VALIDATION 3: Check for missing OUT before IN
      if (type === "IN" && lastEntry.type === "IN") {
        issues.push({
          type: "MISSING_OUT",
          severity: "error",
          message: "Previous IN entry not closed with OUT",
          data: {
            lastEntryType: lastEntry.type,
            lastEntryTime: lastEntry.timestamp,
          },
        });
      }

      // ✅ VALIDATION 4: Check for missing IN before OUT
      if (type === "OUT" && lastEntry.type === "OUT") {
        issues.push({
          type: "MISSING_IN",
          severity: "error",
          message: "Previous OUT entry not followed by IN",
          data: {
            lastEntryType: lastEntry.type,
            lastEntryTime: lastEntry.timestamp,
          },
        });
      }
    }

    // ✅ VALIDATION 5: Check for excessive entries (more than 10 per day)
    if (todayRecords.length >= 10) {
      issues.push({
        type: "EXCESSIVE_ENTRIES",
        severity: "warning",
        message: `Unusual activity: ${todayRecords.length + 1} entries today`,
        data: {
          totalEntries: todayRecords.length + 1,
        },
      });
    }

    // ✅ VALIDATION 6: Check for late-night entries (after 11 PM, before 5 AM)
    const hour = new Date(timestamp).getHours();
    if (hour >= 23 || hour < 5) {
      issues.push({
        type: "UNUSUAL_TIME",
        severity: "info",
        message: `Entry at unusual time: ${new Date(
          timestamp
        ).toLocaleTimeString()}`,
        data: {
          hour,
          timeString: new Date(timestamp).toLocaleTimeString(),
        },
      });
    }

    // ✅ VALIDATION 7: Check for weekend entries (Sunday)
    const dayOfWeek = new Date(timestamp).getDay();
    if (dayOfWeek === 0) {
      // Sunday
      issues.push({
        type: "WEEKEND_ENTRY",
        severity: "info",
        message: "Entry on Sunday (weekend)",
        data: {
          day: "Sunday",
          dayOfWeek,
        },
      });
    }

    return issues;
  } catch (err) {
    console.error("Validation error:", err);
    return []; // Return empty array on error
  }
}

/**
 * Batch validate multiple entries
 * @param {Array} entries - Array of entry objects
 * @returns {Array} - Array of validation results
 */
async function validateAttendanceBatch(entries) {
  const results = [];

  for (const entry of entries) {
    const issues = await validateAttendanceEntry(entry);
    results.push({
      entry,
      issues,
      hasIssues: issues.length > 0,
      hasErrors: issues.some((i) => i.severity === "error"),
    });
  }

  return results;
}

/**
 * Check if student has unreconciled entries
 * @param {String} studentId - Student ID
 * @param {String} date - Date in YYYY-MM-DD format
 * @returns {Boolean} - True if has unreconciled entries
 */
async function hasUnreconciledEntries(studentId, date) {
  const count = await Attendance.countDocuments({
    student: studentId,
    date,
    reconciled: false,
  });

  return count > 0;
}

/**
 * Get validation statistics for a date
 * @param {String} date - Date in YYYY-MM-DD format
 * @returns {Object} - Statistics object
 */
async function getValidationStats(date) {
  const records = await Attendance.find({ date }).lean();

  const stats = {
    total: records.length,
    reconciled: 0,
    unreconciled: 0,
    withIssues: 0,
    issueTypes: {},
    severityCounts: {
      info: 0,
      warning: 0,
      error: 0,
    },
  };

  records.forEach((record) => {
    if (record.reconciled) {
      stats.reconciled++;
    } else {
      stats.unreconciled++;
    }

    if (record.validationIssues && record.validationIssues.length > 0) {
      stats.withIssues++;

      record.validationIssues.forEach((issue) => {
        // Count by type
        stats.issueTypes[issue.type] = (stats.issueTypes[issue.type] || 0) + 1;

        // Count by severity
        stats.severityCounts[issue.severity] =
          (stats.severityCounts[issue.severity] || 0) + 1;
      });
    }
  });

  return stats;
}

/**
 * Get all unreconciled entries with issues
 * @param {String} date - Optional date filter
 * @returns {Array} - Array of attendance records with issues
 */
async function getUnreconciledWithIssues(date = null) {
  const query = {
    reconciled: false,
    validationIssues: { $exists: true, $ne: [] },
  };

  if (date) {
    query.date = date;
  }

  const records = await Attendance.find(query)
    .populate("student", "name rollNumber block")
    .sort({ date: -1, timestamp: -1 })
    .lean();

  return records;
}

module.exports = {
  validateAttendanceEntry,
  validateAttendanceBatch,
  hasUnreconciledEntries,
  getValidationStats,
  getUnreconciledWithIssues,
};
