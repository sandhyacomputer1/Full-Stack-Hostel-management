// src/services/api.js
import axios from "axios";
import toast from "react-hot-toast";

// ================== BASE AXIOS INSTANCE ==================
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080/api",
  timeout: 30000,
});

// ================== REQUEST INTERCEPTOR ==================
api.interceptors.request.use(
  (config) => {
    if (config.url?.startsWith("/parent")) {
      const parentToken = localStorage.getItem("parentToken");
      if (parentToken) {
        config.headers.Authorization = `Bearer ${parentToken}`;
      }
    } else {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ================== RESPONSE INTERCEPTOR ==================
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.MODE === "development") {
      console.log(
        `✅ API Success: ${response.config.method?.toUpperCase()} ${
          response.config.url
        }`,
        response.status
      );
    }
    return response;
  },

  (error) => {
    const errorInfo = {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data,
    };
    console.error("❌ API Error:", errorInfo);

    const status = error.response?.status;

    if (status === 401) {
      console.warn("⚠️ Authentication required - redirecting to login");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      toast.error("Session expired. Please login again.");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    } else if (status === 403) {
      console.warn("⚠️ Access forbidden - insufficient permissions");
      toast.error(
        error.response?.data?.message ||
          "Access denied - insufficient permissions"
      );
    } else if (status >= 500) {
      console.error("🔥 Server error - backend issue");
      toast.error("Server error. Please try again.");
    } else if (!error.response || error.code === "ECONNABORTED") {
      console.error(
        "🔌 Network Error - Backend may be offline (expected: http://localhost:8080)"
      );
      toast.error("Network error. Please check backend connection.");
    }

    return Promise.reject(error);
  }
);

// ================== AUTH API ==================
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  verifyToken: () => api.get("/auth/verify-token"),
  updateProfile: (profileData) => api.put("/auth/profile", profileData),
  changePassword: (passwordData) =>
    api.put("/auth/change-password", passwordData),
  logout: () => api.post("/auth/logout"),
  getProfile: () => api.get("/auth/profile"),
};

