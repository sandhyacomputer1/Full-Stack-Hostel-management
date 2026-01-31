const express = require("express");
const router = express.Router();
const Employee = require("../models/employee.model");
const EmployeeSalaryRecord = require("../models/employeeSalaryRecord.model");
const SalaryCalculationService = require("../services/salaryCalculationService");
const Expense = require("../models/expense.model");
const { authenticateToken, authorizeRoles } = require("../middlewares/auth");
const {
  uploadConfigs,
  handleUploadError,
  getFileUrl,
} = require("../middlewares/upload");

// Protect all routes
router.use(authenticateToken);

// ============ CALCULATE SALARY FOR MONTH ============
router.post(
  "/calculate",
  authorizeRoles("admin", "manager"),
  async (req, res) => {
    try {
      const { employeeId, month, year } = req.body;

      if (!employeeId || !month) {
        return res.status(400).json({
          success: false,
          message: "Employee ID and month are required",
        });
      }

      // Extract month and year from month string (format: "2026-01")
      let monthNum, yearNum;
      if (typeof month === "string" && month.includes("-")) {
        [yearNum, monthNum] = month.split("-").map(Number);
      } else {
        monthNum = parseInt(month);
        yearNum = year ? parseInt(year) : new Date().getFullYear();
      }

      // Validate month
      if (monthNum < 1 || monthNum > 12) {
        return res.status(400).json({
          success: false,
          message: "Month must be between 1 and 12",
        });
      }

      const salaryRecord =
        await SalaryCalculationService.calculateMonthlySalary(
          employeeId,
          monthNum,
          yearNum
        );

      await salaryRecord.populate(
        "employee",
        "fullName employeeCode role department"
      );

      res.status(200).json({
        success: true,
        message: "Salary calculated successfully",
        data: salaryRecord,
      });
    } catch (error) {
      console.error("Calculate salary error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error calculating salary",
      });
    }
  }
);

// ============ BULK CALCULATE SALARY ============
router.post(
  "/bulk-calculate",
  authorizeRoles("admin", "manager"),
  async (req, res) => {
    try {
      const { month, year } = req.body;
      const hostelId = req.user.assignedHostel;

      if (!month) {
        return res.status(400).json({
          success: false,
          message: "Month is required",
        });
      }

      // Extract month and year
      let monthNum, yearNum;
      if (typeof month === "string" && month.includes("-")) {
        [yearNum, monthNum] = month.split("-").map(Number);
      } else {
        monthNum = parseInt(month);
        yearNum = year ? parseInt(year) : new Date().getFullYear();
      }

      const result = await SalaryCalculationService.calculateBulkSalary(
        hostelId,
        monthNum,
        yearNum
      );

      res.status(200).json({
        success: true,
        message: `Calculated salary for ${
          result.success?.length || 0
        } employees`,
        data: result.success || [],
        errors: result.errors?.length > 0 ? result.errors : undefined,
      });
    } catch (error) {
      console.error("Bulk calculate error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error in bulk calculation",
      });
    }
  }
);

// ============ GET PENDING SALARIES ============
router.get(
  "/pending",
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      const hostelId = req.user.assignedHostel;

      const pendingPayments = await EmployeeSalaryRecord.find({
        assignedHostel: hostelId,
        isPaid: false,
      })
        .populate("employee", "fullName employeeCode role department")
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: pendingPayments,
      });
    } catch (error) {
      console.error("Get pending payments error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error fetching pending payments",
      });
    }
  }
);

// ============ GET MONTHLY PAYROLL ============
router.get(
  "/month/:month",
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      const { month } = req.params;
      const hostelId = req.user.assignedHostel;

      const salaryRecords = await EmployeeSalaryRecord.find({
        assignedHostel: hostelId,
        month: month,
      })
        .populate("employee", "fullName employeeCode role department")
        .populate("paidBy", "name")
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: salaryRecords,
      });
    } catch (error) {
      console.error("Get monthly payroll error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error fetching monthly payroll",
      });
    }
  }
);

