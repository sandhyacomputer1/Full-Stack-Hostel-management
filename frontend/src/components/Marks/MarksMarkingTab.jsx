// src/components/Marks/MarksMarkingTab.jsx
import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { marksAPI } from "../../services/api";
import { Plus, Search, Edit, Trash2, BookOpen, Grid, List, Filter, Download, Eye } from "lucide-react";
import Swal from "sweetalert2";
import LoadingSpinner from "../UI/LoadingSpinner";
import MarksFormModal from "./MarksFormModal";
import BulkUploadModal from "./MarksBulkTab";

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

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const MarksMarkingTab = () => {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 600);
  const [showModal, setShowModal] = useState(false);
  const [editMark, setEditMark] = useState(null);
  const [showBulk, setShowBulk] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    subject: "",
    examType: "",
    academicYear: "2024-25",
    page: 1,
    limit: 10,
  });

  const [viewMode, setViewMode] = useState("table");

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      search: debouncedSearch,
      page: 1,
    }));
  }, [debouncedSearch]);

  const {
    data: marksData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["marks", filters],
    queryFn: () => marksAPI.getAll(filters),
    keepPreviousData: true,
  });

  const marksList = marksData?.data?.marks || marksData?.marks || [];
  const pagination = marksData?.data?.pagination || marksData?.pagination || {};

  const deleteMutation = useMutation({
    mutationFn: marksAPI.delete,
    onSuccess: () => {
      Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "Marks record deleted successfully.",
        timer: 1200,
        showConfirmButton: false,
      });
      queryClient.invalidateQueries({ queryKey: ["marks"] });
    },
    onError: () => {
      Swal.fire("Error", "Failed to delete record", "error");
    },
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handlePageChange = (page) => {
    setFilters((prev) => ({
      ...prev,
      page,
    }));
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "Delete record?",
      text: "Are you sure you want to permanently delete this marks record?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    }).then((res) => {
      if (res.isConfirmed) {
        deleteMutation.mutate(id);
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Professional Header */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary-100">
              <BookOpen className="h-6 w-6 text-primary-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Marks Entry</h2>
              <p className="text-sm text-gray-600 mt-1">
                Record and manage student exam marks.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowModal(true);
                setEditMark(null);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              <Plus className="h-4 w-4" />
              Add Marks
            </button>
          </div>
        </div>
      </div>

      {/* Professional Filters */}
     {/* Professional Filters */}
<div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
  <div className="flex items-center gap-3 mb-6">
    <div className="p-2 rounded-lg bg-gray-100">
      <Filter className="h-5 w-5 text-gray-600" />
    </div>
    <h3 className="text-lg font-bold text-gray-900">Filters</h3>
  </div>
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
    {/* Search Field - PERFECTLY CENTERED ICON */}
    <div className="relative h-[58px] flex items-end">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
      <input
        type="text"
        placeholder="Search exam or subject..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="block w-full pl-10 pr-4 py-[10px] text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 h-[42px] w-full"
      />
    </div>
    
    {/* Subject - Fixed structure */}
    <div className="flex flex-col h-[58px] justify-end">
      <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
      <select
        value={filters.subject}
        onChange={(e) => handleFilterChange("subject", e.target.value)}
        className="block w-full px-4 py-[10px] text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 h-[42px]"
      >
        {MARKS_SUBJECTS.map((s) => (
          <option value={s.value} key={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
    
    {/* Exam Type - Fixed structure */}
    <div className="flex flex-col h-[58px] justify-end">
      <label className="block text-sm font-medium text-gray-700 mb-2">Exam Type</label>
      <select
        value={filters.examType}
        onChange={(e) => handleFilterChange("examType", e.target.value)}
        className="block w-full px-4 py-[10px] text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 h-[42px]"
      >
        {MARKS_EXAM_TYPES.map((item) => (
          <option value={item.value} key={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
    
    {/* Academic Year - Fixed structure */}
    <div className="flex flex-col h-[58px] justify-end">
      <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
      <select
        value={filters.academicYear}
        onChange={(e) => handleFilterChange("academicYear", e.target.value)}
        className="block w-full px-4 py-[10px] text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 h-[42px]"
      >
        {ACADEMIC_YEARS.map((y) => (
          <option value={y.value} key={y.value}>
            {y.label}
          </option>
        ))}
      </select>
    </div>
  </div>
</div>



      {/* View Toggle and Export */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{pagination.total || 0}</span> records
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                viewMode === "table"
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                viewMode === "grid"
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              title="Grid View"
            >
              <Grid className="h-4 w-4" />
            </button>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Professional Table/Grid Container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">
            Marks Records ({pagination.total || 0})
          </h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner size="lg" />
          </div>
        ) : marksList.length > 0 ? (
          viewMode === "table" ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exam
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Marks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {marksList.map((mark) => (
                    <tr key={mark._id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {mark.student?.name || "Unknown"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {mark.student?.studentId || "-"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {mark.subject}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{mark.examName}</div>
                          <div className="text-sm text-gray-500 capitalize">
                            {mark.examType?.replace("_", " ")}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          {mark.marksObtained}/{mark.totalMarks}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            mark.percentage >= 90
                              ? "bg-green-100 text-green-800"
                              : mark.percentage >= 70
                              ? "bg-blue-100 text-blue-800"
                              : mark.percentage >= 50
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {mark.percentage}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            mark.grade === "A+" || mark.grade === "A"
                              ? "bg-green-100 text-green-800"
                              : mark.grade === "B+" || mark.grade === "B"
                              ? "bg-blue-100 text-blue-800"
                              : mark.grade === "C+" || mark.grade === "C"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {mark.grade}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(mark.examDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors duration-200"
                            title="Edit"
                            onClick={() => {
                              setEditMark(mark);
                              setShowModal(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            title="Delete"
                            onClick={() => handleDelete(mark._id)}
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

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {marksList.map((mark) => (
                  <div
                    key={mark._id}
                    className="rounded-lg border border-gray-200 shadow px-5 py-4 space-y-3 bg-white"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg text-primary-700">
                        {mark.student?.name || "Unknown"}
                      </span>
                      <span
                        className={`badge ${
                          mark.grade === "A+" || mark.grade === "A"
                            ? "badge-success"
                            : mark.grade === "B+" || mark.grade === "B"
                            ? "badge-default"
                            : mark.grade === "C+" || mark.grade === "C"
                            ? "badge-warning"
                            : "badge-danger"
                        }`}
                      >
                        {mark.grade}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Subject: <b>{mark.subject}</b>
                      <br />
                      {mark.examName} ({mark.examType?.replace("_", " ")})
                    </div>
                    <div className="py-2 text-base text-gray-700 font-semibold">
                      <span>
                        {mark.marksObtained}/{mark.totalMarks}
                      </span>{" "}
                      <span
                        className={`ml-4 ${
                          mark.percentage > 79
                            ? "text-green-600"
                            : mark.percentage > 49
                            ? "text-blue-600"
                            : "text-red-600"
                        }`}
                      >
                        {mark.percentage}%
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                        onClick={() => {
                          setEditMark(mark);
                          setShowModal(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                        onClick={() => handleDelete(mark._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No marks records found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding marks for students.
            </p>
            <div className="mt-6">
              <button
                onClick={() => {
                  setShowModal(true);
                  setEditMark(null);
                }}
                className="btn btn-primary btn-md"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Marks
              </button>
            </div>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {(pagination.current - 1) * pagination.limit + 1} to{" "}
                {Math.min(
                  pagination.current * pagination.limit,
                  pagination.total
                )}{" "}
                of {pagination.total} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.current - 1)}
                  disabled={pagination.current === 1}
                  className="btn btn-outline btn-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.current + 1)}
                  disabled={pagination.current === pagination.pages}
                  className="btn btn-outline btn-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <MarksFormModal
          editMark={editMark}
          onClose={() => {
            setShowModal(false);
            setEditMark(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditMark(null);
            queryClient.invalidateQueries(["marks"]);
          }}
        />
      )}

      {/* Bulk Upload Modal */}
      {showBulk && <BulkUploadModal onClose={() => setShowBulk(false)} />}
    </div>
  );
};

export default MarksMarkingTab;
