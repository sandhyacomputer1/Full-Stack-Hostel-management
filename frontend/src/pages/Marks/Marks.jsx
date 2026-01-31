// src/pages/Marks/MarksPage.jsx
import React, { useState } from "react";
import {
  ClipboardList,
  BarChart3,
  FileSpreadsheet,
  Settings,
} from "lucide-react";

import MarksMarkingTab from "../../components/Marks/MarksMarkingTab";
import MarksReportTab from "../../components/Marks/MarksReportTab";
import MarksBulkTab from "../../components/Marks/MarksBulkTab";
import MarksSettingTab from "../../components/Marks/MarksSettingTab";

const MarksPage = () => {
  const [activeTab, setActiveTab] = useState("marking");

  const tabs = [
    {
      id: "marking",
      name: "Marks Entry",
      icon: ClipboardList,
      component: MarksMarkingTab,
      description: "Add, edit and view exam marks.",
    },
    {
      id: "reports",
      name: "Reports",
      icon: BarChart3,
      component: MarksReportTab,
      description: "Search students and view marks performance.",
    },
    {
      id: "bulk",
      name: "Bulk Upload",
      icon: FileSpreadsheet,
      component: MarksBulkTab,
      description: "Upload marks from CSV in bulk.",
    },
    {
      id: "settings",
      name: "Settings",
      icon: Settings,
      component: MarksSettingTab,
      description: "Configure grading rules and defaults.",
    },
  ];

  const ActiveComponent = tabs.find((t) => t.id === activeTab)?.component;
  const activeTabInfo = tabs.find((t) => t.id === activeTab);

  return (
    <div className="space-y-8">
      {/* Professional Page Header */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary-100">
            <ClipboardList className="h-6 w-6 text-primary-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Marks Management</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage student exam marks, reports, bulk uploads and settings.
            </p>
          </div>
        </div>
      </div>

      {/* Professional Tabs Container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Tabs nav */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center py-4 px-8 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? "border-primary-500 text-primary-600 bg-primary-50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                  title={tab.description}
                >
                  <Icon
                    className={`-ml-0.5 mr-2 h-5 w-5 transition-colors duration-200 ${
                      isActive
                        ? "text-primary-600"
                        : "text-gray-400 group-hover:text-gray-500"
                    }`}
                  />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab description */}
        {activeTabInfo?.description && (
          <div className="px-8 py-4 bg-gradient-to-r from-primary-50 to-blue-50 border-b border-primary-100">
            <p className="text-sm text-primary-700 font-medium">{activeTabInfo.description}</p>
          </div>
        )}

        {/* Active tab content */}
        <div className="p-8">
          {ActiveComponent ? (
            <ActiveComponent />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Tab content not found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarksPage;
