// src/pages/Reports/components/FeeReportsTab.jsx
import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { reportsAPI } from "../../../services/api";
import {
    DollarSign,
    Users,
    TrendingUp,
    AlertCircle,
    Filter,
    Download,
    RefreshCw,
    CheckCircle,
    Clock,
    XCircle,
    Receipt,
} from "lucide-react";
import LoadingSpinner from "../../../components/UI/LoadingSpinner";
import ReportTable from "../../../components/Reports/ReportTable";
import StatCard from "../../../components/Reports/StatCard";
import DateRangeFilter from "../../../components/Reports/DateRangeFilter";

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

const FeeReportsTab = () => {
    const [reportType, setReportType] = useState("collection"); // collection, due, overdue, payments
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [summary, setSummary] = useState(null);
    const [visibleSections, setVisibleSections] = useState(new Set());
    const sectionRefs = useRef({});

    // Filters
    const [filters, setFilters] = useState({
        startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0], // Start of year
        endDate: new Date().toISOString().split("T")[0], // Today
        class: "",
        block: "",
        status: "", // paid, pending, overdue
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
            if (reportType === "collection") {
                response = await reportsAPI.getFeeCollection({
                    startDate: filters.startDate,
                    endDate: filters.endDate,
                    class: filters.class,
                    block: filters.block,
                });
            } else if (reportType === "due") {
                response = await reportsAPI.getFeeDue({
                    class: filters.class,
                    block: filters.block,
                });
            } else if (reportType === "overdue") {
                response = await reportsAPI.getFeeOverdue({
                    class: filters.class,
                    block: filters.block,
                });
            }

            // ✅ FIX: Handle nested response structure
            console.log("Fee Report Response:", response); // Debug log

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
            console.error("Failed to fetch fee report:", error);
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

            if (reportType === "collection") {
                headers = [
                    "Student Name",
                    "Student ID",
                    "Roll No",
                    "Class",
                    "Block",
                    "Total Fee",
                    "Amount Paid",
                    "Amount Pending",
                    "Last Payment Date",
                    "Payment Status",
                ];

                rows = reportData.map((record) => [
                    record.studentName || "",
                    record.studentId || "",
                    record.rollNumber || "",
                    record.class || "",
                    record.block || "",
                    record.totalFee || 0,
                    record.amountPaid || 0,
                    record.amountPending || 0,
                    record.lastPaymentDate
                        ? new Date(record.lastPaymentDate).toLocaleDateString("en-IN")
                        : "—",
                    record.status || "",
                ]);
            } else if (reportType === "due" || reportType === "overdue") {
                headers = [
                    "Student Name",
                    "Student ID",
                    "Roll No",
                    "Class",
                    "Block",
                    "Total Fee",
                    "Amount Paid",
                    "Amount Due",
                    "Due Date",
                    "Days Overdue",
                ];

                rows = reportData.map((record) => [
                    record.studentName || "",
                    record.studentId || "",
                    record.rollNumber || "",
                    record.class || "",
                    record.block || "",
                    record.totalFee || 0,
                    record.amountPaid || 0,
                    record.amountDue || 0,
                    record.dueDate ? new Date(record.dueDate).toLocaleDateString("en-IN") : "—",
                    record.daysOverdue || 0,
                ]);
            }

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
                `fee_${reportType}_${new Date().toISOString().split("T")[0]}.csv`
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
        if (reportType === "collection") {
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
                    label: "Total Fee",
                    key: "totalFee",
                    render: (value) => (
                        <span className="font-semibold text-gray-900">
                            ₹{(value || 0).toLocaleString()}
                        </span>
                    ),
                },
                {
                    label: "Paid",
                    key: "amountPaid",
                    render: (value) => (
                        <span className="font-semibold text-green-600">
                            ₹{(value || 0).toLocaleString()}
                        </span>
                    ),
                },
                {
                    label: "Pending",
                    key: "amountPending",
                    render: (value) => (
                        <span className="font-semibold text-red-600">
                            ₹{(value || 0).toLocaleString()}
                        </span>
                    ),
                },
                {
                    label: "Last Payment",
                    key: "lastPaymentDate",
                    render: (value) =>
                        value ? new Date(value).toLocaleDateString("en-IN") : "—",
                },
                {
                    label: "Status",
                    key: "status",
                    render: (value) => (
                        <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${value === "paid"
                                ? "bg-green-100 text-green-800"
                                : value === "overdue"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                        >
                            {value}
                        </span>
                    ),
                },
            ];
        } else {
            // due and overdue
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
                    label: "Total Fee",
                    key: "totalFee",
                    render: (value) => (
                        <span className="font-semibold text-gray-900">
                            ₹{(value || 0).toLocaleString()}
                        </span>
                    ),
                },
                {
                    label: "Paid",
                    key: "amountPaid",
                    render: (value) => (
                        <span className="text-green-600">₹{(value || 0).toLocaleString()}</span>
                    ),
                },
                {
                    label: "Due Amount",
                    key: "amountDue",
                    render: (value) => (
                        <span className="font-bold text-red-600">
                            ₹{(value || 0).toLocaleString()}
                        </span>
                    ),
                },
                {
                    label: "Due Date",
                    key: "dueDate",
                    render: (value) =>
                        value ? new Date(value).toLocaleDateString("en-IN") : "—",
                },
                ...(reportType === "overdue"
                    ? [
                        {
                            label: "Days Overdue",
                            key: "daysOverdue",
                            render: (value) => (
                                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                                    {value} days
                                </span>
                            ),
                        },
                    ]
                    : []),
            ];
        }
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                        <div className="bg-indigo-600 rounded-full p-3 mr-3 shadow-lg">
                            <DollarSign className="h-6 w-6 text-white" />
                        </div>
                        Fee Reports
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Track fee collection, pending dues, and overdue payments
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

                <div className="space-y-4">
                    {/* Report Type Buttons */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setReportType("collection")}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${reportType === "collection"
                                ? "bg-indigo-600 text-white shadow-lg"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            Collection Summary
                        </button>
                        <button
                            onClick={() => setReportType("due")}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${reportType === "due"
                                ? "bg-indigo-600 text-white shadow-lg"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            Pending Dues
                        </button>
                        <button
                            onClick={() => setReportType("overdue")}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${reportType === "overdue"
                                ? "bg-indigo-600 text-white shadow-lg"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            Overdue Payments
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {/* Date Range (only for collection) */}
                        {reportType === "collection" && (
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
                        label="Total Collected"
                        value={`₹${(summary.totalCollected || 0).toLocaleString()}`}
                        icon={CheckCircle}
                        color="text-green-600"
                        bgColor="bg-green-50"
                        subtitle={`${summary.collectionRate || 0}% collected`}
                    />
                    <StatCard
                        label="Total Pending"
                        value={`₹${(summary.totalPending || 0).toLocaleString()}`}
                        icon={Clock}
                        color="text-yellow-600"
                        bgColor="bg-yellow-50"
                    />
                    <StatCard
                        label="Total Overdue"
                        value={`₹${(summary.totalOverdue || 0).toLocaleString()}`}
                        icon={AlertCircle}
                        color="text-red-600"
                        bgColor="bg-red-50"
                        subtitle={`${summary.overdueCount || 0} students`}
                    />
                </div>
            )}

            {/* Collection Progress */}
            {summary && reportType === "collection" && (
                <div
                    ref={(el) => (sectionRefs.current["progress"] = el)}
                    data-section="progress"
                    className={`bg-white rounded-xl border border-gray-200 shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${visibleSections.has("progress") ? "animate-slide-in" : ""}`}
                >
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Collection Progress
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span>
                                ₹{(summary.totalCollected || 0).toLocaleString()} collected
                            </span>
                            <span>
                                ₹{(summary.totalExpected || 0).toLocaleString()} expected
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                            <div
                                className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all flex items-center justify-end pr-2"
                                style={{ width: `${summary.collectionRate || 0}%` }}
                            >
                                <span className="text-xs font-bold text-white">
                                    {summary.collectionRate || 0}%
                                </span>
                            </div>
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
            {!loading && reportData && reportData.length > 0 && (
                <div
                    ref={(el) => (sectionRefs.current["table"] = el)}
                    data-section="table"
                    className={`${visibleSections.has("table") ? "animate-slide-in" : ""}`}
                >
                    <ReportTable
                        title={`${reportType === "collection"
                            ? "Fee Collection"
                            : reportType === "due"
                                ? "Pending Dues"
                                : "Overdue Payments"
                            } (${reportData.length} students)`}
                        icon={DollarSign}
                        columns={getColumns()}
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
                    <Receipt className="mx-auto h-16 w-16 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                        No Fee Records Found
                    </h3>
                    <p className="mt-2 text-sm text-gray-600">
                        Try adjusting your filters or date range
                    </p>
                </div>
            )}

            {/* Alert for Overdue */}
            {reportType === "overdue" && reportData && reportData.length > 0 && (
                <div
                    ref={(el) => (sectionRefs.current["overdue-alert"] = el)}
                    data-section="overdue-alert"
                    className={`bg-red-50 border border-red-200 rounded-xl p-4 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${visibleSections.has("overdue-alert") ? "animate-slide-in" : ""}`}
                >
                    <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-900">
                                Action Required
                            </h3>
                            <p className="mt-1 text-sm text-red-700">
                                {reportData.length} student(s) have overdue payments totaling ₹
                                {(summary?.totalOverdue || 0).toLocaleString()}. Consider sending
                                reminders or contacting guardians.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeeReportsTab;
