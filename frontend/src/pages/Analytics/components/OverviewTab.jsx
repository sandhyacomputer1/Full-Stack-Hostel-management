// src/pages/Analytics/components/OverviewTab.jsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsAPI } from "../../../services/api";
import LineChartCard from "../../../components/Analytics/LineChartCard";
import BarChartCard from "../../../components/Analytics/BarChartCard";
import PieChartCard from "../../../components/Analytics/PieChartCard";
import StatCard from "../../../components/Analytics/StatCard";
import LoadingSpinner from "../../../components/UI/LoadingSpinner";
import {
    Users,
    TrendingUp,
    DollarSign,
    CheckCircle,
    AlertTriangle,
    LogIn,
    LogOut,
    UserX,
    Coffee,
    BookOpen,
    CreditCard,
} from "lucide-react";

const OverviewTab = () => {
    const { data: overview, isLoading, error } = useQuery({
        queryKey: ["analytics-overview"],
        queryFn: async () => {
            const response = await analyticsAPI.getOverview();
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
        retry: 2,
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
                        Failed to load overview data
                    </p>
                    <p className="text-gray-600 text-sm">{error.message}</p>
                </div>
            </div>
        );
    }

    const stats = overview?.data || {};
    const students = stats.students || {};
    const gateEntry = stats.gateEntry || {};
    const attendance = stats.attendance || {};
    const fees = stats.fees || {};
    const mess = stats.mess || {};
    const marks = stats.marks || {};
    const expenses = stats.expenses || {};
    const bank = stats.bank || {};
    const alerts = stats.alerts || [];

    // Chart data
    const attendanceTrendData = attendance.weeklyTrend || [];
    const feesPieData = [
        { name: "Collected", value: fees.collected || 0 },
        { name: "Pending", value: fees.pending || 0 },
    ];
    const studentsByClassData = (students.byClass || []).map((item) => ({
        name: `Class ${item.class}`,
        students: item.count,
    }));
    const messMealsData = [
        { name: "Breakfast", count: mess.breakfast || 0 },
        { name: "Lunch", count: mess.lunch || 0 },
        { name: "Dinner", count: mess.dinner || 0 },
    ];
    const expensesData = (expenses.categoryBreakdown || []).slice(0, 5).map((item) => ({
        name: item._id.replace(/_/g, " ").toUpperCase(),
        amount: item.totalAmount,
    }));

    return (
        <div className="space-y-6">
            {/* Top Stats Cards - Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    label="Total Students"
                    value={students.total || 0}
                    icon={Users}
                    color="bg-blue-500"
                />
                <StatCard
                    label="Students In Hostel"
                    value={gateEntry.in || 0}
                    icon={LogIn}
                    color="bg-green-500"
                    subtitle={`${gateEntry.occupancyRate || 0}% occupancy`}
                />
                <StatCard
                    label="Daily Attendance"
                    value={`${attendance.rate || 0}%`}
                    icon={CheckCircle}
                    color="bg-indigo-500"
                    subtitle={`${attendance.todayPresent || 0} present today`}
                />
                <StatCard
                    label="Fees Collected"
                    value={`₹${(fees.collected || 0).toLocaleString()}`}
                    icon={DollarSign}
                    color="bg-yellow-500"
                    subtitle={`${fees.collectionRate || 0}% rate`}
                />
            </div>

            {/* Top Stats Cards - Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    label="Students Out"
                    value={gateEntry.out || 0}
                    icon={LogOut}
                    color="bg-orange-500"
                />
                <StatCard
                    label="On Leave"
                    value={gateEntry.onLeave || 0}
                    icon={UserX}
                    color="bg-purple-500"
                />
                <StatCard
                    label="Avg Marks"
                    value={`${marks.averagePercentage || 0}%`}
                    icon={BookOpen}
                    color="bg-pink-500"
                    subtitle={`${marks.passPercentage || 0}% pass rate`}
                />
                <StatCard
                    label="Bank Balance"
                    value={`₹${(bank.averageBalance || 0).toLocaleString()}`}
                    icon={CreditCard}
                    color="bg-teal-500"
                    subtitle="Avg per student"
                />
            </div>

            {/* Alerts */}
            {alerts.length > 0 && (
                <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                            Alerts & Notifications
                        </h3>
                    </div>
                    <div className="space-y-3">
                        {alerts.map((alert, index) => (
                            <div
                                key={index}
                                className={`p-4 rounded-lg border-l-4 shadow-sm ${
                                    alert.type === "danger"
                                        ? "bg-red-50 border-red-500"
                                        : "bg-yellow-50 border-yellow-500"
                                }`}
                            >
                                <p
                                    className={`font-medium ${
                                        alert.type === "danger"
                                            ? "text-red-800"
                                            : "text-yellow-800"
                                    }`}
                                >
                                    {alert.message}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {attendanceTrendData.length > 0 ? (
                    <LineChartCard
                        title="Weekly Attendance Trend"
                        data={attendanceTrendData}
                        dataKeys={["rate"]}
                        colors={["#10b981"]}
                        height={300}
                    />
                ) : (
                    <EmptyChartCard
                        title="Weekly Attendance Trend"
                        message="No attendance data for last 7 days"
                    />
                )}

                {fees.collected > 0 || fees.pending > 0 ? (
                    <PieChartCard
                        title="Fee Collection Status"
                        data={feesPieData}
                        colors={["#10b981", "#ef4444"]}
                        height={300}
                    />
                ) : (
                    <EmptyChartCard
                        title="Fee Collection Status"
                        message="No fee data available"
                    />
                )}
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {studentsByClassData.length > 0 ? (
                    <BarChartCard
                        title="Students by Class"
                        data={studentsByClassData}
                        dataKeys={["students"]}
                        colors={["#6366f1"]}
                        height={300}
                    />
                ) : (
                    <EmptyChartCard
                        title="Students by Class"
                        message="No class distribution data"
                    />
                )}

                {messMealsData.some((m) => m.count > 0) ? (
                    <BarChartCard
                        title="Today's Mess Attendance"
                        data={messMealsData}
                        dataKeys={["count"]}
                        colors={["#f59e0b"]}
                        height={300}
                    />
                ) : (
                    <EmptyChartCard
                        title="Today's Mess Attendance"
                        message="No mess attendance recorded today"
                    />
                )}
            </div>

            {/* Charts Row 3 - Expenses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {expensesData.length > 0 ? (
                    <BarChartCard
                        title="Top 5 Expense Categories (This Month)"
                        data={expensesData}
                        dataKeys={["amount"]}
                        colors={["#ef4444"]}
                        height={300}
                    />
                ) : (
                    <EmptyChartCard
                        title="Expense Categories"
                        message="No expense data for current month"
                    />
                )}

                {/* Gate Entry Status Card */}
                <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Gate Entry Status
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg shadow-sm">
                            <div className="flex items-center gap-2">
                                <LogIn className="h-5 w-5 text-green-600" />
                                <span className="text-sm font-medium text-gray-700">
                                    In Hostel
                                </span>
                            </div>
                            <span className="text-2xl font-bold text-green-600">
                                {gateEntry.in || 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg shadow-sm">
                            <div className="flex items-center gap-2">
                                <LogOut className="h-5 w-5 text-orange-600" />
                                <span className="text-sm font-medium text-gray-700">
                                    Out of Hostel
                                </span>
                            </div>
                            <span className="text-2xl font-bold text-orange-600">
                                {gateEntry.out || 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg shadow-sm">
                            <div className="flex items-center gap-2">
                                <UserX className="h-5 w-5 text-purple-600" />
                                <span className="text-sm font-medium text-gray-700">
                                    On Leave
                                </span>
                            </div>
                            <span className="text-2xl font-bold text-purple-600">
                                {gateEntry.onLeave || 0}
                            </span>
                        </div>
                        <div className="pt-3 border-t">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-600">
                                    Occupancy Rate
                                </span>
                                <span className="text-lg font-bold text-indigo-600">
                                    {gateEntry.occupancyRate || 0}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard
                    title="Total Collected"
                    value={`₹${(fees.collected || 0).toLocaleString()}`}
                    subtitle={`${fees.collectionRate || 0}% collection rate`}
                    valueColor="text-green-600"
                />
                <SummaryCard
                    title="Pending Fees"
                    value={`₹${(fees.pending || 0).toLocaleString()}`}
                    subtitle="Outstanding amount"
                    valueColor="text-red-600"
                />
                <SummaryCard
                    title="Month Expenses"
                    value={`₹${(expenses.currentMonth || 0).toLocaleString()}`}
                    subtitle={`Top: ${expenses.topCategory || "N/A"}`}
                    valueColor="text-orange-600"
                />
                <SummaryCard
                    title="Low Balance"
                    value={bank.lowBalanceCount || 0}
                    subtitle="Students with ≤₹100"
                    valueColor="text-yellow-600"
                />
            </div>
        </div>
    );
};

// Helper Components
const EmptyChartCard = ({ title, message }) => (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex flex-col items-center justify-center h-[236px] text-center">
            <AlertTriangle className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">{message}</p>
        </div>
    </div>
);

const SummaryCard = ({ title, value, subtitle, valueColor }) => (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
        <h4 className="text-sm font-medium text-gray-600 mb-2">{title}</h4>
        <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
);

export default OverviewTab;
