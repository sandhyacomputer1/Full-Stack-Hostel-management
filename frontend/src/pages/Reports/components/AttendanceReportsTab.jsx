// src/pages/Reports/components/AttendanceReportsTab.jsx
import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { reportsAPI } from "../../../services/api";
import {
    Calendar,
    Users,
    TrendingUp,
    Filter,
    Download,
    RefreshCw,
    CheckCircle,
    XCircle,
    Clock,
} from "lucide-react";
import LoadingSpinner from "../../../components/UI/LoadingSpinner";
import DateRangeFilter from "../../../components/Reports/DateRangeFilter";
import ReportTable from "../../../components/Reports/ReportTable";
import ExportButton from "../../../components/Reports/ExportButton";
import StatCard from "../../../components/Reports/StatCard";

const style = document.createElement("style");
style.textContent = `
    @keyframes slideInUp {
        from {
            opacity: 0;
            transform: translateY(26px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .animate-slide-in {
        animation: slideInUp 0.65s ease-out;
    }
`;
document.head.appendChild(style);

const AttendanceReportsTab = () => {
    const [reportType, setReportType] = useState("monthly"); // monthly, yearly, custom
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [summary, setSummary] = useState(null);
    const [visibleSections, setVisibleSections] = useState(new Set());
    const sectionRefs = useRef({});

    // Filters
    const [filters, setFilters] = useState({
        month: new Date().toISOString().slice(0, 7), // YYYY-MM
        year: new Date().getFullYear().toString(),
        startDate: "",
        endDate: "",
        class: "",
        block: "",
    });

    useEffect(() => {
        fetchReport();
    }, [reportType]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisibleSections((prev) => new Set([...prev, entry.target.dataset.section]));
                }
            },
            { threshold: 0.12 }
        );

        Object.keys(sectionRefs.current).forEach((sectionId) => {
            const el = sectionRefs.current[sectionId];
            if (el) observer.observe(el);
        });

        return () => {
            Object.keys(sectionRefs.current).forEach((sectionId) => {
                const el = sectionRefs.current[sectionId];
                if (el) observer.unobserve(el);
            });
            observer.disconnect();
        };
    }, [loading, reportData, summary, reportType]);

    const fetchReport = async () => {
        try {
            setLoading(true);

            let response;
            if (reportType === "monthly") {
                response = await reportsAPI.getAttendanceMonthly({
                    month: filters.month,
                    class: filters.class,
                    block: filters.block,
                });
            } else if (reportType === "yearly") {
                response = await reportsAPI.getAttendanceYearly({
                    year: filters.year,
                    class: filters.class,
                    block: filters.block,
                });
            } else {
                // Custom date range
                response = await reportsAPI.getAttendanceSummary({
                    startDate: filters.startDate,
                    endDate: filters.endDate,
                    class: filters.class,
                    block: filters.block,
                });
            }

            // ✅ FIX: Handle response structure correctly
            console.log("Attendance Report Response:", response); // Debug log

            if (response.data && response.data.success) {
                // Response is { success: true, data: { records: [...], summary: {...} } }
                const responseData = response.data.data || response.data;
                setReportData(responseData.records || []);
                setSummary(responseData.summary || null);
                toast.success("Report generated successfully");
            } else {
                // Fallback for different response structure
                setReportData(response.data.records || []);
                setSummary(response.data.summary || null);
                toast.success("Report generated successfully");
            }
        } catch (error) {
            console.error("Failed to fetch attendance report:", error);
            toast.error("Failed to generate report");
            setReportData([]);
            setSummary(null);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (format) => {
        try {
            const params = {
                type: reportType,
                format,
                ...filters,
            };

            const response = await reportsAPI.exportReport("attendance", params);

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute(
                "download",
                `attendance_report_${new Date().toISOString().split("T")[0]}.${format}`
            );
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            throw error;
        }
    };

    const handleExportCSV = () => {
        if (!reportData || reportData.length === 0) {
            toast.error("No data to export");
            return;
        }

        try {
            // Convert to CSV
            const headers = [
                "Student Name",
                "Student ID",
                "Roll No",
                "Class",
                "Block",
                "Present",
                "Absent",
                "Leave",
                "Total Days",
                "Attendance %",
            ];

            const rows = reportData.map((record) => [
                record.studentName || "",
                record.studentId || "",
                record.rollNumber || "",
                record.class || "",
                record.block || "",
                record.presentDays || 0,
                record.absentDays || 0,
                record.leaveDays || 0,
                record.totalDays || 0,
                record.attendanceRate || 0,
            ]);

            const csvContent = [
                headers.join(","),
                ...rows.map((row) =>
                    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
                ),
            ].join("\n");

            // Download
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute(
                "download",
                `attendance_${reportType}_${new Date().toISOString().split("T")[0]}.csv`
            );
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("Report exported successfully!");
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to export report");
        }
    };

    const columns = [
        {
            label: "Student Name",
            key: "studentName",
            render: (value, row) => (
                <div>
                    <div className="font-medium text-gray-900">{value}</div>
                    <div className="text-xs text-gray-500">{row.studentId}</div>
                </div>
            ),
        },
        {
            label: "Roll No",
            key: "rollNumber",
        },
        {
            label: "Class",
            key: "class",
        },
        {
            label: "Block",
            key: "block",
        },
        {
            label: "Present",
            key: "presentDays",
            render: (value) => (
                <span className="text-green-600 font-semibold">{value || 0}</span>
            ),
        },
        {
            label: "Absent",
            key: "absentDays",
            render: (value) => (
                <span className="text-red-600 font-semibold">{value || 0}</span>
            ),
        },
        {
            label: "Leave",
            key: "leaveDays",
            render: (value) => (
                <span className="text-yellow-600 font-semibold">{value || 0}</span>
            ),
        },
        {
            label: "Total Days",
            key: "totalDays",
            render: (value) => (
                <span className="font-semibold text-gray-900">{value || 0}</span>
            ),
        },
        {
            label: "Attendance %",
            key: "attendanceRate",
            render: (value) => (
                <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full ${value >= 75
                                ? "bg-green-600"
                                : value >= 60
                                    ? "bg-yellow-600"
                                    : "bg-red-600"
                                }`}
                            style={{ width: `${value}%` }}
                        />
                    </div>
                    <span
                        className={`text-sm font-bold ${value >= 75
                            ? "text-green-600"
                            : value >= 60
                                ? "text-yellow-600"
                                : "text-red-600"
                            }`}
                    >
                        {value}%
                    </span>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                        <div className="bg-indigo-600 rounded-full p-3 mr-3 shadow-lg">
                            <Calendar className="h-6 w-6 text-white" />
                        </div>
                        Attendance Reports
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        View and analyze student attendance records
                    </p>
                </div>

                {reportData && reportData.length > 0 && (
                    <div className="flex gap-2">
                        <button
                            onClick={fetchReport}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
                        >
                            <Download className="h-4 w-4" />
                            Export CSV
                        </button>
                    </div>
                )}
            </div>

            {/* Report Type Selector */}
            <div
                ref={(el) => (sectionRefs.current["filters"] = el)}
                data-section="filters"
                className={`bg-white rounded-xl border border-gray-200 shadow-lg p-5 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${visibleSections.has("filters") ? "animate-slide-in" : ""}`}
            >
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-5 w-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Report Type & Filters</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    {/* Report Type */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Report Type
                        </label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="monthly">Monthly Report</option>
                            <option value="yearly">Yearly Report</option>
                            <option value="custom">Custom Date Range</option>
                        </select>
                    </div>

                    {/* Month Selector (for monthly) */}
                    {reportType === "monthly" && (
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Month
                            </label>
                            <input
                                type="month"
                                value={filters.month}
                                onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    )}

                    {/* Year Selector (for yearly) */}
                    {reportType === "yearly" && (
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Year
                            </label>
                            <input
                                type="number"
                                value={filters.year}
                                onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                                min="2020"
                                max="2030"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    )}

                    {/* Date Range (for custom) */}
                    {reportType === "custom" && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={filters.startDate}
                                    onChange={(e) =>
                                        setFilters({ ...filters, startDate: e.target.value })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={filters.endDate}
                                    onChange={(e) =>
                                        setFilters({ ...filters, endDate: e.target.value })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </>
                    )}

                    {/* Class Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Class (Optional)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., 10"
                            value={filters.class}
                            onChange={(e) => setFilters({ ...filters, class: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Block Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Block (Optional)
                        </label>
                        <select
                            value={filters.block}
                            onChange={(e) => setFilters({ ...filters, block: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">All Blocks</option>
                            <option value="A">Block A</option>
                            <option value="B">Block B</option>
                            <option value="C">Block C</option>
                            <option value="D">Block D</option>
                        </select>
                    </div>

                    {/* Generate Button */}
                    <div className="flex items-end">
                        <button
                            onClick={fetchReport}
                            disabled={loading}
                            className="w-full px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Generating..." : "Generate Report"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            {summary && (
                <div
                    ref={(el) => (sectionRefs.current["summary"] = el)}
                    data-section="summary"
                    className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${visibleSections.has("summary") ? "animate-slide-in" : ""}`}
                >
                    <StatCard
                        label="Total Students"
                        value={summary.totalStudents || 0}
                        icon={Users}
                        color="text-blue-600"
                        bgColor="bg-blue-50"
                    />
                    <StatCard
                        label="Average Attendance"
                        value={`${summary.averageAttendance || 0}%`}
                        icon={TrendingUp}
                        color="text-purple-600"
                        bgColor="bg-purple-50"
                    />
                    <StatCard
                        label="Present Days (Avg)"
                        value={summary.avgPresentDays || 0}
                        icon={CheckCircle}
                        color="text-green-600"
                        bgColor="bg-green-50"
                    />
                    <StatCard
                        label="Absent Days (Avg)"
                        value={summary.avgAbsentDays || 0}
                        icon={XCircle}
                        color="text-red-600"
                        bgColor="bg-red-50"
                    />
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center h-64">
                    <LoadingSpinner size="lg" />
                </div>
            )}

            {/* Report Table */}
            {!loading && reportData && reportData.length > 0 && (
                <div
                    ref={(el) => (sectionRefs.current["table"] = el)}
                    data-section="table"
                    className={`${visibleSections.has("table") ? "animate-slide-in" : ""}`}
                >
                    <ReportTable
                        title={`Attendance Report (${reportData.length} students)`}
                        icon={Calendar}
                        columns={columns}
                        data={reportData}
                        onExport={handleExportCSV}
                    />
                </div>
            )}

            {/* Empty State */}
            {!loading && reportData && reportData.length === 0 && (
                <div
                    ref={(el) => (sectionRefs.current["empty"] = el)}
                    data-section="empty"
                    className={`text-center py-12 bg-white rounded-xl border border-gray-200 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${visibleSections.has("empty") ? "animate-slide-in" : ""}`}
                >
                    <Calendar className="mx-auto h-16 w-16 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                        No Attendance Records Found
                    </h3>
                    <p className="mt-2 text-sm text-gray-600">
                        Try adjusting your filters or date range
                    </p>
                </div>
            )}

            {/* Attendance Categories */}
            {summary && summary.categories && (
                <div
                    ref={(el) => (sectionRefs.current["categories"] = el)}
                    data-section="categories"
                    className={`bg-white rounded-xl border border-gray-200 shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${visibleSections.has("categories") ? "animate-slide-in" : ""}`}
                >
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Attendance Categories
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 transition-all hover:scale-105 hover:shadow-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Excellent (≥90%)</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        {summary.categories.excellent || 0}
                                    </p>
                                </div>
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                        <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200 transition-all hover:scale-105 hover:shadow-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Average (75-89%)</p>
                                    <p className="text-2xl font-bold text-yellow-600">
                                        {summary.categories.average || 0}
                                    </p>
                                </div>
                                <Clock className="h-8 w-8 text-yellow-600" />
                            </div>
                        </div>
                        <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl border border-red-200 transition-all hover:scale-105 hover:shadow-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Poor (&lt;75%)</p>
                                    <p className="text-2xl font-bold text-red-600">
                                        {summary.categories.poor || 0}
                                    </p>
                                </div>
                                <XCircle className="h-8 w-8 text-red-600" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceReportsTab;
