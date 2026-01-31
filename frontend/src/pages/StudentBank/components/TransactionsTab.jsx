// src/pages/StudentBank/components/TransactionsTab.jsx
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { studentBankAPI, studentsAPI } from "../../../services/api";
import {
    Search,
    Filter,
    Calendar,
    TrendingUp,
    TrendingDown,
    Users,
    RefreshCw,
    Download,
} from "lucide-react";
import LoadingSpinner from "../../../components/UI/LoadingSpinner";
import TransactionTable from "../../../components/StudentBank/TransactionTable";
import { TRANSACTION_CATEGORIES } from "../../../constants/bankConstants";

const TransactionsTab = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentAccount, setStudentAccount] = useState(null); // ✅ Add this
    const [students, setStudents] = useState([]);

    const [filters, setFilters] = useState({
        type: "all",
        category: "all",
        startDate: "",
        endDate: "",
    });

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
    });

    useEffect(() => {
        fetchStudents();
    }, []);

    useEffect(() => {
        if (selectedStudent) {
            fetchAccountDetails(); // ✅ Fetch account first
            fetchTransactions();
        } else {
            setStudentAccount(null);
            setTransactions([]);
        }
    }, [selectedStudent]);

    useEffect(() => {
        if (selectedStudent) {
            fetchTransactions();
        }
    }, [filters, pagination.page]);

    const fetchStudents = async () => {
        try {
            const response = await studentsAPI.getAll({ limit: 1000 });

            let studentList = [];
            if (response.data?.students) {
                studentList = response.data.students;
            } else if (response.data?.data) {
                studentList = response.data.data;
            } else if (Array.isArray(response.data)) {
                studentList = response.data;
            }

            const activeStudents = studentList.filter((s) => s.status === "active");
            setStudents(activeStudents);
        } catch (error) {
            console.error("Failed to fetch students:", error);
            toast.error("Failed to load students");
        }
    };

    // ✅ NEW: Fetch account details
    const fetchAccountDetails = async () => {
        if (!selectedStudent) return;

        try {
            const response = await studentBankAPI.getAccount(selectedStudent._id);
            setStudentAccount(response.data.account);
        } catch (error) {
            console.error("Failed to fetch account:", error);
            // Don't show error toast - account might not exist yet
            setStudentAccount(null);
        }
    };

    const fetchTransactions = async () => {
        if (!selectedStudent) {
            setTransactions([]);
            return;
        }

        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
            };

            if (filters.type !== "all") params.type = filters.type;
            if (filters.category !== "all") params.category = filters.category;
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;

            const response = await studentBankAPI.getTransactions(
                selectedStudent._id,
                params
            );

            setTransactions(response.data.transactions || []);
            setPagination((prev) => ({
                ...prev,
                total: response.data.pagination?.total || 0,
            }));

            // ✅ Update balance from latest transaction
            if (response.data.transactions?.length > 0) {
                const latestBalance = response.data.transactions[0].balanceAfter;
                if (latestBalance !== undefined && studentAccount) {
                    setStudentAccount((prev) => ({
                        ...prev,
                        balance: latestBalance,
                    }));
                }
            }
        } catch (error) {
            console.error("Failed to fetch transactions:", error);
            toast.error("Failed to load transactions");
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPagination((prev) => ({ ...prev, page: 1 }));
    };

    const handleClearFilters = () => {
        setFilters({
            type: "all",
            category: "all",
            startDate: "",
            endDate: "",
        });
        setPagination((prev) => ({ ...prev, page: 1 }));
    };

    const handleExportCSV = () => {
        if (!selectedStudent) {
            toast.error("Please select a student first");
            return;
        }

        const params = new URLSearchParams({
            studentId: selectedStudent._id,
            ...(filters.type !== "all" && { type: filters.type }),
            ...(filters.category !== "all" && { category: filters.category }),
            ...(filters.startDate && { startDate: filters.startDate }),
            ...(filters.endDate && { endDate: filters.endDate }),
        });

        const url = `${import.meta.env.VITE_API_URL || "http://localhost:8080/api"
            }/student-bank/transactions/export?${params}`;

        window.open(url, "_blank");
        toast.success("Exporting transactions...");
    };

    const handleRefresh = () => {
        fetchAccountDetails();
        fetchTransactions();
        toast.success("Refreshed!");
    };

    return (
        <div className="space-y-4">
            {/* Student Selector */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 shadow-lg p-4 transition-all hover:shadow-xl">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                    <Users className="h-4 w-4 inline mr-1" />
                    Select Student
                </label>
                <select
                    value={selectedStudent?._id || ""}
                    onChange={(e) => {
                        const student = students.find((s) => s._id === e.target.value);
                        setSelectedStudent(student);
                        setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-indigo-400"
                >
                    <option value="">-- Select a student --</option>
                    {students.map((student) => (
                        <option key={student._id} value={student._id}>
                            {student.name} ({student.studentId}) - Class {student.class}
                        </option>
                    ))}
                </select>
            </div>

            {/* Filters */}
            {selectedStudent && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 transition-all hover:shadow-xl">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        {/* Transaction Type */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                <Filter className="h-4 w-4 inline mr-1" />
                                Type
                            </label>
                            <select
                                value={filters.type}
                                onChange={(e) => handleFilterChange("type", e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-indigo-400"
                            >
                                <option value="all">All Types</option>
                                <option value="credit">Credit</option>
                                <option value="debit">Debit</option>
                            </select>
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Category
                            </label>
                            <select
                                value={filters.category}
                                onChange={(e) => handleFilterChange("category", e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-indigo-400"
                            >
                                <option value="all">All Categories</option>
                                {Object.entries(TRANSACTION_CATEGORIES).map(([key, value]) => (
                                    <option key={value} value={value}>
                                        {key.replace(/_/g, " ")}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Start Date */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                <Calendar className="h-4 w-4 inline mr-1" />
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-indigo-400"
                            />
                        </div>

                        {/* End Date */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                <Calendar className="h-4 w-4 inline mr-1" />
                                End Date
                            </label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-indigo-400"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-end gap-2">
                            <button
                                onClick={handleClearFilters}
                                className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            {selectedStudent && (
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center"
                    >
                        <RefreshCw
                            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                        />
                        Refresh
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </button>
                </div>
            )}

            {/* Student Balance Card */}
            {selectedStudent && (
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 shadow-lg p-4 transition-all hover:shadow-xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                <Users className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div className="ml-3">
                                <h3 className="text-base font-bold text-gray-900">
                                    {selectedStudent.name}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {selectedStudent.studentId} | Class {selectedStudent.class}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-semibold text-gray-600">Current Balance</p>
                            <p className="text-2xl font-bold text-green-600">
                                ₹{studentAccount?.balance?.toFixed(2) || "0.00"}
                            </p>
                            <p className="text-xs font-semibold text-gray-500 mt-1">
                                Status: {studentAccount?.status || "No account"}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Transactions Table */}
            {selectedStudent ? (
                loading ? (
                    <div className="flex items-center justify-center h-64">
                        <LoadingSpinner size="lg" />
                    </div>
                ) : transactions.length > 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden transition-all hover:shadow-xl">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center">
                                <div className="bg-indigo-100 rounded-full p-2 mr-3">
                                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                                </div>
                                Transaction History ({transactions.length})
                            </h3>
                        </div>
                        <TransactionTable transactions={transactions} />

                        {/* Pagination */}
                        {pagination.total > pagination.limit && (
                            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                                <p className="text-sm font-semibold text-gray-600">
                                    Page <span className="font-bold text-indigo-600">{pagination.page}</span> of{" "}
                                    <span className="font-bold text-indigo-600">{Math.ceil(pagination.total / pagination.limit)}</span>
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() =>
                                            setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                                        }
                                        disabled={pagination.page === 1}
                                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() =>
                                            setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                                        }
                                        disabled={
                                            pagination.page >=
                                            Math.ceil(pagination.total / pagination.limit)
                                        }
                                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-12 text-center transition-all hover:shadow-xl">
                        <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-bold text-gray-900">
                            No transactions found
                        </h3>
                        <p className="mt-1 text-sm font-semibold text-gray-500">
                            {studentAccount
                                ? "Try adjusting your filters"
                                : "This student doesn't have a bank account yet"}
                        </p>
                    </div>
                )
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-12 text-center transition-all hover:shadow-xl">
                    <Search className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-bold text-gray-900">
                        Select a student to view transactions
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-gray-500">
                        Choose a student from the dropdown above
                    </p>
                </div>
            )}
        </div>
    );
};

export default TransactionsTab;
