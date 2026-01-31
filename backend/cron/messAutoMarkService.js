// server/cron/messAutoMarkService.js
const cron = require("node-cron");
const MessAttendance = require("../models/messAttendance.model");
const MessSettings = require("../models/messSettings.model");
const MealPlan = require("../models/mealPlan.model");
const Student = require("../models/student.model");
const LeaveApplication = require("../models/leaveApplication.model");
const Hostel = require("../models/hostel.model");

/**
 * Auto-mark absent for students who didn't mark present during meal time
 * @param {string} date - "YYYY-MM-DD"
 * @param {string} mealType - "breakfast", "lunch", or "dinner"
 * @param {ObjectId} hostelId - Hostel ID
 */
async function autoMarkAbsentForMeal(date, mealType, hostelId) {
  try {
    console.log(`🔄 Auto-marking absent for ${mealType} on ${date} (hostel: ${hostelId})...`);

    // 1. Get all active students with meal plans for this hostel
    const activePlans = await MealPlan.find({ active: true })
      .populate({
        path: "student",
        match: {
          status: "active",
          assignedHostel: hostelId, // ✅ Filter by hostel
        },
      })
      .lean();

    // Filter out plans where student is null (didn't match the populate criteria)
    const validPlans = activePlans.filter((p) => p.student !== null);
    const studentIds = validPlans.map((p) => p.student._id);

    if (studentIds.length === 0) {
      console.log("No students with active meal plans for this hostel");
      return { marked: 0, skipped: 0 };
    }

    // 2. Get students who are on approved leave
    const studentsOnLeave = await LeaveApplication.find({
      student: { $in: studentIds },
      status: "approved",
      assignedHostel: hostelId,
      fromDate: { $lte: date },
      $or: [
        { earlyReturn: false, toDate: { $gte: date } },
        { earlyReturn: true, actualReturnDate: { $gt: date } },
      ],
    })
      .distinct("student")
      .lean();

    const eligibleStudentIds = studentIds.filter(
      (id) => !studentsOnLeave.some((leaveId) => String(leaveId) === String(id))
    );

    // 3. Get students already marked (present, absent, or on_mess_off) for this meal
    const alreadyMarked = await MessAttendance.find({
      student: { $in: eligibleStudentIds },
      date: date,
      mealType: mealType,
      assignedHostel: hostelId, // ✅ Filter by hostel
    })
      .distinct("student")
      .lean();

    // 4. Students who need to be marked absent
    const absentStudentIds = eligibleStudentIds.filter(
      (id) => !alreadyMarked.some((markedId) => String(markedId) === String(id))
    );

    console.log(
      `📊 ${mealType} - Eligible: ${eligibleStudentIds.length}, Already marked: ${alreadyMarked.length}, Marking absent: ${absentStudentIds.length}`
    );

    // 5. Bulk upsert absent status
    let markedCount = 0;
    for (const studentId of absentStudentIds) {
      await MessAttendance.findOneAndUpdate(
        { student: studentId, date, mealType, assignedHostel: hostelId },
        {
          student: studentId,
          date,
          mealType,
          assignedHostel: hostelId, // ✅ Add hostel
          status: "absent",
          timestamp: new Date(),
          source: "manual", // Changed from "auto" to match your schema enum
          notes: "Auto-marked absent after meal time",
        },
        { upsert: true, new: true }
      );
      markedCount++;
    }

    console.log(`✅ Auto-marked ${markedCount} students absent for ${mealType}`);

    return {
      marked: markedCount,
      skipped: studentsOnLeave.length,
      total: eligibleStudentIds.length,
    };
  } catch (err) {
    console.error(`❌ Auto-mark error for ${mealType}:`, err);
    throw err;
  }
}

/**
 * Start cron scheduler based on meal timings from settings
 * Runs for ALL active hostels
 */
async function startScheduler() {
  try {
    console.log("🔄 Starting mess auto-mark scheduler...");

    // Get all active hostels
    const hostels = await Hostel.find({ status: "active" });

    if (hostels.length === 0) {
      console.log("⚠️ No active hostels found");
      return;
    }

    console.log(`🏢 Found ${hostels.length} active hostel(s) for mess scheduling`);

    // For each hostel, get settings and schedule
    for (const hostel of hostels) {
      try {
        // ✅ FIXED: Get settings by assignedHostel instead of static ID
        const settings = await MessSettings.findOne({
          assignedHostel: hostel._id,
        });

        if (!settings) {
          console.log(`⚠️ No mess settings found for hostel: ${hostel.name}`);
          continue;
        }

        if (!settings.autoMarkAbsent?.enabled) {
          console.log(`⏭️ Mess auto-mark disabled for hostel: ${hostel.name}`);
          continue;
        }

        const { breakfast, lunch, dinner } = settings.mealTimings;

        // Schedule breakfast auto-mark (5 minutes after end time)
        if (breakfast && breakfast.end) {
          const [endHour, endMin] = breakfast.end.split(":").map(Number);
          const cronExpression = `${endMin + 5} ${endHour} * * *`;

          cron.schedule(cronExpression, async () => {
            const today = new Date().toISOString().slice(0, 10);
            await autoMarkAbsentForMeal(today, "breakfast", hostel._id);
          });

          console.log(
            `✅ Breakfast auto-mark scheduled for ${hostel.name}: ${cronExpression}`
          );
        }

        // Schedule lunch auto-mark
        if (lunch && lunch.end) {
          const [endHour, endMin] = lunch.end.split(":").map(Number);
          const cronExpression = `${endMin + 5} ${endHour} * * *`;

          cron.schedule(cronExpression, async () => {
            const today = new Date().toISOString().slice(0, 10);
            await autoMarkAbsentForMeal(today, "lunch", hostel._id);
          });

          console.log(
            `✅ Lunch auto-mark scheduled for ${hostel.name}: ${cronExpression}`
          );
        }

        // Schedule dinner auto-mark
        if (dinner && dinner.end) {
          const [endHour, endMin] = dinner.end.split(":").map(Number);
          const cronExpression = `${endMin + 5} ${endHour} * * *`;

          cron.schedule(cronExpression, async () => {
            const today = new Date().toISOString().slice(0, 10);
            await autoMarkAbsentForMeal(today, "dinner", hostel._id);
          });

          console.log(
            `✅ Dinner auto-mark scheduled for ${hostel.name}: ${cronExpression}`
          );
        }
      } catch (err) {
        console.error(
          `❌ Failed to schedule mess auto-mark for ${hostel.name}:`,
          err.message
        );
      }
    }

    console.log("✅ Mess auto-mark scheduler started successfully");
  } catch (err) {
    console.error("❌ Failed to start mess auto-mark scheduler:", err);
    throw err;
  }
}

module.exports = {
  autoMarkAbsentForMeal,
  startScheduler,
};
