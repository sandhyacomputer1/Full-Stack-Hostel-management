// src/pages/Analytics/components/MessAnalyticsTab.jsx
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsAPI } from "../../../services/api";
import LineChartCard from "../../../components/Analytics/LineChartCard";
import BarChartCard from "../../../components/Analytics/BarChartCard";
import PieChartCard from "../../../components/Analytics/PieChartCard";
import MetricCard from "../../../components/Analytics/MetricCard";
import LoadingSpinner from "../../../components/UI/LoadingSpinner";
import { Utensils, Users, TrendingUp, Filter, AlertTriangle, Coffee, Soup, Moon } from "lucide-react";

const MessAnalyticsTab = () => {
    const [filters, setFilters] = useState({
        month: new Date().toISOString().slice(0, 7),
        class: "",
    });

    const { data: messData, isLoading, error } = useQuery({
        queryKey: ["mess-analytics", filters],
        queryFn: async () => {
            const response = await analyticsAPI.getMessMonthly(filters);
            console.log("🍽️ Mess Response:", response);
            return response;
        },
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600 font-semibold mb-2">Failed to load mess data</p>
                    <p className="text-gray-600 text-sm">{error.message}</p>
                </div>
            </div>
        );
    }

    // ✅ FIX: Correct data extraction
    const apiData = messData?.data?.data || messData?.data || {};
    const report = apiData.report || [];
    const summary = apiData.summary || {};

    console.log("🍽️ Report days:", report.length);
    console.log("📊 Summary:", summary);

    // Meal-wise distribution
    const mealDistribution = [
        { name: "Breakfast", value: summary.totalBreakfast || 0 },
        { name: "Lunch", value: summary.totalLunch || 0 },
        { name: "Dinner", value: summary.totalDinner || 0 },
    ];

    // ✅ FIX: Daily trend - use direct numbers, not nested objects
    const dailyTrend = report
        .slice(-7) // Get last 7 days
        .map((day) => ({
            name: new Date(day.date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short"
            }),
            date: day.date,
            day: day.day,
            breakfast: day.breakfast || 0,
            lunch: day.lunch || 0,
            dinner: day.dinner || 0,
            total: day.total || 0,
        }));

    // Average meal consumption
    const avgMealData = [
        { name: "Breakfast", avg: summary.avgBreakfast || 0 },
        { name: "Lunch", avg: summary.avgLunch || 0 },
        { name: "Dinner", avg: summary.avgDinner || 0 },
    ];

    // Calculate meal popularity percentages
    const totalMeals = summary.totalMeals || 1;
    const mealPopularity = [
        {
            name: "Breakfast",
            count: summary.totalBreakfast || 0,
            percentage: Math.round(((summary.totalBreakfast || 0) / totalMeals) * 100)
        },
        {
            name: "Lunch",
            count: summary.totalLunch || 0,
            percentage: Math.round(((summary.totalLunch || 0) / totalMeals) * 100)
        },
        {
            name: "Dinner",
            count: summary.totalDinner || 0,
            percentage: Math.round(((summary.totalDinner || 0) / totalMeals) * 100)
        },
    ];

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-4 transform hover:scale-[1.01]">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-5 w-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Filters</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Month
                        </label>
                        <input
                            type="month"
                            value={filters.month}
                            onChange={(e) =>
                                setFilters({ ...filters, month: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Class (Optional)
                        </label>
                        <select
                            value={filters.class}
                            onChange={(e) => setFilters({ ...filters, class: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        >
                            <option value="">All Classes</option>
                            <option value="8th">8th</option>
                            <option value="9th">9th</option>
                            <option value="10th">10th</option>
                            <option value="11th">11th</option>
                            <option value="12th">12th</option>
                            <option value="Undergraduate">Undergraduate</option>
                            <option value="Postgraduate">Postgraduate</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                    label="Total Meals Served"
                    value={summary.totalMeals || 0}
                    icon={Utensils}
                    color="bg-blue-500"
                />
                <MetricCard
                    label="Avg Daily Attendance"
                    value={`${summary.avgDailyAttendance || 0}%`}
                    icon={Users}
                    color="bg-green-500"
                />
                <MetricCard
                    label="Most Popular"
                    value={summary.mostPopularMeal || "N/A"}
                    icon={TrendingUp}
                    color="bg-purple-500"
                />
                <MetricCard
                    label="Total Days"
                    value={summary.totalDays || 0}
                    icon={Users}
                    color="bg-yellow-500"
                />
            </div>

            {report.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-12 text-center transform hover:scale-[1.01]">
                    <AlertTriangle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        No Mess Data
                    </h3>
                    <p className="text-gray-500">
                        No mess attendance records found for the selected month.
                    </p>
                </div>
            ) : (
                <>
                    {/* Meal Distribution Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Breakfast</p>
                                    <p className="text-3xl font-bold text-orange-600">
                                        {summary.totalBreakfast || 0}
                                    </p>
                                </div>
                                <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                                    <Coffee className="h-6 w-6 text-orange-600" />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">
                                Avg: {summary.avgBreakfast || 0} per day
                            </p>
                        </div>

                        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Lunch</p>
                                    <p className="text-3xl font-bold text-green-600">
                                        {summary.totalLunch || 0}
                                    </p>
                                </div>
                                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <Soup className="h-6 w-6 text-green-600" />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">
                                Avg: {summary.avgLunch || 0} per day
                            </p>
                        </div>

                        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Dinner</p>
                                    <p className="text-3xl font-bold text-blue-600">
                                        {summary.totalDinner || 0}
                                    </p>
                                </div>
                                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Moon className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">
                                Avg: {summary.avgDinner || 0} per day
                            </p>
                        </div>
                    </div>

                    {/* Charts Row 1 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {mealDistribution.some((d) => d.value > 0) && (
                            <PieChartCard
                                title="Meal-wise Distribution"
                                data={mealDistribution}
                                colors={["#f59e0b", "#10b981", "#3b82f6"]}
                                height={350}
                            />
                        )}

                        {avgMealData.some((d) => d.avg > 0) && (
                            <BarChartCard
                                title="Average Daily Meal Consumption"
                                data={avgMealData}
                                dataKeys={["avg"]}
                                colors={["#8b5cf6"]}
                                height={350}
                            />
                        )}
                    </div>

                    {/* Daily Trend */}
                    {dailyTrend.length > 0 && (
                        <LineChartCard
                            title={`Daily Meal Trend (Last ${dailyTrend.length} Days)`}
                            data={dailyTrend}
                            dataKeys={["breakfast", "lunch", "dinner"]}
                            colors={["#f59e0b", "#10b981", "#3b82f6"]}
                            height={300}
                        />
                    )}

                    {/* Daily Details Table */}
                    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Daily Meal Records ({report.length} days)
                        </h3>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                            Date
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                                            Breakfast
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                                            Lunch
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                                            Dinner
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                                            Total
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                                            Attendance
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {report.map((day, index) => (
                                        <tr key={day.date || index} className="hover:bg-gray-50 hover:shadow-md transition-all duration-200 border border-transparent hover:border-indigo-100">
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {new Date(day.date).toLocaleDateString("en-IN", {
                                                            day: "2-digit",
                                                            month: "short",
                                                            year: "numeric",
                                                        })}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{day.day}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                                                    {day.breakfast}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                                    {day.lunch}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                                    {day.dinner}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="font-bold text-gray-900">
                                                    {day.total}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span
                                                    className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${day.avgAttendance >= 80
                                                            ? "bg-green-100 text-green-800"
                                                            : day.avgAttendance >= 50
                                                                ? "bg-yellow-100 text-yellow-800"
                                                                : "bg-red-100 text-red-800"
                                                        }`}
                                                >
                                                    {day.avgAttendance}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Meal Popularity
                            </h3>
                            <div className="space-y-3">
                                {mealPopularity.map((meal) => (
                                    <div key={meal.name}>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm font-medium text-gray-700">
                                                {meal.name}
                                            </span>
                                            <span className="text-sm font-bold text-gray-900">
                                                {meal.count} ({meal.percentage}%)
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${meal.name === "Breakfast"
                                                        ? "bg-orange-500"
                                                        : meal.name === "Lunch"
                                                            ? "bg-green-500"
                                                            : "bg-blue-500"
                                                    }`}
                                                style={{ width: `${meal.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Quick Stats
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md transition-all duration-200 border border-transparent hover:border-indigo-100">
                                    <span className="text-sm text-gray-600">Most Popular</span>
                                    <span className="text-sm font-bold text-green-600">
                                        {summary.mostPopularMeal || "N/A"}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md transition-all duration-200 border border-transparent hover:border-indigo-100">
                                    <span className="text-sm text-gray-600">Least Popular</span>
                                    <span className="text-sm font-bold text-red-600">
                                        {summary.leastPopularMeal || "N/A"}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md transition-all duration-200 border border-transparent hover:border-indigo-100">
                                    <span className="text-sm text-gray-600">Total Students</span>
                                    <span className="text-sm font-bold text-gray-900">
                                        {summary.totalStudents || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md transition-all duration-200 border border-transparent hover:border-indigo-100">
                                    <span className="text-sm text-gray-600">Days Tracked</span>
                                    <span className="text-sm font-bold text-gray-900">
                                        {summary.totalDays || 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default MessAnalyticsTab;
