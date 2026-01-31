// src/pages/StudentBank/components/ReportsTab.jsx
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { studentBankAPI } from "../../../services/api";
import {
    Calendar,
    Download,
    TrendingUp,
    TrendingDown,
    DollarSign,
    RefreshCw,
    BarChart3,
} from "lucide-react";
import LoadingSpinner from "../../../components/UI/LoadingSpinner";

const ReportsTab = () => {
    const [loading, setLoading] = useState(false);
    const [reportDate, setReportDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [reportData, setReportData] = useState(null);

    useEffect(() => {
        fetchDailyReport();
    }, [reportDate]);

    const fetchDailyReport = async () => {
        try {
            setLoading(true);
            const response = await studentBankAPI.getDailyReport({ date: reportDate });
            setReportData(response.data.summary || null);
        } catch (error) {
            console.error("Failed to fetch report:", error);
            toast.error("Failed to load report");
        } finally {
            setLoading(false);
        }
    };

    const exportReport = () => {
        if (!reportData) {
            toast.error("No data to export");
            return;
        }

        const csvContent = [
            ["Student Bank Daily Report"],
            ["Date", reportDate],
            [""],
            ["Metric", "Value"],
            ["Total Credits", `₹${reportData.totalCredits || 0}`],
            ["Total Debits", `₹${reportData.totalDebits || 0}`],
            ["Net Flow", `₹${reportData.netFlow || 0}`],
            ["Credit Transactions", reportData.creditTransactions || 0],
            ["Debit Transactions", reportData.debitTransactions || 0],
            ["Total Transactions", reportData.totalTransactions || 0],
        ]
            .map((row) => row.join(","))
            .join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bank-report-${reportDate}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        toast.success("Report exported successfully");
    };

    return (
        <div className="space-y-4">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                        <div className="bg-indigo-100 rounded-full p-2 mr-3">
                            <BarChart3 className="h-5 w-5 text-indigo-600" />
                        </div>
                        Daily Reports
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        View daily transaction summaries and analytics
                    </p>
                </div>

                <button
                    onClick={exportReport}
                    disabled={!reportData || loading}
                    className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center"
                >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                </button>
            </div>

            {/* Date Selector */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 transition-all hover:shadow-xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                            <Calendar className="h-4 w-4 inline mr-1" />
                            Select Report Date
                        </label>
                        <input
                            type="date"
                            value={reportDate}
                            onChange={(e) => setReportDate(e.target.value)}
                            max={new Date().toISOString().split("T")[0]}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-indigo-400"
                        />
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={fetchDailyReport}
                            disabled={loading}
                            className="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center justify-center"
                        >
                            <RefreshCw
                                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                            />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Report Content */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <LoadingSpinner size="lg" />
                </div>
            ) : reportData ? (
                <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Total Credits */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 transition-all hover:shadow-xl hover:scale-105">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-gray-600">Total Credits</p>
                                    <p className="text-2xl font-bold text-green-600 mt-1">
                                        ₹{reportData.totalCredits?.toLocaleString() || 0}
                                    </p>
                                    <p className="text-xs font-semibold text-gray-500 mt-1">
                                        {reportData.creditTransactions || 0} transactions
                                    </p>
                                </div>
                                <div className="h-10 w-10 bg-green-50 rounded-xl flex items-center justify-center">
                                    <TrendingUp className="h-5 w-5 text-green-600" />
                                </div>
                            </div>
                        </div>

                        {/* Total Debits */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 transition-all hover:shadow-xl hover:scale-105">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-gray-600">Total Debits</p>
                                    <p className="text-2xl font-bold text-red-600 mt-1">
                                        ₹{reportData.totalDebits?.toLocaleString() || 0}
                                    </p>
                                    <p className="text-xs font-semibold text-gray-500 mt-1">
                                        {reportData.debitTransactions || 0} transactions
                                    </p>
                                </div>
                                <div className="h-10 w-10 bg-red-50 rounded-xl flex items-center justify-center">
                                    <TrendingDown className="h-5 w-5 text-red-600" />
                                </div>
                            </div>
                        </div>

                        {/* Net Flow */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 transition-all hover:shadow-xl hover:scale-105">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-gray-600">Net Flow</p>
                                    <p
                                        className={`text-2xl font-bold mt-1 ${reportData.netFlow >= 0
                                            ? "text-blue-600"
                                            : "text-orange-600"
                                            }`}
                                    >
                                        ₹{reportData.netFlow?.toLocaleString() || 0}
                                    </p>
                                    <p className="text-xs font-semibold text-gray-500 mt-1">
                                        {reportData.totalTransactions || 0} total transactions
                                    </p>
                                </div>
                                <div
                                    className={`h-10 w-10 rounded-xl flex items-center justify-center ${reportData.netFlow >= 0 ? "bg-blue-50" : "bg-orange-50"
                                        }`}
                                >
                                    <DollarSign
                                        className={`h-5 w-5 ${reportData.netFlow >= 0
                                            ? "text-blue-600"
                                            : "text-orange-600"
                                            }`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Breakdown Table */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden transition-all hover:shadow-xl">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center">
                                <div className="bg-indigo-100 rounded-full p-2 mr-3">
                                    <BarChart3 className="h-5 w-5 text-indigo-600" />
                                </div>
                                Transaction Breakdown
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Metric</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Value</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    <tr className="transition-all hover:bg-indigo-50">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
                                                <span className="text-sm font-semibold text-gray-900">Total Credit Transactions</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-green-600">
                                            {reportData.creditTransactions || 0}
                                        </td>
                                    </tr>
                                    <tr className="transition-all hover:bg-indigo-50">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <TrendingDown className="h-4 w-4 text-red-600 mr-2" />
                                                <span className="text-sm font-semibold text-gray-900">Total Debit Transactions</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-red-600">
                                            {reportData.debitTransactions || 0}
                                        </td>
                                    </tr>
                                    <tr className="transition-all hover:bg-indigo-50">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <DollarSign className="h-4 w-4 text-gray-600 mr-2" />
                                                <span className="text-sm font-semibold text-gray-900">Average Transaction Amount</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-gray-900">
                                            ₹
                                            {reportData.totalTransactions > 0
                                                ? (
                                                    (reportData.totalCredits + reportData.totalDebits) /
                                                    reportData.totalTransactions
                                                ).toFixed(2)
                                                : 0}
                                        </td>
                                    </tr>
                                    <tr className="transition-all hover:bg-indigo-50 bg-gradient-to-r from-indigo-50 to-blue-50">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <BarChart3 className="h-4 w-4 text-indigo-600 mr-2" />
                                                <span className="text-sm font-bold text-indigo-900">Net Cash Flow</span>
                                            </div>
                                        </td>
                                        <td
                                            className={`px-4 py-3 whitespace-nowrap text-right font-bold text-lg ${reportData.netFlow >= 0
                                                ? "text-green-600"
                                                : "text-red-600"
                                                }`}
                                        >
                                            ₹{reportData.netFlow?.toLocaleString() || 0}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Additional Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-lg p-4 transition-all hover:shadow-xl">
                            <h4 className="text-sm font-bold text-green-900 mb-3 flex items-center">
                                <TrendingUp className="h-4 w-4 mr-2" />
                                Credits Summary
                            </h4>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-semibold text-green-700">Total Amount:</span>
                                    <span className="font-bold text-green-900">
                                        ₹{reportData.totalCredits?.toLocaleString() || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="font-semibold text-green-700">Count:</span>
                                    <span className="font-bold text-green-900">
                                        {reportData.creditTransactions || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="font-semibold text-green-700">Average per Txn:</span>
                                    <span className="font-bold text-green-900">
                                        ₹
                                        {reportData.creditTransactions > 0
                                            ? (
                                                reportData.totalCredits /
                                                reportData.creditTransactions
                                            ).toFixed(2)
                                            : 0}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl shadow-lg p-4 transition-all hover:shadow-xl">
                            <h4 className="text-sm font-bold text-red-900 mb-3 flex items-center">
                                <TrendingDown className="h-4 w-4 mr-2" />
                                Debits Summary
                            </h4>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-semibold text-red-700">Total Amount:</span>
                                    <span className="font-bold text-red-900">
                                        ₹{reportData.totalDebits?.toLocaleString() || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="font-semibold text-red-700">Count:</span>
                                    <span className="font-bold text-red-900">
                                        {reportData.debitTransactions || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="font-semibold text-red-700">Average per Txn:</span>
                                    <span className="font-bold text-red-900">
                                        ₹
                                        {reportData.debitTransactions > 0
                                            ? (
                                                reportData.totalDebits / reportData.debitTransactions
                                            ).toFixed(2)
                                            : 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-12 text-center transition-all hover:shadow-xl">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-bold text-gray-900">
                        No data available for selected date
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-gray-500">
                        Try selecting a different date
                    </p>
                </div>
            )}
        </div>
    );
};

export default ReportsTab;
