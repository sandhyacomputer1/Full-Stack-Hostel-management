const express = require("express");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const Student = require("../models/student.model");
const ParentSession = require("../models/parentSession.model");
const otpService = require("../services/otpService");
const twilioService = require("../services/twilioService");
const {
    authenticateParent,
    verifyParentOwnsStudent,
} = require("../middlewares/auth");

const router = express.Router();

// @route   GET /api/parent/debug-phone/:phone
// @desc    Debug endpoint to check if phone exists (REMOVE IN PRODUCTION)
// @access  Public
router.get("/debug-phone/:phone", async (req, res) => {
    try {
        const { phone } = req.params;

        const students = await Student.find({
            $or: [{ "father.phone": phone }, { "mother.phone": phone }],
        }).select("name studentId status father.phone mother.phone");

        res.json({
            success: true,
            phone: phone,
            studentsFound: students.length,
            students: students.map((s) => ({
                name: s.name,
                studentId: s.studentId,
                status: s.status,
                fatherPhone: s.father.phone,
                motherPhone: s.mother.phone,
            })),
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Generate JWT token for parent
const generateParentToken = (phone) => {
    return jwt.sign(
        {
            phone,
            role: "parent",
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

// @route   POST /api/parent/request-otp
// @desc    Request OTP for parent login
// @access  Public
router.post(
    "/request-otp",
    [
        body("phone")
            .trim()
            .notEmpty()
            .withMessage("Phone number is required")
            .isMobilePhone()
            .withMessage("Invalid phone number"),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const { phone } = req.body;

            // Check rate limiting
            const rateLimitCheck = await otpService.canRequestOTP(phone);
            if (!rateLimitCheck.canRequest) {
                return res.status(429).json({
                    success: false,
                    message: rateLimitCheck.message,
                });
            }

            // Find students with this parent phone (father or mother)
            const students = await Student.find({
                $or: [{ "father.phone": phone }, { "mother.phone": phone }],
                status: "active",
            })
                .select("_id name studentId assignedHostel")
                .populate("assignedHostel", "name");

            console.log(`📱 OTP request for phone: ${phone}`);
            console.log(`📊 Found ${students.length} active students`);

            // If no active students found, return error
            if (students.length === 0) {
                console.log(`❌ No active students found for phone: ${phone}`);
                return res.status(404).json({
                    success: false,
                    message:
                        "No active student found with this phone number. Please contact the hostel administration.",
                });
            }

            // Get hostel name for SMS message
            const hostelName = students[0].assignedHostel?.name || "Hostel";
            const studentNames = students.map((s) => s.name).join(", ");

            // Generate and send OTP
            const otp = await otpService.createOTP(phone);
            const smsResult = await twilioService.sendOTP(
                phone,
                otp,
                hostelName,
                studentNames
            );

            console.log(`📱 OTP generated for ${phone}: ${otp}`);
            console.log(`📤 SMS send result:`, smsResult);

            // Check if SMS was sent successfully
            if (!smsResult.success && !smsResult.mock) {
                console.error(`❌ Failed to send OTP to ${phone}:`, smsResult.error);
                return res.status(500).json({
                    success: false,
                    message: "Failed to send OTP. Please try again later.",
                    error: smsResult.error,
                });
            }

            res.json({
                success: true,
                message: "OTP sent successfully to your registered mobile number",
            });
        } catch (error) {
            console.error("Request OTP error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to send OTP. Please try again.",
                error: error.message,
            });
        }
    }
);

// @route   POST /api/parent/verify-otp
// @desc    Verify OTP and login parent
// @access  Public
router.post(
    "/verify-otp",
    [
        body("phone")
            .trim()
            .notEmpty()
            .withMessage("Phone number is required")
            .isMobilePhone()
            .withMessage("Invalid phone number"),
        body("otp")
            .trim()
            .notEmpty()
            .withMessage("OTP is required")
            .isLength({ min: 6, max: 6 })
            .withMessage("OTP must be 6 digits"),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const { phone, otp } = req.body;

            console.log(`🔐 Verifying OTP for phone: ${phone}, OTP: ${otp}`);

            // Verify OTP using Twilio Verify API (if configured) or local OTP service
            let otpVerification;

            if (twilioService.serviceSid) {
                // Use Twilio Verify API
                otpVerification = await twilioService.verifyOTPViaVerify(phone, otp);
                console.log(`📤 Twilio Verify result:`, otpVerification);
            } else {
                // Use local OTP service
                otpVerification = await otpService.verifyOTP(phone, otp);
                console.log(`📤 Local OTP verify result:`, otpVerification);
            }

            if (!otpVerification.success) {
                console.log(`❌ OTP verification failed for ${phone}`);
                return res.status(400).json({
                    success: false,
                    message: otpVerification.error || "Invalid or expired OTP. Please try again.",
                });
            }

            console.log(`✅ OTP verified successfully for ${phone}`);

            // Find students linked to this phone
            const students = await Student.find({
                $or: [{ "father.phone": phone }, { "mother.phone": phone }],
                status: "active",
            })
                .select("_id name studentId class batch assignedHostel status")
                .populate("assignedHostel", "name");

            if (students.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "No active students found for this phone number",
                });
            }

            console.log(`👨‍👩‍👧 Found ${students.length} students for ${phone}`);

            // Create or update parent session
            const studentIds = students.map((s) => s._id);
            let session = await ParentSession.findOne({ phone });

            if (session) {
                session.students = studentIds;
                session.lastLogin = new Date();
                await session.save();
            } else {
                session = await ParentSession.create({
                    phone,
                    students: studentIds,
                    lastLogin: new Date(),
                });
            }

            // Generate JWT token
            const token = generateParentToken(phone);

            console.log(`🎉 Parent login successful for ${phone}`);

            res.json({
                success: true,
                message: "Login successful",
                token,
                parent: {
                    phone,
                    children: students.map((s) => ({
                        id: s._id,
                        name: s.name,
                        studentId: s.studentId,
                        class: s.class,
                        batch: s.batch,
                        hostel: s.assignedHostel?.name,
                        status: s.status,
                    })),
                },
            });
        } catch (error) {
            console.error("Verify OTP error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to verify OTP. Please try again.",
                error: error.message,
            });
        }
    }
);

// @route   POST /api/parent/logout
// @desc    Logout parent
// @access  Private (Parent)
router.post("/logout", authenticateParent, (req, res) => {
    res.json({
        success: true,
        message: "Logged out successfully",
    });
});

// @route   GET /api/parent/dashboard
// @desc    Get parent dashboard data
// @access  Private (Parent)
router.get("/dashboard", authenticateParent, async (req, res) => {
    try {
        const { students } = req.parent;

        // Get detailed data for each child
        const childrenData = await Promise.all(
            students.map(async (student) => {
                const Student = require("../models/student.model");
                const Fee = require("../models/fees.model");
                const Attendance = require("../models/attendance.model");
                const StudentBankAccount = require("../models/studentBankAccount.model");
                const MessAttendance = require("../models/messAttendance.model");
                const Marks = require("../models/marks.model");

                // Get full student data
                const fullStudent = await Student.findById(student._id)
                    .select(
                        "name studentId class batch roomNumber bedNumber hostelBlock feeStructure currentHostelState photo father mother"
                    )
                    .populate("assignedHostel", "name");

                // Get pending fees
                const pendingInstallments = fullStudent.feeStructure.installmentBreakdown.filter(
                    (inst) => inst.status === "pending" || inst.status === "overdue"
                );

                const totalPending = pendingInstallments.reduce(
                    (sum, inst) => sum + (inst.amount || 0),
                    0
                );

                const totalPaid = fullStudent.feeStructure.installmentBreakdown
                    .filter((inst) => inst.status === "paid")
                    .reduce((sum, inst) => sum + (inst.paidAmount || 0), 0);

                // Get last 5 gate entries
                const recentEntries = await Attendance.find({
                    student: student._id,
                    type: { $in: ["IN", "OUT"] },
                    deleted: { $ne: true },
                })
                    .sort({ timestamp: -1 })
                    .limit(5)
                    .select("type timestamp date");

                // Get last gate entry
                const lastEntry = recentEntries[0] || null;

                // Get bank balance
                const bankAccount = await StudentBankAccount.findOne({
                    student: student._id,
                }).select("balance");

                // Get attendance stats for current month
                const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                const attendanceCount = await Attendance.countDocuments({
                    student: student._id,
                    type: "PRESENT",
                    date: { $gte: startOfMonth },
                    deleted: { $ne: true },
                });

                // Get mess attendance for last 7 days
                const last7Days = new Date();
                last7Days.setDate(last7Days.getDate() - 7);
                const messCount = await MessAttendance.countDocuments({
                    student: student._id,
                    date: { $gte: last7Days },
                    status: "present",
                });

                // Get latest marks
                const latestMarks = await Marks.find({
                    student: student._id,
                })
                    .sort({ conductedDate: -1 })
                    .limit(3)
                    .select("examType subject obtainedMarks totalMarks grade");

                return {
                    id: fullStudent._id,
                    name: fullStudent.name,
                    studentId: fullStudent.studentId,
                    class: fullStudent.class,
                    batch: fullStudent.batch,
                    hostel: fullStudent.assignedHostel?.name,
                    room: fullStudent.roomNumber,
                    bed: fullStudent.bedNumber,
                    block: fullStudent.hostelBlock,
                    currentState: fullStudent.currentHostelState,
                    photo: fullStudent.photo,
                    father: {
                        name: fullStudent.father?.name,
                        phone: fullStudent.father?.phone,
                    },
                    mother: {
                        name: fullStudent.mother?.name,
                        phone: fullStudent.mother?.phone,
                    },
                    fees: {
                        total: fullStudent.feeStructure.totalFees,
                        paid: totalPaid,
                        pending: totalPending,
                        pendingCount: pendingInstallments.length,
                    },
                    lastGateEntry: lastEntry
                        ? {
                            type: lastEntry.type,
                            time: lastEntry.timestamp,
                            date: lastEntry.date,
                        }
                        : null,
                    recentGateEntries: recentEntries.map((e) => ({
                        type: e.type,
                        time: e.timestamp,
                        date: e.date,
                    })),
                    bankBalance: bankAccount?.balance || 0,
                    attendance: {
                        thisMonth: attendanceCount,
                    },
                    mess: {
                        last7Days: messCount,
                    },
                    latestMarks: latestMarks.map((m) => ({
                        examType: m.examType,
                        subject: m.subject,
                        obtained: m.obtainedMarks,
                        total: m.totalMarks,
                        grade: m.grade,
                    })),
                };
            })
        );

        res.json({
            success: true,
            data: {
                parent: {
                    phone: req.parent.phone,
                },
                children: childrenData,
            },
        });
    } catch (error) {
        console.error("Parent dashboard error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load dashboard",
            error: error.message,
        });
    }
});

// @route   GET /api/parent/child/:studentId
// @desc    Get detailed child information
// @access  Private (Parent)
router.get(
    "/child/:studentId",
    authenticateParent,
    verifyParentOwnsStudent,
    async (req, res) => {
        try {
            const { studentId } = req.params;

            const student = await Student.findById(studentId)
                .select("-documents -createdBy -__v")
                .populate("assignedHostel", "name type address");

            if (!student) {
                return res.status(404).json({
                    success: false,
                    message: "Student not found",
                });
            }

            res.json({
                success: true,
                data: student,
            });
        } catch (error) {
            console.error("Get child details error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to load child details",
                error: error.message,
            });
        }
    }
);

