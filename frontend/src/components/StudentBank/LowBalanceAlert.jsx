// src/components/StudentBank/LowBalanceAlert.jsx
import React from "react";
import { AlertTriangle, Users } from "lucide-react";

const LowBalanceAlert = ({ accounts }) => {
    if (!accounts || accounts.length === 0) return null;

    return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
                <div>
                    <h3 className="text-lg font-semibold text-yellow-900">
                        Low Balance Alert
                    </h3>
                    <p className="text-sm text-yellow-700">
                        {accounts.length} student{accounts.length > 1 ? "s" : ""} have low
                        balance (below ₹100)
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                {accounts.map((account) => (
                    <div
                        key={account._id}
                        className="bg-white rounded-lg p-3 flex items-center justify-between"
                    >
                        <div className="flex items-center">
                            <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                <Users className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div className="ml-3">
                                <p className="font-medium text-gray-900">
                                    {account.student?.name || "Unknown"}
                                </p>
                                <p className="text-sm text-gray-600">
                                    {account.student?.studentId} | Class {account.student?.class}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-bold text-red-600">
                                ₹{account.balance?.toFixed(2) || 0}
                            </p>
                            <p className="text-xs text-gray-500">Current Balance</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LowBalanceAlert;
