// src/components/Marks/MarksReportTab.jsx
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, User, BarChart3, BookOpen, X, Download, Filter } from "lucide-react";
import LoadingSpinner from "../UI/LoadingSpinner";
import { marksAPI, studentsAPI } from "../../services/api";
import toast from "react-hot-toast";

const MARKS_EXAM_TYPES = [
  { value: "", label: "All Exam Types" },
  { value: "weekly_test", label: "Weekly Test" },
  { value: "monthly_test", label: "Monthly Test" },
  { value: "unit_test", label: "Unit Test" },
  { value: "mid_term", label: "Mid Term" },
  { value: "final_exam", label: "Final Exam" },
  { value: "assignment", label: "Assignment" },
  { value: "project", label: "Project" },
  { value: "quiz", label: "Quiz" },
];

const MARKS_SUBJECTS = [
  { value: "", label: "All Subjects" },
  { value: "Marathi", label: "Marathi" },
  { value: "Hindi", label: "Hindi" },
  { value: "Sanskrit", label: "Sanskrit" },
  { value: "English", label: "English" },
  { value: "Mathematics", label: "Mathematics" },
  { value: "History", label: "History" },
  { value: "Science", label: "Science" },
  { value: "Social-Sci", label: "Social-Sci" },
  { value: "Geography", label: "Geography" },
  { value: "Biology", label: "Biology" },
  { value: "Physics", label: "Physics" },
  { value: "Chemistry", label: "Chemistry" },
  { value: "Other", label: "Other" },
];

const ACADEMIC_YEARS = [
  { value: "2023-24", label: "2023-24" },
  { value: "2024-25", label: "2024-25" },
  { value: "2025-26", label: "2025-26" },
];

