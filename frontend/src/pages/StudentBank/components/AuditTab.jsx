// src/pages/StudentBank/components/AuditTab.jsx
import React, { useState, useEffect } from "react";
import {
    Shield,
    Calendar,
    User,
    Activity,
    Filter,
    TrendingUp,
    TrendingDown,
    Lock,
    Unlock,
    RotateCcw,
    DollarSign,
    RefreshCw,
    Download,
} from "lucide-react";
import { studentBankAPI } from "../../../services/api";
import LoadingSpinner from "../../../components/UI/LoadingSpinner";
import toast from "react-hot-toast";

const AuditTab = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [summary, setSummary] = useState(null);
    const [filters, setFilters] = useState({
        action: "",
        startDate: "",
        endDate: "",
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
    });

    useEffect(() => {
        fetchAuditLogs();
        fetchSummary();
    }, [pagination.page]);

    useEffect(() => {
        // Reset to page 1 when filters change
        setPagination((prev) => ({ ...prev, page: 1 }));
        fetchAuditLogs();
    }, [filters]);

    const fetchAuditLogs = async () => {
        try {
            setLoading(true);
            const response = await studentBankAPI.getAuditLogs({
                page: pagination.page,
                limit: pagination.limit,
                ...filters,
            });

            setLogs(response.data.logs || []);
            setPagination((prev) => ({
                ...prev,
                total: response.data.pagination?.total || 0,
            }));
        } catch (error) {
            console.error("Failed to fetch audit logs:", error);
            toast.error("Failed to load audit logs");
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = async () => {
        try {
            const response = await studentBankAPI.getAuditSummary({
                date: new Date().toISOString().split("T")[0],
                period: "daily",
            });
            setSummary(response.data);
        } catch (error) {
            console.error("Failed to fetch summary:", error);
        }
    };

    const handleExport = async () => {
        try {
            setExporting(true);
            toast.loading("Exporting audit logs...");

            // Fetch all logs (no pagination) with filters
            const response = await studentBankAPI.getAuditLogs({
                page: 1,
                limit: 10000, // Get all logs
                ...filters,
            });

            const allLogs = response.data.logs || [];

            if (allLogs.length === 0) {
                toast.dismiss();
                toast.error("No logs to export");
                return;
            }

            // Convert to CSV
            const csvContent = convertToCSV(allLogs);

            // Download
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);

            const fileName = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
            link.setAttribute("href", url);
            link.setAttribute("download", fileName);
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.dismiss();
            toast.success(`Exported ${allLogs.length} logs successfully!`);
        } catch (error) {
            console.error("Export error:", error);
            toast.dismiss();
            toast.error("Failed to export logs");
        } finally {
            setExporting(false);
        }
    };

    const convertToCSV = (data) => {
        const headers = [
            "Timestamp",
            "Action",
            "User Name",
            "User Role",
            "Type",
            "Amount",
            "Category",
            "Balance After",
            "Reason",
        ];

        const rows = data.map((log) => [
            new Date(log.createdAt).toLocaleString("en-IN"),
            log.action || "",
            log.user?.name || "System",
            log.user?.role || "",
            log.payload?.type || "",
            log.payload?.amount || "",
            log.payload?.category || "",
            log.payload?.balanceAfter || "",
            log.reason || "",
        ]);

        const csvRows = [
            headers.join(","),
            ...rows.map((row) =>
                row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
            ),
        ];

        return csvRows.join("\n");
    };

    const getActionIcon = (action) => {
        const icons = {
            payment: TrendingUp,
            refund: TrendingDown,
            freeze: Lock,
            unfreeze: Unlock,
            create: DollarSign,
            update: Activity,
            cancel: RotateCcw,
        };
        const Icon = icons[action] || Activity;
        return <Icon className="h-4 w-4" />;
    };

    const getActionBadge = (action) => {
        const badges = {
            payment: "bg-green-100 text-green-800",
            refund: "bg-orange-100 text-orange-800",
            freeze: "bg-red-100 text-red-800",
            unfreeze: "bg-blue-100 text-blue-800",
            create: "bg-purple-100 text-purple-800",
            update: "bg-gray-100 text-gray-800",
            cancel: "bg-red-100 text-red-800",
        };
        return badges[action] || "bg-gray-100 text-gray-800";
    };

    const handleClearFilters = () => {
        setFilters({ action: "", startDate: "", endDate: "" });
    };

    const handleRefresh = () => {
        fetchAuditLogs();
        fetchSummary();
        toast.success("Refreshed!");
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="bg-indigo-100 rounded-full p-2">
                            <Shield className="h-5 w-5 text-indigo-600" />
                        </div>
                        Audit Logs
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Complete activity trail of all banking operations
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleRefresh}
                        className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center gap-2"
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exporting || logs.length === 0}
                        className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center gap-2"
                    >
                        <Download className="h-4 w-4" />
                        {exporting ? "Exporting..." : "Export CSV"}
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 transition-all hover:shadow-xl hover:scale-105">
                        <p className="text-sm font-semibold text-gray-600">
                            Total Actions Today
                        </p>
                        <p className="text-2xl font-bold text-indigo-600 mt-1">
                            {summary.totalActions}
                        </p>
                    </div>
                    {summary.actionSummary?.slice(0, 3).map((item, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 transition-all hover:shadow-xl hover:scale-105"
                        >
                            <p className="text-sm font-semibold text-gray-600 capitalize">
                                {item._id}
                            </p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {item.count}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 transition-all hover:shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-bold text-gray-900">Filters</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                            Action Type
                        </label>
                        <select
                            value={filters.action}
                            onChange={(e) =>
                                setFilters({ ...filters, action: e.target.value })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-indigo-400"
                        >
                            <option value="">All Actions</option>
                            <option value="payment">Payment</option>
                            <option value="refund">Refund</option>
                            <option value="freeze">Freeze</option>
                            <option value="unfreeze">Unfreeze</option>
                            <option value="create">Create</option>
                            <option value="update">Update</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) =>
                                setFilters({ ...filters, startDate: e.target.value })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-indigo-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                            End Date
                        </label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) =>
                                setFilters({ ...filters, endDate: e.target.value })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-indigo-400"
                        />
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={handleClearFilters}
                            className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden transition-all hover:shadow-xl">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <LoadingSpinner size="lg" />
                    </div>
                ) : logs.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                                        Timestamp
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                                        Action
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                                        User
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                                        Details
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                                        Reason
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {logs.map((log) => (
                                    <tr key={log._id} className="transition-all hover:bg-indigo-50">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                                {new Date(log.createdAt).toLocaleString("en-IN", {
                                                    dateStyle: "short",
                                                    timeStyle: "short",
                                                })}
                                            </div>
                                        </td>

                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {getActionIcon(log.action)}
                                                <span
                                                    className={`px-2 py-1 text-xs font-bold rounded-full border ${getActionBadge(
                                                        log.action
                                                    )}`}
                                                >
                                                    {log.action}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <User className="h-4 w-4 mr-2 text-gray-400" />
                                                <div>
                                                    <p className="font-bold text-sm text-gray-900">
                                                        {log.user?.name || "System"}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {log.user?.role}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-4 py-3">
                                            {log.payload?.type && (
                                                <div className="text-sm">
                                                    <p>
                                                        <strong
                                                            className={
                                                                log.payload.type === "credit"
                                                                    ? "text-green-600"
                                                                    : "text-red-600"
                                                            }
                                                        >
                                                            {log.payload.type === "credit" ? "+" : "-"}₹
                                                            {log.payload.amount?.toFixed(2)}
                                                        </strong>
                                                    </p>
                                                    <p className="text-xs text-gray-600">
                                                        {log.payload.category}
                                                    </p>
                                                    {log.payload.balanceAfter !== undefined && (
                                                        <p className="text-xs text-gray-500">
                                                            Balance: ₹{log.payload.balanceAfter?.toFixed(2)}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </td>

                                        <td className="px-4 py-3">
                                            <p className="text-sm text-gray-600 max-w-xs truncate">
                                                {log.reason || "—"}
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <Activity className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="font-bold text-sm text-gray-900 mt-2">No audit logs found</p>
                        <p className="text-sm font-semibold text-gray-500 mt-1">
                            Try adjusting your filters
                        </p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {pagination.total > pagination.limit && (
                <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 shadow-lg p-4 transition-all hover:shadow-xl">
                    <p className="text-sm font-semibold text-gray-600">
                        Showing <span className="font-bold text-indigo-600">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
                        <span className="font-bold text-indigo-600">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{" "}
                        <span className="font-bold text-indigo-600">{pagination.total}</span> logs
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() =>
                                setPagination({ ...pagination, page: pagination.page - 1 })
                            }
                            disabled={pagination.page === 1}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                        >
                            Previous
                        </button>
                        <span className="px-4 py-2 text-sm font-bold text-gray-700">
                            Page <span className="font-bold text-indigo-600">{pagination.page}</span> of{" "}
                            <span className="font-bold text-indigo-600">{Math.ceil(pagination.total / pagination.limit)}</span>
                        </span>
                        <button
                            onClick={() =>
                                setPagination({ ...pagination, page: pagination.page + 1 })
                            }
                            disabled={
                                pagination.page * pagination.limit >= pagination.total
                            }
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditTab;
