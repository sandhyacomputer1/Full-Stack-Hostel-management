// server/cron/attendanceAutoMarkService.js
const Attendance = require("../models/attendance.model");
const Student = require("../models/student.model");
const AttendanceSettings = require("../models/attendanceSettings.model");
const LeaveApplication = require("../models/leaveApplication.model");
const Hostel = require("../models/hostel.model");
const cron = require("node-cron");

class AttendanceAutoMarkService {
  constructor() {
    this.cronJobs = new Map(); // Store multiple cron jobs (one per hostel)
  }

  // ============================================
  // CORE MARKING LOGIC
  // ============================================

  /**
   * Mark daily attendance for a specific hostel
   * @param {string} date - "YYYY-MM-DD"
   * @param {ObjectId} hostelId - Hostel ID
   */
  async markDailyAttendance(date, hostelId) {
    try {
      console.log(`📅 Processing attendance for ${date} (hostel ${hostelId})...`);

      // Check if state-based marking is enabled for this hostel
      const settings = await AttendanceSettings.findOne({ assignedHostel: hostelId });
      if (!settings?.stateBasedPresentAbsent) {
        console.log("⚠️ State-based marking is disabled for this hostel");
        return { date, total: 0, present: 0, absent: 0, leave: 0 };
      }

      // ✅ Get students on approved leave (return date NOT included)
      const studentsOnLeave = await LeaveApplication.find({
        status: "approved",
        assignedHostel: hostelId,
        fromDate: { $lte: date },
        $or: [
          { earlyReturn: false, toDate: { $gte: date } },
          { earlyReturn: true, actualReturnDate: { $gt: date } }, // ✅ Return date excluded
        ],
      }).distinct("student");

      // Get all active students for this hostel
      const allStudents = await Student.find({
        status: "active",
        assignedHostel: hostelId,
      }).select("_id name rollNumber currentHostelState lastStateUpdate");

      let presentCount = 0;
      let absentCount = 0;
      let alreadyMarked = 0;
      let markedOnLeave = 0;

      for (const student of allStudents) {
        try {
          const isOnLeave = studentsOnLeave.some(
            (id) => String(id) === String(student._id)
          );

          // Check if already marked for this date
          const existingRecord = await Attendance.findOne({
            student: student._id,
            date,
            assignedHostel: hostelId,
            deleted: { $ne: true },
          });

          if (existingRecord) {
            alreadyMarked++;
            continue;
          }

          // ✅ If student is on leave, mark as on_leave
          if (isOnLeave) {
            await Attendance.create({
              student: student._id,
              assignedHostel: hostelId,
              date,
              type: "IN",
              timestamp: new Date(`${date}T23:59:59Z`),
              status: "on_leave",
              source: "auto",
              shift: "night",
              reconciled: true,
              notes: "Auto-marked as on leave",
            });
            markedOnLeave++;
            continue;
          }

          // ✅ Otherwise, mark based on current hostel state
          const currentState = student.currentHostelState || "IN";
          const status = currentState === "IN" ? "present" : "absent";

          await Attendance.create({
            student: student._id,
            assignedHostel: hostelId,
            date,
            type: currentState,
            timestamp: new Date(`${date}T23:59:59Z`),
            status,
            source: "auto",
            shift: "night",
            reconciled: true,
            notes: `Auto-marked ${status} - State: ${currentState}`,
          });

          if (status === "present") presentCount++;
          else absentCount++;
        } catch (err) {
          console.error(
            `❌ Error processing student ${student.name} (${student._id}):`,
            err.message
          );
        }
      }

      const result = {
        date,
        hostelId,
        total: allStudents.length,
        present: presentCount,
        absent: absentCount,
        leave: markedOnLeave,
        alreadyMarked,
        processed: presentCount + absentCount + markedOnLeave,
      };

      // ✅ Update settings with last run info
      try {
        await AttendanceSettings.findOneAndUpdate(
          { assignedHostel: hostelId },
          {
            lastRunInfo: {
              date,
              present: presentCount,
              absent: absentCount,
              leave: markedOnLeave,
              ranAt: new Date(),
            },
          }
        );
      } catch (err) {
        console.error("❌ Failed to update lastRunInfo:", err);
      }

      console.log(`✅ Auto-mark completed for ${date}:`, result);
      return result;
    } catch (err) {
      console.error("❌ Auto-mark error:", err);
      throw err;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Process multiple days at once
   */
  async processMultiDayAbsence(fromDate, toDate, hostelId) {
    try {
      const results = [];
      const currentDate = new Date(fromDate);
      const endDate = new Date(toDate);

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().slice(0, 10);
        const result = await this.markDailyAttendance(dateStr, hostelId);
        results.push(result);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return results;
    } catch (err) {
      console.error("Multi-day processing error:", err);
      throw err;
    }
  }

  /**
   * Mark for a specific date (alias for markDailyAttendance)
   */
  async markForDate(date, hostelId) {
    return this.markDailyAttendance(date, hostelId);
  }

  /**
   * Mark for today (alias)
   */
  async markForToday(hostelId) {
    const today = new Date().toISOString().slice(0, 10);
    return this.markForDate(today, hostelId);
  }

  // ============================================
  // SCHEDULER METHODS
  // ============================================

  /**
   * Start scheduler for ALL hostels
   * Fetches all active hostels and schedules auto-mark for each
   */
  async startScheduler() {
    console.log("🔄 Starting attendance auto-mark scheduler for all hostels...");

    try {
      // Get all active hostels
      const hostels = await Hostel.find({ status: "active" });

      if (hostels.length === 0) {
        console.log("⚠️ No active hostels found");
        return;
      }

      console.log(`🏢 Found ${hostels.length} active hostel(s)`);

      // Schedule auto-mark for each hostel
      for (const hostel of hostels) {
        try {
          // Get settings for this hostel
          const settings = await AttendanceSettings.findOne({
            assignedHostel: hostel._id,
          });

          if (!settings) {
            console.log(`⚠️ No settings found for hostel: ${hostel.name}`);
            continue;
          }

          if (!settings.autoMarkEnabled) {
            console.log(`⏭️ Auto-mark disabled for hostel: ${hostel.name}`);
            continue;
          }

          const autoMarkTime = settings.autoMarkTime || "23:59";

          // Start scheduler for this hostel
          this.startSchedulerForHostel(hostel._id, autoMarkTime, hostel.name);
        } catch (err) {
          console.error(`❌ Failed to schedule for hostel ${hostel.name}:`, err.message);
        }
      }

      console.log("✅ Attendance auto-mark scheduler started successfully");
    } catch (err) {
      console.error("❌ Failed to start attendance scheduler:", err);
      throw err;
    }
  }

  /**
   * Start scheduler for a single hostel
   * @param {ObjectId} hostelId - Hostel ID
   * @param {string} autoMarkTime - Time in "HH:mm" format
   * @param {string} hostelName - Hostel name (for logging)
   */
  startSchedulerForHostel(hostelId, autoMarkTime = "23:59", hostelName = "Unknown") {
    const hostelIdStr = String(hostelId);

    // Stop existing job for this hostel if any
    if (this.cronJobs.has(hostelIdStr)) {
      const existingJob = this.cronJobs.get(hostelIdStr);
      existingJob.stop();
      this.cronJobs.delete(hostelIdStr);
    }

    const [hours, minutes] = autoMarkTime.split(":");
    const cronExpression = `${minutes} ${hours} * * *`;

    // Create new cron job
    const cronJob = cron.schedule(cronExpression, async () => {
      const today = new Date().toISOString().slice(0, 10);
      console.log(`⏰ Running scheduled auto-mark for ${hostelName} (${hostelIdStr})...`);

      try {
        await this.markDailyAttendance(today, hostelId);
        console.log(`✅ Scheduled auto-mark completed for ${hostelName}`);
      } catch (err) {
        console.error(`❌ Scheduled auto-mark failed for ${hostelName}:`, err.message);
      }
    });

    // Store the cron job
    this.cronJobs.set(hostelIdStr, cronJob);

    console.log(`✅ Scheduler started for ${hostelName} at ${autoMarkTime} (${cronExpression})`);
  }

  /**
   * Stop scheduler for a specific hostel
   */
  stopSchedulerForHostel(hostelId) {
    const hostelIdStr = String(hostelId);

    if (this.cronJobs.has(hostelIdStr)) {
      const cronJob = this.cronJobs.get(hostelIdStr);
      cronJob.stop();
      this.cronJobs.delete(hostelIdStr);
      console.log(`🛑 Scheduler stopped for hostel ${hostelIdStr}`);
      return true;
    }

    return false;
  }

  /**
   * Stop all schedulers
   */
  stopScheduler() {
    console.log("🛑 Stopping all attendance schedulers...");

    for (const [hostelId, cronJob] of this.cronJobs.entries()) {
      cronJob.stop();
      console.log(`🛑 Stopped scheduler for hostel ${hostelId}`);
    }

    this.cronJobs.clear();
    console.log("✅ All schedulers stopped");
  }

  /**
   * Get status of all running schedulers
   */
  getSchedulerStatus() {
    const status = [];

    for (const [hostelId, cronJob] of this.cronJobs.entries()) {
      status.push({
        hostelId,
        running: cronJob.running || false,
      });
    }

    return status;
  }

  /**
   * Restart all schedulers (reload from database)
   */
  async restartScheduler() {
    console.log("🔄 Restarting attendance schedulers...");
    this.stopScheduler();
    await this.startScheduler();
  }
}

module.exports = new AttendanceAutoMarkService();
