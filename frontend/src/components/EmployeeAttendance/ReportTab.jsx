import React, { useState, useEffect } from "react";
import {
    FileSpreadsheet,
    Download,
    Calendar,
    User,
    BarChart3,
    TrendingUp,
    Clock,
    AlertCircle,
} from "lucide-react";
import { employeeAttendanceAPI, employeesAPI } from "../../services/api";
import toast from "react-hot-toast";

const ReportTab = () => {
    const [reportType, setReportType] = useState("monthly");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const [employees, setEmployees] = useState([]);
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchEmployees();
        // Set default date range (current month)
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(firstDay.toISOString().split("T")[0]);
        setEndDate(today.toISOString().split("T")[0]);
    }, []);

    const fetchEmployees = async () => {
        try {
            const response = await employeesAPI.getAll({ status: "ACTIVE" });
            setEmployees(response.data.data || []);
        } catch (error) {
            console.error("Error fetching employees:", error);
        }
    };

    const handleGenerateReport = async () => {
        if (!startDate || !endDate) {
            toast.error("Please select date range");
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            toast.error("Start date cannot be after end date");
            return;
        }

        try {
            setLoading(true);
            const payload = {
                startDate,
                endDate,
            };

            if (selectedEmployee) {
                payload.employeeId = selectedEmployee;
            }

            const response = await employeeAttendanceAPI.getReport(payload);
            setReportData(response.data.data);
            toast.success("Report generated successfully!");
        } catch (error) {
            console.error("Error generating report:", error);
            toast.error("Failed to generate report");
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = () => {
        if (!reportData) {
            toast.error("Generate report first");
            return;
        }

        try {
            // Create CSV content
            const headers = [
                "Date",
                "Employee Code",
                "Employee Name",
                "Role",
                "Check In",
                "Check Out",
                "Total Hours",
                "Status",
            ];

            const rows = reportData.attendance.map((record) => [
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
            ]);

            const csvContent = [
                headers.join(","),
                ...rows.map((row) => row.join(",")),
            ].join("\n");

            // Create and download file
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute(
                "download",
                `employee_attendance_${startDate}_to_${endDate}.csv`
            );
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("Report exported successfully!");
        } catch (error) {
            console.error("Error exporting CSV:", error);
            toast.error("Failed to export report");
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            present: "text-green-600",
            absent: "text-red-600",
            half_day: "text-yellow-600",
            late: "text-orange-600",
            early_leave: "text-orange-600",
            on_leave: "text-blue-600",
            holiday: "text-purple-600",
        };
        return colors[status] || "text-gray-600";
    };

    return (
        <div className="space-y-6">
            {/* Report Generation Form */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FileSpreadsheet className="w-5 h-5 mr-2 text-primary-600" />
                    Generate Attendance Report
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Report Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Report Type
                        </label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>

                    {/* Start Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
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
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            max={new Date().toISOString().split("T")[0]}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>

                    {/* Employee Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Employee (Optional)
                        </label>
                        <select
                            value={selectedEmployee}
                            onChange={(e) => setSelectedEmployee(e.target.value)}
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
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex space-x-3">
                    <button
                        onClick={handleGenerateReport}
                        disabled={loading}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center space-x-2"
                    >
                        <BarChart3 className="w-5 h-5" />
                        <span>{loading ? "Generating..." : "Generate Report"}</span>
                    </button>

                    {reportData && (
                        <button
                            onClick={handleExportCSV}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                        >
                            <Download className="w-5 h-5" />
                            <span>Export CSV</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Report Summary */}
            {reportData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Records</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {reportData.summary.totalRecords}
                                </p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Present</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {reportData.summary.present}
                                </p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-lg">
                                <TrendingUp className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Absent</p>
                                <p className="text-2xl font-bold text-red-600">
                                    {reportData.summary.absent}
                                </p>
                            </div>
                            <div className="p-3 bg-red-100 rounded-lg">
                                <AlertCircle className="w-6 h-6 text-red-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">On Leave</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {reportData.summary.on_leave}
                                </p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <Calendar className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Table */}
            {reportData && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Attendance Details
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                            {reportData.startDate} to {reportData.endDate}
                        </p>
                    </div>

                    <div className="overflow-x-auto">
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
                                        Role
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
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {reportData.attendance.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan="7"
                                            className="px-6 py-12 text-center text-gray-500"
                                        >
                                            No attendance records found for selected criteria
                                        </td>
                                    </tr>
                                ) : (
                                    reportData.attendance.map((record, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(record.date).toLocaleDateString("en-IN")}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {record.employee?.fullName || "-"}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {record.employee?.employeeCode || "-"}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                                                {record.employee?.role?.replace(/_/g, " ") || "-"}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {record.checkInTime
                                                    ? new Date(record.checkInTime).toLocaleTimeString(
                                                        "en-IN",
                                                        {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        }
                                                    )
                                                    : "-"}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {record.checkOutTime
                                                    ? new Date(record.checkOutTime).toLocaleTimeString(
                                                        "en-IN",
                                                        {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        }
                                                    )
                                                    : "-"}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {record.totalHours
                                                    ? `${record.totalHours.toFixed(1)}h`
                                                    : "-"}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`text-sm font-medium capitalize ${getStatusColor(
                                                        record.status
                                                    )}`}
                                                >
                                                    {record.status?.replace(/_/g, " ")}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!reportData && !loading && (
                <div className="bg-gray-50 rounded-lg p-12 text-center">
                    <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No Report Generated
                    </h3>
                    <p className="text-gray-600">
                        Select date range and click "Generate Report" to view attendance
                        data
                    </p>
                </div>
            )}
        </div>
    );
};

export default ReportTab;
