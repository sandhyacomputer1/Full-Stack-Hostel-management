// server/routes/reports.routes.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Student = require("../models/student.model");
const Attendance = require("../models/attendance.model");
const Fee = require("../models/fees.model");
const MessAttendance = require("../models/messAttendance.model");
const Marks = require("../models/marks.model");
const StudentBankAccount = require("../models/studentBankAccount.model");
const BankTransaction = require("../models/bankTransaction.model");
const Expense = require("../models/expense.model");
const LeaveApplication = require("../models/leaveApplication.model");

const {
    authenticateToken,
    authorizeAdmin,
    authorizeAdminOrManager,
} = require("../middlewares/auth");

// ============================================
// 1. OVERVIEW REPORT
// ============================================
router.get(
    "/overview",
    authenticateToken,
    authorizeAdminOrManager,
    async (req, res) => {
        try {
            const hostelId = req.user.assignedHostel._id;
            const today = new Date();
            const todayStr = today.toISOString().split("T")[0];

            console.log(`📊 Overview Analytics for Hostel: ${hostelId} on ${todayStr}`);

            // ===== STUDENTS DATA =====
            const totalStudents = await Student.countDocuments({
                assignedHostel: hostelId,
                status: "active",
            });

            const studentsByClass = await Student.aggregate([
                { $match: { assignedHostel: hostelId, status: "active" } },
                { $group: { _id: "$class", count: { $sum: 1 } } },
                { $project: { class: "$_id", count: 1, _id: 0 } },
                { $sort: { class: 1 } },
            ]);

            console.log(`👥 Total Students: ${totalStudents}, Classes: ${studentsByClass.length}`);

            // ===== 🚪 GATE ENTRY STATUS (IN/OUT - Current State) =====
            // This was MISSING in your route!
            const latestEntries = await Attendance.aggregate([
                {
                    $match: {
                        assignedHostel: new mongoose.Types.ObjectId(hostelId),
                        deleted: { $ne: true },
                        type: { $in: ["IN", "OUT"] }, // Only gate entry records
                    },
                },
                { $sort: { timestamp: -1 } }, // Latest first
                {
                    $group: {
                        _id: "$student",
                        lastEntry: { $first: "$$ROOT" },
                    },
                },
            ]);

            let studentsInHostel = 0;
            let studentsOutHostel = 0;

            // Get all active student IDs
            const activeStudentIds = await Student.find({
                assignedHostel: hostelId,
                status: "active",
            }).distinct("_id");

            // Count IN/OUT based on latest entry type
            activeStudentIds.forEach((studentId) => {
                const entry = latestEntries.find(
                    (e) => e.lastEntry.student.toString() === studentId.toString()
                );

                if (entry && entry.lastEntry.type === "IN") {
                    studentsInHostel++;
                } else {
                    studentsOutHostel++; // Default to OUT if no entry or last entry was OUT
                }
            });

            // Students on approved leave
            const studentsOnLeave = await LeaveApplication.countDocuments({
                assignedHostel: hostelId,
                status: "approved",
                fromDate: { $lte: todayStr },
                $or: [
                    { earlyReturn: false, toDate: { $gte: todayStr } },
                    { earlyReturn: true, actualReturnDate: { $gte: todayStr } },
                ],
            });

            const occupancyRate = totalStudents > 0
                ? Math.round((studentsInHostel / totalStudents) * 100)
                : 0;

            console.log(`🚪 Gate Entry - IN: ${studentsInHostel}, OUT: ${studentsOutHostel}, LEAVE: ${studentsOnLeave}, Occupancy: ${occupancyRate}%`);

            // ===== ✅ DAILY ATTENDANCE (Present/Absent) =====
            const todayPresentStudents = await Attendance.distinct("student", {
                assignedHostel: hostelId,
                date: todayStr,
                status: "present",
                deleted: { $ne: true },
            });

            const todayPresent = todayPresentStudents.length;
            const todayAbsent = totalStudents - todayPresent;
            const attendanceRate =
                totalStudents > 0
                    ? Math.round((todayPresent / totalStudents) * 100)
                    : 0;

            console.log(`✅ Attendance - Present: ${todayPresent}, Absent: ${todayAbsent}, Rate: ${attendanceRate}%`);

            // ===== 📈 WEEKLY ATTENDANCE TREND =====
            const last7Days = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                last7Days.push(d.toISOString().split("T")[0]);
            }

            const weeklyTrend = await Promise.all(
                last7Days.map(async (date) => {
                    const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
                        new Date(date).getDay()
                    ];

                    const presentStudents = await Attendance.distinct("student", {
                        assignedHostel: hostelId,
                        date: date,
                        status: "present",
                        deleted: { $ne: true },
                    });

                    const count = presentStudents.length;
                    const rate =
                        totalStudents > 0
                            ? Math.round((count / totalStudents) * 100)
                            : 0;

                    return { name: dayName, rate };
                })
            );

            // ===== 💰 FEES CALCULATION =====
            const students = await Student.find({
                assignedHostel: hostelId,
                status: "active",
            })
                .select("feeStructure nillFees")
                .lean();

            let totalCollected = 0;
            let totalPending = 0;

            students.forEach((student) => {
                if (student.nillFees) return;

                const feeStructure = student.feeStructure || {};
                const installments = Array.isArray(feeStructure.installmentBreakdown)
                    ? feeStructure.installmentBreakdown
                    : [];

                const paid = installments.reduce((sum, inst) => {
                    if (inst.status === "paid") {
                        return sum + (Number(inst.paidAmount) || Number(inst.amount) || 0);
                    }
                    return sum;
                }, 0);

                const baseFee = Number(feeStructure.baseFee) || 0;
                const admissionFee = Number(feeStructure.admissionFee) || 0;
                const otherCharges = Number(feeStructure.otherCharges) || 0;
                const otherFees = Array.isArray(feeStructure.otherFees)
                    ? feeStructure.otherFees.reduce(
                        (sum, f) => sum + (Number(f.amount) || 0),
                        0
                    )
                    : 0;

                const totalFee = baseFee + admissionFee + otherCharges + otherFees;

                totalCollected += paid;
                totalPending += Math.max(0, totalFee - paid);
            });

            const collectionRate =
                totalCollected + totalPending > 0
                    ? Math.round(
                        (totalCollected / (totalCollected + totalPending)) * 100
                    )
                    : 0;

            // ===== 🍽️ MESS ATTENDANCE =====
            const todayMess = await MessAttendance.aggregate([
                {
                    $match: {
                        assignedHostel: new mongoose.Types.ObjectId(hostelId),
                        date: todayStr,
                        status: "present",
                    },
                },
                { $group: { _id: "$mealType", count: { $sum: 1 } } },
            ]);

            const messMap = todayMess.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {});

            // ===== 🚨 ALERTS =====
            const alerts = [];
            if (attendanceRate < 75) {
                alerts.push({
                    type: "danger",
                    message: `Low attendance today: ${attendanceRate}%`,
                });
            }
            if (occupancyRate < 50) {
                alerts.push({
                    type: "warning",
                    message: `Low hostel occupancy: ${occupancyRate}%`,
                });
            }
            if (totalPending > totalCollected * 0.5) {
                alerts.push({
                    type: "warning",
                    message: `High pending fees: ₹${totalPending.toLocaleString()}`,
                });
            }

            // ===== 📤 RESPONSE =====
            const response = {
                success: true,
                data: {
                    students: {
                        total: totalStudents,
                        byClass: studentsByClass,
                    },
                    gateEntry: {
                        in: studentsInHostel,
                        out: studentsOutHostel,
                        onLeave: studentsOnLeave,
                        occupancyRate,
                    },
                    attendance: {
                        todayPresent,
                        todayAbsent,
                        rate: attendanceRate,
                        weeklyTrend,
                    },
                    fees: {
                        collected: totalCollected,
                        pending: totalPending,
                        collectionRate,
                    },
                    mess: {
                        breakfast: messMap.breakfast || 0,
                        lunch: messMap.lunch || 0,
                        dinner: messMap.dinner || 0,
                    },
                    alerts,
                },
            };

            console.log("✅ Overview response prepared successfully");
            res.json(response);
        } catch (error) {
            console.error("❌ Overview analytics error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch overview analytics",
                error: error.message,
            });
        }
    }
);

