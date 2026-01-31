import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { expensesAPI } from "../../services/api";
import { History, Download, Loader2, Filter, RefreshCw, FileText, Users, Edit, Trash2, PlusCircle } from "lucide-react";
import LoadingSpinner from "../UI/LoadingSpinner";
import toast from "react-hot-toast";

const formatAmount = (amount) => {
  try {
    const num = Number(amount || 0);
    if (!num) return "";
    return "₹" + num.toLocaleString("en-IN");
  } catch {
    return "";
  }
};

const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN");
};

const buildDetailsText = (log) => {
  const { action, payload = {} } = log;

  if (action === "create") {
    const amount = formatAmount(payload.amount);
    const mode = payload.paymentMode || "";
    const desc = payload.description || "";
    return `Created expense ${amount || ""}${mode ? ` via ${mode}` : ""
      }${desc ? ` — ${desc}` : ""}`;
  }

  if (action === "delete") {
    const amount = formatAmount(payload.amount);
    const desc = payload.description || "";
    return `Deleted expense ${amount || ""}${desc ? ` — ${desc}` : ""
      }`;
  }

  if (action === "update") {
    const changed = payload.changedFields || {};
    const entries = Object.entries(changed);
    if (!entries.length) return "Updated expense";

    const parts = entries.map(([field, change]) => {
      const from = field === "amount"
        ? formatAmount(change.from)
        : field === "date"
          ? formatDate(change.from)
          : change.from ?? "";
      const to = field === "amount"
        ? formatAmount(change.to)
        : field === "date"
          ? formatDate(change.to)
          : change.to ?? "";

      const labelMap = {
        amount: "Amount",
        paymentMode: "Payment mode",
        description: "Description",
        category: "Category",
        date: "Date",
        transactionId: "Transaction ID",
      };
      const label = labelMap[field] || field;

      return `${label}: "${from}" → "${to}"`;
    });

    return `Updated expense (${parts.join("; ")})`;
  }

  // other actions (approve, payment, etc.) fallback
  if (payload.description) return payload.description;
  const raw = JSON.stringify(payload);
  return raw && raw !== "{}" ? raw : "No additional details";
};

const getActionBadgeClass = (action) => {
  switch (action) {
    case "create":
      return "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800";
    case "update":
      return "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800";
    case "delete":
      return "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800";
    default:
      return "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800";
  }
};

