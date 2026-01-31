import React from "react";
import { useQuery } from "@tanstack/react-query";
import { employeesAPI, employeeAttendanceAPI } from "../../services/api";
import {
    Users,
    UserCheck,
    UserX,
    Clock,
    TrendingUp,
    LogIn,
    LogOut,
    Activity,
} from "lucide-react";
import { Link } from "react-router-dom";

const EmployeeQuickStats = () => {
    const { data: employeesData } = useQuery({
        queryKey: ["employees"],
        queryFn: async () => {
            const response = await employeesAPI.getAll();
            return response.data;
        },
    });

    const { data: todayStats } = useQuery({
        queryKey: ["attendance", "today"],
        queryFn: async () => {
            const today = new Date().toISOString().split("T")[0];
            const response = await employeeAttendanceAPI.getDailySummary(today);
            return response.data.data;
        },
    });

    const employees = employeesData?.employees || [];
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter((e) => e.status === "ACTIVE").length;
    const currentlyIn = employees.filter((e) => e.currentStatus === "IN").length;
    const currentlyOut = totalEmployees - currentlyIn;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <Activity className="w-6 h-6 mr-2 text-primary-600" />
                    Employee Overview
                </h2>
                <Link
                    to="/employees"
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                    View All →
                </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Employees */}
                <StatCard
                    icon={Users}
                    label="Total Staff"
                    value={totalEmployees}
                    color="blue"
                />

                {/* Active Employees */}
                <StatCard
                    icon={UserCheck}
                    label="Active"
                    value={activeEmployees}
                    color="green"
                />

                {/* Currently IN */}
                <StatCard
                    icon={LogIn}
                    label="Currently IN"
                    value={currentlyIn}
                    color="purple"
                />

                {/* Currently OUT */}
                <StatCard
                    icon={LogOut}
                    label="Currently OUT"
                    value={currentlyOut}
                    color="gray"
                />
            </div>

            {/* Today's Summary */}
            {todayStats && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-sm font-bold text-gray-700 mb-3">
                        Today's Attendance
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">
                                {todayStats.present || 0}
                            </p>
                            <p className="text-xs text-gray-600">Present</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-red-600">
                                {todayStats.absent || 0}
                            </p>
                            <p className="text-xs text-gray-600">Absent</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600">
                                {todayStats.totalHours?.toFixed(1) || 0}h
                            </p>
                            <p className="text-xs text-gray-600">Total Hours</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ icon: Icon, label, value, color }) => {
    const colors = {
        blue: "bg-blue-100 text-blue-600",
        green: "bg-green-100 text-green-600",
        purple: "bg-purple-100 text-purple-600",
        gray: "bg-gray-100 text-gray-600",
    };

    return (
        <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${colors[color]}`}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-600">{label}</p>
        </div>
    );
};

export default EmployeeQuickStats;
