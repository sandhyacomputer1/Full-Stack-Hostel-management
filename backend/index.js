require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const {
  startOverdueInstallmentJob,
  updateOverdueInstallments,
} = require("./cron/updateInstallmentStatus");
const AttendanceAutoMarkService = require("./cron/attendanceAutoMarkService");
const messAutoMarkService = require("./cron/messAutoMarkService");
const employeeAutoMarkService = require("./cron/employeeAutoMarkService");

const PORT = process.env.PORT;

const dashboardRoute = require("./routes/dashboard.route");
const authRoute = require("./routes/auth.route");
const studentRoute = require("./routes/student.route");
const feeRoute = require("./routes/fees.route");
const expensesRoute = require("./routes/expenses.route");
const attendanceRoute = require("./routes/attendance.route");
const leaveRoute = require("./routes/leaveRoutes.route");
const marksRoute = require("./routes/marks.route");
const bankRoute = require("./routes/studentBank.route");
const messRoute = require("./routes/messRoutes.route");
const reportsRoutes = require("./routes/reports.routes");
const studentBankRoutes = require("./routes/studentBank.route");
const analyticsRoutes = require("./routes/analytics.routes");
const parentRoutes = require("./routes/parent.route");
const notificationRoutes = require("./routes/notification.route");
const employeeRoutes = require("./routes/employee.routes");
const employeeAttendanceRoutes = require("./routes/employeeAttendance.routes");
const employeeLeaveRoutes = require("./routes/employeeLeave.routes");
const employeeSalaryRoutes = require("./routes/employeeSalary.routes");


const app = express();

// security middlewares
app.set("trust proxy", 1);
app.use(helmet());
app.use(compression());

// rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
});
app.use(limiter);

// CORS configuration
const allowedOrigins = [
  process.env.REACT_APP_API_URL || "http://localhost:3000/api",
];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    optionsSuccessStatus: 200,
  })
);

// Body parsing middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (process.env.APP_ENV === "development") {
  app.use(morgan("dev"));
}

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URL)
  .then(async () => {
    console.log("MongoDB connected");

    // 1) Run overdue installment job
    try {
      await updateOverdueInstallments();
      startOverdueInstallmentJob();
      console.log("Overdue installment jobs started");
    } catch (err) {
      console.error("Failed to start overdue installment jobs:", err);
    }

    // 2) Start attendance auto-mark scheduler
    try {
      await AttendanceAutoMarkService.startScheduler();
      console.log("Attendance auto-mark scheduler started");
    } catch (err) {
      console.error("Failed to start attendance scheduler:", err);
    }

    // 3) Start mess auto-mark scheduler (NEW)
    try {
      await messAutoMarkService.startScheduler();
      console.log("Mess auto-mark scheduler started");
    } catch (err) {
      console.error("Failed to start mess auto-mark scheduler:", err);
    }

    // 4) Start employee auto-mark scheduler
    try {
      await employeeAutoMarkService.startScheduler();
      console.log("✅ Employee auto-mark scheduler started");
    } catch (err) {
      console.error("❌ Failed to start employee auto-mark scheduler:", err);
    }

    // Routes
    app.use("/api/dashboard", dashboardRoute);
    app.use("/api/auth", authRoute);
    app.use("/api/students", studentRoute);
    app.use("/api/fees", feeRoute);
    app.use("/api/expenses", expensesRoute);
    app.use("/api/attendance", attendanceRoute);
    app.use("/api/leave-applications", leaveRoute);
    app.use("/api/marks", marksRoute);
    app.use("/api/bank", bankRoute);
    app.use("/api/mess", messRoute);
    app.use("/api/student-bank", studentBankRoutes);
    app.use("/api/reports", reportsRoutes);
    app.use("/api/analytics", analyticsRoutes);
    app.use("/api/parent", parentRoutes);
    app.use("/api/notifications", notificationRoutes);
    app.use("/api/employees", employeeRoutes);
    app.use("/api/employee-attendance", employeeAttendanceRoutes);
    app.use("/api/employee-leave", employeeLeaveRoutes);
    app.use("/api/employee-salary", employeeSalaryRoutes);

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({
        message: "Something went wrong!",
        error:
          process.env.APP_ENV === "development"
            ? err.message
            : "Internal Server Error",
      });
    });

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({ message: "Route not found" });
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (err) => {
      console.error("Unhandled Promise Rejection:", err.message);
      console.error(err.stack);
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (err) => {
      console.error("Uncaught Exception:", err.message);
      console.error(err.stack);
    });

    app.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