// ============ GET SALARY RECORDS FOR EMPLOYEE ============
router.get(
  "/employee/:employeeId",
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      const { employeeId } = req.params;
      const limit = parseInt(req.query.limit) || 12;

      const salaryRecords = await EmployeeSalaryRecord.getEmployeeSalaryHistory(
        employeeId,
        limit
      );

      res.status(200).json({
        success: true,
        data: salaryRecords,
      });
    } catch (error) {
      console.error("Get employee salary error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error fetching salary records",
      });
    }
  }
);

// ✅ PAY SALARY - WITH EXPENSE CREATION (FIXED)
router.post(
  "/pay/:id",
  authorizeRoles("admin", "manager"),
  uploadConfigs.single("paymentProof"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { paymentMode, transactionId, notes, addToExpense } = req.body;

      console.log("💰 Payment Request:", {
        salaryId: id,
        paymentMode,
        addToExpense,
        addToExpenseType: typeof addToExpense,
        hasFile: !!req.file,
      });

      if (!paymentMode) {
        return res.status(400).json({
          success: false,
          message: "Payment mode is required",
        });
      }

      const salaryRecord = await EmployeeSalaryRecord.findById(id).populate(
        "employee",
        "fullName employeeCode role department phone"
      );

      if (!salaryRecord) {
        return res.status(404).json({
          success: false,
          message: "Salary record not found",
        });
      }

      if (salaryRecord.isPaid) {
        return res.status(400).json({
          success: false,
          message: "This salary has already been paid",
          data: salaryRecord,
        });
      }

      const paymentProof = req.file ? getFileUrl(req.file) : "";

      console.log("💰 Processing salary payment:", {
        salaryId: id,
        employeeId: salaryRecord.employee._id,
        amount: salaryRecord.netSalary,
        paymentMode,
        hasProof: !!paymentProof,
      });

      // Mark as paid
      await salaryRecord.markAsPaid(
        req.user._id,
        paymentMode,
        transactionId || "",
        paymentProof
      );

      if (notes) {
        salaryRecord.notes = notes;
        await salaryRecord.save();
      }

      // ✅ CREATE EXPENSE RECORD if addToExpense is true
      let expenseRecord = null;
      const shouldCreateExpense =
        addToExpense === "true" || addToExpense === true;

      console.log("🔍 Expense check:", {
        addToExpense,
        shouldCreateExpense,
        hostelId: salaryRecord.assignedHostel,
      });

      if (shouldCreateExpense) {
        try {
          // Format month for description
          const [year, month] = salaryRecord.month.split("-");
          const monthDate = new Date(year, parseInt(month) - 1, 1);
          const monthYear = monthDate.toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
          });

          console.log("📝 Creating expense record...");

          // ✅ FIXED: Added all required fields according to your schema
          expenseRecord = new Expense({
            type: "hostel_expense", // ✅ REQUIRED field
            assignedHostel: salaryRecord.assignedHostel,
            category: "salary",
            amount: salaryRecord.netSalary,
            description: `Salary payment for ${salaryRecord.employee.fullName} (${salaryRecord.employee.employeeCode}) - ${monthYear}`,
            date: salaryRecord.paidDate || new Date(),
            paymentMode: paymentMode,
            transactionId: transactionId || "",
            recordedBy: req.user._id, // ✅ REQUIRED field

            // Optional fields that match your schema
            billNumber: salaryRecord.employee.employeeCode,
            vendor: {
              name: salaryRecord.employee.fullName,
              contact: salaryRecord.employee.phone || "",
            },

            // Budget tracking
            budgetCategory: "salary",
            budgetMonth: salaryRecord.month,
            budgetYear: parseInt(year),

            // Additional info
            tags: [
              "salary",
              "employee_payment",
              salaryRecord.employee.employeeCode,
              salaryRecord.month,
            ],

            // Attachments (if payment proof exists)
            attachments: paymentProof
              ? [
                  {
                    filename: `salary-proof-${salaryRecord.employee.employeeCode}-${salaryRecord.month}`,
                    url: paymentProof,
                    type: "payment_proof",
                    uploadedAt: new Date(),
                  },
                ]
              : [],

            // Approval (already approved since manager/admin is paying)
            approvalRequired: false,
            approvalStatus: "approved",
            approvedBy: req.user._id,
            approvalDate: new Date(),

            status: "active",
          });

          await expenseRecord.save();
          console.log(`✅ Expense record created: ${expenseRecord._id}`);

          // Link expense to salary record
          await salaryRecord.linkExpenseRecord(expenseRecord._id);
          console.log(`✅ Expense linked to salary record`);
        } catch (expenseError) {
          console.error("❌ Failed to create expense record:", expenseError);
          console.error("Error details:", {
            message: expenseError.message,
            errors: expenseError.errors,
          });
          // Don't fail the salary payment if expense creation fails
        }
      } else {
        console.log("⏭️  Skipping expense creation (addToExpense = false)");
      }

      await salaryRecord.populate("paidBy", "name");

      console.log("✅ Salary payment completed:", {
        salaryId: salaryRecord._id,
        netSalary: salaryRecord.netSalary,
        expenseCreated: !!expenseRecord,
        expenseId: expenseRecord?._id,
      });

      res.status(200).json({
        success: true,
        message: expenseRecord
          ? "Salary paid and added to expenses successfully!"
          : "Salary payment recorded successfully",
        data: salaryRecord,
        expenseCreated: !!expenseRecord,
        expenseId: expenseRecord?._id,
      });
    } catch (error) {
      console.error("💥 Pay salary error:", error);

      if (error.message.includes("already paid")) {
        return res.status(400).json({
          success: false,
          message: "This salary has already been paid",
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || "Error processing payment",
      });
    }
  }
);

