// src/components/StudentBank/BankAccountCard.jsx
import React from "react";
import { User, CheckCircle, Lock, Ban } from "lucide-react";

const BankAccountCard = ({ account, onClick }) => {
    const statusConfig = {
        active: {
            icon: CheckCircle,
            color: "text-green-600",
            bg: "bg-green-50",
            border: "border-green-200",
            label: "Active",
        },
        frozen: {
            icon: Lock,
            color: "text-yellow-600",
            bg: "bg-yellow-50",
            border: "border-yellow-200",
            label: "Frozen",
        },
        closed: {
            icon: Ban,
            color: "text-gray-600",
            bg: "bg-gray-50",
            border: "border-gray-200",
            label: "Closed",
        },
    };

    const status = statusConfig[account.status] || statusConfig.active;
    const StatusIcon = status.icon;

    return (
        <div
            onClick={() => onClick && onClick(account)}
            className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-all cursor-pointer hover:border-green-300"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white">
                        <User className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">
                            {account.student?.name || "Unknown"}
                        </h3>
                        <p className="text-sm text-gray-600">
                            {account.student?.studentId}
                        </p>
                    </div>
                </div>

                {/* Status Badge */}
                <div
                    className={`flex items-center gap-1 px-3 py-1 rounded-full ${status.bg} ${status.border} border`}
                >
                    <StatusIcon className={`h-4 w-4 ${status.color}`} />
                    <span className={`text-xs font-medium ${status.color}`}>
                        {status.label}
                    </span>
                </div>
            </div>

            {/* Student Info */}
            <div className="mb-4 pb-4 border-b border-gray-100">
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                        <p className="text-gray-500">Class</p>
                        <p className="font-medium text-gray-900">
                            {account.student?.class || "N/A"}
                        </p>
                    </div>
                    <div>
                        <p className="text-gray-500">Batch</p>
                        <p className="font-medium text-gray-900">
                            {account.student?.batch || "N/A"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Balance */}
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
                <p className="text-sm text-green-700 font-medium">Current Balance</p>
                <p className="text-3xl font-bold text-green-900 mt-1">
                    ₹{account.balance?.toFixed(2) || "0.00"}
                </p>
                {account.lastTransactionAt && (
                    <p className="text-xs text-green-600 mt-2">
                        Last activity:{" "}
                        {new Date(account.lastTransactionAt).toLocaleDateString()}
                    </p>
                )}
            </div>

            {/* Frozen Reason */}
            {account.status === "frozen" && account.freezeReason && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800">
                        <strong>Reason:</strong> {account.freezeReason}
                    </p>
                </div>
            )}
        </div>
    );
};

export default BankAccountCard;
