// src/components/Reports/StatCard.jsx
import React from "react";

const StatCard = ({
    label,
    value,
    icon: Icon,
    color = "text-primary-600",
    bgColor = "bg-primary-50",
    subtitle,
    trend,
    onClick
}) => {
    return (
        <div
            className={`bg-white rounded-xl border border-gray-200 p-6 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${onClick ? "cursor-pointer" : ""}`}
            onClick={onClick}
        >
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-sm text-gray-600 font-medium">{label}</p>
                    <p className={`text-3xl font-bold ${color} mt-2`}>{value}</p>

                    {subtitle && (
                        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
                    )}

                    {trend && (
                        <div className={`flex items-center mt-2 text-xs font-medium ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
                            <span className="mr-1">{trend.positive ? '↑' : '↓'}</span>
                            <span>{trend.value}</span>
                        </div>
                    )}
                </div>

                {Icon && (
                    <div className={`h-14 w-14 ${bgColor} rounded-xl flex items-center justify-center ml-4 flex-shrink-0`}>
                        <Icon className={`h-7 w-7 ${color}`} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatCard;
