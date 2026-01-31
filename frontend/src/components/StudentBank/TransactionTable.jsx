// src/components/StudentBank/TransactionTable.jsx
import React from "react";
import { TrendingUp, TrendingDown, Calendar, Clock, User } from "lucide-react";
import { CATEGORY_LABELS } from "../../constants/bankConstants";

const TransactionTable = ({ transactions }) => {
    if (!transactions || transactions.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <TrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <p className="text-sm">No transactions found</p>
            </div>
        );
    }

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

    return (
        <div className="overflow-x-auto">
            <table className="table">
                <thead className="table-header">
                    <tr className="table-row">
                        <th className="table-head">Date & Time</th>
                        <th className="table-head">Type</th>
                        <th className="table-head">Category</th>
                        <th className="table-head text-right">Amount</th>
                        <th className="table-head text-right">Balance After</th>
                        <th className="table-head">Remarks</th>
                        <th className="table-head">Performed By</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((transaction) => (
                        <tr
                            key={transaction._id}
                            className="table-row hover:bg-gray-50"
                        >
                            {/* Date & Time */}
                            <td className="table-cell">
                                <div className="text-sm">
                                    <div className="flex items-center text-gray-900">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        {formatDate(transaction.performedAt)}
                                    </div>
                                    <div className="flex items-center text-gray-500 mt-1">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {formatTime(transaction.performedAt)}
                                    </div>
                                </div>
                            </td>

                            {/* Type */}
                            <td className="table-cell">
                                <span
                                    className={`badge ${transaction.type === "credit"
                                            ? "badge-success"
                                            : "badge-danger"
                                        }`}
                                >
                                    {transaction.type === "credit" ? (
                                        <>
                                            <TrendingUp className="h-3 w-3 inline mr-1" />
                                            Credit
                                        </>
                                    ) : (
                                        <>
                                            <TrendingDown className="h-3 w-3 inline mr-1" />
                                            Debit
                                        </>
                                    )}
                                </span>
                            </td>

                            {/* Category */}
                            <td className="table-cell">
                                <span className="text-sm text-gray-700">
                                    {CATEGORY_LABELS[transaction.category] || transaction.category}
                                </span>
                            </td>

                            {/* Amount */}
                            <td
                                className={`table-cell text-right font-semibold ${transaction.type === "credit"
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }`}
                            >
                                {transaction.type === "credit" ? "+" : "-"}₹
                                {transaction.amount?.toFixed(2)}
                            </td>

                            {/* Balance After */}
                            <td className="table-cell text-right font-medium text-gray-900">
                                ₹{transaction.balanceAfter?.toFixed(2)}
                            </td>

                            {/* Remarks */}
                            <td className="table-cell">
                                <span className="text-sm text-gray-600 max-w-xs truncate block">
                                    {transaction.remarks || "—"}
                                </span>
                            </td>

                            {/* Performed By */}
                            <td className="table-cell">
                                <div className="flex items-center text-sm text-gray-700">
                                    <User className="h-3 w-3 mr-1" />
                                    {transaction.performedBy?.name || "System"}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default TransactionTable;
