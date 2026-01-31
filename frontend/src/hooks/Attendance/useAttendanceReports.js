import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hostelAttendanceAPI, studentsAPI } from "../../services/api";

// ============================================
// QUERY KEYS (for cache management)
// ============================================
export const attendanceKeys = {
  all: ["attendance"],
  reports: () => [...attendanceKeys.all, "reports"],
  monthlyReport: (month, block) => [
    ...attendanceKeys.reports(),
    "monthly",
    month,
    block,
  ],
  monthlyDateWise: (month, block) => [
    ...attendanceKeys.reports(),
    "monthly-date-wise",
    month,
    block,
  ],
  yearlyReport: (year, month, block) => [
    ...attendanceKeys.reports(),
    "yearly",
    year,
    month,
    block,
  ],
  studentHistory: (studentId, from, to) => [
    ...attendanceKeys.all,
    "student",
    studentId,
    from,
    to,
  ],
  students: (search) => ["students", search],
};

// ============================================
// 1. MONTHLY REPORT HOOK
// ============================================
export const useMonthlyReport = (month, block) => {
  return useQuery({
    queryKey: attendanceKeys.monthlyReport(month, block),
    queryFn: async () => {
      const params = { month };
      if (block) params.block = block;
      const res = await hostelAttendanceAPI.getMonthlyReport(params);
      return res.data;
    },
    enabled: !!month,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// ============================================
// 2. MONTHLY DATE-WISE REPORT HOOK
// ============================================
export const useMonthlyDateWiseReport = (month, block) => {
  return useQuery({
    queryKey: attendanceKeys.monthlyDateWise(month, block),
    queryFn: async () => {
      const params = { month };
      if (block) params.block = block;
      const res = await hostelAttendanceAPI.getMonthlyDateWiseReport(params);
      return res.data;
    },
    enabled: !!month,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// ============================================
// 3. YEARLY REPORT HOOK (OPTIMIZED)
// ============================================
export const useYearlyReport = (year, month, block) => {
  const [dateWiseData, setDateWiseData] = useState([]);
  const [stats, setStats] = useState({
    totalDates: 0,
    totalStudents: 0,
    totalPresent: 0,
    totalAbsent: 0,
    totalLeave: 0,
    averageAttendance: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    const fetchYearlyReport = async () => {
      if (!year) return;

      setIsLoading(true);
      setIsError(false);
      setErrors([]);

      try {
        let firstAttendanceRes;
        try {
          firstAttendanceRes = await hostelAttendanceAPI.getHistory({
            from: `${year}-01-01`,
            to: `${year}-12-31`,
            limit: 1,
          });
        } catch (err) {
          console.warn("Could not fetch first attendance:", err);
          firstAttendanceRes = null;
        }

        let startMonth = 1;
        const today = new Date();
        const currentMonth =
          today.getFullYear() === year ? today.getMonth() + 1 : 12;

        if (firstAttendanceRes?.data?.data?.[0]?.date) {
          const firstDate = new Date(firstAttendanceRes.data.data[0].date);
          startMonth = firstDate.getMonth() + 1;
        }

        const monthsToFetch = month
          ? [parseInt(month)]
          : Array.from(
              { length: currentMonth - startMonth + 1 },
              (_, i) => startMonth + i
            );

        const allData = [];
        const fetchErrors = [];

        const fetchPromises = monthsToFetch.map(async (m) => {
          try {
            const monthStr = `${year}-${String(m).padStart(2, "0")}`;
            const response = await hostelAttendanceAPI.getMonthlyDateWiseReport(
              {
                month: monthStr,
                block: block || "",
              }
            );

            if (response.data?.data) {
              return { success: true, data: response.data.data, month: m };
            }
            return { success: false, month: m };
          } catch (err) {
            return {
              success: false,
              month: m,
              error: err.message,
            };
          }
        });

        const results = await Promise.all(fetchPromises);

        results.forEach((result) => {
          if (result.success && result.data) {
            allData.push(...result.data);
          } else if (result.error) {
            fetchErrors.push({
              month: result.month,
              message: result.error,
            });
          }
        });

        let totalPresent = 0;
        let totalAbsent = 0;
        let totalLeave = 0;
        let totalStudents = 0;

        allData.forEach((dateRecord) => {
          const present = dateRecord.students.filter(
            (s) => s.status === "present"
          ).length;
          const absent = dateRecord.students.filter(
            (s) => s.status === "absent"
          ).length;
          const leave = dateRecord.students.filter(
            (s) => s.status === "leave"
          ).length;

          totalPresent += present;
          totalAbsent += absent;
          totalLeave += leave;
          totalStudents = Math.max(totalStudents, dateRecord.students.length);
        });

        const totalEntries = totalPresent + totalAbsent;
        const avgAttendance =
          totalEntries > 0
            ? ((totalPresent / totalEntries) * 100).toFixed(2)
            : 0;

        setDateWiseData(allData);
        setStats({
          totalDates: allData.length,
          totalStudents,
          totalPresent,
          totalAbsent,
          totalLeave,
          averageAttendance: parseFloat(avgAttendance),
        });

        if (fetchErrors.length > 0) {
          setIsError(true);
          setErrors(fetchErrors);
        }
      } catch (err) {
        console.error("Yearly report error:", err);
        setIsError(true);
        setErrors([{ message: err.message || "Failed to load yearly report" }]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchYearlyReport();
  }, [year, month, block]);

  return { data: dateWiseData, stats, isLoading, isError, errors };
};

// ============================================
// 4. STUDENT HISTORY HOOK
// ============================================
export const useStudentHistory = (studentId, fromDate, toDate) => {
  return useQuery({
    queryKey: attendanceKeys.studentHistory(studentId, fromDate, toDate),
    queryFn: async () => {
      const res = await hostelAttendanceAPI.getStudentHistory(studentId, {
        from: fromDate,
        to: toDate,
      });

      let records = res.data?.records || res.data?.data || [];
      records = records.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

      const groupedByDate = records.reduce((acc, record) => {
        if (!acc[record.date]) {
          acc[record.date] = [];
        }
        acc[record.date].push(record);
        return acc;
      }, {});

      return {
        records,
        groupedByDate,
        summary: res.data?.summary || null,
      };
    },
    enabled: !!studentId && !!fromDate && !!toDate,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

// ============================================
// 5. STUDENT SEARCH MUTATION
// ============================================
export const useStudentSearch = () => {
  return useMutation({
    mutationFn: async (searchQuery) => {
      if (!searchQuery || !searchQuery.trim()) {
        throw new Error("Please enter student name or roll number");
      }

      const res = await studentsAPI.getAll({
        search: searchQuery.trim(),
        status: "active",
        limit: 20,
      });

      let list;
      if (res.data?.students && Array.isArray(res.data.students)) {
        list = res.data.students;
      } else if (res.data?.data && Array.isArray(res.data.data)) {
        list = res.data.data;
      } else if (Array.isArray(res.data)) {
        list = res.data;
      } else {
        list = [];
      }

      if (list.length === 0) {
        throw new Error(`No students found for "${searchQuery}"`);
      }

      return list;
    },
  });
};

// ============================================
// 6. INVALIDATE/REFETCH HELPER
// ============================================
export const useInvalidateReports = () => {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
    invalidateMonthly: (month, block) => {
      queryClient.invalidateQueries({
        queryKey: attendanceKeys.monthlyReport(month, block),
      });
      queryClient.invalidateQueries({
        queryKey: attendanceKeys.monthlyDateWise(month, block),
      });
    },
    invalidateYearly: (year, month, block) => {
      queryClient.invalidateQueries({
        queryKey: attendanceKeys.yearlyReport(year, month, block),
      });
    },
    invalidateStudent: (studentId, from, to) => {
      queryClient.invalidateQueries({
        queryKey: attendanceKeys.studentHistory(studentId, from, to),
      });
    },
  };
};

// ============================================
// HELPER FUNCTIONS
// ============================================
export function generateDateRange(start, end) {
  const dates = [];
  const startDate = new Date(start);
  const endDate = new Date(end);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }

  return dates;
}
