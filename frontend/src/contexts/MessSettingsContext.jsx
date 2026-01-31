// src/contexts/MessSettingsContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { messAPI } from "../services/api";

const MessSettingsContext = createContext(null);

export const useMessSettings = () => {
  const context = useContext(MessSettingsContext);
  if (!context) {
    throw new Error("useMessSettings must be used within MessSettingsProvider");
  }
  return context;
};

export const MessSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await messAPI.getSettings();
      setSettings(res.data.settings);
      setError(null);
    } catch (err) {
      console.error("Load settings error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      await messAPI.updateSettings(newSettings);
      setSettings(newSettings);
      return { success: true };
    } catch (err) {
      console.error("Update settings error:", err);
      return { success: false, error: err.message };
    }
  };

  const getAvailableMeals = () => {
    if (!settings) return [];
    return ["breakfast", "lunch", "dinner"];
  };

  const getMealTiming = (mealType) => {
    if (!settings?.mealTimings) return null;
    return settings.mealTimings[mealType];
  };

  // ⭐ FIXED: Correct time comparison logic
  const isWithinMealTime = (mealType) => {
    const timing = getMealTiming(mealType);
    if (!timing) return false;

    const now = new Date();
    const [startHour, startMin] = timing.start.split(":").map(Number);
    const [endHour, endMin] = timing.end.split(":").map(Number);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    console.log(`Checking ${mealType}:`, {
      current: `${now.getHours()}:${now.getMinutes()}`,
      start: timing.start,
      end: timing.end,
      currentMinutes,
      startMinutes,
      endMinutes,
      isWithin: currentMinutes >= startMinutes && currentMinutes <= endMinutes,
    });

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  };

  const getCurrentMeal = () => {
    const meals = getAvailableMeals();
    for (const meal of meals) {
      if (isWithinMealTime(meal)) {
        console.log("Current meal:", meal);
        return meal;
      }
    }
    console.log("No current meal");
    return null;
  };

  const value = {
    settings,
    loading,
    error,
    loadSettings,
    updateSettings,
    getAvailableMeals,
    getMealTiming,
    isWithinMealTime,
    getCurrentMeal,
  };

  return (
    <MessSettingsContext.Provider value={value}>
      {children}
    </MessSettingsContext.Provider>
  );
};
