import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { expensesAPI } from "../../services/api";
import {
  Receipt,
  Plus,
  Minus,
  Eye,
  Edit,
  Trash,
  Search,
  Calendar,
  TrendingUp,
  Download,
  Filter as FilterIcon,
  X,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  CreditCard,
  Building,
  Activity,
  Phone,
  MapPin,
  FileText,
} from "lucide-react";
import LoadingSpinner from "../../components/UI/LoadingSpinner";
import toast from "react-hot-toast";
import ImageUpload from "../../components/UI/ImageUpload";
import Swal from "sweetalert2";

import DailyExpensesReport from "../../components/Expenses/DailyExpensesReport";
import MonthlyExpensesReport from "../../components/Expenses/MonthlyExpensesReport";
import YearlyExpensesReport from "../../components/Expenses/YearlyExpensesReport";
import ExpenseAuditTrail from "../../components/Expenses/ExpenseAuditTrail";
import ExpenseDetails from "../../components/Expenses/ExpenseDetails";
import EditExpense from "../../components/Expenses/EditExpense";

const formatCurrency = (amount) => {
  try {
    const num = Number(amount || 0);
    return num.toLocaleString("en-IN");
  } catch {
    return "0";
  }
};

// Count-up animation hook
const useCountUp = (endValue, duration = 2000, startValue = 0) => {
  const [count, setCount] = useState(startValue);
  const countRef = useRef(startValue);
  const startTimeRef = useRef(null);

  useEffect(() => {
    const animateCount = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(startValue + (endValue - startValue) * easeOutQuart);
      
      setCount(currentValue);
      countRef.current = currentValue;
      
      if (progress < 1) {
        requestAnimationFrame(animateCount);
      }
    };
    
    requestAnimationFrame(animateCount);
  }, [endValue, duration, startValue]);
  
  return count;
};

