// src/pages/StudentBank/components/AccountsTab.jsx
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { studentBankAPI } from "../../../services/api";
import {
    Users,
    Search,
    Filter,
    RefreshCw,
    CheckCircle,
    Lock,
    Ban,
    Wallet,
    Eye,
    Calendar,
} from "lucide-react";
import LoadingSpinner from "../../../components/UI/LoadingSpinner";
import AccountDetailsModal from "../../../components/StudentBank/AccountDetailsModal";

const AccountsTab = () => {
    const [accounts, setAccounts] = useState([]);
    const [filteredAccounts, setFilteredAccounts] = useState([]);
    const [loading, setLoading] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [balanceFilter, setBalanceFilter] = useState("");

    const [selectedAccount, setSelectedAccount] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
    });

    useEffect(() => {
        fetchAccounts();
    }, [pagination.page]);

    useEffect(() => {
        filterAccounts();
    }, [accounts, searchQuery, statusFilter, balanceFilter]);

    const fetchAccounts = async () => {
        try {
            setLoading(true);

            const response = await studentBankAPI.getAllAccounts({
                page: pagination.page,
                limit: pagination.limit,
                // Don't pass status here if backend doesn't support it
            });

            const accountsList = response.data.accounts || [];
            setAccounts(accountsList);
            setPagination((prev) => ({
                ...prev,
                total: response.data.pagination?.total || accountsList.length,
            }));
        } catch (error) {
            console.error("Failed to fetch accounts:", error);
            toast.error("Failed to load accounts");
            setAccounts([]);
        } finally {
            setLoading(false);
        }
    };


    const filterAccounts = () => {
        let filtered = [...accounts];

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (acc) =>
                    acc.student?.name?.toLowerCase().includes(query) ||
                    acc.student?.studentId?.toLowerCase().includes(query) ||
                    acc.student?.rollNumber?.toLowerCase().includes(query)
            );
        }

        // Status filter
        if (statusFilter) {
            filtered = filtered.filter((acc) => acc.status === statusFilter);
        }

        // Balance filter
        if (balanceFilter === "low") {
            filtered = filtered.filter((acc) => acc.balance < 100);
        } else if (balanceFilter === "zero") {
            filtered = filtered.filter((acc) => acc.balance === 0);
        } else if (balanceFilter === "high") {
            filtered = filtered.filter((acc) => acc.balance >= 500);
        }

        setFilteredAccounts(filtered);
    };

    const handleViewDetails = (account) => {
        setSelectedAccount(account);
        setShowDetailsModal(true);
    };

    const handleModalClose = () => {
        setShowDetailsModal(false);
        setSelectedAccount(null);
        fetchAccounts();
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return "—";
        return new Date(timestamp).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return "—";
        return new Date(timestamp).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getStatusConfig = (status) => {
        const configs = {
            active: {
                icon: CheckCircle,
                label: "Active",
                class: "badge-success",
                color: "text-green-600",
            },
            frozen: {
                icon: Lock,
                label: "Frozen",
                class: "badge-warning",
                color: "text-yellow-600",
            },
            closed: {
                icon: Ban,
                label: "Closed",
                class: "badge-secondary",
                color: "text-gray-600",
            },
        };
        return configs[status] || configs.active;
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 transition-all hover:shadow-xl">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {/* Search */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                            <Search className="h-4 w-4 inline mr-1" />
                            Search Student
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, ID, or roll number..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-indigo-400"
                            />
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                            <Filter className="h-4 w-4 inline mr-1" />
                            Account Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-indigo-400"
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="frozen">Frozen</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>

                    {/* Balance Filter */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                            Balance Range
                        </label>
                        <select
                            value={balanceFilter}
                            onChange={(e) => setBalanceFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-indigo-400"
                        >
                            <option value="">All Balances</option>
                            <option value="zero">Zero Balance</option>
                            <option value="low">Low (&lt; ₹100)</option>
                            <option value="high">High (≥ ₹500)</option>
                        </select>
                    </div>

                    {/* Refresh Button */}
                    <div className="flex items-end">
                        <button
                            onClick={fetchAccounts}
                            disabled={loading}
                            className="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center justify-center"
                        >
                            <RefreshCw
                                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                            />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Results Summary */}
            <div className="flex items-center justify-between px-2">
                <p className="text-sm font-semibold text-gray-600">
                    Showing <span className="font-bold text-indigo-600">{filteredAccounts.length}</span> of{" "}
                    <span className="font-bold text-indigo-600">{accounts.length}</span> accounts
                </p>
            </div>

            {/* Accounts Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden transition-all hover:shadow-xl">
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center">
                        <div className="bg-indigo-100 rounded-full p-2 mr-3">
                            <Users className="h-5 w-5 text-indigo-600" />
                        </div>
                        Student Bank Accounts ({filteredAccounts.length})
                    </h3>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <LoadingSpinner size="lg" />
                    </div>
                ) : filteredAccounts.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Student</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Class/Block</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Balance</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Last Activity</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {filteredAccounts.map((account) => {
                                    const statusConfig = getStatusConfig(account.status);
                                    const StatusIcon = statusConfig.icon;

                                    return (
                                        <tr
                                            key={account._id}
                                            className="transition-all hover:bg-indigo-50"
                                        >
                                            {/* Student Info */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                                        <Users className="h-4 w-4 text-indigo-600" />
                                                    </div>
                                                    <div className="ml-2">
                                                        <div className="text-sm font-bold text-gray-900 hover:text-indigo-600 transition-colors cursor-pointer">
                                                            {account.student?.name || "Unknown"}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {account.student?.studentId}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Class/Block */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="text-xs text-gray-600">
                                                    <div className="font-semibold text-gray-900">
                                                        Class {account.student?.class}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        Block {account.student?.block} | Batch{" "}
                                                        {account.student?.batch}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Balance */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <Wallet className="h-3 w-3 text-green-600 mr-1" />
                                                    <span
                                                        className={`text-sm font-bold ${account.balance < 100
                                                            ? "text-red-600"
                                                            : account.balance < 500
                                                                ? "text-yellow-600"
                                                                : "text-green-600"
                                                            }`}
                                                    >
                                                        ₹{account.balance?.toFixed(2) || "0.00"}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {account.status === "active" && (
                                                    <span className="inline-flex items-center px-2 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                        Active
                                                    </span>
                                                )}
                                                {account.status === "frozen" && (
                                                    <span className="inline-flex items-center px-2 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                                        <Lock className="h-3 w-3 mr-1" />
                                                        Frozen
                                                    </span>
                                                )}
                                                {account.status === "closed" && (
                                                    <span className="inline-flex items-center px-2 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                                                        <Ban className="h-3 w-3 mr-1" />
                                                        Closed
                                                    </span>
                                                )}
                                                {account.status === "frozen" &&
                                                    account.freezeReason && (
                                                        <div className="text-xs font-semibold text-gray-500 mt-1">
                                                            {account.freezeReason}
                                                        </div>
                                                    )}
                                            </td>

                                            {/* Last Activity */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {account.lastTransactionAt ? (
                                                    <div className="text-xs text-gray-600">
                                                        <div className="flex items-center font-semibold text-gray-900">
                                                            <Calendar className="h-3 w-3 mr-1" />
                                                            {formatDate(account.lastTransactionAt)}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {formatTime(account.lastTransactionAt)}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">
                                                        No activity
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <button
                                                    onClick={() => handleViewDetails(account)}
                                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all transform hover:scale-105"
                                                    title="View Details"
                                                >
                                                    <Eye className="h-5 w-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <Users className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                            No accounts found
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Try adjusting your search or filters
                        </p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {pagination.total > pagination.limit && (
                <div className="flex items-center justify-between px-2">
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
                                pagination.page >= Math.ceil(pagination.total / pagination.limit)
                            }
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Account Details Modal */}
            {showDetailsModal && selectedAccount && (
                <AccountDetailsModal
                    account={selectedAccount}
                    onClose={handleModalClose}
                    onUpdate={fetchAccounts}
                />
            )}
        </div>
    );
};

export default AccountsTab;
