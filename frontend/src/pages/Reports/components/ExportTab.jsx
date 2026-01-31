// src/pages/Reports/components/ExportTab.jsx
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { reportsAPI } from "../../../services/api";
import {
    Download,
    FileText,
    Table,
    Calendar,
    DollarSign,
    Coffee,
    BookOpen,
    Users,
    CheckCircle,
    Loader,
    Archive,
    Settings,
} from "lucide-react";

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

const ExportTab = () => {
    const [exporting, setExporting] = useState(false);
    const [selectedReports, setSelectedReports] = useState([]);
    const [exportFormat, setExportFormat] = useState("csv");
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
    });
    const [visibleSections, setVisibleSections] = useState(new Set());
    const sectionRefs = useRef({});

    const reportTypes = [
        {
            id: "students",
            label: "Student Master Data",
            description: "Complete student information with all details",
            icon: Users,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
        },
        {
            id: "attendance",
            label: "Attendance Records",
            description: "Student attendance with gate entries",
            icon: Calendar,
            color: "text-purple-600",
            bgColor: "bg-purple-50",
        },
        {
            id: "fees",
            label: "Fee Collection",
            description: "Fee payments, dues, and overdue records",
            icon: DollarSign,
            color: "text-green-600",
            bgColor: "bg-green-50",
        },
        {
            id: "mess",
            label: "Mess Consumption",
            description: "Meal attendance and consumption data",
            icon: Coffee,
            color: "text-orange-600",
            bgColor: "bg-orange-50",
        },
        {
            id: "marks",
            label: "Academic Marks",
            description: "Student marks and performance records",
            icon: BookOpen,
            color: "text-indigo-600",
            bgColor: "bg-indigo-50",
        },
        {
            id: "bank",
            label: "Student Bank Accounts",
            description: "Bank balance and transaction history",
            icon: Archive,
            color: "text-teal-600",
            bgColor: "bg-teal-50",
        },
    ];

    const handleToggleReport = (reportId) => {
        setSelectedReports((prev) =>
            prev.includes(reportId)
                ? prev.filter((id) => id !== reportId)
                : [...prev, reportId]
        );
    };

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
    }, [exporting, selectedReports.length, exportFormat, dateRange.startDate, dateRange.endDate]);

    const handleSelectAll = () => {
        if (selectedReports.length === reportTypes.length) {
            setSelectedReports([]);
        } else {
            setSelectedReports(reportTypes.map((report) => report.id));
        }
    };

    const handleExport = async () => {
        if (selectedReports.length === 0) {
            toast.error("Please select at least one report to export");
            return;
        }

        try {
            setExporting(true);
            toast.loading(`Exporting ${selectedReports.length} report(s)...`);

            for (const reportId of selectedReports) {
                const response = await reportsAPI.exportReport(reportId, {
                    format: exportFormat,
                    startDate: dateRange.startDate,
                    endDate: dateRange.endDate,
                });

                // Create download link
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement("a");
                link.href = url;
                link.setAttribute(
                    "download",
                    `${reportId}_${new Date().toISOString().split("T")[0]}.${exportFormat}`
                );
                document.body.appendChild(link);
                link.click();
                link.remove();

                // Small delay between downloads
                await new Promise((resolve) => setTimeout(resolve, 500));
            }

            toast.dismiss();
            toast.success(`Successfully exported ${selectedReports.length} report(s)!`);
        } catch (error) {
            console.error("Export error:", error);
            toast.dismiss();
            toast.error("Failed to export reports");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div
                ref={(el) => (sectionRefs.current["header"] = el)}
                data-section="header"
                className={`${visibleSections.has("header") ? "animate-slide-in" : ""}`}
            >
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <div className="bg-indigo-600 rounded-full p-3 mr-3 shadow-lg">
                        <Download className="h-6 w-6 text-white" />
                    </div>
                    Export Reports
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                    Download comprehensive reports in CSV or PDF format
                </p>
            </div>

            {/* Export Settings */}
            <div
                ref={(el) => (sectionRefs.current["settings"] = el)}
                data-section="settings"
                className={`bg-white rounded-xl border border-gray-200 shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${visibleSections.has("settings") ? "animate-slide-in" : ""}`}
            >
                <div className="flex items-center gap-2 mb-4">
                    <Settings className="h-5 w-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Export Settings</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Format Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Export Format
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setExportFormat("csv")}
                                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${exportFormat === "csv"
                                        ? "bg-indigo-600 text-white shadow-lg"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                            >
                                <Table className="h-4 w-4" />
                                CSV
                            </button>
                            <button
                                onClick={() => setExportFormat("pdf")}
                                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${exportFormat === "pdf"
                                        ? "bg-indigo-600 text-white shadow-lg"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                            >
                                <FileText className="h-4 w-4" />
                                PDF
                            </button>
                        </div>
                    </div>

                    {/* Date Range */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) =>
                                setDateRange({ ...dateRange, startDate: e.target.value })
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
                            value={dateRange.endDate}
                            onChange={(e) =>
                                setDateRange({ ...dateRange, endDate: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>
            </div>

            {/* Select All */}
            <div
                ref={(el) => (sectionRefs.current["select-all"] = el)}
                data-section="select-all"
                className={`flex items-center justify-between ${visibleSections.has("select-all") ? "animate-slide-in" : ""}`}
            >
                <p className="text-sm text-gray-600">
                    {selectedReports.length} of {reportTypes.length} reports selected
                </p>
                <button
                    onClick={handleSelectAll}
                    className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                    {selectedReports.length === reportTypes.length ? "Deselect All" : "Select All"}
                </button>
            </div>

            {/* Report Cards */}
            <div
                ref={(el) => (sectionRefs.current["cards"] = el)}
                data-section="cards"
                className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${visibleSections.has("cards") ? "animate-slide-in" : ""}`}
            >
                {reportTypes.map((report) => {
                    const isSelected = selectedReports.includes(report.id);
                    const Icon = report.icon;

                    return (
                        <div
                            key={report.id}
                            onClick={() => handleToggleReport(report.id)}
                            className={`relative cursor-pointer rounded-xl border p-6 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${isSelected
                                    ? "border-indigo-600 bg-indigo-50"
                                    : "border-gray-200 bg-white"
                                }`}
                        >
                            {/* Checkbox */}
                            <div className="absolute top-4 right-4">
                                <div
                                    className={`h-6 w-6 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected
                                            ? "bg-indigo-600 border-indigo-600"
                                            : "border-gray-300 bg-white"
                                        }`}
                                >
                                    {isSelected && <CheckCircle className="h-5 w-5 text-white" />}
                                </div>
                            </div>

                            {/* Icon */}
                            <div className={`h-12 w-12 ${report.bgColor} rounded-xl flex items-center justify-center mb-4 shadow-sm`}>
                                <Icon className={`h-6 w-6 ${report.color}`} />
                            </div>

                            {/* Content */}
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {report.label}
                            </h3>
                            <p className="text-sm text-gray-600">{report.description}</p>
                        </div>
                    );
                })}
            </div>

            {/* Export Summary */}
            {selectedReports.length > 0 && (
                <div
                    ref={(el) => (sectionRefs.current["summary"] = el)}
                    data-section="summary"
                    className={`bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-5 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${visibleSections.has("summary") ? "animate-slide-in" : ""}`}
                >
                    <div className="flex items-start">
                        <FileText className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                        <div className="ml-3 flex-1">
                            <h3 className="text-sm font-medium text-blue-900">
                                Ready to Export
                            </h3>
                            <p className="mt-1 text-sm text-blue-700">
                                You are about to export {selectedReports.length} report(s) as{" "}
                                <strong>{exportFormat.toUpperCase()}</strong> files for the period from{" "}
                                <strong>{new Date(dateRange.startDate).toLocaleDateString("en-IN")}</strong> to{" "}
                                <strong>{new Date(dateRange.endDate).toLocaleDateString("en-IN")}</strong>.
                            </p>
                            <ul className="mt-2 text-sm text-blue-700 list-disc list-inside">
                                {selectedReports.map((reportId) => {
                                    const report = reportTypes.find((r) => r.id === reportId);
                                    return <li key={reportId}>{report?.label}</li>;
                                })}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Export Button */}
            <div
                ref={(el) => (sectionRefs.current["actions"] = el)}
                data-section="actions"
                className={`flex justify-end gap-2 ${visibleSections.has("actions") ? "animate-slide-in" : ""}`}
            >
                <button
                    onClick={() => setSelectedReports([])}
                    disabled={selectedReports.length === 0 || exporting}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Clear Selection
                </button>
                <button
                    onClick={handleExport}
                    disabled={selectedReports.length === 0 || exporting}
                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {exporting ? (
                        <>
                            <Loader className="h-5 w-5 animate-spin" />
                            Exporting...
                        </>
                    ) : (
                        <>
                            <Download className="h-5 w-5" />
                            Export {selectedReports.length > 0 && `(${selectedReports.length})`}
                        </>
                    )}
                </button>
            </div>

            {/* Export Info */}
            <div
                ref={(el) => (sectionRefs.current["info"] = el)}
                data-section="info"
                className={`bg-white rounded-xl border border-gray-200 shadow-lg p-5 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${visibleSections.has("info") ? "animate-slide-in" : ""}`}
            >
                <h4 className="text-sm font-medium text-gray-900 mb-2">Export Information</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                    <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>CSV files can be opened in Excel, Google Sheets, or any spreadsheet application</span>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>PDF files are formatted for printing and archival purposes</span>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>All exports include data within the selected date range</span>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Multiple files will be downloaded sequentially</span>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Large exports may take a few moments to process</span>
                    </li>
                </ul>
            </div>

            {/* Quick Export Presets */}
            <div
                ref={(el) => (sectionRefs.current["presets"] = el)}
                data-section="presets"
                className={`bg-white rounded-xl border border-gray-200 shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${visibleSections.has("presets") ? "animate-slide-in" : ""}`}
            >
                <h3 className="font-semibold text-gray-900 mb-4">Quick Export Presets</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                        onClick={() => {
                            setSelectedReports(["students", "attendance", "fees"]);
                            toast.success("Selected: Students, Attendance, Fees");
                        }}
                        className="px-4 py-3 text-left border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01]"
                    >
                        <p className="font-medium text-gray-900">Essential Reports</p>
                        <p className="text-xs text-gray-600 mt-1">Students, Attendance, Fees</p>
                    </button>
                    <button
                        onClick={() => {
                            setSelectedReports(["attendance", "mess"]);
                            toast.success("Selected: Attendance, Mess");
                        }}
                        className="px-4 py-3 text-left border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01]"
                    >
                        <p className="font-medium text-gray-900">Daily Operations</p>
                        <p className="text-xs text-gray-600 mt-1">Attendance, Mess</p>
                    </button>
                    <button
                        onClick={() => {
                            setSelectedReports(["marks", "students"]);
                            toast.success("Selected: Marks, Students");
                        }}
                        className="px-4 py-3 text-left border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01]"
                    >
                        <p className="font-medium text-gray-900">Academic Reports</p>
                        <p className="text-xs text-gray-600 mt-1">Marks, Students</p>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportTab;
