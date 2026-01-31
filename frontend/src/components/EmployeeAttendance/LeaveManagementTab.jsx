import React, { useState, useEffect } from "react";
import {
  Plus,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  User,
  RefreshCw,
  Eye,
  Umbrella,
  AlertCircle,
} from "lucide-react";
import { employeeLeaveAPI, employeesAPI } from "../../services/api";
import toast from "react-hot-toast";

const LeaveManagementTab = () => {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [processing, setProcessing] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: "",
    leaveType: "sick",
    fromDate: "",
    toDate: "",
    reason: "",
    contactNumber: "",
    address: "",
    isPaid: true,
  });

  useEffect(() => {
    fetchLeaves();
    fetchEmployees();
  }, [statusFilter]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== "all" ? { status: statusFilter } : {};
      const response = await employeeLeaveAPI.getAll(params);
      setLeaves(response.data.data || []);
    } catch (error) {
      console.error("Error fetching leaves:", error);
      toast.error("Failed to load leave applications");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeesAPI.getAll({ status: "ACTIVE" });

      // ✅ Normalize response structure (same as DailyMarkingTab)
      let employeesList = [];
      if (response.data?.employees) {
        employeesList = response.data.employees;
      } else if (response.data?.data) {
        employeesList = response.data.data;
      } else if (Array.isArray(response.data)) {
        employeesList = response.data;
      }

      console.log("📚 Fetched employees for leave:", employeesList.length);
      setEmployees(employeesList);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();

    // ✅ Validate required fields
    if (!formData.employeeId || !formData.fromDate || !formData.toDate) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!formData.reason || formData.reason.trim().length < 10) {
      toast.error("Reason must be at least 10 characters");
      return;
    }

    if (new Date(formData.toDate) < new Date(formData.fromDate)) {
      toast.error("End date cannot be before start date");
      return;
    }

    try {
      setProcessing(true);

      // ✅ Calculate totalDays
      const totalDays = calculateDays(formData.fromDate, formData.toDate);

      // ✅ Construct complete payload
      const payload = {
        employeeId: formData.employeeId,
        leaveType: formData.leaveType,
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        totalDays: totalDays, // ✅ Include calculated days
        reason: formData.reason.trim(),
        contactNumber: formData.contactNumber?.trim() || "",
        address: formData.address?.trim() || "",
        isPaid: formData.isPaid === true || formData.isPaid === "true",
      };

      console.log("📤 Submitting leave application:", payload);

      const response = await employeeLeaveAPI.apply(payload);

      console.log("✅ Leave application response:", response);

      toast.success("Leave application submitted successfully!");
      setShowApplyModal(false);
      resetForm();
      fetchLeaves();
    } catch (error) {
      console.error("❌ Error applying leave:", error);

      // ✅ Better error handling
      let errorMsg = "Failed to apply leave";

      if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.response?.data?.errors) {
        errorMsg = error.response.data.errors.join(", ");
      } else if (error.message) {
        errorMsg = error.message;
      }

      toast.error(errorMsg, { duration: 5000 });
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async (leaveId) => {
    if (!window.confirm("Are you sure you want to approve this leave?")) {
      return;
    }

    try {
      setProcessing(true);
      await employeeLeaveAPI.approve(leaveId, {});
      toast.success("Leave approved successfully!");
      fetchLeaves();
      setShowDetailsModal(false);
    } catch (error) {
      console.error("Error approving leave:", error);
      toast.error("Failed to approve leave");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (leaveId) => {
    const reason = window.prompt("Enter rejection reason:");
    if (!reason) return;

    try {
      setProcessing(true);
      await employeeLeaveAPI.reject(leaveId, { reason });
      toast.success("Leave rejected");
      fetchLeaves();
      setShowDetailsModal(false);
    } catch (error) {
      console.error("Error rejecting leave:", error);
      toast.error("Failed to reject leave");
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async (leaveId) => {
    if (!window.confirm("Are you sure you want to cancel this leave?")) {
      return;
    }

    try {
      setProcessing(true);
      await employeeLeaveAPI.cancel(leaveId);
      toast.success("Leave cancelled successfully!");
      fetchLeaves();
      setShowDetailsModal(false);
    } catch (error) {
      console.error("Error cancelling leave:", error);
      toast.error("Failed to cancel leave");
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: "",
      leaveType: "sick",
      fromDate: "",
      toDate: "",
      reason: "",
      contactNumber: "",
      address: "",
      isPaid: true,
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: {
        color: "bg-yellow-100 text-yellow-800",
        icon: Clock,
        label: "Pending",
      },
      approved: {
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
        label: "Approved",
      },
      rejected: {
        color: "bg-red-100 text-red-800",
        icon: XCircle,
        label: "Rejected",
      },
      cancelled: {
        color: "bg-gray-100 text-gray-800",
        icon: XCircle,
        label: "Cancelled",
      },
    };

    const badge = badges[status] || badges.pending;
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

  const calculateDays = (fromDate, toDate) => {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const filteredLeaves = leaves.filter((leave) => {
    const matchesSearch =
      leave.employee?.fullName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      leave.employee?.employeeCode
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      leave.leaveType?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by employee name, code, or leave type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-96 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <button
            onClick={fetchLeaves}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        <button
          onClick={() => setShowApplyModal(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Apply Leave</span>
        </button>
      </div>

      {/* Leave Applications Table */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading leave applications...</p>
        </div>
      ) : filteredLeaves.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Umbrella className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No leave applications found</p>
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
                  Leave Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  From Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  To Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid/Unpaid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeaves.map((leave) => (
                <tr key={leave._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {leave.employee?.fullName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {leave.employee?.employeeCode}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 capitalize">
                      {leave.leaveType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(leave.fromDate).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(leave.toDate).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {calculateDays(leave.fromDate, leave.toDate)} days
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(leave.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        leave.isPaid
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {leave.isPaid ? "Paid" : "Unpaid"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedLeave(leave);
                          setShowDetailsModal(true);
                        }}
                        className="text-primary-600 hover:text-primary-900"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {leave.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleApprove(leave._id)}
                            disabled={processing}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(leave._id)}
                            disabled={processing}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {leave.status === "approved" && (
                        <button
                          onClick={() => handleCancel(leave._id)}
                          disabled={processing}
                          className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                          title="Cancel"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Apply Employee Leave
              </h3>
            </div>

            <form onSubmit={handleApplyLeave} className="p-6 space-y-4">
              {/* Employee Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.employeeId}
                  onChange={(e) =>
                    setFormData({ ...formData, employeeId: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.employeeCode} - {emp.fullName} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Leave Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leave Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.leaveType}
                    onChange={(e) =>
                      setFormData({ ...formData, leaveType: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="sick">Sick Leave</option>
                    <option value="casual">Casual Leave</option>
                    <option value="earned">Earned Leave</option>
                    <option value="unpaid">Unpaid Leave</option>
                  </select>
                </div>

                {/* Paid/Unpaid */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leave Category
                  </label>
                  <select
                    value={formData.isPaid}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isPaid: e.target.value === "true",
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="true">Paid Leave</option>
                    <option value="false">Unpaid Leave</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* From Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.fromDate}
                    onChange={(e) =>
                      setFormData({ ...formData, fromDate: e.target.value })
                    }
                    min={new Date().toISOString().split("T")[0]}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* To Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.toDate}
                    onChange={(e) =>
                      setFormData({ ...formData, toDate: e.target.value })
                    }
                    min={
                      formData.fromDate ||
                      new Date().toISOString().split("T")[0]
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* ✅ Display Calculated Days */}
              {formData.fromDate && formData.toDate && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Total Leave Days:</strong>{" "}
                    {calculateDays(formData.fromDate, formData.toDate)} days
                  </p>
                </div>
              )}

              {/* Contact Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Number During Leave
                </label>
                <input
                  type="tel"
                  value={formData.contactNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, contactNumber: e.target.value })
                  }
                  placeholder="10-digit mobile number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address During Leave
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  rows={2}
                  placeholder="Address where you'll be during leave"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  required
                  minLength={10}
                  rows={3}
                  placeholder="Provide detailed reason for leave (minimum 10 characters)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {formData.reason && formData.reason.length < 10 && (
                  <p className="text-xs text-red-600 mt-1">
                    {10 - formData.reason.length} more characters required
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowApplyModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {processing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Leave Application</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Details Modal */}
      {showDetailsModal && selectedLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Leave Application Details
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedLeave.employee?.fullName} (
                    {selectedLeave.employee?.employeeCode})
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leave Type
                  </label>
                  <p className="text-sm text-gray-900 capitalize">
                    {selectedLeave.leaveType}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Date
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedLeave.fromDate).toLocaleDateString(
                      "en-IN"
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Date
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedLeave.toDate).toLocaleDateString("en-IN")}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Days
                  </label>
                  <p className="text-sm text-gray-900">
                    {calculateDays(
                      selectedLeave.fromDate,
                      selectedLeave.toDate
                    )}{" "}
                    days
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  {getStatusBadge(selectedLeave.status)}
                </div>

                {selectedLeave.contactNumber && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Number
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedLeave.contactNumber}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leave Category
                  </label>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedLeave.isPaid
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {selectedLeave.isPaid ? "Paid" : "Unpaid"}
                  </span>
                </div>
              </div>

              {selectedLeave.address && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address During Leave
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedLeave.address}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <p className="text-sm text-gray-900">{selectedLeave.reason}</p>
              </div>

              {selectedLeave.status === "rejected" &&
                selectedLeave.reviewNotes && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-red-800 mb-1">
                      Rejection Reason
                    </label>
                    <p className="text-sm text-red-900">
                      {selectedLeave.reviewNotes}
                    </p>
                  </div>
                )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>

                {selectedLeave.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleApprove(selectedLeave._id)}
                      disabled={processing}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleReject(selectedLeave._id)}
                      disabled={processing}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </>
                )}

                {selectedLeave.status === "approved" && (
                  <button
                    onClick={() => handleCancel(selectedLeave._id)}
                    disabled={processing}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Cancel Leave</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveManagementTab;
