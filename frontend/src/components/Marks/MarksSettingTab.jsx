// src/components/Marks/MarksSettingTab.jsx
import React, { useState, useEffect } from "react";
import { Save, RotateCcw, Loader2, Settings, Award, AlertTriangle, Percent, Calendar, GraduationCap } from "lucide-react";
import { marksAPI } from "../../services/api";
import Swal from "sweetalert2";
import LoadingSpinner from "../UI/LoadingSpinner";

const MarksSettingTab = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passPercentage, setPassPercentage] = useState(33);
  const [defaultAcademicYear, setDefaultAcademicYear] = useState("2024-25");
  const [gradeBoundaries, setGradeBoundaries] = useState({
    APlus: 90,
    A: 80,
    BPlus: 70,
    B: 60,
    CPlus: 50,
    C: 40,
    D: 33,
  });

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await marksAPI.getSettings();
      const settings = res.data.settings;

      if (settings) {
        setPassPercentage(settings.passPercentage || 33);
        setDefaultAcademicYear(settings.defaultAcademicYear || "2024-25");
        setGradeBoundaries(
          settings.gradeBoundaries || {
            APlus: 90,
            A: 80,
            BPlus: 70,
            B: 60,
            CPlus: 50,
            C: 40,
            D: 33,
          }
        );
      }
    } catch (err) {
      console.error("Load settings error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Failed to load settings",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBoundaryChange = (key, value) => {
    setGradeBoundaries((prev) => ({
      ...prev,
      [key]: Number(value),
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const data = {
        passPercentage,
        defaultAcademicYear,
        gradeBoundaries,
      };

      await marksAPI.updateSettings(data);

      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Settings saved successfully!",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Save settings error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Failed to save settings",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Reset to Default?",
      text: "This will reset all marks settings to default values.",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, reset",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        setSaving(true);
        await marksAPI.resetSettings();
        await loadSettings();

        Swal.fire({
          icon: "success",
          title: "Reset Complete",
          text: "Settings have been reset to default values",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (err) {
        console.error("Reset settings error:", err);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: err.response?.data?.message || "Failed to reset settings",
        });
      } finally {
        setSaving(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 text-primary-600 animate-spin mb-3" />
          <p className="text-sm text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Professional Header */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary-100">
            <Settings className="h-6 w-6 text-primary-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Marks Settings</h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure grading rules and defaults for marks management.
            </p>
          </div>
        </div>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-gray-100">
            <Settings className="h-5 w-5 text-gray-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">General Settings</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Percent className="h-4 w-4 text-primary-600" />
              Pass Percentage
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                value={passPercentage}
                onChange={(e) => setPassPercentage(Number(e.target.value))}
                className="block w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
            </div>
            <p className="text-xs text-gray-500">Minimum percentage required to pass</p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Calendar className="h-4 w-4 text-primary-600" />
              Default Academic Year
            </label>
            <select
              value={defaultAcademicYear}
              onChange={(e) => setDefaultAcademicYear(e.target.value)}
              className="block w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="2023-24">2023-24</option>
              <option value="2024-25">2024-25</option>
              <option value="2025-26">2025-26</option>
            </select>
            <p className="text-xs text-gray-500">Default academic year for new entries</p>
          </div>
        </div>
      </div>

      {/* Grade Boundaries */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-gray-100">
            <Award className="h-5 w-5 text-gray-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Grade Boundaries</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(gradeBoundaries).map(([grade, boundary]) => (
            <div key={grade} className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <GraduationCap className="h-4 w-4 text-primary-600" />
                Grade {grade === "APlus" ? "A+" : grade}
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={boundary}
                onChange={(e) => handleBoundaryChange(grade, e.target.value)}
                className="block w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-xs text-gray-500">Minimum % for this grade</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Settings"}
        </button>

        <button
          onClick={handleReset}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          {saving ? "Resetting..." : "Reset to Default"}
        </button>
      </div>

      {/* Warning Notice */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-800" />
          </div>
          <div>
            <h4 className="font-bold text-amber-900 mb-2">Important Notice</h4>
            <ul className="space-y-1 text-sm text-amber-800">
              <li>• Grade boundaries must be in descending order (A+ highest, D lowest)</li>
              <li>• Changes will apply to all future marks calculations</li>
              <li>• Existing marks will not be retroactively recalculated</li>
              <li>• Reset to default will restore standard grading system</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarksSettingTab;