const Expenses = () => {
  const [activeTab, setActiveTab] = useState("manage");
  const [showAddForm, setShowAddForm] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const [viewMode, setViewMode] = useState(null); // "details" | "edit" | null

  const [filters, setFilters] = useState({
    search: "",
    category: "",
    paymentMode: "",
    startDate: "",
    endDate: "",
    page: 1,
    limit: 10,
  });

  const [receiptFiles, setReceiptFiles] = useState([
    { id: Date.now(), file: null },
  ]);

  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      type: "hostel_expense",
      paymentMode: "cash",
      date: new Date().toISOString().split("T")[0],
    },
  });

  // Summary
  const {
    data: summaryData,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useQuery({
    queryKey: ["expenses-summary"],
    queryFn: () => expensesAPI.getSummary(),
    staleTime: 60_000,
  });

  const summary = summaryData?.data?.summary || {
    totalExpenses: 0,
    monthTotal: 0,
    avgDaily: 0,
    totalCount: 0,
    monthCount: 0,
  };

  // List
  const {
    data: expensesData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["expenses", filters],
    queryFn: () => expensesAPI.getAll(filters),
    keepPreviousData: true,
    staleTime: 60_000,
  });

  const expenses = expensesData?.data?.expenses || [];
  const pagination = expensesData?.data?.pagination || {};

  // Create
  const addExpenseMutation = useMutation({
    mutationFn: async (data) => {
      const response = await expensesAPI.create(data);
      const createdExpense = response?.data?.expense;
      if (!createdExpense?._id) {
        throw new Error("Expense created but ID not returned from server");
      }

      const expenseId = createdExpense._id;
      const uploadPromises = [];

      for (const r of receiptFiles) {
        if (r.file) {
          const fd = new FormData();
          fd.append("expenseReceipts", r.file);
          const p = expensesAPI
            .uploadReceipts(expenseId, fd)
            .catch((err) => console.error("Receipt upload failed:", err));
          uploadPromises.push(p);
        }
      }

      await Promise.all(uploadPromises);
      return response;
    },
    onSuccess: () => {
      toast.success("Expense added successfully!");
      setShowAddForm(false);
      reset();
      setReceiptFiles([{ id: Date.now(), file: null }]);
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expenses-summary"] });
    },
    onError: (err) => {
      console.error(err);
      toast.error(
        err.response?.data?.message || err.message || "Something went wrong"
      );
    },
  });

  const onSubmit = (data) => {
    if (!data.amount || Number(data.amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    addExpenseMutation.mutate(data);
  };

  // Handlers
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      category: "",
      paymentMode: "",
      startDate: "",
      endDate: "",
      page: 1,
      limit: 10,
    });
  };

  const addNewReceiptRow = () => {
    setReceiptFiles((prev) => [...prev, { id: Date.now(), file: null }]);
  };

  const removeReceiptRow = (id) => {
    setReceiptFiles((prev) => prev.filter((r) => r.id !== id));
  };

  const updateReceiptFile = (id, file) => {
    setReceiptFiles((prev) =>
      prev.map((r) => (r.id === id ? { ...r, file } : r))
    );
  };

  const deleteExpense = async (id) => {
    const result = await Swal.fire({
      title: "Delete expense?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it",
    });

    if (result.isConfirmed) {
      try {
        await expensesAPI.delete(id);
        toast.success("Expense deleted successfully!");
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
        queryClient.invalidateQueries({ queryKey: ["expenses-summary"] });
      } catch (err) {
        console.error(err);
        toast.error("Failed to delete expense");
      }
    }
  };

  const handleExport = async () => {
    try {
      if (!filters.startDate || !filters.endDate) {
        toast.error("Select start and end date for export");
        return;
      }

      const params = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        category: filters.category || "",
        format: "csv",
      };

      const response = await expensesAPI.getDailyReport(params);

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
      toast.error("Failed to export report");
    }
  };

  const handlePageChange = (newPage) => {
    if (!pagination?.total) return;
    const totalPages = pagination?.total
      ? Math.ceil(pagination.total / (pagination.limit || 10))
      : 1;
    if (newPage < 1 || newPage > totalPages) return;
    setFilters((prev) => ({ ...prev, page: newPage }));
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

  const totalPages = pagination?.total
    ? Math.ceil(pagination.total / (pagination.limit || 10))
    : 1;

  // Animated count values
  const animatedTotalExpenses = useCountUp(summary.totalExpenses);
  const animatedMonthTotal = useCountUp(summary.monthTotal);
  const animatedAvgDaily = useCountUp(summary.avgDaily);
  const animatedTotalCount = useCountUp(summary.totalCount);
  const animatedMonthCount = useCountUp(summary.monthCount);

  return (
    <div className="px-4 py-6 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mb-8">
        <div className="flex items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Expense Management
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Track hostel expenses and generate reports
            </p>
          </div>
        </div>
        {activeTab === "manage" && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:from-emerald-700 hover:to-emerald-800 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Expense
          </button>
        )}
      </div>

      {/* Simple Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 p-1 mb-8">
        <nav className="flex space-x-1">
          {[
            { id: "manage", label: "Manage" },
            { id: "daily", label: "Daily Report" },
            { id: "monthly", label: "Monthly Report" },
            { id: "yearly", label: "Yearly Report" },
            { id: "audit", label: "Audit" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? "bg-emerald-500 text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Manage Tab */}
      {activeTab === "manage" && (
        <>
          {/* Simple Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <Receipt className="h-5 w-5 text-red-600" />
                </div>
                <span className="text-xs text-gray-500 uppercase">Total</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ₹{formatCurrency(animatedTotalExpenses)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {animatedTotalCount} records
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-xs text-gray-500 uppercase">This Month</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ₹{formatCurrency(animatedMonthTotal)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {animatedMonthCount} records
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <span className="text-xs text-gray-500 uppercase">Daily Avg</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ₹{formatCurrency(animatedAvgDaily)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Per day this month
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <FilterIcon className="h-5 w-5 text-purple-600" />
                </div>
                <span className="text-xs text-gray-500 uppercase">Filters</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {filters.category || "All"}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {filters.paymentMode || "All modes"}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {filters.startDate && filters.endDate
                  ? `${filters.startDate} → ${filters.endDate}`
                  : "No date range"}
              </p>
            </div>
          </div>

          {/* Professional Add Expense Modal */}
          {showAddForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
                {/* Modal Header */}
                <div className="px-6 py-6 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-emerald-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">Add New Expense</h3>
                      <p className="text-sm text-gray-600 mt-1">Enter expense details below</p>
                    </div>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Basic Information Section */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-emerald-600" />
                        Basic Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            Expense Type
                          </label>
                          <select
                            {...register("type")}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 bg-gray-100"
                            disabled
                          >
                            <option value="hostel_expense">Hostel Expense</option>
                          </select>
                        </div>

                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <FilterIcon className="h-4 w-4 text-gray-400" />
                            Category *
                          </label>
                          <select
                            {...register("category", { required: true })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                          >
                            <option value="">Select Category</option>
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
                          {errors.category && (
                            <p className="mt-1 text-xs text-red-600">Category is required</p>
                          )}
                        </div>

                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            Amount *
                          </label>
                          <input
                            type="number"
                            placeholder="Enter amount"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                            {...register("amount", { required: true })}
                          />
                          {errors.amount && (
                            <p className="mt-1 text-xs text-red-600">Amount is required</p>
                          )}
                        </div>

                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <CreditCard className="h-4 w-4 text-gray-400" />
                            Payment Mode *
                          </label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                            {...register("paymentMode")}
                          >
                            <option value="cash">Cash</option>
                            <option value="upi">UPI</option>
                            <option value="card">Card</option>
                            <option value="online">Online</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cheque">Cheque</option>
                          </select>
                        </div>

                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            Date *
                          </label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                            {...register("date")}
                          />
                        </div>

                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Receipt className="h-4 w-4 text-gray-400" />
                            Transaction ID
                          </label>
                          <input
                            type="text"
                            placeholder="Enter transaction ID"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                            {...register("transactionId")}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Vendor Information Section */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Building className="h-4 w-4 text-emerald-600" />
                        Vendor Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Building className="h-4 w-4 text-gray-400" />
                            Vendor Name
                          </label>
                          <input
                            type="text"
                            placeholder="Enter vendor name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                            {...register("vendor.name")}
                          />
                        </div>

                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            Vendor Contact
                          </label>
                          <input
                            type="text"
                            placeholder="Enter vendor contact"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                            {...register("vendor.contact")}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            Vendor Address
                          </label>
                          <input
                            type="text"
                            placeholder="Enter vendor address"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                            {...register("vendor.address")}
                          />
                        </div>

                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Receipt className="h-4 w-4 text-gray-400" />
                            Bill Number
                          </label>
                          <input
                            type="text"
                            placeholder="Enter bill number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                            {...register("billNumber")}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Receipt Upload Section */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Download className="h-4 w-4 text-emerald-600" />
                        Upload Receipts
                      </h4>
                      {receiptFiles.map((row, idx) => (
                        <div
                          key={row.id}
                          className="flex items-center gap-4 mb-3"
                        >
                          <ImageUpload
                            label={`Receipt ${idx + 1}`}
                            value={row.file}
                            accept="image/*,application/pdf"
                            onChange={(file) =>
                              updateReceiptFile(row.id, file)
                            }
                          />
                          {receiptFiles.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeReceiptRow(row.id)}
                              className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={addNewReceiptRow}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Add More Receipt
                      </button>
                    </div>

                    {/* Description Section */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-emerald-600" />
                        Description
                      </h4>
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          Description *
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Enter expense description"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                          {...register("description", { required: true })}
                        />
                        {errors.description && (
                          <p className="mt-1 text-xs text-red-600">
                            Description is required
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddForm(false);
                          reset();
                          setReceiptFiles([{ id: Date.now(), file: null }]);
                        }}
                        className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-sm hover:shadow-md"
                        disabled={addExpenseMutation.isLoading}
                      >
                        {addExpenseMutation.isLoading ? (
                          <>
                            <LoadingSpinner size="sm" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            Add Expense
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Professional Filters */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <FilterIcon className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
                  <p className="text-xs text-gray-500">Refine your expense search</p>
                </div>
                {isFetching && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 ml-2">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse" />
                    Refreshing…
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <X className="h-4 w-4" />
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
                  placeholder="Search description or vendor..."
                  value={filters.search}
                  onChange={(e) =>
                    handleFilterChange("search", e.target.value)
                  }
                />
              </div>

              <select
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors bg-white"
                value={filters.category}
                onChange={(e) =>
                  handleFilterChange("category", e.target.value)
                }
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
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors bg-white"
                value={filters.paymentMode}
                onChange={(e) =>
                  handleFilterChange("paymentMode", e.target.value)
                }
              >
                <option value="">All Modes</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="online">Online</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>

              <input
                type="date"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
                value={filters.startDate}
                onChange={(e) =>
                  handleFilterChange("startDate", e.target.value)
                }
              />

              <input
                type="date"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
                value={filters.endDate}
                onChange={(e) =>
                  handleFilterChange("endDate", e.target.value)
                }
              />

              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-sm transition-all duration-200 hover:from-blue-700 hover:to-blue-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {filters.startDate && filters.endDate
                    ? `Showing records from ${filters.startDate} to ${filters.endDate}`
                    : "No date range filter applied"}
                </span>
                {pagination.total ? (
                  <span>
                    {pagination.total} records · Page {filters.page} of{" "}
                    {totalPages}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Simple Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Mode
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
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center">
                        <LoadingSpinner />
                      </td>
                    </tr>
                  ) : expenses.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <Receipt className="h-8 w-8 text-gray-300 mb-2" />
                          <p className="text-sm font-medium">No expenses found</p>
                          <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    expenses.map((expense) => (
                      <tr key={expense._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {expense.date
                            ? new Date(
                                expense.date
                              ).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric"
                              })
                            : "—"}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                            {expense.category?.replace(/_/g, " ") || "—"}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-semibold text-red-600">
                            ₹{formatCurrency(expense.amount)}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {expense.paymentMode?.replace("_", " ") || "—"}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {expense.vendor?.name || "—"}
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900 max-w-xs truncate" title={expense.description || ""}>
                            {expense.description || "—"}
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          {renderStatusBadge(expense.status)}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {expense.recordedBy?.name || "—"}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              className="p-1 rounded text-blue-600 hover:bg-blue-50"
                              onClick={() => {
                                setSelectedId(expense._id);
                                setViewMode("details");
                              }}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-50"
                              onClick={() => {
                                setSelectedId(expense._id);
                                setViewMode("edit");
                              }}
                              title="Edit Expense"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              className="p-1 rounded text-red-600 hover:bg-red-50"
                              onClick={() => deleteExpense(expense._id)}
                              title="Delete Expense"
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Simple Pagination */}
            {pagination.total > 0 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">{pagination.total}</span> results · Page{" "}
                    <span className="font-medium">{filters.page}</span> of{" "}
                    <span className="font-medium">{totalPages}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={filters.page <= 1}
                      onClick={() => handlePageChange(filters.page - 1)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>
                    <button
                      disabled={filters.page >= totalPages}
                      onClick={() => handlePageChange(filters.page + 1)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "daily" && <DailyExpensesReport />}
      {activeTab === "monthly" && <MonthlyExpensesReport />}
      {activeTab === "yearly" && <YearlyExpensesReport />}
      {activeTab === "audit" && <ExpenseAuditTrail />}

      {/* Details Modal */}
      {viewMode === "details" && selectedId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center px-4 py-3 border-b">
              <h3 className="text-lg font-semibold">Expense Details</h3>
              <button
                onClick={() => {
                  setViewMode(null);
                  setSelectedId(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <ExpenseDetails
                id={selectedId}
                onClose={() => {
                  setSelectedId(null);
                  setViewMode(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {viewMode === "edit" && selectedId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center px-4 py-3 border-b">
              <h3 className="text-lg font-semibold">Edit Expense</h3>
              <button
                onClick={() => {
                  setViewMode(null);
                  setSelectedId(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <EditExpense
                id={selectedId}
                onClose={() => {
                  setViewMode(null);
                  setSelectedId(null);
                  queryClient.invalidateQueries({ queryKey: ["expenses"] });
                  queryClient.invalidateQueries({
                    queryKey: ["expenses-summary"],
                  });
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;