// @route   GET /api/parent/child/:studentId/fees
// @desc    Get child's fee payment history
// @access  Private (Parent)
router.get(
    "/child/:studentId/fees",
    authenticateParent,
    verifyParentOwnsStudent,
    async (req, res) => {
        try {
            const { studentId } = req.params;
            const { page = 1, limit = 10 } = req.query;

            const Fee = require("../models/fees.model");

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const fees = await Fee.find({
                student: studentId,
                status: "paid",
            })
                .sort({ paymentDate: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .select(
                    "installmentNumber installmentAmount paidAmount paymentMode receiptNumber paymentDate"
                );

            const total = await Fee.countDocuments({
                student: studentId,
                status: "paid",
            });

            res.json({
                success: true,
                data: fees,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / parseInt(limit)),
                    total,
                    limit: parseInt(limit),
                },
            });
        } catch (error) {
            console.error("Get fee history error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to load fee history",
                error: error.message,
            });
        }
    }
);

// @route   GET /api/parent/child/:studentId/attendance
// @desc    Get child's hostel attendance history
// @access  Private (Parent)
router.get(
    "/child/:studentId/attendance",
    authenticateParent,
    verifyParentOwnsStudent,
    async (req, res) => {
        try {
            const { studentId } = req.params;
            const { startDate, endDate, page = 1, limit = 30 } = req.query;

            const Attendance = require("../models/attendance.model");

            const query = {
                student: studentId,
                deleted: { $ne: true },
            };

            if (startDate && endDate) {
                query.date = { $gte: startDate, $lte: endDate };
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const attendance = await Attendance.find(query)
                .sort({ date: -1, timestamp: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .select("date type timestamp status source");

            const total = await Attendance.countDocuments(query);

            res.json({
                success: true,
                data: attendance,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / parseInt(limit)),
                    total,
                    limit: parseInt(limit),
                },
            });
        } catch (error) {
            console.error("Get attendance history error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to load attendance history",
                error: error.message,
            });
        }
    }
);

