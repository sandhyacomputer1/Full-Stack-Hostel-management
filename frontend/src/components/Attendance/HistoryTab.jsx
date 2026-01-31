// src/components/Attendance/HistoryTab.jsx
import React, { useState, useEffect } from "react";
import {
  Calendar,
  Filter,
  Search,
  Download,
  Clock,
  Users,
  LogIn,
  LogOut,
  TrendingUp,
  Eye,
  FileText,
  User,
  Building,
  Activity,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown
} from "lucide-react";
import { hostelAttendanceAPI, studentsAPI } from "../../services/api";

// Type Badge Component
const TypeBadge = ({ type }) => {
  const typeConfig = {
    IN: { bg: 'bg-green-100', text: 'text-green-800', icon: <LogIn className="h-3 w-3 mr-1" /> },
    OUT: { bg: 'bg-red-100', text: 'text-red-800', icon: <LogOut className="h-3 w-3 mr-1" /> },
  };

  const config = typeConfig[type] || typeConfig.IN;
  
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} border`}>
      {config.icon}
      {type}
    </span>
  );
};

// Source Badge Component
const SourceBadge = ({ source }) => {
  const sourceConfig = {
    manual: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Manual' },
    biometric: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Biometric' },
    bulk: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Bulk' },
    auto: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Auto' },
  };

  const config = sourceConfig[source] || sourceConfig.manual;
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    present: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    absent: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="h-3 w-3 mr-1" /> },
    late: { bg: 'bg-amber-100', text: 'text-amber-800', icon: <Clock className="h-3 w-3 mr-1" /> },
    unknown: { bg: 'bg-gray-100', text: 'text-gray-800', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
  };

  const config = statusConfig[status] || statusConfig.unknown;
  
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} border`}>
      {config.icon}
      {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'}
    </span>
  );
};

