const express = require("express");
const mongoose = require("mongoose"); // ✅ Add this
const {
  authenticateToken,
  authorizeAdminOrManager,
} = require("../middlewares/auth");

const router = express.Router();

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private (Admin/Manager)
router.get(
  "/stats",
  authenticateToken,
  authorizeAdminOrManager,
  async (req, res) => {
    try {
      const Student = require("../models/student.model");
      const Fee = require("../models/fees.model");
      const Attendance = require("../models/attendance.model");
      const Expense = require("../models/expense.model");

      const now = new Date();
      const today = new Date(now);

      // ✅ FIXED: Use string format for attendance date matching
      const todayStr = today.toISOString().split("T")[0]; // "YYYY-MM-DD"

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        0,
        0,
        0,
        0
      );
      const endOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59,
        999
      );

      const assignedHostel = req.user.assignedHostel._id;

      console.log(`📊 Dashboard Stats for Hostel: ${assignedHostel} on ${todayStr}`);

      // 1) Total active students in this hostel
      const totalStudents = await Student.countDocuments({
        status: "active",
        assignedHostel,
      });

      console.log(`👥 Total Students: ${totalStudents}`);

      // 2) This month collected amount (paidAmount if present, else amount)
      const totalFeesThisMonthAgg = await Fee.aggregate([
        {
          $match: {
            paymentDate: { $gte: startOfMonth },
            status: "paid",
            assignedHostel: new mongoose.Types.ObjectId(assignedHostel),
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $cond: [
                  { $ifNull: ["$paidAmount", false] },
                  "$paidAmount",
                  "$amount",
                ],
              },
            },
          },
        },
      ]);

      const totalFeesThisMonth = totalFeesThisMonthAgg[0]?.total || 0;

      console.log(`💰 Fees This Month: ₹${totalFeesThisMonth}`);

      // 3) Pending installments count
      const pendingFeesAgg = await Student.aggregate([
        {
          $match: {
            status: "active",
            assignedHostel: new mongoose.Types.ObjectId(assignedHostel),
          },
        },
        { $unwind: "$feeStructure.installmentBreakdown" },
        {
          $match: {
            "feeStructure.installmentBreakdown.status": "pending",
          },
        },
        { $count: "total" },
      ]);

      const pendingFeesCount = pendingFeesAgg[0]?.total || 0;

      console.log(`⏳ Pending Installments: ${pendingFeesCount}`);

      // ✅ 4) FIXED: Today's attendance using UNIQUE students
      const todayPresentStudents = await Attendance.distinct("student", {
        assignedHostel: new mongoose.Types.ObjectId(assignedHostel),
        date: todayStr, // ✅ Use string format
        status: "present",
        deleted: { $ne: true },
      });

      const todayAbsentStudents = await Attendance.distinct("student", {
        assignedHostel: new mongoose.Types.ObjectId(assignedHostel),
        date: todayStr,
        status: "absent",
        deleted: { $ne: true },
      });

      const todayLateStudents = await Attendance.distinct("student", {
        assignedHostel: new mongoose.Types.ObjectId(assignedHostel),
        date: todayStr,
        status: "late",
        deleted: { $ne: true },
      });

      const attendanceToday = {
        present: todayPresentStudents.length,
        absent: todayAbsentStudents.length,
        late: todayLateStudents.length,
        total: totalStudents,
        rate: totalStudents > 0
          ? Math.round((todayPresentStudents.length / totalStudents) * 100)
          : 0,
      };

      console.log(`✅ Attendance Today:`, attendanceToday);

      // ✅ 5) FIXED: Gate Entry Status (IN/OUT)
      const latestEntries = await Attendance.aggregate([
        {
          $match: {
            assignedHostel: new mongoose.Types.ObjectId(assignedHostel),
            deleted: { $ne: true },
            type: { $in: ["IN", "OUT"] },
          },
        },
        { $sort: { timestamp: -1 } },
        {
          $group: {
            _id: "$student",
            lastEntry: { $first: "$$ROOT" },
          },
        },
      ]);

      let studentsInHostel = 0;
      let studentsOutHostel = 0;

      const activeStudentIds = await Student.find({
        assignedHostel,
        status: "active",
      }).distinct("_id");

      activeStudentIds.forEach((studentId) => {
        const entry = latestEntries.find(
          (e) => e.lastEntry.student.toString() === studentId.toString()
        );

        if (entry && entry.lastEntry.type === "IN") {
          studentsInHostel++;
        } else {
          studentsOutHostel++;
        }
      });

      const gateEntry = {
        in: studentsInHostel,
        out: studentsOutHostel,
        occupancyRate: totalStudents > 0
          ? Math.round((studentsInHostel / totalStudents) * 100)
          : 0,
      };

      console.log(`🚪 Gate Entry:`, gateEntry);

      // 6) Monthly hostel expenses
      const monthlyExpensesAgg = await Expense.aggregate([
        {
          $match: {
            date: { $gte: startOfMonth },
            assignedHostel: new mongoose.Types.ObjectId(assignedHostel),
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]);

      const monthlyExpenses = monthlyExpensesAgg[0]?.total || 0;

      console.log(`💸 Monthly Expenses: ₹${monthlyExpenses}`);

      // 7) Recent fees (latest 5 paid)
      const recentFees = await Fee.find({
        status: "paid",
        assignedHostel,
      })
        .sort({ paymentDate: -1 })
        .limit(5)
        .populate("student", "name studentId class batch")
        .lean();

      // 8) Recent hostel expenses
      const recentExpenses = await Expense.find({
        assignedHostel,
      })
        .sort({ date: -1 })
        .limit(5)
        .lean();

      // 9) Upcoming birthdays (next 7 days)
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const upcomingBirthdays = await Student.find({
        assignedHostel,
        status: "active",
        dateOfBirth: { $exists: true, $ne: null },
      })
        .select("name studentId class dateOfBirth")
        .lean();

      // Filter birthdays in JavaScript (more reliable than $dayOfYear)
      const todayMonth = today.getMonth();
      const todayDate = today.getDate();
      const nextWeekMonth = nextWeek.getMonth();
      const nextWeekDate = nextWeek.getDate();

      const filteredBirthdays = upcomingBirthdays
        .filter((student) => {
          if (!student.dateOfBirth) return false;
          const bday = new Date(student.dateOfBirth);
          const bdayMonth = bday.getMonth();
          const bdayDate = bday.getDate();

          // Handle year-end wrap (December to January)
          if (nextWeekMonth < todayMonth) {
            return (
              (bdayMonth === todayMonth && bdayDate >= todayDate) ||
              (bdayMonth === nextWeekMonth && bdayDate <= nextWeekDate)
            );
          }

          // Same month
          if (bdayMonth === todayMonth) {
            return bdayDate >= todayDate;
          }

          // Next month
          if (bdayMonth === nextWeekMonth) {
            return bdayDate <= nextWeekDate;
          }

          return false;
        })
        .slice(0, 10);

      console.log(`🎂 Upcoming Birthdays: ${filteredBirthdays.length}`);

      return res.json({
        success: true,
        stats: {
          totalStudents,
          totalFeesThisMonth,
          pendingFeesCount,
          monthlyExpenses,
          attendanceToday,
          gateEntry, // ✅ Added gate entry data
        },
        recentActivities: {
          fees: recentFees,
          expenses: recentExpenses,
        },
        upcomingBirthdays: filteredBirthdays,
      });
    } catch (error) {
      console.error("❌ Get dashboard stats error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to get dashboard stats",
        error: error.message,
      });
    }
  }
);

module.exports = router;
