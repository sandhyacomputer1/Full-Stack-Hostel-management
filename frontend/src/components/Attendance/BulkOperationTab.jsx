// src/components/Attendance/BulkOperationTab.jsx
import React, { useState, useEffect } from "react";
import {
  Upload,
  Download,
  RefreshCw,
  Users,
  CheckSquare,
  FileSpreadsheet,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  User,
  Building,
  Activity,
  Clock,
  Search,
  Filter,
  Loader2,
  LogIn,
  LogOut,
  ChevronDown
} from "lucide-react";
import { hostelAttendanceAPI, studentsAPI } from "../../services/api";
import Swal from "sweetalert2";

const BulkOperationsTab = () => {
  // State for bulk marking
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [bulkType, setBulkType] = useState("IN");
  const [bulkDate, setBulkDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [bulkNotes, setBulkNotes] = useState("");
  const [blockFilter, setBlockFilter] = useState("");
  const [loading, setLoading] = useState(false);

  // State for CSV import
  const [csvFile, setCsvFile] = useState(null);
  const [csvResults, setCsvResults] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

  // State for multi-day processing
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [processLoading, setProcessLoading] = useState(false);
  const [processResults, setProcessResults] = useState(null);

  // Load students on mount
  useEffect(() => {
    loadStudents();
  }, [blockFilter]);

  // In BulkOperationsTab.jsx - Line 48-61

  const loadStudents = async () => {
    try {
      setLoading(true);

      // ✅ FIX: Use simpler parameters that your backend accepts
      const params = {};

      // Only add block filter if selected
      if (blockFilter) {
        params.block = blockFilter;
      }

      // Don't send status and limit together - backend might reject it
      // Try one of these approaches:

      // Option 1: No filters (get all students)
      const res = await studentsAPI.getAll(params);

      // Option 2: If your backend uses different parameter names
      // const res = await studentsAPI.getAll({
      //   filter: blockFilter || undefined,
      //   pageSize: 500
      // });

      const studentList = res.data.students || res.data.data || res.data || [];

      // ✅ Filter active students on frontend if backend doesn't support it
      const activeStudents = studentList.filter((s) => s.status === "active");

      setStudents(activeStudents);
    } catch (err) {
      console.error("Load students error:", err);

      // ✅ Show more detailed error
      const errorMsg =
        err.response?.data?.message || err.message || "Failed to load students";
      console.log("Detailed error:", err.response?.data);

      Swal.fire("Error", errorMsg, "error");

      // Set empty array so UI doesn't break
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Toggle student selection
  const toggleStudent = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Select all students
  const selectAll = () => {
    setSelectedStudents(students.map((s) => s._id));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedStudents([]);
  };

  // Handle bulk mark
  const handleBulkMark = async () => {
    if (selectedStudents.length === 0) {
      Swal.fire("Warning", "Please select at least one student", "warning");
      return;
    }

    try {
      const result = await Swal.fire({
        title: "Confirm Bulk Marking",
        html: `
          <p>Mark <strong>${selectedStudents.length} students</strong> as <strong>${bulkType}</strong>?</p>
          <p class="text-sm text-gray-600 mt-2">Date: ${bulkDate}</p>
        `,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: `Mark ${bulkType}`,
        confirmButtonColor: bulkType === "IN" ? "#10b981" : "#ef4444",
      });

      if (!result.isConfirmed) return;

      setLoading(true);

      const payload = {
        date: bulkDate,
        students: selectedStudents.map((id) => ({
          studentId: id,
          type: bulkType,
        })),
        notes: bulkNotes || `Bulk ${bulkType} marking`,
      };

      const res = await hostelAttendanceAPI.bulkMark(payload);

      Swal.fire({
        title: "Success!",
        html: `
          <p>✅ Marked: <strong>${res.data.inserted}</strong> students</p>
          ${
            res.data.errors && res.data.errors.length > 0
              ? `<p class="text-red-600 mt-2">❌ Errors: ${res.data.errors.length}</p>`
              : ""
          }
        `,
        icon: "success",
      });

      // Reset selection
      setSelectedStudents([]);
      setBulkNotes("");
    } catch (err) {
      console.error("Bulk mark error:", err);
      Swal.fire(
        "Error",
        err.response?.data?.message || "Failed to mark attendance",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle CSV file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "text/csv") {
      setCsvFile(file);
      setCsvResults(null);
    } else {
      Swal.fire("Error", "Please select a valid CSV file", "error");
    }
  };

  // Handle CSV import
  const handleCsvImport = async () => {
    if (!csvFile) {
      Swal.fire("Warning", "Please select a CSV file first", "warning");
      return;
    }

    try {
      setImportLoading(true);

      // Read CSV file
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target.result;
        const rows = text.split("\n").filter((row) => row.trim());

        if (rows.length < 2) {
          Swal.fire("Error", "CSV file is empty or invalid", "error");
          setImportLoading(false);
          return;
        }

        // Parse CSV
        const headers = rows[0].split(",").map((h) => h.trim());
        const data = rows.slice(1).map((row) => {
          const values = row.split(",").map((v) => v.trim());
          return {
            rollNumber: values[0],
            date: values[1],
            type: values[2],
            notes: values[3] || "",
          };
        });

        // Get student IDs from roll numbers
        const studentsToMark = [];
        const errors = [];

        for (const entry of data) {
          try {
            const student = students.find(
              (s) => s.rollNumber === entry.rollNumber
            );
            if (!student) {
              errors.push({
                rollNumber: entry.rollNumber,
                error: "Student not found",
              });
              continue;
            }

            if (!["IN", "OUT"].includes(entry.type)) {
              errors.push({
                rollNumber: entry.rollNumber,
                error: "Invalid type (must be IN or OUT)",
              });
              continue;
            }

            studentsToMark.push({
              studentId: student._id,
              type: entry.type,
              date: entry.date,
              notes: entry.notes,
            });
          } catch (err) {
            errors.push({ rollNumber: entry.rollNumber, error: err.message });
          }
        }

        // Process in bulk
        if (studentsToMark.length > 0) {
          try {
            const payload = {
              date: studentsToMark[0].date, // Use first entry's date
              students: studentsToMark.map((s) => ({
                studentId: s.studentId,
                type: s.type,
              })),
              notes: "Bulk CSV import",
            };

            const res = await hostelAttendanceAPI.bulkMark(payload);

            setCsvResults({
              success: res.data.inserted,
              errors: [...errors, ...(res.data.errors || [])],
            });

            Swal.fire({
              title: "Import Complete!",
              html: `
                <p>✅ Imported: <strong>${
                  res.data.inserted
                }</strong> records</p>
                ${
                  errors.length > 0
                    ? `<p class="text-red-600">❌ Errors: ${errors.length}</p>`
                    : ""
                }
              `,
              icon: errors.length > 0 ? "warning" : "success",
            });
          } catch (err) {
            Swal.fire("Error", "Failed to import CSV data", "error");
          }
        } else {
          Swal.fire("Error", "No valid entries found in CSV", "error");
        }

        setImportLoading(false);
      };

      reader.readAsText(csvFile);
    } catch (err) {
      console.error("CSV import error:", err);
      Swal.fire("Error", "Failed to process CSV file", "error");
      setImportLoading(false);
    }
  };

  // Download CSV template
  const downloadTemplate = () => {
    const csv = [
      "RollNumber,Date,Type,Notes",
      "007,2025-12-01,IN,Morning entry",
      "008,2025-12-01,OUT,Evening exit",
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance_import_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Handle multi-day processing
  const handleProcessDates = async () => {
    if (!fromDate || !toDate) {
      Swal.fire("Warning", "Please select both start and end dates", "warning");
      return;
    }

    try {
      const result = await Swal.fire({
        title: "Process Past Dates",
        html: `
        <p>This will auto-mark attendance for all students from:</p>
        <p><strong>${fromDate}</strong> to <strong>${toDate}</strong></p>
        <p class="text-sm text-gray-600 mt-2">
          Students who were OUT will be marked ABSENT
        </p>
      `,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Process",
        confirmButtonColor: "#3b82f6",
      });

      if (!result.isConfirmed) return;

      setProcessLoading(true);

      // ✅ Recommended: use existing helper
      const res = await hostelAttendanceAPI.runMultiDayMark({
        fromDate,
        toDate,
      });

      setProcessResults(res.data.results || res.data);

      Swal.fire({
        title: "Processing Complete!",
        html: `
        <p>Processed dates from <strong>${fromDate}</strong> to <strong>${toDate}</strong></p>
      `,
        icon: "success",
      });
    } catch (err) {
      console.error("Process dates error:", err);
      Swal.fire(
        "Error",
        err.response?.data?.message || "Failed to process dates",
        "error"
      );
    } finally {
      setProcessLoading(false);
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
              <h2 className="text-2xl font-bold text-gray-900">Bulk Operations</h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage bulk attendance operations and data imports
              </p>
            </div>
          </div>
          <button
            onClick={loadStudents}
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

      {/* Professional Bulk Mark Section */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100">
            <Users className="h-5 w-5 text-blue-700" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Bulk Marking</h3>
        </div>

        {/* Professional Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Building className="h-4 w-4 inline mr-1 text-gray-500" />
              Block Filter
            </label>
            <select
              value={blockFilter}
              onChange={(e) => setBlockFilter(e.target.value)}
              className="block w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Blocks</option>
              <option value="A">Block A</option>
              <option value="B">Block B</option>
              <option value="C">Block C</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Activity className="h-4 w-4 inline mr-1 text-gray-500" />
              Type
            </label>
            <select
              value={bulkType}
              onChange={(e) => setBulkType(e.target.value)}
              className="block w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Calendar className="h-4 w-4 inline mr-1 text-gray-500" />
              Date
            </label>
            <input
              type="date"
              value={bulkDate}
              onChange={(e) => setBulkDate(e.target.value)}
              className="block w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <FileText className="h-4 w-4 inline mr-1 text-gray-500" />
              Notes
            </label>
            <input
              type="text"
              value={bulkNotes}
              onChange={(e) => setBulkNotes(e.target.value)}
              placeholder="Optional notes..."
              className="block w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Professional Selection Controls */}
        <div className="flex items-center justify-between mb-6 bg-blue-50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-700 bg-white border-2 border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <CheckSquare className="h-4 w-4" />
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <XCircle className="h-4 w-4" />
              Deselect All
            </button>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              {selectedStudents.length} / {students.length} selected
            </span>
          </div>

          <button
            onClick={handleBulkMark}
            disabled={loading || selectedStudents.length === 0}
            className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 ${
              bulkType === "IN"
                ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
            }`}
          >
            <CheckSquare className="h-4 w-4" />
            Mark {selectedStudents.length} Students {bulkType}
          </button>
        </div>

        {/* Professional Students Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-2" />
              <p className="text-sm text-gray-600">Loading students...</p>
            </div>
          </div>
        ) : (
          <div className="border-2 border-gray-200 rounded-xl max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={
                        selectedStudents.length === students.length &&
                        students.length > 0
                      }
                      onChange={(e) =>
                        e.target.checked ? selectAll() : deselectAll()
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Roll Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Block
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Current State
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student._id)}
                        onChange={() => toggleStudent(student._id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {student.rollNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {student.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {student.block || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          student.currentHostelState === "IN"
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : "bg-red-100 text-red-800 border border-red-200"
                        }`}
                      >
                        {student.currentHostelState === "IN" ? (
                          <>
                            <LogIn className="h-3 w-3 mr-1" />
                            IN
                          </>
                        ) : (
                          <>
                            <LogOut className="h-3 w-3 mr-1" />
                            OUT
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Professional CSV Import Section */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-green-100">
            <FileSpreadsheet className="h-5 w-5 text-green-700" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Import from CSV</h3>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  <FileText className="h-4 w-4 inline mr-1" />
                  CSV Format: RollNumber, Date, Type, Notes
                </p>
                <p className="text-xs text-blue-700">Download template to get started</p>
              </div>
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-700 bg-white border-2 border-blue-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105"
              >
                <Download className="h-4 w-4" />
                Download Template
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Upload className="h-4 w-4 inline mr-1 text-gray-500" />
                Choose CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full px-4 py-3 text-sm text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <button
              onClick={handleCsvImport}
              disabled={!csvFile || importLoading}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50"
            >
              {importLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {importLoading ? "Importing..." : "Import CSV"}
            </button>
          </div>

          {csvResults && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-white">
                  <FileText className="h-5 w-5 text-gray-700" />
                </div>
                <h4 className="font-bold text-gray-900">Import Results</h4>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Success: {csvResults.success} records imported</span>
                </div>
                {csvResults.errors && csvResults.errors.length > 0 && (
                  <div className="flex items-center gap-2 text-red-700">
                    <XCircle className="h-5 w-5" />
                    <span className="font-medium">Errors: {csvResults.errors.length} records failed</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Professional Process Past Dates Section */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-amber-100">
            <Calendar className="h-5 w-5 text-amber-700" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Process Past Dates</h3>
        </div>

        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-200">
              <AlertCircle className="h-5 w-5 text-amber-700" />
            </div>
            <div className="text-sm text-amber-900">
              <p className="font-bold mb-2">Auto-Mark for Date Range</p>
              <p>
                This will automatically mark attendance for all students based on their last known state. 
                Students who were OUT will be marked ABSENT.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
              className="block w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleProcessDates}
              disabled={processLoading || !fromDate || !toDate}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl hover:from-amber-700 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50"
            >
              {processLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
              {processLoading ? "Processing..." : "Process Data"}
            </button>
          </div>
        </div>

        {processResults && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-green-200">
                <CheckCircle className="h-5 w-5 text-green-700" />
              </div>
              <h4 className="font-bold text-gray-900">Processing Results</h4>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Successfully processed date range</span>
              </div>
              <div className="text-sm text-gray-600">
                <p>From: <strong>{fromDate}</strong></p>
                <p>To: <strong>{toDate}</strong></p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkOperationsTab;
