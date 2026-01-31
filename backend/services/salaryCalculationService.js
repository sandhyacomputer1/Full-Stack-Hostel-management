const Employee = require("../models/employee.model");
const EmployeeAttendance = require("../models/employeeAttendance.model");
const EmployeeLeaveApplication = require("../models/employeeLeaveApplication.model");
const EmployeeAttendanceSettings = require("../models/employeeAttendanceSettings.model");
const EmployeeSalaryRecord = require("../models/employeeSalaryRecord.model");

class SalaryCalculationService {
  static async calculateMonthlySalary(employeeId, month, year) {
    try {
      console.log(
        `[Salary Calculation] Processing for employee ${employeeId}, ${month}-${year}`
      );

      const employee = await Employee.findById(employeeId);
      if (!employee) {
        throw new Error("Employee not found");
      }

      // Get settings (with safe fallback)
      let settings;
      try {
        settings = await EmployeeAttendanceSettings.getOrCreateSettings(
          employee.assignedHostel
        );
        console.log(`[Settings] Loaded for hostel`);
      } catch (settingsError) {
        console.warn(`[Settings] Using defaults:`, settingsError.message);
        settings = {
          workingDays: [1, 2, 3, 4, 5, 6],
          workingHoursPerDay: 8,
          overtimeEnabled: false,
          overtimeThreshold: 8,
          overtimeRate: 1.5,
          calculateWorkingDays: function (year, monthNum) {
            const lastDay = new Date(year, monthNum, 0).getDate();
            return Math.floor((lastDay * 6) / 7);
          },
        };
      }

      const monthStart = new Date(year, parseInt(month) - 1, 1);
      const lastDay = new Date(year, parseInt(month), 0).getDate();
      const monthEnd = new Date(year, parseInt(month) - 1, lastDay);

      // Do not consider future dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let workingStartDate = monthStart;
      let workingEndDate = new Date(Math.min(monthEnd, today));

      console.log(
        `[Date Range] Start: ${
          workingStartDate.toISOString().split("T")[0]
        }, End: ${workingEndDate.toISOString().split("T")[0]}`
      );

      // Mid‑month joining
      if (employee.joiningDate) {
        const joiningDate = new Date(employee.joiningDate);
        if (joiningDate > monthStart && joiningDate <= monthEnd) {
          workingStartDate = joiningDate;
          console.log(
            `[Prorated] Joined on ${joiningDate.toISOString().split("T")[0]}`
          );
        }
      }

      // Mid‑month relieving
      if (employee.relievingDate) {
        const relievingDate = new Date(employee.relievingDate);
        if (relievingDate >= monthStart && relievingDate < monthEnd) {
          workingEndDate = relievingDate;
          console.log(
            `[Prorated] Left on ${relievingDate.toISOString().split("T")[0]}`
          );
        }
      }

      if (workingStartDate > monthEnd || workingEndDate < monthStart) {
        throw new Error("Employee was not working in this month");
      }

      const startDateStr = workingStartDate.toISOString().split("T")[0];
      const endDateStr = workingEndDate.toISOString().split("T")[0];

      // Actual attendance
      const attendanceRecords = await EmployeeAttendance.find({
        employee: employeeId,
        date: { $gte: startDateStr, $lte: endDateStr },
      }).populate("leaveApplication", "leaveType isPaid status");

      console.log(`[Attendance] Found ${attendanceRecords.length} records`);

      if (attendanceRecords.length === 0) {
        throw new Error(
          "No attendance records found. Cannot calculate salary without attendance data."
        );
      }

      // Leave records
      const leaveRecords = await EmployeeLeaveApplication.find({
        employee: employeeId,
        status: "approved",
        $or: [
          { fromDate: { $gte: startDateStr, $lte: endDateStr } },
          { toDate: { $gte: startDateStr, $lte: endDateStr } },
          { fromDate: { $lte: startDateStr }, toDate: { $gte: endDateStr } },
        ],
      });

      // Attendance summary
      const summary = this.calculateAttendanceSummary(
        attendanceRecords,
        leaveRecords,
        startDateStr,
        endDateStr
      );

      console.log(`[Summary]`, summary);

      // Working days in full month (for per‑day rate)
      const totalMonthWorkingDays =
        typeof settings.calculateWorkingDays === "function"
          ? settings.calculateWorkingDays(year, parseInt(month))
          : Math.floor((lastDay * 6) / 7);

      console.log(
        `[Working Days] Total in month (for per‑day rate): ${totalMonthWorkingDays}`
      );

      // Actual payable days (from records)
      const actualWorkedDays =
        summary.presentDays +
        summary.paidLeaveDays +
        summary.holidayDays +
        summary.halfDays * 0.5;

      console.log(
        `[Actual Work] Employee worked (including half‑day as 0.5): ${actualWorkedDays} days`
      );
      console.log(
        `[Breakdown] Present: ${summary.presentDays}, Paid Leave: ${summary.paidLeaveDays}, Holiday: ${summary.holidayDays}, Half‑day: ${summary.halfDays}`
      );

      // Per‑day rate
      const baseSalary = employee.salary || 0;
      const perDayAmount =
        totalMonthWorkingDays > 0 ? baseSalary / totalMonthWorkingDays : 0;

      console.log(
        `[Rates] Base Salary: ₹${baseSalary}, Per Day: ₹${perDayAmount.toFixed(
          2
        )}`
      );

      // Earnings based on marked days
      const earnedFromPresent = summary.presentDays * perDayAmount;
      const earnedFromPaidLeave = summary.paidLeaveDays * perDayAmount;
      const earnedFromHolidays = summary.holidayDays * perDayAmount;
      const earnedFromHalfDays = summary.halfDays * (perDayAmount / 2);

      let totalEarned =
        earnedFromPresent +
        earnedFromPaidLeave +
        earnedFromHolidays +
        earnedFromHalfDays;

      // Do not let earned exceed base salary (normal working part)
      if (totalEarned > baseSalary) {
        console.log(
          `⚠️ [Salary Cap] Earned ₹${totalEarned.toFixed(
            2
          )} exceeds base ₹${baseSalary}. Capping to base salary.`
        );
        totalEarned = baseSalary;
      }

      console.log(`[Earnings]`, {
        present: earnedFromPresent.toFixed(2),
        paidLeave: earnedFromPaidLeave.toFixed(2),
        holidays: earnedFromHolidays.toFixed(2),
        halfDays: earnedFromHalfDays.toFixed(2),
        total: totalEarned.toFixed(2),
      });

      // Deductions (only actual absents / unpaid leaves)
      const absentDeduction = summary.absentDays * perDayAmount;
      const unpaidLeaveDeduction = summary.unpaidLeaveDays * perDayAmount;

      console.log(
        `[Deductions] Absent: ₹${absentDeduction.toFixed(
          2
        )}, Unpaid Leave: ₹${unpaidLeaveDeduction.toFixed(2)}`
      );

      // Hours & overtime
      const totalHoursWorked = attendanceRecords.reduce(
        (sum, record) => sum + (record.totalHours || 0),
        0
      );

      const overtimeCalculation = this.calculateOvertime(
        attendanceRecords,
        settings,
        employee.salary
      );

      // Create or update salary record
      const monthString = `${year}-${month.toString().padStart(2, "0")}`;
      let salaryRecord = await EmployeeSalaryRecord.findOne({
        employee: employeeId,
        month: monthString,
      });

      if (salaryRecord && salaryRecord.isPaid) {
        throw new Error(
          "Salary already paid for this month. Cannot recalculate."
        );
      }

      if (!salaryRecord) {
        salaryRecord = new EmployeeSalaryRecord({
          employee: employeeId,
          assignedHostel: employee.assignedHostel,
          month: monthString,
          year: year,
        });
      }

      // Core fields
      salaryRecord.baseSalary = baseSalary;
      salaryRecord.totalWorkingDays = actualWorkedDays; // actual chargeable days (with half‑days)
      salaryRecord.monthWorkingDays = totalMonthWorkingDays;
      salaryRecord.isProrated = true;
      salaryRecord.proratedReason = `Salary calculated from attendance records. Worked ${actualWorkedDays} effective days out of ${totalMonthWorkingDays} working days in the month.`;
      salaryRecord.workingStartDate = startDateStr;
      salaryRecord.workingEndDate = endDateStr;

      salaryRecord.presentDays = summary.presentDays;
      salaryRecord.absentDays = summary.absentDays;
      salaryRecord.halfDays = summary.halfDays;
      salaryRecord.paidLeaveDays = summary.paidLeaveDays;
      salaryRecord.unpaidLeaveDays = summary.unpaidLeaveDays;
      salaryRecord.holidayDays = summary.holidayDays;

      salaryRecord.perDayAmount = perDayAmount;
      salaryRecord.absentDeduction = absentDeduction;
      salaryRecord.halfDayDeduction = 0; // included in earnings
      salaryRecord.unpaidLeaveDeduction = unpaidLeaveDeduction;

      salaryRecord.totalHoursWorked = parseFloat(totalHoursWorked.toFixed(2));
      salaryRecord.overtimeHours = overtimeCalculation.overtimeHours;
      salaryRecord.overtimePay = overtimeCalculation.overtimePay;

      // Bonuses
      const bonuses = employee.bonuses || [];
      const totalBonuses = bonuses.reduce(
        (sum, bonus) => sum + (bonus.amount || 0),
        0
      );
      salaryRecord.bonuses = bonuses;
      salaryRecord.totalBonuses =
        totalBonuses + overtimeCalculation.overtimePay;

      // Other deductions
      const otherDeductions = employee.deductions || [];
      const totalOtherDeductions = otherDeductions.reduce(
        (sum, ded) => sum + (ded.amount || 0),
        0
      );
      salaryRecord.otherDeductions = otherDeductions;

      // Final calculation
      salaryRecord.totalDeductions =
        absentDeduction + unpaidLeaveDeduction + totalOtherDeductions;

      salaryRecord.grossSalary = totalEarned + salaryRecord.totalBonuses;
      salaryRecord.netSalary = Math.max(
        0,
        totalEarned - salaryRecord.totalDeductions + salaryRecord.totalBonuses
      );

      await salaryRecord.save();

      console.log(`[Final Calculation]`);
      console.log(`  Earned: ₹${totalEarned.toFixed(2)}`);
      console.log(
        `  Bonuses (incl. OT): ₹${salaryRecord.totalBonuses.toFixed(2)}`
      );
      console.log(`  Deductions: ₹${salaryRecord.totalDeductions.toFixed(2)}`);
      console.log(`  NET SALARY: ₹${salaryRecord.netSalary.toFixed(2)}`);

      return salaryRecord;
    } catch (error) {
      console.error("[Salary Calculation] Error:", error);
      throw error;
    }
  }

