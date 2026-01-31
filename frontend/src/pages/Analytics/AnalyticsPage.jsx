// src/pages/Analytics/AnalyticsPage.jsx
import React, { useState } from "react";
import {
    BarChart3,
    TrendingUp,
    PieChart as PieChartIcon,
    Activity,
    Users,
    DollarSign,
    CreditCard, // ✅ ADD THIS
} from "lucide-react";
import OverviewTab from "./components/OverviewTab";
import AttendanceAnalyticsTab from "./components/AttendanceAnalyticsTab";
import FeesAnalyticsTab from "./components/FeesAnalyticsTab";
import MessAnalyticsTab from "./components/MessAnalyticsTab";
import MarksAnalyticsTab from "./components/MarksAnalyticsTab";
import TrendsTab from "./components/TrendsTab";
import BankAnalyticsTab from "./components/BankAnalyticsTab"; // ✅ ADD THIS

const AnalyticsPage = () => {
    const [activeTab, setActiveTab] = useState("overview");

    const tabs = [
        {
            id: "overview",
            label: "Overview",
            icon: BarChart3,
            component: OverviewTab,
        },
        {
            id: "attendance",
            label: "Attendance Analytics",
            icon: Users,
            component: AttendanceAnalyticsTab,
        },
        {
            id: "fees",
            label: "Fees Analytics",
            icon: DollarSign,
            component: FeesAnalyticsTab,
        },
        {
            id: "mess",
            label: "Mess Analytics",
            icon: Activity,
            component: MessAnalyticsTab,
        },
        {
            id: "marks",
            label: "Academic Analytics",
            icon: TrendingUp,
            component: MarksAnalyticsTab,
        },
        // ✅ ADD BANK TAB HERE
        {
            id: "bank",
            label: "Bank Analytics",
            icon: CreditCard,
            component: BankAnalyticsTab,
        },
        {
            id: "trends",
            label: "Trends & Predictions",
            icon: PieChartIcon,
            component: TrendsTab,
        },
    ];

    const ActiveComponent =
        tabs.find((tab) => tab.id === activeTab)?.component || OverviewTab;

    return (
        <div className="min-h-screen bg-blue-30">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-blue-600 text-white p-6 rounded-b-2xl shadow-lg mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-3">
                                <BarChart3 className="h-8 w-8" />
                                Analytics Dashboard
                            </h1>
                            <p className="text-indigo-100 mt-2">
                                Visualize your hostel data with interactive charts and insights
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-sm border mb-6">
                    <nav className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-1 p-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        flex flex-col items-center justify-center gap-1 px-2 py-3 font-medium transition-all border-b-2 min-w-0 text-xs
                                        ${activeTab === tab.id
                                            ? "border-blue-600 text-blue-600 bg-blue-50"
                                            : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                        }
                                    `}
                                    title={tab.label}
                                >
                                    <Icon className="h-4 w-4 flex-shrink-0" />
                                    <span className="truncate text-center leading-tight">{tab.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="mb-6">
                    <ActiveComponent />
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;
