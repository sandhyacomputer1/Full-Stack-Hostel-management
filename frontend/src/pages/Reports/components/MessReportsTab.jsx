// src/pages/Reports/components/MessReportsTab.jsx
import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { reportsAPI } from "../../../services/api";
import {
    Coffee,
    Users,
    TrendingUp,
    Filter,
    Download,
    RefreshCw,
    Sunrise,
    Sun,
    Moon,
    Calendar,
    PieChart,
} from "lucide-react";
import LoadingSpinner from "../../../components/UI/LoadingSpinner";
import ReportTable from "../../../components/Reports/ReportTable";
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

const MessReportsTab = () => {
    const [reportType, setReportType] = useState("monthly");
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState([]);  // ✅ Changed from null to []
    const [summary, setSummary] = useState(null);
    const [visibleSections, setVisibleSections] = useState(new Set());
    const sectionRefs = useRef({});

    // Filters
    const [filters, setFilters] = useState({
        month: new Date().toISOString().slice(0, 7),
        date: new Date().toISOString().split("T")[0],
        class: "",
        block: "",
        mealType: "",
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
                response = await reportsAPI.getMessMonthly({
                    month: filters.month,
                    class: filters.class,
                    block: filters.block,
                });
            } else if (reportType === "daily") {
                response = await reportsAPI.getMessConsumption({
                    date: filters.date,
                    class: filters.class,
                    block: filters.block,
                });
            } else if (reportType === "mealwise") {
                response = await reportsAPI.getMessConsumption({
                    month: filters.month,
                    mealType: filters.mealType,
                    class: filters.class,
                    block: filters.block,
                });
            }

            // ✅ DEBUG LOGS
            console.log("📦 Full Response:", response);
            console.log("📦 Response.data:", response.data);
            console.log("📦 Response.data.success:", response.data?.success);
            console.log("📦 Response.data.data:", response.data?.data);

            // ✅ UNIVERSAL FIX
            let records = [];
            let summaryData = null;

            if (response.data) {
                if (response.data.success && response.data.data) {
                    // Structure: { success: true, data: { records, summary } }
                    records = response.data.data.records || [];
                    summaryData = response.data.data.summary || null;
                } else if (response.data.records) {
                    // Structure: { records, summary }
                    records = response.data.records || [];
                    summaryData = response.data.summary || null;
                } else if (Array.isArray(response.data)) {
                    // Structure: [...]
                    records = response.data;
                }
            }

            console.log("✅ Extracted Records:", records);
            console.log("✅ Extracted Records Length:", records.length);
            console.log("✅ Extracted Summary:", summaryData);

            setReportData(records);
            setSummary(summaryData);

            if (records.length > 0) {
                toast.success(`Report generated: ${records.length} records found`);
            } else {
                toast.info("Report generated but no records found");
            }
        } catch (error) {
            console.error("❌ Failed to fetch mess report:", error);
            toast.error("Failed to generate report");
            setReportData([]);
            setSummary(null);
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = () => {
        if (!reportData || reportData.length === 0) {
            toast.error("No data to export");
            return;
        }

        try {
            let headers, rows;

            if (reportType === "monthly") {
                headers = [
                    "Student Name",
                    "Student ID",
                    "Roll No",
                    "Class",
                    "Block",
                    "Breakfast",
                    "Lunch",
                    "Dinner",
                    "Total Meals",
                    "Meal Plan",
                ];

                rows = reportData.map((record) => [
                    record.studentName || "",
                    record.studentId || "",
                    record.rollNumber || "",
                    record.class || "",
                    record.block || "",
                    record.breakfastCount || 0,
                    record.lunchCount || 0,
                    record.dinnerCount || 0,
                    record.totalMeals || 0,
                    record.mealPlan || "",
                ]);
            } else if (reportType === "daily") {
                headers = [
                    "Student Name",
                    "Student ID",
                    "Roll No",
                    "Class",
                    "Block",
                    "Breakfast",
                    "Lunch",
                    "Dinner",
                    "Total Meals Today",
                ];

                rows = reportData.map((record) => [
                    record.studentName || "",
                    record.studentId || "",
                    record.rollNumber || "",
                    record.class || "",
                    record.block || "",
                    record.breakfast || "—",
                    record.lunch || "—",
                    record.dinner || "—",
                    record.mealsToday || 0,
                ]);
            } else {
                headers = [
                    "Student Name",
                    "Student ID",
                    "Roll No",
                    "Class",
                    "Block",
                    "Meal Type",
                    "Attendance Count",
                    "Attendance %",
                ];

                rows = reportData.map((record) => [
                    record.studentName || "",
                    record.studentId || "",
                    record.rollNumber || "",
                    record.class || "",
                    record.block || "",
                    record.mealType || "",
                    record.attendanceCount || 0,
                    record.attendanceRate || 0,
                ]);
            }

            const csvContent = [
                headers.join(","),
                ...rows.map((row) =>
                    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
                ),
            ].join("\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute(
                "download",
                `mess_${reportType}_${new Date().toISOString().split("T")[0]}.csv`
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

    const getColumns = () => {
        if (reportType === "monthly") {
            return [
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
                { label: "Roll No", key: "rollNumber" },
                { label: "Class", key: "class" },
                { label: "Block", key: "block" },
                {
                    label: "Breakfast",
                    key: "breakfastCount",
                    render: (value) => (
                        <div className="flex items-center gap-1">
                            <Sunrise className="h-4 w-4 text-orange-500" />
                            <span className="font-semibold text-gray-900">{value || 0}</span>
                        </div>
                    ),
                },
                {
                    label: "Lunch",
                    key: "lunchCount",
                    render: (value) => (
                        <div className="flex items-center gap-1">
                            <Sun className="h-4 w-4 text-yellow-500" />
                            <span className="font-semibold text-gray-900">{value || 0}</span>
                        </div>
                    ),
                },
                {
                    label: "Dinner",
                    key: "dinnerCount",
                    render: (value) => (
                        <div className="flex items-center gap-1">
                            <Moon className="h-4 w-4 text-indigo-500" />
                            <span className="font-semibold text-gray-900">{value || 0}</span>
                        </div>
                    ),
                },
                {
                    label: "Total Meals",
                    key: "totalMeals",
                    render: (value) => (
                        <span className="text-lg font-bold text-primary-600">{value || 0}</span>
                    ),
                },
                {
                    label: "Meal Plan",
                    key: "mealPlan",
                    render: (value) => (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                            {value || "BLD"}
                        </span>
                    ),
                },
            ];
        } else if (reportType === "daily") {
            return [
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
                { label: "Roll No", key: "rollNumber" },
                { label: "Class", key: "class" },
                { label: "Block", key: "block" },
                {
                    label: "Breakfast",
                    key: "breakfast",
                    render: (value) => (
                        <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${value === "present"
                                    ? "bg-green-100 text-green-800"
                                    : value === "absent"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-gray-100 text-gray-800"
                                }`}
                        >
                            {value || "—"}
                        </span>
                    ),
                },
                {
                    label: "Lunch",
                    key: "lunch",
                    render: (value) => (
                        <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${value === "present"
                                    ? "bg-green-100 text-green-800"
                                    : value === "absent"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-gray-100 text-gray-800"
                                }`}
                        >
                            {value || "—"}
                        </span>
                    ),
                },
                {
                    label: "Dinner",
                    key: "dinner",
                    render: (value) => (
                        <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${value === "present"
                                    ? "bg-green-100 text-green-800"
                                    : value === "absent"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-gray-100 text-gray-800"
                                }`}
                        >
                            {value || "—"}
                        </span>
                    ),
                },
                {
                    label: "Meals Today",
                    key: "mealsToday",
                    render: (value) => (
                        <span className="text-lg font-bold text-primary-600">{value || 0}</span>
                    ),
                },
            ];
        } else {
            return [
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
                { label: "Roll No", key: "rollNumber" },
                { label: "Class", key: "class" },
                { label: "Block", key: "block" },
                {
                    label: "Meal Type",
                    key: "mealType",
                    render: (value) => (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-semibold capitalize">
                            {value}
                        </span>
                    ),
                },
                {
                    label: "Attendance Count",
                    key: "attendanceCount",
                    render: (value) => <span className="font-semibold text-gray-900">{value || 0}</span>,
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
                                            : value >= 50
                                                ? "bg-yellow-600"
                                                : "bg-red-600"
                                        }`}
                                    style={{ width: `${value}%` }}
                                />
                            </div>
                            <span className="text-sm font-bold text-gray-900">{value}%</span>
                        </div>
                    ),
                },
            ];
        }
    };

    // ✅ DEBUG: Log state before render
    console.log("🎨 Rendering with:", {
        loading,
        reportDataLength: reportData?.length,
        reportDataType: typeof reportData,
        isArray: Array.isArray(reportData),
        summary,
        reportType
    });

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                        <div className="bg-indigo-600 rounded-full p-3 mr-3 shadow-lg">
                            <Coffee className="h-6 w-6 text-white" />
                        </div>
                        Mess Reports
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Track meal consumption and mess attendance
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

            {/* Report Type Selector & Filters - (keeping your existing code) */}
            <div
                ref={(el) => (sectionRefs.current["filters"] = el)}
                data-section="filters"
                className={`bg-white rounded-xl border border-gray-200 shadow-lg p-5 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${visibleSections.has("filters") ? "animate-slide-in" : ""}`}
            >
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-5 w-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Report Type & Filters</h3>
                </div>

                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setReportType("monthly")}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${reportType === "monthly"
                                    ? "bg-indigo-600 text-white shadow-lg"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            Monthly Summary
                        </button>
                        <button
                            onClick={() => setReportType("daily")}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${reportType === "daily"
                                    ? "bg-indigo-600 text-white shadow-lg"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            Daily Report
                        </button>
                        <button
                            onClick={() => setReportType("mealwise")}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${reportType === "mealwise"
                                    ? "bg-indigo-600 text-white shadow-lg"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            Meal-wise Analysis
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {(reportType === "monthly" || reportType === "mealwise") && (
                            <div>
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

                        {reportType === "daily" && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Date
                                </label>
                                <input
                                    type="date"
                                    value={filters.date}
                                    onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        )}

                        {reportType === "mealwise" && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Meal Type
                                </label>
                                <select
                                    value={filters.mealType}
                                    onChange={(e) => setFilters({ ...filters, mealType: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">All Meals</option>
                                    <option value="breakfast">Breakfast</option>
                                    <option value="lunch">Lunch</option>
                                    <option value="dinner">Dinner</option>
                                </select>
                            </div>
                        )}

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
            </div>

            {/* Summary Stats */}
            {summary && (
                <div
                    ref={(el) => (sectionRefs.current["summary"] = el)}
                    data-section="summary"
                    className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${visibleSections.has("summary") ? "animate-slide-in" : ""}`}
                >
                    <StatCard label="Total Students" value={summary.totalStudents || 0} icon={Users} color="text-blue-600" bgColor="bg-blue-50" />
                    <StatCard label="Breakfast Served" value={summary.breakfastCount || 0} icon={Sunrise} color="text-orange-600" bgColor="bg-orange-50" />
                    <StatCard label="Lunch Served" value={summary.lunchCount || 0} icon={Sun} color="text-yellow-600" bgColor="bg-yellow-50" />
                    <StatCard label="Dinner Served" value={summary.dinnerCount || 0} icon={Moon} color="text-indigo-600" bgColor="bg-indigo-50" />
                </div>
            )}

            {/* Meal Distribution Chart */}
            {summary && reportType === "monthly" && (
                <div
                    ref={(el) => (sectionRefs.current["distribution"] = el)}
                    data-section="distribution"
                    className={`bg-white rounded-xl border border-gray-200 shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${visibleSections.has("distribution") ? "animate-slide-in" : ""}`}
                >
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <PieChart className="h-5 w-5 mr-2 text-indigo-600" />
                        Meal Distribution
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 transition-all hover:scale-105 hover:shadow-lg">
                            <Sunrise className="h-8 w-8 mx-auto text-orange-600 mb-2" />
                            <p className="text-sm text-gray-600">Breakfast</p>
                            <p className="text-3xl font-bold text-orange-600">{summary.breakfastCount || 0}</p>
                            <p className="text-xs text-gray-500 mt-1">{summary.breakfastPercentage || 0}% of total</p>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200 transition-all hover:scale-105 hover:shadow-lg">
                            <Sun className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
                            <p className="text-sm text-gray-600">Lunch</p>
                            <p className="text-3xl font-bold text-yellow-600">{summary.lunchCount || 0}</p>
                            <p className="text-xs text-gray-500 mt-1">{summary.lunchPercentage || 0}% of total</p>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 transition-all hover:scale-105 hover:shadow-lg">
                            <Moon className="h-8 w-8 mx-auto text-indigo-600 mb-2" />
                            <p className="text-sm text-gray-600">Dinner</p>
                            <p className="text-3xl font-bold text-indigo-600">{summary.dinnerCount || 0}</p>
                            <p className="text-xs text-gray-500 mt-1">{summary.dinnerPercentage || 0}% of total</p>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Total Meals Served</span>
                            <span className="text-2xl font-bold text-indigo-600">{summary.totalMeals || 0}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center h-64">
                    <LoadingSpinner size="lg" />
                </div>
            )}

            {/* Report Table */}
            {!loading && Array.isArray(reportData) && reportData.length > 0 && (
                <div
                    ref={(el) => (sectionRefs.current["table"] = el)}
                    data-section="table"
                    className={`${visibleSections.has("table") ? "animate-slide-in" : ""}`}
                >
                    <ReportTable
                        title={`${reportType === "monthly"
                                ? "Monthly Mess Consumption"
                                : reportType === "daily"
                                    ? "Daily Mess Attendance"
                                    : "Meal-wise Analysis"
                            } (${reportData.length} students)`}
                        icon={Coffee}
                        columns={getColumns()}
                        data={reportData}
                        onExport={handleExportCSV}
                    />
                </div>
            )}

            {/* Empty State */}
            {!loading && Array.isArray(reportData) && reportData.length === 0 && (
                <div
                    ref={(el) => (sectionRefs.current["empty"] = el)}
                    data-section="empty"
                    className={`text-center py-12 bg-white rounded-xl border border-gray-200 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${visibleSections.has("empty") ? "animate-slide-in" : ""}`}
                >
                    <Coffee className="mx-auto h-16 w-16 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No Mess Records Found</h3>
                    <p className="mt-2 text-sm text-gray-600">Try adjusting your filters or date range</p>
                </div>
            )}
        </div>
    );
};

export default MessReportsTab;
