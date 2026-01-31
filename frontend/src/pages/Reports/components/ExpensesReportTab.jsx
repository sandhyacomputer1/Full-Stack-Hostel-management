// src/pages/Reports/components/ExpensesReportTab.jsx
import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsAPI } from "../../../services/api";
import {
    DollarSign,
    TrendingUp,
    Calendar,
    Download,
    Filter,
    PieChart,
    BarChart3,
    AlertCircle,
} from "lucide-react";
import LoadingSpinner from "../../../components/UI/LoadingSpinner";
import toast from "react-hot-toast";

const style = document.createElement("style");
style.textContent = `
    @keyframes slideInUp {
        from {
            opacity: 0;
            transform: translateY(26px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .animate-slide-in {
        animation: slideInUp 0.65s ease-out;
    }
`;
document.head.appendChild(style);

const ExpensesReportTab = () => {
    const [reportType, setReportType] = useState("summary"); // summary, category, monthly, vendor
    const [filters, setFilters] = useState({
        startDate: new Date(new Date().setDate(1)).toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
        category: "",
        paymentMode: "",
        status: "active",
    });
    const [loading, setLoading] = useState(false);
    const [visibleSections, setVisibleSections] = useState(new Set());
    const sectionRefs = useRef({});

    // Fetch report data
    const { data: reportData, isLoading } = useQuery({
        queryKey: ["expenses-report", reportType, filters],
        queryFn: () => reportsAPI.getExpensesReport({ reportType, ...filters }),
    });

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisibleSections((prev) => new Set([...prev, entry.target.dataset.section]));
                }
            },
            { threshold: 0.12 }
        );

        Object.keys(sectionRefs.current).forEach((sectionId) => {
            const el = sectionRefs.current[sectionId];
            if (el) observer.observe(el);
        });

        return () => {
            Object.keys(sectionRefs.current).forEach((sectionId) => {
                const el = sectionRefs.current[sectionId];
                if (el) observer.unobserve(el);
            });
            observer.disconnect();
        };
    }, [isLoading, reportType, filters, reportData]);

    const expenses = reportData?.data?.expenses || [];
    const summary = reportData?.data?.summary || {};

    // Category options
    const categories = [
        { value: "food_groceries", label: "Food & Groceries" },
        { value: "maintenance", label: "Maintenance" },
        { value: "utilities", label: "Utilities" },
        { value: "salary", label: "Salary" },
        { value: "rent", label: "Rent" },
        { value: "equipment", label: "Equipment" },
        { value: "cleaning", label: "Cleaning" },
        { value: "security", label: "Security" },
        { value: "medical", label: "Medical" },
        { value: "transportation", label: "Transportation" },
        { value: "office_supplies", label: "Office Supplies" },
        { value: "marketing", label: "Marketing" },
        { value: "legal", label: "Legal" },
        { value: "insurance", label: "Insurance" },
        { value: "other", label: "Other" },
    ];

    // Payment modes
    const paymentModes = [
        { value: "cash", label: "Cash" },
        { value: "card", label: "Card" },
        { value: "upi", label: "UPI" },
        { value: "bank_transfer", label: "Bank Transfer" },
        { value: "cheque", label: "Cheque" },
        { value: "online", label: "Online" },
    ];

    // Export to CSV
    const handleExportCSV = () => {
        if (!expenses || expenses.length === 0) {
            toast.error("No data to export");
            return;
        }

        try {
            const headers = [
                "Date",
                "Category",
                "Description",
                "Amount",
                "Payment Mode",
                "Vendor",
                "Bill Number",
                "Status",
            ];

            const rows = expenses.map((expense) => [
                new Date(expense.date).toLocaleDateString("en-IN"),
                expense.category,
                expense.description,
                expense.amount,
                expense.paymentMode,
                expense.vendor?.name || "—",
                expense.billNumber || "—",
                expense.status,
            ]);

            const csvContent = [
                headers.join(","),
                ...rows.map((row) =>
                    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
                ),
            ].join("\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute(
                "download",
                `expenses_report_${new Date().toISOString().split("T")[0]}.csv`
            );
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("Report exported successfully!");
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to export report");
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                        <div className="bg-indigo-600 rounded-full p-3 mr-3 shadow-lg">
                            <DollarSign className="h-6 w-6 text-white" />
                        </div>
                        Expenses Reports
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Track and analyze hostel expenses
                    </p>
                </div>

                {expenses.length > 0 && (
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>
                )}
            </div>

            {/* Report Type Selector */}
            <div
                ref={(el) => (sectionRefs.current["filters"] = el)}
                data-section="filters"
                className={`bg-white rounded-xl border border-gray-200 shadow-lg p-5 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${visibleSections.has("filters") ? "animate-slide-in" : ""}`}
            >
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-5 w-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Report Type & Filters</h3>
                </div>

                <div className="space-y-4">
                    {/* Report Type Buttons */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setReportType("summary")}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${reportType === "summary"
                                    ? "bg-indigo-600 text-white shadow-lg"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            Summary
                        </button>
                        <button
                            onClick={() => setReportType("category")}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${reportType === "category"
                                    ? "bg-indigo-600 text-white shadow-lg"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            By Category
                        </button>
                        <button
                            onClick={() => setReportType("monthly")}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${reportType === "monthly"
                                    ? "bg-indigo-600 text-white shadow-lg"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            Monthly Breakdown
                        </button>
                        <button
                            onClick={() => setReportType("vendor")}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${reportType === "vendor"
                                    ? "bg-indigo-600 text-white shadow-lg"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            By Vendor
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {/* Date Range */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) =>
                                    setFilters({ ...filters, startDate: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) =>
                                    setFilters({ ...filters, endDate: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Category
                            </label>
                            <select
                                value={filters.category}
                                onChange={(e) =>
                                    setFilters({ ...filters, category: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">All Categories</option>
                                {categories.map((cat) => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Payment Mode */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Payment Mode
                            </label>
                            <select
                                value={filters.paymentMode}
                                onChange={(e) =>
                                    setFilters({ ...filters, paymentMode: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">All Modes</option>
                                {paymentModes.map((mode) => (
                                    <option key={mode.value} value={mode.value}>
                                        {mode.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Status
                            </label>
                            <select
                                value={filters.status}
                                onChange={(e) =>
                                    setFilters({ ...filters, status: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">All Status</option>
                                <option value="active">Active</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="refunded">Refunded</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div
                    ref={(el) => (sectionRefs.current["summary"] = el)}
                    data-section="summary"
                    className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${visibleSections.has("summary") ? "animate-slide-in" : ""}`}
                >
                    <ExpensesStatCard
                        label="Total Expenses"
                        value={`₹${(summary.totalAmount || 0).toLocaleString()}`}
                        icon={DollarSign}
                        color="bg-red-500"
                    />
                    <ExpensesStatCard
                        label="Total Transactions"
                        value={summary.totalTransactions || 0}
                        icon={BarChart3}
                        color="bg-blue-500"
                    />
                    <ExpensesStatCard
                        label="Average Expense"
                        value={`₹${(summary.averageAmount || 0).toLocaleString()}`}
                        icon={TrendingUp}
                        color="bg-purple-500"
                    />
                    <ExpensesStatCard
                        label="Categories"
                        value={summary.categoriesCount || 0}
                        icon={PieChart}
                        color="bg-green-500"
                    />
                </div>
            )}

            {/* Report Content Based on Type */}
            {reportType === "summary" && (
                <div
                    ref={(el) => (sectionRefs.current["content-summary"] = el)}
                    data-section="content-summary"
                    className={`${visibleSections.has("content-summary") ? "animate-slide-in" : ""}`}
                >
                    <SummaryReport expenses={expenses} summary={summary} />
                </div>
            )}

            {reportType === "category" && (
                <div
                    ref={(el) => (sectionRefs.current["content-category"] = el)}
                    data-section="content-category"
                    className={`${visibleSections.has("content-category") ? "animate-slide-in" : ""}`}
                >
                    <CategoryReport expenses={expenses} categories={categories} />
                </div>
            )}

            {reportType === "monthly" && (
                <div
                    ref={(el) => (sectionRefs.current["content-monthly"] = el)}
                    data-section="content-monthly"
                    className={`${visibleSections.has("content-monthly") ? "animate-slide-in" : ""}`}
                >
                    <MonthlyReport expenses={expenses} />
                </div>
            )}

            {reportType === "vendor" && (
                <div
                    ref={(el) => (sectionRefs.current["content-vendor"] = el)}
                    data-section="content-vendor"
                    className={`${visibleSections.has("content-vendor") ? "animate-slide-in" : ""}`}
                >
                    <VendorReport expenses={expenses} />
                </div>
            )}

            {/* Empty State */}
            {!loading && expenses.length === 0 && (
                <div
                    ref={(el) => (sectionRefs.current["empty"] = el)}
                    data-section="empty"
                    className={`text-center py-12 bg-white rounded-xl border border-gray-200 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${visibleSections.has("empty") ? "animate-slide-in" : ""}`}
                >
                    <AlertCircle className="mx-auto h-16 w-16 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                        No Expenses Found
                    </h3>
                    <p className="mt-2 text-sm text-gray-600">
                        Try adjusting your filters to see expenses
                    </p>
                </div>
            )}
        </div>
    );
};

// =====================================================
// SUMMARY REPORT COMPONENT
// =====================================================
const SummaryReport = ({ expenses, summary }) => {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01]">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Expenses Summary ({expenses.length} transactions)
            </h3>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                                Date
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                                Category
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                                Description
                            </th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                                Amount
                            </th>
                            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                                Payment
                            </th>
                            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {expenses.map((expense, index) => (
                            <tr key={index} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4 text-sm text-gray-900">
                                    {new Date(expense.date).toLocaleDateString("en-IN")}
                                </td>
                                <td className="py-3 px-4">
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                                        {expense.category?.replace(/_/g, " ").toUpperCase()}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-700">
                                    {expense.description}
                                    {expense.vendor?.name && (
                                        <div className="text-xs text-gray-500 mt-1">
                                            Vendor: {expense.vendor.name}
                                        </div>
                                    )}
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-red-600">
                                    ₹{expense.amount.toLocaleString()}
                                </td>
                                <td className="py-3 px-4 text-center text-xs text-gray-600">
                                    {expense.paymentMode?.toUpperCase()}
                                </td>
                                <td className="py-3 px-4 text-center">
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-bold ${expense.status === "active"
                                                ? "bg-green-100 text-green-800"
                                                : expense.status === "cancelled"
                                                    ? "bg-red-100 text-red-800"
                                                    : "bg-yellow-100 text-yellow-800"
                                            }`}
                                    >
                                        {expense.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// =====================================================
// CATEGORY REPORT COMPONENT
// =====================================================
const CategoryReport = ({ expenses, categories }) => {
    const categoryTotals = expenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
    }, {});

    const categoryData = Object.entries(categoryTotals)
        .map(([category, amount]) => ({
            category,
            amount,
            label:
                categories.find((c) => c.value === category)?.label ||
                category.replace(/_/g, " "),
            count: expenses.filter((e) => e.category === category).length,
        }))
        .sort((a, b) => b.amount - a.amount);

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01]">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Expenses by Category
            </h3>

            <div className="space-y-4">
                {categoryData.map((item, index) => (
                    <div
                        key={index}
                        className="p-4 border border-gray-200 rounded-xl shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01]"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h4 className="font-semibold text-gray-900">{item.label}</h4>
                                <p className="text-sm text-gray-600">
                                    {item.count} transactions
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-red-600">
                                    ₹{item.amount.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-red-600 h-2 rounded-full"
                                style={{
                                    width: `${(item.amount /
                                            Math.max(...categoryData.map((c) => c.amount))) *
                                        100
                                        }%`,
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// =====================================================
// MONTHLY REPORT COMPONENT
// =====================================================
const MonthlyReport = ({ expenses }) => {
    const monthlyTotals = expenses.reduce((acc, expense) => {
        const month = new Date(expense.date).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "long",
        });
        if (!acc[month]) {
            acc[month] = { total: 0, count: 0, expenses: [] };
        }
        acc[month].total += expense.amount;
        acc[month].count += 1;
        acc[month].expenses.push(expense);
        return acc;
    }, {});

    return (
        <div className="space-y-4">
            {Object.entries(monthlyTotals)
                .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                .map(([month, data]) => (
                    <div
                        key={month}
                        className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01]"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">{month}</h3>
                                <p className="text-sm text-gray-600">
                                    {data.count} transactions
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-red-600">
                                    ₹{data.total.toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-600">
                                    Avg: ₹{Math.round(data.total / data.count).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700">
                                            Date
                                        </th>
                                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700">
                                            Category
                                        </th>
                                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700">
                                            Description
                                        </th>
                                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-700">
                                            Amount
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.expenses.map((expense, idx) => (
                                        <tr key={idx} className="border-b hover:bg-gray-50">
                                            <td className="py-2 px-3 text-xs text-gray-900">
                                                {new Date(expense.date).toLocaleDateString("en-IN")}
                                            </td>
                                            <td className="py-2 px-3 text-xs">
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                                    {expense.category.replace(/_/g, " ")}
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 text-xs text-gray-700">
                                                {expense.description}
                                            </td>
                                            <td className="py-2 px-3 text-right text-xs font-bold text-red-600">
                                                ₹{expense.amount.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
        </div>
    );
};

// =====================================================
// VENDOR REPORT COMPONENT
// =====================================================
const VendorReport = ({ expenses }) => {
    const vendorTotals = expenses
        .filter((e) => e.vendor?.name)
        .reduce((acc, expense) => {
            const vendorName = expense.vendor.name;
            if (!acc[vendorName]) {
                acc[vendorName] = {
                    total: 0,
                    count: 0,
                    contact: expense.vendor.contact,
                };
            }
            acc[vendorName].total += expense.amount;
            acc[vendorName].count += 1;
            return acc;
        }, {});

    const vendorData = Object.entries(vendorTotals)
        .map(([vendor, data]) => ({
            vendor,
            ...data,
        }))
        .sort((a, b) => b.total - a.total);

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01]">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Expenses by Vendor
            </h3>

            <div className="space-y-3">
                {vendorData.length === 0 ? (
                    <p className="text-center text-gray-600 py-8">
                        No vendor information available
                    </p>
                ) : (
                    vendorData.map((item, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-xl shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01]"
                        >
                            <div>
                                <h4 className="font-semibold text-gray-900">{item.vendor}</h4>
                                <p className="text-sm text-gray-600">
                                    {item.count} transactions
                                    {item.contact && ` • ${item.contact}`}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold text-red-600">
                                    ₹{item.total.toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-600">
                                    Avg: ₹{Math.round(item.total / item.count).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// =====================================================
// STAT CARD COMPONENT
// =====================================================
const ExpensesStatCard = ({ label, value, icon: Icon, color }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01]">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm text-gray-600 font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
            <div className={`${color} p-3 rounded-xl shadow-sm`}>
                <Icon className="h-6 w-6 text-white" />
            </div>
        </div>
    </div>
);

export default ExpensesReportTab;
