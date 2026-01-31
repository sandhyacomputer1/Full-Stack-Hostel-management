import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  RefreshCw,
  XCircle,
  Eye,
  Save,
  Calendar,
  User,
} from "lucide-react";
import { employeeAttendanceAPI } from "../../services/api";
import toast from "react-hot-toast";

const ReconciliationTab = () => {
  const [unreconciledRecords, setUnreconciledRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [reconciliationNotes, setReconciliationNotes] = useState("");
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => {
    fetchUnreconciledRecords();
  }, []);

  const fetchUnreconciledRecords = async () => {
    try {
      setLoading(true);
      console.log("📊 Fetching unreconciled records...");

      // ✅ CORRECT: Use getUnreconciled (matches backend /unreconciled route)
      const response = await employeeAttendanceAPI.getUnreconciled();

      console.log("📊 Unreconciled records response:", response.data);

      setUnreconciledRecords(response.data.data || []);

      if ((response.data.data || []).length === 0) {
        toast.success("No unreconciled records found!");
      }
    } catch (error) {
      console.error("❌ Error fetching unreconciled records:", error);
      console.error("❌ Error response:", error.response?.data);

      toast.error(
        error.response?.data?.message || "Failed to load unreconciled records"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReconcile = async (recordId) => {
    if (!reconciliationNotes.trim()) {
      toast.error("Please add reconciliation notes");
      return;
    }

    try {
      setReconciling(true);

      console.log("✅ Reconciling record:", recordId);
      console.log("📝 Notes:", reconciliationNotes);

      await employeeAttendanceAPI.reconcile(recordId, {
        notes: reconciliationNotes,
      });

      toast.success("Record reconciled successfully!");

      // Close modal and refresh
      setSelectedRecord(null);
      setReconciliationNotes("");
      fetchUnreconciledRecords();
    } catch (error) {
      console.error("❌ Error reconciling record:", error);
      toast.error(
        error.response?.data?.message || "Failed to reconcile record"
      );
    } finally {
      setReconciling(false);
    }
  };

  const getIssueIcon = (type) => {
    switch (type) {
      case "DUPLICATE_CHECKIN":
      case "DUPLICATE_CHECKOUT":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case "OUT_BEFORE_IN":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "MISSING_CHECKOUT":
        return <Clock className="w-5 h-5 text-orange-600" />;
      case "UNUSUAL_TIME":
      case "UNUSUAL_HOURS":
        return <AlertTriangle className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getSeverityBadge = (severity) => {
    const badges = {
      error: "bg-red-100 text-red-800",
      warning: "bg-yellow-100 text-yellow-800",
      info: "bg-blue-100 text-blue-800",
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
          badges[severity] || badges.info
        }`}
      >
        {severity?.toUpperCase() || "INFO"}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Attendance Reconciliation
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Review and resolve attendance discrepancies
          </p>
        </div>
        <button
          onClick={fetchUnreconciledRecords}
          disabled={loading}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Error Issues</p>
              <p className="text-2xl font-bold text-red-700 mt-1">
                {
                  unreconciledRecords.filter((r) =>
                    r.validationIssues?.some((i) => i.severity === "error")
                  ).length
                }
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">
                Warning Issues
              </p>
              <p className="text-2xl font-bold text-yellow-700 mt-1">
                {
                  unreconciledRecords.filter((r) =>
                    r.validationIssues?.some((i) => i.severity === "warning")
                  ).length
                }
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">
                Total Unreconciled
              </p>
              <p className="text-2xl font-bold text-gray-700 mt-1">
                {unreconciledRecords.length}
              </p>
            </div>
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Records List */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading unreconciled records...</p>
        </div>
      ) : unreconciledRecords.length === 0 ? (
        <div className="text-center py-12 bg-green-50 rounded-lg border border-green-200">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-green-700">All Clear!</p>
          <p className="text-sm text-green-600 mt-2">
            No unreconciled attendance records found.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issues
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check In/Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {unreconciledRecords.map((record) => (
                <tr key={record._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {formatDate(record.date)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {record.employee?.fullName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {record.employee?.employeeCode}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 capitalize">
                      {record.status?.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {record.validationIssues
                        ?.slice(0, 2)
                        .map((issue, idx) => (
                          <div
                            key={idx}
                            className="flex items-start space-x-2 text-xs"
                          >
                            {getIssueIcon(issue.type)}
                            <div className="flex-1">
                              <p className="text-gray-700">{issue.message}</p>
                              {getSeverityBadge(issue.severity)}
                            </div>
                          </div>
                        ))}
                      {record.validationIssues?.length > 2 && (
                        <p className="text-xs text-gray-500 pl-7">
                          +{record.validationIssues.length - 2} more issues
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400">In:</span>
                        <span>{formatTime(record.checkInTime)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400">Out:</span>
                        <span>{formatTime(record.checkOutTime)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => {
                        setSelectedRecord(record);
                        setReconciliationNotes("");
                      }}
                      className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center space-x-1"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Review</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reconciliation Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Reconcile Attendance Record
                </h3>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Employee Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Employee</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedRecord.employee?.fullName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedRecord.employee?.employeeCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(selectedRecord.date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Check In</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatTime(selectedRecord.checkInTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Check Out</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatTime(selectedRecord.checkOutTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Hours</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedRecord.totalHours?.toFixed(2) || "0"} hours
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {selectedRecord.status?.replace("_", " ")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Validation Issues */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Validation Issues
                </h4>
                <div className="space-y-3">
                  {selectedRecord.validationIssues?.map((issue, idx) => (
                    <div
                      key={idx}
                      className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                    >
                      {getIssueIcon(issue.type)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900">
                            {issue.type?.replace(/_/g, " ")}
                          </p>
                          {getSeverityBadge(issue.severity)}
                        </div>
                        <p className="text-sm text-gray-600">{issue.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Entries */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  All Entries ({selectedRecord.entries?.length || 0})
                </h4>
                <div className="space-y-2">
                  {selectedRecord.entries?.map((entry, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div className="flex items-center space-x-3">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded ${
                            entry.type === "IN"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {entry.type}
                        </span>
                        <span className="text-sm text-gray-600">
                          {formatTime(entry.timestamp)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 capitalize">
                        {entry.source}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reconciliation Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reconciliation Notes *
                </label>
                <textarea
                  value={reconciliationNotes}
                  onChange={(e) => setReconciliationNotes(e.target.value)}
                  placeholder="Explain how this issue was resolved..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Provide a clear explanation for the reconciliation
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReconcile(selectedRecord._id)}
                  disabled={reconciling || !reconciliationNotes.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {reconciling ? "Reconciling..." : "Mark as Reconciled"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReconciliationTab;
