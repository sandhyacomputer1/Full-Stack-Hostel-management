// src/pages/StudentBank/StudentBankPage.jsx
import React, { useState } from "react";
import { Wallet, ArrowLeftRight, TrendingUp, Users, Shield } from "lucide-react";
import OverviewTab from "./components/OverviewTab";
import AccountsTab from "./components/AccountsTab";
import TransactionsTab from "./components/TransactionsTab";
import ReportsTab from "./components/ReportsTab";
import AuditTab from "./components/AuditTab";

const StudentBankPage = () => {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Overview", icon: Wallet },
    { id: "accounts", label: "Accounts", icon: Users },
    { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
    { id: "reports", label: "Reports", icon: TrendingUp },
    { id: "audit", label: "Audit Logs", icon: Shield }, // ✅ Added Audit tab
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <Wallet className="text-blue-600" />
          Student Bank Management
        </h1>
        <p className="text-gray-600 mt-1">
          Manage student wallets, deposits, expenses, and transactions
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-lg shadow-sm mb-4">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 font-medium transition-all
                ${activeTab === tab.id
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                }
              `}
            >
              <tab.icon className="text-lg" size={18} />
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "accounts" && <AccountsTab />}
        {activeTab === "transactions" && <TransactionsTab />}
        {activeTab === "reports" && <ReportsTab />}
        {activeTab === "audit" && <AuditTab />} {/* ✅ Added Audit content */}
      </div>
    </div>
  );
};

export default StudentBankPage;
