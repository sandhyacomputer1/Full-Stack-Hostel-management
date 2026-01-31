// src/components/Mess/ReportsTab.jsx
import React, { useState, useMemo } from "react";
import {
  Calendar,
  Download,
  FileText,
  BarChart3,
  Users,
  CheckCircle,
  XCircle,
  Coffee,
  Soup,
  Moon,
} from "lucide-react";
import { useMessSettings } from "../../contexts/MessSettingsContext";
import { messAPI, studentsAPI } from "../../services/api";
import LoadingSpinner from "../UI/LoadingSpinner";
import Swal from "sweetalert2";

// Meal icon helper
const getMealIcon = (meal) => {
  const icons = {
    breakfast: Coffee,
    lunch: Soup,
    dinner: Moon,
  };
  const Icon = icons[meal] || FileText;
  return <Icon className="h-4 w-4" />;
};

const ReportsTab = () => {
  const [activeReport, setActiveReport] = useState("daily");

  const reportTypes = [
    {
      id: "daily",
      name: "Daily Summary",
      icon: Calendar,
      description: "Per-student attendance for a specific date & meal",
    },
    {
      id: "monthly",
      name: "Monthly Report",
      icon: BarChart3,
      description: "Student-wise meal consumption for a month",
    },
    {
      id: "student",
      name: "Student Report",
      icon: Users,
      description: "Individual student mess history and statistics",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Report Type Selection */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 transition-all hover:shadow-xl">
        <h3 className="text-lg font-bold text-gray-900 mb-5">
          Select Report Type
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            const isActive = activeReport === report.id;
            return (
              <button
                key={report.id}
                onClick={() => setActiveReport(report.id)}
                className={`
                  p-5 border-2 rounded-xl text-left transition-all transform hover:scale-105
                  ${
                    isActive
                      ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-md hover:shadow-lg"
                      : "border-gray-200 bg-white hover:border-emerald-300 hover:shadow-md"
                  }
                `}
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-full transition-all ${
                    isActive ? "bg-emerald-100" : "bg-gray-100"
                  }`}>
                    <Icon
                      className={`h-6 w-6 transition-all ${
                        isActive ? "text-emerald-600" : "text-gray-400"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <h4
                      className={`font-bold text-base transition-all ${
                        isActive ? "text-emerald-900" : "text-gray-900"
                      }`}
                    >
                      {report.name}
                    </h4>
                    <p className={`text-sm mt-1 transition-all ${
                      isActive ? "text-emerald-700" : "text-gray-600"
                    }`}>
                      {report.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Report Content */}
      <div>
        {activeReport === "daily" && <DailySummarySection />}
        {activeReport === "monthly" && <MonthlyReportSection />}
        {activeReport === "student" && <StudentReportSection />}
      </div>
    </div>
  );
};

// ============================================
// DAILY SUMMARY – PER-STUDENT TABLE
// ============================================
const DailySummarySection = () => {
  const { getAvailableMeals } = useMessSettings();
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
  const [mealType, setMealType] = useState("breakfast");
  const [block, setBlock] = useState("");
  const [report, setReport] = useState(null); // { success,date,mealType,data,summary }
  const [loading, setLoading] = useState(false);

  const availableMeals = useMemo(
    () => getAvailableMeals(),
    [getAvailableMeals]
  );

  const loadSummary = async () => {
    try {
      setLoading(true);
      // backend /api/mess/daily expects date, mealType, block [web:1]
      const res = await messAPI.getDaily({
        date,
        mealType,
        block,
      });
      setReport(res.data);
    } catch (err) {
      console.error("Load daily report error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Failed to load daily report",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportDailyCSV = () => {
    if (!report || !report.data) return;

    const headers = [
      "Date",
      "MealType",
      "Student Name",
      "Student ID",
      "Roll Number",
      "Batch",
      "Block",
      "Plan Type",
      "Eligible",
      "On Leave",
      "Status",
      "Marked At",
      "Marked By",
    ];

    const rows = report.data.map((r) => [
      report.date,
      report.mealType,
      r.name,
      r.studentId,
      r.rollNumber,
      r.batch,
      r.block,
      r.planType || "",
      r.eligible ? "Yes" : "No",
      r.isOnLeave ? "Yes" : "No",
      r.status || "",
      r.markedAt
        ? new Date(r.markedAt).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
      r.markedBy || "",
    ]);

    const csv = [headers, ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily_report_${report.date}_${report.mealType}.csv`;
    a.click();

    Swal.fire({
      icon: "success",
      title: "Exported",
      text: "Daily report exported successfully",
      timer: 1500,
      showConfirmButton: false,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg transition-all hover:shadow-xl">
      <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-100 rounded-full p-2">
              <Calendar className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              Daily Summary (Per Student)
            </h3>
          </div>
          <button
            onClick={exportDailyCSV}
            disabled={!report || loading || !report.data?.length}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={today}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Meal Type
            </label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
            >
              {availableMeals.map((m) => (
                <option key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Block (optional)
            </label>
            <input
              type="text"
              value={block}
              onChange={(e) => setBlock(e.target.value)}
              placeholder="e.g., A / B"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={loadSummary}
              disabled={loading}
              className="w-full px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Loading...
                </>
              ) : (
                "Generate Report"
              )}
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <LoadingSpinner size="lg" />
          </div>
        ) : report && report.data ? (
          report.data.length > 0 ? (
            <div className="space-y-4">
              {/* Summary badges */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-md p-4 transition-all hover:shadow-lg hover:scale-105">
                  <p className="text-sm font-semibold text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {report.summary.total}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 shadow-md p-4 transition-all hover:shadow-lg hover:scale-105">
                  <p className="text-sm font-semibold text-blue-700">Eligible</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {report.summary.eligible}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200 shadow-md p-4 transition-all hover:shadow-lg hover:scale-105">
                  <p className="text-sm font-semibold text-emerald-700">Present</p>
                  <p className="text-2xl font-bold text-emerald-900">
                    {report.summary.present}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200 shadow-md p-4 transition-all hover:shadow-lg hover:scale-105">
                  <p className="text-sm font-semibold text-red-700">Absent</p>
                  <p className="text-2xl font-bold text-red-900">
                    {report.summary.absent}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200 shadow-md p-4 transition-all hover:shadow-lg hover:scale-105">
                  <p className="text-sm font-semibold text-amber-700">On Leave</p>
                  <p className="text-2xl font-bold text-amber-900">
                    {report.summary.onLeave}
                  </p>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-md">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">#</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Student Name</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Student ID</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Roll</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Batch</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Block</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Plan</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Marked Time</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Source</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {report.data.map((r, idx) => (
                      <tr key={r._id} className="transition-all hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-600">{idx + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{r.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                            {r.studentId}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                            {r.rollNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{r.batch}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{r.block}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-600 capitalize">
                          {r.planType || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {r.isOnLeave ? (
                            <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              On Leave
                            </span>
                          ) : r.status === "present" ? (
                            <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Present
                            </span>
                          ) : r.status === "absent" ? (
                            <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-200">
                              Absent
                            </span>
                          ) : r.status === "on_mess_off" ? (
                            <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              Mess-Off
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                              Not Marked
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-600">
                          {r.markedAt
                            ? new Date(r.markedAt).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-600">
                          {r.markedBy ? "manual" : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No Data
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                No students found for this filter.
              </p>
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No Report Generated
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Select filters and click "Generate Report".
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// MONTHLY REPORT – PER-STUDENT SUMMARY
// ============================================
const MonthlyReportSection = () => {
  const { getAvailableMeals } = useMessSettings();
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [month, setMonth] = useState(currentMonth);
  const [report, setReport] = useState(null); // array
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const availableMeals = useMemo(
    () => getAvailableMeals(),
    [getAvailableMeals]
  );

  const loadReport = async () => {
    try {
      setLoading(true);
      const res = await messAPI.getMonthlyReport({ month });
      setReport(res.data.report || []);
    } catch (err) {
      console.error("Load monthly report error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Failed to load report",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!report || report.length === 0) return;

    const headers = [
      "Student Name",
      "Student ID",
      "Roll Number",
      "Batch",
      "Plan Type",
      ...availableMeals.flatMap((m) => [
        `${m}-present`,
        `${m}-absent`,
        `${m}-total`,
      ]),
      "Guest Meals",
      "Guest Charges",
    ];

    const rows = report.map((s) => [
      s.studentName,
      s.studentId, // hostel ID now
      s.rollNumber,
      s.batch || "",
      s.planType,
      ...availableMeals.flatMap((meal) => [
        s.meals[meal].present,
        s.meals[meal].absent,
        s.meals[meal].total,
      ]),
      s.guestMeals,
      s.guestCharges,
    ]);

    const csv = [headers, ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monthly_report_${month}.csv`;
    a.click();

    Swal.fire({
      icon: "success",
      title: "Exported",
      text: `${report.length} student records exported`,
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const filteredReport = useMemo(() => {
    if (!report) return [];
    if (!searchTerm) return report;
    const search = searchTerm.toLowerCase();
    return report.filter(
      (s) =>
        s.studentName.toLowerCase().includes(search) ||
        s.rollNumber.toLowerCase().includes(search)
    );
  }, [report, searchTerm]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg transition-all hover:shadow-xl">
      <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-100 rounded-full p-2">
              <BarChart3 className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              Monthly Report
            </h3>
          </div>
          <button
            onClick={exportReport}
            disabled={!report || report.length === 0 || loading}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Month selection */}
        <div className="flex items-end gap-5">
          <div className="flex-1 max-w-xs">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Month
            </label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              max={currentMonth}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
            />
          </div>
          <button
            onClick={loadReport}
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Loading...
              </>
            ) : (
              "Generate Report"
            )}
          </button>
        </div>

        {/* Search */}
        {report && report.length > 0 && (
          <div className="max-w-md">
            <input
              type="text"
              placeholder="Search by name or roll number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
            />
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredReport.length > 0 ? (
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">#</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Student</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Student ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Roll</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Batch</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Plan</th>
                  {availableMeals.map((meal) => (
                    <th key={meal} className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                      <div className="flex items-center justify-center gap-1">
                        {getMealIcon(meal)}
                        <span className="capitalize">{meal}</span>
                      </div>
                      <div className="text-xs font-normal text-gray-500">
                        P / A / T
                      </div>
                    </th>
                  ))}
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Guest Meals</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Guest Charges</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredReport.map((s, index) => (
                  <tr key={`${s.studentId}-${index}`} className="transition-all hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-600">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-gray-900">{s.studentName}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">{s.studentId}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">{s.rollNumber}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{s.batch || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-600 capitalize">{s.planType}</td>
                    {availableMeals.map((meal) => (
                      <td key={meal} className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2 text-sm font-semibold">
                          <span className="text-green-600 font-semibold">
                            {s.meals[meal].present}
                          </span>
                          <span className="text-gray-400">/</span>
                          <span className="text-red-600 font-semibold">
                            {s.meals[meal].absent}
                          </span>
                          <span className="text-gray-400">/</span>
                          <span className="text-gray-800 font-semibold">
                            {s.meals[meal].total}
                          </span>
                        </div>
                      </td>
                    ))}
                    <td className="table-cell text-center">
                      {s.guestMeals || 0}
                    </td>
                    <td className="table-cell text-center">
                      {s.guestCharges || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : report ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No Students Found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm
                ? "Try adjusting your search term"
                : "No data available for this month"}
            </p>
          </div>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No Report Generated
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Select a month and click "Generate Report"
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// STUDENT REPORT – DETAILED RECORDS
// ============================================
const StudentReportSection = () => {
  const [studentId, setStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentOptions, setStudentOptions] = useState([]);
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState(null); // { student, records, summary, ... }
  const [loading, setLoading] = useState(false);

  const searchStudents = async () => {
    if (!studentSearch.trim()) return;

    try {
      const res = await studentsAPI.getAll({
        search: studentSearch,
        status: "active",
        limit: 20,
      });
      const list = res.data?.students || res.data?.data || res.data || [];
      setStudentOptions(list);
    } catch (err) {
      console.error("Search students error:", err);
    }
  };

  const loadReport = async () => {
    if (!studentId) {
      Swal.fire({
        icon: "warning",
        title: "Select Student",
        text: "Please select a student first",
      });
      return;
    }

    try {
      setLoading(true);
      const res = await messAPI.getStudentReport(studentId, {
        from: fromDate,
        to: toDate,
      });
      setReport(res.data);
    } catch (err) {
      console.error("Load student report error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Failed to load report",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!report || !report.records) return;

    const headers = [
      "Student Name",
      "Student ID",
      "Roll Number",
      "Batch",
      "Date",
      "Meal",
      "Status",
      "Time",
      "Source",
    ];

    const rows = report.records.map((r) => [
      report.student.name,
      report.student.studentId,
      report.student.rollNumber,
      report.student.batch || "N/A",
      r.date,
      r.mealType,
      r.status,
      r.timestamp
        ? new Date(r.timestamp).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
      r.source,
    ]);

    const csv = [headers, ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `student_report_${report.student.rollNumber}_${fromDate}_to_${toDate}.csv`;
    a.click();

    Swal.fire({
      icon: "success",
      title: "Exported",
      text: "Student report exported successfully",
      timer: 1500,
      showConfirmButton: false,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg transition-all hover:shadow-xl">
      <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-100 rounded-full p-2">
              <Users className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              Student Report
            </h3>
          </div>
          <button
            onClick={exportReport}
            disabled={!report || loading}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Student search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Search Student
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter name or roll number..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    searchStudents();
                  }
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
              />
              <button
                type="button"
                onClick={searchStudents}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
              >
                Search
              </button>
            </div>

            {studentOptions.length > 0 && (
              <div className="mt-3 border border-gray-200 rounded-xl max-h-48 overflow-y-auto shadow-md">
                {studentOptions.map((student) => (
                  <button
                    key={student._id}
                    type="button"
                    onClick={() => {
                      setStudentId(student._id);
                      setStudentSearch(
                        `${student.name} (${student.rollNumber})`
                      );
                      setStudentOptions([]);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 border-b border-gray-100 last:border-b-0 transition-all"
                  >
                    <div className="font-bold text-gray-900">
                      {student.name}
                    </div>
                    <div className="text-sm font-semibold text-gray-600">
                      {student.rollNumber} • Batch {student.batch || "N/A"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              max={toDate}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min={fromDate}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={loadReport}
              disabled={loading || !studentId}
              className="w-full px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Loading...
                </>
              ) : (
                "Generate Report"
              )}
            </button>
          </div>
        </div>

        {/* Report display */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <LoadingSpinner size="lg" />
          </div>
        ) : report ? (
          <div className="space-y-6">
            {/* Student info */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-md p-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div>
                  <p className="text-sm font-semibold text-gray-600">Student Name</p>
                  <p className="font-bold text-gray-900">
                    {report.student.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Student ID</p>
                  <p className="font-mono font-bold text-gray-900">
                    {report.student.studentId}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Roll Number</p>
                  <p className="font-mono font-bold text-gray-900">
                    {report.student.rollNumber}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Batch</p>
                  <p className="font-bold text-gray-900">
                    {report.student.batch || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Summary stats */}
            {report.summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-md p-5 transition-all hover:shadow-lg hover:scale-105">
                  <p className="text-sm font-semibold text-gray-600">Total Meals</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {report.summary.totalMeals}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200 shadow-md p-5 transition-all hover:shadow-lg hover:scale-105">
                  <p className="text-sm font-semibold text-emerald-700">Present</p>
                  <p className="text-2xl font-bold text-emerald-900">
                    {report.summary.present}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200 shadow-md p-5 transition-all hover:shadow-lg hover:scale-105">
                  <p className="text-sm font-semibold text-red-700">Absent</p>
                  <p className="text-2xl font-bold text-red-900">
                    {report.summary.absent}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200 shadow-md p-5 transition-all hover:shadow-lg hover:scale-105">
                  <p className="text-sm font-semibold text-amber-700">Mess-Off</p>
                  <p className="text-2xl font-bold text-amber-900">
                    {report.summary.onMessOff || 0}
                  </p>
                </div>
              </div>
            )}

            {/* Records table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Meal</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Time</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Source</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {report.records.map((record) => (
                      <tr key={record._id} className="transition-all hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{record.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-600 capitalize">
                          {record.mealType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {record.status === "present" ? (
                            <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Present
                            </span>
                          ) : record.status === "absent" ? (
                            <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-200">
                              Absent
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              {record.status.replace("_", " ")}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-600">
                          {record.timestamp
                            ? new Date(record.timestamp).toLocaleTimeString(
                                "en-IN",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-600 capitalize">
                          {record.source}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No Report Generated
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Search and select a student, then click "Generate Report".
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsTab;
