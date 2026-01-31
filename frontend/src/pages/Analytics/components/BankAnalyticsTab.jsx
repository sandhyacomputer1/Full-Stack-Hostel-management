// src/pages/Analytics/components/BankAnalyticsTab.jsx
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsAPI } from "../../../services/api";
import BarChartCard from "../../../components/Analytics/BarChartCard";
import PieChartCard from "../../../components/Analytics/PieChartCard";
import StatCard from "../../../components/Analytics/StatCard";
import LoadingSpinner from "../../../components/UI/LoadingSpinner";
import {
    CreditCard,
    TrendingUp,
    AlertTriangle,
    Users,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    Search,
} from "lucide-react";

const BankAnalyticsTab = () => {
    const [filters, setFilters] = useState({
        class: "",
        block: "",
    });
    const [searchTerm, setSearchTerm] = useState("");

    const { data: bankData, isLoading, error } = useQuery({
        queryKey: ["analytics-bank", filters],
        queryFn: async () => {
            console.log("🏦 Fetching Bank Analytics...");
            try {
                const response = await analyticsAPI.getBankAnalytics(filters);
                console.log("✅ Bank Analytics Response:", response.data);
                return response.data;
            } catch (err) {
                console.error("❌ Bank Analytics Error:", err);
                // Return mock data to prevent crashes
                return {
                    data: {
                        accounts: [],
                        summary: {
                            totalBalance: 0,
                            averageBalance: 0,
                            criticalBalanceCount: 0,
                            activeAccounts: 0,
                            maxBalance: 0,
                            minBalance: 0,
                            medianBalance: 0,
                            highBalanceCount: 0,
                            mediumBalanceCount: 0,
                            lowMediumBalanceCount: 0
                        }
                    }
                };
            }
        },
        staleTime: 5 * 60 * 1000,
        retry: 1, // Reduce retry attempts to prevent hanging
        retryDelay: 1000, // Fixed 1 second delay
        refetchOnWindowFocus: false, // Prevent unnecessary refetches
    });

    // Extract data and prepare memoized values immediately after useQuery
    const stats = bankData?.data || {};
    const accounts = stats.accounts || [];
    const summary = stats.summary || {};

    console.log("📊 Bank Analytics Data Received:", bankData);
    console.log("📈 Stats:", stats);
    console.log("👥 Accounts:", accounts);
    console.log("📋 Summary:", summary);

    // Filter accounts based on search term
    const filteredAccounts = useMemo(() => {
        if (!searchTerm) return accounts;
        
        const searchLower = searchTerm.toLowerCase();
        return accounts.filter(account => 
            (account.studentName && account.studentName.toLowerCase().includes(searchLower)) ||
            (account.class && account.class.toLowerCase().includes(searchLower)) ||
            (account.block && account.block.toLowerCase().includes(searchLower)) ||
            (account.rollNumber && account.rollNumber.toLowerCase().includes(searchLower))
        );
    }, [accounts, searchTerm]);

    // Prepare chart data
    const balanceDistributionData = useMemo(() => [
        { name: "High (>₹1000)", value: summary.highBalanceCount || 0 },
        { name: "Medium (₹500-1000)", value: summary.mediumBalanceCount || 0 },
        { name: "Low (₹100-500)", value: summary.lowMediumBalanceCount || 0 },
        { name: "Critical (≤₹100)", value: summary.criticalBalanceCount || 0 },
    ], [summary.highBalanceCount, summary.mediumBalanceCount, summary.lowMediumBalanceCount, summary.criticalBalanceCount]);

    const topAccountsData = useMemo(() => accounts
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 10)
        .map((acc) => ({
            name: acc.studentName || "Unknown",
            balance: acc.balance,
        })), [accounts]);

    const lowBalanceData = useMemo(() => accounts
        .filter((acc) => acc.balance <= 100)
        .slice(0, 10)
        .map((acc) => ({
            name: acc.studentName || "Unknown",
            balance: acc.balance,
        })), [accounts]);

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-4 transform hover:scale-[1.01]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filter by Class
                        </label>
                        <select
                            value={filters.class}
                            onChange={(e) =>
                                setFilters((prev) => ({ ...prev, class: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        >
                            <option value="">All Classes</option>
                            <option value="8th">8th</option>
                            <option value="9th">9th</option>
                            <option value="10th">10th</option>
                            <option value="11th">11th</option>
                            <option value="12th">12th</option>
                            <option value="Undergraduate">Undergraduate</option>
                            <option value="Postgraduate">Postgraduate</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filter by Block
                        </label>
                        <select
                            value={filters.block}
                            onChange={(e) =>
                                setFilters((prev) => ({ ...prev, block: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        >
                            <option value="">All Blocks</option>
                            <option value="A">Block A</option>
                            <option value="B">Block B</option>
                            <option value="C">Block C</option>
                            <option value="D">Block D</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={() => setFilters({ class: "", block: "" })}
                            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 hover:shadow-md border border-transparent hover:border-indigo-100"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    label="Total Balance"
                    value={`₹${(summary.totalBalance || 0).toLocaleString()}`}
                    icon={DollarSign}
                    color="bg-green-500"
                    subtitle="Across all students"
                />
                <StatCard
                    label="Average Balance"
                    value={`₹${Math.round(summary.averageBalance || 0).toLocaleString()}`}
                    icon={TrendingUp}
                    color="bg-blue-500"
                    subtitle="Per student"
                />
                <StatCard
                    label="Low Balance Alert"
                    value={summary.criticalBalanceCount || 0}
                    icon={AlertTriangle}
                    color="bg-red-500"
                    subtitle="≤₹100 balance"
                />
                <StatCard
                    label="Active Accounts"
                    value={summary.activeAccounts || 0}
                    icon={Users}
                    color="bg-purple-500"
                    subtitle="Total students"
                />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Balance Distribution */}
                <PieChartCard
                    title="Balance Distribution"
                    data={balanceDistributionData}
                    colors={["#10b981", "#3b82f6", "#f59e0b", "#ef4444"]}
                    height={300}
                />

                {/* Top 10 Accounts by Balance */}
                {topAccountsData.length > 0 ? (
                    <BarChartCard
                        title="Top 10 Students by Balance"
                        data={topAccountsData}
                        dataKeys={["balance"]}
                        colors={["#10b981"]}
                        height={300}
                    />
                ) : (
                    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Top 10 Students by Balance
                        </h3>
                        <div className="flex items-center justify-center h-[236px]">
                            <p className="text-gray-500 text-sm">No account data available</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Low Balance Students */}
                {lowBalanceData.length > 0 ? (
                    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            Students with Low Balance (≤₹100)
                        </h3>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {lowBalanceData.map((student, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 hover:shadow-md transition-all duration-200 border border-transparent hover:border-red-200"
                                >
                                    <span className="text-sm font-medium text-gray-700">
                                        {student.name}
                                    </span>
                                    <span className="text-sm font-bold text-red-600">
                                        ₹{student.balance.toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Low Balance Students
                        </h3>
                        <div className="flex items-center justify-center h-[300px]">
                            <div className="text-center">
                                <CreditCard className="h-12 w-12 text-green-400 mx-auto mb-3" />
                                <p className="text-green-600 font-medium">All students have sufficient balance!</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Balance Statistics */}
                <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Balance Statistics
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 hover:shadow-md transition-all duration-200 border border-transparent hover:border-green-200">
                            <div className="flex items-center gap-2">
                                <ArrowUpRight className="h-5 w-5 text-green-600" />
                                <span className="text-sm font-medium text-gray-700">
                                    Highest Balance
                                </span>
                            </div>
                            <span className="text-lg font-bold text-green-600">
                                ₹{(summary.maxBalance || 0).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 hover:shadow-md transition-all duration-200 border border-transparent hover:border-red-200">
                            <div className="flex items-center gap-2">
                                <ArrowDownRight className="h-5 w-5 text-red-600" />
                                <span className="text-sm font-medium text-gray-700">
                                    Lowest Balance
                                </span>
                            </div>
                            <span className="text-lg font-bold text-red-600">
                                ₹{(summary.minBalance || 0).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 hover:shadow-md transition-all duration-200 border border-transparent hover:border-blue-200">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-blue-600" />
                                <span className="text-sm font-medium text-gray-700">
                                    Median Balance
                                </span>
                            </div>
                            <span className="text-lg font-bold text-blue-600">
                                ₹{Math.round(summary.medianBalance || 0).toLocaleString()}
                            </span>
                        </div>
                        <div className="pt-3 border-t">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-gray-600">High Balance (&gt;₹1000)</p>
                                    <p className="text-lg font-bold text-green-600">
                                        {summary.highBalanceCount || 0}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Critical (&le;₹100)</p>
                                    <p className="text-lg font-bold text-red-600">
                                        {summary.criticalBalanceCount || 0}
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* All Accounts Table */}
            <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        All Student Bank Accounts
                    </h3>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                    Sr. No
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Student
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Class
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Block
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                    Balance
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredAccounts.slice(0, 20).map((account, index) => (
                                <tr key={index} className="hover:bg-gray-50 hover:shadow-md transition-all duration-200 border border-transparent hover:border-indigo-100">
                                    <td className="px-4 py-3 text-sm text-center font-medium text-gray-600">
                                        {index + 1}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                        {account.studentName || "N/A"}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {account.class || "N/A"}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {account.block || "N/A"}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right font-semibold">
                                        ₹{account.balance.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${account.balance > 1000
                                                ? "bg-green-100 text-green-800"
                                                : account.balance > 500
                                                    ? "bg-blue-100 text-blue-800"
                                                    : account.balance > 100
                                                        ? "bg-yellow-100 text-yellow-800"
                                                        : "bg-red-100 text-red-800"
                                                }`}
                                        >
                                            {account.balance > 1000
                                                ? "High"
                                                : account.balance > 500
                                                    ? "Good"
                                                    : account.balance > 100
                                                        ? "Low"
                                                        : "Critical"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredAccounts.length > 20 && (
                    <p className="text-sm text-gray-500 mt-4 text-center">
                        Showing 20 of {filteredAccounts.length} {filteredAccounts.length === 1 ? 'account' : 'accounts'} {searchTerm && `(filtered from ${accounts.length})`}
                    </p>
                )}
                {filteredAccounts.length === 0 && searchTerm && (
                    <div className="text-center py-8">
                        <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No students found matching "{searchTerm}"</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BankAnalyticsTab;
