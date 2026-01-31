// server/routes/analytics.routes.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Student = require("../models/student.model");
const Attendance = require("../models/attendance.model");
const MessAttendance = require("../models/messAttendance.model");
const Marks = require("../models/marks.model");
const Expense = require("../models/expense.model");
const StudentBankAccount = require("../models/studentBankAccount.model");
const LeaveApplication = require("../models/leaveApplication.model");

const {
    authenticateToken,
    authorizeAdminOrManager,
} = require("../middlewares/auth");

// ============================================
// 1. OVERVIEW ANALYTICS - COMPLETE VERSION (FIXED)
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

            // ===== GATE ENTRY STATUS (Current State - Persists) =====
            const latestEntries = await Attendance.aggregate([
                {
                    $match: {
                        assignedHostel: hostelId,
                        deleted: { $ne: true },
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
                assignedHostel: hostelId,
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

            const studentsOnLeave = await LeaveApplication.countDocuments({
                assignedHostel: hostelId,
                status: "approved",
                fromDate: { $lte: todayStr },
                $or: [
                    { earlyReturn: false, toDate: { $gte: todayStr } },
                    { earlyReturn: true, actualReturnDate: { $gt: todayStr } },
                ],
            });

            console.log(`🚪 Gate Entry - IN: ${studentsInHostel}, OUT: ${studentsOutHostel}, LEAVE: ${studentsOnLeave}`);

            // ===== DAILY ATTENDANCE (Present/Absent - Marked by Cron) =====
            const todayAttendanceUnique = await Attendance.distinct("student", {
                assignedHostel: hostelId,
                date: todayStr,
                status: "present",
                deleted: { $ne: true },
            });

            const todayPresent = todayAttendanceUnique.length;
            const todayAbsent = totalStudents - todayPresent;
            const attendanceRate =
                totalStudents > 0
                    ? Math.round((todayPresent / totalStudents) * 100)
                    : 0;

            console.log(`✅ Attendance - Present: ${todayPresent}, Absent: ${todayAbsent}, Rate: ${attendanceRate}%`);

            // ===== WEEKLY ATTENDANCE TREND (Last 7 Days) =====
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

            // ===== FEES CALCULATION =====
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

            console.log(`💰 Fees - Collected: ₹${totalCollected}, Pending: ₹${totalPending}, Rate: ${collectionRate}%`);

            // ===== MESS ATTENDANCE (Today) =====
            const todayMess = await MessAttendance.aggregate([
                {
                    $match: {
                        assignedHostel: hostelId,
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

            console.log(`🍽️ Mess - Breakfast: ${messMap.breakfast || 0}, Lunch: ${messMap.lunch || 0}, Dinner: ${messMap.dinner || 0}`);

            // ===== MARKS STATISTICS =====
            const marksStats = await Marks.aggregate([
                { $match: { assignedHostel: hostelId } },
                {
                    $group: {
                        _id: null,
                        averagePercentage: { $avg: "$percentage" },
                        totalExams: { $sum: 1 },
                        passedCount: {
                            $sum: { $cond: [{ $gte: ["$percentage", 33] }, 1, 0] },
                        },
                    },
                },
            ]);

            const marksData = marksStats[0] || {
                averagePercentage: 0,
                totalExams: 0,
                passedCount: 0,
            };

            const gradeDistribution = await Marks.aggregate([
                { $match: { assignedHostel: hostelId } },
                { $group: { _id: "$grade", count: { $sum: 1 } } },
            ]);

            const gradeMap = gradeDistribution.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {});

            console.log(`📚 Marks - Avg: ${Math.round(marksData.averagePercentage)}%, Exams: ${marksData.totalExams}`);

            // ===== HOSTEL EXPENSES (Current Month) =====
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            const monthStart = new Date(currentYear, currentMonth, 1);
            const monthEnd = new Date(currentYear, currentMonth + 1, 0);

            const expensesData = await Expense.aggregate([
                {
                    $match: {
                        assignedHostel: hostelId,
                        date: { $gte: monthStart, $lte: monthEnd },
                        status: "active",
                    },
                },
                {
                    $group: {
                        _id: "$category",
                        totalAmount: { $sum: "$amount" },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { totalAmount: -1 } },
            ]);

            const totalExpenses = expensesData.reduce(
                (sum, exp) => sum + exp.totalAmount,
                0
            );

            const topExpenseCategory = expensesData[0] || {
                _id: "N/A",
                totalAmount: 0,
            };

            console.log(`💸 Expenses - Total: ₹${totalExpenses}, Top: ${topExpenseCategory._id}`);

            // ===== STUDENT BANK ACCOUNTS (SIMPLE APPROACH) =====
            let bankData = {
                totalBalance: 0,
                averageBalance: 0,
                lowBalanceCount: 0,
                activeAccounts: 0,
            };

            try {
                // Get all active bank accounts for this hostel
                const accounts = await StudentBankAccount.find({
                    assignedHostel: hostelId,
                    status: "active",
                }).select("balance").lean();

                console.log(`📊 Found ${accounts.length} bank accounts`);

                if (accounts.length > 0) {
                    const balances = accounts.map(acc => acc.balance || 0);
                    const totalBalance = balances.reduce((sum, bal) => sum + bal, 0);
                    const averageBalance = totalBalance / balances.length;
                    const lowBalanceCount = balances.filter(bal => bal <= 100).length;

                    bankData = {
                        totalBalance: Math.round(totalBalance),
                        averageBalance: Math.round(averageBalance),
                        lowBalanceCount,
                        activeAccounts: accounts.length,
                    };

                    console.log(`💳 Bank Data:`, bankData);
                }
            } catch (bankError) {
                console.error("⚠️ Bank stats error:", bankError);
            }

            // ===== ALERTS =====
            const alerts = [];

            if (attendanceRate < 75) {
                alerts.push({
                    type: "danger",
                    message: `Low attendance today: ${attendanceRate}%`,
                });
            }

            if (bankData.lowBalanceCount > 0) {
                alerts.push({
                    type: "warning",
                    message: `${bankData.lowBalanceCount} student(s) have low bank balance (≤₹100)`,
                });
            }

            if (totalPending > totalCollected * 0.5) {
                alerts.push({
                    type: "warning",
                    message: `High pending fees: ₹${totalPending.toLocaleString()}`,
                });
            }

            // ===== RESPONSE =====
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
                        occupancyRate:
                            totalStudents > 0
                                ? Math.round((studentsInHostel / totalStudents) * 100)
                                : 0,
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
                    marks: {
                        averagePercentage: Math.round(marksData.averagePercentage || 0),
                        totalExams: marksData.totalExams,
                        passPercentage:
                            marksData.totalExams > 0
                                ? Math.round(
                                    (marksData.passedCount / marksData.totalExams) * 100
                                )
                                : 0,
                        excellent: gradeMap["A+"] || 0,
                        good: (gradeMap["A"] || 0) + (gradeMap["B+"] || 0),
                        average: (gradeMap["B"] || 0) + (gradeMap["C+"] || 0),
                        needHelp: (gradeMap["C"] || 0) + (gradeMap["D"] || 0) + (gradeMap["F"] || 0),
                    },
                    expenses: {
                        currentMonth: totalExpenses,
                        topCategory: topExpenseCategory._id,
                        topCategoryAmount: topExpenseCategory.totalAmount,
                        categoryBreakdown: expensesData,
                    },
                    bank: bankData,
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
// BANK ANALYTICS - COMPLETE
// ============================================
router.get(
    "/bank",
    authenticateToken,
    authorizeAdminOrManager,
    async (req, res) => {
        try {
            const { class: className, block } = req.query;
            const hostelId = req.user.assignedHostel._id;

            // Build match query
            const matchQuery = {
                assignedHostel: hostelId,
                status: "active",
            };

            // Get students with filters
            const studentMatch = { ...matchQuery };
            if (className) studentMatch.class = className;
            if (block) studentMatch.hostelBlock = block;

            const students = await Student.find(studentMatch)
                .select("_id name class hostelBlock")
                .lean();

            const studentIds = students.map((s) => s._id);

            // Get bank accounts
            const accounts = await StudentBankAccount.find({
                student: { $in: studentIds },
                status: "active",
            })
                .populate("student", "name class hostelBlock")
                .lean();

            // Calculate statistics
            const balances = accounts.map((acc) => acc.balance);
            const totalBalance = balances.reduce((sum, b) => sum + b, 0);
            const averageBalance = balances.length > 0 ? totalBalance / balances.length : 0;
            const maxBalance = balances.length > 0 ? Math.max(...balances) : 0;
            const minBalance = balances.length > 0 ? Math.min(...balances) : 0;

            // Median calculation
            const sortedBalances = [...balances].sort((a, b) => a - b);
            const medianBalance =
                sortedBalances.length > 0
                    ? sortedBalances[Math.floor(sortedBalances.length / 2)]
                    : 0;

            // Balance distribution
            const highBalanceCount = balances.filter((b) => b > 1000).length;
            const mediumBalanceCount = balances.filter((b) => b > 500 && b <= 1000).length;
            const lowMediumBalanceCount = balances.filter((b) => b > 100 && b <= 500).length;
            const criticalBalanceCount = balances.filter((b) => b <= 100).length;

            // Format accounts data
            const accountsData = accounts.map((acc) => ({
                studentName: acc.student?.name || "Unknown",
                class: acc.student?.class || "N/A",
                block: acc.student?.hostelBlock || "N/A",
                balance: acc.balance,
                accountNumber: acc.accountNumber,
            }));

            res.json({
                success: true,
                data: {
                    summary: {
                        totalBalance,
                        averageBalance,
                        maxBalance,
                        minBalance,
                        medianBalance,
                        activeAccounts: accounts.length,
                        highBalanceCount,
                        mediumBalanceCount,
                        lowMediumBalanceCount,
                        criticalBalanceCount,
                    },
                    accounts: accountsData,
                },
            });
        } catch (error) {
            console.error("Bank analytics error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch bank analytics",
                error: error.message,
            });
        }
    }
);

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

            console.log(`📅 Attendance Analytics: ${startDate} to ${endDate}`);

            // Build student query
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

            // ✅ FIX: Get attendance with proper grouping
            const attendanceRecords = await Attendance.aggregate([
                {
                    $match: {
                        assignedHostel: hostelId,
                        date: { $gte: startDate, $lte: endDate },
                        student: { $in: students.map((s) => s._id) },
                        deleted: { $ne: true },
                    },
                },
                // First, get unique date-student combinations
                {
                    $group: {
                        _id: { student: "$student", date: "$date" },
                        status: { $first: "$status" }, // Take first status for that day
                    },
                },
                // Then group by student and status
                {
                    $group: {
                        _id: { student: "$_id.student", status: "$status" },
                        count: { $sum: 1 },
                    },
                },
            ]);

            console.log(`📊 Attendance records processed: ${attendanceRecords.length} entries`);

            // Build records for each student
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

            // Calculate summary
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

            console.log(`✅ Summary: Avg ${summary.averageAttendance}%`);

            res.json({
                success: true,
                data: { records, summary },
            });
        } catch (error) {
            console.error("❌ Attendance analytics error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch attendance analytics",
                error: error.message,
            });
        }
    }
);

// ============================================
//  FEES ANALYTICS - COLLECTION (FIXED)
// ============================================
router.get(
    "/fees/collection",
    authenticateToken,
    authorizeAdminOrManager,
    async (req, res) => {
        try {
            const { class: className, block } = req.query;
            const hostelId = req.user.assignedHostel._id;

            console.log(`💰 Fees Analytics - Class: ${className || "All"}, Block: ${block || "All"}`);

            const studentMatch = {
                assignedHostel: hostelId,
                status: "active",
            };
            if (className) studentMatch.class = className;
            if (block) studentMatch.hostelBlock = block;

            const students = await Student.find(studentMatch)
                .select("studentId name rollNumber class hostelBlock feeStructure nillFees")
                .lean();

            console.log(`👥 Found ${students.length} students for fees calculation`);

            const records = students.map((student) => {
                // Handle nill fees students
                if (student.nillFees) {
                    return {
                        studentId: student._id,
                        studentName: student.name,
                        studentIdNumber: student.studentId,
                        rollNumber: student.rollNumber,
                        class: student.class,
                        block: student.hostelBlock,
                        totalFee: 0,
                        amountPaid: 0,
                        amountPending: 0,
                        status: "paid",
                        collectionRate: 100,
                    };
                }

                const feeStructure = student.feeStructure || {};

                // ✅ FIX: Calculate total fee correctly
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

                // ✅ FIX: Calculate paid amount from installments
                const installments = Array.isArray(feeStructure.installmentBreakdown)
                    ? feeStructure.installmentBreakdown
                    : [];

                const amountPaid = installments.reduce((sum, inst) => {
                    if (inst.status === "paid") {
                        return sum + (Number(inst.paidAmount) || Number(inst.amount) || 0);
                    }
                    return sum;
                }, 0);

                const amountPending = Math.max(0, totalFee - amountPaid);

                // ✅ FIX: Determine status correctly
                let status = "pending";
                if (totalFee === 0) {
                    status = "not_set";
                } else if (amountPending <= 0) {
                    status = "paid";
                } else if (amountPaid > 0) {
                    // Check for overdue installments
                    const hasOverdue = installments.some((inst) => {
                        if (inst.status === "pending" && inst.dueDate) {
                            return new Date() > new Date(inst.dueDate);
                        }
                        return false;
                    });
                    status = hasOverdue ? "overdue" : "partial";
                } else {
                    status = "pending";
                }

                const collectionRate =
                    totalFee > 0 ? Math.round((amountPaid / totalFee) * 100) : 0;

                return {
                    studentId: student._id,
                    studentName: student.name,
                    studentIdNumber: student.studentId,
                    rollNumber: student.rollNumber,
                    class: student.class,
                    block: student.hostelBlock,
                    totalFee,
                    amountPaid,
                    amountPending,
                    status,
                    collectionRate,
                };
            });

            // Sort by pending amount (highest first)
            records.sort((a, b) => b.amountPending - a.amountPending);

            const summary = {
                totalStudents: records.length,
                totalExpected: records.reduce((sum, r) => sum + r.totalFee, 0),
                totalCollected: records.reduce((sum, r) => sum + r.amountPaid, 0),
                totalPending: records.reduce((sum, r) => sum + r.amountPending, 0),
                paidCount: records.filter((r) => r.status === "paid").length,
                partialCount: records.filter((r) => r.status === "partial").length,
                pendingCount: records.filter((r) => r.status === "pending").length,
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

            console.log(`✅ Fees Summary: ₹${summary.totalCollected} / ₹${summary.totalExpected} (${summary.collectionRate}%)`);

            res.json({
                success: true,
                data: { records, summary },
            });
        } catch (error) {
            console.error("❌ Fees analytics error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch fees analytics",
                error: error.message,
            });
        }
    }
);

// ============================================
//  MARKS ANALYTICS - SUMMARY (FIXED)
// ============================================
router.get(
    "/marks/summary",
    authenticateToken,
    authorizeAdminOrManager,
    async (req, res) => {
        try {
            const { exam, subject, class: className, semester } = req.query;
            const hostelId = req.user.assignedHostel._id;

            console.log(`📚 Marks Analytics - Exam: ${exam || "All"}, Subject: ${subject || "All"}`);

            // Get students with filter
            const studentMatch = {
                assignedHostel: hostelId,
                status: "active",
            };
            if (className) studentMatch.class = className;

            const students = await Student.find(studentMatch)
                .select("_id name studentId rollNumber class")
                .lean();

            // Build marks query
            const marksMatch = {
                assignedHostel: hostelId,
                student: { $in: students.map((s) => s._id) },
            };
            if (exam) marksMatch.examName = exam;
            if (subject) marksMatch.subject = subject;
            if (semester) marksMatch.semester = semester;

            const marks = await Marks.find(marksMatch)
                .populate("student", "name studentId rollNumber class")
                .sort({ percentage: -1 })
                .lean();

            console.log(`📊 Found ${marks.length} marks records`);

            // ✅ FIX: Build proper records
            const records = marks.map((mark, index) => ({
                _id: mark._id,
                rank: index + 1,
                studentName: mark.student?.name || "Unknown",
                studentId: mark.student?.studentId || "N/A",
                rollNumber: mark.student?.rollNumber || "N/A",
                class: mark.student?.class || "N/A",
                examName: mark.examName,
                examType: mark.examType,
                subject: mark.subject,
                obtainedMarks: mark.marksObtained,
                totalMarks: mark.totalMarks,
                percentage: Math.round(mark.percentage * 10) / 10, // Round to 1 decimal
                grade: mark.grade,
                examDate: mark.examDate,
            }));

            // ✅ FIX: Calculate grade distribution
            const gradeDistribution = records.reduce((acc, r) => {
                const grade = r.grade || "N/A";
                acc[grade] = (acc[grade] || 0) + 1;
                return acc;
            }, {});

            // ✅ FIX: Calculate performance categories
            const performanceCategories = {
                excellent: records.filter((r) => r.percentage >= 90).length,
                veryGood: records.filter((r) => r.percentage >= 80 && r.percentage < 90).length,
                good: records.filter((r) => r.percentage >= 70 && r.percentage < 80).length,
                average: records.filter((r) => r.percentage >= 60 && r.percentage < 70).length,
                belowAverage: records.filter((r) => r.percentage >= 50 && r.percentage < 60).length,
                poor: records.filter((r) => r.percentage >= 33 && r.percentage < 50).length,
                fail: records.filter((r) => r.percentage < 33).length,
            };

            const summary = {
                totalStudents: records.length,
                averagePercentage:
                    records.length > 0
                        ? Math.round(
                            (records.reduce((sum, r) => sum + r.percentage, 0) /
                                records.length) *
                            10
                        ) / 10
                        : 0,
                passedStudents: records.filter((r) => r.percentage >= 33).length,
                failedStudents: records.filter((r) => r.percentage < 33).length,
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
                lowestPercentage:
                    records.length > 0 ? Math.min(...records.map((r) => r.percentage)) : 0,
                gradeDistribution,
                performanceCategories,
                toppers: records.slice(0, 5), // Top 5 students
            };

            console.log(`✅ Marks Summary: Avg ${summary.averagePercentage}%, Pass Rate ${summary.passPercentage}%`);

            res.json({
                success: true,
                data: { records, summary },
            });
        } catch (error) {
            console.error("❌ Marks analytics error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch marks analytics",
                error: error.message,
            });
        }
    }
);

// ============================================
//  MESS ANALYTICS - MONTHLY (FIXED)
// ============================================
router.get(
    "/mess/monthly",
    authenticateToken,
    authorizeAdminOrManager,
    async (req, res) => {
        try {
            const { month, class: className } = req.query;
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

            console.log(`🍽️ Mess Analytics: ${startDate} to ${endDate}`);

            const studentMatch = {
                assignedHostel: hostelId,
                status: "active",
            };
            if (className) studentMatch.class = className;

            const students = await Student.find(studentMatch)
                .select("_id name class")
                .lean();

            console.log(`👥 Found ${students.length} students`);

            // ✅ FIX: Get mess attendance with proper grouping
            const messRecords = await MessAttendance.aggregate([
                {
                    $match: {
                        assignedHostel: hostelId,
                        date: { $gte: startDate, $lte: endDate },
                        status: "present",
                        student: { $in: students.map((s) => s._id) },
                    },
                },
                {
                    $group: {
                        _id: { date: "$date", mealType: "$mealType" },
                        count: { $sum: 1 },
                        students: { $addToSet: "$student" },
                    },
                },
                { $sort: { "_id.date": 1 } },
            ]);

            console.log(`📊 Mess records: ${messRecords.length} entries`);

            // Get unique dates
            const dateSet = new Set(messRecords.map((r) => r._id.date));
            const dates = Array.from(dateSet).sort();

            // ✅ FIX: Build daily report
            const report = dates.map((date) => {
                const dayRecords = messRecords.filter((r) => r._id.date === date);

                const breakfast =
                    dayRecords.find((r) => r._id.mealType === "breakfast")?.count || 0;
                const lunch =
                    dayRecords.find((r) => r._id.mealType === "lunch")?.count || 0;
                const dinner =
                    dayRecords.find((r) => r._id.mealType === "dinner")?.count || 0;

                const total = breakfast + lunch + dinner;
                const avgAttendance = students.length > 0
                    ? Math.round((total / (students.length * 3)) * 100)
                    : 0;

                return {
                    date,
                    day: new Date(date).toLocaleDateString("en-IN", { weekday: "short" }),
                    breakfast,
                    lunch,
                    dinner,
                    total,
                    avgAttendance,
                };
            });

            // ✅ FIX: Calculate totals
            const totalBreakfast = messRecords
                .filter((r) => r._id.mealType === "breakfast")
                .reduce((sum, r) => sum + r.count, 0);
            const totalLunch = messRecords
                .filter((r) => r._id.mealType === "lunch")
                .reduce((sum, r) => sum + r.count, 0);
            const totalDinner = messRecords
                .filter((r) => r._id.mealType === "dinner")
                .reduce((sum, r) => sum + r.count, 0);

            const summary = {
                totalDays: dates.length,
                totalStudents: students.length,
                totalBreakfast,
                totalLunch,
                totalDinner,
                totalMeals: totalBreakfast + totalLunch + totalDinner,
                avgBreakfast: dates.length > 0 ? Math.round(totalBreakfast / dates.length) : 0,
                avgLunch: dates.length > 0 ? Math.round(totalLunch / dates.length) : 0,
                avgDinner: dates.length > 0 ? Math.round(totalDinner / dates.length) : 0,
                avgDailyAttendance:
                    dates.length > 0 && students.length > 0
                        ? Math.round(
                            ((totalBreakfast + totalLunch + totalDinner) /
                                (dates.length * students.length * 3)) *
                            100
                        )
                        : 0,
                mostPopularMeal:
                    totalBreakfast >= totalLunch && totalBreakfast >= totalDinner
                        ? "Breakfast"
                        : totalLunch >= totalDinner
                            ? "Lunch"
                            : "Dinner",
                leastPopularMeal:
                    totalBreakfast <= totalLunch && totalBreakfast <= totalDinner
                        ? "Breakfast"
                        : totalLunch <= totalDinner
                            ? "Lunch"
                            : "Dinner",
            };

            console.log(`✅ Mess Summary: ${summary.totalMeals} total meals served`);

            res.json({
                success: true,
                data: { report, summary },
            });
        } catch (error) {
            console.error("❌ Mess analytics error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch mess analytics",
                error: error.message,
            });
        }
    }
);

// ============================================
//  TRENDS ANALYTICS (FIXED)
// ============================================
router.get(
    "/trends",
    authenticateToken,
    authorizeAdminOrManager,
    async (req, res) => {
        try {
            const { period = "month" } = req.query;
            const hostelId = req.user.assignedHostel._id;

            console.log(`📈 Trends Analytics - Period: ${period}`);

            let days = 30;
            if (period === "week") days = 7;
            else if (period === "semester") days = 180;

            const dates = [];
            const today = new Date();
            for (let i = days - 1; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                dates.push(d.toISOString().split("T")[0]);
            }

            const totalStudents = await Student.countDocuments({
                assignedHostel: hostelId,
                status: "active",
            });

            console.log(`👥 Total students: ${totalStudents}`);

            // ✅ FIX: Attendance trend
            const attendance = await Promise.all(
                dates.map(async (date) => {
                    const presentStudents = await Attendance.distinct("student", {
                        assignedHostel: hostelId,
                        date: date,
                        status: "present",
                        deleted: { $ne: true },
                    });

                    const count = presentStudents.length;
                    const rate =
                        totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;

                    return {
                        date,
                        name: new Date(date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                        }),
                        rate,
                        count,
                    };
                })
            );

            // ✅ FIX: Fees trend (you can expand this later)
            const fees = [];

            // ✅ FIX: Mess trend
            const mess = await Promise.all(
                dates.map(async (date) => {
                    const messAttendance = await MessAttendance.countDocuments({
                        assignedHostel: hostelId,
                        date: date,
                        status: "present",
                    });

                    return {
                        date,
                        name: new Date(date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                        }),
                        count: messAttendance,
                    };
                })
            );

            console.log(`✅ Trends calculated for ${dates.length} days`);

            res.json({
                success: true,
                data: {
                    period,
                    days,
                    totalStudents,
                    attendance,
                    fees,
                    mess,
                },
            });
        } catch (error) {
            console.error("❌ Trends analytics error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch trends",
                error: error.message,
            });
        }
    }
);

module.exports = router;
