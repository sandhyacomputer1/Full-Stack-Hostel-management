import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { employeesAPI } from "../../services/api";
import {
    Search,
    UserPlus,
    Edit,
    Trash2,
    Eye,
    Phone,
    Mail,
    IndianRupee,
    Shield,
    Loader2,
    AlertCircle,
    LogIn,
    LogOut,
    Clock,
} from "lucide-react";
import Swal from "sweetalert2";
import { useAuth } from "../../contexts/AuthContext";

const EmployeeListTab = ({ onAddNew, onEdit, onViewDetails }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ["employees", searchTerm, roleFilter, statusFilter],
        queryFn: async () => {
            const params = {};
            if (searchTerm) params.search = searchTerm;
            if (roleFilter) params.role = roleFilter;
            if (statusFilter) params.status = statusFilter;

            console.log("🔍 Fetching employees with params:", params);
            const response = await employeesAPI.getAll(params);
            return response.data;
        },
        staleTime: 30000,
    });

    const handleDelete = async (employeeId, employeeName) => {
        const result = await Swal.fire({
            title: "Deactivate Employee?",
            html: `
        <p>This will deactivate <strong>${employeeName}</strong> and suspend their login access.</p>
        <p class="text-sm text-gray-600 mt-2">This action can be reversed by reactivating the employee.</p>
      `,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "Yes, Deactivate",
            cancelButtonText: "Cancel",
        });

        if (result.isConfirmed) {
            try {
                await employeesAPI.delete(employeeId);

                Swal.fire({
                    icon: "success",
                    title: "Employee Deactivated",
                    text: `${employeeName} has been deactivated successfully.`,
                    timer: 2000,
                    showConfirmButton: false,
                });

                queryClient.invalidateQueries({ queryKey: ["employees"] });
            } catch (error) {
                console.error("❌ Delete Employee Error:", error);
                Swal.fire({
                    icon: "error",
                    title: "Deactivation Failed",
                    text:
                        error.response?.data?.message ||
                        "Failed to deactivate employee",
                });
            }
        }
    };

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
    };

    const employees = data?.employees || [];
    const totalCount = data?.count || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        Staff Directory
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {totalCount} employee{totalCount !== 1 ? "s" : ""} found
                    </p>
                </div>
                <button
                    onClick={onAddNew}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 hover:shadow-md hover:shadow-blue-500/25 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center gap-2 border border-blue-500 text-sm"
                >
                    <UserPlus className="w-4 h-4" />
                    <span>Add New Employee</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="md:col-span-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search by name, code, or phone..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                className="input pl-10 h-11"
                            />
                        </div>
                    </div>

                    {/* Role Filter */}
                    <div>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="input h-11"
                        >
                            <option value="">All Roles</option>
                            <option value="manager">Manager</option>
                            <option value="warden">Warden</option>
                            <option value="mess_manager">Mess Manager</option>
                            <option value="watchman">Watchman</option>
                            <option value="mess_staff">Mess Staff</option>
                            <option value="cleaner">Cleaner</option>
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="input h-11"
                        >
                            <option value="">All Status</option>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                        </select>
                    </div>
                </div>

                {/* Clear filters button */}
                {(searchTerm || roleFilter || statusFilter) && (
                    <div className="mt-3 flex justify-end">
                        <button
                            onClick={() => {
                                setSearchTerm("");
                                setRoleFilter("");
                                setStatusFilter("");
                            }}
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                            Clear all filters
                        </button>
                    </div>
                )}
            </div>

            {/* Employee List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
            ) : isError ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-red-900">
                        Failed to Load Employees
                    </h3>
                    <p className="text-red-600 mt-2">
                        {error?.message || "An error occurred"}
                    </p>
                    <button
                        onClick={() => refetch()}
                        className="btn btn-outline mt-4"
                    >
                        Try Again
                    </button>
                </div>
            ) : employees.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
                    <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900">
                        No Employees Found
                    </h3>
                    <p className="text-gray-600 mt-2">
                        {searchTerm || roleFilter || statusFilter
                            ? "Try adjusting your filters"
                            : "Get started by adding your first employee"}
                    </p>
                    {!searchTerm && !roleFilter && !statusFilter && (
                        <button
                            onClick={onAddNew}
                            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg font-medium hover:from-green-700 hover:to-green-800 hover:shadow-md hover:shadow-green-500/25 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center gap-2 border border-green-500 text-sm"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span>Add Employee</span>
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up">
                    {employees.map((employee) => (
                        <EmployeeCard
                            key={employee._id}
                            employee={employee}
                            onEdit={onEdit}
                            onDelete={handleDelete}
                            onView={onViewDetails}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const EmployeeCard = ({ employee, onEdit, onDelete, onView }) => {
    const statusColors = {
        ACTIVE: "bg-green-100 text-green-700 border-green-200",
        INACTIVE: "bg-red-100 text-red-700 border-red-200",
    };

    const roleColors = {
        manager: "bg-purple-100 text-purple-700",
        warden: "bg-blue-100 text-blue-700",
        mess_manager: "bg-orange-100 text-orange-700",
        watchman: "bg-indigo-100 text-indigo-700",
        mess_staff: "bg-pink-100 text-pink-700",
        cleaner: "bg-teal-100 text-teal-700",
    };

    return (
        <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-3 text-white">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h3 className="font-bold text-lg truncate">{employee.fullName}</h3>
                        <p className="text-primary-100 text-sm">{employee.employeeCode}</p>
                    </div>
                    {employee.profilePhoto?.url && (
                        <img
                            src={employee.profilePhoto.url}
                            alt={employee.fullName}
                            className="w-12 h-12 rounded-full border-2 border-white object-cover shadow-lg hover:scale-105 transition-transform duration-300"
                        />
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="p-3 space-y-2">
                {/* Role & Status */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${roleColors[employee.role] || "bg-gray-100 text-gray-700"}`}>
                        {employee.role?.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColors[employee.status]}`}>
                        {employee.status}
                    </span>
                </div>

                {/* ✅ NEW: Current Attendance Status */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-xs font-medium text-gray-600">Current Status:</span>
                        </div>
                        {employee.currentStatus === "IN" ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                                <LogIn className="w-3 h-3" />
                                IN
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-xs font-bold text-gray-600">
                                <LogOut className="w-3 h-3" />
                                OUT
                            </span>
                        )}
                    </div>
                </div>

                {/* Details */}
                <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-3 h-3" />
                        <span>{employee.phone}</span>
                    </div>
                    {employee.email && (
                        <div className="flex items-center gap-2 text-gray-600">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{employee.email}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-600">
                        <IndianRupee className="w-4 h-4" />
                        <span>₹{employee.salary?.toLocaleString('en-IN')}/month</span>
                    </div>
                    {employee.userId && (
                        <div className="flex items-center gap-2 text-green-600">
                            <Shield className="w-4 h-4" />
                            <span className="text-xs font-medium">Login Access Enabled</span>
                        </div>
                    )}
                </div>

                {/* ✅ NEW: Quick Attendance Buttons */}
                <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-2">Quick Mark:</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onQuickMark(employee._id, "IN")}
                            disabled={employee.currentStatus === "IN"}
                            className="flex-1 py-2 px-3 bg-green-50 text-green-600 rounded-lg text-xs font-bold hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        >
                            <LogIn className="w-3 h-3" />
                            Mark IN
                        </button>
                        <button
                            onClick={() => onQuickMark(employee._id, "OUT")}
                            disabled={employee.currentStatus === "OUT"}
                            className="flex-1 py-2 px-3 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        >
                            <LogOut className="w-3 h-3" />
                            Mark OUT
                        </button>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="px-3 pb-3 flex gap-2">
                <button
                    onClick={() => onView?.(employee)}
                    className="flex-1 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs py-2 px-2 font-medium hover:bg-blue-100 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex items-center justify-center gap-1"
                    disabled={!onView}
                >
                    <Eye className="w-3 h-3" />
                    <span>View</span>
                </button>
                <button
                    onClick={() => onEdit?.(employee)}
                    className="flex-1 bg-green-50 text-green-600 border border-green-200 rounded text-xs py-2 px-2 font-medium hover:bg-green-100 hover:border-green-300 hover:shadow-md transition-all duration-200 flex items-center justify-center gap-1"
                    disabled={!onEdit}
                >
                    <Edit className="w-3 h-3" />
                    <span>Edit</span>
                </button>
                <button
                    onClick={() => onDelete?.(employee._id, employee.fullName)}
                    className="btn btn-outline text-red-600 border-red-300 hover:bg-red-50 text-sm py-2 px-3"
                    disabled={!onDelete}
                >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                </button>
            </div>
        </div>
    );
};

export default EmployeeListTab;
