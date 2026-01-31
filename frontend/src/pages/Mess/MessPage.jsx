// src/pages/Mess/MessPage.jsx
import React, { useState } from "react";
import {
  UtensilsCrossed,
  BarChart3,
  Calendar,
  FileText,
  History,
  Settings,
  Coffee,
} from "lucide-react";

import DailyMarkingTab from "../../components/Mess/DailyMarkingTab";
import ReportsTab from "../../components/Mess/ReportsTab";
import MessOffTab from "../../components/Mess/MessOffTab";
import HistoryTab from "../../components/Mess/HistoryTab";
import SettingsTab from "../../components/Mess/SettingsTab";

const MessPage = () => {
  const [activeTab, setActiveTab] = useState("daily");

  const tabs = [
    {
      id: "daily",
      name: "Daily Marking",
      icon: UtensilsCrossed,
      component: DailyMarkingTab,
      description:
        "Mark student meal attendance for breakfast, lunch, snacks, and dinner",
    },
    {
      id: "reports",
      name: "Reports",
      icon: BarChart3,
      component: ReportsTab,
      description: "Generate mess reports and analytics",
    },

    {
      id: "messoff",
      name: "Mess-Off",
      icon: Coffee,
      component: MessOffTab,
      description: "Manage student mess-off applications",
    },
    {
      id: "history",
      name: "History",
      icon: History,
      component: HistoryTab,
      description: "View detailed mess attendance history",
    },
    {
      id: "settings",
      name: "Settings",
      icon: Settings,
      component: SettingsTab,
      description: "Configure mess system settings",
    },
  ];

  const ActiveComponent = tabs.find((tab) => tab.id === activeTab)?.component;
  const activeTabInfo = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mess Management</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage student meal attendance, plans, mess-off applications, and
          reports
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

export default MessPage;
