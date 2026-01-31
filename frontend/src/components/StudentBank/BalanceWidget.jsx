// src/components/StudentBank/BalanceWidget.jsx
import React from "react";
import { Wallet } from "lucide-react";

const BalanceWidget = ({ balance, status }) => {
    return (
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm opacity-90">Current Balance</p>
                    <p className="text-4xl font-bold mt-2">
                        ₹{balance?.toFixed(2) || "0.00"}
                    </p>
                    <p className="text-xs opacity-75 mt-2">
                        Status: <span className="font-semibold uppercase">{status || "Active"}</span>
                    </p>
                </div>
                <Wallet className="h-16 w-16 opacity-20" />
            </div>
        </div>
    );
};

export default BalanceWidget;
