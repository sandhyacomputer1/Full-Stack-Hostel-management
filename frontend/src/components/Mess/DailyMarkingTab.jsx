// src/components/Mess/DailyMarkingTab.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Users,
  Calendar,
  UtensilsCrossed,
  Coffee,
  Soup,
  Moon,
  RefreshCw,
  UserX,
  AlertCircle,
  Umbrella,
} from "lucide-react";
import { useMessSettings } from "../../contexts/MessSettingsContext";
import { messAPI } from "../../services/api";
import LoadingSpinner from "../UI/LoadingSpinner";
import Swal from "sweetalert2";

const getMealIcon = (meal) => {
  const icons = {
    breakfast: Coffee,
    lunch: Soup,
    dinner: Moon,
  };
  return icons[meal] || UtensilsCrossed;
};

const getMealColor = (meal) => {
  const colors = {
    breakfast: "orange",
    lunch: "green",
    dinner: "blue",
  };
  return colors[meal] || "gray";
};

const DailyMarkingTab = () => {
  const { getAvailableMeals, getCurrentMeal: getContextCurrentMeal } =
    useMessSettings();
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
  const [mealType, setMealType] = useState("breakfast");
  const [block, setBlock] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [summary, setSummary] = useState(null);
  const [currentMeal, setCurrentMeal] = useState(null);

  const mealTypes = useMemo(() => {
    return getAvailableMeals().map((meal) => ({
      value: meal,
      label: meal.charAt(0).toUpperCase() + meal.slice(1),
      icon: getMealIcon(meal),
      color: getMealColor(meal),
    }));
  }, [getAvailableMeals]);

  // ⭐ FIXED: Current meal detection with debug logging
  useEffect(() => {
    const updateCurrentMeal = () => {
      const meal = getContextCurrentMeal();
      console.log("Current meal from context:", meal);
      setCurrentMeal(meal);

      if (meal && date === today) {
        setMealType(meal);
      }
    };

    updateCurrentMeal();
    const interval = setInterval(updateCurrentMeal, 60000);
    return () => clearInterval(interval);
  }, [date, today, getContextCurrentMeal]);

  useEffect(() => {
    if (date && mealType) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, mealType, block]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = { date, mealType };
      if (block) params.block = block;

      const res = await messAPI.getDaily(params);
      console.log("Loaded students:", res.data.data); // ⭐ DEBUG
      setStudents(res.data.data || []);
      setSummary(res.data.summary || null);
    } catch (err) {
      console.error("Load data error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Failed to load data",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkSingle = async (studentId, status) => {
    try {
      setMarking(true);

      await messAPI.mark({
        studentId,
        date,
        mealType,
        status,
      });

      await loadData();

      Swal.fire({
        icon: "success",
        title: "Success",
        text: `Marked ${status}`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Mark error:", err);

      if (err.response?.data?.onLeave) {
        const leave = err.response.data.leaveDetails;
        Swal.fire({
          icon: "warning",
          title: "Student is on Leave",
          html: `
            <div style="text-align: left; padding: 10px;">
              <p style="margin-bottom: 8px;"><strong>Leave Type:</strong> ${
                leave.leaveType
              }</p>
              <p style="margin-bottom: 8px;"><strong>From:</strong> ${
                leave.fromDate
              }</p>
              <p style="margin-bottom: 8px;"><strong>To:</strong> ${
                leave.earlyReturn ? leave.actualReturnDate : leave.toDate
              }</p>
              <p style="margin-bottom: 8px;"><strong>Reason:</strong> ${
                leave.reason
              }</p>
            </div>
          `,
          confirmButtonText: "OK",
          confirmButtonColor: "#f59e0b",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: err.response?.data?.message || "Failed to mark attendance",
        });
      }
    } finally {
      setMarking(false);
    }
  };

  const handleBulkMark = async (status) => {
    const eligibleStudents = students.filter(
      (s) => s.eligible && !s.isOnMessOff && !s.isOnLeave
    );

    if (eligibleStudents.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Students",
        text: "No eligible students to mark",
      });
      return;
    }

    const result = await Swal.fire({
      icon: "question",
      title: "Confirm Bulk Action",
      text: `Mark all ${eligibleStudents.length} eligible students as ${status}?`,
      showCancelButton: true,
      confirmButtonText: "Yes, mark all",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      setMarking(true);

      const studentIds = eligibleStudents.map((s) => s._id);

      const res = await messAPI.bulkMark({
        date,
        mealType,
        studentIds,
        status,
      });

      await loadData();

      if (res.data.skippedOnLeave > 0) {
        Swal.fire({
          icon: "info",
          title: "Bulk Marking Complete",
          html: `
            <div style="text-align: left;">
              <p><strong>Marked:</strong> ${res.data.marked} students</p>
              <p><strong>Skipped (on leave):</strong> ${res.data.skippedOnLeave} students</p>
            </div>
          `,
          confirmButtonText: "OK",
        });
      } else {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: `Marked ${eligibleStudents.length} students as ${status}`,
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (err) {
      console.error("Bulk mark error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Failed to bulk mark",
      });
    } finally {
      setMarking(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    const search = searchTerm.toLowerCase();
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(search) ||
        student.rollNumber.toLowerCase().includes(search)
    );
  }, [students, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Current Meal Indicator */}
      {currentMeal && date === today && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl shadow-lg p-5 transition-all hover:shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-100 rounded-full p-2">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-base font-semibold text-emerald-900">
              Current meal time: <span className="capitalize font-bold text-emerald-700">{currentMeal}</span>
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 transition-all hover:shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={today}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <UtensilsCrossed className="h-4 w-4 inline mr-1" />
              Meal Type
            </label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
            >
              {mealTypes.map((meal) => (
                <option key={meal.value} value={meal.value}>
                  {meal.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Filter className="h-4 w-4 inline mr-1" />
              Block
            </label>
            <select
              value={block}
              onChange={(e) => setBlock(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
            >
              <option value="">All Blocks</option>
              <option value="A">Block A</option>
              <option value="B">Block B</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={loadData}
              disabled={loading}
              className="w-full px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center shadow-md hover:shadow-lg"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or roll number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-lg p-5 transition-all hover:shadow-xl hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600">Total</p>
                <p className="text-3xl font-bold text-gray-900">
                  {summary.total}
                </p>
              </div>
              <div className="bg-gray-100 rounded-full p-3">
                <Users className="h-8 w-8 text-gray-500" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 shadow-lg p-5 transition-all hover:shadow-xl hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700">Eligible</p>
                <p className="text-3xl font-bold text-blue-900">
                  {summary.eligible}
                </p>
              </div>
              <div className="bg-blue-200 rounded-full p-3">
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200 shadow-lg p-5 transition-all hover:shadow-xl hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-700">Present</p>
                <p className="text-3xl font-bold text-emerald-900">
                  {summary.present}
                </p>
              </div>
              <div className="bg-emerald-200 rounded-full p-3">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200 shadow-lg p-5 transition-all hover:shadow-xl hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-red-700">Absent</p>
                <p className="text-3xl font-bold text-red-900">
                  {summary.absent}
                </p>
              </div>
              <div className="bg-red-200 rounded-full p-3">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200 shadow-lg p-5 transition-all hover:shadow-xl hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-700">Mess-Off</p>
                <p className="text-3xl font-bold text-amber-900">
                  {summary.onMessOff}
                </p>
              </div>
              <div className="bg-amber-200 rounded-full p-3">
                <UserX className="h-8 w-8 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 shadow-lg p-5 transition-all hover:shadow-xl hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-700">On Leave</p>
                <p className="text-3xl font-bold text-purple-900">
                  {summary.onLeave || 0}
                </p>
              </div>
              <div className="bg-purple-200 rounded-full p-3">
                <Umbrella className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => handleBulkMark("present")}
          disabled={marking || loading}
          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center justify-center"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Mark All Present
        </button>
        <button
          onClick={() => handleBulkMark("absent")}
          disabled={marking || loading}
          className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold rounded-lg hover:from-red-700 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center justify-center"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Mark All Absent
        </button>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden transition-all hover:shadow-xl">
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <h3 className="text-xl font-bold text-gray-900">
            Students ({filteredStudents.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    SR.NO
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Student
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Roll Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Block
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Batch
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredStudents.map((student, index) => (
                  <tr
                    key={student._id}
                    className={`transition-all hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:shadow-sm ${
                      student.isOnMessOff ? "bg-amber-50" : ""
                    } ${student.isOnLeave ? "bg-purple-50" : ""} ${
                      !student.eligible ? "bg-gray-50 opacity-60" : ""
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-600">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-sm font-bold text-gray-900">
                          {student.name}
                        </span>
                        {student.isOnMessOff && (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            Mess-Off
                          </span>
                        )}
                        {student.isOnLeave && (
                          <span
                            className="px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-200 cursor-help"
                            title={`On ${
                              student.leaveDetails?.leaveType
                            } leave till ${
                              student.leaveDetails?.earlyReturn
                                ? student.leaveDetails.actualReturnDate
                                : student.leaveDetails?.toDate
                            }`}
                          >
                            On Leave
                          </span>
                        )}
                        {!student.hasMealPlan && (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                            No Plan
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                        {student.rollNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {student.block || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-600">
                      {student.batch || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {student.status === "present" && (
                        <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Present
                        </span>
                      )}
                      {student.status === "absent" && (
                        <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-200">
                          Absent
                        </span>
                      )}
                      {student.status === "on_mess_off" && (
                        <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          Mess-Off
                        </span>
                      )}
                      {!student.status && (
                        <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                          Not Marked
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {student.eligible ? (
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() =>
                              handleMarkSingle(student._id, "present")
                            }
                            disabled={marking || student.status === "present"}
                            className="px-3 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                            title="Mark present"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleMarkSingle(student._id, "absent")
                            }
                            disabled={marking || student.status === "absent"}
                            className="px-3 py-2 text-xs font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 rounded-lg hover:from-red-700 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                            title="Mark absent"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">
                          {!student.hasMealPlan && (
                            <div className="flex items-center justify-center space-x-1">
                              <AlertCircle className="h-3 w-3" />
                              <span>No meal plan</span>
                            </div>
                          )}
                          {student.isOnMessOff && (
                            <div className="flex items-center justify-center space-x-1">
                              <UserX className="h-3 w-3" />
                              <span>On mess-off</span>
                            </div>
                          )}
                          {student.isOnLeave && (
                            <div className="flex items-center justify-center space-x-1">
                              <Umbrella className="h-3 w-3" />
                              <span>On leave</span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No students found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your filters or search term
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyMarkingTab;
