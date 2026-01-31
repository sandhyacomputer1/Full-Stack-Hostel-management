import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { expensesAPI } from "../../services/api";
import { BarChart3, Loader2, Download, RefreshCw } from "lucide-react";
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

const formatQuickCount = (amount) => {
  try {
    const num = Number(amount || 0);
    
    if (num >= 10000000) { // 1 Crore and above
      return (num / 10000000).toFixed(1) + 'Cr';
    } else if (num >= 100000) { // 1 Lakh and above
      return (num / 100000).toFixed(1) + 'L';
    } else {
      // Show full number for amounts below 1 lakh
      return num.toLocaleString("en-IN");
    }
  } catch {
    return "0";
  }
};

const MonthlyExpensesReport = () => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [category, setCategory] = useState("");
  const [paymentMode, setPaymentMode] = useState("");

  // This uses your backend /reports/daily to get per‑expense data for the month
  const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
  const endDate = new Date(year, month, 0).toISOString().split("T")[0];

  const {
    data: dailyData,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["expenses-monthly-detailed", year, month],
    queryFn: () =>
      expensesAPI.getDailyReport({
        startDate,
        endDate,
        format: "json",
      }),
  });

  const allExpenses = dailyData?.data?.expenses || [];

  // Frontend filters
  const filteredExpenses = allExpenses.filter((e) => {
    if (category && e.category !== category) return false;
    if (paymentMode && e.paymentMode !== paymentMode) return false;
    return true;
  });

  const totalAmount = filteredExpenses.reduce(
    (sum, e) => sum + (e.amount || 0),
    0
  );

  // Derive category summary for the summary table
  const categorySummaryMap = new Map();
  filteredExpenses.forEach((e) => {
    const key = e.category || "unknown";
    const prev = categorySummaryMap.get(key) || { totalAmount: 0, count: 0 };
    categorySummaryMap.set(key, {
      totalAmount: prev.totalAmount + (e.amount || 0),
      count: prev.count + 1,
    });
  });

  const categorySummary = Array.from(categorySummaryMap.entries()).map(
    ([cat, info]) => ({
      _id: cat,
      totalAmount: info.totalAmount,
      count: info.count,
    })
  );

  const monthLabel = new Date(0, month - 1).toLocaleString("en-IN", {
    month: "long",
  });

  const handleExport = () => {
    try {
      if (!filteredExpenses.length) {
        toast.error("No data to export for selected filters");
        return;
      }

      const header = [
        "Date",
        "Category",
        "Amount",
        "Payment Mode",
        "Vendor",
        "Description",
        "Status",
        "Recorded By",
      ];

      const rows = filteredExpenses.map((e) => {
        const date =
          e.date ? new Date(e.date).toISOString().split("T")[0] : "";

        // Keep Marathi text as-is, only remove newlines.
        const safeDescription = (e.description || "").replace(
          /\r?\n/g,
          " "
        );

        return [
          date,
          e.category || "",
          e.amount || 0,
          e.paymentMode || "",
          e.vendor?.name || "",
          safeDescription,
          e.status || "",
          e.recordedBy?.name || "",
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
      link.setAttribute(
        "download",
        `expenses_monthly_${year}_${String(month).padStart(2, "0")}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error("Failed to export monthly report");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-purple-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Monthly Expenses Report
            </h2>
            <p className="text-xs text-gray-500">
              {monthLabel} {year}
            </p>
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

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-2xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <select
          className="input"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {Array.from({ length: 12 }).map((_, idx) => (
            <option key={idx + 1} value={idx + 1}>
              {new Date(0, idx).toLocaleString("en-IN", {
                month: "long",
              })}
            </option>
          ))}
        </select>

        <input
          type="number"
          className="input"
          min={2000}
          max={2100}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        />

        <select
          className="input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
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

        <select
          className="input"
          value={paymentMode}
          onChange={(e) => setPaymentMode(e.target.value)}
        >
          <option value="">All Modes</option>
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="online">Online</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cheque">Cheque</option>
        </select>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Apply Filters
        </button>
      </div>

      {/* Summary card */}
      <div className="bg-white rounded-lg shadow-2xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-100">
            <BarChart3 className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">
              Total for {monthLabel} {year}
            </p>
            <p className="text-3xl font-bold text-blue-600">
              ₹{formatQuickCount(totalAmount)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">
            {filteredExpenses.length} records
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Quick counting format
          </p>
        </div>
      </div>

      {/* Category summary table */}
      <div className="bg-white rounded-lg shadow-2xl overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                Total Amount
              </th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                Transactions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {categorySummary.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="py-8 text-center text-gray-500"
                >
                  No data for selected filters.
                </td>
              </tr>
            ) : (
              categorySummary.map((row) => (
                <tr key={row._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                      {row._id?.replace(/_/g, " ") || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-lg font-bold text-blue-600">
                      ₹{formatQuickCount(row.totalAmount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                      {row.count}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detailed expense table */}
      <div className="bg-white rounded-lg shadow-2xl overflow-x-auto">
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-red-600">
            <div className="flex flex-col items-center">
              <BarChart3 className="h-8 w-8 text-red-300 mb-2" />
              <p className="text-sm font-medium">Failed to load monthly report</p>
              <p className="text-xs text-gray-400 mt-1">Please try again later</p>
            </div>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <div className="flex flex-col items-center">
              <BarChart3 className="h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm font-medium">No expenses for selected filters</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
            </div>
          </div>
        ) : (
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Payment Mode
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Recorded By
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredExpenses.map((e) => {
                const d = e.date ? new Date(e.date) : null;
                const dateText = d ? d.toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric"
                }) : "—";

                return (
                  <tr key={e._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dateText}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        {e.category?.replace(/_/g, " ") || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-lg font-bold text-blue-600">
                        ₹{formatQuickCount(e.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        {e.paymentMode?.replace("_", " ") || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {e.vendor?.name || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={e.description || ""}>
                        {e.description || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {e.recordedBy?.name || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default MonthlyExpensesReport;
