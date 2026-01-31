import React, { useState, useEffect } from "react";
import {
    Settings,
    Clock,
    Calendar,
    DollarSign,
    Save,
    RefreshCw,
    AlertCircle,
    Plus,
    Trash2,
    CheckCircle,
} from "lucide-react";
import { employeeAttendanceAPI } from "../../services/api";
import toast from "react-hot-toast";

const SettingsTab = () => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newHoliday, setNewHoliday] = useState({ date: "", name: "" });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await employeeAttendanceAPI.getSettings();
            setSettings(response.data.data);
        } catch (error) {
            console.error("Error fetching settings:", error);
            toast.error("Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        try {
            setSaving(true);
            await employeeAttendanceAPI.updateSettings(settings);
            toast.success("Settings saved successfully!");
            fetchSettings();
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const handleAddHoliday = () => {
        if (!newHoliday.date || !newHoliday.name) {
            toast.error("Please enter both date and holiday name");
            return;
        }

        const holidays = settings.holidays || [];
        holidays.push(newHoliday);
        setSettings({ ...settings, holidays });
        setNewHoliday({ date: "", name: "" });
        toast.success("Holiday added");
    };

    const handleRemoveHoliday = (index) => {
        const holidays = [...settings.holidays];
        holidays.splice(index, 1);
        setSettings({ ...settings, holidays });
        toast.success("Holiday removed");
    };

    const handleWeekendToggle = (day) => {
        const weekendDays = [...(settings.weekendDays || [])];
        const index = weekendDays.indexOf(day);

        if (index > -1) {
            weekendDays.splice(index, 1);
        } else {
            weekendDays.push(day);
        }

        setSettings({ ...settings, weekendDays });
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Loading settings...</p>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Failed to load settings</p>
            </div>
        );
    }

    const weekDays = [
        { value: 0, label: "Sunday" },
        { value: 1, label: "Monday" },
        { value: 2, label: "Tuesday" },
        { value: 3, label: "Wednesday" },
        { value: 4, label: "Thursday" },
        { value: 5, label: "Friday" },
        { value: 6, label: "Saturday" },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Settings className="w-5 h-5 mr-2 text-primary-600" />
                        Attendance Settings
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Configure working hours, auto-mark, overtime, and salary calculations
                    </p>
                </div>

                <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center space-x-2"
                >
                    <Save className="w-4 h-4" />
                    <span>{saving ? "Saving..." : "Save Settings"}</span>
                </button>
            </div>

            {/* Working Hours Settings */}
            <div className="bg-white rounded-lg shadow p-6">
                <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-blue-600" />
                    Working Hours Configuration
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Working Hours Per Day */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Working Hours Per Day
                        </label>
                        <input
                            type="number"
                            step="0.5"
                            min="1"
                            max="24"
                            value={settings.workingHoursPerDay}
                            onChange={(e) =>
                                setSettings({
                                    ...settings,
                                    workingHoursPerDay: parseFloat(e.target.value),
                                })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Default: 8 hours per day
                        </p>
                    </div>

                    {/* Half Day Threshold */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Half Day Threshold (hours)
                        </label>
                        <input
                            type="number"
                            step="0.5"
                            min="1"
                            max="12"
                            value={settings.halfDayThreshold}
                            onChange={(e) =>
                                setSettings({
                                    ...settings,
                                    halfDayThreshold: parseFloat(e.target.value),
                                })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Minimum hours for half day
                        </p>
                    </div>

                    {/* Check-In Time */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Standard Check-In Time
                        </label>
                        <input
                            type="time"
                            value={settings.checkInTime}
                            onChange={(e) =>
                                setSettings({ ...settings, checkInTime: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Expected start time</p>
                    </div>

                    {/* Check-Out Time */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Standard Check-Out Time
                        </label>
                        <input
                            type="time"
                            value={settings.checkOutTime}
                            onChange={(e) =>
                                setSettings({ ...settings, checkOutTime: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Expected end time</p>
                    </div>

                    {/* Late Threshold */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Late Threshold (minutes)
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="60"
                            value={settings.lateThreshold}
                            onChange={(e) =>
                                setSettings({
                                    ...settings,
                                    lateThreshold: parseInt(e.target.value),
                                })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Grace period for late</p>
                    </div>

                    {/* Early Leave Threshold */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Early Leave Threshold (minutes)
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="60"
                            value={settings.earlyLeaveThreshold}
                            onChange={(e) =>
                                setSettings({
                                    ...settings,
                                    earlyLeaveThreshold: parseInt(e.target.value),
                                })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Grace period for early leave
                        </p>
                    </div>
                </div>
            </div>

            {/* Weekend Days */}
            <div className="bg-white rounded-lg shadow p-6">
                <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-purple-600" />
                    Weekend Days
                </h4>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {weekDays.map((day) => (
                        <button
                            key={day.value}
                            onClick={() => handleWeekendToggle(day.value)}
                            className={`px-4 py-2 rounded-lg border-2 transition-colors ${settings.weekendDays?.includes(day.value)
                                ? "bg-primary-100 border-primary-500 text-primary-700"
                                : "bg-white border-gray-300 text-gray-700 hover:border-gray-400"
                                }`}
                        >
                            {day.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Holidays */}
            <div className="bg-white rounded-lg shadow p-6">
                <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-green-600" />
                    Holidays
                </h4>

                {/* Add Holiday Form */}
                <div className="flex items-end space-x-3 mb-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date
                        </label>
                        <input
                            type="date"
                            value={newHoliday.date}
                            onChange={(e) =>
                                setNewHoliday({ ...newHoliday, date: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Holiday Name
                        </label>
                        <input
                            type="text"
                            value={newHoliday.name}
                            onChange={(e) =>
                                setNewHoliday({ ...newHoliday, name: e.target.value })
                            }
                            placeholder="e.g., New Year"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                    <button
                        onClick={handleAddHoliday}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add</span>
                    </button>
                </div>

                {/* Holiday List */}
                {settings.holidays && settings.holidays.length > 0 ? (
                    <div className="space-y-2">
                        {settings.holidays.map((holiday, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        {holiday.name}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                        {new Date(holiday.date).toLocaleDateString("en-IN")}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleRemoveHoliday(index)}
                                    className="text-red-600 hover:text-red-800"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                        No holidays configured
                    </p>
                )}
            </div>

            {/* Auto-Mark Settings */}
            <div className="bg-white rounded-lg shadow p-6">
                <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-indigo-600" />
                    Auto-Mark Settings
                </h4>

                <div className="space-y-4">
                    {/* Enable Auto-Mark */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <p className="text-sm font-medium text-gray-900">
                                Enable Auto-Mark
                            </p>
                            <p className="text-xs text-gray-600">
                                Automatically mark absent employees at end of day (11:59 PM)
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.autoMarkEnabled}
                                onChange={(e) =>
                                    setSettings({ ...settings, autoMarkEnabled: e.target.checked })
                                }
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Overtime Settings */}
            <div className="bg-white rounded-lg shadow p-6">
                <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-orange-600" />
                    Overtime Settings
                </h4>

                <div className="space-y-4">
                    {/* Enable Overtime */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <p className="text-sm font-medium text-gray-900">
                                Enable Overtime Calculation
                            </p>
                            <p className="text-xs text-gray-600">
                                Calculate overtime pay for extra hours worked
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.overtimeEnabled}
                                onChange={(e) =>
                                    setSettings({ ...settings, overtimeEnabled: e.target.checked })
                                }
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                    </div>

                    {settings.overtimeEnabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Overtime Threshold */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Overtime Threshold (hours)
                                </label>
                                <input
                                    type="number"
                                    step="0.5"
                                    min="8"
                                    max="24"
                                    value={settings.overtimeThreshold}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            overtimeThreshold: parseFloat(e.target.value),
                                        })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Hours after which overtime starts
                                </p>
                            </div>

                            {/* Overtime Rate */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Overtime Rate Multiplier
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="1"
                                    max="3"
                                    value={settings.overtimeRate}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            overtimeRate: parseFloat(e.target.value),
                                        })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    e.g., 1.5 = 1.5x hourly rate
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Salary Calculation Settings */}
            <div className="bg-white rounded-lg shadow p-6">
                <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                    Salary Calculation Settings
                </h4>

                <div className="space-y-4">
                    {/* Deduct Full Day for Absent */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <p className="text-sm font-medium text-gray-900">
                                Deduct Full Day for Absent
                            </p>
                            <p className="text-xs text-gray-600">
                                Deduct full day salary for absent days
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.deductFullDayForAbsent}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        deductFullDayForAbsent: e.target.checked,
                                    })
                                }
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                    </div>

                    {/* Deduct Half Day Amount */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <p className="text-sm font-medium text-gray-900">
                                Deduct 50% for Half Day
                            </p>
                            <p className="text-xs text-gray-600">
                                Deduct half day salary for half day attendance
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.deductHalfDayAmount}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        deductHalfDayAmount: e.target.checked,
                                    })
                                }
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                    </div>

                    {/* Include Weekends in Calculation */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <p className="text-sm font-medium text-gray-900">
                                Include Weekends in Salary Calculation
                            </p>
                            <p className="text-xs text-gray-600">
                                Count weekends as working days for salary calculation
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.includeWeekendsInCalculation}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        includeWeekendsInCalculation: e.target.checked,
                                    })
                                }
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Save Button (Bottom) */}
            <div className="flex justify-end">
                <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center space-x-2 text-lg"
                >
                    <Save className="w-5 h-5" />
                    <span>{saving ? "Saving..." : "Save All Settings"}</span>
                </button>
            </div>
        </div>
    );
};

export default SettingsTab;