// ============================================
// 3. ATTENDANCE REPORTS
// ============================================
// ============================================
// ATTENDANCE ANALYTICS - MONTHLY (FIXED)
// ============================================
router.get(
    "/attendance/monthly",
    authenticateToken,
    authorizeAdminOrManager,
    async (req, res) => {
        try {
            const { month, class: className, block } = req.query;
            const hostelId = req.user.assignedHostel._id;

            if (!month) {
                return res.status(400).json({
                    success: false,
                    message: "Month is required (format: YYYY-MM)",
                });
            }

            const [year, monthNum] = month.split("-");
            const startDate = `${year}-${monthNum}-01`;
            const lastDay = new Date(year, monthNum, 0).getDate();
            const endDate = `${year}-${monthNum}-${String(lastDay).padStart(2, "0")}`;

            console.log(`📅 Monthly Attendance: ${startDate} to ${endDate}`);

            const matchQuery = {
                assignedHostel: hostelId,
                status: "active",
            };
            if (className) matchQuery.class = className;
            if (block) matchQuery.hostelBlock = block;

            const students = await Student.find(matchQuery)
                .select("_id name studentId rollNumber class hostelBlock")
                .lean();

            console.log(`👥 Found ${students.length} students`);

            // ✅ FIX: Group by student + date FIRST, then by status
            const attendanceRecords = await Attendance.aggregate([
                {
                    $match: {
                        assignedHostel: hostelId,
                        date: { $gte: startDate, $lte: endDate },
                        student: { $in: students.map((s) => s._id) },
                        deleted: { $ne: true },
                    },
                },
                // ✅ STEP 1: Get unique student-date combinations with their status
                {
                    $group: {
                        _id: { student: "$student", date: "$date" },
                        status: { $first: "$status" }, // Take first status for that day
                    },
                },
                // ✅ STEP 2: Now count days by student and status
                {
                    $group: {
                        _id: { student: "$_id.student", status: "$status" },
                        count: { $sum: 1 },
                    },
                },
            ]);

            console.log(`📊 Attendance records: ${attendanceRecords.length} entries`);

            const records = students.map((student) => {
                const studentAttendance = attendanceRecords.filter(
                    (a) => a._id.student.toString() === student._id.toString()
                );

                const presentDays =
                    studentAttendance.find((a) => a._id.status === "present")?.count || 0;
                const absentDays =
                    studentAttendance.find((a) => a._id.status === "absent")?.count || 0;
                const leaveDays =
                    studentAttendance.find((a) => a._id.status === "on_leave")?.count || 0;

                const totalDays = presentDays + absentDays + leaveDays;
                const attendanceRate =
                    totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

                return {
                    _id: student._id,
                    studentName: student.name,
                    studentId: student.studentId,
                    rollNumber: student.rollNumber,
                    class: student.class,
                    block: student.hostelBlock,
                    presentDays,
                    absentDays,
                    leaveDays,
                    totalDays,
                    attendanceRate,
                };
            });

            // Sort by attendance rate (highest first)
            records.sort((a, b) => b.attendanceRate - a.attendanceRate);

            const summary = {
                totalStudents: records.length,
                averageAttendance:
                    records.length > 0
                        ? Math.round(
                            records.reduce((sum, r) => sum + r.attendanceRate, 0) /
                            records.length
                        )
                        : 0,
                categories: {
                    excellent: records.filter((r) => r.attendanceRate >= 90).length,
                    average: records.filter(
                        (r) => r.attendanceRate >= 75 && r.attendanceRate < 90
                    ).length,
                    poor: records.filter((r) => r.attendanceRate < 75).length,
                },
                totalPresent: records.reduce((sum, r) => sum + r.presentDays, 0),
                totalAbsent: records.reduce((sum, r) => sum + r.absentDays, 0),
                totalLeave: records.reduce((sum, r) => sum + r.leaveDays, 0),
            };

            console.log(`✅ Avg attendance: ${summary.averageAttendance}%`);

            res.json({
                success: true,
                data: { records, summary },
            });
        } catch (error) {
            console.error("❌ Monthly attendance error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to generate monthly attendance report",
                error: error.message,
            });
        }
    }
);

