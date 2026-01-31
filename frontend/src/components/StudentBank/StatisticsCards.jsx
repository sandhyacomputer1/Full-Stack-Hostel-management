// src/components/StudentBank/StatisticsCards.jsx
import React from "react";
import { Wallet, Users, Lock, TrendingUp, TrendingDown } from "lucide-react";

const StatisticsCards = ({ statistics }) => {
    if (!statistics) return null;

    const cards = [
        {
            title: "Total Hostel Balance",
            value: `₹${statistics.totalBalance?.toLocaleString() || 0}`,
            icon: Wallet,
            color: "blue",
            subtitle: "Total liability",
        },
        {
            title: "Active Accounts",
            value: statistics.activeAccounts || 0,
            icon: Users,
            color: "green",
            subtitle: "Operational accounts",
        },
        {
            title: "Frozen Accounts",
            value: statistics.frozenAccounts || 0,
            icon: Lock,
            color: "yellow",
            subtitle: "Temporarily blocked",
        },
        {
            title: "Credits Today",
            value: `₹${statistics.totalCreditsToday?.toLocaleString() || 0}`,
            icon: TrendingUp,
            color: "green",
            subtitle: "Deposits received",
        },
        {
            title: "Debits Today",
            value: `₹${statistics.totalDebitsToday?.toLocaleString() || 0}`,
            icon: TrendingDown,
            color: "red",
            subtitle: "Expenses made",
        },
        {
            title: "Net Flow Today",
            value: `₹${statistics.netFlowToday?.toLocaleString() || 0}`,
            icon: Wallet,
            color: statistics.netFlowToday >= 0 ? "green" : "red",
            subtitle: "Net cash movement",
        },
    ];

    const colorClasses = {
        blue: { bg: "bg-blue-50", text: "text-blue-600" },
        green: { bg: "bg-green-50", text: "text-green-600" },
        yellow: { bg: "bg-yellow-50", text: "text-yellow-600" },
        red: { bg: "bg-red-50", text: "text-red-600" },
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card, index) => {
                const Icon = card.icon;
                const colors = colorClasses[card.color];

                return (
                    <div key={index} className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">{card.title}</p>
                                <p className={`text-3xl font-bold mt-2 ${colors.text}`}>
                                    {card.value}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
                            </div>
                            <div className={`h-12 w-12 ${colors.bg} rounded-lg flex items-center justify-center`}>
                                <Icon className={`h-6 w-6 ${colors.text}`} />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default StatisticsCards;
