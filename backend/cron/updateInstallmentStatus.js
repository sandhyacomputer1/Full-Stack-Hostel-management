const cron = require("node-cron");
const Student = require("../models/student.model");

// 1️⃣ The function that updates overdue installments
const updateOverdueInstallments = async () => {
  const today = new Date();
  try {
    const students = await Student.find({
      "feeStructure.installmentBreakdown.status": "pending",
    });

    for (const student of students) {
      let updated = false;

      student.feeStructure.installmentBreakdown =
        student.feeStructure.installmentBreakdown.map((installment) => {
          if (
            installment.status === "pending" &&
            new Date(installment.dueDate) < today
          ) {
            updated = true;
            return { ...installment, status: "overdue" };
          }
          return installment;
        });

      if (updated) await student.save();
    }

    // console.log("Overdue installments updated successfully");
  } catch (err) {
    console.error("Error updating overdue installments:", err);
  }
};

// 2️⃣ The cron job that runs the function daily
const startOverdueInstallmentJob = () => {
  const cron = require("node-cron");

  cron.schedule(
    "1 0 * * *",
    () => {
      console.log("Running daily overdue installments cron job...");
      updateOverdueInstallments();
    },
    { timezone: "Asia/Kolkata" }
  );
};

module.exports = { startOverdueInstallmentJob, updateOverdueInstallments };
