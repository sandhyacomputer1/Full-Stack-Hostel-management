// src/pages/StudentBank/components/OverviewTab.jsx
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { studentBankAPI } from "../../../services/api";
import {
    Wallet,
    Users,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Plus,
    Minus,
    Lock,
    RefreshCw,
    AlertTriangle,
} from "lucide-react";
import LoadingSpinner from "../../../components/UI/LoadingSpinner";
import DepositModal from "../../../components/StudentBank/DepositModal";
import DebitModal from "../../../components/StudentBank/DebitModal";

const OverviewTab = () => {
    const [loading, setLoading] = useState(true);
    const [statistics, setStatistics] = useState(null);
    const [lowBalanceAccounts, setLowBalanceAccounts] = useState([]);

    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showDebitModal, setShowDebitModal] = useState(false);

    useEffect(() => {
        fetchOverviewData();
    }, []);

    const fetchOverviewData = async () => {
        try {
            setLoading(true);

            // Fetch statistics
            const today = new Date().toISOString().split("T")[0];
            const [accountsRes, dailyReportRes] = await Promise.all([
                studentBankAPI.getAllAccounts({ limit: 1000 }),
                studentBankAPI.getDailyReport({ date: today }),
            ]);

            const accounts = accountsRes.data.accounts || [];
            const report = dailyReportRes.data.summary || {};

            // Calculate statistics
            const stats = {
                totalBalance: accountsRes.data.totalLiability || 0,
                activeAccounts: accounts.filter((a) => a.status === "active").length,
                frozenAccounts: accounts.filter((a) => a.status === "frozen").length,
                totalCreditsToday: report.totalCredits || 0,
                totalDebitsToday: report.totalDebits || 0,
                netFlowToday: report.netFlow || 0,
            };

            setStatistics(stats);

            // Get low balance accounts
            const lowBalance = accounts
                .filter((acc) => acc.balance < 100 && acc.status === "active")
                .slice(0, 5);
            setLowBalanceAccounts(lowBalance);
        } catch (error) {
            console.error("Failed to fetch overview data:", error);
            toast.error("Failed to load overview data");
        } finally {
            setLoading(false);
        }
    };

    const handleTransactionSuccess = () => {
        fetchOverviewData();
        setShowDepositModal(false);
        setShowDebitModal(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-3">
                <button
                    onClick={() => setShowDepositModal(true)}
                    className="px-3 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Deposit Money
                </button>
                <button
                    onClick={() => setShowDebitModal(true)}
                    className="px-3 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center"
                >
                    <Minus className="h-4 w-4 mr-2" />
                    Debit Money
                </button>
                <button
                    onClick={fetchOverviewData}
                    className="px-3 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center"
                >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    label="Total Hostel Balance"
                    value={`₹${statistics.totalBalance.toLocaleString()}`}
                    icon={Wallet}
                    color="text-blue-600"
                    bgColor="bg-blue-50"
                />
                <StatCard
                    label="Active Accounts"
                    value={statistics.activeAccounts}
                    icon={Users}
                    color="text-green-600"
                    bgColor="bg-green-50"
                />
                <StatCard
                    label="Frozen Accounts"
                    value={statistics.frozenAccounts}
                    icon={Lock}
                    color="text-yellow-600"
                    bgColor="bg-yellow-50"
                />
            </div>

            {/* Today's Activity */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    label="Credits Today"
                    value={`₹${statistics.totalCreditsToday.toLocaleString()}`}
                    icon={TrendingUp}
                    color="text-green-600"
                    bgColor="bg-green-50"
                />
                <StatCard
                    label="Debits Today"
                    value={`₹${statistics.totalDebitsToday.toLocaleString()}`}
                    icon={TrendingDown}
                    color="text-red-600"
                    bgColor="bg-red-50"
                />
                <StatCard
                    label="Net Flow Today"
                    value={`₹${statistics.netFlowToday.toLocaleString()}`}
                    icon={DollarSign}
                    color={statistics.netFlowToday >= 0 ? "text-green-600" : "text-red-600"}
                    bgColor={statistics.netFlowToday >= 0 ? "bg-green-50" : "bg-red-50"}
                />
            </div>

            {/* Low Balance Alerts */}
            {lowBalanceAccounts.length > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl shadow-lg p-4 transition-all hover:shadow-xl">
                    <div className="flex items-start gap-3">
                        <div className="bg-amber-100 rounded-full p-2">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-base font-bold text-amber-900 mb-2">
                                Low Balance Alert
                            </h3>
                            <p className="text-sm font-semibold text-amber-700 mb-3">
                                {lowBalanceAccounts.length} student{lowBalanceAccounts.length > 1 ? "s have" : " has"} low balance (below ₹100)
                            </p>
                            
                            {/* Professional Table */}
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-md">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Student</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Details</th>
                                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {lowBalanceAccounts.map((account) => (
                                            <tr key={account._id} className="transition-all hover:bg-amber-50">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                                            <Users className="h-4 w-4 text-indigo-600" />
                                                        </div>
                                                        <div className="ml-2">
                                                            <div className="text-sm font-bold text-gray-900">
                                                                {account.student?.name || "Unknown"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="text-xs text-gray-600">
                                                        <div className="font-semibold">{account.student?.studentId}</div>
                                                        <div className="text-xs text-gray-500">Class {account.student?.class}</div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                                    <div className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800 border border-red-200">
                                                        <span className="text-xs font-bold">₹{account.balance?.toFixed(2) || 0}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            {showDepositModal && (
                <DepositModal
                    onClose={() => setShowDepositModal(false)}
                    onSuccess={handleTransactionSuccess}
                />
            )}

            {showDebitModal && (
                <DebitModal
                    onClose={() => setShowDebitModal(false)}
                    onSuccess={handleTransactionSuccess}
                />
            )}
        </div>
    );
};

// Reusable Stat Card Component (matching attendance style)
const StatCard = ({ label, value, icon: Icon, color, bgColor }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 transition-all hover:shadow-xl hover:scale-105">
        <div className="flex items-center justify-between">
            <div className="flex-1">
                <p className="text-sm font-semibold text-gray-600 mb-1">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
            </div>
            <div className={`h-10 w-10 ${bgColor} rounded-xl flex items-center justify-center shadow-md flex-shrink-0 ml-3`}>
                <Icon className={`h-5 w-5 ${color}`} />
            </div>
        </div>
    </div>
);

export default OverviewTab;
