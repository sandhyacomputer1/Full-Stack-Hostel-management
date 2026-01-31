// src/pages/Reports/components/MarksReportsTab.jsx
import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { reportsAPI } from "../../../services/api";
import {
    BookOpen,
    Users,
    TrendingUp,
    Award,
    Filter,
    Download,
    RefreshCw,
    BarChart3,
    Target,
    Trophy,
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

const MarksReportsTab = () => {
    const [reportType, setReportType] = useState("overall");
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState([]);
    const [summary, setSummary] = useState(null);
    const [visibleSections, setVisibleSections] = useState(new Set());
    const sectionRefs = useRef({});

    // Filters
    const [filters, setFilters] = useState({
        exam: "",
        subject: "",
        class: "",
        semester: "",
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

            // ✅ FIX: Use correct API method names
            let response;

            if (reportType === "subject") {
                // Don't fetch if subject is empty
                if (!filters.subject || filters.subject.trim() === "") {
                    setReportData([]);
                    setSummary(null);
                    setLoading(false);
                    return;
                }

                // ✅ Correct method: getMarksBySubject
                response = await reportsAPI.getMarksBySubject({
                    exam: filters.exam,
                    subject: filters.subject,
                    class: filters.class,
                });
            } else if (reportType === "toppers") {
                // ✅ Use getMarksReport with query params
                response = await reportsAPI.getMarksReport({
                    exam: filters.exam,
                    class: filters.class,
                    semester: filters.semester,
                    toppers: true,
                    limit: 10,
                });
            } else if (reportType === "classwise") {
                // ✅ Use groupBy parameter for class-wise summary
                response = await reportsAPI.getMarksReport({
                    exam: filters.exam,
                    semester: filters.semester,
                    groupBy: "class",
                });
            } else {
                // ✅ Overall performance
                response = await reportsAPI.getMarksReport({
                    exam: filters.exam,
                    class: filters.class,
                    semester: filters.semester,
                });
            }

            // ✅ Extract data from response
            if (response.data && response.data.success) {
                setReportData(response.data.data?.records || response.data.data || []);
                setSummary(response.data.data?.summary || null);
            } else {
                setReportData([]);
                setSummary(null);
            }
        } catch (error) {
            console.error("Failed to fetch marks report:", error);
            toast.error(error.response?.data?.message || "Failed to fetch report");
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

            if (reportType === "overall") {
                headers = [
                    "Student Name",
                    "Student ID",
                    "Roll No",
                    "Class",
                    "Total Marks",
                    "Obtained Marks",
                    "Percentage",
                    "Grade",
                    "Rank",
                ];

                rows = reportData.map((record) => [
                    record.studentName || "",
                    record.studentId || "",
                    record.rollNumber || "",
                    record.class || "",
                    record.totalMarks || 0,
                    record.obtainedMarks || 0,
                    record.percentage || 0,
                    record.grade || "",
                    record.rank || "—",
                ]);
            } else if (reportType === "subject") {
                headers = [
                    "Student Name",
                    "Student ID",
                    "Roll No",
                    "Class",
                    "Subject",
                    "Total Marks",
                    "Obtained Marks",
                    "Percentage",
                    "Grade",
                ];

                rows = reportData.map((record) => [
                    record.studentName || "",
                    record.studentId || "",
                    record.rollNumber || "",
                    record.class || "",
                    record.subject || "",
                    record.totalMarks || 0,
                    record.obtainedMarks || 0,
                    record.percentage || 0,
                    record.grade || "",
                ]);
            } else if (reportType === "toppers") {
                headers = [
                    "Rank",
                    "Student Name",
                    "Student ID",
                    "Roll No",
                    "Class",
                    "Percentage",
                    "Grade",
                ];

                rows = reportData.map((record, index) => [
                    index + 1,
                    record.studentName || "",
                    record.studentId || "",
                    record.rollNumber || "",
                    record.class || "",
                    record.percentage || 0,
                    record.grade || "",
                ]);
            } else {
                // classwise
                headers = ["Class", "Total Students", "Average %", "Pass %", "Highest %", "Lowest %"];

                rows = reportData.map((record) => [
                    record.class || "",
                    record.totalStudents || 0,
                    record.averagePercentage || 0,
                    record.passPercentage || 0,
                    record.highestPercentage || 0,
                    record.lowestPercentage || 0,
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
                `marks_${reportType}_${new Date().toISOString().split("T")[0]}.csv`
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
        if (reportType === "overall") {
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
                    label: "Marks",
                    key: "obtainedMarks",
                    render: (value, row) => (
                        <span className="font-semibold text-gray-900">
                            {value || 0} / {row.totalMarks || 0}
                        </span>
                    ),
                },
                {
                    label: "Percentage",
                    key: "percentage",
                    render: (value) => (
                        <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full ${value >= 75
                                            ? "bg-green-600"
                                            : value >= 60
                                                ? "bg-blue-600"
                                                : value >= 45
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
                                            ? "text-blue-600"
                                            : value >= 45
                                                ? "text-yellow-600"
                                                : "text-red-600"
                                    }`}
                            >
                                {value}%
                            </span>
                        </div>
                    ),
                },
                {
                    label: "Grade",
                    key: "grade",
                    render: (value) => {
                        const gradeColors = {
                            "A+": "bg-green-100 text-green-800",
                            A: "bg-green-100 text-green-800",
                            B: "bg-blue-100 text-blue-800",
                            C: "bg-yellow-100 text-yellow-800",
                            D: "bg-orange-100 text-orange-800",
                            F: "bg-red-100 text-red-800",
                        };
                        return (
                            <span
                                className={`px-2 py-1 rounded-full text-xs font-bold ${gradeColors[value] || "bg-gray-100 text-gray-800"
                                    }`}
                            >
                                {value || "—"}
                            </span>
                        );
                    },
                },
                {
                    label: "Rank",
                    key: "rank",
                    render: (value) =>
                        value ? (
                            <div className="flex items-center gap-1">
                                {value <= 3 && <Trophy className="h-4 w-4 text-yellow-500" />}
                                <span className="font-semibold text-gray-900">#{value}</span>
                            </div>
                        ) : (
                            "—"
                        ),
                },
            ];
        } else if (reportType === "subject") {
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
                    label: "Subject",
                    key: "subject",
                    render: (value) => (
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-semibold">
                            {value}
                        </span>
                    ),
                },
                {
                    label: "Marks",
                    key: "obtainedMarks",
                    render: (value, row) => (
                        <span className="font-semibold text-gray-900">
                            {value || 0} / {row.totalMarks || 0}
                        </span>
                    ),
                },
                {
                    label: "Percentage",
                    key: "percentage",
                    render: (value) => (
                        <span
                            className={`text-lg font-bold ${value >= 75
                                    ? "text-green-600"
                                    : value >= 60
                                        ? "text-blue-600"
                                        : value >= 45
                                            ? "text-yellow-600"
                                            : "text-red-600"
                                }`}
                        >
                            {value}%
                        </span>
                    ),
                },
                {
                    label: "Grade",
                    key: "grade",
                    render: (value) => {
                        const gradeColors = {
                            "A+": "bg-green-100 text-green-800",
                            A: "bg-green-100 text-green-800",
                            B: "bg-blue-100 text-blue-800",
                            C: "bg-yellow-100 text-yellow-800",
                            D: "bg-orange-100 text-orange-800",
                            F: "bg-red-100 text-red-800",
                        };
                        return (
                            <span
                                className={`px-2 py-1 rounded-full text-xs font-bold ${gradeColors[value] || "bg-gray-100 text-gray-800"
                                    }`}
                            >
                                {value || "—"}
                            </span>
                        );
                    },
                },
            ];
        } else if (reportType === "toppers") {
            return [
                {
                    label: "Rank",
                    key: "rank",
                    render: (value, row, index) => {
                        const medals = ["🥇", "🥈", "🥉"];
                        return (
                            <div className="flex items-center gap-2">
                                {index < 3 && <span className="text-xl">{medals[index]}</span>}
                                <span className="text-lg font-bold text-gray-900">#{index + 1}</span>
                            </div>
                        );
                    },
                },
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
                    label: "Percentage",
                    key: "percentage",
                    render: (value) => (
                        <span className="text-2xl font-bold text-green-600">{value}%</span>
                    ),
                },
                {
                    label: "Grade",
                    key: "grade",
                    render: (value) => (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-bold">
                            {value || "—"}
                        </span>
                    ),
                },
            ];
        } else {
            // classwise
            return [
                {
                    label: "Class",
                    key: "class",
                    render: (value) => (
                        <span className="text-lg font-bold text-gray-900">Class {value}</span>
                    ),
                },
                {
                    label: "Total Students",
                    key: "totalStudents",
                    render: (value) => <span className="font-semibold text-gray-900">{value}</span>,
                },
                {
                    label: "Average %",
                    key: "averagePercentage",
                    render: (value) => (
                        <span className="text-lg font-bold text-blue-600">{value}%</span>
                    ),
                },
                {
                    label: "Pass %",
                    key: "passPercentage",
                    render: (value) => (
                        <span className="text-lg font-bold text-green-600">{value}%</span>
                    ),
                },
                {
                    label: "Highest %",
                    key: "highestPercentage",
                    render: (value) => (
                        <span className="font-semibold text-green-600">{value}%</span>
                    ),
                },
                {
                    label: "Lowest %",
                    key: "lowestPercentage",
                    render: (value) => (
                        <span className="font-semibold text-red-600">{value}%</span>
                    ),
                },
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
                            <BookOpen className="h-6 w-6 text-white" />
                        </div>
                        Academic Performance Reports
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Track student marks, grades, and academic performance
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
                            onClick={() => setReportType("overall")}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${reportType === "overall"
                                    ? "bg-indigo-600 text-white shadow-lg"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            Overall Performance
                        </button>
                        <button
                            onClick={() => setReportType("subject")}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${reportType === "subject"
                                    ? "bg-indigo-600 text-white shadow-lg"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            Subject-wise
                        </button>
                        <button
                            onClick={() => setReportType("toppers")}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${reportType === "toppers"
                                    ? "bg-indigo-600 text-white shadow-lg"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            Toppers List
                        </button>
                        <button
                            onClick={() => setReportType("classwise")}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${reportType === "classwise"
                                    ? "bg-indigo-600 text-white shadow-lg"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            Class-wise Summary
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {/* Exam Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Exam/Test
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Mid-term"
                                value={filters.exam}
                                onChange={(e) => setFilters({ ...filters, exam: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Subject Filter (only for subject report) */}
                        {reportType === "subject" && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Subject
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., Mathematics"
                                    value={filters.subject}
                                    onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        )}

                        {/* Class Filter (not for classwise) */}
                        {reportType !== "classwise" && (
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
                        )}

                        {/* Semester Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Semester (Optional)
                            </label>
                            <select
                                value={filters.semester}
                                onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">All Semesters</option>
                                <option value="1">Semester 1</option>
                                <option value="2">Semester 2</option>
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
                        label="Average Percentage"
                        value={`${summary.averagePercentage || 0}%`}
                        icon={TrendingUp}
                        color="text-purple-600"
                        bgColor="bg-purple-50"
                    />
                    <StatCard
                        label="Pass Percentage"
                        value={`${summary.passPercentage || 0}%`}
                        icon={Target}
                        color="text-green-600"
                        bgColor="bg-green-50"
                        subtitle={`${summary.passedStudents || 0} passed`}
                    />
                    <StatCard
                        label="Highest Marks"
                        value={`${summary.highestPercentage || 0}%`}
                        icon={Award}
                        color="text-yellow-600"
                        bgColor="bg-yellow-50"
                    />
                </div>
            )}

            {/* Grade Distribution */}
            {summary && summary.gradeDistribution && reportType !== "classwise" && (
                <div
                    ref={(el) => (sectionRefs.current["grades"] = el)}
                    data-section="grades"
                    className={`bg-white rounded-xl border border-gray-200 shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${visibleSections.has("grades") ? "animate-slide-in" : ""}`}
                >
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <BarChart3 className="h-5 w-5 mr-2 text-indigo-600" />
                        Grade Distribution
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        {Object.entries(summary.gradeDistribution).map(([grade, count]) => {
                            const gradeColors = {
                                "A+": "bg-green-50 border-green-200 text-green-800",
                                A: "bg-green-50 border-green-200 text-green-800",
                                B: "bg-blue-50 border-blue-200 text-blue-800",
                                C: "bg-yellow-50 border-yellow-200 text-yellow-800",
                                D: "bg-orange-50 border-orange-200 text-orange-800",
                                F: "bg-red-50 border-red-200 text-red-800",
                            };
                            return (
                                <div
                                    key={grade}
                                    className={`text-center p-4 rounded-xl border transition-all hover:scale-105 hover:shadow-lg ${gradeColors[grade] || "bg-gray-50 border-gray-200 text-gray-800"
                                        }`}
                                >
                                    <p className="text-sm font-medium">Grade {grade}</p>
                                    <p className="text-3xl font-bold mt-2">{count || 0}</p>
                                </div>
                            );
                        })}
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
                        title={`${reportType === "overall"
                                ? "Overall Performance"
                                : reportType === "subject"
                                    ? "Subject-wise Marks"
                                    : reportType === "toppers"
                                        ? "Top Performers"
                                        : "Class-wise Summary"
                            } (${reportData.length} ${reportType === "classwise" ? "classes" : "students"})`}
                        icon={BookOpen}
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
                    <BookOpen className="mx-auto h-16 w-16 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                        No Marks Records Found
                    </h3>
                    <p className="mt-2 text-sm text-gray-600">
                        Try adjusting your filters or check if marks have been uploaded
                    </p>
                </div>
            )}
        </div>
    );
};

export default MarksReportsTab;
