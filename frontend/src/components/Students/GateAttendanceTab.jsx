import React, { useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import LoadingSpinner from "../UI/LoadingSpinner";

const GateAttendanceTab = ({ gateData, isLoading }) => {
  const [filter, setFilter] = useState("all"); // all, IN, OUT

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const gateEntries = gateData?.data?.gateEntries || [];
  const summary = gateData?.data?.summary || {};

  // Filter entries based on selected filter
  const filteredEntries =
    filter === "all"
      ? gateEntries
      : gateEntries.filter((entry) => entry.type === filter);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Entries"
          value={summary.totalEntries || 0}
          color="bg-blue-100 text-blue-600"
        />
        <SummaryCard
          label="IN Entries"
          value={summary.inEntries || 0}
          color="bg-green-100 text-green-600"
        />
        <SummaryCard
          label="OUT Entries"
          value={summary.outEntries || 0}
          color="bg-orange-100 text-orange-600"
        />
        <SummaryCard
          label="With Issues"
          value={summary.entriesWithIssues || 0}
          color="bg-red-100 text-red-600"
        />
      </div>

      {/* Filter Buttons */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setFilter("all")}
          className={`btn btn-sm ${
            filter === "all" ? "btn-primary" : "btn-outline"
          }`}
        >
          All Entries
        </button>
        <button
          onClick={() => setFilter("IN")}
          className={`btn btn-sm ${
            filter === "IN" ? "btn-primary" : "btn-outline"
          }`}
        >
          IN Only
        </button>
        <button
          onClick={() => setFilter("OUT")}
          className={`btn btn-sm ${
            filter === "OUT" ? "btn-primary" : "btn-outline"
          }`}
        >
          OUT Only
        </button>
      </div>

      {/* Gate Entries List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Gate Entry/Exit Records
        </h3>

        {filteredEntries.length > 0 ? (
          <div className="space-y-2">
            {filteredEntries.map((entry) => (
              <div
                key={entry._id}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center space-x-4 flex-1">
                  {/* Entry Type Icon */}
                  <div
                    className={`p-3 rounded-full ${
                      entry.type === "IN"
                        ? "bg-green-100 text-green-600"
                        : "bg-orange-100 text-orange-600"
                    }`}
                  >
                    {entry.type === "IN" ? (
                      <ArrowDownCircle className="h-6 w-6" />
                    ) : (
                      <ArrowUpCircle className="h-6 w-6" />
                    )}
                  </div>

                  {/* Entry Details */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="font-semibold text-gray-900">
                        {entry.type}
                      </span>
                      <span className="text-sm text-gray-600">
                        {formatDate(entry.date)}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 mt-1 flex items-center space-x-4">
                      <span className="inline-flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(entry.timestamp).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {entry.source}
                      </span>
                      {entry.deviceId && (
                        <span className="text-xs text-gray-500">
                          Device: {entry.deviceId}
                        </span>
                      )}
                    </div>

                    {entry.notes && (
                      <div className="text-sm text-gray-600 mt-1 italic">
                        {entry.notes}
                      </div>
                    )}

                    {/* Validation Issues */}
                    {entry.validationIssues &&
                      entry.validationIssues.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {entry.validationIssues.map((issue, idx) => (
                            <div
                              key={idx}
                              className={`text-xs px-2 py-1 rounded inline-flex items-center mr-2 ${
                                issue.severity === "error"
                                  ? "bg-red-100 text-red-700"
                                  : issue.severity === "warning"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {issue.type.replace(/_/g, " ")}
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                </div>

                {/* Reconciliation Status */}
                <div className="text-right">
                  {entry.reconciled ? (
                    <span className="text-xs text-green-600 font-medium">
                      ✓ Reconciled
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Pending</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Clock className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No gate entries found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Gate entry records will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const [year, month, day] = dateStr.split("-");
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
};

const SummaryCard = ({ label, value, color }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
    <div className="text-sm text-gray-600 mb-1">{label}</div>
    <div className={`text-2xl font-bold ${color}`}>{value}</div>
  </div>
);

export default GateAttendanceTab;
