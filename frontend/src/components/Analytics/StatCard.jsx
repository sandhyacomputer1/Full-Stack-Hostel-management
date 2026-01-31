// src/components/Analytics/StatCard.jsx
import React from "react";

const StatCard = ({ label, value, icon: Icon, color }) => (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.02]">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm text-gray-600 font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
            <div className={`${color} p-3 rounded-lg`}>
                <Icon className="h-6 w-6 text-white" />
            </div>
        </div>
    </div>
);

export default StatCard;
