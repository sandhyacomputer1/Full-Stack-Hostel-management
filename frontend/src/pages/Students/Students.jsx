import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { studentsAPI } from "../../services/api";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Download,
  Users,
  AlertCircle,
  Grid,
  List,
  UserX,
} from "lucide-react";
import LoadingSpinner from "../../components/UI/LoadingSpinner";
import StudentCard from "../../components/Students/StudentCard";

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

const Students = () => {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 900); // 400ms debounce

  const [filters, setFilters] = useState({
    search: "",
    class: "",
    batch: "",
    status: "active",
    page: 1,
    limit: 10,
  });
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'table'

  const {
    data: studentsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["students", filters],
    queryFn: () => studentsAPI.getAll(filters),
    keepPreviousData: true,
  });

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      search: debouncedSearch,
      page: 1,
    }));
  }, [debouncedSearch]);
  const handleInactivate = (id) => {
    Swal.fire({
      title: "Mark Inactive?",
      text: "Student will be moved to inactive list!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Inactivate!",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          console.log("hey");
          await studentsAPI.inactivate(id);

          Swal.fire({
            title: "Done!",
            text: "Student marked as inactive.",
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          });

          queryClient.invalidateQueries(["students"]); // ⬅ Refresh list
        } catch (err) {
          Swal.fire("Error", err.message || "Failed to update status", "error");
        }
      }
    });
  };
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading students
            </h3>
            <p className="mt-1 text-sm text-red-700">
              {error.response?.data?.message || "Failed to load students"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const students = studentsData?.data?.students || [];
  const pagination = studentsData?.data?.pagination || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage Student Information And Records
          </p>
        </div>
        <Link
          to="/students/add"
          className="relative inline-flex items-center px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg hover:from-indigo-700 hover:to-indigo-800 transform hover:-translate-y-0.5 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <Plus className="h-5 w-5 mr-2 transition-transform duration-200 group-hover:rotate-90" />
          <span className="font-semibold">Add Student</span>
          <span className="absolute inset-0 rounded-lg bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Enhanced Search */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400 group-hover:text-indigo-500 transition-colors duration-200" />
            </div>
            <input
              type="text"
              placeholder="Search students..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 text-gray-700"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
              </button>
            )}
          </div>

          {/* Enhanced Class Filter */}
          <div className="relative group">
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <select
              value={filters.class}
              onChange={(e) => handleFilterChange("class", e.target.value)}
              className="appearance-none block w-full pl-3 pr-8 py-2.5 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-700 cursor-pointer hover:border-gray-400"
            >
              <option value="">All Classes</option>
              <option value="10th">10th Grade</option>
              <option value="11th">11th Grade</option>
              <option value="12th">12th Grade</option>
              <option value="Undergraduate">Undergraduate</option>
              <option value="Postgraduate">Postgraduate</option>
            </select>
          </div>

          {/* Enhanced Batch Filter */}
          <div className="relative group">
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <select
              value={filters.batch}
              onChange={(e) => handleFilterChange("batch", e.target.value)}
              className="appearance-none block w-full pl-3 pr-8 py-2.5 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-700 cursor-pointer hover:border-gray-400"
            >
              <option value="">All Batches</option>
              <option value="2023-24">2023-24</option>
              <option value="2024-25">2024-25</option>
              <option value="2025-26">2025-26</option>
            </select>
          </div>

          {/* Enhanced Status Filter */}
          <div className="relative group">
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="appearance-none block w-full pl-3 pr-8 py-2.5 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-700 cursor-pointer hover:border-gray-400"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="graduated">Graduated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Student List 
            </h3>
            <div className="flex items-center space-x-3">
              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === "grid"
                      ? "bg-white text-primary-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === "table"
                      ? "bg-white text-primary-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
              <div className="text-sm text-gray-600">
                Showing {students.length} students
              </div>
            </div>
          </div>
        </div>

        {students.length > 0 ? (
          viewMode === "grid" ? (
            // Grid View
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {students.map((student, index) => (
                  <div 
                    key={student._id} 
                    className="h-full transition-all duration-500 ease-out transform hover:scale-[1.02] hover:z-10 animate-fade-in-up"
                    style={{
                      animationDelay: `${index * 0.05}s`,
                    }}
                  >
                    <StudentCard student={student} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Table View */
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr className="table-row">
                    <th className="table-head">Student</th>
                    <th className="table-head">ID</th>
                    <th className="table-head">Class</th>
                    <th className="table-head">Contact</th>
                    <th className="table-head">Status</th>
                    <th className="table-head">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student._id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center">
                          {student.documents?.photo?.url ? (
                            <img
                              src={student.documents.photo.url}
                              alt={student.name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                              <Users className="h-5 w-5 text-primary-600" />
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="font-medium text-gray-900">
                              {student.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {student.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="font-mono text-sm">
                          {student.studentId}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div>{student.class}</div>
                        <div className="text-sm text-gray-500">
                          {student.batch}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div>{student.phone}</div>
                        <div className="text-sm text-gray-500">
                          {student.father?.phone}
                        </div>
                      </td>
                      <td className="table-cell">
                        <span
                          className={`badge ${
                            student.status === "active"
                              ? "badge-success"
                              : student.status === "inactive"
                              ? "badge-secondary"
                              : student.status === "suspended"
                              ? "badge-warning"
                              : "badge-default"
                          }`}
                        >
                          {student.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/students/${student._id}`}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            to={`/students/edit/${student._id}`}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleInactivate(student._id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Mark as Inactive"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No students found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding a new student.
            </p>
            <div className="mt-6">
              <Link to="/students/add" className="btn btn-primary btn-md">
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Link>
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
    </div>
  );
};

export default Students;
