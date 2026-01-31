// src/App.jsx
import React from "react";
import "./index.css";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Auth/Login";
import LoadingSpinner from "./components/UI/LoadingSpinner";
import { useAuth } from "./contexts/AuthContext";
import {
  ParentAuthProvider,
  useParentAuth,
} from "./contexts/ParentAuthContext";
import Layout from "./components/Layout/Layout";
import Dashboard from "./pages/Dashboard/Dashboard";
import Students from "./pages/Students/Students";
import AddStudent from "./pages/Students/AddStudents";
import EditStudents from "./pages/Students/EditStudents";
import StudentDetail from "./pages/Students/StudentDetails";
import Profile from "./pages/Profile/Profile";
import Fees from "./pages/Fees/Fees";
import FeePayment from "./pages/Fees/FeePayment";
import Receipt from "./pages/Fees/Receipt";
import { MessSettingsProvider } from "./contexts/MessSettingsContext";

// Parent Auth Pages
import ParentLogin from "./pages/ParentAuth/ParentLogin";
import VerifyOTP from "./pages/ParentAuth/VerifyOTP";
import ParentDashboard from "./pages/ParentDashboard/ParentDashboard";
import ChildDetails from "./pages/ParentDashboard/ChildDetails";

// Attendance - Unified Page (with internal tabs)
import AttendancePage from "./pages/Attendance/AttendancePage";
import StudentBankPage from "./pages/StudentBank/StudentBankPage";
import ReportsPage from "./pages/Reports/ReportsPage";
import AnalyticsPage from "./pages/Analytics/AnalyticsPage";

// Mess Management - Unified Page (with internal tabs)
import MessPage from "./pages/Mess/MessPage";

// Expenses
import Expenses from "./pages/Expenses/Expenses";
// Marks
import Marks from "./pages/Marks/Marks";
import HelpPage from "./pages/Help/HelpPage";

// ✅ UPDATED: Employee Management (New Integrated System)
import EmployeesPage from "./pages/Employees/EmployeesPage.jsx";
import EmployeeAttendancePage from "./pages/Employees/EmployeeAttendancePage.jsx";

// Watchman
import GateEntry from "./pages/Watchman/GateEntry.jsx";

// Protected routes
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return <LoadingSpinner />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
};

// Public Routes
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return <LoadingSpinner />;
  }
  if (user) {
    // redirect user based on role...
    switch (user.role) {
      case "admin":
        return <Navigate to="/dashboard" replace />;
      case "manager":
        return <Navigate to="/dashboard" replace />;
      case "watchman":
        return <Navigate to="/watchman/gate-entry" replace />;
      case "mess_manager":
        return <Navigate to="/mess" replace />;
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }
  return children;
};

// Parent Protected Routes
const ParentProtectedRoute = ({ children }) => {
  const { parent, loading } = useParentAuth();
  if (loading) {
    return <LoadingSpinner />;
  }
  if (!parent) {
    return <Navigate to="/parent/login" replace />;
  }
  return children;
};

function App() {
  return (
    <ParentAuthProvider>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* Parent Auth Routes */}
          <Route path="/parent/login" element={<ParentLogin />} />
          <Route path="/parent/verify-otp" element={<VerifyOTP />} />

          {/* Parent Dashboard Routes */}
          <Route
            path="/parent/dashboard"
            element={
              <ParentProtectedRoute>
                <ParentDashboard />
              </ParentProtectedRoute>
            }
          />
          <Route
            path="/parent/child/:studentId"
            element={
              <ParentProtectedRoute>
                <ChildDetails />
              </ParentProtectedRoute>
            }
          />

          {/* Protected Routes */}
          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route
              path="dashboard"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* ========================================
              EMPLOYEE MANAGEMENT (✅ UPDATED)
              ======================================== */}

            {/* Main Employee Page - Unified with Internal Tabs */}
            <Route
              path="employees"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <EmployeesPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback redirect for old employee-attendance route */}
            <Route
              path="employee-attendance"
              element={<Navigate to="/employees/attendance" replace />}
            />

            {/* Employee Attendance - Separate Page */}
            <Route
              path="employees/attendance"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <EmployeeAttendancePage />
                </ProtectedRoute>
              }
            />

            {/* ========================================
              STUDENT MANAGEMENT
              ======================================== */}

            <Route
              path="students"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <Students />
                </ProtectedRoute>
              }
            />
            <Route
              path="students/add"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <AddStudent />
                </ProtectedRoute>
              }
            />
            <Route
              path="students/:id"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <StudentDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="students/edit/:id"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <EditStudents />
                </ProtectedRoute>
              }
            />

            {/* ========================================
              FEE MANAGEMENT
              ======================================== */}

            <Route
              path="fees"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <Fees />
                </ProtectedRoute>
              }
            />
            <Route
              path="fees/payment/:studentId"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <FeePayment />
                </ProtectedRoute>
              }
            />
            <Route
              path="fees/receipt/:feeId"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <Receipt />
                </ProtectedRoute>
              }
            />

            {/* ========================================
              EXPENSES MANAGEMENT
              ======================================== */}

            <Route
              path="expenses"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <Expenses />
                </ProtectedRoute>
              }
            />

            {/* ========================================
              STUDENT BANK MANAGEMENT
              ======================================== */}

            <Route
              path="student-bank"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <StudentBankPage />
                </ProtectedRoute>
              }
            />

            {/* ========================================
              ATTENDANCE MANAGEMENT
              ======================================== */}

            {/* Main Attendance Page (Unified with Tabs) */}
            <Route
              path="attendance"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <AttendancePage />
                </ProtectedRoute>
              }
            />

            {/* Watchman Dashboard */}
            <Route
              path="watchman/gate-entry"
              element={
                <ProtectedRoute allowedRoles={["watchman"]}>
                  <GateEntry />
                </ProtectedRoute>
              }
            />

            {/* ========================================
              ANALYTICS & REPORTS
              ======================================== */}

            <Route
              path="analytics"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="reports"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />

            {/* ========================================
              MESS MANAGEMENT
              ======================================== */}

            <Route
              path="mess"
              element={
                <ProtectedRoute
                  allowedRoles={["admin", "manager", "mess_manager"]}
                >
                  <MessSettingsProvider>
                    <MessPage />
                  </MessSettingsProvider>
                </ProtectedRoute>
              }
            />

            {/* ========================================
              MARKS MANAGEMENT
              ======================================== */}

            <Route
              path="marks"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <Marks />
                </ProtectedRoute>
              }
            />

            {/* ========================================
              PROFILE
              ======================================== */}

            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* Help & Support */}
            <Route
              path="help"
              element={
                <ProtectedRoute>
                  <HelpPage />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </div>
    </ParentAuthProvider>
  );
}

export default App;
