import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { expensesAPI } from "../../services/api";
import { Download, Calendar, Loader2, Filter, Search, RefreshCw, DollarSign } from "lucide-react";
import LoadingSpinner from "../UI/LoadingSpinner";
import toast from "react-hot-toast";

const formatCurrency = (amount) => {
  try {
    const num = Number(amount || 0);
    return num.toLocaleString("en-IN");
  } catch {
    return "0";
  }
};

const DailyExpensesReport = () => {
  const today = new Date().toISOString().split("T")[0];

  const [filters, setFilters] = useState({
    startDate: today,
    endDate: today,
    category: "",
    paymentMode: "",
  });

  const handleChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["expenses-daily-report", filters],
    queryFn: () =>
      expensesAPI.getDailyReport({
        ...filters,
        format: "json",
      }),
  });

  const expenses = data?.data?.expenses || [];
  const totalAmount = expenses.reduce(
    (sum, e) => sum + (e.amount || 0),
    0
  );

  const handleExport = async () => {
    try {
      if (!filters.startDate || !filters.endDate) {
        toast.error("Select start and end date");
        return;
      }

      const response = await expensesAPI.getDailyReport({
        ...filters,
        format: "csv",
      });

      const blob = new Blob([response.data], {
        type: "text/csv;charset=utf-8;",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "expenses_daily_report.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error("Failed to export daily report");
    }
  };

  const renderStatusBadge = (status) => {
    if (!status) {
      return <span className="badge badge-ghost badge-sm">—</span>;
    }

    let cls = "badge badge-sm";
    if (status === "active") cls += " badge-success";
    else if (status === "refunded") cls += " badge-warning";
    else if (status === "cancelled") cls += " badge-error";
    else cls += " badge-ghost";

    return <span className={cls}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Professional Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-blue-100">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Daily Expenses Report</h2>
            <p className="text-sm text-gray-600">View and analyze daily expense data</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Professional Filters */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-emerald-100">
            <Filter className="h-5 w-5 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Filter Expenses</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              Start Date
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              value={filters.startDate}
              onChange={(e) => handleChange("startDate", e.target.value)}
            />
          </div>
          
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              End Date
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              value={filters.endDate}
              onChange={(e) => handleChange("endDate", e.target.value)}
            />
          </div>
          
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Filter className="h-4 w-4 text-gray-400" />
              Category
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              value={filters.category}
              onChange={(e) => handleChange("category", e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="food_groceries">Food & Groceries</option>
              <option value="maintenance">Maintenance</option>
              <option value="utilities">Utilities</option>
              <option value="salary">Salary</option>
              <option value="rent">Rent</option>
              <option value="equipment">Equipment</option>
              <option value="cleaning">Cleaning</option>
              <option value="security">Security</option>
              <option value="medical">Medical</option>
              <option value="transportation">Transportation</option>
              <option value="office_supplies">Office Supplies</option>
              <option value="marketing">Marketing</option>
              <option value="legal">Legal</option>
              <option value="insurance">Insurance</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Search className="h-4 w-4 text-gray-400" />
              Payment Mode
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              value={filters.paymentMode}
              onChange={(e) => handleChange("paymentMode", e.target.value)}
            >
              <option value="">All Modes</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="online">Online</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => refetch()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-sm hover:shadow-md"
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
      </div>

      {/* Professional Summary */}
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-100">
              <DollarSign className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-red-600">
                ₹{formatCurrency(totalAmount)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">
              {expenses.length} records for selected range
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {filters.startDate && filters.endDate
                ? `${filters.startDate} → ${filters.endDate}`
                : "No date range selected"}
            </p>
          </div>
        </div>
      </div>

      {/* Professional Table */}
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-red-600">
            <div className="flex flex-col items-center">
              <Calendar className="h-8 w-8 text-red-300 mb-2" />
              <p className="text-sm font-medium">Failed to load daily report</p>
              <p className="text-xs text-gray-400 mt-1">Please try again later</p>
            </div>
          </div>
        ) : expenses.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <div className="flex flex-col items-center">
              <Calendar className="h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm font-medium">No expenses found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Payment Mode
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Recorded By
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {expenses.map((e) => (
                  <tr key={e._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {e.date
                        ? new Date(e.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                        {e.category?.replace(/_/g, " ") || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold text-red-600">
                        ₹{formatCurrency(e.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {e.paymentMode?.replace("_", " ") || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {e.vendor?.name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={e.description || ""}>
                        {e.description || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {renderStatusBadge(e.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {e.recordedBy?.name || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyExpensesReport;
