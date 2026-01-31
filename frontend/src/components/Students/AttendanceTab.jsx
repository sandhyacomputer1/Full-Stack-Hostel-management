import React from "react";
import { Calendar, CheckCircle, XCircle, Clock, Coffee } from "lucide-react";
import LoadingSpinner from "../UI/LoadingSpinner";

const AttendanceTab = ({ attendanceData, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const attendance = attendanceData?.data?.attendance || [];
  const summary = attendanceData?.data?.summary || {};

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SummaryCard
          label="Total Days"
          value={summary.totalDays || 0}
          icon={<Calendar className="h-5 w-5" />}
          color="bg-blue-100 text-blue-600"
        />
        <SummaryCard
          label="Present"
          value={summary.present || 0}
          icon={<CheckCircle className="h-5 w-5" />}
          color="bg-green-100 text-green-600"
        />
        <SummaryCard
          label="Absent"
          value={summary.absent || 0}
          icon={<XCircle className="h-5 w-5" />}
          color="bg-red-100 text-red-600"
        />
        <SummaryCard
          label="On Leave"
          value={summary.on_leave || 0}
          icon={<Coffee className="h-5 w-5" />}
          color="bg-yellow-100 text-yellow-600"
        />
        <SummaryCard
          label="Attendance %"
          value={`${summary.percentage || 0}%`}
          icon={<Clock className="h-5 w-5" />}
          color="bg-purple-100 text-purple-600"
        />
      </div>

      {/* Attendance Records */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Daily Attendance Records
        </h3>

        {attendance.length > 0 ? (
          <div className="space-y-2">
            {attendance.map((record) => (
              <div
                key={record._id}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="font-medium text-gray-900">
                      {formatDate(record.date)}
                    </div>
                    <span className={`badge ${getStatusBadge(record.status)}`}>
                      {record.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 mt-1">
                    <span className="inline-flex items-center mr-4">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(record.timestamp).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="text-gray-500">
                      Source: {record.source}
                    </span>
                  </div>

                  {record.notes && (
                    <div className="text-sm text-gray-600 mt-1 italic">
                      {record.notes}
                    </div>
                  )}

                  {record.validationIssues &&
                    record.validationIssues.length > 0 && (
                      <div className="mt-2 flex items-center text-xs text-orange-600">
                        <span className="font-medium">
                          ⚠️ {record.validationIssues.length} validation
                          issue(s)
                        </span>
                      </div>
                    )}
                </div>

                <div className="text-right">
                  {record.reconciled ? (
                    <span className="text-xs text-green-600">✓ Reconciled</span>
                  ) : (
                    <span className="text-xs text-gray-400">Unreconciled</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No attendance records
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Attendance records will appear here once marked by cron job.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to format date
const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const [year, month, day] = dateStr.split("-");
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Helper function to get badge color
const getStatusBadge = (status) => {
  const badges = {
    present: "badge-success",
    absent: "badge-danger",
    on_leave: "badge-warning",
    late: "badge-warning",
    half_day: "badge-info",
    excused: "badge-secondary",
  };
  return badges[status] || "badge-default";
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

export default AttendanceTab;
