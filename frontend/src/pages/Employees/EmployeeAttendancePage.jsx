import React, { useState } from "react";
import {
  Calendar,
  BarChart3,
  AlertTriangle,
  History,
  Settings,
  FileSpreadsheet,
  Umbrella,
} from "lucide-react";

import DailyMarkingTab from "../../components/EmployeeAttendance/DailyMarkingTab";
import ReportTab from "../../components/EmployeeAttendance/ReportTab";
import ReconciliationTab from "../../components/EmployeeAttendance/ReconciliationTab";
import HistoryTab from "../../components/EmployeeAttendance/HistoryTab";
import SettingsTab from "../../components/EmployeeAttendance/SettingsTab";
import LeaveManagementTab from "../../components/EmployeeAttendance/LeaveManagementTab";

const EmployeeAttendancePage = () => {
  const [activeTab, setActiveTab] = useState("daily");

  const tabs = [
    {
      id: "daily",
      name: "Daily Marking",
      icon: Calendar,
      component: DailyMarkingTab,
      description: "Mark employee IN/OUT attendance",
    },
    {
      id: "reports",
      name: "Reports",
      icon: BarChart3,
      component: ReportTab,
      description: "Generate attendance reports and analytics",
    },
    {
      id: "leave",
      name: "Leave Management",
      icon: Umbrella,
      component: LeaveManagementTab,
      description: "Manage employee leave applications",
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
      id: "settings",
      name: "Settings",
      icon: Settings,
      component: SettingsTab,
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
          Employee Attendance Management
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage employee attendance, leave applications, reports, and
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
                  title={tab.description}
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

        {/* Active Tab Description */}
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

export default EmployeeAttendancePage;