  // Working days helper (still used elsewhere if needed)
  static calculateWorkingDaysBetween(startDate, endDate, settings) {
    let count = 0;
    const current = new Date(startDate);
    const end = new Date(endDate);

    const workingDays =
      settings && Array.isArray(settings.workingDays)
        ? settings.workingDays
        : [1, 2, 3, 4, 5, 6];

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (workingDays.includes(dayOfWeek)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  static calculateAttendanceSummary(
    attendanceRecords,
    leaveRecords,
    startDate,
    endDate
  ) {
    const summary = {
      presentDays: 0,
      absentDays: 0,
      halfDays: 0,
      paidLeaveDays: 0,
      unpaidLeaveDays: 0,
      holidayDays: 0,
      lateDays: 0,
      earlyLeaveDays: 0,
    };

    attendanceRecords.forEach((record) => {
      const status = String(record.status || "absent").toLowerCase();

      try {
        switch (status) {
          case "present":
            summary.presentDays++;
            if (record.isLate) summary.lateDays++;
            if (record.isEarlyLeave) summary.earlyLeaveDays++;
            break;
          case "absent":
            summary.absentDays++;
            break;
          case "half_day":
            summary.halfDays++;
            break;
          case "holiday":
            summary.holidayDays++;
            break;
          case "late":
            summary.lateDays++;
            summary.presentDays++;
            break;
          case "early_leave":
            summary.earlyLeaveDays++;
            summary.presentDays++;
            break;
          case "on_leave":
            if (record.leaveApplication) {
              const leaveType = String(
                record.leaveApplication.leaveType || "paid"
              ).toLowerCase();
              const isPaid = record.leaveApplication.isPaid !== false;

              if (
                isPaid ||
                ["casual", "sick", "earned", "paid"].some((type) =>
                  leaveType.includes(type)
                )
              ) {
                summary.paidLeaveDays++;
              } else {
                summary.unpaidLeaveDays++;
              }
            } else {
              summary.paidLeaveDays++;
            }
            break;
          default:
            summary.absentDays++;
        }
      } catch (err) {
        console.error(`[Attendance] Error:`, err);
        summary.absentDays++;
      }
    });

    leaveRecords.forEach((leave) => {
      try {
        const leaveDays = this.countLeaveDaysInRange(
          leave.fromDate,
          leave.toDate,
          startDate,
          endDate
        );
        const isPaid = leave.isPaid !== false;

        if (isPaid) {
          summary.paidLeaveDays += leaveDays;
        } else {
          summary.unpaidLeaveDays += leaveDays;
        }
      } catch (err) {
        console.error(`[Leave] Error:`, err);
      }
    });

    return summary;
  }

  static countLeaveDaysInRange(leaveFrom, leaveTo, monthStart, monthEnd) {
    const start = new Date(Math.max(new Date(leaveFrom), new Date(monthStart)));
    const end = new Date(Math.min(new Date(leaveTo), new Date(monthEnd)));
    if (start > end) return 0;
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  static calculateOvertime(attendanceRecords, settings, baseSalary) {
    if (!settings.overtimeEnabled) {
      return {
        overtimeHours: 0,
        overtimePay: 0,
      };
    }

    let overtimeHours = 0;

    attendanceRecords.forEach((record) => {
      if (record.totalHours > settings.overtimeThreshold) {
        overtimeHours += record.totalHours - settings.overtimeThreshold;
      }
    });

    const monthlyWorkingHours = settings.workingHoursPerDay * 26;
    const hourlyRate =
      monthlyWorkingHours > 0 ? baseSalary / monthlyWorkingHours : 0;
    const overtimePay = overtimeHours * hourlyRate * settings.overtimeRate;

    return {
      overtimeHours: parseFloat(overtimeHours.toFixed(2)),
      overtimePay: parseFloat(overtimePay.toFixed(2)),
    };
  }

  static async calculateBulkSalary(hostelId, month, year) {
    try {
      console.log(
        `[Bulk Salary Calculation] Starting for hostel ${hostelId}, ${month}-${year}`
      );

      const employees = await Employee.find({
        assignedHostel: hostelId,
        status: "ACTIVE",
      });

      const results = {
        total: employees.length,
        success: [],
        errors: [],
      };

      for (const employee of employees) {
        try {
          const salaryRecord = await this.calculateMonthlySalary(
            employee._id,
            month,
            year
          );
          results.success.push({
            employeeCode: employee.employeeCode,
            employeeName: employee.fullName,
            netSalary: salaryRecord.netSalary,
            isProrated: salaryRecord.isProrated,
          });
        } catch (error) {
          console.error(
            `Error calculating salary for ${employee.employeeCode}:`,
            error
          );
          results.errors.push({
            employeeCode: employee.employeeCode,
            employeeName: employee.fullName,
            error: error.message,
          });
        }
      }

      console.log(
        `[Bulk Salary Calculation] Completed: ${results.success.length} success, ${results.errors.length} failed`
      );
      return results;
    } catch (error) {
      console.error("[Bulk Salary Calculation] Error:", error);
      throw error;
    }
  }

  static async getSalaryBreakdown(employeeId, month, year) {
    const monthString = `${year}-${month.toString().padStart(2, "0")}`;
    const salaryRecord = await EmployeeSalaryRecord.findOne({
      employee: employeeId,
      month: monthString,
    }).populate(
      "employee",
      "fullName employeeCode role department joiningDate relievingDate"
    );

    if (!salaryRecord) {
      return await this.calculateMonthlySalary(employeeId, month, year);
    }

    return salaryRecord;
  }

  static async recalculateSalary(salaryRecordId) {
    const salaryRecord = await EmployeeSalaryRecord.findById(salaryRecordId);

    if (!salaryRecord) {
      throw new Error("Salary record not found");
    }

    if (salaryRecord.isPaid) {
      throw new Error("Cannot recalculate paid salary");
    }

    const [year, month] = salaryRecord.month.split("-");
    return await this.calculateMonthlySalary(
      salaryRecord.employee,
      parseInt(month),
      parseInt(year)
    );
  }

  static async generateSalarySlip(salaryRecordId) {
    const salaryRecord = await EmployeeSalaryRecord.findById(salaryRecordId)
      .populate(
        "employee",
        "fullName employeeCode role department phone address joiningDate relievingDate"
      )
      .populate("paidBy", "name");

    if (!salaryRecord) {
      throw new Error("Salary record not found");
    }

    return {
      employee: salaryRecord.employee,
      month: salaryRecord.month,
      year: salaryRecord.year,
      baseSalary: salaryRecord.baseSalary,
      isProrated: salaryRecord.isProrated,
      proratedReason: salaryRecord.proratedReason,
      workingPeriod: {
        startDate: salaryRecord.workingStartDate,
        endDate: salaryRecord.workingEndDate,
      },
      attendance: {
        totalWorkingDays: salaryRecord.totalWorkingDays,
        monthWorkingDays: salaryRecord.monthWorkingDays,
        presentDays: salaryRecord.presentDays,
        absentDays: salaryRecord.absentDays,
        halfDays: salaryRecord.halfDays,
        paidLeaveDays: salaryRecord.paidLeaveDays,
        unpaidLeaveDays: salaryRecord.unpaidLeaveDays,
        holidayDays: salaryRecord.holidayDays,
      },
      workHours: {
        totalHoursWorked: salaryRecord.totalHoursWorked,
        overtimeHours: salaryRecord.overtimeHours,
        overtimePay: salaryRecord.overtimePay,
      },
      deductions: {
        perDayAmount: salaryRecord.perDayAmount,
        absentDeduction: salaryRecord.absentDeduction,
        halfDayDeduction: salaryRecord.halfDayDeduction,
        unpaidLeaveDeduction: salaryRecord.unpaidLeaveDeduction,
        otherDeductions: salaryRecord.otherDeductions,
        totalDeductions: salaryRecord.totalDeductions,
      },
      bonuses: {
        bonuses: salaryRecord.bonuses,
        totalBonuses: salaryRecord.totalBonuses,
      },
      summary: {
        grossSalary: salaryRecord.grossSalary,
        netSalary: salaryRecord.netSalary,
      },
      payment: {
        isPaid: salaryRecord.isPaid,
        paidDate: salaryRecord.paidDate,
        paidBy: salaryRecord.paidBy,
        paymentMode: salaryRecord.paymentMode,
        transactionId: salaryRecord.transactionId,
      },
      generatedAt: salaryRecord.generatedAt,
    };
  }
}

module.exports = SalaryCalculationService;