// @route   GET /api/parent/child/:studentId/gate-entries
// @desc    Get child's gate entry history
// @access  Private (Parent)
router.get(
    "/child/:studentId/gate-entries",
    authenticateParent,
    verifyParentOwnsStudent,
    async (req, res) => {
        try {
            const { studentId } = req.params;
            const { page = 1, limit = 20 } = req.query;

            const Attendance = require("../models/attendance.model");

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const entries = await Attendance.find({
                student: studentId,
                type: { $in: ["IN", "OUT"] },
                deleted: { $ne: true },
            })
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .select("date type timestamp status");

            const total = await Attendance.countDocuments({
                student: studentId,
                type: { $in: ["IN", "OUT"] },
                deleted: { $ne: true },
            });

            res.json({
                success: true,
                data: entries,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / parseInt(limit)),
                    total,
                    limit: parseInt(limit),
                },
            });
        } catch (error) {
            console.error("Get gate entries error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to load gate entries",
                error: error.message,
            });
        }
    }
);

// @route   GET /api/parent/child/:studentId/mess-attendance
// @desc    Get child's mess attendance history
// @access  Private (Parent)
router.get(
    "/child/:studentId/mess-attendance",
    authenticateParent,
    verifyParentOwnsStudent,
    async (req, res) => {
        try {
            const { studentId } = req.params;
            const { startDate, endDate, page = 1, limit = 30 } = req.query;

            const MessAttendance = require("../models/messAttendance.model");

            const query = {
                student: studentId,
            };

            if (startDate && endDate) {
                query.date = { $gte: startDate, $lte: endDate };
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const messAttendance = await MessAttendance.find(query)
                .sort({ date: -1, markedAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .select("date mealType status markedAt");

            const total = await MessAttendance.countDocuments(query);

            res.json({
                success: true,
                data: messAttendance,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / parseInt(limit)),
                    total,
                    limit: parseInt(limit),
                },
            });
        } catch (error) {
            console.error("Get mess attendance error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to load mess attendance",
                error: error.message,
            });
        }
    }
);