const MarksReportTab = () => {
  const [studentSearch, setStudentSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [filters, setFilters] = useState({
    subject: "",
    examType: "",
    academicYear: "2024-25",
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Debounced search
  useEffect(() => {
    if (studentSearch.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      handleSearchStudents();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [studentSearch]);

  const handleSearchStudents = async () => {
    if (!studentSearch.trim()) return;

    setIsSearching(true);
    try {
      const res = await studentsAPI.getAll({
        search: studentSearch.trim(),
        page: 1,
        limit: 10,
      });

      const students = res?.data?.students || res?.students || [];
      setSearchResults(students);
      setShowDropdown(students.length > 0);

      if (students.length === 0) {
        toast.info("No students found");
      }
    } catch (err) {
      console.error("Student search error:", err);
      toast.error("Failed to search students");
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setStudentSearch("");
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleClearStudent = () => {
    setSelectedStudent(null);
    setStudentSearch("");
    setSearchResults([]);
    setShowDropdown(false);
  };

  // Export to CSV function
  const exportToCSV = () => {
    if (!marks || marks.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      // CSV Headers
      const headers = [
        "Student Name",
        "Student ID",
        "Exam Name",
        "Exam Type",
        "Subject",
        "Marks Obtained",
        "Total Marks",
        "Percentage",
        "Grade",
        "Exam Date",
        "Academic Year"
      ];

      // CSV Rows
      const csvRows = marks.map((m) => {
        return [
          selectedStudent?.name || "N/A",
          selectedStudent?.studentId || "N/A",
          m.examName || "",
          m.examType?.replace("_", " ") || "",
          m.subject || "",
          m.marksObtained || 0,
          m.totalMarks || 0,
          m.percentage || 0,
          m.grade || "",
          new Date(m.examDate).toLocaleDateString() || "",
          m.academicYear || ""
        ].map(value => `"${value}"`).join(",");
      });

      // Combine headers and rows
      const csvContent = [
        headers.join(","),
        ...csvRows
      ].join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const fileName = selectedStudent
        ? `${selectedStudent.name}_marks_${filters.academicYear}.csv`
        : `marks_report_${filters.academicYear}.csv`;

      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("CSV exported successfully!");
    } catch (error) {
      console.error("CSV export error:", error);
      toast.error("Failed to export CSV");
    }
  };

  const {
    data: studentMarksData,
    isLoading: marksLoading,
    error: marksError,
  } = useQuery({
    queryKey: [
      "marks-report-student",
      selectedStudent?._id,
      filters.subject,
      filters.examType,
      filters.academicYear,
    ],
    queryFn: () =>
      selectedStudent
        ? marksAPI.getByStudent(selectedStudent._id, filters)
        : Promise.resolve({ data: { marks: [], pagination: {} } }),
    enabled: !!selectedStudent,
  });

  const {
    data: overallReportData,
    isLoading: reportLoading,
    error: reportError,
  } = useQuery({
    queryKey: [
      "marks-report-summary",
      filters.subject,
      filters.examType,
      filters.academicYear,
    ],
    queryFn: () => marksAPI.getMarksReport(filters),
  });

  const marks = studentMarksData?.data?.marks || studentMarksData?.marks || [];
  const summary = overallReportData?.data || overallReportData || null;

  return (
    <div className="space-y-8">
      {/* Professional Header */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary-100">
            <BarChart3 className="h-6 w-6 text-primary-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Marks Reports</h2>
            <p className="text-sm text-gray-600 mt-1">
              Search students and view marks performance.
            </p>
          </div>
        </div>
      </div>

      {/* Professional Student Search */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-gray-100">
            <User className="h-5 w-5 text-gray-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Search Student</h3>
        </div>

        {selectedStudent ? (
          <div className="flex items-center gap-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-xl p-6">
            <div className="p-3 rounded-xl bg-green-200">
              <User className="h-8 w-8 text-green-700" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-gray-900 text-lg">
                {selectedStudent.name}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                ID: {selectedStudent.studentId} • Class: {selectedStudent.class} •
                Batch: {selectedStudent.batch}
              </div>
            </div>
            <button
              onClick={handleClearStudent}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          </div>
        ) : (
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student name or ID..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="block w-full pl-12 pr-4 py-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <LoadingSpinner size="sm" />
              </div>
            )}

            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-20 mt-2 w-full bg-white border border-gray-300 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
                {searchResults.map((student) => (
                  <button
                    key={student._id}
                    type="button"
                    onClick={() => handleStudentSelect(student)}
                    className="w-full text-left px-4 py-3 hover:bg-primary-50 border-b last:border-0 transition-colors duration-200"
                  >
                    <div className="font-semibold text-gray-900">
                      {student.name}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      ID: {student.studentId} • Class: {student.class} •
                      Batch: {student.batch}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Professional Filters */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-gray-100">
            <Filter className="h-5 w-5 text-gray-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Academic Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Academic Year
            </label>
            <select
              value={filters.academicYear}
              onChange={(e) => handleFilterChange("academicYear", e.target.value)}
              className="block w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              {ACADEMIC_YEARS.map((y) => (
                <option value={y.value} key={y.value}>
                  {y.label}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <select
              value={filters.subject}
              onChange={(e) => handleFilterChange("subject", e.target.value)}
              className="block w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              {MARKS_SUBJECTS.map((s) => (
                <option value={s.value} key={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exam Type
            </label>
            <select
              value={filters.examType}
              onChange={(e) => handleFilterChange("examType", e.target.value)}
              className="block w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              {MARKS_EXAM_TYPES.map((item) => (
                <option value={item.value} key={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Average Marks</p>
          <p className="text-2xl font-bold text-gray-900">
            {reportLoading
              ? "..."
              : summary?.averageMarks
                ? summary.averageMarks.toFixed(2)
                : "0"}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Total Students</p>
          <p className="text-2xl font-bold text-blue-600">
            {reportLoading ? "..." : summary?.totalStudents || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Total Exams</p>
          <p className="text-2xl font-bold text-purple-600">
            {reportLoading ? "..." : summary?.total || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Pass Rate</p>
          <p className="text-2xl font-bold text-green-600">
            {reportLoading ? "..." : `${summary?.passRate || 0}%`}
          </p>
        </div>
      </div>

      {/* Student Marks Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center">
            <BarChart3 className="h-5 w-5 text-primary-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              {selectedStudent
                ? `${selectedStudent.name}'s Marks`
                : "Select a student to view marks"}
            </h3>
          </div>

          {/* Export CSV Button */}
          {selectedStudent && marks.length > 0 && (
            <button
              onClick={exportToCSV}
              className="btn btn-primary btn-sm flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
          )}
        </div>

        {!selectedStudent ? (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              Search and select a student to view their detailed marks report.
            </p>
          </div>
        ) : marksLoading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : marksError ? (
          <div className="text-center py-12">
            <p className="text-sm text-red-600">
              {marksError.message || "Failed to load student marks."}
            </p>
          </div>
        ) : marks.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              No marks found for the selected filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr className="table-row">
                  <th className="table-head">Exam</th>
                  <th className="table-head">Subject</th>
                  <th className="table-head">Marks</th>
                  <th className="table-head">Percentage</th>
                  <th className="table-head">Grade</th>
                  <th className="table-head">Exam Date</th>
                </tr>
              </thead>
              <tbody>
                {marks.map((m) => (
                  <tr key={m._id} className="table-row">
                    <td className="table-cell">
                      <div className="font-medium">{m.examName}</div>
                      <div className="text-xs text-gray-500 capitalize">
                        {m.examType?.replace("_", " ")}
                      </div>
                    </td>
                    <td className="table-cell">{m.subject}</td>
                    <td className="table-cell font-semibold">
                      {m.marksObtained}/{m.totalMarks}
                    </td>
                    <td className="table-cell">
                      <span
                        className={`font-semibold ${m.percentage >= 90
                            ? "text-green-600"
                            : m.percentage >= 70
                              ? "text-blue-600"
                              : m.percentage >= 50
                                ? "text-yellow-600"
                                : "text-red-600"
                          }`}
                      >
                        {m.percentage}%
                      </span>
                    </td>
                    <td className="table-cell">
                      <span
                        className={`badge ${m.grade === "A+" || m.grade === "A"
                            ? "badge-success"
                            : m.grade === "B+" || m.grade === "B"
                              ? "badge-default"
                              : m.grade === "C+" || m.grade === "C"
                                ? "badge-warning"
                                : "badge-danger"
                          }`}
                      >
                        {m.grade}
                      </span>
                    </td>
                    <td className="table-cell">
                      {new Date(m.examDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarksReportTab;