// ============================================
// ATTENDANCE ANALYTICS - YEARLY (FIXED)
// ============================================
router.get(
    "/attendance/yearly",
    authenticateToken,
    authorizeAdminOrManager,
    async (req, res) => {
        try {
            const { year, class: className, block } = req.query;
            const hostelId = req.user.assignedHostel._id;

            if (!year) {
                return res.status(400).json({
                    success: false,
                    message: "Year is required",
                });
            }

            const startDate = `${year}-01-01`;
            const endDate = `${year}-12-31`;

            console.log(`📅 Yearly Attendance: ${year}`);

            const matchQuery = {
                assignedHostel: hostelId,
                status: "active",
            };
            if (className) matchQuery.class = className;
            if (block) matchQuery.hostelBlock = block;

            const students = await Student.find(matchQuery)
                .select("_id name studentId rollNumber class hostelBlock")
                .lean();

            // ✅ FIX: Same two-step grouping as monthly
            const attendanceRecords = await Attendance.aggregate([
                {
                    $match: {
                        assignedHostel: hostelId,
                        date: { $gte: startDate, $lte: endDate },
                        student: { $in: students.map((s) => s._id) },
                        deleted: { $ne: true },
                    },
                },
                // ✅ STEP 1: Get unique student-date combinations
                {
                    $group: {
                        _id: { student: "$student", date: "$date" },
                        status: { $first: "$status" },
                    },
                },
                // ✅ STEP 2: Count days by student and status
                {
                    $group: {
                        _id: { student: "$_id.student", status: "$status" },
                        count: { $sum: 1 },
                    },
                },
            ]);

            const records = students.map((student) => {
                const studentAttendance = attendanceRecords.filter(
                    (a) => a._id.student.toString() === student._id.toString()
                );

                const presentDays =
                    studentAttendance.find((a) => a._id.status === "present")?.count || 0;
                const absentDays =
                    studentAttendance.find((a) => a._id.status === "absent")?.count || 0;
                const leaveDays =
                    studentAttendance.find((a) => a._id.status === "on_leave")?.count || 0;

                const totalDays = presentDays + absentDays + leaveDays;
                const attendanceRate =
                    totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

                return {
                    _id: student._id,
                    studentName: student.name,
                    studentId: student.studentId,
                    rollNumber: student.rollNumber,
                    class: student.class,
                    block: student.hostelBlock,
                    presentDays,
                    absentDays,
                    leaveDays,
                    totalDays,
                    attendanceRate,
                };
            });

            records.sort((a, b) => b.attendanceRate - a.attendanceRate);

            const summary = {
                totalStudents: records.length,
                averageAttendance:
                    records.length > 0
                        ? Math.round(
                            records.reduce((sum, r) => sum + r.attendanceRate, 0) /
                            records.length
                        )
                        : 0,
                categories: {
                    excellent: records.filter((r) => r.attendanceRate >= 90).length,
                    average: records.filter(
                        (r) => r.attendanceRate >= 75 && r.attendanceRate < 90
                    ).length,
                    poor: records.filter((r) => r.attendanceRate < 75).length,
                },
                totalPresent: records.reduce((sum, r) => sum + r.presentDays, 0),
                totalAbsent: records.reduce((sum, r) => sum + r.absentDays, 0),
                totalLeave: records.reduce((sum, r) => sum + r.leaveDays, 0),
            };

            console.log(`✅ Yearly avg: ${summary.averageAttendance}%`);

            res.json({
                success: true,
                data: { records, summary },
            });
        } catch (error) {
            console.error("❌ Yearly attendance error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to generate yearly attendance report",
                error: error.message,
            });
        }
    }
);

// ============================================
// ATTENDANCE ANALYTICS - CUSTOM SUMMARY (FIXED)
// ============================================
router.get(
    "/attendance/summary",
    authenticateToken,
    authorizeAdminOrManager,
    async (req, res) => {
        try {
            const { startDate, endDate, class: className, block } = req.query;
            const hostelId = req.user.assignedHostel._id;

            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: "Start date and end date are required",
                });
            }

            console.log(`📅 Custom Summary: ${startDate} to ${endDate}`);

            const matchQuery = {
                assignedHostel: hostelId,
                status: "active",
            };
            if (className) matchQuery.class = className;
            if (block) matchQuery.hostelBlock = block;

            const students = await Student.find(matchQuery)
                .select("_id name studentId rollNumber class hostelBlock")
                .lean();

            // ✅ FIX: Same two-step grouping
            const attendanceRecords = await Attendance.aggregate([
                {
                    $match: {
                        assignedHostel: hostelId,
                        date: { $gte: startDate, $lte: endDate },
                        student: { $in: students.map((s) => s._id) },
                        deleted: { $ne: true },
                    },
                },
                // ✅ STEP 1: Get unique student-date combinations
                {
                    $group: {
                        _id: { student: "$student", date: "$date" },
                        status: { $first: "$status" },
                    },
                },
                // ✅ STEP 2: Count days by student and status
                {
                    $group: {
                        _id: { student: "$_id.student", status: "$status" },
                        count: { $sum: 1 },
                    },
                },
            ]);

            const records = students.map((student) => {
                const studentAttendance = attendanceRecords.filter(
                    (a) => a._id.student.toString() === student._id.toString()
                );

                const presentDays =
                    studentAttendance.find((a) => a._id.status === "present")?.count || 0;
                const absentDays =
                    studentAttendance.find((a) => a._id.status === "absent")?.count || 0;
                const leaveDays =
                    studentAttendance.find((a) => a._id.status === "on_leave")?.count || 0;

                const totalDays = presentDays + absentDays + leaveDays;
                const attendanceRate =
                    totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

                return {
                    _id: student._id,
                    studentName: student.name,
                    studentId: student.studentId,
                    rollNumber: student.rollNumber,
                    class: student.class,
                    block: student.hostelBlock,
                    presentDays,
                    absentDays,
                    leaveDays,
                    totalDays,
                    attendanceRate,
                };
            });

            records.sort((a, b) => b.attendanceRate - a.attendanceRate);

            const summary = {
                totalStudents: records.length,
                averageAttendance:
                    records.length > 0
                        ? Math.round(
                            records.reduce((sum, r) => sum + r.attendanceRate, 0) /
                            records.length
                        )
                        : 0,
                categories: {
                    excellent: records.filter((r) => r.attendanceRate >= 90).length,
                    average: records.filter(
                        (r) => r.attendanceRate >= 75 && r.attendanceRate < 90
                    ).length,
                    poor: records.filter((r) => r.attendanceRate < 75).length,
                },
                totalPresent: records.reduce((sum, r) => sum + r.presentDays, 0),
                totalAbsent: records.reduce((sum, r) => sum + r.absentDays, 0),
                totalLeave: records.reduce((sum, r) => sum + r.leaveDays, 0),
            };

            console.log(`✅ Summary avg: ${summary.averageAttendance}%`);

            res.json({
                success: true,
                data: { records, summary },
            });
        } catch (error) {
            console.error("❌ Attendance summary error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to generate attendance summary report",
                error: error.message,
            });
        }
    }
);

// ============================================
// 4. FEE REPORTS
// ============================================