const HistoryTab = () => {
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // Last 7 days
    return date.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [block, setBlock] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
  });
  const [stats, setStats] = useState({
    totalRecords: 0,
    uniqueStudents: 0,
    inEntries: 0,
    outEntries: 0,
    biometricScans: 0,
    manualEntries: 0,
  });

  // Student detail modal
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // ✅ FIX 1: Auto-load history on component mount
  useEffect(() => {
    loadHistory(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadHistory = async (page = 1) => {
    try {
      setLoading(true);

      const params = {
        from: fromDate,
        to: toDate,
        page,
        limit: pagination.limit,
      };

      if (block) params.block = block;
      if (searchQuery.trim()) params.search = searchQuery.trim(); // ✅ FIX 2: Trim whitespace
      if (typeFilter) params.type = typeFilter;
      if (sourceFilter) params.source = sourceFilter;
      if (shiftFilter) params.shift = shiftFilter;

      const res = await hostelAttendanceAPI.getHistory(params);

      // ✅ FIX 3: Better response handling
      const data = res.data.data || res.data.records || res.data || [];
      const paginationData = res.data.pagination || {};

      setRecords(data);
      setPagination({
        page: paginationData.page || page,
        limit: paginationData.limit || 50,
        total: paginationData.total || data.length,
      });

      calculateStats(data);
    } catch (err) {
      console.error("History error:", err);
      setRecords([]);
      setPagination({ page: 1, limit: 50, total: 0 });
      setStats({
        totalRecords: 0,
        uniqueStudents: 0,
        inEntries: 0,
        outEntries: 0,
        biometricScans: 0,
        manualEntries: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const uniqueStudents = new Set(
      data.map((r) => r.student?._id).filter(Boolean)
    ).size;

    setStats({
      totalRecords: data.length,
      uniqueStudents,
      inEntries: data.filter((r) => r.type === "IN").length,
      outEntries: data.filter((r) => r.type === "OUT").length,
      biometricScans: data.filter((r) => r.source === "biometric").length,
      manualEntries: data.filter((r) => r.source === "manual").length,
    });
  };

  const handleSearch = () => {
    loadHistory(1);
  };

  // ✅ FIX 4: Support Enter key for search
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleReset = () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    setFromDate(date.toISOString().slice(0, 10));
    setToDate(new Date().toISOString().slice(0, 10));
    setBlock("");
    setSearchQuery("");
    setTypeFilter("");
    setSourceFilter("");
    setShiftFilter("");
    setPagination({ page: 1, limit: 50, total: 0 });

    // ✅ FIX 5: Reload after reset
    setTimeout(() => loadHistory(1), 100);
  };

  const exportToCSV = () => {
    if (records.length === 0) {
      alert("No records to export");
      return;
    }

    const headers = [
      "Date",
      "Student Name",
      "Roll Number",
      "Block",
      "Type",
      "Time",
      "Shift",
      "Source",
      "Status",
      "Notes",
    ];

    const rows = records.map((r) => {
      const timestamp = r.timestamp
        ? new Date(r.timestamp).toLocaleString("en-US")
        : "";

      return [
        r.date || "",
        r.student?.name || "",
        r.student?.rollNumber || "",
        r.student?.block || "",
        r.type || "",
        timestamp,
        r.shift || "",
        r.source || "",
        r.status || "",
        `"${(r.notes || "").replace(/"/g, '""')}"`, // ✅ Escape quotes
      ];
    });

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
      "\n"
    );

    // ✅ Add BOM for Excel UTF-8 support
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_history_${fromDate}_to_${toDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleViewStudentDetails = async (student) => {
    if (!student) return;
    setSelectedStudent(student);
    setShowDetailModal(true);
  };

  const handlePageChange = (newPage) => {
    loadHistory(newPage);
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
              <h2 className="text-2xl font-bold text-gray-900">Attendance History</h2>
              <p className="text-sm text-gray-600 mt-1">
                View and search historical attendance records
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportToCSV}
              disabled={records.length === 0}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              onClick={() => loadHistory(1)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </button>
          </div>
        </div>
      </div>
      {/* Professional Search Filters */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100">
            <Filter className="h-5 w-5 text-blue-700" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Search Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Date Range */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Calendar className="h-4 w-4 inline mr-1 text-gray-500" />
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="block w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Calendar className="h-4 w-4 inline mr-1 text-gray-500" />
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="block w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Block */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Building className="h-4 w-4 inline mr-1 text-gray-500" />
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

          {/* Student Search - ✅ FIX 6: Added Enter key support */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <User className="h-4 w-4 inline mr-1 text-gray-500" />
              Student
            </label>
            <input
              type="text"
              placeholder="Name or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="block w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input"
            >
              <option value="">All Types</option>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="input"
            >
              <option value="">All Sources</option>
              <option value="manual">Manual</option>
              <option value="biometric">Biometric</option>
              <option value="bulk">Bulk</option>
              <option value="auto">Auto</option>
            </select>
          </div>

          {/* Shift Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shift
            </label>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="input"
            >
              <option value="">All Shifts</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
              <option value="night">Night</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-end space-x-2">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="btn btn-primary btn-md flex-1 disabled:opacity-50"
            >
              <Search className="h-4 w-4 mr-2" />
              {loading ? "Searching..." : "Search"}
            </button>
            <button
              onClick={handleReset}
              disabled={loading}
              className="btn btn-outline btn-md disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Professional Statistics Cards */}
      {records.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Records</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats.totalRecords}
                </p>
                <p className="text-xs text-gray-500 mt-1">All entries</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unique Students</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {stats.uniqueStudents}
                </p>
                <p className="text-xs text-gray-500 mt-1">Individual students</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">IN Entries</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {stats.inEntries}
                </p>
                <p className="text-xs text-gray-500 mt-1">Check-ins</p>
              </div>
              <div className="p-3 rounded-xl bg-green-50">
                <LogIn className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">OUT Entries</p>
                <p className="text-3xl font-bold text-red-600 mt-1">
                  {stats.outEntries}
                </p>
                <p className="text-xs text-gray-500 mt-1">Check-outs</p>
              </div>
              <div className="p-3 rounded-xl bg-red-50">
                <LogOut className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Biometric</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {stats.biometricScans}
                </p>
                <p className="text-xs text-gray-500 mt-1">Scanned entries</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-50">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Manual</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">
                  {stats.manualEntries}
                </p>
                <p className="text-xs text-gray-500 mt-1">Manual entries</p>
              </div>
              <div className="p-3 rounded-xl bg-orange-50">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Professional Export Button */}
      {records.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Download className="h-4 w-4" />
            Export CSV ({records.length} records)
          </button>
        </div>
      )}

      {/* Professional History Table */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-200">
              <FileText className="h-5 w-5 text-blue-700" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              Attendance History
              {pagination.total > 0 && (
                <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                  {pagination.total} total records
                </span>
              )}
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-2" />
              <p className="text-sm text-gray-600">Loading history...</p>
            </div>
          </div>
        ) : records.length > 0 ? (
          <>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full min-w-[1200px]">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Student Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Block
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Shift
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Source
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
                  {records.map((record, index) => (
                    <tr key={record._id} className="table-row">
                      <td className="table-cell">
                        {(pagination.page - 1) * pagination.limit + index + 1}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center text-sm">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          {record.date}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div>
                          <div className="font-medium text-gray-900">
                            {record.student?.name || "—"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {record.student?.rollNumber || "—"}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        {record.student?.block || "—"}
                      </td>
                      <td className="table-cell">
                        {record.type ? (
                          <span
                            className={`badge ${
                              record.type === "IN"
                                ? "badge-success"
                                : "badge-danger"
                            }`}
                          >
                            {record.type === "IN" ? (
                              <>
                                <LogIn className="h-3 w-3 inline mr-1" />
                                IN
                              </>
                            ) : (
                              <>
                                <LogOut className="h-3 w-3 inline mr-1" />
                                OUT
                              </>
                            )}
                          </span>
                        ) : (
                          <span className="badge badge-secondary">—</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center text-sm">
                          <Clock className="h-4 w-4 mr-1 text-gray-400" />
                          {record.timestamp
                            ? new Date(record.timestamp).toLocaleTimeString()
                            : "—"}
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="text-xs text-gray-600 capitalize">
                          {record.shift || "—"}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span
                          className={`badge ${
                            record.source === "biometric"
                              ? "badge-primary"
                              : record.source === "manual"
                              ? "badge-warning"
                              : "badge-secondary"
                          }`}
                        >
                          {record.source || "—"}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span
                          className={`badge ${
                            record.status === "present"
                              ? "badge-success"
                              : record.status === "absent"
                              ? "badge-danger"
                              : "badge-secondary"
                          }`}
                        >
                          {record.status || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() =>
                            handleViewStudentDetails(record.student)
                          }
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-100 border-2 border-blue-200 rounded-lg hover:bg-blue-200 hover:border-blue-300 hover:text-blue-800 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105"
                          title="View Student Details"
                          disabled={!record.student}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.total > pagination.limit && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}{" "}
                  of {pagination.total} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="btn btn-outline btn-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="flex items-center px-4 text-sm text-gray-700">
                    Page {pagination.page} of{" "}
                    {Math.ceil(pagination.total / pagination.limit)}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={
                      pagination.page >=
                      Math.ceil(pagination.total / pagination.limit)
                    }
                    className="btn btn-outline btn-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No records found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search filters
            </p>
          </div>
        )}
      </div>

      {/* Student Detail Modal */}
      {showDetailModal && selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          fromDate={fromDate}
          toDate={toDate}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedStudent(null);
          }}
        />
      )}
    </div>
  );
};

// ============================================
// STUDENT DETAIL MODAL (unchanged)
// ============================================
const StudentDetailModal = ({ student, fromDate, toDate, onClose }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    loadStudentHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStudentHistory = async () => {
    try {
      setLoading(true);
      const res = await hostelAttendanceAPI.getStudentHistory(student._id, {
        from: fromDate,
        to: toDate,
      });

      setRecords(res.data.records || []);
      setSummary(res.data.summary || null);
    } catch (err) {
      console.error("Student history error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {student.name}
              </h3>
              <p className="text-sm text-gray-500">
                {student.rollNumber} • Block {student.block}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Entries</p>
                <p className="text-xl font-bold text-gray-900">
                  {summary.totalEntries || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">IN Entries</p>
                <p className="text-xl font-bold text-green-600">
                  {summary.totalInEntries || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">OUT Entries</p>
                <p className="text-xl font-bold text-red-600">
                  {summary.totalOutEntries || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Days</p>
                <p className="text-xl font-bold text-blue-600">
                  {summary.daysWithActivity || 0}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Records List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : records.length > 0 ? (
            <div className="space-y-2">
              {records.map((record, index) => (
                <div
                  key={record._id || index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        record.type === "IN"
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {record.type === "IN" ? (
                        <LogIn className="h-5 w-5" />
                      ) : (
                        <LogOut className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {record.type} Entry
                      </div>
                      <div className="text-sm text-gray-500">
                        {record.date} •{" "}
                        {record.timestamp
                          ? new Date(record.timestamp).toLocaleTimeString()
                          : "—"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900 capitalize">
                      {record.shift || "—"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {record.source || "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No records found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="btn btn-primary w-full">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryTab;
