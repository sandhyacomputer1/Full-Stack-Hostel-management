// src/components/Attendance/ReconciliationTab.jsx
import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Calendar,
  Filter,
  CheckCircle,
  XCircle,
  Edit3,
  RefreshCw,
  FileText,
  User,
  Clock,
  Search,
  AlertCircle,
  Loader2,
  Users,
  Building,
  Activity
} from "lucide-react";
import { hostelAttendanceAPI } from "../../services/api";
import Swal from "sweetalert2";

// Status Badge Component
const StatusBadge = ({ status, reconciled }) => {
  if (reconciled === false) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Needs Review
      </span>
    );
  }

  const statusConfig = {
    present: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    absent: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="h-3 w-3 mr-1" /> },
    unknown: { bg: 'bg-gray-100', text: 'text-gray-800', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
    late: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Clock className="h-3 w-3 mr-1" /> },
  };

  const config = statusConfig[status] || statusConfig.unknown;
  
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} border`}>
      {config.icon}
      {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'}
    </span>
  );
};

// Source Badge Component
const SourceBadge = ({ source }) => {
  const sourceConfig = {
    biometric: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Biometric' },
    manual: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Manual' },
    system: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'System' },
  };

  const config = sourceConfig[source] || sourceConfig.system;
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

const ReconciliationTab = () => {
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [block, setBlock] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    unreconciled: 0,
    unknown: 0,
  });

  // Modal states
  const [editingRecord, setEditingRecord] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadReconciliationData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, block]);

  const loadReconciliationData = async () => {
    try {
      setLoading(true);
      const res = await hostelAttendanceAPI.getReconciliationList({
        date,
        block: block || undefined,
      });

      const data = Array.isArray(res.data.records) ? res.data.records : [];
      setRecords(data);
      calculateStats(data);
    } catch (err) {
      console.error("Reconciliation error:", err);
      setRecords([]);
      calculateStats([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const total = data.length;
    const unreconciled = data.filter((r) => r.reconciled === false).length;
    const unknown = data.filter((r) => r.status === "unknown").length;
    setStats({ total, unreconciled, unknown });
  };

  const handleEditRecord = (record) => {
    setEditingRecord(record);
    setShowEditModal(true);
  };

  const handleReconcile = async (recordId, updates) => {
    try {
      await hostelAttendanceAPI.reconcile(recordId, updates);

      Swal.fire({
        title: "Success!",
        text: "Record reconciled successfully",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      await loadReconciliationData();
    } catch (err) {
      Swal.fire(
        "Error",
        err?.response?.data?.message || "Failed to reconcile",
        "error"
      );
    }
  };

  const handleQuickReconcile = async (record, status) => {
    const result = await Swal.fire({
      title: `Mark as ${status}?`,
      text: `${record.student?.name || "Student"} - ${date}`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Update",
      confirmButtonColor: status === "present" ? "#10b981" : "#ef4444",
    });

    if (result.isConfirmed) {
      await handleReconcile(record._id, { status });
    }
  };

  const handleBulkReconcile = async (status) => {
    const unreconciledIds = records
      .filter((r) => r.reconciled === false)
      .map((r) => r._id);

    if (unreconciledIds.length === 0) {
      Swal.fire("No Records", "No unreconciled records to update", "info");
      return;
    }

    const result = await Swal.fire({
      title: `Bulk Reconcile ${unreconciledIds.length} records?`,
      text: `Mark all unreconciled records as ${status}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Proceed",
    });

    if (!result.isConfirmed) return;

    try {
      await Promise.all(
        unreconciledIds.map((id) =>
          hostelAttendanceAPI.reconcile(id, { status })
        )
      );

      Swal.fire(
        "Success!",
        `${unreconciledIds.length} records reconciled`,
        "success"
      );

      await loadReconciliationData();
    } catch (err) {
      Swal.fire("Error", "Some records failed to reconcile", "error");
    }
  };

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
              <h2 className="text-2xl font-bold text-gray-900">Attendance Reconciliation</h2>
              <p className="text-sm text-gray-600 mt-1">
                Review and reconcile attendance records that need verification
              </p>
            </div>
          </div>
          <button
            onClick={loadReconciliationData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh Data
          </button>
        </div>
      </div>

      {/* Professional Info Alert */}
      <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-blue-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              About Reconciliation
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              This page shows attendance records that need manual verification:
              unmapped biometric scans, unknown statuses, or unverified entries.
              Review and fix each record to ensure accurate attendance.
            </p>
          </div>
        </div>
      </div>

      {/* Professional Filters */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100">
            <Filter className="h-5 w-5 text-blue-700" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Filter Records</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Calendar className="h-4 w-4 inline mr-1 text-gray-500" />
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="block w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Filter className="h-4 w-4 inline mr-1 text-gray-500" />
              Block
            </label>
            <select
              value={block}
              onChange={(e) => setBlock(e.target.value)}
              className="block w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Blocks</option>
              <option value="A">Block A</option>
              <option value="B">Block B</option>
              <option value="C">Block C</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => handleBulkReconcile("present")}
              disabled={loading || stats.unreconciled === 0}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              Bulk Approve All
            </button>
          </div>
        </div>
      </div>

      {/* Professional Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 hover:shadow-2xl transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Records</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats.total}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total attendance records</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 hover:shadow-2xl transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unreconciled</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">
                {stats.unreconciled}
              </p>
              <p className="text-xs text-gray-500 mt-1">Requires attention</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 hover:shadow-2xl transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unknown Status</p>
              <p className="text-3xl font-bold text-red-600 mt-1">
                {stats.unknown}
              </p>
              <p className="text-xs text-gray-500 mt-1">Needs verification</p>
            </div>
            <div className="p-3 rounded-xl bg-red-50">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Professional Records Table */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-200">
                <FileText className="h-5 w-5 text-blue-700" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Reconciliation Queue
                <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                  {records.length} records
                </span>
              </h3>
            </div>
            <div className="relative">
              <div className="flex items-center">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search records..."
                    className="pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                  />
                  <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-2" />
              <p className="text-sm text-gray-600">Loading records...</p>
            </div>
          </div>
        ) : records.length > 0 ? (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Student Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Block
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Time & Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.map((record, index) => (
                  <tr
                    key={record._id}
                    className={`hover:bg-blue-50 transition-colors ${record.reconciled === false ? 'bg-amber-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {record.student?.name || (
                              <span className="text-red-500 flex items-center">
                                <AlertTriangle className="h-4 w-4 mr-1" />
                                Unmapped
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {record.student?.rollNumber || "N/A"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {record.block || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(record.timestamp).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge 
                        status={record.status} 
                        reconciled={record.reconciled} 
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <SourceBadge source={record.source} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditRecord(record)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Record"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleQuickReconcile(record, "present")}
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Mark as Present"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleQuickReconcile(record, "absent")}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Mark as Absent"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              No records found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {block || date !== new Date().toISOString().slice(0, 10)
                ? "No records match the selected filters"
                : "No records available for today"}
            </p>
            <div className="mt-6">
              <button
                onClick={loadReconciliationData}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editingRecord && (
        <EditRecordModal
          record={editingRecord}
          onClose={() => {
            setShowEditModal(false);
            setEditingRecord(null);
          }}
          onSave={async (updates) => {
            await handleReconcile(editingRecord._id, updates);
            setShowEditModal(false);
            setEditingRecord(null);
          }}
        />
      )}
    </div>
  );
};

// ============================================
// EDIT RECORD MODAL
// ============================================
const EditRecordModal = ({ record, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    status: record.status || "unknown",
    type: record.type || "IN",
    notes: record.notes || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Edit3 className="h-5 w-5 mr-2" />
            Edit Attendance Record
          </h3>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {/* Student Info */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">Student</p>
              <p className="font-medium text-gray-900">
                {record.student?.name || "Unmapped"}
              </p>
              <p className="text-sm text-gray-500">
                {record.student?.rollNumber || "—"} •{" "}
                {record.timestamp
                  ? new Date(record.timestamp).toLocaleString()
                  : "—"}
              </p>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="input"
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="left_early">Left Early</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="input"
              >
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                className="input"
                placeholder="Add notes about this reconciliation..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReconciliationTab;
