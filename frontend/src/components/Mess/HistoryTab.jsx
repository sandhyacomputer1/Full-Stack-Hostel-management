// src/components/Mess/HistoryTab.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Filter,
  Search,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { useMessSettings } from "../../contexts/MessSettingsContext";
import { messAPI } from "../../services/api";
import LoadingSpinner from "../UI/LoadingSpinner";
import Swal from "sweetalert2";

const HistoryTab = () => {
  // ⭐ USE CONTEXT for meal types
  const { getAvailableMeals } = useMessSettings();

  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [mealType, setMealType] = useState("");
  const [block, setBlock] = useState("");
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });

  // ⭐ MEMOIZED: Available meal types from settings
  const availableMeals = useMemo(() => {
    return getAvailableMeals().map((meal) => ({
      value: meal,
      label: meal.charAt(0).toUpperCase() + meal.slice(1),
    }));
  }, [getAvailableMeals]);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, mealType, block, pagination.page]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const params = {
        from: fromDate,
        to: toDate,
        page: pagination.page,
        limit: pagination.limit,
      };

      if (mealType) params.mealType = mealType;
      if (block) params.block = block;
      if (search) params.search = search;

      const res = await messAPI.getHistory(params);
      setRecords(res.data.records || []);
      setPagination(res.data.pagination || pagination);
    } catch (err) {
      console.error("Load history error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Failed to load history",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadHistory();
  };

  const exportToCSV = () => {
    if (records.length === 0) {
      Swal.fire({
        icon: "info",
        title: "No Data",
        text: "No records to export",
      });
      return;
    }

    const headers = [
      "Date",
      "Student Name",
      "Roll Number",
      "Block",
      "Meal",
      "Status",
      "Time",
      "Source",
      "Device ID", // ⭐ NEW: Include device ID for biometric tracking
    ];

    const rows = records.map((r) => [
      r.date,
      r.student.name,
      r.student.rollNumber,
      r.student.block,
      r.mealType,
      r.status,
      r.timestamp ? new Date(r.timestamp).toLocaleTimeString("en-IN") : "",
      r.source,
      r.deviceId || "", // ⭐ NEW: Device ID
    ]);

    const csv = [headers, ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mess_history_${fromDate}_to_${toDate}.csv`;
    a.click();

    Swal.fire({
      icon: "success",
      title: "Exported",
      text: `${records.length} records exported successfully`,
      timer: 1500,
      showConfirmButton: false,
    });
  };

  // ⭐ HELPER: Get status badge styling
  const getStatusBadge = (status) => {
    const badges = {
      present: "badge-success",
      absent: "badge-danger",
      on_mess_off: "badge-warning",
    };
    return badges[status] || "badge-warning";
  };

  // ⭐ HELPER: Format date range for display
  const getDateRangeText = () => {
    const from = new Date(fromDate).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const to = new Date(toDate).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${from} - ${to}`;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 transition-all hover:shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
          {/* From Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              max={toDate}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min={fromDate}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
            />
          </div>

          {/* Meal Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Filter className="h-4 w-4 inline mr-1" />
              Meal
            </label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
            >
              <option value="">All Meals</option>
              {availableMeals.map((meal) => (
                <option key={meal.value} value={meal.value}>
                  {meal.label}
                </option>
              ))}
            </select>
          </div>

          {/* Block Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Filter className="h-4 w-4 inline mr-1" />
              Block
            </label>
            <select
              value={block}
              onChange={(e) => setBlock(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
            >
              <option value="">All Blocks</option>
              <option value="A">Block A</option>
              <option value="B">Block B</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Search className="h-4 w-4 inline mr-1" />
              Search
            </label>
            <input
              type="text"
              placeholder="Name or roll..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
            />
          </div>

          {/* Actions */}
          <div className="flex items-end gap-3">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              title="Refresh data"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              <span className="ml-2">Refresh</span>
            </button>
            <button
              onClick={exportToCSV}
              disabled={records.length === 0 || loading}
              className="px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              title="Export to CSV"
            >
              <Download className="h-6 w-5" />
            </button>
          </div>
        </div>

        {/* Active Filters Display */}
        {(mealType || block || search) && (
          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-gray-600">Active filters:</span>
            {mealType && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 transition-all hover:scale-105">
                Meal: {mealType}
                <button
                  onClick={() => setMealType("")}
                  className="ml-2 hover:text-blue-900 font-bold"
                >
                  ×
                </button>
              </span>
            )}
            {block && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all hover:scale-105">
                Block: {block}
                <button
                  onClick={() => setBlock("")}
                  className="ml-2 hover:text-emerald-900 font-bold"
                >
                  ×
                </button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 transition-all hover:scale-105">
                Search: {search}
                <button
                  onClick={() => setSearch("")}
                  className="ml-2 hover:text-purple-900 font-bold"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setMealType("");
                setBlock("");
                setSearch("");
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="text-xs font-semibold text-gray-500 hover:text-gray-700 underline transition-all"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden transition-all hover:shadow-xl">
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Mess Attendance History
              </h3>
              <p className="text-sm font-semibold text-gray-600 mt-1">{getDateRangeText()}</p>
            </div>
            <p className="text-sm font-semibold text-gray-600">
              Total: <span className="font-bold text-gray-900">{pagination.total}</span>{" "}
              records
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : records.length > 0 ? (
          <>
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">SR.NO</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Student</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Roll</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Block</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Meal</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Time</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Source</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {records.map((record, index) => (
                    <tr key={record._id} className="transition-all hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {(pagination.page - 1) * pagination.limit + index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {new Date(record.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {record.student.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {record.student.rollNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{record.student.block}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="capitalize text-sm text-gray-900">
                          {record.mealType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {record.status === "present" && (
                          <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Present
                          </span>
                        )}
                        {record.status === "absent" && (
                          <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-200">
                            Absent
                          </span>
                        )}
                        {record.status === "on_mess_off" && (
                          <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            Mess Off
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.timestamp ? (
                          <span className="text-sm text-gray-600">
                            {new Date(record.timestamp).toLocaleTimeString(
                              "en-IN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="capitalize text-sm text-gray-600">
                            {record.source}
                          </span>
                          {/* Show device badge for biometric */}
                          {record.source === "biometric" && record.deviceId && (
                            <span
                              className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-200"
                              title={`Device: ${record.deviceId}`}
                            >
                              {record.deviceId.slice(-4)}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="px-6 py-5 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="text-sm font-semibold text-gray-600">
                  Showing{" "}
                  <span className="font-bold text-gray-900">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-bold text-gray-900">
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total
                    )}
                  </span>{" "}
                  of <span className="font-bold text-gray-900">{pagination.total}</span>{" "}
                  results
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page - 1,
                      }))
                    }
                    disabled={pagination.page === 1 || loading}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md flex items-center"
                    title="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <span className="flex items-center px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg">
                    Page{" "}
                    <span className="font-bold mx-1 text-emerald-600">{pagination.page}</span>{" "}
                    of{" "}
                    <span className="font-bold ml-1 text-emerald-600">{pagination.pages}</span>
                  </span>

                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page + 1,
                      }))
                    }
                    disabled={pagination.page === pagination.pages || loading}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md flex items-center"
                    title="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No history found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {search || mealType || block
                ? "Try adjusting your filters or search term"
                : "Try selecting a different date range"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryTab;
