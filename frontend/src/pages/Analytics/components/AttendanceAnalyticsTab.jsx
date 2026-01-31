// src/pages/Analytics/components/AttendanceAnalyticsTab.jsx
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsAPI } from "../../../services/api";
import LineChartCard from "../../../components/Analytics/LineChartCard";
import BarChartCard from "../../../components/Analytics/BarChartCard";
import PieChartCard from "../../../components/Analytics/PieChartCard";
import LoadingSpinner from "../../../components/UI/LoadingSpinner";
import { Filter, AlertTriangle, Calendar, Users, TrendingUp, AlertCircle, UserCheck } from "lucide-react";

const AttendanceAnalyticsTab = () => {
  const [filters, setFilters] = useState({
    month: new Date().toISOString().slice(0, 7),
    class: "",
    block: "",
  });

  const { data: monthlyData, isLoading, error } = useQuery({
    queryKey: ["attendance-analytics", filters],
    queryFn: async () => {
      const response = await analyticsAPI.getAttendanceMonthly(filters);
      console.log("📊 Attendance Response:", response);
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
          <p className="text-red-600 font-semibold mb-2">Failed to load attendance data</p>
          <p className="text-gray-600 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  // ✅ FIX: Correct data extraction
  const apiData = monthlyData?.data?.data || monthlyData?.data || {};
  const records = apiData.records || [];
  const summary = apiData.summary || {};

  console.log("📈 Records:", records.length);
  console.log("📊 Summary:", summary);

  // Chart data
  const top10Students = records
    .slice(0, 10)
    .map((student) => ({
      name: student.studentName?.split(" ")[0] || "Unknown",
      rate: student.attendanceRate || 0,
      present: student.presentDays || 0,
      absent: student.absentDays || 0,
    }));

  const categoryDistribution = [
    { name: "Excellent (≥90%)", value: summary.categories?.excellent || 0 },
    { name: "Average (75-90%)", value: summary.categories?.average || 0 },
    { name: "Poor (<75%)", value: summary.categories?.poor || 0 },
  ];

  const classWiseData = records
    .reduce((acc, student) => {
      const className = `Class ${student.class}`;
      const existing = acc.find((item) => item.name === className);
      if (existing) {
        existing.totalRate += student.attendanceRate || 0;
        existing.count++;
      } else {
        acc.push({
          name: className,
          totalRate: student.attendanceRate || 0,
          count: 1,
        });
      }
      return acc;
    }, [])
    .map((item) => ({
      name: item.name,
      avgRate: Math.round(item.totalRate / item.count),
    }));

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-4 transform hover:scale-[1.01]">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Block (Optional)
            </label>
            <select
              value={filters.block}
              onChange={(e) => setFilters({ ...filters, block: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            >
              <option value="">All Blocks</option>
              <option value="A">Block A</option>
              <option value="B">Block B</option>
              <option value="C">Block C</option>
              <option value="D">Block D</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Students"
          value={summary.totalStudents || 0}
          color="bg-blue-500"
          icon={Users}
        />
        <SummaryCard
          label="Average Attendance"
          value={`${summary.averageAttendance || 0}%`}
          color="bg-green-500"
          icon={TrendingUp}
        />
        <SummaryCard
          label="Excellent (≥90%)"
          value={summary.categories?.excellent || 0}
          color="bg-purple-500"
          icon={UserCheck}
        />
        <SummaryCard
          label="Poor (<75%)"
          value={summary.categories?.poor || 0}
          color="bg-red-500"
          icon={AlertCircle}
        />
      </div>

      {records.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-12 text-center transform hover:scale-[1.01]">
          <AlertTriangle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No Attendance Data
          </h3>
          <p className="text-gray-500">
            No attendance records found for the selected filters.
          </p>
        </div>
      ) : (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {top10Students.length > 0 && (
              <BarChartCard
                title="Top 10 Students by Attendance"
                data={top10Students}
                dataKeys={["rate"]}
                colors={["#10b981"]}
                height={350}
              />
            )}

            {categoryDistribution.some((d) => d.value > 0) && (
              <PieChartCard
                title="Attendance Categories"
                data={categoryDistribution}
                colors={["#10b981", "#f59e0b", "#ef4444"]}
                height={350}
              />
            )}
          </div>

          {classWiseData.length > 0 && (
            <BarChartCard
              title="Class-wise Average Attendance"
              data={classWiseData}
              dataKeys={["avgRate"]}
              colors={["#8b5cf6"]}
              height={300}
            />
          )}

          {/* Student List */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Student Details ({records.length})
              </h3>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {records.map((student, index) => (
                <div
                  key={student._id || index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-transparent hover:border-indigo-100 hover:bg-gray-100 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {student.studentName}
                        </p>
                        <p className="text-xs text-gray-500">
                          Roll: {student.rollNumber} | Class: {student.class}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${student.attendanceRate >= 90
                            ? "bg-green-100 text-green-800"
                            : student.attendanceRate >= 75
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                      >
                        {student.attendanceRate}%
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${student.attendanceRate >= 90
                            ? "bg-green-600"
                            : student.attendanceRate >= 75
                              ? "bg-yellow-600"
                              : "bg-red-600"
                          }`}
                        style={{ width: `${student.attendanceRate}%` }}
                      />
                    </div>

                    <div className="flex gap-4 mt-2 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        Present: {student.presentDays}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full" />
                        Absent: {student.absentDays}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full" />
                        Leave: {student.leaveDays || 0}
                      </span>
                      <span className="font-semibold">
                        Total: {student.totalDays}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const SummaryCard = ({ label, value, color, icon: Icon }) => (
  <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
    <p className="text-sm text-gray-600 font-medium mb-2">{label}</p>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`${color} h-3 w-3 rounded-full`} />
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`${color} p-3 rounded-lg`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
    </div>
  </div>
);

export default AttendanceAnalyticsTab;
