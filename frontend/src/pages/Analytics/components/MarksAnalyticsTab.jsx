// src/pages/Analytics/components/MarksAnalyticsTab.jsx
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsAPI } from "../../../services/api";
import BarChartCard from "../../../components/Analytics/BarChartCard";
import PieChartCard from "../../../components/Analytics/PieChartCard";
import MetricCard from "../../../components/Analytics/MetricCard";
import LoadingSpinner from "../../../components/UI/LoadingSpinner";
import { Award, TrendingUp, Users, Filter, AlertTriangle, Trophy, TrendingDown } from "lucide-react";

const MarksAnalyticsTab = () => {
    const [filters, setFilters] = useState({
        exam: "",
        subject: "",
        class: "",
        semester: "",
    });

    const { data: marksData, isLoading, error } = useQuery({
        queryKey: ["marks-analytics", filters],
        queryFn: async () => {
            const response = await analyticsAPI.getMarksSummary(filters);
            console.log("📚 Marks Response:", response);
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
                        Failed to load marks data
                    </p>
                    <p className="text-gray-600 text-sm">{error.message}</p>
                </div>
            </div>
        );
    }

    // ✅ FIX: Correct data extraction
    const apiData = marksData?.data?.data || marksData?.data || {};
    const records = apiData.records || [];
    const summary = apiData.summary || {};

    console.log("📊 Records:", records.length);
    console.log("📈 Summary:", summary);

    // Grade distribution
    const gradeDistribution = Object.entries(summary.gradeDistribution || {}).map(
        ([grade, count]) => ({
            name: `Grade ${grade}`,
            value: count,
        })
    );

    // Top 10 performers
    const topPerformers = records
        .slice(0, 10)
        .map((student) => ({
            name: student.studentName?.split(" ")[0] || "Unknown",
            percentage: student.percentage || 0,
        }));

    // Class-wise performance (group by class)
    const classWisePerformance = records
        .reduce((acc, student) => {
            const className = student.class || "Unknown";
            const existing = acc.find((item) => item.name === className);
            if (existing) {
                existing.totalPercentage += student.percentage || 0;
                existing.count++;
            } else {
                acc.push({
                    name: className,
                    totalPercentage: student.percentage || 0,
                    count: 1,
                });
            }
            return acc;
        }, [])
        .map((item) => ({
            name: item.name,
            avgPercentage: Math.round(item.totalPercentage / item.count),
        }))
        .sort((a, b) => b.avgPercentage - a.avgPercentage);

    // Pass/Fail distribution
    const passFailData = [
        { name: "Passed", value: summary.passedStudents || 0 },
        { name: "Failed", value: summary.failedStudents || 0 },
    ];

    // Performance categories from backend
    const performanceCategories = [
        {
            name: "Excellent (≥85%)",
            value: summary.performanceCategories?.excellent || 0,
        },
        {
            name: "Very Good (75-85%)",
            value: summary.performanceCategories?.veryGood || 0,
        },
        { name: "Good (60-75%)", value: summary.performanceCategories?.good || 0 },
        {
            name: "Average (45-60%)",
            value: summary.performanceCategories?.average || 0,
        },
        {
            name: "Below Average (<45%)",
            value: summary.performanceCategories?.belowAverage || 0,
        },
    ].filter((cat) => cat.value > 0);

    // Subject-wise performance (if exam filter is applied)
    const subjectWisePerformance = records
        .reduce((acc, record) => {
            const subject = record.subject || "Unknown";
            const existing = acc.find((item) => item.name === subject);
            if (existing) {
                existing.totalPercentage += record.percentage || 0;
                existing.count++;
            } else {
                acc.push({
                    name: subject,
                    totalPercentage: record.percentage || 0,
                    count: 1,
                });
            }
            return acc;
        }, [])
        .map((item) => ({
            name: item.name,
            avgPercentage: Math.round(item.totalPercentage / item.count),
        }))
        .sort((a, b) => b.avgPercentage - a.avgPercentage);

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-4 transform hover:scale-[1.01]">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-5 w-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Filters</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Exam Name (Optional)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., Mid-term"
                            value={filters.exam}
                            onChange={(e) => setFilters({ ...filters, exam: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Subject (Optional)
                        </label>
                        <select
                            value={filters.subject}
                            onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        >
                            <option value="">All Subjects</option>
                            <option value="Mathematics">Mathematics</option>
                            <option value="English">English</option>
                            <option value="Science">Science</option>
                            <option value="Social Studies">Social Studies</option>
                            <option value="Hindi">Hindi</option>
                        </select>
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
                            Semester (Optional)
                        </label>
                        <select
                            value={filters.semester}
                            onChange={(e) =>
                                setFilters({ ...filters, semester: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        >
                            <option value="">All Semesters</option>
                            <option value="1">Semester 1</option>
                            <option value="2">Semester 2</option>
                        </select>
                    </div>
                </div>
            </div>

            {records.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-12 text-center transform hover:scale-[1.01]">
                    <AlertTriangle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        No Marks Data
                    </h3>
                    <p className="text-gray-500">
                        No exam records found for the selected filters.
                    </p>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <MetricCard
                            label="Total Records"
                            value={summary.totalStudents || 0}
                            icon={Users}
                            color="bg-blue-500"
                        />
                        <MetricCard
                            label="Average %"
                            value={`${Math.round(summary.averagePercentage) || 0}%`}
                            icon={TrendingUp}
                            color="bg-purple-500"
                        />
                        <MetricCard
                            label="Pass Rate"
                            value={`${Math.round(summary.passPercentage) || 0}%`}
                            icon={Award}
                            color="bg-green-500"
                        />
                        <MetricCard
                            label="Highest"
                            value={`${summary.highestPercentage || 0}%`}
                            icon={Trophy}
                            color="bg-yellow-500"
                        />
                    </div>

                    {/* Top 5 Toppers Section */}
                    {summary.toppers && summary.toppers.length > 0 && (
                        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border-2 border-yellow-200 p-6 transform hover:scale-[1.01]">
                            <div className="flex items-center gap-2 mb-4">
                                <Trophy className="h-6 w-6 text-yellow-600" />
                                <h3 className="text-xl font-bold text-gray-900">
                                    🏆 Top 5 Performers
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                {summary.toppers.slice(0, 5).map((topper, index) => (
                                    <div
                                        key={topper._id}
                                        className={`bg-white rounded-lg p-4 shadow-md hover:shadow-xl transition-all duration-200 border-2 transform hover:scale-[1.02] ${index === 0
                                                ? "border-yellow-400"
                                                : index === 1
                                                    ? "border-gray-400"
                                                    : index === 2
                                                        ? "border-orange-400"
                                                        : "border-blue-200"
                                            }`}
                                    >
                                        <div className="text-center">
                                            <div
                                                className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-white font-bold text-lg mb-2 ${index === 0
                                                        ? "bg-yellow-500"
                                                        : index === 1
                                                            ? "bg-gray-400"
                                                            : index === 2
                                                                ? "bg-orange-500"
                                                                : "bg-blue-500"
                                                    }`}
                                            >
                                                #{topper.rank}
                                            </div>
                                            <p className="font-bold text-gray-900 text-sm mb-1">
                                                {topper.studentName}
                                            </p>
                                            <p className="text-xs text-gray-500 mb-2">
                                                {topper.studentId}
                                            </p>
                                            <div className="bg-green-100 rounded-full px-3 py-1">
                                                <p className="text-lg font-bold text-green-700">
                                                    {topper.percentage}%
                                                </p>
                                            </div>
                                            <p className="text-xs text-gray-600 mt-2">
                                                {topper.subject}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Charts Row 1 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {gradeDistribution.length > 0 && (
                            <PieChartCard
                                title="Grade Distribution"
                                data={gradeDistribution}
                                colors={[
                                    "#10b981",
                                    "#22c55e",
                                    "#3b82f6",
                                    "#f59e0b",
                                    "#ef4444",
                                ]}
                                height={350}
                            />
                        )}

                        {passFailData.some((d) => d.value > 0) && (
                            <PieChartCard
                                title="Pass vs Fail"
                                data={passFailData}
                                colors={["#10b981", "#ef4444"]}
                                height={350}
                            />
                        )}
                    </div>

                    {/* Charts Row 2 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {topPerformers.length > 0 && (
                            <BarChartCard
                                title="Top 10 Performers"
                                data={topPerformers}
                                dataKeys={["percentage"]}
                                colors={["#6366f1"]}
                                height={350}
                            />
                        )}

                        {classWisePerformance.length > 0 && (
                            <BarChartCard
                                title="Class-wise Average Performance"
                                data={classWisePerformance}
                                dataKeys={["avgPercentage"]}
                                colors={["#8b5cf6"]}
                                height={350}
                            />
                        )}
                    </div>

                    {/* Subject-wise Performance */}
                    {subjectWisePerformance.length > 1 && (
                        <BarChartCard
                            title="Subject-wise Average Performance"
                            data={subjectWisePerformance}
                            dataKeys={["avgPercentage"]}
                            colors={["#ec4899"]}
                            height={300}
                        />
                    )}

                    {/* Performance Categories */}
                    {performanceCategories.length > 0 && (
                        <BarChartCard
                            title="Performance Categories"
                            data={performanceCategories}
                            dataKeys={["value"]}
                            colors={["#10b981"]}
                            height={300}
                        />
                    )}

                    {/* All Exam Records Table */}
                    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 p-6 transform hover:scale-[1.01]">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            All Exam Records ({records.length})
                        </h3>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                            Rank
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                            Student
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                            Exam
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                            Subject
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                                            Marks
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                                            %
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                                            Grade
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {records.map((student, index) => (
                                        <tr
                                            key={student._id || index}
                                            className="hover:bg-gray-50 hover:shadow-md transition-all duration-200 border border-transparent hover:border-indigo-100"
                                        >
                                            <td className="px-4 py-3">
                                                <div
                                                    className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white text-sm ${index < 3
                                                            ? "bg-yellow-500"
                                                            : "bg-gray-400"
                                                        }`}
                                                >
                                                    #{student.rank || index + 1}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {student.studentName}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {student.studentId} | Roll: {student.rollNumber}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm text-gray-700">
                                                    {student.examName}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {student.examType}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">
                                                {student.subject}
                                            </td>
                                            <td className="px-4 py-3 text-center font-medium">
                                                {student.obtainedMarks}/{student.totalMarks}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span
                                                    className={`inline-flex px-3 py-1 rounded-full text-sm font-bold ${student.percentage >= 85
                                                            ? "bg-green-100 text-green-800"
                                                            : student.percentage >= 60
                                                                ? "bg-blue-100 text-blue-800"
                                                                : student.percentage >= 45
                                                                    ? "bg-yellow-100 text-yellow-800"
                                                                    : "bg-red-100 text-red-800"
                                                        }`}
                                                >
                                                    {student.percentage}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span
                                                    className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${student.grade === "A+" ||
                                                            student.grade === "A"
                                                            ? "bg-green-100 text-green-800"
                                                            : student.grade?.startsWith("B")
                                                                ? "bg-blue-100 text-blue-800"
                                                                : student.grade?.startsWith("C")
                                                                    ? "bg-yellow-100 text-yellow-800"
                                                                    : "bg-red-100 text-red-800"
                                                        }`}
                                                >
                                                    {student.grade || "N/A"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default MarksAnalyticsTab;