// Handle upload errors
router.use(handleUploadError);

// ============ BULK PAY SALARIES ============
router.post(
  "/bulk-pay",
  authorizeRoles("admin", "manager"),
  async (req, res) => {
    try {
      const { salaryIds, paymentMode } = req.body;

      if (!salaryIds || salaryIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Salary IDs are required",
        });
      }

      const results = await EmployeeSalaryRecord.updateMany(
        {
          _id: { $in: salaryIds },
          isPaid: false,
        },
        {
          $set: {
            isPaid: true,
            paidDate: new Date(),
            paymentMode: paymentMode || "bank_transfer",
            paidBy: req.user._id,
          },
        }
      );

      res.status(200).json({
        success: true,
        message: `Paid ${results.modifiedCount} salaries successfully`,
        data: results,
      });
    } catch (error) {
      console.error("Bulk pay error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error processing bulk payment",
      });
    }
  }
);

// ============ ADD BONUS ============
router.put(
  "/:id/bonus",
  authorizeRoles("admin", "manager"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, amount, description } = req.body;

      if (!title || !amount) {
        return res.status(400).json({
          success: false,
          message: "Title and amount are required",
        });
      }

      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Amount must be greater than 0",
        });
      }

      const salaryRecord = await EmployeeSalaryRecord.findById(id);
      if (!salaryRecord) {
        return res.status(404).json({
          success: false,
          message: "Salary record not found",
        });
      }

      await salaryRecord.addBonus(
        title,
        amount,
        description || "",
        req.user._id
      );

      res.status(200).json({
        success: true,
        message: "Bonus added successfully",
        data: salaryRecord,
      });
    } catch (error) {
      console.error("Add bonus error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error adding bonus",
      });
    }
  }
);

// ============ ADD DEDUCTION ============
router.put(
  "/:id/deduction",
  authorizeRoles("admin", "manager"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, amount, description } = req.body;

      if (!title || !amount) {
        return res.status(400).json({
          success: false,
          message: "Title and amount are required",
        });
      }

      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Amount must be greater than 0",
        });
      }

      const salaryRecord = await EmployeeSalaryRecord.findById(id);
      if (!salaryRecord) {
        return res.status(404).json({
          success: false,
          message: "Salary record not found",
        });
      }

      await salaryRecord.addDeduction(
        title,
        amount,
        description || "",
        req.user._id
      );

      res.status(200).json({
        success: true,
        message: "Deduction added successfully",
        data: salaryRecord,
      });
    } catch (error) {
      console.error("Add deduction error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error adding deduction",
      });
    }
  }
);

