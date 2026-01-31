// src/pages/Reports/components/OverviewTab.jsx
import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { reportsAPI } from "../../../services/api";
import {
    Users,
    Calendar,
    DollarSign,
    Coffee,
    BookOpen,
    AlertCircle,
    RefreshCw,
    CheckCircle,
    XCircle,
    Clock,
    LogIn,
    LogOut,
    UserX,
    TrendingUp,
} from "lucide-react";
import LoadingSpinner from "../../../components/UI/LoadingSpinner";
import StatCard from "../../../components/Reports/StatCard";

const style = document.createElement("style");
style.textContent = `
    @keyframes slideInUp {
        from {
            opacity: 0;
            transform: translateY(26px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .animate-slide-in {
        animation: slideInUp 0.65s ease-out;
    }
`;
document.head.appendChild(style);

const OverviewTab = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [visibleSections, setVisibleSections] = useState(new Set());
    const sectionRefs = useRef({});

    useEffect(() => {
        fetchOverviewStats();
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisibleSections((prev) => new Set([...prev, entry.target.dataset.section]));
                }
            },
            { threshold: 0.12 }
        );

        Object.keys(sectionRefs.current).forEach((sectionId) => {
            if (sectionRefs.current[sectionId]) {
                observer.observe(sectionRefs.current[sectionId]);
            }
        });

        return () => {
            Object.keys(sectionRefs.current).forEach((sectionId) => {
                if (sectionRefs.current[sectionId]) {
                    observer.unobserve(sectionRefs.current[sectionId]);
                }
            });
        };
    }, []);

    const fetchOverviewStats = async () => {
        try {
            setLoading(true);
            const response = await reportsAPI.getOverview();
            console.log("📊 Overview API Response:", response);

            if (response.data && response.data.success) {
                setStats(response.data.data);
                console.log("✅ Full Stats:", response.data.data);
                console.log("✅ Gate Entry:", response.data.data.gateEntry);
                console.log("✅ Attendance:", response.data.data.attendance);
            } else {
                throw new Error("Invalid response format");
            }
        } catch (error) {
            console.error("❌ Failed to fetch overview:", error);
            toast.error("Failed to load overview");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto" />
                    <p className="text-gray-600 mt-2">Failed to load overview data</p>
                    <button
                        onClick={fetchOverviewStats}
                        className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // ✅ Calculate total meals
    const totalMeals = (stats.mess?.breakfast || 0) + (stats.mess?.lunch || 0) + (stats.mess?.dinner || 0);

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
                    <p className="text-sm text-gray-600 mt-1">Real-time statistics and insights</p>
                </div>
                <button
                    onClick={fetchOverviewStats}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Total Students"
                    value={stats.students?.total || 0}
                    icon={Users}
                    color="text-blue-600"
                    bgColor="bg-blue-50"
                    subtitle={`Active students`}
                />
                <StatCard
                    label="Students In Hostel"
                    value={stats.gateEntry?.in || 0}
                    icon={LogIn}
                    color="text-green-600"
                    bgColor="bg-green-50"
                    subtitle={`${stats.gateEntry?.occupancyRate || 0}% occupancy`}
                />
                <StatCard
                    label="Fee Collection"
                    value={`₹${(stats.fees?.collected || 0).toLocaleString()}`}
                    icon={DollarSign}
                    color="text-purple-600"
                    bgColor="bg-purple-50"
                    subtitle={`${stats.fees?.collectionRate || 0}% collected`}
                />
                <StatCard
                    label="Meals Served Today"
                    value={totalMeals}
                    icon={Coffee}
                    color="text-orange-600"
                    bgColor="bg-orange-50"
                    subtitle="Total meals"
                />
            </div>

            {/* Alerts & Warnings */}
            {stats.alerts && stats.alerts.length > 0 && (
                <div
                    ref={(el) => (sectionRefs.current["alerts"] = el)}
                    data-section="alerts"
                    className={`bg-yellow-50 border-l-4 border-yellow-400 rounded-xl p-4 shadow-lg transition-all hover:shadow-xl hover:-translate-y-1 ${visibleSections.has("alerts") ? "animate-slide-in" : ""}`}
                >
                    <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="ml-3 flex-1">
                            <h3 className="text-sm font-medium text-yellow-900">
                                Attention Required ({stats.alerts.length})
                            </h3>
                            <div className="mt-2 space-y-2">
                                {stats.alerts.map((alert, index) => (
                                    <div
                                        key={index}
                                        className={`text-sm flex items-start p-2 rounded ${alert.type === "danger"
                                                ? "bg-red-50 text-red-700"
                                                : "bg-yellow-50 text-yellow-700"
                                            }`}
                                    >
                                        <span className="mr-2">•</span>
                                        <span>{alert.message}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Detailed Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Student Distribution by Class */}
                <div
                    ref={(el) => (sectionRefs.current["student-distribution"] = el)}
                    data-section="student-distribution"
                    className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 transition-all hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${visibleSections.has("student-distribution") ? "animate-slide-in" : ""}`}
                >
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Users className="h-5 w-5 mr-2 text-blue-600" />
                        Student Distribution by Class
                    </h3>
                    {stats.students?.byClass &&
                        Array.isArray(stats.students.byClass) &&
                        stats.students.byClass.length > 0 ? (
                        <div className="space-y-3">
                            {stats.students.byClass.map((item) => (
                                <div key={item.class} className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700">
                                        Class {item.class}
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <div className="w-32 bg-gray-200 rounded-full h-2.5">
                                            <div
                                                className="bg-blue-600 h-2.5 rounded-full transition-all"
                                                style={{
                                                    width: `${stats.students.total > 0
                                                            ? (item.count / stats.students.total) * 100
                                                            : 0
                                                        }%`,
                                                }}
                                            />
                                        </div>
                                        <span className="text-sm font-bold text-gray-900 w-8 text-right">
                                            {item.count}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500">No student data available</p>
                        </div>
                    )}
                </div>

                {/* ✅ FIXED: Gate Entry Status - Using correct property names */}
                <div
                    ref={(el) => (sectionRefs.current["hostel-entry-status"] = el)}
                    data-section="hostel-entry-status"
                    className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 transition-all hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${visibleSections.has("hostel-entry-status") ? "animate-slide-in" : ""}`}
                >
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Calendar className="h-5 w-5 mr-2 text-purple-600" />
                        Hostel Entry Status
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 transition-all hover:scale-105 hover:shadow-lg">
                            <div className="flex items-center">
                                <LogIn className="h-5 w-5 text-green-600 mr-2" />
                                <span className="text-sm font-bold text-gray-700">In Hostel</span>
                            </div>
                            <span className="text-2xl font-bold text-green-600">
                                {stats.gateEntry?.in || 0}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 transition-all hover:scale-105 hover:shadow-lg">
                            <div className="flex items-center">
                                <LogOut className="h-5 w-5 text-orange-600 mr-2" />
                                <span className="text-sm font-bold text-gray-700">Out of Hostel</span>
                            </div>
                            <span className="text-2xl font-bold text-orange-600">
                                {stats.gateEntry?.out || 0}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200 transition-all hover:scale-105 hover:shadow-lg">
                            <div className="flex items-center">
                                <UserX className="h-5 w-5 text-yellow-600 mr-2" />
                                <span className="text-sm font-bold text-gray-700">On Leave</span>
                            </div>
                            <span className="text-2xl font-bold text-yellow-600">
                                {stats.gateEntry?.onLeave || 0}
                            </span>
                        </div>
                        <div className="pt-2 border-t">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-700">
                                    Hostel Occupancy Rate
                                </span>
                                <span className="text-2xl font-bold text-purple-600">
                                    {stats.gateEntry?.occupancyRate || 0}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ✅ FIXED: Daily Attendance Status */}
                <div
                    ref={(el) => (sectionRefs.current["today-attendance"] = el)}
                    data-section="today-attendance"
                    className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 transition-all hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${visibleSections.has("today-attendance") ? "animate-slide-in" : ""}`}
                >
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                        Today's Attendance
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 transition-all hover:scale-105 hover:shadow-lg">
                            <div className="flex items-center">
                                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                                <span className="text-sm font-bold text-gray-700">Present</span>
                            </div>
                            <span className="text-2xl font-bold text-green-600">
                                {stats.attendance?.todayPresent || 0}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl border border-red-200 transition-all hover:scale-105 hover:shadow-lg">
                            <div className="flex items-center">
                                <XCircle className="h-5 w-5 text-red-600 mr-2" />
                                <span className="text-sm font-bold text-gray-700">Absent</span>
                            </div>
                            <span className="text-2xl font-bold text-red-600">
                                {stats.attendance?.todayAbsent || 0}
                            </span>
                        </div>
                        <div className="pt-2 border-t">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>Attendance Rate</span>
                                <span>{stats.attendance?.rate || 0}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                    className="bg-green-600 h-2.5 rounded-full transition-all"
                                    style={{ width: `${stats.attendance?.rate || 0}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fee Status */}
                <div
                    ref={(el) => (sectionRefs.current["fee-status"] = el)}
                    data-section="fee-status"
                    className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 transition-all hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${visibleSections.has("fee-status") ? "animate-slide-in" : ""}`}
                >
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                        Fee Collection Status
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 transition-all hover:scale-105 hover:shadow-lg">
                            <div className="flex items-center">
                                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                <span className="text-sm text-gray-700">Total Collected</span>
                            </div>
                            <span className="text-lg font-bold text-green-600">
                                ₹{(stats.fees?.collected || 0).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200 transition-all hover:scale-105 hover:shadow-lg">
                            <div className="flex items-center">
                                <Clock className="h-4 w-4 text-yellow-600 mr-2" />
                                <span className="text-sm text-gray-700">Total Pending</span>
                            </div>
                            <span className="text-lg font-bold text-yellow-600">
                                ₹{(stats.fees?.pending || 0).toLocaleString()}
                            </span>
                        </div>

                        <div className="pt-2 border-t">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>Collection Progress</span>
                                <span>{stats.fees?.collectionRate || 0}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                    className="bg-green-600 h-2.5 rounded-full transition-all"
                                    style={{ width: `${stats.fees?.collectionRate || 0}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Weekly Attendance Trend */}
            {stats.attendance?.weeklyTrend && stats.attendance.weeklyTrend.length > 0 && (
                <div
                    ref={(el) => (sectionRefs.current["weekly-trend"] = el)}
                    data-section="weekly-trend"
                    className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 transition-all hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${visibleSections.has("weekly-trend") ? "animate-slide-in" : ""}`}
                >
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <TrendingUp className="h-5 w-5 mr-2 text-indigo-600" />
                        Weekly Attendance Trend
                    </h3>
                    <div className="grid grid-cols-7 gap-2">
                        {stats.attendance.weeklyTrend.map((day, index) => (
                            <div key={index} className="text-center">
                                <div className="text-xs font-medium text-gray-600 mb-2">
                                    {day.name}
                                </div>
                                <div className="h-24 flex items-end justify-center">
                                    <div
                                        className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                                        style={{ height: `${day.rate}%` }}
                                    />
                                </div>
                                <div className="text-xs font-semibold text-gray-900 mt-2">
                                    {day.rate}%
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Mess Summary */}
            <div
                ref={(el) => (sectionRefs.current["mess-summary"] = el)}
                data-section="mess-summary"
                className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 transition-all hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] ${visibleSections.has("mess-summary") ? "animate-slide-in" : ""}`}
            >
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Coffee className="h-5 w-5 mr-2 text-orange-600" />
                    Today's Mess Consumption
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 transition-all hover:scale-105 hover:shadow-lg">
                        <Coffee className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Breakfast</p>
                        <p className="text-2xl font-bold text-orange-600 mt-1">
                            {stats.mess?.breakfast || 0}
                        </p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 transition-all hover:scale-105 hover:shadow-lg">
                        <Coffee className="h-6 w-6 text-green-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Lunch</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">
                            {stats.mess?.lunch || 0}
                        </p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-xl border border-purple-200 transition-all hover:scale-105 hover:shadow-lg">
                        <Coffee className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Dinner</p>
                        <p className="text-2xl font-bold text-purple-600 mt-1">
                            {stats.mess?.dinner || 0}
                        </p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 transition-all hover:scale-105 hover:shadow-lg">
                        <TrendingUp className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Total Meals</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">
                            {totalMeals}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OverviewTab;
