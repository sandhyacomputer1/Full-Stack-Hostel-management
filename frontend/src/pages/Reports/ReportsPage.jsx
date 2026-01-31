// src/pages/Reports/ReportsPage.jsx
import React, { useState } from "react";
import {
    BarChart3,
    Users,
    Calendar,
    DollarSign,
    Coffee,
    BookOpen,
    Download,
    TrendingUp, // ✅ ADD THIS
} from "lucide-react";
import OverviewTab from "./components/OverviewTab";
import StudentReportsTab from "./components/StudentReportsTab";
import AttendanceReportsTab from "./components/AttendanceReportsTab";
import FeeReportsTab from "./components/FeeReportsTab";
import MessReportsTab from "./components/MessReportsTab";
import MarksReportsTab from "./components/MarksReportsTab";
import ExportTab from "./components/ExportTab";
import ExpensesReportTab from "./components/ExpensesReportTab"; // ✅ ADD THIS

const ReportsPage = () => {
    const [activeTab, setActiveTab] = useState("overview");

    const tabs = [
        { id: "overview", label: "Overview", icon: BarChart3 },
        { id: "students", label: "Students", icon: Users },
        { id: "attendance", label: "Attendance", icon: Calendar },
        { id: "fees", label: "Fees", icon: DollarSign },
        { id: "mess", label: "Mess", icon: Coffee },
        { id: "marks", label: "Marks", icon: BookOpen },
        { id: "expenses", label: "Expenses", icon: TrendingUp }, // ✅ ADD THIS
        { id: "export", label: "Export", icon: Download },
    ];

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <BarChart3 className="text-primary-600" />
                    Reports & Analytics
                </h1>
                <p className="text-gray-600 mt-2">
                    Comprehensive reports for hostel management and student tracking
                </p>
            </div>

            {/* Tabs Navigation */}
            <div className="bg-white rounded-lg shadow-sm mb-6">
                <div className="flex border-b border-gray-200 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-2 px-6 py-4 font-medium transition-all whitespace-nowrap
                                ${activeTab === tab.id
                                    ? "border-b-2 border-primary-600 text-primary-600"
                                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                                }
                            `}
                        >
                            <tab.icon size={20} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-lg shadow-sm">
                {activeTab === "overview" && <OverviewTab />}
                {activeTab === "students" && <StudentReportsTab />}
                {activeTab === "attendance" && <AttendanceReportsTab />}
                {activeTab === "fees" && <FeeReportsTab />}
                {activeTab === "mess" && <MessReportsTab />}
                {activeTab === "marks" && <MarksReportsTab />}
                {activeTab === "expenses" && <ExpensesReportTab />} {/* ✅ ADD THIS */}
                {activeTab === "export" && <ExportTab />}
            </div>
        </div>
    );
};

export default ReportsPage;