// ============ EDIT SALARY RECORD (UNPAID ONLY) ============
router.put(
  "/:id/edit",
  authorizeRoles("admin", "manager"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { changes, reason } = req.body;

      if (!reason || !changes) {
        return res.status(400).json({
          success: false,
          message: "Changes and reason are required",
        });
      }

      const salaryRecord = await EmployeeSalaryRecord.findById(id);
      if (!salaryRecord) {
        return res.status(404).json({
          success: false,
          message: "Salary record not found",
        });
      }

      if (salaryRecord.isPaid) {
        return res.status(400).json({
          success: false,
          message: "Cannot edit paid salary record",
        });
      }

      // Use the edit method with audit trail
      await salaryRecord.editSalaryRecord(changes, reason, req.user._id);

      await salaryRecord.populate(
        "employee",
        "fullName employeeCode role department"
      );
      await salaryRecord.populate("lastEditedBy", "name");

      res.status(200).json({
        success: true,
        message: "Salary record updated successfully",
        data: salaryRecord,
      });
    } catch (error) {
      console.error("Edit salary error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error editing salary record",
      });
    }
  }
);

// ✅ UPDATE EXPENSE LINK (FOR PAID SALARIES) - FIXED
router.put(
  "/:id/expense-link",
  authorizeRoles("admin", "manager"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { addToExpense } = req.body;

      const salaryRecord = await EmployeeSalaryRecord.findById(id).populate(
        "employee",
        "fullName employeeCode phone"
      );

      if (!salaryRecord) {
        return res.status(404).json({
          success: false,
          message: "Salary record not found",
        });
      }

      if (!salaryRecord.isPaid) {
        return res.status(400).json({
          success: false,
          message: "Can only manage expenses for paid salaries",
        });
      }

      // ✅ Add expense if not already added
      if (addToExpense && !salaryRecord.isAddedToExpense) {
        try {
          const [year, month] = salaryRecord.month.split("-");
          const monthDate = new Date(year, parseInt(month) - 1, 1);
          const monthYear = monthDate.toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
          });

          // ✅ FIXED: Include all required fields
          const expenseRecord = new Expense({
            type: "hostel_expense", // ✅ REQUIRED
            assignedHostel: salaryRecord.assignedHostel,
            category: "salary",
            amount: salaryRecord.netSalary,
            description: `Salary payment for ${salaryRecord.employee.fullName} (${salaryRecord.employee.employeeCode}) - ${monthYear}`,
            date: salaryRecord.paidDate || new Date(),
            paymentMode: salaryRecord.paymentMode || "bank_transfer",
            transactionId: salaryRecord.transactionId || "",
            recordedBy: req.user._id, // ✅ REQUIRED

            billNumber: salaryRecord.employee.employeeCode,
            vendor: {
              name: salaryRecord.employee.fullName,
              contact: salaryRecord.employee.phone || "",
            },

            budgetCategory: "salary",
            budgetMonth: salaryRecord.month,
            budgetYear: parseInt(year),

            tags: [
              "salary",
              "employee_payment",
              salaryRecord.employee.employeeCode,
              salaryRecord.month,
            ],

            approvalRequired: false,
            approvalStatus: "approved",
            approvedBy: req.user._id,
            approvalDate: new Date(),

            status: "active",
          });

          await expenseRecord.save();
          await salaryRecord.linkExpenseRecord(expenseRecord._id);

          return res.status(200).json({
            success: true,
            message: "Expense record created and linked successfully",
            data: salaryRecord,
            expenseId: expenseRecord._id,
          });
        } catch (expenseError) {
          console.error("Expense creation error:", expenseError);
          return res.status(500).json({
            success: false,
            message: "Failed to create expense record",
            error: expenseError.message,
          });
        }
      }

      // ✅ Remove expense link if requested
      if (!addToExpense && salaryRecord.isAddedToExpense) {
        // Optionally delete the expense record
        if (salaryRecord.expenseRecordId) {
          await Expense.findByIdAndDelete(salaryRecord.expenseRecordId);
        }

        salaryRecord.expenseRecordId = null;
        salaryRecord.isAddedToExpense = false;
        await salaryRecord.save();

        return res.status(200).json({
          success: true,
          message: "Expense link removed successfully",
          data: salaryRecord,
        });
      }

      res.status(200).json({
        success: true,
        message: "No changes needed",
        data: salaryRecord,
      });
    } catch (error) {
      console.error("Update expense link error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error updating expense link",
      });
    }
  }
);

