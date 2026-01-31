// src/pages/Analytics/components/TrendsTab.jsx
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsAPI } from "../../../services/api";
import LineChartCard from "../../../components/Analytics/LineChartCard";
import AreaChartCard from "../../../components/Analytics/AreaChartCard";
import LoadingSpinner from "../../../components/UI/LoadingSpinner";
import { Calendar, Filter, AlertTriangle, TrendingUp } from "lucide-react";

const TrendsTab = () => {
    const [period, setPeriod] = useState("month"); // week, month, semester

    const { data: trendsData, isLoading, error } = useQuery({
        queryKey: ["trends-analytics", period],
        queryFn: async () => {
            const response = await analyticsAPI.getTrends({ period });
            console.log("📈 Trends Response:", response);
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
                    <p className="text-red-600 font-semibold mb-2">
                        Failed to load trends data
                    </p>
                    <p className="text-gray-600 text-sm">{error.message}</p>
                </div>
            </div>
        );
    }

    // ✅ FIX: Correct data extraction
    const apiData = trendsData?.data?.data || trendsData?.data || {};

    console.log("📊 Trends Data:", apiData);

    // Extract trends - data is already in the correct format
    const attendanceTrend = apiData.attendance || [];
    const feesTrend = apiData.fees || [];
    const marksTrend = apiData.marks || [];
    const messTrend = apiData.mess || [];

    // Get metadata
    const periodLabel = apiData.period || period;
    const days = apiData.days || 0;
    const totalStudents = apiData.totalStudents || 0;

    console.log("📈 Attendance points:", attendanceTrend.length);
    console.log("💰 Fees points:", feesTrend.length);
    console.log("📚 Marks points:", marksTrend.length);
    console.log("🍽️ Mess points:", messTrend.length);

    return (
        <div className="space-y-6">
            {/* Period Filter */}
            <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-4 transform hover:scale-[1.01]">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Filter className="h-5 w-5 text-gray-600" />
                        <h3 className="font-semibold text-gray-900">Period</h3>
                    </div>
                    {totalStudents > 0 && (
                        <div className="text-sm text-gray-600">
                            Tracking {totalStudents} students over {days} days
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setPeriod("week")}
                        className={`px-12 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md border border-transparent hover:border-indigo-100 ${period === "week"
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                    >
                        7 Days
                        
                    </button>
                    <button
                        onClick={() => setPeriod("month")}
                        className={`px-12 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md border border-transparent hover:border-indigo-100 ${period === "month"
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                    >
                        30 Days
                        
                    </button>
                    <button
                        onClick={() => setPeriod("semester")}
                        className={`px-12 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md border border-transparent hover:border-indigo-100 ${period === "semester"
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                    >
                        Semester
                        
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {(attendanceTrend.length > 0 || messTrend.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {attendanceTrend.length > 0 && (
                        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm text-gray-600">Avg Attendance</p>
                                <TrendingUp className="h-5 w-5 text-green-500" />
                            </div>
                            <p className="text-3xl font-bold text-gray-900">
                                {Math.round(
                                    attendanceTrend.reduce((sum, d) => sum + d.rate, 0) /
                                    attendanceTrend.length
                                )}%
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Over {attendanceTrend.filter(d => d.count > 0).length} days
                            </p>
                        </div>
                    )}

                    {messTrend.length > 0 && (
                        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm text-gray-600">Total Meals</p>
                                <TrendingUp className="h-5 w-5 text-blue-500" />
                            </div>
                            <p className="text-3xl font-bold text-gray-900">
                                {messTrend.reduce((sum, d) => sum + d.count, 0)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Avg: {Math.round(
                                    messTrend.reduce((sum, d) => sum + d.count, 0) /
                                    messTrend.filter(d => d.count > 0).length
                                )} per day
                            </p>
                        </div>
                    )}

                    {attendanceTrend.length > 0 && (
                        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm text-gray-600">Peak Attendance</p>
                                <TrendingUp className="h-5 w-5 text-purple-500" />
                            </div>
                            <p className="text-3xl font-bold text-gray-900">
                                {Math.max(...attendanceTrend.map(d => d.rate))}%
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {attendanceTrend.find(
                                    d => d.rate === Math.max(...attendanceTrend.map(x => x.rate))
                                )?.name || ""}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Attendance Trend */}
            {attendanceTrend.length > 0 && (
                <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            Attendance Trend
                        </h3>
                        <p className="text-sm text-gray-600">
                            Daily attendance rate percentage over {attendanceTrend.length} days
                        </p>
                    </div>
                    <AreaChartCard
                        title=""
                        data={attendanceTrend}
                        dataKey="rate"
                        color="#10b981"
                        height={300}
                    />
                    <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t">
                        <div className="text-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md transition-all duration-200 border border-transparent hover:border-indigo-100">
                            <p className="text-xs text-gray-500">Average</p>
                            <p className="text-lg font-bold text-gray-900">
                                {Math.round(
                                    attendanceTrend.reduce((sum, d) => sum + d.rate, 0) /
                                    attendanceTrend.length
                                )}%
                            </p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md transition-all duration-200 border border-transparent hover:border-indigo-100">
                            <p className="text-xs text-gray-500">Highest</p>
                            <p className="text-lg font-bold text-green-600">
                                {Math.max(...attendanceTrend.map(d => d.rate))}%
                            </p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md transition-all duration-200 border border-transparent hover:border-indigo-100">
                            <p className="text-xs text-gray-500">Lowest</p>
                            <p className="text-lg font-bold text-red-600">
                                {Math.min(...attendanceTrend.map(d => d.rate))}%
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Mess Consumption Trend */}
            {messTrend.length > 0 && (
                <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            Mess Consumption Trend
                        </h3>
                        <p className="text-sm text-gray-600">
                            Total meals served per day over {messTrend.length} days
                        </p>
                    </div>
                    <LineChartCard
                        title=""
                        data={messTrend}
                        dataKeys={["count"]}
                        colors={["#3b82f6"]}
                        height={300}
                    />
                    <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t">
                        <div className="text-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md transition-all duration-200 border border-transparent hover:border-indigo-100">
                            <p className="text-xs text-gray-500">Total Meals</p>
                            <p className="text-lg font-bold text-gray-900">
                                {messTrend.reduce((sum, d) => sum + d.count, 0)}
                            </p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md transition-all duration-200 border border-transparent hover:border-indigo-100">
                            <p className="text-xs text-gray-500">Daily Average</p>
                            <p className="text-lg font-bold text-blue-600">
                                {Math.round(
                                    messTrend.reduce((sum, d) => sum + d.count, 0) /
                                    messTrend.filter(d => d.count > 0).length
                                )}
                            </p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md transition-all duration-200 border border-transparent hover:border-indigo-100">
                            <p className="text-xs text-gray-500">Peak Day</p>
                            <p className="text-lg font-bold text-green-600">
                                {Math.max(...messTrend.map(d => d.count))}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Fees Collection Trend */}
            {feesTrend.length > 0 && (
                <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            Fees Collection Trend
                        </h3>
                        <p className="text-sm text-gray-600">
                            Monthly fee collection progress
                        </p>
                    </div>
                    <LineChartCard
                        title=""
                        data={feesTrend}
                        dataKeys={["collected", "pending"]}
                        colors={["#10b981", "#ef4444"]}
                        height={300}
                    />
                </div>
            )}

            {/* Marks Performance Trend */}
            {marksTrend.length > 0 && (
                <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            Average Marks Trend
                        </h3>
                        <p className="text-sm text-gray-600">
                            Overall academic performance trend
                        </p>
                    </div>
                    <AreaChartCard
                        title=""
                        data={marksTrend}
                        dataKey="avgPercentage"
                        color="#6366f1"
                        height={300}
                    />
                </div>
            )}

            {/* Empty State */}
            {!attendanceTrend.length &&
                !feesTrend.length &&
                !marksTrend.length &&
                !messTrend.length && (
                    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-12 text-center transform hover:scale-[1.01]">
                        <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No Trends Data Available
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Trends will appear once you have sufficient historical data.
                        </p>
                        <p className="text-sm text-gray-500">
                            Try selecting a different time period or ensure data has been recorded.
                        </p>
                    </div>
                )}
        </div>
    );
};

export default TrendsTab;
