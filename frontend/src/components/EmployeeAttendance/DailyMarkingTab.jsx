// src/components/EmployeeAttendance/DailyMarkingTab.jsx
import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  UserCheck,
  UserX,
  Calendar,
  Users,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { employeeAttendanceAPI, employeesAPI } from "../../services/api";
import toast from "react-hot-toast";

const DailyMarkingTab = () => {
  const queryClient = useQueryClient();

  // ✅ State management
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // ✅ Query Keys (centralized)
  const queryKeys = {
    employees: ["employees", { status: "ACTIVE" }],
    attendance: ["employee-attendance", "daily", date],
  };

  // ✅ QUERY: Fetch all active employees
  const {
    data: employeesData,
    isLoading: employeesLoading,
    error: employeesError,
  } = useQuery({
    queryKey: queryKeys.employees,
    queryFn: async () => {
      const response = await employeesAPI.getAll({ status: "ACTIVE" });

      // Normalize response
      let employees = [];
      if (response.data?.employees) {
        employees = response.data.employees;
      } else if (response.data?.data) {
        employees = response.data.data;
      } else if (Array.isArray(response.data)) {
        employees = response.data;
      }

      console.log("📚 Fetched employees:", employees.length);
      return employees;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // ✅ QUERY: Fetch daily attendance
  const {
    data: attendanceResponse,
    isLoading: attendanceLoading,
    error: attendanceError,
    refetch: refetchAttendance,
  } = useQuery({
    queryKey: queryKeys.attendance,
    queryFn: async () => {
      const response = await employeeAttendanceAPI.getDaily({ date });

      console.log("📊 Raw API Response:", response.data);

      // ✅ Handle different response structures
      let attendanceData = [];
      let summaryData = null;

      if (response.data?.data) {
        // Structure: { success: true, data: { date, attendance, summary } }
        attendanceData = response.data.data.attendance || [];
        summaryData = response.data.data.summary || null;
      } else if (response.data?.attendance) {
        // Structure: { attendance: [], summary: {} }
        attendanceData = response.data.attendance;
        summaryData = response.data.summary || null;
      } else if (Array.isArray(response.data)) {
        // Structure: [attendance records]
        attendanceData = response.data;
      }

      console.log("📊 Parsed attendance:", attendanceData.length, "records");
      console.log("📊 Summary:", summaryData);

      // Log each record
      attendanceData.forEach((record) => {
        console.log(`  👤 ${record.employee?.fullName || "Unknown"}:`, {
          entries: record.entries?.length || 0,
          lastEntry: record.entries?.[record.entries.length - 1]?.type,
          checkIn: record.checkInTime,
          checkOut: record.checkOutTime,
          status: record.status,
        });
      });

      return { attendance: attendanceData, summary: summaryData };
    },
    enabled: !!date,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true, // ✅ Refetch when window gains focus
  });

  // ✅ MUTATION: Mark attendance
  const markAttendanceMutation = useMutation({
    mutationFn: async (payload) => {
      console.log("\n" + "=".repeat(60));
      console.log("🎯 MARKING ATTENDANCE");
      console.log("=".repeat(60));
      console.log("Payload:", payload);

      const response = await employeeAttendanceAPI.markAttendance(payload);

      console.log("✅ API Response:", response.data);
      console.log("=".repeat(60) + "\n");

      return response.data;
    },
    onSuccess: async (data, variables) => {
      console.log("✅ Mutation success, invalidating queries...");

      // ✅ Show success message
      toast.success(`Marked ${variables.type} successfully!`, {
        duration: 2000,
        position: "top-center",
      });

      // ✅ Handle warnings (react-hot-toast doesn't have .warning, use custom)
      if (
        data.warnings &&
        Array.isArray(data.warnings) &&
        data.warnings.length > 0
      ) {
        data.warnings.forEach((warning) => {
          toast.error(`⚠️ ${warning}`, {
            duration: 5000,
            icon: "⚠️",
            style: {
              background: "#fef3c7",
              color: "#92400e",
            },
          });
        });
      }

      // ✅ Handle info messages
      if (data.info && Array.isArray(data.info) && data.info.length > 0) {
        data.info.forEach((info) => {
          toast(`ℹ️ ${info}`, {
            duration: 3000,
            icon: "ℹ️",
            style: {
              background: "#dbeafe",
              color: "#1e40af",
            },
          });
        });
      }

      // ✅ CRITICAL: Invalidate queries to trigger refetch
      await queryClient.invalidateQueries({ queryKey: queryKeys.attendance });
      await queryClient.invalidateQueries({ queryKey: queryKeys.employees });

      // ✅ Force immediate refetch
      console.log("🔄 Force refetching attendance...");
      await refetchAttendance();

      console.log("✅ Queries invalidated and refetched");
    },
    onError: (error, variables, context) => {
      console.error("❌ Mutation error:", error);

      const errorData = error.response?.data;

      if (errorData) {
        const errorMsg = errorData.message || "Failed to mark attendance";
        toast.error(errorMsg, { duration: 5000 });

        // ✅ Handle validation errors
        if (errorData.errors && Array.isArray(errorData.errors)) {
          errorData.errors.forEach((err) => {
            console.log("🔴 Validation error:", err);
            toast.error(err, { duration: 7000 });
          });
        }

        // ✅ Handle warnings (use custom style)
        if (errorData.warnings && Array.isArray(errorData.warnings)) {
          errorData.warnings.forEach((warning) => {
            toast.error(`⚠️ ${warning}`, {
              duration: 5000,
              icon: "⚠️",
              style: {
                background: "#fef3c7",
                color: "#92400e",
              },
            });
          });
        }
      } else {
        toast.error("Failed to mark attendance. Please try again.", {
          duration: 5000,
        });
      }
    },
  });

  // ✅ Computed values
  const employees = employeesData || [];
  const attendance = attendanceResponse?.attendance || [];
  const summary = attendanceResponse?.summary || null;

  // ✅ Helper: Get attendance for employee
  const getAttendanceForEmployee = (employeeId) => {
    const empAttendance = attendance.find((a) => {
      const attEmpId = a.employee?._id || a.employee;
      return String(attEmpId) === String(employeeId);
    });

    return empAttendance;
  };

  // ✅ Helper: Get last entry type for employee (MOST IMPORTANT)
  const getLastEntryType = (employeeId) => {
    const empAttendance = getAttendanceForEmployee(employeeId);

    if (
      !empAttendance ||
      !empAttendance.entries ||
      empAttendance.entries.length === 0
    ) {
      console.log(`📋 No entries for employee ${employeeId}`);
      return null; // No entries yet
    }

    // ✅ Sort by timestamp to ensure correct order (oldest to newest)
    const sortedEntries = [...empAttendance.entries].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    // ✅ Get the LAST entry (most recent)
    const lastEntry = sortedEntries[sortedEntries.length - 1];

    console.log(`📋 Last entry for employee ${employeeId}:`, {
      type: lastEntry.type,
      timestamp: lastEntry.timestamp,
      totalEntries: sortedEntries.length,
      allEntries: sortedEntries.map(
        (e) => `${e.type}@${formatTime(e.timestamp)}`
      ),
    });

    return lastEntry.type; // Returns "IN" or "OUT"
  };

  // ✅ Handle mark attendance
  const handleMarkAttendance = async (employeeId, type) => {
    // ✅ Prevent multiple clicks
    if (markAttendanceMutation.isPending) {
      console.log("⚠️ Already marking attendance, ignoring click");
      return;
    }

    const lastEntryType = getLastEntryType(employeeId);

    console.log("\n" + "=".repeat(60));
    console.log(`🎯 ATTEMPTING TO MARK ATTENDANCE`);
    console.log("=".repeat(60));
    console.log(`Employee ID: ${employeeId}`);
    console.log(`Type to mark: ${type}`);
    console.log(`Last entry type: ${lastEntryType || "NONE"}`);
    console.log("=".repeat(60) + "\n");

    // ✅ Frontend validation BEFORE API call
    if (type === "IN" && lastEntryType === "IN") {
      toast.error("Already marked IN! Next entry must be OUT.", {
        duration: 3000,
        icon: "🚫",
      });
      return;
    }

    if (type === "OUT" && lastEntryType === "OUT") {
      toast.error("Already marked OUT! Next entry must be IN.", {
        duration: 3000,
        icon: "🚫",
      });
      return;
    }

    if (type === "OUT" && lastEntryType === null) {
      toast.error("Cannot mark OUT without marking IN first!", {
        duration: 3000,
        icon: "🚫",
      });
      return;
    }

    // ✅ Construct payload
    const payload = {
      employeeId,
      type,
      timestamp: new Date().toISOString(),
      source: "manual",
    };

    // ✅ Execute mutation
    try {
      await markAttendanceMutation.mutateAsync(payload);
    } catch (error) {
      // Error already handled in onError callback
      console.error("Mark attendance failed:", error);
    }
  };

  // ✅ Filter employees
  const filteredEmployees = useMemo(() => {
    let filtered = [...employees];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.fullName?.toLowerCase().includes(query) ||
          emp.employeeCode?.toLowerCase().includes(query) ||
          emp.role?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "not_marked") {
        filtered = filtered.filter((emp) => !getAttendanceForEmployee(emp._id));
      } else {
        filtered = filtered.filter((emp) => {
          const empAttendance = getAttendanceForEmployee(emp._id);
          return empAttendance?.status === statusFilter;
        });
      }
    }

    return filtered;
  }, [employees, attendance, searchQuery, statusFilter]);

  // ✅ Status badges
  const getStatusBadge = (status) => {
    const badges = {
      present: {
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
        label: "Present",
      },
      absent: {
        color: "bg-red-100 text-red-800",
        icon: XCircle,
        label: "Absent",
      },
      half_day: {
        color: "bg-yellow-100 text-yellow-800",
        icon: AlertCircle,
        label: "Half Day",
      },
      late: {
        color: "bg-orange-100 text-orange-800",
        icon: AlertCircle,
        label: "Late",
      },
      early_leave: {
        color: "bg-orange-100 text-orange-800",
        icon: AlertCircle,
        label: "Early Leave",
      },
      on_leave: {
        color: "bg-blue-100 text-blue-800",
        icon: AlertCircle,
        label: "On Leave",
      },
      holiday: {
        color: "bg-purple-100 text-purple-800",
        icon: Calendar,
        label: "Holiday",
      },
    };

    const badge = badges[status] || badges.absent;
    const Icon = badge.icon;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}
      >
        <Icon className="w-3 h-3 mr-1" />
        {badge.label}
      </span>
    );
  };

  // ✅ Current status badge (based on last entry)
  const getCurrentStatusBadge = (employeeId) => {
    const lastEntryType = getLastEntryType(employeeId);

    if (lastEntryType === "IN") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <LogIn className="w-3 h-3 mr-1" />
          IN
        </span>
      );
    } else if (lastEntryType === "OUT") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <LogOut className="w-3 h-3 mr-1" />
          OUT
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
        <AlertCircle className="w-3 h-3 mr-1" />
        Not Marked
      </span>
    );
  };

  // ✅ Format time
  const formatTime = (timestamp) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ✅ Loading and error states
  const isLoading = employeesLoading || attendanceLoading;
  const hasError = employeesError || attendanceError;

  if (hasError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <p className="text-sm text-red-700">
              {employeesError?.message ||
                attendanceError?.message ||
                "Failed to load data"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isToday = date === new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* Date Selector & Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => {
              console.log("🔄 Manual refresh clicked");
              queryClient.invalidateQueries({ queryKey: queryKeys.attendance });
              queryClient.invalidateQueries({ queryKey: queryKeys.employees });
              refetchAttendance();
            }}
            disabled={isLoading}
            className="mt-6 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>
        </div>

        {/* Quick Stats */}
        {summary && (
          <div className="flex items-center space-x-4">
            {/* Working (Present + Late + Early Leave) */}
            <div className="text-center bg-green-50 px-4 py-2 rounded-lg border border-green-200">
              <p className="text-2xl font-bold text-green-600">
                {(summary.present || 0) +
                  (summary.late || 0) +
                  (summary.early_leave || 0)}
              </p>
              <p className="text-xs text-green-700 font-medium">Working</p>
              {(summary.late > 0 || summary.early_leave > 0) && (
                <p className="text-xs text-orange-600 mt-1">
                  {summary.late > 0 && `${summary.late} late`}
                  {summary.late > 0 && summary.early_leave > 0 && ", "}
                  {summary.early_leave > 0 && `${summary.early_leave} early`}
                </p>
              )}
            </div>

            {/* Half Day */}
            <div className="text-center bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-200">
              <p className="text-2xl font-bold text-yellow-600">
                {summary.half_day || 0}
              </p>
              <p className="text-xs text-yellow-700 font-medium">Half Day</p>
            </div>

            {/* On Leave */}
            <div className="text-center bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
              <p className="text-2xl font-bold text-blue-600">
                {summary.on_leave || 0}
              </p>
              <p className="text-xs text-blue-700 font-medium">On Leave</p>
            </div>

            {/* Absent */}
            <div className="text-center bg-red-50 px-4 py-2 rounded-lg border border-red-200">
              <p className="text-2xl font-bold text-red-600">
                {summary.absent || 0}
              </p>
              <p className="text-xs text-red-700 font-medium">Absent</p>
            </div>

            {/* Total */}
            <div className="text-center bg-gray-50 px-4 py-2 rounded-lg border border-gray-300">
              <p className="text-2xl font-bold text-gray-700">
                {summary.total || 0}
              </p>
              <p className="text-xs text-gray-600 font-medium">Total</p>
            </div>
          </div>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, code, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="not_marked">Not Marked</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="half_day">Half Day</option>
            <option value="on_leave">On Leave</option>
            <option value="late">Late</option>
          </select>
        </div>
      </div>

      {/* Employee List */}
      {isLoading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading attendance data...</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            {employees.length === 0
              ? "No employees found. Please add employees first."
              : "No employees match your search criteria."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Status
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
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((employee) => {
                const empAttendance = getAttendanceForEmployee(employee._id);
                const lastEntryType = getLastEntryType(employee._id);

                // ✅ Button states based on last entry
                const isInDisabled =
                  markAttendanceMutation.isPending || lastEntryType === "IN";
                const isOutDisabled =
                  markAttendanceMutation.isPending ||
                  lastEntryType === "OUT" ||
                  lastEntryType === null;

                return (
                  <tr key={employee._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {employee.fullName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee.employeeCode}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 capitalize">
                        {employee.role?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getCurrentStatusBadge(employee._id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(empAttendance?.checkInTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(empAttendance?.checkOutTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {empAttendance?.totalHours
                        ? `${empAttendance.totalHours.toFixed(1)}h`
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {empAttendance
                        ? getStatusBadge(empAttendance.status)
                        : getStatusBadge("absent")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {isToday ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() =>
                              handleMarkAttendance(employee._id, "IN")
                            }
                            disabled={isInDisabled}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 transition-all"
                            title={
                              lastEntryType === "IN"
                                ? "Last entry was IN - must mark OUT next"
                                : "Mark IN"
                            }
                          >
                            <LogIn className="w-4 h-4" />
                            <span>IN</span>
                          </button>
                          <button
                            onClick={() =>
                              handleMarkAttendance(employee._id, "OUT")
                            }
                            disabled={isOutDisabled}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 transition-all"
                            title={
                              lastEntryType === "OUT"
                                ? "Last entry was OUT - must mark IN next"
                                : lastEntryType === null
                                ? "No entries yet - mark IN first"
                                : "Mark OUT"
                            }
                          >
                            <LogOut className="w-4 h-4" />
                            <span>OUT</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">
                          Past date - no actions
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DailyMarkingTab;