// ============ GET EDIT HISTORY ============
router.get(
  "/:id/edit-history",
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const salaryRecord = await EmployeeSalaryRecord.findById(id)
        .populate("editHistory.editedBy", "name email")
        .populate("employee", "fullName employeeCode");

      if (!salaryRecord) {
        return res.status(404).json({
          success: false,
          message: "Salary record not found",
        });
      }

      res.status(200).json({
        success: true,
        data: {
          salaryId: salaryRecord._id,
          employee: salaryRecord.employee,
          month: salaryRecord.month,
          editHistory: salaryRecord.editHistory,
          lastEditedAt: salaryRecord.lastEditedAt,
          lastEditedBy: salaryRecord.lastEditedBy,
        },
      });
    } catch (error) {
      console.error("Get edit history error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error fetching edit history",
      });
    }
  }
);

// ============ GENERATE SALARY SLIP ============
router.get(
  "/slip/:id",
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const salarySlip = await SalaryCalculationService.generateSalarySlip(id);

      res.status(200).json({
        success: true,
        data: salarySlip,
      });
    } catch (error) {
      console.error("Generate salary slip error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error generating salary slip",
      });
    }
  }
);

// ============ EXPORT CSV ============
router.get(
  "/export/csv",
  authorizeRoles("admin", "manager"),
  async (req, res) => {
    try {
      const { month, status } = req.query;
      const hostelId = req.user.assignedHostel;

      const query = { assignedHostel: hostelId };
      if (month) query.month = month;
      if (status === "paid") query.isPaid = true;
      if (status === "pending") query.isPaid = false;

      const salaries = await EmployeeSalaryRecord.find(query).populate(
        "employee",
        "fullName employeeCode role department"
      );

      // Generate CSV
      const csv = [
        [
          "Employee Code",
          "Employee Name",
          "Role",
          "Month",
          "Base Salary",
          "Present Days",
          "Absent Days",
          "Deductions",
          "Bonuses",
          "Net Salary",
          "Prorated",
          "Status",
          "Paid Date",
        ].join(","),
        ...salaries.map((s) =>
          [
            s.employee?.employeeCode || "",
            `"${s.employee?.fullName || ""}"`,
            s.employee?.role || "",
            s.month,
            s.baseSalary,
            s.presentDays,
            s.absentDays,
            s.totalDeductions,
            s.bonuses?.reduce((sum, b) => sum + b.amount, 0) || 0,
            s.netSalary,
            s.isProrated ? "Yes" : "No",
            s.isPaid ? "Paid" : "Pending",
            s.paidDate ? new Date(s.paidDate).toLocaleDateString("en-IN") : "",
          ].join(",")
        ),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=salary-report-${month || "all"}.csv`
      );
      res.status(200).send(csv);
    } catch (error) {
      console.error("Export CSV error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error exporting CSV",
      });
    }
  }
);

// ============ GET SALARY RECORD BY ID ============
router.get(
  "/:id",
  authorizeRoles("admin", "manager", "warden"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const salaryRecord = await EmployeeSalaryRecord.findById(id)
        .populate(
          "employee",
          "fullName employeeCode role department phone address joiningDate relievingDate"
        )
        .populate("paidBy", "name")
        .populate("lastEditedBy", "name");

      if (!salaryRecord) {
        return res.status(404).json({
          success: false,
          message: "Salary record not found",
        });
      }

      res.status(200).json({
        success: true,
        data: salaryRecord,
      });
    } catch (error) {
      console.error("Get salary record error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error fetching salary record",
      });
    }
  }
);

// ============ DELETE SALARY RECORD ============
router.delete("/:id", authorizeRoles("admin", "manager"), async (req, res) => {
  try {
    const { id } = req.params;

    const salaryRecord = await EmployeeSalaryRecord.findById(id);
    if (!salaryRecord) {
      return res.status(404).json({
        success: false,
        message: "Salary record not found",
      });
    }

    if (salaryRecord.isPaid) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete paid salary record",
      });
    }

    await salaryRecord.deleteOne();

    res.status(200).json({
      success: true,
      message: "Salary record deleted successfully",
    });
  } catch (error) {
    console.error("Delete salary record error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error deleting salary record",
    });
  }
});

module.exports = router;
