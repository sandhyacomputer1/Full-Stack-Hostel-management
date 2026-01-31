// src/components/Attendance/LeaveManagementTab.jsx
import React, { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Plus,
  Eye,
  Filter,
  AlertTriangle,
  Users,
  Building,
} from "lucide-react";
import { leaveAPI } from "../../services/api";
import Swal from "sweetalert2";
import CreateLeaveModal from "./CreateLeaveModal";
import ViewLeaveModal from "./ViewLeaveModal";

const LeaveManagementTab = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("pending");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewApplication, setViewApplication] = useState(null); // ✅ NEW

  useEffect(() => {
    loadApplications();
  }, [filter]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const params = filter !== "all" ? { status: filter } : {};
      const res = await leaveAPI.getAll(params);
      setApplications(res.data.applications || []);
    } catch (err) {
      console.error("Load applications error:", err);
      Swal.fire("Error", "Failed to load leave applications", "error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle View
  const handleView = async (id) => {
    try {
      const res = await leaveAPI.getById(id);
      setViewApplication(res.data.application);
    } catch (err) {
      console.error("View error:", err);
      Swal.fire("Error", "Failed to load application details", "error");
    }
  };

  // ✅ Handle Approve
  const handleApprove = async (id, studentName) => {
    const result = await Swal.fire({
      title: "Approve Leave?",
      html: `
        <p>Approve leave for <strong>${studentName}</strong>?</p>
        <p class="text-sm text-gray-600 mt-2">
          This will mark attendance as "On Leave" for the period
        </p>
        <textarea 
          id="admin-notes" 
          class="swal2-input" 
          placeholder="Admin notes (optional)"
          style="width: 90%; height: 80px; resize: vertical;"
        ></textarea>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Approve",
      confirmButtonColor: "#10b981",
      cancelButtonText: "Cancel",
      preConfirm: () => {
        return {
          notes: document.getElementById("admin-notes").value.trim(),
        };
      },
    });

    if (result.isConfirmed) {
      try {
        await leaveAPI.approve(id, result.value);

        Swal.fire({
          icon: "success",
          title: "Approved!",
          text: "Leave has been approved successfully",
          timer: 2000,
          showConfirmButton: false,
        });

        loadApplications();
      } catch (err) {
        console.error("Approve error:", err);
        Swal.fire(
          "Error",
          err.response?.data?.message || "Failed to approve leave",
          "error"
        );
      }
    }
  };

  // ✅ FIXED: Handle Reject
  const handleReject = async (id, studentName) => {
    const { value: reason } = await Swal.fire({
      title: `Reject Leave for ${studentName}`,
      input: "textarea",
      inputLabel: "Rejection Reason",
      inputPlaceholder: "Enter reason for rejection (minimum 5 characters)...",
      inputAttributes: {
        "aria-label": "Rejection reason",
        style: "min-height: 100px;",
      },
      showCancelButton: true,
      confirmButtonText: "Reject Leave",
      confirmButtonColor: "#ef4444",
      cancelButtonText: "Cancel",
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return "You need to enter a rejection reason!";
        }
        if (value.trim().length < 5) {
          return `Reason too short! Need at least 5 characters (you have ${
            value.trim().length
          })`;
        }
      },
    });

    if (reason) {
      try {
        await leaveAPI.reject(id, {
          reason: reason.trim(),
          notes: "",
        });

        await Swal.fire({
          icon: "success",
          title: "Rejected!",
          text: "Leave has been rejected",
          timer: 2000,
          showConfirmButton: false,
        });

        loadApplications();
      } catch (err) {
        console.error("Reject error:", err);
        Swal.fire(
          "Error",
          err.response?.data?.message || "Failed to reject",
          "error"
        );
      }
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      approved: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
      cancelled: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return badges[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getLeaveTypeIcon = (type) => {
    const icons = {
      sick: "🤒",
      home: "🏠",
      emergency: "🚨",
      vacation: "🏖️",
      personal: "👤",
      other: "📋",
    };
    return icons[type] || "📋";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Professional Header */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100">
              <FileText className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Leave Management</h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage student leave applications and approvals
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Plus className="h-4 w-4" />
            New Leave Application
          </button>
        </div>
      </div>

      {/* Professional Filters */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100">
            <Filter className="h-5 w-5 text-blue-700" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Filter Applications</h3>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setFilter("pending")}
            className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
              filter === "pending"
                ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg hover:shadow-xl"
                : "bg-white border-2 border-gray-300 text-gray-600 hover:bg-gray-50 shadow-sm hover:shadow-md"
            }`}
          >
            <Clock className="h-4 w-4" />
            Pending
          </button>
          <button
            onClick={() => setFilter("approved")}
            className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
              filter === "approved"
                ? "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg hover:shadow-xl"
                : "bg-white border-2 border-gray-300 text-gray-600 hover:bg-gray-50 shadow-sm hover:shadow-md"
            }`}
          >
            <CheckCircle className="h-4 w-4" />
            Approved
          </button>
          <button
            onClick={() => setFilter("rejected")}
            className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
              filter === "rejected"
                ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg hover:shadow-xl"
                : "bg-white border-2 border-gray-300 text-gray-600 hover:bg-gray-50 shadow-sm hover:shadow-md"
            }`}
          >
            <XCircle className="h-4 w-4" />
            Rejected
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
              filter === "all"
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl"
                : "bg-white border-2 border-gray-300 text-gray-600 hover:bg-gray-50 shadow-sm hover:shadow-md"
            }`}
          >
            <FileText className="h-4 w-4" />
            All Applications
          </button>
        </div>
      </div>

      {/* Professional Applications Table */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-200">
              <FileText className="h-5 w-5 text-blue-700" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Leave Applications</h3>
          </div>
        </div>
        
        {applications.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center">
              <FileText className="h-12 w-12 text-gray-400 mb-3" />
              <h3 className="text-sm font-medium text-gray-900">
                No leave applications found
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {filter !== "all"
                  ? `No ${filter} applications at the moment`
                  : "Create a new application to get started"}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Days
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Applied On
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((app) => (
                  <tr
                    key={app._id}
                    className="hover:bg-blue-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-100">
                          <Users className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {app.student.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {app.student.rollNumber} • {app.student.block}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-xl">
                          {getLeaveTypeIcon(app.leaveType)}
                        </span>
                        <span className="capitalize text-gray-900">{app.leaveType}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="text-gray-900">{app.fromDate}</div>
                        <div className="text-gray-500">to {app.toDate}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        {app.totalDays} days
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className="text-sm text-gray-900 max-w-xs truncate"
                        title={app.reason}
                      >
                        {app.reason}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(app.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                          app.status
                        )}`}
                      >
                        {app.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                        {app.status === "approved" && <CheckCircle className="h-3 w-3 mr-1" />}
                        {app.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                        {app.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {/* View Button */}
                        <button
                          onClick={() => handleView(app._id)}
                          className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-white border-2 border-blue-300 rounded-lg hover:bg-blue-50 transition-all duration-200 shadow-sm hover:shadow-md"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>

                        {/* Approve/Reject Buttons (only for pending) */}
                        {app.status === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                handleApprove(app._id, app.student.name)
                              }
                              className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                handleReject(app._id, app.student.name)
                              }
                              className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Leave Modal */}
      {showCreateModal && (
        <CreateLeaveModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadApplications();
          }}
        />
      )}

      {/* View Leave Modal */}
      {viewApplication && (
        <ViewLeaveModal
          application={viewApplication}
          onClose={() => setViewApplication(null)}
        />
      )}
    </div>
  );
};

export default LeaveManagementTab;
