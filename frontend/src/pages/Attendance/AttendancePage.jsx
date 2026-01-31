// src/pages/Attendance/AttendancePage.jsx
import React, { useState } from "react";
import {
  Calendar,
  BarChart3,
  AlertTriangle,
  History,
  Settings,
  FileSpreadsheet,
  Umbrella, // ✅ NEW: Icon for Leave Management
} from "lucide-react";

import DailyMarkingTab from "../../components/Attendance/DailyMarkingTab";
import ReportTab from "../../components/Attendance/ReportTab";
import ReconciliationTab from "../../components/Attendance/ReconciliationTab";
import HistoryTab from "../../components/Attendance/HistoryTab";
import SettingTab from "../../components/Attendance/SettingTab";
import BulkOperationTab from "../../components/Attendance/BulkOperationTab";
import LeaveApplicationTab from "../../components/Attendance/LeaveApplicationTab";

const AttendancePage = () => {
  const [activeTab, setActiveTab] = useState("daily");

  const tabs = [
    {
      id: "daily",
      name: "Daily Marking",
      icon: Calendar,
      component: DailyMarkingTab,
      description: "Mark student IN/OUT attendance",
    },
    {
      id: "reports",
      name: "Reports",
      icon: BarChart3,
      component: ReportTab,
      description: "Generate attendance reports and analytics",
    },
    // ✅ NEW: Leave Management Tab (placed after reports, before reconciliation)
    {
      id: "leave",
      name: "Leave Management",
      icon: Umbrella,
      component: LeaveApplicationTab,
      description: "Manage student leave applications",
    },
    {
      id: "reconciliation",
      name: "Reconciliation",
      icon: AlertTriangle,
      component: ReconciliationTab,
      description: "Review and fix attendance issues",
    },
    {
      id: "history",
      name: "History",
      icon: History,
      component: HistoryTab,
      description: "View detailed attendance history",
    },
    {
      id: "bulk",
      name: "Bulk Operations",
      icon: FileSpreadsheet,
      component: BulkOperationTab,
      description: "Bulk marking, CSV import, and past dates",
    },
    {
      id: "settings",
      name: "Settings",
      icon: Settings,
      component: SettingTab,
      description: "Configure attendance system settings",
    },
  ];

  const ActiveComponent = tabs.find((tab) => tab.id === activeTab)?.component;
  const activeTabInfo = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Attendance Management
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage hostel entry/exit tracking, leave applications, reports, and
          reconciliation
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    group inline-flex items-center py-4 px-6 border-b-2 font-medium text-sm whitespace-nowrap
                    transition-colors duration-200
                    ${
                      isActive
                        ? "border-primary-500 text-primary-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }
                  `}
                  title={tab.description} // ✅ Tooltip on hover
                >
                  <Icon
                    className={`
                      -ml-0.5 mr-2 h-5 w-5
                      ${
                        isActive
                          ? "text-primary-500"
                          : "text-gray-400 group-hover:text-gray-500"
                      }
                    `}
                  />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ✅ Optional: Active Tab Description */}
        {activeTabInfo?.description && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-600">{activeTabInfo.description}</p>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6">
          {ActiveComponent ? (
            <ActiveComponent />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Tab content not found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;
