// src/components/Attendance/SettingTab.jsx
import React, { useEffect, useState } from "react";
import {
  Clock,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Users,
  AlertTriangle,
  Info,
  Save,
  Settings,
  Loader2,
  Activity,
  FileText,
  Shield,
  Zap
} from "lucide-react";
import { hostelAttendanceAPI } from "../../services/api";
import Swal from "sweetalert2";

// ✅ DEFAULT SETTINGS - Used when no settings exist in database
const DEFAULT_SETTINGS = {
  autoMarkEnabled: true,
  autoMarkTime: "23:59",
  firstEntryMustBeIn: true,
  stateBasedPresentAbsent: true,
  lastRunInfo: null,
};

const SettingsTab = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNewSettings, setIsNewSettings] = useState(false);

  const [autoMarkEnabled, setAutoMarkEnabled] = useState(true);
  const [autoMarkTime, setAutoMarkTime] = useState("23:59");
  const [firstEntryMustBeIn, setFirstEntryMustBeIn] = useState(true);
  const [stateBasedPresentAbsent, setStateBasedPresentAbsent] = useState(true);

  const [lastRunInfo, setLastRunInfo] = useState(null);
  const [checkingState, setCheckingState] = useState(false);

  // Load current settings from backend
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await hostelAttendanceAPI.getAttendanceSettings();
      const data = res.data.settings;

      if (data) {
        // ✅ Settings exist in database - load them
        setAutoMarkEnabled(data.autoMarkEnabled ?? true);
        setAutoMarkTime(data.autoMarkTime || "23:59");
        setFirstEntryMustBeIn(data.firstEntryMustBeIn ?? true);
        setStateBasedPresentAbsent(data.stateBasedPresentAbsent ?? true);
        setLastRunInfo(data.lastRunInfo || null);
        setIsNewSettings(false);
      } else {
        // ✅ No settings in database - use defaults
        setAutoMarkEnabled(DEFAULT_SETTINGS.autoMarkEnabled);
        setAutoMarkTime(DEFAULT_SETTINGS.autoMarkTime);
        setFirstEntryMustBeIn(DEFAULT_SETTINGS.firstEntryMustBeIn);
        setStateBasedPresentAbsent(DEFAULT_SETTINGS.stateBasedPresentAbsent);
        setLastRunInfo(DEFAULT_SETTINGS.lastRunInfo);
        setIsNewSettings(true);
      }
    } catch (err) {
      console.error("Settings load error:", err);
      // ✅ On error, also use defaults
      setAutoMarkEnabled(DEFAULT_SETTINGS.autoMarkEnabled);
      setAutoMarkTime(DEFAULT_SETTINGS.autoMarkTime);
      setFirstEntryMustBeIn(DEFAULT_SETTINGS.firstEntryMustBeIn);
      setStateBasedPresentAbsent(DEFAULT_SETTINGS.stateBasedPresentAbsent);
      setIsNewSettings(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await hostelAttendanceAPI.updateAttendanceSettings({
        autoMarkEnabled,
        autoMarkTime,
        firstEntryMustBeIn,
        stateBasedPresentAbsent,
      });

      Swal.fire({
        title: isNewSettings ? "Settings Created" : "Settings Updated",
        text: isNewSettings
          ? "Attendance settings created successfully"
          : "Attendance settings updated successfully",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      // ✅ After first save, it's no longer new
      setIsNewSettings(false);

      // ✅ Reload settings to get any server-side updates
      await loadSettings();
    } catch (err) {
      Swal.fire(
        "Error",
        err?.response?.data?.message || "Failed to save settings",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRunAutoMarkToday = async () => {
    const result = await Swal.fire({
      title: "Run auto-mark for today?",
      text: "This will mark present/absent based on current hostel state for all students.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Run Now",
    });

    if (!result.isConfirmed) return;

    try {
      setSaving(true);
      const today = new Date().toISOString().slice(0, 10);

      const res = await hostelAttendanceAPI.runAutoMarkForDate({ date: today });

      Swal.fire({
        title: "Completed",
        html: `
          <p><strong>Present:</strong> ${res.data.result.present}</p>
          <p><strong>Absent:</strong> ${res.data.result.absent}</p>
          <p><strong>On Leave:</strong> ${res.data.result.leave || 0}</p>
          <p><strong>Already Marked:</strong> ${res.data.result.alreadyMarked || 0}</p>
        `,
        icon: "success",
      });

      // ✅ Reload settings to show updated lastRunInfo
      await loadSettings();
    } catch (err) {
      Swal.fire(
        "Error",
        err?.response?.data?.message || "Failed to run auto-mark",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleResetAllStatesToIn = async () => {
    const result = await Swal.fire({
      title: "Reset all students to IN?",
      text: "This should only be used after big changes or initial setup.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Reset All",
      confirmButtonColor: "#ef4444",
    });

    if (!result.isConfirmed) return;

    try {
      setSaving(true);
      const res = await hostelAttendanceAPI.resetAllStudentStates();

      Swal.fire({
        title: "Done",
        text: `Updated ${res.data.updatedCount || 0} students to state IN`,
        icon: "success",
      });
    } catch (err) {
      Swal.fire(
        "Error",
        err?.response?.data?.message || "Failed to reset states",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCheckStateConsistency = async () => {
    try {
      setCheckingState(true);
      const res = await hostelAttendanceAPI.checkStateConsistency();
      const data = res.data || {};

      if (!data.issues || data.issues.length === 0) {
        Swal.fire("All Good", "No inconsistencies found.", "success");
      } else {
        Swal.fire({
          title: "Inconsistencies found",
          html: `
            <p>${data.issues.length} student(s) where currentHostelState does not match last attendance entry.</p>
            <details style="text-align:left;margin-top:10px;">
              <summary>View Details</summary>
              <ul style="max-height:200px;overflow-y:auto;">
                ${data.issues
                  .map(
                    (i) =>
                      `<li>${i.studentName} (${i.rollNumber}) - state: ${i.currentState}, last entry: ${i.lastType} on ${i.lastDate}</li>`
                  )
                  .join("")}
              </ul>
            </details>
          `,
          icon: "warning",
          width: 600,
        });
      }
    } catch (err) {
      Swal.fire(
        "Error",
        err?.response?.data?.message || "Failed to check consistency",
        "error"
      );
    } finally {
      setCheckingState(false);
    }
  };

  // ✅ Show loading spinner while fetching settings
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-3" />
          <p className="text-sm text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-100">
            <Settings className="h-6 w-6 text-blue-700" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Attendance Settings</h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure automatic marking and student state management
            </p>
          </div>
        </div>
      </div>
      {/* ✅ NEW: Show info banner if settings don't exist yet */}
      {isNewSettings && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              No Settings Found
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              Default attendance settings are loaded. Click "Save Settings" to create your configuration.
            </p>
          </div>
        </div>
      )}

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
        <div className="ml-3">
          <h3 className="text-sm font-medium text-blue-800">
            Attendance Engine Settings
          </h3>
          <p className="mt-1 text-sm text-blue-700">
            Configure how automatic present/absent marking works based on
            student IN/OUT state. These settings affect daily cron jobs and
            manual tools like auto-mark for a date.
          </p>
        </div>
      </div>

      {/* Auto-mark config */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100">
            <Clock className="h-5 w-5 text-blue-700" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Auto-Mark Configuration</h3>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                <Zap className="h-4 w-4 inline mr-1 text-amber-500" />
                Enable daily auto-mark
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Runs every night and marks present/absent for that day based on
                currentHostelState (IN = present, OUT = absent).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutoMarkEnabled((v) => !v)}
              className="flex items-center gap-2"
            >
              {autoMarkEnabled ? (
                <>
                  <ToggleRight className="h-8 w-8 text-green-500" />
                  <span className="text-sm text-green-700 font-semibold">Enabled</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="h-8 w-8 text-gray-400" />
                  <span className="text-sm text-gray-600 font-semibold">Disabled</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <Clock className="h-4 w-4 inline mr-1 text-gray-500" />
                Auto-mark run time (server time)
              </label>
              <input
                type="time"
                value={autoMarkTime}
                onChange={(e) => setAutoMarkTime(e.target.value)}
                className="block w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500">
                Example: 23:59 = run once at 11:59 PM every day.
              </p>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <input
                id="firstEntryMustBeIn"
                type="checkbox"
                checked={firstEntryMustBeIn}
                onChange={(e) => setFirstEntryMustBeIn(e.target.checked)}
                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <label
                  htmlFor="firstEntryMustBeIn"
                  className="text-sm font-semibold text-gray-800"
                >
                  <Shield className="h-4 w-4 inline mr-1 text-blue-500" />
                  First entry must be IN
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  Prevents marking OUT as first action of the day for a student.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <input
                id="stateBasedPresentAbsent"
                type="checkbox"
                checked={stateBasedPresentAbsent}
                onChange={(e) => setStateBasedPresentAbsent(e.target.checked)}
                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <label
                  htmlFor="stateBasedPresentAbsent"
                  className="text-sm font-semibold text-gray-800"
                >
                  <Activity className="h-4 w-4 inline mr-1 text-purple-500" />
                  Use state-based present/absent
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  At end of day: IN = present, OUT = absent, no entries and state
                  IN = present, no entries and state OUT = absent.
                </p>
              </div>
            </div>
          </div>

          {lastRunInfo && (
            <div className="text-xs text-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 font-semibold text-gray-900 mb-1">
                <FileText className="h-4 w-4 text-gray-600" />
                Last auto-mark
              </div>
              <div>
                <strong>Date:</strong> {lastRunInfo.date} • <strong>Present:</strong> {lastRunInfo.present} •{" "}
                <strong>Absent:</strong> {lastRunInfo.absent} • <strong>Ran at:</strong>{" "}
                {lastRunInfo.ranAt ? new Date(lastRunInfo.ranAt).toLocaleString() : "—"}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={saving || loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving..." : isNewSettings ? "Create Settings" : "Save Settings"}
            </button>
            <button
              type="button"
              onClick={handleRunAutoMarkToday}
              disabled={saving || loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Run For Today Now
            </button>
          </div>
        </div>
      </div>

      {/* Student state tools */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-amber-100">
            <Users className="h-5 w-5 text-amber-700" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Student State Tools</h3>
        </div>

        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-6">
          <div className="p-2 rounded-lg bg-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-800" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900">Use carefully</p>
            <p className="text-xs text-amber-800 mt-1">
              These tools change currentHostelState (IN/OUT) on student records.
              Use mainly during initial setup, data import, or after fixing major issues.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-200">
                <AlertTriangle className="h-5 w-5 text-red-800" />
              </div>
              <div>
                <p className="text-sm font-bold text-red-900">Reset All Students to IN</p>
                <p className="text-xs text-red-800 mt-1">
                  Forces every student state to IN. Use only if you are sure.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleResetAllStatesToIn}
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {saving ? "Working..." : "Reset All to IN"}
            </button>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-200">
                <Shield className="h-5 w-5 text-blue-800" />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-900">Check State Consistency</p>
                <p className="text-xs text-blue-800 mt-1">
                  Finds students where currentHostelState does not match last attendance entry.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCheckStateConsistency}
              disabled={checkingState}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50"
            >
              {checkingState ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              {checkingState ? "Checking..." : "Check Consistency"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