router.get(
    "/fees/collection",
    authenticateToken,
    authorizeAdminOrManager,
    async (req, res) => {
        try {
            const { startDate, endDate, class: className, block } = req.query;
            const hostelId = req.user.assignedHostel._id;

            const studentMatch = {
                assignedHostel: hostelId,
                status: "active",
            };
            if (className) studentMatch.class = className;
            if (block) studentMatch.hostelBlock = block;

            const students = await Student.find(studentMatch)
                .select(
                    "studentId name rollNumber class hostelBlock feeStructure nillFees"
                )
                .lean();

            const records = students.map((student) => {
                const feeStructure = student.feeStructure || {};
                const baseFee = Number(feeStructure.baseFee) || 0;
                const admissionFee = Number(feeStructure.admissionFee) || 0;
                const otherCharges = Number(feeStructure.otherCharges) || 0;
                const otherFees = Array.isArray(feeStructure.otherFees)
                    ? feeStructure.otherFees.reduce(
                        (sum, f) => sum + (Number(f.amount) || 0),
                        0
                    )
                    : 0;

                const totalFee = baseFee + admissionFee + otherCharges + otherFees;

                const installments = Array.isArray(feeStructure.installmentBreakdown)
                    ? feeStructure.installmentBreakdown
                    : [];

                const amountPaid = installments.reduce((sum, inst) => {
                    if (inst.status === "paid") {
                        return sum + (Number(inst.paidAmount) || Number(inst.amount) || 0);
                    }
                    return sum;
                }, 0);

                const amountPending = totalFee - amountPaid;

                const paidInstallments = installments.filter(
                    (inst) => inst.status === "paid" && inst.paidDate
                );
                const lastPaymentDate =
                    paidInstallments.length > 0
                        ? paidInstallments.sort(
                            (a, b) => new Date(b.paidDate) - new Date(a.paidDate)
                        )[0].paidDate
                        : null;

                let status = "pending";
                if (student.nillFees || amountPending <= 0) {
                    status = "paid";
                } else {
                    const hasOverdue = installments.some((inst) => {
                        if (inst.status === "pending" && inst.dueDate) {
                            return new Date() > new Date(inst.dueDate);
                        }
                        return false;
                    });
                    if (hasOverdue) status = "overdue";
                }

                return {
                    studentId: student._id,
                    studentName: student.name,
                    studentIdNumber: student.studentId,
                    rollNumber: student.rollNumber,
                    class: student.class,
                    block: student.hostelBlock,
                    totalFee,
                    amountPaid,
                    amountPending: Math.max(0, amountPending),
                    lastPaymentDate,
                    status,
                };
            });

            const summary = {
                totalStudents: records.length,
                totalExpected: records.reduce((sum, r) => sum + r.totalFee, 0),
                totalCollected: records.reduce((sum, r) => sum + r.amountPaid, 0),
                totalPending: records.reduce((sum, r) => sum + r.amountPending, 0),
                totalOverdue: records
                    .filter((r) => r.status === "overdue")
                    .reduce((sum, r) => sum + r.amountPending, 0),
                overdueCount: records.filter((r) => r.status === "overdue").length,
                collectionRate:
                    records.reduce((sum, r) => sum + r.totalFee, 0) > 0
                        ? Math.round(
                            (records.reduce((sum, r) => sum + r.amountPaid, 0) /
                                records.reduce((sum, r) => sum + r.totalFee, 0)) *
                            100
                        )
                        : 0,
            };

            res.json({
                success: true,
                data: { records, summary },
            });
        } catch (error) {
            console.error("Fee collection report error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to generate fee collection report",
                error: error.message,
            });
        }
    }
);

router.get(
    "/fees/due",
    authenticateToken,
    authorizeAdminOrManager,
    async (req, res) => {
        try {
            const { class: className, block } = req.query;
            const hostelId = req.user.assignedHostel._id;

            const studentMatch = {
                assignedHostel: hostelId,
                status: "active",
                nillFees: false,
            };
            if (className) studentMatch.class = className;
            if (block) studentMatch.hostelBlock = block;

            const students = await Student.find(studentMatch)
                .select("studentId name rollNumber class hostelBlock feeStructure")
                .lean();

            const records = students
                .map((student) => {
                    const feeStructure = student.feeStructure || {};
                    const baseFee = Number(feeStructure.baseFee) || 0;
                    const admissionFee = Number(feeStructure.admissionFee) || 0;
                    const otherCharges = Number(feeStructure.otherCharges) || 0;
                    const otherFees = Array.isArray(feeStructure.otherFees)
                        ? feeStructure.otherFees.reduce(
                            (sum, f) => sum + (Number(f.amount) || 0),
                            0
                        )
                        : 0;

                    const totalFee = baseFee + admissionFee + otherCharges + otherFees;

                    const installments = Array.isArray(feeStructure.installmentBreakdown)
                        ? feeStructure.installmentBreakdown
                        : [];

                    const amountPaid = installments.reduce((sum, inst) => {
                        if (inst.status === "paid") {
                            return sum + (Number(inst.paidAmount) || Number(inst.amount) || 0);
                        }
                        return sum;
                    }, 0);

                    const amountDue = totalFee - amountPaid;

                    const pendingInstallments = installments.filter(
                        (inst) => inst.status === "pending"
                    );
                    let dueDate = null;
                    if (pendingInstallments.length > 0) {
                        const dueDates = pendingInstallments
                            .map((inst) => inst.dueDate)
                            .filter((d) => d)
                            .sort();
                        dueDate = dueDates[0] || null;
                    }

                    if (amountDue > 0) {
                        return {
                            studentId: student._id,
                            studentName: student.name,
                            studentIdNumber: student.studentId,
                            rollNumber: student.rollNumber,
                            class: student.class,
                            block: student.hostelBlock,
                            totalFee,
                            amountPaid,
                            amountDue,
                            dueDate,
                        };
                    }
                    return null;
                })
                .filter((r) => r !== null);

            const summary = {
                totalStudents: records.length,
                totalCollected: records.reduce((sum, r) => sum + r.amountPaid, 0),
                totalPending: records.reduce((sum, r) => sum + r.amountDue, 0),
            };

            res.json({
                success: true,
                data: { records, summary },
            });
        } catch (error) {
            console.error("Fee due report error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to generate fee due report",
                error: error.message,
            });
        }
    }
);

router.get(
    "/fees/overdue",
    authenticateToken,
    authorizeAdminOrManager,
    async (req, res) => {
        try {
            const { class: className, block } = req.query;
            const hostelId = req.user.assignedHostel._id;
            const today = new Date();

            const studentMatch = {
                assignedHostel: hostelId,
                status: "active",
                nillFees: false,
            };
            if (className) studentMatch.class = className;
            if (block) studentMatch.hostelBlock = block;

            const students = await Student.find(studentMatch)
                .select("studentId name rollNumber class hostelBlock feeStructure")
                .lean();

            const records = students
                .map((student) => {
                    const feeStructure = student.feeStructure || {};
                    const baseFee = Number(feeStructure.baseFee) || 0;
                    const admissionFee = Number(feeStructure.admissionFee) || 0;
                    const otherCharges = Number(feeStructure.otherCharges) || 0;
                    const otherFees = Array.isArray(feeStructure.otherFees)
                        ? feeStructure.otherFees.reduce(
                            (sum, f) => sum + (Number(f.amount) || 0),
                            0
                        )
                        : 0;

                    const totalFee = baseFee + admissionFee + otherCharges + otherFees;

                    const installments = Array.isArray(feeStructure.installmentBreakdown)
                        ? feeStructure.installmentBreakdown
                        : [];

                    const amountPaid = installments.reduce((sum, inst) => {
                        if (inst.status === "paid") {
                            return sum + (Number(inst.paidAmount) || Number(inst.amount) || 0);
                        }
                        return sum;
                    }, 0);

                    const amountDue = totalFee - amountPaid;

                    const overdueInstallments = installments.filter((inst) => {
                        if (inst.status === "pending" && inst.dueDate) {
                            return today > new Date(inst.dueDate);
                        }
                        return false;
                    });

                    if (overdueInstallments.length > 0 && amountDue > 0) {
                        const overdueDates = overdueInstallments
                            .map((inst) => new Date(inst.dueDate))
                            .sort((a, b) => a - b);
                        const earliestDueDate = overdueDates[0];
                        const daysOverdue = Math.ceil(
                            (today - earliestDueDate) / (1000 * 60 * 60 * 24)
                        );

                        return {
                            studentId: student._id,
                            studentName: student.name,
                            studentIdNumber: student.studentId,
                            rollNumber: student.rollNumber,
                            class: student.class,
                            block: student.hostelBlock,
                            totalFee,
                            amountPaid,
                            amountDue,
                            dueDate: earliestDueDate,
                            daysOverdue: Math.max(0, daysOverdue),
                        };
                    }
                    return null;
                })
                .filter((r) => r !== null);

            records.sort((a, b) => b.daysOverdue - a.daysOverdue);

            const summary = {
                totalStudents: records.length,
                totalCollected: records.reduce((sum, r) => sum + r.amountPaid, 0),
                totalOverdue: records.reduce((sum, r) => sum + r.amountDue, 0),
                overdueCount: records.length,
            };

            res.json({
                success: true,
                data: { records, summary },
            });
        } catch (error) {
            console.error("Fee overdue report error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to generate fee overdue report",
                error: error.message,
            });
        }
    }
);

