// src/components/Reports/DateRangeFilter.jsx
import React from "react";
import { Calendar } from "lucide-react";

const DateRangeFilter = ({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    label = "Date Range",
    showQuickFilters = true
}) => {
    const quickFilters = [
        { label: "Today", days: 0 },
        { label: "Last 7 Days", days: 7 },
        { label: "Last 30 Days", days: 30 },
        { label: "This Month", type: "month" },
        { label: "This Year", type: "year" },
    ];

    const handleQuickFilter = (filter) => {
        const today = new Date();
        let start = new Date();

        if (filter.type === "month") {
            start = new Date(today.getFullYear(), today.getMonth(), 1);
        } else if (filter.type === "year") {
            start = new Date(today.getFullYear(), 0, 1);
        } else {
            start.setDate(today.getDate() - filter.days);
        }

        onStartDateChange(start.toISOString().split("T")[0]);
        onEndDateChange(today.toISOString().split("T")[0]);
    };

    return (
        <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
                <Calendar className="h-4 w-4 inline mr-1" />
                {label}
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => onStartDateChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-600 mb-1">End Date</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => onEndDateChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
            </div>

            {showQuickFilters && (
                <div className="flex flex-wrap gap-2">
                    {quickFilters.map((filter, index) => (
                        <button
                            key={index}
                            onClick={() => handleQuickFilter(filter)}
                            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DateRangeFilter;
