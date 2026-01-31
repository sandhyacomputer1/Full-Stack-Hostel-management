// src/pages/Fees/Fees.jsx

import React, { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { feesAPI } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import {
  CreditCard,
  Search,
  Eye,
  Edit,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  PrinterCheck,
  RefreshCw,
  WifiOff,
  ClipboardPaste,
  BadgeDollarSign,
  MessageSquare,
  Send,
} from "lucide-react";

import LoadingSpinner from "../../components/UI/LoadingSpinner";
import toast from "react-hot-toast";
import SmsSendButton from "../../components/Fees/SmsSendButton";

// New modular components
import PaymentDetailsModal from "../../components/Fees/PaymentDetailsModal";
import PaymentEditModal from "../../components/Fees/PaymentEditModal";
import DeletePaymentModal from "../../components/Fees/DeletePaymentModal";

// import {
//   PaymentDetailsModal,
//   PaymentEditModal,
//   DeletePaymentModal,
// } from "../../components/Fees";

const Fees = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const useCountUp = (value, durationMs = 650) => {
    const target = Number(value) || 0;
    const [display, setDisplay] = useState(0);

    useEffect(() => {
      let rafId = 0;
      const start = performance.now();

      const tick = (now) => {
        const progress = Math.min(1, (now - start) / durationMs);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(target * eased));
        if (progress < 1) rafId = requestAnimationFrame(tick);
      };

      setDisplay(0);
      rafId = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafId);
    }, [target, durationMs]);

    return display;
  };

  const [activeTab, setActiveTab] = useState("due");
  const [filters, setFilters] = useState({
    search: "",
    class: "",
    batch: "",
    page: 1,
    limit: 10,
  });

  // Modal states
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    payment: null,
  });
  const [deleteReason, setDeleteReason] = useState("");
  const [viewPaymentId, setViewPaymentId] = useState(null);
  const [editPaymentId, setEditPaymentId] = useState(null);

  // Bulk SMS State
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [isBulkSending, setIsBulkSending] = useState(false);

  // Scroll animation setup
  const [visibleSections, setVisibleSections] = useState(new Set());
  const sectionRefs = useRef({});

  // Toggle selection for a student
  const toggleSelection = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Select all visible students (helper for tabs)
  const handleSelectAll = (students) => {
    if (!students) return;
    const allIds = students.map((s) => s.studentObjectId || s.student?._id);
    const areAllSelected = allIds.every((id) => selectedStudents.includes(id));

    if (areAllSelected) {
      setSelectedStudents((prev) => prev.filter((id) => !allIds.includes(id)));
    } else {
      setSelectedStudents((prev) => [...new Set([...prev, ...allIds])]);
    }
  };

  // Bulk Send Handler
  const handleBulkSend = async (type) => {
    if (selectedStudents.length === 0) {
      toast.error("Please select students first");
      return;
    }

    if (!window.confirm(`Send SMS to ${selectedStudents.length} students?`)) {
      return;
    }

    setIsBulkSending(true);
    try {
      const response = await feesAPI.bulkSendReminders(selectedStudents, type);

      const { sent, mock, failed, errors } = response.data.results;

      if (mock > 0) {
        toast(`Simulated ${mock} SMS (Mock Mode)`, {
          icon: '⚠️',
          style: { background: '#FFFBEB', color: '#B45309' }
        });
      } else if (sent > 0) {
        toast.success(`Successfully sent ${sent} SMS messages`);
      }

      if (failed > 0) {
        toast.error(`Failed to send ${failed} messages`);
        console.error("Bulk SMS Errors:", errors);
      }

      // Clear selection on success
      setSelectedStudents([]);
    } catch (error) {
      console.error("Bulk send error:", error);
      toast.error(error?.response?.data?.message || "Failed to send bulk SMS");
    } finally {
      setIsBulkSending(false);
    }
  };

  // Helper: currency
  const formatCurrency = (amount) => {
    try {
      const num = Number(amount);
      return isNaN(num) ? "0" : num.toLocaleString();
    } catch (error) {
      console.warn("Currency formatting error:", error);
      return "0";
    }
  };

  // Helper: date
  const formatDate = (date) => {
    try {
      if (!date) return "N/A";
      return new Date(date).toLocaleDateString();
    } catch (error) {
      console.warn("Date formatting error:", error);
      return "N/A";
    }
  };

  // Helper: API errors
  const handleApiError = (error, context) => {
    console.error(`${context} error:`, error);

    if (error?.response?.status === 401) {
      toast.error("Please login to access fee information");
      return;
    }

    if (error?.response?.status === 403) {
      toast.error("You do not have permission to access this data");
      return;
    }

    if (!error?.response) {
      toast.error("Network error - Please check your connection");
      return;
    }

    toast.error(`Failed to load ${context.toLowerCase()}`);
  };

  // Delete payment mutation
  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }) => feesAPI.deletePayment(id, reason),
    onSuccess: () => {
      toast.success("Payment deleted successfully");
      queryClient.invalidateQueries(["paid-fees"]);
      queryClient.invalidateQueries(["all-payments"]);
      setDeleteModal({ isOpen: false, payment: null });
      setDeleteReason("");
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to delete payment");
    },
  });

  const handleDeleteClick = (payment) => {
    setDeleteModal({ isOpen: true, payment });
  };

  const handleDeleteConfirm = () => {
    if (!deleteReason.trim()) {
      toast.error("Please provide a reason for deletion");
      return;
    }

    deleteMutation.mutate({
      id: deleteModal.payment._id,
      reason: deleteReason,
    });
  };

  // Overview data
  const { data: allPaymentsData, isLoading: loadingAllPaymentData } = useQuery({
    queryFn: async () => {
      const response = await feesAPI.getAll();
      return response.data;
    },
  });

  const animatedThisMonthDue = useCountUp(allPaymentsData?.thisMonthDueAmount ?? 0);
  const animatedThisMonthPaid = useCountUp(allPaymentsData?.thisMonthPaidAmount ?? 0);
  const animatedOverdue = useCountUp(allPaymentsData?.totalOverdueAmount ?? 0);

  // Current month due
  const {
    data: dueFeesData,
    isLoading: loadingDue,
    error: dueError,
    refetch: refetchDue,
  } = useQuery({
    queryKey: ["due-fees", filters],
    queryFn: () => feesAPI.getDuePayments(filters),
    enabled: activeTab === "due" && !!user && !authLoading,
    retry: 2,
    retryDelay: 1000,
    onError: (error) => handleApiError(error, "Due Payments"),
    staleTime: 5 * 60 * 1000,
  });

  // Overdue
  const {
    data: overdueFeesData,
    isLoading: loadingOverdue,
    error: overdueError,
    refetch: refetchOverdue,
  } = useQuery({
    queryKey: ["overdue-fees", filters],
    queryFn: () => feesAPI.getOverduePayments(filters),
    enabled: activeTab === "overdue" && !!user && !authLoading,
    retry: 2,
    retryDelay: 1000,
    onError: (error) => handleApiError(error, "Overdue Payments"),
    staleTime: 5 * 60 * 1000,
  });

  // Current month paid
  const {
    data: paidFeesData,
    isLoading: loadingPaid,
    error: paidError,
    refetch: refetchPaid,
  } = useQuery({
    queryKey: ["paid-fees", filters],
    queryFn: async () => {
      const res = await feesAPI.getPaidPayments(filters);
      if (res && typeof res === "object" && "data" in res) {
        return res.data;
      }
      return res;
    },
    enabled: activeTab === "paid" && !!user && !authLoading,
    retry: 2,
    retryDelay: 1000,
    onError: (error) => handleApiError(error, "Paid Payments"),
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Next month due
  const {
    data: nextMonthData,
    isLoading: loadingNextMonth,
    error: nextMonthError,
    refetch: refetchNextMonth,
  } = useQuery({
    queryKey: ["next-month-due", filters],
    queryFn: async () => {
      if (typeof feesAPI.getNextMonthDue === "function") {
        return feesAPI.getNextMonthDue(filters);
      }
    },
    enabled: activeTab === "nextMonthDue" && !!user && !authLoading,
    retry: 2,
    onError: (error) => handleApiError(error, "Next Month Due"),
  });

  // All paid history
  const {
    data: allPaymentsFeesData,
    isLoading: loadingAllFeesPayments,
    error: allPaymentsFeesError,
    refetch: refetchAllFeesPayments,
  } = useQuery({
    queryKey: ["all-payments", filters],
    queryFn: async () => {
      const response = await feesAPI.getAllPaidPayments(filters);
      return response.data;
    },
    enabled: activeTab === "allPaymentFeesData" && !!user && !authLoading,
    retry: 2,
    retryDelay: 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onError: (error) => handleApiError(error, "All Payments"),
  });

  // All due (all months)
  const {
    data: allDueData,
    isLoading: loadingAllDue,
    error: allDueError,
    refetch: refetchAllDue,
  } = useQuery({
    queryKey: ["all-due-payments", filters],
    queryFn: async () => {
      const res = await feesAPI.getAllDuePayments(filters);
      return res;
    },
    enabled: activeTab === "allDuePayments" && !!user && !authLoading,
    retry: 2,
    onError: (error) => handleApiError(error, "All Due Payments"),
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const tabs = [
    {
      id: "due",
      name: "Current Due",
      icon: Clock,
      color: "text-yellow-600",
      count: dueFeesData?.data?.thisMonthDues?.length || 0,
      error: dueError,
    },
    {
      id: "overdue",
      name: "All Overdues",
      icon: AlertTriangle,
      color: "text-red-600",
      count: overdueFeesData?.data?.overduePaymentData?.length || 0,
      error: overdueError,
    },
    {
      id: "paid",
      name: "Current Month Payment",
      icon: CheckCircle,
      color: "text-green-600",
      count: paidFeesData?.paidPaymentData?.length || 0,
      error: paidError,
    },
    {
      id: "nextMonthDue",
      name: "Next Month Due",
      icon: ClipboardPaste,
      color: "text-indigo-600",
      count: nextMonthData?.data?.nextMonthDues?.length || 0,
      error: nextMonthError,
    },
    {
      id: "allPaymentFeesData",
      name: "All Payments",
      icon: BadgeDollarSign,
      color: "text-green-600",
      count: allPaymentsFeesData?.totalCount || 0,
      error: allPaymentsFeesError,
    },
    {
      id: "allDuePayments",
      name: "All Due",
      icon: BadgeDollarSign,
      color: "text-yellow-700",
      count: allDueData?.data?.allDues?.length || 0,
      error: allDueError,
    }
  ];

  // Scroll animation effect
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleSections(prev => new Set([...prev, entry.target.dataset.section]));
        }
      },
      { threshold: 0.1 }
    );

    Object.keys(sectionRefs.current).forEach(sectionId => {
      if (sectionRefs.current[sectionId]) {
        observer.observe(sectionRefs.current[sectionId]);
      }
    });

    return () => {
      Object.keys(sectionRefs.current).forEach(sectionId => {
        if (sectionRefs.current[sectionId]) {
          observer.unobserve(sectionRefs.current[sectionId]);
        }
      });
    };
  }, []);

  // Inject CSS animation
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .slide-in-up {
        animation: slideInUp 0.6s ease-out forwards;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const isLoading =
    loadingAllPaymentData ||
    loadingDue ||
    loadingOverdue ||
    loadingPaid ||
    loadingNextMonth ||
    loadingAllFeesPayments ||
    loadingAllDue;

  // Auth checks
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Checking authentication...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <WifiOff className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Authentication Required
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Please log in to access fee management.
        </p>
        <Link to="/login" className="mt-4 btn btn-primary">
          Go to Login
        </Link>
      </div>
    );
  }

  // Error retry component
  const ErrorRetry = ({ error, onRetry, title }) => (
    <div className="text-center py-8">
      <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">
        Failed to load {title}
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        {error?.response?.status === 401
          ? "Please login again"
          : error?.response?.status === 403
            ? "Access denied"
            : "Network error - Check your connection"}
      </p>
      <button
        onClick={onRetry}
        className="mt-4 btn btn-outline btn-sm flex items-center mx-auto"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </button>
    </div>
  );

  const TabButton = ({ tab }) => (
    <button
      onClick={() => setActiveTab(tab.id)}
      className={`flex items-center px-4 py-2 text-sm font-semibold rounded-xl border transition-all whitespace-nowrap ${
        activeTab === tab.id
          ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm"
          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <tab.icon
        className={`h-4 w-4 mr-2 ${activeTab === tab.id ? "text-indigo-600" : tab.color}`}
      />
      {tab.name}
      {tab.count > 0 && (
        <span
          className={`ml-2 px-2 py-0.5 text-xs rounded-full font-bold ${
            activeTab === tab.id
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {tab.count}
        </span>
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track and manage student fee payments
          </p>
        </div>
        <Link
          to="/fees"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500/30"
        >
          <Plus className="h-4 w-4 mr-2" />
          Record Payment
        </Link>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div 
          ref={el => sectionRefs.current.summary = el}
          data-section="summary"
          className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${
            visibleSections.has('summary') ? 'slide-in-up' : ''
          }`}
        >
          <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-100 shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-xl bg-amber-100">
                <Clock className="h-6 w-6 text-amber-700" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Pending Due Amount Of this Month
                </p>
                <p className="text-2xl font-extrabold text-gray-900 tracking-tight">
                  ₹{formatCurrency(animatedThisMonthDue)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100 shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-xl bg-emerald-100">
                <CheckCircle className="h-6 w-6 text-emerald-700" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Collected This Month
                </p>
                <p className="text-2xl font-extrabold text-gray-900 tracking-tight">
                  ₹{formatCurrency(animatedThisMonthPaid)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-rose-50 to-white rounded-xl border border-rose-100 shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-xl bg-rose-100">
                <AlertTriangle className="h-6 w-6 text-rose-700" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Overdue Amount
                </p>
                <p className="text-2xl font-extrabold text-gray-900 tracking-tight">
                  ₹{formatCurrency(animatedOverdue)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div 
        ref={el => sectionRefs.current.filters = el}
        data-section="filters"
        className={`bg-white rounded-xl border border-gray-100 shadow-sm p-6 ${
          visibleSections.has('filters') ? 'slide-in-up' : ''
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <select
            value={filters.class}
            onChange={(e) => handleFilterChange("class", e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="">All Classes</option>
            <option value="10th">10th Grade</option>
            <option value="11th">11th Grade</option>
            <option value="12th">12th Grade</option>
          </select>

          <select
            value={filters.batch}
            onChange={(e) => handleFilterChange("batch", e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="">All Batches</option>
            <option value="2023-24">2023-24</option>
            <option value="2024-25">2024-25</option>
            <option value="2025-26">2025-26</option>
          </select>

          <button className="inline-flex items-center justify-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div 
        ref={el => sectionRefs.current.tabs = el}
        data-section="tabs"
        className={`bg-white rounded-xl border border-gray-100 shadow-sm ${
          visibleSections.has('tabs') ? 'slide-in-up' : ''
        }`}
      >
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-wrap gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <TabButton key={tab.id} tab={tab} />
            ))}
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <>
              {/* Current Due */}
              {activeTab === "due" && (
                <div 
                  ref={el => sectionRefs.current.due = el}
                  data-section="due"
                  className={`${
                    visibleSections.has('due') ? 'slide-in-up' : ''
                  }`}
                >
                  {dueError ? (
                    <ErrorRetry
                      error={dueError}
                      onRetry={refetchDue}
                      title="Due Payments"
                    />
                  ) : (dueFeesData?.data?.thisMonthDues?.length || 0) > 0 ? (
                    <div className="space-y-4">
                      {/* Bulk Actions Header */}
                      <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                            checked={
                              dueFeesData.data.thisMonthDues.length > 0 &&
                              dueFeesData.data.thisMonthDues.every(i =>
                                selectedStudents.includes(i.studentObjectId)
                              )
                            }
                            onChange={() => handleSelectAll(dueFeesData.data.thisMonthDues)}
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            Select All ({selectedStudents.length} selected)
                          </span>
                        </div>

                        {selectedStudents.length > 0 && (
                          <button
                            onClick={() => handleBulkSend('due')}
                            disabled={isBulkSending}
                            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          >
                            {isBulkSending ? (
                              <LoadingSpinner size="sm" className="mr-1" />
                            ) : (
                              <MessageSquare className="h-4 w-4" />
                            )}
                            Send Reminders ({selectedStudents.length})
                          </button>
                        )}
                      </div>

                      {dueFeesData.data.thisMonthDues.map((item, index) => (
                        <div
                          key={item.studentId}
                          className={`rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-[1px] ${
                            selectedStudents.includes(item.studentObjectId)
                              ? "border-indigo-300 bg-indigo-50/40"
                              : "border-gray-200 hover:border-indigo-200"
                          } ${
                            visibleSections.has('due') ? 'slide-in-up' : ''
                          }`}
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <input
                                type="checkbox"
                                className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                                checked={selectedStudents.includes(item.studentObjectId)}
                                onChange={() => toggleSelection(item.studentObjectId)}
                              />
                              <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center shadow-sm">
                                <CreditCard className="h-6 w-6 text-indigo-600" />
                              </div>
                              <div>
                                <h3 className="text-base font-bold text-gray-900 leading-tight">
                                  {item.name}
                                </h3>
                                <p className="text-sm text-gray-600 mt-0.5">
                                  {item.studentId} • {item.class} • {item.batch}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-extrabold text-rose-600 tracking-tight">
                                ₹{formatCurrency(item.installment?.amount)}
                              </div>
                              <div className="text-sm text-gray-600">
                                Due Date:{" "}
                                {formatDate(item.installment?.dueDate)}
                              </div>
                              <div className="mt-3 flex items-center justify-end gap-3">
                                <SmsSendButton
                                  onSend={() => feesAPI.sendDueReminder(item.studentObjectId)}
                                  label="Reminder"
                                  variant="outline"
                                  size="sm"
                                  icon="message"
                                  successMessage={`Reminder sent to ${item.name}`}
                                />
                                <Link
                                  to={`/fees/payment/${item.studentObjectId}`}
                                  state={{ item }}
                                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                >
                                  Pay Now
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        All fees are up to date!
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        No pending fee payments at the moment.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Overdue */}
              {activeTab === "overdue" && (
                <div 
                  ref={el => sectionRefs.current.overdue = el}
                  data-section="overdue"
                  className={`${
                    visibleSections.has('overdue') ? 'slide-in-up' : ''
                  }`}
                >
                  {overdueError ? (
                    <ErrorRetry
                      error={overdueError}
                      onRetry={refetchOverdue}
                      title="Overdue Payments"
                    />
                  ) : (overdueFeesData?.data?.overduePaymentData?.length || 0) >
                    0 ? (
                    <div className="space-y-4">
                      {/* Bulk Actions Header */}
                      <div className="flex items-center justify-between bg-red-50 p-4 rounded-lg border border-red-200">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-red-600 rounded border-red-300 focus:ring-red-500"
                            checked={
                              overdueFeesData.data.overduePaymentData.length > 0 &&
                              overdueFeesData.data.overduePaymentData.every(i =>
                                selectedStudents.includes(i.studentObjectId)
                              )
                            }
                            onChange={() => handleSelectAll(overdueFeesData.data.overduePaymentData)}
                          />
                          <span className="ml-2 text-sm text-red-800 font-medium">
                            Select All ({selectedStudents.length} selected)
                          </span>
                        </div>

                        {selectedStudents.length > 0 && (
                          <button
                            onClick={() => handleBulkSend('overdue')}
                            disabled={isBulkSending}
                            className="btn btn-danger btn-sm flex items-center"
                          >
                            {isBulkSending ? (
                              <LoadingSpinner size="sm" className="mr-2" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 mr-2" />
                            )}
                            Send Alerts ({selectedStudents.length})
                          </button>
                        )}
                      </div>

                      {overdueFeesData.data.overduePaymentData.map((item, index) => (
                        <div
                          key={item.studentId}
                          className={`border rounded-lg p-4 transition-colors ${
                            selectedStudents.includes(item.studentObjectId)
                              ? 'border-red-400 bg-red-100'
                              : 'border-red-200 bg-red-50'
                            } ${
                              visibleSections.has('overdue') ? 'slide-in-up' : ''
                          }`}
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <input
                                type="checkbox"
                                className="h-4 w-4 text-red-600 rounded border-red-300 focus:ring-red-500"
                                checked={selectedStudents.includes(item.studentObjectId)}
                                onChange={() => toggleSelection(item.studentObjectId)}
                              />
                              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                              </div>
                              <div>
                                <h3 className="font-medium text-gray-900">
                                  {item.name}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  {item.studentId} • {item.class} • {item.batch}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold text-red-600">
                                ₹{formatCurrency(item.installment?.amount)}
                              </div>
                              <div className="text-sm text-gray-600">
                                Due: {formatDate(item.installment?.dueDate)}
                              </div>
                              <div className="mt-2 flex items-center justify-end space-x-2">
                                <SmsSendButton
                                  onSend={() => feesAPI.sendOverdueAlert(item.studentObjectId)}
                                  label="Send Alert"
                                  variant="danger"
                                  size="sm"
                                  icon="alert"
                                  successMessage={`Overdue alert sent to ${item.name}`}
                                />
                                <Link
                                  to={`/fees/payment/${item.studentObjectId}`}
                                  state={{ item }}
                                  className="btn btn-danger btn-sm"
                                >
                                  Pay Now
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        No overdue payments!
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        All students are up to date with their fee payments.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Current Month Paid */}
              {activeTab === "paid" && (
                <div 
                  ref={el => sectionRefs.current.paid = el}
                  data-section="paid"
                  className={`${
                    visibleSections.has('paid') ? 'slide-in-up' : ''
                  }`}
                >
                  {paidError ? (
                    <ErrorRetry
                      error={paidError}
                      onRetry={refetchPaid}
                      title="Paid Payments"
                    />
                  ) : loadingPaid ? (
                    <div className="flex justify-center py-6">
                      <LoadingSpinner size="lg" />
                    </div>
                  ) : (paidFeesData?.paidPaymentData?.length || 0) > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="table">
                        <thead className="table-header bg-gray-100 font-bold">
                          <tr className="table-row">
                            <th className="table-head">Student</th>
                            <th className="table-head">Amount</th>
                            <th className="table-head">Installment No.</th>
                            <th className="table-head">Payment Date</th>
                            <th className="table-head">Mode</th>
                            <th className="table-head">Print</th>
                            <th className="table-head">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paidFeesData.paidPaymentData.map((fee, index) => (
                            <tr key={fee._id} className={`table-row ${
                              visibleSections.has('paid') ? 'slide-in-up' : ''
                            }`} style={{ animationDelay: `${index * 0.05}s` }}>
                              <td className="table-cell">
                                <div className="font-medium text-gray-900">
                                  {fee.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {fee.studentId}
                                </div>
                              </td>

                              <td className="table-cell">
                                <div className="font-semibold text-green-600">
                                  ₹{formatCurrency(fee.paidAmount)}
                                </div>
                              </td>

                              <td className="table-cell">
                                Installment {fee.installmentNumber}
                              </td>

                              <td className="table-cell">
                                {formatDate(fee.paymentDate)}
                              </td>

                              <td className="table-cell capitalize">
                                {fee.paymentMode || "N/A"}
                              </td>

                              <td className="table-cell">
                                <Link
                                  to={`/fees/receipt/${fee._id}`}
                                  className="p-2 text-gray-800 hover:text-green-600 hover:bg-green-50 rounded"
                                >
                                  <PrinterCheck className="h-4 w-4" />
                                </Link>
                              </td>

                              <td className="table-cell">
                                <div className="flex items-center space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => setViewPaymentId(fee._id)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditPaymentId(fee._id)}
                                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteClick(fee)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        No paid payments
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Paid transactions will appear here once fees are
                        collected.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Next Month Due */}
              {activeTab === "nextMonthDue" && (
                <div 
                  ref={el => sectionRefs.current.nextMonthDue = el}
                  data-section="nextMonthDue"
                  className={`${
                    visibleSections.has('nextMonthDue') ? 'slide-in-up' : ''
                  }`}
                >
                  {nextMonthError ? (
                    <ErrorRetry
                      error={nextMonthError}
                      onRetry={refetchNextMonth}
                      title="Next Month Due"
                    />
                  ) : (nextMonthData?.data?.nextMonthDues?.length || 0) > 0 ? (
                    <div className="space-y-4">
                      {nextMonthData.data.nextMonthDues.map((item, index) => (
                        <div
                          key={item.studentId}
                          className={`border border-gray-200 rounded-lg p-4 ${
                            visibleSections.has('nextMonthDue') ? 'slide-in-up' : ''
                          }`}
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                                <ClipboardPaste className="h-6 w-6 text-indigo-600" />
                              </div>
                              <div>
                                <h3 className="font-medium text-gray-900">
                                  {item.name}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  {item.studentId} • {item.class} • {item.batch}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold text-gray-900">
                                ₹{formatCurrency(item.installment?.amount)}
                              </div>
                              <div className="text-sm text-gray-600">
                                Due: {formatDate(item.installment?.dueDate)}
                              </div>
                              <div className="mt-2 flex space-x-2">
                                <Link
                                  to={`/fees/payment/${item.studentObjectId}`}
                                  state={{ item }}
                                  className="btn btn-primary btn-sm"
                                >
                                  Schedule
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ClipboardPaste className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        No upcoming dues
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        There are no dues scheduled for next month.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* All Payments */}
              {activeTab === "allPaymentFeesData" && (
                <div 
                  ref={el => sectionRefs.current.allPaymentFeesData = el}
                  data-section="allPaymentFeesData"
                  className={`${
                    visibleSections.has('allPaymentFeesData') ? 'slide-in-up' : ''
                  }`}
                >
                  {allPaymentsFeesError ? (
                    <ErrorRetry
                      error={allPaymentsFeesError}
                      onRetry={refetchAllFeesPayments}
                      title="All Payments"
                    />
                  ) : loadingAllFeesPayments ? (
                    <div className="flex justify-center py-6">
                      <LoadingSpinner size="lg" />
                    </div>
                  ) : (allPaymentsFeesData?.data?.length || 0) > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="table overflow-auto">
                        <thead className="table-header bg-gray-100 font-bold">
                          <tr className="table-row">
                            <th className="table-head">Student</th>
                            <th className="table-head">Receipt No.</th>
                            <th className="table-head">Amount Paid</th>
                            <th className="table-head">Class / Batch</th>
                            <th className="table-head">Payment Date</th>
                            <th className="table-head">Status</th>
                            <th className="table-head">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(allPaymentsFeesData?.data || []).map((fee, index) => (
                            <tr key={fee._id} className={`table-row ${
                              visibleSections.has('allPaymentFeesData') ? 'slide-in-up' : ''
                            }`} style={{ animationDelay: `${index * 0.05}s` }}>
                              <td className="table-cell">
                                <div className="font-medium text-gray-900">
                                  {fee.student?.name || "Unknown"}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Roll No: {fee.student?.studentId || "N/A"}
                                </div>
                              </td>
                              <td className="table-cell">
                                <div className="font-semibold text-red-700">
                                  {fee.receiptNumber || "N/A"}
                                </div>
                              </td>
                              <td className="table-cell">
                                <div className="font-semibold text-green-600">
                                  ₹{formatCurrency(fee.paidAmount || 0)}
                                </div>
                              </td>
                              <td className="table-cell">
                                {fee.student?.class || "N/A"} -{" "}
                                {fee.student?.batch || "N/A"}
                              </td>
                              <td className="table-cell">
                                {formatDate(fee.paymentDate)}
                              </td>
                              <td className="table-cell">
                                <span
                                  className={`badge ${fee.status === "paid"
                                    ? "badge-success"
                                    : "badge-danger"
                                    }`}
                                >
                                  {fee.status}
                                </span>
                              </td>
                              <td className="table-cell">
                                <button
                                  type="button"
                                  onClick={() => setViewPaymentId(fee._id)}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        No payment records
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Payment records will appear here once fees are
                        collected.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* All Due Payments */}
              {activeTab === "allDuePayments" && (
                <div 
                  ref={el => sectionRefs.current.allDuePayments = el}
                  data-section="allDuePayments"
                  className={`${
                    visibleSections.has('allDuePayments') ? 'slide-in-up' : ''
                  }`}
                >
                  {allDueError ? (
                    <ErrorRetry
                      error={allDueError}
                      onRetry={refetchAllDue}
                      title="All Due Payments"
                    />
                  ) : (allDueData?.data?.allPendingDues?.length || 0) > 0 ? (
                    <div className="space-y-4">
                      {allDueData.data.allPendingDues.map((item, index) => (
                        <div
                          key={`${item._id}-${index}`}
                          className={`border border-gray-200 rounded-lg p-4 ${
                            selectedStudents.includes(item.studentObjectId)
                              ? "border-indigo-300 bg-indigo-50/40"
                              : "border-gray-200 hover:border-indigo-200"
                          } ${
                            visibleSections.has('allDuePayments') ? 'slide-in-up' : ''
                          }`}
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                                <BadgeDollarSign className="h-6 w-6 text-red-600" />
                              </div>
                              <div>
                                <h3 className="font-medium text-gray-900">
                                  {item.student?.name || item.name}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  {item.student?.studentId || item.studentId} •{" "}
                                  {item.class} • {item.batch}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold text-red-600">
                                ₹
                                {formatCurrency(
                                  item.amount || item.installment?.amount
                                )}
                              </div>
                              <div className="text-sm text-gray-600">
                                Due:{" "}
                                {formatDate(
                                  item.dueDate || item.installment?.dueDate
                                )}
                              </div>
                              <div className="mt-2 flex space-x-2">
                                <Link
                                  to={`/fees/payment/${item.studentObjectId || item._id
                                    }`}
                                  state={{ item }}
                                  className="btn btn-primary btn-sm"
                                >
                                  Schedule
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <BadgeDollarSign className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        No due records
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Due records will appear here when present.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <PaymentDetailsModal
        paymentId={viewPaymentId}
        onClose={() => setViewPaymentId(null)}
      />

      <PaymentEditModal
        paymentId={editPaymentId}
        onClose={() => setEditPaymentId(null)}
      />

      <DeletePaymentModal
        isOpen={deleteModal.isOpen}
        payment={deleteModal.payment}
        reason={deleteReason}
        setReason={setDeleteReason}
        onCancel={() => {
          setDeleteModal({ isOpen: false, payment: null });
          setDeleteReason("");
        }}
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isLoading}
      />
    </div>
  );
};

export default Fees;