// ============================================
// 5. MESS REPORTS
// ============================================

router.get(
    "/mess/monthly",
    authenticateToken,
    authorizeAdminOrManager,
    async (req, res) => {
        try {
            const { month, class: className, block } = req.query;
            const hostelId = req.user.assignedHostel._id;

            if (!month) {
                return res.status(400).json({
                    success: false,
                    message: "Month is required (format: YYYY-MM)",
                });
            }

            const [year, monthNum] = month.split("-");
            const startDate = `${year}-${monthNum}-01`;
            const lastDay = new Date(year, monthNum, 0).getDate();
            const endDate = `${year}-${monthNum}-${String(lastDay).padStart(2, "0")}`;

            const studentMatch = {
                assignedHostel: hostelId,
                status: "active",
            };
            if (className) studentMatch.class = className;
            if (block) studentMatch.hostelBlock = block;

            const students = await Student.find(studentMatch).lean();

            const messRecords = await MessAttendance.find({
                student: { $in: students.map((s) => s._id) },
                date: { $gte: startDate, $lte: endDate },
                status: "present",
            }).lean();

            const studentMeals = {};
            students.forEach((student) => {
                studentMeals[student._id.toString()] = {
                    studentId: student._id,
                    studentName: student.name,
                    rollNumber: student.rollNumber,
                    class: student.class,
                    block: student.hostelBlock,
                    breakfastCount: 0,
                    lunchCount: 0,
                    dinnerCount: 0,
                    totalMeals: 0,
                };
            });

            messRecords.forEach((record) => {
                const studentId = record.student.toString();
                if (studentMeals[studentId]) {
                    if (record.mealType === "breakfast") {
                        studentMeals[studentId].breakfastCount++;
                    } else if (record.mealType === "lunch") {
                        studentMeals[studentId].lunchCount++;
                    } else if (record.mealType === "dinner") {
                        studentMeals[studentId].dinnerCount++;
                    }
                    studentMeals[studentId].totalMeals++;
                }
            });

            const records = Object.values(studentMeals);

            const summary = {
                totalStudents: records.length,
                breakfastCount: records.reduce((sum, r) => sum + r.breakfastCount, 0),
                lunchCount: records.reduce((sum, r) => sum + r.lunchCount, 0),
                dinnerCount: records.reduce((sum, r) => sum + r.dinnerCount, 0),
                totalMeals: records.reduce((sum, r) => sum + r.totalMeals, 0),
            };

            res.json({
                success: true,
                data: { records, summary },
            });
        } catch (error) {
            console.error("Monthly mess report error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to generate monthly mess report",
                error: error.message,
            });
        }
    }
);

router.get(
    "/mess/consumption",
    authenticateToken,
    authorizeAdminOrManager,
    async (req, res) => {
        try {
            const { date, class: className, block } = req.query;
            const hostelId = req.user.assignedHostel._id;

            if (!date) {
                return res.status(400).json({
                    success: false,
                    message: "Date is required (format: YYYY-MM-DD)",
                });
            }

            const studentMatch = {
                assignedHostel: hostelId,
                status: "active",
            };
            if (className) studentMatch.class = className;
            if (block) studentMatch.hostelBlock = block;

            const students = await Student.find(studentMatch).lean();

            const messRecords = await MessAttendance.find({
                student: { $in: students.map((s) => s._id) },
                date: date,
            }).lean();

            const studentMeals = {};
            students.forEach((student) => {
                studentMeals[student._id.toString()] = {
                    studentId: student._id,
                    studentName: student.name,
                    rollNumber: student.rollNumber,
                    class: student.class,
                    block: student.hostelBlock,
                    breakfast: "-",
                    lunch: "-",
                    dinner: "-",
                    mealsToday: 0,
                };
            });

            messRecords.forEach((record) => {
                const studentId = record.student.toString();
                if (studentMeals[studentId]) {
                    if (record.mealType === "breakfast") {
                        studentMeals[studentId].breakfast = record.status;
                    } else if (record.mealType === "lunch") {
                        studentMeals[studentId].lunch = record.status;
                    } else if (record.mealType === "dinner") {
                        studentMeals[studentId].dinner = record.status;
                    }
                    if (record.status === "present") {
                        studentMeals[studentId].mealsToday++;
                    }
                }
            });

            const records = Object.values(studentMeals);

            const summary = {
                totalStudents: records.length,
                breakfastCount: messRecords.filter(
                    (r) => r.mealType === "breakfast" && r.status === "present"
                ).length,
                lunchCount: messRecords.filter(
                    (r) => r.mealType === "lunch" && r.status === "present"
                ).length,
                dinnerCount: messRecords.filter(
                    (r) => r.mealType === "dinner" && r.status === "present"
                ).length,
                totalMeals: messRecords.filter((r) => r.status === "present").length,
            };

            res.json({
                success: true,
                data: { records, summary },
            });
        } catch (error) {
            console.error("Mess consumption report error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to generate mess consumption report",
                error: error.message,
            });
        }
    }
);

// ============================================
// 6. MARKS REPORTS
// ============================================


router.get(
    "/marks/summary",
    authenticateToken,
    authorizeAdminOrManager,
    async (req, res) => {
        try {
            const { examName, class: className, subject } = req.query;
            const hostelId = req.user.assignedHostel._id;

            const studentMatch = {
                assignedHostel: hostelId,
                status: "active",
            };
            if (className) studentMatch.class = className;

            const students = await Student.find(studentMatch).lean();

            const marksMatch = {
                assignedHostel: hostelId,
                student: { $in: students.map((s) => s._id) },
            };
            if (examName) marksMatch.examName = examName;
            if (subject) marksMatch.subject = subject;

            const marks = await Marks.find(marksMatch)
                .populate("student", "name studentId rollNumber class")
                .lean();

            const records = marks.map((mark) => ({
                studentName: mark.student?.name,
                studentId: mark.student?.studentId,
                rollNumber: mark.student?.rollNumber,
                class: mark.student?.class,
                examName: mark.examName,
                subject: mark.subject,
                marksObtained: mark.marksObtained,
                totalMarks: mark.totalMarks,
                percentage: mark.percentage,
                grade: mark.grade,
            }));

            const summary = {
                totalStudents: records.length,
                averagePercentage:
                    records.length > 0
                        ? Math.round(
                            records.reduce((sum, r) => sum + r.percentage, 0) /
                            records.length
                        )
                        : 0,
                passedStudents: records.filter((r) => r.percentage >= 33).length,
                passPercentage:
                    records.length > 0
                        ? Math.round(
                            (records.filter((r) => r.percentage >= 33).length /
                                records.length) *
                            100
                        )
                        : 0,
            };

            res.json({
                success: true,
                data: { records, summary },
            });
        } catch (error) {
            console.error("Marks summary report error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to generate marks report",
                error: error.message,
            });
        }
    }
);


