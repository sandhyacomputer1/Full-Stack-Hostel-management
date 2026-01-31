// src/pages/Analytics/components/FeesAnalyticsTab.jsx
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsAPI } from "../../../services/api";
import BarChartCard from "../../../components/Analytics/BarChartCard";
import PieChartCard from "../../../components/Analytics/PieChartCard";
import MetricCard from "../../../components/Analytics/MetricCard";
import LoadingSpinner from "../../../components/UI/LoadingSpinner";
import { DollarSign, TrendingDown, AlertCircle, Filter, TrendingUp, Users } from "lucide-react";

const FeesAnalyticsTab = () => {
    const [filters, setFilters] = useState({
        class: "",
        block: "",
    });

    const { data: feesData, isLoading, error } = useQuery({
        queryKey: ["fees-analytics", filters],
        queryFn: async () => {
            const response = await analyticsAPI.getFeesCollection(filters);
            console.log("💰 Fees Response:", response);
            return response;
        },
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600 font-semibold mb-2">Failed to load fees data</p>
                    <p className="text-gray-600 text-sm">{error.message}</p>
                </div>
            </div>
        );
    }

    // ✅ FIX: Correct data extraction
    const apiData = feesData?.data?.data || feesData?.data || {};
    const records = apiData.records || [];
    const summary = apiData.summary || {};

    console.log("💵 Records:", records.length);
    console.log("📊 Summary:", summary);

    // Chart data - Collection vs Pending
    const collectionPieData = [
        { name: "Collected", value: summary.totalCollected || 0 },
        { name: "Pending", value: summary.totalPending || 0 },
    ];

    // ✅ FIX: Use correct status field names from backend
    const statusPieData = [
        { name: "Fully Paid", value: summary.paidCount || 0 },
        { name: "Partial Payment", value: summary.partialCount || 0 },
        { name: "Not Paid", value: summary.pendingCount || 0 },
    ];

    // Top 10 defaulters (highest pending amounts)
    const top10Defaulters = records
        .filter((s) => s.amountPending > 0)
        .sort((a, b) => b.amountPending - a.amountPending)
        .slice(0, 10)
        .map((s) => ({
            name: s.studentName?.split(" ")[0] || "Unknown",
            pending: s.amountPending,
        }));

    // Class-wise fee collection
    const classWiseFees = records
        .reduce((acc, student) => {
            const className = student.class || "Unknown";
            const existing = acc.find((item) => item.name === className);
            if (existing) {
                existing.collected += student.amountPaid || 0;
                existing.pending += student.amountPending || 0;
            } else {
                acc.push({
                    name: className,
                    collected: student.amountPaid || 0,
                    pending: student.amountPending || 0,
                });
            }
            return acc;
        }, [])
        .sort((a, b) => (b.collected + b.pending) - (a.collected + a.pending));

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-4 transform hover:scale-[1.01]">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-5 w-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Filters</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Class (Optional)
                        </label>
                        <select
                            value={filters.class}
                            onChange={(e) => setFilters({ ...filters, class: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
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
                            Block (Optional)
                        </label>
                        <select
                            value={filters.block}
                            onChange={(e) => setFilters({ ...filters, block: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        >
                            <option value="">All Blocks</option>
                            <option value="A">Block A</option>
                            <option value="B">Block B</option>
                            <option value="C">Block C</option>
                            <option value="D">Block D</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                    label="Total Expected"
                    value={`₹${(summary.totalExpected || 0).toLocaleString()}`}
                    icon={DollarSign}
                    color="bg-blue-500"
                />
                <MetricCard
                    label="Total Collected"
                    value={`₹${(summary.totalCollected || 0).toLocaleString()}`}
                    icon={TrendingUp}
                    color="bg-green-500"
                />
                <MetricCard
                    label="Total Pending"
                    value={`₹${(summary.totalPending || 0).toLocaleString()}`}
                    icon={TrendingDown}
                    color="bg-yellow-500"
                />
                <MetricCard
                    label="Collection Rate"
                    value={`${summary.collectionRate || 0}%`}
                    icon={Users}
                    color="bg-purple-500"
                />
            </div>

            {/* Collection Rate Progress */}
            <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Overall Collection Rate
                    </h3>
                    <span className="text-2xl font-bold text-gray-900">
                        {summary.collectionRate || 0}%
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-6">
                    <div
                        className={`h-6 rounded-full flex items-center justify-end pr-3 text-white text-sm font-bold transition-all ${summary.collectionRate >= 80
                                ? "bg-green-600"
                                : summary.collectionRate >= 50
                                    ? "bg-yellow-600"
                                    : "bg-red-600"
                            }`}
                        style={{ width: `${Math.max(summary.collectionRate || 0, 5)}%` }}
                    >
                        {summary.collectionRate >= 15 && `${summary.collectionRate}%`}
                    </div>
                </div>
                <div className="flex justify-between mt-2 text-sm text-gray-600">
                    <span>₹{(summary.totalCollected || 0).toLocaleString()} collected</span>
                    <span>₹{(summary.totalPending || 0).toLocaleString()} pending</span>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {collectionPieData.some((d) => d.value > 0) && (
                    <PieChartCard
                        title="Collection vs Pending"
                        data={collectionPieData}
                        colors={["#10b981", "#f59e0b"]}
                        height={350}
                    />
                )}

                {statusPieData.some((d) => d.value > 0) && (
                    <PieChartCard
                        title="Payment Status Distribution"
                        data={statusPieData}
                        colors={["#10b981", "#f59e0b", "#ef4444"]}
                        height={350}
                    />
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {top10Defaulters.length > 0 && (
                    <BarChartCard
                        title="Top 10 Pending Payments"
                        data={top10Defaulters}
                        dataKeys={["pending"]}
                        colors={["#ef4444"]}
                        height={350}
                    />
                )}

                {classWiseFees.length > 0 && (
                    <BarChartCard
                        title="Class-wise Fee Collection"
                        data={classWiseFees}
                        dataKeys={["collected", "pending"]}
                        colors={["#10b981", "#f59e0b"]}
                        height={350}
                    />
                )}
            </div>

            {/* Student Details Table */}
            {records.length > 0 && (
                <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Student Fee Details ({records.length})
                    </h3>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                        Student
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                        Roll No
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                        Class
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                                        Total Fee
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                                        Paid
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                                        Pending
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {records.map((student, index) => (
                                    <tr key={student.studentId || index} className="hover:bg-gray-50 hover:shadow-md transition-all duration-200 border border-transparent hover:border-indigo-100">
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {student.studentName}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {student.studentIdNumber}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">
                                            {student.rollNumber}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">
                                            {student.class}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                                            ₹{student.totalFee.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right text-green-600 font-medium">
                                            ₹{student.amountPaid.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right text-red-600 font-medium">
                                            ₹{student.amountPending.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span
                                                className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${student.status === "paid"
                                                        ? "bg-green-100 text-green-800"
                                                        : student.status === "partial"
                                                            ? "bg-yellow-100 text-yellow-800"
                                                            : "bg-red-100 text-red-800"
                                                    }`}
                                            >
                                                {student.status === "paid"
                                                    ? "Paid"
                                                    : student.status === "partial"
                                                        ? "Partial"
                                                        : "Pending"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Payment Status Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Fully Paid</p>
                            <p className="text-2xl font-bold text-green-600">
                                {summary.paidCount || 0}
                            </p>
                        </div>
                        <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Partial Payment</p>
                            <p className="text-2xl font-bold text-yellow-600">
                                {summary.partialCount || 0}
                            </p>
                        </div>
                        <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                            <DollarSign className="h-6 w-6 text-yellow-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Not Paid</p>
                            <p className="text-2xl font-bold text-red-600">
                                {summary.pendingCount || 0}
                            </p>
                        </div>
                        <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeesAnalyticsTab;
