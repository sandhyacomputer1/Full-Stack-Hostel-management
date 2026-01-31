// src/components/Mess/MessOffTab.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  CheckCircle,
  XCircle,
  Calendar,
  AlertCircle,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useMessSettings } from "../../contexts/MessSettingsContext";
import { messAPI, studentsAPI } from "../../services/api";
import LoadingSpinner from "../UI/LoadingSpinner";
import Swal from "sweetalert2";

const MessOffTab = () => {
  const { settings } = useMessSettings();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    studentId: "",
    fromDate: "",
    toDate: "",
    reason: "",
  });

  const [studentOptions, setStudentOptions] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");

  useEffect(() => {
    loadApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;

      const res = await messAPI.getMessOff(params);
      setApplications(res.data.applications || []);
    } catch (err) {
      console.error("Load applications error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Failed to load applications",
      });
    } finally {
      setLoading(false);
    }
  };

  const searchStudents = async () => {
    if (!studentSearch.trim()) return;

    try {
      const res = await studentsAPI.getAll({
        search: studentSearch,
        status: "active",
        limit: 20,
      });

      const list = res.data?.students || res.data?.data || res.data || [];
      setStudentOptions(list);
    } catch (err) {
      console.error("Search students error:", err);
    }
  };

  const handleOpenModal = () => {
    setFormData({
      studentId: "",
      fromDate: "",
      toDate: "",
      reason: "",
    });
    setStudentOptions([]);
    setStudentSearch("");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const validateDates = () => {
    if (!formData.fromDate || !formData.toDate) {
      return { valid: false, message: "Please select both dates" };
    }

    const from = new Date(formData.fromDate);
    const to = new Date(formData.toDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (from > to) {
      return { valid: false, message: "From date must be before To date" };
    }

    const minDays = settings?.messOffMinDays || 2;
    const diffDays = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays < minDays) {
      return {
        valid: false,
        message: `Mess-off must be for at least ${minDays} days`,
      };
    }

    const advanceNotice = settings?.messOffAdvanceNotice || 1;
    const minFromDate = new Date(today);
    minFromDate.setDate(minFromDate.getDate() + advanceNotice);

    if (from < minFromDate) {
      return {
        valid: false,
        message: `Mess-off must be applied ${advanceNotice} day(s) in advance`,
      };
    }

    return { valid: true };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.studentId || !formData.reason.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "Please fill all required fields",
      });
      return;
    }

    const validation = validateDates();
    if (!validation.valid) {
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: validation.message,
      });
      return;
    }

    try {
      await messAPI.createMessOff(formData);

      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Mess-off application submitted successfully",
        timer: 1500,
        showConfirmButton: false,
      });

      handleCloseModal();
      loadApplications();
    } catch (err) {
      console.error("Submit error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Failed to submit application",
      });
    }
  };

  const handleApprove = async (application) => {
    const result = await Swal.fire({
      icon: "question",
      title: "Approve Mess-Off",
      html: `
        <div style="text-align: left;">
          <p><strong>Student:</strong> ${application.student.name}</p>
          <p><strong>Period:</strong> ${application.fromDate} to ${
        application.toDate
      }</p>
          <p><strong>Duration:</strong> ${
            Math.ceil(
              (new Date(application.toDate) - new Date(application.fromDate)) /
                (1000 * 60 * 60 * 24)
            ) + 1
          } days</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Yes, approve",
      confirmButtonColor: "#10b981",
    });

    if (!result.isConfirmed) return;

    try {
      await messAPI.updateMessOff(application._id, { status: "approved" });

      Swal.fire({
        icon: "success",
        title: "Approved",
        text: "Mess-off application approved",
        timer: 1500,
        showConfirmButton: false,
      });

      loadApplications();
    } catch (err) {
      console.error("Approve error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Failed to approve application",
      });
    }
  };

  const handleReject = async (application) => {
    const { value: reason } = await Swal.fire({
      icon: "warning",
      title: "Reject Mess-Off",
      text: `Reject mess-off for ${application.student.name}?`,
      input: "textarea",
      inputLabel: "Rejection Reason",
      inputPlaceholder: "Enter reason for rejection...",
      showCancelButton: true,
      confirmButtonText: "Yes, reject",
      confirmButtonColor: "#dc2626",
      inputValidator: (value) => {
        if (!value) {
          return "Please provide a rejection reason";
        }
      },
    });

    if (!reason) return;

    try {
      await messAPI.updateMessOff(application._id, {
        status: "rejected",
        rejectionReason: reason,
      });

      Swal.fire({
        icon: "success",
        title: "Rejected",
        text: "Mess-off application rejected",
        timer: 1500,
        showConfirmButton: false,
      });

      loadApplications();
    } catch (err) {
      console.error("Reject error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Failed to reject application",
      });
    }
  };

  const handleEarlyReturn = async (application) => {
    const { value: returnDate } = await Swal.fire({
      icon: "info",
      title: "Early Return",
      text: `Mark early return for ${application.student.name}?`,
      input: "date",
      inputLabel: "Actual Return Date",
      inputAttributes: {
        min: application.fromDate,
        max: application.toDate,
      },
      showCancelButton: true,
      confirmButtonText: "Mark Return",
      confirmButtonColor: "#3b82f6",
      inputValidator: (value) => {
        if (!value) {
          return "Please select return date";
        }
      },
    });

    if (!returnDate) return;

    try {
      await messAPI.updateMessOff(application._id, {
        status: "approved",
        actualReturnDate: returnDate,
      });

      Swal.fire({
        icon: "success",
        title: "Updated",
        text: "Early return marked successfully",
        timer: 1500,
        showConfirmButton: false,
      });

      loadApplications();
    } catch (err) {
      console.error("Early return error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Failed to mark early return",
      });
    }
  };

  const handleCancel = async (application) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Cancel Mess-Off",
      html: `
        <p>Cancel mess-off for <strong>${application.student.name}</strong>?</p>
        <p class="text-sm text-gray-600 mt-2">This will mark the application as cancelled.</p>
      `,
      showCancelButton: true,
      confirmButtonText: "Yes, cancel it",
      confirmButtonColor: "#f97316",
      cancelButtonText: "No, keep it",
    });

    if (!result.isConfirmed) return;

    try {
      await messAPI.deleteMessOff(application._id);

      Swal.fire({
        icon: "success",
        title: "Cancelled",
        text: "Mess-off application cancelled successfully",
        timer: 1500,
        showConfirmButton: false,
      });

      loadApplications();
    } catch (err) {
      console.error("Cancel error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Failed to cancel application",
      });
    }
  };

  // Filter applications by search
  const filteredApplications = useMemo(() => {
    if (!searchTerm) return applications;
    const search = searchTerm.toLowerCase();
    return applications.filter(
      (app) =>
        app.student.name.toLowerCase().includes(search) ||
        app.student.rollNumber.toLowerCase().includes(search)
    );
  }, [applications, searchTerm]);

  const getStatusBadge = (status) => {
    const badges = {
      pending: "badge-warning",
      approved: "badge-success",
      rejected: "badge-danger",
      cancelled: "badge-gray",
    };
    return badges[status] || "badge-gray";
  };

  // Determine which actions to show for each status
  const getActions = (app) => {
    const actions = [];

    if (app.status === "pending") {
      actions.push(
        {
          label: "Approve",
          icon: CheckCircle,
          color: "text-green-600 hover:bg-green-50",
          onClick: () => handleApprove(app),
        },
        {
          label: "Reject",
          icon: XCircle,
          color: "text-red-600 hover:bg-red-50",
          onClick: () => handleReject(app),
        },
        {
          label: "Cancel",
          icon: Trash2,
          color: "text-gray-600 hover:bg-gray-100",
          onClick: () => handleCancel(app),
        }
      );
    } else if (app.status === "approved") {
      if (!app.earlyReturn) {
        actions.push({
          label: "Early Return",
          icon: RotateCcw,
          color: "text-blue-600",
          onClick: () => handleEarlyReturn(app),
          isText: true,
        });
      }
      actions.push({
        label: "Cancel",
        icon: Trash2,
        color: "text-gray-600",
        onClick: () => handleCancel(app),
        isText: true,
      });
    } else if (app.status === "rejected") {
      actions.push(
        {
          label: "Approve",
          icon: CheckCircle,
          color: "text-green-600",
          onClick: () => handleApprove(app),
          isText: true,
        },
        {
          label: "Cancel",
          icon: Trash2,
          color: "text-gray-600",
          onClick: () => handleCancel(app),
          isText: true,
        }
      );
    } else if (app.status === "cancelled") {
      actions.push({
        label: "Approve",
        icon: CheckCircle,
        color: "text-green-600",
        onClick: () => handleApprove(app),
        isText: true,
      });
    }

    return actions;
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400 bg-white"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search student..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
            />
          </div>
        </div>

        <button onClick={handleOpenModal} className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          New Application
        </button>
      </div>

      {/* Mess-Off Rules Info */}
      {settings && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-md p-5 transition-all hover:shadow-lg">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 rounded-full p-3">
              <AlertCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-base font-bold text-blue-900 mb-2">
                Mess-Off Rules
              </h4>
              <div className="text-sm font-semibold text-blue-700 space-y-2">
                <p className="flex items-center">
                  <span className="mr-2">•</span>
                  Minimum duration: <span className="font-bold text-blue-800 ml-1">{settings.messOffMinDays} days</span>
                </p>
                <p className="flex items-center">
                  <span className="mr-2">•</span>
                  Advance notice: <span className="font-bold text-blue-800 ml-1">{settings.messOffAdvanceNotice} day(s)</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Applications Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden transition-all hover:shadow-xl">
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <h3 className="text-xl font-bold text-gray-900">
            Mess-Off Applications ({filteredApplications.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredApplications.length > 0 ? (
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">#</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Student</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Roll</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">From Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">To Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Duration</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Reason</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredApplications.map((app, index) => {
                  const actions = getActions(app);

                  return (
                    <tr key={app._id} className="transition-all hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-600">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-gray-900">{app.student.name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                          {app.student.rollNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{app.fromDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {app.earlyReturn && app.actualReturnDate ? (
                          <div>
                            <span className="line-through text-gray-400 font-medium">
                              {app.toDate}
                            </span>
                            <br />
                            <span className="text-emerald-600 text-sm font-bold">
                              {app.actualReturnDate}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-gray-900">{app.toDate}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                          {Math.ceil(
                            (new Date(
                              app.earlyReturn && app.actualReturnDate
                                ? app.actualReturnDate
                                : app.toDate
                            ) -
                              new Date(app.fromDate)) /
                              (1000 * 60 * 60 * 24)
                          ) + 1}{" "}
                          days
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="max-w-xs truncate font-medium text-gray-700" title={app.reason}>
                          {app.reason}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {app.status === "pending" && (
                          <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            Pending
                          </span>
                        )}
                        {app.status === "approved" && (
                          <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Approved
                          </span>
                        )}
                        {app.status === "rejected" && (
                          <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-200">
                            Rejected
                          </span>
                        )}
                        {app.status === "cancelled" && (
                          <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                            Cancelled
                          </span>
                        )}
                        {app.earlyReturn && (
                          <span className="block mt-1 text-xs font-bold text-emerald-600">
                            Early Return
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {actions.length > 0 ? (
                          <div className="flex items-center justify-center gap-2">
                            {actions.map((action, idx) =>
                              action.isText ? (
                                <button
                                  key={idx}
                                  onClick={action.onClick}
                                  className={`text-xs font-semibold ${action.color} hover:underline flex items-center gap-1 transition-all`}
                                  title={action.label}
                                >
                                  <action.icon className="h-3 w-3" />
                                  {action.label}
                                </button>
                              ) : (
                                <button
                                  key={idx}
                                  onClick={action.onClick}
                                  className={`p-2 ${action.color} rounded-lg transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow-md`}
                                  title={action.label}
                                >
                                  <action.icon className="h-4 w-4" />
                                </button>
                              )
                            )}
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No Applications Found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter
                ? "Try adjusting your filters"
                : "Click 'New Application' to create one"}
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-all">
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <h3 className="text-xl font-bold text-gray-900">
                New Mess-Off Application
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Student Search */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Search Student <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Enter name or roll number..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        searchStudents();
                      }
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={searchStudents}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
                  >
                    Search
                  </button>
                </div>

                {studentOptions.length > 0 && (
                  <div className="mt-3 border border-gray-200 rounded-xl max-h-48 overflow-y-auto shadow-md">
                    {studentOptions.map((student) => (
                      <button
                        key={student._id}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            studentId: student._id,
                          }));
                          setStudentSearch(
                            `${student.name} (${student.rollNumber})`
                          );
                          setStudentOptions([]);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 border-b border-gray-100 last:border-b-0 transition-all"
                      >
                        <div className="font-bold text-gray-900">
                          {student.name}
                        </div>
                        <div className="text-sm font-semibold text-gray-600">
                          {student.rollNumber} • Block {student.block}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    From Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.fromDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        fromDate: e.target.value,
                      }))
                    }
                    min={new Date(
                      Date.now() +
                        (settings?.messOffAdvanceNotice || 1) * 86400000
                    )
                      .toISOString()
                      .slice(0, 10)}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    To Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.toDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        toDate: e.target.value,
                      }))
                    }
                    min={formData.fromDate}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Enter reason for mess-off..."
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all transform hover:scale-105 active:scale-95"
                >
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl">
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessOffTab;
