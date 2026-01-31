// src/components/Students/Tabs/MessAttendanceTab.jsx
import React from "react";
import { Coffee, UtensilsCrossed, Moon, Calendar } from "lucide-react";
import LoadingSpinner from "../UI/LoadingSpinner";

const MessAttendanceTab = ({ messData, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const attendance = messData?.data?.messAttendance || [];
  const summary = messData?.data?.summary || {};

  // Group by date so each date becomes one row
  const groupedByDate = attendance.reduce((acc, record) => {
    const dateKey = record.date; // "2025-12-11" etc.
    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: record.date,
        breakfast: false,
        lunch: false,
        dinner: false,
      };
    }

    if (record.mealType === "breakfast") acc[dateKey].breakfast = true;
    if (record.mealType === "lunch") acc[dateKey].lunch = true;
    if (record.mealType === "dinner") acc[dateKey].dinner = true;

    return acc;
  }, {});

  const rows = Object.values(groupedByDate).sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Days"
          value={rows.length || 0}
          icon={<Calendar className="h-5 w-5" />}
          color="bg-purple-100 text-purple-600"
        />
        <SummaryCard
          label="Breakfast"
          value={summary.breakfast || 0}
          icon={<Coffee className="h-5 w-5" />}
          color="bg-yellow-100 text-yellow-600"
        />
        <SummaryCard
          label="Lunch"
          value={summary.lunch || 0}
          icon={<UtensilsCrossed className="h-5 w-5" />}
          color="bg-orange-100 text-orange-600"
        />
        <SummaryCard
          label="Dinner"
          value={summary.dinner || 0}
          icon={<Moon className="h-5 w-5" />}
          color="bg-blue-100 text-blue-600"
        />
      </div>

      {/* Mess Attendance Records */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Mess Attendance
        </h3>

        {rows.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Breakfast
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Lunch
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Dinner
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Total Meals
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.map((row) => {
                    const totalMeals =
                      (row.breakfast ? 1 : 0) +
                      (row.lunch ? 1 : 0) +
                      (row.dinner ? 1 : 0);

                    return (
                      <tr
                        key={row.date}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(row.date).toLocaleDateString("en-IN", {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {row.breakfast ? <YesPill /> : <NoPill />}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {row.lunch ? <YesPill /> : <NoPill />}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {row.dinner ? <YesPill /> : <NoPill />}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm font-semibold text-gray-900">
                            {totalMeals} / 3
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
            <UtensilsCrossed className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No mess attendance records
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Mess attendance records will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const YesPill = () => (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
    ✓ Yes
  </span>
);

const NoPill = () => (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
    ✗ No
  </span>
);

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

export default MessAttendanceTab;
