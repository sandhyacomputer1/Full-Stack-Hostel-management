import React, { useState, useMemo } from "react";
import {
  Calendar,
  User,
  TrendingUp,
  Download,
  Filter,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Users,
  Clock,
  Search,
  LogOut,
  LogIn,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FileText,
  Activity,
  Building,
  UserCheck,
} from "lucide-react";
import LoadingSpinner from "../UI/LoadingSpinner";

// ✅ Import hooks
import {
  useMonthlyDateWiseReport,
  useYearlyReport,
  useStudentHistory,
  useStudentSearch,
} from "../../hooks/Attendance/useAttendanceReports";

const ReportsTab = () => {
  const [reportType, setReportType] = useState("monthly");

  return (
    <div className="space-y-8">
      {/* Professional Report Type Selector */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100">
            <FileText className="h-5 w-5 text-blue-700" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Report Type</h3>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setReportType("monthly")}
            className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
              reportType === "monthly"
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl"
                : "bg-white border-2 border-gray-300 text-gray-600 hover:bg-gray-50 shadow-sm hover:shadow-md"
            }`}
          >
            <Calendar className="h-4 w-4" />
            Monthly Report
          </button>
          <button
            onClick={() => setReportType("yearly")}
            className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
              reportType === "yearly"
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl"
                : "bg-white border-2 border-gray-300 text-gray-600 hover:bg-gray-50 shadow-sm hover:shadow-md"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Yearly Report
          </button>
          <button
            onClick={() => setReportType("student")}
            className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
              reportType === "student"
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl"
                : "bg-white border-2 border-gray-300 text-gray-600 hover:bg-gray-50 shadow-sm hover:shadow-md"
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Student Report
          </button>
        </div>
      </div>

      {/* Conditional Rendering */}
      {reportType === "monthly" && <MonthlyReportSection />}
      {reportType === "yearly" && <YearlyReportSection />}
      {reportType === "student" && <StudentReportSection />}
    </div>
  );
};

// ============================================
// MONTHLY REPORT SECTION
// ============================================
const MonthlyReportSection = () => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [block, setBlock] = useState("");

  const { data, isLoading, error, refetch } = useMonthlyDateWiseReport(
    month,
    block
  );

  // API shape: { success, month, startDate, endDate, data: [ { date, students: [...] } ] }
  const dateWiseData = data?.data || [];

  const handleExport = () => {
    if (!dateWiseData.length) return;

    const headers = [
      "Date",
      "Weekday",
      "Student Id",
      "Student Name",
      "Batch",
      "Status",
    ];

    const rows = [];

    dateWiseData.forEach((day) => {
      const dateObj = new Date(day.date);
      const dateStr = dateObj.toLocaleDateString("en-IN");
      const weekday = dateObj.toLocaleDateString("en-IN", {
        weekday: "long",
      });

      day.students.forEach((s) => {
        rows.push([
          dateStr,
          weekday,
          s.studentId, // business student id
          s.studentName,
          s.batch || "", // batch instead of admissionYear
          s.status,
        ]);
      });
    });

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monthly_datewise_${month}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Professional Filters */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100">
            <Filter className="h-5 w-5 text-blue-700" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Filters & Actions</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Month
            </label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              max={currentMonth}
            />
          </div>

          <div className="flex flex-col">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Building className="h-4 w-4 inline mr-1" />
              Block
            </label>
            <select
              value={block}
              onChange={(e) => setBlock(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            >
              <option value="">All Blocks</option>
              <option value="A">Block A</option>
              <option value="B">Block B</option>
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <div className="flex flex-col justify-end">
            <button
              onClick={handleExport}
              disabled={!dateWiseData.length}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-blue-600 bg-white border-2 border-blue-300 rounded-xl hover:bg-blue-50 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Professional Error */}
      {error && (
        <div className="bg-white rounded-2xl shadow-2xl border border-red-200 p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-200">
              <BarChart3 className="h-5 w-5 text-blue-700" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              Monthly Date-wise Report
            </h3>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : !dateWiseData.length ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mb-3" />
              <h3 className="text-sm font-medium text-gray-900">
                No data available
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Select a month and block to generate report
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Student Id
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Student Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Batch
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dateWiseData.map((day) => {
                  const dateObj = new Date(day.date);
                  const formattedDate = dateObj.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                  const weekday = dateObj.toLocaleDateString("en-US", {
                    weekday: "short",
                  });

                  return (
                    <React.Fragment key={day.date}>
                      {/* Date header row */}
                      <tr className="bg-blue-50">
                        <td
                          colSpan={4}
                          className="px-6 py-3 text-sm font-semibold text-gray-700"
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            {formattedDate} · {weekday}
                          </div>
                        </td>
                      </tr>

                      {/* Student rows */}
                      {day.students.map((s) => (
                        <tr
                          key={`${day.date}-${s.studentId}`}
                          className="hover:bg-blue-50 transition-colors"
                        >
                          <td className="px-6 py-4 text-sm font-mono text-gray-900">
                            {s.studentId}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              {s.studentName}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {s.batch || "—" }
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                s.status === "present"
                                  ? "bg-green-100 text-green-800"
                                  : s.status === "leave"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {s.status === "present" ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Present
                                </>
                              ) : s.status === "leave" ? (
                                <>
                                  <Calendar className="h-3 w-3 mr-1" />
                                  Leave
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Absent
                                </>
                              )}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// DATE-WISE VIEW (WITH REACT QUERY)
// ============================================
const DateWiseAttendanceView = ({ studentId, studentName, month }) => {
  const [year, monthNum] = month.split("-");
  const startDate = `${year}-${monthNum}-01`;
  const endDate = new Date(year, monthNum, 0).toISOString().slice(0, 10);

  // ✅ Use React Query hook
  const { data, isLoading, error } = useStudentHistory(
    studentId,
    startDate,
    endDate
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="sm" />
        <span className="ml-2 text-sm text-gray-600">
          Loading date-wise data...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-sm text-red-500">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-400 mb-2" />
        <p>Error: {error.message}</p>
      </div>
    );
  }

  const groupedByDate = data?.groupedByDate || {};

  if (Object.keys(groupedByDate).length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        <Calendar className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p>No detailed attendance records found</p>
      </div>
    );
  }

  const sortedDates = Object.keys(groupedByDate).sort().reverse();

  return (
    <div className="px-6 py-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
        <Calendar className="h-4 w-4 mr-2" />
        Date-wise Attendance for {studentName}
      </h4>
      <div className="max-h-96 overflow-y-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                Date
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                Day
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-700">
                Type
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-700">
                Time
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-700">
                Shift
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                Source
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedDates.map((date) => {
              const dateRecords = groupedByDate[date];
              const dateObj = new Date(date);
              const dayName = dateObj.toLocaleDateString("en-US", {
                weekday: "short",
              });
              const formattedDate = dateObj.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });

              return (
                <React.Fragment key={date}>
                  {dateRecords.map((record, idx) => (
                    <tr
                      key={record._id || idx}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {idx === 0 && (
                        <>
                          <td
                            className="px-4 py-2 text-sm font-medium text-gray-900"
                            rowSpan={dateRecords.length}
                          >
                            {formattedDate}
                          </td>
                          <td
                            className="px-4 py-2 text-sm text-gray-600"
                            rowSpan={dateRecords.length}
                          >
                            {dayName}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-2 text-center">
                        <span
                          className={`badge ${
                            record.type === "IN"
                              ? "badge-success"
                              : "badge-danger"
                          }`}
                        >
                          {record.type === "IN" ? (
                            <LogIn className="h-3 w-3 inline mr-1" />
                          ) : (
                            <LogOut className="h-3 w-3 inline mr-1" />
                          )}
                          {record.type}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center text-sm text-gray-700">
                        <div className="flex items-center justify-center">
                          <Clock className="h-3 w-3 mr-1 text-gray-400" />
                          {record.timestamp
                            ? new Date(record.timestamp).toLocaleTimeString(
                                "en-IN",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "—"}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center text-sm capitalize text-gray-700">
                        {record.shift || "—"}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        <span className="inline-flex items-center">
                          {record.source || "manual"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            record.status === "present"
                              ? "bg-green-100 text-green-800"
                              : record.status === "on_leave"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {record.status || "present"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================
// YEARLY REPORT SECTION (OPTIMIZED)
// ============================================
const YearlyReportSection = () => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [block, setBlock] = useState("");
  const [month, setMonth] = useState(""); // Filter by specific month if needed

  // ✅ Use optimized yearly report hook
  const {
    data: dateWiseData,
    stats,
    isLoading,
    isError,
    errors,
  } = useYearlyReport(year, month, block);

  return (
    <div className="space-y-8">
      {/* Professional Filters */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100">
            <Filter className="h-5 w-5 text-blue-700" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Filters & Actions</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Year
            </label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            >
              {Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Month (Optional)
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            >
              <option value="">All Months</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString("en-US", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Building className="h-4 w-4 inline mr-1" />
              Block
            </label>
            <select
              value={block}
              onChange={(e) => setBlock(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            >
              <option value="">All Blocks</option>
              <option value="A">Block A</option>
              <option value="B">Block B</option>
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <button
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Loading..." : "Auto-Loading"}
            </button>
          </div>
        </div>
      </div>

      {/* Professional Error Alert */}
      {isError && errors.length > 0 && (
        <div className="bg-white rounded-2xl shadow-2xl border border-red-200 p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800">Error Loading Some Months</h3>
              {errors.map((err, idx) => (
                <p key={idx} className="text-sm text-red-700 mt-1">
                  {err.message}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Professional Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Dates</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalDates}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-100">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalStudents}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Present</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.totalPresent}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Absent</p>
              <p className="text-2xl font-bold text-red-600">{stats.totalAbsent}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100">
              <Activity className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Attendance</p>
              <p className="text-2xl font-bold text-amber-600">
                {stats.averageAttendance}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Date-wise Report */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-200">
              <BarChart3 className="h-5 w-5 text-blue-700" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              Date-wise Attendance Report
            </h3>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-sm text-gray-600">
              Loading {month ? "1 month" : "year"} data...
            </span>
          </div>
        ) : dateWiseData.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center">
              <Calendar className="h-12 w-12 text-gray-400 mb-3" />
              <h3 className="text-sm font-medium text-gray-900">
                No data available
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Select year and generate report
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {dateWiseData.map((dateRecord) => (
              <div key={dateRecord.date} className="p-6">
                {/* Professional Date Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-blue-100">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">
                        {new Date(dateRecord.date).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {dateRecord.students.length} student records
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      Present:{" "}
                      <span className="font-bold text-green-600">
                        {
                          dateRecord.students.filter(
                            (s) => s.status === "present"
                          ).length
                        }
                      </span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Absent:{" "}
                      <span className="font-bold text-red-600">
                        {
                          dateRecord.students.filter(
                            (s) => s.status === "absent"
                          ).length
                        }
                      </span>
                    </p>
                  </div>
                </div>

                {/* ✅ Students List for this Date */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          #
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Student ID
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Student Name
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Roll Number
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Batch
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dateRecord.students.map((student, index) => {
                        // ✅ Create unique key
                        const uniqueKey = `${dateRecord.date}-${
                          student.studentId || student.rollNumber || index
                        }`;

                        return (
                          <tr key={uniqueKey} className="hover:bg-blue-50 transition-colors">
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {index + 1}
                            </td>
                            <td className="px-6 py-4 text-sm font-mono text-gray-900">
                              {student.studentId || "—"}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-900">
                                  {student.studentName || student.name || "—"}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                              {student.rollNumber || "—"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {student.batch || "—"}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {student.status === "present" ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Present
                                </span>
                              ) : student.status === "leave" ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  Leave
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Absent
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// STUDENT REPORT SECTION
// ============================================
const StudentReportSection = () => {
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));

  // ✅ Use mutation for search
  const searchMutation = useStudentSearch();

  // ✅ Use query for student history
  const {
    data: historyData,
    isLoading: historyLoading,
    error: historyError,
  } = useStudentHistory(selectedStudent?._id, fromDate, toDate);

  const records = historyData?.records || [];
  const summary = historyData?.summary || null;
  const groupedByDate = historyData?.groupedByDate || {};

  const handleSearchStudents = () => {
    if (!studentSearch.trim()) return;
    searchMutation.mutate(studentSearch);
  };

  const exportToCSV = () => {
    if (!selectedStudent || records.length === 0) return;

    const headers = ["Date", "Day", "Type", "Time", "Shift", "Source", "Notes"];

    const rows = records.map((r) => {
      let dateStr = "";
      let dayStr = "";
      if (r.date) {
        const dateObj = new Date(r.date);
        dateStr = dateObj.toLocaleDateString("en-US");
        dayStr = dateObj.toLocaleDateString("en-US", { weekday: "short" });
      }

      let timeStr = "";
      if (r.timestamp) {
        const timeObj = new Date(r.timestamp);
        timeStr = timeObj.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });
      }

      return [
        dateStr,
        dayStr,
        r.type || "",
        timeStr,
        r.shift || "",
        r.source || "manual",
        (r.notes || "").replace(/,/g, " "),
      ];
    });

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
      "\n"
    );

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedStudent.name.replace(
      / /g,
      "_"
    )}_attendance_${fromDate}_to_${toDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Professional Search Section */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100">
            <UserCheck className="h-5 w-5 text-blue-700" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Search & Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Search className="h-4 w-4 inline mr-1" />
              Search Student
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter name or roll number..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") handleSearchStudents();
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
              <button
                onClick={handleSearchStudents}
                disabled={searchMutation.isPending || !studentSearch.trim()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {searchMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Search Results */}
            {searchMutation.isError && (
              <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4" />
                {searchMutation.error.message}
              </div>
            )}
            {searchMutation.isSuccess && searchMutation.data.length > 0 && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                ✓ Found {searchMutation.data.length} student(s)
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <User className="h-4 w-4 inline mr-1" />
              Select Student
            </label>
            <select
              value={selectedStudent?._id || ""}
              onChange={(e) => {
                const student = searchMutation.data?.find(
                  (s) => s._id === e.target.value
                );
                setSelectedStudent(student);
              }}
              disabled={!searchMutation.data || searchMutation.data.length === 0}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all disabled:bg-gray-100"
            >
              <option value="">
                {!searchMutation.data ? "Search first..." : "Select student..."}
              </option>
              {searchMutation.data?.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.rollNumber}) - Block {s.block}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>
        </div>
      </div>

      {/* Professional Action Buttons */}
      {selectedStudent && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-100">
              <Download className="h-5 w-5 text-blue-700" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Actions</h3>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={exportToCSV}
              disabled={records.length === 0}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-blue-600 bg-white border-2 border-blue-300 rounded-xl hover:bg-blue-50 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      )}

      {/* Professional Summary Cards */}
      {selectedStudent && summary && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-100">
              <Activity className="h-5 w-5 text-blue-700" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Summary Statistics</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-100">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Entries</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summary.totalEntries || 0}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-100">
                  <LogIn className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">IN Entries</p>
                  <p className="text-2xl font-bold text-green-600">
                    {summary.totalInEntries || 0}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-red-100">
                  <LogOut className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">OUT Entries</p>
                  <p className="text-2xl font-bold text-red-600">
                    {summary.totalOutEntries || 0}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-100">
                  <Calendar className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Days with Activity</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {summary.daysWithActivity || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Professional History Table */}
      {selectedStudent && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-200">
                <FileText className="h-5 w-5 text-blue-700" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                {selectedStudent.name}'s Attendance History
                {records.length > 0 &&
                  ` (${records.length} ${
                    records.length === 1 ? "entry" : "entries"
                  })`}
              </h3>
            </div>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : historyError ? (
            <div className="text-center py-12">
              <div className="flex flex-col items-center">
                <AlertTriangle className="h-12 w-12 text-red-400 mb-3" />
                <h3 className="text-sm font-medium text-red-900">
                  Error Loading Data
                </h3>
                <p className="text-sm text-red-500 mt-1">
                  {historyError.message}
                </p>
              </div>
            </div>
          ) : records.length > 0 ? (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">#</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Shift</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Source</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.keys(groupedByDate)
                    .sort()
                    .reverse()
                    .map((date) => {
                      const dateRecords = groupedByDate[date];
                      const dateObj = new Date(date);

                      return (
                        <React.Fragment key={date}>
                          <tr className="bg-blue-50">
                            <td
                              colSpan="7"
                              className="px-6 py-3 text-sm font-semibold text-gray-700"
                            >
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-blue-600" />
                                {dateObj.toLocaleDateString("en-US", {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </div>
                            </td>
                          </tr>
                          {dateRecords.map((record, index) => (
                            <tr
                              key={record._id}
                              className="hover:bg-blue-50 transition-colors"
                            >
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {index + 1}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {record.date}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                    record.type === "IN"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {record.type === "IN" ? (
                                    <>
                                      <LogIn className="h-3 w-3 mr-1" />
                                      IN
                                    </>
                                  ) : (
                                    <>
                                      <LogOut className="h-3 w-3 mr-1" />
                                      OUT
                                    </>
                                  )}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                  <Clock className="h-4 w-4 text-gray-400" />
                                  {record.timestamp
                                    ? new Date(
                                        record.timestamp
                                      ).toLocaleTimeString("en-IN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "—"}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                                {record.shift || "—"}
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
                                  {record.source || "manual"}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {record.notes || "—"}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No records found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                No attendance records for selected date range
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!selectedStudent && !searchMutation.data && (
        <div className="text-center py-12 bg-white rounded-lg border">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Select a student
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Search and select a student to view their attendance report
          </p>
        </div>
      )}
    </div>
  );
};

export default ReportsTab;
