// src/components/Attendance/DailyMarkingTab.jsx
import React, { useEffect, useState } from "react";
import {
  Search,
  Calendar,
  Filter,
  Download,
  Clock,
  Users,
  AlertCircle,
  LogIn,
  LogOut,
  RefreshCw,
  UserCheck,
  CheckCircle,
  XCircle,
  TrendingUp,
  Building,
  Activity,
} from "lucide-react";
import { hostelAttendanceAPI, studentsAPI, leaveAPI } from "../../services/api";
import LoadingSpinner from "../UI/LoadingSpinner";
import Swal from "sweetalert2";

const DailyMarkingTab = () => {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [block, setBlock] = useState("");
  const [stateFilter, setStateFilter] = useState(""); // IN, OUT, ALL

  const [students, setStudents] = useState([]); // All active students
  const [attendanceRecords, setAttendanceRecords] = useState([]); // Today's records
  const [filteredStudents, setFilteredStudents] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Manual mark
  const [studentSearch, setStudentSearch] = useState("");
  const [studentOptions, setStudentOptions] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [markType, setMarkType] = useState("IN");
  const [submitting, setSubmitting] = useState(false);

  // Bulk selection
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    currentlyIn: 0,
    currentlyOut: 0,
    entriesToday: 0,
  });

  // Load students and attendance on mount and when date changes
  useEffect(() => {
    loadData();
  }, [date, block]);

  // Filter students when filters change
  useEffect(() => {
    filterStudents();
  }, [students, stateFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      // Load all active students and today's attendance in parallel
      const [studentsRes, attendanceRes] = await Promise.all([
        studentsAPI.getAll({ status: "active", block: block || undefined }),
        hostelAttendanceAPI.getDaily({ date }),
      ]);

      // Normalize students response
      let studentData = [];
      if (studentsRes.data?.students) {
        studentData = studentsRes.data.students;
      } else if (studentsRes.data?.data) {
        studentData = studentsRes.data.data;
      } else if (Array.isArray(studentsRes.data)) {
        studentData = studentsRes.data;
      }

      // Normalize attendance response
      let attendanceData = [];
      if (attendanceRes.data?.records) {
        attendanceData = attendanceRes.data.records;
      } else if (attendanceRes.data?.data) {
        attendanceData = attendanceRes.data.data;
      } else if (Array.isArray(attendanceRes.data)) {
        attendanceData = attendanceRes.data;
      }

      setStudents(studentData);
      setAttendanceRecords(attendanceData);
      calculateStats(studentData, attendanceData);
    } catch (err) {
      console.error("Load data error:", err);
      setError(err?.response?.data?.message || "Failed to load data");
      setStudents([]);
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = [...students];

    // State filter (IN/OUT)
    if (stateFilter) {
      filtered = filtered.filter((s) => s.currentHostelState === stateFilter);
    }

    setFilteredStudents(filtered);
  };

  const calculateStats = (studentData, attendanceData) => {
    const total = studentData.length;
    const currentlyIn = studentData.filter(
      (s) => s.currentHostelState === "IN"
    ).length;
    const currentlyOut = studentData.filter(
      (s) => s.currentHostelState === "OUT"
    ).length;
    const entriesCount = attendanceData.length;

    setStats({
      total,
      currentlyIn,
      currentlyOut,
      entriesToday: entriesCount,
    });
  };

  const checkLeaveStatus = async (studentId, checkDate) => {
    try {
      const res = await hostelAttendanceAPI.checkLeave(studentId, checkDate);
      console.log("checkLeaveStatus response:", res.data); // 👈 add this
      return res.data;
    } catch (err) {
      console.error("Check leave error:", err?.response?.data || err.message);
      return { onLeave: false };
    }
  };

  // ✅ NEW: Handle early return from leave
  const handleEarlyReturn = async (leaveId, studentName) => {
    const today = new Date().toISOString().split("T")[0];

    const result = await Swal.fire({
      title: "Early Return from Leave",
      html: `
        <div style="text-align: left;">
          <p>Mark <strong>${studentName}</strong> as returned early?</p>
          <p style="font-size: 13px; color: #6b7280; margin-top: 8px;">
            This will delete all future leave attendance records.
          </p>
          <label style="display: block; margin-top: 15px; font-weight: bold;">
            Return Date *
          </label>
          <input 
            id="return-date" 
            type="date"
            class="swal2-input"
            value="${date}"
            max="${today}"
            style="width: 100%; margin-top: 5px;"
          />
          <label style="display: block; margin-top: 15px; font-weight: bold;">
            Notes (Optional)
          </label>
          <textarea 
            id="return-notes" 
            class="swal2-textarea"
            placeholder="Reason for early return..."
            style="width: 100%; min-height: 60px; margin-top: 5px;"
          ></textarea>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Process Early Return",
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#6b7280",
      preConfirm: () => {
        const returnDate = document.getElementById("return-date")?.value;
        const notes = document.getElementById("return-notes")?.value.trim();

        if (!returnDate) {
          Swal.showValidationMessage("Please select return date");
          return false;
        }

        return { returnDate, notes };
      },
    });

    if (result.isConfirmed && result.value) {
      try {
        await leaveAPI.earlyReturn(leaveId, result.value);

        await Swal.fire({
          icon: "success",
          title: "Early Return Processed",
          html: `
            <p><strong>${studentName}</strong> marked as returned.</p>
            <p style="font-size: 14px; color: #6b7280; margin-top: 8px;">
              Future leave attendance records have been deleted.
            </p>
          `,
          timer: 3000,
        });

        await loadData();
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: err.response?.data?.message || "Failed to process early return",
        });
      }
    }
  };

  // ✅ UPDATED: Mark with leave check and override
  const markWithLeaveCheck = async (studentId, studentName, type) => {
    // Check if student is on leave
    const leaveStatus = await checkLeaveStatus(studentId, date);

    if (leaveStatus.onLeave) {
      // Show warning with 3 options
      const result = await Swal.fire({
        title: "⚠️ Student is on Leave",
        html: `
          <div style="text-align: left;">
            <p><strong>${studentName}</strong> is on approved leave:</p>
            <div style="background: #fef3c7; padding: 12px; border-radius: 6px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>Type:</strong> ${leaveStatus.leave.leaveType}</p>
              <p style="margin: 5px 0;"><strong>Period:</strong> ${leaveStatus.leave.fromDate} to ${leaveStatus.leave.toDate}</p>
              <p style="margin: 5px 0;"><strong>Reason:</strong> ${leaveStatus.leave.reason}</p>
            </div>
            <p style="color: #dc2626; margin-top: 10px; font-weight: 600;">
              What would you like to do?
            </p>
          </div>
        `,
        icon: "warning",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "✓ Mark Anyway (Override)",
        denyButtonText: "🏠 Process Early Return",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#ef4444",
        denyButtonColor: "#10b981",
        cancelButtonColor: "#6b7280",
      });

      if (result.isConfirmed) {
        // Option 1: Override and mark
        return await markWithOverride(
          studentId,
          studentName,
          type,
          leaveStatus.leave._id
        );
      } else if (result.isDenied) {
        // Option 2: Early return
        await handleEarlyReturn(leaveStatus.leave._id, studentName);
        return false;
      } else {
        // Option 3: Cancel
        return false;
      }
    }

    // No leave - proceed normally
    return true;
  };

  // ✅ NEW: Mark with override
  const markWithOverride = async (studentId, studentName, type, leaveId) => {
    try {
      const payload = {
        studentId,
        type,
        overrideLeave: true,
        leaveApplicationId: leaveId,
        notes: "Student returned early from leave",
      };

      const response = await hostelAttendanceAPI.markAttendance(payload);

      await Swal.fire({
        icon: "success",
        title: "Marked Successfully!",
        text: `${studentName} marked ${type} (leave overridden)`,
        timer: 2000,
        showConfirmButton: false,
      });

      await loadData();
      return true;
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Failed to mark attendance",
      });
      return false;
    }
  };

  // Search students
  const handleSearchStudents = async () => {
    if (!studentSearch.trim()) {
      setStudentOptions([]);
      setSelectedStudent(null);
      return;
    }

    try {
      setSearchLoading(true);
      const res = await studentsAPI.getAll({
        search: studentSearch,
        status: "active",
        limit: 10,
      });

      let list = [];
      if (res.data?.students) list = res.data.students;
      else if (res.data?.data) list = res.data.data;
      else if (Array.isArray(res.data)) list = res.data;

      setStudentOptions(list);
      setSelectedStudent(null);
    } catch (err) {
      console.error("Search error:", err);
      setStudentOptions([]);
      setSelectedStudent(null);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle student selection - show current state
  const handleStudentSelect = (studentId) => {
    const student = studentOptions.find((st) => st._id === studentId);
    if (!student) return;

    setSelectedStudent(student);

    // Set suggested action based on current state
    const currentState = student.currentHostelState || "IN";
    const suggestedAction = currentState === "IN" ? "OUT" : "IN";

    setMarkType(suggestedAction);
  };

  // ✅ UPDATED: Quick mark with leave check
  const handleQuickMark = async () => {
    if (!selectedStudent) return;

    const currentState = selectedStudent.currentHostelState || "IN";

    // Validation: Can't mark OUT if already OUT
    if (currentState === "OUT" && markType === "OUT") {
      Swal.fire({
        title: "Invalid Action",
        html: `
          <p><strong>${selectedStudent.name}</strong> is already <strong>OUT</strong> of hostel.</p>
          <p class="text-sm text-gray-600 mt-2">Next entry must be <strong>IN</strong>.</p>
        `,
        icon: "error",
      });
      setMarkType("IN");
      return;
    }

    try {
      setSubmitting(true);

      // ✅ Check leave status first
      const canProceed = await markWithLeaveCheck(
        selectedStudent._id,
        selectedStudent.name,
        markType
      );

      if (!canProceed) {
        setSubmitting(false);
        return;
      }

      // Normal mark (no leave or overridden)
      const payload = {
        studentId: selectedStudent._id,
        type: markType,
        notes: `Quick mark ${markType}`,
      };

      const response = await hostelAttendanceAPI.markAttendance(payload);

      Swal.fire({
        title: "Success!",
        text:
          response.data.message || `${selectedStudent.name} marked ${markType}`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      // Reset form
      setStudentSearch("");
      setStudentOptions([]);
      setSelectedStudent(null);

      // Reload data
      await loadData();
    } catch (err) {
      console.error("Mark error:", err);

      const errorMsg =
        err?.response?.data?.message || "Failed to mark attendance";
      const currentStateFromError = err?.response?.data?.currentState;

      Swal.fire({
        title: "Cannot Mark",
        html: `
          <p>${errorMsg}</p>
          ${
            currentStateFromError
              ? `<p class="text-sm text-gray-600 mt-2">Current state: <strong>${currentStateFromError}</strong></p>`
              : ""
          }
        `,
        icon: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ UPDATED: Mark from row with leave check
  const handleMarkFromRow = async (student, type) => {
    const currentState = student.currentHostelState || "IN";

    // Validation
    if (currentState === "OUT" && type === "OUT") {
      Swal.fire({
        title: "Invalid Action",
        html: `
          <p><strong>${student.name}</strong> is already <strong>OUT</strong>.</p>
          <p class="text-sm text-gray-600 mt-2">Next entry must be IN.</p>
        `,
        icon: "error",
      });
      return;
    }

    // ✅ Check leave first
    const canProceed = await markWithLeaveCheck(
      student._id,
      student.name,
      type
    );
    if (!canProceed) return;

    // Proceed with normal confirmation
    Swal.fire({
      title: `Mark ${type}?`,
      html: `
        <p><strong>${student.name}</strong></p>
        <p class="text-sm text-gray-600">Current state: <strong>${currentState}</strong></p>
        <p class="text-sm text-gray-600">New state will be: <strong>${type}</strong></p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: `Yes, Mark ${type}`,
      confirmButtonColor: type === "IN" ? "#10b981" : "#ef4444",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const payload = {
            studentId: student._id,
            type,
            notes: `Manual ${type} from table`,
          };

          const response = await hostelAttendanceAPI.markAttendance(payload);

          Swal.fire({
            title: "Success!",
            text: response.data.message || `Marked ${type} successfully`,
            icon: "success",
            timer: 1500,
          });

          await loadData();
        } catch (err) {
          Swal.fire(
            "Cannot Mark",
            err?.response?.data?.message || "Failed to mark",
            "error"
          );
        }
      }
    });
  };

  // Bulk selection
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = filteredStudents.map((s) => s._id).filter(Boolean);
      setSelectedStudents(allIds);
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectOne = (studentId) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter((id) => id !== studentId));
    } else {
      setSelectedStudents([...selectedStudents, studentId]);
    }
  };

  // Bulk mark
  const handleBulkMark = async (type) => {
    if (selectedStudents.length === 0) {
      Swal.fire("No Selection", "Please select students to mark", "warning");
      return;
    }

    const result = await Swal.fire({
      title: `Bulk Mark ${type}?`,
      text: `Mark ${selectedStudents.length} students as ${type}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: `Yes, Mark ${type}`,
      confirmButtonColor: type === "IN" ? "#10b981" : "#ef4444",
    });

    if (!result.isConfirmed) return;

    try {
      setBulkProcessing(true);

      const response = await hostelAttendanceAPI.bulkMark({
        date,
        students: selectedStudents.map((id) => ({ studentId: id, type })),
        notes: `Bulk ${type}`,
      });

      const { inserted = 0, errors = [], skippedOnLeave = 0 } = response.data;

      if (errors.length === 0 && skippedOnLeave === 0) {
        Swal.fire({
          title: "Success!",
          text: `${inserted} students marked ${type}`,
          icon: "success",
          timer: 2000,
        });
      } else {
        Swal.fire({
          title: "Partial Success",
          html: `
            <p>✅ Success: <strong>${inserted}</strong></p>
            ${
              skippedOnLeave > 0
                ? `<p>🏖️ Skipped (On Leave): <strong>${skippedOnLeave}</strong></p>`
                : ""
            }
            ${
              errors.length > 0
                ? `<p>❌ Failed: <strong>${errors.length}</strong></p>`
                : ""
            }
            ${
              errors.length > 0
                ? `<details class="mt-2 text-left text-sm">
                    <summary>View Errors</summary>
                    <ul class="mt-1 max-h-40 overflow-y-auto">
                      ${errors
                        .map((e) => `<li>${e.studentId || e.error}</li>`)
                        .join("")}
                    </ul>
                  </details>`
                : ""
            }
          `,
          icon: "warning",
        });
      }

      setSelectedStudents([]);
      await loadData();
    } catch (err) {
      Swal.fire(
        "Error",
        err?.response?.data?.message || "Bulk mark failed",
        "error"
      );
    } finally {
      setBulkProcessing(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const url = `${
      import.meta.env.VITE_API_URL || "http://localhost:8080/api"
    }/attendance/export/csv?from=${date}&to=${date}&block=${block || ""}`;
    window.open(url, "_blank");
    Swal.fire({
      title: "Exporting...",
      text: "Check your downloads folder",
      icon: "info",
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const getStudentEntries = (studentId) => {
    return attendanceRecords.filter(
      (a) => String(a.student?._id || a.student) === String(studentId)
    );
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const allSelected =
    filteredStudents.length > 0 &&
    selectedStudents.length === filteredStudents.length;

  return (
    <div className="space-y-8">
      {/* Professional Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Currently IN</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.currentlyIn}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-100">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Currently OUT</p>
              <p className="text-2xl font-bold text-red-600">
                {stats.currentlyOut}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100">
              <Activity className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Entries Today</p>
              <p className="text-2xl font-bold text-amber-600">
                {stats.entriesToday}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Filters */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100">
            <Filter className="h-5 w-5 text-blue-700" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Filters & Actions</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="flex flex-col">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex flex-col">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Building className="h-4 w-4 inline mr-1" />
              Block
            </label>
            <select
              value={block}
              onChange={(e) => setBlock(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            >
              <option value="">All Blocks</option>
              <option value="A">Block A</option>
              <option value="B">Block B</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Activity className="h-4 w-4 inline mr-1" />
              Current State
            </label>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            >
              <option value="">All States</option>
              <option value="IN">IN Hostel</option>
              <option value="OUT">OUT of Hostel</option>
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <button
              onClick={() => loadData()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          <div className="flex flex-col justify-end">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-blue-600 bg-white border-2 border-blue-300 rounded-xl hover:bg-blue-50 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Professional Quick Mark Box */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100">
            <UserCheck className="h-5 w-5 text-blue-700" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Quick Manual Mark</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Search Student
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search student (name/roll)..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") handleSearchStudents();
                }}
                className="pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all w-full"
              />
            </div>
          </div>

          {/* Search Button */}
          <div className="flex flex-col justify-end">
            <button
              onClick={handleSearchStudents}
              disabled={searchLoading || !studentSearch.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {searchLoading ? "Searching..." : "Search"}
            </button>
          </div>

          {/* Student Dropdown */}
          <div className="flex flex-col">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Student
            </label>
            <select
              value={selectedStudent?._id || ""}
              onChange={(e) => handleStudentSelect(e.target.value)}
              disabled={studentOptions.length === 0}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all disabled:bg-gray-100"
            >
              <option value="">
                {studentOptions.length === 0
                  ? "No students found"
                  : "Select student..."}
              </option>
              {studentOptions.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.rollNumber}) - {s.currentHostelState || "IN"}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div className="flex flex-col">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Mark Type
            </label>
            <select
              value={markType}
              onChange={(e) => setMarkType(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              disabled={!selectedStudent}
            >
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
          </div>
        </div>

        {/* Student Status Info */}
        {selectedStudent && (
          <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-sm">
                  <span className="font-semibold text-gray-900">
                    {selectedStudent.name}
                  </span>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ml-3 ${
                      selectedStudent.currentHostelState === "IN"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    Currently {selectedStudent.currentHostelState || "IN"}
                  </span>
                  <span className="text-gray-600 ml-3">
                    {selectedStudent.currentHostelState === "IN"
                      ? "Can mark OUT"
                      : "Must mark IN (to re-enter)"}
                  </span>
                </div>
              </div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  markType === "IN"
                    ? "text-green-600 bg-green-100"
                    : "text-red-600 bg-red-100"
                }`}
              >
                Next: {markType}
              </span>
            </div>
          </div>
        )}

        {/* Mark Button */}
        {selectedStudent && (
          <div className="mt-4">
            <button
              onClick={handleQuickMark}
              disabled={!selectedStudent || submitting}
              className={`inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 ${
                markType === "IN"
                  ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                  : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
              }`}
            >
              {markType === "IN" ? (
                <LogIn className="h-4 w-4" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              {submitting ? "Marking..." : `Mark ${markType}`}
            </button>
          </div>
        )}

        {studentOptions.length > 0 && !selectedStudent && (
          <p className="mt-3 text-sm text-gray-600">
            {studentOptions.length} student(s) found
          </p>
        )}
      </div>

      {/* Professional Bulk Actions */}
      {selectedStudents.length > 0 && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Users className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {selectedStudents.length} student(s) selected
                </p>
                <p className="text-xs text-gray-600">
                  Bulk operations available
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleBulkMark("IN")}
                disabled={bulkProcessing}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                <LogIn className="h-4 w-4" />
                Mark All IN
              </button>
              <button
                onClick={() => handleBulkMark("OUT")}
                disabled={bulkProcessing}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                Mark All OUT
              </button>
              <button
                onClick={() => setSelectedStudents([])}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-gray-600 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Professional Error Messages */}
      {error && (
        <div className="bg-white rounded-2xl shadow-2xl border border-red-200 p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Professional Students Table */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-200">
              <Users className="h-5 w-5 text-blue-700" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              Students ({filteredStudents.length})
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Block
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Current State
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Entries Today
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.map((student) => {
                  const studentId = student._id;
                  const isSelected = selectedStudents.includes(studentId);
                  const currentState = student.currentHostelState || "IN";
                  const entries = getStudentEntries(studentId);
                  const lastUpdate = student.lastStateUpdate;

                  return (
                    <tr
                      key={studentId}
                      className="hover:bg-blue-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(studentId)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="ml-3">
                            <div className="font-medium text-gray-900">
                              {student.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {student.rollNumber}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                          <Building className="h-3 w-3 mr-1" />
                          Block {student.block}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            currentState === "IN"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {currentState === "IN" ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              IN
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              OUT
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {entries.length}{" "}
                          {entries.length === 1 ? "entry" : "entries"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatTime(lastUpdate)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleMarkFromRow(student, "IN")}
                            disabled={currentState === "IN"}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
                            title={
                              currentState === "IN" ? "Already IN" : "Mark IN"
                            }
                          >
                            <LogIn className="h-4 w-4" />
                            IN
                          </button>
                          <button
                            onClick={() => handleMarkFromRow(student, "OUT")}
                            disabled={currentState === "OUT"}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
                            title={
                              currentState === "OUT"
                                ? "Already OUT"
                                : "Mark OUT"
                            }
                          >
                            <LogOut className="h-4 w-4" />
                            OUT
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="flex flex-col items-center">
              <Users className="h-12 w-12 text-gray-400 mb-3" />
              <h3 className="text-sm font-medium text-gray-900">
                No students found
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Try adjusting your filters
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyMarkingTab;