const ExpenseAuditTrail = () => {
  const [filters, setFilters] = useState({
    action: "",
    user: "",
    startDate: "",
    endDate: "",
  });

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["expenses_audit"],
    queryFn: () => expensesAPI.getAuditLogs(),
  });

  const allLogs = data?.data?.logs || [];

  const filteredLogs = allLogs.filter((log) => {
    if (filters.action && log.action !== filters.action) return false;
    if (
      filters.user &&
      !log.user?.name?.toLowerCase().includes(filters.user.toLowerCase())
    )
      return false;

    if (filters.startDate || filters.endDate) {
      const logDate = log.createdAt ? new Date(log.createdAt) : null;
      if (!logDate) return false;

      if (filters.startDate) {
        const s = new Date(filters.startDate);
        s.setHours(0, 0, 0, 0);
        if (logDate < s) return false;
      }
      if (filters.endDate) {
        const e = new Date(filters.endDate);
        e.setHours(23, 59, 59, 999);
        if (logDate > e) return false;
      }
    }

    return true;
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      action: "",
      user: "",
      startDate: "",
      endDate: "",
    });
  };

  const handleExport = () => {
    try {
      if (!filteredLogs.length) {
        toast.error("No audit logs to export");
        return;
      }

      const header = [
        "Timestamp",
        "Action",
        "User",
        "User Email",
        "Details",
      ];

      const rows = filteredLogs.map((log) => {
        const timestamp = log.createdAt
          ? new Date(log.createdAt).toLocaleString("en-IN")
          : "";
        const details = buildDetailsText(log).replace(/\r?\n/g, " ");
        return [
          timestamp,
          log.action || "",
          log.user?.name || "System",
          log.user?.email || "",
          details,
        ];
      });

      const csvContent =
        "\uFEFF" +
        header.join(",") +
        "\n" +
        rows
          .map((row) =>
            row
              .map((field) => {
                const value = field == null ? "" : String(field);
                if (
                  value.includes(",") ||
                  value.includes('"') ||
                  value.includes("\n")
                ) {
                  return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
              })
              .join(",")
          )
          .join("\n");

      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "expense_audit_trail.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error("Failed to export audit trail");
    }
  };

  const totalCreates = filteredLogs.filter((l) => l.action === "create").length;
  const totalUpdates = filteredLogs.filter((l) => l.action === "update").length;
  const totalDeletes = filteredLogs.filter((l) => l.action === "delete").length;

  return (
    <div className="space-y-8">
      {/* Professional Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
            <History className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Expense Audit Statement</h2>
            <p className="text-sm text-gray-600 mt-1">
              Clear history of every expense creation, update, and deletion
            </p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-blue-600 bg-white border-2 border-blue-300 rounded-xl hover:bg-blue-50 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <Download className="h-5 w-5" />
          Export CSV
        </button>
      </div>

      {/* Professional Filters */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Filter className="h-5 w-5 text-blue-700" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Filters</h3>
            {isFetching && (
              <span className="text-xs text-blue-600 ml-2">
                Refreshing…
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Clear filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="flex flex-col">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Action
            </label>
            <select
              className="px-4 py-3 border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              value={filters.action}
              onChange={(e) => handleFilterChange("action", e.target.value)}
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              User Name
            </label>
            <input
              type="text"
              className="px-4 py-3 border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              placeholder="Search by user name..."
              value={filters.user}
              onChange={(e) => handleFilterChange("user", e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              className="px-4 py-3 border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              value={filters.startDate}
              onChange={(e) =>
                handleFilterChange("startDate", e.target.value)
              }
            />
          </div>

          <div className="flex flex-col">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              className="px-4 py-3 border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
            />
          </div>

          <div className="flex flex-col justify-end">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {isFetching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Apply Filters
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {filters.startDate && filters.endDate
                ? `Showing logs from ${filters.startDate} to ${filters.endDate}`
                : "No date range filter"}
            </div>
            <div className="text-sm font-semibold text-blue-600">
              {filteredLogs.length} entries
            </div>
          </div>
        </div>
      </div>

      {/* Professional Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Logs</p>
              <p className="text-2xl font-bold text-gray-900">
                {allLogs.length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100">
              <Filter className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">After Filters</p>
              <p className="text-2xl font-bold text-blue-600">
                {filteredLogs.length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100">
              <PlusCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">New Expenses</p>
              <p className="text-2xl font-bold text-green-600">
                {totalCreates}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100">
              <Edit className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Changes / Deletions</p>
              <p className="text-2xl font-bold text-amber-600">
                {totalUpdates + totalDeletes}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Table */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-200">
              <History className="h-5 w-5 text-blue-700" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Audit Logs</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : isError ? (
            <div className="py-12 text-center text-red-600">
              <div className="flex flex-col items-center">
                <History className="h-8 w-8 text-red-300 mb-2" />
                <p className="text-sm font-medium">Failed to load audit logs</p>
                <p className="text-xs text-gray-400 mt-1">Please try again later</p>
              </div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <div className="flex flex-col items-center">
                <History className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm font-medium">No audit logs match your filters</p>
                <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
              </div>
            </div>
          ) : (
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLogs.map((log) => {
                  const ts = log.createdAt
                    ? new Date(log.createdAt).toLocaleString("en-IN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })
                    : "—";

                  const details = buildDetailsText(log);
                  const truncated =
                    details.length > 120
                      ? details.slice(0, 120) + "…"
                      : details;

                  return (
                    <tr key={log._id} className="hover:bg-blue-50 transition-colors cursor-pointer">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ts}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={getActionBadgeClass(log.action)}>
                          {log.action || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gray-100">
                            <Users className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {log.user?.name || "System"}
                            </p>
                            {log.user?.email && (
                              <p className="text-xs text-gray-500">
                                {log.user.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 max-w-md" title={details}>
                          {truncated}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpenseAuditTrail;
