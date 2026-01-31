// src/components/Mess/SettingsTab.jsx
import React, { useState, useEffect } from "react";
import { Save, Clock, Calendar, AlertCircle } from "lucide-react";
import { useMessSettings } from "../../contexts/MessSettingsContext";
import LoadingSpinner from "../UI/LoadingSpinner";
import Swal from "sweetalert2";

// ✅ DEFAULT SETTINGS - Used when no settings exist
const DEFAULT_SETTINGS = {
  mealTimings: {
    breakfast: { start: "07:00", end: "09:00" },
    lunch: { start: "12:00", end: "14:00" },
    dinner: { start: "19:00", end: "21:00" },
  },
  autoMarkAbsent: {
    enabled: true,
    time: "23:00",
  },
  messOffMinDays: 2,
  messOffAdvanceNotice: 1,
  guestMealCharge: 100,
};

const SettingsTab = () => {
  const {
    settings: globalSettings,
    loading: globalLoading,
    error: globalError,
    updateSettings,
  } = useMessSettings();

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [isNewSettings, setIsNewSettings] = useState(false);

  useEffect(() => {
    if (globalSettings) {
      // ✅ Settings exist in database - use them
      setSettings(globalSettings);
      setIsNewSettings(false);
    } else if (!globalLoading && !globalError) {
      // ✅ No settings in database - use defaults
      setSettings(DEFAULT_SETTINGS);
      setIsNewSettings(true);
    }
  }, [globalSettings, globalLoading, globalError]);

  const handleSave = async () => {
    try {
      // Basic validation for meal timings
      const meals = ["breakfast", "lunch", "dinner"];
      for (const meal of meals) {
        const m = settings.mealTimings?.[meal];
        if (!m?.start || !m?.end) {
          Swal.fire(
            "Validation",
            `Please set both start and end time for ${meal}`,
            "warning"
          );
          return;
        }
      }

      setSaving(true);
      const result = await updateSettings(settings);

      if (result.success) {
        Swal.fire({
          icon: "success",
          title: isNewSettings ? "Settings Created" : "Settings Updated",
          text: isNewSettings
            ? "Mess settings created successfully"
            : "Settings updated successfully",
          timer: 1500,
          showConfirmButton: false,
        });
        setIsNewSettings(false); // After first save, it's no longer new
      } else {
        throw new Error(result.error || "Failed to save settings");
      }
    } catch (err) {
      console.error("Save settings error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "Failed to save settings",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateMealTiming = (meal, field, value) => {
    setSettings((prev) => ({
      ...prev,
      mealTimings: {
        ...prev.mealTimings,
        [meal]: {
          ...prev.mealTimings[meal],
          [field]: value,
        },
      },
    }));
  };

  if (globalLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (globalError) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Error Loading Settings
        </h3>
        <p className="mt-1 text-sm text-gray-500">{globalError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Show info banner if settings are new */}
      {isNewSettings && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-md p-5 transition-all hover:shadow-lg">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 rounded-full p-3">
              <AlertCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-blue-900 mb-2">
                No Settings Found
              </h3>
              <p className="text-sm font-semibold text-blue-700">
                Default settings are loaded. Click "Create Settings" to configure your mess management.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Meal Timings */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden transition-all hover:shadow-xl">
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <div className="bg-emerald-100 rounded-full p-2 mr-3">
              <Clock className="h-6 w-6 text-emerald-600" />
            </div>
            Meal Timings
          </h3>
        </div>

        <div className="px-6 py-6 space-y-5">
          {["breakfast", "lunch", "dinner"].map((meal) => (
            <div
              key={meal}
              className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div>
                <label className="block text-sm font-bold text-gray-700 capitalize mb-1">
                  {meal.charAt(0).toUpperCase() + meal.slice(1)}
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={settings.mealTimings[meal].start}
                  onChange={(e) =>
                    updateMealTiming(meal, "start", e.target.value)
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={settings.mealTimings[meal].end}
                  onChange={(e) =>
                    updateMealTiming(meal, "end", e.target.value)
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mess-Off Rules */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden transition-all hover:shadow-xl">
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <div className="bg-emerald-100 rounded-full p-2 mr-3">
              <Calendar className="h-6 w-6 text-emerald-600" />
            </div>
            Mess-Off Rules
          </h3>
        </div>

        <div className="px-6 py-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Minimum Days
              </label>
              <input
                type="number"
                value={settings.messOffMinDays}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    messOffMinDays: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
                min="1"
              />
              <p className="text-xs font-semibold text-gray-500 mt-2">
                Minimum days required for mess-off application
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Advance Notice (Days)
              </label>
              <input
                type="number"
                value={settings.messOffAdvanceNotice}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    messOffAdvanceNotice: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
                min="0"
              />
              <p className="text-xs font-semibold text-gray-500 mt-2">
                Days in advance to apply for mess-off
              </p>
            </div>
          </div>

          {/* Guest Meal Charge */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Guest Meal Charge (₹)
              </label>
              <input
                type="number"
                value={settings.guestMealCharge || 100}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    guestMealCharge: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
                min="0"
              />
              <p className="text-xs font-semibold text-gray-500 mt-2">
                Default charge for guest meals
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Mark Settings */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden transition-all hover:shadow-xl">
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <div className="bg-emerald-100 rounded-full p-2 mr-3">
              <Clock className="h-6 w-6 text-emerald-600" />
            </div>
            Auto-Mark Settings
          </h3>
        </div>

        <div className="px-6 py-6 space-y-5">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <input
              type="checkbox"
              checked={settings.autoMarkAbsent.enabled}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  autoMarkAbsent: {
                    ...prev.autoMarkAbsent,
                    enabled: e.target.checked,
                  },
                }))
              }
              className="h-5 w-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
            />
            <label className="text-sm font-bold text-gray-700">
              Enable auto-mark absent for unmarked students
            </label>
          </div>

          {settings.autoMarkAbsent.enabled && (
            <div className="ml-8 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Auto-Mark Time
              </label>
              <input
                type="time"
                value={settings.autoMarkAbsent.time}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    autoMarkAbsent: {
                      ...prev.autoMarkAbsent,
                      time: e.target.value,
                    },
                  }))
                }
                className="w-full md:w-1/2 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all hover:border-emerald-400"
              />
              <p className="text-xs font-semibold text-gray-600 mt-2">
                Time to auto-mark absent students (after meal end time)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center"
        >
          <Save className="h-5 w-5 mr-2" />
          {saving
            ? "Saving..."
            : isNewSettings
              ? "Create Settings"
              : "Save Settings"}
        </button>
      </div>
    </div>
  );
};

export default SettingsTab;
