const express = require("express");
const { body, validationResult } = require("express-validator");
const Student = require("../models/student.model");
const Notification = require("../models/notification.model");
const twilioService = require("../services/twilioService");
const {
    authenticateToken,
    authorizeAdminOrManager,
} = require("../middlewares/auth");

const router = express.Router();

// @route   POST /api/notifications/send-fee-reminder
// @desc    Send fee reminder SMS to parents
// @access  Private (Admin/Manager)
router.post(
    "/send-fee-reminder",
    authenticateToken,
    authorizeAdminOrManager,
    [
        body("studentIds")
            .optional()
            .isArray()
            .withMessage("studentIds must be an array"),
        body("studentId").optional().isMongoId().withMessage("Invalid student ID"),
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

            const { studentIds, studentId } = req.body;
            const assignedHostel = req.user.assignedHostel._id;

            // Determine which students to send reminders to
            let targetStudentIds = [];
            if (studentIds && studentIds.length > 0) {
                targetStudentIds = studentIds;
            } else if (studentId) {
                targetStudentIds = [studentId];
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Please provide studentId or studentIds",
                });
            }

            // Get students with pending fees
            const students = await Student.find({
                _id: { $in: targetStudentIds },
                assignedHostel,
                status: "active",
            }).select("name studentId father mother feeStructure assignedHostel");

            if (students.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "No students found",
                });
            }

            const results = [];

            for (const student of students) {
                // Calculate pending fees
                const pendingInstallments = student.feeStructure.installmentBreakdown.filter(
                    (inst) => inst.status === "pending" || inst.status === "overdue"
                );

                if (pendingInstallments.length === 0) {
                    results.push({
                        studentId: student.studentId,
                        name: student.name,
                        status: "skipped",
                        reason: "No pending fees",
                    });
                    continue;
                }

                const totalPending = pendingInstallments.reduce(
                    (sum, inst) => sum + (inst.amount || 0),
                    0
                );

                // Get next due date
                const nextDue = pendingInstallments.sort(
                    (a, b) => new Date(a.dueDate) - new Date(b.dueDate)
                )[0];

                const dueDate = nextDue.dueDate
                    ? new Date(nextDue.dueDate).toLocaleDateString("en-IN")
                    : "soon";

                // Send SMS to father's phone (primary contact)
                const parentPhone = student.father.phone;

                if (!parentPhone) {
                    results.push({
                        studentId: student.studentId,
                        name: student.name,
                        status: "failed",
                        reason: "No parent phone number",
                    });
                    continue;
                }

                const smsResult = await twilioService.sendFeeReminder(
                    parentPhone,
                    student.name,
                    totalPending,
                    dueDate,
                    student._id,
                    student.assignedHostel
                );

                results.push({
                    studentId: student.studentId,
                    name: student.name,
                    phone: parentPhone,
                    status: smsResult.success ? "sent" : "failed",
                    reason: smsResult.error || null,
                });
            }

            const successCount = results.filter((r) => r.status === "sent").length;
            const failedCount = results.filter((r) => r.status === "failed").length;

            res.json({
                success: true,
                message: `Fee reminders sent: ${successCount} successful, ${failedCount} failed`,
                results,
            });
        } catch (error) {
            console.error("Send fee reminder error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to send fee reminders",
                error: error.message,
            });
        }
    }
);

// @route   GET /api/notifications/history
// @desc    Get notification history
// @access  Private (Admin/Manager)
router.get(
    "/history",
    authenticateToken,
    authorizeAdminOrManager,
    async (req, res) => {
        try {
            const {
                type,
                purpose,
                status,
                startDate,
                endDate,
                page = 1,
                limit = 50,
            } = req.query;

            const assignedHostel = req.user.assignedHostel._id;

            const query = {
                assignedHostel,
            };

            if (type) query.type = type;
            if (purpose) query.purpose = purpose;
            if (status) query.status = status;

            if (startDate && endDate) {
                query.createdAt = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate),
                };
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const notifications = await Notification.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate("relatedStudent", "name studentId")
                .select(
                    "type recipient message purpose status sentAt failureReason createdAt"
                );

            const total = await Notification.countDocuments(query);

            res.json({
                success: true,
                data: notifications,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / parseInt(limit)),
                    total,
                    limit: parseInt(limit),
                },
            });
        } catch (error) {
            console.error("Get notification history error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to load notification history",
                error: error.message,
            });
        }
    }
);

module.exports = router;