// ============================================
// 7. SUBJECT-WISE MARKS REPORT (UPDATED)
// ============================================

router.get(
    "/marks/subject",
    authenticateToken,
    authorizeAdminOrManager,
    async (req, res) => {
        try {
            const { examName, subject, class: className } = req.query;
            const hostelId = req.user.assignedHostel._id;

            // ✅ If no subject provided, return empty result instead of error
            if (!subject || subject.trim() === "") {
                return res.json({
                    success: true,
                    data: {
                        records: [],
                        summary: {
                            totalStudents: 0,
                            averagePercentage: 0,
                            passedStudents: 0,
                            passPercentage: 0,
                            highestPercentage: 0,
                            gradeDistribution: {},
                        },
                    },
                });
            }

            const studentMatch = {
                assignedHostel: hostelId,
                status: "active",
            };
            if (className) studentMatch.class = className;

            const students = await Student.find(studentMatch).lean();

            const marksMatch = {
                assignedHostel: hostelId,
                student: { $in: students.map((s) => s._id) },
                subject: subject,
            };
            if (examName) marksMatch.examName = examName;

            const marks = await Marks.find(marksMatch)
                .populate("student", "name studentId rollNumber class")
                .lean();

            const records = marks.map((mark) => ({
                studentName: mark.student?.name,
                studentId: mark.student?.studentId,
                rollNumber: mark.student?.rollNumber,
                class: mark.student?.class,
                examName: mark.examName,
                subject: mark.subject,
                marksObtained: mark.marksObtained,
                totalMarks: mark.totalMarks,
                percentage: mark.percentage,
                grade: mark.grade,
            }));

            const summary = {
                totalStudents: records.length,
                averagePercentage:
                    records.length > 0
                        ? Math.round(
                            records.reduce((sum, r) => sum + r.percentage, 0) /
                            records.length
                        )
                        : 0,
                passedStudents: records.filter((r) => r.percentage >= 33).length,
                passPercentage:
                    records.length > 0
                        ? Math.round(
                            (records.filter((r) => r.percentage >= 33).length /
                                records.length) *
                            100
                        )
                        : 0,
                highestPercentage:
                    records.length > 0 ? Math.max(...records.map((r) => r.percentage)) : 0,
                gradeDistribution: records.reduce((acc, r) => {
                    acc[r.grade] = (acc[r.grade] || 0) + 1;
                    return acc;
                }, {}),
            };

            res.json({
                success: true,
                data: { records, summary },
            });
        } catch (error) {
            console.error("Subject marks report error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to generate subject marks report",
                error: error.message,
            });
        }
    }
);


// ============================================
// 8. BANK REPORTS
// ============================================

router.get(
    "/bank/summary",
    authenticateToken,
    authorizeAdminOrManager,
    async (req, res) => {
        try {
            const { class: className, block, lowBalance } = req.query;
            const hostelId = req.user.assignedHostel._id;

            const studentMatch = {
                assignedHostel: hostelId,
                status: "active",
            };
            if (className) studentMatch.class = className;
            if (block) studentMatch.hostelBlock = block;

            const students = await Student.find(studentMatch).lean();

            const bankAccounts = await StudentBankAccount.find({
                student: { $in: students.map((s) => s._id) },
                assignedHostel: hostelId,
            })
                .populate("student", "name studentId rollNumber class hostelBlock")
                .lean();

            let records = bankAccounts.map((account) => ({
                studentName: account.student?.name,
                studentId: account.student?.studentId,
                rollNumber: account.student?.rollNumber,
                class: account.student?.class,
                block: account.student?.hostelBlock,
                balance: account.balance,
                status: account.status,
            }));

            if (lowBalance) {
                const threshold = Number(lowBalance) || 100;
                records = records.filter((r) => r.balance <= threshold);
            }

            const summary = {
                totalStudents: records.length,
                totalBalance: records.reduce((sum, r) => sum + r.balance, 0),
                averageBalance:
                    records.length > 0
                        ? Math.round(
                            records.reduce((sum, r) => sum + r.balance, 0) / records.length
                        )
                        : 0,
                lowBalanceCount: records.filter((r) => r.balance <= 100).length,
            };

            res.json({
                success: true,
                data: { records, summary },
            });
        } catch (error) {
            console.error("Bank summary report error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to generate bank report",
                error: error.message,
            });
        }
    }
);




// =====================================================
// EXPENSES REPORTS
// =====================================================

// @route   GET /api/reports/expenses
// @desc    Get expenses report
// @access  Private
router.get(
    "/expenses",
    authenticateToken,
    authorizeAdminOrManager,
    async (req, res) => {
        try {
            const hostelId = req.user.assignedHostel._id;
            const {
                reportType,
                startDate,
                endDate,
                category,
                paymentMode,
                status,
            } = req.query;

            // Build filter
            const filter = {
                assignedHostel: hostelId,
                date: {
                    $gte: new Date(startDate || new Date().setMonth(new Date().getMonth() - 1)),
                    $lte: new Date(endDate || new Date()),
                },
            };

            if (category) filter.category = category;
            if (paymentMode) filter.paymentMode = paymentMode;
            if (status) filter.status = status;

            // Fetch expenses
            const expenses = await Expense.find(filter)
                .sort({ date: -1 })
                .populate("recordedBy", "name email")
                .lean();

            // Calculate summary
            const summary = {
                totalAmount: expenses.reduce((sum, e) => sum + e.amount, 0),
                totalTransactions: expenses.length,
                averageAmount:
                    expenses.length > 0
                        ? Math.round(
                            expenses.reduce((sum, e) => sum + e.amount, 0) / expenses.length
                        )
                        : 0,
                categoriesCount: new Set(expenses.map((e) => e.category)).size,
            };

            res.json({
                success: true,
                data: {
                    expenses,
                    summary,
                },
            });
        } catch (error) {
            console.error("Expenses Report Error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch expenses report",
                error: error.message,
            });
        }
    }
);

// @route   GET /api/reports/expenses/summary
// @desc    Get expenses summary
// @access  Private
router.get(
    "/expenses/summary",
    authenticateToken,
    authorizeAdminOrManager,
    async (req, res) => {
        try {
            const hostelId = req.user.assignedHostel._id;
            const { startDate, endDate } = req.query;

            const filter = {
                assignedHostel: hostelId,
                status: "active",
            };

            if (startDate && endDate) {
                filter.date = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate),
                };
            }

            const summary = await Expense.getExpenseSummary(filter);

            res.json({
                success: true,
                data: summary,
            });
        } catch (error) {
            console.error("Expenses Summary Error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch expenses summary",
                error: error.message,
            });
        }
    }
);

