import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { expensesAPI } from "../../services/api";
import { Calendar, Loader2, Download, ExternalLink, RefreshCw, TrendingUp } from "lucide-react";
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

const YearlyExpensesReport = () => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [category, setCategory] = useState("");
  const [paymentMode, setPaymentMode] = useState("");

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["expenses-yearly-report", year],
    queryFn: () => expensesAPI.getYearlyReport(year),
  });

  const months = data?.data?.months || [];
  const allExpenses = data?.data?.expenses || [];

  const filteredExpenses = allExpenses.filter((e) => {
    if (category && e.category !== category) return false;
    if (paymentMode && e.paymentMode !== paymentMode) return false;
    return true;
  });

  const totalYear = filteredExpenses.reduce(
    (sum, e) => sum + (e.amount || 0),
    0
  );

  const handleExport = () => {
    try {
      if (!filteredExpenses.length) {
        toast.error("No data to export for selected filters");
        return;
      }

      const header = [
        "Date",
        "Month",
        "Category",
        "Amount",
        "Payment Mode",
        "Vendor",
        "Description",
        "Status",
        "Recorded By",
        "Receipt URLs",
      ];

      const rows = filteredExpenses.map((e) => {
        const date =
          e.date ? new Date(e.date).toISOString().split("T")[0] : "";
        const monthIdx = e.date ? new Date(e.date).getMonth() : null;
        const monthName =
          monthIdx !== null
            ? new Date(0, monthIdx).toLocaleString("en-IN", {
              month: "short",
            })
            : "";

        const receiptUrls = (e.attachments || [])
          .map((a) => a.url)
          .filter(Boolean)
          .join(" | ");

        // Only strip newlines to avoid breaking CSV structure.
        const safeDescription = (e.description || "").replace(
          /\r?\n/g,
          " "
        );

        return [
          date,
          monthName,
          e.category || "",
          e.amount || 0,
          e.paymentMode || "",
          e.vendor?.name || "",
          safeDescription,
          e.status || "",
          e.recordedBy?.name || "",
          receiptUrls,
        ];
      });

      const csvContent =
        "\uFEFF" + // BOM to help Excel detect UTF‑8 correctly
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
        `expenses_yearly_${year}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error("Failed to export yearly report");
    }
  };

  return (
    <div className="space-y-8">
      {/* Professional Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
            <Calendar className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Yearly Expenses Report</h2>
            <div className="flex items-center gap-2 mt-1">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-gray-600 font-medium">
                {year}
              </p>
            </div>
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

      {/* Professional Year Summary & Filters */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
          {/* Summary Section */}
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">
                Total expenses in {year}
              </p>
              <p className="text-3xl font-bold text-blue-600">
                ₹{formatQuickCount(totalYear)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {filteredExpenses.length} records after filters • Quick counting format
              </p>
            </div>
          </div>

          {/* Year Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setYear((y) => y - 1)}
              className="inline-flex items-center px-4 py-3 text-sm font-medium text-blue-600 bg-white border-2 border-blue-300 rounded-xl hover:bg-blue-50 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              ← {year - 1}
            </button>
            <input
              type="number"
              className="w-28 px-3 py-3 text-center text-base font-semibold border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
            <button
              onClick={() => setYear((y) => y + 1)}
              className="inline-flex items-center px-4 py-3 text-sm font-medium text-blue-600 bg-white border-2 border-blue-300 rounded-xl hover:bg-blue-50 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {year + 1} →
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category
              </label>
              <select
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
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
            </div>

            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Mode
              </label>
              <select
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
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
            </div>

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
      </div>

      {/* Professional Monthly Summary Cards */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100">
            <Calendar className="h-5 w-5 text-blue-700" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Monthly Breakdown</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <div className="col-span-full flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : isError ? (
            <div className="col-span-full text-center text-red-600 py-12">
              <div className="flex flex-col items-center">
                <Calendar className="h-8 w-8 text-red-300 mb-2" />
                <p className="text-sm font-medium">Failed to load yearly report</p>
                <p className="text-xs text-gray-400 mt-1">Please try again later</p>
              </div>
            </div>
          ) : months.length === 0 ? (
            <div className="col-span-full text-center text-gray-500 py-12">
              <div className="flex flex-col items-center">
                <Calendar className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm font-medium">No data for selected year</p>
                <p className="text-xs text-gray-400 mt-1">Try selecting a different year</p>
              </div>
            </div>
          ) : (
            months.map((m) => (
              <div
                key={m.month}
                className="border-2 border-gray-200 rounded-xl p-4 flex flex-col gap-2 bg-gradient-to-br from-gray-50 to-white hover:border-blue-400 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer"
              >
                <div className="text-sm font-bold text-gray-800">
                  {new Date(0, (m.month || 1) - 1).toLocaleString("en-IN", {
                    month: "long",
                  })}
                </div>
                <div className="text-xs text-gray-500">
                  {m.count || 0} transactions
                </div>
                <div className="text-xl font-bold text-blue-600">
                  ₹{formatQuickCount(m.totalAmount)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Professional Detailed Table */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-200">
              <Calendar className="h-5 w-5 text-blue-700" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Detailed Transactions</h3>
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
                <Calendar className="h-8 w-8 text-red-300 mb-2" />
                <p className="text-sm font-medium">Failed to load yearly report</p>
                <p className="text-xs text-gray-400 mt-1">Please try again later</p>
              </div>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <div className="flex flex-col items-center">
                <Calendar className="h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm font-medium">No expenses for selected filters</p>
                <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
              </div>
            </div>
          ) : (
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Month
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
                    Receipts
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
                  const monthName = d
                    ? d.toLocaleString("en-IN", { month: "short" })
                    : "—";

                  const attachments = Array.isArray(e.attachments)
                    ? e.attachments
                    : [];

                  return (
                    <tr key={e._id} className="hover:bg-blue-50 hover:shadow-lg transition-all duration-200 cursor-pointer">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {dateText}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          {monthName}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          {e.category?.replace(/_/g, " ") || "—" }
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-lg font-bold text-blue-600">
                          ₹{formatQuickCount(e.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          {e.paymentMode?.replace("_", " ") || "—" }
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {e.vendor?.name || "—" }
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={e.description || ""}>
                          {e.description || "—" }
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {attachments.length === 0 ? (
                          <span className="text-xs text-gray-400">
                            No receipts
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {attachments.map((file, idx) =>
                              file.url ? (
                                <a
                                  key={file._id || idx}
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                >
                                  Receipt {idx + 1}
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                              ) : null
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {e.recordedBy?.name || "—" }
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

export default YearlyExpensesReport;