// @route   GET /api/parent/child/:studentId/bank
// @desc    Get child's bank balance and transactions
// @access  Private (Parent)
router.get(
    "/child/:studentId/bank",
    authenticateParent,
    verifyParentOwnsStudent,
    async (req, res) => {
        try {
            const { studentId } = req.params;
            const { page = 1, limit = 20 } = req.query;

            const StudentBankAccount = require("../models/studentBankAccount.model");
            const BankTransaction = require("../models/bankTransaction.model");

            // Get account balance
            const account = await StudentBankAccount.findOne({
                student: studentId,
            }).select("balance status");

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: "Bank account not found",
                });
            }

            // Get transactions
            const skip = (parseInt(page) - 1) * parseInt(limit);

            const transactions = await BankTransaction.find({
                student: studentId,
            })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .select(
                    "type amount balanceBefore balanceAfter description category createdAt"
                );

            const total = await BankTransaction.countDocuments({
                student: studentId,
            });

            res.json({
                success: true,
                data: {
                    balance: account.balance,
                    status: account.status,
                    transactions,
                },
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / parseInt(limit)),
                    total,
                    limit: parseInt(limit),
                },
            });
        } catch (error) {
            console.error("Get bank data error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to load bank data",
                error: error.message,
            });
        }
    }
);

// @route   GET /api/parent/child/:studentId/marks
// @desc    Get child's academic marks
// @access  Private (Parent)
router.get(
    "/child/:studentId/marks",
    authenticateParent,
    verifyParentOwnsStudent,
    async (req, res) => {
        try {
            const { studentId } = req.params;
            const { examType, subject } = req.query;

            const Marks = require("../models/marks.model");

            const query = {
                student: studentId,
            };

            if (examType) query.examType = examType;
            if (subject) query.subject = subject;

            const marks = await Marks.find(query)
                .sort({ conductedDate: -1 })
                .select("examType subject totalMarks obtainedMarks grade conductedDate");

            res.json({
                success: true,
                data: marks,
            });
        } catch (error) {
            console.error("Get marks error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to load marks",
                error: error.message,
            });
        }
    }
);

module.exports = router;