// @route   GET /api/reports/expenses/category
// @desc    Get expenses by category
// @access  Private
router.get(
    "/expenses/category",
    authenticateToken,
    authorizeAdminOrManager,
    async (req, res) => {
        try {
            const hostelId = req.user.assignedHostel._id;
            const { startDate, endDate } = req.query;

            const matchStage = {
                assignedHostel: hostelId,
                status: "active",
            };

            if (startDate && endDate) {
                matchStage.date = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate),
                };
            }

            const categoryData = await Expense.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: "$category",
                        totalAmount: { $sum: "$amount" },
                        count: { $sum: 1 },
                        avgAmount: { $avg: "$amount" },
                    },
                },
                { $sort: { totalAmount: -1 } },
            ]);

            res.json({
                success: true,
                data: categoryData,
            });
        } catch (error) {
            console.error("Expenses by Category Error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch expenses by category",
                error: error.message,
            });
        }
    }
);

// @route   GET /api/reports/expenses/monthly
// @desc    Get monthly expenses breakdown
// @access  Private
router.get(
    "/expenses/monthly",
    authenticateToken,
    authorizeAdminOrManager,
    async (req, res) => {
        try {
            const hostelId = req.user.assignedHostel._id;
            const { year, month } = req.query;

            const targetYear = year || new Date().getFullYear();
            const targetMonth = month || new Date().getMonth() + 1;

            const monthlyExpenses = await Expense.getMonthlyExpenses(
                targetYear,
                targetMonth
            );

            res.json({
                success: true,
                data: monthlyExpenses,
            });
        } catch (error) {
            console.error("Monthly Expenses Error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch monthly expenses",
                error: error.message,
            });
        }
    }
);

// @route   GET /api/reports/expenses/vendor
// @desc    Get expenses by vendor
// @access  Private
router.get(
    "/expenses/vendor",
    authenticateToken,
    authorizeAdminOrManager,
    async (req, res) => {
        try {
            const hostelId = req.user.assignedHostel._id;
            const { startDate, endDate } = req.query;

            const matchStage = {
                assignedHostel: hostelId,
                status: "active",
                "vendor.name": { $exists: true, $ne: null },
            };

            if (startDate && endDate) {
                matchStage.date = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate),
                };
            }

            const vendorData = await Expense.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: "$vendor.name",
                        totalAmount: { $sum: "$amount" },
                        count: { $sum: 1 },
                        contact: { $first: "$vendor.contact" },
                    },
                },
                { $sort: { totalAmount: -1 } },
            ]);

            res.json({
                success: true,
                data: vendorData,
            });
        } catch (error) {
            console.error("Expenses by Vendor Error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch expenses by vendor",
                error: error.message,
            });
        }
    }
);

// ============================================
// 9. EXPORT FUNCTIONALITY
// ============================================

router.get(
    "/export/:type",
    authenticateToken,
    authorizeAdminOrManager,
    async (req, res) => {
        try {
            const { type } = req.params;
            const { format = "csv", startDate, endDate } = req.query;
            const hostelId = req.user.assignedHostel._id;

            let data = [];
            const filename = `${type}_${new Date().toISOString().split("T")[0]}`;

            switch (type) {
                case "students":
                    const students = await Student.find({ assignedHostel: hostelId })
                        .lean();
                    data = students.map((s) => ({
                        "Name": s.name,
                        "Student ID": s.studentId,
                        "Roll Number": s.rollNumber,
                        "Class": s.class,
                        "Block": s.hostelBlock,
                        "Batch": s.batch,
                        "Phone": s.phone,
                        "Status": s.status,
                    }));
                    break;

                case "attendance":
                    const attendanceData = await Attendance.find({
                        assignedHostel: hostelId,
                        ...(startDate &&
                            endDate && {
                            date: { $gte: startDate, $lte: endDate },
                        }),
                    })
                        .populate("student", "name studentId rollNumber")
                        .lean();
                    data = attendanceData.map((a) => ({
                        "Date": a.date,
                        "Student Name": a.student?.name,
                        "Student ID": a.student?.studentId,
                        "Roll Number": a.student?.rollNumber,
                        "Status": a.status,
                        "Type": a.type,
                    }));
                    break;

                case "fees":
                    const studentsForFees = await Student.find({
                        assignedHostel: hostelId,
                        status: "active",
                    })
                        .select("name studentId rollNumber class hostelBlock feeStructure")
                        .lean();

                    data = studentsForFees.map((s) => {
                        const feeStructure = s.feeStructure || {};
                        const baseFee = Number(feeStructure.baseFee) || 0;
                        const admissionFee = Number(feeStructure.admissionFee) || 0;
                        const otherCharges = Number(feeStructure.otherCharges) || 0;
                        const otherFees = Array.isArray(feeStructure.otherFees)
                            ? feeStructure.otherFees.reduce(
                                (sum, f) => sum + (Number(f.amount) || 0),
                                0
                            )
                            : 0;

                        const totalFee = baseFee + admissionFee + otherCharges + otherFees;

                        const installments = Array.isArray(
                            feeStructure.installmentBreakdown
                        )
                            ? feeStructure.installmentBreakdown
                            : [];

                        const amountPaid = installments.reduce((sum, inst) => {
                            if (inst.status === "paid") {
                                return (
                                    sum + (Number(inst.paidAmount) || Number(inst.amount) || 0)
                                );
                            }
                            return sum;
                        }, 0);

                        const amountPending = totalFee - amountPaid;

                        let status = "pending";
                        if (amountPaid === 0) status = "unpaid";
                        else if (amountPaid >= totalFee) status = "paid";
                        else if (amountPaid > 0 && amountPaid < totalFee) status = "partial";

                        return {
                            "Student Name": s.name,
                            "Student ID": s.studentId,
                            "Roll Number": s.rollNumber,
                            "Class": s.class,
                            "Block": s.hostelBlock,
                            "Total Fee": totalFee,
                            "Amount Paid": amountPaid,
                            "Amount Pending": amountPending,
                            "Status": status,
                        };
                    });
                    break;

                case "mess":
                    const messData = await MessAttendance.find({
                        assignedHostel: hostelId,
                        ...(startDate &&
                            endDate && {
                            date: { $gte: startDate, $lte: endDate },
                        }),
                    })
                        .populate("student", "name studentId rollNumber")
                        .lean();
                    data = messData.map((m) => ({
                        "Date": m.date,
                        "Student Name": m.student?.name,
                        "Student ID": m.student?.studentId,
                        "Roll Number": m.student?.rollNumber,
                        "Meal Type": m.mealType,
                        "Status": m.status,
                    }));
                    break;

                case "marks":
                    const marksData = await Marks.find({ assignedHostel: hostelId })
                        .populate("student", "name studentId rollNumber class")
                        .lean();
                    data = marksData.map((m) => ({
                        "Student Name": m.student?.name,
                        "Student ID": m.student?.studentId,
                        "Roll Number": m.student?.rollNumber,
                        "Class": m.student?.class,
                        "Exam": m.examName,
                        "Subject": m.subject,
                        "Total Marks": m.totalMarks,
                        "Obtained Marks": m.marksObtained,
                        "Percentage": m.percentage,
                        "Grade": m.grade,
                    }));
                    break;

                case "bank":
                    const bankAccounts = await StudentBankAccount.find({
                        assignedHostel: hostelId,
                    })
                        .populate("student", "name studentId rollNumber")
                        .lean();
                    data = bankAccounts.map((b) => ({
                        "Student Name": b.student?.name,
                        "Student ID": b.student?.studentId,
                        "Roll Number": b.student?.rollNumber,
                        "Balance": b.balance,
                        "Status": b.status,
                    }));
                    break;

                default:
                    return res.status(400).json({
                        success: false,
                        message: "Invalid export type",
                    });
            }

            if (format === "csv") {
                if (data.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: "No data to export",
                    });
                }

                const headers = Object.keys(data[0]);
                const csvRows = [
                    headers.join(","),
                    ...data.map((row) =>
                        headers
                            .map((header) => {
                                const value = row[header];
                                return `"${String(value).replace(/"/g, '""')}"`;
                            })
                            .join(",")
                    ),
                ];

                const csvContent = csvRows.join("\n");

                res.setHeader("Content-Type", "text/csv");
                res.setHeader(
                    "Content-Disposition",
                    `attachment; filename="${filename}.csv"`
                );
                res.send(csvContent);
            } else if (format === "pdf") {
                res.status(501).json({
                    success: false,
                    message: "PDF export not yet implemented",
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: "Invalid format. Use 'csv' or 'pdf'",
                });
            }
        } catch (error) {
            console.error("Export error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to export report",
                error: error.message,
            });
        }
    }
);

