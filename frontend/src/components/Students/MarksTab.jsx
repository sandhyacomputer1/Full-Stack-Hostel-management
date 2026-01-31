// src/components/Students/Tabs/MarksTab.jsx
import React from "react";
import { BookOpen, Award, TrendingUp, Calendar } from "lucide-react";
import LoadingSpinner from "../UI/LoadingSpinner";

const MarksTab = ({ marksData, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const marks = marksData?.data?.marks || [];
  const summary = marksData?.data?.summary || {};

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Exams"
          value={summary.totalExams || 0}
          icon={<BookOpen className="h-5 w-5" />}
          color="bg-blue-100 text-blue-600"
        />
        <SummaryCard
          label="Total Marks"
          value={summary.totalMarks || 0}
          icon={<Award className="h-5 w-5" />}
          color="bg-purple-100 text-purple-600"
        />
        <SummaryCard
          label="Obtained Marks"
          value={summary.obtainedMarks || 0}
          icon={<Award className="h-5 w-5" />}
          color="bg-green-100 text-green-600"
        />
        <SummaryCard
          label="Average %"
          value={`${summary.averagePercentage || 0}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          color="bg-orange-100 text-orange-600"
        />
      </div>

      {/* Marks Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BookOpen className="h-5 w-5 mr-2 text-primary-600" />
          Exam Results
        </h3>

        {marks.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Exam Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Obtained
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Percentage
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Grade
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {marks.map((mark) => {
                    const percentage = (
                      (mark.marksObtained / mark.totalMarks) *
                      100
                    ).toFixed(2);
                    const grade = getGrade(percentage);

                    return (
                      <tr
                        key={mark._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {mark.examName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-700">
                            {mark.subject}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(mark.examDate).toLocaleDateString(
                              "en-IN"
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm font-semibold text-green-600">
                            {mark.marksObtained}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm text-gray-700">
                            {mark.totalMarks}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span
                            className={`text-sm font-semibold ${
                              percentage >= 75
                                ? "text-green-600"
                                : percentage >= 60
                                ? "text-blue-600"
                                : percentage >= 40
                                ? "text-orange-600"
                                : "text-red-600"
                            }`}
                          >
                            {percentage}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span
                            className={`badge ${getGradeBadgeClass(grade)}`}
                          >
                            {grade}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No exam results yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Exam marks will appear here once added.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Functions
const getGrade = (percentage) => {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
};

const getGradeBadgeClass = (grade) => {
  const gradeClasses = {
    "A+": "badge-success",
    A: "badge-success",
    "B+": "badge-primary",
    B: "badge-primary",
    C: "badge-warning",
    D: "badge-warning",
    F: "badge-danger",
  };
  return gradeClasses[grade] || "badge-secondary";
};

const SummaryCard = ({ label, value, icon, color }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm text-gray-600 mb-1">{label}</div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
      </div>
      <div className={`p-3 rounded-full ${color}`}>{icon}</div>
    </div>
  </div>
);

export default MarksTab;