// ================== STUDENTS API ==================
export const studentsAPI = {
  getAll: (params = {}) => api.get("/students", { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (studentData) => api.post("/students", studentData),
  update: (id, studentData) => api.put(`/students/${id}`, studentData),
  delete: (id) => api.delete(`/students/${id}`),
  inactivate: (id) => api.patch(`/students/${id}/inactivate`),

  getNextRollNumber: (studentClass, batch) =>
    api.get("/students/next-roll-number", {
      params: { class: studentClass, batch },
    }),

  uploadDocuments: (id, formData) =>
    api.post(`/students/${id}/documents`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  bulkUpload: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/students/bulk-upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  getPaidFees: (id, params = {}) =>
    api.get(`/students/${id}/paid-fees`, { params }),
  getUnpaidFees: (id, params = {}) =>
    api.get(`/students/${id}/unpaid-fees`, { params }),
  getAttendance: (id, params = {}) =>
    api.get(`/students/${id}/attendance`, { params }),
  getMarks: (id, params = {}) => api.get(`/students/${id}/marks`, { params }),
  getGateEntries: (id, params = {}) =>
    api.get(`/students/${id}/gate-entries`, { params }),
  getMessAttendance: (id, params = {}) =>
    api.get(`/students/${id}/mess-attendance`, { params }),
  getCompleteReport: (id) => api.get(`/students/${id}/complete-report`),
  search: (query, params = {}) =>
    api.get("/students/search", { params: { q: query, ...params } }),
};

// ================== FEES API ==================
export const feesAPI = {
  getAll: () => api.get("/fees/data"),
  getDuePayments: (params = {}) => api.get("/fees/due", { params }),
  getNextMonthDue: (params = {}) => api.get("/fees/next-month-due", { params }),
  getOverduePayments: (params = {}) => api.get("/fees/overdue", { params }),
  getPaidPayments: (params = {}) => api.get("/fees/paid", { params }),
  getAllPaidPayments: (params = {}) => api.get("/fees/all-paid", { params }),
  getAllDuePayments: (params = {}) => api.get("/fees/all-due", { params }),

  getPaymentById: (id) => api.get(`/fees/${id}`),
  updatePayment: (id, payload) => api.put(`/fees/${id}`, payload),
  deletePayment: (id, reason) =>
    api.delete(`/fees/${id}`, { data: { reason } }),

  recordPayment: (feeData) => api.post("/fees/recordPayment", feeData),
  bulkPayment: (paymentData) => api.post("/fees/bulk-payment", paymentData),

  generateReceipt: (id) => api.get(`/fees/${id}/receipt`),

  sendDueReminder: (studentId) =>
    api.post(`/fees/send-due-reminder/${studentId}`),
  sendOverdueAlert: (studentId) =>
    api.post(`/fees/send-overdue-alert/${studentId}`),
  resendPaymentConfirmation: (feeId) =>
    api.post(`/fees/resend-payment-confirmation/${feeId}`),
  bulkSendReminders: (studentIds, type = "due") =>
    api.post("/fees/bulk-send-reminders", { studentIds, type }),
};

// ================== MESS API ==================
export const messAPI = {
  getDaily: (params = {}) => api.get("/mess/daily", { params }),
  mark: (data) => api.post("/mess/mark", data),
  bulkMark: (data) => api.post("/mess/bulk-mark", data),
  getCurrentMeal: () => api.get("/mess/current-meal"),

  getMessOff: (params = {}) => api.get("/mess/mess-off", { params }),
  createMessOff: (data) => api.post("/mess/mess-off", data),
  applyMessOff: (data) => api.post("/mess/mess-off", data),
  updateMessOff: (id, data) => api.put(`/mess/mess-off/${id}`, data),
  deleteMessOff: (id) => api.delete(`/mess/mess-off/${id}`),

  getGuests: (params = {}) => api.get("/mess/guests", { params }),
  addGuest: (data) => api.post("/mess/guests", data),
  deleteGuest: (id) => api.delete(`/mess/guests/${id}`),

  getDailySummary: (params = {}) =>
    api.get("/mess/report/daily-summary", { params }),
  getMonthlyReport: (params = {}) =>
    api.get("/mess/report/monthly", { params }),
  getStudentReport: (id, params = {}) =>
    api.get(`/mess/report/student/${id}`, { params }),

  getHistory: (params = {}) => api.get("/mess/history", { params }),

  getSettings: () => api.get("/mess/settings"),
  updateSettings: (data) => api.put("/mess/settings", data),

  autoMarkAbsent: (date, mealType) =>
    api.post("/mess/auto-mark", { date, mealType }),
};

// ================== MARKS API ==================
export const marksAPI = {
  getAll: (params = {}) => api.get("/marks", { params }),
  getById: (id) => api.get(`/marks/${id}`),
  create: (marksData) => api.post("/marks", marksData),
  update: (id, marksData) => api.put(`/marks/${id}`, marksData),
  delete: (id) => api.delete(`/marks/${id}`),

  bulkCreate: (marksArray) => api.post("/marks/bulk", marksArray),
  getByStudent: (sid, params = {}) =>
    api.get(`/marks/student/${sid}`, { params }),
  getByExam: (eid, params = {}) => api.get(`/marks/exam/${eid}`, { params }),

  getMarksReport: (params = {}) => api.get("/marks/report", { params }),
  getSubjects: () => api.get("/marks/subjects"),
  getExamTypes: () => api.get("/marks/exam-types"),

  getSettings: () => api.get("/marks/settings"),
  updateSettings: (data) => api.put("/marks/settings", data),
  resetSettings: () => api.post("/marks/settings/reset"),
};

// ================== EXPENSES API ==================
export const expensesAPI = {
  getAll: (params) => api.get("/expenses", { params }),
  create: (data) =>
    api.post("/expenses", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  delete: (id) => api.delete(`/expenses/${id}`),
  getById: (id) => api.get(`/expenses/${id}`),
  update: (id, formData) =>
    api.put(`/expenses/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  uploadReceipts: (id, formData) =>
    api.post(`/expenses/${id}/receipts`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getSummary: () => api.get("/expenses/summary"),
  getDailyReport: (params) =>
    api.get("/expenses/reports/daily", {
      params,
      responseType: params.format === "csv" ? "blob" : "json",
    }),
  getMonthlyReport: (params) =>
    api.get("/expenses/reports/monthly", { params }),
  getYearlyReport: (year) => api.get(`/expenses/reports/yearly/${year}`),
  getAuditLogs: () => api.get("/expenses/audit"),
};

// ================== DASHBOARD API ==================
export const dashboardAPI = {
  getStats: () => api.get("/dashboard/stats"),
  getRecentActivities: () => api.get("/dashboard/recent-activities"),
  getUpcomingEvents: () => api.get("/dashboard/upcoming-events"),
  getPendingTasks: () => api.get("/dashboard/pending-tasks"),
  getFinancialSummary: () => api.get("/dashboard/financial-summary"),
  getAttendanceSummary: () => api.get("/dashboard/attendance-summary"),
  getMarksSummary: () => api.get("/dashboard/marks-summary"),
  getBirthdayReminders: () => api.get("/dashboard/birthday-reminders"),
};

// ================== STUDENT BANK API ==================
export const studentBankAPI = {
  createAccount: (studentId) => api.post(`/student-bank/create/${studentId}`),
  getAccount: (studentId) => api.get(`/student-bank/account/${studentId}`),
  getAllAccounts: (params = {}) =>
    api.get("/student-bank/accounts", { params }),

  // UPDATED: freeze/unfreeze with interceptor-based toasts
  freezeAccount: async (studentId, data) => {
    try {
      return await api.put(`/student-bank/freeze/${studentId}`, data);
    } catch (error) {
      console.error("❌ Freeze API Error:", {
        url: `/student-bank/freeze/${studentId}`,
        status: error.response?.status,
        message: error.response?.data?.message,
      });
      throw error;
    }
  },

  deposit: (data) => api.post("/student-bank/deposit", data),
  debit: (data) => api.post("/student-bank/debit", data),
  reverseTransaction: (transactionId, data) =>
    api.post(`/student-bank/reverse/${transactionId}`, data),

  getTransactions: (studentId, params = {}) =>
    api.get(`/student-bank/transactions/${studentId}`, { params }),
  getBalance: (studentId) => api.get(`/student-bank/balance/${studentId}`),
  getTransactionHistory: (studentId) =>
    api.get(`/student-bank/transactions/${studentId}/history`),

  getDailyReport: (params = {}) =>
    api.get("/student-bank/reports/daily", { params }),
  reconcileBalance: (studentId) =>
    api.post(`/student-bank/reconcile/${studentId}`),

  getAuditLogs: (params) => api.get("/student-bank/audit-logs", { params }),
  getStudentAuditLogs: (studentId) =>
    api.get(`/student-bank/audit-logs/student/${studentId}`),
  getAuditSummary: (params) =>
    api.get("/student-bank/audit-logs/summary", { params }),
};

// ================== HOSTEL ATTENDANCE API ==================
export const hostelAttendanceAPI = {
  getDaily: (params = {}) => api.get("/attendance", { params }),
  getStudentHistory: (sid, params = {}) =>
    api.get(`/attendance/student/${sid}`, { params }),
  getHistory: (params = {}) => api.get("/attendance/history", { params }),

  getStudentStatus: (sid, params = {}) =>
    api.get(`/attendance/student-status/${sid}`, { params }),
  getStudentState: (sid) => api.get(`/attendance/student-state/${sid}`),

  markAttendance: (payload) => api.post("/attendance/manual", payload),
  bulkMark: (payload) => api.post("/attendance/bulk", payload),
  biometricScan: (payload) => api.post("/attendance/biometric-scan", payload),

  getReconciliationList: (params = {}) =>
    api.get("/attendance/reconciliation", { params }),
  reconcile: (id, payload) => api.put(`/attendance/${id}/reconcile`, payload),
  bulkApprove: (data) =>
    api.put("/attendance/reconciliation/approve-all", data),

  checkLeave: (studentId, date) =>
    api.get(`/attendance/check-leave/${studentId}`, { params: { date } }),

  exportCSV: (params = {}) =>
    api.get("/attendance/export/csv", {
      params,
      responseType: "blob",
    }),
  getMonthlyReport: (params = {}) =>
    api.get("/attendance/report/monthly", { params }),
  getMonthlyDateWiseReport: (params) =>
    api.get("/attendance/report/monthly-date-wise", { params }),

  getAttendanceSettings: () => api.get("/attendance/settings"),
  updateAttendanceSettings: (data) => api.put("/attendance/settings", data),

  markDaily: (data) => api.post("/attendance/mark-daily", data),
  runMultiDayMark: (data) => api.post("/attendance/mark-multi-day", data),

  resetAllStudentStates: () => api.post("/attendance/reset-all-student-states"),
  checkStateConsistency: () => api.get("/attendance/check-state-consistency"),
  getCheckStates: (params) => api.get("/attendance/check-states", { params }),
};

// ================== LEAVE APPLICATIONS API ==================
export const leaveAPI = {
  getAll: (params = {}) => api.get("/leave-applications", { params }),
  getById: (id) => api.get(`/leave-applications/${id}`),
  create: (data) => api.post("/leave-applications", data),

  approve: (id, data = {}) =>
    api.put(`/leave-applications/${id}/approve`, data),
  reject: (id, data = {}) => api.put(`/leave-applications/${id}/reject`, data),
  cancel: (id, data = {}) => api.put(`/leave-applications/${id}/cancel`, data),

  earlyReturn: (id, data = {}) =>
    api.put(`/leave-applications/${id}/early-return`, data),

  delete: (id) => api.delete(`/leave-applications/${id}`),

  getStats: (params = {}) => api.get("/leave-applications/stats", { params }),
};

// ================== REPORTS API ==================
export const reportsAPI = {
  getOverview: () => api.get("/reports/overview"),

  getStudentReport: (studentId) => api.get(`/reports/student/${studentId}`),
  getStudentsList: (params) => api.get("/students", { params }),

  getAttendanceMonthly: (params) =>
    api.get("/reports/attendance/monthly", { params }),
  getAttendanceYearly: (params) =>
    api.get("/reports/attendance/yearly", { params }),
  getAttendanceSummary: (params) =>
    api.get("/reports/attendance/summary", { params }),

  getFeeCollection: (params) => api.get("/reports/fees/collection", { params }),
  getFeeDue: (params) => api.get("/reports/fees/due", { params }),
  getFeeOverdue: (params) => api.get("/reports/fees/overdue", { params }),

  getMessConsumption: (params) =>
    api.get("/reports/mess/consumption", { params }),
  getMessMonthly: (params) => api.get("/reports/mess/monthly", { params }),

  getMarksReport: (params) => api.get("/reports/marks/summary", { params }),
  getMarksBySubject: (params) => api.get("/reports/marks/subject", { params }),

  exportReport: (type, params) =>
    api.get(`/reports/export/${type}`, {
      params,
      responseType: "blob",
    }),

  getExpensesReport: (params = {}) =>
    api.get("/reports/expenses", { params }).then((res) => res.data),
  getExpensesSummary: (params = {}) =>
    api.get("/reports/expenses/summary", { params }).then((res) => res.data),
  getExpensesByCategory: (params = {}) =>
    api.get("/reports/expenses/category", { params }).then((res) => res.data),
  getExpensesMonthly: (params = {}) =>
    api.get("/reports/expenses/monthly", { params }).then((res) => res.data),
  getExpensesByVendor: (params = {}) =>
    api.get("/reports/expenses/vendor", { params }).then((res) => res.data),
};

// ================== ANALYTICS API ==================
export const analyticsAPI = {
  getOverview: () => api.get("/analytics/overview"),
  getBankAnalytics: (filters = {}) => {
    console.log("🏦 API Call: getBankAnalytics with filters:", filters);
    return api
      .get("/analytics/bank", {
        params: filters,
        timeout: 10000,
      })
      .catch((error) => {
        console.error("🏦 API Error in getBankAnalytics:", error);
        return { data: { data: { accounts: [], summary: {} } } };
      });
  },

  getAttendanceMonthly: (params = {}) =>
    api.get("/analytics/attendance/monthly", { params }),
  getFeesCollection: (params = {}) =>
    api.get("/analytics/fees/collection", { params }),
  getMarksSummary: (params = {}) =>
    api.get("/analytics/marks/summary", { params }),
  getMessMonthly: (params = {}) =>
    api.get("/analytics/mess/monthly", { params }),

  getTrends: (params = {}) => api.get("/analytics/trends", { params }),

  exportAnalytics: (type, params) =>
    api.get(`/analytics/export/${type}`, {
      params,
      responseType: "blob",
    }),
};

// ================== SUMMARY API ==================
export const summaryAPI = {
  getDaily: (params = {}) => api.get("/summary/daily", { params }),
  buildDaily: (date) => api.post("/summary/daily", null, { params: { date } }),

  getStudentSummary: (sid, params = {}) =>
    api.get(`/summary/student/${sid}`, { params }),

  rebuildRange: (payload) => api.post("/summary/rebuild", payload),
};

// ================== PARENT API ==================
export const parentAPI = {
  requestOTP: (phone) => api.post("/parent/request-otp", { phone }),
  verifyOTP: (phone, otp) => api.post("/parent/verify-otp", { phone, otp }),
  logout: () => api.post("/parent/logout"),

  getDashboard: () => api.get("/parent/dashboard"),
  getChildDetails: (studentId) => api.get(`/parent/child/${studentId}`),

  getChildFees: (studentId, params = {}) =>
    api.get(`/parent/child/${studentId}/fees`, { params }),
  getChildAttendance: (studentId, params = {}) =>
    api.get(`/parent/child/${studentId}/attendance`, { params }),
  getChildGateEntries: (studentId, params = {}) =>
    api.get(`/parent/child/${studentId}/gate-entries`, { params }),
  getChildMessAttendance: (studentId, params = {}) =>
    api.get(`/parent/child/${studentId}/mess-attendance`, { params }),
  getChildBank: (studentId, params = {}) =>
    api.get(`/parent/child/${studentId}/bank`, { params }),
  getChildMarks: (studentId, params = {}) =>
    api.get(`/parent/child/${studentId}/marks`, { params }),
};

// ================== NOTIFICATION API ==================
export const notificationAPI = {
  sendFeeReminder: (data) => api.post("/notifications/send-fee-reminder", data),
  getHistory: (params = {}) => api.get("/notifications/history", { params }),
};

// ================== EMPLOYEE API ==================
export const employeesAPI = {
  getAll: (params = {}) => api.get("/employees", { params }),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) =>
    api.post("/employees", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id, data) =>
    api.put(`/employees/${id}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  delete: (id) => api.delete(`/employees/${id}`),

  uploadDocuments: (id, formData) =>
    api.post(`/employees/${id}/documents`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  paySalary: (id, paymentData) =>
    api.post(`/employees/${id}/pay-salary`, paymentData),
};

// ================== EMPLOYEE ATTENDANCE API ==================
export const employeeAttendanceAPI = {
  getDaily: (params = {}) => api.get("/employee-attendance/daily", { params }),
  markAttendance: (data) => api.post("/employee-attendance/mark", data),
  bulkMark: (data) => api.post("/employee-attendance/bulk", data),

  getRecordsByEmployee: (employeeId, params = {}) =>
    api.get(`/employee-attendance/employee/${employeeId}`, { params }),
  getHistory: (params = {}) =>
    api.get("/employee-attendance/history", { params }),

  getReport: (data) => api.post("/employee-attendance/report", data),

  getUnreconciled: (params = {}) =>
    api.get("/employee-attendance/unreconciled", { params }),
  reconcile: (id, data) =>
    api.put(`/employee-attendance/reconcile/${id}`, data),

  getSettings: () => api.get("/employee-attendance/settings"),
  updateSettings: (data) => api.put("/employee-attendance/settings", data),

  autoMarkAbsent: (data) => api.post("/employee-attendance/auto-mark", data),

  getSummary: (params = {}) =>
    api.get("/employee-attendance/summary", { params }),

  deleteRecord: (id) => api.delete(`/employee-attendance/${id}`),
};

// ================== EMPLOYEE SALARY API ==================
export const employeeSalaryAPI = {
  calculate: (data) => api.post("/employee-salary/calculate", data),
  bulkCalculate: (data) => api.post("/employee-salary/bulk-calculate", data),

  getEmployeeHistory: (id, params = {}) =>
    api.get(`/employee-salary/employee/${id}`, { params }),
  getPending: (params = {}) => api.get("/employee-salary/pending", { params }),
  getMonthlyPayroll: (month, params = {}) =>
    api.get(`/employee-salary/month/${month}`, { params }),
  getById: (id) => api.get(`/employee-salary/${id}`),

  pay: (id, data) =>
    api.post(`/employee-salary/pay/${id}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  bulkPay: (data) => api.post("/employee-salary/bulk-pay", data),

  getSlip: (id) =>
    api.get(`/employee-salary/slip/${id}`, {
      responseType: "blob",
      headers: {
        'Accept': 'application/pdf'
      }
    }),

  addBonus: (id, data) => api.put(`/employee-salary/${id}/bonus`, data),
  addDeduction: (id, data) => api.put(`/employee-salary/${id}/deduction`, data),

  edit: (id, data) => api.put(`/employee-salary/${id}/edit`, data),

  updateExpenseLink: (id, data) =>
    api.put(`/employee-salary/${id}/expense-link`, data),

  getEditHistory: (id) => api.get(`/employee-salary/${id}/edit-history`),

  delete: (id) => api.delete(`/employee-salary/${id}`),

  exportCSV: (params = {}) =>
    api.get("/employee-salary/export/csv", {
      params,
      responseType: "blob",
    }),
};

// ================== EMPLOYEE LEAVE API ==================
export const employeeLeaveAPI = {
  apply: (data) => api.post("/employee-leave/apply", data),
  getAll: (params = {}) => api.get("/employee-leave", { params }),
  getById: (id) => api.get(`/employee-leave/${id}`),
  getByEmployee: (employeeId, params = {}) =>
    api.get(`/employee-leave/employee/${employeeId}`, { params }),

  approve: (id, data = {}) => api.put(`/employee-leave/${id}/approve`, data),
  reject: (id, data = {}) => api.put(`/employee-leave/${id}/reject`, data),
  cancel: (id, data = {}) => api.put(`/employee-leave/${id}/cancel`, data),

  earlyReturn: (id, data = {}) =>
    api.post(`/employee-leave/${id}/early-return`, data),

  getBalance: (employeeId) => api.get(`/employee-leave/balance/${employeeId}`),

  getStats: (params = {}) => api.get("/employee-leave/stats", { params }),

  delete: (id) => api.delete(`/employee-leave/${id}`),
};

// ================== EXPORT DEFAULT ==================
export default api;