// ============================================
// 2. INDIVIDUAL STUDENT REPORT
// ============================================

router.get(
    "/student/:studentId",
    authenticateToken,
    authorizeAdminOrManager,
    async (req, res) => {
        try {
            const { studentId } = req.params;
            const hostelId = req.user.assignedHostel._id;

            if (!mongoose.Types.ObjectId.isValid(studentId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid student ID",
                });
            }

            const student = await Student.findOne({
                _id: studentId,
                assignedHostel: hostelId,
            }).lean();

            if (!student) {
                return res.status(404).json({
                    success: false,
                    message: "Student not found",
                });
            }

            const studentObjectId = new mongoose.Types.ObjectId(studentId);

            const attendanceStats = await Attendance.aggregate([
                { $match: { student: studentObjectId, deleted: { $ne: true } } },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]);

            const attendanceMap = attendanceStats.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {});

            const presentDays = attendanceMap.present || 0;
            const absentDays = attendanceMap.absent || 0;
            const leaveDays = attendanceMap.on_leave || 0;
            const totalDays = presentDays + absentDays + leaveDays;
            const attendanceRate =
                totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

            const recentAttendance = await Attendance.find({
                student: studentId,
                deleted: { $ne: true },
            })
                .sort({ date: -1, timestamp: -1 })
                .limit(10)
                .select("date status timestamp")
                .lean();

            const feeStructure = student.feeStructure || {};
            const baseFee = Number(feeStructure.baseFee) || 0;
            const admissionFee = Number(feeStructure.admissionFee) || 0;
            const otherCharges = Number(feeStructure.otherCharges) || 0;
            const otherFees = Array.isArray(feeStructure.otherFees)
                ? feeStructure.otherFees.reduce(
                    (sum, f) => sum + (Number(f.amount) || 0),
                    0
                )
                : 0;

            const totalFee = baseFee + admissionFee + otherCharges + otherFees;

            const installments = Array.isArray(feeStructure.installmentBreakdown)
                ? feeStructure.installmentBreakdown
                : [];

            const amountPaid = installments.reduce((sum, inst) => {
                if (inst.status === "paid") {
                    return sum + (Number(inst.paidAmount) || Number(inst.amount) || 0);
                }
                return sum;
            }, 0);

            const amountPending = totalFee - amountPaid;

            const recentPayments = await Fee.find({
                student: studentId,
                assignedHostel: hostelId,
            })
                .sort({ paymentDate: -1 })
                .limit(5)
                .select("paidAmount paymentDate paymentMode receiptNumber remarks")
                .lean();

            const feeData = {
                totalFee,
                paid: amountPaid,
                pending: Math.max(0, amountPending),
                recentPayments: recentPayments.map((p) => ({
                    amount: p.paidAmount,
                    date: p.paymentDate,
                    method: p.paymentMode,
                    receiptNumber: p.receiptNumber,
                    remarks: p.remarks,
                })),
            };

            const marks = await Marks.findOne({
                student: studentId,
                assignedHostel: hostelId,
            })
                .sort({ examDate: -1 })
                .lean();

            const marksData = marks
                ? {
                    examName: marks.examName,
                    examType: marks.examType,
                    subject: marks.subject,
                    marksObtained: marks.marksObtained,
                    totalMarks: marks.totalMarks,
                    percentage: marks.percentage,
                    grade: marks.grade,
                    examDate: marks.examDate,
                }
                : null;

            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            const startDateStr = startOfMonth.toISOString().split("T")[0];

            const messStats = await MessAttendance.aggregate([
                {
                    $match: {
                        student: studentObjectId,
                        date: { $gte: startDateStr },
                        status: "present",
                    },
                },
                { $group: { _id: "$mealType", count: { $sum: 1 } } },
            ]);

            const messMap = messStats.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {});

            const messData = {
                breakfast: messMap.breakfast || 0,
                lunch: messMap.lunch || 0,
                dinner: messMap.dinner || 0,
                total:
                    (messMap.breakfast || 0) +
                    (messMap.lunch || 0) +
                    (messMap.dinner || 0),
            };

            const bankAccount = await StudentBankAccount.findOne({
                student: studentId,
                assignedHostel: hostelId,
            }).lean();

            let bankData = null;
            if (bankAccount) {
                const transactionStats = await BankTransaction.aggregate([
                    { $match: { bankAccount: bankAccount._id } },
                    {
                        $group: {
                            _id: "$type",
                            total: { $sum: "$amount" },
                            count: { $sum: 1 },
                        },
                    },
                ]);

                const transactionMap = transactionStats.reduce((acc, item) => {
                    acc[item._id] = item;
                    return acc;
                }, {});

                bankData = {
                    balance: bankAccount.balance,
                    totalDeposits: transactionMap.credit?.total || 0,
                    totalWithdrawals: transactionMap.debit?.total || 0,
                    totalTransactions:
                        (transactionMap.credit?.count || 0) +
                        (transactionMap.debit?.count || 0),
                };
            }

            res.json({
                success: true,
                data: {
                    student,
                    attendance: {
                        presentDays,
                        absentDays,
                        leaveDays,
                        totalDays,
                        rate: attendanceRate,
                        recent: recentAttendance,
                    },
                    fees: feeData,
                    marks: marksData,
                    mess: messData,
                    bank: bankData,
                },
            });
        } catch (error) {
            console.error("Student report error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to generate student report",
                error: error.message,
            });
        }
    }
);
module.exports = router;
