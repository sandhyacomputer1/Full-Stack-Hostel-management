import React, { useState, useEffect } from "react";
import {
    History,
    Calendar,
    Search,
    Filter,
    Download,
    RefreshCw,
    Clock,
    User,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { employeeAttendanceAPI, employeesAPI } from "../../services/api";
import toast from "react-hot-toast";

const HistoryTab = () => {
    const [history, setHistory] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedRows, setExpandedRows] = useState(new Set());

    const [filters, setFilters] = useState({
        startDate: "",
        endDate: "",
        employeeId: "",
        status: "",
    });

    useEffect(() => {
        fetchEmployees();
        // Set default date range (last 7 days)
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        setFilters({
            ...filters,
            startDate: sevenDaysAgo.toISOString().split("T")[0],
            endDate: today.toISOString().split("T")[0],
        });
    }, []);

    useEffect(() => {
        if (filters.startDate && filters.endDate) {
            fetchHistory();
        }
    }, [filters]);

    const fetchEmployees = async () => {
        try {
            const response = await employeesAPI.getAll({ status: "ACTIVE" });
            setEmployees(response.data.data || []);
        } catch (error) {
            console.error("Error fetching employees:", error);
        }
    };

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const params = {};

            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            if (filters.employeeId) params.employeeId = filters.employeeId;
            if (filters.status) params.status = filters.status;

            const response = await employeeAttendanceAPI.getHistory(params);
            setHistory(response.data.data || []);
        } catch (error) {
            console.error("Error fetching history:", error);
            toast.error("Failed to load attendance history");
        } finally {
            setLoading(false);
        }
    };

    const toggleRowExpansion = (recordId) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(recordId)) {
            newExpanded.delete(recordId);
        } else {
            newExpanded.add(recordId);
        }
        setExpandedRows(newExpanded);
    };

    const handleExportCSV = () => {
        if (history.length === 0) {
            toast.error("No data to export");
            return;
        }

        try {
            const headers = [
                "Date",
                "Employee Code",
                "Employee Name",
                "Role",
                "Check In",
                "Check Out",
                "Total Hours",
                "Status",
                "Late",
                "Early Leave",
            ];

            const rows = history.map((record) => [
                record.date,
                record.employee?.employeeCode || "-",
                record.employee?.fullName || "-",
                record.employee?.role || "-",
                record.checkInTime
                    ? new Date(record.checkInTime).toLocaleTimeString("en-IN")
                    : "-",
                record.checkOutTime
                    ? new Date(record.checkOutTime).toLocaleTimeString("en-IN")
                    : "-",
                record.totalHours?.toFixed(2) || "0",
                record.status,
                record.isLate ? "Yes" : "No",
                record.isEarlyLeave ? "Yes" : "No",
            ]);

            const csvContent = [
                headers.join(","),
                ...rows.map((row) => row.join(",")),
            ].join("\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute(
                "download",
                `employee_attendance_history_${filters.startDate}_to_${filters.endDate}.csv`
            );
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("History exported successfully!");
        } catch (error) {
            console.error("Error exporting CSV:", error);
            toast.error("Failed to export history");
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            present: "bg-green-100 text-green-800",
            absent: "bg-red-100 text-red-800",
            half_day: "bg-yellow-100 text-yellow-800",
            late: "bg-orange-100 text-orange-800",
            early_leave: "bg-orange-100 text-orange-800",
            on_leave: "bg-blue-100 text-blue-800",
            holiday: "bg-purple-100 text-purple-800",
        };

        return badges[status] || "bg-gray-100 text-gray-800";
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return "-";
        return new Date(timestamp).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const filteredHistory = history.filter((record) => {
        const matchesSearch =
            record.employee?.fullName
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
            record.employee?.employeeCode
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
            record.date?.includes(searchQuery);

        return matchesSearch;
    });

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Filter className="w-5 h-5 mr-2 text-primary-600" />
                    Filters
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Start Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) =>
                                setFilters({ ...filters, startDate: e.target.value })
                            }
                            max={new Date().toISOString().split("T")[0]}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>

                    {/* End Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            End Date
                        </label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) =>
                                setFilters({ ...filters, endDate: e.target.value })
                            }
                            max={new Date().toISOString().split("T")[0]}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>

                    {/* Employee Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Employee
                        </label>
                        <select
                            value={filters.employeeId}
                            onChange={(e) =>
                                setFilters({ ...filters, employeeId: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            <option value="">All Employees</option>
                            {employees.map((emp) => (
                                <option key={emp._id} value={emp._id}>
                                    {emp.employeeCode} - {emp.fullName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status
                        </label>
                        <select
                            value={filters.status}
                            onChange={(e) =>
                                setFilters({ ...filters, status: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            <option value="">All Status</option>
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="half_day">Half Day</option>
                            <option value="late">Late</option>
                            <option value="early_leave">Early Leave</option>
                            <option value="on_leave">On Leave</option>
                            <option value="holiday">Holiday</option>
                        </select>
                    </div>

                    {/* Actions */}
                    <div className="flex items-end space-x-2">
                        <button
                            onClick={fetchHistory}
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                        >
                            <RefreshCw
                                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                            />
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Search and Export */}
            <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search by name, code, or date..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                </div>

                {history.length > 0 && (
                    <button
                        onClick={handleExportCSV}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export CSV</span>
                    </button>
                )}
            </div>

            {/* Summary Stats */}
            {history.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-600">Total Records</p>
                        <p className="text-2xl font-bold text-gray-900">{history.length}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-600">Present</p>
                        <p className="text-2xl font-bold text-green-600">
                            {history.filter((r) => r.status === "present").length}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-600">Absent</p>
                        <p className="text-2xl font-bold text-red-600">
                            {history.filter((r) => r.status === "absent").length}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-600">Half Day</p>
                        <p className="text-2xl font-bold text-yellow-600">
                            {history.filter((r) => r.status === "half_day").length}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-600">On Leave</p>
                        <p className="text-2xl font-bold text-blue-600">
                            {history.filter((r) => r.status === "on_leave").length}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-600">Late</p>
                        <p className="text-2xl font-bold text-orange-600">
                            {history.filter((r) => r.isLate).length}
                        </p>
                    </div>
                </div>
            )}

            {/* History Table */}
            {loading ? (
                <div className="text-center py-12">
                    <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Loading attendance history...</p>
                </div>
            ) : filteredHistory.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No attendance history found</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Employee
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Check In
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Check Out
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Hours
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Flags
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Details
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredHistory.map((record) => (
                                <React.Fragment key={record._id}>
                                    <tr className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(record.date).toLocaleDateString("en-IN")}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {record.employee?.fullName}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {record.employee?.employeeCode}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatTime(record.checkInTime)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatTime(record.checkOutTime)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {record.totalHours
                                                ? `${record.totalHours.toFixed(1)}h`
                                                : "-"}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(
                                                    record.status
                                                )}`}
                                            >
                                                {record.status?.replace(/_/g, " ")}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex space-x-1">
                                                {record.isLate && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                                        Late
                                                    </span>
                                                )}
                                                {record.isEarlyLeave && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                                        Early
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <button
                                                onClick={() => toggleRowExpansion(record._id)}
                                                className="text-primary-600 hover:text-primary-900 flex items-center space-x-1"
                                            >
                                                {expandedRows.has(record._id) ? (
                                                    <>
                                                        <ChevronUp className="w-4 h-4" />
                                                        <span>Hide</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronDown className="w-4 h-4" />
                                                        <span>Show</span>
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                    </tr>

                                    {/* Expanded Row Details */}
                                    {expandedRows.has(record._id) && (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-4 bg-gray-50">
                                                <div className="space-y-4">
                                                    {/* Entry Timeline */}
                                                    {record.entries && record.entries.length > 0 && (
                                                        <div>
                                                            <h4 className="text-sm font-medium text-gray-900 mb-2">
                                                                Entry Timeline
                                                            </h4>
                                                            <div className="space-y-2">
                                                                {record.entries.map((entry, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="flex items-center space-x-3 p-2 bg-white rounded"
                                                                    >
                                                                        <span
                                                                            className={`px-2 py-1 rounded text-xs font-medium ${entry.type === "IN"
                                                                                    ? "bg-green-100 text-green-800"
                                                                                    : "bg-red-100 text-red-800"
                                                                                }`}
                                                                        >
                                                                            {entry.type}
                                                                        </span>
                                                                        <span className="text-sm text-gray-900">
                                                                            {new Date(entry.timestamp).toLocaleString(
                                                                                "en-IN"
                                                                            )}
                                                                        </span>
                                                                        <span className="text-xs text-gray-600 capitalize">
                                                                            ({entry.source})
                                                                        </span>
                                                                        {entry.notes && (
                                                                            <span className="text-xs text-gray-600">
                                                                                - {entry.notes}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Notes */}
                                                    {record.notes && (
                                                        <div>
                                                            <h4 className="text-sm font-medium text-gray-900 mb-1">
                                                                Notes
                                                            </h4>
                                                            <p className="text-sm text-gray-600">
                                                                {record.notes}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Reconciliation Info */}
                                                    {record.reconciled && (
                                                        <div className="bg-green-50 border border-green-200 rounded p-3">
                                                            <h4 className="text-sm font-medium text-green-900 mb-1">
                                                                Reconciled
                                                            </h4>
                                                            {record.reconciliationNotes && (
                                                                <p className="text-sm text-green-800">
                                                                    {record.reconciliationNotes}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default HistoryTab;
